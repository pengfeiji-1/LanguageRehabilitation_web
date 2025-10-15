import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '@/contexts/authContext';
import { TokenManager } from '@/lib/api';

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
  
  // 获取当前用户信息
  const adminInfo = TokenManager.getAdminInfo();
  const isSuperAdmin = adminInfo?.role === 'super_admin';
  
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
  
  // 导航菜单数据
   // 导航菜单数据 - 重构为层级结构
  
  const navItems: NavItem[] = [
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
      ]
    },
    { path: '/settings', name: '系统设置', icon: 'fa-cog' },
  ];
  
  // 如果是超级管理员，添加管理员管理菜单
  if (isSuperAdmin) {
    navItems.splice(1, 0, { path: '/register', name: '创建管理员', icon: 'fa-user-plus' });
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
      {/* 侧边导航栏 */}
      <aside 
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white shadow-md transition-all duration-300 ease-in-out z-20 flex flex-col`}
      >
        {/* 品牌标识 */}
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <div className={`flex items-center ${!sidebarOpen && 'justify-center w-full'}`}>
            <i className="fa-solid fa-chart-line text-blue-600 text-xl mr-2"></i>
            {sidebarOpen && <span className="font-bold text-lg">管理系统</span>}
          </div>
          <button 
            onClick={toggleSidebar}
            className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none"
          >
            <i className={`fa-solid ${sidebarOpen ? 'fa-chevron-left' : 'fa-chevron-right'}`}></i>
          </button>
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
                        className={`flex items-center justify-between w-full px-3 py-3 text-sm font-medium rounded-md transition-colors ${
                          isMenuItemActive(item)
                            ? 'bg-blue-100 text-blue-700'
                           : 'text-gray-700 hover:bg-gray-100'
                       }`}
                        onClick={() => toggleMenu(item.path)}
                      >
                        <div className="flex items-center">
                          <i className={`fa-solid ${item.icon} ${sidebarOpen ? 'mr-3' : 'mx-auto'}`}></i>
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
                     className={`flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors ${
                        isPathActive(item.path, location.pathname)
                          ? 'bg-blue-100 text-blue-700'
                         : 'text-gray-700 hover:bg-gray-100'
                     }`}
                   >
                     <i className={`fa-solid ${item.icon} ${sidebarOpen ? 'mr-3' : 'mx-auto'}`}></i>
                     {sidebarOpen && <span>{item.name}</span>}
                   </Link>
                 )}
               </li>
             ))}
           </ul>
         </nav>
      </aside>
      
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center">
              <button 
                onClick={toggleSidebar}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none mr-2"
              >
                <i className={`fa-solid ${sidebarOpen ? 'fa-bars-staggered' : 'fa-bars'}`}></i>
              </button>
              <h1 className="text-lg font-semibold text-gray-900">
                {getCurrentPageName()}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 用户信息 */}
              <div className="relative group">
                <button className="flex items-center text-sm focus:outline-none">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <i className="fa-solid fa-user"></i>
                  </div>
                  {sidebarOpen && (
                    <span className="ml-2 text-gray-700 group-hover:text-blue-600 transition-colors">管理员</span>
                  )}
                </button>
              </div>
              
              {/* 退出登录 */}
              <button
                onClick={logout}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none"
                title="退出登录"
              >
                <i className="fa-solid fa-sign-out-alt"></i>
              </button>
            </div>
          </div>
        </header>
        
        {/* 页面内容 */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}