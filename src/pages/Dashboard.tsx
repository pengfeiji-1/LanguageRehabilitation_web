import { motion } from 'framer-motion';
import Card from '@/components/Dashboard/Card';
import Charts from '@/components/Dashboard/Charts';
import { dashboardStats, chartData } from '@/mocks/dashboardData';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* 页面标题和导出按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据概览</h1>
          <p className="mt-1 text-sm text-gray-500">查看系统关键指标和趋势分析</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          <i className="fa-solid fa-download mr-2"></i> 导出报表
        </button>
      </div>
      
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
          <Card
            title="注册用户总数"
            value={dashboardStats.totalUsers.toLocaleString()}
            icon={<i className="fa-solid fa-users text-xl"></i>}
            trend="up"
            trendValue="12.5%"
            className="border-none shadow-none p-0 m-0"
          />
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
          <Card
            title="今日新增用户"
            value={dashboardStats.newUsersToday}
            icon={<i className="fa-solid fa-user-plus text-xl"></i>}
            className="border-none shadow-none p-0 m-0"
          />
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
          <Card
            title="活跃用户数"
            value={dashboardStats.activeUsers.toLocaleString()}
            icon={<i className="fa-solid fa-user-check text-xl"></i>}
            trend="up"
            trendValue="8.2%"
            className="border-none shadow-none p-0 m-0"
          />
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
          <Card
            title="平均每日训练次数"
            value={dashboardStats.avgDailyTraining}
            icon={<i className="fa-solid fa-chart-line text-xl"></i>}
            trend="down"
            trendValue="1.5%"
            className="border-none shadow-none p-0 m-0"
          />
        </div>
      </div>
      
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