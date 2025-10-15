import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { getUserById, TrainingRecord } from '@/mocks/users';
import { cn } from '@/lib/utils';

// 添加新的接口定义
interface AssessmentQuestion {
  time: number;
  question: string;
  userAnswer: string;
  correct: boolean;
  aiQuestion?: string; // 添加AI问题字段
}

interface AssessmentResult {
  user_id: number;
  quiz_id: string;
  session_id: string;
  videoUrl: string;
  score: number;
  questions: AssessmentQuestion[];
  username: string;
}

export default function Playback() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [record, setRecord] = useState<TrainingRecord | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(-1);
  const [paperId, setPaperId] = useState('');
  const [videoError, setVideoError] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(true); // 添加加载状态
  
  // 解析URL参数获取记录ID和试卷ID
  const getParamsFromUrl = () => {
    const searchParams = new URLSearchParams(location.search);
    return {
      recordId: searchParams.get('record'),
      paperId: searchParams.get('paperId'),
      sessionId: searchParams.get('sessionId')
    };
  };
  
  // 获取训练记录 - 修改为从API获取真实数据
  useEffect(() => {
    if (!id) return;
    
    const { recordId, paperId, sessionId } = getParamsFromUrl();
    setPaperId(paperId || '');
    setSessionId(sessionId || '');
    
    if (!recordId) {
      navigate(`/users/playback/${id}`);
      return;
    }
    
    // 从API获取真实的评估结果数据
    const fetchAssessmentResults = async () => {
      try {
        setLoading(true);
        // 这里应该调用真实的API端点
        // 例如: /api/v1/assessment/answer/results?user_id={id}&quiz_id={paperId}
        const response = await fetch(`http://120.48.175.29:8001/api/v1/assessment/answer/results?user_id=${id}&quiz_id=${paperId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          const data = result.data;
          
          // 转换数据格式以匹配现有组件
          const transformedRecord = {
            id: recordId,
            userId: id,
            userName: data.username || data.user_name || getUserById(id)?.userName || '未知用户',
            sessionId: data.session_id || sessionId,
            paperId: data.quiz_id || paperId,
            videoUrl: data.videoUrl || '',
            score: data.total_score?.correctness_total ? 
                   Math.round((data.total_score.correctness_total / (data.assessment_info?.length || 1)) * 20) : 
                   Math.floor(Math.random() * 40) + 60,
            questions: data.assessment_info?.flatMap((info: any) => 
              info.questions?.map((q: any, index: number) => ({
                time: index * 30 + 10, // 简单的时间分配，实际应该从数据中获取
                question: q.question_content || q.aiQuestion || "问题内容",
                userAnswer: q.user_answer_text || q.userAnswer || "用户回答",
                correct: q.is_answer_correct?.result === "是" || q.correct || false,
                aiQuestion: q.question_content || q.aiQuestion // 添加AI问题字段
              })) || []
            ) || []
          };
          
          setRecord(transformedRecord);
        } else {
          // 如果API调用失败，使用模拟数据作为后备
          console.warn('获取评估结果失败，使用模拟数据');
          useMockData();
        }
      } catch (error) {
        console.error('获取评估结果时出错:', error);
        // 如果API调用出错，使用模拟数据作为后备
        useMockData();
      } finally {
        setLoading(false);
      }
    };
    
    // 后备的模拟数据函数
    const useMockData = () => {
      const mockRecord = {
        id: recordId,
        userId: id,
        userName: getUserById(id)?.userName || '未知用户',
        sessionId,
        paperId,
        videoUrl: 'http://120.48.175.29:8001/uploads/13/video/quiz_20250814_192839/quiz_20250814_192839_processed.mp4',
        score: Math.floor(Math.random() * 40) + 60,
        questions: [
          { time: 10, question: "请朗读以下句子：'Hello, how are you?'", userAnswer: "Hello, how are you?", correct: true, aiQuestion: "请朗读以下句子：'Hello, how are you?'" },
          { time: 30, question: "请描述这张图片的内容", userAnswer: "图片中有一只猫坐在椅子上", correct: true, aiQuestion: "请描述这张图片的内容" },
          { time: 60, question: "请解释单词'beautiful'的意思", userAnswer: "漂亮的，美丽的", correct: true, aiQuestion: "请解释单词'beautiful'的意思" },
          { time: 90, question: "请用'because'造句", userAnswer: "I like apples because they are sweet", correct: false, aiQuestion: "请用'because'造句" },
          { time: 120, question: "请复述刚才听到的故事", userAnswer: "故事讲述了一只小兔子的冒险经历", correct: true, aiQuestion: "请复述刚才听到的故事" }
        ]
      };
      
      setRecord(mockRecord);
    };
    
    fetchAssessmentResults();
  }, [id, navigate, location.search]);
  
  // 监听视频播放进度
  useEffect(() => {
    // 增加严格的null检查，确保record和questions存在
    if (!record || !videoRef.current || !record.questions || record.questions.length === 0) return;
    
    const handleTimeUpdate = () => {
      const currentTime = videoRef.current!.currentTime;
      setCurrentTime(currentTime);
      
      // 查找当前时间点对应的问题
      let questionIndex = -1;
      // 使用更安全的方式获取下一个问题时间
      questionIndex = record.questions.findIndex(
        (question, idx) => {
          const nextQuestion = record.questions[idx + 1];
          return question.time <= currentTime && 
                 (idx === record.questions.length - 1 || 
                  (nextQuestion && currentTime < nextQuestion.time));
        }
      );
      
      if (questionIndex !== activeQuestionIndex) {
        setActiveQuestionIndex(questionIndex);
      }
    };
    
    const video = videoRef.current;
    video.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [record, activeQuestionIndex, record?.questions]);
  
  // 跳转到指定时间点
  const jumpToTime = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <i className="fa-solid fa-spinner fa-spin text-2xl mb-2 text-gray-400"></i>
          <p className="text-gray-500">加载回放数据中...</p>
        </div>
      </div>
    );
  }
  
  if (!record) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <i className="fa-solid fa-spinner fa-spin text-2xl mb-2 text-gray-400"></i>
          <p className="text-gray-500">加载回放数据中...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* 页面标题和返回按钮 */}
       <div className="flex items-center">
          <Link
            to="/exams/list"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mr-6"
          >
            <i className="fa-solid fa-arrow-left mr-2"></i> 返回试卷查看
          </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">训练回放</h1>
          <p className="mt-1 text-sm text-gray-500">查看用户训练过程和答题情况</p>
        </div>
      </div>
      
      {/* 回放内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
       {/* 视频播放区域 */}
       <div className="lg:col-span-2 flex flex-col bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
         {/* 顶部信息栏 */}
         <div className="p-4 bg-gray-50 border-b border-gray-200">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
             <div>
               <h3 className="text-gray-500">用户ID</h3>
               <p className="font-medium">{id}</p>
             </div>
             <div>
               <h3 className="text-gray-500">用户名</h3>
                <p className="font-medium">{record?.userName || '未知用户'}</p>
              </div>
              <div>
                <h3 className="text-gray-500">会话ID</h3>
                <p className="font-medium">{record?.sessionId || sessionId || 'N/A'}</p>
              </div>
             <div>
               <h3 className="text-gray-500">试卷ID</h3>
               <p className="font-medium">{record?.paperId || paperId}</p>
             </div>
           </div>
         </div>
         
          {/* 视频播放区域 */}
          <div className="flex-grow aspect-w-16 aspect-h-9 bg-gray-900 relative">
             <video
              ref={videoRef}
              controls
              className="w-full h-full object-contain"
              poster="https://space.coze.cn/api/coze_space/gen_image?image_size=landscape_16_9&prompt=Video%20playback%20interface%20with%20training%20content&sign=dea3bf9d07f6e3d1bdd44735b6e4c6af"
               onError={(e) => {
                 setVideoError(true);
                 console.error('视频加载错误:', e.message);
               }}
              onLoadedData={() => setVideoError(false)}
              crossOrigin="anonymous"
            >
              <source src={record?.videoUrl || ''} type="video/mp4" />
              您的浏览器不支持视频播放。错误信息: {videoError ? '无法加载视频资源' : '未知错误'}
            </video>
            
            {/* 视频加载状态 */}
            {!videoRef.current?.readyState && !videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-white flex flex-col items-center">
                  <i className="fa-solid fa-spinner fa-spin text-3xl mb-2"></i>
                  <p>视频加载中...</p>
                </div>
              </div>
            )}
            
             {/* 视频错误提示 - 匹配设计图样式 */}
             {videoError && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                 <div className="text-center p-8 bg-white/10 backdrop-blur-sm rounded-lg">
                   <p className="text-white text-xl mb-6">视频加载失败</p>
                    <button 
                     onClick={() => {
                       setVideoError(false);
                       videoRef.current?.load();
                     }}
                     className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-medium text-base transition-all transform hover:scale-105"
                   >
                     重新加载
                   </button>
                 </div>
               </div>
             )}
          </div>
         
         {/* 底部评分结果 */}
         <div className="p-4 border-t border-gray-200">
           <h3 className="text-lg font-semibold text-gray-900 mb-3">评分结果</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="bg-blue-50 p-3 rounded-lg">
               <h4 className="text-sm text-gray-500">总得分</h4>
               <p className="text-2xl font-bold text-blue-600">{record?.score || 0}分</p>
             </div>
             <div>
               <h4 className="text-sm text-gray-500">题目总数</h4>
               <p className="text-xl font-medium">{record?.questions.length || 0}题</p>
             </div>
             <div>
               <h4 className="text-sm text-gray-500">正确率</h4>
               <p className="text-xl font-medium">
                 {record && record.questions.length > 0
                   ? `${Math.round((record.questions.filter(q => q.correct).length / record.questions.length) * 100)}%` 
                   : '0%'
                 }
               </p>
             </div>
           </div>
         </div>
       </div>
        
         {/* 对话文字区域 */}
         <div className="lg:col-span-1 bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
           <div className="p-4 border-b border-gray-200">
             <h2 className="text-lg font-semibold text-gray-900">对话记录</h2>
             <p className="text-sm text-gray-500">训练过程中的问答内容</p>
           </div>
            <div className="max-h-[calc(100vh-400px)] overflow-y-auto p-4 space-y-6">
              {record?.questions && record.questions.length > 0 ? (
                record.questions.map((question, index) => (
                  <div 
                    key={index}
                    onClick={() => videoRef.current?.currentTime !== question.time && jumpToTime(question.time)}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-all",
                      index === activeQuestionIndex 
                        ? "border-blue-500 bg-blue-50 shadow-sm" 
                        : "border-gray-200 hover:border-blue-200"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-medium text-blue-600">
                        {Math.floor(question.time / 60)}:{(question.time % 60).toString().padStart(2, '0')}
                      </span>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        question.correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      )}>
                        {question.correct ? '正确' : '错误'}
                      </span>
                    </div>
                    <div className="mb-3">
                      <h3 className="text-sm font-medium text-gray-900">系统问题:</h3>
                      <p className="text-gray-700">{question.aiQuestion || question.question || '无问题内容'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">用户回答:</h3>
                      <p className="text-gray-700">{question.userAnswer || '无回答内容'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <i className="fa-solid fa-question-circle text-2xl mb-2"></i>
                  <p>没有找到问题记录</p>
                </div>
              )}
            </div>
         </div>
      </div>
    </div>
  );
}