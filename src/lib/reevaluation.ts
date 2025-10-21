/**
 * 重新评估API客户端
 * 基于后端API文档实现
 */

import { TokenManager } from './api';
import { showError, showSuccess } from './toast';

export interface ReevaluationTaskInfo {
  task_id: string;
  user_id: number;
  question_id?: string;
  quiz_id: string;
  reevaluation_count: number;
  selected_ai_model: string;
  estimated_time: string;
}

export interface BatchReevaluationTaskInfo {
  batch_task_id?: string;
  user_id: number;
  quiz_id: string;
  total_questions: number;
  selected_ai_model: string;
  estimated_total_time?: string;
  estimated_time?: string;
  task_ids?: string[];  // 标准字段名（如果后端支持）
  task_results?: Array<{  // 实际后端返回的格式
    question_id: string;
    task_id: string;
    status: string;
    reevaluation_count: number;
  }>;
  success_count: number;
  failed_count?: number;
  failed_questions: string[];
}

export interface TaskStatus {
  task_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  current_step: string | any; // 后端可能返回对象格式
  steps?: Array<{
    step: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    timestamp: string | null;
  }>;
  user_id?: string;
  question_id?: string;
  quiz_id?: string;
  ai_model?: string;
  reevaluation_count?: number;
  started_at?: string;
  estimated_completion?: string;
  elapsed_time?: string;
  remaining_time?: string;
  result?: any;
  error_message?: string;
  error_details?: string;
  failed_at?: string;
  retry_suggestion?: string;
  completed_at?: string;
  total_time?: string;
}

export interface ReevaluationParams {
  userId: number;
  questionId?: string;
  quizId: string;
  forceReprocess?: boolean;
  aiModel?: 'qwen' | 'volcengine' | 'auto';
}

export interface QuizReevaluationParams {
  userId: number;
  quizId: string;
  aiModel?: 'qwen' | 'volcengine' | 'auto';
}

