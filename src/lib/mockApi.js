// Fallback implementation of window.api used only when the app runs as a
// plain web page (e.g. `npm run dev` in a browser) without the Electron
// preload bridge. Backed by an in-memory tree so the UI is fully previewable
// without a real filesystem/Electron shell.

const SAMPLE_ROOT = '/mock/workspace'

const sampleDocs = {
  [`${SAMPLE_ROOT}/문법 테스트.md`]: `[목차]

=개요=
나무위키 문법 확장 테스트 문서입니다.

'''굵게'''(namu), **굵게**(md), ''기울임''(namu), *기울임*(md), __밑줄__, ~~취소선~~(namu), --취소선--(확장), ^^위첨자^^, ,,아래첨자,,

{{{+3 큰 글씨}}} / {{{-2 작은 글씨}}} / {{{#e91e63 색깔 글씨}}}

==목록==
* 사과
* 바나나
** 저장고
*** 냉동실
1. 첫째
2. 둘째

==인용==
> 인용문 1단계
>> 인용문 2단계

==표==
||<bgcolor=#eef0fb><:>이름||<bgcolor=#eef0fb><:>비고||
||목호||<-2>드래곤 타입 파트너||
||성호||강철/에스퍼||

==접기==
{{{#!folding 더 보기
숨겨진 내용입니다. '''굵게'''도 됩니다.
}}}

==코드==
{{{
plain code block
줄바꿈 유지됨
}}}

----
=구분선 4단계=
----
-----
------
-------

[[다른 문서]] 링크는 아직 클릭이 안 됩니다.

#테스트 #나무위키문법
`,
}

// Folders created via createFolder but not (yet) holding any doc — tracked
// separately since sampleDocs alone can't represent an empty directory.
// Pre-seeded with the useAppStore.js auto-category/작품-스캐폴드 trigger
// folders (소설/웹툰/만화/포켓몬스터) plus 포켓몬스터/전국도감 (도감 번호
// 입력칸 트리거) so testing those features in the browser preview doesn't
// need recreating them by hand every reload.
const sampleFolders = new Set([
  `${SAMPLE_ROOT}/소설`,
  `${SAMPLE_ROOT}/웹툰`,
  `${SAMPLE_ROOT}/만화`,
  `${SAMPLE_ROOT}/포켓몬스터`,
  `${SAMPLE_ROOT}/포켓몬스터/전국도감`,
])

// Mirrors electron/fileSystem.js's scanTree: builds a real nested tree from
// path strings instead of always putting every doc directly under the root,
// so folders (including empty ones) actually show up and nest correctly —
// dot-prefixed segments (.wikidesk-categories 등) are skipped, same as the
// real scanTree hiding those dedicated spaces from the regular file tree.
function buildTree() {
  const nodeByPath = new Map()
  const root = { type: 'dir', name: 'workspace', path: SAMPLE_ROOT, children: [] }
  nodeByPath.set(SAMPLE_ROOT, root)

  function ensureDir(dirPath) {
    if (nodeByPath.has(dirPath)) return nodeByPath.get(dirPath)
    const parentPath = dirPath.slice(0, dirPath.lastIndexOf('/'))
    const parent = ensureDir(parentPath)
    const node = { type: 'dir', name: dirPath.slice(dirPath.lastIndexOf('/') + 1), path: dirPath, children: [] }
    parent.children.push(node)
    nodeByPath.set(dirPath, node)
    return node
  }

  const isHidden = (relPath) => relPath.split('/').some((seg) => seg.startsWith('.'))

  const dirPaths = [...sampleFolders].filter((p) => !isHidden(p.slice(SAMPLE_ROOT.length + 1)))
  dirPaths.sort((a, b) => a.split('/').length - b.split('/').length)
  for (const dirPath of dirPaths) ensureDir(dirPath)

  for (const docPath of Object.keys(sampleDocs)) {
    const relPath = docPath.slice(SAMPLE_ROOT.length + 1)
    if (isHidden(relPath)) continue
    const dir = docPath.slice(0, docPath.lastIndexOf('/'))
    const parent = ensureDir(dir)
    parent.children.push({
      type: 'file',
      name: docPath.slice(docPath.lastIndexOf('/') + 1).replace(/\.md$/, ''),
      path: docPath,
    })
  }

  function sortChildren(node) {
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
      return a.name.localeCompare(b.name, 'ko')
    })
    for (const child of node.children) if (child.type === 'dir') sortChildren(child)
  }
  sortChildren(root)

  return [root]
}

// Mirrors electron/fileSystem.js's NEW_DOC_TEMPLATE.
const NEW_DOC_TEMPLATE = '[목차]\n= 개요 =\n\n\n[[분류:]]\n'

const CATEGORIES_DIR_NAME = '.wikidesk-categories'
const DATA_DIR_NAME = '.wikidesk-data'
const SNIPPETS_DIR_NAME = '.wikidesk-snippets'
const DICT_DIR_NAME = '.wikidesk-dict'
const TEMPLATES_DIR_NAME = '.wikidesk-templates'
const IMAGES_DIR_NAME = '.wikidesk-images'
const DOC_EXT = '.md'

