/**
 * 基于角色的路由保护组件
 * 替代原有的ProtectedRoute，增加权限检查
 */

import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '@/contexts/authContext';
import { PermissionManager } from '@/lib/permissions';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  requireDataAccess?: boolean; // 是否需要数据访问权限
}

export default function RoleBasedRoute({ 
  children, 
  requireDataAccess = true 
}: RoleBasedRouteProps) {
  const { isAuthenticated } = useContext(AuthContext);

  // 检查是否已登录
  if (!isAuthenticated || !PermissionManager.isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  // 如果不需要数据访问权限，直接渲染（如个人设置页面）
  if (!requireDataAccess) {
    return <>{children}</>;
  }

  // 检查是否有数据访问权限
  if (!PermissionManager.hasDataAccess()) {
    // 如果是待审批用户，允许进入主界面，但限制功能
    if (PermissionManager.isPendingApproval()) {
      // 让待审批用户也能进入主界面，通过Layout组件控制显示内容
      return <>{children}</>;
    }
    
    // 如果是被拒绝用户或其他状态，跳转到登录页
    return <Navigate to="/login" replace />;
  }

  // 有权限，正常渲染
  return <>{children}</>;
}
