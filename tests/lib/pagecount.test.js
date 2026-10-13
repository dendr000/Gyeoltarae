import { describe, expect, it } from 'vitest'
import { parseWikiText } from '../../src/lib/wikiParser.js'

// [pagecount] — 워크스페이스의 문서 수를 숫자로 보여 주는 매크로(나무위키의 [pagecount] 에 해당). 나무위키는 사이트 전체 문서 수이고,
// 결타래는 지금 열어 둔 워크스페이스의 문서 수다. docIndex 는 문서 이름(과 번호를 뗀 이름)마다 문서 목록을 갖는 색인이라, 같은 문서가 두 이름으로
// 들어 있어도 한 번만 센다.

const doc = (path) => ({ path, name: path.split('/').pop() })
const render = (text, docIndex) => parseWikiText(text, { docIndex }).html

describe('[pagecount]', () => {
  it('색인에 든 문서 수를 숫자로 바꾼다', () => {
    const docIndex = { 가: [doc('a/가')], 나: [doc('a/나')], 다: [doc('b/다')] }
    expect(render('[pagecount]', docIndex)).toContain('>3<')
  })

  it('같은 문서가 번호 뗀 이름으로도 들어 있어도 한 번만 센다', () => {
    const file = doc('a/0891 치고마')
    const docIndex = { '0891 치고마': [file], 치고마: [file], 다른: [doc('a/다른')] }
    expect(render('[pagecount]', docIndex)).toContain('>2<')
  })

  it('같은 이름의 서로 다른 문서는 각각 센다 (다른 폴더의 같은 이름)', () => {
    const docIndex = { 메모: [doc('a/메모'), doc('b/메모')] }
    expect(render('[pagecount]', docIndex)).toContain('>2<')
  })

  it('문서가 없으면 0', () => {
    expect(render('[pagecount]', {})).toContain('>0<')
  })

  it('문장 속과 한 줄에 여러 번 써도 된다', () => {
    const docIndex = { 가: [doc('가')], 나: [doc('나')] }
    const html = render('문서는 [pagecount]개, 다시 [pagecount]개', docIndex)
    expect(html.match(/2/g)?.length).toBeGreaterThanOrEqual(2)
    expect(html).toContain('문서는 2개')
    expect(html).toContain('다시 2개')
  })

  it('색인을 안 주면 0 으로 읽는다 (미리보기·시험처럼 색인이 없는 곳)', () => {
    expect(parseWikiText('[pagecount]').html).toContain('>0<')
  })

  it('인자가 있는 형태([pagecount(...)])는 지원하지 않아 글자 그대로 둔다', () => {
    expect(render('[pagecount(분류:가)]', { 가: [doc('가')] })).toContain('[pagecount(분류:가)]')
  })

  it('코드블록 안에서는 바꾸지 않는다', () => {
    expect(render('```\n[pagecount]\n```', { 가: [doc('가')] })).toContain('[pagecount]')
  })
})
