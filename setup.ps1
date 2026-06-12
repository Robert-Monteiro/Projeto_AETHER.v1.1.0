# Script de Setup - AETHER
# Este script instala todas as dependências e inicia o projeto

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AETHER - Script de Instalação" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Verificar Node.js
Write-Host "`n[1/5] Verificando Node.js..." -ForegroundColor Yellow
$nodeCheck = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js não encontrado!" -ForegroundColor Red
    Write-Host "Por favor, instale Node.js manualmente em: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "Após instalar, feche e reabra o PowerShell, depois execute este script novamente." -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Node.js encontrado: $nodeCheck" -ForegroundColor Green

# 2. Instalar dependências do Backend
Write-Host "`n[2/5] Instalando dependências do Backend..." -ForegroundColor Yellow
Set-Location "C:\Projeto AETHER\backend"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao instalar dependências do Backend!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Backend instalado com sucesso!" -ForegroundColor Green

# 3. Instalar dependências do Frontend
Write-Host "`n[3/5] Instalando dependências do Frontend..." -ForegroundColor Yellow
Set-Location "C:\Projeto AETHER\frontend"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao instalar dependências do Frontend!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend instalado com sucesso!" -ForegroundColor Green

# 4. Criar/configurar .env do backend
Write-Host "`n[4/5] Configurando Backend..." -ForegroundColor Yellow
Set-Location "C:\Projeto AETHER\backend"
if (-Not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "⚠️  Arquivo .env criado. Por favor, edite-o com suas configurações de banco de dados." -ForegroundColor Yellow
}
Write-Host "✅ Backend configurado!" -ForegroundColor Green

# 5. Iniciar serviços
Write-Host "`n[5/5] Iniciando serviços..." -ForegroundColor Yellow
Write-Host "`n📌 Os servidores serão abertos em novos terminais..." -ForegroundColor Cyan

# Backend
Write-Host "🚀 Iniciando Backend em novo terminal..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location 'C:\Projeto AETHER\backend'; npm run dev"

# Aguardar um pouco
Start-Sleep -Seconds 3

# Frontend
Write-Host "🚀 Iniciando Frontend em novo terminal..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location 'C:\Projeto AETHER\frontend'; npm start"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ Setup Concluído!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000/aether" -ForegroundColor Yellow
Write-Host "Backend API: http://localhost:5000" -ForegroundColor Yellow
Write-Host "`nO sistema abrirá em novos terminais..." -ForegroundColor Cyan
