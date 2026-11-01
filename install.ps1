# Windows PowerShell 安装启动脚本
# 推荐直接双击 start.bat，不要手动运行本文件。
# 若必须手跑：powershell -NoProfile -ExecutionPolicy Bypass -File install.ps1
$ErrorActionPreference = 'Stop'

try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}
try { chcp 65001 > $null } catch {}

Set-Location $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "未找到 Node.js。"
  Write-Host "请先从 https://nodejs.org 安装 Node.js 22 或更新版本，安装时勾选 Add to PATH，装完重开窗口再运行。"
  exit 1
}

$ver = node -v
$major = [int](($ver -replace '^v', '').Split('.')[0])
Write-Host "Node 版本：$ver"
if ($major -lt 22) {
  Write-Host "版本过低，需要 Node.js 22 或更新版本：https://nodejs.org"
  exit 1
}

if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
  Write-Host "已生成 .env，请在网页向导里填写配置。"
}

Write-Host ""
Write-Host "启动向导：http://127.0.0.1:8080/"
Write-Host "关闭本窗口即停止服务。"
Write-Host ""

Start-Process "http://127.0.0.1:8080/"

node src/index.js
