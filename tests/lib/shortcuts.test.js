// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import {
  SHORTCUT_ACTIONS,
  comboLabel,
  defaultShortcuts,
  eventToCombo,
  findConflict,
  matchesShortcut,
  parseShortcutOverrides,
  resolveShortcuts,
  validateCombo,
} from '../../src/lib/shortcuts.js'

// 단축키 설정: 기능마다 기본 키가 있고, 사용자가 바꾼 키(overrides)가 있으면 그것을 쓴다. 키 조합은 "Ctrl+Alt+ArrowUp" 같은 글자로 다룬다.
// Ctrl/Alt/Shift 순서로 적고 마지막이 글쇠다. Mac 의 Cmd 는 Ctrl 로 본다.
const ev = (over) => ({ key: '', code: '', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, isComposing: false, ...over })

describe('eventToCombo', () => {
  it('Ctrl+N: 대문자로 적는다', () => {
    expect(eventToCombo(ev({ key: 'n', code: 'KeyN', ctrlKey: true }))).toBe('Ctrl+N')
    expect(eventToCombo(ev({ key: 'N', code: 'KeyN', ctrlKey: true }))).toBe('Ctrl+N')
  })

  it('수식키는 Ctrl, Alt, Shift 순서로 붙는다', () => {
    expect(eventToCombo(ev({ key: 'ArrowUp', code: 'ArrowUp', shiftKey: true, altKey: true, ctrlKey: true }))).toBe('Ctrl+Alt+Shift+ArrowUp')
  })

  it('Mac 의 Cmd(metaKey)는 Ctrl 로 본다', () => {
    expect(eventToCombo(ev({ key: 'd', code: 'KeyD', metaKey: true }))).toBe('Ctrl+D')
  })

  it('한글 자판이어도 물리 키 위치(code)로 적는다 (ㅜ -> N)', () => {
    expect(eventToCombo(ev({ key: 'ㅜ', code: 'KeyN', ctrlKey: true }))).toBe('Ctrl+N')
  })

  it('Shift 로 바뀐 기호도 물리 키로 적는다 (Ctrl+Shift+~ -> Ctrl+Shift+`)', () => {
    expect(eventToCombo(ev({ key: '~', code: 'Backquote', ctrlKey: true, shiftKey: true }))).toBe('Ctrl+Shift+`')
  })

  it('숫자·기호·특수 글쇠', () => {
    expect(eventToCombo(ev({ key: '1', code: 'Digit1', ctrlKey: true }))).toBe('Ctrl+1')
    expect(eventToCombo(ev({ key: '/', code: 'Slash', ctrlKey: true }))).toBe('Ctrl+/')
    expect(eventToCombo(ev({ key: ' ', code: 'Space', ctrlKey: true }))).toBe('Ctrl+Space')
    expect(eventToCombo(ev({ key: 'F5', code: 'F5' }))).toBe('F5')
    expect(eventToCombo(ev({ key: 'Enter', code: 'Enter', altKey: true }))).toBe('Alt+Enter')
  })

  it('code 가 없는 이벤트는 key 로 적는다', () => {
    expect(eventToCombo(ev({ key: 'm', ctrlKey: true }))).toBe('Ctrl+M')
    expect(eventToCombo(ev({ key: 'ArrowLeft', altKey: true }))).toBe('Alt+ArrowLeft')
  })

  it('영문 글자는 글쇠에 새겨진 글자로 읽는다 (Dvorak 처럼 자판 배열이 달라 물리 위치와 글자가 달라도)', () => {
    expect(eventToCombo(ev({ key: 'm', code: 'KeyB', ctrlKey: true }))).toBe('Ctrl+M')
  })

  it('영문이 아닌 글자(한글)는 물리 키 위치로 읽는다', () => {
    expect(eventToCombo(ev({ key: 'ㅡ', code: 'KeyM', ctrlKey: true }))).toBe('Ctrl+M')
  })

  it('수식키만 눌렀을 때는 null 이다 (조합이 끝나지 않음)', () => {
    expect(eventToCombo(ev({ key: 'Control', code: 'ControlLeft', ctrlKey: true }))).toBeNull()
    expect(eventToCombo(ev({ key: 'Alt', code: 'AltLeft', altKey: true }))).toBeNull()
    expect(eventToCombo(ev({ key: 'Shift', code: 'ShiftLeft', shiftKey: true }))).toBeNull()
    expect(eventToCombo(ev({ key: 'Meta', code: 'MetaLeft', metaKey: true }))).toBeNull()
  })
})

