import { useState } from 'react'
import { DictModal } from './DictModal.jsx'

// 사전은 더 이상 메인 에디터로 "열어서" 편집하지 않음 — 항목이 10만 개를 넘어가면 그
// 방식은 매 입력마다 문서 전체를 다시 렌더링/파싱하느라 앱이 멈추는 수준으로 느려짐(실제로
// 이 워크스페이스에서 재현됨). 검색으로 필요한 항목만 찾아 관리하는 DictModal 하나로
// 대체함(Galpi 원본과 동일한 방식).
export function DictSidebar() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="data-sidebar">
      <div className="data-sidebar-title">
        <span>사전</span>
      </div>
      <div className="data-sidebar-row" onClick={() => setModalOpen(true)} title="고유명사 사전 — Alt+H로 원문↔한자를 순환치환">
        <span className="data-sidebar-label">사전 관리</span>
      </div>
      {modalOpen && <DictModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
