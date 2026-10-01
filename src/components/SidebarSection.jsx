import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

// 사이드바의 분류/자료/틀/이미지/상용구/사전 섹션이 공유하는 "접었다 펼 수 있는 제목 줄"
// 껍데기 — 문서/분류가 많아질수록 사이드바 스크롤이 길어지는 문제 완화용. FileTree.jsx의
// 폴더별 접기 상태와 같은 패턴으로, localStorage엔 접은 것(예외)만 기억해서 기본은 전부
// 펼쳐진 채로 시작하고 사용자가 접은 섹션만 다음 실행에도 접힌 채 유지됨.
const STORAGE_KEY = 'wikidesk-collapsed-sidebar-sections'

function loadCollapsedSections() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

function setSectionCollapsed(id, collapsed) {
  try {
    const ids = loadCollapsedSections()
    if (collapsed) ids.add(id)
    else ids.delete(id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    /* localStorage unavailable — collapse state just won't persist */
  }
}

// 각 사이드바 컴포넌트가 이미 갖고 있는 바깥 div(.category-sidebar 등 — 구분선/패딩 담당)는
// 그대로 두고, 이 컴포넌트는 그 "제목 줄 + 내용"만 대체함(children이 접혔을 때 안 그려짐).
// id는 localStorage 키이자 사이드바 안에서 고유해야 함(예: 'category', 'image').
export function SidebarSection({ id, title, actions, children }) {
  const [collapsed, setCollapsed] = useState(() => loadCollapsedSections().has(id))

  function toggle() {
    setCollapsed((v) => {
      const next = !v
      setSectionCollapsed(id, next)
      return next
    })
  }

  return (
    <>
      <div className="sidebar-section-title" onClick={toggle}>
        <ChevronRight size={12} strokeWidth={2.5} className={`sidebar-section-caret ${collapsed ? '' : 'open'}`} />
        <span className="sidebar-section-title-label">{title}</span>
        {actions && (
          <span className="sidebar-section-actions" onClick={(e) => e.stopPropagation()}>
            {actions}
          </span>
        )}
      </div>
      {!collapsed && children}
    </>
  )
}
