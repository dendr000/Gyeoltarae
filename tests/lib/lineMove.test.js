// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { isLineMoveKey, moveLinesEdit } from '../../src/lib/lineMove.js'

// Ctrl+Alt+↑/↓ — VS Code 의 "줄 위/아래로 이동"처럼 현재 줄(선택했으면 선택에 걸친 줄 전체)을 위·아래 줄과 자리를 바꾼다.
// 결과는 { from, to, insert, selStart, selEnd } — [from, to) 를 insert 로 바꾸고 선택을 selStart~selEnd 로 둔다. 갈 곳이 없으면 null.

// 편집 결과를 적용한 새 문서와 선택 영역. 커서/선택은 ^ 와 ~ 로 적는다: ^ 하나면 커서, ^ ... ~ 면 선택(^ 시작, ~ 끝).
function run(doc, direction) {
  const selStart = doc.indexOf('^')
  const withoutCaret = doc.replace('^', '')
  const tilde = withoutCaret.indexOf('~')
  const selEnd = tilde === -1 ? selStart : tilde
  const value = tilde === -1 ? withoutCaret : withoutCaret.replace('~', '')
  const edit = moveLinesEdit(value, selStart, selEnd, direction)
  if (!edit) return null
  const next = value.slice(0, edit.from) + edit.insert + value.slice(edit.to)
  return { next, selStart: edit.selStart, selEnd: edit.selEnd, mark: `${next.slice(0, edit.selStart)}^${next.slice(edit.selStart, edit.selEnd)}${edit.selEnd > edit.selStart ? '~' : ''}${next.slice(edit.selEnd)}` }
}

describe('moveLinesEdit - 한 줄(커서)', () => {
  it('위로: 윗 줄과 자리를 바꾸고 커서가 따라간다 (줄 안의 같은 위치)', () => {
    const r = run('가\n나^나\n다', -1)
    expect(r.next).toBe('나나\n가\n다')
    expect(r.mark).toBe('^나나\n가\n다'.replace('^나나', '나^나'))
  })

  it('아래로: 아랫 줄과 자리를 바꾸고 커서가 따라간다', () => {
    const r = run('가\n나^나\n다', 1)
    expect(r.next).toBe('가\n다\n나나')
    expect(r.mark).toBe('가\n다\n나^나')
  })

  it('맨 윗줄을 위로, 맨 아랫줄을 아래로는 null 이다', () => {
    expect(run('^가\n나', -1)).toBeNull()
    expect(run('가\n나^', 1)).toBeNull()
  })

  it('한 줄뿐인 문서나 빈 문서는 null 이다', () => {
    expect(run('가^나', -1)).toBeNull()
    expect(run('가^나', 1)).toBeNull()
    expect(moveLinesEdit('', 0, 0, 1)).toBeNull()
  })

  it('빈 줄도 한 줄로 옮긴다', () => {
    expect(run('가\n^\n나', 1).next).toBe('가\n나\n')
    expect(run('가\n^\n나', -1).next).toBe('\n가\n나')
  })

  it('문서 끝 줄바꿈이 있어도 그 빈 마지막 줄까지 한 줄로 본다', () => {
    expect(run('가^\n나\n', 1).next).toBe('나\n가\n')
    expect(run('가\n나^\n', 1).next).toBe('가\n\n나')
  })

  it('방향이 -1, 1 이 아니면 null 이다', () => {
    expect(moveLinesEdit('가\n나', 0, 0, 0)).toBeNull()
    expect(moveLinesEdit('가\n나', 0, 0, 2)).toBeNull()
  })
})

