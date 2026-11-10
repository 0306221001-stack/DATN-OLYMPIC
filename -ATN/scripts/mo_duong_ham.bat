@echo off
chcp 65001 >nul
setlocal

rem Mo duong ham Cloudflare tu may dang chay backend (cong 3000) ra Internet.
rem Can cai san cloudflared (xem NHOM_TEST_VA_IOS.md, muc "Mo duong ham").

set "CF=cloudflared"
where cloudflared >nul 2>nul
if errorlevel 1 (
  if exist "%~dp0..\tools\cloudflared\cloudflared.exe" (
    set "CF=%~dp0..\tools\cloudflared\cloudflared.exe"
  ) else (
    echo Khong tim thay cloudflared.
    echo Tai ve tai: https://github.com/cloudflare/cloudflared/releases/latest
    echo Chon file cloudflared-windows-amd64.exe, doi ten thanh cloudflared.exe,
    echo roi dat vao thu muc tools\cloudflared\ hoac them vao PATH.
    pause
    exit /b 1
  )
)

echo ============================================================
echo  Mo duong ham Cloudflare toi backend (cong 3000)
echo  - Backend phai dang chay (npm run dev) truoc khi mo cua so nay.
echo  - Tim dong co chu "trycloudflare.com" ben duoi: do la dia chi May chu.
echo  - Dan dia chi do (KHONG them /api) vao app: Doi -^> Kiem tra -^> Luu.
echo  - Dia chi doi moi lan chay lai. Dong cua so nay la duong ham dong lai.
echo ============================================================
echo.
"%CF%" tunnel --no-autoupdate --url http://localhost:3000
pause
