import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import chokidar from 'chokidar'
import {
  scanTree,
  readDoc,
  writeDoc,
  createDoc,
  createFolder,
  renamePath,
  CATEGORIES_DIR_NAME,
  scanCategoryPages,
  ensureCategoryPage,
  DATA_DIR_NAME,
  scanDataEntries,
  ensureDataEntry,
  SNIPPETS_DIR_NAME,
  scanSnippets,
  ensureSnippet,
  DICT_DIR_NAME,
  readDictFile,
  writeDictFile,
  TEMPLATES_DIR_NAME,
  scanTemplates,
  ensureTemplate,
  IMAGES_DIR_NAME,
  IMAGE_EXTENSIONS,
  scanImages,
  importImage,
  importImageData,
  renameImage,
} from './fileSystem.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = !app.isPackaged

// 브랜드명은 결타래로 바뀌었지만(index.html의 <title>, package.json의 productName 등
// 사용자에게 보이는 곳은 전부 그쪽을 씀), Electron 내부 앱 식별자(app.getName())는 여기서
// 명시적으로 예전 이름("wikidesk")에 고정해 둠 — userData 경로(config.json이 저장된 곳,
// 특히 lastWorkspace)가 이 이름을 기준으로 정해지는데, productName이 바뀌면 이 값도 같이
// 바뀌어서 이미 실사용 중인 워크스페이스 기억이 끊길 뻔했음. app.getPath('userData')를
// 처음 호출하기 전에(모듈 로드 시점에 바로) 고정해야 함.
app.setName('wikidesk')

let mainWindow = null
let watcher = null
let currentWorkspacePath = null

function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json')
}

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(getConfigPath(), 'utf-8'))
  } catch {
    return {}
  }
}

function saveConfig(config) {
  fs.mkdirSync(path.dirname(getConfigPath()), { recursive: true })
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8')
}

// A workspace nested inside the packaged app's own install folder gets
// wiped out whenever the app is rebuilt/reinstalled there (electron-packager's
// overwrite mode deletes that whole folder before recreating it), so steer
// users away from picking one there.
function isInsideAppDir(targetPath) {
  if (!app.isPackaged) return false
  const appDir = path.dirname(app.getPath('exe'))
  const rel = path.relative(appDir, targetPath)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

// Drops a 결타래.lnk inside the workspace folder itself, pointing at the
// running exe, so it can be launched from right there instead of hunting
// down the app's own install folder. Only meaningful for the real packaged
// app (in dev there's no standalone exe to point at) and only fires once
// per workspace — see create-workspace-shortcut.ps1's own existence check.
// Fire-and-forget: this is a convenience, not something worth blocking or
// failing workspace loading over.
function ensureWorkspaceShortcut(workspacePath) {
  if (!app.isPackaged) return
  // The app runs out of app.asar, but a spawned powershell.exe can't read a
  // script packed inside it (only Electron's own fs is asar-aware) — the
  // packager is configured to unpack *.ps1 files, so the real path on disk
  // is under app.asar.unpacked instead of __dirname's app.asar location.
  const scriptPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'electron', 'create-workspace-shortcut.ps1')
  execFile(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-TargetExe', app.getPath('exe'), '-DestFolder', workspacePath],
    // windowsHide: this runs on every launch (the .ps1 itself is the thing
    // that skips work when the shortcut already exists), so without this a
    // console window would flash briefly every single time the app starts.
    { windowsHide: true },
    (err) => {
      if (err) console.error('[workspace shortcut] failed to create:', err)
    },
  )
}

// Windows-only Electron bug: a window can report isFocused() === true and
// show a focused/blue-outlined input, while the OS never actually routes
// keyboard input to it (clicking does nothing until the user forces a real
// OS focus change, e.g. alt-tabbing or taking a screenshot). A previous
// version of this fix dropped win.blur() and used only win.focus() +
// webContents.focus(), reasoning blur()'s visible one-frame flicker wasn't
// worth it if focus() alone resynced input just as reliably — but real
// testing on the 틀 (template) editor's auto-focus-on-open case (see
// EditorPane.jsx) showed focus()-only is NOT reliable enough: typing still
// didn't work after it ran. Restored the blur()-then-focus() sequence,
// since an actual real OS-level focus change (blur() is one; a same-window
// focus() call with no real change might not be, on Windows) appears to be
// what's actually needed to force Windows to re-sync keyboard routing —
// accepting the flicker as the lesser problem versus keystrokes silently
// going nowhere. The renderer calls this (via window:refocus) right before
// showing anything that autofocuses an input — new document/folder
// prompts, rename fields, and (see EditorPane.jsx) a freshly-opened empty
// document's editor.
function refocusMainWindow() {
  if (!mainWindow) return
  mainWindow.blur()
  mainWindow.focus()
  mainWindow.webContents.focus()
}

// Deleting/renaming a directory the watcher is actively watching can fail
// on Windows (ENOTEMPTY from a recursive fs.rm racing the watcher's own
// directory handles, or shell.trashItem's Recycle-Bin move rejecting
// outright) — closing the watcher first, then restarting it after, avoids
// that race. See stopWatching's callers below.
async function stopWatching() {
  if (watcher) {
    await watcher.close()
    watcher = null
  }
}

