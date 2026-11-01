# Windows PowerShell 安装启动脚本（在解压后的目录里右键“使用 PowerShell 运行”，或执行：powershell -ExecutionPolicy Bypass -File install.ps1）
Set-Location $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "未找到 Node.js，请先从 https://nodejs.org 安装 Node.js 22 或更新版本，然后重新运行本脚本。"
  exit 1
}
Write-Host "Node 版本：$(node -v)"
if (-not (Test-Path .env)) { Copy-Item .env.example .env; Write-Host "已生成 .env，请先填写或用网页向导填写。" }
Write-Host "启动向导：http://127.0.0.1:8080/"
Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile","-Command","Start-Sleep 2; Start-Process 'http://127.0.0.1:8080/'"
node src/index.js
