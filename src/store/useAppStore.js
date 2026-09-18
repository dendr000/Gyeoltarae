// 제작자(Creator): dendr000 · 制作者: dendr000 · المُنشئ: dendr000
// hex: 43726561746f723a2064656e6472303030 ("Creator: dendr000")
import { create } from 'zustand'
import { getApi } from '../lib/api.js'
import {
  extractCategories,
  extractDataRefs,
  extractTemplateRefs,
  extractAliases,
  expandTemplateBody,
} from '../lib/wikiParser.js'
import { stripLeadingNumber } from '../lib/displayName.js'
import { parseDictText } from '../lib/dictCycle.js'

const SAVE_DEBOUNCE_MS = 800
const WATCH_REBUILD_DEBOUNCE_MS = 400
const THEME_STORAGE_KEY = 'wikidesk-theme'

let saveTimer = null
let watchRebuildTimer = null
// Not reactive state on purpose — a live Promise resolver can't be stored
// through zustand's set()/get() cleanly, so it lives in this module-level
// slot instead, same as saveTimer above.
let promptResolve = null
// Unsubscribe for the currently-registered onWatchEvent listener (see
// loadWorkspace) — without tracking this, switching workspaces would just
// keep stacking a new listener on top of the last one forever, each firing
// its own full rebuildIndexes() on every future file change.
let unsubscribeWatch = null

// A real file path can use either separator depending on where it came
// from (Windows APIs mostly give "\", but this app also runs against the
// browser-preview mock's "/"-only paths) — childPath?.startsWith(`${parentPath}/`)
// alone missed the "\" case, so deleting a folder never noticed the open
// document was inside it and left the editor showing content for a file
// that no longer exists.
function isPathUnder(childPath, parentPath) {
  return childPath === parentPath || childPath?.startsWith(`${parentPath}/`) || childPath?.startsWith(`${parentPath}\\`)
}

// 탭 하나 = "지금 화면에 보이는 문서" 필드들의 스냅샷. 파일이든(자료/틀/상용구도 결국 실제
// 파일이라 여기 포함) 아직 페이지가 없는 분류/자료/틀 미리보기든 이 8개 필드로 전부 표현됨.
const DOC_FIELD_KEYS = ['openPath', 'openName', 'rawText', 'isDirty', 'saveStatus', 'viewingCategory', 'viewingData', 'viewingTemplate']

function docFieldsOf(state) {
  const fields = {}
  for (const key of DOC_FIELD_KEYS) fields[key] = state[key]
  return fields
}

// 같은 대상을 다시 열면 탭이 늘어나는 대신 그 탭으로 전환되도록 하는 식별자. 실제로 열 게
// 하나도 없으면(워크스페이스를 막 열었을 때 등) null — 이땐 탭을 안 만들고 그냥 빈 화면만
// 보여줌(아래 showInTab 참고).
function tabIdOf(fields) {
  if (fields.openPath) return `file:${fields.openPath}`
  if (fields.viewingCategory) return `category:${fields.viewingCategory}`
  if (fields.viewingData) return `data:${fields.viewingData.type}/${fields.viewingData.name}`
  if (fields.viewingTemplate) return `template:${fields.viewingTemplate}`
  return null
}

function tabTitleOf(fields) {
  if (fields.viewingCategory) return `분류:${fields.viewingCategory}`
  if (fields.viewingData) return `자료:${fields.viewingData.type}/${fields.viewingData.name}`
  if (fields.viewingTemplate) return `틀:${fields.viewingTemplate}`
  return fields.openName ? stripLeadingNumber(fields.openName) : '문서'
}

// closeTab/closeTabsByPath/closeTabsUnderPath가 공유 — 이미 걸러낸(제거 대상이 빠진) 새
// tabs 배열과, 그중 지금 보고 있던 탭이 그 제거 대상에 포함됐는지, 옛 tabs 배열 기준으로
// 그 탭이 있던 자리(closedIndex)를 받아 다음에 뭘 보여줄지 정함 — 안 걸렸으면 목록만 갱신,
// 걸렸으면 같은 자리(밀려서 채워진 다음 탭) 또는 그 왼쪽 탭으로, 하나도 안 남았으면 빈 화면.
function resolveTabsAfterRemoval(tabs, activeWasRemoved, closedIndex) {
  if (!activeWasRemoved) return { tabs }
  const next = tabs[closedIndex] ?? tabs[closedIndex - 1]
  if (!next) {
    return {
      tabs,
      activeTabId: null,
      openPath: null,
      openName: null,
      rawText: '',
      isDirty: false,
      saveStatus: 'idle',
      viewingCategory: null,
      viewingData: null,
      viewingTemplate: null,
    }
  }
  return { ...docFieldsOf(next), tabs, activeTabId: next.id }
}

function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', theme)
  }
}

function loadStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'system'
  } catch {
    return 'system'
  }
}

// Galpi는 상용구 자동완성을 독립된 스위치 두 개로 나눠서 제공한다 — 그대로 이식.
// - isBpPreview("타이핑 중 실시간 추천 팝업 표시"): 등록된 단축어의 뒷부분을 치는 동안
//   커서 근처에 뜨는 후보 팝업 자체를 켜고 끔. 여기서는 snippetSuggestEnabled.
// - isBpAuto("스페이스바 자동 치환 발동"): 단축어를 끝까지 정확히 치고 스페이스를 누르면
//   팝업 없이 바로 치환되는 것을 켜고 끔(팝업이 꺼져 있어도 독립적으로 동작 가능). 여기서는
//   snippetSpaceExpandEnabled.
// 툴바의 "상용구 삽입"(전체 목록에서 수동으로 고르는 것)은 둘 다와 무관하게 항상 동작함.
const SNIPPET_SUGGEST_STORAGE_KEY = 'wikidesk-snippet-suggest'
const SNIPPET_SPACE_EXPAND_STORAGE_KEY = 'wikidesk-snippet-space-expand'

