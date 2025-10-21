/**
 * 待审批界面组件
 * 当用户处于viewer状态时显示的等待审批界面
 */

import { useState, useEffect } from 'react';
import { PermissionManager, UserStatus } from '@/lib/permissions';
import { handleLogout } from '@/lib/logout';

export default function PendingApproval() {
  const [currentUser, setCurrentUser] = useState(PermissionManager.getCurrentUser());
  const [currentTime, setCurrentTime] = useState(new Date());

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const userRole = PermissionManager.getCurrentUserRole();
  const roleDisplayName = PermissionManager.getRoleDisplayName(userRole);
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* 主要内容卡片 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* 图标 */}
          <div className="w-20 h-20 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
            <i className="fa-solid fa-hourglass-half text-3xl text-amber-600"></i>
          </div>
          
          {/* 标题 */}
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            管理员申请审批中
          </h1>
          
          {/* 状态描述 */}
          <div className="bg-amber-50 rounded-lg p-4 mb-6">
            <p className="text-amber-800 font-medium mb-2">
              <i className="fa-solid fa-info-circle mr-2"></i>
              当前状态
            </p>
            <p className="text-amber-700 text-sm">
              您的管理员权限申请正在审批中，请耐心等待超级管理员的审核。
              审核通过后，您将获得完整的数据访问权限。
            </p>
          </div>
          
          {/* 用户信息 */}
          {currentUser && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-800 mb-3">申请信息</h3>
              <div className="text-sm text-gray-600 space-y-2">
                <div className="flex justify-between">
                  <span>用户名：</span>
                  <span className="font-medium">{currentUser.username}</span>
                </div>
                <div className="flex justify-between">
                  <span>姓名：</span>
                  <span className="font-medium">{currentUser.real_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>当前角色：</span>
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-medium">
                    {roleDisplayName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>审批状态：</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    {statusDisplayName}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* 联系信息 */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              <i className="fa-solid fa-phone mr-2"></i>
              需要帮助？
            </h3>
            <p className="text-sm text-blue-700">
              如有疑问，请联系系统超级管理员<br/>
              邮箱：admin@system.com<br/>
              电话：400-000-0000
            </p>
          </div>
          
          {/* 操作按钮 */}
          <div className="space-y-3">
            <button
              onClick={handleRefresh}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <i className="fa-solid fa-refresh mr-2"></i>
              刷新审批状态
            </button>
            
            <button
              onClick={handleSwitchAccount}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              <i className="fa-solid fa-user-switch mr-2"></i>
              切换账户
            </button>
          </div>
          
          {/* 提示信息 */}
          <div className="mt-6 p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-700">
              <i className="fa-solid fa-lightbulb mr-1"></i>
              提示：审批通过后，系统会自动更新您的权限，请定期刷新页面查看状态。
            </p>
          </div>
        </div>
        
        {/* 底部信息 */}
        <div className="text-center text-sm text-gray-500 mt-6">
          <p>当前时间：{currentTime.toLocaleString('zh-CN')}</p>
          <p className="mt-1">管理员权限系统 • 安全访问控制</p>
        </div>
      </div>
    </div>
  );
}
