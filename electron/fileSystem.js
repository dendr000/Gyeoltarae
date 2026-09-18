// File-system helpers for the workspace tree: scanning, CRUD on .md documents.
import fs from 'node:fs'
import path from 'node:path'

const IGNORED_DIRS = new Set(['.git', 'node_modules', '.wikidesk-trash'])
const DOC_EXT = '.md'

// Windows forbids these in a single path segment (plus C0 control chars) —
// without this, naming a document e.g. "질문?" or "부제: 이야기" (both
// completely ordinary things to type) throws deep inside fs.writeFileSync/
// mkdirSync/renameSync with no handling anywhere between here and the UI,
// so the create/rename just silently does nothing from the user's side.
// Replacing instead of rejecting means the operation still succeeds.
const ILLEGAL_FILENAME_CHARS_RE = /[<>:"/\\|?*\x00-\x1f]/g

function sanitizeFileNameSegment(segment) {
  return segment.replace(ILLEGAL_FILENAME_CHARS_RE, '_').trim()
}

// For a plain file/folder name, where "/" is never meaningful.
function sanitizeFileName(name, fallback) {
  return sanitizeFileNameSegment(name ?? '') || fallback
}

// For a 분류/틀 name specifically, where "/" IS meaningful — 분류 for
// buildAutoCategoryNames' hierarchical names like "포켓몬스터/전국도감",
// 틀 for namu wiki-style sub-template names like "포켓몬스터/타입" (real
// namu wiki templates are routinely organized this way). Sanitize each
// segment but keep the slashes as real path separators.
function sanitizeCategoryName(name, fallback) {
  const cleaned = (name ?? '')
    .split('/')
    .map(sanitizeFileNameSegment)
    .filter(Boolean)
    .join('/')
  return cleaned || fallback
}

// 분류(category) page files live here instead of the regular workspace
// tree, so they get their own space in the sidebar rather than being mixed
// in among normal documents. Dot-prefixed, so scanTree's own "hide dotfiles"
// rule already keeps it out of the regular file tree for free.
export const CATEGORIES_DIR_NAME = '.wikidesk-categories'

// 자료(reusable data — moves, abilities, etc.) entries live here, one level
// deeper than categories: <워크스페이스>/.wikidesk-data/<유형>/<이름>.md.
// Same reasoning as categories — dot-prefixed so it's hidden from the
// regular tree and gets its own "자료" space in the sidebar instead.
export const DATA_DIR_NAME = '.wikidesk-data'

// 틀(template) documents live here, flat like categories — same reasoning:
// hidden from the regular tree, own "틀" space in the sidebar.
export const TEMPLATES_DIR_NAME = '.wikidesk-templates'

// 파일(image) uploads live here, flat like categories/templates — hidden
// from the regular tree, own "이미지" space in the sidebar. Unlike
// categories/data/templates (plain .md text), these are real binary image
// files copied in from wherever the user picked them.
export const IMAGES_DIR_NAME = '.wikidesk-images'

const IMAGE_MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
}

export const IMAGE_EXTENSIONS = Object.keys(IMAGE_MIME_TYPES)

function isDocFile(name) {
  return name.toLowerCase().endsWith(DOC_EXT)
}

export function scanTree(dirPath) {
  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })
    const nodes = []
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const fullPath = path.join(currentPath, entry.name)
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue
        nodes.push({
          type: 'dir',
          name: entry.name,
          path: fullPath,
          children: walk(fullPath),
        })
      } else if (entry.isFile() && isDocFile(entry.name)) {
        nodes.push({
          type: 'file',
          name: entry.name.slice(0, -DOC_EXT.length),
          path: fullPath,
        })
      }
    }
    // Directories first, then files, both alphabetical (locale-aware for Korean).
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
      return a.name.localeCompare(b.name, 'ko')
    })
    return nodes
  }
  return walk(dirPath)
}

export function readDoc(filePath) {
  return fs.readFileSync(filePath, 'utf-8')
}

export function writeDoc(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf-8')
}

// Every new document starts with this skeleton: an auto TOC, an "개요"
// heading to fill in, and an empty 분류 tag ready to be filled in.
const NEW_DOC_TEMPLATE = '[목차]\n= 개요 =\n\n\n[[분류:]]\n'

export function createDoc(dirPath, name) {
  const safeName = sanitizeFileName(name, '새 문서')
  let filePath = path.join(dirPath, `${safeName}${DOC_EXT}`)
  let counter = 1
  while (fs.existsSync(filePath)) {
    filePath = path.join(dirPath, `${safeName} (${counter})${DOC_EXT}`)
    counter += 1
  }
  fs.writeFileSync(filePath, NEW_DOC_TEMPLATE, 'utf-8')
  return filePath
}

