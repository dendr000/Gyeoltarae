// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { isNumpadEnterKey } from '../../src/lib/numpadEnter.js'

// 문서 편집기: 숫자패드 Enter(e.code === 'NumpadEnter')를 누르면 그 자리에 [br] 이 들어간다. 그냥 Enter(줄바꿈·목록 이어쓰기)와 Shift+Enter(이어쓰기 없는
// 줄바꿈)는 그대로이므로, 숫자패드 Enter 에 아무 조합키도 없을 때만 해당한다.
const key = (init) => ({ key: '', code: '', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...init })

describe('isNumpadEnterKey', () => {
  it('숫자패드 Enter 는 true 다', () => {
    expect(isNumpadEnterKey(key({ key: 'Enter', code: 'NumpadEnter' }))).toBe(true)
  })

  it('그냥 Enter 는 false 다 (줄바꿈·목록 이어쓰기)', () => {
    expect(isNumpadEnterKey(key({ key: 'Enter', code: 'Enter' }))).toBe(false)
  })

  it('조합키(Shift·Ctrl·Alt·Meta)가 든 숫자패드 Enter 는 false 다', () => {
    expect(isNumpadEnterKey(key({ key: 'Enter', code: 'NumpadEnter', shiftKey: true }))).toBe(false)
    expect(isNumpadEnterKey(key({ key: 'Enter', code: 'NumpadEnter', ctrlKey: true }))).toBe(false)
    expect(isNumpadEnterKey(key({ key: 'Enter', code: 'NumpadEnter', altKey: true }))).toBe(false)
    expect(isNumpadEnterKey(key({ key: 'Enter', code: 'NumpadEnter', metaKey: true }))).toBe(false)
  })

  it('숫자패드의 다른 키는 false 다', () => {
    expect(isNumpadEnterKey(key({ key: '1', code: 'Numpad1' }))).toBe(false)
    expect(isNumpadEnterKey(key({ key: 'ArrowDown', code: 'NumpadEnter' }))).toBe(false)
  })
})
