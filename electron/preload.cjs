// CommonJS on purpose: with webPreferences.sandbox = true, Electron loads
// preload scripts as plain CommonJS only — it ignores the project's
// package.json "type": "module" and does NOT support `import` here unless
// sandbox is disabled entirely. An ESM preload (`import ... from 'electron'`)
// silently fails to run under sandbox, so contextBridge.exposeInMainWorld
// never executes and window.api stays undefined — the renderer then falls
// back to the non-persistent browser-preview mock without any visible error.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  chooseWorkspace: () => ipcRenderer.invoke('workspace:choose'),
  getLastWorkspace: () => ipcRenderer.invoke('workspace:getLast'),
  scanWorkspace: (workspacePath) => ipcRenderer.invoke('workspace:scan', workspacePath),

  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('file:write', filePath, content),
  createFile: (dirPath, name) => ipcRenderer.invoke('file:create', dirPath, name),
  deleteFile: (filePath) => ipcRenderer.invoke('file:delete', filePath),
  renameFile: (oldPath, newName) => ipcRenderer.invoke('file:rename', oldPath, newName),
  createFolder: (parentPath, name) => ipcRenderer.invoke('dir:create', parentPath, name),

  scanCategories: (workspacePath) => ipcRenderer.invoke('categories:scan', workspacePath),
  ensureCategoryPage: (workspacePath, categoryName) =>
    ipcRenderer.invoke('categories:ensure', workspacePath, categoryName),

  scanData: (workspacePath) => ipcRenderer.invoke('data:scan', workspacePath),
  ensureDataEntry: (workspacePath, type, name) => ipcRenderer.invoke('data:ensure', workspacePath, type, name),

  scanSnippets: (workspacePath) => ipcRenderer.invoke('snippets:scan', workspacePath),
  ensureSnippet: (workspacePath, category, title) => ipcRenderer.invoke('snippets:ensure', workspacePath, category, title),

  readDict: (workspacePath) => ipcRenderer.invoke('dict:read', workspacePath),
  writeDict: (workspacePath, text) => ipcRenderer.invoke('dict:write', workspacePath, text),

  scanTemplates: (workspacePath) => ipcRenderer.invoke('templates:scan', workspacePath),
  ensureTemplate: (workspacePath, name) => ipcRenderer.invoke('templates:ensure', workspacePath, name),

  scanImages: (workspacePath) => ipcRenderer.invoke('images:scan', workspacePath),
  importImage: (workspacePath) => ipcRenderer.invoke('images:import', workspacePath),
  renameImage: (workspacePath, oldName, newName) => ipcRenderer.invoke('images:rename', workspacePath, oldName, newName),
  importImageData: (workspacePath, fileName, base64Data) =>
    ipcRenderer.invoke('images:importData', workspacePath, fileName, base64Data),

  refocusWindow: () => ipcRenderer.invoke('window:refocus'),

  onWatchEvent: (callback) => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('watch:event', listener)
    return () => ipcRenderer.removeListener('watch:event', listener)
  },

  onMenuChooseWorkspace: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('menu:choose-workspace', listener)
    return () => ipcRenderer.removeListener('menu:choose-workspace', listener)
  },
})
