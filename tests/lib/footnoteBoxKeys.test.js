// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleFootnoteBoxKey } from '../../src/lib/footnoteBoxKeys.js'
import { parseDictText } from '../../src/lib/dictCycle.js'

// 각주 편집 상자가 본문과 같은 입력 도우미(괄호 자동 닫기, 굵게·밑줄, 사전 순환·등록, 줄 처음/끝)를 쓰는지 지킨다.
// 가짜 입력칸: execCommand 가 없는 환경이라 replaceRange 의 대체 경로(값을 직접 바꿈)를 탄다.

function fakeArea(value, start, end = start) {
  return {
    value,
    selectionStart: start,
    selectionEnd: end,
    selectionDirection: 'forward',
    focus() {},
    setSelectionRange(s, e) {
      this.selectionStart = s
      this.selectionEnd = e
    },
  }
}

function press(area, key, extra = {}, options = {}) {
  const e = { key, code: '', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, nativeEvent: { isComposing: false }, prevented: false, preventDefault() { this.prevented = true }, ...extra }
  const setValue = vi.fn()
  const openDict = vi.fn()
  const handled = handleFootnoteBoxKey(e, area, { setValue, dictMap: options.dictMap ?? new Map(), openDict })
  return { handled, e, setValue, openDict }
}

beforeEach(() => {
  vi.stubGlobal('document', { execCommand: () => false })
  vi.stubGlobal('requestAnimationFrame', () => 0)
})
afterEach(() => vi.unstubAllGlobals())

describe('괄호 자동 닫기', () => {
  it('여는 글자를 치면 짝을 같이 넣고 커서를 사이에 둔다', () => {
    for (const [open, close] of [['(', ')'], ['[', ']'], ['{', '}'], ['<', '>'], ["'", "'"], ['"', '"']]) {
      const area = fakeArea('ab', 1)
      const { handled, e } = press(area, open)
      expect(handled).toBe(true)
      expect(e.prevented).toBe(true)
      expect(area.value).toBe(`a${open}${close}b`)
      expect(area.selectionStart).toBe(2)
    }
  })

  it('선택한 글이 있으면 그 글을 감싼다', () => {
    const area = fakeArea('abc', 1, 2)
    press(area, '(')
    expect(area.value).toBe('a(b)c')
  })

  it('닫는 글자가 바로 앞에 있으면 새로 넣지 않고 건너뛴다', () => {
    const area = fakeArea('a()b', 2)
    const { handled } = press(area, ')')
    expect(handled).toBe(true)
    expect(area.value).toBe('a()b')
    expect(area.selectionStart).toBe(3)
  })

  it('보통 글자는 건드리지 않는다', () => {
    const area = fakeArea('ab', 1)
    expect(press(area, 'x').handled).toBe(false)
    expect(area.value).toBe('ab')
  })

  it('한글 조합 중에는 건드리지 않는다', () => {
    const area = fakeArea('ab', 1)
    expect(press(area, '(', { nativeEvent: { isComposing: true } }).handled).toBe(false)
    expect(area.value).toBe('ab')
  })
})

describe('굵게·밑줄·취소선', () => {
  it('Ctrl+B 는 선택을 \'\'\' 로 감싼다', () => {
    const area = fakeArea('abc', 1, 2)
    press(area, 'b', { ctrlKey: true })
    expect(area.value).toBe("a'''b'''c")
  })

  it('Ctrl+U 는 __ 로 감싼다 (Caps Lock 으로 대문자가 와도)', () => {
    const area = fakeArea('abc', 1, 2)
    press(area, 'U', { ctrlKey: true })
    expect(area.value).toBe('a__b__c')
  })

  it('Ctrl+Shift+Alt+- 는 취소선', () => {
    const area = fakeArea('abc', 1, 2)
    press(area, '-', { ctrlKey: true, shiftKey: true, altKey: true, code: 'Minus' })
    expect(area.value).toBe('a~~b~~c')
  })
})

describe('한자 사전', () => {
  const dictMap = parseDictText('동방(東方)\n동방(冬芳)')

  it('Alt+H 는 커서 앞 단어를 사전의 다음 후보로 바꾼다', () => {
    const area = fakeArea('가 동방', 4)
    const { handled } = press(area, 'h', { altKey: true }, { dictMap })
    expect(handled).toBe(true)
    expect(area.value).toBe('가 동방(東方)')
  })

  it('이미 바뀐 것은 다음 후보로 순환한다', () => {
    const area = fakeArea('동방(東方)', 6)
    press(area, 'h', { altKey: true }, { dictMap })
    expect(area.value).toBe('동방(冬芳)')
  })

  it('Alt+H: 사전에 없으면 아무것도 바꾸지 않아도 키는 소비한다', () => {
    const area = fakeArea('없음', 2)
    const { handled, e } = press(area, 'h', { altKey: true }, { dictMap })
    expect(handled).toBe(true)
    expect(e.prevented).toBe(true)
    expect(area.value).toBe('없음')
  })

  it('Alt+Shift+H 는 선택한 글을 넘겨 사전 등록을 연다', () => {
    const area = fakeArea('가 동방 나', 2, 4)
    const { openDict, handled } = press(area, 'H', { altKey: true, shiftKey: true })
    expect(handled).toBe(true)
    expect(openDict).toHaveBeenCalledWith('동방')
  })

  it('Alt+Shift+H: 선택이 없으면 빈 글로 연다', () => {
    const { openDict } = press(fakeArea('가', 1), 'H', { altKey: true, shiftKey: true })
    expect(openDict).toHaveBeenCalledWith('')
  })
})

describe('줄 처음/끝 이동', () => {
  it('Alt+← / Alt+→ 는 현재 줄의 처음/끝으로 간다', () => {
    const area = fakeArea('abc\ndef', 5)
    press(area, 'ArrowLeft', { altKey: true })
    expect(area.selectionStart).toBe(4)
    press(area, 'ArrowRight', { altKey: true })
    expect(area.selectionStart).toBe(7)
  })
})

describe('상자와 편집기 연결 (소스 점검)', () => {
  const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

  it('각주 상자의 키 처리가 공용 처리를 부르고, 편집기가 사전을 넘긴다', () => {
    const box = read('src/components/FootnoteEditBox.jsx')
    expect(box).toMatch(/handleFootnoteBoxKey\(e, areaRef\.current/)
    const editor = read('src/components/EditorPane.jsx')
    expect(editor).toMatch(/dictMap=\{dictMap\}\s*onOpenDict=\{openDictModal\}/)
  })

  it('사전 등록은 상자를 반영하고 닫은 뒤에 창을 연다', () => {
    const box = read('src/components/FootnoteEditBox.jsx')
    expect(box).toMatch(/finish\(true\)\s*onOpenDict\?\.\(selected\)/)
  })

  it('본문 편집기와 상자가 같은 입력칸 편집 함수를 쓴다', () => {
    expect(read('src/components/EditorPane.jsx')).toMatch(/from '\.\.\/lib\/textareaEdit\.js'/)
    expect(read('src/lib/footnoteBoxKeys.js')).toMatch(/from '\.\/textareaEdit\.js'/)
  })
})
