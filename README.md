# 语言康复训练系统后台管理界面

项目编号: 7538392851212189987

本项目是由 [网站开发专家](https://space.coze.cn/) 创建的语言康复训练系统管理后台。

[**项目地址**](https://space.coze.cn/task/7538392851212189987)

## 项目概述

语言康复训练系统后台是一个基于React + TypeScript + Vite的现代化Web应用，为语言康复评估提供完整的管理功能。

### 主要功能

- **用户管理**: 完整的用户注册、登录、角色管理系统
- **评估管理**: WAB评估报告的查看、管理和重评估功能
- **音频播放**: 安全的音频播放系统，支持评估音频的播放和管理
- **响应式设计**: 适配桌面、平板和移动设备的完整响应式界面
- **进度跟踪**: 实时的重评估进度追踪和状态显示

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式框架**: Tailwind CSS
- **路由管理**: React Router DOM
- **状态管理**: React Hooks + Context API
- **HTTP客户端**: Fetch API
- **通知系统**: React Hot Toast
- **图标库**: Font Awesome

## 项目结构

```
src/
├── components/           # 通用组件
│   ├── Layout.tsx       # 主布局组件
│   ├── ReevaluationProgress.tsx  # 重评估进度组件
│   └── UserDropdownMenu.tsx     # 用户下拉菜单
├── pages/               # 页面组件
│   ├── Login.tsx        # 登录页面
│   ├── Register.tsx     # 注册页面
│   └── wab/            # WAB相关页面
│       ├── WabReportList.tsx     # 评估报告列表
│       ├── EvaluationDetail.tsx  # 评估详情页
│       └── components/           # WAB专用组件
│           └── AudioPlayer.tsx   # 音频播放器
├── lib/                # 核心库
│   ├── api.ts          # API客户端
│   ├── auth.ts         # 认证管理
│   ├── reevaluation.ts # 重评估功能
│   └── toast.ts        # 通知系统
├── utils/              # 工具函数
│   └── audioUtils.ts   # 音频处理工具
└── types/              # TypeScript类型定义
    └── wab.ts          # WAB相关类型
```

## 开发环境搭建

### 环境要求

- Node.js >= 16.0.0
- npm >= 7.0.0

### 安装步骤

1. **克隆项目**
   ```bash
   cd /var/www/admin
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```

4. **访问应用**
   - 开发环境: http://localhost:3000
   - 生产环境: 根据部署配置访问

### 构建生产版本

```bash
npm run build
```

## 部署指南

### 开发环境部署

```bash
# 进入项目目录
cd /var/www/admin

# 安装依赖（仅首次需要）
npm install

# 启动开发服务器
npm run dev
```

### 生产环境部署

```bash
# 构建生产版本
npm run build

# 构建产物在 dist/ 目录
```

### 后台运行

```bash
# 后台启动服务
cd /var/www/admin && npm run dev &

# 使用 nohup 确保服务持续运行
nohup npm run dev > logs/admin.log 2>&1 &
```

### 服务管理

```bash
# 停止服务
pkill -f "vite --host --port 3000"

# 检查服务状态
ps aux | grep vite | grep -v grep

# 检查端口占用
ss -tulpn | grep :3000

# 测试访问
curl -I http://localhost:3000
```

## 最新功能更新

### 🎯 重评估系统 (2024年10月)
- **批量重评估**: 支持整个试卷的重评估
- **单题重评估**: 支持单个题目的重评估
- **实时进度**: 简洁的进度条显示评估状态
- **智能错误处理**: 完善的错误提示和重试机制

### 🎵 音频播放系统
- **安全认证**: 基于JWT的三步音频认证流程
- **智能缓存**: Blob URL缓存机制，优化播放性能
- **错误容错**: 完整的错误处理和用户提示
- **响应式播放**: 适配各种设备的播放控件

### 📱 响应式设计
- **登录界面**: 完全响应式的登录和注册界面
- **主布局**: 自适应侧边栏和导航栏
- **数据表格**: 移动端友好的数据展示
- **交互优化**: 触屏设备的交互体验优化

### 🔧 系统优化
- **代码清理**: 移除冗余代码和未使用的组件
- **性能优化**: 优化构建大小和加载性能
- **错误处理**: 统一的错误处理和用户反馈
- **类型安全**: 完整的TypeScript类型定义

## API集成

### 认证系统
- JWT Token管理
- 自动Token刷新
- 权限验证

### 评估API
- 获取评估列表
- 查看评估详情
- 重评估功能

### 音频API
- 获取音频签名URL
- 安全音频下载
- 音频元数据管理

## 开发规范

### 代码风格
- 使用TypeScript严格模式
- 遵循ESLint规则
- 组件采用函数式写法
- 使用Hooks管理状态

### Git提交规范
```bash
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建配置等
```

### 组件开发规范
1. 使用TypeScript定义Props接口
2. 提供默认参数和错误处理
3. 添加loading和error状态
4. 支持className自定义样式
5. 添加适当的注释和文档

## 故障排除

### 常见问题

1. **启动失败**
   - 检查Node.js版本
   - 清理node_modules重新安装
   - 检查端口是否被占用

2. **构建失败**
   - 检查TypeScript类型错误
   - 清理缓存: `rm -rf dist node_modules package-lock.json`
   - 重新安装依赖

3. **音频播放问题**
   - 检查后端音频API状态
   - 验证Token是否有效
   - 查看浏览器控制台错误

4. **登录问题**
   - 检查后端认证服务
   - 清理本地存储
   - 验证API接口状态

### 调试技巧

1. **启用详细日志**
   ```bash
   # 开发环境查看详细输出
   npm run dev -- --debug
   ```

2. **检查网络请求**
   - 打开浏览器开发者工具
   - 查看Network标签
   - 检查API请求和响应

3. **查看控制台日志**
   - 音频相关日志会显示详细的认证流程
   - 重评估功能有完整的进度日志
   - 错误信息包含详细的错误码和描述

## 贡献指南

1. Fork项目
2. 创建功能分支: `git checkout -b feature/新功能名称`
3. 提交代码: `git commit -m 'feat: 添加新功能'`
4. 推送分支: `git push origin feature/新功能名称`
5. 提交Pull Request

## 许可证

本项目采用 MIT 许可证。详情请参见 [LICENSE](LICENSE) 文件。

## 联系方式

如有问题或建议，请联系开发团队。

---

**最后更新时间**: 2024年10月21日  
**版本**: 1.2.0  
**维护状态**: 活跃开发中