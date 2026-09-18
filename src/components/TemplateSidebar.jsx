import { useAppStore } from '../store/useAppStore.js'
import { getApi } from '../lib/api.js'

export function TemplateSidebar({ templateIndex, activeTemplate, onOpenTemplate, onDeleteTemplate, onCreateTemplate }) {
  const names = Object.keys(templateIndex).sort((a, b) => a.localeCompare(b, 'ko'))
  const requestPrompt = useAppStore((s) => s.requestPrompt)

  const handleAdd = async () => {
    const result = await requestPrompt({
      title: '새 틀',
      fields: [{ key: 'name', label: '틀 이름', placeholder: '예: 포켓몬정보상자' }],
    })
    if (result?.name) {
      // Same Windows focus-desync workaround as FileTree.jsx's file-open
      // click — the prompt modal closing right before the newly created
      // 틀 opens straight into the editor is exactly the kind of window-level
      // transition that can leave the OS not actually routing keystrokes to
      // it (see PromptModal.jsx's own comment on this bug).
      getApi().refocusWindow?.()
      onCreateTemplate(result.name)
    }
  }

  return (
    <div className="template-sidebar">
      <div className="template-sidebar-title">
        <span>틀</span>
        <button type="button" className="template-sidebar-add-btn" title="새 틀" onClick={handleAdd}>
          +
        </button>
      </div>
      {names.map((name) => {
        const entry = templateIndex[name]
        return (
          <div
            key={name}
            className={`template-sidebar-row ${activeTemplate === name ? 'active' : ''} ${!entry.path ? 'template-sidebar-row-missing' : ''}`}
            onClick={() => {
              getApi().refocusWindow?.()
              onOpenTemplate(name)
            }}
            title={entry.path ? undefined : '아직 만들어지지 않은 틀 (참조만 있음)'}
          >
            <span className="template-sidebar-label">{name}</span>
            <span className="template-sidebar-count">{entry.usedBy.length}</span>
            {entry.path && (
              <button
                type="button"
                className="template-sidebar-delete-btn"
                title="틀 삭제 (휴지통으로 이동)"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteTemplate(name)
                }}
              >
                ×
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
