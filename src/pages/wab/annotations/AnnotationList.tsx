import { useState, useEffect } from 'react';
import { adminAPI } from '@/lib/api';
import { showError } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { 
  AnnotationItem, 
  AnnotationListParams,
  AnnotationListResponse 
} from '@/types/wab';
import AnnotationModal from './AnnotationModal';

// 常量配置
const ITEMS_PER_PAGE = 20;
const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'PENDING', label: '待标注' },
  { value: 'MY_ANNOTATED', label: '我已标注' },
  { value: 'OTHERS_ANNOTATED', label: '他人已标注' },
] as const;

export default function AnnotationList() {
  // 状态管理
  const [items, setItems] = useState<AnnotationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 分页状态
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    pages: 0,
  });
  
  // 全局统计状态
  const [globalStats, setGlobalStats] = useState({
    pending: 0,
    my_annotated: 0,
    others_annotated: 0,
    total_evaluations: 0,
    loading: true,
  });
  
  // 筛选状态
  const [filters, setFilters] = useState<AnnotationListParams>({
    page: 1,
    page_size: ITEMS_PER_PAGE,
  });

  // 弹窗状态
  const [showModal, setShowModal] = useState(false);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<number | null>(null);

  // 已移除fetchGlobalStats函数，统计数据统一由fetchAnnotations中的statistics字段提供

  // 获取标注列表数据
  const fetchAnnotations = async (params: AnnotationListParams = filters) => {
    setLoading(true);
    setError(null);
    
    try {
      const response: AnnotationListResponse = await adminAPI.getAnnotationList(params);
      
      if (response.success) {
        console.log('📊 获取标注列表成功:', {
          total: response.data.total,
          statistics: response.data.statistics,
          page: response.data.page
        });
        
        setItems(response.data.items);
        setPagination({
          page: response.data.page,
          total: response.data.total,
          pages: response.data.pages,
        });
        
        // 更新全局统计数据
        if (response.data.statistics) {
          const stats = {
            pending: response.data.statistics.pending || 0,
            my_annotated: response.data.statistics.my_annotated || 0,
            others_annotated: response.data.statistics.others_annotated || 0,
            total_evaluations: response.data.statistics.total_evaluations || 0,
            loading: false,
          };
          console.log('📈 更新统计数据:', stats);
          setGlobalStats(stats);
        } else {
          // 如果没有统计数据，设置为合理的默认值
          const fallbackStats = {
            pending: 0,
            my_annotated: 0,
            others_annotated: 0,
            total_evaluations: response.data.total || 0, // 使用总数作为备选
            loading: false,
          };
          console.log('⚠️ 无统计数据，使用默认值:', fallbackStats);
          setGlobalStats(fallbackStats);
        }
      } else {
        throw new Error('获取标注列表失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '网络错误';
      setError(errorMessage);
      console.error('获取标注列表失败:', error);
      
      // 认证错误已在apiRequest中处理，这里不需要重复处理
      if (errorMessage.includes('认证失败')) {
        // apiRequest已经处理了退出登录，这里只需要静默处理
        return;
      } else {
        showError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // 初始化数据
  useEffect(() => {
    fetchAnnotations();
    // 移除fetchGlobalStats()调用，统计数据由fetchAnnotations()中的statistics字段提供
  }, []);

  // 处理筛选变更
  const handleFilterChange = (key: keyof AnnotationListParams, value: string | number) => {
    const processedValue = key === 'page' || key === 'page_size' 
      ? Number(value) 
      : value === '' ? undefined : String(value);
      
    const newFilters: AnnotationListParams = {
      ...filters,
      [key]: processedValue,
      page: key === 'page' ? Number(value) : 1, // 非分页筛选时重置到第一页
    };
    
    setFilters(newFilters);
    fetchAnnotations(newFilters);
  };

  // 处理分页
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.pages) {
      handleFilterChange('page', page);
    }
  };

  // 格式化时间显示
  const formatTime = (timeStr: string) => {
    try {
      return new Date(timeStr).toLocaleString('zh-CN');
    } catch {
      return timeStr;
    }
  };

  // 获取状态标签样式
  const getStatusBadgeClass = (status: string) => {
    const baseClass = "px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case 'PENDING':
        return `${baseClass} bg-orange-100 text-orange-700`;
      case 'MY_ANNOTATED':
        return `${baseClass} bg-green-100 text-green-700`;
      case 'OTHERS_ANNOTATED':
        return `${baseClass} bg-gray-100 text-gray-700`;
      default:
        return `${baseClass} bg-gray-100 text-gray-700`;
    }
  };

  // 获取状态显示文本
  const getStatusText = (status: string) => {
    const statusMap = {
      'PENDING': '待标注',
      'MY_ANNOTATED': '我已标注',
      'OTHERS_ANNOTATED': '他人已标注',
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  // 打开标注弹窗
  const handleOpenAnnotation = (evaluationId: number) => {
    setSelectedEvaluationId(evaluationId);
    setShowModal(true);
  };

  // 关闭弹窗并刷新数据
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedEvaluationId(null);
  };

  // 标注更新后的回调
  const handleAnnotationUpdate = () => {
    // 刷新列表数据（包含统计数据）
    fetchAnnotations();
    // 移除fetchGlobalStats()调用，统计数据由fetchAnnotations()提供
  };


  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-gray-400 mb-2"></i>
          <p className="text-gray-500">加载标注列表中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-2">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                <i className="fa-solid fa-clock text-orange-600 text-base"></i>
              </div>
            </div>
            <div className="ml-2">
              <p className="text-base font-medium text-gray-500">待标注</p>
              <p className="text-2xl font-semibold text-gray-900">
                {globalStats.loading ? (
                  <i className="fa-solid fa-spinner fa-spin text-base text-gray-400"></i>
                ) : (
                  globalStats.pending
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                <i className="fa-solid fa-check text-green-600 text-base"></i>
              </div>
            </div>
            <div className="ml-2">
              <p className="text-base font-medium text-gray-500">我已标注</p>
              <p className="text-2xl font-semibold text-gray-900">
                {globalStats.loading ? (
                  <i className="fa-solid fa-spinner fa-spin text-base text-gray-400"></i>
                ) : (
                  globalStats.my_annotated
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                <i className="fa-solid fa-users text-gray-600 text-base"></i>
              </div>
            </div>
            <div className="ml-2">
              <p className="text-base font-medium text-gray-500">他人已标注</p>
              <p className="text-2xl font-semibold text-gray-900">
                {globalStats.loading ? (
                  <i className="fa-solid fa-spinner fa-spin text-base text-gray-400"></i>
                ) : (
                  globalStats.others_annotated
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                <i className="fa-solid fa-chart-bar text-purple-600 text-base"></i>
              </div>
            </div>
            <div className="ml-2">
              <p className="text-base font-medium text-gray-500">总评估数</p>
              <p className="text-2xl font-semibold text-gray-900">
                {globalStats.loading ? (
                  <i className="fa-solid fa-spinner fa-spin text-base text-gray-400"></i>
                ) : (
                  globalStats.total_evaluations
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-lg border border-gray-200 px-3 py-2">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          {/* 状态筛选 */}
          <div className="relative min-w-[120px]">
            <select
              value={filters.status_filter || ''}
              onChange={(e) => handleFilterChange('status_filter', e.target.value)}
              className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white appearance-none"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <i className="fa-solid fa-chevron-down text-gray-400 text-sm"></i>
            </div>
          </div>

          {/* 试卷ID */}
          <div className="flex-1 max-w-[200px]">
            <input
              type="text"
              placeholder="输入试卷ID"
              value={filters.quiz_id || ''}
              onChange={(e) => handleFilterChange('quiz_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* 用户ID */}
          <div className="flex-1 max-w-[200px]">
            <input
              type="text"
              placeholder="输入用户ID"
              value={filters.user_id || ''}
              onChange={(e) => handleFilterChange('user_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => {
                const resetFilters = { page: 1, page_size: ITEMS_PER_PAGE };
                setFilters(resetFilters);
                fetchAnnotations(resetFilters);
              }}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm transition-colors"
              title="重置筛选条件"
            >
              <i className="fa-solid fa-rotate-left"></i>
            </button>
          </div>
        </div>
      </div>

      {/* 标注列表 */}
      <div className="bg-white rounded-t-lg border-t border-l border-r border-gray-200 flex-1 flex flex-col">
        {error ? (
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500 mb-2">{error}</p>
            <button
              onClick={() => fetchAnnotations()}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs transition-colors"
            >
              重试
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="p-4 text-center">
            <span className="text-sm text-gray-500">暂无数据</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50 sticky top-0">
                      评估ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50 sticky top-0">
                      用户信息
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50 sticky top-0">
                      题目信息
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50 sticky top-0">
                      创建时间
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50 sticky top-0">
                      标注状态
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50 sticky top-0">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.evaluation_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        #{item.evaluation_id}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{item.user_name}</div>
                          <div className="text-gray-500 text-xs">ID: {item.user_id}</div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{item.question_id}</div>
                          <div className="text-gray-500 text-xs">试卷: {item.quiz_id}</div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {formatTime(item.created_time)}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className={getStatusBadgeClass(item.annotation_status)}>
                          {getStatusText(item.annotation_status)}
                        </span>
                        {item.others_annotation_count > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {item.others_annotation_count}人已标注
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium">
                        <button
                          onClick={() => handleOpenAnnotation(item.evaluation_id)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          {item.annotation_status === 'PENDING' ? '开始标注' : '查看详情'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </>
        )}
      </div>
      {/* 分页控件 */}
      {!error && !loading && pagination.pages > 1 && (
        <div className="bg-white border-t-0 border-l border-r border-b border-gray-200 rounded-b-lg -mt-2">
          <div className="px-4 py-1 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              共 {pagination.total} 条
            </div>
            <div className="flex space-x-1">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1 || loading}
                className="px-3 py-1 rounded text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                &lt;
              </button>
              
              {(() => {
                const pages = [];
                const totalPages = pagination.pages;
                const current = pagination.page;
                
                if (totalPages <= 7) {
                  // 总页数 <= 7，显示所有页码
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => handlePageChange(i)}
                        disabled={loading}
                        className={cn(
                          "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                          current === i 
                            ? 'text-blue-600 font-semibold' 
                            : 'text-gray-700',
                          loading && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        {i}
                      </button>
                    );
                  }
                } else {
                  // 总页数 > 7，智能显示
                  
                  // 第1页
                  pages.push(
                    <button
                      key={1}
                      onClick={() => handlePageChange(1)}
                      disabled={loading}
                      className={cn(
                        "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                        current === 1 
                          ? 'text-blue-600 font-semibold' 
                          : 'text-gray-700',
                        loading && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      1
                    </button>
                  );
                  
                  if (current <= 4) {
                    // 当前页在前面：1 2 3 4 5 ... 最后页
                    for (let i = 2; i <= Math.min(5, totalPages - 1); i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => handlePageChange(i)}
                          disabled={loading}
                          className={cn(
                            "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                            current === i 
                              ? 'text-blue-600 font-semibold' 
                              : 'text-gray-700',
                            loading && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          {i}
                        </button>
                      );
                    }
                    if (totalPages > 6) {
                      pages.push(<span key="ellipsis1" className="px-2 py-2 text-sm text-gray-400">...</span>);
                    }
                  } else if (current >= totalPages - 3) {
                    // 当前页在后面：1 ... 倒数第4页 倒数第3页 倒数第2页 倒数第1页 最后页
                    if (totalPages > 6) {
                      pages.push(<span key="ellipsis1" className="px-2 py-2 text-sm text-gray-400">...</span>);
                    }
                    for (let i = Math.max(2, totalPages - 4); i <= totalPages - 1; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => handlePageChange(i)}
                          disabled={loading}
                          className={cn(
                            "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                            current === i 
                              ? 'text-blue-600 font-semibold' 
                              : 'text-gray-700',
                            loading && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          {i}
                        </button>
                      );
                    }
                  } else {
                    // 当前页在中间：1 ... 前页 当前页 后页 ... 最后页
                    pages.push(<span key="ellipsis1" className="px-2 py-2 text-sm text-gray-400">...</span>);
                    
                    for (let i = current - 1; i <= current + 1; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => handlePageChange(i)}
                          disabled={loading}
                          className={cn(
                            "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                            current === i 
                              ? 'text-blue-600 font-semibold' 
                              : 'text-gray-700',
                            loading && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          {i}
                        </button>
                      );
                    }
                    
                    pages.push(<span key="ellipsis2" className="px-2 py-2 text-sm text-gray-400">...</span>);
                  }
                  
                  // 最后一页
                  if (totalPages > 1) {
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => handlePageChange(totalPages)}
                        disabled={loading}
                        className={cn(
                          "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                          current === totalPages 
                            ? 'text-blue-600 font-semibold' 
                            : 'text-gray-700',
                          loading && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        {totalPages}
                      </button>
                    );
                  }
                }
                
                return pages;
              })()}
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages || loading}
                className="px-3 py-1 rounded text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                &gt;
              </button>
              
              <button
                onClick={() => fetchAnnotations()}
                disabled={loading}
                className="px-3 py-1 rounded text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={loading ? '加载中...' : '刷新列表'}
              >
                <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-refresh'}`}></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 加载指示器 */}
      {loading && items.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg">
          <i className="fa-solid fa-spinner fa-spin mr-2"></i>
          更新中...
        </div>
      )}

      {/* 标注弹窗 */}
      {selectedEvaluationId && (
        <AnnotationModal
          isOpen={showModal}
          onClose={handleCloseModal}
          evaluationId={selectedEvaluationId}
          onAnnotationUpdate={handleAnnotationUpdate}
        />
      )}

    </div>
  );
}
