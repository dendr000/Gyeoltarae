import { useEffect, useRef, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useAppStore } from './store/useAppStore.js'
import { isSidebarToggleKey } from './lib/sidebarShortcut.js'
import { decodeFileNameChars } from '../shared/fileNameChars.js'
import { modeShortcutTarget } from './lib/modeShortcut.js'
import { isNewDocKey, newDocTargetDir } from './lib/newDocShortcut.js'
import { activeTabMoveKey } from './lib/tabOrder.js'
import { getApi } from './lib/api.js'
import { FileTree } from './components/FileTree.jsx'
import { SearchBar } from './components/SearchBar.jsx'
import { CategorySidebar } from './components/CategorySidebar.jsx'
import { DataSidebar } from './components/DataSidebar.jsx'
import { TemplateSidebar } from './components/TemplateSidebar.jsx'
import { ImageSidebar } from './components/ImageSidebar.jsx'
import { SnippetSidebar } from './components/SnippetSidebar.jsx'
import { DictSidebar } from './components/DictSidebar.jsx'
import { TabBar } from './components/TabBar.jsx'
import { EditorHeader } from './components/EditorHeader.jsx'
import { EditorPane } from './components/EditorPane.jsx'
import { ViewerPane } from './components/ViewerPane.jsx'
import { PromptModal } from './components/PromptModal.jsx'
import { ShortcutSettingsModal } from './components/ShortcutSettingsModal.jsx'
import { CharCountBar } from './components/CharCountBar.jsx'
import { Magnifier } from './components/Magnifier.jsx'
import { stripLeadingNumber } from './lib/displayName.js'
import { formatKeywordLines, parseKeywordInput } from './lib/autoCategory.js'
import { NO_TEMPLATE } from './lib/defaultTemplate.js'
import { buildMonoStack } from './lib/monoFont.js'
import './App.css'

