#!/usr/bin/env bash
# macOS / Linux 安装启动脚本（在解压后的目录里运行：bash install.sh）
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "未找到 Node.js，请先安装 Node.js 22 或更新版本："
  echo "  macOS: brew install node"
  echo "  Ubuntu/Debian: 参考 https://nodejs.org/zh-cn/download"
  exit 1
fi
echo "Node 版本：$(node -v)"
if [ ! -f .env ]; then cp .env.example .env; echo "已生成 .env，请先填写或用网页向导填写。"; fi
echo "启动向导：http://127.0.0.1:8080/"
node src/index.js
