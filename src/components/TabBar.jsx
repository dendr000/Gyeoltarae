import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore.js'
import { getApi } from '../lib/api.js'
import { isTabMoveKey } from '../lib/tabOrder.js'

// 브라우저 탭처럼 여러 문서를 동시에 열어 두고 전환 — 폴더 트리를 매번 다시 뒤질 필요 없이
// 최근에 오간 문서들 사이를 바로 오갈 수 있게. 열린 탭이 하나도 없으면(워크스페이스를 막
// 연 직후 등) 아예 렌더링하지 않음 — 빈 탭바를 보여줄 이유가 없음.
export function TabBar() {
  const tabs = useAppStore((s) => s.tabs)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const liveIsDirty = useAppStore((s) => s.isDirty)
  const switchTab = useAppStore((s) => s.switchTab)
  const closeTab = useAppStore((s) => s.closeTab)
  const moveTab = useAppStore((s) => s.moveTab)

  // 탭을 마우스로 누른 채(버튼을 떼기 전까지) ←/→ 를 누르면 그 탭이 한 칸씩 옮겨 간다(규칙은 lib/tabOrder.js). 누른 탭을 기억해 두고, 창 전체의 키 처리로 받는다.
  // 누르는 순간 글 입력칸의 포커스는 빠지므로 방향키가 글 커서를 움직이는 일은 없지만, 확실히 하려고 처리한 키는 기본 동작을 막는다.
  const pressedTabRef = useRef(null)
  // 누른 채 옮겼으면 버튼을 뗄 때의 클릭(탭 전환)은 하지 않는다 — 옮기는 사이 그 자리에 다른 탭이 와 있기도 하고, 이때는 순서만 바꾸려는 것이다.
  const movedWhilePressedRef = useRef(false)
  useEffect(() => {
    function handleKeyDown(e) {
      if (!pressedTabRef.current) return
      const direction = isTabMoveKey(e)
      if (direction === null) return
      e.preventDefault()
      movedWhilePressedRef.current = true
      moveTab(pressedTabRef.current, direction)
      // 옮긴 탭이 탭 바 밖으로 밀려 가려지지 않게 보이는 자리로 스크롤한다(탭이 많아 가로 스크롤이 생겼을 때).
      const movedId = pressedTabRef.current
      requestAnimationFrame(() => {
        document.querySelector(`[data-tab-id="${movedId}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      })
    }
    const release = () => {
      pressedTabRef.current = null
    }
    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('mouseup', release)
    window.addEventListener('blur', release)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('mouseup', release)
      window.removeEventListener('blur', release)
    }
  }, [moveTab])

  if (tabs.length === 0) return null

  return (
    <div className="tab-bar">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        // 지금 활성 탭은 스토어의 실시간 isDirty를 보고(탭 스냅샷은 다른 탭으로 전환할 때만
        // 갱신되므로 타이핑 도중엔 아직 낡은 값), 배경 탭은 자기 스냅샷의 값을 봄.
        const isDirty = isActive ? liveIsDirty : tab.isDirty
        return (
          <div
            key={tab.id}
            className={`tab-bar-item ${isActive ? 'active' : ''}`}
            title={tab.title}
            data-tab-id={tab.id}
            onMouseDown={(e) => {
              if (e.button !== 0 || e.target.closest('.tab-bar-close-btn')) return
              movedWhilePressedRef.current = false
              pressedTabRef.current = tab.id
            }}
            onClick={() => {
              if (movedWhilePressedRef.current) {
                movedWhilePressedRef.current = false
                return
              }
              if (isActive) return
              getApi().softRefocusWindow?.()
              switchTab(tab.id)
            }}
          >
            {isDirty && <span className="tab-bar-dirty-dot" />}
            <span className="tab-bar-title">{tab.title}</span>
            <button
              type="button"
              className="tab-bar-close-btn"
              title="탭 닫기"
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.id)
              }}
            >
              <X size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
