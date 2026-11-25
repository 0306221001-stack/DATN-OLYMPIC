@echo off
chcp 65001 >nul
setlocal

rem Chay app Thi sinh/Trong tai (ban web) tai http://localhost:5000
rem Dung ban da build san trong Contests-Mobile-app\build\web.
rem Neu chua co ban build hoac vua sua code: chay "chay_app_thi_sinh.bat build".

cd /d "%~dp0..\Contests-Mobile-app"

if /i "%~1"=="build" goto build
if not exist "build\web\index.html" goto build
goto serve

:build
echo Dang build app web (khoang 1 phut)...
call flutter build web --dart-define=SERVER_URL=http://localhost:3000
if errorlevel 1 (
  echo Build that bai. Kiem tra lai Flutter.
  pause
  exit /b 1
)

:serve
echo ============================================================
echo  App Thi sinh/Trong tai: http://localhost:5000
echo  - Backend (Contests-BE-main, npm run dev) phai dang chay.
echo  - Dong cua so nay la app tat.
echo ============================================================
echo.
start "" http://localhost:5000
call npx -y serve@14.2.4 -s build/web -l 5000
pause
