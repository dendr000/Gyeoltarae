// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { isLineBreakKey } from '../../src/lib/lineBreakKey.js'

// 표 편집기 칸 안에서 [br](칸 안 줄바꿈)을 넣는 키: Shift+Enter, Alt+Enter(엑셀의 칸 안 줄바꿈과 같은 키).
// 숫자패드 Enter·Fn+Enter 는 키보드에 따라 그냥 Enter 로 오므로 줄바꿈 키가 아니다.
const key = (init) => ({ key: '', code: '', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...init })

describe('isLineBreakKey', () => {
  it('Shift+Enter 는 줄바꿈 키다', () => {
    expect(isLineBreakKey(key({ key: 'Enter', code: 'Enter', shiftKey: true }))).toBe(true)
  })

  it('Alt+Enter 는 줄바꿈 키다 (엑셀과 같음)', () => {
    expect(isLineBreakKey(key({ key: 'Enter', code: 'Enter', altKey: true }))).toBe(true)
  })

  it('Shift+Alt+Enter 도 줄바꿈 키다', () => {
    expect(isLineBreakKey(key({ key: 'Enter', altKey: true, shiftKey: true }))).toBe(true)
  })

  it('그냥 Enter(아래 칸 이동)와 숫자패드 Enter(NumpadEnter)는 아니다', () => {
    expect(isLineBreakKey(key({ key: 'Enter', code: 'Enter' }))).toBe(false)
    expect(isLineBreakKey(key({ key: 'Enter', code: 'NumpadEnter' }))).toBe(false)
  })

  it('Ctrl·Meta 가 든 조합은 아니다 (Ctrl+Enter 는 큰 입력칸으로 오가기)', () => {
    expect(isLineBreakKey(key({ key: 'Enter', shiftKey: true, ctrlKey: true }))).toBe(false)
    expect(isLineBreakKey(key({ key: 'Enter', altKey: true, ctrlKey: true }))).toBe(false)
    expect(isLineBreakKey(key({ key: 'Enter', altKey: true, metaKey: true }))).toBe(false)
  })

  it('Enter 가 아닌 키는 아니다', () => {
    expect(isLineBreakKey(key({ key: 'a', code: 'KeyA', altKey: true }))).toBe(false)
    expect(isLineBreakKey(key({ key: 'ArrowDown', shiftKey: true }))).toBe(false)
  })
})
