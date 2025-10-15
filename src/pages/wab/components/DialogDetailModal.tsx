import { DialogMessage } from '@/types/wab';
import { cn } from '@/lib/utils';

interface DialogDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionContent: string;
  dialogMessages: DialogMessage[];
}

export default function DialogDetailModal({ 
  isOpen, 
  onClose, 
  questionContent,
  dialogMessages 
}: DialogDetailModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">对话详情</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="fa-solid fa-times text-xl"></i>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          {/* 题目 */}
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <i className="fa-solid fa-question-circle text-blue-600 mr-2"></i>
                <span className="font-medium text-blue-900">题目：</span>
              </div>
              <p className="text-gray-800">{questionContent}</p>
            </div>
          </div>

          {/* 对话记录 */}
          <div className="space-y-4">
            <div className="flex items-center mb-3">
              <i className="fa-solid fa-comments text-gray-600 mr-2"></i>
              <span className="font-medium text-gray-700">第 1 轮</span>
              <span className="ml-2 text-sm text-gray-500">类型：提示</span>
            </div>

            {dialogMessages.map((message, index) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.type === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <i className="fa-solid fa-robot text-white text-sm"></i>
                    </div>
                  </div>
                )}

                <div
                  className={cn(
                    "max-w-[70%] rounded-lg px-4 py-2",
                    message.type === 'user'
                      ? 'bg-gray-500 text-white'
                      : 'bg-blue-500 text-white'
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                  <div className="text-xs mt-1 opacity-75">
                    时间：{message.timestamp}
                  </div>
                </div>

                {message.type === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                      <i className="fa-solid fa-user text-white text-sm"></i>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* 我叫铃铛按钮示例 */}
            {dialogMessages.length > 0 && (
              <div className="flex justify-end">
                <div className="bg-gray-100 rounded-lg px-3 py-2 max-w-[70%]">
                  <button className="bg-gray-500 text-white px-3 py-1 rounded text-sm">
                    <i className="fa-solid fa-microphone mr-1"></i>
                    我叫铃铛
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
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
