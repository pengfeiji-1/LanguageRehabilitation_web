import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '@/contexts/authContext';
import { showError, showSuccess, showInfo } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { adminAPI, TokenManager } from '@/lib/api';

// 测试手机号和验证码（仅用于普通用户测试）
const TEST_PHONE = '13800138000';
const TEST_CODE = '123456';

type LoginType = 'account' | 'phone';

export default function Login() {
  // 登录方式
  const [loginType, setLoginType] = useState<LoginType>('account');
  
  // 账号登录状态
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // 手机号登录状态
  const [countryCode, setCountryCode] = useState('+86');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [agreed] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setIsAuthenticated } = useContext(AuthContext);
  
  // 页面加载时检查是否已登录
  useEffect(() => {
    if (TokenManager.isLoggedIn()) {
      const adminInfo = TokenManager.getAdminInfo();
      if (adminInfo) {
        setIsAuthenticated(true);
        showSuccess(`欢迎回来，${adminInfo.real_name}！`);
        navigate('/dashboard');
      }
    } else {
      // 确保清除isAuthenticated状态，处理从其他页面退出登录的情况
      localStorage.removeItem('isAuthenticated');
    }
  }, [navigate, setIsAuthenticated]);

  // 倒计时效果
  useEffect(() => {
    let timer: number;
    if (countdown > 0) {
      timer = window.setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => window.clearTimeout(timer);
  }, [countdown]);

  // 验证手机号格式
  const validatePhone = (phoneNumber: string) => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phoneNumber);
  };

  // 发送验证码
  const handleSendCode = async () => {
    if (!phone) {
      showError('请输入手机号');
      return;
    }
    
    if (!validatePhone(phone)) {
      showError('请输入正确的手机号格式');
      return;
    }

    try {
      // 这里后续会接入真实的短信API
      showSuccess('验证码已发送');
      setCountdown(60);
    } catch (error) {
      showError('发送验证码失败，请重试');
    }
  };

  // 账号登录
  const handleAccountLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      showError('请输入用户名和密码');
      return;
    }

    setLoading(true);

    try {
      // 管理员登录 - 调用真实API
      console.log('准备登录:', { username, password: password ? '***' : '空' });
      const loginResponse = await adminAPI.login(username, password);
      
      // 保存登录信息
      TokenManager.saveLoginInfo(loginResponse);
      
      // 设置认证状态
      setIsAuthenticated(true);
      
      // 检查用户状态并显示相应消息
      const userRole = loginResponse.admin_info.role;
      const roleName = getRoleName(userRole);
      
      if (userRole === 'viewer') {
        // 待审批用户
        showInfo('登录成功！您的管理员申请正在审批中，请等待超级管理员审核。');
        navigate('/dashboard'); // 会被RoleBasedRoute拦截并显示待审批界面
      } else {
        // 已批准用户
        showSuccess(`${roleName}登录成功！欢迎，${loginResponse.admin_info.real_name}`);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('登录错误:', error);
      const errorMessage = error instanceof Error ? error.message : '登录失败，请重试';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // 获取角色中文名称
  const getRoleName = (role: string): string => {
    switch (role) {
      case 'super_admin': return '超级管理员';
      case 'admin': return '管理员';
      case 'viewer': return '查看员';
      default: return '用户';
    }
  };

  // 手机号登录
  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreed) {
      showError('请先同意服务条款和隐私政策');
      return;
    }

    if (!phone) {
      showError('请输入手机号');
      return;
    }

    if (!validatePhone(phone)) {
      showError('请输入正确的手机号格式');
      return;
    }

    if (!verificationCode) {
      showError('请输入验证码');
      return;
    }

    setLoading(true);

    try {
      // 目前手机号登录使用模拟验证，实际项目中应该调用对应的API
      if (phone === TEST_PHONE && verificationCode === TEST_CODE) {
        setIsAuthenticated(true);
        showSuccess('手机号登录成功！');
        navigate('/dashboard');
      } else {
        showError('手机号或验证码错误');
      }
    } catch (error) {
      console.error('手机号登录错误:', error);
      showError('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen relative flex flex-col lg:block"
      style={{ 
        backgroundImage: 'url(/login_bg.jpeg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black bg-opacity-20"></div>
      
      {/* 顶部Logo - 响应式调整 */}
      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 lg:top-3 lg:left-3 z-30">
        <img 
          src="/logo.png" 
          alt="智能语翼" 
          className="h-12 w-auto sm:h-16 md:h-20 lg:h-[120px]"
          style={{ 
            filter: 'hue-rotate(180deg) saturate(1.5) brightness(0.9)',
            mixBlendMode: 'normal'
          }}
        />
      </div>
      
      {/* 主要内容区域 */}
      <div className="relative z-10 min-h-screen flex flex-col lg:block">
        {/* 桌面端：左侧产品信息 */}
        <div className="hidden lg:block absolute left-12 top-1/2 transform -translate-y-1/2 text-white max-w-2xl">
          <div className="mb-8">
            <h1 className="text-4xl xl:text-5xl font-bold mb-4">智能语翼管理平台</h1>
            <p className="text-lg xl:text-xl opacity-90">数据管理 / 评估分析 / 质量控制</p>
          </div>
          
          {/* 产品卡片展示区域 */}
          <div className="grid grid-cols-2 gap-4 xl:gap-6 mt-12">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 xl:p-6 border border-white border-opacity-20">
              <div className="flex items-center mb-3">
                <i className="fa-solid fa-chart-bar text-blue-300 text-xl xl:text-2xl mr-3"></i>
                <h3 className="text-base xl:text-lg font-semibold">数据统计</h3>
              </div>
              <p className="text-xs xl:text-sm opacity-90">全面的数据分析与统计报告，实时监控系统运行状态</p>
            </div>
            
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 xl:p-6 border border-white border-opacity-20">
              <div className="flex items-center mb-3">
                <i className="fa-solid fa-clipboard-list text-green-300 text-xl xl:text-2xl mr-3"></i>
                <h3 className="text-base xl:text-lg font-semibold">评估管理</h3>
              </div>
              <p className="text-xs xl:text-sm opacity-90">试卷管理、评估提交、结果分析，提升评估准确度</p>
            </div>
            
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 xl:p-6 border border-white border-opacity-20">
              <div className="flex items-center mb-3">
                <i className="fa-solid fa-users-cog text-purple-300 text-xl xl:text-2xl mr-3"></i>
                <h3 className="text-base xl:text-lg font-semibold">用户管理</h3>
              </div>
              <p className="text-xs xl:text-sm opacity-90">用户权限控制，会话管理，操作日志跟踪</p>
            </div>
            
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 xl:p-6 border border-white border-opacity-20">
              <div className="flex items-center mb-3">
                <i className="fa-solid fa-shield-alt text-orange-300 text-xl xl:text-2xl mr-3"></i>
                <h3 className="text-base xl:text-lg font-semibold">系统监控</h3>
              </div>
              <p className="text-xs xl:text-sm opacity-90">API监控，安全审计，系统性能实时监测</p>
            </div>
          </div>
        </div>

        {/* 移动端/平板：顶部标题 */}
        <div className="lg:hidden pt-20 pb-8 px-4 text-white text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">智能语翼管理平台</h1>
          <p className="text-sm sm:text-base md:text-lg opacity-90">数据管理 / 评估分析 / 质量控制</p>
        </div>

        {/* 登录区域 - 响应式布局 */}
        <div className="flex-1 flex items-center justify-center px-4 pb-8 lg:items-start lg:justify-end lg:pt-20 lg:pr-8 xl:pr-32">
          <div className="w-full max-w-md lg:max-w-lg xl:w-[28rem]">
            <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6">
              <div className="mb-4 sm:mb-5 text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">欢迎来到智能语翼</h2>
              </div>
              
              {/* 标签页头部 */}
              <div className="mb-4 sm:mb-5">
                <div className="flex bg-gray-50 rounded-lg p-1">
                  <button
                    onClick={() => setLoginType('account')}
                    className={cn(
                      "flex-1 py-2 px-3 sm:px-4 text-center font-medium transition-colors rounded-md text-sm",
                      loginType === 'account'
                        ? "text-blue-600 bg-white shadow-sm"
                        : "text-gray-600 hover:text-gray-800"
                    )}
                  >
                    账号登录
                  </button>
                  <button
                    onClick={() => setLoginType('phone')}
                    className={cn(
                      "flex-1 py-2 px-3 sm:px-4 text-center font-medium transition-colors rounded-md text-sm",
                      loginType === 'phone'
                        ? "text-blue-600 bg-white shadow-sm"
                        : "text-gray-600 hover:text-gray-800"
                    )}
                  >
                    手机号登录
                  </button>
                </div>
              </div>

              {/* 登录表单内容 */}
              <div className="min-h-[200px] sm:min-h-[240px]">
                {/* 账号登录表单 */}
                {loginType === 'account' && (
                  <form onSubmit={handleAccountLogin} className="space-y-3 sm:space-y-4">
                    
                    <div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="block w-full px-3 sm:px-4 h-10 sm:h-12 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm transition-colors duration-200"
                        placeholder="请输入账号名/账号ID"
                      />
                    </div>
                    
                    <div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="block w-full px-3 sm:px-4 h-10 sm:h-12 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm transition-colors duration-200"
                        placeholder="请输入登录密码"
                      />
                    </div>
                    
                    <div className="text-xs leading-relaxed">
                      <span className="text-gray-500">
                        登录视为您已阅读并同意智能语翼
                      </span>
                      <a href="#" className="text-blue-600 hover:text-blue-500 mx-1">服务条款</a>
                      <span className="text-gray-500">和</span>
                      <a href="#" className="text-blue-600 hover:text-blue-500 mx-1">隐私政策</a>
                    </div>
                    
                    {/* 空白占位区域 */}
                    <div className="h-3 sm:h-[20px]"></div>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center h-10 sm:h-12 items-center px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-400 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin mr-2"></i> 登录中...
                        </>
                      ) : (
                        "登录"
                      )}
                    </button>
                    
                    {/* 登录选项 */}
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <a href="#" className="text-blue-600 hover:text-blue-500">忘记账号</a>
                      <a href="#" className="text-blue-600 hover:text-blue-500">忘记密码</a>
                    </div>
                  </form>
                )}

                {/* 手机号登录表单 */}
                {loginType === 'phone' && (
                  <form onSubmit={handlePhoneLogin} className="space-y-3 sm:space-y-4">
                    
                    {/* 手机号输入 */}
                    <div>
                      <div className="flex rounded-md shadow-sm">
                        <div className="relative">
                          <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            className="h-10 sm:h-12 pl-3 pr-8 border border-r-0 border-gray-300 rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm bg-white appearance-none transition-colors duration-200"
                            style={{ backgroundImage: 'none' }}
                          >
                            <option value="+86">+86</option>
                            <option value="+1">+1</option>
                            <option value="+44">+44</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                            <i className="fa-solid fa-chevron-down text-gray-400 text-xs"></i>
                          </div>
                        </div>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          className="flex-1 h-10 sm:h-12 px-3 border border-gray-300 rounded-r-md focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm transition-colors duration-200"
                          placeholder="请输入手机号"
                        />
                      </div>
                    </div>

                    {/* 验证码输入 */}
                    <div>
                      <div className="flex gap-2 sm:gap-3">
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          required
                          className="flex-1 h-10 sm:h-12 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm transition-colors duration-200"
                          placeholder="请输入验证码"
                          maxLength={6}
                        />
                        <button
                          type="button"
                          onClick={handleSendCode}
                          disabled={countdown > 0 || !phone}
                          className="px-3 sm:px-4 h-10 sm:h-12 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-gray-700 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap border border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                          {countdown > 0 ? `${countdown}s` : '获取验证码'}
                        </button>
                      </div>
                    </div>

                    {/* 服务条款同意 */}
                    <div className="text-xs leading-relaxed">
                      <span className="text-gray-500">
                        登录视为您已阅读并同意智能语翼
                      </span>
                      <a href="#" className="text-blue-600 hover:text-blue-500 mx-1">服务条款</a>
                      <span className="text-gray-500">和</span>
                      <a href="#" className="text-blue-600 hover:text-blue-500 mx-1">隐私政策</a>
                    </div>
                    
                    {/* 空白占位区域 */}
                    <div className="h-3 sm:h-[20px]"></div>
                    
                    <button
                      type="submit"
                      disabled={loading || !agreed}
                      className="w-full flex justify-center h-10 sm:h-12 items-center px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-400 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin mr-2"></i> 登录中...
                        </>
                      ) : (
                        "登录"
                      )}
                    </button>
                    
                    {/* 登录选项 */}
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <a href="#" className="text-blue-600 hover:text-blue-500">忘记账号</a>
                      <a href="#" className="text-blue-600 hover:text-blue-500">忘记密码</a>
                    </div>
                  </form>
                )}

                {/* 其他登录方式 */}
                <div className="mt-4 sm:mt-5">
                  <div className="text-center text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">其他登录方式</div>
                  <div className="flex justify-center">
                    <button className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                      <i className="fa-brands fa-weixin text-green-600"></i>
                    </button>
                  </div>
                </div>

                {/* 注册提示 */}
                <div className="mt-4 sm:mt-5 text-center text-xs sm:text-sm text-gray-600">
                  没有账号？
                  <button 
                    onClick={() => navigate('/register')}
                    className="text-blue-600 hover:text-blue-500 ml-1 underline bg-transparent border-none cursor-pointer"
                  >
                    现在就注册
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部版权信息 - 响应式调整 */}
      <div className="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 text-white text-xs sm:text-sm text-center z-10 px-4">
        <div className="mb-2">版权所有©北京智能语翼医疗科技有限责任公司2025</div>
      </div>
    </div>
  );
}