export class ReevaluationApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl || window.location.origin;
  }

  // 规范化任务状态数据
  private normalizeTaskStatus(status: any): TaskStatus {
    // 确保基本字段存在
    const normalized: TaskStatus = {
      task_id: status.task_id || '',
      status: status.status || 'pending',
      progress: typeof status.progress === 'number' ? status.progress : 0,
      current_step: status.current_step || '处理中...'
    };

    // 处理 current_step 如果是对象
    if (typeof status.current_step === 'object' && status.current_step) {
      // 尝试从对象中提取有意义的文本
      if (status.current_step.step_name) {
        normalized.current_step = status.current_step.step_name;
      } else if (status.current_step.description) {
        normalized.current_step = status.current_step.description;
      } else {
        normalized.current_step = '处理中...';
      }
    }

    // 复制其他可选字段
    Object.keys(status).forEach(key => {
      if (key !== 'task_id' && key !== 'status' && key !== 'progress' && key !== 'current_step') {
        (normalized as any)[key] = status[key];
      }
    });

    return normalized;
  }

  /**
   * 重新评估单个题目
   */
  async reevaluateQuestion(params: ReevaluationParams): Promise<ReevaluationTaskInfo> {
    const {
      userId,
      questionId,
      quizId,
      forceReprocess = false,
      aiModel = 'auto'
    } = params;

    const token = TokenManager.getAccessToken();
    if (!token) {
      throw new Error('未找到访问令牌，请重新登录');
    }

    const formData = new FormData();
    formData.append('user_id', userId.toString());
    if (questionId) {
      formData.append('question_id', questionId);
    }
    formData.append('quiz_id', quizId);
    formData.append('force_reprocess', forceReprocess.toString());
    formData.append('ai_model', aiModel);

    const response = await fetch(`${this.baseUrl}/api/v1/assessment/reevaluate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('认证失败，请重新登录');
      }
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || '重新评估失败');
    }

    return result.data;
  }

  /**
   * 重新评估整个试卷
   */
  async reevaluateQuiz(params: QuizReevaluationParams): Promise<BatchReevaluationTaskInfo> {
    const { userId, quizId, aiModel = 'auto' } = params;

    const token = TokenManager.getAccessToken();
    if (!token) {
      throw new Error('未找到访问令牌，请重新登录');
    }

    const formData = new FormData();
    formData.append('user_id', userId.toString());
    formData.append('quiz_id', quizId);
    formData.append('ai_model', aiModel);

    const response = await fetch(`${this.baseUrl}/api/v1/assessment/reevaluate/quiz`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('认证失败，请重新登录');
      }
      const errorText = await response.text();
      console.error('试卷重评估API失败:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    console.log('试卷重评估API响应:', result);
    
    if (!result.success) {
      throw new Error(result.message || '重新评估失败');
    }

    if (!result.data) {
      throw new Error('API返回数据为空');
    }

    console.log('试卷重评估返回数据结构:', result.data);
    console.log('task_ids字段:', result.data.task_ids);
    
    return result.data;
  }

  /**
   * 查询任务状态
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    const token = TokenManager.getAccessToken();
    if (!token) {
      throw new Error('未找到访问令牌，请重新登录');
    }

    const response = await fetch(`${this.baseUrl}/api/v1/assessment/task/status/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('认证失败，请重新登录');
      }
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || '查询任务状态失败');
    }

    return this.normalizeTaskStatus(result.data);
  }

  /**
   * 轮询任务状态直到完成
   */
  async pollTaskStatus(
    taskId: string, 
    options: {
      interval?: number;
      timeout?: number;
      onProgress?: (status: TaskStatus) => void;
    } = {}
  ): Promise<TaskStatus> {
    const {
      interval = 2000,  // 轮询间隔（毫秒）
      timeout = 300000, // 超时时间（毫秒）
      onProgress = null // 进度回调函数
    } = options;

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          // 检查超时
          if (Date.now() - startTime > timeout) {
            reject(new Error('任务查询超时'));
            return;
          }

          const taskStatus = await this.getTaskStatus(taskId);

          // 调用进度回调
          if (onProgress && typeof onProgress === 'function') {
            onProgress(taskStatus);
          }

          // 检查任务状态
          switch (taskStatus.status) {
            case 'completed':
              resolve(taskStatus);
              break;
            case 'failed':
              reject(new Error(`任务失败: ${taskStatus.error_message || '未知错误'}`));
              break;
            case 'cancelled':
              reject(new Error('任务已取消'));
              break;
            case 'running':
            case 'pending':
              // 继续轮询
              setTimeout(poll, interval);
              break;
            default:
              // 未知状态，继续轮询
              setTimeout(poll, interval);
          }
        } catch (error) {
          reject(error);
        }
      };

      // 开始轮询
      poll();
    });
  }

  /**
   * 批量轮询任务状态
   */
  async pollBatchTaskStatus(
    taskIds: string[],
    options: {
      interval?: number;
      timeout?: number;
      onProgress?: (taskId: string, status: TaskStatus) => void;
      onTaskComplete?: (taskId: string, status: TaskStatus) => void;
    } = {}
  ): Promise<PromiseSettledResult<TaskStatus>[]> {
    const {
      onProgress = null,
      onTaskComplete = null
    } = options;

    // 检查 taskIds 是否有效
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      throw new Error('无效的任务ID列表');
    }

    const taskPromises = taskIds.map(taskId => {
      return this.pollTaskStatus(taskId, {
        ...options,
        onProgress: (taskStatus) => {
          if (onProgress) onProgress(taskId, taskStatus);
          
          if (taskStatus.status === 'completed' && onTaskComplete) {
            onTaskComplete(taskId, taskStatus);
          }
        }
      });
    });

    return Promise.allSettled(taskPromises);
  }
}

// 创建单例实例
export const reevaluationClient = new ReevaluationApiClient();

/**
 * React Hook: 重新评估功能
 */
