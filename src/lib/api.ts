/**
 * API服务类 - 管理员系统API接口
 */

import { 
  WabReport, 
  WabReportDetail,
  AnnotationListParams,
  AnnotationListResponse,
  AnnotationDetailResponse,
  AnnotationData,
  SubmitAnnotationResponse,
  AudioSignedUrlResponse,
  DashboardStatsResponse,
  DashboardStatsParams
} from '@/types/wab';
import { showError } from '@/lib/toast';

const API_BASE_URL = '/api/v1';

// 请求配置接口
interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// 统一的API请求处理函数
async function apiRequest<T>(
  url: string, 
  options: RequestInit = {}, 
  config: RequestConfig = {}
): Promise<T> {
  const {
    timeout = 10000, // 10秒超时
    retries = 2,
    retryDelay = 1000
  } = config;
  
  let lastError: Error;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const requestOptions = {
        ...options,
        signal: controller.signal
      };
      
      console.log(`🌐 API请求 (尝试 ${attempt + 1}/${retries + 1}):`, url);
      const response = await fetch(url, requestOptions);
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // 处理401认证失败 - 自动退出登录
        if (response.status === 401) {
          console.warn('🔐 检测到401认证失败，自动退出登录');
          
          // 清理本地登录信息
          TokenManager.clearLoginInfo();
          
          // 提示用户并跳转到登录页
          setTimeout(() => {
            showError('登录已失效，请重新登录');
            setTimeout(() => {
              window.location.href = '/login';
            }, 1000);
          }, 100);
          
          throw new Error('认证失败，请重新登录');
        }
        
        // 处理其他非200状态码
        let errorMessage = `请求失败 (${response.status})`;
        
        try {
          const errorData: ApiError = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (jsonError) {
          // 502等错误响应可能不是JSON
          errorMessage = `服务器错误 (${response.status}): ${response.statusText}`;
          console.warn('非JSON错误响应:', response.status, response.statusText);
        }
        
        throw new Error(errorMessage);
      }
      
      // 安全解析JSON响应
      try {
        const data = await response.json();
        console.log(`✅ API请求成功:`, url);
        return data as T;
      } catch (jsonError) {
        console.error('JSON解析失败，响应可能不是有效JSON:', jsonError);
        const textResponse = await response.text();
        console.error('响应内容:', textResponse.substring(0, 200));
        throw new Error('服务器返回了无效的数据格式，请稍后重试');
      }
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('未知错误');
      console.error(`❌ API请求失败 (尝试 ${attempt + 1}):`, lastError.message);
      
      // 如果是最后一次尝试，或者是致命错误，直接抛出
      if (attempt === retries || 
          lastError.message.includes('认证失败') ||
          lastError.message.includes('AbortError') ||
          lastError.message.includes('404') ||
          lastError.message.includes('No audio')) {
        throw lastError;
      }
      
      // 等待后重试
      if (attempt < retries) {
        console.log(`⏳ ${retryDelay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  throw lastError!;
}

// API响应接口定义
interface AdminLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  admin_info: {
    id: number;
    username: string;
    real_name: string;
    email: string | null;
    role: 'super_admin' | 'admin' | 'viewer';
    status: string;
    last_login_at: string;
    created_at: string;
  };
}

interface ApiError {
  detail: string;
}

// WAB报告列表响应接口
interface WabReportsResponse {
  success: boolean;
  data: WabReport[];
  total: number;
  page: number;
  per_page: number;
}

// WAB报告详情响应接口
interface WabReportDetailResponse {
  success: boolean;
  data: WabReportDetail;
}

class AdminAPI {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * 管理员登录
   */
  async login(username: string, password: string): Promise<AdminLoginResponse> {
    try {
      console.log('API调用开始:', { baseURL: this.baseURL, username });
      
      const response = await fetch(`${this.baseURL}/admin/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      console.log('API响应状态:', response.status, response.ok);

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        console.error('API错误响应:', errorData);
        throw new Error(errorData.detail || '登录失败');
      }

      const data: AdminLoginResponse = await response.json();
      console.log('API成功响应:', { token: data.access_token ? '已获取' : '未获取', admin: data.admin_info?.username });
      return data;
    } catch (error) {
      console.error('API调用异常:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('网络连接错误，请检查后台服务');
    }
  }

  /**
   * 获取管理员资料
   */
  async getProfile(token: string) {
    return apiRequest(`${this.baseURL}/admin/auth/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 刷新令牌
   */
  async refreshToken(refreshToken: string) {
    try {
      const response = await fetch(`${this.baseURL}/admin/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.detail || '令牌刷新失败');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('令牌刷新失败');
    }
  }

  /**
   * 管理员注册 - 支持开放注册
   */
  async register(registerData: {
    username: string;
    password: string;
    real_name?: string;
    email?: string;
  }, token?: string) {
    console.log('📝 注册API调用开始:', { 
      username: registerData.username, 
      hasEmail: !!registerData.email,
      hasRealName: !!registerData.real_name
    });
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // 如果有token则添加认证头（向后兼容）
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // 使用统一的apiRequest函数，支持重试和更好的错误处理
    return apiRequest(`${this.baseURL}/admin/auth/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify(registerData),
    }, { timeout: 15000, retries: 1 }); // 注册操作不建议多次重试
  }

  /**
   * 退出登录
   */
  async logout(token: string) {
    try {
      const response = await fetch(`${this.baseURL}/admin/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.detail || '退出登录失败');
      }

      return await response.json();
    } catch (error) {
      // 即使退出登录API失败，也清理本地存储
      console.warn('退出登录API调用失败，但继续清理本地存储');
    }
  }

  /**
   * 获取WAB报告列表 - 支持完整的筛选功能
   */
  async getWabReports(params?: {
    page?: number;
    per_page?: number;
    user_id?: string;
    quiz_id?: string;
    real_name?: string;
    phone?: string;
    start_date?: string;
    end_date?: string;
    min_correctness_score?: number;
    min_fluency_score?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    // 保留旧参数名以向后兼容
    evaluationType?: string;
    evaluatorName?: string;
    quizId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<WabReportsResponse> {
    try {
      const token = TokenManager.getAccessToken();
      console.log('Token状态检查:', { 
        hasToken: !!token, 
        tokenLength: token?.length,
        isExpired: TokenManager.isTokenExpired(),
        isLoggedIn: TokenManager.isLoggedIn()
      });
      
      if (!token) {
        throw new Error('未找到访问令牌，请重新登录');
      }

      if (TokenManager.isTokenExpired()) {
        throw new Error('访问令牌已过期，请重新登录');
      }

      // 构建查询参数 - 使用API文档中的正确参数名称
      const queryParams = new URLSearchParams();
      
      // 分页参数
      if (params?.page) queryParams.append('page', params.page.toString());
      const pageSize = params?.per_page || 20; // 默认20条
      queryParams.append('page_size', pageSize.toString());
      
      // 用户筛选参数
      if (params?.user_id) queryParams.append('user_id', params.user_id);
      if (params?.real_name || params?.evaluatorName) {
        queryParams.append('real_name', params.real_name || params.evaluatorName || '');
      }
      if (params?.phone) queryParams.append('phone', params.phone);
      
      // 试卷筛选参数
      if (params?.quiz_id || params?.quizId) {
        queryParams.append('quiz_id', params.quiz_id || params.quizId || '');
      }
      
      // 时间范围筛选
      if (params?.start_date || params?.startDate) {
        queryParams.append('start_date', params.start_date || params.startDate || '');
      }
      if (params?.end_date || params?.endDate) {
        queryParams.append('end_date', params.end_date || params.endDate || '');
      }
      
      // 得分筛选参数
      if (params?.min_correctness_score !== undefined) {
        queryParams.append('min_correctness_score', params.min_correctness_score.toString());
      }
      if (params?.min_fluency_score !== undefined) {
        queryParams.append('min_fluency_score', params.min_fluency_score.toString());
      }
      
      // 排序参数
      if (params?.sort_by) {
        queryParams.append('sort_by', params.sort_by);
      }
      if (params?.sort_order) {
        queryParams.append('sort_order', params.sort_order);
      }

      // 使用正确的后台API端点
      const url = `${this.baseURL}/admin/reports/all?${queryParams.toString()}`;
      
      console.log('获取WAB报告列表API调用开始:', { 
        url, 
        params,
        queryParams: queryParams.toString()
      });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('获取WAB报告列表API响应状态:', response.status, response.ok);

      if (!response.ok) {
        if (response.status === 401) {
          // 清理过期token
          TokenManager.clearLoginInfo();
          throw new Error('认证失败，请重新登录');
        }
        
        const errorData: ApiError = await response.json();
        console.error('获取WAB报告列表API错误响应:', errorData);
        throw new Error(errorData.detail || '获取报告列表失败');
      }

      const backendData = await response.json();
      console.log('获取WAB报告列表API成功响应:', { 
        total: backendData.data?.reports?.length,
        pagination: backendData.data?.pagination 
      });
      
      // 转换后台数据格式为前端期望的格式
      const transformedData: WabReportsResponse = {
        success: true,
        data: backendData.data?.reports?.map((report: any) => ({
          id: report.quiz_id,
          evaluationType: 'WAB失语评估',
          evaluatorName: report.user_name || report.user_info?.real_name || `用户${report.user_id}`,
          evaluatorId: report.user_id, // 添加评估人ID字段
          quizId: report.quiz_id,
          questionCount: report.question_count,
          totalScore: Math.round((report.scores?.avg_correctness || 0) * 100),
          accuracy: Math.round((report.scores?.avg_correctness || 0) * 100),
          fluency: Math.round(report.scores?.avg_fluency || 0),
          evaluationTime: report.assessment_date,
        })) || [],
        total: backendData.data?.pagination?.total_records || backendData.data?.reports?.length || 0,
        page: backendData.data?.pagination?.page || params?.page || 1,
        per_page: backendData.data?.pagination?.page_size || params?.per_page || 10
      };

      return transformedData;
    } catch (error) {
      console.error('获取WAB报告列表API调用异常:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('网络连接错误，请检查后台服务');
    }
  }

  /**
   * 获取评估详情 - 管理员查看用户详细评估信息（新版API）
   */
  async getEvaluationDetail(params: {
    userId: string;
    quizId?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
        basic_info: {
          username: string;
          age: number;
          aphasia_type: string | null;
          total_score: {
            correctness_total: number;
            fluency_total: number;
          };
          total_time: string;
          assessment_date: string;
        };
      assessment_info: Array<{
        type: string;
        type_score: {
          correctness_total: number;
          fluency_total: number;
        };
        questions: Array<{
          user_id: string;
          question_id: string;
          quiz_id: string;
          question_content: string;
          user_answer_text: string;
          correct_answer: string;
          reference_answer: string;
          user_ai_interaction: object;
          speaking_audio_url: string;
          answer_time: number;
          submit_time: number;
          question_type: string;
          user_answer_time_spent: number;
          aphasia_types: {
            [key: string]: string; // JSON字符串格式的评估维度
          };
          scores: {
            correctness_score: number;
            fluency_score: number;
          };
          created_time: string;
          update_time: string;
        }>;
      }>;
    };
  }> {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        throw new Error('未找到访问令牌，请重新登录');
      }

      if (TokenManager.isTokenExpired()) {
        throw new Error('访问令牌已过期，请重新登录');
      }

      // 构建查询参数 - quiz_id为必需参数
      const queryParams = new URLSearchParams();
      if (!params.quizId) {
        throw new Error('quiz_id为必需参数，请提供试卷ID');
      }
      queryParams.append('quiz_id', params.quizId);

      const url = `${this.baseURL}/admin/evaluation_detail/${params.userId}?${queryParams.toString()}`;
      
      console.log('获取评估详情API调用开始:', { 
        url, 
        params
      });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      console.log('获取评估详情API响应状态:', response.status, response.ok);

      if (!response.ok) {
        if (response.status === 401) {
          TokenManager.clearLoginInfo();
          throw new Error('认证失败，请重新登录');
        }
        
        let errorMessage = '获取评估详情失败';
        try {
          const errorData: ApiError = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (jsonError) {
          // 如果错误响应也不是JSON，使用HTTP状态信息
          errorMessage = `服务器错误 (${response.status}): ${response.statusText}`;
        }
        console.error('获取评估详情API错误响应:', errorMessage);
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('JSON解析失败，响应内容:', await response.text());
        throw new Error('服务器返回了无效的数据格式，请稍后重试');
      }
      
      console.log('获取评估详情API成功响应:', { 
        userId: data.basic_info?.user_id,
        quizId: data.basic_info?.quiz_id,
        totalEvaluations: data.basic_info?.total_evaluations,
        assessmentTypes: data.assessment_info?.length || 0
      });
      
      return {
        success: data.success || true,
        message: data.message || '获取评估详情成功',
        data: data.data || data
      };
    } catch (error) {
      console.error('获取评估详情API调用异常:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('网络连接错误，请检查后台服务');
    }
  }

  /**
   * 获取WAB报告详情 (保留原有方法以兼容)
   */
  async getWabReportDetail(reportId: string): Promise<WabReportDetailResponse> {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        throw new Error('未找到访问令牌');
      }

      console.log('获取WAB报告详情API调用开始:', { reportId });

      // 暂时返回功能未实现的提示
      throw new Error('报告详情功能尚未实现，请联系管理员');

      /* 未来当后台实现详情API时使用以下代码：
      const response = await fetch(`${this.baseURL}/wab/reports/${reportId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('获取WAB报告详情API响应状态:', response.status, response.ok);

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        console.error('获取WAB报告详情API错误响应:', errorData);
        throw new Error(errorData.detail || '获取报告详情失败');
      }

      const data: WabReportDetailResponse = await response.json();
      console.log('获取WAB报告详情API成功响应:', { reportId: data.data?.id });
      return data;
      */
    } catch (error) {
      console.error('获取WAB报告详情API调用异常:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('网络连接错误，请检查后台服务');
    }
  }

  /**
   * 重新评估WAB报告
   */
  async reevaluateWabReport(reportId: string): Promise<{ success: boolean; message: string }> {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        throw new Error('未找到访问令牌');
      }

      console.log('重新评估WAB报告API调用开始:', { reportId });

      // 暂时返回功能未实现的提示
      throw new Error('重新评估功能尚未实现，请联系管理员');

    } catch (error) {
      console.error('重新评估WAB报告API调用异常:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('网络连接错误，请检查后台服务');
    }
  }

  /**
   * 保存WAB报告标注
   */
  async saveWabReportAnnotations(reportId: string, annotations: any): Promise<{ success: boolean; message: string }> {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        throw new Error('未找到访问令牌');
      }

      console.log('保存WAB报告标注API调用开始:', { reportId, annotationCount: Object.keys(annotations).length });

      // 暂时返回功能未实现的提示
      throw new Error('标注保存功能尚未实现，请联系管理员');

    } catch (error) {
      console.error('保存WAB报告标注API调用异常:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('网络连接错误，请检查后台服务');
    }
  }

  // ================ 标注系统API方法 ================

  /**
   * 获取标注列表
   */
  async getAnnotationList(params?: AnnotationListParams): Promise<AnnotationListResponse> {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        throw new Error('未找到访问令牌，请重新登录');
      }

      if (TokenManager.isTokenExpired()) {
        throw new Error('访问令牌已过期，请重新登录');
      }

      // 构建查询参数
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
      if (params?.status_filter) queryParams.append('status_filter', params.status_filter);
      if (params?.quiz_id) queryParams.append('quiz_id', params.quiz_id);
      if (params?.user_id) queryParams.append('user_id', params.user_id);

      const url = `${this.baseURL}/admin/annotations/list?${queryParams.toString()}`;
      
      console.log('获取标注列表API调用开始:', { url, params });

      return apiRequest<AnnotationListResponse>(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }, { 
        timeout: 15000, // 列表请求可能较慢，15秒超时
        retries: 3 // 列表请求重试3次
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('认证失败')) {
        TokenManager.clearLoginInfo();
      }
      throw error;
    }
  }

  /**
   * 获取标注详情
   */
  async getAnnotationDetail(evaluationId: number): Promise<AnnotationDetailResponse> {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        throw new Error('未找到访问令牌，请重新登录');
      }

      if (TokenManager.isTokenExpired()) {
        throw new Error('访问令牌已过期，请重新登录');
      }

      const url = `${this.baseURL}/admin/annotations/item/${evaluationId}`;
      console.log('获取标注详情API调用开始:', { evaluationId });

      return apiRequest<AnnotationDetailResponse>(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }, { 
        timeout: 12000, // 详情请求12秒超时
        retries: 2 // 详情请求重试2次
      });
    } catch (error) {
      console.error('获取标注详情API调用异常:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('网络连接错误，请检查后台服务');
    }
  }

  /**
   * 提交标注
   */
  async submitAnnotation(annotationData: AnnotationData): Promise<SubmitAnnotationResponse> {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        throw new Error('未找到访问令牌，请重新登录');
      }

      if (TokenManager.isTokenExpired()) {
        throw new Error('访问令牌已过期，请重新登录');
      }

      const url = `${this.baseURL}/admin/annotations/submit`;
      
      console.log('提交标注API调用开始:', url, '评估ID:', annotationData.evaluation_id);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(annotationData),
      });

      console.log('提交标注API响应状态:', response.status, response.ok);

      if (!response.ok) {
        if (response.status === 401) {
          TokenManager.clearLoginInfo();
          throw new Error('认证失败，请重新登录');
        }
        
        let errorMessage = '提交标注失败';
        try {
          const errorData = await response.json();
          console.error('提交标注API错误响应:', JSON.stringify(errorData, null, 2));
          
          // 安全地提取错误信息
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((item: any) => 
              typeof item === 'string' ? item : JSON.stringify(item)
            ).join(', ');
          }
        } catch (parseError) {
          console.error('解析错误响应失败:', parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const data: SubmitAnnotationResponse = await response.json();
      console.log('提交标注API成功响应:', { 
        annotationId: data.data.annotation_id, 
        operation: data.data.operation 
      });
      return data;
    } catch (error) {
      console.error('提交标注API调用异常:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('网络连接错误，请检查后台服务');
    }
  }

  /**
   * 获取用户列表（用户审批管理）
   */
  async getUserList(params?: {
    page?: number;
    page_size?: number;
    status?: 'all' | 'pending' | 'approved';
  }): Promise<any> {
    // 构建查询参数
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.status) queryParams.append('status', params.status);
    
    const url = `${this.baseURL}/admin/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    return apiRequest(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TokenManager.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    }, { timeout: 10000, retries: 2 });
  }

  /**
   * 用户审批操作
   */
  async approveUser(userId: number, action: 'approve' | 'reject', comment?: string): Promise<any> {
    return apiRequest(`${this.baseURL}/admin/users/${userId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TokenManager.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        comment
      }),
    }, { timeout: 15000, retries: 1 });
  }

  /**
   * 修改用户角色
   */
  async changeUserRole(userId: number, role: string): Promise<any> {
    return apiRequest(`${this.baseURL}/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${TokenManager.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role }),
    }, { timeout: 15000, retries: 1 });
  }

  /**
   * 获取待审批管理员列表
   */
  async getPendingApprovals(params?: {
    page?: number;
    page_size?: number;
    search?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.search) queryParams.append('search', params.search);
    
    const url = `${this.baseURL}/admin/approval/pending${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    return apiRequest(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TokenManager.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    }, { timeout: 10000, retries: 2 });
  }

  /**
   * 审批管理员权限
   */
  async approveAdmin(adminId: number, data: {
    action: 'approve' | 'reject';
    target_role?: string;
    reason?: string;
  }): Promise<any> {
    return apiRequest(`${this.baseURL}/admin/approval/approve/${adminId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TokenManager.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }, { timeout: 15000, retries: 1 });
  }

  /**
   * 查看个人审批状态
   */
  async getMyApprovalStatus(): Promise<any> {
    return apiRequest(`${this.baseURL}/admin/approval/my-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TokenManager.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    }, { timeout: 10000, retries: 2 });
  }

  /**
   * 获取审批统计信息
   */
  async getApprovalStatistics(): Promise<any> {
    return apiRequest(`${this.baseURL}/admin/approval/statistics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TokenManager.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    }, { timeout: 10000, retries: 2 });
  }

  /**
   * 获取音频签名URL
   */
  async getAudioSignedUrl(evaluationId: number): Promise<AudioSignedUrlResponse> {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        throw new Error('未找到访问令牌，请重新登录');
      }

      if (TokenManager.isTokenExpired()) {
        throw new Error('访问令牌已过期，请重新登录');
      }

      const url = `${this.baseURL}/admin/audio/signed-url/${evaluationId}`;
      
      console.log('获取音频签名URL API调用开始:', { url, evaluationId });

      return apiRequest<AudioSignedUrlResponse>(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('获取音频签名URL API调用异常:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('网络连接错误，请检查后台服务');
    }
  }

  /**
   * 获取数据概览统计信息
   */
  async getDashboardStats(params?: DashboardStatsParams): Promise<DashboardStatsResponse> {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        throw new Error('未找到访问令牌，请重新登录');
      }

      if (TokenManager.isTokenExpired()) {
        throw new Error('访问令牌已过期，请重新登录');
      }

      // 构建查询参数
      const queryParams = new URLSearchParams();
      if (params?.start_date) queryParams.append('start_date', params.start_date);
      if (params?.end_date) queryParams.append('end_date', params.end_date);

      const url = `${this.baseURL}/admin/dashboard/stats${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      console.log('📊 获取数据概览API调用开始:', { url, params });

      return apiRequest<DashboardStatsResponse>(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }, { timeout: 10000, retries: 2 });
    } catch (error) {
      console.error('获取数据概览API调用异常:', error);
      if (error instanceof Error) {
        throw new Error(`获取数据概览失败: ${error.message}`);
      }
      throw error;
    }
  }
}

