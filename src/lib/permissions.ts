/**
 * 权限管理工具类
 * 处理新用户审批系统的权限检查
 */

import { TokenManager } from './api';

// 用户角色枚举
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin', 
  VIEWER = 'viewer',        // 待审批用户
  REJECTED = 'rejected'     // 已拒绝用户
}

// 用户状态枚举
export enum UserStatus {
  APPROVED = 'approved',    // 已批准（admin/super_admin）
  PENDING = 'pending',      // 待审批（viewer）
  REJECTED = 'rejected',    // 已拒绝
  UNKNOWN = 'unknown'       // 未知状态
}

/**
 * 权限管理工具类
 */
export class PermissionManager {
  
  /**
   * 获取当前用户角色
   */
  static getCurrentUserRole(): UserRole | null {
    const adminInfo = TokenManager.getAdminInfo();
    if (!adminInfo || !adminInfo.role) {
      return null;
    }
    
    return adminInfo.role as UserRole;
  }
  
  /**
   * 获取当前用户信息
   */
  static getCurrentUser() {
    return TokenManager.getAdminInfo();
  }
  
  /**
   * 检查用户是否有数据访问权限
   * 只有管理员和超级管理员可以访问数据
   */
  static hasDataAccess(): boolean {
    const role = this.getCurrentUserRole();
    return role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
  }
  
  /**
   * 检查用户是否是超级管理员
   */
  static isSuperAdmin(): boolean {
    const role = this.getCurrentUserRole();
    return role === UserRole.SUPER_ADMIN;
  }
  
  /**
   * 检查用户是否是管理员（包括超级管理员）
   */
  static isAdmin(): boolean {
    const role = this.getCurrentUserRole();
    return role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
  }
  
  /**
   * 检查用户是否处于待审批状态
   */
  static isPendingApproval(): boolean {
    const role = this.getCurrentUserRole();
    return role === UserRole.VIEWER;
  }
  
  /**
   * 检查用户是否被拒绝
   */
  static isRejected(): boolean {
    const role = this.getCurrentUserRole();
    return role === UserRole.REJECTED;
  }
  
  /**
   * 获取用户状态
   */
  static getUserStatus(): UserStatus {
    const role = this.getCurrentUserRole();
    
    switch (role) {
      case UserRole.SUPER_ADMIN:
      case UserRole.ADMIN:
        return UserStatus.APPROVED;
      case UserRole.VIEWER:
        return UserStatus.PENDING;
      case UserRole.REJECTED:
        return UserStatus.REJECTED;
      default:
        return UserStatus.UNKNOWN;
    }
  }
  
  /**
   * 获取角色的中文显示名称
   */
  static getRoleDisplayName(role?: UserRole | string): string {
    const roleToCheck = role || this.getCurrentUserRole();
    
    switch (roleToCheck) {
      case UserRole.SUPER_ADMIN:
        return '超级管理员';
      case UserRole.ADMIN:
        return '管理员';
      case UserRole.VIEWER:
        return '待审批用户';
      case UserRole.REJECTED:
        return '已拒绝用户';
      default:
        return '未知用户';
    }
  }
  
  /**
   * 获取状态的中文显示名称
   */
  static getStatusDisplayName(status?: UserStatus): string {
    const statusToCheck = status || this.getUserStatus();
    
    switch (statusToCheck) {
      case UserStatus.APPROVED:
        return '已批准';
      case UserStatus.PENDING:
        return '待审批';
      case UserStatus.REJECTED:
        return '已拒绝';
      default:
        return '未知状态';
    }
  }
  
  /**
   * 检查用户是否已登录
   */
  static isLoggedIn(): boolean {
    return TokenManager.isLoggedIn();
  }
  
  /**
   * 检查用户是否可以访问审批管理功能
   */
  static canManageUsers(): boolean {
    return this.isSuperAdmin();
  }
}
