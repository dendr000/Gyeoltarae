// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { modeShortcutTarget } from '../../src/lib/modeShortcut.js'

const ev = (over) => ({ key: 'e', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, isComposing: false, ...over })

describe('Ctrl+1/2/3 : 모드 바로 이동', () => {
  it('Ctrl+1 은 뷰어, Ctrl+2 는 듀얼, Ctrl+3 은 편집이다', () => {
    expect(modeShortcutTarget(ev({ key: '1' }), 'dual')).toBe('preview')
    expect(modeShortcutTarget(ev({ key: '2' }), 'focus')).toBe('dual')
    expect(modeShortcutTarget(ev({ key: '3' }), 'preview')).toBe('focus')
  })

  it('지금 모드와 같은 모드로 가라는 키도 그 모드를 돌려준다 (상태 변화 없음은 호출하는 쪽 몫)', () => {
    expect(modeShortcutTarget(ev({ key: '1' }), 'preview')).toBe('preview')
    expect(modeShortcutTarget(ev({ key: '2' }), 'dual')).toBe('dual')
    expect(modeShortcutTarget(ev({ key: '3' }), 'focus')).toBe('focus')
  })

  it('4~9 와 0 은 반응하지 않는다', () => {
    for (const k of ['0', '4', '5', '9']) expect(modeShortcutTarget(ev({ key: k }), 'dual')).toBeNull()
  })
})

describe('Ctrl+E : 뷰어와 편집만 오간다 (듀얼은 건너뜀)', () => {
  it('뷰어에서는 편집으로, 편집에서는 뷰어로 간다', () => {
    expect(modeShortcutTarget(ev({}), 'preview')).toBe('focus')
    expect(modeShortcutTarget(ev({}), 'focus')).toBe('preview')
  })

  it('듀얼에서 누르면 뷰어로 간다 (듀얼로는 가지 않는다)', () => {
    expect(modeShortcutTarget(ev({}), 'dual')).toBe('preview')
  })

  it('두 번 누르면 듀얼을 거치지 않고 제자리로 돌아온다', () => {
    let mode = 'focus'
    mode = modeShortcutTarget(ev({}), mode)
    mode = modeShortcutTarget(ev({}), mode)
    expect(mode).toBe('focus')
  })

  it('대문자 E(CapsLock)와 한글 자판(code KeyE)도 된다', () => {
    expect(modeShortcutTarget(ev({ key: 'E' }), 'preview')).toBe('focus')
    expect(modeShortcutTarget(ev({ key: 'ㄷ', code: 'KeyE' }), 'preview')).toBe('focus')
  })
})

describe('공통 조건', () => {
  it('Mac 의 Cmd 도 된다', () => {
    expect(modeShortcutTarget(ev({ ctrlKey: false, metaKey: true }), 'preview')).toBe('focus')
    expect(modeShortcutTarget(ev({ ctrlKey: false, metaKey: true, key: '2' }), 'focus')).toBe('dual')
  })

  it('Ctrl 없이 누르면 반응하지 않는다 (글자 입력)', () => {
    expect(modeShortcutTarget(ev({ ctrlKey: false }), 'preview')).toBeNull()
    expect(modeShortcutTarget(ev({ ctrlKey: false, key: '1' }), 'dual')).toBeNull()
  })

  it('Shift 나 Alt 가 같이 눌리면 반응하지 않는다', () => {
    for (const k of ['e', '1', '2', '3']) {
      expect(modeShortcutTarget(ev({ key: k, shiftKey: true }), 'dual')).toBeNull()
      expect(modeShortcutTarget(ev({ key: k, altKey: true }), 'dual')).toBeNull()
    }
  })

  it('한글 입력 조합 중에는 반응하지 않는다', () => {
    expect(modeShortcutTarget(ev({ isComposing: true }), 'preview')).toBeNull()
    expect(modeShortcutTarget(ev({ key: '1', isComposing: true }), 'dual')).toBeNull()
  })

  it('다른 글쇠는 반응하지 않는다', () => {
    expect(modeShortcutTarget(ev({ key: 'm' }), 'dual')).toBeNull()
    expect(modeShortcutTarget(ev({ key: 'Control' }), 'dual')).toBeNull()
  })
})

describe('소스 점검: App·헤더 연결', () => {
  const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')
  const app = read('src/App.jsx')

  it('전역 keydown 이 modeShortcutTarget 결과로 setMode 를 부른다', () => {
    expect(app).toMatch(/modeShortcutTarget\(e, mode, \{[\s\S]{0,260}\}\)[\s\S]{0,200}setMode\(/)
  })

  it('모달이 떠 있으면 모드 단축키를 무시한다 (편집 창이 사라지면 표 편집기 작업이 날아감)', () => {
    const handler = app.slice(app.indexOf('function handleGlobalKeyDown'))
    const guard = handler.indexOf(".modal-backdrop")
    expect(guard).toBeGreaterThan(-1)
    expect(guard).toBeLessThan(handler.indexOf('modeShortcutTarget'))
  })

  it('모드 단추 안내 글에 단축키가 적혀 있다', () => {
    const header = read('src/components/EditorHeader.jsx')
    for (const s of ['Ctrl+1', 'Ctrl+2', 'Ctrl+3']) expect(header).toContain(s)
  })
})
