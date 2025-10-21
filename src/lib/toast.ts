/**
 * 统一的Toast通知配置
 * 提供一致的样式和位置
 */

import { toast } from 'react-hot-toast';

// 统一的Toast配置
const defaultToastOptions = {
  duration: 3000,
  position: 'bottom-right' as const,
  style: {
    background: '#fff',
    color: '#333',
    fontSize: '14px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    padding: '12px 16px',
    maxWidth: '400px',
  },
};

// 成功提示
export const showSuccess = (message: string, options = {}) => {
  return toast.success(message, {
    ...defaultToastOptions,
    ...options,
    style: {
      ...defaultToastOptions.style,
      background: '#f0f9ff',
      color: '#1e40af',
      border: '1px solid #bfdbfe',
    },
  });
};

// 错误提示
export const showError = (message: string, options = {}) => {
  return toast.error(message, {
    ...defaultToastOptions,
    ...options,
    style: {
      ...defaultToastOptions.style,
      background: '#fef2f2',
      color: '#dc2626',
      border: '1px solid #fecaca',
    },
  });
};

// 警告提示
export const showWarning = (message: string, options = {}) => {
  return toast(message, {
    ...defaultToastOptions,
    ...options,
    icon: '⚠️',
    style: {
      ...defaultToastOptions.style,
      background: '#fffbeb',
      color: '#d97706',
      border: '1px solid #fed7aa',
    },
  });
};

// 信息提示
export const showInfo = (message: string, options = {}) => {
  return toast(message, {
    ...defaultToastOptions,
    ...options,
    icon: 'ℹ️',
    style: {
      ...defaultToastOptions.style,
      background: '#f0f9ff',
      color: '#2563eb',
      border: '1px solid #bfdbfe',
    },
  });
};

// 加载提示
export const showLoading = (message: string) => {
  return toast.loading(message, {
    ...defaultToastOptions,
    duration: Infinity, // 手动关闭
    style: {
      ...defaultToastOptions.style,
      background: '#f9fafb',
      color: '#374151',
      border: '1px solid #d1d5db',
    },
  });
};

// 关闭所有Toast
export const dismissAll = () => {
  toast.dismiss();
};

// 关闭指定Toast
export const dismiss = (toastId: string) => {
  toast.dismiss(toastId);
};
