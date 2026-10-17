// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 표 편집기 창의 구조(소스 점검). 실제 클릭·키 동작은 실제 창에서 확인한다(docs/features/table-editor-modal.md).
const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')
const modal = read('src/components/TableEditorModal.jsx')
const css = read('src/App.css')

describe('적용·닫기', () => {
  it('"적용" 단추는 창 맨 위(헤더)에 있고, 아래쪽 단추 줄(modal-actions)은 없다', () => {
    const header = modal.slice(modal.indexOf('<div className="modal-header">'), modal.indexOf('<label className="modal-checkbox-row">'))
    expect(header).toContain('onConfirm(markup)')
    expect(header).toContain('적용')
    expect(modal).not.toContain('modal-actions')
  })

  it('"취소" 단추는 없다', () => {
    expect(modal).not.toContain('modal-cancel-btn')
    expect(modal).not.toMatch(/>\s*취소\s*</)
  })

  it('✕ 단추는 남아 있다 (명시적으로 닫기)', () => {
    expect(modal).toMatch(/modal-close-btn[\s\S]{0,80}onCancel|onClick=\{onCancel\}[\s\S]{0,80}modal-close-btn/)
  })

  it('바깥쪽은 한 번 클릭해서는 닫히지 않고 빠른 두 번 클릭(더블클릭)이어야 닫힌다', () => {
    const backdrop = modal.match(/<div className="modal-backdrop"[^>]*>/)?.[0] ?? ''
    expect(backdrop).toContain('onDoubleClick')
    expect(backdrop).not.toContain('onClick={onCancel}')
  })

  it('창 안쪽을 더블클릭해도(칸의 글자를 더블클릭해 고르는 등) 닫히지 않게 바깥 자체일 때만 닫는다', () => {
    expect(modal).toMatch(/e\.target === e\.currentTarget/)
  })

  it('헤더는 스크롤해도 따라오도록 고정된다 (sticky) — 행이 많아져도 적용 단추를 누르기 쉽다', () => {
    expect(css).toMatch(/\.table-editor-modal-panel \.modal-header\s*\{[^}]*position:\s*sticky/)
    expect(css).toMatch(/\.table-editor-modal-panel \.modal-header\s*\{[^}]*top:\s*0/)
  })
})

