# RELEVO — Túnel HTTPS rápido para pruebas móviles con cámara y Service Worker
# Uso: .\scripts\tunnel.ps1

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " RELEVO — Quick Mobile HTTPS Tunnel (Cloudflare)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Requisitos:" -ForegroundColor Yellow
Write-Host "1. Frontend corriendo en http://localhost:5173"
Write-Host "2. Backend corriendo en http://localhost:3000"
Write-Host "3. Cloudflared instalado (o winget install Cloudflare.cloudflared)"
Write-Host ""
Write-Host "Iniciando túnel hacia Vite (:5173)..." -ForegroundColor Cyan
Write-Host "Copia la URL https://*.trycloudflare.com generada y ábrela en tu teléfono." -ForegroundColor Cyan
Write-Host ""

if (Get-Command cloudflared -ErrorAction SilentlyContinue) {
    cloudflared tunnel --url http://localhost:5173
} else {
    Write-Host "cloudflared no está instalado en este equipo." -ForegroundColor Red
    Write-Host "Instálalo ejecutando: winget install Cloudflare.cloudflared" -ForegroundColor Yellow
    Write-Host "O usa ngrok: ngrok http 5173" -ForegroundColor Yellow
}
