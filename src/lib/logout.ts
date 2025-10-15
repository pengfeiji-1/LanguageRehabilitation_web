/**
 * 退出登录处理函数
 */
import { adminAPI, TokenManager } from './api';
import { toast } from 'sonner';

export const handleLogout = async () => {
  try {
    const token = TokenManager.getAccessToken();
    
    if (token) {
      // 调用API退出登录
      await adminAPI.logout(token);
    }
    
    // 清除本地存储的登录信息
    TokenManager.clearLoginInfo();
    
    // 显示成功消息
    toast.success('已成功退出登录');
    
    // 跳转到登录页
    window.location.href = '/';
    
  } catch (error) {
    console.error('退出登录错误:', error);
    
    // 即使API调用失败，也清理本地存储
    TokenManager.clearLoginInfo();
    toast.success('已退出登录');
    window.location.href = '/';
  }
};
