import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '@/contexts/authContext';
import { TokenManager, adminAPI } from '@/lib/api';
import LogoutConfirmModal from './LogoutConfirmModal';
import UserDropdownMenu from './UserDropdownMenu';

// 导航菜单项类型定义
interface NavItem {
  path: string;
  name: string;
  icon: string;
  children?: NavItem[];
}

export default function Layout({ children }: { children: React.ReactNode }) {
  // 从localStorage读取侧边栏状态
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? saved === 'true' : true;
  });
  
  // 从localStorage读取展开菜单状态
  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => {
    const saved = localStorage.getItem('expandedMenus');
    return saved ? JSON.parse(saved) : [];
  });
  
  const location = useLocation();
  const { logout } = useContext(AuthContext);
  
  // 退出登录确认弹窗状态
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  
  // 待审批数量状态
  const [pendingCount, setPendingCount] = useState(0);
  
  // 获取当前用户信息
  const adminInfo = TokenManager.getAdminInfo();
  const isSuperAdmin = adminInfo?.role === 'super_admin';
  const isPendingUser = adminInfo?.role === 'viewer';

  
  // 切换菜单展开/折叠状态
  const toggleMenu = (path: string) => {
    setExpandedMenus(prev => {
      const newExpanded = prev.includes(path) 
        ? prev.filter(item => item !== path) 
        : [...prev, path];
      localStorage.setItem('expandedMenus', JSON.stringify(newExpanded));
      return newExpanded;
    });
  };

  // 获取待审批数量
  const fetchPendingCount = async () => {
    // 只有超级管理员才显示待审批消息
    if (!isSuperAdmin) {
      return;
    }
    
    try {
      const response = await adminAPI.getApprovalStatistics();
      if (response.success && response.data) {
        setPendingCount(response.data.pending_count || 0);
      }
    } catch (error) {
      console.error('获取待审批数量失败:', error);
      // 静默处理错误，不影响主要功能
    }
  };
  
  // 导航菜单数据
  // 导航菜单数据 - 重构为层级结构
  
  let navItems: NavItem[] = [];
  
  if (isPendingUser) {
    // 待审批用户只能看到基本功能
    navItems = [
      { path: '/dashboard', name: '审批状态', icon: 'fa-hourglass-half' },
      { path: '/settings', name: '个人设置', icon: 'fa-user-cog' },
    ];
  } else {
    // 正常管理员菜单
    navItems = [
      { path: '/dashboard', name: '数据概览', icon: 'fa-chart-pie' },
    { 
      path: '/users', 
      name: '用户管理', 
      icon: 'fa-users',
      children: [
        { path: '/users/list', name: '用户列表', icon: 'fa-list' },

        { path: '/users/playback', name: '训练回放', icon: 'fa-video' },
      ]
    },
    { 
      path: '/exams', 
      name: '试卷管理', 
      icon: 'fa-file-alt',
      children: [
            { path: '/exams/list', name: '试卷查看', icon: 'fa-list' },
      ]
    },
    { 
      path: '/wab', 
      name: 'WAB报告', 
      icon: 'fa-chart-bar',
      children: [
            { path: '/wab/reports', name: '报告列表', icon: 'fa-list' },
            { path: '/wab/annotations', name: '评估标注', icon: 'fa-edit' }, // 新增标注功能入口
      ]
    },
    ];
    
    // 超级管理员的管理功能已移至用户下拉菜单中
  }
  
  // 检查路径是否匹配（支持子路由）
  const isPathActive = (itemPath: string, currentPath: string) => {
    if (itemPath === currentPath) return true;
    // 对于有子菜单的项目，检查当前路径是否以该项目路径开头
    return currentPath.startsWith(itemPath + '/');
  };
  
  // 检查菜单项是否应该高亮（包括子菜单）
  const isMenuItemActive = (item: NavItem) => {
    if (isPathActive(item.path, location.pathname)) return true;
    if (item.children) {
      return item.children.some(child => isPathActive(child.path, location.pathname));
    }
    return false;
  };
  
  // 获取当前页面名称
  const getCurrentPageName = () => {
    const currentPath = location.pathname;
    
    // 首先检查是否有直接匹配的项目
    for (const item of navItems) {
      if (isPathActive(item.path, currentPath)) {
        return item.name;
      }
      
      // 检查子菜单
      if (item.children) {
        for (const child of item.children) {
          if (isPathActive(child.path, currentPath)) {
            return child.name;
          }
        }
      }
    }
    
    return '控制台';
  };
  
  // 获取待审批数量 - 仅对超级管理员
  useEffect(() => {
    if (isSuperAdmin) {
      // 立即获取一次
      fetchPendingCount();
      
      // 每30秒更新一次
      const interval = setInterval(fetchPendingCount, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isSuperAdmin]);

  // 根据当前路由自动展开对应的父菜单
  useEffect(() => {
    const currentPath = location.pathname;
    const shouldExpand: string[] = [];
    
    navItems.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => 
          isPathActive(child.path, currentPath)
        );
        if (hasActiveChild && !expandedMenus.includes(item.path)) {
          shouldExpand.push(item.path);
        }
      }
    });
    
    if (shouldExpand.length > 0) {
      setExpandedMenus(prev => {
        const newExpanded = [...new Set([...prev, ...shouldExpand])];
        localStorage.setItem('expandedMenus', JSON.stringify(newExpanded));
        return newExpanded;
      });
    }
  }, [location.pathname]);
  
  // 切换侧边栏展开/收起
  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    localStorage.setItem('sidebarOpen', newState.toString());
  };
  
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* 侧边导航栏 */}
      <aside 
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } bg-white shadow-md transition-all duration-300 ease-in-out z-20 flex flex-col fixed lg:relative inset-y-0 left-0`}
      >
        {/* 品牌标识 */}
        <div className={`flex items-center h-16 px-4 border-b ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          <div className={`flex items-center ${!sidebarOpen && 'justify-center'}`}>
            <i className={`fa-solid fa-chart-line text-blue-600 text-xl ${sidebarOpen ? 'mr-2' : ''}`}></i>
            {sidebarOpen && <span className="font-bold text-lg">管理系统</span>}
          </div>
          {sidebarOpen && (
            <button 
              onClick={toggleSidebar}
              className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none"
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>
          )}
        </div>
        
        {/* 导航菜单 */}
         <nav className="flex-1 overflow-y-auto py-4 px-3">
           <ul className="space-y-1">
             {navItems.map((item) => (
               <li key={item.path} className="group">
                 {item.children ? (
                   <>
                       {/* 检查是否有子项与当前路径匹配 */}
                      <button
                       className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'} w-full px-3 py-3 text-sm font-medium rounded-md transition-colors ${
                         isMenuItemActive(item)
                           ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                       onClick={() => toggleMenu(item.path)}
                     >
                       <div className={`flex items-center ${!sidebarOpen && 'justify-center w-full'}`}>
                         <i className={`fa-solid ${item.icon} ${sidebarOpen ? 'mr-3' : ''}`}></i>
                         {sidebarOpen && <span>{item.name}</span>}
                       </div>
                        {sidebarOpen && (
                          <i className={`fa-solid fa-chevron-down transition-transform duration-200 ${
                            expandedMenus.includes(item.path) ? 'rotate-180' : ''
                          }`}></i>
                        )}
                      </button>
                     
                      {sidebarOpen && expandedMenus.includes(item.path) && (
                        <ul className="pl-10 mt-1 space-y-1">
                         {item.children.map((child) => (
                           <li key={child.path}>
                             <Link
                               to={child.path}
                               className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                  isPathActive(child.path, location.pathname)
                                    ? 'bg-blue-100 text-blue-700'
                                   : 'text-gray-700 hover:bg-gray-100'
                               }`}
                             >
                               <i className={`fa-solid ${child.icon} mr-3`}></i>
                               <span>{child.name}</span>
                             </Link>
                           </li>
                         ))}
                       </ul>
                     )}
                   </>
                 ) : (
                  <Link
                    to={item.path}
                    className={`flex items-center ${sidebarOpen ? '' : 'justify-center'} px-3 py-3 text-sm font-medium rounded-md transition-colors ${
                       isPathActive(item.path, location.pathname)
                         ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <i className={`fa-solid ${item.icon} ${sidebarOpen ? 'mr-3' : ''}`}></i>
                    {sidebarOpen && <span>{item.name}</span>}
                  </Link>
                 )}
               </li>
             ))}
           </ul>
         </nav>
      </aside>
      
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* 顶部导航栏 */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center min-w-0">
              <button 
                onClick={toggleSidebar}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none mr-2 lg:mr-2"
              >
                <i className={`fa-solid ${sidebarOpen ? 'fa-bars-staggered' : 'fa-bars'}`}></i>
              </button>
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {getCurrentPageName()}
              </h1>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
              {/* 待审批消息图标 - 仅对超级管理员显示 */}
              {isSuperAdmin && (
                <Link
                  to="/admin/users"
                  className="relative p-1 sm:p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none transition-colors"
                  title={`待审批用户 (${pendingCount})`}
                >
                  <i className="fa-solid fa-bell text-base sm:text-lg"></i>
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </Link>
              )}

              {/* 用户下拉菜单 */}
              <UserDropdownMenu
                onLogout={() => setShowLogoutModal(true)}
                sidebarOpen={sidebarOpen}
              />
            </div>
          </div>
        </header>
        
        {/* 页面内容 */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-4 lg:p-6">
          {children}
        </main>
      </div>
      
      {/* 退出登录确认弹窗 */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        loading={logoutLoading}
        onConfirm={async () => {
          setLogoutLoading(true);
          try {
            await logout();
          } catch (error) {
            console.error('退出登录失败:', error);
            setLogoutLoading(false);
          }
          // 注意：成功退出后会跳转页面，所以不需要重置loading状态
        }}
        onCancel={() => {
          if (!logoutLoading) {
            setShowLogoutModal(false);
          }
        }}
        userInfo={adminInfo}
      />
    </div>
  );
}