import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { EvaluationDetailResponse, QuestionDetail, DIMENSION_NAMES, ParsedAphasiaType } from '@/types/wab';
import { cn } from '@/lib/utils';
import { adminAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function EvaluationDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const [evaluationData, setEvaluationData] = useState<EvaluationDetailResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDimensionsModal, setShowDimensionsModal] = useState(false);
  const [showDialogModal, setShowDialogModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionDetail | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const audioRef = useRef<HTMLAudioElement>(null);

  // 获取查询参数
  const quizId = searchParams.get('quiz_id');

  // 获取评估详情数据
  const fetchEvaluationDetail = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const response = await adminAPI.getEvaluationDetail({
        userId,
        quizId: quizId || undefined
      });

      if (response.success) {
        setEvaluationData(response.data);
      } else {
        throw new Error(response.message || '获取评估详情失败');
      }
    } catch (error) {
      console.error('获取评估详情失败:', error);
      let errorMessage = '获取评估详情失败';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // 根据错误类型显示不同的提示
      if (errorMessage.includes('认证') || errorMessage.includes('登录') || errorMessage.includes('token') || errorMessage.includes('令牌')) {
        toast.error('认证失败，请重新登录');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else if (errorMessage.includes('无效的数据格式') || errorMessage.includes('JSON')) {
        toast.error('服务器数据格式错误，请联系管理员或稍后重试');
      } else if (errorMessage.includes('网络连接')) {
        toast.error('网络连接失败，请检查网络后重试');
      } else if (errorMessage.includes('服务器错误')) {
        toast.error('服务器暂时无法处理请求，请稍后重试');
      } else if (errorMessage.includes('quiz_id为必需参数')) {
        toast.error('没有评估详情信息');
        setTimeout(() => {
          window.location.href = '/wab/reports';
        }, 2000);
        return;
      } else {
        toast.error(errorMessage);
      }
      
      setEvaluationData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchEvaluationDetail();
    }
  }, [userId, quizId]);

  // 解析失语症维度数据
  const parseAphasiaType = (aphasiaTypeJson: string): ParsedAphasiaType | null => {
    try {
      return JSON.parse(aphasiaTypeJson);
    } catch (error) {
      console.error('解析失语症维度数据失败:', error);
      return null;
    }
  };

  // 获取所有题目列表
  const getAllQuestions = (): QuestionDetail[] => {
    if (!evaluationData?.assessment_info) return [];
    
    const allQuestions: QuestionDetail[] = [];
    evaluationData.assessment_info.forEach(assessmentType => {
      allQuestions.push(...assessmentType.questions);
    });
    
    return allQuestions;
  };

  // 修复音频URL
  const getFullAudioUrl = (audioUrl: string): string => {
    if (!audioUrl) return '';
    if (audioUrl.startsWith('http')) return audioUrl;
    return `http://120.48.175.29:8001${audioUrl}`;
  };

  // 处理查看维度详情
  const handleViewDimensions = (question: QuestionDetail) => {
    setSelectedQuestion(question);
    setShowDimensionsModal(true);
  };

  // 处理查看对话结果
  const handleViewDialog = (question: QuestionDetail) => {
    setSelectedQuestion(question);
    setShowDialogModal(true);
  };

  // 获取选中题目的维度分组
  const getDimensionGroups = () => {
    if (!selectedQuestion?.aphasia_types) return [];

    const allDimensions = Object.entries(selectedQuestion.aphasia_types);
    
    // 定义分组配置
    const groupConfigs = [
      {
        key: 'dialogue_smooth',
        name: '对话顺畅',
        color: 'bg-green-500',
        dimensionKeys: ['no_silence', 'no_stereotyped_speech', 'no_perseverative_speech', 'no_echolalia']
      },
      {
        key: 'expression_rich',
        name: '表达丰富',
        color: 'bg-blue-500',
        dimensionKeys: ['normal_speech_rate', 'lexical_richness']
      },
      {
        key: 'grammar_correct',
        name: '语法正确',
        color: 'bg-purple-500',
        dimensionKeys: ['no_telegraphic_speech', 'no_empty_speech', 'correct_word_order', 'correct_collocation']
      },
      {
        key: 'answer_correct',
        name: '答案正确',
        color: 'bg-orange-500',
        dimensionKeys: ['topic_relevance', 'correct_answer']
      },
      {
        key: 'expression_smooth',
        name: '表达顺畅',
        color: 'bg-red-500',
        dimensionKeys: ['no_naming_impairment', 'no_word_finding_difficulty', 'no_self_correction']
      }
    ];

    return groupConfigs.map(config => {
      const groupDimensions = allDimensions.filter(([key]) => 
        config.dimensionKeys.includes(key)
      );
      
      const realData = groupDimensions.map(([key, value]) => {
        const parsedData = parseAphasiaType(value);
        const dimensionName = DIMENSION_NAMES[key] || key;
        
        if (parsedData) {
          return {
            name: dimensionName,
            reason: parsedData.reason || '暂无分析原因',
            result: parsedData.result || '否',
            qwen: parsedData.qwen_used || false
          };
        } else {
          // 如果解析失败，显示原始数据
          return {
            name: dimensionName,
            reason: '数据格式异常',
            result: value === 'true' || value === '1' ? '是' : '否',
            qwen: false
          };
        }
      });

      return {
        key: config.key,
        name: config.name,
        count: realData.length,
        color: config.color,
        dimensions: groupDimensions,
        realData: realData
      };
    }).filter(group => group.realData.length > 0); // 只显示有数据的分组
  };

  // 计算总体分数（使用第一个题目的分数）
  const calculateOverallScores = () => {
    const allQuestions = getAllQuestions();
    if (allQuestions.length === 0) {
      return { correctnessPercent: 0, fluencyPercent: 0 };
    }

    // 使用第一个题目的分数作为显示
    const firstQuestion = allQuestions[0];
    const correctnessPercent = Math.round(firstQuestion.scores.correctness_score * 100);
    const fluencyPercent = Math.round(firstQuestion.scores.fluency_score * 100);

    return { correctnessPercent, fluencyPercent };
  };

  // 获取所有题目的表格数据
  const getQuestionTableData = () => {
    const allQuestions = getAllQuestions();
    
    return allQuestions.map((question, index) => ({
      id: index + 1,
      sequence: index + 1,
      type: question.question_type || "自发言语",
      content: question.question_content || '问题内容未知',
      referenceAnswer: '基于语音分析',
      duration: '分析中',
      correctnessScore: question.scores.correctness_score.toString(),
      fluencyScore: question.scores.fluency_score.toString(),
      questionDetail: question
    }));
  };

  // 音频播放控制
  const toggleAudio = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // 切换分组展开/收起
  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-500 mb-4"></i>
          <p className="text-gray-600 text-lg">加载评估详情中...</p>
        </div>
      </div>
    );
  }

  if (!evaluationData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center py-12 bg-white rounded-2xl shadow-md px-8 mx-4 max-w-md">
          <i className="fa-solid fa-exclamation-triangle text-6xl text-yellow-500 mb-6"></i>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">数据加载失败</h3>
          <p className="text-gray-500 mb-6">
            评估详情暂时无法获取，可能是以下原因：
          </p>
          <ul className="text-left text-gray-600 mb-6 space-y-2">
            <li>• 评估记录不存在</li>
            <li>• 服务器暂时无法访问</li>
            <li>• 网络连接问题</li>
          </ul>
          <div className="flex flex-col space-y-3">
            <button
              onClick={fetchEvaluationDetail}
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <i className="fa-solid fa-refresh mr-2"></i>
              重试加载
            </button>
            <Link
              to="/wab/reports"
              className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              <i className="fa-solid fa-arrow-left mr-2"></i>
              返回列表
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 计算数据
  const allQuestions = getAllQuestions();
  const { correctnessPercent, fluencyPercent } = calculateOverallScores();
  const dimensionGroups = getDimensionGroups();
  const questionTableData = getQuestionTableData();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto p-5 space-y-5">
        
        {/* 顶部返回按钮 */}
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/wab/reports"
            className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <i className="fa-solid fa-arrow-left text-xl mr-2"></i>
            <span className="font-medium">返回列表</span>
          </Link>
        </div>

        {/* 用户信息卡片 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-gray-500 text-sm mb-1">评估人</div>
              <div className="text-gray-900 font-medium">
                {evaluationData.basic_info?.username || `用户${evaluationData.basic_info?.user_id}`}
              </div>
            </div>
            <div>
              <div className="text-gray-500 text-sm mb-1">年龄</div>
              <div className="text-gray-900 font-medium">-</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm mb-1">失语类型</div>
              <div className="text-gray-900 font-medium">-</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm mb-1">总时长</div>
              <div className="text-gray-900 font-medium">-</div>
            </div>
          </div>
        </div>

        {/* 分数展示卡片 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <div className="text-gray-500 text-sm mb-2">正确性</div>
              <div className="text-4xl font-bold text-blue-600 mb-2">{correctnessPercent}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${correctnessPercent}%` }}
                ></div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-500 text-sm mb-2">流畅度</div>
              <div className="text-4xl font-bold text-green-600 mb-2">{fluencyPercent}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${fluencyPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* 问题表格 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">评估题目详情</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-center font-medium">序号</th>
                  <th className="px-3 py-2 text-center font-medium">题型</th>
                  <th className="px-3 py-2 text-center font-medium">题目内容</th>
                  <th className="px-3 py-2 text-center font-medium">参考答案</th>
                  <th className="px-3 py-2 text-center font-medium">对话结果</th>
                  <th className="px-3 py-2 text-center font-medium">时长</th>
                  <th className="px-3 py-2 text-center font-medium">正确性</th>
                  <th className="px-3 py-2 text-center font-medium">流畅度得分</th>
                  <th className="px-3 py-2 text-center font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {questionTableData.map((question) => (
                  <tr key={question.id} className="border-t border-gray-100">
                    <td className="px-3 py-3 text-center text-sm text-gray-900">
                      {question.sequence}
                    </td>
                    <td className="px-3 py-3 text-center text-sm text-gray-600">
                      {question.type}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-900 max-w-[120px]">
                      <div className="truncate" title={question.content}>
                        {question.content}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600 max-w-[100px]">
                      <div className="truncate" title={question.referenceAnswer}>
                        {question.referenceAnswer}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button 
                        onClick={() => handleViewDialog(question.questionDetail)}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md text-sm font-medium transition-colors"
                      >
                        查看详情
                      </button>
                    </td>
                    <td className="px-3 py-3 text-center text-sm text-gray-600">
                      {question.duration}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        {Math.round(parseFloat(question.correctnessScore) * 100)}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        {Math.round(parseFloat(question.fluencyScore) * 100)}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button 
                        onClick={() => handleViewDimensions(question.questionDetail)}
                        className="inline-flex items-center px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-md text-sm font-medium transition-colors"
                      >
                        维度详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 对话结果弹窗 */}
      {showDialogModal && selectedQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">对话结果</h3>
                <button
                  onClick={() => setShowDialogModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className="fa-solid fa-times text-xl"></i>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* 问题内容 */}
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-700 font-medium">问题内容</span>
                  <button className="text-blue-600 hover:text-blue-800">
                    <i className="fa-solid fa-play text-sm"></i>
                  </button>
                </div>
                <p className="text-gray-800">{selectedQuestion.question_content}</p>
              </div>

              {/* 用户回答 */}
              <div className="bg-green-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-700 font-medium">用户回答</span>
                  <button 
                    onClick={toggleAudio}
                    className="text-green-600 hover:text-green-800"
                  >
                    <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'} text-sm`}></i>
                  </button>
                </div>
                <p className="text-gray-800">{selectedQuestion.user_answer_text}</p>
              </div>

              {/* 评估分数 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="text-gray-500 text-sm mb-1">正确性</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(selectedQuestion.scores.correctness_score * 100)}%
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="text-gray-500 text-sm mb-1">流畅度</div>
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(selectedQuestion.scores.fluency_score * 100)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 维度详情弹窗 */}
      {showDimensionsModal && selectedQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">评估维度详细分析</h3>
                <button
                  onClick={() => setShowDimensionsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className="fa-solid fa-times text-xl"></i>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {dimensionGroups.map((group, groupIndex) => (
                <div key={group.key} className="bg-gray-50 rounded-xl overflow-hidden shadow-sm">
                  <div 
                    className={cn(
                      "text-white p-3 flex items-center justify-between cursor-pointer",
                      group.color
                    )}
                    onClick={() => toggleGroup(group.key)}
                  >
                    <span className="font-medium">{group.name} ({group.count}项)</span>
                    <i className={cn(
                      "fa-solid text-sm transition-transform",
                      collapsedGroups[group.key] ? "fa-chevron-down" : "fa-chevron-up"
                    )}></i>
                  </div>
                  {!collapsedGroups[group.key] && (
                    <div className="p-3 space-y-2">
                      {group.realData.map((item, itemIndex) => (
                        <div key={itemIndex} className="bg-white rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                                {groupIndex * 4 + itemIndex + 1}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 mb-1">{item.name}</div>
                                <div className="text-gray-500 text-sm">{item.reason}</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 ml-3">
                              <span className={cn(
                                "px-2 py-1 rounded text-xs font-bold text-white",
                                item.result === '是' ? 'bg-green-500' : 'bg-red-500'
                              )}>
                                {item.result}
                              </span>
                              <span className={cn(
                                "px-2 py-1 rounded text-xs font-bold text-white",
                                item.qwen ? 'bg-green-500' : 'bg-blue-500'
                              )}>
                                {item.qwen ? 'Q' : 'D'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 隐藏的音频元素 */}
      {selectedQuestion?.speaking_audio_url && (
        <audio 
          ref={audioRef}
          onLoadedData={() => console.log('音频加载完成')}
          onError={(e) => console.error('音频加载失败:', e)}
          onEnded={() => setIsPlaying(false)}
        >
          <source src={getFullAudioUrl(selectedQuestion.speaking_audio_url)} type="audio/wav" />
        </audio>
      )}
    </div>
  );
}