describe('matchesShortcut', () => {
  it('같은 조합이면 true 다', () => {
    expect(matchesShortcut(ev({ key: 'n', code: 'KeyN', ctrlKey: true }), 'Ctrl+N')).toBe(true)
    expect(matchesShortcut(ev({ key: 'ArrowUp', code: 'ArrowUp', altKey: true }), 'Alt+ArrowUp')).toBe(true)
  })

  it('수식키가 더 있거나 모자라면 false 다 (정확히 같아야 한다)', () => {
    expect(matchesShortcut(ev({ key: 'n', code: 'KeyN', ctrlKey: true, shiftKey: true }), 'Ctrl+N')).toBe(false)
    expect(matchesShortcut(ev({ key: 'n', code: 'KeyN', ctrlKey: true }), 'Ctrl+Alt+N')).toBe(false)
    expect(matchesShortcut(ev({ key: 'n', code: 'KeyN' }), 'Ctrl+N')).toBe(false)
  })

  it('다른 글쇠면 false 다', () => {
    expect(matchesShortcut(ev({ key: 'm', code: 'KeyM', ctrlKey: true }), 'Ctrl+N')).toBe(false)
  })

  it('조합이 비어 있으면(해제) 어떤 키도 일치하지 않는다', () => {
    expect(matchesShortcut(ev({ key: 'n', code: 'KeyN', ctrlKey: true }), '')).toBe(false)
    expect(matchesShortcut(ev({ key: 'n', code: 'KeyN', ctrlKey: true }), null)).toBe(false)
    expect(matchesShortcut(ev({ key: 'n', code: 'KeyN', ctrlKey: true }), undefined)).toBe(false)
  })

  it('한글 조합 중(isComposing)에는 일치하지 않는다', () => {
    expect(matchesShortcut(ev({ key: 'n', code: 'KeyN', ctrlKey: true, isComposing: true }), 'Ctrl+N')).toBe(false)
  })

  it('수식키만 누른 이벤트는 일치하지 않는다', () => {
    expect(matchesShortcut(ev({ key: 'Control', code: 'ControlLeft', ctrlKey: true }), 'Ctrl+N')).toBe(false)
  })
})

