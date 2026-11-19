// Copyright (c) dendr000. MIT License.
import { EventEmitter } from 'node:events'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { createWatchIgnore } from '../../electron/watchIgnore.js'
import { createWatchProcess } from '../../electron/watchProcess.js'

// 감시기 멈춤의 회귀 방지. 원인: 문서 1만 개 작업 폴더에서 감시기(chokidar)가 메인 프로세스 안에서 폴더를 훑는 동안
// 메인이 막혀 입력·자동 저장이 최대 18초 멈췄다. 감시기를 별도 프로세스로 옮겨 메인이 막히지 않게 한다.
// 여기서는 (1) 무엇을 감시에서 뺄지 규칙, (2) 별도 프로세스를 켜고 끄는 래퍼, (3) 메인이 chokidar 를 직접 쓰지 않는지를 지킨다.

const WS = path.join(path.sep, 'ws')
const DIRS = ['.wikidesk-categories', '.wikidesk-dict']
const rel = (...parts) => path.join(WS, ...parts)

describe('감시 제외 규칙 (createWatchIgnore)', () => {
  const ignored = createWatchIgnore(WS, DIRS)

  it('보통 문서와 폴더는 감시한다', () => {
    expect(ignored(rel('문서.md'))).toBe(false)
    expect(ignored(rel('강의', '따즈아', '01.md'))).toBe(false)
    expect(ignored(WS)).toBe(false)
  })

  it('점으로 시작하는 파일·폴더는 뺀다', () => {
    expect(ignored(rel('.git'))).toBe(true)
    expect(ignored(rel('강의', '.cache', 'a.md'))).toBe(true)
    expect(ignored(rel('.hidden.md'))).toBe(true)
  })

  it('node_modules 는 뺀다', () => {
    expect(ignored(rel('node_modules', 'x', 'index.js'))).toBe(true)
  })

  it('내용을 담는 점 폴더(분류·사전 등)와 그 안은 감시한다', () => {
    expect(ignored(rel('.wikidesk-categories'))).toBe(false)
    expect(ignored(rel('.wikidesk-dict', '사전.txt'))).toBe(false)
  })

  it('이름만 비슷한 점 폴더는 뺀다', () => {
    expect(ignored(rel('.wikidesk-categories-old', 'a.md'))).toBe(true)
  })
})

// 가짜 자식 프로세스: postMessage 로 받은 것을 기록하고, kill 하면 exit 를 낸다.
function fakeChild({ exitOnKill = true } = {}) {
  const child = new EventEmitter()
  child.sent = []
  child.killed = 0
  child.postMessage = (m) => child.sent.push(m)
  child.kill = () => {
    child.killed++
    if (exitOnKill) queueMicrotask(() => child.emit('exit', 0))
    return true
  }
  return child
}

function make(options = {}) {
  const children = []
  const events = []
  const wp = createWatchProcess({
    fork: () => {
      const c = fakeChild(options.child)
      children.push(c)
      return c
    },
    onEvent: (eventType, p) => events.push([eventType, p]),
    exitTimeoutMs: 50,
  })
  return { wp, children, events }
}

describe('감시 프로세스 래퍼 (createWatchProcess)', () => {
  it('start 하면 프로세스를 하나 띄우고 시작 메시지를 보낸다', () => {
    const { wp, children } = make()
    wp.start('D:/ws', DIRS)
    expect(children).toHaveLength(1)
    expect(children[0].sent).toEqual([{ type: 'start', workspacePath: 'D:/ws', contentDirs: DIRS }])
  })

  it('자식이 보낸 이벤트를 onEvent 로 전달한다', () => {
    const { wp, children, events } = make()
    wp.start('D:/ws', DIRS)
    children[0].emit('message', { type: 'event', eventType: 'change', path: 'D:/ws/a.md' })
    expect(events).toEqual([['change', 'D:/ws/a.md']])
  })

  it('이벤트가 아닌 메시지나 빈 메시지는 무시한다', () => {
    const { wp, children, events } = make()
    wp.start('D:/ws', DIRS)
    children[0].emit('message', { type: 'ready' })
    children[0].emit('message', null)
    children[0].emit('message', undefined)
    expect(events).toEqual([])
  })

  it('다시 start 하면 옛 프로세스를 끄고 새로 띄운다', () => {
    const { wp, children } = make()
    wp.start('D:/a', DIRS)
    wp.start('D:/b', DIRS)
    expect(children).toHaveLength(2)
    expect(children[0].killed).toBe(1)
    expect(children[1].killed).toBe(0)
  })

  it('끈 옛 프로세스의 늦은 이벤트는 버린다', () => {
    const { wp, children, events } = make()
    wp.start('D:/a', DIRS)
    wp.start('D:/b', DIRS)
    children[0].emit('message', { type: 'event', eventType: 'add', path: 'D:/a/x.md' })
    expect(events).toEqual([])
  })

  it('stop 은 프로세스가 완전히 끝난 뒤에 끝난다', async () => {
    const { wp, children } = make()
    wp.start('D:/ws', DIRS)
    await wp.stop()
    expect(children[0].killed).toBe(1)
    expect(wp.isRunning()).toBe(false)
  })

  it('stop 은 켜져 있지 않아도 안전하다', async () => {
    const { wp } = make()
    await expect(wp.stop()).resolves.toBeUndefined()
  })

  it('프로세스가 끝났다는 알림이 안 와도 제한 시간 뒤에는 stop 이 끝난다', async () => {
    const { wp } = make({ child: { exitOnKill: false } })
    wp.start('D:/ws', DIRS)
    await expect(wp.stop()).resolves.toBeUndefined()
  })

  it('저절로 죽으면 실행 중이 아닌 것으로 본다', () => {
    const { wp, children } = make()
    wp.start('D:/ws', DIRS)
    children[0].emit('exit', 1)
    expect(wp.isRunning()).toBe(false)
  })

  it('자식이 저절로 죽으면 onExit 으로 알린다 (stop 으로 끈 것은 알리지 않는다)', async () => {
    const onExit = vi.fn()
    const children = []
    const wp = createWatchProcess({ fork: () => { const c = fakeChild(); children.push(c); return c }, onEvent() {}, onExit, exitTimeoutMs: 50 })
    wp.start('D:/ws', DIRS)
    children[0].emit('exit', 3)
    expect(onExit).toHaveBeenCalledWith(3)
    wp.start('D:/ws', DIRS)
    await wp.stop()
    expect(onExit).toHaveBeenCalledTimes(1)
  })
})

describe('소스 점검: 메인 프로세스는 chokidar 를 직접 쓰지 않는다', () => {
  const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')

  it('main.js 는 chokidar 를 가져오지 않고 별도 프로세스(utilityProcess)로 감시기를 띄운다', () => {
    const main = read('electron/main.js')
    expect(main).not.toMatch(/from 'chokidar'/)
    expect(main).toMatch(/utilityProcess\.fork\(/)
    expect(main).toMatch(/createWatchProcess\(/)
  })

  it('감시 작업 파일이 chokidar 를 쓰고, 부모 포트로 이벤트를 보낸다', () => {
    const worker = read('electron/watchWorker.js')
    expect(worker).toMatch(/from 'chokidar'/)
    expect(worker).toContain('parentPort')
    expect(worker).toMatch(/type: 'event'/)
  })
})