function startWatching(workspacePath) {
  currentWorkspacePath = workspacePath
  if (watcher) {
    watcher.close()
    watcher = null
  }
  // Dotfiles/node_modules are ignored as usual, except .wikidesk-categories,
  // .wikidesk-data, .wikidesk-templates, .wikidesk-images, .wikidesk-snippets
  // and .wikidesk-dict — those hold real content (category pages, data
  // entries, templates, images, snippets, the dictionary) and need
  // watch:event notifications like any other document folder.
  const CONTENT_DIRS = [
    CATEGORIES_DIR_NAME,
    DATA_DIR_NAME,
    TEMPLATES_DIR_NAME,
    IMAGES_DIR_NAME,
    SNIPPETS_DIR_NAME,
    DICT_DIR_NAME,
  ]
  watcher = chokidar.watch(workspacePath, {
    ignored: (watchPath) => {
      const rel = path.relative(workspacePath, watchPath)
      if (CONTENT_DIRS.some((d) => rel === d || rel.startsWith(d + path.sep))) {
        return false
      }
      return /(^|[/\\])\.|node_modules/.test(rel)
    },
    ignoreInitial: true,
  })
  const notify = (eventType) => (changedPath) => {
    mainWindow?.webContents.send('watch:event', { eventType, path: changedPath })
  }
  watcher
    .on('add', notify('add'))
    .on('change', notify('change'))
    .on('unlink', notify('unlink'))
    .on('addDir', notify('addDir'))
    .on('unlinkDir', notify('unlinkDir'))
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 780,
    minHeight: 480,
    backgroundColor: '#1e1f22',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3171'
    mainWindow.loadURL(devUrl)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

function buildMenu() {
  const template = [
    {
      label: '파일',
      submenu: [
        {
          label: '워크스페이스 열기',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:choose-workspace'),
        },
        { type: 'separator' },
        { role: 'quit', label: '종료' },
      ],
    },
    {
      label: '편집',
      submenu: [
        { role: 'undo', label: '실행 취소' },
        { role: 'redo', label: '다시 실행' },
        { type: 'separator' },
        { role: 'cut', label: '잘라내기' },
        { role: 'copy', label: '복사' },
        { role: 'paste', label: '붙여넣기' },
        { role: 'selectAll', label: '모두 선택' },
      ],
    },
    {
      label: '보기',
      submenu: [
        { role: 'reload', label: '새로고침' },
        { role: 'forceReload', label: '강력 새로고침' },
        { role: 'toggleDevTools', label: '개발자 도구' },
        { type: 'separator' },
        { role: 'resetZoom', label: '원래 크기' },
        { role: 'zoomIn', label: '확대' },
        { role: 'zoomOut', label: '축소' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '전체 화면' },
      ],
    },
    {
      label: '창',
      submenu: [
        { role: 'minimize', label: '최소화' },
        { role: 'close', label: '닫기' },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(() => {
  buildMenu()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (watcher) watcher.close()
  if (process.platform !== 'darwin') app.quit()
})

// --- IPC: workspace ---

ipcMain.handle('workspace:choose', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
  })
  refocusMainWindow()
  if (result.canceled || result.filePaths.length === 0) return null
  const chosen = result.filePaths[0]
  if (isInsideAppDir(chosen)) {
    await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['확인'],
      title: '앱 설치 폴더는 워크스페이스로 사용할 수 없습니다',
      message: '선택하신 폴더가 결타래 앱이 설치된 폴더 안에 있습니다.',
      detail:
        '이 위치는 앱을 업데이트하거나 다시 설치할 때 폴더째 삭제될 수 있어 위험합니다.\n문서, 바탕화면 등 앱과 무관한 안전한 폴더를 다시 선택해 주세요.',
    })
    refocusMainWindow()
    return null
  }
  saveConfig({ ...loadConfig(), lastWorkspace: chosen })
  startWatching(chosen)
  ensureWorkspaceShortcut(chosen)
  return chosen
})

ipcMain.handle('workspace:getLast', () => {
  const { lastWorkspace } = loadConfig()
  if (lastWorkspace && fs.existsSync(lastWorkspace)) {
    if (isInsideAppDir(lastWorkspace)) {
      dialog
        .showMessageBox(mainWindow, {
          type: 'warning',
          buttons: ['확인'],
          title: '주의',
          message: '현재 워크스페이스가 앱 설치 폴더 안에 있습니다.',
          detail:
            '이 위치는 앱을 업데이트하면 삭제될 수 있습니다. "파일 > 워크스페이스 열기" 메뉴에서 안전한 폴더로 옮겨 다시 선택해 주세요.',
        })
        .then(() => refocusMainWindow())
    }
    startWatching(lastWorkspace)
    ensureWorkspaceShortcut(lastWorkspace)
    return lastWorkspace
  }
  return null
})

ipcMain.handle('workspace:scan', (_event, workspacePath) => {
  return scanTree(workspacePath)
})

// --- IPC: documents ---

ipcMain.handle('file:read', (_event, filePath) => {
  return readDoc(filePath)
})

