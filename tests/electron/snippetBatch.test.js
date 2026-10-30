// Copyright (c) dendr000. MIT License.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readManyFiles } from '../../electron/fileSystem.js'
import { SNIPPET_CHUNK_SIZE, loadSnippetEntries } from '../../src/lib/snippetLoad.js'
import { freshStore } from '../helpers/store.js'

// 상용구 수천 개를 파일마다 IPC 로 읽으면 메인 프로세스가 계속 바빠 창이 "응답 없음"이 되고, 한꺼번에 읽으면 그동안 통째로 멈춘다 —
// 화면이 100개 안팎씩 나눠 한 번의 IPC 로 읽고, 나눌 때마다 숨을 쉰다.
const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')

let root
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'gyeol-batch-'))
})
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('readManyFiles (메인: 실제 파일)', () => {
  it('경로 순서대로 글을 돌려준다', () => {
    const a = path.join(root, 'a.md')
    const b = path.join(root, 'b.md')
    fs.writeFileSync(a, '본문 에이')
    fs.writeFileSync(b, '본문 비')
    expect(readManyFiles([b, a])).toEqual(['본문 비', '본문 에이'])
  })

  it('못 읽는 파일은 null 로 두고 나머지는 계속 읽는다(순서 유지)', () => {
    const a = path.join(root, 'a.md')
    fs.writeFileSync(a, 'ok')
    expect(readManyFiles([path.join(root, '없는파일.md'), a])).toEqual([null, 'ok'])
  })

  it('빈 파일은 빈 글(\'\')로 읽는다(못 읽은 null 과 구분)', () => {
    const a = path.join(root, 'empty.md')
    fs.writeFileSync(a, '')
    expect(readManyFiles([a])).toEqual([''])
  })

  it('빈 목록은 빈 목록이다', () => {
    expect(readManyFiles([])).toEqual([])
  })
})

describe('loadSnippetEntries (chunk 로 나눠 읽기)', () => {
  const makeItems = (n) => Array.from({ length: n }, (_, i) => ({ category: 'A', title: `t${i}`, path: `/p/${i}.md` }))
  const okRead = (calls) => async (paths) => {
    calls.push(paths.length)
    return paths.map((p) => `본문 ${p}`)
  }

  it('기본은 100개씩 나눠 읽는다', async () => {
    expect(SNIPPET_CHUNK_SIZE).toBe(100)
    const calls = []
    const index = await loadSnippetEntries({ readFiles: okRead(calls), items: makeItems(250) })
    expect(calls).toEqual([100, 100, 50])
    expect(Object.keys(index)).toHaveLength(250)
  })

  it('나눌 크기를 바꿀 수 있다', async () => {
    const calls = []
    await loadSnippetEntries({ readFiles: okRead(calls), items: makeItems(7), chunkSize: 3 })
    expect(calls).toEqual([3, 3, 1])
  })

  it('"폴더/제목" 키로 본문과 순서 위치(rank)를 담는다', async () => {
    const index = await loadSnippetEntries({
      readFiles: async (paths) => paths.map(() => '본문'),
      items: [
        { category: 'A', title: 'x', path: '/p/x.md' },
        { category: 'A', title: 'y', path: '/p/y.md' },
      ],
      orderTexts: { A: 'y\nx' },
    })
    expect(index['A/x']).toMatchObject({ category: 'A', title: 'x', path: '/p/x.md', content: '본문' })
    expect(index['A/y'].rank).toBeLessThan(index['A/x'].rank)
  })

  it('못 읽은 파일(null)은 건너뛴다', async () => {
    const index = await loadSnippetEntries({
      readFiles: async () => ['있음', null, ''],
      items: ['a', 'b', 'c'].map((t) => ({ category: 'A', title: t, path: `/p/${t}.md` })),
    })
    expect(Object.keys(index)).toEqual(['A/a', 'A/c'])
    expect(index['A/c'].content).toBe('')
  })

  it('chunk 를 읽을 때마다 읽은 개수를 알린다', async () => {
    const seen = []
    await loadSnippetEntries({ readFiles: okRead([]), items: makeItems(250), onProgress: (n) => seen.push(n) })
    expect(seen).toEqual([100, 200, 250])
  })

  it('chunk 사이마다 yieldFn 을 기다린다(창이 숨 쉬게)', async () => {
    const order = []
    await loadSnippetEntries({
      readFiles: async (paths) => {
        order.push('read')
        return paths.map(() => 'x')
      },
      items: makeItems(250),
      yieldFn: async () => {
        order.push('yield')
      },
    })
    expect(order).toEqual(['read', 'yield', 'read', 'yield', 'read', 'yield'])
  })

  it('shouldCancel 이 true 가 되면 중단하고 null 을 돌려준다(그 뒤 chunk 는 읽지 않는다)', async () => {
    const calls = []
    let cancel = false
    const result = await loadSnippetEntries({
      readFiles: async (paths) => {
        calls.push(paths.length)
        cancel = true
        return paths.map(() => 'x')
      },
      items: makeItems(250),
      shouldCancel: () => cancel,
    })
    expect(result).toBeNull()
    expect(calls).toEqual([100])
  })

  it('마지막 chunk 를 읽고 나서 취소돼도 null 이다(옛 결과를 새 결과 위에 쓰지 않게)', async () => {
    let cancel = false
    const result = await loadSnippetEntries({
      readFiles: async (paths) => {
        cancel = true
        return paths.map(() => 'x')
      },
      items: makeItems(5),
      shouldCancel: () => cancel,
    })
    expect(result).toBeNull()
  })

  it('항목이 없으면 읽지 않고 빈 색인이다', async () => {
    const readFiles = vi.fn()
    expect(await loadSnippetEntries({ readFiles, items: [] })).toEqual({})
    expect(readFiles).not.toHaveBeenCalled()
  })
})

