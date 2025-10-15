import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, YAxisProps } from 'recharts';

interface ChartsProps {
  data: {
    date: string;
    newUsers: number;
    activeUsers: number;
  }[];
}

// 自定义Y轴组件以支持双Y轴
const CustomYAxis = (props: YAxisProps) => {
  return <YAxis {...props} />;
};

export default function Charts({ data }: ChartsProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="date" axisLine={false} tickLine={false} />
        
        {/* 左侧Y轴 - 注册用户数 */}
        <CustomYAxis 
          yAxisId="left" 
          orientation="left" 
          axisLine={false} 
          tickLine={false} 
          domain={['dataMin - 5', 'dataMax + 5']}
        />
        
        {/* 右侧Y轴 - 活跃用户数 */}
        <CustomYAxis 
          yAxisId="right" 
          orientation="right" 
          axisLine={false} 
          tickLine={false} 
          domain={['dataMin - 10', 'dataMax + 10']}
        />
        
        <Tooltip 
          contentStyle={{ 
            borderRadius: '8px', 
            border: 'none', 
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' 
          }} 
        />
        
        <Legend verticalAlign="top" height={36} />
        
        {/* 柱状图 - 注册用户数 */}
        <Bar 
          yAxisId="left"
          dataKey="newUsers" 
          name="注册用户数"
          fill="#3b82f6" 
          radius={[4, 4, 0, 0]} 
          barSize={30}
        />
        
        {/* 折线图 - 活跃用户数 */}
        <Line 
          yAxisId="right"
          type="monotone" 
          dataKey="activeUsers" 
          name="活跃用户数"
          stroke="#10b981" 
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}