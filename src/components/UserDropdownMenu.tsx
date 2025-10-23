import { useState, useRef, useEffect } from 'react';
import { TokenManager } from '@/lib/api';

interface UserDropdownMenuProps {
  onLogout: () => void;
  sidebarOpen: boolean;
}

export default function UserDropdownMenu({ onLogout, sidebarOpen }: UserDropdownMenuProps) {
  // 状态管理
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  // 获取用户信息
  const adminInfo = TokenManager.getAdminInfo();
  const isSuperAdmin = adminInfo?.role === 'super_admin';
  const isPendingUser = adminInfo?.role === 'viewer';

  // 获取角色显示名称
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin':
        return '超级管理员';
      case 'admin':
        return '管理员';
      case 'viewer':
        return '观察员';
      default:
        return '用户';
    }
  };


  // 鼠标进入处理
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(true);
  };

  // 鼠标离开处理
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150); // 150ms延迟，避免鼠标快速移动时菜单闪烁
  };

  // 点击外部关闭和modal-open类管理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // 添加modal-open类，禁用背景sticky定位
      document.body.classList.add('modal-open');
    } else {
      // 移除modal-open类
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.classList.remove('modal-open');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isOpen]);

  // 处理菜单项点击
  const handleMenuItemClick = (action: string) => {
    setIsOpen(false);
    
    switch (action) {
      case 'logout':
        onLogout();
        break;
      case 'profile':
        // TODO: 跳转到个人设置页面
        console.log('跳转到个人设置');
        break;
      case 'security':
        // TODO: 跳转到安全设置页面
        console.log('跳转到安全设置');
        break;
      case 'user-management':
        // TODO: 跳转到用户管理页面
        window.location.href = '/admin/users';
        break;
      default:
        break;
    }
  };

  return (
    <div 
      ref={dropdownRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 触发按钮 */}
      <button 
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* 用户头像 */}
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
          {isSuperAdmin ? (
            <i className="fa-solid fa-crown text-yellow-600"></i>
          ) : isPendingUser ? (
            <i className="fa-solid fa-hourglass-half text-yellow-600"></i>
          ) : (
            <i className="fa-solid fa-user"></i>
          )}
        </div>
        
        {/* 用户名称 - 仅在侧边栏打开时显示 */}
        {sidebarOpen && (
          <span className="text-gray-700 text-sm font-medium truncate max-w-32">
            {adminInfo?.real_name || adminInfo?.username || '用户'}
          </span>
        )}
        
        {/* 下拉箭头 */}
        <i 
          className={`fa-solid fa-chevron-down text-gray-400 text-xs transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        ></i>
      </button>

      {/* 下拉菜单面板 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 transform transition-all duration-200 ease-out opacity-100 scale-100">
          {/* 用户信息区域 */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              {/* 大头像 */}
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                {isSuperAdmin ? (
                  <i className="fa-solid fa-crown text-yellow-600 text-lg"></i>
                ) : isPendingUser ? (
                  <i className="fa-solid fa-hourglass-half text-yellow-600 text-lg"></i>
                ) : (
                  <i className="fa-solid fa-user text-lg"></i>
                )}
              </div>
              
              {/* 用户详细信息 */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {adminInfo?.real_name || adminInfo?.username || '用户'}
                </h3>
                <p className="text-sm text-gray-500 truncate">
                  账号ID: {adminInfo?.username || 'unknown'}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isSuperAdmin 
                      ? 'bg-yellow-100 text-yellow-800'
                      : isPendingUser 
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {getRoleDisplayName(adminInfo?.role || '')}
                  </span>
                  {isSuperAdmin && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      管理权限
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 功能菜单区域 */}
          <div className="py-2">
            {/* 账号管理部分 */}
            <div className="px-4 py-2">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                账号管理
              </h4>
              <div className="space-y-1">
                <button 
                  onClick={() => handleMenuItemClick('profile')}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md transition-colors flex items-center"
                >
                  <i className="fa-solid fa-user-cog text-gray-400 mr-3 w-4"></i>
                  <span className="text-gray-700">个人设置</span>
                </button>
                <button 
                  onClick={() => handleMenuItemClick('security')}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md transition-colors flex items-center"
                >
                  <i className="fa-solid fa-shield-alt text-gray-400 mr-3 w-4"></i>
                  <span className="text-gray-700">安全设置</span>
                </button>
              </div>
            </div>
            
            {/* 管理功能部分 - 仅超级管理员可见 */}
            {isSuperAdmin && (
              <>
                <hr className="my-2 border-gray-100" />
                <div className="px-4 py-2">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    管理功能
                  </h4>
                  <div className="space-y-1">
                    <button 
                      onClick={() => handleMenuItemClick('user-management')}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md transition-colors flex items-center"
                    >
                      <i className="fa-solid fa-users-cog text-gray-400 mr-3 w-4"></i>
                      <span className="text-gray-700">用户审批</span>
                    </button>
                  </div>
                </div>
              </>
            )}
            
            {/* 分隔线 */}
            <hr className="my-2 border-gray-100" />
            
            {/* 退出登录 */}
            <div className="px-4 py-2">
              <button 
                onClick={() => handleMenuItemClick('logout')}
                className="w-full text-left px-3 py-2 hover:bg-red-50 rounded-md transition-colors flex items-center"
              >
                <i className="fa-solid fa-sign-out-alt text-red-500 mr-3 w-4"></i>
                <span className="text-red-600 font-medium">退出登录</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
