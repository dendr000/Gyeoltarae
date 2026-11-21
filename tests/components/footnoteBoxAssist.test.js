// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 각주 편집 상자가 본문과 같은 입력 도우미(상용구 팝업·괄호 자동 닫기·링크 보조·줄 편집 단축키)를 쓰도록 연결돼 있는지 지킨다.
// 실제 동작은 실제 창에서 확인한다(docs/features/footnote-editor.md).
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')
const editor = read('src/components/EditorPane.jsx')
const box = read('src/components/FootnoteEditBox.jsx')
const css = read('src/App.css')

function fnBody(name) {
  const start = editor.indexOf(`\n  function ${name}(`)
  expect(start, name).toBeGreaterThan(-1)
  const next = editor.slice(start + 5).search(/\n {2}(function |const |useEffect\()/)
  return editor.slice(start, start + 5 + next)
}

describe('본문 함수가 상자의 입력칸을 쓴다 (assistRef)', () => {
  it('고치는 입력칸과 글 바꾸기를 한 곳에서 고른다', () => {
    expect(editor).toMatch(/const getArea = \(\) => assistRef\.current\?\.area \?\? textareaRef\.current/)
    expect(editor).toMatch(/const emitChange = \(value\) => \(assistRef\.current \? assistRef\.current\.setValue\(value\) : onChange\(value\)\)/)
  })

  it('팝업·상용구·키 처리 함수는 본문 입력칸을 직접 잡지 않고 getArea 를 쓴다', () => {
    for (const name of ['updateFileSuggest', 'updateSnippetSuggest', 'commitSnippetExpansion', 'applySnippetMatch', 'selectFileSuggestItem', 'openSnippetModalWithSelection']) {
      expect(fnBody(name), name).not.toMatch(/textareaRef\.current/)
      expect(fnBody(name), name).toMatch(/getArea\(\)/)
    }
  })

  it('키 처리·상용구 펼치기·파일 선택은 글을 바꿀 때 emitChange 를 쓴다', () => {
    for (const name of ['handleKeyDown', 'commitSnippetExpansion', 'selectFileSuggestItem']) {
      expect(fnBody(name), name).not.toMatch(/\bonChange\b/)
      expect(fnBody(name), name).toMatch(/emitChange/)
    }
  })

  it('상자 안에서는 본문 전용 키(타자기 위치·Alt+E·찾기·저장)를 건너뛴다', () => {
    const body = fnBody('handleKeyDown')
    expect(body).toMatch(/const inBox = assistRef\.current !== null/)
    expect(body).toMatch(/!inBox && typewriterZone/)
    expect(body).toMatch(/!inBox && e\.altKey[^\n]*KeyE/)
    expect(body).toMatch(/!inBox && \(e\.ctrlKey \|\| e\.metaKey\) && !e\.altKey && e\.key\.toLowerCase\(\) === 'f'/)
    expect(body).toMatch(/!inBox && \(e\.ctrlKey \|\| e\.metaKey\) && e\.key\.toLowerCase\(\) === 's'/)
  })

  it('동작 본문({!표} 등)은 상자에서 실행하지 않는다', () => {
    expect(fnBody('commitSnippetExpansion')).toMatch(/if \(action && assistRef\.current\) \{\s*setSnippetSuggest\(null\)\s*return/)
  })
})

describe('상자 쪽 연결', () => {
  it('편집기가 도우미 연결을 상자에 넘긴다', () => {
    expect(editor).toMatch(/assist=\{footnoteAssist\}/)
    expect(editor).toMatch(/onOpenSnippetModal=\{openSnippetModal\}/)
  })

  it('상자는 열릴 때 입력칸을 등록하고 닫힐 때 해제한다', () => {
    expect(box).toMatch(/assist\?\.register\(\{ area, setValue \}\)/)
    expect(box).toMatch(/assist\?\.register\(null\)/)
  })

  it('글이 바뀔 때와 커서가 움직일 때 팝업을 갱신하고 포커스를 잃으면 닫는다', () => {
    expect(box).toMatch(/assist\.onChange\(e, setValue\)/)
    expect(box).toMatch(/assist\?\.onCursorMove\(\)/)
    expect(box).toMatch(/assist\?\.onBlur\(\)/)
  })

  it('팝업을 누르는 것은 상자 바깥 클릭으로 보지 않는다', () => {
    expect(box).toMatch(/closest\?\.\('\.file-suggest-menu'\)/)
  })

  it('키는 도우미가 먼저 처리하고, 처리하지 않은 Esc 만 상자를 닫는다', () => {
    const k = box.indexOf('assist.onKeyDown(e)')
    const esc = box.indexOf("e.key === 'Escape'", k)
    expect(k).toBeGreaterThan(-1)
    expect(esc).toBeGreaterThan(k)
    expect(box.slice(k, esc)).toMatch(/e\.defaultPrevented/)
  })

  it('사전 등록·상용구 등록은 지금 글을 반영하고 닫은 뒤 창을 연다', () => {
    expect(box).toMatch(/finish\(true\)\s*onOpenDict\?\.\(selected\)/)
    expect(box).toMatch(/finish\(true\)\s*onOpenSnippetModal\?\.\(selected\)/)
  })

  it('추천 팝업은 각주 상자(z-index 210)보다 위에 그린다', () => {
    const rule = css.slice(css.indexOf('\n.file-suggest-menu {'))
    const z = Number(/z-index:\s*(\d+)/.exec(rule.slice(0, rule.indexOf('}')))[1])
    expect(z).toBeGreaterThan(210)
  })
})
