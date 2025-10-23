/**
 * 退出登录确认弹窗组件
 */

import { useEffect } from 'react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  userInfo?: {
    real_name?: string;
    username?: string;
    role?: string;
  };
}

export default function LogoutConfirmModal({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  loading = false,
  userInfo 
}: LogoutConfirmModalProps) {
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

  // 获取用户显示名称
  const getUserDisplayName = () => {
    if (!userInfo) return '用户';
    
    const displayName = userInfo.real_name || userInfo.username || '用户';
    const roleText = getRoleDisplayName(userInfo.role || '');
    
    return `${displayName}（${roleText}）`;
  };
  // ESC键关闭弹窗
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '0px',
      left: '0px',
      right: '0px',
      bottom: '0px',
      width: '100vw',
      height: '100vh',
      overflowY: 'auto',
      zIndex: 2147483647,
      margin: '0',
      border: 'none',
      outline: 'none'
    }}>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onCancel}
      />
      
      {/* 弹窗内容 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-auto transform transition-all">
          
          {/* 弹窗头部 */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <i className="fa-solid fa-sign-out-alt text-red-600 text-xl"></i>
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              确认退出登录
            </h3>
            
            <p className="text-sm text-gray-600 text-center">
              您确定要退出当前账户吗？退出后需要重新登录才能访问系统。
            </p>
          </div>

          {/* 用户信息 */}
          {userInfo && (
            <div className="px-6 pb-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    {userInfo.role === 'super_admin' ? (
                      <i className="fa-solid fa-crown text-yellow-600"></i>
                    ) : userInfo.role === 'viewer' ? (
                      <i className="fa-solid fa-hourglass-half text-yellow-600"></i>
                    ) : (
                      <i className="fa-solid fa-user text-blue-600"></i>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-xs text-gray-500">
                      登录账号：{userInfo.username}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="px-6 pb-6">
            <div className="flex space-x-3">
              <button
                onClick={onCancel}
                disabled={loading}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                <i className="fa-solid fa-times mr-2"></i>
                取消
              </button>
              
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-300"
              >
                <i className={`mr-2 ${loading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-sign-out-alt'}`}></i>
                {loading ? '退出中...' : '确认退出'}
              </button>
            </div>
          </div>

          {/* 提示信息 */}
          <div className="px-6 pb-6">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex">
                <i className="fa-solid fa-info-circle text-blue-600 text-sm mt-0.5 mr-2"></i>
                <p className="text-xs text-blue-800">
                  提示：退出登录后，您的登录状态将被清除，但浏览器中保存的其他数据不受影响。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
