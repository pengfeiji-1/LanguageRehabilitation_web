import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface CardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  trendValue?: string;
  className?: string;
}

export default function Card({ 
  title, 
  value, 
  icon, 
  trend, 
  trendValue,
  className 
}: CardProps) {
  return (
    <motion.div
      className={cn(
        'bg-white rounded-xl shadow-md p-6 transition-all duration-300 hover:shadow-lg',
        className
      )}
      whileHover={{ y: -5 }}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-gray-500 font-medium text-sm">{title}</h3>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
          {icon}
        </div>
      </div>
      
      {trend && trendValue && (
        <div className={`flex items-center text-sm ${
          trend === 'up' ? 'text-green-600' : 'text-red-600'
        }`}>
          <i className={`fa-solid fa-arrow-${trend} mr-1`}></i>
          {trendValue} 相比上月
        </div>
      )}
    </motion.div>
  );
}