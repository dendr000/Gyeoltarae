// Packages 결타래 (formerly WikiDesk) into a standalone win32-x64 folder using @electron/packager.
// Used instead of electron-builder because this machine hits a persistent
// Windows-level EPERM on electron-builder's extract-then-rename step (reproduced
// even with a plain Node.js fs.rename, outside electron-builder entirely).
// electron-packager copies files individually instead of extracting to a temp
// folder and renaming it in one shot, which avoids that failure pattern.
import { packager } from '@electron/packager'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const IGNORE_PATTERNS = [
  /^\/src(\/|$)/,
  /^\/scripts(\/|$)/,
  /^\/\.claude(\/|$)/,
  /^\/\.git(\/|$)/,
  /^\/release(-packager)?(\/|$)/,
  /^\/index\.html$/,
  /^\/vite\.config\.js$/,
  /^\/CHANGELOG\.md$/,
  /^\/README\.md$/,
]

// `overwrite: true` below makes @electron/packager delete the existing
// output folder outright (fs.rm(outDir, {recursive:true,force:true}) in its
// own source — NOT routed through the Recycle Bin) before repackaging. If a
// workspace ever ends up nested inside that folder (e.g. someone picked it
// via the folder dialog, which defaults near the exe), a routine rebuild
// permanently destroys it with zero warning. This happened for real — see
// CHANGELOG 0.13.0/0.14.0. The app itself now refuses to let a workspace be
// selected there, but that only stops *future* mistakes; this check catches
// anything already sitting there BEFORE the delete happens, every build.
// 패키저의 name 파라미터를 진짜 한글("결타래")로 주면, @electron/packager가 내부적으로
// 앱 폴더/실행파일 이름을 만들 때 그 문자열을 NFD(자모 분해) 형태로 정규화해버려서 —
// 이 스크립트나 create-shortcut.ps1이 (평범한 NFC 형태로) 참조하는 경로랑 바이트 단위로
// 안 맞는 경우가 실제로 있었음(똑같이 "결타래"로 보이는데 Test-Path/existsSync가 못 찾음).
// 그래서 실행파일·폴더 이름 등 "경로로 쓰이는" 곳은 로마자 Gyeoltarae로 고정하고, 화면에
// 보이는 텍스트(창 제목, 사이드바 등)만 결타래를 씀 — Galpi 프로젝트도 저장소/폴더명은
// 로마자, 실제 브랜드 표기는 한글을 쓰는 것과 같은 방식.
const outDir = path.join(root, 'release-packager', 'Gyeoltarae-win32-x64')
const KNOWN_TOP_LEVEL_ENTRIES = new Set([
  'LICENSE',
  'LICENSES.chromium.html',
  'Gyeoltarae.exe',
  'chrome_100_percent.pak',
  'chrome_200_percent.pak',
  'd3dcompiler_47.dll',
  'dxcompiler.dll',
  'dxil.dll',
  'ffmpeg.dll',
  'icudtl.dat',
  'locales',
  'resources',
  'resources.pak',
  'snapshot_blob.bin',
  'v8_context_snapshot.bin',
  'version',
  'vk_swiftshader.dll',
  'vk_swiftshader_icd.json',
  'vulkan-1.dll',
])

if (fs.existsSync(outDir)) {
  const unexpected = fs.readdirSync(outDir).filter((name) => !KNOWN_TOP_LEVEL_ENTRIES.has(name))
  if (unexpected.length > 0) {
    console.error(
      `\n빌드 중단: ${outDir} 안에 빌드 산출물이 아닌 항목이 있습니다 — ${unexpected.join(', ')}\n` +
        '이 폴더(또는 그 안)를 워크스페이스로 쓰고 있다면, 먼저 다른 안전한 위치로 옮긴 뒤 다시 빌드하세요.\n' +
        '정말 정상적인 빌드 산출물인데 이 목록이 오래된 것뿐이라면(Electron 버전업 등) KNOWN_TOP_LEVEL_ENTRIES에 추가하세요.\n',
    )
    process.exit(1)
  }
}

const appPaths = await packager({
  dir: root,
  out: path.join(root, 'release-packager'),
  platform: 'win32',
  arch: 'x64',
  overwrite: true,
  appCopyright: '결타래',
  name: 'Gyeoltarae',
  ignore: (file) => IGNORE_PATTERNS.some((re) => re.test(file)),
  // create-workspace-shortcut.ps1 gets run by spawning a real powershell.exe
  // process (see ensureWorkspaceShortcut in electron/main.js), which can't
  // read a script packed inside app.asar — only Electron's own patched fs
  // understands that virtual filesystem. Unpacking it to app.asar.unpacked
  // gives it a real path on disk that an external process can open.
  asar: { unpack: '*.ps1' },
})

console.log('Packaged app(s):', appPaths)

// Refresh the project-root shortcut so the exe can be launched without
// digging into release-packager\Gyeoltarae-win32-x64\.
execFileSync(
  'powershell',
  ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'create-shortcut.ps1')],
  { stdio: 'inherit' },
)
