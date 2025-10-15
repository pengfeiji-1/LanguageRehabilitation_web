// Generate mock data for dashboard statistics

// Helper function to generate dates for the last 7 days
const generateLast7Days = () => {
  const dates = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }));
  }
  
  return dates;
};

// Generate random data for charts
const generateChartData = (days: string[]) => {
  return days.map(day => ({
    date: day,
    newUsers: Math.floor(Math.random() * 30) + 5,
    activeUsers: Math.floor(Math.random() * 50) + 20
  }));
};

// Last 7 days dates
export const last7Days = generateLast7Days();

// Chart data
export const chartData = generateChartData(last7Days);

// Dashboard statistics
export const dashboardStats = {
  totalUsers: 1258,
  newUsersToday: 36,
  activeUsers: 892,
  avgDailyTraining: 4.2
};