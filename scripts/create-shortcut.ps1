# Creates/refreshes a 결타래.lnk shortcut at the project root pointing at the
# packaged exe, so it can be launched without navigating into release-packager\.
$root = Split-Path -Parent $PSScriptRoot
$target = Join-Path $root "release-packager\Gyeoltarae-win32-x64\Gyeoltarae.exe"

if (-not (Test-Path $target)) {
    Write-Host "빌드된 exe를 찾을 수 없습니다: $target"
    exit 1
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut((Join-Path $root "결타래.lnk"))
$shortcut.TargetPath = $target
$shortcut.WorkingDirectory = Split-Path $target
$shortcut.IconLocation = $target
$shortcut.Save()

Write-Host "바로가기 생성됨: $(Join-Path $root '결타래.lnk')"