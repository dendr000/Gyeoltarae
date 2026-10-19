import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useAppStore } from '../store/useAppStore.js'
import { getApi } from '../lib/api.js'
import { SnippetModal } from './SnippetModal.jsx'
import { SidebarSection } from './SidebarSection.jsx'

// 이 개수를 넘는 폴더는 처음에 접어 둔다. 언어 상용구 묶음(Java 약 470개, SQL 약 1950개 ...)을 설치하면 폴더 하나가
// 수백~수천 줄이라서 다 그리면 사이드바가 느려지고 스크롤이 끝없이 길어진다. 헤더를 눌러 펼친다.
const AUTO_COLLAPSE_OVER = 40

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
  // 상용구 수는 수천 개가 될 수 있어서 매번 다시 묶고 정렬하지 않는다.
  const groups = useMemo(() => groupByCategory(snippetIndex), [snippetIndex])
  // 폴더별 펼침 여부 — 사용자가 누른 것만 기억하고, 그 밖에는 개수로 정한다(AUTO_COLLAPSE_OVER).
  const [openOverride, setOpenOverride] = useState({})
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
        {groups.map(({ category, entries }) => {
          const open = openOverride[category] ?? entries.length <= AUTO_COLLAPSE_OVER
          return (
          <div key={category}>
            <div
              className="data-sidebar-type data-sidebar-type-toggle"
              title={open ? '폴더 접기' : '폴더 펼치기'}
              onClick={() => setOpenOverride((prev) => ({ ...prev, [category]: !open }))}
            >
              <ChevronRight size={11} strokeWidth={2.5} className={`sidebar-section-caret ${open ? 'open' : ''}`} />
              {category}
              <span className="data-sidebar-type-count">{entries.length}</span>
            </div>
            {open && entries.map((entry) => {
              const isActive = openPath === entry.path
              return (
                <div
                  key={`${entry.category}/${entry.title}`}
                  className={`data-sidebar-row ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    getApi().softRefocusWindow?.()
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
          )
        })}
      </SidebarSection>
      {modalOpen && (
        <SnippetModal
          initialContent={prefillContent}
          onClose={closeSnippetModal}
          onOpenInEditor={(category, title) => {
            closeSnippetModal()
            getApi().softRefocusWindow?.()
            onOpenSnippet(category, title)
          }}
        />
      )}
    </div>
  )
}
