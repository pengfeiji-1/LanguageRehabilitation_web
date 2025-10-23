/**
 * 用户审批管理页面
 * 超级管理员专用，用于审批待批准的用户
 */

import { useState, useEffect, useCallback } from 'react';
import { User, UserApprovalAction, UserApprovalHistory } from '@/types/user';
import { PermissionManager } from '@/lib/permissions';
import { showError, showSuccess } from '@/lib/toast';
import { adminAPI } from '@/lib/api';

// 审批操作配置
const APPROVAL_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  REFRESH_INTERVAL: 60000, // 60秒自动刷新
} as const;

interface ApprovalStatistics {
  pending_count: number;
  approved_today: number;
  rejected_today: number;
  total_registered: number;
}

export default function UserApproval() {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [statistics, setStatistics] = useState<ApprovalStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [processingUser, setProcessingUser] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // 检查权限
  useEffect(() => {
    if (!PermissionManager.canManageUsers()) {
      showError('您没有权限访问此页面');
      return;
    }
    
    fetchInitialData();
    
    // 设置定时刷新
    const interval = setInterval(fetchPendingData, APPROVAL_CONFIG.REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // 获取初始数据
  const fetchInitialData = useCallback(async () => {
    await Promise.all([
      fetchPendingData(),
      fetchStatistics()
    ]);
  }, []);

  // 获取待审批用户数据
  const fetchPendingData = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await adminAPI.getPendingApprovals({
        page: currentPage,
        page_size: APPROVAL_CONFIG.DEFAULT_PAGE_SIZE,
        search: searchKeyword || undefined
      });
      
      if (response.success) {
        const users = response.data.items || [];
        setPendingUsers(users);
      } else {
        throw new Error(response.message || '获取待审批数据失败');
      }
      
    } catch (error) {
      console.error('获取待审批数据失败:', error);
      const errorMessage = error instanceof Error ? error.message : '获取数据失败';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchKeyword]);

  // 获取所有用户数据 - 暂时使用待审批接口获取所有状态用户
  const fetchAllUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      // 暂时使用待审批接口，后续可以扩展为支持所有状态的用户
      const response = await adminAPI.getPendingApprovals({
        page: currentPage,
        page_size: APPROVAL_CONFIG.DEFAULT_PAGE_SIZE,
        search: searchKeyword || undefined
      });
      
      if (response.success) {
        const users = response.data.items || [];
        setAllUsers(users);
      } else {
        throw new Error(response.message || '获取所有用户数据失败');
      }
      
    } catch (error) {
      console.error('获取所有用户数据失败:', error);
      const errorMessage = error instanceof Error ? error.message : '获取数据失败';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchKeyword]);

  // 获取审批统计
  const fetchStatistics = useCallback(async () => {
    try {
      const response = await adminAPI.getApprovalStatistics();
      
      if (response.success) {
        setStatistics(response.data);
      } else {
        console.error('获取审批统计失败:', response.message);
      }
    } catch (error) {
      console.error('获取审批统计失败:', error);
    }
  }, []);

  // 审批用户
  const handleUserApproval = useCallback(async (
    userId: number, 
    action: 'approve' | 'reject', 
    reason?: string
  ) => {
    if (!userId || processingUser === userId) {
      return;
    }

    try {
      setProcessingUser(userId);
      
      const response = await adminAPI.approveAdmin(userId, {
        action,
        target_role: action === 'approve' ? 'admin' : undefined,
        reason
      });
      
      if (response.success) {
        const message = action === 'approve' 
          ? '用户已成功批准为管理员' 
          : '用户申请已拒绝';
        showSuccess(message);
        
        // 刷新数据
        await Promise.all([
          fetchPendingData(),
          fetchStatistics()
        ]);
      } else {
        throw new Error(response.message || '审批操作失败');
      }
      
    } catch (error) {
      console.error('审批操作失败:', error);
      const errorMessage = error instanceof Error ? error.message : '审批操作失败，请重试';
      showError(errorMessage);
    } finally {
      setProcessingUser(null);
    }
  }, [processingUser, fetchPendingData, fetchStatistics]);

  // 处理搜索
  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setCurrentPage(1); // 重置到第一页
  }, []);

  // 处理标签切换
  const handleTabChange = useCallback((tab: 'pending' | 'all') => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchKeyword('');
    
    // 根据标签类型获取相应数据
    if (tab === 'pending') {
      fetchPendingData();
    } else if (tab === 'all') {
      fetchAllUsers();
    }
  }, [fetchPendingData, fetchAllUsers]);

  // 渲染用户状态标签
  const renderStatusBadge = (status: string, role: string) => {
    if (role === 'viewer' && status === 'pending') {
      return (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
          待审批
        </span>
      );
    }
    
    if (role === 'admin') {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
          已批准
        </span>
      );
    }
    
    if (role === 'rejected') {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
          已拒绝
        </span>
      );
    }
    
    return (
      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
        {status}
      </span>
    );
  };

  // 渲染用户表格
  const renderUserTable = (users: User[]) => (
    <div className="bg-white rounded-lg border border-gray-200 flex-1 flex flex-col">
      <div className="overflow-x-auto flex-1 overflow-y-auto min-h-0">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">
                用户信息
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">
                角色状态
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">
                注册时间
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">
                最后登录
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">
                操作
              </th>
            </tr>
          </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-4 py-2">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <i className="fa-solid fa-user text-blue-600"></i>
                    </div>
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{user.real_name}</div>
                    <div className="text-xs text-gray-500">{user.username}</div>
                    {user.email && (
                      <div className="text-xs text-gray-400">{user.email}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-2">
                <div className="flex flex-col space-y-0.5">
                  {renderStatusBadge(user.status, user.role)}
                  <span className="text-xs text-gray-500">
                    {PermissionManager.getRoleDisplayName(user.role)}
                  </span>
                </div>
              </td>
              <td className="px-2 py-1 text-sm text-gray-500">
                {new Date(user.created_at).toLocaleString('zh-CN')}
              </td>
              <td className="px-2 py-1 text-sm text-gray-500">
                {user.last_login 
                  ? new Date(user.last_login).toLocaleString('zh-CN')
                  : '从未登录'
                }
              </td>
              <td className="px-2 py-1 text-sm font-medium">
                <div className="flex space-x-2">
                  {user.role === 'viewer' && (user.status === 'pending' || user.status === 'disabled') && (
                    <>
                      <button
                        onClick={() => {
                          handleUserApproval(user.id, 'approve');
                        }}
                        disabled={processingUser === user.id}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50 mr-2"
                      >
                        <i className="fa-solid fa-check mr-1"></i>
                        批准
                      </button>
                      <button
                        onClick={() => {
                          handleUserApproval(user.id, 'reject');
                        }}
                        disabled={processingUser === user.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        <i className="fa-solid fa-times mr-1"></i>
                        拒绝
                      </button>
                    </>
                  )}
                  
                  {processingUser === user.id && (
                    <i className="fa-solid fa-spinner fa-spin text-blue-600"></i>
                  )}
                </div>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
      
      {users.length === 0 && (
        <div className="text-center py-4">
          <span className="text-sm text-gray-500">暂无数据</span>
        </div>
      )}
    </div>
  );

  if (!PermissionManager.canManageUsers()) {
    return (
      <div className="text-center py-12">
        <i className="fa-solid fa-lock text-gray-400 text-4xl mb-4"></i>
        <p className="text-gray-500">您没有权限访问此页面</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-2">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-clock text-yellow-600"></i>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">待审批</p>
              <p className="text-xl font-semibold text-gray-900">
                {statistics?.pending_count ?? pendingUsers.length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-user-check text-green-600"></i>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">今日通过</p>
              <p className="text-xl font-semibold text-gray-900">
                {statistics?.approved_today ?? 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-user-times text-red-600"></i>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">今日拒绝</p>
              <p className="text-xl font-semibold text-gray-900">
                {statistics?.rejected_today ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-users text-blue-600"></i>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">今日注册</p>
              <p className="text-xl font-semibold text-gray-900">
                {statistics?.total_registered ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="bg-white rounded-lg border border-gray-200 px-3 py-2">
        <div className="flex items-center space-x-3">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="搜索用户名或姓名..."
                value={searchKeyword}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fa-solid fa-search text-gray-400 text-sm"></i>
              </div>
            </div>
          </div>
          <button
            onClick={fetchPendingData}
            disabled={loading}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center text-sm"
          >
            <i className={`fa-solid fa-refresh mr-1 ${loading ? 'fa-spin' : ''}`}></i>
            刷新
          </button>
        </div>
      </div>

      {/* 标签导航 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => handleTabChange('pending')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            待审批用户
            {(statistics?.pending_count ?? pendingUsers.length) > 0 && (
              <span className="ml-3 bg-red-100 text-red-600 py-1 px-2 rounded-full text-xs">
                {statistics?.pending_count ?? pendingUsers.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => handleTabChange('all')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            所有用户
          </button>
        </nav>
      </div>

      {/* 内容区域 */}
      <div>
        {loading ? (
          <div className="text-center py-12">
            <i className="fa-solid fa-spinner fa-spin text-gray-400 text-4xl mb-4"></i>
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : (
          <>
            {activeTab === 'pending' && renderUserTable(pendingUsers)}
            {activeTab === 'all' && renderUserTable(allUsers)}
          </>
        )}
      </div>
    </div>
  );
}
