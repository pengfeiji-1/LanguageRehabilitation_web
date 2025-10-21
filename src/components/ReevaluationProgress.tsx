/**
 * 重新评估进度跟踪组件
 * 显示评估任务的实时进度和状态
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { TaskStatus } from '@/lib/reevaluation';

interface ReevaluationProgressProps {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  taskType?: 'question' | 'quiz';
}

export interface ReevaluationProgressRef {
  addTask: (taskId: string, status: TaskStatus, questionId?: string) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  reset: () => void;
}

interface TaskProgressInfo {
  taskId: string;
  status: TaskStatus;
  questionId?: string;
}

const ReevaluationProgress = React.forwardRef<ReevaluationProgressRef, ReevaluationProgressProps>(({
  isVisible,
  onClose,
  title = '重新评估进度',
  taskType = 'question'
}, ref) => {
  const [tasks, setTasks] = useState<TaskProgressInfo[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 添加任务
  const addTask = (taskId: string, status: TaskStatus, questionId?: string) => {
    setTasks(prev => {
      const existing = prev.find(task => task.taskId === taskId);
      if (existing) {
        return prev.map(task =>
          task.taskId === taskId
            ? { ...task, status, questionId }
            : task
        );
      } else {
        return [...prev, { taskId, status, questionId }];
      }
    });
  };

  // 更新任务状态
  const updateTaskStatus = (taskId: string, status: TaskStatus) => {
    setTasks(prev =>
      prev.map(task =>
        task.taskId === taskId
          ? { ...task, status }
          : task
      )
    );
  };

  // 计算整体进度
  useEffect(() => {
    if (tasks.length === 0) {
      setOverallProgress(0);
      return;
    }

    const totalProgress = tasks.reduce((sum, task) => {
      const progress = task.status.progress || 0;
      // 根据状态计算进度
      let actualProgress = progress;
      if (task.status.status === 'completed') {
        actualProgress = 100;
      } else if (task.status.status === 'running' && progress === 0) {
        actualProgress = 20; // 运行中但没有具体进度，给个估算值
      } else if (task.status.status === 'pending' && progress === 0) {
        actualProgress = 0;
      }
      return sum + actualProgress;
    }, 0);
    const avgProgress = Math.round(totalProgress / tasks.length);
    setOverallProgress(avgProgress);

    // 检查是否全部完成
    const allCompleted = tasks.every(task => 
      task.status.status === 'completed' || task.status.status === 'failed'
    );
    setIsCompleted(allCompleted);
  }, [tasks]);


  // 初始化控制
  useEffect(() => {
    // 延迟设置初始化状态，防止页面刷新时闪烁
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // 跟踪组件可见性状态
  useEffect(() => {
    if (isVisible && !hasBeenVisible) {
      setHasBeenVisible(true);
    } else if (!isVisible && hasBeenVisible && isCompleted) {
      // 只有在完成状态下隐藏时才重置状态，避免闪烁
      setTimeout(() => {
        setHasBeenVisible(false);
        setTasks([]);
        setOverallProgress(0);
        setIsCompleted(false);
      }, 300); // 延迟重置，确保动画完成
    }
  }, [isVisible, hasBeenVisible, isCompleted]);

  // 重置状态
  const reset = () => {
    setTasks([]);
    setOverallProgress(0);
    setIsCompleted(false);
    setHasBeenVisible(false);
    setIsInitialized(true); // 保持初始化状态
  };

  // 暴露方法给父组件使用
  React.useImperativeHandle(ref, () => ({
    addTask,
    updateTaskStatus,
    reset
  }), []);

  // 防止页面刷新时短暂闪烁：只有在初始化完成且需要显示时才渲染
  if (!isVisible || !isInitialized) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <i className="fa-solid fa-chart-line text-blue-600 mr-2"></i>
            {title}
          </h3>
          {isCompleted && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="关闭"
            >
              <i className="fa-solid fa-times text-gray-500"></i>
            </button>
          )}
        </div>

        {/* 整体进度 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">整体进度</span>
            <span className="text-sm font-medium text-gray-900">{overallProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={cn(
                "h-3 rounded-full transition-all duration-300 ease-out",
                isCompleted 
                  ? "bg-green-500" 
                  : overallProgress > 0 
                    ? "bg-blue-500" 
                    : "bg-gray-300"
              )}
              style={{ width: `${overallProgress}%` }}
            >
              {overallProgress > 0 && (
                <div className="h-full bg-gradient-to-r from-transparent to-white opacity-30 rounded-full animate-pulse"></div>
              )}
            </div>
          </div>
        </div>

        {/* 状态信息 */}
        <div className="text-center py-8">
          {tasks.length === 0 ? (
            <div className="text-gray-500">
              <i className="fa-solid fa-hourglass-start text-4xl mb-4 text-blue-500"></i>
              <p className="text-lg font-medium">正在启动评估任务...</p>
              <p className="text-sm text-gray-400 mt-2">请稍候，系统正在初始化重评估流程</p>
            </div>
          ) : (
            <div className="text-gray-700">
              <i className={cn(
                "text-4xl mb-4",
                isCompleted 
                  ? "fa-solid fa-check-circle text-green-500"
                  : overallProgress > 0
                    ? "fa-solid fa-cog fa-spin text-blue-500"
                    : "fa-solid fa-hourglass-start text-gray-400"
              )}></i>
              <p className="text-lg font-medium mb-2">
                {isCompleted 
                  ? `评估完成 (${tasks.length}/${tasks.length} 题目)`
                  : `正在评估 (${tasks.filter(t => t.status.status === 'completed').length}/${tasks.length} 题目)`}
              </p>
              <p className="text-sm text-gray-500">
                {isCompleted 
                  ? '所有题目已重新评估完成' 
                  : `当前进度: ${overallProgress}%`}
              </p>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        {isCompleted && (
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => {
                reset();
                onClose();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <i className="fa-solid fa-check mr-2"></i>
              完成
            </button>
          </div>
        )}

        {/* 加载动画 */}
        {!isCompleted && tasks.length > 0 && (
          <div className="mt-6 flex items-center justify-center text-sm text-gray-600">
            <i className="fa-solid fa-spinner fa-spin mr-2"></i>
            评估进行中，请稍候...
          </div>
        )}
      </div>
    </div>
  );
});

ReevaluationProgress.displayName = 'ReevaluationProgress';

export default ReevaluationProgress;

// Hook 版本，方便使用
export const useReevaluationProgress = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [progressRef, setProgressRef] = useState<{
    addTask: (taskId: string, status: TaskStatus, questionId?: string) => void;
    updateTaskStatus: (taskId: string, status: TaskStatus) => void;
    reset: () => void;
  } | null>(null);

  const show = (title?: string, taskType?: 'question' | 'quiz') => {
    setIsVisible(true);
  };

  const hide = () => {
    setIsVisible(false);
  };

  const addTask = (taskId: string, status: TaskStatus, questionId?: string) => {
    progressRef?.addTask(taskId, status, questionId);
  };

  const updateTaskStatus = (taskId: string, status: TaskStatus) => {
    progressRef?.updateTaskStatus(taskId, status);
  };

  const reset = () => {
    progressRef?.reset();
  };

  const ProgressComponent = ({ title, taskType }: { title?: string; taskType?: 'question' | 'quiz' }) => (
    <ReevaluationProgress
      isVisible={isVisible}
      onClose={hide}
      title={title}
      taskType={taskType}
      ref={(ref: any) => setProgressRef(ref)}
    />
  );

  return {
    isVisible,
    show,
    hide,
    addTask,
    updateTaskStatus,
    reset,
    ProgressComponent
  };
};
