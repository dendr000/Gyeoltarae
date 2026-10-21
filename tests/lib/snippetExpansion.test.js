// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { nextStop, parseSnippetContent, shiftStops } from '../../src/lib/snippetExpansion.js'

describe('parseSnippetContent — 본문의 {#} 와 {!이름}', () => {
  it('표시가 없으면 본문 그대로이고 커서는 글 끝(null)이다', () => {
    expect(parseSnippetContent('[목차]\n[clearfix]')).toEqual({ text: '[목차]\n[clearfix]', caret: null, stops: [], action: null })
  })

  it('첫 {#} 는 커서 자리이고 표시는 글에서 빠진다', () => {
    expect(parseSnippetContent("'''{#}'''")).toEqual({ text: "''''''", caret: 3, stops: [], action: null })
  })

  it('두 번째 {#} 부터는 Tab 으로 건너뛸 자리다 (/접기: 제목 칸 → 내용 칸)', () => {
    const parsed = parseSnippetContent('{{{#!folding {#}\n{#}\n}}}')
    expect(parsed.text).toBe('{{{#!folding \n\n}}}')
    expect(parsed.caret).toBe('{{{#!folding '.length)
    expect(parsed.stops).toEqual(['{{{#!folding \n'.length])
  })

  it('자리가 셋 이상이어도 오름차순으로 모두 돌려준다', () => {
    const parsed = parseSnippetContent('a{#}b{#}c{#}d')
    expect(parsed).toMatchObject({ text: 'abcd', caret: 1, stops: [2, 3] })
  })

  it('{{{#{#} {#}}}} 처럼 중괄호와 맞붙어 있어도 {#} 만 표시로 본다', () => {
    const parsed = parseSnippetContent('{{{#{#} {#}}}}')
    expect(parsed.text).toBe('{{{# }}}')
    expect(parsed.caret).toBe(4)
    expect(parsed.stops).toEqual([5])
  })

  it('본문이 {!이름} 하나뿐이면 동작이다 (글자는 넣지 않는다)', () => {
    expect(parseSnippetContent('{!표}')).toEqual({ text: '', caret: null, stops: [], action: '표' })
    expect(parseSnippetContent('  {!그라데이션}\n')).toMatchObject({ action: '그라데이션' })
  })

  it('{!이름} 이 다른 글 속에 섞여 있으면 동작이 아니라 글자다', () => {
    expect(parseSnippetContent('앞 {!표} 뒤').action).toBeNull()
    expect(parseSnippetContent('{!표}{!표}').action).toBeNull()
  })

  it('빈 본문도 오류 없이 처리한다', () => {
    expect(parseSnippetContent('')).toEqual({ text: '', caret: null, stops: [], action: null })
  })
})

describe('shiftStops — 글이 바뀌면 남은 Tab 자리도 같이 움직인다', () => {
  it('앞에서 글자를 넣으면 뒤의 자리가 그만큼 밀린다', () => {
    expect(shiftStops([10, 20], 5, 3)).toEqual([13, 23])
  })

  it('자리 뒤에서 넣으면 그 자리는 그대로다', () => {
    expect(shiftStops([10, 20], 15, 2)).toEqual([10, 22])
  })

  it('글자를 지우면 뒤의 자리가 당겨진다', () => {
    expect(shiftStops([10, 20], 5, -2)).toEqual([8, 18])
  })

  it('지운 범위 안에 있던 자리는 지운 자리로 모인다', () => {
    expect(shiftStops([10], 8, -5)).toEqual([8])
  })

  it('변화가 없으면 같은 배열을 돌려주고, 원래 배열은 바꾸지 않는다', () => {
    const stops = [1, 2]
    expect(shiftStops(stops, 0, 0)).toBe(stops)
    shiftStops(stops, 0, 4)
    expect(stops).toEqual([1, 2])
  })

  it('넣은 자리와 같은 위치의 자리도 뒤로 밀린다 (제목 칸에 글을 치면 내용 칸이 밀려야 한다)', () => {
    expect(shiftStops([14], 14, 1)).toEqual([15])
  })
})

describe('nextStop — Tab 으로 갈 다음 자리', () => {
  it('커서보다 뒤의 첫 자리로 가고 나머지를 돌려준다', () => {
    expect(nextStop([5, 9], 2)).toEqual({ stop: 5, rest: [9] })
  })

  it('이미 지나온 자리는 건너뛴다', () => {
    expect(nextStop([5, 9], 6)).toEqual({ stop: 9, rest: [] })
  })

  it('갈 자리가 없으면 null (평소 Tab 이 동작한다)', () => {
    expect(nextStop([], 0)).toBeNull()
    expect(nextStop([5], 5)).toBeNull()
    expect(nextStop([5], 8)).toBeNull()
  })
})
