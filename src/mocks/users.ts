export interface User {
  id: string;
  name: string;
  userName: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  registerTime: string;
  lastActiveTime: string;
  email: string;
  phone: string;
  trainingRecords: TrainingRecord[];
}

export interface TrainingRecord {
  id: string;
  date: string;
  duration: number;
  score: number;
  videoUrl: string;
  questions: Question[];
}

export interface Question {
  time: number;
  question: string;
  userAnswer: string;
  correct: boolean;
}

// 生成模拟用户数据
export const generateMockUsers = (): User[] => {
  const genders: ('male' | 'female' | 'other')[] = ['male', 'female', 'other'];
  const users: User[] = [];
  
  for (let i = 1; i <= 50; i++) {
    // 生成训练记录
    const trainingRecords: TrainingRecord[] = [];
    const recordCount = Math.floor(Math.random() * 5) + 1; // 1-5条训练记录
    
    for (let j = 1; j <= recordCount; j++) {
      // 生成题目数据
      const questions: Question[] = [];
      const questionCount = Math.floor(Math.random() * 5) + 3; // 3-7个问题
      
      for (let k = 1; k <= questionCount; k++) {
        questions.push({
          time: k * 10, // 每10秒一个问题
          question: `训练问题 ${k}`,
          userAnswer: `用户答案 ${k}`,
          correct: Math.random() > 0.3 // 70%正确率
        });
      }
      
      // 生成日期（过去30天内）
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      trainingRecords.push({
        id: `record-${i}-${j}`,
        date: date.toISOString(),
        duration: questionCount * 10 + 30, // 持续时间
        score: Math.floor(Math.random() * 40) + 60, // 60-100分
        videoUrl: `https://example.com/videos/training-${i}-${j}.mp4`,
        questions
      });
    }
    
    // 生成注册时间（过去3个月内）
    const registerDate = new Date();
    registerDate.setDate(registerDate.getDate() - Math.floor(Math.random() * 90));
    
    // 生成最近活跃时间
    const lastActiveDate = new Date();
    lastActiveDate.setDate(lastActiveDate.getDate() - Math.floor(Math.random() * 7));
    
    // 生成用户名
    const familyNames = ['张', '王', '李', '赵', '陈', '杨', '黄', '吴', '周', '徐'];
    const givenNames = ['伟', '芳', '娜', '秀英', '敏', '静', '强', '磊', '军', '洋'];
    const userName = familyNames[Math.floor(Math.random() * familyNames.length)] + 
                     givenNames[Math.floor(Math.random() * givenNames.length)];
    
    users.push({
      id: `user-${i}`,
      name: `用户${i}`,
      userName,
      gender: genders[Math.floor(Math.random() * genders.length)],
      age: Math.floor(Math.random() * 30) + 18, // 18-48岁
      registerTime: registerDate.toISOString(),
      lastActiveTime: lastActiveDate.toISOString(),
      email: `user${i}@example.com`,
      phone: `13${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      trainingRecords
    });
  }
  
  return users;
};

// 导出模拟用户数据
export const mockUsers = generateMockUsers();

// 根据ID获取用户
export const getUserById = (id: string): User | undefined => {
  return mockUsers.find(user => user.id === id);
};

// 根据ID获取训练记录
export const getTrainingRecordById = (userId: string, recordId: string): TrainingRecord | undefined => {
  const user = getUserById(userId);
  return user?.trainingRecords.find(record => record.id === recordId);
};