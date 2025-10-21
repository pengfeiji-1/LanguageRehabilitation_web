import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { showError, showSuccess, showWarning } from '@/lib/toast';
import { adminAPI, TokenManager } from '@/lib/api';

// 密码强度检查函数 - 根据API文档要求
const checkPasswordStrength = (password: string) => {
  const checks = {
    length: password.length >= 6, // 至少6个字符
    letter: /[a-zA-Z]/.test(password), // 包含至少1个字母（大写或小写）
    number: /\d/.test(password), // 包含至少1个数字
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  
  return {
    checks,
    score,
    strength: score === 3 ? 'strong' : score >= 2 ? 'medium' : 'weak',
    isValid: score === 3 // 必须满足所有3项要求
  };
};

export default function Register() {
  const navigate = useNavigate();
  
  // 表单状态
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    real_name: '',
    email: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(checkPasswordStrength(''));
  const [showPassword, setShowPassword] = useState(false);
  
  // 检查是否已登录，如果已登录则提示可以直接访问管理面板
  useEffect(() => {
    const adminInfo = TokenManager.getAdminInfo();
    if (adminInfo) {
      showWarning(`您当前已以 ${adminInfo.real_name} 身份登录，可以直接访问管理面板`);
    }
  }, []);
  
  // 密码强度实时检查
  useEffect(() => {
    setPasswordStrength(checkPasswordStrength(formData.password));
  }, [formData.password]);
  
  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // 表单验证
  const validateForm = () => {
    if (!formData.username.trim()) {
      showError('请输入用户名');
      return false;
    }
    
    if (formData.username.length < 3) {
      showError('用户名至少需要3个字符');
      return false;
    }
    
    if (!formData.password) {
      showError('请输入密码');
      return false;
    }
    
    if (!passwordStrength.isValid) {
      showError('密码强度不符合要求，请满足所有3项基本要求');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      showError('两次输入的密码不一致');
      return false;
    }
    
    if (!formData.real_name.trim()) {
      showError('请输入真实姓名');
      return false;
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      showError('邮箱格式不正确');
      return false;
    }
    
    return true;
  };
  
  // 提交注册
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const registerData = {
        username: formData.username.trim(),
        password: formData.password,
        real_name: formData.real_name.trim(),
        email: formData.email.trim() || undefined
      };
      
      const result = await adminAPI.register(registerData) as any;
      
      if (result?.success && result?.data) {
        showSuccess(`注册成功！用户名：${result.data.username}，请登录后等待超级管理员审批。`);
      } else {
        showSuccess(`注册成功！请登录后等待超级管理员审批。`);
      }
      
      // 重置表单
      setFormData({
        username: '',
        password: '',
        confirmPassword: '',
        real_name: '',
        email: ''
      });
      
      // 可以选择跳转到管理员列表页面
      // navigate('/admin-list');
      
    } catch (error) {
      console.error('注册错误:', error);
      let errorMessage = error instanceof Error ? error.message : '注册失败，请重试';
      
      // 根据API文档处理特定错误类型
      if (errorMessage.includes('用户名已存在') || errorMessage.includes('USERNAME_EXISTS')) {
        errorMessage = '用户名已被使用，请更换一个用户名';
      } else if (errorMessage.includes('邮箱已被使用') || errorMessage.includes('EMAIL_EXISTS')) {
        errorMessage = '邮箱地址已被注册，请使用其他邮箱';
      } else if (errorMessage.includes('密码强度不足') || errorMessage.includes('WEAK_PASSWORD')) {
        errorMessage = '密码强度不足，请确保至少6个字符，包含至少1个字母和1个数字';
      } else if (errorMessage.includes('不能通过此接口创建超级管理员') || errorMessage.includes('超级管理员')) {
        errorMessage = '不能创建超级管理员账户';
      } else if (errorMessage.includes('Not authenticated') || errorMessage.includes('认证失败') || errorMessage.includes('未授权')) {
        errorMessage = '当前系统配置需要管理员权限才能注册新用户。请联系系统管理员。';
      }
      
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // 获取密码强度颜色
  const getStrengthColor = () => {
    switch (passwordStrength.strength) {
      case 'strong': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-red-600';
    }
  };
  
  // 获取密码强度文本
  const getStrengthText = () => {
    switch (passwordStrength.strength) {
      case 'strong': return '强';
      case 'medium': return '中等';
      default: return '弱';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 头部 */}
        <div>
          <div className="flex justify-center">
            <img
              className="h-20 w-auto"
              src="/logo.png"
              alt="智能语翼"
              style={{ filter: 'hue-rotate(180deg) saturate(1.5) brightness(0.9)', mixBlendMode: 'normal' }}
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            注册管理员账户
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            注册后需要等待超级管理员审批才能使用完整功能
          </p>
          <p className="mt-1 text-center text-xs text-gray-500">
            如遇到权限问题，请联系系统管理员或使用管理员账户登录后创建新用户
          </p>
        </div>

        {/* 注册表单 */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* 用户名 */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                用户名 <span className="text-red-500">*</span>
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入登录用户名"
              />
            </div>

            {/* 真实姓名 */}
            <div>
              <label htmlFor="real_name" className="block text-sm font-medium text-gray-700">
                真实姓名 <span className="text-red-500">*</span>
              </label>
              <input
                id="real_name"
                name="real_name"
                type="text"
                required
                value={formData.real_name}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入真实姓名"
              />
            </div>

            {/* 邮箱 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                邮箱地址 <span className="text-gray-400">(可选)</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入邮箱地址"
              />
            </div>

            {/* 角色说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start">
                <i className="fa-solid fa-info-circle text-blue-500 mt-0.5 mr-2"></i>
                <div className="text-sm text-blue-700">
                  <strong>默认角色：</strong>注册成功后将获得查看员权限，需要超级管理员审批后升级为管理员。
                </div>
              </div>
            </div>

            {/* 密码 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                登录密码 <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入密码"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-gray-400`}></i>
                </button>
              </div>
              
              {/* 密码强度指示器 */}
              {formData.password && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">密码强度:</span>
                    <span className={`text-sm font-medium ${getStrengthColor()}`}>
                      {getStrengthText()}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="text-xs text-gray-600 mb-1">必须满足以下所有要求：</div>
                    <div className={passwordStrength.checks.length ? 'text-green-600' : 'text-red-500'}>
                      {passwordStrength.checks.length ? '✓' : '✗'} 至少6个字符
                    </div>
                    <div className={passwordStrength.checks.letter ? 'text-green-600' : 'text-red-500'}>
                      {passwordStrength.checks.letter ? '✓' : '✗'} 包含至少1个字母（大写或小写）
                    </div>
                    <div className={passwordStrength.checks.number ? 'text-green-600' : 'text-red-500'}>
                      {passwordStrength.checks.number ? '✓' : '✗'} 包含至少1个数字
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 确认密码 */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                确认密码 <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                  formData.confirmPassword && formData.password !== formData.confirmPassword 
                    ? 'border-red-300' 
                    : 'border-gray-300'
                }`}
                placeholder="请再次输入密码"
              />
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">两次输入的密码不一致</p>
              )}
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading || !passwordStrength.isValid}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                  注册中...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-user-plus mr-2"></i>
                  注册管理员账户
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <i className="fa-solid fa-arrow-left mr-2"></i>
              返回登录界面
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
