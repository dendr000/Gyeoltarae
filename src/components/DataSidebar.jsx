import { useAppStore } from '../store/useAppStore.js'
import { getApi } from '../lib/api.js'

function groupByType(dataIndex) {
  const groups = new Map()
  for (const entry of Object.values(dataIndex)) {
    if (!groups.has(entry.type)) groups.set(entry.type, [])
    groups.get(entry.type).push(entry)
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'ko'))
    .map(([type, entries]) => ({ type, entries }))
}

export function DataSidebar({ dataIndex, activeEntry, onOpenEntry, onDeleteEntry, onCreateEntry }) {
  const groups = groupByType(dataIndex)
  const requestPrompt = useAppStore((s) => s.requestPrompt)

  const handleAdd = async () => {
    const result = await requestPrompt({
      title: '새 자료',
      fields: [
        { key: 'type', label: '유형', placeholder: '예: 기술, 특성' },
        { key: 'name', label: '이름', placeholder: '예: 번개펀치' },
      ],
    })
    if (result?.type && result?.name) {
      // Same Windows focus-desync workaround as TemplateSidebar.jsx/
      // FileTree.jsx — the prompt modal closing right before the new 자료
      // opens straight into the editor.
      getApi().refocusWindow?.()
      onCreateEntry(result.type, result.name)
    }
  }

  return (
    <div className="data-sidebar">
      <div className="data-sidebar-title">
        <span>자료</span>
        <button type="button" className="data-sidebar-add-btn" title="새 자료" onClick={handleAdd}>
          +
        </button>
      </div>
      {groups.map(({ type, entries }) => (
        <div key={type}>
          <div className="data-sidebar-type">{type}</div>
          {entries.map((entry) => {
            const isActive = activeEntry?.type === entry.type && activeEntry?.name === entry.name
            return (
              <div
                key={`${entry.type}/${entry.name}`}
                className={`data-sidebar-row ${isActive ? 'active' : ''} ${!entry.path ? 'data-sidebar-row-missing' : ''}`}
                onClick={() => {
                  getApi().refocusWindow?.()
                  onOpenEntry(entry.type, entry.name)
                }}
                title={entry.path ? undefined : '아직 만들어지지 않은 자료 (참조만 있음)'}
              >
                <span className="data-sidebar-label">{entry.name}</span>
                {entry.path && (
                  <button
                    type="button"
                    className="data-sidebar-delete-btn"
                    title="자료 삭제 (휴지통으로 이동)"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteEntry(entry.type, entry.name)
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
