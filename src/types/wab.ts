// WAB报告相关的类型定义

export interface WabReport {
  id: string;
  evaluationType: string;
  evaluatorName: string;
  evaluatorId: string; // 添加评估人ID字段
  quizId: string;
  questionCount: number;
  totalScore: number;
  accuracy: number;
  fluency: number;
  evaluationTime: string;
}

export interface WabReportDetail {
  id: string;
  evaluatorInfo: {
    name: string;
    age: number;
    aphasiaType: string;
    totalDuration: number;
  };
  sections: WabSection[];
}

export interface WabSection {
  name: string;
  questions: WabQuestion[];
}

export interface WabQuestion {
  id: string;
  sequence: number;
  type: string;
  content: string;
  referenceAnswer: string;
  dialogResult: string;
  audioUrl?: string;
  duration: number;
  fluencyScore: number;
  correctnessScore: number;
  annotations?: {
    correctness?: string;
    fluency?: string;
  };
  fluencyAnalysis?: FluencyAnalysis;
  dialogDetails?: DialogMessage[];
}

export interface FluencyAnalysis {
  totalScore: number;
  categories: {
    smooth: FluencyItem[];
    rich: FluencyItem[];
  };
}

export interface FluencyItem {
  id: string;
  name: string;
  description: string;
  score: boolean;
  annotation?: string;
}

export interface DialogMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
}


// 新版API评估详情类型定义
export interface EvaluationDetailResponse {
  success: boolean;
  message: string;
  data: {
    basic_info: BasicInfo;
    assessment_info: AssessmentInfo[];
  };
}

export interface BasicInfo {
  username: string;
  age: number;
  aphasia_type: string | null;
  total_score: {
    correctness_total: number;
    fluency_total: number;
  };
  total_time: string;
  assessment_date: string;
}

export interface AssessmentInfo {
  type: string;
  type_score: {
    correctness_total: number;
    fluency_total: number;
  };
  questions: QuestionDetail[];
}

export interface QuestionDetail {
  user_id: string;
  question_id: string;
  quiz_id: string;
  question_content: string;
  user_answer_text: string;
  correct_answer: string;
  reference_answer: string;
  user_ai_interaction: {
    rounds?: Array<{
      round: number;
      prompt?: string;
      user_answer?: {
        text: string;
        user_answer_time_spent: number;
        begin_time: number;
        end_time: number;
        words: string;
      };
      ai_response?: string;
      timestamp: number;
      type: string;
    }>;
    total_rounds?: number;
    prompt_count?: number;
    user_answer_count?: number;
    ai_response_count?: number;
  };
  speaking_audio_url: string;
  answer_time: number;
  submit_time: number;
  question_type: string;
  user_answer_time_spent: number;
  aphasia_types: AphasiaTypes;
  scores: QuestionScores;
  created_time: string;
  update_time: string;
}

export interface AphasiaTypes {
  [key: string]: string; // JSON字符串格式的评估维度
}

export interface QuestionScores {
  correctness_score: number;
  fluency_score: number;
}

// 保留旧接口以兼容现有代码
export interface EvaluationDetail {
  user_id: string;
  user_name: string | null;
  user_type: string | null;
  device_id: string | null;
  session_id: string;
  question_id: string;
  quiz_id: string;
  created_time: string;
  update_time: string;
  speaking_audio_url: string;
  speaking_audio_content: string;
  dimensions: EvaluationDimensions;
  scores: EvaluationScores;
}

export interface EvaluationDimensions {
  [key: string]: string; // 支持动态键名，因为API返回的是灵活的维度键
}

export interface EvaluationScores {
  correctness_score: number;
  fluency_score: number;
}

export interface ParsedDimension {
  result: '是' | '否';
  reason: string;
  evaluation_path: string[];
  qwen_used: boolean;
}

// 评估维度的中文名称映射
export const DIMENSION_NAMES: Record<string, string> = {
  no_silence: '无沉默',
  no_stereotyped_speech: '无刻板语言',
  no_perseverative_speech: '无持续性语言',
  no_echolalia: '无模仿语言',
  normal_speech_rate: '语速正常',
  no_word_finding_difficulty: '无找词困难',
  lexical_richness: '用词丰富',
  no_telegraphic_speech: '无电报语',
  no_empty_speech: '无空洞语',
  correct_word_order: '语序正确',
  correct_collocation: '搭配正确',
  no_naming_impairment: '无命名障碍',
  topic_relevance: '主题相关',
  correct_answer: '答案正确',
  no_self_correction: '无自我更正'
};

// 解析后的维度数据
export interface ParsedAphasiaType {
  result: '是' | '否';
  reason: string;
  evaluation_path: string[];
  qwen_used: boolean;
}

// ================ 标注系统相关类型定义 ================

// 管理员登录响应
export interface AdminLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  admin_info: {
    id: number;
    username: string;
    real_name: string;
    role: string;
    status: string;
  };
}

// 标注列表项
export interface AnnotationItem {
  evaluation_id: number;
  user_id: string;
  user_name: string;
  question_id: string;
  quiz_id: string;
  created_time: string;
  annotation_status: 'PENDING' | 'MY_ANNOTATED' | 'OTHERS_ANNOTATED';
  my_annotation: AnnotationData | null;
  others_annotation_count: number;
}

// 标注列表响应
export interface AnnotationListResponse {
  success: boolean;
  message: string;
  data: {
    total: number;
    items: AnnotationItem[];
    page: number;
    page_size: number;
    pages: number;
    statistics: {
      pending: number;           // 待标注
      my_annotated: number;      // 我已标注  
      others_annotated: number;  // 他人已标注
      total_evaluations: number; // 总数验证
    };
  };
}

