/**
 * 退出登录处理函数
 */
import { adminAPI, TokenManager } from './api';
import { showError } from './toast';

export const handleLogout = async () => {
  try {
    const token = TokenManager.getAccessToken();
    
    if (token) {
      // 调用API退出登录并等待结果
      await adminAPI.logout(token);
      console.log('退出登录API调用成功');
    }
    
    // API调用完成后，清除本地存储的登录信息
    TokenManager.clearLoginInfo();
    
    // 跳转到登录页（统一跳转到/login）
    window.location.href = '/login';
    
  } catch (error) {
    console.error('退出登录错误:', error);
    
    // 即使API调用失败，也清理本地存储
    TokenManager.clearLoginInfo();
    window.location.href = '/login';
  }
};
