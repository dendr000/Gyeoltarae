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
