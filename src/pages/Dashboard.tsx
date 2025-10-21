import { useState, useEffect } from 'react';
import Card from '@/components/Dashboard/Card';
import Charts from '@/components/Dashboard/Charts';
import { chartData } from '@/mocks/dashboardData';
import { adminAPI } from '@/lib/api';
import { DashboardStatsResponse, DashboardStatsParams } from '@/types/wab';
import { showError } from '@/lib/toast';

// 预设时间范围选项
const TIME_RANGE_OPTIONS = [
  { label: '最近7天', value: 7, key: '7d' },
  { label: '最近30天', value: 30, key: '30d' },
  { label: '最近90天', value: 90, key: '90d' },
  { label: '自定义', value: 0, key: 'custom' }
];

export default function Dashboard() {
  // 状态管理
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 时间范围相关状态
  const [selectedRange, setSelectedRange] = useState<string>('7d'); // 默认最近7天
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // 构建时间范围参数
  const buildTimeRangeParams = (): DashboardStatsParams | undefined => {
    if (selectedRange === 'custom') {
      // 自定义时间范围
      if (customStartDate && customEndDate) {
        return {
          start_date: new Date(customStartDate).toISOString(),
          end_date: new Date(customEndDate + 'T23:59:59').toISOString()
        };
      }
      return undefined; // 自定义模式但未选择日期
    } else {
      // 预设时间范围
      const option = TIME_RANGE_OPTIONS.find(opt => opt.key === selectedRange);
      if (option && option.value > 0) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - option.value);
        
        return {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        };
      }
    }
    
    return undefined; // 使用默认值（最近7天）
  };

  // 获取数据概览
  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = buildTimeRangeParams();
      console.log('📊 开始获取数据概览...', { selectedRange, params });
      
      const response = await adminAPI.getDashboardStats(params);
      
      console.log('📊 数据概览获取成功:', response);
      setStats(response);
    } catch (error) {
      console.error('📊 获取数据概览失败:', error);
      const errorMessage = error instanceof Error ? error.message : '获取数据概览失败';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 处理时间范围变化
  const handleTimeRangeChange = (rangeKey: string) => {
    setSelectedRange(rangeKey);
    setShowCustomDatePicker(rangeKey === 'custom');
    
    // 如果不是自定义范围，立即获取数据
    if (rangeKey !== 'custom') {
      // 立即重新获取数据
      fetchDashboardStatsWithRange(rangeKey);
    }
  };

  // 使用指定范围获取数据
  const fetchDashboardStatsWithRange = async (rangeKey: string) => {
    try {
      setLoading(true);
      setError(null);
      
      let params: DashboardStatsParams | undefined;
      
      if (rangeKey !== 'custom') {
        const option = TIME_RANGE_OPTIONS.find(opt => opt.key === rangeKey);
        if (option && option.value > 0) {
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(endDate.getDate() - option.value);
          
          params = {
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
          };
        }
      }
      
      console.log('📊 开始获取数据概览...', { rangeKey, params });
      
      const response = await adminAPI.getDashboardStats(params);
      
      console.log('📊 数据概览获取成功:', response);
      setStats(response);
    } catch (error) {
      console.error('📊 获取数据概览失败:', error);
      const errorMessage = error instanceof Error ? error.message : '获取数据概览失败';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 处理自定义日期确认
  const handleCustomDateConfirm = () => {
    if (customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      
      if (start > end) {
        showError('开始时间不能晚于结束时间');
        return;
      }
      
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 365) {
        showError('查询时间范围不能超过365天');
        return;
      }
      
      fetchDashboardStats();
    } else {
      showError('请选择开始时间和结束时间');
    }
  };

  // 获取今天的日期字符串（YYYY-MM-DD格式）
  const getTodayString = () => {
    return new Date().toISOString().split('T')[0];
  };

  // 获取默认开始日期（7天前）
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  };

  // 组件挂载时获取数据
  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // 格式化训练次数
  const formatTraining = (value: number) => {
    return value ? value.toFixed(2) : '0.00';
  };

  // 格式化时间段
  const formatPeriod = () => {
    if (!stats?.period) return '';
    
    const start = new Date(stats.period.start_date).toLocaleDateString('zh-CN');
    const end = new Date(stats.period.end_date).toLocaleDateString('zh-CN');
    return `${start} - ${end}`;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和时间选择 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据概览</h1>
          <div className="mt-1 space-y-1">
            <p className="text-sm text-gray-500">查看系统关键指标和趋势分析</p>
            {stats?.period && (
              <p className="text-xs text-gray-400">
                统计时间: {formatPeriod()}
              </p>
            )}
          </div>
        </div>

        {/* 时间范围选择和刷新按钮 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* 时间范围选择器 */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">时间范围:</label>
            <div className="flex space-x-1">
              {TIME_RANGE_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  onClick={() => handleTimeRangeChange(option.key)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    selectedRange === option.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 刷新按钮 */}
          <button 
            onClick={fetchDashboardStats}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className={`mr-2 ${loading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-refresh'}`}></i> 
            {loading ? '加载中...' : '刷新数据'}
          </button>
        </div>
      </div>

      {/* 自定义日期选择器 */}
      {showCustomDatePicker && (
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">自定义时间范围</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                开始时间
              </label>
              <input
                type="date"
                value={customStartDate || getDefaultStartDate()}
                onChange={(e) => setCustomStartDate(e.target.value)}
                max={getTodayString()}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                结束时间
              </label>
              <input
                type="date"
                value={customEndDate || getTodayString()}
                onChange={(e) => setCustomEndDate(e.target.value)}
                max={getTodayString()}
                min={customStartDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleCustomDateConfirm}
                disabled={loading || !customStartDate || !customEndDate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fa-solid fa-check mr-2"></i>
                确认
              </button>
              <button
                onClick={() => {
                  setSelectedRange('7d');
                  setShowCustomDatePicker(false);
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                <i className="fa-solid fa-times mr-2"></i>
                取消
              </button>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            <i className="fa-solid fa-info-circle mr-1"></i>
            最大查询范围不超过365天，结束时间不能超过今天
          </div>
        </div>
      )}
      
      {/* 统计卡片 */}
      {loading && !stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="bg-white rounded-lg shadow p-6 border border-gray-100 animate-pulse">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                </div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-2">
            <i className="fa-solid fa-exclamation-triangle text-2xl"></i>
          </div>
          <h3 className="text-lg font-medium text-red-800 mb-2">数据加载失败</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardStats}
            className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
          >
            <i className="fa-solid fa-refresh mr-2"></i>
            重新加载
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
            <Card
              title="注册用户总数"
              value={stats?.users.total?.toLocaleString() || '0'}
              icon={<i className="fa-solid fa-users text-xl text-blue-600"></i>}
              className="border-none shadow-none p-0 m-0"
            />
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
            <Card
              title="新增用户"
              value={stats?.users.new_users?.toString() || '0'}
              icon={<i className="fa-solid fa-user-plus text-xl text-green-600"></i>}
              className="border-none shadow-none p-0 m-0"
            />
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
            <Card
              title="活跃用户数"
              value={stats?.users.active_users?.toLocaleString() || '0'}
              icon={<i className="fa-solid fa-user-check text-xl text-purple-600"></i>}
              className="border-none shadow-none p-0 m-0"
            />
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
            <Card
              title="平均每日训练次数"
              value={formatTraining(stats?.users.avg_daily_training || 0)}
              icon={<i className="fa-solid fa-chart-line text-xl text-orange-600"></i>}
              className="border-none shadow-none p-0 m-0"
            />
          </div>
        </div>
      )}
      
      {/* 用户增长趋势和最近活动 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 用户增长趋势 */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">用户增长趋势</h3>
            <div className="flex space-x-2">
              <button className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-800">周</button>
              <button className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200">月</button>
              <button className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200">年</button>
            </div>
          </div>
          <div className="h-80">
            <Charts data={chartData} />
          </div>
        </div>
        
        {/* 最近用户活动 */}
        <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">最近用户活动</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex items-start space-x-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <i className="fa-solid fa-user"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">
                    <span className="font-medium">用户{1000 + item}</span> 完成了训练
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(Date.now() - item * 3600000).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    已完成
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <button className="text-sm text-blue-600 hover:text-blue-800">
              查看全部活动 <i className="fa-solid fa-chevron-right ml-1 text-xs"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}