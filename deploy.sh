#!/bin/bash
# ListenMusic 一键部署到正式环境
# 用法: bash deploy.sh
# 部署前端到 GitHub Pages，后端到 Hugging Face Spaces

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
[ -f "$ROOT_DIR/.env" ] && source "$ROOT_DIR/.env"
HF_USER="tang2000"
HF_SPACE="JollyMusic"
HF_TOKEN="${HF_TOKEN:?请先设置环境变量 HF_TOKEN，例如: export HF_TOKEN=hf_xxxxx}"
GITHUB_REPO="git@github.com:JollyTang/JollyMusic.git"
DEPLOY_TMP="/tmp/lm-deploy-$$"

echo "========================================="
echo "  ListenMusic 正式环境一键部署"
echo "========================================="
echo ""

# ---- 后端部署 ----
echo "[1/4] 准备后端部署文件..."
rm -rf "$DEPLOY_TMP"
mkdir -p "$DEPLOY_TMP/backend"

cp "$ROOT_DIR/server/package.json" "$DEPLOY_TMP/backend/"
cp "$ROOT_DIR/server/package-lock.json" "$DEPLOY_TMP/backend/" 2>/dev/null || true
cp "$ROOT_DIR/server/tsconfig.json" "$DEPLOY_TMP/backend/"
cp "$ROOT_DIR/server/Dockerfile" "$DEPLOY_TMP/backend/"
cp -r "$ROOT_DIR/server/src" "$DEPLOY_TMP/backend/"

cat > "$DEPLOY_TMP/backend/README.md" << 'HFEOF'
---
title: JollyMusic
emoji: 🎵
colorFrom: pink
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

ListenMusic API - B站音频代理服务
HFEOF

echo "[2/4] 推送后端到 Hugging Face..."
cd "$DEPLOY_TMP/backend"
git init -q
git checkout -b main 2>/dev/null || git branch -m main
git add -A
git commit -q -m "deploy backend $(date '+%Y-%m-%d %H:%M')"
git remote add hf "https://${HF_USER}:${HF_TOKEN}@huggingface.co/spaces/${HF_USER}/${HF_SPACE}"

if git push hf main --force 2>&1; then
  echo "  ✓ 后端部署成功"
else
  echo "  ✗ 后端推送失败（可能需要在 Windows 终端执行，WSL 网络不通 HuggingFace）"
  echo "  手动推送: cd $DEPLOY_TMP/backend && git push hf main --force"
fi

# ---- 前端部署 ----
echo "[3/4] 构建前端 H5..."
cd "$ROOT_DIR"
PREV_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$PREV_BRANCH" != "main" ]; then
  echo "  当前分支: $PREV_BRANCH，切换到 main 分支构建..."
  git checkout main
fi
cd "$ROOT_DIR/app"
if [ ! -d "node_modules" ]; then
  echo "  安装前端依赖..."
  npm install --silent
fi
GITHUB_PAGES=1 npm run build:h5 2>&1 | tail -1

echo "[4/4] 推送前端到 GitHub Pages..."
cd "$ROOT_DIR/app/dist/build/h5"
touch .nojekyll
rm -rf .git
git init -q
git checkout -b gh-pages
git add -A
git commit -q -m "deploy frontend $(date '+%Y-%m-%d %H:%M')"
git remote add origin "$GITHUB_REPO"

if git push origin gh-pages --force 2>&1; then
  echo "  ✓ 前端部署成功"
else
  echo "  ✗ 前端推送失败"
  exit 1
fi

# ---- 触发 APK 构建 ----
echo "[5/5] 推送代码到 GitHub 触发 APK 构建..."
cd "$ROOT_DIR"
git push origin main 2>&1 && echo "  ✓ 已推送到 main，GitHub Actions 将自动构建 APK" || {
  echo "  ✗ 推送 main 失败，APK 构建未触发"
}

# 清理
rm -rf "$DEPLOY_TMP"
rm -rf "$ROOT_DIR/app/dist"

# 切回原分支
if [ -n "$PREV_BRANCH" ] && [ "$PREV_BRANCH" != "main" ]; then
  cd "$ROOT_DIR"
  git checkout "$PREV_BRANCH"
  echo "  已切回分支: $PREV_BRANCH"
fi

echo ""
echo "========================================="
echo "  部署完成！"
echo "  前端: https://jollytang.github.io/JollyMusic/"
echo "  后端: https://${HF_USER}-$(echo $HF_SPACE | tr '[:upper:]' '[:lower:]').hf.space"
echo "  APK:  推送后在 GitHub Actions 的 Artifacts 中下载"
echo "  GitHub Pages 需要 1-2 分钟生效"
echo "========================================="
