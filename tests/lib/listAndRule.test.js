import { describe, expect, it } from 'vitest'
import { parseWikiText } from '../../src/lib/wikiParser.js'

// 목록 영역(<div class="wiki-list"> 안)의 HTML 만 꺼낸다.
function listHtml(source) {
  const { html } = parseWikiText(source)
  return html.match(/<div class="wiki-list">([\s\S]*?)<\/div>/)?.[1]
}

const NESTED_3 = '<ul><li>첫째<ul><li>둘째<ul><li>셋째</li></ul></li></ul></li></ul>'

describe('목록의 들여쓰기 하위 항목', () => {
  it('공백 1칸씩 들여쓰면 한 단계씩 깊어진다 (질문에 쓴 모양 그대로)', () => {
    expect(listHtml('* 첫째\n * 둘째\n  * 셋째')).toBe(NESTED_3)
  })

  it('공백 2칸씩 들여써도 같은 구조가 된다', () => {
    expect(listHtml('* 첫째\n  * 둘째\n    * 셋째')).toBe(NESTED_3)
  })

  it('공백 4칸씩 들여써도 같은 구조가 된다', () => {
    expect(listHtml('* 첫째\n    * 둘째\n        * 셋째')).toBe(NESTED_3)
  })

  it('탭으로 들여써도 한 단계씩 깊어진다', () => {
    expect(listHtml('* 첫째\n\t* 둘째\n\t\t* 셋째')).toBe(NESTED_3)
  })

  it('들여쓰기가 같은 항목은 같은 단계(형제)다', () => {
    expect(listHtml('* a\n  * b\n  * c')).toBe('<ul><li>a<ul><li>b</li><li>c</li></ul></li></ul>')
  })

  it('들여쓰기를 줄이면 바깥 단계로 돌아온다', () => {
    expect(listHtml('* a\n  * b\n* c')).toBe('<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul>')
  })

  it('두 단계 깊이에서 그 사이 폭으로 줄이면 그 폭이 새 단계가 된다', () => {
    // 0칸 → 4칸 → 2칸: 4칸 항목과 2칸 항목은 모두 첫째의 하위(같은 단계)
    expect(listHtml('* a\n    * b\n  * c')).toBe('<ul><li>a<ul><li>b</li><li>c</li></ul></li></ul>')
  })

  it('첫 항목부터 들여쓰여 있어도 최상위 단계다', () => {
    expect(listHtml(' * a\n * b')).toBe('<ul><li>a</li><li>b</li></ul>')
  })

  it('별을 여러 개 쓰는 예전 방식(**, ***)은 그대로 동작한다', () => {
    expect(listHtml('* 첫째\n** 둘째\n*** 셋째')).toBe(NESTED_3)
  })

  it('번호 목록도 들여쓰기로 하위 항목을 만든다', () => {
    expect(listHtml('1. 가\n  1. 나\n1. 다')).toBe('<ol><li>가<ol><li>나</li></ol></li><li>다</li></ol>')
  })

  it('번호 목록 아래에 들여쓴 별 목록은 그 항목의 하위가 된다', () => {
    expect(listHtml('1. 가\n  * 나')).toBe('<ol><li>가<ul><li>나</li></ul></li></ol>')
  })

  it('빈 줄로 끊긴 뒤의 새 목록은 들여쓰기 기준을 새로 잡는다', () => {
    const { html } = parseWikiText('* a\n  * b\n\n    * c')
    const lists = [...html.matchAll(/<div class="wiki-list">([\s\S]*?)<\/div>/g)].map((m) => m[1])
    expect(lists).toEqual(['<ul><li>a<ul><li>b</li></ul></li></ul>', '<ul><li>c</li></ul>'])
  })

  it('항목 뒤에 이어 쓴 줄(줄바꿈 이어쓰기)은 그대로 그 항목에 붙는다', () => {
    expect(listHtml('* a\n  * b\n이어쓴 줄')).toBe('<ul><li>a<ul><li>b<br>이어쓴 줄</li></ul></li></ul>')
  })
})

