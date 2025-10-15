import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getUserById, User } from '@/mocks/users';
import { cn } from '@/lib/utils';

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('info');
  const navigate = useNavigate();
  
  // 获取用户详情
  useEffect(() => {
    if (!id) return;
    
    const foundUser = getUserById(id);
    if (foundUser) {
      setUser(foundUser);
    } else {
      // 用户不存在，返回列表页
      navigate('/users/list');
    }
  }, [id, navigate]);
  
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-gray-400 mb-2"></i>
          <p className="text-gray-500">加载用户信息中...</p>
        </div>
      </div>
    );
  }
  
  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="space-y-6">
      {/* 页面标题和返回按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用户详情</h1>
          <p className="mt-1 text-sm text-gray-500">查看和管理用户的详细信息</p>
        </div>
        <Link
          to="/users/list"
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <i className="fa-solid fa-arrow-left mr-2"></i> 返回列表
        </Link>
      </div>
      
      {/* 用户基本信息卡片 */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center">
            <div className="flex-shrink-0">
              <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-4xl">
                <i className="fa-solid fa-user"></i>
              </div>
            </div>
            <div className="mt-6 md:mt-0 md:ml-8">
              <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
              <div className="mt-2 flex flex-wrap items-center text-sm text-gray-500">
                <span className="flex items-center mr-6">
                  <i className="fa-solid fa-envelope mr-1"></i> {user.email}
                </span>
                <span className="flex items-center mr-6">
                  <i className="fa-solid fa-phone mr-1"></i> {user.phone}
                </span>
                <span className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                  user.gender === 'male' ? "bg-blue-100 text-blue-800" : 
                  user.gender === 'female' ? "bg-pink-100 text-pink-800" : 
                  "bg-gray-100 text-gray-800"
                )}>
                  {user.gender === 'male' ? '男' : user.gender === 'female' ? '女' : '其他'} · {user.age}岁
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">注册时间</h3>
              <p className="mt-1 text-base text-gray-900">{formatDate(user.registerTime)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">最近活跃</h3>
              <p className="mt-1 text-base text-gray-900">{formatDate(user.lastActiveTime)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">训练记录</h3>
              <p className="mt-1 text-base text-gray-900">{user.trainingRecords.length} 条</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* 标签页 */}
      <div>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('records')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'records'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              训练记录
            </button>
          </nav>
        </div>
        
        {/* 训练记录列表 */}
        {activeTab === 'records' && (
          <div className="mt-6 bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日期</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时长</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">得分</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">题目数</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {user.trainingRecords.length > 0 ? (
                    user.trainingRecords
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // 按日期倒序
                      .map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(record.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {Math.floor(record.duration / 60)}分{record.duration % 60}秒
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              record.score >= 90 ? 'bg-green-100 text-green-800' :
                              record.score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {record.score}分
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.questions.length}题
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link
                              to={`/users/playback/${user.id}?record=${record.id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              查看回放
                            </Link>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                        <div className="flex flex-col items-center">
                          <i className="fa-solid fa-clipboard-list text-2xl mb-2 text-gray-300"></i>
                          暂无训练记录
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}