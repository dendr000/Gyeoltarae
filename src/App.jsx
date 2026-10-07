import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useAppStore } from './store/useAppStore.js'
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
import { stripLeadingNumber } from './lib/displayName.js'
import { formatKeywordInput, parseKeywordInput } from './lib/autoCategory.js'
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
    imageIndex,
    snippetIndex,
    chooseWorkspace,
    initWorkspace,
    initTheme,
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
    importFiles,
    setMode,
    promptRequest,
    requestPrompt,
    resolvePrompt,
    activeTabId,
    closeTab,
  } = useAppStore()

  useEffect(() => {
    initTheme()
    initWorkspace()
  }, [initTheme, initWorkspace])

  useEffect(() => {
    const unsubscribe = getApi().onMenuChooseWorkspace?.(() => chooseWorkspace())
    return unsubscribe
  }, [chooseWorkspace])

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
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [activeTabId, closeTab, promptRequest])

  if (!workspacePath) {
    return (
      <div className="welcome-screen">
        <h1>결타래</h1>
        <p>나무위키 스타일로 세계관·설정을 정리하는 로컬 메모 앱입니다.</p>
        <button className="primary-btn" onClick={chooseWorkspace}>
          워크스페이스 폴더 선택
        </button>
      </div>
    )
  }

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
    if (availableSkeletons.length > 0) {
      fields.push({
        key: 'skeleton',
        label: '글양식(틀) — 선택',
        placeholder: `비워두면 빈 문서 · 사용 가능: ${availableSkeletons.join(', ')}`,
        required: false,
      })
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
      ? ` — 지금은 윗 폴더(${inherited.folderPath.split(/[\\/]/).pop()})의 설정(${inherited.keywords.join(', ')})이 적용 중이며, 여기에 적으면 이 폴더 아래에서는 그 설정 대신 이 설정을 씁니다`
      : ''
    const result = await requestPrompt({
      title: `자동 분류 — ${folderName}`,
      confirmLabel: '저장',
      fields: [
        {
          key: 'keywords',
          label: `읽어들일 글자 (쉼표로 구분, 비우면 해제) — 이 폴더 아래에서 새 문서를 만들 때 아래 폴더·문서 이름에 이 글자가 있으면 [[분류:글자]]로 자동으로 들어갑니다${inheritedNote}`,
          placeholder: '예: DBMS, 외래키, Join',
          defaultValue: formatKeywordInput(own?.keywords),
          required: false,
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
        <div className="app-sidebar-body">
          <SearchBar />
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
            onImportFiles={importFiles}
            onImportImages={importImageFiles}
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
        title={sidebarCollapsed ? '사이드바 열기' : '사이드바 닫기'}
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
      </main>
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
