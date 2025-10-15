import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { Toaster } from 'react-hot-toast';
import { AuthContext } from '@/contexts/authContext';
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import ProtectedRoute from "@/components/ProtectedRoute";
import Home from "@/pages/Home";
import Layout from "@/components/Layout";
import { Empty } from "@/components/Empty";
import UserList from "@/pages/users/UserList";
import UserDetail from "@/pages/users/UserDetail";
import Playback from "@/pages/users/Playback";
import ExamList from "@/pages/exams/ExamList";
import WabReportList from "@/pages/wab/WabReportList";
import WabReportDetail from "@/pages/wab/WabReportDetail";
import EvaluationDetail from "@/pages/wab/EvaluationDetail";
import { Outlet, Navigate } from "react-router-dom";

export default function App() {
  // 从localStorage读取初始登录状态
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const saved = localStorage.getItem('isAuthenticated');
    return saved === 'true';
  });

  // 包装setIsAuthenticated函数，同时更新localStorage
  const setAuthenticatedState = (value: boolean) => {
    setIsAuthenticated(value);
    localStorage.setItem('isAuthenticated', value.toString());
  };

  const logout = () => {
    // 清除所有登录相关的本地存储
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
    
    // 清除管理员令牌和信息
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_info');
    localStorage.removeItem('admin_token_expiry');
    
    // 跳转到登录页面
    window.location.href = '/login';
  };

  // 监听localStorage变化，支持多标签页同步
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'isAuthenticated') {
        setIsAuthenticated(e.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, setIsAuthenticated: setAuthenticatedState, logout }}
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Home />} />
        
        {/* 受保护的路由 - 使用管理系统布局 */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />
         {/* 用户管理相关路由 */}
         <Route 
           path="/users" 
           element={
             <ProtectedRoute>
               <Layout>
                 <Outlet />
               </Layout>
             </ProtectedRoute>
           } 
         >
            <Route index element={<Navigate to="/users/list" replace />} />
            <Route path="list" element={<UserList />} />
            <Route path="detail/:id" element={<UserDetail />} />
            <Route path="playback" element={<Navigate to="/exams/list" replace />} />
            <Route path="playback/:id" element={<Playback />} />
         </Route>
         
         {/* 试卷管理相关路由 */}
         <Route 
           path="/exams" 
           element={
             <ProtectedRoute>
               <Layout>
                 <Outlet />
               </Layout>
             </ProtectedRoute>
           } 
         >
           <Route index element={<Navigate to="/exams/list" replace />} />
            <Route path="list" element={<ExamList />} />
         </Route>
         
         {/* WAB报告管理相关路由 */}
         <Route 
           path="/wab" 
           element={
             <ProtectedRoute>
               <Layout>
                 <Outlet />
               </Layout>
             </ProtectedRoute>
           } 
         >
           <Route index element={<Navigate to="/wab/reports" replace />} />
           <Route path="reports" element={<WabReportList />} />
           <Route path="reports/:id" element={<WabReportDetail />} />
           <Route path="evaluations/:userId" element={<EvaluationDetail />} />
         </Route>
         
         {/* 系统设置页面 */}
         <Route 
           path="/settings" 
           element={
             <ProtectedRoute>
               <Layout>
                 <Empty />
               </Layout>
             </ProtectedRoute>
           } 
         />
      </Routes>
      
      {/* Toast 通知组件 */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // 定义默认选项
          className: '',
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          // 默认选项适用于所有toast
          success: {
            duration: 3000,
            style: {
              background: '#10b981',
              color: '#fff',
            },
          },
          error: {
            duration: 5000,
            style: {
              background: '#ef4444',
              color: '#fff',
            },
          },
        }}
      />
    </AuthContext.Provider>
  );
}
