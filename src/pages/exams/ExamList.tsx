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
    <div className="h-full flex flex-col space-y-2">
      {/* 搜索栏 */}
      <div className="bg-white rounded-lg border border-gray-200 px-3 py-2">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i className="fa-solid fa-search text-gray-400 text-sm"></i>
          </div>
          <input
            type="text"
            placeholder="搜索用户ID、用户名、会话ID、试卷ID..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {/* 试卷列表表格 */}
      <div className="bg-white rounded-t-lg overflow-hidden border-t border-l border-r border-gray-200 flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1 overflow-y-auto min-h-0">
          <table className="w-full">
             <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
               <tr>
                 <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">ID</th>
                 <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">用户ID</th>
                 <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">用户名</th>
                 <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">会话ID</th>
                 <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-700 bg-gray-50">试卷ID</th>
                 <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-gray-700 bg-gray-50">操作</th>
               </tr>
             </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.length > 0 ? (
                currentItems.map((exam) => (
                   <tr key={exam.id} className="hover:bg-gray-50 transition-colors">
                     <td className="px-4 py-2 text-sm text-gray-900">
                       {exam.id}
                     </td>
                     <td className="px-4 py-2 text-sm text-gray-500">
                       {exam.userId}
                     </td>
                     <td className="px-4 py-2 text-sm text-gray-500">
                       {exam.username}
                     </td>
                     <td className="px-4 py-2 text-sm text-gray-500">
                       {exam.sessionId}
                     </td>
                     <td className="px-4 py-2 text-sm text-gray-500">
                       {exam.paperId}
                     </td>
                     <td className="px-4 py-2 text-right text-sm font-medium">
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
                  <td colSpan={6} className="px-2 py-4 text-center">
                    <span className="text-sm text-gray-500">暂无数据</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* 分页控件 */}
        {totalPages > 1 && (
          <div className="bg-white border-t-0 border-l border-r border-b border-gray-200 rounded-b-lg -mt-2">
            <div className="px-4 py-1 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                共 {filteredExams.length} 条
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  &lt;
                </button>
                
                {(() => {
                  const pages = [];
                  
                  if (totalPages <= 7) {
                    // 总页数 <= 7，显示所有页码
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => handlePageChange(i)}
                          className={cn(
                            "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                            currentPage === i 
                              ? 'text-blue-600 font-semibold' 
                              : 'text-gray-700'
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
                        className={cn(
                          "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                          currentPage === 1 
                            ? 'text-blue-600 font-semibold' 
                            : 'text-gray-700'
                        )}
                      >
                        1
                      </button>
                    );
                    
                    if (currentPage <= 4) {
                      // 当前页在前面：1 2 3 4 5 ... 最后页
                      for (let i = 2; i <= Math.min(5, totalPages - 1); i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => handlePageChange(i)}
                            className={cn(
                              "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                              currentPage === i 
                                ? 'text-blue-600 font-semibold' 
                                : 'text-gray-700'
                            )}
                          >
                            {i}
                          </button>
                        );
                      }
                      if (totalPages > 6) {
                        pages.push(<span key="ellipsis1" className="px-2 py-2 text-sm text-gray-400">...</span>);
                      }
                    } else if (currentPage >= totalPages - 3) {
                      // 当前页在后面：1 ... 倒数第4页 倒数第3页 倒数第2页 倒数第1页 最后页
                      if (totalPages > 6) {
                        pages.push(<span key="ellipsis1" className="px-2 py-2 text-sm text-gray-400">...</span>);
                      }
                      for (let i = Math.max(2, totalPages - 4); i <= totalPages - 1; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => handlePageChange(i)}
                            className={cn(
                              "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                              currentPage === i 
                                ? 'text-blue-600 font-semibold' 
                                : 'text-gray-700'
                            )}
                          >
                            {i}
                          </button>
                        );
                      }
                    } else {
                      // 当前页在中间：1 ... 前页 当前页 后页 ... 最后页
                      pages.push(<span key="ellipsis1" className="px-2 py-2 text-sm text-gray-400">...</span>);
                      
                      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => handlePageChange(i)}
                            className={cn(
                              "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                              currentPage === i 
                                ? 'text-blue-600 font-semibold' 
                                : 'text-gray-700'
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
                          className={cn(
                            "px-3 py-1 rounded text-sm transition-colors bg-white hover:bg-gray-50",
                            currentPage === totalPages 
                              ? 'text-blue-600 font-semibold' 
                              : 'text-gray-700'
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
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  &gt;
                </button>
                
                <button
                  onClick={() => {
                    setExams(mockExams);
                    setFilteredExams(mockExams);
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 rounded text-sm bg-white hover:bg-gray-50 transition-colors"
                  title="刷新列表"
                >
                  <i className="fa-solid fa-refresh"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}