describe('기본 단축키와 resolveShortcuts', () => {
  it('모든 기능에 id·이름·묶음·기본 키가 있고 id 가 겹치지 않는다', () => {
    const ids = SHORTCUT_ACTIONS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const action of SHORTCUT_ACTIONS) {
      expect(action.label.trim()).not.toBe('')
      expect(action.group.trim()).not.toBe('')
      expect(validateCombo(action.defaultKey).ok).toBe(true)
    }
  })

  it('기본 키들은 서로 겹치지 않는다', () => {
    const keys = SHORTCUT_ACTIONS.map((a) => a.defaultKey)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('지금까지 쓰던 키가 기본값이다', () => {
    const d = defaultShortcuts()
    expect(d['line.moveUp']).toBe('Alt+ArrowUp')
    expect(d['line.moveDown']).toBe('Alt+ArrowDown')
    expect(d['line.duplicate']).toBe('Ctrl+D')
    expect(d['line.sort']).toBe('Ctrl+`')
    expect(d['line.blockSort']).toBe('Ctrl+Shift+`')
    expect(d['tab.moveLeft']).toBe('Ctrl+Alt+ArrowLeft')
    expect(d['tab.moveRight']).toBe('Ctrl+Alt+ArrowRight')
    expect(d['doc.new']).toBe('Ctrl+N')
    expect(d['sidebar.toggle']).toBe('Ctrl+M')
    expect(d['mode.toggle']).toBe('Ctrl+E')
    expect(d['mode.viewer']).toBe('Ctrl+1')
    expect(d['mode.dual']).toBe('Ctrl+2')
    expect(d['mode.editor']).toBe('Ctrl+3')
  })

  it('바꾼 키가 있으면 그것을 쓰고, 빈 글(해제)도 그대로 쓴다', () => {
    const map = resolveShortcuts({ 'doc.new': 'Ctrl+Alt+N', 'line.sort': '' })
    expect(map['doc.new']).toBe('Ctrl+Alt+N')
    expect(map['line.sort']).toBe('')
    expect(map['line.duplicate']).toBe('Ctrl+D')
  })

  it('모르는 id 나 이상한 값(글이 아님)은 무시하고 기본값이다', () => {
    const map = resolveShortcuts({ nothing: 'Ctrl+Q', 'doc.new': 5, 'sidebar.toggle': null })
    expect(map.nothing).toBeUndefined()
    expect(map['doc.new']).toBe('Ctrl+N')
    expect(map['sidebar.toggle']).toBe('Ctrl+M')
  })

  it('overrides 가 없어도 오류 없이 기본값이다', () => {
    expect(resolveShortcuts(undefined)['doc.new']).toBe('Ctrl+N')
    expect(resolveShortcuts(null)['doc.new']).toBe('Ctrl+N')
  })
})

describe('parseShortcutOverrides (저장된 글 읽기)', () => {
  it('JSON 에서 { id: 글 } 만 골라 읽는다', () => {
    expect(parseShortcutOverrides('{"doc.new":"Ctrl+Alt+N","line.sort":""}')).toEqual({ 'doc.new': 'Ctrl+Alt+N', 'line.sort': '' })
  })

  it('깨진 글·객체가 아닌 것·모르는 id·글이 아닌 값은 버린다', () => {
    expect(parseShortcutOverrides('not json')).toEqual({})
    expect(parseShortcutOverrides('[1,2]')).toEqual({})
    expect(parseShortcutOverrides(null)).toEqual({})
    expect(parseShortcutOverrides('{"zzz":"Ctrl+Q","doc.new":7}')).toEqual({})
  })

  it('규칙에 어긋난 조합(수식키 없음 등)은 버린다', () => {
    expect(parseShortcutOverrides('{"doc.new":"N"}')).toEqual({})
  })
})

describe('validateCombo', () => {
  it('Ctrl 이나 Alt 가 있으면 된다', () => {
    expect(validateCombo('Ctrl+K').ok).toBe(true)
    expect(validateCombo('Alt+ArrowUp').ok).toBe(true)
    expect(validateCombo('Ctrl+Shift+`').ok).toBe(true)
  })

  it('수식키 없이 글쇠만이거나 Shift 만 있으면 거절한다 (글자 입력을 가로채므로)', () => {
    const none = validateCombo('K')
    expect(none.ok).toBe(false)
    expect(none.reason).toContain('Ctrl')
    expect(validateCombo('Shift+K').ok).toBe(false)
  })

  it('기능키(F1~F12)는 수식키 없이도 된다', () => {
    expect(validateCombo('F8').ok).toBe(true)
  })

  it('다른 기능이 쓰고 있어 바꿀 수 없는 키(복사·붙여넣기·저장 등)는 거절한다', () => {
    for (const reserved of ['Ctrl+C', 'Ctrl+V', 'Ctrl+X', 'Ctrl+A', 'Ctrl+Z', 'Ctrl+Y', 'Ctrl+S', 'Ctrl+F', 'Ctrl+B', 'Ctrl+W', 'Alt+Enter', 'Alt+ArrowLeft', 'Alt+ArrowRight']) {
      const r = validateCombo(reserved)
      expect(r.ok, reserved).toBe(false)
      expect(r.reason).toBeTruthy()
    }
  })

  it('비어 있거나 글쇠가 없는 조합은 거절한다', () => {
    expect(validateCombo('').ok).toBe(false)
    expect(validateCombo('Ctrl+').ok).toBe(false)
    expect(validateCombo('Ctrl+Alt').ok).toBe(false)
  })
})

describe('findConflict', () => {
  it('같은 조합을 쓰는 다른 기능의 id 를 돌려준다', () => {
    const map = defaultShortcuts()
    expect(findConflict(map, 'doc.new', 'Ctrl+M')).toBe('sidebar.toggle')
  })

  it('자기 자신은 충돌이 아니다', () => {
    const map = defaultShortcuts()
    expect(findConflict(map, 'doc.new', 'Ctrl+N')).toBeNull()
  })

  it('쓰는 기능이 없으면 null 이다', () => {
    expect(findConflict(defaultShortcuts(), 'doc.new', 'Ctrl+Alt+Q')).toBeNull()
  })

  it('해제(빈 글)한 기능끼리는 충돌이 아니다', () => {
    const map = { ...defaultShortcuts(), 'line.sort': '', 'line.duplicate': '' }
    expect(findConflict(map, 'line.sort', '')).toBeNull()
  })
})

describe('comboLabel', () => {
  it('화살표는 기호로, 나머지는 그대로 보여 준다', () => {
    expect(comboLabel('Alt+ArrowUp')).toBe('Alt+↑')
    expect(comboLabel('Ctrl+Alt+ArrowLeft')).toBe('Ctrl+Alt+←')
    expect(comboLabel('Ctrl+Shift+`')).toBe('Ctrl+Shift+`')
  })

  it('해제된 기능은 "없음" 이다', () => {
    expect(comboLabel('')).toBe('없음')
    expect(comboLabel(undefined)).toBe('없음')
  })
})
