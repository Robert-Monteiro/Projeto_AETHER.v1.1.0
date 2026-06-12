$publishDir = 'C:\Projeto AETHER\installer\TicketApp\publish'
$installDir = Join-Path $env:LOCALAPPDATA 'AetherTicketApp'
if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir | Out-Null
}
Copy-Item -Path (Join-Path $publishDir '*') -Destination $installDir -Recurse -Force

$desktop = Join-Path $env:USERPROFILE 'Desktop'
$shortcutPath = Join-Path $desktop 'Aether Ticket.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $installDir 'TicketApp.exe'
$shortcut.WorkingDirectory = $installDir
$shortcut.WindowStyle = 1
$shortcut.IconLocation = Join-Path $installDir 'TicketApp.exe'
$shortcut.Save()

$startMenu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Aether Ticket'
if (-not (Test-Path $startMenu)) {
    New-Item -ItemType Directory -Path $startMenu | Out-Null
}
$shortcutPath2 = Join-Path $startMenu 'Aether Ticket.lnk'
$shortcut2 = $shell.CreateShortcut($shortcutPath2)
$shortcut2.TargetPath = Join-Path $installDir 'TicketApp.exe'
$shortcut2.WorkingDirectory = $installDir
$shortcut2.WindowStyle = 1
$shortcut2.IconLocation = Join-Path $installDir 'TicketApp.exe'
$shortcut2.Save()

Write-Host "Installed to: $installDir"
Write-Host "Shortcut created: $shortcutPath"
Write-Host "Start Menu shortcut created: $shortcutPath2"