export function useReevaluation() {
  /**
   * 重新评估单个题目的便捷方法
   */
  const reevaluateQuestion = async (
    userId: number,
    questionId: string,
    quizId: string,
    options?: {
      aiModel?: 'qwen' | 'volcengine' | 'auto';
      onProgress?: (status: TaskStatus) => void;
      onComplete?: (result: TaskStatus) => void;
      onError?: (error: Error) => void;
    }
  ) => {
    const { aiModel = 'auto', onProgress, onComplete, onError } = options || {};

    try {
      showSuccess('正在启动单题重新评估...');
      
      // 启动重评估任务
      const taskInfo = await reevaluationClient.reevaluateQuestion({
        userId,
        questionId,
        quizId,
        aiModel
      });
      
      console.log('单题重评估任务已启动:', taskInfo);
      
      // 轮询任务状态
      const result = await reevaluationClient.pollTaskStatus(taskInfo.task_id, {
        onProgress: (status) => {
          console.log(`任务进度: ${status.progress}% - ${status.current_step}`);
          if (onProgress) onProgress(status);
        }
      });
      
      showSuccess('单题重新评估完成！');
      if (onComplete) onComplete(result);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '单题重新评估失败';
      console.error('单题重评估失败:', errorMessage);
      showError(`单题重评估失败: ${errorMessage}`);
      if (onError) onError(error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  };

  /**
   * 重新评估整个试卷的便捷方法
   */
  const reevaluateQuiz = async (
    userId: number,
    quizId: string,
    options?: {
      aiModel?: 'qwen' | 'volcengine' | 'auto';
      onProgress?: (taskId: string, status: TaskStatus) => void;
      onTaskComplete?: (taskId: string, status: TaskStatus) => void;
      onAllComplete?: (results: PromiseSettledResult<TaskStatus>[]) => void;
      onError?: (error: Error) => void;
    }
  ) => {
    const { aiModel = 'auto', onProgress, onTaskComplete, onAllComplete, onError } = options || {};

    try {
      showSuccess('正在启动试卷重新评估...');
      
      // 启动批量重评估任务
      const batchTaskInfo = await reevaluationClient.reevaluateQuiz({
        userId,
        quizId,
        aiModel
      });
      
      console.log('试卷重评估任务已启动:', batchTaskInfo);
      
      // 检查返回的任务ID列表
      if (!batchTaskInfo) {
        throw new Error('后端返回的任务信息为空');
      }

      console.log('检查 batchTaskInfo 结构:', {
        hasBatchTaskInfo: !!batchTaskInfo,
        hasTaskIds: !!batchTaskInfo.task_ids,
        taskIdsType: typeof batchTaskInfo.task_ids,
        taskIdsValue: batchTaskInfo.task_ids,
        isArray: Array.isArray(batchTaskInfo.task_ids),
        allKeys: Object.keys(batchTaskInfo || {})
      });
      
      // 尝试从不同可能的字段名获取任务ID列表
      let taskIds: string[] = [];
      
      if (batchTaskInfo.task_ids && Array.isArray(batchTaskInfo.task_ids)) {
        taskIds = batchTaskInfo.task_ids;
        console.log('使用标准字段名 task_ids:', taskIds);
      } else if (batchTaskInfo.taskIds && Array.isArray(batchTaskInfo.taskIds)) {
        taskIds = batchTaskInfo.taskIds;
        console.log('使用备选字段名 taskIds:', taskIds);
      } else if (batchTaskInfo.task_results && Array.isArray(batchTaskInfo.task_results)) {
        // 从 task_results 数组中提取 task_id
        taskIds = batchTaskInfo.task_results.map((item: any) => item.task_id);
        console.log('从 task_results 提取 task_ids:', taskIds);
        console.log('task_results 原始数据:', batchTaskInfo.task_results);
      } else if (batchTaskInfo.tasks && Array.isArray(batchTaskInfo.tasks)) {
        taskIds = batchTaskInfo.tasks;
        console.log('使用备选字段名 tasks:', taskIds);
      }
      
      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        throw new Error(`后端返回的任务信息无效，无法启动重评估。无法找到有效的任务ID列表。实际收到: ${JSON.stringify(batchTaskInfo)}`);
      }
      
      console.log(`准备监控 ${taskIds.length} 个子任务:`, taskIds);
      
      // 立即通知所有任务已添加（为进度组件初始化）
      if (onProgress) {
        taskIds.forEach((taskId, index) => {
          // 从 task_results 中查找对应的问题ID
          const taskResult = batchTaskInfo.task_results?.find(item => item.task_id === taskId);
          const questionId = taskResult?.question_id || `q_${String(index + 1).padStart(3, '0')}`;
          
          // 为每个任务创建初始状态
          onProgress(taskId, {
            task_id: taskId,
            status: 'pending',
            progress: 0,
            current_step: '准备中...',
            question_id: questionId
          });
        });
      }
      
      // 监控批量任务进度
      const results = await reevaluationClient.pollBatchTaskStatus(taskIds, {
        onProgress: (taskId, status) => {
          console.log(`子任务 ${taskId}: ${status.progress}%`);
          if (onProgress) onProgress(taskId, status);
        },
        onTaskComplete: (taskId, status) => {
          console.log(`子任务完成: ${taskId}`);
          if (onTaskComplete) onTaskComplete(taskId, status);
        }
      });
      
      showSuccess('试卷重新评估完成！');
      if (onAllComplete) onAllComplete(results);
      
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '试卷重新评估失败';
      console.error('试卷重评估失败:', errorMessage);
      showError(`试卷重评估失败: ${errorMessage}`);
      if (onError) onError(error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  };

  return {
    reevaluateQuestion,
    reevaluateQuiz
  };
}
