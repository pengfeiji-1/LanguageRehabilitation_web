import { useState, useEffect, useCallback, useRef } from 'react';
import { adminAPI } from '@/lib/api';
import { showError, showSuccess } from '@/lib/toast';
import { getAudioToken } from '@/utils/audioUtils';
import { 
  AnnotationDetailResponse, 
  AnnotationData, 
  DimensionAnnotation,
  DIMENSION_NAMES,
  DIMENSION_GROUPS 
} from '@/types/wab';

interface AnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluationId: number;
  onAnnotationUpdate?: () => void; // 标注更新后的回调
}

export default function AnnotationModal({ isOpen, onClose, evaluationId, onAnnotationUpdate }: AnnotationModalProps) {
  // 状态管理
  const [detail, setDetail] = useState<AnnotationDetailResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null); // 预加载的音频blob URL
  const [isPlaying, setIsPlaying] = useState(false); // 播放状态
  const currentAudioRef = useRef<HTMLAudioElement | null>(null); // 使用 ref 避免状态变化触发清理
  const audioBlobUrlRef = useRef<string | null>(null); // blob URL 的 ref
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [dialogCollapsed, setDialogCollapsed] = useState(false); // 对话框折叠状态
  
  // 看图说话特殊评分状态
  const [answerPoints, setAnswerPoints] = useState<Array<{
    id: string;
    text: string;
    autoDetected: boolean;
    manualSelected: boolean;
  }>>([]);
  
  // 标注表单状态
  const [annotation, setAnnotation] = useState<AnnotationData>({
    evaluation_id: evaluationId,
    manual_correctness_score: 0,
    manual_fluency_score: 0,
    manual_dimensions: {},
  });

  // 初始化维度数据
  const initializeDimensions = () => {
    const dimensions: Record<string, DimensionAnnotation> = {};
    Object.keys(DIMENSION_NAMES).forEach(key => {
      dimensions[key] = {
        result_annotation: "999", // "999"表示未选择，避免与有效值("-1","0","1")冲突
        reason_annotation: "999", // "999"表示未选择，避免与有效值("-1","0","1")冲突
      };
    });
    return dimensions;
  };

  // 清理维度数据，移除所有旧字段
  const cleanDimensionData = (rawDimensions: any): Record<string, DimensionAnnotation> => {
    const cleaned: Record<string, DimensionAnnotation> = {};
    Object.keys(rawDimensions || {}).forEach(key => {
      const dim = rawDimensions[key];
      if (dim && typeof dim === 'object') {
        // 处理数字类型转换为字符串类型
        let resultValue = "999";
        let reasonValue = "999";
        
        if (typeof dim.result_annotation === 'number') {
          if ([1, 0, -1].includes(dim.result_annotation)) {
            resultValue = dim.result_annotation.toString();
          }
        } else if (typeof dim.result_annotation === 'string' && ["1", "0", "-1"].includes(dim.result_annotation)) {
          resultValue = dim.result_annotation;
        }
        
        if (typeof dim.reason_annotation === 'number') {
          if ([1, 0, -1].includes(dim.reason_annotation)) {
            reasonValue = dim.reason_annotation.toString();
          }
        } else if (typeof dim.reason_annotation === 'string' && ["1", "0", "-1"].includes(dim.reason_annotation)) {
          reasonValue = dim.reason_annotation;
        }
        
        cleaned[key] = {
          result_annotation: resultValue,
          reason_annotation: reasonValue,
        };
      }
    });
    return cleaned;
  };

  // 获取标注详情
  const fetchDetail = async () => {
    if (!evaluationId) return;
    
    setLoading(true);
    
    try {
      const response = await adminAPI.getAnnotationDetail(evaluationId);
      
      if (response.success) {
        setDetail(response.data);
        
        // 初始化标注表单
        let cleanedDimensions = initializeDimensions();
        
        // 如果有已有标注，使用清理函数确保数据结构正确
        if (response.data.my_annotation?.manual_dimensions) {
          const existingCleaned = cleanDimensionData(response.data.my_annotation.manual_dimensions);
          // 合并到初始化的维度中
          Object.keys(existingCleaned).forEach(key => {
            cleanedDimensions[key] = existingCleaned[key];
          });
        }
        
        const initialAnnotation: AnnotationData = {
          evaluation_id: response.data.evaluation_id,
          manual_correctness_score: response.data.my_annotation?.manual_correctness_score || response.data.ai_scores.correctness_score || 0,
          manual_fluency_score: response.data.my_annotation?.manual_fluency_score || response.data.ai_scores.fluency_score,
          manual_dimensions: cleanedDimensions,
        };
        
        setAnnotation(initialAnnotation);
        
        // 如果是看图说话题目，初始化要点数据
        setTimeout(() => {
          if (response.data.question_type === 'SPONTANEOUS_SPEECH_PICTURE') {
            initializePictureDescriptionPoints();
          }
        }, 100);
      } else {
        throw new Error('获取标注详情失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '网络错误';
      console.error('获取标注详情失败:', error);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 预加载音频文件
  const preloadAudio = useCallback(async () => {
    if (!evaluationId || !detail?.speaking_audio_info.has_audio) return;
    
    setAudioLoading(true);
    try {
      console.log('开始预加载音频文件，评估ID:', evaluationId);
      
      // 步骤1：获取音频令牌
      const audioData = await getAudioToken(evaluationId);
      
      // 步骤2：获取音频文件并创建 blob URL
      const response = await fetch(audioData.signed_url, {
        headers: { 'Authorization': `Bearer ${audioData.token}` }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No audio: 音频文件不存在'); // 表示音频文件不存在，不重试
        }
        throw new Error(`获取音频失败: ${response.status}`);
      }
      
      const audioBlob = await response.blob();
      const blobUrl = URL.createObjectURL(audioBlob);
      
        setAudioBlobUrl(blobUrl);
        audioBlobUrlRef.current = blobUrl; // 同时更新 ref
        console.log('音频预加载完成');
      
    } catch (error) {
      // 检测404错误 - 表示实际没有音频文件
      const errorStr = String(error);
      if (errorStr.includes('音频') && (
          errorStr.includes('没有') || 
          errorStr.includes('不存在') || 
          errorStr.includes('404') ||
          errorStr.includes('No audio')
        )) {
        console.log('🔇 实际没有音频文件，更新状态避免重复尝试');
        
        // 关键修复：更新detail状态，标记实际没有音频
        if (detail) {
          setDetail({
            ...detail,
            speaking_audio_info: {
              ...detail.speaking_audio_info,
              has_audio: false  // 设置为false，避免重复尝试加载
            }
          });
        }
      } else {
        // 其他错误正常显示
          console.error('音频加载失败:', error);
          showError('音频加载失败，请重试');
      }
    } finally {
      setAudioLoading(false);
    }
  }, [evaluationId, detail?.speaking_audio_info.has_audio]);

  // 播放/停止切换功能
  const toggleAudioPlayback = useCallback(() => {
    if (!audioBlobUrl) {
      showError('音频还未加载完成，请稍等');
      return;
    }
    
    // 如果正在播放，则停止
    if (isPlaying && currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0; // 重置到开始位置
      setIsPlaying(false);
      currentAudioRef.current = null;
      console.log('⏹️ 音频已停止');
      return;
    }
    
    // 开始播放
    console.log('🎵 开始播放音频，blob URL:', audioBlobUrl);
    const audio = new Audio(audioBlobUrl);
    
    currentAudioRef.current = audio;
    
    // 播放音频
    audio.play().then(() => {
      setIsPlaying(true);
      console.log('✅ 音频开始播放');
    }).catch(error => {
      console.error('播放失败:', error);
      showError('音频播放失败');
      setIsPlaying(false);
      currentAudioRef.current = null;
    });
    
    // 播放结束事件
    audio.addEventListener('ended', () => {
      console.log('🎵 音频播放完毕');
      setIsPlaying(false);
      currentAudioRef.current = null;
    });
    
    // 播放暂停事件
    audio.addEventListener('pause', () => {
      if (audio.currentTime === 0) {
        setIsPlaying(false);
        currentAudioRef.current = null;
      }
    });
  }, [audioBlobUrl, isPlaying]);


  // 提交标注
  const handleSubmit = async () => {
    setSubmitting(true);
    
    try {
      // 验证annotation数据结构
      console.log('开始提交标注，评估ID：', annotation.evaluation_id);
      
      // 验证必填字段 - 两个字段都必须选择（不能是"999"未选择状态）
      const filledDimensions = Object.entries(annotation.manual_dimensions).filter(
        ([_, dim]) => dim.result_annotation !== "999" && dim.reason_annotation !== "999"
      );
      
      if (filledDimensions.length === 0) {
        showError('请至少标注一个维度');
        return;
      }
      
      // 过滤空的维度并确保数据结构正确，只提交有效的选择（"1","0","-1"），不提交"999"
      const validDimensions = filledDimensions.filter(([_, dim]) => 
        ["1", "0", "-1"].includes(dim.result_annotation) && ["1", "0", "-1"].includes(dim.reason_annotation)
      );
      // 手动构建干净的维度数据
      const cleanedDimensions: Record<string, DimensionAnnotation> = {};
      validDimensions.forEach(([key, dim]) => {
        cleanedDimensions[key] = {
          result_annotation: dim.result_annotation,
          reason_annotation: dim.reason_annotation,
        };
      });
      
      const filteredAnnotation: AnnotationData = {
        evaluation_id: annotation.evaluation_id,
        manual_correctness_score: annotation.manual_correctness_score,
        manual_fluency_score: annotation.manual_fluency_score,
        manual_dimensions: cleanedDimensions,
      };
      
      // 最终安全检查：验证数据结构
      const isValidData = Object.entries(cleanedDimensions).every(([_, dim]) => {
        return typeof dim === 'object' && 
               dim !== null &&
               'result_annotation' in dim && 
               'reason_annotation' in dim &&
               typeof dim.result_annotation === 'string' && 
               typeof dim.reason_annotation === 'string' &&
               ["1", "0", "-1"].includes(dim.result_annotation) && 
               ["1", "0", "-1"].includes(dim.reason_annotation);
      });
      
      if (!isValidData) {
        console.error('数据验证失败');
        showError('数据验证失败，请重试');
        return;
      }
      
      console.log('准备提交', Object.keys(cleanedDimensions).length, '个维度的标注数据');
      console.log('提交的数据结构:', {
        evaluation_id: filteredAnnotation.evaluation_id,
        manual_correctness_score: filteredAnnotation.manual_correctness_score,
        manual_fluency_score: filteredAnnotation.manual_fluency_score,
        dimensions_count: Object.keys(filteredAnnotation.manual_dimensions).length,
        dimensions_sample: Object.keys(filteredAnnotation.manual_dimensions).slice(0, 3)
      });
      
      const response = await adminAPI.submitAnnotation(filteredAnnotation);
      
      if (response.success) {
        // 显示成功弹窗
        setShowSuccessModal(true);
        
        // 通知父组件更新
        onAnnotationUpdate?.();
        
        // 延迟关闭窗口
        setTimeout(() => {
          setShowSuccessModal(false);
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error('提交标注失败:', error);
      let errorMessage = '提交失败';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
      }
      
      console.error('错误详情:', errorMessage);
      showError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // 重置表单
  const handleReset = () => {
    if (detail) {
      const resetAnnotation: AnnotationData = {
        evaluation_id: detail.evaluation_id,
        manual_correctness_score: detail.ai_scores.correctness_score || 0,
        manual_fluency_score: detail.ai_scores.fluency_score,
        manual_dimensions: initializeDimensions(),
      };
      setAnnotation(resetAnnotation);
      showSuccess('表单已重置');
    }
  };

  // 更新维度标注
  const updateDimension = (key: string, field: keyof DimensionAnnotation, value: number) => {
    setAnnotation(prev => {
      const currentDim = prev.manual_dimensions[key] || { result_annotation: "999", reason_annotation: "999" };
      
      // 将数字转换为字符串存储
      const stringValue = value.toString();
      
      // 确保只保留新的字段结构
      const updatedDim: DimensionAnnotation = {
        result_annotation: field === 'result_annotation' ? stringValue : currentDim.result_annotation,
        reason_annotation: field === 'reason_annotation' ? stringValue : currentDim.reason_annotation,
      };
      
      return {
        ...prev,
        manual_dimensions: {
          ...prev.manual_dimensions,
          [key]: updatedDim,
        },
      };
    });
  };

  // 获取维度分组数据
  const getDimensionGroupsData = () => {
    return Object.entries(DIMENSION_GROUPS).map(([groupKey, groupConfig]) => {
      const groupDimensions = groupConfig.dimensions.filter(dim => 
        DIMENSION_NAMES[dim as keyof typeof DIMENSION_NAMES]
      ).map(dim => {
        // 确保annotation数据结构正确
        const rawAnnotation = annotation.manual_dimensions[dim];
        const cleanAnnotation: DimensionAnnotation = rawAnnotation ? {
          result_annotation: typeof rawAnnotation.result_annotation === 'string' ? rawAnnotation.result_annotation : "999",
          reason_annotation: typeof rawAnnotation.reason_annotation === 'string' ? rawAnnotation.reason_annotation : "999",
        } : {
          result_annotation: "999",
          reason_annotation: "999",
        };

        return {
          key: dim,
          name: DIMENSION_NAMES[dim as keyof typeof DIMENSION_NAMES],
          aiResult: detail?.ai_dimensions?.[dim],
          annotation: cleanAnnotation,
        };
      });

      return {
        key: groupKey,
        name: groupConfig.name,
        color: groupConfig.color,
        dimensions: groupDimensions,
      };
    });
  };

  // 获取分组文字颜色
  const getGroupTextColor = (groupKey: string) => {
    const colorMap: Record<string, string> = {
      'dialogue_smooth': 'text-blue-800',
      'expression_rich': 'text-purple-800',
      'grammar_correct': 'text-teal-800',
      'answer_correct': 'text-amber-800',
      'expression_smooth': 'text-rose-800',
    };
    return colorMap[groupKey] || 'text-gray-700';
  };

  // 获取分组徽章颜色
  const getGroupBadgeColor = (groupKey: string) => {
    const colorMap: Record<string, string> = {
      'dialogue_smooth': 'bg-blue-100 text-blue-700',
      'expression_rich': 'bg-purple-100 text-purple-700',
      'grammar_correct': 'bg-teal-100 text-teal-700',
      'answer_correct': 'bg-amber-100 text-amber-700',
      'expression_smooth': 'bg-rose-100 text-rose-700',
    };
    return colorMap[groupKey] || 'bg-gray-200 text-gray-700';
  };

  // 格式化时间
  const formatTime = (timeStr: string) => {
    try {
      return new Date(timeStr).toLocaleString('zh-CN');
    } catch {
      return timeStr;
    }
  };

  // 解析参考答案要点
  const parseAnswerPoints = (correctAnswer: string): string[] => {
    if (!correctAnswer) return [];
    
    // 处理常见的前缀（如"元素有："、"包含："等）
    let cleanAnswer = correctAnswer;
    const prefixPatterns = [/^[^：:]*[：:]\s*/, /^[^有]*有\s*[：:]\s*/];
    for (const pattern of prefixPatterns) {
      cleanAnswer = cleanAnswer.replace(pattern, '');
    }
    
    // 支持多种分隔符：顿号、逗号、分号、句号、换行
    const points = cleanAnswer
      .split(/[、，,；;。.\n]/)
      .map(point => point.trim())
      .filter(point => {
        // 过滤无效内容
        return point.length > 0 && 
               point !== '暂无参考答案' && 
               point !== '等等' && 
               point !== '等' &&
               !point.match(/^[。,，、；;:\s]*$/); // 过滤纯标点
      });
    
    console.log('原始参考答案:', correctAnswer);
    console.log('清理后答案:', cleanAnswer);
    console.log('解析出的要点:', points);
    
    return points;
  };

  // 获取所有用户回答文本
  const getUserAnswerTexts = (): string[] => {
    if (!detail) return [];
    
    const texts: string[] = [];
    
    // 添加最终回答
    if (detail.user_answer_text) {
      texts.push(detail.user_answer_text);
    }
    
    // 添加对话过程中的所有用户回答
    if (detail.user_ai_interaction?.rounds) {
      detail.user_ai_interaction.rounds.forEach(round => {
        if (round.user_answer?.text) {
          texts.push(round.user_answer.text);
        }
      });
    }
    
    return texts;
  };

  // 检测要点是否在用户回答中被提及（只要有一个字匹配即可）
  const detectPointInAnswer = (point: string, answerTexts: string[]): boolean => {
    if (!point || answerTexts.length === 0) return false;
    
    // 去除标点符号，只保留中文和字母数字
    const cleanPoint = point.replace(/[^\u4e00-\u9fa5\w]/g, '');
    
    // 将要点拆分为单个字符
    const pointChars = cleanPoint.split('');
    
    return answerTexts.some(text => {
      const cleanText = text.replace(/[^\u4e00-\u9fa5\w]/g, '');
      
      // 只要要点中的任意一个字符在用户回答中出现就算匹配
      return pointChars.some(char => cleanText.includes(char));
    });
  };

  // 初始化看图说话的要点数据
  const initializePictureDescriptionPoints = useCallback(() => {
    if (!detail || detail.question_type !== 'SPONTANEOUS_SPEECH_PICTURE') {
      return;
    }
    
    const points = parseAnswerPoints(detail.correct_answer);
    const userTexts = getUserAnswerTexts();
    
    const pointsData = points.map((point, index) => {
      const autoDetected = detectPointInAnswer(point, userTexts);
      
      return {
        id: `point_${index}`,
        text: point,
        autoDetected,
        manualSelected: autoDetected, // 默认选中自动检测到的要点
      };
    });
    
    setAnswerPoints(pointsData);
    
    // 计算初始得分
    const selectedCount = pointsData.filter(p => p.manualSelected).length;
    const totalCount = pointsData.length;
    const score = totalCount > 0 ? selectedCount / totalCount : 0;
    
    // 更新正确性得分
    setAnnotation(prev => ({
      ...prev,
      manual_correctness_score: parseFloat(score.toFixed(2))
    }));
  }, [detail]);

  // 切换要点选择状态
  const togglePointSelection = (pointId: string) => {
    setAnswerPoints(prev => {
      const newPoints = prev.map(point => 
        point.id === pointId 
          ? { ...point, manualSelected: !point.manualSelected }
          : point
      );
      
      // 重新计算得分
      const selectedCount = newPoints.filter(p => p.manualSelected).length;
      const totalCount = newPoints.length;
      const score = totalCount > 0 ? selectedCount / totalCount : 0;
      
      // 更新正确性得分
      setAnnotation(prev => ({
        ...prev,
        manual_correctness_score: parseFloat(score.toFixed(2))
      }));
      
      return newPoints;
    });
  };

  // 评价按钮组件
  const RatingButtons = ({ 
    value, 
    onChange, 
    disabled = false 
  }: { 
    value: number; 
    onChange: (value: number) => void; 
    disabled?: boolean;
  }) => {
    const buttons = [
      { 
        value: 1, 
        icon: 'fa-solid fa-check-circle', 
        label: '认同/正确'
      },
      { 
        value: 0, 
        icon: 'fa-solid fa-times-circle', 
        label: '不认同/错误'
      },
      { 
        value: -1, 
        icon: 'fa-solid fa-question-circle', 
        label: '不确定'
      },
    ];

    return (
      <div className="flex gap-2 items-center">
        {buttons.map((button) => (
          <button
            key={button.value}
            type="button"
            onClick={() => onChange(button.value)}
            disabled={disabled}
            className={`
              flex items-center justify-center w-8 h-8 transition-all
              ${value === button.value 
                ? 'text-green-600' 
                : 'text-gray-400 hover:text-gray-500'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={button.label}
          >
            <i className={`${button.icon} text-xl`}></i>
          </button>
        ))}
      </div>
    );
  };

  useEffect(() => {
    if (isOpen && evaluationId) {
      // 强制重置annotation状态，清除任何可能的旧数据
      setAnnotation({
        evaluation_id: evaluationId,
        manual_correctness_score: 0,
        manual_fluency_score: 0,
        manual_dimensions: {},
      });
      
      fetchDetail();
    }
  }, [isOpen, evaluationId]);

  // 当详情加载完成且有音频时，自动预加载音频
  useEffect(() => {
    console.log('🔍 音频预加载检查:', {
      hasDetail: !!detail,
      hasAudio: detail?.speaking_audio_info?.has_audio,
      audioBlobUrl: !!audioBlobUrl,
      audioLoading
    });
    
    if (detail?.speaking_audio_info?.has_audio && !audioBlobUrl && !audioLoading) {
      console.log('✅ 检测到有音频，开始预加载，评估ID:', evaluationId);
      preloadAudio();
    }
  }, [detail, audioBlobUrl, audioLoading, preloadAudio, evaluationId]);

  // 当detail加载完成后，重新初始化看图说话要点数据
  useEffect(() => {
    if (detail && detail.question_type === 'SPONTANEOUS_SPEECH_PICTURE') {
      console.log('🖼️ 检测到看图说话题目，初始化要点数据');
      initializePictureDescriptionPoints();
    }
  }, [detail, initializePictureDescriptionPoints]);

  // 仅在组件卸载时清理音频资源
  useEffect(() => {
    return () => {
      // 停止正在播放的音频
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }
      // 清理blob URL
      if (audioBlobUrlRef.current) {
        console.log('🧹 组件卸载，清理音频资源');
        URL.revokeObjectURL(audioBlobUrlRef.current);
      }
    };
  }, []); // 空依赖数组，仅在组件卸载时执行

  // 控制body滚动，确保弹窗显示时禁用背景滚动
  useEffect(() => {
    if (isOpen) {
      // 禁用body滚动并添加标识类
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.top = '0';
      document.body.classList.add('modal-open');
      
      return () => {
        // 恢复body样式
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = '';
        document.body.style.height = '';
        document.body.style.top = '';
        document.body.classList.remove('modal-open');
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const dimensionGroups = getDimensionGroupsData();

  return (
    <>
      {/* 主弹窗 */}
      <div style={{
        position: 'fixed',
        top: '0px',
        left: '0px',
        right: '0px',
        bottom: '0px',
        width: '100vw',
        height: '100vh',
        minWidth: '100vw',
        minHeight: '100vh',
        maxWidth: '100vw',
        maxHeight: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 2147483647,
        margin: '0',
        border: 'none',
        outline: 'none',
        boxSizing: 'border-box',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden'
      }}>
        <div className="bg-white rounded-xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
          {/* 弹窗标题 */}
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
            <h2 className="text-xl font-semibold text-blue-800">评估标注 - #{evaluationId}</h2>
            
            <div className="flex items-center space-x-6">
              {/* 用户信息 */}
              {detail && (
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center">
                    <i className="fa-solid fa-user text-blue-200 mr-2"></i>
                    <span>用户:</span>
                  </div>
                  <div className="flex space-x-3">
                    <span>{detail.user_name || '未知'}</span>
                    <span className="text-blue-200">|</span>
                    <span>ID: {detail.user_id}</span>
                    <span className="text-blue-200">|</span>
                    <span>{formatTime(detail.created_time)}</span>
                  </div>
                </div>
              )}
              
              <button
                onClick={onClose}
                className="text-blue-600 hover:text-blue-800 transition-colors hover:bg-blue-100 rounded-full p-2"
                title="关闭"
              >
                <i className="fa-solid fa-times text-xl"></i>
              </button>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <i className="fa-solid fa-spinner fa-spin text-2xl text-gray-400 mb-2"></i>
                  <p className="text-gray-500">加载中...</p>
                </div>
              </div>
            ) : detail ? (
              <div className="p-4 space-y-3">
                {/* 基本信息区域 - 两行布局 */}
                <div className="space-y-3">
                  {/* 题目信息 - 一行显示 */}
                  <div className="bg-gray-50 rounded-lg p-2">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center text-base">
                      <i className="fa-solid fa-clipboard-question text-green-600 mr-2"></i>
                      题目信息
                    </h3>
                    <div className="flex flex-wrap items-center gap-6 text-sm">
                      <div><span className="text-gray-600">题目:</span> <span className="font-medium">{detail.question_id}</span></div>
                      <div><span className="text-gray-600">试卷:</span> <span className="font-medium">{detail.quiz_id}</span></div>
                      <div><span className="text-gray-600">类型:</span> <span className="font-medium">
                        {detail.question_type === 'SPONTANEOUS_SPEECH_QA' ? '自发性言语' : 
                         detail.question_type === 'SPONTANEOUS_SPEECH_PICTURE' ? '看图说话' : 
                         detail.question_type}
                      </span></div>
                      <div><span className="text-gray-600">题目内容:</span> <span className="font-medium">{detail.question_content}</span></div>
                      <div><span className="text-gray-600">参考答案:</span> <span className="font-medium">{detail.correct_answer || '暂无参考答案'}</span></div>
                    </div>
                  </div>

                  {/* 评估信息 - 一行显示 */}
                  <div className="bg-gray-50 rounded-lg p-2">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center text-base">
                      <i className="fa-solid fa-robot text-purple-600 mr-2"></i>
                      评估信息
                    </h3>
                    <div className="flex flex-wrap items-center gap-6 text-sm">
                      <div><span className="text-gray-600">正确性:</span> 
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium ml-1">
                          {detail.ai_scores.correctness_score !== null ? detail.ai_scores.correctness_score : '未评估'}
                        </span>
                      </div>
                      <div><span className="text-gray-600">流畅性:</span> 
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium ml-1">
                          {detail.ai_scores.fluency_score}
                        </span>
                      </div>
                      <div><span className="text-gray-600">答题用时:</span> <span className="font-medium">{detail.answer_time}秒</span></div>
                      <div><span className="text-gray-600">提交时间:</span> <span className="font-medium">
                        {detail.submit_time ? 
                          new Date(detail.submit_time * 1000).toLocaleString('zh-CN') : 
                          '未知'
                        }
                      </span></div>
                    </div>
                  </div>
                </div>

                {/* 完整对话展示区域 */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-indigo-50 border-b border-indigo-200 px-4 py-3 flex items-center justify-between">
                    <h3 className="font-semibold flex items-center text-indigo-800">
                      <i className="fa-solid fa-comments mr-2"></i>
                      完整对话历史
                      {detail.user_ai_interaction && (
                        <span className="ml-3 bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-sm">
                          共 {detail.user_ai_interaction.total_rounds} 轮
                        </span>
                      )}
                    </h3>
                    
                    <div className="flex items-center space-x-4">
                      {/* 音频播放按钮 */}
                      <div className="flex items-center space-x-2">
                        {detail.speaking_audio_info.has_audio ? (
                          <div className="space-y-2">
                            <button
                              onClick={toggleAudioPlayback}
                              disabled={audioLoading || !audioBlobUrl}
                              className={`text-sm transition-all duration-300 ${
                                isPlaying 
                                  ? 'text-red-600 hover:text-red-800 animate-pulse' 
                                  : 'text-indigo-600 hover:text-indigo-800'
                              } disabled:text-gray-400`}
                            >
                              {audioLoading ? (
                                <><i className="fa-solid fa-spinner fa-spin mr-1"></i> 加载中</>
                              ) : !audioBlobUrl ? (
                                <><i className="fa-solid fa-clock mr-1"></i> 准备中</>
                              ) : isPlaying ? (
                                <>
                                  <i className="fa-solid fa-stop mr-1 animate-bounce"></i> 
                                  <span className="animate-pulse">停止播放</span>
                                </>
                              ) : (
                                <><i className="fa-solid fa-play mr-1"></i> 播放音频</>
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-indigo-500 text-sm">
                            <i className="fa-solid fa-volume-xmark mr-1"></i>
                            无音频
                          </span>
                        )}
                      </div>

                      {/* 折叠按钮 */}
                      <button
                        onClick={() => setDialogCollapsed(!dialogCollapsed)}
                        className="text-indigo-600 hover:text-indigo-800 p-1 rounded transition-transform duration-200"
                        title={dialogCollapsed ? "展开对话" : "折叠对话"}
                      >
                        <i className={`fa-solid ${dialogCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'} text-sm`}></i>
                      </button>
                    </div>
                  </div>
                  
                  {!dialogCollapsed && (
                    <div className="p-4 bg-gray-50">
                      {/* 聊天式对话界面 */}
                      {detail.user_ai_interaction && detail.user_ai_interaction.rounds && (
                        <div className="space-y-4">
                          {detail.user_ai_interaction.rounds.map((round, index) => (
                            <div key={index} className="space-y-3">
                              {/* AI提问 - 左侧深色气泡 */}
                              {round.prompt && (
                                <div className="flex justify-start items-start space-x-3">
                                  <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                                      <i className="fa-solid fa-robot text-white text-sm"></i>
                                    </div>
                                  </div>
                                  <div className="max-w-xs lg:max-w-md">
                                    <div className="bg-gray-700 text-white px-4 py-3 rounded-2xl rounded-tl-md">
                                      <p className="text-sm">{round.prompt}</p>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {round.timestamp ? new Date(round.timestamp).toLocaleTimeString() : ''}
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* 用户回答 - 右侧浅色气泡 */}
                              {round.user_answer && (
                                <div className="flex justify-end items-start space-x-3">
                                  <div className="max-w-xs lg:max-w-md">
                                    <div className="bg-green-500 text-white px-4 py-3 rounded-2xl rounded-tr-md shadow-sm">
                                      <p className="text-sm">{round.user_answer.text}</p>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 text-right">
                                      {round.timestamp ? new Date(round.timestamp).toLocaleTimeString() : ''}
                                      {round.user_answer.user_answer_time_spent > 0 && (
                                        <span className="ml-2">耗时: {round.user_answer.user_answer_time_spent}秒</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                                      <i className="fa-solid fa-user text-white text-sm"></i>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* AI反馈 - 左侧深色气泡 */}
                              {round.ai_response && (
                                <div className="flex justify-start items-start space-x-3">
                                  <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                      <i className="fa-solid fa-comment-dots text-white text-sm"></i>
                                    </div>
                                  </div>
                                  <div className="max-w-xs lg:max-w-md">
                                    <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-tl-md">
                                      <p className="text-sm">{round.ai_response}</p>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {round.timestamp ? new Date(round.timestamp).toLocaleTimeString() : ''}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                          
                          {/* 对话结束提示 */}
                          <div className="flex justify-center mt-6">
                            <div className="bg-white border rounded-full px-4 py-2 shadow-sm">
                              <div className="text-xs text-gray-600 flex items-center">
                                <i className="fa-solid fa-flag-checkered text-green-500 mr-2"></i>
                                对话结束，最终回答: <span className="font-medium text-gray-800 ml-1">{detail.user_answer_text}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 折叠状态预览 */}
                  {dialogCollapsed && (
                    <div className="p-4 bg-gray-50 border-t">
                      <div className="flex items-center justify-center text-gray-500 text-sm">
                        <i className="fa-solid fa-comments mr-2"></i>
                        对话已折叠（共 {detail.user_ai_interaction?.total_rounds || 0} 轮对话）
                        <span className="ml-3 text-gray-400">·</span>
                        <span className="ml-3">最终回答: {detail.user_answer_text}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 人工标注区域 */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-3">
                    <h3 className="font-semibold text-emerald-800">人工标注</h3>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    {/* 基础评分 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          正确性得分 (0-1)
                        </label>
                        
                        {/* 看图说话特殊评分界面 */}
                        {detail.question_type === 'SPONTANEOUS_SPEECH_PICTURE' ? (
                          <div className="space-y-3">
                            {/* 得分显示 */}
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border">
                              <span className="text-sm text-gray-600">计算得分：</span>
                              <span className="text-lg font-semibold text-blue-600">
                                {annotation.manual_correctness_score.toFixed(2)}
                              </span>
                            </div>
                            
                            {/* 要点选择列表 */}
                            {answerPoints.length > 0 ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                                  <span>参考答案要点匹配</span>
                                  <span>
                                    {answerPoints.filter(p => p.manualSelected).length} / {answerPoints.length} 项
                                  </span>
                                </div>
                                
                                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                                  {answerPoints.map((point) => (
                                    <div
                                      key={point.id}
                                      className={`
                                        relative inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium cursor-pointer
                                        transition-all duration-200 border-2
                                        ${point.manualSelected 
                                          ? 'bg-green-500 text-white border-green-500 shadow-md' 
                                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                                        }
                                      `}
                                      onClick={() => togglePointSelection(point.id)}
                                      title={point.autoDetected ? '自动检测到此要点' : '点击选择/取消选择'}
                                    >
                                      {/* 要点文本 */}
                                      <span>{point.text}</span>
                                      
                                      {/* 自动检测标识 */}
                                      {point.autoDetected && (
                                        <i className={`fa-solid fa-robot text-xs ml-2 ${
                                          point.manualSelected ? 'text-green-100' : 'text-blue-500'
                                        }`}></i>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                
                                {/* 说明文字 */}
                                <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                                  <i className="fa-solid fa-info-circle mr-1"></i>
                                  点击要点可手动选择/取消选择，得分 = 选中要点数 ÷ 总要点数
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 text-sm text-gray-500 text-center bg-gray-50 rounded">
                                无参考答案要点可解析
                              </div>
                            )}
                          </div>
                        ) : (
                          /* 普通题目的数字输入框 */
                          <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            value={annotation.manual_correctness_score}
                            onChange={(e) => setAnnotation(prev => ({
                              ...prev,
                              manual_correctness_score: parseFloat(e.target.value) || 0
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          流畅性得分 (0-10)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                          value={annotation.manual_fluency_score}
                          onChange={(e) => setAnnotation(prev => ({
                            ...prev,
                            manual_fluency_score: parseFloat(e.target.value) || 0
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>

                    {/* 15个维度标注 */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">
                        失语症评估维度标注 (15项)
                        <span className="ml-2 text-sm font-normal text-gray-600">- 包含AI原始分析结果</span>
                      </h4>
                      
                      <div className="space-y-4">
                        {dimensionGroups.map((group) => (
                          <div key={group.key} className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className={`${group.color} px-4 py-3`}>
                              <h5 className="font-semibold flex items-center justify-between">
                                <span className={getGroupTextColor(group.key)}>{group.name}</span>
                                <span className={`text-sm px-2 py-1 rounded ${getGroupBadgeColor(group.key)}`}>
                                  {group.dimensions.length} 项维度
                                </span>
                              </h5>
                            </div>
                            
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="sticky top-0 z-10 shadow-sm">
                                  <tr className="border-b-2 border-gray-200 bg-gray-50">
                                    <th className="text-left p-3 font-semibold text-gray-900 w-32 bg-gray-50">维度名称</th>
                                    <th className="text-left p-3 font-semibold text-gray-900 w-20 bg-gray-50">AI结果</th>
                                    <th className="text-left p-3 font-semibold text-gray-900 bg-gray-50">AI分析原因</th>
                                    <th className="text-center p-3 font-semibold text-gray-900 w-32 bg-gray-50">结果评价</th>
                                    <th className="text-center p-3 font-semibold text-gray-900 w-32 bg-gray-50">原因评价</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.dimensions.map((dimension) => (
                                    <tr key={dimension.key} className="border-b border-gray-100 hover:bg-gray-50 bg-white">
                                      {/* 维度名称 */}
                                      <td className="p-3 align-top w-32">
                                        <div className="font-medium text-gray-900 text-sm">
                                          {dimension.name}
                                        </div>
                                      </td>
                                      
                                      {/* AI结果 */}
                                      <td className="p-3 align-top w-20">
                                        {dimension.aiResult ? (
                                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                            dimension.aiResult.result === '是' ? 'bg-green-100 text-green-800' :
                                            dimension.aiResult.result === '否' ? 'bg-red-100 text-red-800' : 
                                            'bg-yellow-100 text-yellow-800'
                                          }`}>
                                            {dimension.aiResult.result}
                                          </span>
                                        ) : (
                                          <span className="text-gray-400 text-xs">未分析</span>
                                        )}
                                      </td>
                                      
                                      {/* AI分析原因 */}
                                      <td className="p-3 align-top">
                                        {dimension.aiResult ? (
                                          <div className="text-sm text-gray-700 leading-relaxed">
                                            {dimension.aiResult.reason}
                                          </div>
                                        ) : (
                                          <span className="text-gray-400 text-xs">-</span>
                                        )}
                                      </td>
                                      
                                      {/* 结果评价 */}
                                      <td className="p-3 text-center w-32">
                                        <div className="flex justify-center">
                                          <RatingButtons
                                            value={parseInt(dimension.annotation.result_annotation)}
                                            onChange={(value) => updateDimension(dimension.key, 'result_annotation', value)}
                                          />
                                        </div>
                                      </td>
                                      
                                      {/* 原因评价 */}
                                      <td className="p-3 text-center w-32">
                                        <div className="flex justify-center">
                                          <RatingButtons
                                            value={parseInt(dimension.annotation.reason_annotation)}
                                            onChange={(value) => updateDimension(dimension.key, 'reason_annotation', value)}
                                          />
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <i className="fa-solid fa-exclamation-triangle text-4xl text-red-300 mb-4"></i>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
                  <p className="text-gray-500">无法加载标注详情</p>
                </div>
              </div>
            )}
          </div>

          {/* 底部操作栏 */}
          {detail && (
            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
              <div className="flex items-center space-x-8">
                <div className="text-sm text-gray-600">
                  状态: <span className={`font-medium ${
                    detail.annotation_status === 'PENDING' ? 'text-orange-600' :
                    detail.annotation_status === 'MY_ANNOTATED' ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {detail.annotation_status === 'PENDING' ? '待标注' :
                     detail.annotation_status === 'MY_ANNOTATED' ? '我已标注' : '他人已标注'}
                  </span>
                </div>
                
                {/* 标注统计 */}
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <i className="fa-solid fa-chart-bar text-orange-600 mr-2"></i>
                    <span className="font-medium">标注统计:</span>
                  </div>
                  <div className="flex space-x-3">
                    <span>人数: <span className="font-medium text-gray-800">{detail.annotation_statistics.total_count}</span></span>
                    <span>正确性: <span className="font-medium text-gray-800">{detail.annotation_statistics.avg_correctness_score?.toFixed(2) || '-'}</span></span>
                    <span>流畅性: <span className="font-medium text-gray-800">{detail.annotation_statistics.avg_fluency_score?.toFixed(2) || '-'}</span></span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition-colors"
                >
                  重置
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded font-medium transition-colors"
                >
                  {submitting ? (
                    <><i className="fa-solid fa-spinner fa-spin mr-2"></i> 提交中...</>
                  ) : (
                    '提交标注'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 成功提示弹窗 */}
      {showSuccessModal && (
        <div style={{
          position: 'fixed',
          top: '0px',
          left: '0px',
          right: '0px',
          bottom: '0px',
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 2147483647,
          margin: '0',
          border: 'none',
          outline: 'none'
        }}>
          <div className="bg-white rounded-xl max-w-md w-full mx-4">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-check text-2xl text-green-600"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">标注提交成功！</h3>
              <p className="text-gray-600">您的标注已经成功保存</p>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
