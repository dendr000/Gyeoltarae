import { describe, expect, it } from 'vitest'
import { applySmartQuotes, toStraightQuotes } from '../../src/lib/smartQuotes.js'
import { parseWikiText } from '../../src/lib/wikiParser.js'

// 파서는 글 속의 큰따옴표를 &quot; 로 이스케이프해서 내보내므로, 시험 입력도 같은 모양으로 쓴다.
const Q = '&quot;'

describe('applySmartQuotes — 열림/닫힘 판단', () => {
  it('큰따옴표 쌍은 “ ” 로 바뀐다', () => {
    expect(applySmartQuotes(`<p>He said ${Q}go${Q} now</p>`)).toBe('<p>He said “go” now</p>')
  })

  it('작은따옴표 쌍은 ‘ ’ 로 바뀐다 (한글 조사가 붙어도)', () => {
    expect(applySmartQuotes("<p>이름이 'sglee'인 학생</p>")).toBe('<p>이름이 ‘sglee’인 학생</p>')
  })

  it('단어 속 아포스트로피는 닫는 모양(’)이다', () => {
    expect(applySmartQuotes("<p>it's and don't</p>")).toBe('<p>it’s and don’t</p>')
  })

  it('줄 맨 앞과 여는 괄호 뒤의 따옴표는 여는 모양이다', () => {
    expect(applySmartQuotes(`<p>${Q}가${Q}</p>`)).toBe('<p>“가”</p>')
    expect(applySmartQuotes(`<p>(${Q}가${Q})</p>`)).toBe('<p>(“가”)</p>')
    expect(applySmartQuotes(`<p>[${Q}가${Q}]</p>`)).toBe('<p>[“가”]</p>')
  })

  it('큰따옴표 안의 작은따옴표 중첩도 열림/닫힘이 맞는다', () => {
    expect(applySmartQuotes(`<p>${Q}He said 'hi'${Q}</p>`)).toBe('<p>“He said ‘hi’”</p>')
  })

  it('문장부호 뒤의 닫는 따옴표와 그 뒤의 열림이 구분된다', () => {
    expect(applySmartQuotes(`<p>${Q}가.${Q} ${Q}나${Q}</p>`)).toBe('<p>“가.” “나”</p>')
  })

  it('열고 닫는 따옴표가 같은 줄에 여러 쌍 있어도 쌍마다 맞는다', () => {
    expect(applySmartQuotes(`<p>'a' 'b' 'c'</p>`)).toBe('<p>‘a’ ‘b’ ‘c’</p>')
  })
})

