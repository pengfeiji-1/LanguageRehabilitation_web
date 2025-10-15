import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mockExams, Exam } from '@/mocks/exams';
import { cn } from '@/lib/utils';

export default function ExamList() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [filteredExams, setFilteredExams] = useState<Exam[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // 初始化数据
  useEffect(() => {
    setExams(mockExams);
    setFilteredExams(mockExams);
  }, []);
  
  // 搜索试卷
   useEffect(() => {
     if (!searchTerm) {
       setFilteredExams(exams);
       setCurrentPage(1); // 重置到第一页
       return;
     }
     
     const results = exams.filter(exam => 
       exam.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
       exam.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
       exam.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
       exam.sessionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
       exam.paperId.toLowerCase().includes(searchTerm.toLowerCase())
     );
     
     setFilteredExams(results);
     setCurrentPage(1); // 重置到第一页
   }, [searchTerm, exams]);
  
  // 分页逻辑
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredExams.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredExams.length / itemsPerPage);
  
  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };
  
  // 处理页码变更
  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* 页面标题和操作区 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">试卷管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理系统中的试卷和题目</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <div className="relative w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="fa-solid fa-search text-gray-400"></i>
            </div>
            <input
              type="text"
               placeholder="搜索用户ID、用户名、会话ID、试卷ID..."
               className="block w-full sm:w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

        </div>
      </div>
      
      {/* 试卷列表表格 */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
             <thead className="bg-gray-50">
               <tr>
                 <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                 <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户ID</th>
                 <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户名</th>
                 <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">会话ID</th>
                 <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">试卷ID</th>
                 <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
               </tr>
             </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.length > 0 ? (
                currentItems.map((exam) => (
                   <tr key={exam.id} className="hover:bg-gray-50 transition-colors">
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       {exam.id}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       {exam.userId}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       {exam.username}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       {exam.sessionId}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       {exam.paperId}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/users/playback/${exam.userId}?record=${exam.id}&paperId=${exam.paperId}&sessionId=${exam.sessionId}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          查看回放
                        </Link>
                     </td>
                   </tr>
                 ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                    <div className="flex flex-col items-center">
                      <i className="fa-solid fa-search text-2xl mb-2 text-gray-300"></i>
                      未找到匹配的试卷
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* 分页控件 */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              显示 {indexOfFirstItem + 1} 到 {Math.min(indexOfLastItem, filteredExams.length)} 条，共 {filteredExams.length} 条
            </div>
            <div className="flex space-x-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              
              {[...Array(totalPages)].map((_, i) => {
                // 只显示当前页附近的页码
                if (
                  i === 0 || 
                  i === totalPages - 1 || 
                  Math.abs(i + 1 - currentPage) <= 1
                ) {
                  return (
                    <button
                      key={i}
                      onClick={() => handlePageChange(i + 1)}
                      className={`px-3 py-1 border rounded-md text-sm ${
                        currentPage === i + 1 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                }
                
                // 显示省略号
                if (
                  (i === 1 && currentPage > 3) || 
                  (i === totalPages - 2 && currentPage < totalPages - 2)
                ) {
                  return <span key={i} className="px-3 py-1 text-sm">...</span>;
                }
                
                return null;
              })}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded-md text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}