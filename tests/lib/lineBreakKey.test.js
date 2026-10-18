// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { isLineBreakKey } from '../../src/lib/lineBreakKey.js'

// 표 편집기 칸 안에서 [br](칸 안 줄바꿈)을 넣는 키: Shift+Enter, 그리고 숫자패드 Enter(NumpadEnter — 노트북에서 Fn+Enter 가 이 키를 내는 경우가 많다).
// Fn 자체는 키보드 장치가 처리해서 프로그램에서는 보이지 않으므로 Fn+Enter 가 어떤 키로 오는지는 키보드마다 다르다.
const key = (init) => ({ key: '', code: '', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...init })

describe('isLineBreakKey', () => {
  it('Shift+Enter 는 줄바꿈 키다', () => {
    expect(isLineBreakKey(key({ key: 'Enter', code: 'Enter', shiftKey: true }))).toBe(true)
  })

  it('숫자패드 Enter(NumpadEnter)는 줄바꿈 키다 (Fn+Enter 가 이 키로 오는 키보드)', () => {
    expect(isLineBreakKey(key({ key: 'Enter', code: 'NumpadEnter' }))).toBe(true)
  })

  it('Shift+숫자패드 Enter 도 줄바꿈 키다', () => {
    expect(isLineBreakKey(key({ key: 'Enter', code: 'NumpadEnter', shiftKey: true }))).toBe(true)
  })

  it('그냥 Enter(아래 칸 이동)는 아니다', () => {
    expect(isLineBreakKey(key({ key: 'Enter', code: 'Enter' }))).toBe(false)
  })

  it('Ctrl·Alt·Meta 가 든 조합은 아니다 (Ctrl+Enter 는 큰 입력칸으로 오가기)', () => {
    expect(isLineBreakKey(key({ key: 'Enter', code: 'Enter', shiftKey: true, ctrlKey: true }))).toBe(false)
    expect(isLineBreakKey(key({ key: 'Enter', code: 'NumpadEnter', altKey: true }))).toBe(false)
    expect(isLineBreakKey(key({ key: 'Enter', code: 'NumpadEnter', metaKey: true }))).toBe(false)
  })

  it('Enter 가 아닌 키는 아니다', () => {
    expect(isLineBreakKey(key({ key: 'a', code: 'KeyA', shiftKey: true }))).toBe(false)
    expect(isLineBreakKey(key({ key: 'ArrowDown', code: 'NumpadEnter' }))).toBe(false)
  })
})
