// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { isJumpKey, jumpTarget } from '../../src/lib/tableJump.js'

// 표 편집기: 칸 <-> "선택한 셀 내용" 큰 입력칸을 한 손으로 오가는 키(F2 또는 Ctrl+Enter)의 규칙.
const key = (init) => ({ key: '', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...init })

describe('isJumpKey', () => {
  it('F2 는 오가기 키다', () => {
    expect(isJumpKey(key({ key: 'F2' }))).toBe(true)
  })

  it('Ctrl+Enter 와 Cmd+Enter 도 오가기 키다', () => {
    expect(isJumpKey(key({ key: 'Enter', ctrlKey: true }))).toBe(true)
    expect(isJumpKey(key({ key: 'Enter', metaKey: true }))).toBe(true)
  })

  it('그냥 Enter(아래 칸으로 이동)와 Shift+Enter(줄바꿈)는 아니다', () => {
    expect(isJumpKey(key({ key: 'Enter' }))).toBe(false)
    expect(isJumpKey(key({ key: 'Enter', shiftKey: true }))).toBe(false)
  })

  it('다른 키 조합(Ctrl+F2, Alt+F2, Shift+F2, Ctrl+Shift+Enter, Alt+Ctrl+Enter)은 아니다', () => {
    expect(isJumpKey(key({ key: 'F2', ctrlKey: true }))).toBe(false)
    expect(isJumpKey(key({ key: 'F2', altKey: true }))).toBe(false)
    expect(isJumpKey(key({ key: 'F2', shiftKey: true }))).toBe(false)
    expect(isJumpKey(key({ key: 'Enter', ctrlKey: true, shiftKey: true }))).toBe(false)
    expect(isJumpKey(key({ key: 'Enter', ctrlKey: true, altKey: true }))).toBe(false)
  })

  it('다른 글쇠는 아니다', () => {
    expect(isJumpKey(key({ key: 'F3' }))).toBe(false)
    expect(isJumpKey(key({ key: 'a', ctrlKey: true }))).toBe(false)
  })
})

describe('jumpTarget', () => {
  const focusCell = { r: 2, c: 1 }

  it('칸에서 누르면 큰 입력칸으로 가고, 돌아올 칸으로 지금 칸을 기억한다', () => {
    expect(jumpTarget({ where: 'cell', activeCell: { r: 3, c: 0 }, origin: null, focusCell, contentVisible: true })).toEqual({ to: 'content', origin: { r: 3, c: 0 } })
  })

  it('큰 입력칸에서 누르면 기억해 둔 칸으로 돌아간다', () => {
    expect(jumpTarget({ where: 'content', origin: { r: 3, c: 0 }, focusCell, contentVisible: true })).toEqual({ to: 'cell', r: 3, c: 0 })
  })

  it('기억해 둔 칸이 없으면(다른 길로 들어옴) 고른 칸으로 돌아간다', () => {
    expect(jumpTarget({ where: 'content', origin: null, focusCell, contentVisible: true })).toEqual({ to: 'cell', r: 2, c: 1 })
  })

  it('칸이나 큰 입력칸이 아닌 곳(단추 등)에서 누르면 고른 칸을 기억하고 큰 입력칸으로 간다', () => {
    expect(jumpTarget({ where: 'other', activeCell: null, origin: null, focusCell, contentVisible: true })).toEqual({ to: 'content', origin: { r: 2, c: 1 } })
  })

  it('여러 칸을 골라서 큰 입력칸이 없으면 갈 곳이 없다', () => {
    expect(jumpTarget({ where: 'cell', activeCell: { r: 0, c: 0 }, origin: null, focusCell, contentVisible: false })).toBeNull()
    expect(jumpTarget({ where: 'other', activeCell: null, origin: null, focusCell, contentVisible: false })).toBeNull()
  })

  it('두 번 누르면 원래 칸으로 돌아온다 (왕복)', () => {
    const go = jumpTarget({ where: 'cell', activeCell: { r: 5, c: 4 }, origin: null, focusCell, contentVisible: true })
    const back = jumpTarget({ where: 'content', origin: go.origin, focusCell, contentVisible: true })
    expect(back).toEqual({ to: 'cell', r: 5, c: 4 })
  })
})
