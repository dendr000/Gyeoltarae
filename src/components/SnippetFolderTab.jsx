// Copyright (c) dendr000. MIT License.
import { useMemo } from 'react'
import { useAppStore } from '../store/useAppStore.js'
import { disabledAllExcept } from '../lib/snippetScope.js'

// 상용구 모달의 "폴더별 사용" 탭 — 폴더마다 "사용" 체크를 둔다. 체크를 푼 폴더의 상용구는 앱이 켜질 때 읽지 않아서(시작이 빨라짐)
// 에디터의 자동 추천 팝업·스페이스바 치환·Alt+Enter, 이 창의 목록, 툴바 "상용구 삽입" 목록 어디에도 나오지 않는다(규칙: lib/snippetScope.js).
// 기본은 전부 체크(= 전체)이고, 설정은 이 PC 에 저장된다. 폴더 목록(이 탭)은 읽지 않은 폴더도 보여 준다. 다시 체크하면 그 폴더만 읽어 온다.
export function SnippetFolderTab() {
  const folders = useAppStore((s) => s.snippetFolders)
  const disabledFolders = useAppStore((s) => s.disabledSnippetFolders)
  const setFolderEnabled = useAppStore((s) => s.setSnippetFolderEnabled)
  const setDisabledFolders = useAppStore((s) => s.setDisabledSnippetFolders)
  // 폴더 범위 영어 단어 추천(lib/scopeWords.js) 설정.
  const tree = useAppStore((s) => s.tree)
  const workspacePath = useAppStore((s) => s.workspacePath)
  const wordSuggestEnabled = useAppStore((s) => s.scopeWordSuggestEnabled)
  const wholeTopFolders = useAppStore((s) => s.wholeScopeTopFolders)
  const setWordSuggestEnabled = useAppStore((s) => s.setScopeWordSuggestEnabled)
  const setWholeTopFolder = useAppStore((s) => s.setWholeScopeTopFolder)

  // 워크스페이스 바로 아래 폴더(최상위 폴더) 이름 — 숨김 폴더(.으로 시작)는 뺀다.
  const topFolders = useMemo(() => {
    const root = (tree ?? []).find((node) => node.path === workspacePath)
    return (root?.children ?? [])
      .filter((node) => node.type === 'dir' && !node.name.startsWith('.'))
      .map((node) => node.name)
      .sort((a, b) => a.localeCompare(b, 'ko'))
  }, [tree, workspacePath])

  const disabledSet = new Set(disabledFolders)
  const enabledFolders = folders.filter((f) => !disabledSet.has(f.name))
  const enabledSnippetCount = enabledFolders.reduce((sum, f) => sum + f.count, 0)
  const allNames = folders.map((f) => f.name)

  return (
    <div className="snippet-folder-tab">
      <div className="snippet-folder-summary">
        사용하는 폴더 {enabledFolders.length}/{folders.length}개 (상용구 {enabledSnippetCount}개)
        {enabledFolders.length === 0 && folders.length > 0 && (
          <span className="snippet-folder-warning"> — 모두 꺼져 있어서 상용구를 하나도 읽지 않습니다</span>
        )}
      </div>
      <div className="snippet-folder-actions">
        <button type="button" className="modal-secondary-btn" onClick={() => setDisabledFolders([])}>
          모두 선택
        </button>
        <button type="button" className="modal-secondary-btn" onClick={() => setDisabledFolders(allNames)}>
          모두 해제
        </button>
      </div>
      <div className="snippet-folder-list">
        {folders.length === 0 ? (
          <div className="dict-modal-empty">등록된 상용구가 없습니다.</div>
        ) : (
          folders.map((folder) => (
            <div key={folder.name} className="snippet-folder-row">
              <label className="snippet-folder-row-label">
                <input
                  type="checkbox"
                  checked={!disabledSet.has(folder.name)}
                  onChange={(e) => setFolderEnabled(folder.name, e.target.checked)}
                />
                <span className="snippet-folder-row-name">{folder.name}</span>
                <span className="snippet-folder-row-count">{folder.count}개</span>
              </label>
              <button
                type="button"
                className="modal-secondary-btn"
                title="이 폴더만 체크하고 나머지는 모두 끕니다"
                onClick={() => setDisabledFolders(disabledAllExcept(allNames, folder.name))}
              >
                이것만
              </button>
            </div>
          ))
        )}
      </div>
      <div className="snippet-word-section">
        <label className="snippet-folder-row-label">
          <input type="checkbox" checked={wordSuggestEnabled} onChange={(e) => setWordSuggestEnabled(e.target.checked)} />
          <span className="snippet-folder-row-name">문서에서 쓴 영어 단어도 추천에 올리기</span>
        </label>
        <p className="snippet-folder-hint">
          같은 범위의 다른 문서에서 쓴 영어 단어(예: CREATE)를 추천 팝업에 단어 항목으로 보여 줍니다. 범위는 기본으로
          <b> 두 번째 단계 폴더</b>(예: 강의/따즈아)입니다. 상용구가 먼저 나오고 단어는 그 뒤에 많이 쓴 순서로 나옵니다.
        </p>
        {wordSuggestEnabled &&
          (topFolders.length === 0 ? (
            <div className="dict-modal-empty">워크스페이스에 폴더가 없습니다.</div>
          ) : (
            <div className="snippet-folder-list">
              {topFolders.map((name) => (
                <div key={name} className="snippet-folder-row">
                  <label className="snippet-folder-row-label">
                    <input
                      type="checkbox"
                      checked={wholeTopFolders.includes(name)}
                      onChange={(e) => setWholeTopFolder(name, e.target.checked)}
                    />
                    <span className="snippet-folder-row-name">{name}</span>
                    <span className="snippet-folder-row-count">전체 문서에서 단어 모으기</span>
                  </label>
                </div>
              ))}
            </div>
          ))}
      </div>
      <p className="snippet-folder-hint">
        체크를 푼 폴더는 앱을 켤 때 <b>읽지 않아서</b> 시작이 빨라지고, 추천 팝업·스페이스바 자동 치환·Alt+Enter, 이 창의
        &quot;상용구&quot; 탭 목록, 툴바의 &quot;상용구 삽입&quot; 목록에서 <b>모두 사라집니다</b>(파일은 그대로 있습니다). 다시 체크하면 그 폴더만 바로
        읽어 옵니다. 새로 만든 폴더는 처음에 체크된 상태입니다.
      </p>
    </div>
  )
}
