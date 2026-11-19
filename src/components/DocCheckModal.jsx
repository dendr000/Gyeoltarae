import { useEffect, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore.js'
import { parseWikiText } from '../lib/wikiParser.js'
import { checkDocument, findMissingLinks } from '../lib/docCheck.js'

// 메뉴 "편집" > "문서 점검" 으로 여는 창: 지금 열린 문서에서 화면이 엉뚱하게 보이게 만드는 실수(닫히지 않은 코드블록·{{{·각주·수식, = 개수가 다른 제목, 없는 문서 링크)를
// 모아 보여 준다. 항목을 누르면 편집기의 그 자리로 이동한다. 규칙은 lib/docCheck.js.
export function DocCheckModal({ onClose }) {
  const openPath = useAppStore((s) => s.openPath)
  const openName = useAppStore((s) => s.openName)
  const rawText = useAppStore((s) => s.rawText)
  const dataIndex = useAppStore((s) => s.dataIndex)
  const templateIndex = useAppStore((s) => s.templateIndex)
  const docIndex = useAppStore((s) => s.docIndex)
  const imageIndex = useAppStore((s) => s.imageIndex)
  const requestEditorJump = useAppStore((s) => s.requestEditorJump)

  const issues = useMemo(() => {
    if (!openPath) return []
    const { html } = parseWikiText(rawText, { dataIndex, templateIndex, docIndex, imageIndex })
    return checkDocument(rawText, { missingLinks: findMissingLinks(html) })
  }, [openPath, rawText, dataIndex, templateIndex, docIndex, imageIndex])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function jump(issue) {
    requestEditorJump(issue.offset)
    onClose()
  }

  const warnCount = issues.filter((i) => i.severity === 'warn').length
  const infoCount = issues.length - warnCount

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel doc-check-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>문서 점검</h2>
          <div className="modal-header-actions">
            <button type="button" className="doc-check-close" title="닫기 (Esc)" onClick={onClose}>
              닫기
            </button>
          </div>
        </div>
        {!openPath ? (
          <p className="doc-check-empty">점검할 문서가 열려 있지 않습니다. 문서를 연 뒤 다시 여세요.</p>
        ) : (
          <>
            <p className="doc-check-summary" role="status">
              {openName}: {issues.length === 0 ? '문제를 찾지 못했습니다' : `고칠 것 ${warnCount}개, 참고 ${infoCount}개`}
            </p>
            {issues.length > 0 && (
              <ul className="doc-check-list">
                {issues.map((issue, i) => (
                  <li key={`${issue.kind}-${issue.offset}-${i}`}>
                    <button type="button" className={`doc-check-item doc-check-${issue.severity}`} onClick={() => jump(issue)} title="눌러서 편집기의 그 자리로 이동">
                      <span className="doc-check-line">{issue.line}줄</span>
                      <span className="doc-check-text">
                        <strong>{issue.label}</strong>
                        <span>{issue.message}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="doc-check-note">코드블록과 글 속 코드 안은 점검하지 않습니다. 이 창은 글을 고치지 않고 위치만 알려 줍니다.</p>
          </>
        )}
      </div>
    </div>
  )
}