export function createFolder(dirPath, name) {
  const safeName = sanitizeFileName(name, '새 폴더')
  let folderPath = path.join(dirPath, safeName)
  let counter = 1
  while (fs.existsSync(folderPath)) {
    folderPath = path.join(dirPath, `${safeName} (${counter})`)
    counter += 1
  }
  fs.mkdirSync(folderPath, { recursive: true })
  return folderPath
}

export function renamePath(oldPath, newName) {
  const dir = path.dirname(oldPath)
  const isDoc = fs.statSync(oldPath).isFile()
  const currentName = isDoc ? path.basename(oldPath, DOC_EXT) : path.basename(oldPath)
  const safeName = sanitizeFileName(newName, currentName)
  const newPath = path.join(dir, isDoc ? `${safeName}${DOC_EXT}` : safeName)
  fs.renameSync(oldPath, newPath)
  return newPath
}

export function categoriesDirPath(workspacePath) {
  return path.join(workspacePath, CATEGORIES_DIR_NAME)
}

// Every category page that already has a real file, for the sidebar's
// dedicated 분류 space and for rebuilding the category index. Category
// names can be hierarchical (e.g. "포켓몬스터/전국도감" — see
// useAppStore.js's buildAutoCategoryNames), so this has to walk
// subdirectories too, not just list the top level — a page's name is
// reconstructed from its path relative to this root (slashes and all),
// the same shape buildAutoCategoryNames produces.
export function scanCategoryPages(workspacePath) {
  const root = categoriesDirPath(workspacePath)
  if (!fs.existsSync(root)) return []
  const results = []
  function walk(dir, relSegments) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath, [...relSegments, entry.name])
      } else if (entry.isFile() && isDocFile(entry.name)) {
        const name = [...relSegments, entry.name.slice(0, -DOC_EXT.length)].join('/')
        results.push({ type: 'file', name, path: fullPath })
      }
    }
  }
  walk(root, [])
  return results.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}

// Get-or-create: a category has at most one page, keyed by its name, so
// re-requesting an existing category's page returns that same file instead
// of creating a "(1)" duplicate the way createDoc does for regular docs.
// mkdir targets the file's own parent (not just categoriesDirPath) since a
// hierarchical name like "포켓몬스터/전국도감" needs that "포켓몬스터"
// subfolder to exist first — without this, creating a description page for
// any nested category threw ENOENT.
export function ensureCategoryPage(workspacePath, categoryName) {
  const dir = categoriesDirPath(workspacePath)
  const safeName = sanitizeCategoryName(categoryName, '새 분류')
  const filePath = path.join(dir, `${safeName}${DOC_EXT}`)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '', 'utf-8')
  }
  return filePath
}

export function dataDirPath(workspacePath) {
  return path.join(workspacePath, DATA_DIR_NAME)
}

// Every data entry across every 유형 subfolder, for the sidebar's "자료"
// space and for rebuilding the data index.
export function scanDataEntries(workspacePath) {
  const root = dataDirPath(workspacePath)
  if (!fs.existsSync(root)) return []
  const entries = []
  for (const typeEntry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!typeEntry.isDirectory()) continue
    const typeDir = path.join(root, typeEntry.name)
    for (const fileEntry of fs.readdirSync(typeDir, { withFileTypes: true })) {
      if (!fileEntry.isFile() || !isDocFile(fileEntry.name)) continue
      entries.push({
        type: typeEntry.name,
        name: fileEntry.name.slice(0, -DOC_EXT.length),
        path: path.join(typeDir, fileEntry.name),
      })
    }
  }
  entries.sort((a, b) => a.type.localeCompare(b.type, 'ko') || a.name.localeCompare(b.name, 'ko'))
  return entries
}

// Get-or-create, keyed by (유형, 이름) — same "no (1) duplicates" reasoning
// as ensureCategoryPage.
export function ensureDataEntry(workspacePath, type, name) {
  const safeType = sanitizeFileName(type, '분류없음')
  const safeName = sanitizeFileName(name, '새 자료')
  const dir = path.join(dataDirPath(workspacePath), safeType)
  fs.mkdirSync(dir, { recursive: true })
  const filePath = path.join(dir, `${safeName}${DOC_EXT}`)
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '', 'utf-8')
  }
  return filePath
}

