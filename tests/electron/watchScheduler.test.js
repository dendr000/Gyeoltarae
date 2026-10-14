// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createWatchScheduler } from '../../electron/watchScheduler.js'

// 시작이 15초 걸리던 문제의 회귀 방지. 원인: 시작하자마자 폴더 감시기(chokidar)가 파일 4천여 개를 훑는 동안 화면이
// 같은 수의 파일을 하나씩 요청해서 서로 늦췄다(읽기만 0.4초, 감시기와 겹치면 10초). 감시기는 첫 색인이 끝난 뒤,
// 사용자가 잠깐 손을 뗀 틈에 켠다. 여기서는 그 "언제 켜는가" 규칙(가짜 시계)과 소스에서 직접 켜지 않는지를 지킨다.

// 가짜 시계: advance(ms) 만큼 시간을 보내며 때가 된 타이머를 순서대로 실행한다.
function fakeClock() {
  let time = 0
  let nextId = 1
  const timers = new Map()
  return {
    now: () => time,
    setTimer: (fn, ms) => {
      const id = nextId++
      timers.set(id, { at: time + ms, fn })
      return id
    },
    clearTimer: (id) => timers.delete(id),
    pending: () => timers.size,
    advance(ms) {
      const end = time + ms
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0]
        if (!due) break
        timers.delete(due[0])
        time = due[1].at
        due[1].fn()
      }
      time = end
    },
  }
}

function make(options = {}) {
  const clock = fakeClock()
  const started = []
  const scheduler = createWatchScheduler({
    start: (p) => started.push({ path: p, at: clock.now() }),
    idleMs: 3000,
    maxWaitMs: 20000,
    now: clock.now,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    ...options,
  })
  return { clock, started, scheduler }
}

describe('감시기 시작 시점', () => {
  it('요청해도 바로 켜지 않는다 (색인 읽기와 겹치지 않게)', () => {
    const { started, scheduler } = make()
    scheduler.request('D:/ws')
    expect(started).toEqual([])
  })

  it('입력이 없으면 요청한 지 idleMs 뒤에 켠다', () => {
    const { clock, started, scheduler } = make()
    scheduler.request('D:/ws')
    clock.advance(2999)
    expect(started).toEqual([])
    clock.advance(1)
    expect(started).toEqual([{ path: 'D:/ws', at: 3000 }])
  })

  it('입력이 있으면 마지막 입력에서 idleMs 가 지난 뒤로 미룬다', () => {
    const { clock, started, scheduler } = make()
    scheduler.request('D:/ws')
    clock.advance(2000)
    scheduler.touch()
    clock.advance(2999)
    expect(started).toEqual([])
    clock.advance(1)
    expect(started).toEqual([{ path: 'D:/ws', at: 5000 }])
  })

  it('계속 입력해도 maxWaitMs 가 지나면 켠다 (영영 안 켜지는 일을 막음)', () => {
    const { clock, started, scheduler } = make()
    scheduler.request('D:/ws')
    for (let i = 0; i < 40; i++) {
      clock.advance(1000)
      scheduler.touch()
    }
    expect(started).toEqual([{ path: 'D:/ws', at: 20000 }])
  })

  it('요청 전의 입력은 대기 시간에 영향이 없다 (요청 시각부터 센다)', () => {
    const { clock, started, scheduler } = make()
    clock.advance(1000)
    scheduler.touch()
    clock.advance(10000)
    scheduler.request('D:/ws')
    clock.advance(3000)
    expect(started).toEqual([{ path: 'D:/ws', at: 14000 }])
  })

  it('한 번 켠 뒤에는 다시 켜지 않는다', () => {
    const { clock, started, scheduler } = make()
    scheduler.request('D:/ws')
    clock.advance(10000)
    scheduler.touch()
    clock.advance(10000)
    expect(started).toHaveLength(1)
    expect(clock.pending()).toBe(0)
  })

  it('대기 중에 다시 요청하면 마지막 경로로 한 번만 켠다', () => {
    const { clock, started, scheduler } = make()
    scheduler.request('D:/a')
    clock.advance(1000)
    scheduler.request('D:/b')
    clock.advance(2999)
    expect(started).toEqual([])
    clock.advance(1)
    expect(started).toEqual([{ path: 'D:/b', at: 4000 }])
  })

  it('maxWaitMs 는 처음 요청 시각이 아니라 마지막 요청 시각부터 센다', () => {
    const { clock, started, scheduler } = make()
    scheduler.request('D:/a')
    for (let i = 0; i < 15; i++) {
      clock.advance(1000)
      scheduler.touch()
    }
    scheduler.request('D:/b')
    for (let i = 0; i < 19; i++) {
      clock.advance(1000)
      scheduler.touch()
    }
    expect(started).toEqual([])
    clock.advance(1000)
    expect(started).toEqual([{ path: 'D:/b', at: 35000 }])
  })

  it('cancel 하면 켜지 않는다', () => {
    const { clock, started, scheduler } = make()
    scheduler.request('D:/ws')
    scheduler.cancel()
    clock.advance(60000)
    expect(started).toEqual([])
    expect(clock.pending()).toBe(0)
  })

  it('대기 중이 아닐 때의 touch 와 cancel 은 아무 일도 하지 않는다', () => {
    const { clock, started, scheduler } = make()
    scheduler.touch()
    scheduler.cancel()
    clock.advance(60000)
    expect(started).toEqual([])
    expect(clock.pending()).toBe(0)
  })

  it('켠 뒤에 새로 요청하면 다시 기다렸다가 켠다 (폴더 이름 바꾸기 뒤 등)', () => {
    const { clock, started, scheduler } = make()
    scheduler.request('D:/ws')
    clock.advance(3000)
    scheduler.request('D:/ws')
    clock.advance(2999)
    expect(started).toHaveLength(1)
    clock.advance(1)
    expect(started).toHaveLength(2)
  })
})

