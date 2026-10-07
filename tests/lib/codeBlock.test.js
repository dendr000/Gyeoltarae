import { describe, expect, it } from 'vitest'
import { parseWikiText } from '../../src/lib/wikiParser.js'

const FENCE = '```'
const SQL = 'CREATE TABLE mytable(\nid INT PRIMARY KEY,\nname VARCHAR(10)\n);'

// 코드 본문(pre > code 안 글자)만 꺼낸다.
function codeBody(html) {
  return html.match(/<pre class="wiki-code"><code>([\s\S]*?)<\/code><\/pre>/)?.[1]
}

describe('``` 코드블록', () => {
  it('``` 로 감싼 줄이 코드블록이 되고 줄바꿈이 그대로 유지된다', () => {
    const { html } = parseWikiText(`${FENCE}\n${SQL}\n${FENCE}`)
    expect(codeBody(html)).toBe(SQL)
    // 본문이 일반 문단으로 흘러나오지 않는다
    expect(html).not.toContain('<p>')
  })

  it('코드블록 윗줄에 복사 버튼이 있다', () => {
    const { html } = parseWikiText(`${FENCE}\nx\n${FENCE}`)
    expect(html).toContain('<div class="wiki-code-wrap"><div class="wiki-code-head">')
    expect(html).toContain('class="wiki-code-copy"')
    // 버튼이 본문(pre)보다 앞에 있어야 "상단"에 놓인다
    expect(html.indexOf('wiki-code-copy')).toBeLessThan(html.indexOf('<pre'))
  })

  it('버튼 안에 아이콘 마크업(svg)을 직접 넣지 않는다', () => {
    const { html } = parseWikiText(`${FENCE}\nx\n${FENCE}`)
    expect(html).not.toContain('<svg')
  })

  it('언어를 적으면 윗줄에 언어 이름이 나오고 안 적으면 나오지 않는다', () => {
    const withLang = parseWikiText(`${FENCE}sql\nSELECT 1;\n${FENCE}`).html
    expect(withLang).toContain('<span class="wiki-code-lang">sql</span>')
    expect(codeBody(withLang)).toBe('SELECT 1;')

    const noLang = parseWikiText(`${FENCE}\nSELECT 1;\n${FENCE}`).html
    expect(noLang).not.toContain('wiki-code-lang')
  })

  it('앞뒤 문단은 코드블록과 따로 유지된다', () => {
    const { html } = parseWikiText(`앞 문단\n${FENCE}\ncode\n${FENCE}\n뒤 문단`)
    expect(html).toContain('<p>앞 문단</p>')
    expect(html).toContain('<p>뒤 문단</p>')
    expect(html.indexOf('앞 문단')).toBeLessThan(html.indexOf('wiki-code-wrap'))
    expect(html.indexOf('wiki-code-wrap')).toBeLessThan(html.indexOf('뒤 문단'))
  })

  it('안에 적은 위키 문법은 해석되지 않고 글자 그대로 보인다', () => {
    const body = "= 제목 =\n## 주석\n||표||\n[[링크]] '''굵게'''\n* 목록"
    const { html, toc } = parseWikiText(`${FENCE}\n${body}\n${FENCE}`)
    expect(codeBody(html)).toBe(body)
    expect(toc).toEqual([])
    expect(html).not.toContain('<strong>')
    expect(html).not.toContain('wiki-link')
  })

  it('빈 줄이 있어도 하나의 코드블록으로 이어진다', () => {
    const { html } = parseWikiText(`${FENCE}\na\n\nb\n${FENCE}`)
    expect(codeBody(html)).toBe('a\n\nb')
  })

  it('안의 HTML 은 이스케이프되어 실행되지 않는다', () => {
    const { html } = parseWikiText(`${FENCE}\n<script>alert("x")</script> & y\n${FENCE}`)
    expect(html).not.toContain('<script>')
    expect(codeBody(html)).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; y')
  })

  it('닫는 ``` 가 없으면 문서 끝까지가 코드블록이다', () => {
    const { html } = parseWikiText(`${FENCE}\na\nb`)
    expect(codeBody(html)).toBe('a\nb')
  })

  it('빈 코드블록도 오류 없이 만들어진다', () => {
    const { html } = parseWikiText(`${FENCE}\n${FENCE}`)
    expect(codeBody(html)).toBe('')
  })

  it('백틱 4개로 열면 안의 ``` 줄이 닫는 줄로 취급되지 않는다', () => {
    const OUTER = '````'
    const { html } = parseWikiText(`${OUTER}\nouter\n${FENCE}\ninner\n${OUTER}\n뒤`)
    expect(codeBody(html)).toBe(`outer\n${FENCE}\ninner`)
    expect(html).toContain('<p>뒤</p>')
  })

  it('한 줄에 ```코드``` 로 쓴 것은 코드블록이 아니다', () => {
    const { html } = parseWikiText(`${FENCE}code${FENCE}`)
    expect(html).not.toContain('wiki-code-wrap')
  })

  it('코드블록 안의 || 줄이 표 행 병합에 휘말려 닫는 줄을 삼키지 않는다', () => {
    // "||" 로 시작하고 {{{ 가 닫히지 않는 줄: 표 행 병합이 뒤 줄을 계속 끌어당기던 모양
    const body = '||{{{ 열기\nSELECT 1;'
    const { html } = parseWikiText(`${FENCE}\n${body}\n${FENCE}\n뒤 문단`)
    expect(codeBody(html)).toBe(body)
    expect(html).toContain('<p>뒤 문단</p>')
  })

  it('코드블록 앞뒤의 제목 번호 매김이 끊기지 않는다', () => {
    const { toc } = parseWikiText(`= A =\n${FENCE}\nx\n${FENCE}\n= B =`)
    expect(toc.map((t) => t.number)).toEqual(['1', '2'])
  })

  it('기존 {{{ }}} 코드블록에도 같은 복사 버튼이 붙고 언어 표시가 유지된다', () => {
    const plain = parseWikiText('{{{\nabc\n}}}').html
    expect(plain).toContain('class="wiki-code-copy"')
    expect(codeBody(plain)).toBe('abc')

    const syntax = parseWikiText('{{{#!syntax js\nlet a\n}}}').html
    expect(syntax).toContain('<span class="wiki-code-lang">js</span>')
    expect(codeBody(syntax)).toBe('let a')
  })
})