describe('글자 서식 단축키 (Ctrl+B, Ctrl+U)', () => {
  it('표 편집기의 키 처리에서 Ctrl+B / Ctrl+U 를 toggleInlineMark 로 처리한다', () => {
    expect(modal).toContain("from '../lib/tableInline.js'")
    expect(modal).toMatch(/toggleInlineMark\(/)
    expect(modal).toMatch(/BOLD_MARK/)
    expect(modal).toMatch(/UNDERLINE_MARK/)
  })

  it('한글 자판에서도 되도록 물리 키(KeyB, KeyU)도 본다', () => {
    expect(modal).toContain("e.code === 'KeyB'")
    expect(modal).toContain("e.code === 'KeyU'")
  })

  it('찾기 바·서식 패널 안의 입력칸에서는 이 단축키를 가로채지 않는다 (기존 early return 뒤에 있다)', () => {
    const handler = modal.slice(modal.indexOf('function handleGridKeyDown'))
    expect(handler.indexOf("closest?.('.table-find-bar, .table-format-panel')")).toBeGreaterThan(-1)
    expect(handler.indexOf("closest?.('.table-find-bar, .table-format-panel')")).toBeLessThan(handler.indexOf("applyInlineMark('bold')"))
  })

  it('고른 글자가 없을 때 Ctrl+B 는 선택 범위 전체 굵게(툴바 굵게 단추와 같은 동작)다', () => {
    expect(modal).toMatch(/updateRange\(\{ bold: !focusedCellData\?\.bold \}\)/)
  })

  it('글자를 고르지 않았을 때(결과 없음) 칸 전체 굵게로 대신하고, 밑줄은 표시 한 쌍을 넣는다(insertEmpty)', () => {
    expect(modal).toMatch(/if \(!result\) \{\s*toggleWholeBold\(\)\s*return\s*\}/)
    expect(modal).toContain("{ insertEmpty: kind === 'underline' }")
  })
})

describe('행·열 추가 단추의 자리와 위치 고정', () => {
  it('아래쪽에 따로 모여 있던 단추 줄(table-editor-toolbar)은 없다', () => {
    expect(modal).not.toContain('table-editor-toolbar')
    expect(css).not.toMatch(/\.table-editor-toolbar\b/)
  })

  it('맨 아래에 행을 붙이는 "+ 행 추가"는 마지막 행 바로 아래(격자 안)에 있다 (열 쪽은 열마다 있는 "+" 가 맡는다)', () => {
    const grid = modal.slice(modal.indexOf('<table className="table-editor-grid">'), modal.indexOf('</table>'))
    expect(grid).toContain('data-anchor="add-row"')
    expect(grid).not.toContain('data-anchor="add-col"')
    expect(grid.indexOf('data-anchor="add-row"')).toBeGreaterThan(grid.indexOf('grid.map((row, r)'))
    expect(grid.indexOf('data-anchor="add-row"')).toBeLessThan(grid.indexOf('table-editor-col-actions'))
  })

  it('행·열 추가와 행·열 삭제 단추는 누른 자리를 기억해 표가 바뀐 뒤에도 같은 화면 위치에 남게 한다', () => {
    expect(modal).toContain("from './useKeepPosition.js'")
    expect(modal).toMatch(/keepPosition\('add-row', e\.currentTarget\)/)
    expect(modal).toMatch(/keepPosition\(`row-del:\$\{/)
    expect(modal).toMatch(/keepPosition\(`col-del:\$\{/)
    expect(modal).toContain('data-anchor={`row-del:${r}`}')
    expect(modal).toContain('data-anchor={`col-del:${c}`}')
  })

  it('보정은 격자가 바뀐 직후(useLayoutEffect)에 창의 세로·격자 상자의 가로 스크롤을 조정한다', () => {
    const hook = read('src/components/useKeepPosition.js')
    expect(hook).toContain('useLayoutEffect')
    expect(hook).toMatch(/scrollTop \+=/)
    expect(hook).toMatch(/scrollLeft \+=/)
    expect(hook).toContain('data-anchor')
  })

  it('행·열을 지우는 단추는 지울 게 하나뿐일 때 위치를 기억하지 않는다 (지워지지 않아 보정할 일이 없다)', () => {
    expect(modal).toMatch(/grid\.length > 1/)
    expect(modal).toMatch(/\(grid\[0\]\?\.length \?\? 0\) > 1/)
  })
})

describe('선택한 셀 내용(넓은 칸)의 줄바꿈', () => {
  it('저장된 [br] 을 실제 줄바꿈으로 보여 주고, 쳐진 줄바꿈은 [br] 로 저장한다', () => {
    expect(modal).toContain("from '../lib/cellText.js'")
    expect(modal).toMatch(/value=\{storedToDisplay\(focusedCellData\?\.text\)\}/)
    expect(modal).toMatch(/updateCell\(focusCell\.r, focusCell\.c, \{ text: displayToStored\(e\.target\.value\) \}\)/)
  })

  it('넓은 칸에서 Ctrl+B / Ctrl+U 로 바뀐 글도 줄바꿈을 [br] 로 되돌려 저장한다', () => {
    expect(modal).toMatch(/updateCell\(r, c, \{ text: inContentBox \? displayToStored\(result\.text\) : result\.text \}\)/)
  })
})

describe('행·열 중간 삽입 단추', () => {
  it('행마다 "−" 왼쪽에 아래에 행을 끼우는 "+" 가 있다', () => {
    const actions = modal.slice(modal.indexOf('<td className="table-editor-row-actions">'), modal.indexOf('<td className="table-editor-add-row"'))
    expect(actions).toContain('insertRowAfter(r)')
    expect(actions.indexOf('insertRowAfter(r)')).toBeLessThan(actions.indexOf('removeRow(r)'))
  })

  it('열마다 열 글자 줄에 오른쪽에 열을 끼우는 "+" 가 있다', () => {
    const header = modal.slice(modal.indexOf('<td className="table-editor-head-cell">'), modal.indexOf('grid.map((row, r)'))
    expect(header).toContain('insertColumnAfter(c)')
  })
})

describe('칸 <-> 선택한 셀 내용 오가기 (F2, Ctrl+Enter)', () => {
  it('표 편집기의 키 처리에서 isJumpKey/jumpTarget 으로 처리한다', () => {
    expect(modal).toContain("from '../lib/tableJump.js'")
    expect(modal).toMatch(/isJumpKey\(e\)/)
    expect(modal).toMatch(/jumpTarget\(/)
  })

  it('찾기 바·서식 패널 안의 입력칸에서는 가로채지 않는다 (기존 early return 뒤에 있다)', () => {
    const handler = modal.slice(modal.indexOf('function handleGridKeyDown'))
    expect(handler.indexOf("closest?.('.table-find-bar, .table-format-panel')")).toBeLessThan(handler.indexOf('isJumpKey(e)'))
  })

  it('한글 조합 중에는 오가지 않는다', () => {
    const handler = modal.slice(modal.indexOf('function handleGridKeyDown'))
    expect(handler.slice(handler.indexOf('isJumpKey(e)') - 200, handler.indexOf('isJumpKey(e)'))).toContain('isComposing')
  })

  it('큰 입력칸은 칸 하나만 골랐을 때만 있으므로 그때만 갈 수 있다 (contentVisible)', () => {
    expect(modal).toMatch(/contentVisible: !isMultiCell/)
  })
})
