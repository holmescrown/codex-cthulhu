@echo off
chcp 65001 >nul
title CODEX CTHULHU - WebGPU 本地观测站启动器
cd /d "%~dp0"

set "PORT=8080"
set "URL=http://localhost:%PORT%/index.html"

echo ========================================================
echo   米斯卡塔尼克大学 · 克苏鲁神话 WebGPU 视觉图鉴
echo ========================================================
echo.

:: 1. 优先检测 Python 环境
where python >nul 2>nul
if %errorlevel%==0 (
    echo [✓] 检测到 Python 环境，正在启动本地 HTTP 服务 ^(端口: %PORT%^)...
    start "" "%URL%"
    python -m http.server %PORT%
    goto :end
)

:: 2. 其次检测 Node.js (npx serve)
where npx >nul 2>nul
if %errorlevel%==0 (
    echo [✓] 检测到 Node.js 环境，正在通过 serve 启动 ^(端口: %PORT%^)...
    start "" "%URL%"
    npx --yes serve -l %PORT%
    goto :end
)

:: 3. 兜底使用 Windows 原生 PowerShell 零依赖微型 HTTP 服务器
echo [!] 未检测到 Python 或 Node.js，正在启用 PowerShell 零依赖内置服务器...
start "" "%URL%"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$listener = New-Object System.Net.HttpListener;" ^
  "$listener.Prefixes.Add('http://localhost:%PORT%/');" ^
  "$listener.Start();" ^
  "Write-Host '[✓] 服务已运行在 %URL% (关闭此窗口即可停止服务)' -ForegroundColor Green;" ^
  "$mime = @{ '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.js'='application/javascript; charset=utf-8'; '.json'='application/json; charset=utf-8'; '.svg'='image/svg+xml'; '.png'='image/png'; '.jpg'='image/jpeg' };" ^
  "while ($listener.IsListening) {" ^
  "  $ctx = $listener.GetContext();" ^
  "  $rel = $ctx.Request.Url.LocalPath.TrimStart('/');" ^
  "  if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' };" ^
  "  $file = Join-Path (Get-Location) $rel;" ^
  "  if (Test-Path $file -PathType Leaf) {" ^
  "    $ext = [System.IO.Path]::GetExtension($file).ToLower();" ^
  "    $ctx.Response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' };" ^
  "    $bytes = [System.IO.File]::ReadAllBytes($file);" ^
  "    $ctx.Response.ContentLength64 = $bytes.Length;" ^
  "    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length);" ^
  "  } else {" ^
  "    $ctx.Response.StatusCode = 404;" ^
  "  }" ^
  "  $ctx.Response.Close();" ^
  "}"

:end
pause