// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { matchSnippetShortcut } from '../../src/lib/snippetShortcuts.js'

// 키 이벤트처럼 생긴 객체 — 눌린 조합만 true 로 켠다.
function key(partial) {
  return { altKey: false, shiftKey: false, ctrlKey: false, metaKey: false, key: '', code: '', ...partial }
}

describe('matchSnippetShortcut — 갈피와 같은 상용구 단축키', () => {
  it('Alt+T 는 상용구 모달 열기', () => {
    expect(matchSnippetShortcut(key({ altKey: true, key: 't', code: 'KeyT' }))).toBe('open-modal')
  })

  it('Alt+Shift+T 는 추천 팝업 켜기/끄기 (Shift 를 누르면 e.key 가 대문자 T 로 온다)', () => {
    expect(matchSnippetShortcut(key({ altKey: true, shiftKey: true, key: 'T', code: 'KeyT' }))).toBe('toggle-suggest')
  })

  it('한글 입력 상태에서는 e.key 가 자모("ㅅ")로 와도 물리 키(KeyT)로 알아본다', () => {
    expect(matchSnippetShortcut(key({ altKey: true, key: 'ㅅ', code: 'KeyT' }))).toBe('open-modal')
    expect(matchSnippetShortcut(key({ altKey: true, shiftKey: true, key: 'ㅅ', code: 'KeyT' }))).toBe('toggle-suggest')
  })

  it('Caps Lock 으로 e.key 대소문자가 뒤집혀도 같은 동작이다', () => {
    expect(matchSnippetShortcut(key({ altKey: true, key: 'T', code: 'KeyT' }))).toBe('open-modal')
  })

  it('Alt 없이 T 만 누르면 아무 동작도 아니다 (일반 글자 입력)', () => {
    expect(matchSnippetShortcut(key({ key: 't', code: 'KeyT' }))).toBeNull()
    expect(matchSnippetShortcut(key({ shiftKey: true, key: 'T', code: 'KeyT' }))).toBeNull()
  })

  it('Ctrl 이나 Meta 가 같이 눌린 조합은 가로채지 않는다', () => {
    expect(matchSnippetShortcut(key({ ctrlKey: true, altKey: true, key: 't', code: 'KeyT' }))).toBeNull()
    expect(matchSnippetShortcut(key({ metaKey: true, altKey: true, key: 't', code: 'KeyT' }))).toBeNull()
  })

  it('다른 키는 해당 없다 (Alt+H 같은 기존 단축키와 겹치지 않는다)', () => {
    expect(matchSnippetShortcut(key({ altKey: true, key: 'h', code: 'KeyH' }))).toBeNull()
    expect(matchSnippetShortcut(key({ altKey: true, shiftKey: true, key: 'H', code: 'KeyH' }))).toBeNull()
    expect(matchSnippetShortcut(key({ altKey: true, key: 'Enter', code: 'Enter' }))).toBeNull()
  })
})
