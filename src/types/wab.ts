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

export interface AnnotationData {
  questionId: string;
  correctnessAnnotation?: string;
  fluencyAnnotation?: string;
  fluencyItemAnnotations?: Record<string, string>;
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
