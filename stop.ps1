# Docker 停止脚本
# 使用方法：在 PowerShell 中运行 .\stop.ps1

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Flask AI Assistant - Docker 停止  " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "正在停止所有服务..." -ForegroundColor Yellow
docker-compose stop

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ 服务已停止" -ForegroundColor Green
    Write-Host ""
    Write-Host "如需完全清理（删除容器和数据），请运行：" -ForegroundColor Yellow
    Write-Host "  docker-compose down -v" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ 停止失败" -ForegroundColor Red
    Write-Host ""
}

pause