describe('applySmartQuotes — 태그와의 관계', () => {
  it('인라인 태그(굵게 등)를 사이에 두어도 앞 글자를 이어서 본다', () => {
    expect(applySmartQuotes(`<p>${Q}<strong>가</strong>${Q}</p>`)).toBe('<p>“<strong>가</strong>”</p>')
    expect(applySmartQuotes(`<p>말 ${Q}<em>나</em>${Q}다</p>`)).toBe('<p>말 “<em>나</em>”다</p>')
  })

  it('블록 태그(문단·목록·칸)가 바뀌면 새 줄로 본다 — 앞 문단 끝 글자의 영향을 받지 않는다', () => {
    expect(applySmartQuotes(`<p>가</p><p>${Q}나${Q}</p>`)).toBe('<p>가</p><p>“나”</p>')
    expect(applySmartQuotes(`<ul><li>가</li><li>${Q}나${Q}</li></ul>`)).toBe('<ul><li>가</li><li>“나”</li></ul>')
    expect(applySmartQuotes(`<table><tr><td>가</td><td>'나'</td></tr></table>`)).toBe(
      '<table><tr><td>가</td><td>‘나’</td></tr></table>',
    )
  })

  it('<br> 뒤는 새 줄이라 여는 따옴표다', () => {
    expect(applySmartQuotes(`<p>가<br>${Q}나${Q}</p>`)).toBe('<p>가<br>“나”</p>')
  })

  it('태그 속성 안의 따옴표는 건드리지 않는다', () => {
    const html = `<a href="x" title='y' class="wiki-link">${Q}가${Q}</a>`
    expect(applySmartQuotes(html)).toBe(`<a href="x" title='y' class="wiki-link">“가”</a>`)
  })

  it('style 속성이 든 태그도 속성은 그대로이고 안의 글만 바뀐다', () => {
    const html = `<span style="color:red">'가'</span>`
    expect(applySmartQuotes(html)).toBe(`<span style="color:red">‘가’</span>`)
  })

  it('코드블록(pre)과 인라인 코드(code) 안은 바꾸지 않는다', () => {
    const block = `<pre class="wiki-code"><code>SELECT 'a' FROM t WHERE x = ${Q}b${Q}</code></pre>`
    expect(applySmartQuotes(block)).toBe(block)
    const inline = `<p>값은 <code>'a'</code> 입니다 'c'</p>`
    expect(applySmartQuotes(inline)).toBe(`<p>값은 <code>'a'</code> 입니다 ‘c’</p>`)
  })

  it('색 입힌 코드블록(span 이 잔뜩 든 pre)도 그대로다', () => {
    const block = `<pre class="wiki-code"><code class="hljs"><span class="hljs-string">${'&#x27;'}a${'&#x27;'}</span> ${Q}b${Q}</code></pre>`
    expect(applySmartQuotes(block)).toBe(block)
  })

  it('<style> 안은 바꾸지 않는다', () => {
    const html = `<style>@scope { .a::before { content: "x"; } }</style><p>"가"</p>`
    expect(applySmartQuotes(html)).toBe(`<style>@scope { .a::before { content: "x"; } }</style><p>“가”</p>`)
  })

  it('코드블록 뒤에 이어지는 글은 다시 정상적으로 바뀐다', () => {
    const html = `<pre><code>'a'</code></pre><p>'b'</p>`
    expect(applySmartQuotes(html)).toBe(`<pre><code>'a'</code></pre><p>‘b’</p>`)
  })
})

describe('applySmartQuotes — 그 밖', () => {
  it('따옴표가 없으면 입력을 그대로 돌려준다', () => {
    const html = '<p>따옴표 없는 글 &amp; &lt;b&gt;</p>'
    expect(applySmartQuotes(html)).toBe(html)
  })

  it('다른 이스케이프(&amp; &lt;)는 건드리지 않는다', () => {
    expect(applySmartQuotes(`<p>a &amp; ${Q}b${Q} &lt;c&gt;</p>`)).toBe('<p>a &amp; “b” &lt;c&gt;</p>')
  })

  it('이미 둥근 따옴표인 글은 그대로이고, 두 번 적용해도 결과가 같다', () => {
    const once = applySmartQuotes(`<p>${Q}가${Q} 'a'</p>`)
    expect(applySmartQuotes(once)).toBe(once)
    expect(applySmartQuotes('<p>“가” ‘나’</p>')).toBe('<p>“가” ‘나’</p>')
  })

  it('빈 문자열과 태그만 있는 입력도 오류 없이 처리한다', () => {
    expect(applySmartQuotes('')).toBe('')
    expect(applySmartQuotes('<br><hr>')).toBe('<br><hr>')
  })

  it('따옴표 하나만 있어도(짝이 없어도) 오류 없이 바뀐다', () => {
    expect(applySmartQuotes(`<p>${Q}열기만</p>`)).toBe('<p>“열기만</p>')
    expect(applySmartQuotes(`<p>닫기만${Q}</p>`)).toBe('<p>닫기만”</p>')
  })
})

describe('toStraightQuotes (화면에서 고른 글을 원문에서 찾을 때)', () => {
  it('둥근 따옴표를 열림/닫힘과 상관없이 곧은 따옴표로 되돌린다', () => {
    expect(toStraightQuotes('it’s ‘a’ “b”')).toBe(`it's 'a' "b"`)
  })

  it('따옴표가 없는 글은 그대로다', () => {
    expect(toStraightQuotes('plain 글')).toBe('plain 글')
  })
})