describe('소스 점검: 시작 경로에서 감시기를 바로 켜지 않는다', () => {
  const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')
  const main = read('electron/main.js')

  function handlerBody(channel) {
    const start = main.indexOf(`ipcMain.handle('${channel}'`)
    expect(start, channel).toBeGreaterThan(-1)
    const next = main.indexOf('ipcMain.handle(', start + 10)
    return main.slice(start, next === -1 ? undefined : next)
  }

  it('워크스페이스를 고르거나 마지막 것을 불러오는 처리는 startWatching 을 직접 부르지 않는다', () => {
    expect(handlerBody('workspace:choose')).not.toMatch(/startWatching\(/)
    expect(handlerBody('workspace:getLast')).not.toMatch(/startWatching\(/)
  })

  it('삭제·이름 변경·이동 뒤에도 startWatching 을 직접 부르지 않고 예약한다', () => {
    for (const channel of ['file:delete', 'file:rename', 'file:move']) {
      const body = handlerBody(channel)
      expect(body, channel).not.toMatch(/startWatching\(/)
      expect(body, channel).toMatch(/watchScheduler\.request\(/)
    }
  })

  it('화면의 첫 색인이 끝나면 감시 시작을 요청하는 IPC 가 있다', () => {
    expect(handlerBody('workspace:watch')).toMatch(/watchScheduler\.request\(/)
    expect(read('electron/preload.cjs')).toContain("ipcRenderer.invoke('workspace:watch'")
  })

  it('창의 입력(키보드·마우스)이 스케줄러에 전달된다', () => {
    expect(main).toMatch(/webContents\.on\('input-event'[\s\S]{0,80}watchScheduler\.touch\(\)/)
    expect(main).toMatch(/webContents\.on\('before-input-event'[\s\S]{0,80}watchScheduler\.touch\(\)/)
  })

  it('스토어가 첫 색인이 끝난 뒤에 watchWorkspace 를 부른다', () => {
    const store = read('src/store/useAppStore.js')
    const load = store.slice(store.indexOf('async loadWorkspace('), store.indexOf('async refreshTree('))
    const rebuild = load.indexOf('await get().rebuildIndexes()')
    const watch = load.indexOf('api.watchWorkspace')
    expect(rebuild).toBeGreaterThan(-1)
    expect(watch).toBeGreaterThan(rebuild)
  })
})
