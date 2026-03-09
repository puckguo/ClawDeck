#!/bin/bash

# ClawDeck - OpenClaw Agent 配置管理系统
# 一键启动脚本：安装依赖、构建、启动服务、运行测试

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 路径定义
PROJECT_ROOT="/Users/godspeed/.openclaw/agent-config-ui"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
LOG_DIR="/tmp/agent-config-ui"

# 创建日志目录
mkdir -p "$LOG_DIR"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."

    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js"
        exit 1
    fi

    NODE_VERSION=$(node --version | cut -d'v' -f2)
    log_info "Node.js 版本: $NODE_VERSION"

    # 检查 npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装"
        exit 1
    fi

    log_success "依赖检查通过"
}

# 安装依赖
install_deps() {
    log_info "安装依赖..."

    # 根目录依赖
    if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
        log_info "安装根目录依赖..."
        cd "$PROJECT_ROOT"
        npm install
    fi

    # 后端依赖
    if [ ! -d "$BACKEND_DIR/node_modules" ]; then
        log_info "安装后端依赖..."
        cd "$BACKEND_DIR"
        npm install
    fi

    # 前端依赖
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        log_info "安装前端依赖..."
        cd "$FRONTEND_DIR"
        npm install
    fi

    log_success "依赖安装完成"
}

# 构建项目
build_project() {
    log_info "构建项目..."

    # 构建后端
    log_info "构建后端..."
    cd "$BACKEND_DIR"
    npm run build 2>&1 | tee "$LOG_DIR/backend-build.log"

    # 构建前端
    log_info "构建前端..."
    cd "$FRONTEND_DIR"
    npm run build 2>&1 | tee "$LOG_DIR/frontend-build.log"

    # 复制前端构建产物到后端
    log_info "合并构建产物..."
    cp -r "$FRONTEND_DIR/dist" "$BACKEND_DIR/"

    log_success "构建完成"
}

# 停止已有服务
cleanup() {
    log_info "清理已有进程..."

    # 查找并停止后端服务
    local pids=$(lsof -t -i:18888 2>/dev/null || true)
    if [ -n "$pids" ]; then
        kill $pids 2>/dev/null || true
        sleep 1
        log_info "已停止已有服务 (PID: $pids)"
    fi
}

# 启动服务
start_services() {
    log_info "启动服务..."

    cd "$BACKEND_DIR"

    # 启动后端服务
    node dist/index.js > "$LOG_DIR/backend.log" 2>&1 &
    BACKEND_PID=$!

    log_info "后端服务启动 (PID: $BACKEND_PID)"

    # 等待服务启动
    log_info "等待服务启动..."
    for i in {1..30}; do
        if curl -s http://localhost:18888/api/health > /dev/null; then
            log_success "服务启动成功！"
            return 0
        fi
        sleep 1
    done

    log_error "服务启动超时"
    exit 1
}

# 运行测试
run_tests() {
    log_info "运行 API 测试..."

    local BASE_URL="http://localhost:18888"
    local TEST_RESULTS=()

    # 测试1: 健康检查
    log_info "测试 1/5: 健康检查..."
    if curl -s "$BASE_URL/api/health" | grep -q '"success":true'; then
        log_success "✓ 健康检查通过"
        TEST_RESULTS+=("✓ 健康检查")
    else
        log_error "✗ 健康检查失败"
        TEST_RESULTS+=("✗ 健康检查")
    fi

    # 测试2: 获取 Agent 列表
    log_info "测试 2/5: 获取 Agent 列表..."
    local agents_response=$(curl -s "$BASE_URL/api/agents")
    if echo "$agents_response" | grep -q '"success":true'; then
        local count=$(echo "$agents_response" | grep -o '"count":[0-9]*' | cut -d':' -f2)
        log_success "✓ Agent 列表获取成功 (共 $count 个)"
        TEST_RESULTS+=("✓ Agent 列表 ($count 个)")
    else
        log_error "✗ Agent 列表获取失败"
        TEST_RESULTS+=("✗ Agent 列表")
    fi

    # 测试3: 获取单个 Agent
    log_info "测试 3/5: 获取单个 Agent..."
    local agent_response=$(curl -s "$BASE_URL/api/agents/dawang")
    if echo "$agent_response" | grep -q '"success":true'; then
        log_success "✓ 单个 Agent 获取成功"
        TEST_RESULTS+=("✓ 单个 Agent")
    else
        log_warn "✗ 单个 Agent 获取失败 (可能没有 dawang)"
        TEST_RESULTS+=("✗ 单个 Agent")
    fi

    # 测试4: 获取配置
    log_info "测试 4/5: 获取 Agent 配置..."
    local config_response=$(curl -s "$BASE_URL/api/config/dawang")
    if echo "$config_response" | grep -q '"success":true'; then
        log_success "✓ 配置获取成功"
        TEST_RESULTS+=("✓ 配置获取")
    else
        log_warn "✗ 配置获取失败 (可能没有 dawang)"
        TEST_RESULTS+=("✗ 配置获取")
    fi

    # 测试5: 监控数据
    log_info "测试 5/5: 获取监控数据..."
    local monitor_response=$(curl -s "$BASE_URL/api/monitoring/status")
    if echo "$monitor_response" | grep -q '"success":true'; then
        log_success "✓ 监控数据获取成功"
        TEST_RESULTS+=("✓ 监控数据")
    else
        log_error "✗ 监控数据获取失败"
        TEST_RESULTS+=("✗ 监控数据")
    fi

    # 打印测试摘要
    echo ""
    echo "========================================"
    log_info "测试结果摘要:"
    echo "========================================"
    for result in "${TEST_RESULTS[@]}"; do
        echo "  $result"
    done
    echo "========================================"
}

# 显示使用信息
show_info() {
    echo ""
    log_info "服务已启动！"
    echo ""
    echo "========================================"
    echo "  访问地址:"
    echo "    - ClawDeck: http://localhost:18888"
    echo "    - API 文档:   http://localhost:18888/api/health"
    echo ""
    echo "  日志文件:"
    echo "    - 后端日志: $LOG_DIR/backend.log"
    echo "    - 构建日志: $LOG_DIR/backend-build.log"
    echo "========================================"
    echo ""
    echo "按 Ctrl+C 停止服务"
}

# 捕获退出信号
trap cleanup EXIT

# 主函数
main() {
    echo "========================================"
    echo "  ClawDeck - 一键启动"
    echo "========================================"
    echo ""

    # 根据参数执行不同操作
    case "${1:-all}" in
        "install")
            check_dependencies
            install_deps
            ;;
        "build")
            build_project
            ;;
        "test")
            start_services
            run_tests
            ;;
        "start")
            cleanup
            start_services
            show_info
            # 保持脚本运行
            tail -f "$LOG_DIR/backend.log"
            ;;
        "all"|*)
            check_dependencies
            install_deps
            build_project
            cleanup
            start_services
            run_tests
            show_info
            # 保持脚本运行
            tail -f "$LOG_DIR/backend.log"
            ;;
    esac
}

# 运行主函数
main "$@"
