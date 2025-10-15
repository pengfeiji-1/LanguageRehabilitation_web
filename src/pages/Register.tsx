import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { adminAPI, TokenManager } from '@/lib/api';

// 密码强度检查函数
const checkPasswordStrength = (password: string) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  
  return {
    checks,
    score,
    strength: score >= 5 ? 'strong' : score >= 3 ? 'medium' : 'weak',
    isValid: score >= 4 // 至少需要4项满足
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
    email: '',
    role: 'admin' as 'admin' | 'viewer'
  });
  
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(checkPasswordStrength(''));
  const [showPassword, setShowPassword] = useState(false);
  
  // 检查是否已登录，如果已登录且不是超级管理员则给出提示
  useEffect(() => {
    const adminInfo = TokenManager.getAdminInfo();
    if (adminInfo && adminInfo.role !== 'super_admin') {
      toast.warning('提示：您当前以普通管理员身份登录，创建管理员需要超级管理员权限');
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
      toast.error('请输入用户名');
      return false;
    }
    
    if (formData.username.length < 3) {
      toast.error('用户名至少需要3个字符');
      return false;
    }
    
    if (!formData.password) {
      toast.error('请输入密码');
      return false;
    }
    
    if (!passwordStrength.isValid) {
      toast.error('密码强度不够，请至少满足4项要求');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('两次输入的密码不一致');
      return false;
    }
    
    if (!formData.real_name.trim()) {
      toast.error('请输入真实姓名');
      return false;
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('邮箱格式不正确');
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
      // 检查登录状态和权限
      const token = TokenManager.getAccessToken();
      const adminInfo = TokenManager.getAdminInfo();
      
      if (!token || !adminInfo) {
        toast.error('请先登录管理员账户才能创建新管理员');
        navigate('/login');
        return;
      }
      
      if (adminInfo.role !== 'super_admin') {
        toast.error('权限不足：仅超级管理员可以创建新管理员账户');
        return;
      }
      
      const registerData = {
        username: formData.username.trim(),
        password: formData.password,
        real_name: formData.real_name.trim(),
        email: formData.email.trim() || undefined,
        role: formData.role
      };
      
      const result = await adminAPI.register(registerData, token);
      
      toast.success(`管理员账户创建成功！用户名：${result.admin_info.username}`);
      
      // 重置表单
      setFormData({
        username: '',
        password: '',
        confirmPassword: '',
        real_name: '',
        email: '',
        role: 'admin'
      });
      
      // 可以选择跳转到管理员列表页面
      // navigate('/admin-list');
      
    } catch (error) {
      console.error('注册错误:', error);
      const errorMessage = error instanceof Error ? error.message : '注册失败，请重试';
      toast.error(errorMessage);
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
            创建管理员账户
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            需要超级管理员权限才能创建管理员账户
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

            {/* 角色选择 */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                管理员角色 <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="admin">普通管理员 - 完整管理权限</option>
                <option value="viewer">只读管理员 - 仅查看权限</option>
              </select>
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
                    <div className={passwordStrength.checks.length ? 'text-green-600' : 'text-gray-400'}>
                      ✓ 至少8个字符
                    </div>
                    <div className={passwordStrength.checks.uppercase ? 'text-green-600' : 'text-gray-400'}>
                      ✓ 包含大写字母
                    </div>
                    <div className={passwordStrength.checks.lowercase ? 'text-green-600' : 'text-gray-400'}>
                      ✓ 包含小写字母
                    </div>
                    <div className={passwordStrength.checks.number ? 'text-green-600' : 'text-gray-400'}>
                      ✓ 包含数字
                    </div>
                    <div className={passwordStrength.checks.special ? 'text-green-600' : 'text-gray-400'}>
                      ✓ 包含特殊字符
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
                  创建中...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-user-plus mr-2"></i>
                  创建管理员账户
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
