#!/bin/bash
# ListenMusic 本地开发一键启动
# 用法: bash dev.sh

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================="
echo "  ListenMusic 本地开发环境启动"
echo "========================================="

# 检查依赖
if [ ! -d "$ROOT_DIR/server/node_modules" ]; then
  echo "[1/3] 安装后端依赖..."
  cd "$ROOT_DIR/server" && npm install
else
  echo "[1/3] 后端依赖已就绪"
fi

if [ ! -d "$ROOT_DIR/app/node_modules" ]; then
  echo "[2/3] 安装前端依赖..."
  cd "$ROOT_DIR/app" && npm install
else
  echo "[2/3] 前端依赖已就绪"
fi

# 启动后端
echo "[3/3] 启动服务..."
echo ""

cd "$ROOT_DIR/server"
npm run dev &
SERVER_PID=$!

sleep 2

# 启动前端
cd "$ROOT_DIR/app"
npm run dev:h5 &
APP_PID=$!

echo ""
echo "========================================="
echo "  启动完成！"
echo "  后端: http://localhost:3001"
echo "  前端: http://localhost:5173"
echo "  按 Ctrl+C 停止所有服务"
echo "========================================="

cleanup() {
  echo ""
  echo "正在停止服务..."
  kill $SERVER_PID $APP_PID 2>/dev/null
  wait $SERVER_PID $APP_PID 2>/dev/null
  echo "已停止"
}

trap cleanup EXIT INT TERM
wait
