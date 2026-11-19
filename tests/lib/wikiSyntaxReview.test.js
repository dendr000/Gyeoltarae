// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { parseWikiText } from '../../src/lib/wikiParser.js'

// 본문 문법 전수 검수(2026-11-19)에서 찾은 오류를 막는 시험. 사례는 실제 작업 폴더의 문서(C 포인터 강의·DBMS 힌트·== 로 시작하는 제목)와
// 시간표·날짜 같은 흔한 글에서 가져왔다.
const html = (src, options) => parseWikiText(src, options).html
const docIndex = {
  'A&B': [{ path: '/w/A&B.md', name: 'A&B' }],
  문서: [{ path: '/w/문서.md', name: '문서' }],
}

describe('제목 번호: 건너뛴 단계의 0 이 보이지 않는다', () => {
  const numbers = (src) => parseWikiText(src).toc.map((t) => t.number)

  it('== 로 시작해도 첫 제목이 1 이다 (0.1 이 아님)', () => {
    expect(numbers('== 개요 ==\n== 설치 ==\n=== 세부 ===\n== 끝 ==')).toEqual(['1', '2', '2.1', '3'])
  })

  it('= 다음에 === 로 건너뛰어도 1.1 이다 (1.0.1 이 아님)', () => {
    expect(numbers('= 가 =\n=== 나 ===\n= 다 =')).toEqual(['1', '1.1', '2'])
  })

  it('화면의 제목 번호도 같다', () => {
    const out = html('== 개요 ==\n본문')
    expect(out).toContain('wiki-heading-number">1.</span>')
    expect(out).not.toContain('0.1.')
  })

  it('기존 규칙(=, ==, ===)은 그대로다', () => {
    expect(numbers('=A=\n==B==\n==C==\n=D=\n')).toEqual(['1', '1.1', '1.2', '2'])
  })
})

describe('목차: 제목의 꾸밈 표시와 각주 표시가 글자로 보이지 않는다', () => {
  const src = "[목차]\n== '''굵은''' 제목[* 주석] ==\n본문"

  it('[목차] 의 링크 글자는 꾸밈을 뺀 글이다', () => {
    const out = html(src)
    const toc = out.slice(out.indexOf('wiki-toc'), out.indexOf('</details>'))
    expect(toc).toContain('>1. 굵은 제목</a>')
    expect(toc).not.toContain('‘')
    expect(toc).not.toContain('[*')
  })

  it('제목 이동용 id 에는 각주 글이 섞이지 않는다 ([[#제목]] 이 제목[* 주석] 에도 닿는다)', () => {
    const [item] = parseWikiText('== 제목[* 주석] ==\n본문').toc
    expect(item.id).toBe('h-제목')
    const out = html('[[#제목]]\n== 제목[* 주석] ==\n본문')
    expect(out).toContain('data-anchor-name="제목"')
    expect(out).toContain('id="h-제목"')
  })

  it('toc 데이터에는 원문 text 와 화면용 label 이 따로 있다', () => {
    const [item] = parseWikiText(src).toc
    expect(item.text).toBe("'''굵은''' 제목[* 주석]")
    expect(item.label).toBe('굵은 제목')
  })

  it('링크·색·코드·수식 표시도 뺀다', () => {
    const [item] = parseWikiText('== [[문서|라벨]] {{{#red 빨강}}} `코드` {{{+1 큼}}} ~~취소~~ ==').toc
    expect(item.label).toBe('라벨 빨강 코드 큼 취소')
  })

  it('꾸밈이 없는 제목은 text 와 label 이 같다', () => {
    const [item] = parseWikiText('== 그냥 제목 ==').toc
    expect(item.label).toBe(item.text)
  })
})

