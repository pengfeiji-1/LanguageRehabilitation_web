/**
 * 审批状态监控器
 * 负责监控用户权限变更，处理权限提升通知
 */

import { adminAPI, TokenManager } from './api';
import { showSuccess, showError } from './toast';

// 监控配置常量
const MONITOR_CONFIG = {
  CHECK_INTERVAL: 30000, // 30秒检查一次
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000,
} as const;

interface ApprovalStatusData {
  admin_id: number;
  username: string;
  current_role: string;
  previous_role: string;
  status: string;
  approval_info: {
    is_approved: boolean;
    approved_at?: string;
    approved_by?: number;
    approval_reason?: string;
  };
  permissions_changed: boolean;
  need_token_refresh: boolean;
}

/**
 * 审批状态监控器类
 */
export class ApprovalMonitor {
  private isMonitoring = false;
  private intervalId: number | null = null;
  private retryCount = 0;
  private lastCheckedRole: string | null = null;

  /**
   * 开始监控权限状态
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.retryCount = 0;
    
    // 立即执行一次检查
    this.checkPermissionStatus();
    
    // 设置定时检查
    this.intervalId = window.setInterval(() => {
      if (this.isMonitoring) {
        this.checkPermissionStatus();
      }
    }, MONITOR_CONFIG.CHECK_INTERVAL);

    console.log('审批状态监控器已启动');
  }

  /**
   * 停止监控权限状态
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('审批状态监控器已停止');
  }

  /**
   * 检查权限状态
   */
  private async checkPermissionStatus(): Promise<void> {
    try {
      // 检查是否有有效token
      if (!TokenManager.isLoggedIn()) {
        this.stopMonitoring();
        return;
      }

      const result = await adminAPI.getMyApprovalStatus();
      
      if (result.success) {
        await this.handleStatusResponse(result.data);
        this.retryCount = 0; // 重置重试计数
      } else {
        throw new Error(result.message || '获取审批状态失败');
      }
    } catch (error) {
      console.error('检查权限状态失败:', error);
      await this.handleCheckError(error);
    }
  }

  /**
   * 处理状态响应
   */
  private async handleStatusResponse(data: ApprovalStatusData): Promise<void> {
    // 记录当前角色用于下次比较
    const currentRole = data.current_role;
    const previousRole = this.lastCheckedRole;
    this.lastCheckedRole = currentRole;

    // 处理权限变更
    if (data.permissions_changed || (previousRole && previousRole !== currentRole)) {
      await this.handlePermissionChange(data);
    }
  }

  /**
   * 处理权限变更
   */
  private async handlePermissionChange(data: ApprovalStatusData): Promise<void> {
    try {
      // 刷新token（如果需要）
      if (data.need_token_refresh) {
        await this.refreshUserToken();
      }

      // 显示权限变更通知
      this.showPermissionChangeNotification(data);

      // 更新本地存储的用户信息
      this.updateLocalUserInfo(data);

      // 权限提升后停止监控，因为用户可能会被重定向
      if (data.approval_info.is_approved && data.current_role === 'admin') {
        setTimeout(() => {
          window.location.reload(); // 刷新页面以更新所有组件状态
        }, 2000);
      }
    } catch (error) {
      console.error('处理权限变更失败:', error);
      showError('权限更新失败，请刷新页面重试');
    }
  }

  /**
   * 刷新用户token
   */
  private async refreshUserToken(): Promise<void> {
    try {
      const token = TokenManager.getAccessToken();
      if (token) {
        // 调用profile接口获取最新用户信息，这会更新token中的权限信息
        const profileResult = await adminAPI.getProfile(token);
        if (profileResult.success && profileResult.admin_info) {
          TokenManager.saveLoginInfo(profileResult);
          console.log('用户token已刷新');
        }
      }
    } catch (error) {
      console.error('刷新token失败:', error);
    }
  }

  /**
   * 显示权限变更通知
   */
  private showPermissionChangeNotification(data: ApprovalStatusData): void {
    const { approval_info, current_role, previous_role } = data;
    
    if (approval_info.is_approved) {
      const message = `🎉 恭喜！您的权限已从 ${this.getRoleDisplayName(previous_role)} 提升为 ${this.getRoleDisplayName(current_role)}`;
      showSuccess(message);
      
      if (approval_info.approval_reason) {
        setTimeout(() => {
          showSuccess(`审批理由：${approval_info.approval_reason}`);
        }, 1000);
      }
    } else {
      const message = `❌ 很抱歉，您的管理员申请未通过审批`;
      showError(message);
      
      if (approval_info.approval_reason) {
        setTimeout(() => {
          showError(`拒绝理由：${approval_info.approval_reason}`);
        }, 1000);
      }
    }
  }

  /**
   * 更新本地用户信息
   */
  private updateLocalUserInfo(data: ApprovalStatusData): void {
    try {
      const adminInfo = TokenManager.getAdminInfo();
      if (adminInfo) {
        const updatedInfo = {
          ...adminInfo,
          role: data.current_role,
          status: data.status
        };
        localStorage.setItem('admin_info', JSON.stringify(updatedInfo));
      }
    } catch (error) {
      console.error('更新本地用户信息失败:', error);
    }
  }

  /**
   * 获取角色显示名称
   */
  private getRoleDisplayName(role: string): string {
    const roleMap: Record<string, string> = {
      'super_admin': '超级管理员',
      'admin': '管理员',
      'viewer': '观察员',
      'rejected': '已拒绝'
    };
    return roleMap[role] || role;
  }

  /**
   * 处理检查错误
   */
  private async handleCheckError(error: any): Promise<void> {
    this.retryCount++;
    
    // 如果是认证错误，停止监控
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('401') || errorMessage.includes('认证') || errorMessage.includes('登录')) {
      console.log('检测到认证失效，停止权限监控');
      this.stopMonitoring();
      return;
    }

    // 达到最大重试次数后停止监控
    if (this.retryCount >= MONITOR_CONFIG.MAX_RETRIES) {
      console.error('权限状态检查失败次数过多，停止监控');
      this.stopMonitoring();
      return;
    }

    // 延迟后重试
    setTimeout(() => {
      if (this.isMonitoring) {
        this.checkPermissionStatus();
      }
    }, MONITOR_CONFIG.RETRY_DELAY);
  }

  /**
   * 获取监控状态
   */
  public isActive(): boolean {
    return this.isMonitoring;
  }
}

// 全局监控器实例
export const approvalMonitor = new ApprovalMonitor();
