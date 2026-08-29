$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectRoot '.tour-server.pid'
if (-not (Test-Path $pidFile)) {
  Write-Host 'ไม่พบไฟล์ PID — Server อาจถูกปิดอยู่แล้ว'
  exit 0
}
$rawPid = (Get-Content -LiteralPath $pidFile -Raw).Trim()
$serverPid = 0
if (-not [int]::TryParse($rawPid, [ref]$serverPid) -or $serverPid -le 0) { throw 'ไฟล์ PID ไม่ถูกต้อง กรุณาลบ .tour-server.pid แล้วตรวจ Server ด้วย netstat' }
$process = Get-Process -Id $serverPid -ErrorAction SilentlyContinue
if ($process) {
  & taskkill.exe /PID $serverPid /T /F | Out-Host
  Write-Host "ปิด Tour Server PID $serverPid แล้ว"
} else {
  Write-Host 'ไม่พบ Process เดิม ล้างไฟล์ PID ที่ค้างอยู่'
}
Remove-Item -LiteralPath $pidFile -Force
