// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { activeTabMoveKey, isTabMoveKey, moveTabById } from '../../src/lib/tabOrder.js'

// 탭을 누른 채(마우스 버튼을 누르고 있는 동안) 왼쪽/오른쪽 방향키로 탭 순서를 바꾼다. 순서 바꾸기와 키 판별의 규칙.
const tabs = (...ids) => ids.map((id) => ({ id, title: id }))
const ids = (list) => list.map((t) => t.id)
const key = (over) => ({ key: 'ArrowLeft', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, isComposing: false, ...over })

describe('moveTabById', () => {
  it('왼쪽(-1)으로 한 칸 옮긴다', () => {
    expect(ids(moveTabById(tabs('a', 'b', 'c'), 'b', -1))).toEqual(['b', 'a', 'c'])
  })

  it('오른쪽(+1)으로 한 칸 옮긴다', () => {
    expect(ids(moveTabById(tabs('a', 'b', 'c'), 'b', 1))).toEqual(['a', 'c', 'b'])
  })

  it('맨 왼쪽 탭을 더 왼쪽으로, 맨 오른쪽 탭을 더 오른쪽으로는 옮기지 않는다 (같은 목록)', () => {
    const list = tabs('a', 'b', 'c')
    expect(moveTabById(list, 'a', -1)).toBe(list)
    expect(moveTabById(list, 'c', 1)).toBe(list)
  })

  it('없는 탭이거나 탭이 하나뿐이면 그대로다', () => {
    const list = tabs('a', 'b')
    expect(moveTabById(list, 'zzz', 1)).toBe(list)
    const one = tabs('a')
    expect(moveTabById(one, 'a', 1)).toBe(one)
    expect(moveTabById([], 'a', 1)).toEqual([])
  })

  it('탭 객체는 그대로 들고 있고 받은 목록은 바꾸지 않는다', () => {
    const list = tabs('a', 'b', 'c')
    const copy = [...list]
    const next = moveTabById(list, 'a', 1)
    expect(list).toEqual(copy)
    expect(next[1]).toBe(list[0])
  })

  it('연속으로 옮기면 계속 따라간다', () => {
    let list = tabs('a', 'b', 'c', 'd')
    list = moveTabById(list, 'a', 1)
    list = moveTabById(list, 'a', 1)
    list = moveTabById(list, 'a', 1)
    expect(ids(list)).toEqual(['b', 'c', 'd', 'a'])
    expect(moveTabById(list, 'a', 1)).toBe(list)
  })

  it('방향이 -1, 1 이 아니면 그대로다', () => {
    const list = tabs('a', 'b')
    expect(moveTabById(list, 'a', 0)).toBe(list)
    expect(moveTabById(list, 'a', 2)).toBe(list)
  })
})

describe('isTabMoveKey', () => {
  it('ArrowLeft 는 -1, ArrowRight 는 +1 이다', () => {
    expect(isTabMoveKey(key({ key: 'ArrowLeft' }))).toBe(-1)
    expect(isTabMoveKey(key({ key: 'ArrowRight' }))).toBe(1)
  })

  it('조합키가 든 방향키와 다른 키는 null 이다', () => {
    expect(isTabMoveKey(key({ ctrlKey: true }))).toBeNull()
    expect(isTabMoveKey(key({ shiftKey: true }))).toBeNull()
    expect(isTabMoveKey(key({ altKey: true }))).toBeNull()
    expect(isTabMoveKey(key({ metaKey: true }))).toBeNull()
    expect(isTabMoveKey(key({ key: 'ArrowUp' }))).toBeNull()
    expect(isTabMoveKey(key({ key: 'a' }))).toBeNull()
  })

  it('한글 조합 중에는 null 이다', () => {
    expect(isTabMoveKey(key({ isComposing: true }))).toBeNull()
  })
})

describe('activeTabMoveKey (Ctrl+Alt+←/→ — 지금 열린 탭을 옮김)', () => {
  const ev = (over) => ({ key: 'ArrowLeft', ctrlKey: true, altKey: true, shiftKey: false, metaKey: false, isComposing: false, ...over })

  it('Ctrl+Alt+← 는 -1, Ctrl+Alt+→ 는 +1 이다', () => {
    expect(activeTabMoveKey(ev({ key: 'ArrowLeft' }))).toBe(-1)
    expect(activeTabMoveKey(ev({ key: 'ArrowRight' }))).toBe(1)
  })

  it('Alt 만(줄 처음/끝 이동)·Ctrl 만·Shift 나 Meta 가 같이 눌린 조합은 null 이다', () => {
    expect(activeTabMoveKey(ev({ ctrlKey: false }))).toBeNull()
    expect(activeTabMoveKey(ev({ altKey: false }))).toBeNull()
    expect(activeTabMoveKey(ev({ shiftKey: true }))).toBeNull()
    // Mac 의 Cmd 는 Ctrl 과 같게 본다: Cmd+Alt 만으로도 일치한다
    expect(activeTabMoveKey(ev({ ctrlKey: false, metaKey: true }))).toBe(-1)
  })

  it('위·아래 방향키(줄 이동)와 다른 키, 한글 조합 중은 null 이다', () => {
    expect(activeTabMoveKey(ev({ key: 'ArrowUp' }))).toBeNull()
    expect(activeTabMoveKey(ev({ key: 'ArrowDown' }))).toBeNull()
    expect(activeTabMoveKey(ev({ key: 'a' }))).toBeNull()
    expect(activeTabMoveKey(ev({ isComposing: true }))).toBeNull()
  })
})
