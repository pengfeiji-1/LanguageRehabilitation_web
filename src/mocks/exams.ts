export interface Exam {
  id: string;
  userId: string;
  username: string;
  sessionId: string;
  paperId: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  questionCount: number;
  score: number;
  completedAt: string;
}

// 生成模拟试卷数据
export const generateMockExams = (): Exam[] => {
  const exams: Exam[] = [];
  
  for (let i = 1; i <= 15; i++) {
    // 生成创建时间（过去6个月内）
    const createDate = new Date();
    createDate.setDate(createDate.getDate() - Math.floor(Math.random() * 180));
    
    // 生成更新时间（创建时间之后）
    const updateDate = new Date(createDate);
    updateDate.setDate(updateDate.getDate() + Math.floor(Math.random() * 30));
    
     // 随机生成用户ID和会话ID
     const userId = `user-${Math.floor(Math.random() * 1000) + 1}`;
     const sessionId = `session-${Math.floor(Math.random() * 10000) + 1000}`;
     const paperId = `paper-${Math.floor(Math.random() * 100) + 1}`;
     
     // 生成用户名
     const familyNames = ['张', '王', '李', '赵', '陈', '杨', '黄', '吴', '周', '徐'];
     const givenNames = ['伟', '芳', '娜', '秀英', '敏', '静', '强', '磊', '军', '洋'];
     const username = familyNames[Math.floor(Math.random() * familyNames.length)] + 
                      givenNames[Math.floor(Math.random() * givenNames.length)];
                      
     // 生成完成时间（创建时间之后）
     const completeDate = new Date(createDate);
     completeDate.setDate(completeDate.getDate() + Math.floor(Math.random() * 15));
     
     exams.push({
       id: `record-${i}`,
       userId,
       username,
       sessionId,
       paperId,
       title: `试卷 ${i}: ${['英语听力', '阅读理解', '口语训练', '词汇测试', '语法练习'][Math.floor(Math.random() * 5)]}`,
       description: `这是一份${['初级', '中级', '高级'][Math.floor(Math.random() * 3)]}难度的${['英语听力', '阅读理解', '口语训练'][Math.floor(Math.random() * 3)]}试卷`,
       createdAt: createDate.toISOString(),
       updatedAt: updateDate.toISOString(),
       questionCount: Math.floor(Math.random() * 20) + 10, // 10-30题
       score: Math.floor(Math.random() * 40) + 60, // 60-100分
       completedAt: completeDate.toISOString()
     });
  }
  
  return exams;
};

// 导出模拟试卷数据
export const mockExams = generateMockExams();