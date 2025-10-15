import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { WabReport } from '@/types/wab';
import { cn } from '@/lib/utils';
import { adminAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function WabReportList() {
  const [reports, setReports] = useState<WabReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pageChanging, setPageChanging] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    per_page: 10
  });

  // 获取报告列表数据
  const fetchReports = async (isRefresh = false, page = 1) => {
    // 优化：区分不同类型的加载状态
    const isPageChange = !isRefresh && page !== pagination.page;
    
    if (isRefresh) {
      setRefreshing(true);
    } else if (isPageChange) {
      setPageChanging(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await adminAPI.getWabReports({
        page: page,
        per_page: pagination.per_page
      });

      if (response.success) {
        setReports(response.data);
        setPagination({
          total: response.total,
          page: response.page,
          per_page: response.per_page
        });
      } else {
        throw new Error('获取报告列表失败');
      }
    } catch (error) {
      console.error('获取报告列表失败:', error);
      const errorMessage = error instanceof Error ? error.message : '获取报告列表失败';
      
      // 如果是认证错误，提示用户重新登录
      if (errorMessage.includes('认证') || errorMessage.includes('登录') || errorMessage.includes('token') || errorMessage.includes('令牌')) {
        toast.error('认证失败，请重新登录');
        // 延迟跳转到登录页面
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        toast.error(errorMessage);
      }
      
      // 如果API失败，设置为空数组
      setReports([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setPageChanging(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleRefresh = () => {
    fetchReports(true, pagination.page);
  };

  const handleReevaluate = async (reportId: string) => {
    try {
      const response = await adminAPI.reevaluateWabReport(reportId);
      if (response.success) {
        toast.success(response.message || '重新评估成功');
        // 重新评估后刷新列表
        handleRefresh();
      } else {
        throw new Error('重新评估失败');
      }
    } catch (error) {
      console.error('重新评估失败:', error);
      toast.error(error instanceof Error ? error.message : '重新评估失败');
    }
  };

  const handlePageChange = (page: number) => {
    fetchReports(false, page);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-gray-400 mb-2"></i>
          <p className="text-gray-500">加载报告列表中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">评估报告列表</h1>
          <p className="mt-1 text-sm text-gray-500">
            查看和管理WAB失语评估报告 
            {pagination.total > 0 && (
              <span className="ml-2 text-blue-600 font-medium">
                (共 {pagination.total} 条记录)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md shadow-sm font-medium transition-colors"
        >
          <i className={cn(
            "fa-solid mr-2",
            refreshing ? 'fa-spinner fa-spin' : 'fa-refresh'
          )}></i>
          {refreshing ? '刷新中...' : '刷新'}
        </button>
      </div>

      {/* 报告列表 */}
      <div className={cn(
        "bg-white rounded-xl shadow-md overflow-hidden border border-gray-100",
        pageChanging && "opacity-75 transition-opacity duration-200"
      )}>
        {reports.length === 0 && !loading ? (
          <div className="text-center py-12">
            <i className="fa-solid fa-file-text text-4xl text-gray-300 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无评估报告</h3>
            <p className="text-gray-500 mb-4">还没有WAB失语评估报告数据</p>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
            >
              <i className="fa-solid fa-refresh mr-2"></i>
              重新加载
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">序号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">评估类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">评估人</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">试卷ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">题目数量</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">综合得分</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">正确率</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">流畅度</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">评估时间</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">查看详情</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">重新评估</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report, index) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {report.evaluationType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-medium">{report.evaluatorName}</span>
                        <span className="text-xs text-gray-500">ID: {report.evaluatorId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {report.quizId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.questionCount}题
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        getScoreColor(report.totalScore)
                      )}>
                        {report.totalScore}分
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.accuracy}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.fluency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(report.evaluationTime).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Link
                        to={`/wab/evaluations/${report.evaluatorId}?quiz_id=${report.quizId}`}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md text-sm font-medium transition-colors"
                      >
                        查看详情
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleReevaluate(report.id)}
                        className="inline-flex items-center px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-md text-sm font-medium transition-colors"
                      >
                        重新评估
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 分页组件 */}
      {pagination.total > pagination.per_page && (
        <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-lg">
          <div className="flex items-center text-sm text-gray-700">
            <span>共 {pagination.total} 条记录</span>
            {pageChanging && (
              <span className="ml-2 text-blue-600">
                <i className="fa-solid fa-spinner fa-spin mr-1"></i>
                加载中...
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || pageChanging}
              className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {pageChanging && pagination.page > 1 ? (
                <i className="fa-solid fa-spinner fa-spin mr-1"></i>
              ) : null}
              上一页
            </button>
            <span className="inline-flex items-center px-3 py-1 text-sm text-gray-700">
              第 {pagination.page} 页，共 {Math.ceil(pagination.total / pagination.per_page)} 页
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.per_page) || pageChanging}
              className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              下一页
              {pageChanging && pagination.page < Math.ceil(pagination.total / pagination.per_page) ? (
                <i className="fa-solid fa-spinner fa-spin ml-1"></i>
              ) : null}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