describe('위키링크: 이름에 & 가 들어간 문서', () => {
  it('[[A&B]] 가 문서 A&B 로 이어진다', () => {
    const out = html('[[A&B]]', { docIndex })
    expect(out).toContain('class="wiki-link"')
    expect(out).toContain('data-doc-path="/w/A&amp;B.md"')
    expect(out).toContain('>A&amp;B</a>')
  })

  it('[[A&B|라벨]] 도 같다', () => {
    expect(html('[[A&B|라벨]]', { docIndex })).toContain('class="wiki-link"')
  })

  it('없는 문서면 이름이 한 번만 이스케이프된 채 "만들기" 자리에 실린다', () => {
    const out = html('[[X&Y]]', { docIndex })
    expect(out).toContain('data-doc-target="X&amp;Y"')
    expect(out).not.toContain('&amp;amp;')
  })

  it('[[#이름]] 처럼 앵커만 있는 링크의 표시 글자도 이중으로 이스케이프되지 않는다', () => {
    const out = html('[[#A&B]]', { docIndex })
    expect(out).toContain('>A&amp;B</a>')
    expect(out).not.toContain('&amp;amp;')
  })
})

describe('표 칸의 <...> 표시', () => {
  const cell = (src) => html(`||${src}||`).match(/<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/)

  it('모르는 <...> 는 지우지 않고 글자로 보인다', () => {
    expect(cell(' <중요> 내용 ')[2]).toBe('&lt;중요&gt; 내용')
    expect(cell(' <b>굵게</b> ')[2]).toBe('&lt;b&gt;굵게&lt;/b&gt;')
  })

  it('아는 표시를 먼저 읽고 그 뒤의 모르는 <...> 부터는 글자다', () => {
    const [, attrs, inner] = cell('<:><중요> 내용')
    expect(attrs).toContain('text-align:center')
    expect(inner).toBe('&lt;중요&gt; 내용')
  })

  it('아는 표시는 그대로 동작한다', () => {
    expect(cell('<-2> a')[1]).toContain('colspan="2"')
    expect(cell('<|2> a')[1]).toContain('rowspan="2"')
    expect(cell('<bgcolor=#fff> a')[1]).toContain('background:#fff')
    expect(cell('<nopad> a')[1]).toContain('padding:0')
  })

  it('<^|2> 는 위쪽 맞춤으로, <v|2> 는 아래쪽 맞춤으로 세로 병합한다', () => {
    const top = cell('<^|2> a')
    expect(top[1]).toContain('rowspan="2"')
    expect(top[1]).toContain('vertical-align:top')
    const bottom = cell('<v|3> a')
    expect(bottom[1]).toContain('rowspan="3"')
    expect(bottom[1]).toContain('vertical-align:bottom')
    expect(top[2]).toBe('a')
  })

  it('글자색 표시 <color=>, <rowcolor=>, <colcolor=> 를 읽는다 (글자로 남지 않는다)', () => {
    expect(cell('<color=red> a')[1]).toContain('color:red')
    expect(cell('<color=red> a')[2]).toBe('a')
    const out = html('||<rowcolor=#f00> a || b ||\n|| c || d ||')
    expect(out.match(/color:#f00/g)).toHaveLength(2) // 그 줄의 두 칸
    const col = html('||<colcolor=blue> a || b ||\n|| c || d ||\n||<colcolor=green> e || f ||')
    const colors = [...col.matchAll(/<td ([^>]*)>/g)].map((m) => m[1].match(/(?:^|;|")color:(\w+)/)?.[1] ?? null)
    expect(colors).toEqual(['blue', null, 'blue', null, 'green', null]) // 그 칸부터 아래로 이어지고 다음 표시가 나오면 바뀐다
    expect(col).not.toContain('colcolor')
  })

  it('칸 글자색이 배경색 표시와 함께 있어도 둘 다 적용된다', () => {
    const [, attrs] = cell('<bgcolor=#eee><color=#111> a')
    expect(attrs).toContain('background:#eee')
    expect(attrs).toContain('color:#111')
  })

  it('배경색만 정한 칸은 배경과 잘 구분되는 글자색을 자동으로 쓴다 (다크 모드의 밝은 배경 + 밝은 글자 방지)', () => {
    expect(cell('<bgcolor=#fde68a> a')[1]).toContain('color:#1a1a1a') // 밝은 배경 -> 어두운 글자
    expect(cell('<bgcolor=#111827> a')[1]).toContain('color:#f5f5f5') // 어두운 배경 -> 밝은 글자
    expect(cell('<bgcolor=#fff> a')[1]).toContain('color:#1a1a1a')
    expect(cell('<bgcolor=#000000> a')[1]).toContain('color:#f5f5f5')
  })

  it('글자색을 직접 정했거나 배경이 색 이름·밝기 쌍이면 자동 글자색을 쓰지 않는다', () => {
    expect(cell('<bgcolor=#fde68a><color=#c00> a')[1]).toContain('color:#c00')
    expect(cell('<bgcolor=#fde68a><color=#c00> a')[1]).not.toContain('#1a1a1a')
    expect(cell('<bgcolor=yellow> a')[1]).not.toContain('color:#')
    expect(cell('<bgcolor=#fff,#222> a')[1]).not.toContain('color:#')
  })

  it('줄·열 배경색(rowbgcolor, colbgcolor)도 같다', () => {
    expect(html('||<rowbgcolor=#fde68a> a || b ||')).toContain('color:#1a1a1a')
  })

  it('한 칸에 쓴 부등호 글자(<3, 2<3)는 그대로다', () => {
    expect(cell(' <3 ')[2]).toBe('&lt;3')
    expect(cell(' 2<3 ')[2]).toBe('2&lt;3')
  })
})

describe('글 속 코드: {{{ }}} 와 `백틱`', () => {
  const inline = (src) => html(src).match(/<p>([\s\S]*)<\/p>/)[1]

  it('{{{ }}} 한 줄은 코드로 보이고 안의 문법은 해석되지 않는다', () => {
    expect(inline('{{{SELECT * FROM t WHERE a*2 > b*3}}}')).toBe('<code class="wiki-inline-code">SELECT * FROM t WHERE a*2 &gt; b*3</code>')
  })

  it('`백틱` 도 같다 (__init__ 이 밑줄이 되지 않는다)', () => {
    expect(inline('`__init__` 메서드')).toBe('<code class="wiki-inline-code">__init__</code> 메서드')
  })

  it('안의 < & 는 이스케이프되고 따옴표는 곧은 채로 남는다', () => {
    const out = inline("`<b>&it's`")
    expect(out).toBe(`<code class="wiki-inline-code">&lt;b&gt;&amp;it's</code>`)
  })

  it('크기·색 표시({{{+1 }}}, {{{#색 }}})는 코드가 아니라 원래대로 동작한다', () => {
    expect(inline('{{{+2 크게}}}')).toContain('font-size:1.40em')
    expect(inline('{{{#ff0000 빨강}}}')).toContain('color:#ff0000')
    expect(inline('{{{+2 크게}}}')).not.toContain('<code')
  })

  it('한 줄에 코드와 일반 꾸밈이 섞여도 각자 동작한다', () => {
    const out = inline("'''굵게''' 와 `a*b*c` 와 **굵게2**")
    expect(out).toContain('<strong>굵게</strong>')
    expect(out).toContain('<code class="wiki-inline-code">a*b*c</code>')
    expect(out).toContain('<strong>굵게2</strong>')
  })

  it('앞뒤에 공백이 붙은 백틱 두 개는 코드가 아니다 (Ctrl+` 와 Ctrl+Shift+`)', () => {
    expect(inline('Ctrl+` 와 Ctrl+Shift+`')).not.toContain('<code')
  })

  it('빈 {{{ }}} 는 코드로 만들지 않는다', () => {
    expect(inline('a {{{ }}} b')).not.toContain('<code')
  })

  it('각주 안의 코드는 안의 ] 에 각주가 닫히지 않고, 각주 목록에도 코드로 보인다', () => {
    const out = html('본문[* 배열은 `a[0]` 이다]끝')
    expect(out.match(/<code class="wiki-inline-code">a\[0\]<\/code>/g)).toHaveLength(2)
    expect(out).toContain('</sup>끝')
  })

  it('표 칸 안에서도 동작한다', () => {
    expect(html('|| `a*b*c` || x ||')).toContain('<code class="wiki-inline-code">a*b*c</code>')
  })

  it('백틱 코드 안에 {{{ }}} 가 들어 있어도 내부 자리표시가 화면에 새지 않는다', () => {
    const out = inline('`{{{a}}} 와 b`')
    expect(out).toBe('<code class="wiki-inline-code">{{{a}}} 와 b</code>')
    expect(html('[* `{{{a}}} x`]')).not.toContain('@@WD')
  })

  it('코드 안의 [[링크]]·[* 각주] 는 해석되지 않는다', () => {
    const out = inline('`[[문서]] [* 주석]`')
    expect(out).toBe('<code class="wiki-inline-code">[[문서]] [* 주석]</code>')
  })

  it('따옴표 변환은 코드 안을 건드리지 않는다', () => {
    const out = html('"일반" `"코드"` it\'s')
    expect(out).toContain('“일반”')
    expect(out).toContain('<code class="wiki-inline-code">&quot;코드&quot;</code>')
  })
})

describe('꾸밈 표시가 곱셈·포인터·SQL 글자를 삼키지 않는다', () => {
  const inline = (src) => html(src).match(/<p>([\s\S]*)<\/p>/)[1]
  const noEmphasis = (src) => {
    const out = inline(src)
    expect(out).not.toMatch(/<(em|strong|del|u)>/)
  }

  it('SELECT * FROM … a*2 … b*3', () => noEmphasis('SELECT * FROM t WHERE a*2 > b*3'))
  it('*.txt 와 *.md 파일', () => noEmphasis('*.txt 와 *.md 파일'))
  it('C 포인터 선언 자료형* 포인터명', () => noEmphasis('자료형* 포인터명 = (자료형*)malloc(sizeof(자료형) * 길이);'))
  it('C 포인터 realloc (자료형*) … sizeof(자료형)*길이', () => noEmphasis('포인터명 = (자료형*)realloc(포인터명, sizeof(자료형)*길이);'))
  it('C 역참조 *(*(배열명 + 2))', () => noEmphasis('*(*(배열명 + 2)) + 8  //값'))
  it('복합 대입 연산자 줄', () => noEmphasis('+=, -=, *=, /=, //=, *=, **='))
  it('SQL 힌트 /*+ hint */', () => noEmphasis('Hint: /*+ hint */ PLAYER_NAME'))
  it("빈 문자열 '' 두 개", () => noEmphasis("WHERE a = '' OR b = ''"))
  it('시간 범위 09:00--10:00', () => noEmphasis('09:00--10:00 수업, 11:00--12:00 점심'))

  it("*기울임*, **굵게**, ''기울임'' 은 그대로 된다", () => {
    expect(inline('*기울임*')).toBe('<em>기울임</em>')
    expect(inline('**굵게**를 쓴다')).toBe('<strong>굵게</strong>를 쓴다')
    expect(inline("''기울임2''")).toBe('<em>기울임2</em>')
    expect(inline('**굵게 두 단어**')).toBe('<strong>굵게 두 단어</strong>')
  })

  it('AI챗 식 *(행동)* "대사" *(행동)* 은 각각 기울임이다', () => {
    const out = inline('*(웃으며 손을 흔들었다)* "안녕" *(다시 웃었다)*')
    expect(out.match(/<em>/g)).toHaveLength(2)
  })

  it('괄호 안의 *기울임* 도 된다', () => {
    expect(inline('(*기울임*)')).toBe('(<em>기울임</em>)')
  })

  it('--취소-- 와 ~~취소~~ 는 그대로 된다', () => {
    expect(inline('a --취소-- b')).toContain('<del>취소</del>')
    expect(inline('~~취소~~')).toBe('<del>취소</del>')
  })
})

describe('번호 목록', () => {
  it('"2024. 11. 19. 작성" 같은 날짜 줄은 목록이 아니다', () => {
    const out = html('2024. 11. 19. 작성')
    expect(out).not.toContain('<ol')
    expect(out).toContain('2024. 11. 19. 작성')
  })

  it('4자리 이상 숫자로 시작하는 줄은 목록이 아니고, 1~3자리는 목록이다', () => {
    expect(html('1000. 가')).not.toContain('<ol')
    expect(html('999. 가')).toContain('<ol start="999">')
  })

  it('3. 으로 시작하면 3 부터 센다', () => {
    expect(html('3. 셋\n4. 넷')).toContain('<ol start="3"><li>셋</li><li>넷</li></ol>')
  })

  it('1. 로 시작하면 start 표시를 붙이지 않는다', () => {
    expect(html('1. 가\n2. 나')).toContain('<ol><li>가</li><li>나</li></ol>')
  })

  it('빈 줄로 갈라진 항목도 번호가 이어진다', () => {
    const out = html('1. 가\n\n2. 나\n\n3. 다')
    expect(out).toContain('<ol><li>가</li></ol>')
    expect(out).toContain('<ol start="2"><li>나</li></ol>')
    expect(out).toContain('<ol start="3"><li>다</li></ol>')
  })

  it('중첩 목록의 안쪽 번호 목록도 시작 번호를 가진다', () => {
    expect(html('* 가\n  5. 오\n  6. 육')).toContain('<ol start="5">')
  })
})

describe('수식: 빈 줄을 넘어 이어지지 않는다', () => {
  it('서로 다른 문단의 $$ 두 개가 수식으로 묶이지 않는다', () => {
    const out = html('가격 $$ 와 다른 줄\n\n또 $$ 있다')
    expect(out).not.toContain('katex')
    expect(out).toContain('가격 $$ 와 다른 줄')
  })

  it('\\[ 와 \\] 도 문단을 넘지 않는다', () => {
    expect(html('\\[ 가\n\n나 \\]')).not.toContain('katex')
  })

  it('한 문단 안에서 여러 줄에 걸친 수식은 된다', () => {
    expect(html('$$\na^2\n+b\n$$')).toContain('katex-display')
    expect(html('\\[\nx\n\\]')).toContain('katex-display')
  })

  it('한 줄 수식은 그대로 된다', () => {
    expect(html('$$a^2$$')).toContain('katex-display')
    expect(html('\\(x_{i}\\)')).toContain('katex')
  })
})

describe('각주 안의 링크와 대괄호', () => {
  it('각주 안의 [[링크]] 가 링크로 보이고 각주가 거기서 끊기지 않는다', () => {
    const out = parseWikiText('본문[* 참고 [[문서]] 입니다]끝', { docIndex })
    expect(out.footnotes).toEqual(['참고 [[문서]] 입니다'])
    expect(out.html).toContain('class="wiki-link"')
    expect(out.html).toContain('</sup>끝')
    expect(out.html).not.toContain('] 입니다')
  })

  it('각주 안의 [0] 같은 대괄호 한 쌍도 각주를 끊지 않는다', () => {
    const out = parseWikiText('본문[* 배열 a[0] 입니다]끝')
    expect(out.footnotes).toEqual(['배열 a[0] 입니다'])
    expect(out.html).toContain('</sup>끝')
  })

  it('[br] 은 그대로 된다', () => {
    expect(parseWikiText('가[* 하나[br]둘]나').footnotes).toEqual(['하나[br]둘'])
  })

  it('닫히지 않은 각주는 글자로 남는다', () => {
    expect(html('본문[* 안 닫힘')).toContain('본문[* 안 닫힘')
  })

  it('각주가 둘이면 각각 따로 끝난다', () => {
    expect(parseWikiText('[* 가 [x] 나] 중간 [* 다]').footnotes).toEqual(['가 [x] 나', '다'])
  })
})
