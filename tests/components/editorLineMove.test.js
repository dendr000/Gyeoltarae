// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 문서 편집기의 Ctrl+Alt+↑/↓ 줄 이동 연결(소스 점검). 실제 키 입력은 실제 창에서 확인한다(docs/features/line-move.md).
const pane = readFileSync(new URL('../../src/components/EditorPane.jsx', import.meta.url), 'utf8')

describe('EditorPane 의 줄 이동', () => {
  it('isLineMoveKey(nativeEvent)로 판별하고 moveLinesEdit 결과를 replaceRange 로 적용한다 (되돌리기가 이어진다)', () => {
    expect(pane).toContain("from '../lib/lineMove.js'")
    expect(pane).toMatch(/const lineMoveDirection = isLineMoveKey\(e\.nativeEvent\)/)
    expect(pane).toMatch(/moveLinesEdit\(textarea\.value, textarea\.selectionStart, textarea\.selectionEnd, lineMoveDirection\)/)
    expect(pane).toMatch(/replaceRange\(textarea, edit\.from, edit\.to, edit\.insert, onChange\)/)
  })

  it('처리한 키는 기본 동작(글 커서 이동·OS 단축키)을 막고, 갈 곳이 없어도 키는 소비한다', () => {
    const at = pane.indexOf('const lineMoveDirection')
    const handler = pane.slice(at, at + 900)
    expect(handler).toMatch(/if \(lineMoveDirection !== null\) \{\s*e\.preventDefault\(\)/)
    expect(handler).toMatch(/return\s*\}/)
  })

  it('옮긴 뒤 선택 방향을 유지한다', () => {
    expect(pane).toMatch(/setSelectionRange\(edit\.selStart, edit\.selEnd, selectionDirection\)/)
  })

  it('추천 팝업이 떠 있을 때의 방향키 처리보다 뒤에 있다 (팝업 조작이 우선)', () => {
    const at = pane.indexOf('const lineMoveDirection')
    expect(at).toBeGreaterThan(pane.indexOf("if (e.key === 'ArrowUp') {"))
  })
})