// Pokémon-specific, so kept separate from useAppStore.js's general
// CATEGORY_ONLY_TRIGGER_NAMES — a 전국도감 number prefix only makes sense
// directly under 포켓몬스터/전국도감, not anywhere under 포켓몬스터 (e.g.
// not for a 기술/특성 notes folder that might live there too).
function isUnderPokedexFolder(dirPath) {
  const segments = dirPath.split(/[\\/]/)
  return segments.some((seg, i) => seg === '포켓몬스터' && segments[i + 1] === '전국도감')
}

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  // Ctrl+N 이 부르는 "새 문서 만들기"(사이드바 단추와 같은 handleCreateDoc). 키 처리는 한 번만 등록해 두고, 항상 최신 함수를 부르도록 ref 로 넘긴다.
  const createDocRef = useRef(null)
  // 메뉴 "설정" > "단축키…" 로 여는 단축키 설정 창.
  const [shortcutModalOpen, setShortcutModalOpen] = useState(false)
  // 편집기·코드블록 글꼴: 고른 글꼴을 CSS 변수 --mono 에 넣는다(index.css 의 기본값을 덮어씀). 기본이면 index.css 의 값 그대로다.
  const monoFont = useAppStore((s) => s.monoFont)
  useEffect(() => {
    const root = document.documentElement
    if (monoFont === '') root.style.removeProperty('--mono')
    else root.style.setProperty('--mono', buildMonoStack(monoFont))
  }, [monoFont])
  const {
    workspacePath,
    tree,
    openPath,
    openName,
    rawText,
    mode,
    saveStatus,
    theme,
    viewingCategory,
    viewingData,
    viewingTemplate,
    categoryIndex,
    dataIndex,
    templateIndex,
    docIndex,
    imageIndex,
    snippetIndex,
    chooseWorkspace,
    initWorkspace,
    initTheme,
    initSettings,
    setTheme,
    openFile,
    openCategory,
    deleteCategoryPage,
    openDataEntry,
    createDataEntry,
    deleteDataEntry,
    openTemplate,
    createTemplate,
    deleteTemplate,
    importImage,
    importImageFiles,
    deleteImage,
    renameImage,
    openSnippet,
    deleteSnippet,
    updateText,
    createDoc,
    createFolder,
    deleteFile,
    renameFile,
    moveFile,
    saveAutoCategory,
    saveDefaultTemplate,
    importFiles,
    setMode,
    promptRequest,
    requestPrompt,
    resolvePrompt,
    activeTabId,
    closeTab,
    moveTab,
    shortcuts,
  } = useAppStore()

  const handleCreateDoc = async (dirPath) => {
    const availableSkeletons = Object.keys(templateIndex).filter((n) => templateIndex[n].path)
    const fields = [{ key: 'name', label: '문서 이름', placeholder: '새 문서' }]
    if (isUnderPokedexFolder(dirPath)) {
      fields.push({
        key: 'dexNumber',
        label: '전국도감 번호 — 선택',
        placeholder: '예: 0891 (문서 이름 앞에 자동으로 붙음)',
        required: false,
      })
    }
    // 글양식(틀) 고르는 칸 — 목록에서 고른다. 맨 위 "자동"은 폴더 기본 틀(폴더 우클릭 "기본 틀 설정…")이 있으면 그 틀,
    // 없으면 빈 문서다. 기본 틀이 있는 폴더에서는 맨 아래에 "틀을 쓰지 않음"이 더 있다.
    const folderDefault = await getApi().readDefaultTemplate?.(workspacePath, dirPath)
    const defaultName = folderDefault && templateIndex[folderDefault.template]?.rawText ? folderDefault.template : null
    if (availableSkeletons.length > 0 || defaultName) {
      const autoLabel = defaultName ? `${defaultName} (이 폴더의 기본 틀)` : '빈 문서'
      const options = [
        { value: '', label: autoLabel },
        ...availableSkeletons.filter((n) => n !== defaultName).map((n) => ({ value: n, label: n })),
      ]
      if (defaultName) options.push({ value: NO_TEMPLATE, label: '빈 문서 (틀을 쓰지 않음)' })
      fields.push({ key: 'skeleton', label: '글양식(틀)', options, required: false })
    }
    const result = await requestPrompt({ title: '새 문서', fields })
    if (!result?.name) return
    const docName = result.dexNumber?.trim() ? `${result.dexNumber.trim()} ${result.name}` : result.name
    try {
      // Windows focus-desync workaround (see FileTree.jsx's beginRename) —
      // createDoc opens the new document straight into the editor, and the
      // prompt modal closing right before that is exactly the kind of
      // window-level transition that can leave keystrokes not actually
      // routed to it.
      getApi().refocusWindow?.()
      await createDoc(dirPath, docName, result.skeleton || undefined)
    } catch (err) {
      window.alert(`문서를 만들지 못했습니다.\n\n${err.message}`)
    }
  }

  // Ctrl+N 의 전역 키 처리(아래)가 항상 최신 handleCreateDoc 를 부르도록 그릴 때마다 ref 에 넣는다.
  useEffect(() => {
    createDocRef.current = handleCreateDoc
  })

  useEffect(() => {
    initTheme()
    initSettings()
    initWorkspace()
  }, [initTheme, initSettings, initWorkspace])

  useEffect(() => {
    const unsubscribe = getApi().onMenuChooseWorkspace?.(() => chooseWorkspace())
    return unsubscribe
  }, [chooseWorkspace])

  useEffect(() => {
    const unsubscribe = getApi().onMenuOpenShortcuts?.(() => setShortcutModalOpen(true))
    return unsubscribe
  }, [])

  // 메뉴 "설정" > "상용구 불러오기…": 상용구 창을 "폴더별 사용" 탭으로 연다.
  useEffect(() => {
    const unsubscribe = getApi().onMenuOpenSnippetLoad?.(() => useAppStore.getState().openSnippetModal('', 'folders'))
    return unsubscribe
  }, [])

  // Ctrl+W — 탭 닫기. electron/main.js가 "창" 메뉴의 role:'close' 기본 가속기(Ctrl+W)를
  // Alt+F4로 옮겨 뒀으니 여기까지 살아서 도착함 — 그거 없이는 Ctrl+W가 창(=앱) 자체를
  // 닫아버렸음("Ctrl+W 눌렀는데 그냥 exe가 닫혀 버리네" 제보). PromptModal이 떠 있는
  // 동안은 무시 — 문서 이름 입력 중에 실수로 그 아래 탭이 닫히는 걸 막기 위함.
  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if (promptRequest) return
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault()
        if (activeTabId) closeTab(activeTabId)
      }
      // Ctrl+M — 왼쪽 사이드바(문서/폴더 목록 등) 열기·닫기. 편집 중에도 동작한다.
      if (isSidebarToggleKey(e, shortcuts['sidebar.toggle'])) {
        e.preventDefault()
        setSidebarCollapsed((v) => !v)
      }
      // Ctrl+1/2/3 뷰어·듀얼·편집으로 이동, Ctrl+E 뷰어 <-> 편집(듀얼 제외). 규칙은 lib/modeShortcut.js.
      // 모달(표 편집기 등)이 떠 있으면 무시한다 — 뷰어로 바뀌면 편집 창이 사라져서 모달 안의 작업이 날아간다.
      if (!document.querySelector('.modal-backdrop')) {
        // Ctrl+Alt+←/→ — 지금 열린 탭을 한 칸씩 왼쪽/오른쪽으로 옮긴다(규칙은 lib/tabOrder.js). Alt+←/→ 만 누르면 편집기의 줄 처음/끝 이동이다.
        const tabDirection = activeTabMoveKey(e, { left: shortcuts['tab.moveLeft'], right: shortcuts['tab.moveRight'] })
        if (tabDirection !== null) {
          e.preventDefault()
          if (activeTabId) moveTab(activeTabId, tabDirection)
          return
        }
        // Ctrl+N — 지금 열린 문서가 있는 폴더에 새 문서 만들기(없으면 작업 폴더). 폴더를 찾아 스크롤해서 그 폴더의 "새 문서"를 누르지 않아도 된다. 규칙은 lib/newDocShortcut.js.
        if (isNewDocKey(e, shortcuts['doc.new'])) {
          e.preventDefault()
          createDocRef.current?.(newDocTargetDir(openPath, workspacePath))
          return
        }
        const target = modeShortcutTarget(e, mode, { toggle: shortcuts['mode.toggle'], viewer: shortcuts['mode.viewer'], dual: shortcuts['mode.dual'], editor: shortcuts['mode.editor'] })
        if (target) {
          e.preventDefault()
          if (target !== mode) setMode(target)
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [activeTabId, closeTab, moveTab, promptRequest, mode, setMode, openPath, workspacePath, shortcuts])

  if (!workspacePath) {
    return (
      <div className="welcome-screen">
        <h1>결타래</h1>
        <p>나무위키 스타일로 세계관·설정을 정리하는 로컬 메모 앱입니다.</p>
        <button className="primary-btn" onClick={chooseWorkspace}>
          워크스페이스 폴더 선택
        </button>
        {shortcutModalOpen && <ShortcutSettingsModal onClose={() => setShortcutModalOpen(false)} />}
      </div>
    )
  }

  // 폴더 우클릭 → "기본 틀 설정…": 이 폴더 아래에서 새 문서를 만들 때 자동으로 고를 글양식(틀)을 정한다(규칙은
  // lib/defaultTemplate.js). 강의 폴더를 추가할 때마다 코드를 고치지 않고 폴더에서 바로 지정하려는 것이다. 새 문서 창에서는
  // 그 틀이 처음부터 골라져 있고 다른 틀이나 빈 문서로 바꿀 수 있다. 이 폴더에 설정이 없고 윗 폴더 설정이 적용 중이면 안내한다.
  const handleDefaultTemplate = async (folderPath, folderName) => {
    const api = getApi()
    const names = Object.keys(templateIndex)
      .filter((n) => templateIndex[n].path)
      .sort((a, b) => a.localeCompare(b, 'ko'))
    if (names.length === 0) {
      window.alert('아직 글양식(틀)이 없습니다.\n\n왼쪽 사이드바의 "틀"에서 먼저 틀을 만들어 주세요.')
      return
    }
    const own = await api.readDefaultTemplate?.(workspacePath, folderPath, true)
    const inherited = own ? null : await api.readDefaultTemplate?.(workspacePath, folderPath)
    const inheritedNote = inherited
      ? ` (지금은 윗 폴더 ${decodeFileNameChars(inherited.folderPath.split(/[\\/]/).pop())} 의 설정 "${inherited.template}" 이 적용 중이며, 여기에 정하면 이 폴더 아래에서는 그 설정 대신 이 설정을 씁니다)`
      : ''
    const options = [{ value: '', label: '(설정 안 함)' }, ...names.map((n) => ({ value: n, label: n }))]
    // 정해 둔 틀이 지워졌거나 이름이 바뀌었으면 목록에 없는 이름이라도 그대로 보여 준다(고르면 새로 정하는 것).
    if (own && !names.includes(own.template)) options.push({ value: own.template, label: `${own.template} (없는 틀)` })
    const result = await requestPrompt({
      title: `기본 틀 — ${folderName}`,
      confirmLabel: '저장',
      fields: [
        {
          key: 'template',
          label: `이 폴더 아래에서 새 문서를 만들 때 자동으로 고를 글양식(틀) — 새 문서 창에서 바꿀 수 있습니다${inheritedNote}`,
          options,
          defaultValue: own?.template ?? '',
          required: false,
        },
      ],
    })
    if (!result) return
    try {
      await saveDefaultTemplate(folderPath, result.template)
    } catch (err) {
      window.alert(`기본 틀을 저장하지 못했습니다.\n\n${err.message}`)
    }
  }

  const handleCreateFolder = async (dirPath) => {
    const result = await requestPrompt({
      title: '새 폴더',
      fields: [{ key: 'name', label: '폴더 이름', placeholder: '새 폴더' }],
    })
    if (!result?.name) return
    try {
      await createFolder(dirPath, result.name)
    } catch (err) {
      window.alert(`폴더를 만들지 못했습니다.\n\n${err.message}`)
    }
  }

  const handleRename = async (filePath, newName, type) => {
    try {
      await renameFile(filePath, newName, type)
    } catch (err) {
      window.alert(`이름을 바꾸지 못했습니다.\n\n${err.message}`)
    }
  }

  // 폴더 우클릭 → "자동 분류 설정…": 이 폴더 아래에서 새 문서를 만들 때 폴더·문서 이름에서 읽어들일 글자를
  // 입력받는다(규칙은 lib/autoCategory.js). 쉼표로 구분하고 비우면 해제. 이미 저장된 글자는 입력칸에 채워 보여
  // 주고, 이 폴더에는 설정이 없고 윗 폴더의 설정이 적용 중이면 그 사실을 안내한다.
  const handleAutoCategory = async (folderPath, folderName) => {
    const api = getApi()
    const own = await api.readAutoCategory?.(workspacePath, folderPath, true)
    const inherited = own ? null : await api.readAutoCategory?.(workspacePath, folderPath)
    const inheritedNote = inherited
      ? ` — 지금은 윗 폴더(${decodeFileNameChars(inherited.folderPath.split(/[\\/]/).pop())})의 설정(${inherited.keywords.join(', ')})이 적용 중이며, 여기에 적으면 이 폴더 아래에서는 그 설정 대신 이 설정을 씁니다`
      : ''
    const result = await requestPrompt({
      title: `자동 분류 — ${folderName}`,
      confirmLabel: '저장',
      fields: [
        {
          key: 'keywords',
          label: `읽어들일 글자 (한 줄에 하나, 비우면 해제, 확인은 Ctrl+Enter) — 이 폴더 아래에서 새 문서를 만들 때 아래 폴더·문서 이름에 이 글자가 있으면 [[분류:글자]]로 자동으로 들어갑니다. 분류 이름을 다르게 하려면 글자>분류이름 으로 적습니다(예: 보안>DBMS/보안)${inheritedNote}`,
          placeholder: '예:\nDBMS\n외래키>DBMS/외래키\nJoin',
          defaultValue: formatKeywordLines(own?.keywords),
          required: false,
          multiline: true,
          rows: 12,
        },
      ],
    })
    if (!result) return
    try {
      await saveAutoCategory(folderPath, parseKeywordInput(result.keywords))
    } catch (err) {
      window.alert(`자동 분류 설정을 저장하지 못했습니다.\n\n${err.message}`)
    }
  }

  const handleMove = async (filePath, destDirPath, type) => {
    try {
      await moveFile(filePath, destDirPath, type)
    } catch (err) {
      window.alert(`이동하지 못했습니다.\n\n${err.message}`)
    }
  }

  const handleDelete = async (filePath, type) => {
    const message =
      type === 'dir' ? '이 폴더와 안의 모든 문서를 휴지통으로 이동할까요?' : '이 문서를 휴지통으로 이동할까요?'
    if (window.confirm(message)) {
      try {
        const result = await deleteFile(filePath)
        if (result?.permanentlyDeleted) {
          window.alert('휴지통으로 이동하는 기능에 문제가 있어 대신 완전히 삭제했습니다 (복구할 수 없습니다).')
        }
      } catch (err) {
        window.alert(`삭제하지 못했습니다.\n\n${err.message}`)
      }
    }
  }

  const handleDeleteCategoryPage = async (name) => {
    if (window.confirm(`"${name}" 분류 설명 문서를 휴지통으로 이동할까요? (분류 자체는 문서에 태그가 남아있으면 계속 유지됩니다)`)) {
      await deleteCategoryPage(name)
    }
  }

  const handleDeleteDataEntry = async (type, name) => {
    if (window.confirm(`"${type}/${name}" 자료를 휴지통으로 이동할까요?`)) {
      await deleteDataEntry(type, name)
    }
  }

  const handleDeleteTemplate = async (name) => {
    if (window.confirm(`"${name}" 틀을 휴지통으로 이동할까요?`)) {
      await deleteTemplate(name)
    }
  }

  const handleDeleteImage = async (name) => {
    if (window.confirm(`"${name}" 이미지를 휴지통으로 이동할까요?`)) {
      await deleteImage(name)
    }
  }

  const handleDeleteSnippet = async (category, title) => {
    if (window.confirm(`"${title}" 상용구를 휴지통으로 이동할까요?`)) {
      await deleteSnippet(category, title)
    }
  }

  const showViewer = mode !== 'focus'
  const showEditor = mode !== 'preview'

  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="app-sidebar-title">결타래</div>
        {/* 검색칸과 "+ 새 문서"·"+ 새 폴더" 는 목록을 스크롤해도 늘 보이도록 스크롤 영역(app-sidebar-body) 밖에 둔다. */}
        <div className="app-sidebar-fixed">
          <SearchBar />
          <div className="file-tree-root-actions">
            <button onClick={() => handleCreateDoc(workspacePath)}>+ 새 문서</button>
            <button onClick={() => handleCreateFolder(workspacePath)}>+ 새 폴더</button>
          </div>
        </div>
        <div className="app-sidebar-body">
          <FileTree
            tree={tree}
            workspacePath={workspacePath}
            openPath={openPath}
            onOpenFile={openFile}
            onCreateDoc={handleCreateDoc}
            onCreateFolder={handleCreateFolder}
            onDelete={handleDelete}
            onRename={handleRename}
            onMove={handleMove}
            onAutoCategory={handleAutoCategory}
            onDefaultTemplate={handleDefaultTemplate}
            onImportFiles={importFiles}
            onImportImages={importImageFiles}
            docIndex={docIndex}
          />
          <CategorySidebar
            categoryIndex={categoryIndex}
            activeCategory={viewingCategory}
            onOpenCategory={openCategory}
            onDeleteCategoryPage={handleDeleteCategoryPage}
          />
          <DataSidebar
            dataIndex={dataIndex}
            activeEntry={viewingData}
            onOpenEntry={openDataEntry}
            onDeleteEntry={handleDeleteDataEntry}
            onCreateEntry={createDataEntry}
          />
          <TemplateSidebar
            templateIndex={templateIndex}
            activeTemplate={viewingTemplate}
            onOpenTemplate={openTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onCreateTemplate={createTemplate}
          />
          <ImageSidebar
            imageIndex={imageIndex}
            onImport={importImage}
            onImportImages={importImageFiles}
            onDeleteImage={handleDeleteImage}
            onRenameImage={renameImage}
          />
          <SnippetSidebar
            snippetIndex={snippetIndex}
            openPath={openPath}
            onOpenSnippet={openSnippet}
            onDeleteSnippet={handleDeleteSnippet}
          />
          <DictSidebar />
        </div>
      </aside>
      <button
        type="button"
        className={`sidebar-toggle-btn ${sidebarCollapsed ? 'collapsed' : ''}`}
        onClick={() => setSidebarCollapsed((v) => !v)}
        title={sidebarCollapsed ? '사이드바 열기 (Ctrl+M)' : '사이드바 닫기 (Ctrl+M)'}
      >
        <ChevronLeft size={12} strokeWidth={2.5} />
      </button>
      <main className="app-main">
        <TabBar />
        <EditorHeader
          title={
            viewingCategory
              ? `분류:${viewingCategory}`
              : viewingData
                ? `자료:${viewingData.type}/${viewingData.name}`
                : viewingTemplate
                  ? `틀:${viewingTemplate}`
                  : openName && stripLeadingNumber(openName)
          }
          mode={mode}
          onModeChange={setMode}
          saveStatus={saveStatus}
          theme={theme}
          onThemeChange={setTheme}
        />
        <div className={`app-content mode-${mode}`}>
          {showViewer && (
            <ViewerPane
              text={rawText}
              emptyHint={openPath ? '내용이 비어 있습니다.' : '왼쪽 목록에서 문서를 선택하거나 새로 만드세요.'}
            />
          )}
          {showEditor && (
            <EditorPane text={rawText} onChange={updateText} disabled={!openPath} />
          )}
        </div>
        {openPath && <CharCountBar text={rawText} />}
      </main>
      <Magnifier />
      {shortcutModalOpen && <ShortcutSettingsModal onClose={() => setShortcutModalOpen(false)} />}
      {promptRequest && (
        <PromptModal
          {...promptRequest}
          onConfirm={(values) => resolvePrompt(values)}
          onCancel={() => resolvePrompt(null)}
        />
      )}
    </div>
  )
}
