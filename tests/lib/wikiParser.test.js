import { describe, expect, it } from 'vitest'
import { parseWikiText } from '../../src/lib/wikiParser.js'

// [편집] 링크에 붙는 data-source-offset 값만 순서대로 뽑아낸다.
function editOffsets(html) {
  return [...html.matchAll(/data-source-offset="(\d+)"/g)].map((m) => Number(m[1]))
}

describe('각주', () => {
  it('각주 안에 [br]이 있어도 각주가 중간에 잘리지 않는다', () => {
    const { html, footnotes } = parseWikiText('본문[* 첫줄[br]둘째줄] 뒤')

    expect(footnotes).toEqual(['첫줄[br]둘째줄'])
    // 각주 본문 전체가 목록에 들어가고
    expect(html).toContain('<li id="fn-1">첫줄<br>둘째줄 ')
    // 각주 뒤의 본문이 남아 있으며
    expect(html).toContain('</sup> 뒤</p>')
    // 각주 내용이 본문으로 새어 나오지 않는다 (예전 버그: "둘째줄]" 이 본문에 그대로 노출됨)
    expect(html).not.toContain('[br')
    expect(html).not.toContain('둘째줄]')
  })

  it('각주 하나에 [br]이 여러 번 있어도 전부 줄바꿈이 된다', () => {
    const { html } = parseWikiText('[* 가[br]나[br]다]')
    expect(html).toContain('가<br>나<br>다')
  })

  it('각주 안의 특수문자는 한 번만 이스케이프된다', () => {
    const { html } = parseWikiText('A[* 가 & 나 <b>] 뒤')
    expect(html).toContain('가 &amp; 나 &lt;b&gt;')
    expect(html).not.toContain('&amp;amp;')
    expect(html).not.toContain('&amp;lt;')
  })

  it('마우스를 올리면 보이는 팝오버가 각주 번호 옆에 생기고 최하단 목록으로 가는 링크도 유지된다', () => {
    const { html } = parseWikiText('본문[* 내용]')
    expect(html).toContain('<a href="#fn-1" id="fn-back-1">1</a>')
    expect(html).toContain('<span class="wiki-footnote-popover" contenteditable="false">내용</span>')
  })

  it('각주 번호는 문서 전체에서 순서대로 매겨진다', () => {
    const { html, footnotes } = parseWikiText('첫째[* 하나]\n\n둘째[* 둘]')
    expect(footnotes).toEqual(['하나', '둘'])
    expect(html).toContain('data-footnote="1"')
    expect(html).toContain('data-footnote="2"')
  })
})

describe('줄바꿈 [br]', () => {
  it('문단 안의 [br]은 <br>로 바뀐다', () => {
    expect(parseWikiText('앞[br]뒤').html).toBe('<p>앞<br>뒤</p>')
  })
})

describe('제목의 [편집] 위치(원문 오프셋)', () => {
  it('같은 제목이 여러 번 나와도 각각 자기 위치를 가리킨다', () => {
    const source = '=설명=\n첫\n\n=다른=\n=설명=\n둘째\n'
    const { html } = parseWikiText(source, { editableOffsets: true })
    const offsets = editOffsets(html)

    expect(offsets).toHaveLength(3)
    // 세 개 모두 원문에서 실제로 그 제목 줄이 시작하는 자리여야 한다
    expect(source.slice(offsets[0]).startsWith('=설명=\n첫')).toBe(true)
    expect(source.slice(offsets[1]).startsWith('=다른=')).toBe(true)
    expect(source.slice(offsets[2]).startsWith('=설명=\n둘째')).toBe(true)
  })

  it('공백이 들어간 "= 제목 =" 형태도 위치를 찾는다', () => {
    const source = '= 마탑 =\n== 적탑 ==\n내용\n'
    const { html } = parseWikiText(source, { editableOffsets: true })
    expect(editOffsets(html)).toEqual([0, source.indexOf('== 적탑')])
  })

  it('틀에서 전개된 제목에는 [편집] 링크가 없고, 뒤에 오는 진짜 제목의 위치는 어긋나지 않는다', () => {
    const source = '{{틀:T}}\n=진짜=\n본문\n'
    const { html } = parseWikiText(source, {
      editableOffsets: true,
      templateIndex: { T: { name: 'T', path: '/t/T.md', rawText: '=틀제목=\n틀내용', usedBy: [] } },
    })

    expect(html).toContain('틀제목')
    // 링크는 진짜 제목 하나에만 붙는다
    expect(editOffsets(html)).toEqual([source.indexOf('=진짜=')])
  })

  it('editableOffsets를 켜지 않으면 [편집] 링크를 만들지 않는다', () => {
    const { html } = parseWikiText('=제목=\n내용')
    expect(html).not.toContain('wiki-heading-edit-link')
  })
})

describe('제목 번호와 목차', () => {
  it('제목 번호가 단계에 맞게 1., 1.1., 1.2., 2. 로 매겨진다', () => {
    const { toc } = parseWikiText('=A=\n==B==\n==C==\n=D=\n')
    expect(toc.map((t) => t.number)).toEqual(['1', '1.1', '1.2', '2'])
    expect(toc.map((t) => t.text)).toEqual(['A', 'B', 'C', 'D'])
  })
})

describe('기본 문법', () => {
  it('굵게·기울임·목록이 변환된다', () => {
    const { html } = parseWikiText("'''굵게''' ''기울임''\n* 하나\n** 둘\n")
    expect(html).toContain('<strong>굵게</strong>')
    expect(html).toContain('<em>기울임</em>')
    expect(html).toContain('<li>하나<ul><li>둘</li></ul></li>')
  })

  it('원문에 들어 있는 HTML 태그는 그대로 실행되지 않고 이스케이프된다', () => {
    const { html } = parseWikiText('<script>alert(1)</script>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
