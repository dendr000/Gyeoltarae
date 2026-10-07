// Copyright (c) dendr000. MIT License.
import { useMemo } from 'react'
import { useAppStore } from '../store/useAppStore.js'
import { disabledAllExcept } from '../lib/snippetScope.js'

// 상용구 모달의 "폴더별 사용" 탭 — 폴더마다 "자동 추천에 쓰기" 체크를 둔다. 체크를 푼 폴더의 상용구는
// 에디터의 자동 추천 팝업·스페이스바 치환·Alt+Enter 에서 빠진다(규칙: lib/snippetScope.js). 기본은 전부
// 체크(= 전체)이고, 설정은 이 PC 에 저장된다. 목록 탭에서 보는 폴더·상용구 자체는 그대로다.
export function SnippetFolderTab() {
  const snippetIndex = useAppStore((s) => s.snippetIndex)
  const disabledFolders = useAppStore((s) => s.disabledSnippetFolders)
  const setFolderEnabled = useAppStore((s) => s.setSnippetFolderEnabled)
  const setDisabledFolders = useAppStore((s) => s.setDisabledSnippetFolders)

  // 폴더별 상용구 개수(가나다순). 상용구가 하나도 없는 폴더는 목록에 나오지 않는다.
  const folders = useMemo(() => {
    const counts = new Map()
    for (const entry of Object.values(snippetIndex)) counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1)
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }, [snippetIndex])

  const disabledSet = new Set(disabledFolders)
  const enabledFolders = folders.filter((f) => !disabledSet.has(f.name))
  const enabledSnippetCount = enabledFolders.reduce((sum, f) => sum + f.count, 0)
  const allNames = folders.map((f) => f.name)

  return (
    <div className="snippet-folder-tab">
      <div className="snippet-folder-summary">
        자동 추천에 쓰는 폴더 {enabledFolders.length}/{folders.length}개 (상용구 {enabledSnippetCount}개)
        {enabledFolders.length === 0 && folders.length > 0 && (
          <span className="snippet-folder-warning"> — 모두 꺼져 있어서 추천 팝업과 자동 치환이 아무것도 못 찾습니다</span>
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
      <p className="snippet-folder-hint">
        체크를 푼 폴더의 상용구는 글을 쓰다가 뜨는 추천 팝업, 스페이스바 자동 치환, Alt+Enter 에서 빠집니다. 툴바의
        &quot;상용구 삽입&quot; 목록과 이 창의 &quot;상용구&quot; 탭 목록에는 그대로 보입니다. 새로 만든 폴더는 처음에 체크된 상태입니다.
      </p>
    </div>
  )
}
