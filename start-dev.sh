#!/bin/bash

# WAB管理系统开发服务器自动重启脚本
# 功能：监控开发服务器状态，自动重启异常退出的进程

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/dev-server.log"
PID_FILE="$SCRIPT_DIR/dev-server.pid"
PORT=3000

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# 清理函数
cleanup() {
    log "正在停止开发服务器..."
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            kill -TERM $PID
            sleep 2
            if ps -p $PID > /dev/null 2>&1; then
                kill -KILL $PID
            fi
        fi
        rm -f "$PID_FILE"
    fi
    
    # 强制清理端口
    pkill -f "vite --host --port $PORT" 2>/dev/null
    
    success "开发服务器已停止"
    exit 0
}

# 检查端口是否被占用
check_port() {
    if netstat -tlnp 2>/dev/null | grep -q ":$PORT "; then
        warn "端口 $PORT 已被占用，正在清理..."
        pkill -f "vite --host --port $PORT" 2>/dev/null
        sleep 2
    fi
}

# 启动开发服务器
start_server() {
    log "启动开发服务器..."
    cd "$SCRIPT_DIR"
    
    check_port
    
    # 使用nodemon启动服务器
    npm run dev:auto > "$LOG_FILE" 2>&1 &
    SERVER_PID=$!
    
    # 保存PID
    echo $SERVER_PID > "$PID_FILE"
    
    # 等待服务器启动
    sleep 5
    
    # 检查服务器是否成功启动
    if ps -p $SERVER_PID > /dev/null 2>&1 && curl -s "http://localhost:$PORT" > /dev/null; then
        success "开发服务器启动成功！PID: $SERVER_PID"
        success "访问地址: http://localhost:$PORT"
        return 0
    else
        error "开发服务器启动失败"
        return 1
    fi
}

# 监控服务器状态
monitor_server() {
    while true; do
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            
            # 检查进程是否还在运行
            if ! ps -p $PID > /dev/null 2>&1; then
                error "开发服务器进程已退出，正在重启..."
                start_server
            else
                # 检查HTTP服务是否正常
                if ! curl -s "http://localhost:$PORT" > /dev/null; then
                    warn "HTTP服务无响应，重启服务器..."
                    kill -TERM $PID 2>/dev/null
                    sleep 2
                    start_server
                fi
            fi
        else
            warn "PID文件不存在，启动服务器..."
            start_server
        fi
        
        sleep 10  # 每10秒检查一次
    done
}

# 信号处理
trap cleanup SIGINT SIGTERM

# 主程序
main() {
    log "WAB管理系统开发服务器自动重启脚本启动"
    log "监控端口: $PORT"
    log "日志文件: $LOG_FILE"
    
    # 初始启动
    start_server
    
    if [ $? -eq 0 ]; then
        log "开始监控服务器状态..."
        monitor_server
    else
        error "初始启动失败，退出程序"
        exit 1
    fi
}

# 检查参数
case "${1:-}" in
    "stop")
        cleanup
        ;;
    "status")
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if ps -p $PID > /dev/null 2>&1; then
                success "开发服务器正在运行 (PID: $PID)"
                if curl -s "http://localhost:$PORT" > /dev/null; then
                    success "HTTP服务正常响应"
                else
                    warn "HTTP服务无响应"
                fi
            else
                error "开发服务器进程不存在"
            fi
        else
            error "开发服务器未运行"
        fi
        ;;
    "restart")
        cleanup
        sleep 2
        main
        ;;
    *)
        main
        ;;
esac
