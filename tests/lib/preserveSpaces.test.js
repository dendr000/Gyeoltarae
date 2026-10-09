import { describe, expect, it } from 'vitest'
import { preserveSpaces } from '../../src/lib/preserveSpaces.js'
import { parseWikiText } from '../../src/lib/wikiParser.js'

const S = (n) => ' '.repeat(n)
const wrap = (n) => `<span class="wiki-spaces">${S(n)}</span>`

describe('preserveSpaces (연속 공백 보존)', () => {
  it('2칸 이상 연속 공백만 감싼다', () => {
    expect(preserveSpaces(`<p>a${S(6)}b</p>`)).toBe(`<p>a${wrap(6)}b</p>`)
    expect(preserveSpaces(`<p>a${S(2)}b</p>`)).toBe(`<p>a${wrap(2)}b</p>`)
  })

  it('공백 한 칸은 그대로 둔다', () => {
    expect(preserveSpaces('<p>a b c</p>')).toBe('<p>a b c</p>')
  })

  it('한 글 안에 여러 곳이 있으면 각각 감싼다', () => {
    expect(preserveSpaces(`<p>a${S(3)}b c${S(2)}d</p>`)).toBe(`<p>a${wrap(3)}b c${wrap(2)}d</p>`)
  })

  it('감싸도 공백은 일반 공백(U+0020)이고 글자 수는 그대로다 (복사해도 다른 글자가 섞이지 않는다)', () => {
    const out = preserveSpaces(`<p>a${S(4)}b</p>`)
    const text = out.replace(/<[^>]*>/g, '')
    expect(text).toBe(`a${S(4)}b`)
    expect(out).not.toContain(' ')
    expect(out).not.toContain('&nbsp;')
  })

  it('태그 속성 안의 공백은 건드리지 않는다', () => {
    const html = `<a class="x${S(2)}y" href="a${S(2)}b">링크</a>`
    expect(preserveSpaces(html)).toBe(html)
  })

  it('코드블록(pre)과 인라인 코드(code) 안은 그대로 둔다', () => {
    const pre = `<pre class="wiki-code">a${S(4)}b</pre>`
    const code = `<p>글<code>a${S(3)}b</code>글</p>`
    expect(preserveSpaces(pre)).toBe(pre)
    expect(preserveSpaces(code)).toBe(code)
  })

  it('표 안은 그대로 둔다', () => {
    const table = `<table><tr><td>a${S(3)}b</td></tr></table>`
    expect(preserveSpaces(table)).toBe(table)
  })

  it('표가 끝난 뒤의 글은 다시 감싼다', () => {
    const html = `<table><tr><td>x</td></tr></table><p>a${S(2)}b</p>`
    expect(preserveSpaces(html)).toBe(`<table><tr><td>x</td></tr></table><p>a${wrap(2)}b</p>`)
  })

  it('인라인 태그 사이의 공백뿐인 조각은 보존한다', () => {
    expect(preserveSpaces(`<p><strong>A</strong>${S(3)}<em>B</em></p>`)).toBe(
      `<p><strong>A</strong>${wrap(3)}<em>B</em></p>`,
    )
  })

  it('블록 태그 사이의 들여쓰기 공백은 감싸지 않는다 (잘못된 HTML 방지)', () => {
    const html = `<ul>${S(4)}<li>a</li>${S(4)}<li>b</li>${S(4)}</ul>`
    expect(preserveSpaces(html)).toBe(html)
  })

  it('두 번 적용해도 결과가 같다', () => {
    const once = preserveSpaces(`<p>a${S(5)}b${S(2)}c</p>`)
    expect(preserveSpaces(once)).toBe(once)
  })

  it('공백이 없는 HTML 이나 빈 문자열은 그대로 돌려준다', () => {
    expect(preserveSpaces('')).toBe('')
    expect(preserveSpaces('<p>a</p>')).toBe('<p>a</p>')
  })
})

describe('parseWikiText 의 뷰어 HTML — 연속 공백 (재현: 편집창에서 띄운 칸이 뷰어에서 한 칸으로 합쳐짐)', () => {
  it('문단 속 연속 공백이 보존된다', () => {
    const { html } = parseWikiText(`컬럼명 IS NULL${S(6)}컬럼 값이 NULL이면 참`)
    expect(html).toContain(`IS NULL${wrap(6)}컬럼`)
  })

  it('문단의 여러 줄에서 줄마다 각자 보존된다', () => {
    const { html } = parseWikiText(`NVL()${S(5)}설명\nNVL2()${S(4)}설명2`)
    expect(html).toContain(`NVL()${wrap(5)}설명`)
    expect(html).toContain(`NVL2()${wrap(4)}설명2`)
  })

  it('코드블록 안의 연속 공백은 감싸지 않는다', () => {
    const { html } = parseWikiText('```sql\nSELECT a' + S(5) + 'b\n```')
    expect(html).not.toContain('wiki-spaces')
  })

  it('{{{ }}} 코드블록 안의 연속 공백은 감싸지 않는다', () => {
    const { html } = parseWikiText(`{{{\na${S(4)}b\n}}}`)
    expect(html).toContain(`<code>a${S(4)}b</code>`)
    expect(html).not.toContain('wiki-spaces')
  })

  it('표 셀 안의 연속 공백은 감싸지 않는다', () => {
    const { html } = parseWikiText(`||a${S(4)}b||c||`)
    expect(html).not.toContain('wiki-spaces')
  })

  it('굵게 같은 인라인 문법과 같이 써도 문법이 깨지지 않는다', () => {
    const { html } = parseWikiText(`'''굵게'''${S(3)}보통`)
    expect(html).toContain('<strong>굵게</strong>')
    expect(html).toContain(wrap(3))
  })

  it('따옴표 변환(스마트 따옴표)과 같이 써도 둘 다 적용된다', () => {
    const { html } = parseWikiText(`"인용"${S(3)}뒤`)
    expect(html).toContain('“인용”')
    expect(html).toContain(wrap(3))
  })
})