// 상용구(text-expansion snippet) documents live here, one level deeper than
// categories, same shape as 자료: <워크스페이스>/.wikidesk-snippets/
// <카테고리>/<제목>.md — a snippet's file content IS the text it expands
// to (may contain a `{#}` cursor-placement marker, and/or any normal wiki
// markup, which just renders normally once inserted into a document).
// Same "카테고리/제목 조합 키" reasoning as 자료's "유형/이름" — the same
// title can exist in different categories as unrelated snippets.
export const SNIPPETS_DIR_NAME = '.wikidesk-snippets'

export function snippetsDirPath(workspacePath) {
  return path.join(workspacePath, SNIPPETS_DIR_NAME)
}

// Every snippet across every category subfolder, for the sidebar's "상용구"
// space and for rebuilding the snippet index. Structurally identical to
// scanDataEntries — see its own comment for why the shape has to be this.
export function scanSnippets(workspacePath) {
  const root = snippetsDirPath(workspacePath)
  if (!fs.existsSync(root)) return []
  const entries = []
  for (const catEntry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!catEntry.isDirectory()) continue
    const catDir = path.join(root, catEntry.name)
    for (const fileEntry of fs.readdirSync(catDir, { withFileTypes: true })) {
      if (!fileEntry.isFile() || !isDocFile(fileEntry.name)) continue
      entries.push({
        category: catEntry.name,
        title: fileEntry.name.slice(0, -DOC_EXT.length),
        path: path.join(catDir, fileEntry.name),
      })
    }
  }
  entries.sort((a, b) => a.category.localeCompare(b.category, 'ko') || a.title.localeCompare(b.title, 'ko'))
  return entries
}

// Get-or-create, keyed by (카테고리, 제목) — same "no (1) duplicates"
// reasoning as ensureDataEntry.
export function ensureSnippet(workspacePath, category, title) {
  const safeCategory = sanitizeFileName(category, '공통')
  const safeTitle = sanitizeFileName(title, '새 상용구')
  const dir = path.join(snippetsDirPath(workspacePath), safeCategory)
  fs.mkdirSync(dir, { recursive: true })
  const filePath = path.join(dir, `${safeTitle}${DOC_EXT}`)
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '', 'utf-8')
  }
  return filePath
}

// 고유명사 사전 — a single flat file, one "원문(한자)" pair per line (same
// shape namu wiki/Galpi-style bulk-add already uses, adopted here as the
// storage format too so there's exactly one format to learn, and so
// copy-pasting an existing bulk list — from Galpi or anywhere else —
// straight into this file works with zero reformatting). Duplicate 원문
// lines are meaningful (homophones/multiple readings), not an error.
export const DICT_DIR_NAME = '.wikidesk-dict'
const DICT_FILE_NAME = '사전.txt'

export function dictFilePath(workspacePath) {
  return path.join(workspacePath, DICT_DIR_NAME, DICT_FILE_NAME)
}

export function readDictFile(workspacePath) {
  const filePath = dictFilePath(workspacePath)
  if (!fs.existsSync(filePath)) return ''
  return fs.readFileSync(filePath, 'utf-8')
}

export function writeDictFile(workspacePath, text) {
  const filePath = dictFilePath(workspacePath)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, text, 'utf-8')
  return filePath
}

export function templatesDirPath(workspacePath) {
  return path.join(workspacePath, TEMPLATES_DIR_NAME)
}

// Every template that already has a real file, for the sidebar's dedicated
// 틀 space and for rebuilding the template index. Recursive (like
// scanCategoryPages) so a hierarchical name like "포켓몬스터/타입" —
// namu wiki routinely organizes templates this way — is actually found;
// this used to be a flat readdirSync, which meant such a template's file
// could be created but would never show up anywhere in the app.
export function scanTemplates(workspacePath) {
  const root = templatesDirPath(workspacePath)
  if (!fs.existsSync(root)) return []
  const results = []
  function walk(dir, relSegments) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath, [...relSegments, entry.name])
      } else if (entry.isFile() && isDocFile(entry.name)) {
        const name = [...relSegments, entry.name.slice(0, -DOC_EXT.length)].join('/')
        results.push({ type: 'file', name, path: fullPath })
      }
    }
  }
  walk(root, [])
  return results.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}

// Get-or-create, keyed by name — same "no (1) duplicates" reasoning as
// ensureCategoryPage. sanitizeCategoryName (not sanitizeFileName) so "/" in
// a name like "포켓몬스터/타입" is kept as a real subfolder separator
// instead of being replaced with "_"; mkdir targets the file's own parent
// for the same reason ensureCategoryPage does.
export function ensureTemplate(workspacePath, name) {
  const dir = templatesDirPath(workspacePath)
  const safeName = sanitizeCategoryName(name, '새 틀')
  const filePath = path.join(dir, `${safeName}${DOC_EXT}`)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '', 'utf-8')
  }
  return filePath
}

