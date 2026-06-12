@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

REM Get the script root directory.
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

REM Parse action: start (default), stop, restart, status.
set "ACTION=start"
if /I "%~1"=="stop" set "ACTION=stop"
if /I "%~1"=="restart" set "ACTION=restart"
if /I "%~1"=="status" set "ACTION=status"
if /I "%~1"=="help" goto help

if /I "%ACTION%"=="stop" (
    call :stopServers
    goto finish
)
if /I "%ACTION%"=="status" (
    call :showStatus
    goto finish
)
if /I "%ACTION%"=="restart" (
    call :stopServers
)

REM Ensure Node and npm are available.
call :checkCommand node
if errorlevel 1 goto error
call :checkCommand npm
if errorlevel 1 goto error

REM Install dependencies if needed.
echo.
echo Verificando dependencias do backend...
call :installDependencies "%ROOT%\backend"
if errorlevel 1 goto error

echo.
echo Verificando dependencias do frontend...
call :installDependencies "%ROOT%\frontend"
if errorlevel 1 goto error

REM Start backend and frontend in separate windows.
echo.
echo Iniciando backend...
start "AETHER Backend" cmd /k "cd /d "%ROOT%\backend" && npm run dev"

echo.
echo Iniciando frontend...
set "HOST="
start "AETHER Frontend" cmd /k "cd /d "%ROOT%\frontend" && npm start"

REM Wait for the servers to be ready.
echo.
echo Aguardando backend em http://localhost:5000/health ...
call :waitForUrl "http://localhost:5000/health" 30
if errorlevel 1 (
    echo.
    echo ERRO: Backend nao respondeu dentro de 30 segundos.
    goto finish
)

echo.
echo Aguardando frontend em http://localhost:3000 ...
call :waitForUrl "http://localhost:3000" 30
if errorlevel 1 (
    echo.
    echo ERRO: Frontend nao respondeu dentro de 30 segundos.
    goto finish
)

echo.
echo Ambos os servidores estao no ar.
start "AETHER" "http://localhost:3000"

goto finish

:stopServers
    echo.
    echo Encerrando servidores AETHER...
    taskkill /FI "WINDOWTITLE eq AETHER Backend" /T /F > nul 2>&1
    taskkill /FI "WINDOWTITLE eq AETHER Frontend" /T /F > nul 2>&1
    taskkill /IM node.exe /FI "WINDOWTITLE eq AETHER Backend" /T /F > nul 2>&1
    taskkill /IM node.exe /FI "WINDOWTITLE eq AETHER Frontend" /T /F > nul 2>&1
    echo Servidores encerrados.
    exit /b 0

:showStatus
    echo.
    echo Verificando o status dos servidores...
    call :waitForUrl "http://localhost:5000/health" 5
    if errorlevel 0 (
        echo Backend: ativo em http://localhost:5000
    ) else (
        echo Backend: nao respondendo
    )
    call :waitForUrl "http://localhost:3000" 5
    if errorlevel 0 (
        echo Frontend: ativo em http://localhost:3000
    ) else (
        echo Frontend: nao respondendo
    )
    exit /b 0

:help
    echo.
    echo Uso: start-app.bat [acao]
    echo.
    echo acoes disponiveis:
    echo   start    Inicia backend e frontend (padrao)
    echo   stop     Encerra os servidores AETHER
    echo   restart  Reinicia os servidores
    echo   status   Verifica o status dos servidores
    echo   help     Exibe esta ajuda
    goto finish

:checkCommand
set "cmdName=%~1"
where %cmdName% > nul 2>&1
if errorlevel 1 (
    echo ERRO: comando %cmdName% nao encontrado. Instale-o e tente novamente.
    exit /b 1
)
exit /b 0

:installDependencies
set "TARGET=%~1"
if not exist "%TARGET%\package.json" (
    echo ERRO: package.json nao encontrado em %TARGET%.
    exit /b 1
)
pushd "%TARGET%"
if not exist node_modules (
    echo Instalando dependencias em %TARGET%...
    npm install || exit /b 1
) else (
    npm ls > nul 2>&1
    if errorlevel 1 (
        echo Dependencias ausentes ou quebradas em %TARGET%. Instalando...
        npm install || exit /b 1
    ) else (
        echo Dependencias ja estao instaladas em %TARGET%.
    )
)
popd
exit /b 0

:waitForUrl
set "URL=%~1"
set /a TIMEOUT=%~2
set /a COUNTER=0
:waitForUrlLoop
if %COUNTER% geq %TIMEOUT% (
    exit /b 1
)
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 5; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) { exit 0 } } catch { }; exit 1" > nul 2>&1
if %errorlevel% equ 0 (
    exit /b 0
)
timeout /t 1 /nobreak > nul
set /a COUNTER+=1
goto waitForUrlLoop

:error
echo.
echo Ocorreu um erro. Verifique as mensagens acima.
call :stopServers
endlocal
exit /b 1
echo.
echo Ocorreu um erro. Verifique as mensagens acima.
endlocal
exit /b 1

:finish
echo.
echo Script concluido.
endlocal
exit /b 0