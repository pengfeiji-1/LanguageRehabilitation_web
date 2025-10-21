import { useState, useEffect } from 'react';
import { adminAPI } from '@/lib/api';
import { showError } from '@/lib/toast';
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
    const baseClass = "px-2 py-1 rounded-full text-xs font-medium";
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
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">评估标注</h1>
        <p className="mt-1 text-sm text-gray-500">管理和标注失语症评估结果</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-clock text-orange-600"></i>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">待标注</p>
              <p className="text-2xl font-semibold text-gray-900">
                {globalStats.loading ? (
                  <i className="fa-solid fa-spinner fa-spin text-lg text-gray-400"></i>
                ) : (
                  globalStats.pending
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-check text-green-600"></i>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">我已标注</p>
              <p className="text-2xl font-semibold text-gray-900">
                {globalStats.loading ? (
                  <i className="fa-solid fa-spinner fa-spin text-lg text-gray-400"></i>
                ) : (
                  globalStats.my_annotated
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-users text-gray-600"></i>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">他人已标注</p>
              <p className="text-2xl font-semibold text-gray-900">
                {globalStats.loading ? (
                  <i className="fa-solid fa-spinner fa-spin text-lg text-gray-400"></i>
                ) : (
                  globalStats.others_annotated
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-chart-bar text-purple-600"></i>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">总评估数</p>
              <p className="text-2xl font-semibold text-gray-900">
                {globalStats.loading ? (
                  <i className="fa-solid fa-spinner fa-spin text-lg text-gray-400"></i>
                ) : (
                  globalStats.total_evaluations
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              状态筛选
            </label>
            <select
              value={filters.status_filter || ''}
              onChange={(e) => handleFilterChange('status_filter', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              试卷ID
            </label>
            <input
              type="text"
              placeholder="输入试卷ID"
              value={filters.quiz_id || ''}
              onChange={(e) => handleFilterChange('quiz_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              用户ID
            </label>
            <input
              type="text"
              placeholder="输入用户ID"
              value={filters.user_id || ''}
              onChange={(e) => handleFilterChange('user_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                const resetFilters = { page: 1, page_size: ITEMS_PER_PAGE };
                setFilters(resetFilters);
                fetchAnnotations(resetFilters);
              }}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors"
            >
              重置筛选
            </button>
          </div>
        </div>
      </div>

      {/* 标注列表 */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {error ? (
          <div className="p-8 text-center">
            <i className="fa-solid fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={() => fetchAnnotations()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
            >
              重试
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <i className="fa-solid fa-inbox text-4xl text-gray-300 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无标注记录</h3>
            <p className="text-gray-500">当前筛选条件下没有找到标注记录</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      评估ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      用户信息
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      题目信息
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      创建时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      标注状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.evaluation_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{item.evaluation_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{item.user_name}</div>
                          <div className="text-gray-500 text-xs">ID: {item.user_id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{item.question_id}</div>
                          <div className="text-gray-500 text-xs">试卷: {item.quiz_id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTime(item.created_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadgeClass(item.annotation_status)}>
                          {getStatusText(item.annotation_status)}
                        </span>
                        {item.others_annotation_count > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {item.others_annotation_count}人已标注
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleOpenAnnotation(item.evaluation_id)}
                          className="text-blue-600 hover:text-blue-900 transition-colors font-medium"
                        >
                          {item.annotation_status === 'PENDING' ? '开始标注' : '查看详情'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页组件 */}
            {pagination.pages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      显示第 <span className="font-medium">{((pagination.page - 1) * ITEMS_PER_PAGE) + 1}</span> 到{' '}
                      <span className="font-medium">{Math.min(pagination.page * ITEMS_PER_PAGE, pagination.total)}</span> 条，
                      共 <span className="font-medium">{pagination.total}</span> 条记录
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i className="fa-solid fa-chevron-left"></i>
                      </button>
                      
                      {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
                        let pageNum;
                        if (pagination.pages <= 7) {
                          pageNum = i + 1;
                        } else if (pagination.page <= 4) {
                          pageNum = i + 1;
                        } else if (pagination.page >= pagination.pages - 3) {
                          pageNum = pagination.pages - 6 + i;
                        } else {
                          pageNum = pagination.page - 3 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              pageNum === pagination.page
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.pages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i className="fa-solid fa-chevron-right"></i>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 加载指示器 */}
      {loading && items.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
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
