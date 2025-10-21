/**
 * 待审批用户的主界面
 * 显示在主布局中，只包含审批相关的信息和功能
 */

import { useState, useEffect } from 'react';
import { PermissionManager } from '@/lib/permissions';
import { handleLogout } from '@/lib/logout';
import { approvalMonitor } from '@/lib/approvalMonitor';

export default function PendingDashboard() {
  const [currentUser] = useState(PermissionManager.getCurrentUser());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [monitoringActive, setMonitoringActive] = useState(false);

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 启动审批状态监控
  useEffect(() => {
    // 只有待审批用户才启动监控
    if (PermissionManager.isPendingApproval()) {
      approvalMonitor.startMonitoring();
      setMonitoringActive(true);
      
      console.log('审批状态监控已启动');
    }

    // 组件卸载时停止监控
    return () => {
      if (monitoringActive) {
        approvalMonitor.stopMonitoring();
        setMonitoringActive(false);
        console.log('审批状态监控已停止');
      }
    };
  }, [monitoringActive]);

  const userRole = PermissionManager.getCurrentUserRole();
  const roleDisplayName = PermissionManager.getRoleDisplayName(userRole || undefined);
  const userStatus = PermissionManager.getUserStatus();
  const statusDisplayName = PermissionManager.getStatusDisplayName(userStatus);

  // 刷新页面检查状态
  const handleRefresh = () => {
    window.location.reload();
  };

  // 切换账户
  const handleSwitchAccount = () => {
    handleLogout();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 欢迎信息 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          欢迎，{currentUser?.real_name || '用户'}！
        </h1>
        <p className="text-gray-600">
          您的管理员权限申请正在审批中，请耐心等待。
        </p>
      </div>

      {/* 状态卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* 审批状态卡片 */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-amber-200 rounded-lg flex items-center justify-center">
              <i className="fa-solid fa-hourglass-half text-2xl text-amber-700"></i>
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-amber-900">审批状态</h3>
              <p className="text-sm text-amber-700">当前申请状态</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-amber-800">状态：</span>
              <span className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full text-sm font-medium">
                {statusDisplayName}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-amber-800">角色：</span>
              <span className="text-sm font-medium text-amber-900">{roleDisplayName}</span>
            </div>
          </div>
        </div>

        {/* 账户信息卡片 */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
              <i className="fa-solid fa-user text-2xl text-blue-700"></i>
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-blue-900">账户信息</h3>
              <p className="text-sm text-blue-700">您的基本信息</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-800">用户名：</span>
              <span className="text-sm font-medium text-blue-900">{currentUser?.username}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-800">姓名：</span>
              <span className="text-sm font-medium text-blue-900">{currentUser?.real_name}</span>
            </div>
          </div>
        </div>

        {/* 监控状态卡片 */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-green-200 rounded-lg flex items-center justify-center">
              <i className={`fa-solid text-2xl text-green-700 ${monitoringActive ? 'fa-radar fa-spin' : 'fa-clock'}`}></i>
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-green-900">状态监控</h3>
              <p className="text-sm text-green-700">
                {monitoringActive ? '实时监控中' : '监控已停止'}
              </p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-green-900">
              {currentTime.toLocaleTimeString('zh-CN')}
            </p>
            <p className="text-sm text-green-700">
              {currentTime.toLocaleDateString('zh-CN')}
            </p>
            {monitoringActive && (
              <p className="text-xs text-green-600 mt-2">
                每30秒自动检查一次
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 审批信息区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          <i className="fa-solid fa-info-circle text-blue-600 mr-2"></i>
          审批信息
        </h2>
        
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4">
          <h3 className="font-medium text-gray-900 mb-2">当前状态说明</h3>
          <p className="text-gray-700 text-sm leading-relaxed">
            您的管理员权限申请已提交成功，正在等待超级管理员的审核。审核通过后，您将获得完整的系统访问权限，
            包括数据查看、报告管理、用户评估等功能。请耐心等待，通常审核会在1-2个工作日内完成。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-yellow-50 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">
              <i className="fa-solid fa-exclamation-triangle text-yellow-600 mr-2"></i>
              待审批期间
            </h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• 可以访问个人设置</li>
              <li>• 可以查看审批状态</li>
              <li>• 暂时无法访问数据功能</li>
              <li>• 可以随时联系管理员</li>
            </ul>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">
              <i className="fa-solid fa-check-circle text-green-600 mr-2"></i>
              审批通过后
            </h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• 完整的数据访问权限</li>
              <li>• WAB报告查看功能</li>
              <li>• 用户评估管理</li>
              <li>• 系统所有管理功能</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 联系信息 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          <i className="fa-solid fa-phone text-green-600 mr-2"></i>
          需要帮助？
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">联系超级管理员</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p><i className="fa-solid fa-envelope mr-2"></i>邮箱：admin@system.com</p>
              <p><i className="fa-solid fa-phone mr-2"></i>电话：400-000-0000</p>
              <p><i className="fa-solid fa-clock mr-2"></i>工作时间：周一至周五 9:00-18:00</p>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="font-medium text-purple-900 mb-2">常见问题</h4>
            <div className="text-sm text-purple-800 space-y-1">
              <p>• 审批需要多长时间？通常1-2个工作日</p>
              <p>• 如何加快审批？请联系超级管理员</p>
              <p>• 审批失败怎么办？会收到邮件通知</p>
            </div>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={handleRefresh}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
        >
          <i className="fa-solid fa-refresh mr-2"></i>
          刷新审批状态
        </button>
        
        <button
          onClick={handleSwitchAccount}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
        >
          <i className="fa-solid fa-user-switch mr-2"></i>
          切换账户
        </button>
      </div>
    </div>
  );
}