describe('스토어와 연결', () => {
  async function setup(disabled = []) {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(disabled), setItem: () => {}, removeItem: () => {} })
    const { state, api, store } = await freshStore()
    const scan = Array.from({ length: 250 }, (_, i) => ({ category: i < 100 ? 'SQL' : 'Py', title: `t${i}`, path: `/p/${i}.md` }))
    api.scanSnippets = async () => scan
    const batches = []
    api.readFiles = async (paths) => {
      batches.push(paths.length)
      return paths.map((p) => `본문 ${p}`)
    }
    return { state, api, batches, store }
  }

  it('상용구를 읽을 때 IPC 한 번에 100개씩 일괄로 읽는다(파일마다 읽지 않음)', async () => {
    const { state, api, batches } = await setup()
    const singles = []
    const baseRead = api.readFile
    api.readFile = async (p) => {
      if (p.startsWith('/p/')) singles.push(p)
      return baseRead(p)
    }
    await state().rebuildIndexes()
    expect(batches).toEqual([100, 100, 50])
    expect(singles).toEqual([])
    expect(Object.keys(state().snippetIndex)).toHaveLength(250)
  })

  it('읽지 않기로 한 폴더는 읽을 목록에서 빠진다', async () => {
    const { state, batches } = await setup(['SQL'])
    await state().rebuildIndexes()
    expect(batches).toEqual([100, 50])
    expect(Object.keys(state().snippetIndex).some((key) => key.startsWith('SQL/'))).toBe(false)
    expect(state().snippetFolders.map((f) => f.name).sort()).toEqual(['Py', 'SQL'])
  })

  it("옵션 snippets: 'keep' 이면 상용구를 다시 읽지 않고 그대로 둔다(저장할 때마다 수천 개를 다시 읽지 않음)", async () => {
    const { state, batches } = await setup()
    await state().rebuildIndexes()
    const before = state().snippetIndex
    batches.length = 0
    await state().rebuildIndexes({ snippets: 'keep' })
    expect(batches).toEqual([])
    expect(state().snippetIndex).toBe(before)
  })

  it('상용구를 뺀 나머지 색인은 상용구 읽기가 끝나기 전에 먼저 내보낸다', async () => {
    const { state, api, store } = await setup()
    await api.writeFile('/mock/workspace/문서.md', '[[분류:먼저]] 내용')
    await state().loadWorkspace('/mock/workspace')
    store.setState({ snippetIndex: {} })
    let docsReadyWhileSnippetsPending = null
    api.readFiles = async (paths) => {
      if (docsReadyWhileSnippetsPending === null) {
        docsReadyWhileSnippetsPending = Object.keys(state().searchIndex).length > 0 && Object.keys(state().snippetIndex).length === 0
      }
      return paths.map(() => '본문')
    }
    await state().rebuildIndexes()
    expect(docsReadyWhileSnippetsPending).toBe(true)
  })

  it('더 새로운 불러오기가 시작되면 옛 불러오기 결과는 버린다', async () => {
    const { state, api } = await setup()
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    let signalEntered
    const entered = new Promise((resolve) => {
      signalEntered = resolve
    })
    let first = true
    api.readFiles = async (paths) => {
      if (first) {
        first = false
        signalEntered()
        await gate
        return paths.map(() => '옛 본문')
      }
      return paths.map(() => '새 본문')
    }
    const older = state().rebuildIndexes()
    await entered // 옛 불러오기가 첫 chunk 를 읽는 중에
    const newer = state().rebuildIndexes() // 새 불러오기가 시작되고 끝까지 간다
    await newer
    expect(Object.keys(state().snippetIndex)).toHaveLength(250)
    release() // 이제 옛 불러오기가 풀려난다
    await older
    const contents = new Set(Object.values(state().snippetIndex).map((entry) => entry.content))
    expect(contents.has('옛 본문')).toBe(false)
    expect(Object.keys(state().snippetIndex)).toHaveLength(250)
  })

  it('폴더를 다시 켜는 불러오기도 더 새로운 불러오기가 시작되면 결과를 버린다', async () => {
    const { state, api } = await setup(['SQL'])
    await state().rebuildIndexes()
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    let signalEntered
    const entered = new Promise((resolve) => {
      signalEntered = resolve
    })
    let first = true
    api.readFiles = async (paths) => {
      if (first) {
        first = false
        signalEntered()
        await gate
        return paths.map(() => '옛 본문')
      }
      return paths.map(() => '새 본문')
    }
    const enabling = state().setSnippetFolderEnabled('SQL', true)
    await entered
    await state().rebuildIndexes() // SQL 이 이미 켜진 상태에서 새로 처음부터 읽는다
    release()
    await enabling
    const contents = new Set(Object.values(state().snippetIndex).map((entry) => entry.content))
    expect(contents.has('옛 본문')).toBe(false)
  })

  it('끈 폴더를 다시 켤 때는 그 폴더 파일만 일괄로 읽는다', async () => {
    const { state, batches } = await setup(['SQL'])
    await state().rebuildIndexes()
    batches.length = 0
    await state().setSnippetFolderEnabled('SQL', true)
    expect(batches).toEqual([100])
    expect(Object.keys(state().snippetIndex).filter((key) => key.startsWith('SQL/'))).toHaveLength(100)
  })

  it('일괄 읽기가 없는 옛 API 면 하나씩 읽는다', async () => {
    const { state, api } = await setup()
    api.readFiles = undefined
    const singles = []
    const baseRead = api.readFile
    api.readFile = async (p) => {
      if (p.startsWith('/p/')) {
        singles.push(p)
        return '본문'
      }
      return baseRead(p)
    }
    await state().rebuildIndexes()
    expect(singles).toHaveLength(250)
    expect(Object.keys(state().snippetIndex)).toHaveLength(250)
  })
})

describe('감시기 알림에서 상용구를 다시 읽을지', () => {
  const store = read('src/store/useAppStore.js')

  it('상용구 폴더(.wikidesk-snippets) 안의 경로만 상용구를 다시 읽게 표시한다(윈도·맥 경로 모두)', () => {
    expect(store).toMatch(/\/\[\\\\\/\]\\\.wikidesk-snippets\(\[\\\\\/\]\|\$\)\//)
    expect(store).toMatch(/if \(isSnippetPath\(event\?\.path\)\) watchSnippetsDirty = true/)
  })

  it('그 밖의 변화(문서 저장 등)에서는 상용구를 다시 읽지 않는다', () => {
    expect(store).toMatch(/rebuildIndexes\(\{ snippets: reloadSnippets \? 'reload' : 'keep' \}\)/)
  })

  it('메인·preload 가 같은 이름의 채널로 일괄 읽기를 노출한다', () => {
    expect(read('electron/main.js')).toMatch(/ipcMain\.handle\('files:readMany', \(_event, paths\) => \{\s*return readManyFiles\(paths\)/)
    expect(read('electron/preload.cjs')).toMatch(/readFiles: \(paths\) => ipcRenderer\.invoke\('files:readMany', paths\)/)
  })
})
