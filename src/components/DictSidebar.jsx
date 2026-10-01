import { useAppStore } from '../store/useAppStore.js'
import { DictModal } from './DictModal.jsx'
import { SidebarSection } from './SidebarSection.jsx'

// 사전은 더 이상 메인 에디터로 "열어서" 편집하지 않음 — 항목이 10만 개를 넘어가면 그
// 방식은 매 입력마다 문서 전체를 다시 렌더링/파싱하느라 앱이 멈추는 수준으로 느려짐(실제로
// 이 워크스페이스에서 재현됨). 검색으로 필요한 항목만 찾아 관리하는 DictModal 하나로
// 대체함(Galpi 원본과 동일한 방식). 모달 열림 상태는 스토어에 둠 — 에디터의
// Alt+Shift+H(한자 등록) 단축키도 같은 모달을 열므로, 로컬 state였다면 둘이 따로 열려서
// 모달이 두 개 뜰 수 있었음.
export function DictSidebar() {
  const dictModalOpen = useAppStore((s) => s.dictModalOpen)
  const dictModalPrefillWord = useAppStore((s) => s.dictModalPrefillWord)
  const openDictModal = useAppStore((s) => s.openDictModal)
  const closeDictModal = useAppStore((s) => s.closeDictModal)

  return (
    <div className="data-sidebar">
      <SidebarSection id="dict" title="사전">
        <div
          className="data-sidebar-row"
          onClick={() => openDictModal()}
          title="고유명사 사전 — Alt+H로 원문↔한자를 순환치환, Alt+Shift+H로 선택한 단어를 바로 등록"
        >
          <span className="data-sidebar-label">사전 관리</span>
        </div>
      </SidebarSection>
      {dictModalOpen && <DictModal initialWord={dictModalPrefillWord} onClose={closeDictModal} />}
    </div>
  )
}
