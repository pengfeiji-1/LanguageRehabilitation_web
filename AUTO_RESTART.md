# 🚀 WAB管理系统 - 自动重启功能

## 📋 功能概述

自动重启功能确保开发服务器在以下情况下自动恢复：
- 代码文件变更时自动重启（热重载）
- 进程意外退出时自动重启
- HTTP服务无响应时自动重启
- 端口被占用时自动清理并重启

## 🛠️ 使用方法

### 启动自动重启服务
```bash
# 方法1：使用npm脚本
npm start

# 方法2：直接运行脚本
./start-dev.sh
```

### 检查服务状态
```bash
# 方法1：使用npm脚本
npm run status

# 方法2：直接运行脚本
./start-dev.sh status
```

### 停止服务
```bash
# 方法1：使用npm脚本
npm stop

# 方法2：直接运行脚本
./start-dev.sh stop

# 方法3：在运行的终端按 Ctrl+C
```

### 重启服务
```bash
# 方法1：使用npm脚本
npm restart

# 方法2：直接运行脚本
./start-dev.sh restart
```

## 📁 相关文件

- `start-dev.sh` - 主要的自动重启脚本
- `nodemon.json` - Nodemon配置文件
- `dev-server.log` - 服务器运行日志
- `dev-server.pid` - 进程ID文件

## 🔧 配置说明

### Nodemon配置 (`nodemon.json`)
- **监控目录**: `src`, `public`, `index.html`, `vite.config.ts` 等
- **监控文件类型**: `.ts`, `.tsx`, `.js`, `.jsx`, `.css`, `.html`, `.json`
- **重启延迟**: 2秒
- **忽略目录**: `node_modules`, `dist`, `build`, `*.log`, `.git`

### 自动重启脚本功能
- **进程监控**: 每10秒检查一次进程状态
- **HTTP健康检查**: 检查3000端口是否响应
- **端口冲突处理**: 自动清理占用的端口
- **日志记录**: 详细的启动/停止/错误日志
- **优雅关闭**: 支持SIGINT和SIGTERM信号

## 📊 监控信息

### 实时状态检查
```bash
# 查看进程
ps aux | grep -E "(nodemon|vite)" | grep -v grep

# 查看端口占用
netstat -tlnp | grep :3000

# 查看最新日志
tail -f dev-server.log
```

### 日志文件位置
- **服务器日志**: `./dev-server.log`
- **进程PID**: `./dev-server.pid`

## 🚨 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 手动清理端口
   pkill -f "vite --host --port 3000"
   ```

2. **权限问题**
   ```bash
   # 确保脚本有执行权限
   chmod +x start-dev.sh
   ```

3. **Node.js版本问题**
   ```bash
   # 检查Node.js版本
   node --version
   npm --version
   ```

### 重置服务
```bash
# 完全重置（停止所有相关进程）
./start-dev.sh stop
pkill -f "nodemon"
pkill -f "vite"
rm -f dev-server.pid dev-server.log
./start-dev.sh
```

## 🎯 最佳实践

1. **推荐使用自动重启模式进行开发**
   ```bash
   npm start
   ```

2. **生产环境构建**
   ```bash
   npm run build
   ```

3. **调试模式**
   ```bash
   # 查看详细日志
   tail -f dev-server.log
   ```

4. **代码变更测试**
   - 修改`src`目录下的任何文件
   - 观察终端日志，确认自动重启
   - 检查浏览器是否自动刷新

## 📞 支持

如果遇到问题：
1. 检查 `dev-server.log` 日志文件
2. 使用 `npm run status` 检查服务状态
3. 尝试 `npm restart` 重启服务

---

🎉 **现在您可以专注于代码开发，无需担心服务器重启问题！**
