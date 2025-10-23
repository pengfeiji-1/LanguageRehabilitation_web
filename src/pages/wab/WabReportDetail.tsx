import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { WabReportDetail as WabReportDetailType, DialogMessage } from '@/types/wab';
import { adminAPI } from '@/lib/api';
import { showError } from '@/lib/toast';
import AudioPlayer from './components/AudioPlayer';
import DialogDetailModal from './components/DialogDetailModal';
import FluencyAnalysisModal from './components/FluencyAnalysisModal';

export default function WabReportDetail() {
  const { id } = useParams<{ id: string }>();
  const [reportDetail, setReportDetail] = useState<WabReportDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDialog, setSelectedDialog] = useState<{
    questionContent: string;
    messages: DialogMessage[];
  } | null>(null);
  const [selectedFluency, setSelectedFluency] = useState<{
    questionContent: string;
    fluencyScore: number;
    fluencyAnalysis: any;
    audioUrl?: string;
  } | null>(null);

  // 获取报告详情数据
  const fetchReportDetail = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const response = await adminAPI.getWabReportDetail(id);
      if (response.success) {
        setReportDetail(response.data);
      } else {
        throw new Error('获取报告详情失败');
      }
    } catch (error) {
      console.error('获取报告详情失败:', error);
      showError(error instanceof Error ? error.message : '获取报告详情失败');
      setReportDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchReportDetail();
    }
  }, [id]);


  const handleOpenDialogDetail = (questionContent: string, messages: DialogMessage[]) => {
    setSelectedDialog({ questionContent, messages });
  };

  const openFluencyModal = (questionContent: string, fluencyScore: number, fluencyAnalysis: any, audioUrl?: string) => {
    setSelectedFluency({ questionContent, fluencyScore, fluencyAnalysis, audioUrl });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-gray-400 mb-2"></i>
          <p className="text-gray-500">加载报告详情中...</p>
        </div>
      </div>
    );
  }

  if (!reportDetail) {
    return (
      <div className="text-center py-12">
        <i className="fa-solid fa-file-excel text-4xl text-gray-300 mb-4"></i>
        <h3 className="text-lg font-medium text-gray-900 mb-2">报告不存在</h3>
        <p className="text-gray-500 mb-4">找不到指定的WAB评估报告</p>
        <Link
          to="/wab/reports"
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
        >
          <i className="fa-solid fa-arrow-left mr-2"></i>
          返回列表
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-2">
      {/* 页面标题和返回按钮 */}
      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">WAB失语评估报告</h1>
        </div>
        <Link
          to="/wab/reports"
          className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <i className="fa-solid fa-arrow-left mr-1"></i> 返回
        </Link>
      </div>

      {/* 评估人信息卡片 */}
      <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
        <div className="bg-blue-600 px-3 py-2">
          <h2 className="text-white text-lg font-semibold">评估信息</h2>
        </div>
        
        <div className="p-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-0.5">评估人</h3>
              <p className="text-base font-semibold text-gray-900">{reportDetail.evaluatorInfo.name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-0.5">年龄</h3>
              <p className="text-base font-semibold text-gray-900">{reportDetail.evaluatorInfo.age}岁</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-0.5">失语类型</h3>
              <p className="text-base font-semibold text-gray-900">{reportDetail.evaluatorInfo.aphasiaType}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-0.5">总评估时长</h3>
              <p className="text-base font-semibold text-gray-900">{reportDetail.evaluatorInfo.totalDuration}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 评估详情 */}
      <div className="flex-1 flex flex-col min-h-0">
      {reportDetail.sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="bg-white rounded-lg overflow-hidden border border-gray-200 flex-1 flex flex-col min-h-0 mb-1">
          {/* 分组标题 */}
          <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold text-gray-900">{section.name}</h3>
              <div className="flex items-center gap-1">
                <span className="bg-green-100 text-green-700 px-4 py-3 rounded text-sm">
                  正确率: 100% ({section.questions.length}/{section.questions.length})
                </span>
                <span className="bg-blue-100 text-blue-700 px-4 py-3 rounded text-sm">
                  流畅度: 10.0分
                </span>
              </div>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <i className="fa-solid fa-chevron-up text-sm"></i>
            </button>
          </div>

          {/* 题目列表 */}
          <div className="overflow-x-auto flex-1 overflow-y-auto min-h-0">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-left text-base font-medium text-gray-500 bg-gray-50">序号</th>
                  <th className="px-4 py-3 text-left text-base font-medium text-gray-500 bg-gray-50">题目类型</th>
                  <th className="px-4 py-3 text-left text-base font-medium text-gray-500 bg-gray-50">题目内容</th>
                  <th className="px-4 py-3 text-left text-base font-medium text-gray-500 bg-gray-50">参考答案</th>
                  <th className="px-4 py-3 text-left text-base font-medium text-gray-500 bg-gray-50">对话结果</th>
                  <th className="px-4 py-3 text-left text-base font-medium text-gray-500 bg-gray-50">音频</th>
                  <th className="px-4 py-3 text-left text-base font-medium text-gray-500 bg-gray-50">用时</th>
                  <th className="px-4 py-3 text-left text-base font-medium text-gray-500 bg-gray-50">流畅度</th>
                  <th className="px-4 py-3 text-left text-base font-medium text-gray-500 bg-gray-50">正确性</th>
                  <th className="px-4 py-3 text-left text-base font-medium text-gray-500 bg-gray-50">流畅度得分</th>
                  <th className="px-4 py-3 text-left text-base font-medium text-gray-500 bg-gray-50">重评估</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {section.questions.map((question) => (
                  <tr key={question.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-base text-gray-900">
                      {question.sequence}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-base text-gray-900">
                      {question.type}
                    </td>
                    <td className="px-4 py-3 text-base text-gray-900 max-w-xs">
                      <div className="truncate" title={question.content}>
                        {question.content}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-base text-gray-600 max-w-xs">
                      <div className="truncate" title={question.referenceAnswer}>
                        {question.referenceAnswer}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenDialogDetail(question.content, question.dialogDetails || [])}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        查看详情
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <AudioPlayer audioUrl={question.audioUrl} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-base text-gray-900">
                      {formatDuration(question.duration)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <button
                          onClick={() => openFluencyModal(
                            question.content, 
                            question.fluencyScore, 
                            question.fluencyAnalysis,
                            question.audioUrl
                          )}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium block"
                        >
                          查看详情
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <span className="text-base font-medium text-gray-900">
                          {question.correctnessScore}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-base font-medium text-gray-900">
                      {question.fluencyScore}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => console.log('重新评估', question.id)}
                        className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                      >
                        重评估
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* 对话详情弹窗 */}
      <DialogDetailModal
        isOpen={!!selectedDialog}
        onClose={() => setSelectedDialog(null)}
        questionContent={selectedDialog?.questionContent || ''}
        dialogMessages={selectedDialog?.messages || []}
      />

      {/* 流畅度分析弹窗 */}
      <FluencyAnalysisModal
        isOpen={!!selectedFluency}
        onClose={() => setSelectedFluency(null)}
        questionContent={selectedFluency?.questionContent || ''}
        fluencyScore={selectedFluency?.fluencyScore || 0}
        fluencyAnalysis={selectedFluency?.fluencyAnalysis || { totalScore: 0, categories: { smooth: [], rich: [] } }}
        audioUrl={selectedFluency?.audioUrl}
        onSaveAnnotation={(itemId, annotation) => {
          // 保存流畅度项目标注
          console.log('保存流畅度项目标注:', itemId, annotation);
        }}
        onReevaluate={() => {
          console.log('重新评估流畅度');
          setSelectedFluency(null);
        }}
      />
      </div>
    </div>
  );
}
