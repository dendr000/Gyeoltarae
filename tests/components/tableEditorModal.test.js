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
