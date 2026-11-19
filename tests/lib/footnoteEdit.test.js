// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { bodyToEditable, editableToBody, findFootnotes, footnoteAt, footnoteBodyEdit, footnoteLineSegments, footnoteSegments } from '../../src/lib/footnoteEdit.js'
import { parseWikiText } from '../../src/lib/wikiParser.js'

// 편집 모드의 각주 도우미: 색 칠하기 조각 나누기와, 각주 하나를 여러 줄 상자에서 고치기 위한 변환. 규칙은 뷰어(wikiParser)의 각주 규칙과 같아야 한다.
describe('findFootnotes', () => {
  it('각주가 없는 줄은 빈 목록', () => {
    expect(findFootnotes('그냥 글 [[문서]] [br]')).toEqual([])
  })

  it('한 줄의 각주 여러 개를 위치와 함께 찾는다', () => {
    const line = '가[* 하나]나[*둘]다'
    const notes = findFootnotes(line)
    expect(notes.map((n) => n.body)).toEqual(['하나', '둘'])
    expect(line.slice(notes[0].start, notes[0].end)).toBe('[* 하나]')
    expect(line.slice(notes[1].bodyStart, notes[1].end - 1)).toBe('둘')
  })

  it('내용 안의 [br] 은 각주를 닫지 않는다', () => {
    const notes = findFootnotes('무공[* 015[br]설명[br]더]뒤')
    expect(notes).toHaveLength(1)
    expect(notes[0].body).toBe('015[br]설명[br]더')
  })

  it('닫는 ] 가 없으면 각주가 아니다', () => {
    expect(findFootnotes('[* 닫히지 않음')).toEqual([])
  })

  it('뷰어와 같은 각주를 찾는다 (뷰어의 각주 수 = 찾은 수)', () => {
    const line = '가[* 하나[br]둘]나[* 셋]다[*넷]'
    const viewer = (parseWikiText(line).html.match(/class="wiki-footnote"/g) ?? []).length
    expect(findFootnotes(line)).toHaveLength(viewer)
  })
})

describe('footnoteAt', () => {
  const text = '앞줄\n가[* 하나[br]둘]나\n뒷줄'
  const lineStart = text.indexOf('가')
  const open = lineStart + 1 // [ 자리

  it('대괄호 안쪽이면 그 각주를 돌려준다(글 전체 기준 위치)', () => {
    const fn = footnoteAt(text, open + 5)
    expect(fn.body).toBe('하나[br]둘')
    expect(text.slice(fn.start, fn.end)).toBe('[* 하나[br]둘]')
    expect(text.slice(fn.bodyStart, fn.end - 1)).toBe('하나[br]둘')
  })

  it('[ 바로 앞과 ] 바로 뒤는 각주 밖이다', () => {
    expect(footnoteAt(text, open)).toBeNull()
    expect(footnoteAt(text, open + '[* 하나[br]둘]'.length)).toBeNull()
  })

  it('[ 바로 뒤와 ] 바로 앞은 각주 안이다', () => {
    expect(footnoteAt(text, open + 1)).not.toBeNull()
    expect(footnoteAt(text, open + '[* 하나[br]둘]'.length - 1)).not.toBeNull()
  })

  it('다른 줄의 커서는 각주가 아니다', () => {
    expect(footnoteAt(text, 1)).toBeNull()
    expect(footnoteAt(text, text.length)).toBeNull()
  })

  it('한 줄에 각주가 둘이면 커서가 있는 쪽을 돌려준다', () => {
    const t = '[* 가] 그리고 [* 나]'
    expect(footnoteAt(t, 3).body).toBe('가')
    expect(footnoteAt(t, t.length - 2).body).toBe('나')
    expect(footnoteAt(t, 6)).toBeNull()
  })

  it('잘못된 입력은 null', () => {
    expect(footnoteAt(undefined, 0)).toBeNull()
    expect(footnoteAt('가', -1)).toBeNull()
    expect(footnoteAt('가', 5)).toBeNull()
  })
})

describe('각주 내용 <-> 편집 상자 글', () => {
  it('[br] 은 줄바꿈으로 보인다', () => {
    expect(bodyToEditable('a[br]b[br][br]c')).toBe('a\nb\n\nc')
  })

  it('줄바꿈은 [br] 로 저장되고 줄 끝 공백·앞뒤 빈 줄은 지워진다', () => {
    expect(editableToBody('\n\n a  \nb\t\n\n')).toBe(' a[br]b')
  })

  it('중간의 빈 줄은 남는다', () => {
    expect(editableToBody('a\n\nb')).toBe('a[br][br]b')
  })

  it('윈도 줄바꿈(CRLF)도 처리한다', () => {
    expect(editableToBody('a\r\nb')).toBe('a[br]b')
  })

  it('] 는 각주를 닫아 버리므로 전각으로 바꾼다', () => {
    expect(editableToBody('a]b')).toBe('a］b')
    expect(findFootnotes(`[* ${editableToBody('a]b')}]`)).toHaveLength(1)
  })

  it('[[링크]] 와 [0] 같은 짝이 맞는 대괄호는 그대로 두고, 낱개 ] 만 바꾼다', () => {
    expect(editableToBody('[[문서]] 와 [0] 그리고 a]b')).toBe('[[문서]] 와 [0] 그리고 a］b')
    const line = `[* ${editableToBody('[[문서]] 참고 [0]')}] 끝`
    const found = findFootnotes(line)
    expect(found).toHaveLength(1)
    expect(found[0].body).toBe('[[문서]] 참고 [0]')
  })

  it('고쳐도 [br] 이 없는 내용은 그대로 돌아온다', () => {
    expect(editableToBody(bodyToEditable('015 설명'))).toBe('015 설명')
  })

  it('[br] 이 있는 내용도 그대로 돌아온다', () => {
    const body = '무공 : 접무도법 (016)[br]총 24개의 식.[br]제2초식'
    expect(editableToBody(bodyToEditable(body))).toBe(body)
  })
})

