$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectRoot '.tour-server.pid'
$logFile = Join-Path $projectRoot '.tour-server.log'
$productionReady = Test-Path (Join-Path $projectRoot '.next\BUILD_ID')
$tourPort = if ($productionReady) { 8360 } else { 3000 }
$tourCommand = if ($productionReady) { 'npm.cmd run start' } else { 'npm.cmd run dev' }

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'ไม่พบ Node.js/npm กรุณาติดตั้ง Node.js 20.19 ขึ้นไป' }
if (-not (Test-Path (Join-Path $projectRoot 'node_modules'))) { throw 'ยังไม่ได้ติดตั้ง dependencies กรุณารัน npm install ก่อน' }

$listener = Get-NetTCPConnection -LocalPort $tourPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
  $existingProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction SilentlyContinue
  Write-Host "พอร์ต $tourPort ถูกใช้งานอยู่แล้วโดย PID $($listener.OwningProcess)"
  if ($existingProcess.CommandLine -match 'next') {
    Write-Host 'พบ Next.js Server ที่ทำงานอยู่ ระบบจะเปิดหน้าเว็บเดิมโดยไม่รันซ้ำ'
    Start-Process "http://localhost:$tourPort"
    exit 0
  }
  throw "โปรแกรมอื่นกำลังใช้พอร์ต $tourPort กรุณาปิดโปรแกรมนั้นหรือเปลี่ยนพอร์ต"
}

Set-Location -LiteralPath $projectRoot
if (Test-Path $logFile) { Remove-Item -LiteralPath $logFile -Force }
$process = Start-Process -FilePath 'cmd.exe' -ArgumentList '/d', '/c', "$tourCommand > `"$logFile`" 2>&1" -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru
Set-Content -LiteralPath $pidFile -Value $process.Id -Encoding ascii

$ready = $false
for ($attempt = 0; $attempt -lt 30; $attempt += 1) {
  Start-Sleep -Seconds 1
  if ($process.HasExited) { break }
  if (Get-NetTCPConnection -LocalPort $tourPort -State Listen -ErrorAction SilentlyContinue) { $ready = $true; break }
}
if (-not $ready) {
  Write-Host 'Server เปิดไม่สำเร็จ ดูรายละเอียดด้านล่าง:'
  if (Test-Path $logFile) { Get-Content -LiteralPath $logFile -Tail 30 }
  exit 1
}

$localUrl = "http://localhost:$tourPort"
$localIp = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' -and $_.PrefixOrigin -ne 'WellKnown' } |
  Sort-Object InterfaceMetric |
  Select-Object -First 1 -ExpandProperty IPAddress
Write-Host "เปิดสำเร็จ (PID $($process.Id))"
Write-Host "คอมพิวเตอร์: $localUrl"
if ($localIp) { Write-Host "มือถือ Wi-Fi เดียวกัน: http://${localIp}:$tourPort" }
Write-Host "Log: $logFile"
Write-Host 'ปิด Server ด้วย stop-tour.bat'
Start-Process $localUrl