describe('moveLinesEdit - 여러 줄 선택', () => {
  it('선택에 걸친 줄 전체가 함께 위로 옮겨 가고 선택이 유지된다', () => {
    const r = run('가\n나^나\n다~다\n라', -1)
    expect(r.next).toBe('나나\n다다\n가\n라')
    expect(r.mark).toBe('나^나\n다~다\n가\n라')
  })

  it('선택에 걸친 줄 전체가 함께 아래로 옮겨 가고 선택이 유지된다', () => {
    const r = run('가\n나^나\n다~다\n라', 1)
    expect(r.next).toBe('가\n라\n나나\n다다')
    expect(r.mark).toBe('가\n라\n나^나\n다~다')
  })

  it('줄 전체를 선택해 끝이 다음 줄 맨 앞인 경우 그 다음 줄은 옮기지 않는다', () => {
    const r = run('가\n^나나\n다다\n~라\n마', 1)
    expect(r.next).toBe('가\n라\n나나\n다다\n마')
    expect(r.selStart).toBe(r.next.indexOf('나나'))
  })

  it('줄 전체(줄바꿈 포함)를 선택해 끝 쪽 이웃이 줄바꿈 없는 마지막 줄이어도 선택이 글 밖으로 나가지 않는다', () => {
    const edit = moveLinesEdit('가\n나', 0, 2, 1)
    expect(edit.insert).toBe('나\n가')
    expect(edit.selEnd).toBeLessThanOrEqual('나\n가'.length)
  })

  it('선택이 거꾸로(끝이 앞)여도 옮겨진다 (호출하는 쪽이 start <= end 로 넘긴다는 전제)', () => {
    expect(run('가\n^나~\n다', -1).next).toBe('나\n가\n다')
  })
})

describe('moveLinesEdit - 줄바꿈 종류', () => {
  it('CRLF 문서도 줄바꿈을 CRLF 로 유지한 채 옮긴다', () => {
    const r = run('가\r\n나^나\r\n다', 1)
    expect(r.next).toBe('가\r\n다\r\n나나')
    const up = run('가\r\n나^나\r\n다', -1)
    expect(up.next).toBe('나나\r\n가\r\n다')
  })

  it('CRLF 문서의 마지막 줄 끝 \\r 이 이웃 줄과 섞이지 않는다', () => {
    expect(run('가^\r\n나\r\n다\r\n', 1).next).toBe('나\r\n가\r\n다\r\n')
  })
})

describe('moveLinesEdit - 편집 범위', () => {
  it('바꾸는 범위는 이웃 줄과 옮기는 줄 구간뿐이다 (문서의 나머지는 건드리지 않는다)', () => {
    const value = '앞\n가\n나\n뒤'
    const edit = moveLinesEdit(value, value.indexOf('가'), value.indexOf('가'), 1)
    expect(value.slice(0, edit.from)).toBe('앞\n')
    expect(value.slice(edit.to)).toBe('\n뒤')
    expect(edit.insert).toBe('나\n가')
  })
})

describe('isLineMoveKey', () => {
  const key = (over) => ({ key: 'ArrowUp', ctrlKey: false, altKey: true, shiftKey: false, metaKey: false, isComposing: false, ...over })

  it('Alt+↑ 는 -1, Alt+↓ 는 +1 이다', () => {
    expect(isLineMoveKey(key({ key: 'ArrowUp' }))).toBe(-1)
    expect(isLineMoveKey(key({ key: 'ArrowDown' }))).toBe(1)
  })

  it('Alt 가 빠졌거나 Ctrl·Shift·Meta 가 같이 눌렸으면 null 이다 (Ctrl+Alt+↑/↓ 는 더 이상 줄 이동이 아니다)', () => {
    expect(isLineMoveKey(key({ altKey: false }))).toBeNull()
    expect(isLineMoveKey(key({ ctrlKey: true }))).toBeNull()
    expect(isLineMoveKey(key({ shiftKey: true }))).toBeNull()
    expect(isLineMoveKey(key({ metaKey: true }))).toBeNull()
  })

  it('다른 키(Alt+←/→ 는 줄 처음/끝 이동)와 한글 조합 중은 null 이다', () => {
    expect(isLineMoveKey(key({ key: 'ArrowLeft' }))).toBeNull()
    expect(isLineMoveKey(key({ key: 'ArrowRight' }))).toBeNull()
    expect(isLineMoveKey(key({ key: 'a' }))).toBeNull()
    expect(isLineMoveKey(key({ isComposing: true }))).toBeNull()
  })
})
