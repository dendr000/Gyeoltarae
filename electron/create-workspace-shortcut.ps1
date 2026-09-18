# Creates a 결타래.lnk shortcut inside a workspace folder, pointing at
# the currently running packaged exe. Called from electron/main.js (not
# scripts/package-win.js) — this runs at app RUNTIME in the real user's
# environment, not at build time, since only the running app actually knows
# which folder the user picked as their workspace. Because a .lnk points at
# a path rather than embedding the exe's contents, and @electron/packager
# always rebuilds to that same fixed path, this shortcut keeps working
# after every future rebuild with no re-creation needed.
param(
    [Parameter(Mandatory = $true)][string]$TargetExe,
    [Parameter(Mandatory = $true)][string]$DestFolder
)

$shortcutPath = Join-Path $DestFolder '결타래.lnk'

# Idempotent: leave an existing shortcut alone (don't clobber if the user
# moved/renamed/deleted it on purpose).
if (Test-Path $shortcutPath) {
    exit 0
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $TargetExe
$shortcut.WorkingDirectory = Split-Path $TargetExe
$shortcut.IconLocation = $TargetExe
$shortcut.Save()