// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 글자 수 표시줄(CharCountBar)의 구조 점검(소스). 실제 선택·표시는 실제 창에서 확인한다(docs/features/char-count.md).
const bar = readFileSync(new URL('../../src/components/CharCountBar.jsx', import.meta.url), 'utf8')
const app = readFileSync(new URL('../../src/App.jsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../../src/App.css', import.meta.url), 'utf8')

describe('CharCountBar', () => {
  it('문서 전체 글자 수는 설정과 상관없이 기본 글자 수(줄바꿈 제외)로 센다', () => {
    expect(bar).toContain("from '../lib/charCount.js'")
    expect(bar).toMatch(/const total = countChars\(text\)/)
    expect(bar).not.toMatch(/countChars\(text, \{/)
  })

  it('"(줄바꿈 포함)" 같은 기준 표시는 화면에 쓰지 않는다', () => {
    expect(bar).not.toContain('줄바꿈 포함)')
    expect(bar).not.toContain('char-count-basis')
  })

  it('드래그한 글자 수는 설정과 상관없이 항상 따라간다 (기본으로 센다)', () => {
    expect(bar).not.toContain('selectionCharCount')
    expect(bar).not.toMatch(/if \(!show[A-Za-z]*\) return undefined/)
  })

  it('드래그한 글자 수의 줄바꿈 포함 여부는 설정(countNewlines)을 따른다', () => {
    expect(bar).toMatch(/useAppStore\(\(s\) => s\.countNewlines\)/)
    expect(bar).toMatch(/countChars\([^)]*\{ includeNewlines: countNewlines \}\)/)
  })

  it('선택한 글이 있을 때만 드래그 글자 수를 보여 준다', () => {
    expect(bar).toMatch(/selected > 0/)
  })

  it('편집창(textarea)의 선택은 선택 범위의 글에서, 뷰어의 선택은 window.getSelection 에서 센다', () => {
    expect(bar).toMatch(/\.value\.slice\(.*selectionStart.*selectionEnd/)
    expect(bar).toContain('window.getSelection()')
  })

  it('뷰어에서는 문서 본문(.viewer-scroll) 안에서 고른 글만 센다 (사이드바·메뉴 글씨를 드래그한 것은 세지 않는다)', () => {
    expect(bar).toMatch(/if \(!anchor\?\.closest\?\.\('\.viewer-scroll'\)\) return ''/)
  })

  it('선택이 바뀌는 것을 selectionchange 와 마우스·키 입력으로 따라간다 (textarea 선택은 selectionchange 가 안 오는 환경도 있어서)', () => {
    expect(bar).toMatch(/addEventListener\('selectionchange'/)
    expect(bar).toMatch(/addEventListener\('mouseup'/)
    expect(bar).toMatch(/addEventListener\('keyup'/)
    expect(bar).toMatch(/removeEventListener\('selectionchange'/)
  })

  it('전체 글자 수가 맨 오른쪽 끝에 있고, 드래그 글자 수는 그 왼쪽에 붙는다 (드래그가 생기고 사라져도 전체 글자 수 자리는 안 움직인다)', () => {
    const selectedAt = bar.indexOf('char-count-selected')
    const totalAt = bar.indexOf('char-count-total')
    expect(selectedAt).toBeGreaterThan(-1)
    expect(totalAt).toBeGreaterThan(selectedAt)
    expect(css).toMatch(/\.char-count-bar\s*\{[^}]*justify-content:\s*flex-end/)
  })
})

describe('App 연결', () => {
  it('열린 문서의 글(rawText)을 받아 편집·뷰어 아래에 표시줄을 그린다', () => {
    expect(app).toContain("from './components/CharCountBar.jsx'")
    expect(app).toMatch(/<CharCountBar text=\{rawText\} \/>/)
  })

  it('표시줄에 CSS 가 있다', () => {
    expect(css).toMatch(/\.char-count-bar\s*\{/)
  })
})
