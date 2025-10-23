import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { showError } from '@/lib/toast';

// 根据API文档定义用户类型
interface User {
  id: number;
  real_name: string | null;
  phone: string;
  gender: string | null;
  age: number | null;
  ethnicity: string | null;
  assessment_location: string | null;
  education_level: string | null;
  occupation: string | null;
  residence: string | null;
  mandarin_level_pre_illness: string | null;
  language_background: string | null;
  created_at: string | null;
  last_login_at: string | null;
  evaluation_stats: {
    total_evaluations: number;
    last_evaluation_date: string | null;
  };
}

// API响应类型
interface UserListResponse {
  total: number;
  page: number;
  page_size: number;
  users: User[];
}

// 搜索和过滤参数
interface SearchFilters {
  search: string;
  gender: string;
  min_age: string;
  max_age: string;
  education_level: string;
  has_evaluations: string;
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  
  // 搜索和过滤状态
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    gender: '',
    min_age: '',
    max_age: '',
    education_level: '',
    has_evaluations: ''
  });
  
  // API调用函数
  const fetchUsers = async (page: number = currentPage, searchFilters: SearchFilters = filters) => {
    setLoading(true);
    setError(null);
    
    try {
      // 构建查询参数
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());
      
      if (searchFilters.search) params.append('search', searchFilters.search);
      if (searchFilters.gender) params.append('gender', searchFilters.gender);
      if (searchFilters.min_age) params.append('min_age', searchFilters.min_age);
      if (searchFilters.max_age) params.append('max_age', searchFilters.max_age);
      if (searchFilters.education_level) params.append('education_level', searchFilters.education_level);
      if (searchFilters.has_evaluations) params.append('has_evaluations', searchFilters.has_evaluations);
      
      const response = await fetch(`/api/v1/admin/user-list?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`获取数据失败: ${response.status}`);
      }
      
      const data: UserListResponse = await response.json();
      setUsers(data.users);
      setTotal(data.total);
      setCurrentPage(data.page);
      
    } catch (error) {
      console.error('获取数据失败:', error);
      const errorMessage = error instanceof Error ? error.message : '获取数据失败';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // 初始化数据
  useEffect(() => {
    fetchUsers(1, filters);
  }, []);
  
  // 搜索和过滤变化时重新获取数据
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchUsers(1, filters);
    }, 300); // 防抖，避免频繁请求
    
    return () => clearTimeout(timeoutId);
  }, [filters]);
  
  // 分页逻辑
  const totalPages = Math.ceil(total / pageSize);
  
  // 格式化日期
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // 处理页码变更
  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages && page !== currentPage) {
      fetchUsers(page, filters);
    }
  };
  
  // 处理过滤器变更
  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // 重置过滤器
  const resetFilters = () => {
    setFilters({
      search: '',
      gender: '',
      min_age: '',
      max_age: '',
      education_level: '',
      has_evaluations: ''
    });
  };
  
  return (
    <div className="h-full flex flex-col space-y-2">
      {/* 搜索和筛选 */}
      <div className="bg-white rounded-lg border border-gray-200 px-3 py-2">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          {/* 搜索框 */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fa-solid fa-search text-gray-400 text-sm"></i>
              </div>
              <input
                type="text"
                placeholder="搜索姓名、手机号..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
          </div>
          
          {/* 过滤器组 */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* 性别 */}
            <div className="relative min-w-[80px]">
              <select
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white appearance-none"
                value={filters.gender}
                onChange={(e) => handleFilterChange('gender', e.target.value)}
              >
                <option value="">全部性别</option>
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <i className="fa-solid fa-chevron-down text-gray-400 text-sm"></i>
              </div>
            </div>
            
            {/* 评估记录 */}
            <div className="relative min-w-[90px]">
              <select
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white appearance-none"
                value={filters.has_evaluations}
                onChange={(e) => handleFilterChange('has_evaluations', e.target.value)}
              >
                <option value="">全部评估</option>
                <option value="true">有评估</option>
                <option value="false">无评估</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <i className="fa-solid fa-chevron-down text-gray-400 text-sm"></i>
              </div>
            </div>
            
            {/* 年龄范围 */}
            <div className="flex items-center gap-1">
              <input
                type="number"
                placeholder="最小年龄"
                className="w-24 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-center"
                value={filters.min_age}
                onChange={(e) => handleFilterChange('min_age', e.target.value)}
              />
              <span className="text-gray-400 text-xs">-</span>
              <input
                type="number"
                placeholder="最大年龄"
                className="w-24 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-center"
                value={filters.max_age}
                onChange={(e) => handleFilterChange('max_age', e.target.value)}
              />
            </div>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={resetFilters}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm transition-colors"
              title="重置筛选条件"
            >
              <i className="fa-solid fa-rotate-left"></i>
            </button>
          </div>
        </div>
      </div>
      
      {/* 数据表格 */}
      <div className="bg-white rounded-t-lg overflow-hidden border-t border-l border-r border-gray-200 flex-1 flex flex-col">
        {error ? (
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500 mb-2">{error}</p>
            <button
              onClick={() => fetchUsers(currentPage, filters)}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs transition-colors"
            >
              重试
            </button>
          </div>
        ) : (
        <>
          <div className="overflow-x-auto flex-1 overflow-y-auto min-h-0">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">用户信息</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">个人信息</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">地区信息</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">评估统计</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">注册时间</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">最后登录</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-2 py-4 text-center">
                        <div className="flex items-center justify-center">
                          <i className="fa-solid fa-spinner fa-spin text-sm text-gray-400 mr-2"></i>
                          <span className="text-sm text-gray-500">加载中...</span>
                        </div>
                      </td>
                    </tr>
                  ) : users.length > 0 ? (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        {/* 用户信息 */}
                        <td className="px-4 py-2">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                              <i className="fa-solid fa-user text-xs"></i>
                            </div>
                            <div className="ml-2">
                              <div className="text-sm font-medium text-gray-900">
                                {user.real_name || '未填写'}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {user.id} | {user.phone}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        {/* 个人信息 */}
                        <td className="px-4 py-2">
                          <div className="text-sm text-gray-900">
                            <div className="flex items-center mb-1">
                              {user.gender && (
                                <span className={cn(
                                  "px-1 py-0.5 text-xs rounded mr-1",
                                  user.gender === '男' ? "bg-blue-100 text-blue-800" : 
                                  user.gender === '女' ? "bg-pink-100 text-pink-800" : 
                                  "bg-gray-100 text-gray-800"
                                )}>
                                  {user.gender}
                                </span>
                              )}
                              {user.age && <span className="text-gray-600">{user.age}岁</span>}
                            </div>
                            <div className="text-xs text-gray-500">
                              {user.ethnicity && <div>民族: {user.ethnicity}</div>}
                              {user.education_level && <div>学历: {user.education_level}</div>}
                              {user.occupation && <div>职业: {user.occupation}</div>}
                            </div>
                          </div>
                        </td>
                        
                        {/* 地区信息 */}
                        <td className="px-4 py-2">
                          <div className="text-sm text-gray-900">
                            {user.assessment_location && (
                              <div className="text-xs text-gray-600 mb-1">
                                评估: {user.assessment_location}
                              </div>
                            )}
                            {user.residence && (
                              <div className="text-xs text-gray-500">
                                居住: {user.residence}
                              </div>
                            )}
                          </div>
                        </td>
                        
                        {/* 评估统计 */}
                        <td className="px-4 py-2">
                          <div className="text-sm">
                            <div className="flex items-center mb-1">
                              <span className="text-blue-600 font-semibold">
                                {user.evaluation_stats.total_evaluations}
                              </span>
                              <span className="text-gray-500 text-xs ml-1">次评估</span>
                            </div>
                            {user.evaluation_stats.last_evaluation_date && (
                              <div className="text-xs text-gray-500">
                                最后: {user.evaluation_stats.last_evaluation_date}
                              </div>
                            )}
                          </div>
                        </td>
                        
                        {/* 注册时间 */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(user.created_at)}
                        </td>
                        
                        {/* 最后登录 */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {user.last_login_at ? (
                            <span className="text-gray-900">{formatDate(user.last_login_at)}</span>
                          ) : (
                            <span className="text-gray-400">从未登录</span>
                          )}
                        </td>
                        
                        {/* 操作 */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link 
                            to={`/wab/reports?userId=${user.id}&userName=${encodeURIComponent(user.real_name || user.phone || user.id.toString())}`}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            查看报告
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-2 py-4 text-center">
                        <span className="text-sm text-gray-500">暂无数据</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      {/* 分页控件 */}
      {!error && !loading && totalPages > 1 && (
        <div className="bg-white border-t-0 border-l border-r border-b border-gray-200 rounded-b-lg -mt-2">
          <div className="px-4 py-1 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              共 {total} 条
            </div>
            <div className="flex space-x-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="px-3 py-1 rounded text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                &lt;
              </button>
              
              {(() => {
                const pages = [];
                
                if (totalPages <= 7) {
                  // 总页数 <= 7，显示所有页码
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => handlePageChange(i)}
                        disabled={loading}
                        className={cn(
                          "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                          currentPage === i 
                            ? 'text-blue-600 font-semibold' 
                            : 'text-gray-700',
                          loading && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        {i}
                      </button>
                    );
                  }
                } else {
                  // 总页数 > 7，智能显示
                  
                  // 第1页
                  pages.push(
                    <button
                      key={1}
                      onClick={() => handlePageChange(1)}
                      disabled={loading}
                      className={cn(
                        "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                        currentPage === 1 
                          ? 'text-blue-600 font-semibold' 
                          : 'text-gray-700',
                        loading && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      1
                    </button>
                  );
                  
                  if (currentPage <= 4) {
                    // 当前页在前面：1 2 3 4 5 ... 最后页
                    for (let i = 2; i <= Math.min(5, totalPages - 1); i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => handlePageChange(i)}
                          disabled={loading}
                          className={cn(
                            "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                            currentPage === i 
                              ? 'text-blue-600 font-semibold' 
                              : 'text-gray-700',
                            loading && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          {i}
                        </button>
                      );
                    }
                    if (totalPages > 6) {
                      pages.push(<span key="ellipsis1" className="px-2 py-2 text-sm text-gray-400">...</span>);
                    }
                  } else if (currentPage >= totalPages - 3) {
                    // 当前页在后面：1 ... 倒数第4页 倒数第3页 倒数第2页 倒数第1页 最后页
                    if (totalPages > 6) {
                      pages.push(<span key="ellipsis1" className="px-2 py-2 text-sm text-gray-400">...</span>);
                    }
                    for (let i = Math.max(2, totalPages - 4); i <= totalPages - 1; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => handlePageChange(i)}
                          disabled={loading}
                          className={cn(
                            "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                            currentPage === i 
                              ? 'text-blue-600 font-semibold' 
                              : 'text-gray-700',
                            loading && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          {i}
                        </button>
                      );
                    }
                  } else {
                    // 当前页在中间：1 ... 前页 当前页 后页 ... 最后页
                    pages.push(<span key="ellipsis1" className="px-2 py-2 text-sm text-gray-400">...</span>);
                    
                    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => handlePageChange(i)}
                          disabled={loading}
                          className={cn(
                            "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                            currentPage === i 
                              ? 'text-blue-600 font-semibold' 
                              : 'text-gray-700',
                            loading && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          {i}
                        </button>
                      );
                    }
                    
                    pages.push(<span key="ellipsis2" className="px-2 py-2 text-sm text-gray-400">...</span>);
                  }
                  
                  // 最后一页
                  if (totalPages > 1) {
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => handlePageChange(totalPages)}
                        disabled={loading}
                        className={cn(
                          "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                          currentPage === totalPages 
                            ? 'text-blue-600 font-semibold' 
                            : 'text-gray-700',
                          loading && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        {totalPages}
                      </button>
                    );
                  }
                }
                
                return pages;
              })()}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
                className="px-3 py-1 rounded text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                &gt;
              </button>
              
              <button
                onClick={() => fetchUsers(currentPage, filters)}
                disabled={loading}
                className="px-3 py-1 rounded text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={loading ? '加载中...' : '刷新列表'}
              >
                <i className={cn(
                  "fa-solid",
                  loading ? 'fa-spinner fa-spin' : 'fa-refresh'
                )}></i>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}