// 항목 바로 아래(빈 줄 없이)에 코드블록을 쓰면 그 코드블록은 앞 항목의 일부가 되고, 목록은
// 끊기지 않고 이어진다. 예전에는 코드블록에서 목록이 끝나서 뒤의 "** 항목"이 부모 없이 새 목록의
// 첫 항목이 되었고, 그래서 하위 항목으로 안 보였다.
describe('목록 항목 아래의 코드블록', () => {
  const F = '```'
  // 코드블록 전체를 [CODE] 로 접어서 목록 구조만 비교한다.
  function structure(source) {
    const { html } = parseWikiText(source)
    // 코드블록을 접은 뒤 남는 줄바꿈(조각들 사이의 구분)은 구조와 상관없으니 지운다.
    return html.replace(/<div class="wiki-code-wrap">[\s\S]*?<\/pre><\/div>/g, '[CODE]').replace(/\n/g, '')
  }
  const listCount = (source) => (parseWikiText(source).html.match(/<div class="wiki-list">/g) || []).length

  const LIKE = [
    '* LIKE',
    '** %: 0글자 이상',
    '%g%면 g 가 있어야 함',
    `${F}Mysql`,
    "SELECT * FROM t WHERE name like '%g%';",
    F,
    '** _: 딱 1글자를 의미함',
    '이름이 sglee 면 _g% 라고 씀',
    `${F}Mysql`,
    "SELECT * FROM t WHERE name like '_g%';",
    F,
  ].join('\n')

  it('코드블록을 사이에 둬도 뒤의 ** 항목이 같은 목록의 하위 항목으로 이어진다 (질문에 쓴 글 그대로)', () => {
    expect(listCount(LIKE)).toBe(1)
    expect(structure(LIKE)).toBe(
      '<div class="wiki-list"><ul><li>LIKE<ul>' +
        '<li>%: 0글자 이상<br>%g%면 g 가 있어야 함[CODE]</li>' +
        '<li>_: 딱 1글자를 의미함<br>이름이 sglee 면 _g% 라고 씀[CODE]</li>' +
        '</ul></li></ul></div>',
    )
  })

  it('코드블록은 앞 항목 안에 들어가고 복사 버튼도 그대로 있다', () => {
    const { html } = parseWikiText(LIKE)
    const items = [...html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1])
    expect(html.match(/class="wiki-code-copy"/g)).toHaveLength(2)
    // 안쪽(하위) 항목 둘 다 자기 코드블록을 품고 있다
    expect(items.filter((item) => item.includes('wiki-code-wrap'))).toHaveLength(2)
  })

  it('번호 목록 항목 아래의 코드블록도 같은 목록이 이어져서 번호가 끊기지 않는다', () => {
    const source = `1. 가\n${F}\nx\n${F}\n1. 나`
    expect(listCount(source)).toBe(1)
    expect(structure(source)).toBe('<div class="wiki-list"><ol><li>가[CODE]</li><li>나</li></ol></div>')
  })

  it('{{{ }}} 코드블록도 앞 항목에 속한다', () => {
    const source = '* 가\n{{{\nx\n}}}\n* 나'
    expect(listCount(source)).toBe(1)
    expect(structure(source)).toBe('<div class="wiki-list"><ul><li>가[CODE]</li><li>나</li></ul></div>')
  })

  it('{{{#!syntax 언어}}} 코드블록도 앞 항목에 속한다', () => {
    const source = '* 가\n{{{#!syntax sql\nSELECT 1;\n}}}\n  * 나'
    expect(listCount(source)).toBe(1)
    expect(structure(source)).toBe('<div class="wiki-list"><ul><li>가[CODE]<ul><li>나</li></ul></li></ul></div>')
  })

  it('빈 줄을 사이에 두면 목록은 거기서 끝난다 (기존 규칙 유지)', () => {
    const source = `* 가\n\n${F}\nx\n${F}\n* 나`
    expect(listCount(source)).toBe(2)
  })

  it('목록 없이 쓴 코드블록은 예전과 같다', () => {
    const source = `문단\n${F}\nx\n${F}`
    expect(structure(source)).toBe('<p>문단</p>[CODE]')
  })

  it('목록이 아닌 줄(문단) 뒤의 코드블록도 예전과 같다', () => {
    const source = `* 가\n\n문단\n${F}\nx\n${F}`
    expect(structure(source)).toBe('<div class="wiki-list"><ul><li>가</li></ul></div><p>문단</p>[CODE]')
  })

  it('접기 블록은 예전처럼 목록을 끝낸다 (코드블록만 항목에 붙는다)', () => {
    const source = '* 가\n{{{#!folding 제목\n내용\n}}}\n* 나'
    expect(listCount(source)).toBe(2)
  })

  it('코드블록 뒤에 이어 쓴 글도 같은 항목에 이어서 붙는다', () => {
    const source = `* 가\n${F}\nx\n${F}\n뒷글`
    expect(structure(source)).toBe('<div class="wiki-list"><ul><li>가[CODE]<br>뒷글</li></ul></div>')
  })
})

describe('구분선 ---', () => {
  const rule = (weight) => `<hr class="wiki-hr wiki-hr-${weight}">`

  it('대시 3개(---)만 써도 구분선이 된다', () => {
    const { html } = parseWikiText('위\n\n---\n\n아래')
    expect(html).toContain(rule(1))
    expect(html).not.toContain('<p>---</p>')
  })

  it('3개와 4개는 같은 가장 얇은 구분선이다', () => {
    expect(parseWikiText('---').html).toBe(rule(1))
    expect(parseWikiText('----').html).toBe(rule(1))
  })

  it('나무위키식 4~7개 굵기 단계는 그대로다', () => {
    expect(parseWikiText('-----').html).toBe(rule(2))
    expect(parseWikiText('------').html).toBe(rule(3))
    expect(parseWikiText('-------').html).toBe(rule(4))
  })

  it('대시 2개나 8개 이상은 구분선이 아니다', () => {
    expect(parseWikiText('--').html).not.toContain('<hr')
    expect(parseWikiText('--------').html).not.toContain('<hr')
  })

  it('다른 글자가 같이 있는 줄은 구분선이 아니다', () => {
    expect(parseWikiText('--- 설명').html).not.toContain('<hr')
  })

  it('목록 바로 아래의 ---는 목록을 끝내고 구분선이 된다', () => {
    const { html } = parseWikiText('* 항목\n---\n문단')
    expect(html).toMatch(new RegExp(`</ul></div>\\s*${rule(1)}`))
    // 구분선이 목록 항목의 이어쓰기 줄로 빨려 들어가지 않는다
    expect(html).not.toContain('<br>---')
  })
})
