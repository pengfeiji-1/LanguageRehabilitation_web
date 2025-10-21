/**
 * 用户管理相关的类型定义
 */

// 用户基本信息
export interface User {
  id: number;
  username: string;
  real_name: string;
  email?: string;
  role: 'super_admin' | 'admin' | 'viewer' | 'rejected';
  status: 'active' | 'disabled' | 'pending';
  created_at: string;
  last_login?: string;
  updated_at?: string;
}

// 用户审批操作
export interface UserApprovalAction {
  user_id: number;
  action: 'approve' | 'reject';
  comment?: string;
}

// 用户审批历史
export interface UserApprovalHistory {
  id: number;
  user_id: number;
  user_name: string;
  action: 'approve' | 'reject' | 'role_change';
  old_role: string;
  new_role: string;
  reviewed_by: number;
  reviewer_name: string;
  reviewed_at: string;
  comment?: string;
}

// 用户列表响应
export interface UserListResponse {
  success: boolean;
  message: string;
  data: {
    users: User[];
    total: number;
    page: number;
    page_size: number;
    pending_count: number; // 待审批用户数量
  };
}

// 用户审批响应
export interface UserApprovalResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    action: string;
  };
}
