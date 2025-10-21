import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { Toaster } from 'react-hot-toast';
import { AuthContext } from '@/contexts/authContext';
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import PendingDashboard from "@/pages/PendingDashboard";
import RoleBasedRoute from "@/components/RoleBasedRoute";
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
import AnnotationList from "@/pages/wab/annotations/AnnotationList"; // 标注列表页面
import UserApproval from "@/pages/admin/UserApproval"; // 用户审批页面
import { PermissionManager } from '@/lib/permissions';
import { adminAPI } from '@/lib/api';
import { Outlet, Navigate } from "react-router-dom";

// 仪表盘包装器组件，根据用户角色显示不同内容
function DashboardWrapper() {
  const isPendingUser = PermissionManager.isPendingApproval();
  
  if (isPendingUser) {
    return <PendingDashboard />;
  }
  
  return <Dashboard />;
}

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

  const logout = async () => {
    try {
      // 获取token用于API调用
      const token = localStorage.getItem('admin_access_token');
      
      // 先调用退出登录API
      if (token) {
        try {
          await adminAPI.logout(token);
          console.log('退出登录API调用成功');
        } catch (error) {
          console.error('退出登录API调用失败:', error);
          // API失败不影响本地退出登录，继续执行清理
        }
      }
      
      // API调用完成后，清除所有登录相关的本地存储（除了isAuthenticated，避免触发storage事件）
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('admin_refresh_token');
      localStorage.removeItem('admin_info');
      localStorage.removeItem('admin_token_expiry');
      
      // 直接跳转到登录页面，让登录页面来清理isAuthenticated
      window.location.href = '/login';
      
    } catch (error) {
      console.error('退出登录过程中发生错误:', error);
      
      // 即使出错也要清理状态并跳转
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('admin_refresh_token');
      localStorage.removeItem('admin_info');
      localStorage.removeItem('admin_token_expiry');
      window.location.href = '/login';
    }
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
            <RoleBasedRoute>
              <Layout>
                <DashboardWrapper />
              </Layout>
            </RoleBasedRoute>
          } 
        />
         {/* 用户管理相关路由 */}
         <Route 
           path="/users" 
           element={
             <RoleBasedRoute>
               <Layout>
                 <Outlet />
               </Layout>
             </RoleBasedRoute>
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
             <RoleBasedRoute>
               <Layout>
                 <Outlet />
               </Layout>
             </RoleBasedRoute>
           } 
         >
           <Route index element={<Navigate to="/exams/list" replace />} />
            <Route path="list" element={<ExamList />} />
         </Route>
         
         {/* WAB报告管理相关路由 */}
         <Route 
           path="/wab" 
           element={
             <RoleBasedRoute>
               <Layout>
                 <Outlet />
               </Layout>
             </RoleBasedRoute>
           } 
         >
           <Route index element={<Navigate to="/wab/reports" replace />} />
           <Route path="reports" element={<WabReportList />} />
           <Route path="reports/:id" element={<WabReportDetail />} />
           <Route path="evaluations/:userId" element={<EvaluationDetail />} />
           <Route path="annotations" element={<AnnotationList />} /> {/* 标注列表 */}
         </Route>
         
         {/* 系统设置页面 */}
         <Route 
           path="/settings" 
           element={
             <RoleBasedRoute>
               <Layout>
                 <Empty />
               </Layout>
             </RoleBasedRoute>
           } 
         />
         
         {/* 用户审批管理页面 - 仅超级管理员可访问 */}
         <Route 
           path="/admin/users" 
           element={
             <RoleBasedRoute>
               <Layout>
                 <UserApproval />
               </Layout>
             </RoleBasedRoute>
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
