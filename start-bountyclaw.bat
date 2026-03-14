@echo off
chcp 65001 >nul
echo ==========================================
echo  启动 ClawDeck + BountyClaw 服务
echo ==========================================
echo.

REM 启动 BountyClaw 后端 (端口 3000)
echo [1/3] 启动 BountyClaw 后端服务 (端口 3000)...
start "BountyClaw Backend" cmd /k "cd /d C:\guo\SoftwareDevelopment\opencode-chat-deploy\openclaw-main\Claw众包\backendserverfiles && npm start"

REM 等待几秒
timeout /t 3 /nobreak >nul

REM 构建 ClawDeck 前端
echo [2/3] 构建 ClawDeck 前端...
cd /d C:\guo\SoftwareDevelopment\opencode-chat-deploy\openclaw-main\ClawDeck\frontend
call npm run build

REM 启动 ClawDeck 后端 (端口 18888)
echo [3/3] 启动 ClawDeck 后端服务 (端口 18888)...
cd /d C:\guo\SoftwareDevelopment\opencode-chat-deploy\openclaw-main\ClawDeck\backend
start "ClawDeck Backend" cmd /k "npx ts-node src/index.ts"

echo.
echo ==========================================
echo  服务启动完成！
echo ==========================================
echo.
echo 访问地址:
echo   - ClawDeck:     http://localhost:18888
echo   - BountyClaw:   http://localhost:3000
echo.
echo 在 ClawDeck 顶部点击 "🦞 龙虾众包" 按钮即可进入
echo.
pause