// 令牌管理工具类
export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'admin_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'admin_refresh_token';
  private static readonly ADMIN_INFO_KEY = 'admin_info';
  private static readonly TOKEN_EXPIRY_KEY = 'admin_token_expiry';

  /**
   * 保存登录信息
   */
  static saveLoginInfo(loginResponse: AdminLoginResponse) {
    const expiryTime = Date.now() + (loginResponse.expires_in * 1000);
    
    localStorage.setItem(this.ACCESS_TOKEN_KEY, loginResponse.access_token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, loginResponse.refresh_token);
    localStorage.setItem(this.ADMIN_INFO_KEY, JSON.stringify(loginResponse.admin_info));
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
  }

  /**
   * 获取访问令牌
   */
  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  /**
   * 获取刷新令牌
   */
  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * 获取管理员信息
   */
  static getAdminInfo() {
    const adminInfoStr = localStorage.getItem(this.ADMIN_INFO_KEY);
    if (!adminInfoStr) return null;
    
    try {
      return JSON.parse(adminInfoStr);
    } catch {
      return null;
    }
  }

  /**
   * 检查令牌是否过期
   */
  static isTokenExpired(): boolean {
    const expiryStr = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiryStr) return true;
    
    const expiry = parseInt(expiryStr);
    return Date.now() >= expiry;
  }

  /**
   * 检查是否已登录
   */
  static isLoggedIn(): boolean {
    return this.getAccessToken() !== null && !this.isTokenExpired();
  }

  /**
   * 清除所有登录信息
   */
  static clearLoginInfo() {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.ADMIN_INFO_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
  }
}

// 导出单例API实例
export const adminAPI = new AdminAPI();