ipcMain.handle('file:write', (_event, filePath, content) => {
  writeDoc(filePath, content)
})

ipcMain.handle('file:create', (_event, dirPath, name) => {
  return createDoc(dirPath, name)
})

ipcMain.handle('file:delete', async (_event, filePath) => {
  // The watcher holds its own directory handles on everything under the
  // workspace; deleting a watched directory while it's still watching can
  // race it on Windows — shell.trashItem's Recycle-Bin move can reject
  // outright, and a recursive fs.rm fallback can throw ENOTEMPTY even
  // though the directory really is empty by the time it's checked again.
  // Closing the watcher first (and reopening it after, in `finally`)
  // avoids that race entirely.
  await stopWatching()
  try {
    // shell.trashItem is also a known source of silent, hard-to-diagnose
    // failures on some Windows setups on its own — it can reject even for
    // a completely ordinary, unlocked file outside any protected/special
    // folder. Falling back to a real delete means "삭제" still actually
    // works when that happens, instead of silently doing nothing.
    try {
      await shell.trashItem(filePath)
      return { permanentlyDeleted: false }
    } catch (err) {
      console.error('[file:delete] shell.trashItem failed, falling back to a permanent delete:', err)
      fs.rmSync(filePath, { recursive: true, force: true })
      return { permanentlyDeleted: true }
    }
  } finally {
    if (currentWorkspacePath) startWatching(currentWorkspacePath)
  }
})

ipcMain.handle('file:rename', async (_event, oldPath, newName) => {
  // Same watcher-vs-directory-handle race as file:delete above, so the
  // same close-before/reopen-after treatment applies here too.
  await stopWatching()
  try {
    return renamePath(oldPath, newName)
  } finally {
    if (currentWorkspacePath) startWatching(currentWorkspacePath)
  }
})

ipcMain.handle('dir:create', (_event, parentPath, name) => {
  return createFolder(parentPath, name)
})

// --- IPC: category pages (dedicated space, outside the workspace tree) ---

ipcMain.handle('categories:scan', (_event, workspacePath) => {
  return scanCategoryPages(workspacePath)
})

ipcMain.handle('categories:ensure', (_event, workspacePath, categoryName) => {
  return ensureCategoryPage(workspacePath, categoryName)
})

// --- IPC: data entries (자료 — dedicated space, outside the workspace tree) ---

ipcMain.handle('data:scan', (_event, workspacePath) => {
  return scanDataEntries(workspacePath)
})

ipcMain.handle('data:ensure', (_event, workspacePath, type, name) => {
  return ensureDataEntry(workspacePath, type, name)
})

// --- IPC: snippets (상용구 — dedicated space, outside the workspace tree) ---

ipcMain.handle('snippets:scan', (_event, workspacePath) => {
  return scanSnippets(workspacePath)
})

ipcMain.handle('snippets:ensure', (_event, workspacePath, category, title) => {
  return ensureSnippet(workspacePath, category, title)
})

// --- IPC: 고유명사 사전 (single flat file, outside the workspace tree) ---

ipcMain.handle('dict:read', (_event, workspacePath) => {
  return readDictFile(workspacePath)
})

ipcMain.handle('dict:write', (_event, workspacePath, text) => {
  return writeDictFile(workspacePath, text)
})

// --- IPC: templates (틀 — dedicated space, outside the workspace tree) ---

ipcMain.handle('templates:scan', (_event, workspacePath) => {
  return scanTemplates(workspacePath)
})

ipcMain.handle('templates:ensure', (_event, workspacePath, name) => {
  return ensureTemplate(workspacePath, name)
})

// --- IPC: images (파일: — dedicated space, outside the workspace tree) ---

ipcMain.handle('images:scan', (_event, workspacePath) => {
  return scanImages(workspacePath)
})

// Picking the source file happens here (main process) rather than via a
// renderer <input type="file">, so the actual bytes never need to cross the
// IPC boundary — the dialog hands back a real path, and importImage just
// copies straight from it to .wikidesk-images on disk.
ipcMain.handle('images:import', async (_event, workspacePath) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: '이미지', extensions: IMAGE_EXTENSIONS.map((ext) => ext.slice(1)) }],
  })
  refocusMainWindow()
  if (result.canceled || result.filePaths.length === 0) return null
  return importImage(workspacePath, result.filePaths[0])
})

ipcMain.handle('images:rename', (_event, workspacePath, oldName, newName) => {
  return renameImage(workspacePath, oldName, newName)
})

// Drag & drop from Explorer: a dropped File has no reliable path in modern
// Electron, so the renderer reads its bytes itself and sends them here as
// base64 (see FileTree.jsx's handleDrop) instead of going through the
// pick-by-path flow images:import uses.
ipcMain.handle('images:importData', (_event, workspacePath, fileName, base64Data) => {
  return importImageData(workspacePath, fileName, Buffer.from(base64Data, 'base64'))
})

// --- IPC: window ---

// Called by the renderer right before it shows anything that autofocuses an
// input (new document/folder prompt, rename field) — see refocusMainWindow.
ipcMain.handle('window:refocus', () => {
  refocusMainWindow()
})
