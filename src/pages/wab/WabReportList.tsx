import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { WabReport } from '@/types/wab';
import { cn } from '@/lib/utils';
import { adminAPI } from '@/lib/api';
import { showError, showSuccess } from '@/lib/toast';
import { useReevaluation } from '@/lib/reevaluation';
import ReevaluationProgress from '@/components/ReevaluationProgress';

export default function WabReportList() {
  const [reports, setReports] = useState<WabReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageChanging, setPageChanging] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    per_page: 20
  });

  // 重评估相关状态
  const [showProgress, setShowProgress] = useState(false);
  const [reevaluatingReports, setReevaluatingReports] = useState<Set<string>>(new Set());
  const progressRef = useRef<any>(null);

  // 搜索相关状态
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'phone' | 'user_id' | 'quiz_id'>('name');
  
  // 高级筛选状态
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    minCorrectnessScore: '',
    minFluencyScore: '',
    startDate: '',
    endDate: '',
    sortBy: 'assessment_date',
    sortOrder: 'desc' as 'asc' | 'desc'
  });
  
  const { reevaluateQuiz } = useReevaluation();
  
  // 获取URL查询参数
  const [searchParams] = useSearchParams();

  // 获取报告列表数据
  const fetchReports = async (isRefresh = false, page = 1, search = searchTerm, type = searchType, filters = advancedFilters) => {
    // 优化：区分不同类型的加载状态
    const isPageChange = !isRefresh && page !== pagination.page;
    
    if (isPageChange) {
      setPageChanging(true);
    } else {
      setLoading(true);
    }

    try {
      const params: any = {
        page: page,
        per_page: pagination.per_page
      };
      
      // 添加搜索参数 - 使用新的API参数名
      if (search && search.trim()) {
        switch (type) {
          case 'name':
            params.real_name = search.trim();
            break;
          case 'phone':
            params.phone = search.trim();
            break;
          case 'user_id':
            params.user_id = search.trim();
            break;
          case 'quiz_id':
            params.quiz_id = search.trim();
            break;
        }
      }
      
      // 添加高级筛选参数
      if (filters.minCorrectnessScore && !isNaN(parseFloat(filters.minCorrectnessScore))) {
        params.min_correctness_score = parseFloat(filters.minCorrectnessScore);
      }
      if (filters.minFluencyScore && !isNaN(parseFloat(filters.minFluencyScore))) {
        params.min_fluency_score = parseFloat(filters.minFluencyScore);
      }
      if (filters.startDate) {
        params.start_date = filters.startDate;
      }
      if (filters.endDate) {
        params.end_date = filters.endDate;
      }
      if (filters.sortBy) {
        params.sort_by = filters.sortBy;
        params.sort_order = filters.sortOrder;
      }
      
      const response = await adminAPI.getWabReports(params);

      if (response.success) {
        setReports(response.data);
        setPagination({
          total: response.total,
          page: response.page,
          per_page: response.per_page
        });
      } else {
        throw new Error('获取数据失败');
      }
    } catch (error) {
      console.error('获取数据失败:', error);
      const errorMessage = error instanceof Error ? error.message : '获取数据失败';
      
      // 如果是认证错误，提示用户重新登录
      if (errorMessage.includes('认证') || errorMessage.includes('登录') || errorMessage.includes('token') || errorMessage.includes('令牌')) {
        showError('认证失败，请重新登录');
        // 延迟跳转到登录页面
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        showError(errorMessage);
      }
      
      // 如果API失败，设置为空数组
      setReports([]);
    } finally {
      setLoading(false);
      setPageChanging(false);
    }
  };

  useEffect(() => {
    // 检查URL参数，如果有userId，自动搜索该用户的报告
    const userId = searchParams.get('userId');
    const userName = searchParams.get('userName');
    
    if (userId && userName) {
      // 设置搜索条件
      setSearchTerm(decodeURIComponent(userName));
      setSearchType('name');
      // 执行搜索
      fetchReports(false, 1, decodeURIComponent(userName), 'name', advancedFilters);
    } else {
      // 正常加载数据
    fetchReports();
    }
  }, []);

  // 搜索处理
  const handleSearch = () => {
    // 重置到第一页并搜索
    fetchReports(false, 1, searchTerm, searchType, advancedFilters);
  };

  // 清除搜索
  const handleClearSearch = () => {
    setSearchTerm('');
    fetchReports(false, 1, '', searchType, advancedFilters);
    
    // 如果是从用户列表跳转过来的，清除URL参数
    if (searchParams.get('userId')) {
      window.history.replaceState({}, '', '/wab/reports');
    }
  };

  // 搜索输入变化
  const handleSearchInputChange = (value: string) => {
    setSearchTerm(value);
    if (!value.trim()) {
      // 如果搜索框为空，自动清除搜索
      handleClearSearch();
    }
  };
  
  // 高级筛选处理
  const handleAdvancedFilterChange = (key: string, value: string) => {
    const newFilters = { ...advancedFilters, [key]: value };
    setAdvancedFilters(newFilters);
  };
  
  // 应用高级筛选
  const handleApplyAdvancedFilters = () => {
    fetchReports(false, 1, searchTerm, searchType, advancedFilters);
  };
  
  // 清除高级筛选
  const handleClearAdvancedFilters = () => {
    const defaultFilters = {
      minCorrectnessScore: '',
      minFluencyScore: '',
      startDate: '',
      endDate: '',
      sortBy: 'assessment_date',
      sortOrder: 'desc' as 'asc' | 'desc'
    };
    setAdvancedFilters(defaultFilters);
    fetchReports(false, 1, searchTerm, searchType, defaultFilters);
  };


  const handleReevaluate = async (report: WabReport) => {
    try {
      // 检查是否已经在重评估中
      if (reevaluatingReports.has(report.id)) {
        showError('该试卷正在重新评估中，请稍候...');
        return;
      }

      // 确认重评估
      const confirmed = window.confirm(
        `确定要重新评估试卷"${report.quizId}"吗？\n\n` +
        `评估人：${report.evaluatorName}\n` +
        `题目数量：${report.questionCount}题\n` +
        `预计用时：${Math.ceil(report.questionCount * 0.5)}-${report.questionCount}分钟\n\n` +
        `重新评估将更新所有评估结果，此操作不可撤销。`
      );

      if (!confirmed) {
        return;
      }

      // 添加到重评估列表
      setReevaluatingReports(prev => new Set([...prev, report.id]));

      // 显示进度窗口
      setShowProgress(true);

      // 启动重评估
      await reevaluateQuiz(
        parseInt(report.evaluatorId), 
        report.quizId,
        {
          aiModel: 'auto',
          onProgress: (taskId, status) => {
            console.log(`任务进度更新: ${taskId}`, status);
            // 更新进度组件
            if (progressRef.current) {
              // 如果是初始状态，先添加任务
              if (status.status === 'pending' && status.progress === 0) {
                progressRef.current.addTask(taskId, status, status.question_id);
              } else {
                // 否则更新现有任务状态
                progressRef.current.updateTaskStatus(taskId, status);
              }
            }
          },
          onTaskComplete: (taskId, status) => {
            console.log(`子任务完成: ${taskId}`, status);
            if (progressRef.current) {
              progressRef.current.updateTaskStatus(taskId, status);
            }
          },
          onAllComplete: (results) => {
            console.log('所有任务完成:', results);
            
            // 统计完成情况
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            
            if (failed === 0) {
              showSuccess(`试卷重新评估完成！成功评估 ${successful} 个题目`);
            } else {
              showError(`试卷重新评估完成，但有 ${failed} 个题目评估失败`);
            }
            
            // 移除重评估状态
            setReevaluatingReports(prev => {
              const newSet = new Set(prev);
              newSet.delete(report.id);
              return newSet;
            });
            
            // 刷新列表数据
            fetchReports(true, pagination.page, searchTerm, searchType, advancedFilters);
            
            // 延迟关闭进度窗口
            setTimeout(() => {
              setShowProgress(false);
              if (progressRef.current) {
                progressRef.current.reset();
              }
            }, 2000);
          },
          onError: (error) => {
            console.error('重评估失败:', error);
            // 移除重评估状态
            setReevaluatingReports(prev => {
              const newSet = new Set(prev);
              newSet.delete(report.id);
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
      setReevaluatingReports(prev => {
        const newSet = new Set(prev);
        newSet.delete(report.id);
        return newSet;
      });
      // 关闭进度窗口
      setShowProgress(false);
      if (progressRef.current) {
        progressRef.current.reset();
      }
    }
  };

  const handlePageChange = (page: number) => {
    fetchReports(false, page, searchTerm, searchType, advancedFilters);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-gray-400 mb-2"></i>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-2">
      {/* 用户跳转提示 */}
      {searchParams.get('userId') && searchParams.get('userName') && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <div className="flex items-center">
            <i className="fa-solid fa-info-circle text-blue-500 mr-2"></i>
            <span className="text-blue-700 text-sm">
              正在显示用户 "<strong>{decodeURIComponent(searchParams.get('userName') || '')}</strong>" 的评估报告
              </span>
          </div>
        </div>
      )}
      
      {/* 搜索栏 */}
      <div className="bg-white rounded-lg border border-gray-200 px-3 py-2">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          {/* 搜索类型选择 */}
          <div className="relative min-w-[120px]">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as 'name' | 'phone' | 'user_id' | 'quiz_id')}
              className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white appearance-none"
            >
              <option value="name">姓名</option>
              <option value="phone">手机号</option>
              <option value="user_id">用户ID</option>
              <option value="quiz_id">试卷ID</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <i className="fa-solid fa-chevron-down text-gray-400 text-sm"></i>
            </div>
          </div>

          {/* 搜索输入框和按钮 */}
          <div className="flex-1 flex gap-2 items-center">
            <div className="flex-1 max-w-md relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fa-solid fa-search text-gray-400 text-sm"></i>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={
                  searchType === 'name' ? '请输入评估人姓名' :
                  searchType === 'phone' ? '请输入手机号' :
                  searchType === 'user_id' ? '请输入用户ID' :
                  '请输入试卷ID'
                }
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="清除搜索"
                >
                  <i className="fa-solid fa-times text-sm"></i>
                </button>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="inline-flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm transition-colors"
                title="高级筛选"
              >
                <i className="fa-solid fa-filter mr-1"></i>
                高级
              </button>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md text-sm transition-colors"
                title={loading ? '加载中...' : '搜索'}
              >
                <i className={cn(
                  "fa-solid",
                  loading ? 'fa-spinner fa-spin' : 'fa-search'
                )}></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 高级筛选面板 */}
      {showAdvancedFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 得分筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最低正确性得分</label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={advancedFilters.minCorrectnessScore}
                onChange={(e) => handleAdvancedFilterChange('minCorrectnessScore', e.target.value)}
                placeholder="0.0-10.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最低流畅性得分</label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={advancedFilters.minFluencyScore}
                onChange={(e) => handleAdvancedFilterChange('minFluencyScore', e.target.value)}
                placeholder="0.0-10.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            
            {/* 时间范围筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
              <input
                type="datetime-local"
                value={advancedFilters.startDate}
                onChange={(e) => handleAdvancedFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
              <input
                type="datetime-local"
                value={advancedFilters.endDate}
                onChange={(e) => handleAdvancedFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            
            {/* 排序选项 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">排序字段</label>
              <select
                value={advancedFilters.sortBy}
                onChange={(e) => handleAdvancedFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="assessment_date">评估时间</option>
                <option value="user_name">用户姓名</option>
                <option value="correctness_total">正确性总分</option>
                <option value="fluency_total">流畅性总分</option>
                <option value="question_count">题目数量</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">排序方向</label>
              <select
                value={advancedFilters.sortOrder}
                onChange={(e) => handleAdvancedFilterChange('sortOrder', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="desc">降序</option>
                <option value="asc">升序</option>
              </select>
            </div>
          </div>
          
          {/* 筛选操作按钮 */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleApplyAdvancedFilters}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
            >
              <i className="fa-solid fa-check mr-1"></i>
              应用筛选
            </button>
            <button
              onClick={handleClearAdvancedFilters}
              className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm transition-colors"
            >
              <i className="fa-solid fa-times mr-1"></i>
              清除筛选
            </button>
          </div>
        </div>
      )}

      {/* 报告列表 */}
      <div className={cn(
        "bg-white rounded-t-lg overflow-hidden border-t border-l border-r border-gray-200 flex-1 flex flex-col",
        pageChanging && "opacity-75 transition-opacity duration-200"
      )}>
        {reports.length === 0 && !loading ? (
          <div className="p-4 text-center">
            <span className="text-sm text-gray-500">暂无数据</span>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1 overflow-y-auto min-h-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">序号</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">评估类型</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">评估人</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">试卷ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">题目数量</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">综合得分</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">正确率</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">流畅度</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">评估时间</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 bg-gray-50">查看详情</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 bg-gray-50">重新评估</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report, index) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {report.evaluationType}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{report.evaluatorName}</span>
                        <span className="text-xs text-gray-500">ID: {report.evaluatorId}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {report.quizId}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {report.questionCount}题
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={cn(
                        "text-sm font-medium",
                        getScoreColor(report.totalScore)
                      )}>
                        {report.totalScore}分
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {report.accuracy}%
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {report.fluency}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {new Date(report.evaluationTime).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-center">
                      <Link
                        to={`/wab/evaluations/${report.evaluatorId}?quiz_id=${report.quizId}`}
                        className="text-blue-600 hover:text-blue-900 transition-colors text-sm"
                      >
                        查看详情
                      </Link>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleReevaluate(report)}
                        disabled={reevaluatingReports.has(report.id)}
                        className={cn(
                          "inline-flex items-center px-2 py-1 text-sm font-medium transition-colors",
                          reevaluatingReports.has(report.id)
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-green-700 hover:text-green-800"
                        )}
                      >
                        {reevaluatingReports.has(report.id) ? (
                          <>
                            <i className="fa-solid fa-spinner fa-spin mr-1"></i>
                            评估中
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-refresh mr-1"></i>
                            重新评估
                          </>
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
      {/* 分页控件 */}
      {!loading && Math.ceil(pagination.total / pagination.per_page) > 1 && (
        <div className="bg-white border-t-0 border-l border-r border-b border-gray-200 rounded-b-lg -mt-2">
          <div className="px-4 py-1 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              共 {pagination.total} 条
          </div>
            <div className="flex space-x-1">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1 || pageChanging}
                className="px-3 py-1 rounded text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                &lt;
              </button>
              
              {/* 页码显示 */}
              {(() => {
                const pages = [];
                const totalPages = Math.ceil(pagination.total / pagination.per_page);
                const current = pagination.page;
                
                if (totalPages <= 7) {
                  // 总页数 <= 7，显示所有页码
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => handlePageChange(i)}
                        disabled={pageChanging}
                        className={cn(
                          "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                          current === i 
                            ? 'text-blue-600 font-semibold' 
                            : 'text-gray-700',
                          pageChanging && 'opacity-50 cursor-not-allowed'
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
                      disabled={pageChanging}
                      className={cn(
                        "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                        current === 1 
                          ? 'text-blue-600 font-semibold' 
                          : 'text-gray-700',
                        pageChanging && 'opacity-50 cursor-not-allowed'
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
                          disabled={pageChanging}
                          className={cn(
                            "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                            current === i 
                              ? 'text-blue-600 font-semibold' 
                              : 'text-gray-700',
                            pageChanging && 'opacity-50 cursor-not-allowed'
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
                          disabled={pageChanging}
                          className={cn(
                            "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                            current === i 
                              ? 'text-blue-600 font-semibold' 
                              : 'text-gray-700',
                            pageChanging && 'opacity-50 cursor-not-allowed'
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
                          disabled={pageChanging}
                          className={cn(
                            "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                            current === i 
                              ? 'text-blue-600 font-semibold' 
                              : 'text-gray-700',
                            pageChanging && 'opacity-50 cursor-not-allowed'
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
                        disabled={pageChanging}
                        className={cn(
                          "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                          current === totalPages 
                            ? 'text-blue-600 font-semibold' 
                            : 'text-gray-700',
                          pageChanging && 'opacity-50 cursor-not-allowed'
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
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.per_page) || pageChanging}
                className="px-3 py-1 rounded text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                &gt;
              </button>
              
              <button
                onClick={() => fetchReports(true, pagination.page, searchTerm, searchType, advancedFilters)}
                disabled={loading || pageChanging}
                className="px-3 py-1 rounded text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={loading || pageChanging ? '加载中...' : '刷新列表'}
              >
                <i className={cn(
                  "fa-solid",
                  loading || pageChanging ? 'fa-spinner fa-spin' : 'fa-refresh'
                )}></i>
            </button>
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
        title="试卷重新评估进度"
        taskType="quiz"
      />

    </div>
  );
}
