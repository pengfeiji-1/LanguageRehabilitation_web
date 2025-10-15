# 语言康复训练系统后台

项目编号: 7538392851212189987

本项目是由 [网站开发专家](https://space.coze.cn/) 创建.

[**项目地址**](https://space.coze.cn/task/7538392851212189987)

## 本地开发

### 环境准备

- 安装 [Node.js](https://nodejs.org/en)
- 安装 [pnpm](https://pnpm.io/installation)

### 操作步骤

- 安装依赖

```sh
pnpm install
```

- 启动 Dev Server

```sh
pnpm run dev
```

- 在浏览器访问 http://localhost:3000



admin服务启动指南
首次启动（全新环境）
# 进入项目目录
cd /var/www/admin

# 安装依赖（仅首次需要）
npm install

# 启动开发服务器
npm run dev

2. 日常启动（依赖已安装）
# 进入项目目录
cd /var/www/admin

# 启动服务
npm run dev



3. 后台运行
# 后台启动服务
cd /var/www/admin && npm run dev &

# 或使用 nohup 确保服务持续运行
nohup npm run dev > logs/admin.log 2>&1 &

停止服务
# 查找并停止Vite进程
pkill -f "vite --host --port 3000"

# 或者找到进程ID后停止
ps aux | grep vite | grep -v grep
kill <PID>

重启服务
# 停止现有服务
pkill -f "vite --host --port 3000"

# 重新启动
cd /var/www/admin && npm run dev

检查服务状态
# 检查进程
ps aux | grep vite | grep -v grep

# 检查端口
ss -tulpn | grep :3000

# 测试访问
curl -I http://localhost:3000