// 标注列表查询参数
export interface AnnotationListParams {
  page?: number;
  page_size?: number;
  status_filter?: 'PENDING' | 'MY_ANNOTATED' | 'OTHERS_ANNOTATED';
  quiz_id?: string;
  user_id?: string;
}

// 标注详情响应
export interface AnnotationDetailResponse {
  success: boolean;
  message: string;
  data: {
    // 标注系统核心字段
    evaluation_id: number;
    annotation_status: 'PENDING' | 'MY_ANNOTATED' | 'OTHERS_ANNOTATED';
    
    // 基础评估信息
    user_id: string;
    user_name: string;
    question_id: string;
    quiz_id: string;
    question_content: string;
    user_answer_text: string;
    correct_answer: string;
    reference_answer: string;
    question_type: string;
    
    // 音频信息
    speaking_audio_info: {
      has_audio: boolean;
      requires_auth: boolean;
      audio_info: string;
      access_note: string;
      evaluation_id: number;
    };
    
    // 时间相关字段
    answer_time: number;
    submit_time: number;
    user_answer_time_spent: number;
    created_time: string;
    update_time: string;
    
    // 用户AI交互详情
    user_ai_interaction: {
      total_rounds: number;
      prompt_count: number;
      user_answer_count: number;
      ai_response_count: number;
      rounds: Array<{
        round: number;
        prompt: string;
        user_answer: {
          text: string;
          user_answer_time_spent: number;
          begin_time: number;
          end_time: number;
          words: string;
        };
        ai_response: string;
        timestamp: number;
        type: string;
      }>;
    };
    
    // AI评估结果
    ai_scores: {
      correctness_score: number;
      fluency_score: number;
    };
    ai_dimensions: Record<string, {
      result: string;
      reason: string;
      evaluation_path: string[];
      qwen_used: boolean;
    }>;
    
    // 标注信息
    my_annotation: AnnotationData | null;
    others_annotations: AnnotationData[];
    annotation_statistics: {
      total_count: number;
      avg_correctness_score: number | null;
      avg_fluency_score: number | null;
      annotators: string[];
      latest_annotation_time: string | null;
    };
  };
}

// 维度标注数据
export interface DimensionAnnotation {
  result_annotation: string; // 对AI评估结果的标注评价："1"=点赞，"0"=踩，"-1"=问号，必填
  reason_annotation: string; // 对AI评估原因的标注评价："1"=点赞，"0"=踩，"-1"=问号，必填
}

// 标注数据结构
export interface AnnotationData {
  evaluation_id: number;
  manual_correctness_score: number; // 0-1
  manual_fluency_score: number; // 0-10
  manual_dimensions: Record<string, DimensionAnnotation>;
}

// 提交标注响应
export interface SubmitAnnotationResponse {
  success: boolean;
  message: string;
  data: {
    annotation_id: number;
    evaluation_id: number;
    operation: 'created' | 'updated';
    timestamp: string;
  };
}

// 音频签名URL响应
export interface AudioSignedUrlResponse {
  success: boolean;
  message: string;
  data: {
    signed_url: string;
    token: string; // JWT token for audio access
    expires_in: number;
    expires_at: string;
    audio_duration: string;
    file_size: string;
  };
}

// API错误响应
export interface ApiErrorResponse {
  detail: string | Array<{
    loc: string[];
    msg: string;
    type: string;
  }>;
}

// 15个失语症评估维度的配置
export const ANNOTATION_DIMENSIONS = [
  'no_silence',
  'no_stereotyped_speech', 
  'no_perseverative_speech',
  'no_echolalia',
  'normal_speech_rate',
  'lexical_richness',
  'no_telegraphic_speech',
  'no_empty_speech',
  'correct_word_order',
  'correct_collocation',
  'topic_relevance',
  'correct_answer',
  'no_naming_impairment',
  'no_word_finding_difficulty',
  'no_self_correction'
] as const;

// 维度分组配置
export const DIMENSION_GROUPS = {
  dialogue_smooth: {
    name: '对话顺畅',
    color: 'bg-blue-50 border-b border-blue-200',
    dimensions: ['no_silence', 'no_stereotyped_speech', 'no_perseverative_speech', 'no_echolalia']
  },
  expression_rich: {
    name: '表达丰富',
    color: 'bg-purple-50 border-b border-purple-200',
    dimensions: ['normal_speech_rate', 'lexical_richness']
  },
  grammar_correct: {
    name: '语法正确',
    color: 'bg-teal-50 border-b border-teal-200',
    dimensions: ['no_telegraphic_speech', 'no_empty_speech', 'correct_word_order', 'correct_collocation']
  },
  answer_correct: {
    name: '答案正确',
    color: 'bg-amber-50 border-b border-amber-200',
    dimensions: ['topic_relevance', 'correct_answer']
  },
  expression_smooth: {
    name: '表达顺畅',
    color: 'bg-rose-50 border-b border-rose-200',
    dimensions: ['no_naming_impairment', 'no_word_finding_difficulty', 'no_self_correction']
  }
} as const;

// 数据概览相关类型定义
export interface DashboardStatsResponse {
  period: {
    start_date: string;
    end_date: string;
  };
  users: {
    total: number;              // 注册用户总数
    new_users: number;          // 新增用户数量
    active_users: number;       // 活跃用户数量
    avg_daily_training: number; // 平均每日训练次数
  };
}

// 数据概览请求参数
export interface DashboardStatsParams {
  start_date?: string;  // ISO 8601格式，如 2025-10-18T00:00:00Z
  end_date?: string;    // ISO 8601格式，如 2025-10-21T23:59:59Z
}
