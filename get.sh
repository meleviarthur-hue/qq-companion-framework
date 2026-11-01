#!/usr/bin/env bash
# 一行装好并启动：
#   curl -fsSL https://raw.githubusercontent.com/meleviarthur-hue/qq-companion-framework/main/get.sh | bash
#
# 可用环境变量覆盖：
#   QQCF_REPO=meleviarthur-hue/qq-companion-framework   QQCF_BRANCH=main   QQCF_DIR=~/qq-companion-framework
set -euo pipefail

REPO="${QQCF_REPO:-meleviarthur-hue/qq-companion-framework}"
BRANCH="${QQCF_BRANCH:-main}"
DEST="${QQCF_DIR:-$HOME/qq-companion-framework}"

say() { printf '%s\n' "$*"; }

command -v curl >/dev/null 2>&1 || { say "缺少 curl，先装 curl 再来。"; exit 1; }
command -v tar  >/dev/null 2>&1 || { say "缺少 tar，先装 tar 再来。"; exit 1; }

if command -v node >/dev/null 2>&1; then
  NODE_V="$(node -v)"
  say "Node：$NODE_V"
  case "$NODE_V" in
    v1[0-9].*|v2[01].*) say "!! Node 版本偏低，需要 22 或更新。下载：https://nodejs.org/zh-cn/download"; exit 1 ;;
  esac
else
  say "!! 没找到 Node.js。先装 Node 22 再重跑这一行：https://nodejs.org/zh-cn/download"
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

say "下载 $REPO@$BRANCH ..."
curl -fsSL "https://codeload.github.com/$REPO/tar.gz/refs/heads/$BRANCH" -o "$TMP/pkg.tar.gz"
tar -xzf "$TMP/pkg.tar.gz" -C "$TMP"
SRC="$(find "$TMP" -maxdepth 1 -mindepth 1 -type d | head -1)"
[ -n "$SRC" ] || { say "解压失败。"; exit 1; }

# 已有安装就只更新代码，不碰 .env 和 data/（里面是客户的 Key 和聊天记录）
mkdir -p "$DEST"
if [ -f "$DEST/.env" ]; then
  say "检测到已有配置，保留 .env 和 data/，只更新代码。"
  cp -R "$SRC"/. "$DEST"/
else
  cp -R "$SRC"/. "$DEST"/
  [ -f "$DEST/.env" ] || cp "$DEST/.env.example" "$DEST/.env"
fi

cd "$DEST"
say ""
say "装好了：$DEST"
say "打开向导填 Key 和主人 QQ：http://127.0.0.1:8080/"
say ""
exec node src/index.js
