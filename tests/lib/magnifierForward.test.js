// Copyright (c) dendr000. MIT License.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHoverForwarder, dispatchMouse, focusLikeClick, pickTarget } from '../../src/lib/magnifierForward.js'

// 영역 확대창이 마우스 동작을 진짜 화면의 같은 자리로 전달하는 규칙. 실제 DOM 이 없는 환경이라 가짜 요소·가짜 MouseEvent 로 시험한다.
class FakeMouseEvent {
  constructor(type, init) {
    this.type = type
    Object.assign(this, init)
    this.defaultPrevented = false
  }
}

function fakeElement(name, { parent = null, focusable = false, tag = 'DIV' } = {}) {
  const element = {
    name,
    tagName: tag,
    parent,
    focused: false,
    selection: null,
    events: [],
    dispatchEvent(event) {
      element.events.push(event)
      return true
    },
    contains(other) {
      for (let node = other; node; node = node.parent) if (node === element) return true
      return false
    },
    closest() {
      for (let node = element; node; node = node.parent) if (node.focusable) return node
      return null
    },
    focus() {
      element.focused = true
    },
    setSelectionRange(start, end) {
      element.selection = [start, end]
    },
    focusable,
  }
  return element
}

const original = { screenX: 5, screenY: 6, button: 0, buttons: 1, detail: 2, ctrlKey: true, shiftKey: false, altKey: false, metaKey: false }

