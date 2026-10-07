import { useAppStore } from '../store/useAppStore.js'
import { getApi } from '../lib/api.js'
import { SnippetModal } from './SnippetModal.jsx'
import { SidebarSection } from './SidebarSection.jsx'

function groupByCategory(snippetIndex) {
  const groups = new Map()
  for (const entry of Object.values(snippetIndex)) {
    if (!groups.has(entry.category)) groups.set(entry.category, [])
    groups.get(entry.category).push(entry)
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.title.localeCompare(b.title, 'ko'))
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'ko'))
    .map(([category, entries]) => ({ category, entries }))
}

// 목록 훑어보기·바로 열기·삭제는 그대로 사이드바에서(자료/틀과 통일된 모양). 등록·수정·검색·
// 일괄 등록·자동완성 스위치는 전부 SnippetModal로 옮김(Galpi 원본 모달 레이아웃에 맞춤).
export function SnippetSidebar({ snippetIndex, openPath, onOpenSnippet, onDeleteSnippet }) {
  const groups = groupByCategory(snippetIndex)
  // 모달 열림 상태는 스토어에 둠 — 에디터의 Alt+T 단축키도 같은 모달을 열므로(DictSidebar와 같은 이유).
  const modalOpen = useAppStore((s) => s.snippetModalOpen)
  const prefillContent = useAppStore((s) => s.snippetModalPrefillContent)
  const openSnippetModal = useAppStore((s) => s.openSnippetModal)
  const closeSnippetModal = useAppStore((s) => s.closeSnippetModal)
  // "닫으면 '전체'로 자동 복귀"를 꺼 둔 사람은 닫은 뒤에도 폴더 범위가 남아 있으므로, 에디터가 어느
  // 폴더 상용구만 쓰는 중인지 사이드바 제목에서 바로 보이게 함(말없이 안 먹히는 일 방지).
  const activeFolder = useAppStore((s) => s.activeSnippetFolder)

  return (
    <div className="data-sidebar snippet-sidebar">
      <SidebarSection
        id="snippet"
        title={activeFolder === '전체' ? '상용구' : `상용구 · ${activeFolder} 폴더만 사용 중`}
        actions={
          <button type="button" className="data-sidebar-add-btn" title="상용구 관리 (Alt+T)" onClick={() => openSnippetModal()}>
            ⚙
          </button>
        }
      >
        {groups.map(({ category, entries }) => (
          <div key={category}>
            <div className="data-sidebar-type">{category}</div>
            {entries.map((entry) => {
              const isActive = openPath === entry.path
              return (
                <div
                  key={`${entry.category}/${entry.title}`}
                  className={`data-sidebar-row ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    getApi().refocusWindow?.()
                    onOpenSnippet(entry.category, entry.title)
                  }}
                  title="클릭해서 본문 편집 — 문서 편집 중 이 단축어를 타이핑하면 자동완성됨"
                >
                  <span className="data-sidebar-label">{entry.title}</span>
                  <button
                    type="button"
                    className="data-sidebar-delete-btn"
                    title="상용구 삭제 (휴지통으로 이동)"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteSnippet(entry.category, entry.title)
                    }}
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </SidebarSection>
      {modalOpen && (
        <SnippetModal
          initialContent={prefillContent}
          onClose={closeSnippetModal}
          onOpenInEditor={(category, title) => {
            closeSnippetModal()
            getApi().refocusWindow?.()
            onOpenSnippet(category, title)
          }}
        />
      )}
    </div>
  )
}
