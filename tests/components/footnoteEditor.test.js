// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 편집 모드의 각주 색 구분과 각주 편집 상자가 편집기에 연결돼 있는지 지킨다(화면 자체는 실제 창에서 확인한다).
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')
const editor = read('src/components/EditorPane.jsx')
const box = read('src/components/FootnoteEditBox.jsx')
const css = read('src/App.css')

function ruleBody(selector) {
  const start = css.indexOf(`\n${selector} {`)
  if (start === -1) throw new Error(`${selector} 규칙을 찾지 못했다`)
  return css.slice(start, css.indexOf('\n}', start)).replace(/\/\*[\s\S]*?\*\//g, '')
}

describe('각주 색 구분 (배경판)', () => {
  it('배경판 줄 내용이 각주 조각(fn-hl)을 입힌다', () => {
    expect(editor).toMatch(/footnoteLineSegments\(text\)/)
    expect(editor).toMatch(/className=\{`fn-hl fn-c\$\{s\.footnote % 4\}\$\{s\.br \? ' fn-br' : ''\}`\}/)
  })

  it('조각을 이은 글이 원래 줄과 다르면 그냥 글로 둔다(글자 위치 보호)', () => {
    expect(editor).toMatch(/segments\.map\(\(s\) => s\.text\)\.join\(''\) !== line\) return line/)
  })

  it('찾기 강조 위치는 색 표시(span)가 섞여도 글자 노드를 차례로 세어 찾는다', () => {
    expect(editor).toMatch(/createTreeWalker\(row, NodeFilter\.SHOW_TEXT\)/)
  })

  it('제목 강조·각주 색 구분 설정을 함께 넘겨 그린다', () => {
    expect(editor).toMatch(/renderHighlightLines\(text, lineMarks, headingHighlight, footnoteColor\)/)
  })

  it('각주 색 구분 설정이 꺼져 있으면 색 조각을 만들지 않는다', () => {
    expect(editor).toMatch(/useAppStore\(\(s\) => s\.footnoteColor\)/)
    expect(editor).toMatch(/footnoteOn \? footnoteLineSegments\(text\) : \[\]/)
  })

  for (const sel of ['.fn-hl', '.fn-hl.fn-br']) {
    it(`${sel} 는 글자 모양을 바꾸는 값(크기·여백·테두리·간격)을 주지 않는다 — 입력칸과 글자 위치가 어긋난다`, () => {
      const body = ruleBody(sel)
      expect(body).not.toMatch(/(^|[\s;])(font|font-size|font-weight|font-style|letter-spacing|word-spacing|padding|margin|border|border-width|width|height|line-height|display|position)\s*:/)
    })
  }

  it('각주마다 네 색(fn-c0~3)을 돌려 쓰고 [br] 은 더 진하게 칠한다', () => {
    for (const n of [0, 1, 2, 3]) expect(css).toContain(`.fn-c${n} {`)
    const light = Number(ruleBody('.fn-hl').match(/var\(--fn-hue\) (\d+)%/)[1])
    const strong = Number(ruleBody('.fn-hl.fn-br').match(/var\(--fn-hue\) (\d+)%/)[1])
    expect(strong).toBeGreaterThan(light)
  })
})

describe('각주 편집 상자 연결', () => {
  it('Alt+E 로 각주 편집 상자를 열고, 각주 안이 아니면 키를 가로채지 않는다', () => {
    expect(editor).toMatch(/e\.altKey && !e\.ctrlKey && !e\.metaKey && !e\.shiftKey && \(e\.code === 'KeyE'/)
    expect(editor).toMatch(/if \(openFootnoteBox\(\)\) \{\s*e\.preventDefault\(\)/)
  })

  it('커서가 각주 안이면 "각주 편집" 단추가 뜬다(글을 고르지 않았을 때만)', () => {
    expect(editor).toMatch(/textarea\.selectionStart !== textarea\.selectionEnd\) \{\s*setFootnoteChip/)
    expect(editor).toMatch(/각주 편집 <kbd>Alt\+E<\/kbd>/)
  })

  it('단추를 눌러도 입력칸의 포커스·커서가 그대로다(mousedown 기본 동작을 막고 연다)', () => {
    expect(editor).toMatch(/onMouseDown=\{\(e\) => \{\s*e\.preventDefault\(\)\s*openFootnoteBox\(\)/)
  })

  it('반영은 실행 취소 기록이 남는 replaceRange 로 한다', () => {
    expect(editor).toMatch(/replaceRange\(textarea, from, to, insert, onChange\)/)
  })

  it('그사이 글이 달라졌으면 바꾸지 않는다', () => {
    expect(editor).toMatch(/textarea\.value\.slice\(fn\.bodyStart, fn\.end - 1\) !== fn\.body/)
  })

  it('문서를 옮기면 단추와 상자를 닫는다', () => {
    expect(editor).toMatch(/setFootnoteChip\(null\)\s*setFootnoteBox\(null\)\s*snippetStopsRef/)
  })
})

describe('FootnoteEditBox', () => {
  it('Ctrl+Enter 는 적용, Esc 는 취소다', () => {
    expect(box).toMatch(/e\.key === 'Escape'[\s\S]*?finish\(false\)/)
    expect(box).toMatch(/e\.key === 'Enter' && \(e\.ctrlKey \|\| e\.metaKey\)[\s\S]*?finish\(true\)/)
  })

  it('한글 조합 중에는 키를 처리하지 않는다', () => {
    expect(box).toMatch(/if \(e\.nativeEvent\.isComposing\) return/)
  })

  it('상자 밖을 누르면 고친 내용이 있을 때만 반영한다', () => {
    expect(box).toMatch(/finish\(valueRef\.current !== initialValue\)/)
  })

  it('두 번 반영되지 않는다(적용 후 바깥 클릭 등)', () => {
    expect(box).toMatch(/if \(doneRef\.current\) return/)
  })
})
