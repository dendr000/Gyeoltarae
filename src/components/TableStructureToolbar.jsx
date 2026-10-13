import {
  ArrowDown,
  ArrowDownAZ,
  ArrowDownToLine,
  ArrowDownZA,
  ArrowLeft,
  ArrowRight,
  ArrowRightToLine,
  ArrowUp,
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  Columns3,
  Rows3,
  Search,
} from 'lucide-react'

// 표 편집기의 "구조" 툴바 — 행·열 삽입 / 이동 / 복제, 아래·오른쪽으로 채우기, 정렬, 찾아 바꾸기 단추. 단추의 켜짐·안내 글·동작은 모두
// tableStructureOps.js 가 만든 ops 가 갖고 있고, 여기서는 아이콘을 붙여 그리기만 한다. 안내 글(title)에는 꺼진 이유도 들어 있다.
function OpButton({ op, onRun, children }) {
  return (
    <button type="button" disabled={!op.enabled} title={op.title} onClick={() => onRun(op)}>
      {children}
    </button>
  )
}

export function TableStructureToolbar({ ops, onRun, findOpen, onToggleFind }) {
  return (
    <div className="cell-style-toolbar table-structure-toolbar">
      <span className="cell-style-toolbar-sublabel">삽입</span>
      <OpButton op={ops.insertAbove} onRun={onRun}>
        <BetweenHorizontalStart size={14} />
      </OpButton>
      <OpButton op={ops.insertBelow} onRun={onRun}>
        <BetweenHorizontalEnd size={14} />
      </OpButton>
      <OpButton op={ops.insertLeft} onRun={onRun}>
        <BetweenVerticalStart size={14} />
      </OpButton>
      <OpButton op={ops.insertRight} onRun={onRun}>
        <BetweenVerticalEnd size={14} />
      </OpButton>
      <span className="editor-toolbar-divider" />
      <span className="cell-style-toolbar-sublabel">이동</span>
      <OpButton op={ops.moveRowUp} onRun={onRun}>
        <ArrowUp size={14} />
      </OpButton>
      <OpButton op={ops.moveRowDown} onRun={onRun}>
        <ArrowDown size={14} />
      </OpButton>
      <OpButton op={ops.moveColumnLeft} onRun={onRun}>
        <ArrowLeft size={14} />
      </OpButton>
      <OpButton op={ops.moveColumnRight} onRun={onRun}>
        <ArrowRight size={14} />
      </OpButton>
      <span className="editor-toolbar-divider" />
      <span className="cell-style-toolbar-sublabel">복제</span>
      <OpButton op={ops.duplicateRow} onRun={onRun}>
        <Rows3 size={14} />
      </OpButton>
      <OpButton op={ops.duplicateColumn} onRun={onRun}>
        <Columns3 size={14} />
      </OpButton>
      <span className="editor-toolbar-divider" />
      <span className="cell-style-toolbar-sublabel">채우기</span>
      <OpButton op={ops.fillDown} onRun={onRun}>
        <ArrowDownToLine size={14} />
      </OpButton>
      <OpButton op={ops.fillRight} onRun={onRun}>
        <ArrowRightToLine size={14} />
      </OpButton>
      <span className="editor-toolbar-divider" />
      <span className="cell-style-toolbar-sublabel">정렬</span>
      <OpButton op={ops.sortAscending} onRun={onRun}>
        <ArrowDownAZ size={14} />
      </OpButton>
      <OpButton op={ops.sortDescending} onRun={onRun}>
        <ArrowDownZA size={14} />
      </OpButton>
      <span className="editor-toolbar-divider" />
      <button type="button" className={findOpen ? 'active' : ''} title="찾아 바꾸기 (Ctrl+F)" onClick={onToggleFind}>
        <Search size={14} />
      </button>
    </div>
  )
}
