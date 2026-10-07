import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CLIPBOARD_API_TIMEOUT_MS,
  COPIED_LABEL,
  COPY_LABEL,
  FAILED_LABEL,
  RESET_AFTER_MS,
  copyCodeBlock,
  readCodeText,
  writeClipboardText,
} from '../../src/lib/codeCopy.js'

// 화면(DOM) 없이 시험하려고 버튼과 코드블록을 흉내 낸 가짜 객체.
// closest/querySelector 가 코드에서 쓰는 선택자에만 답한다.
function fakeButton(codeText, { insideCodeBlock = true } = {}) {
  const label = { textContent: COPY_LABEL }
  const code = { textContent: codeText }
  const wrap = { querySelector: (sel) => (sel === 'pre code' ? code : null) }
  return {
    dataset: {},
    label,
    closest: (sel) => (insideCodeBlock && sel === '.wiki-code-wrap' ? wrap : null),
    querySelector: (sel) => (sel === '.wiki-code-copy-label' ? label : null),
  }
}

// setTimeout 대신 쓰는 수동 타이머: 예약만 기록해 두고 시험이 직접 실행한다.
function manualTimers() {
  const pending = new Map()
  let nextId = 1
  return {
    setTimer: (fn, ms) => {
      const id = nextId++
      pending.set(id, { fn, ms })
      return id
    },
    clearTimer: (id) => pending.delete(id),
    pending,
    runAll() {
      for (const { fn } of [...pending.values()]) fn()
      pending.clear()
    },
  }
}

describe('readCodeText', () => {
  it('버튼이 속한 코드블록의 본문 글자를 돌려준다', () => {
    expect(readCodeText(fakeButton('SELECT 1;\nSELECT 2;'))).toBe('SELECT 1;\nSELECT 2;')
  })

  it('코드블록 안의 버튼이 아니면 null', () => {
    expect(readCodeText(fakeButton('x', { insideCodeBlock: false }))).toBeNull()
  })
})

describe('copyCodeBlock', () => {
  it('코드 본문을 클립보드에 쓰고 버튼을 "복사됨"으로 바꾼다', async () => {
    const button = fakeButton('CREATE TABLE t(id INT);')
    const write = vi.fn().mockResolvedValue(true)

    const ok = await copyCodeBlock(button, { write, ...manualTimers() })

    expect(ok).toBe(true)
    expect(write).toHaveBeenCalledWith('CREATE TABLE t(id INT);')
    expect(button.dataset.state).toBe('copied')
    expect(button.label.textContent).toBe(COPIED_LABEL)
  })

  it('일정 시간이 지나면 버튼이 원래 모습으로 돌아온다', async () => {
    const button = fakeButton('x')
    const timers = manualTimers()

    await copyCodeBlock(button, { write: async () => true, ...timers })
    expect([...timers.pending.values()].map((t) => t.ms)).toEqual([RESET_AFTER_MS])

    timers.runAll()
    expect(button.dataset.state).toBeUndefined()
    expect(button.label.textContent).toBe(COPY_LABEL)
  })

  it('복사에 실패하면 "복사 실패"를 보여주고 false 를 돌려준다', async () => {
    const button = fakeButton('x')

    const ok = await copyCodeBlock(button, { write: async () => false, ...manualTimers() })

    expect(ok).toBe(false)
    expect(button.dataset.state).toBe('failed')
    expect(button.label.textContent).toBe(FAILED_LABEL)
  })

  it('연달아 눌러도 앞 되돌리기 예약이 취소되어 타이머가 하나만 남는다', async () => {
    const button = fakeButton('x')
    const timers = manualTimers()
    const deps = { write: async () => true, ...timers }

    await copyCodeBlock(button, deps)
    await copyCodeBlock(button, deps)

    expect(timers.pending.size).toBe(1)
  })

  it('코드블록이 아닌 곳의 버튼이면 아무것도 쓰지 않는다', async () => {
    const button = fakeButton('x', { insideCodeBlock: false })
    const write = vi.fn()

    expect(await copyCodeBlock(button, { write, ...manualTimers() })).toBe(false)
    expect(write).not.toHaveBeenCalled()
    expect(button.dataset.state).toBeUndefined()
  })
})

describe('writeClipboardText', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('navigator.clipboard 로 쓰는 데 성공하면 true', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    expect(await writeClipboardText('abc')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('abc')
  })

  it('클립보드를 쓸 수 없는 환경이면 예외 없이 false', async () => {
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('document', undefined)

    expect(await writeClipboardText('abc')).toBe(false)
  })

  // 가짜 document: 옛 복사 방식이 만드는 textarea 와 execCommand 호출을 기록한다.
  function fakeDocument({ copyResult = true } = {}) {
    const area = { style: {}, setAttribute: () => {}, select: vi.fn(), value: '' }
    const calls = { copied: [], removed: 0 }
    const doc = {
      activeElement: null,
      body: { appendChild: () => {}, removeChild: () => (calls.removed += 1) },
      createElement: () => area,
      execCommand: (cmd) => {
        calls.copied.push({ cmd, value: area.value })
        return copyResult
      },
    }
    return { doc, calls }
  }

  it('navigator.clipboard 가 거절하면 옛 방식으로 복사한다', async () => {
    const { doc, calls } = fakeDocument()
    vi.stubGlobal('navigator', { clipboard: { writeText: () => Promise.reject(new Error('denied')) } })
    vi.stubGlobal('document', doc)

    expect(await writeClipboardText('abc')).toBe(true)
    expect(calls.copied).toEqual([{ cmd: 'copy', value: 'abc' }])
    expect(calls.removed).toBe(1)
  })

  it('navigator.clipboard 가 성공도 실패도 안 하고 대기만 해도 시간이 지나면 옛 방식으로 복사한다', async () => {
    vi.useFakeTimers()
    try {
      const { doc, calls } = fakeDocument()
      vi.stubGlobal('navigator', { clipboard: { writeText: () => new Promise(() => {}) } })
      vi.stubGlobal('document', doc)

      const pending = writeClipboardText('abc')
      await vi.advanceTimersByTimeAsync(CLIPBOARD_API_TIMEOUT_MS)

      expect(await pending).toBe(true)
      expect(calls.copied).toEqual([{ cmd: 'copy', value: 'abc' }])
    } finally {
      vi.useRealTimers()
    }
  })

  it('옛 방식도 실패하면 false 이고 임시 textarea 는 정리된다', async () => {
    const { doc, calls } = fakeDocument({ copyResult: false })
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('document', doc)

    expect(await writeClipboardText('abc')).toBe(false)
    expect(calls.removed).toBe(1)
  })
})