export function imagesDirPath(workspacePath) {
  return path.join(workspacePath, IMAGES_DIR_NAME)
}

function imageMimeType(ext) {
  return IMAGE_MIME_TYPES[ext.toLowerCase()] ?? 'application/octet-stream'
}

function toDataUrl(filePath) {
  const buffer = fs.readFileSync(filePath)
  return `data:${imageMimeType(path.extname(filePath))};base64,${buffer.toString('base64')}`
}

// Every registered image, read eagerly as a data URL so [[파일:이름]] can be
// resolved synchronously anywhere it's used across the workspace — same
// "index built once, reused everywhere" approach as docIndex/dataIndex, just
// holding encoded binary content instead of wiki text. Fine at the scale a
// single-user local wiki's image set actually reaches; not meant to scale to
// hundreds of large images.
export function scanImages(workspacePath) {
  const dir = imagesDirPath(workspacePath)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase()))
    .map((entry) => {
      const filePath = path.join(dir, entry.name)
      const ext = path.extname(entry.name)
      return { name: entry.name.slice(0, -ext.length), ext, path: filePath, dataUrl: toDataUrl(filePath) }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}

// Shared "no (1) duplicates unless the name's actually taken" numbering —
// used everywhere a new image filename needs to be picked (import, drag &
// drop, rename). `keepPath`, when given, is excluded from the collision
// check since renaming a file to its own current name isn't a collision.
function nextAvailableImagePath(dir, baseName, ext, keepPath) {
  let destPath = path.join(dir, `${baseName}${ext}`)
  let counter = 1
  while (destPath !== keepPath && fs.existsSync(destPath)) {
    destPath = path.join(dir, `${baseName} (${counter})${ext}`)
    counter += 1
  }
  return destPath
}

// Copies a file picked from outside the workspace into the dedicated image
// space, keeping its original extension.
export function importImage(workspacePath, sourcePath) {
  const dir = imagesDirPath(workspacePath)
  fs.mkdirSync(dir, { recursive: true })
  const ext = path.extname(sourcePath)
  const baseName = path.basename(sourcePath, ext) || '이미지'
  const destPath = nextAvailableImagePath(dir, baseName, ext)
  fs.copyFileSync(sourcePath, destPath)
  return { name: path.basename(destPath, ext), ext, path: destPath, dataUrl: toDataUrl(destPath) }
}

// Same as importImage, but for bytes handed over from the renderer (drag &
// drop from Explorer) instead of a source path on disk — a dropped File
// object has no reliable filesystem path in modern Electron, only its raw
// content, which the renderer reads and ships over IPC as base64.
export function importImageData(workspacePath, fileName, buffer) {
  const dir = imagesDirPath(workspacePath)
  fs.mkdirSync(dir, { recursive: true })
  const ext = path.extname(fileName)
  const baseName = path.basename(fileName, ext) || '이미지'
  const destPath = nextAvailableImagePath(dir, baseName, ext)
  fs.writeFileSync(destPath, buffer)
  return { name: path.basename(destPath, ext), ext, path: destPath, dataUrl: toDataUrl(destPath) }
}

// Renames just the registered image's own file, keeping its original
// extension (unlike renamePath, which assumes any non-directory file is a
// .md document and would corrupt an image's extension). Existing
// [[파일:oldName]] references elsewhere aren't rewritten — same
// "just shows the missing placeholder again" behavior as deleting one.
export function renameImage(workspacePath, oldName, newName) {
  const dir = imagesDirPath(workspacePath)
  const match = fs
    .readdirSync(dir, { withFileTypes: true })
    .find(
      (entry) =>
        entry.isFile() &&
        IMAGE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase()) &&
        entry.name.slice(0, -path.extname(entry.name).length) === oldName,
    )
  if (!match) throw new Error(`이미지를 찾을 수 없습니다: ${oldName}`)
  const ext = path.extname(match.name)
  const oldPath = path.join(dir, match.name)
  const safeName = sanitizeFileName(newName, oldName)
  const destPath = nextAvailableImagePath(dir, safeName, ext, oldPath)
  fs.renameSync(oldPath, destPath)
  return { name: path.basename(destPath, ext), ext, path: destPath, dataUrl: toDataUrl(destPath) }
}
