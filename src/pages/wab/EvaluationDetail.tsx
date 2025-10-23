import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { EvaluationDetailResponse, QuestionDetail, DIMENSION_NAMES, ParsedAphasiaType } from '@/types/wab';
import { cn } from '@/lib/utils';
import { adminAPI } from '@/lib/api';
import { showError, showSuccess } from '@/lib/toast';
import AudioPlayer from './components/AudioPlayer';
import { useReevaluation } from '@/lib/reevaluation';
import ReevaluationProgress from '@/components/ReevaluationProgress';

export default function EvaluationDetailPage() {
  console.log('EvaluationDetailPage component rendered');
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  console.log('Route params - userId:', userId);
  const [evaluationData, setEvaluationData] = useState<EvaluationDetailResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDimensionsModal, setShowDimensionsModal] = useState(false);
  const [showDialogModal, setShowDialogModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionDetail | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // 重评估相关状态
  const [showProgress, setShowProgress] = useState(false);
  const [reevaluatingQuestions, setReevaluatingQuestions] = useState<Set<string>>(new Set());
  const progressRef = useRef<any>(null);
  const { reevaluateQuestion } = useReevaluation();
  

  // 获取查询参数
  const quizId = searchParams.get('quiz_id');

  // 获取评估详情数据
  const fetchEvaluationDetail = async () => {
    if (!userId) {
      console.error('fetchEvaluationDetail: userId is missing');
      return;
    }
    
    console.log('fetchEvaluationDetail: starting with userId:', userId, 'quizId:', quizId);
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
        showError('认证失败，请重新登录');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else if (errorMessage.includes('无效的数据格式') || errorMessage.includes('JSON')) {
        showError('服务器数据格式错误，请联系管理员或稍后重试');
      } else if (errorMessage.includes('网络连接')) {
        showError('网络连接失败，请检查网络后重试');
      } else if (errorMessage.includes('服务器错误')) {
        showError('服务器暂时无法处理请求，请稍后重试');
      } else if (errorMessage.includes('quiz_id为必需参数')) {
        showError('没有评估详情信息');
        setTimeout(() => {
          window.location.href = '/wab/reports';
        }, 2000);
        return;
      } else {
        showError(errorMessage);
      }
      
      setEvaluationData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('EvaluationDetail useEffect - userId:', userId, 'quizId:', quizId);
    if (userId) {
      fetchEvaluationDetail();
    } else {
      console.error('userId is missing');
      setLoading(false);
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
    
    // 按question_id排序，确保q_001在前面
    return allQuestions.sort((a, b) => {
      // 提取question_id中的数字部分进行比较
      const getQuestionNumber = (questionId: string) => {
        const match = questionId.match(/q_(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      };
      
      return getQuestionNumber(a.question_id) - getQuestionNumber(b.question_id);
    });
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
        dimensionKeys: ['no_word_finding_difficulty', 'no_self_correction'] // 'no_naming_impairment' 暂时注释不显示
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
            key: key,
            name: dimensionName,
            reason: parsedData.reason || '暂无分析原因',
            result: parsedData.result || '否',
            qwen: parsedData.qwen_used || false
          };
        } else {
          // 如果解析失败，显示原始数据
          return {
            key: key,
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


  // 获取所有题目的表格数据
  const getQuestionTableData = () => {
    const allQuestions = getAllQuestions();
    
    return allQuestions.map((question, index) => ({
      id: index + 1,
      sequence: index + 1,
      type: question.question_type === 'SPONTANEOUS_SPEECH_QA' ? '自发性言语' : (question.question_type || "自发言语"),
      content: question.question_content || '问题内容未知',
      referenceAnswer: question.correct_answer || '参考答案未知',
      duration: question.answer_time ? `${question.answer_time}秒` : '未知',
      correctnessScore: question.scores.correctness_score.toString(),
      fluencyScore: question.scores.fluency_score.toString(),
      fluencyScoreDisplay: question.scores.fluency_score > 1 
        ? Math.round(question.scores.fluency_score * 10) 
        : Math.round(question.scores.fluency_score * 100),
      questionDetail: question
    }));
  };

  // 重评估单个题目
  const handleQuestionReevaluate = async (question: QuestionDetail) => {
    try {
      // 检查是否已经在重评估中
      if (reevaluatingQuestions.has(question.question_id)) {
        showError('该题目正在重新评估中，请稍候...');
        return;
      }

      // 检查必要参数
      if (!userId || !quizId) {
        showError('缺少必要参数，无法重新评估');
        return;
      }

      // 确认重评估
      const confirmed = window.confirm(
        `确定要重新评估题目"${question.question_id}"吗？\n\n` +
        `题目内容：${question.question_content}\n` +
        `当前正确性得分：${Math.round(question.scores.correctness_score * 100)}%\n` +
        `当前流畅度得分：${Math.round(question.scores.fluency_score * 100)}%\n` +
        `预计用时：30-60秒\n\n` +
        `重新评估将更新该题目的评估结果，此操作不可撤销。`
      );

      if (!confirmed) {
        return;
      }

      // 添加到重评估列表
      setReevaluatingQuestions(prev => new Set([...prev, question.question_id]));

      // 显示进度窗口
      setShowProgress(true);

      // 启动重评估
      await reevaluateQuestion(
        parseInt(userId), 
        question.question_id,
        quizId,
        {
          aiModel: 'auto',
          onProgress: (status) => {
            console.log(`题目 ${question.question_id} 进度更新:`, status);
            // 更新进度组件
            if (progressRef.current) {
              progressRef.current.addTask(status.task_id, status, question.question_id);
            }
          },
          onComplete: (result) => {
            console.log(`题目 ${question.question_id} 重评估完成:`, result);
            
            showSuccess(`题目 ${question.question_id} 重新评估完成！`);
            
            // 移除重评估状态
            setReevaluatingQuestions(prev => {
              const newSet = new Set(prev);
              newSet.delete(question.question_id);
              return newSet;
            });
            
            // 刷新评估数据
            fetchEvaluationDetail();
            
            // 延迟关闭进度窗口
            setTimeout(() => {
              setShowProgress(false);
              if (progressRef.current) {
                progressRef.current.reset();
              }
            }, 2000);
          },
          onError: (error) => {
            console.error(`题目 ${question.question_id} 重评估失败:`, error);
            // 移除重评估状态
            setReevaluatingQuestions(prev => {
              const newSet = new Set(prev);
              newSet.delete(question.question_id);
              return newSet;
            });
            // 关闭进度窗口
            setShowProgress(false);
            if (progressRef.current) {
              progressRef.current.reset();
            }
          }
        }
      );

    } catch (error) {
      console.error('重新评估失败:', error);
      // 移除重评估状态
      setReevaluatingQuestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(question.question_id);
        return newSet;
      });
      // 关闭进度窗口
      setShowProgress(false);
      if (progressRef.current) {
        progressRef.current.reset();
      }
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
          <p className="text-sm text-gray-500 mt-2">userId: {userId}, quizId: {quizId}</p>
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
              <i className="fa-solid fa-refresh mr-3"></i>
              重试加载
            </button>
            <Link
              to="/wab/reports"
              className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              <i className="fa-solid fa-arrow-left mr-3"></i>
              返回列表
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 计算总体分数
  const calculateOverallScores = () => {
    const allQuestions = getAllQuestions();
    if (allQuestions.length === 0) {
      return { correctnessPercent: 0, fluencyAverage: 0 };
    }

    // 计算正确率：correctness_score = 1 表示正确，其他表示错误
    const correctCount = allQuestions.filter(q => q.scores.correctness_score === 1).length;
    const correctnessPercent = Math.round((correctCount / allQuestions.length) * 100);

    // 计算流畅度平均值（保留一位小数）
    const totalFluencyScore = allQuestions.reduce((sum, q) => sum + q.scores.fluency_score, 0);
    const fluencyAverage = Math.round((totalFluencyScore / allQuestions.length) * 10) / 10;

    return { correctnessPercent, fluencyAverage };
  };
  
  const { correctnessPercent, fluencyAverage } = calculateOverallScores();
  const dimensionGroups = getDimensionGroups();
  const questionTableData = getQuestionTableData();

  return (
    <div className="h-full flex flex-col space-y-2">
        {/* 顶部操作按钮 */}
        <div className="pb-1 flex items-center justify-between">
          <Link
            to="/wab/reports"
            className="inline-flex items-center px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors text-sm"
          >
            <i className="fa-solid fa-arrow-left text-sm mr-2"></i>
            <span>返回列表</span>
          </Link>
          
          {/* 查看回放按钮 */}
          {evaluationData?.basic_info && (
            <Link
              to={`/users/playback/${evaluationData.basic_info.user_id}${quizId ? `?quiz_id=${quizId}` : ''}`}
              className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium"
            >
              <i className="fa-solid fa-video mr-2"></i>
              查看回放
            </Link>
          )}
        </div>

        {/* 用户信息卡片 */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-gray-500 text-sm mb-1">评估人</div>
              <div className="text-gray-900 text-base font-medium">
                {evaluationData.basic_info?.username || '未知用户'}
              </div>
            </div>
            <div>
              <div className="text-gray-500 text-sm mb-1">年龄</div>
              <div className="text-gray-900 text-base font-medium">
                {evaluationData.basic_info?.age || '-'}
              </div>
            </div>
            <div>
              <div className="text-gray-500 text-sm mb-1">失语类型</div>
              <div className="text-gray-900 text-base font-medium">
                {evaluationData.basic_info?.aphasia_type || '-'}
              </div>
            </div>
            <div>
              <div className="text-gray-500 text-sm mb-1">总时长</div>
              <div className="text-gray-900 text-base font-medium">
                {evaluationData.basic_info?.total_time ? `${evaluationData.basic_info.total_time}秒` : '-'}
              </div>
            </div>
          </div>
        </div>


        {/* 问题表格 - 可折叠 */}
        <div className="bg-white overflow-hidden border border-gray-200 rounded-lg flex-1 flex flex-col">
          <div 
            className="px-3 py-2 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">评估题目详情</h3>
              <div className="flex items-center space-x-2">
                <div className="text-sm text-gray-600">
                  <span className="mr-3">正确率: <span className="font-medium text-blue-600">{correctnessPercent}%</span></span>
                  <span>流畅度: <span className="font-medium text-green-600">{fluencyAverage}</span></span>
                </div>
                <i className={cn(
                  "fa-solid text-base transition-transform",
                  isCollapsed ? "fa-chevron-down" : "fa-chevron-up"
                )}></i>
              </div>
            </div>
          </div>
          
          {!isCollapsed && (
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50 w-12">序号</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50 w-24">题型</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50 min-w-[200px]">题目内容</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50 min-w-[150px]">参考答案</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-700 bg-gray-50 w-20">对话</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-700 bg-gray-50 w-16">音频</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-700 bg-gray-50 w-16">用时</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-700 bg-gray-50 w-20">流畅度</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-700 bg-gray-50 w-20">正确性</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-700 bg-gray-50 w-20">流畅度</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold text-gray-700 bg-gray-50 w-20">操作</th>
                  </tr>
                </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {questionTableData.map((question) => (
                  <tr key={question.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 text-sm font-medium text-gray-900">
                      {question.sequence}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {question.type}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      <div className="max-w-[200px] truncate" title={question.content}>
                        {question.content}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      <div className="max-w-[150px] truncate" title={question.referenceAnswer}>
                        {question.referenceAnswer}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button 
                        onClick={() => handleViewDialog(question.questionDetail)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        查看
                      </button>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {question.questionDetail.speaking_audio_info ? (
                        <AudioPlayer evaluationId={question.questionDetail.speaking_audio_info.evaluation_id} />
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-sm text-gray-600">
                      {question.duration}s
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button 
                        onClick={() => handleViewDimensions(question.questionDetail)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        查看
                      </button>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        parseFloat(question.correctnessScore) === 1 
                          ? 'bg-green-100 text-green-800' 
                          : parseFloat(question.correctnessScore) === 0
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {parseFloat(question.correctnessScore)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        parseFloat(question.fluencyScore) >= 8 
                          ? 'bg-green-100 text-green-800' 
                          : parseFloat(question.fluencyScore) >= 5
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {parseFloat(question.fluencyScore)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button 
                        onClick={() => handleQuestionReevaluate(question.questionDetail)}
                        disabled={reevaluatingQuestions.has(question.questionDetail.question_id)}
                        className={cn(
                          "p-1 rounded text-sm transition-colors",
                          reevaluatingQuestions.has(question.questionDetail.question_id)
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-green-600 hover:text-green-800 hover:bg-green-50"
                        )}
                        title="重新评估"
                      >
                        {reevaluatingQuestions.has(question.questionDetail.question_id) ? (
                          <i className="fa-solid fa-spinner fa-spin"></i>
                        ) : (
                          <i className="fa-solid fa-refresh"></i>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

      {/* 对话结果弹窗 */}
      {showDialogModal && selectedQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* 弹窗头部 */}
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
              <h2 className="text-xl font-semibold text-blue-800">对话详情</h2>
              <button
                onClick={() => setShowDialogModal(false)}
                className="text-blue-600 hover:text-blue-800 transition-colors hover:bg-blue-100 rounded-full p-2"
                title="关闭"
              >
                <i className="fa-solid fa-times text-xl"></i>
              </button>
            </div>
            
            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-4">
                {/* 题目和参考答案区域 */}
                <div className="bg-blue-50 rounded-xl p-4 relative">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-blue-700 font-medium">题目：{selectedQuestion.question_content}</span>
                    </div>
                    
                    <div>
                      <div className="text-gray-700 font-medium mb-2">参考答案：{selectedQuestion.correct_answer}</div>
                    </div>
                  </div>
                  
                  {/* 播放按钮在右上角 */}
                  {selectedQuestion.speaking_audio_info && (
                    <div className="absolute top-4 right-4">
                      <AudioPlayer evaluationId={selectedQuestion.speaking_audio_info.evaluation_id} />
                    </div>
                  )}
                </div>

                {/* 对话内容 */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  {/* 聊天式对话界面 */}
                  {selectedQuestion.user_ai_interaction && selectedQuestion.user_ai_interaction.rounds && (
                    <div className="space-y-4">
                      {selectedQuestion.user_ai_interaction.rounds.map((round, index) => (
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
                          
                          {/* 用户回答 - 右侧绿色气泡 */}
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
                          
                          {/* AI反馈 - 左侧蓝色气泡 */}
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
                            对话结束，最终回答: <span className="font-medium text-gray-800 ml-1">{selectedQuestion.user_answer_text}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 维度详情弹窗 */}
      {showDimensionsModal && selectedQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 sticky top-0 bg-white z-20 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">评估维度详细分析</h3>
                <button
                  onClick={() => setShowDimensionsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors hover:bg-gray-100 rounded-full p-3"
                  title="关闭"
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
                                {(() => {
                                  // 计算连续编号
                                  let totalIndex = 1;
                                  for (let i = 0; i < groupIndex; i++) {
                                    totalIndex += dimensionGroups[i].realData.length;
                                  }
                                  return totalIndex + itemIndex;
                                })()}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 mb-1">{item.name}</div>
                                <div className="text-gray-500 text-sm">{item.reason}</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-3">
                              <span className={cn(
                                "px-3 py-1 rounded text-sm font-bold text-white",
                                item.result === '是' ? 'bg-green-500' : 'bg-red-500'
                              )}>
                                {item.result}
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

      {/* 重评估进度组件 */}
      <ReevaluationProgress
        ref={progressRef}
        isVisible={showProgress}
        onClose={() => {
          setShowProgress(false);
          if (progressRef.current) {
            progressRef.current.reset();
          }
        }}
        title="单题重新评估进度"
        taskType="question"
      />
    </div>
  );
}
