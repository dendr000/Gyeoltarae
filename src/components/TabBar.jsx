import { X } from 'lucide-react'
import { useAppStore } from '../store/useAppStore.js'
import { getApi } from '../lib/api.js'

// 브라우저 탭처럼 여러 문서를 동시에 열어 두고 전환 — 폴더 트리를 매번 다시 뒤질 필요 없이
// 최근에 오간 문서들 사이를 바로 오갈 수 있게. 열린 탭이 하나도 없으면(워크스페이스를 막
// 연 직후 등) 아예 렌더링하지 않음 — 빈 탭바를 보여줄 이유가 없음.
export function TabBar() {
  const tabs = useAppStore((s) => s.tabs)
  const activeTabId = useAppStore((s) => s.activeTabId)
  const liveIsDirty = useAppStore((s) => s.isDirty)
  const switchTab = useAppStore((s) => s.switchTab)
  const closeTab = useAppStore((s) => s.closeTab)

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
            onClick={() => {
              if (isActive) return
              getApi().refocusWindow?.()
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