function loadSnippetSuggestEnabled() {
  try {
    return localStorage.getItem(SNIPPET_SUGGEST_STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

function loadSnippetSpaceExpandEnabled() {
  try {
    return localStorage.getItem(SNIPPET_SPACE_EXPAND_STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

// Creating a new folder directly inside one of these ("작품" — work —
// folders) auto-scaffolds a starter structure instead of an empty folder.
// See createFolder/createWorkFolder below.
const SCAFFOLD_TRIGGER_NAMES = new Set(['소설', '웹툰', '만화'])
const WORK_FOLDER_SCAFFOLD = {
  주인공: ['능력', '아이템'],
  등장인물: ['01 파랑', '02 초록', '03 노랑', '04 빨강'],
  사전: ['설정'],
  기록: [],
}

// Folders under these ALSO get every document auto-tagged with
// [[분류:...]] (see findWorkFolderContext) and get rename-cascading
// category updates, but do NOT get the 작품 스캐폴드 above — for folders
// organized differently (e.g. a Pokédex) that still want categories to
// track their structure. SCAFFOLD_TRIGGER_NAMES folders get both.
const CATEGORY_ONLY_TRIGGER_NAMES = new Set(['포켓몬스터'])

function basename(filePath) {
  return filePath.split(/[\\/]/).pop()
}

// Walks a directory path to see whether it's a work folder or nested inside
// one, and returns the work folder's own name plus the path from it down
// to dirPath (empty string if dirPath IS the work folder root) — or null
// if dirPath isn't under a recognized work folder at all. Used to auto-tag
// every document under a work folder with its own [[분류:이름]], and
// documents in a named subfolder with an additional [[분류:이름/하위폴더]].
//
// Two different shapes of "work folder", since SCAFFOLD_TRIGGER_NAMES
// (소설/웹툰/만화) and CATEGORY_ONLY_TRIGGER_NAMES (포켓몬스터 등) mean
// different things:
//  - SCAFFOLD_TRIGGER_NAMES are *containers* holding separate works, each
//    getting its own category — the work folder is the NEXT segment after
//    the trigger (e.g. "…/소설/이런 영웅은 싫어" → work folder "이런 영웅은
//    싫어").
//  - CATEGORY_ONLY_TRIGGER_NAMES name a single shared category directly —
//    the trigger IS the work folder (e.g. "…/포켓몬스터/전국도감" → work
//    folder "포켓몬스터" itself, "전국도감" is just a subfolder under it).
function findWorkFolderContext(dirPath) {
  const segments = dirPath.split(/[\\/]/)
  for (let i = 0; i < segments.length; i += 1) {
    if (CATEGORY_ONLY_TRIGGER_NAMES.has(segments[i])) {
      return { workFolderName: segments[i], relSubPath: segments.slice(i + 1).join('/') }
    }
  }
  for (let i = 0; i < segments.length - 1; i += 1) {
    if (SCAFFOLD_TRIGGER_NAMES.has(segments[i])) {
      return { workFolderName: segments[i + 1], relSubPath: segments.slice(i + 2).join('/') }
    }
  }
  return null
}

function buildAutoCategoryNames(dirPath) {
  const ctx = findWorkFolderContext(dirPath)
  if (!ctx) return []
  const names = [ctx.workFolderName]
  if (ctx.relSubPath) names.push(`${ctx.workFolderName}/${ctx.relSubPath}`)
  return names
}

// Fills the blank `[[분류:]]` line the default new-document template ends
// with (see electron/fileSystem.js's NEW_DOC_TEMPLATE) with the real auto
// category tags; if that placeholder isn't there (e.g. a 글양식 skeleton
// replaced the whole body), appends them instead.
function applyAutoCategoryTags(content, categoryNames) {
  if (categoryNames.length === 0) return content
  const tagLines = categoryNames.map((n) => `[[분류:${n}]]`).join('\n')
  if (content.includes('[[분류:]]')) {
    return content.replace('[[분류:]]', tagLines)
  }
  return `${content.replace(/\s+$/, '')}\n\n${tagLines}\n`
}

async function writeAutoCategoryTags(api, filePath, dirPath) {
  const categoryNames = buildAutoCategoryNames(dirPath)
  if (categoryNames.length === 0) return
  const current = await api.readFile(filePath)
  await api.writeFile(filePath, applyAutoCategoryTags(current, categoryNames))
}

function flattenFiles(nodes, acc = []) {
  for (const node of nodes ?? []) {
    if (node.type === 'file') acc.push(node)
    else if (node.children) flattenFiles(node.children, acc)
  }
  return acc
}

function findNodeByPath(nodes, targetPath) {
  for (const node of nodes ?? []) {
    if (node.path === targetPath) return node
    if (node.children) {
      const found = findNodeByPath(node.children, targetPath)
      if (found) return found
    }
  }
  return null
}

// The single [[분류:이름]] a folder under a work folder stands for — same
// name buildAutoCategoryNames would add to a new document placed directly
// in that folder. Null outside a work folder.
function categoryNameForPath(folderPath) {
  const ctx = findWorkFolderContext(folderPath)
  if (!ctx) return null
  return ctx.relSubPath ? `${ctx.workFolderName}/${ctx.relSubPath}` : ctx.workFolderName
}

const CATEGORY_TAG_RE = /\[\[분류:([^\]|]+)(\|[^\]]*)?\]\]/g

// When a folder under a work folder gets renamed, its own name changes but
// nothing rewrites the [[분류:...]] tags documents already had pointing at
// its OLD name — so they'd silently go stale. This swaps oldCategoryName
// for newCategoryName in every matching tag, preserving any deeper suffix
// (분류:이름/주인공/세부 → 분류:새이름/주인공/세부 style) and any |출력명
// override, and leaving unrelated categories untouched.
function rewriteCategoryPrefix(content, oldCategoryName, newCategoryName) {
  return content.replace(CATEGORY_TAG_RE, (whole, name, labelSuffix = '') => {
    if (name === oldCategoryName) return `[[분류:${newCategoryName}${labelSuffix}]]`
    if (name.startsWith(`${oldCategoryName}/`)) {
      return `[[분류:${newCategoryName}${name.slice(oldCategoryName.length)}${labelSuffix}]]`
    }
    return whole
  })
}

export const useAppStore = create((set, get) => ({
  workspacePath: null,
  tree: [],
  openPath: null,
  openName: null,
  rawText: '',
  isDirty: false,
  // 열린 탭 목록 — 각 원소는 { id, title, openPath, openName, rawText, isDirty, saveStatus,
  // viewingCategory, viewingData, viewingTemplate } 스냅샷. 지금 화면에 보이는 위 openPath/
  // rawText/... 필드는 항상 activeTabId가 가리키는 탭의 내용과 같음 — 탭을 새로 열거나
  // 전환할 때(showInTab/switchTab) 그 순간의 현재 필드를 먼저 원래 탭에 저장해 두고 나서
  // 갈아끼우는 식으로 동기화됨. 재시작하면 초기화됨(워크스페이스 자체처럼 영속시키진 않음).
  tabs: [],
  activeTabId: null,
  mode: 'dual', // 'preview' | 'dual' | 'focus'
  // Set by a heading's [편집] link (see wikiParser.js's editableOffsets and
  // ViewerPane.jsx's handleWikiContentClick) to the character offset in the
  // CURRENT document's raw text where that heading starts. EditorPane.jsx
  // watches this, jumps the textarea's cursor/scroll there once, and clears
  // it back to null — a one-shot "consume and reset" the same way
  // promptRequest/resolvePrompt already works in this store, rather than a
  // ref passed directly between the two sibling panes.
  editorJumpOffset: null,
  saveStatus: 'idle', // 'idle' | 'saving' | 'saved' | 'error'
  theme: 'system', // 'system' | 'light' | 'dark'
  // { [categoryName]: { members: [{path,name}], parents: [name], pagePath, pageRawText } }
  categoryIndex: {},
  // { [`${type}/${name}`]: { type, name, path, rawText, usedBy: [{path,name}] } }
  dataIndex: {},
  // { [name]: { name, path, rawText, usedBy: [{path,name}] } }
  templateIndex: {},
  // { [path]: { content, aliases } } for every regular workspace document —
  // built as a side effect of rebuildIndexes' own read-every-file pass (no
  // extra I/O), kept around so title/content/[[별칭:...]] search doesn't
  // need to re-read from disk.
  searchIndex: {},
  // { [name or stripLeadingNumber(name)]: [{path, name}, ...] } — how
  // [[문서명]] wikilinks resolve to a real document. See rebuildIndexes.
  docIndex: {},
  // Set when a 분류 badge is clicked for a category with no real page file
  // yet, so ViewerPane can show the auto-generated listing on its own.
  viewingCategory: null,
  // Same idea as viewingCategory, for a [[자료:유형/이름]] card with no entry
  // file yet, or when browsing the 자료 sidebar directly.
  viewingData: null,
  // Same idea again, for browsing/creating a 틀 from the sidebar.
  viewingTemplate: null,
  // { [name]: { name, ext, path, dataUrl } } — every registered image
  // ([[파일:이름]]), read as a data URL so the viewer can render it with no
  // extra IPC round trip. See rebuildIndexes and importImage/deleteImage.
  imageIndex: {},
  // { ["카테고리/제목"]: { category, title, path, content } } — 상용구
  // (텍스트 자동완성). See rebuildIndexes and createSnippetWithContent/deleteSnippet.
  snippetIndex: {},
  // 상용구 자동완성 관련 스위치 둘 다 localStorage 저장(테마와 동일 패턴) — 워크스페이스와
  // 무관한 사용자 UI 설정이라 파일로 저장하지 않음.
  snippetSuggestEnabled: loadSnippetSuggestEnabled(),
  snippetSpaceExpandEnabled: loadSnippetSpaceExpandEnabled(),
  // 고유명사 사전(.wikidesk-dict/사전.txt) 원문 그대로 + Alt+H 순환치환용으로
  // 미리 파싱해 둔 Map<원문, 한자[]> — 둘 다 rebuildIndexes에서 같이 채워짐.
  dictText: '',
  dictMap: new Map(),
  // { title, fields, confirmLabel? } when a PromptModal should be showing —
  // see requestPrompt/resolvePrompt. Electron never implements
  // window.prompt() (alert/confirm work, prompt doesn't), so every
  // "ask for a name" flow in the app goes through this instead.
  promptRequest: null,

  requestPrompt(config) {
    return new Promise((resolve) => {
      promptResolve = resolve
      set({ promptRequest: config })
    })
  },

  resolvePrompt(result) {
    set({ promptRequest: null })
    const resolve = promptResolve
    promptResolve = null
    resolve?.(result)
  },

  initTheme() {
    const theme = loadStoredTheme()
    applyTheme(theme)
    set({ theme })
  },

  setSnippetSuggestEnabled(enabled) {
    try {
      localStorage.setItem(SNIPPET_SUGGEST_STORAGE_KEY, String(enabled))
    } catch {
      /* localStorage unavailable; setting just won't persist across restarts */
    }
    set({ snippetSuggestEnabled: enabled })
  },

  setSnippetSpaceExpandEnabled(enabled) {
    try {
      localStorage.setItem(SNIPPET_SPACE_EXPAND_STORAGE_KEY, String(enabled))
    } catch {
      /* localStorage unavailable; setting just won't persist across restarts */
    }
    set({ snippetSpaceExpandEnabled: enabled })
  },

  setTheme(theme) {
    applyTheme(theme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      /* localStorage unavailable; theme just won't persist across restarts */
    }
    set({ theme })
  },

  async initWorkspace() {
    const api = getApi()
    const last = await api.getLastWorkspace()
    if (last) await get().loadWorkspace(last)
  },

  async chooseWorkspace() {
    const api = getApi()
    const chosen = await api.chooseWorkspace()
    if (chosen) await get().loadWorkspace(chosen)
  },

  async loadWorkspace(workspacePath) {
    const api = getApi()
    const tree = await api.scanWorkspace(workspacePath)
    set({ workspacePath, tree })
    await get().rebuildIndexes()

    // Drop the previous workspace's listener first — otherwise switching
    // workspaces (or reloading the same one) stacks another one on top
    // every time, and every future file change fires as many redundant
    // full rebuildIndexes() calls as times this has ever run.
    unsubscribeWatch?.()
    unsubscribeWatch = api.onWatchEvent?.(() => {
      // A single save/import/rename easily fires several raw fs events in
      // a burst (chokidar) — debouncing coalesces a burst into one
      // rebuild instead of one per event.
      if (watchRebuildTimer) clearTimeout(watchRebuildTimer)
      watchRebuildTimer = setTimeout(async () => {
        const freshTree = await api.scanWorkspace(get().workspacePath)
        set({ tree: freshTree })
        await get().rebuildIndexes()
      }, WATCH_REBUILD_DEBOUNCE_MS)
    })
  },

  async refreshTree() {
    const api = getApi()
    const { workspacePath } = get()
    if (!workspacePath) return
    const tree = await api.scanWorkspace(workspacePath)
    set({ tree })
  },

  // One pass over every workspace document builds all three dedicated-space
  // indexes at once (each doc is only read from disk once):
  //  - categoryIndex: [[분류:이름]] tags (→ members) + every file in
  //    .wikidesk-categories (→ that category's own page: description +
  //    its own parent categories)
  //  - dataIndex: [[자료:유형/이름]] refs (→ usedBy) + every file in
  //    .wikidesk-data (→ that entry's stored fields)
  //  - templateIndex: {{틀:이름...}}/[include(이름...)] refs (→ usedBy) +
  //    every file in .wikidesk-templates (→ that template's raw body, used
  //    both for the sidebar view and to actually expand calls at render time)
  async rebuildIndexes() {
    const api = getApi()
    const { workspacePath } = get()
    if (!workspacePath) return
    const files = flattenFiles(get().tree)

    // [[문서명]] wikilinks resolve against this: keyed by both a doc's real
    // file name and (when it has a leading order number like "0891 치고마")
    // its number-stripped display name too, so [[치고마]] finds it without
    // the link author needing to know/type the number. Each key maps to a
    // list since more than one doc can share a name (or a stripped name) —
    // the renderer treats >1 as ambiguous rather than guessing.
    const docIndex = {}
    const indexDoc = (key, file) => {
      if (!key) return
      if (!docIndex[key]) docIndex[key] = []
      if (!docIndex[key].some((d) => d.path === file.path)) {
        docIndex[key].push({ path: file.path, name: file.name })
      }
    }
    for (const file of files) {
      indexDoc(file.name, file)
      const stripped = stripLeadingNumber(file.name)
      if (stripped !== file.name) indexDoc(stripped, file)
    }

    const categoryIndex = {}
    const ensureCategory = (name) => {
      if (!categoryIndex[name]) {
        categoryIndex[name] = { members: [], parents: [], pagePath: null, pageName: null, pageRawText: '' }
      }
      return categoryIndex[name]
    }

    const dataIndex = {}
    const ensureData = (type, name) => {
      const key = `${type}/${name}`
      if (!dataIndex[key]) {
        dataIndex[key] = { type, name, path: null, rawText: '', usedBy: [] }
      }
      return dataIndex[key]
    }

    const templateIndex = {}
    const ensureTemplate = (name) => {
      if (!templateIndex[name]) {
        templateIndex[name] = { name, path: null, rawText: '', usedBy: [] }
      }
      return templateIndex[name]
    }

    const searchIndex = {}
    for (const file of files) {
      let content = ''
      try {
        content = await api.readFile(file.path)
      } catch {
        continue
      }
      const aliases = extractAliases(content)
      searchIndex[file.path] = { content, aliases }
      // A document's [[별칭:이름]] tags resolve [[문서명]] wikilinks the
      // same as its real (or number-stripped) file name does — so a Pokémon
      // that only ever appears as one line in its evolved form's article
      // (real namu wiki style: no separate "0891 치고마" stub, [[별칭:치고마]]
      // declared inside "0892 우라오스" instead) still makes [[치고마]] and
      // the auto "]]"-triggered rewrite in EditorPane.jsx resolve straight
      // to that real document, with no dummy file required.
      for (const alias of aliases) indexDoc(alias, file)
      for (const cat of extractCategories(content)) {
        ensureCategory(cat).members.push({ path: file.path, name: file.name })
      }
      for (const ref of extractDataRefs(content)) {
        ensureData(ref.type, ref.name).usedBy.push({ path: file.path, name: file.name })
      }
      for (const name of extractTemplateRefs(content)) {
        ensureTemplate(name).usedBy.push({ path: file.path, name: file.name })
      }
    }

    const categoryPages = await api.scanCategories(workspacePath)
    for (const page of categoryPages) {
      let content = ''
      try {
        content = await api.readFile(page.path)
      } catch {
        continue
      }
      const entry = ensureCategory(page.name)
      entry.pagePath = page.path
      entry.pageName = page.name
      entry.pageRawText = content
      entry.parents = extractCategories(content)
    }

    const dataEntries = await api.scanData(workspacePath)
    for (const item of dataEntries) {
      let content = ''
      try {
        content = await api.readFile(item.path)
      } catch {
        continue
      }
      const entry = ensureData(item.type, item.name)
      entry.path = item.path
      entry.rawText = content
    }

    const templates = await api.scanTemplates(workspacePath)
    for (const item of templates) {
      let content = ''
      try {
        content = await api.readFile(item.path)
      } catch {
        continue
      }
      const entry = ensureTemplate(item.name)
      entry.path = item.path
      entry.rawText = content
    }

    // 상용구 — same shape as 자료 above, keyed by "카테고리/제목" (a title
    // can legitimately repeat across different categories).
    const snippetItems = await api.scanSnippets(workspacePath)
    const snippetIndex = {}
    for (const item of snippetItems) {
      let content = ''
      try {
        content = await api.readFile(item.path)
      } catch {
        continue
      }
      snippetIndex[`${item.category}/${item.title}`] = {
        category: item.category,
        title: item.title,
        path: item.path,
        content,
      }
    }

    // 고유명사 사전 — one flat file, re-read fresh from disk every rebuild
    // same as everything else here (the ~800ms autosave debounce means this
    // is never more than momentarily behind whatever's actually being typed
    // into it — see saveOpenFile's dict branch).
    const dictText = await api.readDict(workspacePath)
    const dictMap = parseDictText(dictText)

    // Images carry their own content (a data URL) straight from scanImages
    // rather than a separate per-entry readFile pass — there's no text body
    // to read, and reading the binary is what building that data URL
    // already did on the main-process side.
    const imageEntries = await api.scanImages(workspacePath)
    const imageIndex = {}
    for (const item of imageEntries) {
      imageIndex[item.name] = item
    }

    set({ categoryIndex, dataIndex, templateIndex, searchIndex, docIndex, imageIndex, snippetIndex, dictText, dictMap })
  },

  // Opens a category: loads its page for editing if one already exists,
  // otherwise just switches the viewer into category mode so the "만들기"
  // CTA can show.
  async openCategory(name) {
    const api = getApi()
    await get().flushActiveTabToDisk()
    const entry = get().categoryIndex[name]
    if (entry?.pagePath) {
      const content = await api.readFile(entry.pagePath)
      get().showInTab({
        openPath: entry.pagePath,
        openName: entry.pageName,
        rawText: content,
        isDirty: false,
        saveStatus: 'idle',
        viewingCategory: name,
        viewingData: null,
        viewingTemplate: null,
      })
    } else {
      get().showInTab({
        openPath: null,
        openName: null,
        rawText: '',
        isDirty: false,
        saveStatus: 'idle',
        viewingCategory: name,
        viewingData: null,
        viewingTemplate: null,
      })
    }
  },

  closeCategory() {
    set({ viewingCategory: null })
  },

  async createCategoryPage(categoryName) {
    const api = getApi()
    const { workspacePath } = get()
    if (!workspacePath) return
    await api.ensureCategoryPage(workspacePath, categoryName)
    await get().rebuildIndexes()
    await get().openCategory(categoryName)
  },

  // Deletes just the category's own page (description + its parent tags).
  // Documents still tagged with [[분류:이름]] keep showing up as members —
  // this only removes the empty/orphaned page itself, e.g. after renaming
  // every tag away from a category and leaving its page behind with 0 docs.
  async deleteCategoryPage(name) {
    const api = getApi()
    const entry = get().categoryIndex[name]
    if (!entry?.pagePath) return
    await api.deleteFile(entry.pagePath)
    get().closeTabsByPath(entry.pagePath)
    if (get().viewingCategory === name) {
      set({ viewingCategory: null })
    }
    await get().rebuildIndexes()
  },

  // Opens a data entry (유형/이름): loads it for editing if a real file
  // exists yet, otherwise just switches the viewer into "자료" mode so the
  // "만들기" CTA can show. Mirrors openCategory.
  async openDataEntry(type, name) {
    const api = getApi()
    await get().flushActiveTabToDisk()
    const key = `${type}/${name}`
    const entry = get().dataIndex[key]
    if (entry?.path) {
      const content = await api.readFile(entry.path)
      get().showInTab({
        openPath: entry.path,
        openName: entry.name,
        rawText: content,
        isDirty: false,
        saveStatus: 'idle',
        viewingData: { type, name },
        viewingCategory: null,
        viewingTemplate: null,
      })
    } else {
      get().showInTab({
        openPath: null,
        openName: null,
        rawText: '',
        isDirty: false,
        saveStatus: 'idle',
        viewingData: { type, name },
        viewingCategory: null,
        viewingTemplate: null,
      })
    }
  },

  closeDataView() {
    set({ viewingData: null })
  },

  async createDataEntry(type, name) {
    const api = getApi()
    const { workspacePath } = get()
    if (!workspacePath) return
    await api.ensureDataEntry(workspacePath, type, name)
    await get().rebuildIndexes()
    await get().openDataEntry(type, name)
  },

  // Opens a snippet (상용구) for editing — always backed by a real file,
  // unlike 자료/틀's openDataEntry/openTemplate: there's no "[[상용구:...]]"
  // -style inline reference syntax that could populate a snippetIndex entry
  // by reference alone, so every entry here was already made through the
  // sidebar's own "+" button and has a real path.
  async openSnippet(category, title) {
    const api = getApi()
    const entry = get().snippetIndex[`${category}/${title}`]
    if (!entry?.path) return
    await get().flushActiveTabToDisk()
    const content = await api.readFile(entry.path)
    get().showInTab({
      openPath: entry.path,
      openName: entry.title,
      rawText: content,
      isDirty: false,
      saveStatus: 'idle',
      viewingCategory: null,
      viewingData: null,
      viewingTemplate: null,
    })
  },

  // 제목+본문을 한 번에 등록 — Galpi의 BoilerplateForm(단축어 입력칸 + 본문 textarea +
  // "추가" 버튼, 한 화면 안에서 같이 입력받고 끝남)과 동일한 흐름. SnippetModal에서 사용 —
  // "만들고 메인 에디터로 열어서 거기서 타이핑"하던 예전 2단계 방식(자료/틀과는 통일되지만
  // 상용구가 뭘 하는 기능인지 알기 어렵다는 피드백을 받음)은 폐기함. 본문이 길어 툴바 도움이
  // 필요하면 목록 각 줄의 "에디터에서 열기"로 openSnippet을 거쳐 메인 에디터에서 계속 쓸 수
  // 있음.
  async createSnippetWithContent(category, title, content) {
    const api = getApi()
    const { workspacePath } = get()
    if (!workspacePath) return
    const safeCategory = category?.trim() || '공통'
    const filePath = await api.ensureSnippet(workspacePath, safeCategory, title)
    await api.writeFile(filePath, content)
    await get().rebuildIndexes()
  },

  // 상용구 일괄 등록 — Galpi의 useBoilerplateData.handleBpBulk를 그대로 포팅. 한 줄에
  // 하나씩, "제목::::본문"(4개의 콜론) 형식 또는 "키(값)" 형식(둘 중 한글이 아닌 쪽을
  // 자동으로 제목으로 인식 — 한글/한자 어느 순서로 붙여넣어도 됨) 둘 다 지원. 이미 같은
  // 카테고리/제목이 있으면 건너뜀(덮어쓰지 않음 — Galpi도 동일). 실제로 등록된 개수를
  // 돌려줌(호출부에서 "N개 등록" 안내에 사용).
  async bulkCreateSnippets(category, rawText) {
    const api = getApi()
    const { workspacePath, snippetIndex } = get()
    if (!workspacePath) return 0
    const safeCategory = category?.trim() || '공통'
    const lines = rawText.split('\n')
    let count = 0
    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line) continue
      let title = ''
      let content = ''
      const delimIdx = line.indexOf('::::')
      if (delimIdx !== -1) {
        title = line.slice(0, delimIdx).trim()
        content = line.slice(delimIdx + 4).trim()
      } else {
        const match = line.match(/^([^()]+)\(([^()]+)\)$/)
        if (match) {
          let k = match[1].trim()
          let v = match[2].trim()
          if (/[가-힣]/.test(v) && !/[가-힣]/.test(k)) [k, v] = [v, k]
          title = k
          content = `${k}(${v})`
        }
      }
      if (!title || !content) continue
      if (snippetIndex[`${safeCategory}/${title}`]) continue
      const filePath = await api.ensureSnippet(workspacePath, safeCategory, title)
      await api.writeFile(filePath, content)
      count += 1
    }
    if (count > 0) await get().rebuildIndexes()
    return count
  },

  // Deletes just the snippet's own file (no backlinks to worry about,
  // unlike deleteDataEntry/deleteTemplate — nothing else references a
  // snippet by name, it only ever gets pulled in by the editor's own
  // autocomplete at the moment of insertion).
  async deleteSnippet(category, title) {
    const api = getApi()
    const entry = get().snippetIndex[`${category}/${title}`]
    if (!entry?.path) return
    await api.deleteFile(entry.path)
    get().closeTabsByPath(entry.path)
    await get().rebuildIndexes()
  },

  // 사전 일괄 등록 — Galpi의 DictBulkForm/parseBulkDict을 포팅. "원문(한자)" 줄을
  // 여러 줄 붙여넣으면 파싱해서 기존 사전 파일 끝에 추가함(단일 등록도 한 줄짜리 텍스트로
  // 이 함수를 그대로 호출). 한글이 아닌 쪽과 한글인 쪽을 자동 판별해서 순서를 바로잡음(예:
  // "東方(동방)"처럼 한자를 먼저 썼어도 word=동방/translation=東方으로 정정됨). 이미 있는
  // (원문,한자) 쌍은 건너뜀(중복 등록 방지). rebuildIndexes가 항상 dictText를 최신으로
  // 유지해 두므로(사전은 더 이상 메인 에디터로 "열어서" 편집하는 대상이 아님 — 항목이
  // 10만 개를 넘어가면 그 방식은 매 입력마다 문서 전체를 다시 렌더링/파싱하느라 앱이
  // 멈추는 수준으로 느려짐, 아래 DictModal 참고) 디스크를 다시 읽지 않고 그대로 이어 붙임.
  async bulkAddDictEntries(rawText) {
    const api = getApi()
    const { workspacePath, dictText } = get()
    if (!workspacePath) return 0

    const dictMapNow = parseDictText(dictText)
    const lines = rawText.split('\n')
    const newLines = []
    let count = 0
    for (const raw of lines) {
      const line = raw.trim()
      if (!line) continue
      const match = line.match(/^([^()]+)\(([^()]+)\)$/)
      if (!match) continue
      let word = match[1].trim()
      let translation = match[2].trim()
      if (/[가-힣]/.test(translation) && !/[가-힣]/.test(word)) [word, translation] = [translation, word]
      if (!word || !translation) continue
      const existingTranslations = dictMapNow.get(word) ?? []
      if (existingTranslations.includes(translation)) continue
      existingTranslations.push(translation)
      dictMapNow.set(word, existingTranslations)
      newLines.push(`${word}(${translation})`)
      count += 1
    }

    if (count === 0) return 0

    const separator = dictText && !dictText.endsWith('\n') ? '\n' : ''
    const newText = dictText + separator + newLines.join('\n') + '\n'
    await api.writeDict(workspacePath, newText)
    await get().rebuildIndexes()
    return count
  },

  // 사전 항목 하나 삭제 — 같은 (원문,한자) 쌍을 가진 줄을 파일에서 제거. 동음이의어라
  // 같은 원문에 여러 줄이 있을 수 있으므로 원문만으로는 안 되고 반드시 한자/번역까지 같이
  // 봐야 그 줄 하나만 정확히 지울 수 있음.
  async deleteDictEntry(word, translation) {
    const api = getApi()
    const { workspacePath, dictText } = get()
    if (!workspacePath) return
    const target = `${word}(${translation})`
    const newText = dictText
      .split('\n')
      .filter((line) => line.trim() !== target)
      .join('\n')
    await api.writeDict(workspacePath, newText)
    await get().rebuildIndexes()
  },

  // Opens a template (틀): loads it for editing if a real file exists yet,
  // otherwise just switches the viewer into "틀" mode so the "만들기" CTA
  // can show. Mirrors openCategory/openDataEntry.
  async openTemplate(name) {
    const api = getApi()
    await get().flushActiveTabToDisk()
    const entry = get().templateIndex[name]
    if (entry?.path) {
      const content = await api.readFile(entry.path)
      get().showInTab({
        openPath: entry.path,
        openName: entry.name,
        rawText: content,
        isDirty: false,
        saveStatus: 'idle',
        viewingTemplate: name,
        viewingCategory: null,
        viewingData: null,
      })
    } else {
      get().showInTab({
        openPath: null,
        openName: null,
        rawText: '',
        isDirty: false,
        saveStatus: 'idle',
        viewingTemplate: name,
        viewingCategory: null,
        viewingData: null,
      })
    }
  },

  closeTemplateView() {
    set({ viewingTemplate: null })
  },

  async createTemplate(name) {
    const api = getApi()
    const { workspacePath } = get()
    if (!workspacePath) return
    await api.ensureTemplate(workspacePath, name)
    await get().rebuildIndexes()
    await get().openTemplate(name)
  },

  // Deletes just the template's own file. Documents that still call
  // {{틀:이름}}/[include(이름)] will show the "틀 없음" placeholder again.
  async deleteTemplate(name) {
    const api = getApi()
    const entry = get().templateIndex[name]
    if (!entry?.path) return
    await api.deleteFile(entry.path)
    get().closeTabsByPath(entry.path)
    if (get().viewingTemplate === name) {
      set({ viewingTemplate: null })
    }
    await get().rebuildIndexes()
  },

  // Deletes just the data entry's own file. Documents that still reference
  // it via [[자료:유형/이름]] will show the "자료 없음" placeholder again.
  async deleteDataEntry(type, name) {
    const api = getApi()
    const key = `${type}/${name}`
    const entry = get().dataIndex[key]
    if (!entry?.path) return
    await api.deleteFile(entry.path)
    get().closeTabsByPath(entry.path)
    const viewingData = get().viewingData
    if (viewingData?.type === type && viewingData?.name === name) {
      set({ viewingData: null })
    }
    await get().rebuildIndexes()
  },

  // Opens a native file picker (main process side — see electron/main.js)
  // and copies whatever's chosen into the workspace's dedicated image space.
  // Returns the registered name (for callers that want to insert
  // [[파일:이름]] right away, e.g. the editor toolbar), or null if the user
  // canceled the picker.
  async importImage() {
    const api = getApi()
    const { workspacePath } = get()
    if (!workspacePath) return null
    const imported = await api.importImage(workspacePath)
    if (!imported) return null
    await get().rebuildIndexes()
    return imported.name
  },

  // Deletes just the image file. Documents that still reference it via
  // [[파일:이름]] will show the "파일 없음" placeholder again.
  async deleteImage(name) {
    const api = getApi()
    const entry = get().imageIndex[name]
    if (!entry?.path) return
    await api.deleteFile(entry.path)
    await get().rebuildIndexes()
  },

  // Bulk drag & drop from Explorer (see FileTree.jsx's handleDrop) —
  // imports every file one at a time (each needs its own name-collision
  // check against what's already registered, including earlier files in
  // this same drop) and rebuilds indexes once at the end rather than after
  // each one.
  async importImageFiles(files) {
    const api = getApi()
    const { workspacePath } = get()
    if (!workspacePath || files.length === 0) return
    for (const { name, base64 } of files) {
      await api.importImageData(workspacePath, name, base64)
    }
    await get().rebuildIndexes()
  },

  // Renames just the image file (keeps its extension — see fileSystem.js's
  // renameImage). Same as delete: existing [[파일:이름]] references using
  // the old name just go back to showing the "파일 없음" placeholder,
  // they're not rewritten.
  async renameImage(oldName, newName) {
    const api = getApi()
    const { workspacePath } = get()
    if (!workspacePath) return
    await api.renameImage(workspacePath, oldName, newName)
    await get().rebuildIndexes()
  },

  async openFile(filePath, name) {
    const api = getApi()
    await get().flushActiveTabToDisk()
    const content = await api.readFile(filePath)
    get().showInTab({
      openPath: filePath,
      openName: name,
      rawText: content,
      isDirty: false,
      saveStatus: 'idle',
      viewingCategory: null,
      viewingData: null,
      viewingTemplate: null,
    })
  },

  updateText(text) {
    set({ rawText: text, isDirty: true, saveStatus: 'idle' })
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      get().saveOpenFile()
    }, SAVE_DEBOUNCE_MS)
  },

  async saveOpenFile() {
    const api = getApi()
    const { openPath, rawText, isDirty } = get()
    if (!openPath || !isDirty) return
    set({ saveStatus: 'saving' })
    try {
      await api.writeFile(openPath, rawText)
      set({ isDirty: false, saveStatus: 'saved' })
      await get().rebuildIndexes()
    } catch (err) {
      console.error('Failed to save file', err)
      set({ saveStatus: 'error' })
    }
  },

  // 탭을 벗어나기 직전(다른 탭 열기/전환/닫기) 지금 탭에 아직 디스크에 안 써진 변경이 있으면
  // 그 자리에서 바로 씀 — 그냥 tabs 배열에 메모리 스냅샷만 남기고 넘어가면, 디바운스 타이머가
  // 아직 안 돌았는데 그 사이 창을 닫거나 다른 탭에서 더 편집하다 앱이 꺼지는 경우 이 탭의
  // 마지막 몇 글자가 디스크엔 한 번도 안 써진 채로 사라질 수 있음. saveTimer도 같이 지워서,
  // 이미 여기서 저장했는데 나중에 옛 타이머가 또 발동해 그 시점의(이미 다른 탭으로 바뀐)
  // rawText/openPath를 엉뚱하게 다시 저장하는 것도 막음.
  async flushActiveTabToDisk() {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    const { isDirty, openPath } = get()
    if (isDirty && openPath) await get().saveOpenFile()
  },

  // 지금 화면 필드(openPath/rawText/... 8개)를 새 fields로 갈아끼우면서 탭 목록도 같이
  // 맞춤 — 모든 open*/create* 액션이 마지막에 직접 set(...)하는 대신 이걸 거침. 같은 대상이
  // 이미 탭으로 있으면 그 탭을 갱신+활성화, 없으면 새 탭 추가, 실제로 열 게 없으면(fields가
  // 전부 비어 있음 — 초기 빈 워크스페이스 등) 탭 없이 화면만 비움. 호출 전에 반드시
  // flushActiveTabToDisk를 먼저 기다려야 나가는 탭의 미저장 내용이 안 날아감.
  showInTab(fields) {
    set((state) => {
      let tabs = state.activeTabId
        ? state.tabs.map((t) => (t.id === state.activeTabId ? { ...t, ...docFieldsOf(state) } : t))
        : state.tabs
      const id = tabIdOf(fields)
      if (id == null) return { ...fields, tabs, activeTabId: null }
      const title = tabTitleOf(fields)
      tabs = tabs.some((t) => t.id === id)
        ? tabs.map((t) => (t.id === id ? { id, title, ...fields } : t))
        : [...tabs, { id, title, ...fields }]
      return { ...fields, tabs, activeTabId: id }
    })
  },

  async switchTab(id) {
    const state = get()
    if (id === state.activeTabId) return
    await get().flushActiveTabToDisk()
    const target = get().tabs.find((t) => t.id === id)
    if (!target) return
    set((s) => ({
      ...docFieldsOf(target),
      tabs: s.activeTabId ? s.tabs.map((t) => (t.id === s.activeTabId ? { ...t, ...docFieldsOf(s) } : t)) : s.tabs,
      activeTabId: id,
    }))
  },

  async closeTab(id) {
    const wasActive = id === get().activeTabId
    if (wasActive) await get().flushActiveTabToDisk()
    set((state) => {
      const closedIndex = state.tabs.findIndex((t) => t.id === id)
      const tabs = state.tabs.filter((t) => t.id !== id)
      return resolveTabsAfterRemoval(tabs, wasActive, closedIndex)
    })
  },

  // 파일 삭제로 열려 있던 문서가 사라졌을 때(deleteCategoryPage/deleteSnippet/
  // deleteTemplate/deleteDataEntry 공통) 그 탭 자체도 같이 치움 — 그냥 화면 필드만 비우면
  // 탭 목록엔 이미 없는 파일을 가리키는 탭이 그대로 남음.
  closeTabsByPath(filePath) {
    set((state) => {
      const closedIndex = state.tabs.findIndex((t) => t.openPath === filePath)
      const tabs = state.tabs.filter((t) => t.openPath !== filePath)
      return resolveTabsAfterRemoval(tabs, state.openPath === filePath, closedIndex)
    })
  },

  // deleteFile 대상이 폴더일 수도 있어서(그 아래 열려 있던 파일 전부가 같이 사라짐) 정확히
  // 일치하는 탭 하나가 아니라 그 경로 밑에 있던 모든 열린 탭을 닫음.
  closeTabsUnderPath(filePath) {
    set((state) => {
      const closedIndex = state.tabs.findIndex((t) => isPathUnder(t.openPath, filePath))
      const tabs = state.tabs.filter((t) => !isPathUnder(t.openPath, filePath))
      return resolveTabsAfterRemoval(tabs, isPathUnder(state.openPath, filePath), closedIndex)
    })
  },

  // skeletonTemplateName is a "글양식" — a one-time starting point copied
  // from an existing 틀 document (its @매개변수@/{{{매개변수}}} tokens
  // resolved to their defaults and its {{{#!if}}} blocks evaluated with no
  // parameters passed, same as expandTemplateBody with an empty params
  // object), unlike a normal {{틀:이름}} call which stays live. This
  // mirrors how MediaWiki-family wikis reuse template documents for both
  // live transclusion and subst:-style one-time copying instead of keeping
  // two separate systems.
  async createDoc(dirPath, name, skeletonTemplateName) {
    const api = getApi()
    const filePath = await api.createFile(dirPath, name)
    const skeleton = skeletonTemplateName ? get().templateIndex[skeletonTemplateName] : null
    if (skeleton?.rawText) {
      const content = applyAutoCategoryTags(expandTemplateBody(skeleton.rawText, {}), buildAutoCategoryNames(dirPath))
      await api.writeFile(filePath, content)
    } else {
      await writeAutoCategoryTags(api, filePath, dirPath)
    }
    await get().refreshTree()
    await get().rebuildIndexes()
    await get().openFile(filePath, name)
  },

  // Drag-and-dropped .md/.txt files: create each as a new doc (content
  // included) in dirPath, then open the last one imported.
  async importFiles(dirPath, files) {
    const api = getApi()
    let lastPath = null
    let lastName = null
    for (const { name, content } of files) {
      const filePath = await api.createFile(dirPath, name)
      await api.writeFile(filePath, content)
      lastPath = filePath
      lastName = name
    }
    await get().refreshTree()
    await get().rebuildIndexes()
    if (lastPath) await get().openFile(lastPath, lastName)
  },

  async createFolder(dirPath, name) {
    if (SCAFFOLD_TRIGGER_NAMES.has(basename(dirPath))) {
      await get().createWorkFolder(dirPath, name)
      return
    }
    const api = getApi()
    await api.createFolder(dirPath, name)
    await get().refreshTree()
  },

  // Auto-scaffold triggered by createFolder when the parent is 소설/웹툰/만화:
  // 주인공(+능력/아이템), 등장인물(+4 색 이름 문서), 사전(+설정), 기록(빈 폴더)
  // subfolders, plus an overview document with the same name as the new
  // folder itself — then opens that overview document.
  async createWorkFolder(dirPath, name) {
    const api = getApi()
    const folderPath = await api.createFolder(dirPath, name)
    const folderName = basename(folderPath)
    for (const [subName, docNames] of Object.entries(WORK_FOLDER_SCAFFOLD)) {
      const subPath = await api.createFolder(folderPath, subName)
      for (const docName of docNames) {
        const filePath = await api.createFile(subPath, docName)
        await writeAutoCategoryTags(api, filePath, subPath)
      }
    }
    const overviewPath = await api.createFile(folderPath, folderName)
    await writeAutoCategoryTags(api, overviewPath, folderPath)
    await get().refreshTree()
    await get().rebuildIndexes()
    await get().openFile(overviewPath, folderName)
  },

  // filePath may be a folder — deleting one takes everything nested under
  // it with it, so the currently open doc needs clearing if it was inside
  // (not just an exact path match, which only covers deleting that one
  // open file itself).
  async deleteFile(filePath) {
    const api = getApi()
    const result = await api.deleteFile(filePath)
    get().closeTabsUnderPath(filePath)
    await get().refreshTree()
    await get().rebuildIndexes()
    return result
  },

  async renameFile(filePath, newName, type) {
    const api = getApi()
    const oldCategoryName = type === 'dir' ? categoryNameForPath(filePath) : null
    const newPath = await api.renameFile(filePath, newName)
    // 이름을 바꾼 파일을 가리키던 탭이 있으면(지금 보고 있는 탭이든 배경 탭이든) 경로/제목을
    // 같이 갱신 — 안 그러면 그 탭은 이제 존재하지 않는 옛 경로를 계속 들고 있다가, 나중에
    // 그 탭에서 저장할 때 엉뚱한(이미 사라진) 경로에 파일을 새로 만들어버림.
    set((state) => {
      const isActiveRenamed = state.openPath === filePath
      const tabs = state.tabs.map((t) =>
        t.openPath === filePath
          ? { ...t, id: `file:${newPath}`, title: stripLeadingNumber(newName), openPath: newPath, openName: newName }
          : t,
      )
      if (!isActiveRenamed) return { tabs }
      return { tabs, openPath: newPath, openName: newName, activeTabId: `file:${newPath}` }
    })
    await get().refreshTree()
    if (oldCategoryName) {
      const newCategoryName = categoryNameForPath(newPath)
      if (newCategoryName && newCategoryName !== oldCategoryName) {
        const node = findNodeByPath(get().tree, newPath)
        for (const file of flattenFiles(node?.children ?? [])) {
          const content = await api.readFile(file.path)
          const updated = rewriteCategoryPrefix(content, oldCategoryName, newCategoryName)
          if (updated !== content) await api.writeFile(file.path, updated)
        }
      }
    }
    await get().rebuildIndexes()
  },

  setMode(mode) {
    set({ mode })
  },

  // Switches into a mode that actually shows the editor (leaves 'dual'/
  // 'focus' as-is — only 'preview', which doesn't render EditorPane at
  // all, needs to change) and records where to jump it to.
  requestEditorJump(offset) {
    set((s) => ({ mode: s.mode === 'preview' ? 'dual' : s.mode, editorJumpOffset: offset }))
  },

  clearEditorJump() {
    set({ editorJumpOffset: null })
  },
}))