// 사전(.wikidesk-dict/사전.txt) is a single flat file, not a tree of docs
// like everything else here — its own tiny in-memory stand-in rather than
// forcing it through the sampleDocs path-keyed map the other spaces share.
let sampleDictText = ''

// name -> {name, ext, path, dataUrl}. No real Electron file dialog exists in
// the browser preview, so importImage below fakes one with a hidden
// <input type="file"> and reads the picked file straight into a data URL.
const sampleImages = new Map()

// Mirrors electron/fileSystem.js's IMAGE_MIME_TYPES, needed here to build a
// data URL for importImageData (drag & drop) — FileTree.jsx only hands this
// the raw base64 payload, not a ready-made data URL, so the mock has to
// know the mime type itself the same way the real main process does.
const IMAGE_MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
}

export function createMockApi() {
  let workspace = null
  const watchListeners = new Set()

  return {
    async chooseWorkspace() {
      workspace = SAMPLE_ROOT
      return workspace
    },
    async getLastWorkspace() {
      workspace = SAMPLE_ROOT
      return workspace
    },
    async scanWorkspace() {
      return buildTree()
    },
    async readFile(filePath) {
      return sampleDocs[filePath] ?? ''
    },
    async writeFile(filePath, content) {
      sampleDocs[filePath] = content
    },
    async createFile(dirPath, name) {
      const filePath = `${dirPath}/${name}.md`
      sampleDocs[filePath] = NEW_DOC_TEMPLATE
      return filePath
    },
    async deleteFile(filePath) {
      if (sampleFolders.has(filePath)) {
        sampleFolders.delete(filePath)
        const prefix = `${filePath}/`
        for (const folderPath of [...sampleFolders]) {
          if (folderPath.startsWith(prefix)) sampleFolders.delete(folderPath)
        }
        for (const docPath of Object.keys(sampleDocs)) {
          if (docPath.startsWith(prefix)) delete sampleDocs[docPath]
        }
      } else {
        delete sampleDocs[filePath]
        for (const [name, entry] of sampleImages) {
          if (entry.path === filePath) sampleImages.delete(name)
        }
      }
      return { permanentlyDeleted: false }
    },
    async renameFile(oldPath, newName) {
      const dir = oldPath.slice(0, oldPath.lastIndexOf('/'))
      const isFolder = sampleFolders.has(oldPath)
      const newPath = isFolder ? `${dir}/${newName}` : `${dir}/${newName}.md`
      if (!isFolder) {
        sampleDocs[newPath] = sampleDocs[oldPath]
        delete sampleDocs[oldPath]
        return newPath
      }
      // Renaming a folder needs every doc/subfolder nested under it moved
      // too, same as a real filesystem rename carries its whole subtree.
      sampleFolders.delete(oldPath)
      sampleFolders.add(newPath)
      const oldPrefix = `${oldPath}/`
      const newPrefix = `${newPath}/`
      for (const folderPath of [...sampleFolders]) {
        if (folderPath.startsWith(oldPrefix)) {
          sampleFolders.delete(folderPath)
          sampleFolders.add(newPrefix + folderPath.slice(oldPrefix.length))
        }
      }
      for (const docPath of Object.keys(sampleDocs)) {
        if (docPath.startsWith(oldPrefix)) {
          sampleDocs[newPrefix + docPath.slice(oldPrefix.length)] = sampleDocs[docPath]
          delete sampleDocs[docPath]
        }
      }
      return newPath
    },
    async createFolder(parentPath, name) {
      const folderPath = `${parentPath}/${name}`
      sampleFolders.add(folderPath)
      return folderPath
    },
    async scanCategories(workspacePath) {
      const prefix = `${workspacePath}/${CATEGORIES_DIR_NAME}/`
      return Object.keys(sampleDocs)
        .filter((p) => p.startsWith(prefix))
        .map((p) => ({ type: 'file', name: p.slice(prefix.length, -DOC_EXT.length), path: p }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    },
    async ensureCategoryPage(workspacePath, categoryName) {
      const filePath = `${workspacePath}/${CATEGORIES_DIR_NAME}/${categoryName}${DOC_EXT}`
      if (!(filePath in sampleDocs)) sampleDocs[filePath] = ''
      return filePath
    },
    async scanData(workspacePath) {
      const prefix = `${workspacePath}/${DATA_DIR_NAME}/`
      return Object.keys(sampleDocs)
        .filter((p) => p.startsWith(prefix))
        .map((p) => {
          const rest = p.slice(prefix.length, -DOC_EXT.length)
          const slash = rest.indexOf('/')
          return { type: rest.slice(0, slash), name: rest.slice(slash + 1), path: p }
        })
        .sort((a, b) => a.type.localeCompare(b.type, 'ko') || a.name.localeCompare(b.name, 'ko'))
    },
    async ensureDataEntry(workspacePath, type, name) {
      const filePath = `${workspacePath}/${DATA_DIR_NAME}/${type}/${name}${DOC_EXT}`
      if (!(filePath in sampleDocs)) sampleDocs[filePath] = ''
      return filePath
    },
    async scanSnippets(workspacePath) {
      const prefix = `${workspacePath}/${SNIPPETS_DIR_NAME}/`
      return Object.keys(sampleDocs)
        .filter((p) => p.startsWith(prefix))
        .map((p) => {
          const rest = p.slice(prefix.length, -DOC_EXT.length)
          const slash = rest.indexOf('/')
          return { category: rest.slice(0, slash), title: rest.slice(slash + 1), path: p }
        })
        .sort((a, b) => a.category.localeCompare(b.category, 'ko') || a.title.localeCompare(b.title, 'ko'))
    },
    async ensureSnippet(workspacePath, category, title) {
      const filePath = `${workspacePath}/${SNIPPETS_DIR_NAME}/${category}/${title}${DOC_EXT}`
      if (!(filePath in sampleDocs)) sampleDocs[filePath] = ''
      return filePath
    },
    async readDict() {
      return sampleDictText
    },
    async writeDict(workspacePath, text) {
      sampleDictText = text
      return `${workspacePath}/${DICT_DIR_NAME}/사전.txt`
    },
    async scanTemplates(workspacePath) {
      const prefix = `${workspacePath}/${TEMPLATES_DIR_NAME}/`
      return Object.keys(sampleDocs)
        .filter((p) => p.startsWith(prefix))
        .map((p) => ({ type: 'file', name: p.slice(prefix.length, -DOC_EXT.length), path: p }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    },
    async ensureTemplate(workspacePath, name) {
      const filePath = `${workspacePath}/${TEMPLATES_DIR_NAME}/${name}${DOC_EXT}`
      if (!(filePath in sampleDocs)) sampleDocs[filePath] = ''
      return filePath
    },
    async scanImages() {
      return [...sampleImages.values()]
    },
    async importImage(workspacePath) {
      return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = () => {
          const file = input.files?.[0]
          if (!file) {
            resolve(null)
            return
          }
          const reader = new FileReader()
          reader.onload = () => {
            const dotIdx = file.name.lastIndexOf('.')
            const ext = dotIdx === -1 ? '' : file.name.slice(dotIdx)
            const baseName = (dotIdx === -1 ? file.name : file.name.slice(0, dotIdx)) || '이미지'
            let name = baseName
            let counter = 1
            while (sampleImages.has(name)) {
              name = `${baseName} (${counter})`
              counter += 1
            }
            const entry = { name, ext, path: `${workspacePath}/${IMAGES_DIR_NAME}/${name}${ext}`, dataUrl: reader.result }
            sampleImages.set(name, entry)
            resolve(entry)
          }
          reader.readAsDataURL(file)
        }
        input.click()
      })
    },
    async importImageData(workspacePath, fileName, base64Data) {
      const dotIdx = fileName.lastIndexOf('.')
      const ext = dotIdx === -1 ? '' : fileName.slice(dotIdx)
      const baseName = (dotIdx === -1 ? fileName : fileName.slice(0, dotIdx)) || '이미지'
      let name = baseName
      let counter = 1
      while (sampleImages.has(name)) {
        name = `${baseName} (${counter})`
        counter += 1
      }
      const mime = IMAGE_MIME_TYPES[ext.toLowerCase()] ?? 'application/octet-stream'
      const entry = { name, ext, path: `${workspacePath}/${IMAGES_DIR_NAME}/${name}${ext}`, dataUrl: `data:${mime};base64,${base64Data}` }
      sampleImages.set(name, entry)
      return entry
    },
    async renameImage(workspacePath, oldName, newName) {
      const entry = sampleImages.get(oldName)
      if (!entry) throw new Error(`이미지를 찾을 수 없습니다: ${oldName}`)
      const safeName = newName.trim() || oldName
      let name = safeName
      let counter = 1
      while (name !== oldName && sampleImages.has(name)) {
        name = `${safeName} (${counter})`
        counter += 1
      }
      sampleImages.delete(oldName)
      const updated = { ...entry, name, path: `${workspacePath}/${IMAGES_DIR_NAME}/${name}${entry.ext}` }
      sampleImages.set(name, updated)
      return updated
    },
    // No-op in the browser preview — the window-focus desync this works
    // around is a real-Electron/Windows-only bug (see electron/main.js).
    async refocusWindow() {},
    onWatchEvent(callback) {
      watchListeners.add(callback)
      return () => watchListeners.delete(callback)
    },
    onMenuChooseWorkspace() {
      return () => {}
    },
    __isMock: true,
  }
}

export function getApi() {
  if (typeof window !== 'undefined' && window.api) return window.api
  if (!getApi._mock) getApi._mock = createMockApi()
  return getApi._mock
}
