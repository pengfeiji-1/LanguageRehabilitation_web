import { useState } from 'react';
import { FluencyAnalysis } from '@/types/wab';
import { cn } from '@/lib/utils';
import AudioPlayer from './AudioPlayer';

interface FluencyAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionContent: string;
  fluencyScore: number;
  fluencyAnalysis: FluencyAnalysis;
  audioUrl?: string;
  onSaveAnnotation: (itemId: string, annotation: string) => void;
  onReevaluate?: () => void;
}

export default function FluencyAnalysisModal({
  isOpen,
  onClose,
  questionContent,
  fluencyScore,
  fluencyAnalysis,
  audioUrl,
  onSaveAnnotation,
  onReevaluate
}: FluencyAnalysisModalProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    smooth: true,
    rich: false
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  if (!isOpen) return null;

  const renderFluencyItem = (item: any, categoryKey: string) => (
    <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
            {item.id}
          </span>
          <span className="font-medium text-gray-900">{item.name}</span>
        </div>
        
        {item.description && (
          <span className="text-sm text-gray-600">
            原因：{item.description}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* 评分标记 */}
        <div className="flex gap-1">
          <span className={cn(
            "w-6 h-6 rounded flex items-center justify-center text-xs font-medium",
            item.score ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          )}>
            是
          </span>
          <span className={cn(
            "w-6 h-6 rounded flex items-center justify-center text-xs font-medium",
            !item.score ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"
          )}>
            否
          </span>
        </div>

      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-20 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">流畅度详细分析</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors hover:bg-gray-100 rounded-full p-2"
            title="关闭"
          >
            <i className="fa-solid fa-times text-xl"></i>
          </button>
        </div>

        {/* 内容 */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* 题目和得分 */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <h4 className="font-medium text-gray-900">题目：{questionContent}</h4>
                <AudioPlayer audioUrl={audioUrl} />
              </div>
              <div className="text-blue-600 font-semibold">
                流畅度得分：{fluencyScore}
              </div>
            </div>
          </div>

          {/* 分析详情 */}
          <div className="p-6 space-y-6">
            {/* 对话顺畅 */}
            <div>
              <button
                onClick={() => toggleCategory('smooth')}
                className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    对话顺畅（{fluencyAnalysis.categories.smooth?.length || 0}项）
                  </span>
                </div>
                <i className={cn(
                  "fa-solid transition-transform",
                  expandedCategories.smooth ? 'fa-chevron-up rotate-180' : 'fa-chevron-down'
                )}></i>
              </button>

              {expandedCategories.smooth && (
                <div className="mt-3 space-y-2">
                  {fluencyAnalysis.categories.smooth?.map(item => 
                    renderFluencyItem(item, 'smooth')
                  )}
                </div>
              )}
            </div>

            {/* 表达丰富 */}
            <div>
              <button
                onClick={() => toggleCategory('rich')}
                className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    表达丰富（{fluencyAnalysis.categories.rich?.length || 0}项）
                  </span>
                </div>
                <i className={cn(
                  "fa-solid transition-transform",
                  expandedCategories.rich ? 'fa-chevron-up rotate-180' : 'fa-chevron-down'
                )}></i>
              </button>

              {expandedCategories.rich && (
                <div className="mt-3 space-y-2">
                  {fluencyAnalysis.categories.rich?.map(item => 
                    renderFluencyItem(item, 'rich')
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <div>
            {onReevaluate && (
              <button
                onClick={onReevaluate}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center gap-2"
              >
                <i className="fa-solid fa-refresh"></i>
                重新评估
              </button>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