describe('footnoteBodyEdit', () => {
  it('[* 와 ] 는 그대로 두고 내용만 바꾸는 범위를 준다', () => {
    const text = '가[* 옛 내용]나'
    const fn = footnoteAt(text, 6)
    const edit = footnoteBodyEdit(fn, '새[br]내용')
    expect(text.slice(0, edit.from) + edit.insert + text.slice(edit.to)).toBe('가[* 새[br]내용]나')
  })

  it('공백 없는 [*내용] 도 같은 방식이다', () => {
    const text = '[*옛]'
    const fn = footnoteAt(text, 3)
    const edit = footnoteBodyEdit(fn, '새')
    expect(text.slice(0, edit.from) + edit.insert + text.slice(edit.to)).toBe('[*새]')
  })

  it('내용을 비우면 빈 각주가 된다', () => {
    const text = '[* 옛]'
    const edit = footnoteBodyEdit(footnoteAt(text, 4), '')
    expect(text.slice(0, edit.from) + edit.insert + text.slice(edit.to)).toBe('[* ]')
  })
})

describe('footnoteSegments (편집기 색 칠하기 조각)', () => {
  const joined = (segs) => segs.map((s) => s.text).join('')

  it('각주가 없으면 null', () => {
    expect(footnoteSegments('그냥 글')).toBeNull()
  })

  it('조각을 이으면 원래 줄과 같다(글자 위치가 어긋나지 않는다)', () => {
    const line = '앞[* 가[br]나]중간[*다]뒤'
    expect(joined(footnoteSegments(line))).toBe(line)
  })

  it('각주 밖은 footnote 번호가 없고, 안쪽은 번호가 있다', () => {
    const segs = footnoteSegments('앞[* 가]뒤', 3)
    expect(segs).toEqual([{ text: '앞' }, { text: '[* 가]', footnote: 3 }, { text: '뒤' }])
  })

  it('각주 안의 [br] 은 따로 표시된다', () => {
    const segs = footnoteSegments('[* 가[br]나]', 0)
    expect(segs).toEqual([
      { text: '[* 가', footnote: 0 },
      { text: '[br]', footnote: 0, br: true },
      { text: '나]', footnote: 0 },
    ])
  })

  it('한 줄의 각주마다 번호가 하나씩 늘어난다', () => {
    const nums = [...new Set(footnoteSegments('[* a][* b][* c]', 5).map((s) => s.footnote))]
    expect(nums).toEqual([5, 6, 7])
  })

  it('각주 밖의 [br] 은 표시하지 않는다', () => {
    const segs = footnoteSegments('가[br]나[* x]', 0)
    expect(segs.some((s) => s.br)).toBe(false)
  })
})

describe('footnoteLineSegments (글 전체)', () => {
  it('줄 수가 글의 줄 수와 같고, 각주 없는 줄은 null', () => {
    const lines = footnoteLineSegments('가\n나[* 다]\n라')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBeNull()
    expect(lines[1]).not.toBeNull()
    expect(lines[2]).toBeNull()
  })

  it('각주 번호는 줄을 넘어 이어서 센다', () => {
    const lines = footnoteLineSegments('[* a][* b]\n중간\n[* c]')
    expect(lines[0].filter((s) => s.footnote !== undefined).map((s) => s.footnote)).toEqual([0, 1])
    expect(lines[2][0].footnote).toBe(2)
  })

  it('코드블록 안의 줄은 각주로 치지 않고 번호도 세지 않는다', () => {
    const lines = footnoteLineSegments('```\n[* 코드]\n```\n[* 진짜]')
    expect(lines[1]).toBeNull()
    expect(lines[3][0].footnote).toBe(0)
  })

  it('뷰어의 각주 수와 편집기가 센 각주 수가 같다', () => {
    const text = '가[* 하나]\n나[* 둘[br]셋]다[* 넷]\n```\n[* 제외]\n```\n끝'
    const counted = footnoteLineSegments(text).flatMap((s) => s ?? []).filter((s) => s.footnote !== undefined)
    const maxIndex = Math.max(...counted.map((s) => s.footnote))
    expect(maxIndex + 1).toBe((parseWikiText(text).html.match(/class="wiki-footnote"/g) ?? []).length)
  })

  it('윈도 줄바꿈(\\r)이 끝에 붙은 줄도 각주를 찾는다', () => {
    const lines = footnoteLineSegments('[* a]\r\n끝')
    expect(lines[0]).not.toBeNull()
  })
})
