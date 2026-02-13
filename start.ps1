# Docker 快速启动脚本
# 使用方法：在 PowerShell 中运行 .\start.ps1

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Flask AI Assistant - Docker 启动  " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Docker 是否运行
Write-Host "检查 Docker 状态..." -ForegroundColor Yellow
$dockerRunning = docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker 未运行，请先启动 Docker Desktop" -ForegroundColor Red
    Write-Host ""
    Write-Host "请按照以下步骤操作：" -ForegroundColor Yellow
    Write-Host "1. 启动 Docker Desktop 应用" -ForegroundColor White
    Write-Host "2. 等待 Docker 完全启动（托盘图标不再转动）" -ForegroundColor White
    Write-Host "3. 重新运行此脚本" -ForegroundColor White
    Write-Host ""
    pause
    exit 1
}

Write-Host "✓ Docker 正在运行" -ForegroundColor Green
Write-Host ""

# 创建数据目录（存储在 D 盘项目目录中）
Write-Host "创建数据目录..." -ForegroundColor Yellow
$dataDir = ".\docker-data\redis"
if (-not (Test-Path $dataDir)) {
    New-Item -Path $dataDir -ItemType Directory -Force | Out-Null
    Write-Host "✓ 已创建数据目录: $dataDir" -ForegroundColor Green
} else {
    Write-Host "✓ 数据目录已存在: $dataDir" -ForegroundColor Green
}
Write-Host ""

# 检查是否存在旧容器
Write-Host "检查现有容器..." -ForegroundColor Yellow
$existingContainers = docker-compose ps -q
if ($existingContainers) {
    Write-Host "发现现有容器，正在停止..." -ForegroundColor Yellow
    docker-compose down
    Write-Host "✓ 已停止旧容器" -ForegroundColor Green
}

# 构建并启动服务
Write-Host ""
Write-Host "正在构建并启动服务..." -ForegroundColor Yellow
Write-Host "这可能需要几分钟时间（首次运行）..." -ForegroundColor Gray
Write-Host ""

docker-compose up -d --build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "  ✓ 服务启动成功！" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "访问地址：" -ForegroundColor Cyan
    Write-Host "  Flask 应用: http://localhost:5000" -ForegroundColor White
    Write-Host "  Redis:      localhost:6379" -ForegroundColor White
    Write-Host ""
    Write-Host "常用命令：" -ForegroundColor Cyan
    Write-Host "  查看日志:   docker-compose logs -f" -ForegroundColor White
    Write-Host "  停止服务:   docker-compose stop" -ForegroundColor White
    Write-Host "  重启服务:   docker-compose restart" -ForegroundColor White
    Write-Host "  完全清理:   docker-compose down -v" -ForegroundColor White
    Write-Host ""
    
    # 等待服务完全启动
    Write-Host "等待服务完全启动..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # 检查服务健康状态
    Write-Host "检查服务状态..." -ForegroundColor Yellow
    docker-compose ps
    
    Write-Host ""
    Write-Host "按任意键在浏览器中打开应用..." -ForegroundColor Cyan
    pause
    Start-Process "http://localhost:5000"
    
} else {
    Write-Host ""
    Write-Host "❌ 服务启动失败" -ForegroundColor Red
    Write-Host ""
    Write-Host "请查看错误日志：" -ForegroundColor Yellow
    docker-compose logs
    Write-Host ""
    pause
    exit 1
}