describe('parseWikiText 통합 — 뷰어에 그려지는 결과', () => {
  const html = (src) => parseWikiText(src).html

  it('본문의 곧은 따옴표가 둥근 따옴표로 보인다', () => {
    const out = html(`그가 "안녕" 이라고 했다. 이름은 'sglee' 이고 it's 끝.`)
    expect(out).toContain('“안녕”')
    expect(out).toContain('‘sglee’')
    expect(out).toContain('it’s')
  })

  it('굵게·기울임 문법의 작은따옴표는 문법으로 먼저 처리되어 따옴표로 남지 않는다', () => {
    const out = html(`'''굵게''' 와 ''기울임'' 와 '따옴표'`)
    expect(out).toContain('<strong>굵게</strong>')
    expect(out).toContain('<em>기울임</em>')
    expect(out).toContain('‘따옴표’')
  })

  it('굵게 글자를 따옴표로 감싸도 열림/닫힘이 맞는다', () => {
    expect(html(`"'''굵게'''"`)).toContain('“<strong>굵게</strong>”')
  })

  it('``` 코드블록 안의 따옴표는 곧은 그대로다 (색을 입힌 블록 포함)', () => {
    const out = html('```sql\nSELECT * FROM t WHERE name = \'a\' AND x = "b";\n```')
    expect(out).not.toMatch(/[‘’“”]/)
    expect(out).toContain('&#x27;a&#x27;')
    expect(out).toContain('&quot;b&quot;')
  })

  it('{{{ }}} 코드블록과 언어 없는 ``` 코드블록도 그대로다', () => {
    expect(html('{{{\n"a" \'b\'\n}}}')).not.toMatch(/[‘’“”]/)
    expect(html('```\n"a" \'b\'\n```')).not.toMatch(/[‘’“”]/)
  })

  it('{{{#!wiki style="..."}}} 의 속성은 그대로이고 안의 글만 바뀐다', () => {
    const out = html('{{{#!wiki style="color: red;"\n"안쪽 글"\n}}}')
    // 스타일 값은 파서가 정리한 모양(color: red) 그대로 — 속성 구분용 따옴표가 둥글어지면 스타일이 깨진다
    expect(out).toContain('style="color: red"')
    expect(out).toContain('“안쪽 글”')
  })

  it('표 칸·목록·각주·제목 안의 따옴표도 바뀐다', () => {
    expect(html('||"가"||\'나\'||')).toContain('“가”')
    expect(html(`* "목록"`)).toContain('<li>“목록”</li>')
    expect(html(`본문[* "각주"]`)).toContain('“각주”')
    expect(html(`= "제목" =`)).toContain('“제목”')
  })

  it('위키링크·분류의 data 속성(이동에 쓰는 값)에는 둥근 따옴표가 들어가지 않고, 보이는 글자만 바뀐다', () => {
    const out = html(`[[문서 "A"]] [[분류:비"교]]`)
    const attrs = [...out.matchAll(/data-[a-z-]+="([^"]*)"/g)].map((m) => m[1])
    expect(attrs.length).toBeGreaterThan(0)
    for (const value of attrs) expect(value).not.toMatch(/[‘’“”]/)
    // 분류는 속성 값이 원문 그대로(이스케이프만) 남고 눈에 보이는 글자만 둥글어진다
    expect(out).toContain('data-category="비&quot;교">비”교</a>')
    expect(out).toContain('>문서 “A”</span>')
  })

  it('접기 블록 안쪽도 열림/닫힘이 맞는다 (안쪽을 따로 한 번 더 파싱해도 결과가 같다)', () => {
    const out = html('{{{#!folding 제목\n"접힌 글" \'안쪽\'\n}}}')
    expect(out).toContain('“접힌 글”')
    expect(out).toContain('‘안쪽’')
  })

  it('목차 데이터(toc)의 제목 글은 바뀌지 않는다 — [[#제목]] 이동이 원문과 맞춰 보는 값', () => {
    const { toc } = parseWikiText('= "제목" =')
    expect(toc[0].text).toBe('"제목"')
  })

  it('원문은 바뀌지 않는다 (변환은 만들어진 화면용 HTML 에만)', () => {
    const src = `그가 "안녕" 했다`
    parseWikiText(src)
    expect(src).toBe(`그가 "안녕" 했다`)
  })
})