beforeEach(() => {
  vi.stubGlobal('MouseEvent', FakeMouseEvent)
  vi.stubGlobal('window', {})
  vi.stubGlobal('document', { elementsFromPoint: () => [], caretPositionFromPoint: undefined })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('pickTarget', () => {
  it('그 자리의 가장 위 요소를 돌려주되 확대창 자신과 그 안의 요소는 건너뛴다', () => {
    const host = fakeElement('host')
    const inner = fakeElement('inner', { parent: host })
    const button = fakeElement('button')
    const page = fakeElement('page')
    document.elementsFromPoint = () => [inner, host, button, page]
    expect(pickTarget({ x: 1, y: 2 }, host)).toBe(button)
  })

  it('조회에 쓴 좌표를 그대로 넘긴다', () => {
    const host = fakeElement('host')
    const spy = vi.fn(() => [])
    document.elementsFromPoint = spy
    pickTarget({ x: 11, y: 22 }, host)
    expect(spy).toHaveBeenCalledWith(11, 22)
  })

  it('요소가 없으면 null 이다', () => {
    const host = fakeElement('host')
    document.elementsFromPoint = () => [host]
    expect(pickTarget({ x: 0, y: 0 }, host)).toBeNull()
  })
})

describe('dispatchMouse', () => {
  it('원래 이벤트의 버튼·수정 키·클릭 횟수를 옮기고 좌표는 원래 화면의 점으로 바꿔 보낸다', () => {
    const target = fakeElement('t')
    const event = dispatchMouse(target, 'mousedown', { x: 30, y: 40 }, original)
    expect(target.events).toEqual([event])
    expect(event).toMatchObject({ type: 'mousedown', clientX: 30, clientY: 40, button: 0, buttons: 1, detail: 2, ctrlKey: true, shiftKey: false, bubbles: true, cancelable: true, composed: true })
  })

  it('추가 값(relatedTarget 등)을 덧붙인다', () => {
    const target = fakeElement('t')
    const other = fakeElement('o')
    const event = dispatchMouse(target, 'mouseover', { x: 0, y: 0 }, original, { relatedTarget: other })
    expect(event.relatedTarget).toBe(other)
  })
})

describe('focusLikeClick', () => {
  const point = { x: 10, y: 10 }

  it('눌린 곳의 포커스 받을 수 있는 조상으로 포커스를 옮긴다', () => {
    const button = fakeElement('button', { focusable: true })
    const label = fakeElement('label', { parent: button })
    focusLikeClick(label, point, { defaultPrevented: false, button: 0 })
    expect(button.focused).toBe(true)
  })

  it('포커스 받을 요소가 없으면 아무것도 하지 않는다', () => {
    const plain = fakeElement('plain')
    expect(() => focusLikeClick(plain, point, { defaultPrevented: false, button: 0 })).not.toThrow()
    expect(plain.focused).toBe(false)
  })

  it('앱이 mousedown 을 막았거나(defaultPrevented) 왼쪽 버튼이 아니면 옮기지 않는다', () => {
    const input = fakeElement('input', { focusable: true })
    focusLikeClick(input, point, { defaultPrevented: true, button: 0 })
    focusLikeClick(input, point, { defaultPrevented: false, button: 2 })
    expect(input.focused).toBe(false)
  })

  it('입력 칸이면 눌린 글자 사이로 캐럿을 둔다', () => {
    const textarea = fakeElement('textarea', { focusable: true, tag: 'TEXTAREA' })
    document.caretPositionFromPoint = () => ({ offsetNode: textarea, offset: 7 })
    focusLikeClick(textarea, point, { defaultPrevented: false, button: 0 })
    expect(textarea.focused).toBe(true)
    expect(textarea.selection).toEqual([7, 7])
  })

  it('캐럿 위치가 그 입력 칸의 것이 아니면 캐럿은 건드리지 않는다', () => {
    const textarea = fakeElement('textarea', { focusable: true, tag: 'TEXTAREA' })
    document.caretPositionFromPoint = () => ({ offsetNode: fakeElement('other'), offset: 3 })
    focusLikeClick(textarea, point, { defaultPrevented: false, button: 0 })
    expect(textarea.selection).toBeNull()
  })

  it('입력 칸이 아닌 요소(단추 등)에는 캐럿을 두지 않는다', () => {
    const button = fakeElement('button', { focusable: true, tag: 'BUTTON' })
    document.caretPositionFromPoint = () => ({ offsetNode: button, offset: 1 })
    focusLikeClick(button, point, { defaultPrevented: false, button: 0 })
    expect(button.selection).toBeNull()
  })

  it('caretPositionFromPoint 가 없는 환경에서도 오류 없이 포커스만 옮긴다', () => {
    const input = fakeElement('input', { focusable: true, tag: 'INPUT' })
    document.caretPositionFromPoint = undefined
    expect(() => focusLikeClick(input, point, { defaultPrevented: false, button: 0 })).not.toThrow()
    expect(input.focused).toBe(true)
  })
})

describe('createHoverForwarder', () => {
  const point = { x: 1, y: 2 }
  const types = (element) => element.events.map((e) => e.type)

  it('처음 요소에 들어가면 mouseover 와 mousemove 를 보낸다', () => {
    const forwarder = createHoverForwarder()
    const a = fakeElement('a')
    forwarder.move(a, point, original)
    expect(types(a)).toEqual(['mouseover', 'mousemove'])
    expect(a.events[0].relatedTarget).toBeNull()
  })

  it('같은 요소 위에서는 mousemove 만 보낸다', () => {
    const forwarder = createHoverForwarder()
    const a = fakeElement('a')
    forwarder.move(a, point, original)
    forwarder.move(a, point, original)
    expect(types(a)).toEqual(['mouseover', 'mousemove', 'mousemove'])
  })

  it('다른 요소로 옮기면 이전 요소에 mouseout, 새 요소에 mouseover 를 서로를 relatedTarget 으로 해서 보낸다', () => {
    const forwarder = createHoverForwarder()
    const a = fakeElement('a')
    const b = fakeElement('b')
    forwarder.move(a, point, original)
    forwarder.move(b, point, original)
    expect(types(a)).toEqual(['mouseover', 'mousemove', 'mouseout'])
    expect(a.events[2].relatedTarget).toBe(b)
    expect(types(b)).toEqual(['mouseover', 'mousemove'])
    expect(b.events[0].relatedTarget).toBe(a)
  })

  it('요소가 없는 자리로 옮기면 이전 요소에 mouseout 만 보낸다', () => {
    const forwarder = createHoverForwarder()
    const a = fakeElement('a')
    forwarder.move(a, point, original)
    forwarder.move(null, point, original)
    expect(types(a)).toEqual(['mouseover', 'mousemove', 'mouseout'])
  })

  it('확대창을 벗어나면(leave) 마지막 요소에 mouseout 을 보내고 잊는다', () => {
    const forwarder = createHoverForwarder()
    const a = fakeElement('a')
    forwarder.move(a, point, original)
    forwarder.leave(point, original)
    expect(types(a)).toEqual(['mouseover', 'mousemove', 'mouseout'])
    expect(a.events[2].relatedTarget).toBeNull()
    forwarder.move(a, point, original)
    expect(types(a)).toEqual(['mouseover', 'mousemove', 'mouseout', 'mouseover', 'mousemove'])
  })

  it('들어간 적이 없으면 leave 는 아무것도 보내지 않는다', () => {
    const forwarder = createHoverForwarder()
    expect(() => forwarder.leave(point, original)).not.toThrow()
  })
})
