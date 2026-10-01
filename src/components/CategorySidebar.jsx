import { getApi } from '../lib/api.js'
import { SidebarSection } from './SidebarSection.jsx'

export function CategorySidebar({ categoryIndex, activeCategory, onOpenCategory, onDeleteCategoryPage }) {
  const names = Object.keys(categoryIndex).sort((a, b) => a.localeCompare(b, 'ko'))
  if (names.length === 0) return null

  return (
    <div className="category-sidebar">
      <SidebarSection id="category" title="분류">
        {names.map((name) => {
          const entry = categoryIndex[name]
          return (
            <div
              key={name}
              className={`category-sidebar-row ${activeCategory === name ? 'active' : ''}`}
              onClick={() => {
                getApi().refocusWindow?.()
                onOpenCategory(name)
              }}
            >
              <span className="category-sidebar-icon">🏷️</span>
              <span className="category-sidebar-label">{name}</span>
              <span className="category-sidebar-count">{entry.members.length}</span>
              {entry.pagePath && (
                <button
                  type="button"
                  className="category-sidebar-delete-btn"
                  title="분류 설명 문서 삭제 (휴지통으로 이동)"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteCategoryPage(name)
                  }}
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
      </SidebarSection>
    </div>
  )
}
