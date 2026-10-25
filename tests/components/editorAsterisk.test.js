// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 편집창이 별표 짝 맞추기(lib/asteriskPair.js)를 어떻게 연결했는지 소스로 점검한다. 규칙 자체는 tests/lib/asteriskPair.test.js.
const editor = readFileSync(new URL('../../src/components/EditorPane.jsx', import.meta.url), 'utf8')

describe('편집창의 별표 짝 맞추기 연결', () => {
  it('열린 문서가 "AI챗" 폴더 안일 때만 켠다', () => {
    expect(editor).toMatch(/const aiChatDoc = isAiChatDoc\(openPath, workspacePath\)/)
    expect(editor).toMatch(/if \(aiChatDoc && \(e\.key === '\*' \|\| e\.key === ' '\)\)/)
  })

  it('별표와 공백만 다루고, 처리했으면 기본 입력을 막는다', () => {
    expect(editor).toMatch(/asteriskPairEdit\(value, selectionStart, selectionEnd, e\.key, asteriskFresh\)[\s\S]{0,80}if \(edit\) \{\s*e\.preventDefault\(\)/)
  })

  it('방금 짝을 만든 자리를 기억하고, Shift 외의 다른 키를 누르면 잊는다(Shift+8 로 별표를 치기 때문)', () => {
    expect(editor).toMatch(/const asteriskFresh = asteriskFreshRef\.current\s*if \(e\.key !== 'Shift'\) asteriskFreshRef\.current = -1/)
    expect(editor).toMatch(/if \(edit\.fresh\) asteriskFreshRef\.current = edit\.selStart/)
  })

  it('닫는 별표를 넘어갈 때는 글을 바꾸지 않고 커서만 옮긴다', () => {
    expect(editor).toMatch(/if \(edit\.type === 'move'\) \{\s*textarea\.setSelectionRange\(edit\.caret, edit\.caret\)\s*return/)
  })

  it('글을 바꿀 때는 되돌리기(Ctrl+Z)가 되도록 다른 편집과 같은 replaceRange 를 쓰고 선택을 바로·다음 프레임에 맞춘다', () => {
    expect(editor).toMatch(/replaceRange\(textarea, edit\.from, edit\.to, edit\.insert, onChange\)\s*textarea\.setSelectionRange\(edit\.selStart, edit\.selEnd\)/)
    expect(editor).toMatch(/requestAnimationFrame\(\(\) => \{\s*textarea\.focus\(\)\s*textarea\.setSelectionRange\(edit\.selStart, edit\.selEnd\)/)
  })

  it('별표 처리는 기존 자동 괄호(AUTO_PAIRS)보다 먼저 와서 별표를 자동 괄호가 가로채지 않는다', () => {
    const star = editor.indexOf('asteriskPairEdit(value, selectionStart')
    const closer = editor.indexOf('AUTO_PAIR_CLOSERS.has(e.key) && selectionStart')
    expect(star).toBeGreaterThan(0)
    expect(closer).toBeGreaterThan(star)
  })

  it('기존 자동 괄호 목록에는 별표를 넣지 않았다(다른 폴더에서는 동작하지 않아야 하므로)', () => {
    expect(editor).toMatch(/const AUTO_PAIRS = \{ '\(': '\)', '\[': '\]', "'": "'", '"': '"', '<': '>', '\{': '\}' \}/)
  })
})
