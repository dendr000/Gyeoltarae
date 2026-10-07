import { describe, expect, it } from 'vitest'
import { parseWikiText } from '../../src/lib/wikiParser.js'

const FENCE = '```'
const SQL = 'CREATE TABLE mytable(\nid INT PRIMARY KEY,\nname VARCHAR(10)\n);'

// 코드 본문(pre > code 안 HTML)만 꺼낸다. 색을 입힌 블록은 <code class="hljs"> 라 속성을 허용한다.
function codeBody(html) {
  return html.match(/<pre class="wiki-code"><code[^>]*>([\s\S]*?)<\/code><\/pre>/)?.[1]
}

// 색 입히기용 태그를 걷고 이스케이프를 풀어서 사람이 보는 글자(= 복사될 글자)로 되돌린다.
function plainText(codeHtml) {
  return codeHtml
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
}

function langLabel(html) {
  return html.match(/<span class="wiki-code-lang">([^<]*)<\/span>/)?.[1]
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
    expect(langLabel(withLang)).toBe('SQL')
    expect(plainText(codeBody(withLang))).toBe('SELECT 1;')

    const noLang = parseWikiText(`${FENCE}\nSELECT 1;\n${FENCE}`).html
    expect(noLang).not.toContain('wiki-code-lang')
    // 언어가 없으면 색도 입히지 않는다
    expect(noLang).not.toContain('hljs')
  })

  it('언어 이름은 대소문자를 가리지 않고 같은 정식 이름·같은 색으로 보인다 (MySQL / MYSQL / mysql)', () => {
    const results = ['MySQL', 'MYSQL', 'mysql'].map((name) => parseWikiText(`${FENCE}${name}\nSELECT 1;\n${FENCE}`).html)
    for (const html of results) {
      expect(langLabel(html)).toBe('MySQL')
      expect(codeBody(html)).toContain('<span class="hljs-keyword">SELECT</span>')
    }
    expect(new Set(results).size).toBe(1)
  })

  it('요청받은 언어 이름들이 모두 색이 입혀지고 정식 이름으로 보인다', () => {
    const cases = [
      ['Oracle', 'Oracle', 'SELECT 1 FROM dual;'],
      ['오라클', 'Oracle', 'SELECT 1 FROM dual;'],
      ['oracle', 'Oracle', 'SELECT 1 FROM dual;'],
      ['ORACLE', 'Oracle', 'SELECT 1 FROM dual;'],
      ['PostgreSQL', 'PostgreSQL', 'SELECT 1;'],
      ['MSSQL', 'MSSQL', 'SELECT TOP 1 * FROM t;'],
      ['MariaDB', 'MariaDB', 'SELECT 1;'],
      ['MongoDB', 'MongoDB', 'db.users.find({ age: 20 })'],
      ['No-SQL', 'NoSQL', 'const a = 1'],
      ['JAVA', 'Java', 'public class A { int x = 1; }'],
      ['자바스크립트', 'JavaScript', 'const a = 1'],
      ['타입스크립트', 'TypeScript', 'const a: number = 1'],
      ['파이썬', 'Python', 'def f():\n    return 1'],
      ['C++', 'C++', '#include <iostream>\nint main() { return 0; }'],
    ]
    for (const [name, label, code] of cases) {
      const html = parseWikiText(`${FENCE}${name}\n${code}\n${FENCE}`).html
      expect(langLabel(html), name).toBe(label)
      expect(codeBody(html), name).toContain('hljs-')
      // 색을 입혀도 본문 글자는 그대로(복사 버튼이 복사할 글자)
      expect(plainText(codeBody(html)), name).toBe(code)
    }
  })

  it('모르는 언어 이름은 적은 그대로 윗줄에 보이고 색은 입히지 않는다', () => {
    const html = parseWikiText(`${FENCE}Foobar\nSELECT 1;\n${FENCE}`).html
    expect(langLabel(html)).toBe('Foobar')
    expect(html).not.toContain('hljs')
    expect(codeBody(html)).toBe('SELECT 1;')
  })

  it('언어 이름에 HTML 이 들어 있어도 이스케이프된다', () => {
    const html = parseWikiText(`${FENCE}<img\nx\n${FENCE}`).html
    expect(langLabel(html)).toBe('&lt;img')
    expect(html).not.toContain('<img')
  })

  it('색을 입힌 코드블록의 본문 HTML 도 이스케이프되어 실행되지 않는다', () => {
    const html = parseWikiText(`${FENCE}js\n<script>alert(1)</script>\n${FENCE}`).html
    expect(html).not.toContain('<script>')
    expect(plainText(codeBody(html))).toBe('<script>alert(1)</script>')
  })

  it('색을 입힌 블록의 코드 태그에는 hljs 클래스가 붙는다 (CSS 가 이 아래의 토큰에 색을 준다)', () => {
    const html = parseWikiText(`${FENCE}sql\nSELECT 1;\n${FENCE}`).html
    expect(html).toContain('<pre class="wiki-code"><code class="hljs">')
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
    expect(langLabel(syntax)).toBe('JavaScript')
    expect(plainText(codeBody(syntax))).toBe('let a')
    expect(codeBody(syntax)).toContain('<span class="hljs-keyword">let</span>')
  })

  it('{{{#!syntax 언어}}} 도 한글·대소문자 이름을 같은 규칙으로 해석한다', () => {
    const html = parseWikiText('{{{#!syntax 파이썬\nprint(1)\n}}}').html
    expect(langLabel(html)).toBe('Python')
  })
})
