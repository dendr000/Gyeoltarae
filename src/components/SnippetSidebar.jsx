import { useState } from 'react'
import { getApi } from '../lib/api.js'
import { SnippetModal } from './SnippetModal.jsx'

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
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="data-sidebar snippet-sidebar">
      <div className="data-sidebar-title">
        <span>상용구</span>
        <button type="button" className="data-sidebar-add-btn" title="상용구 관리" onClick={() => setModalOpen(true)}>
          ⚙
        </button>
      </div>
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
      {modalOpen && (
        <SnippetModal
          onClose={() => setModalOpen(false)}
          onOpenInEditor={(category, title) => {
            setModalOpen(false)
            getApi().refocusWindow?.()
            onOpenSnippet(category, title)
          }}
        />
      )}
    </div>
  )
}
