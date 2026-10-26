// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { freshStore } from '../helpers/store.js'
import { SNIPPET_PROGRESS_MIN, SNIPPET_PROGRESS_STEP, isProgressTick, shouldShowSnippetLoad, snippetLoadPercent } from '../../src/lib/snippetLoad.js'

// 상용구를 불러오는 동안 헤더의 "저장됨" 옆에 보이는 진행 표시. 계산(순수 함수), 스토어가 진행 상황을 알리는 방식, 헤더 구조를 시험한다.
const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')

describe('shouldShowSnippetLoad', () => {
  it('기준 개수 이상일 때만 켠다', () => {
    expect(shouldShowSnippetLoad(SNIPPET_PROGRESS_MIN)).toBe(true)
    expect(shouldShowSnippetLoad(SNIPPET_PROGRESS_MIN + 1)).toBe(true)
    expect(shouldShowSnippetLoad(6262)).toBe(true)
    expect(shouldShowSnippetLoad(SNIPPET_PROGRESS_MIN - 1)).toBe(false)
    expect(shouldShowSnippetLoad(0)).toBe(false)
  })

  it('숫자가 아닌 값은 켜지 않는다', () => {
    expect(shouldShowSnippetLoad(undefined)).toBe(false)
    expect(shouldShowSnippetLoad(NaN)).toBe(false)
    expect(shouldShowSnippetLoad('500')).toBe(false)
  })
})

describe('snippetLoadPercent', () => {
  it('done/total 의 백분율(내림, 0~100)이다', () => {
    expect(snippetLoadPercent({ done: 0, total: 200 })).toBe(0)
    expect(snippetLoadPercent({ done: 50, total: 200 })).toBe(25)
    expect(snippetLoadPercent({ done: 199, total: 200 })).toBe(99)
    expect(snippetLoadPercent({ done: 200, total: 200 })).toBe(100)
  })

  it('넘치거나 모자라는 값은 0~100 안으로 맞춘다', () => {
    expect(snippetLoadPercent({ done: 300, total: 200 })).toBe(100)
    expect(snippetLoadPercent({ done: -5, total: 200 })).toBe(0)
  })

  it('없거나 잘못된 값은 0 이다', () => {
    expect(snippetLoadPercent(null)).toBe(0)
    expect(snippetLoadPercent(undefined)).toBe(0)
    expect(snippetLoadPercent({ done: 5, total: 0 })).toBe(0)
    expect(snippetLoadPercent({ done: NaN, total: 10 })).toBe(0)
    expect(snippetLoadPercent({ done: 5, total: NaN })).toBe(0)
  })
})

describe('isProgressTick', () => {
  it('STEP 개마다 true 이다', () => {
    expect(isProgressTick(SNIPPET_PROGRESS_STEP)).toBe(true)
    expect(isProgressTick(SNIPPET_PROGRESS_STEP * 2)).toBe(true)
    expect(isProgressTick(SNIPPET_PROGRESS_STEP - 1)).toBe(false)
    expect(isProgressTick(SNIPPET_PROGRESS_STEP + 1)).toBe(false)
  })

  it('0 은 true 가 아니다', () => {
    expect(isProgressTick(0)).toBe(false)
  })
})

describe('스토어의 snippetLoad', () => {
  const makeItems = (count) => Array.from({ length: count }, (_, i) => ({ category: '묶음', title: `제목${i}`, path: `/mock/snip/${i}.md` }))

  async function observe(count, { failOn } = {}) {
    const { state, store, api } = await freshStore()
    api.scanSnippets = async () => makeItems(count)
    const baseRead = api.readFile
    api.readFile = async (filePath) => {
      if (filePath.startsWith('/mock/snip/')) {
        if (failOn !== undefined && filePath === `/mock/snip/${failOn}.md`) throw new Error('읽기 실패')
        return `본문 ${filePath}`
      }
      return baseRead(filePath)
    }
    const seen = []
    const unsubscribe = store.subscribe((s, prev) => {
      if (s.snippetLoad !== prev.snippetLoad) seen.push(s.snippetLoad)
    })
    await state().rebuildIndexes()
    unsubscribe()
    return { seen, state }
  }

  it('처음에는 null 이다', async () => {
    const { state } = await freshStore()
    expect(state().snippetLoad).toBeNull()
  })

  it('상용구가 많으면 0 에서 시작해 STEP 마다 진행 상황을 알리고 끝나면 null 로 돌아온다', async () => {
    const { seen, state } = await observe(120)
    expect(seen[0]).toEqual({ done: 0, total: 120 })
    expect(seen).toContainEqual({ done: 50, total: 120 })
    expect(seen).toContainEqual({ done: 100, total: 120 })
    expect(seen.at(-1)).toBeNull()
    expect(state().snippetLoad).toBeNull()
  })

  it('진행 상황의 done 은 줄어들지 않는다', async () => {
    const { seen } = await observe(260)
    const dones = seen.filter(Boolean).map((p) => p.done)
    expect([...dones].sort((a, b) => a - b)).toEqual(dones)
    expect(Math.max(...dones)).toBe(250)
  })

  it('상용구가 적으면 진행 표시를 한 번도 켜지 않는다', async () => {
    const { seen } = await observe(SNIPPET_PROGRESS_MIN - 1)
    expect(seen).toEqual([])
  })

  it('그래도 상용구는 다 불러온다', async () => {
    const { state } = await observe(120)
    expect(Object.keys(state().snippetIndex)).toHaveLength(120)
  })

  it('파일 하나를 못 읽어도(건너뜀) 끝까지 불러오고 표시는 꺼진다', async () => {
    const { seen, state } = await observe(120, { failOn: 7 })
    expect(Object.keys(state().snippetIndex)).toHaveLength(119)
    expect(seen.at(-1)).toBeNull()
    expect(state().snippetLoad).toBeNull()
  })
})

describe('헤더의 진행 표시 (소스 점검)', () => {
  const header = read('src/components/EditorHeader.jsx')
  const css = read('src/App.css')
  const store = read('src/store/useAppStore.js')

  it('"저장됨" 표시 바로 앞에 있고, 불러오는 중일 때만 나온다', () => {
    const load = header.indexOf('{snippetLoad && (')
    const save = header.indexOf('className={`save-status save-status-')
    expect(load).toBeGreaterThan(0)
    expect(save).toBeGreaterThan(load)
  })

  it('돌아가는 동그라미, 몇 개째인지, 게이지바를 모두 보여 준다', () => {
    expect(header).toContain('snippet-load-spinner')
    expect(header).toMatch(/상용구 \{formatCount\(snippetLoad\.done\)\}\/\{formatCount\(snippetLoad\.total\)\}/)
    expect(header).toMatch(/snippet-load-bar-fill[\s\S]{0,80}width: `\$\{snippetLoadPercent\(snippetLoad\)\}%`/)
  })

  it('스크린 리더에는 상태(role=status)로 알리고 장식은 숨긴다', () => {
    expect(header).toMatch(/className="snippet-load"\s*role="status"/)
    expect(header).toMatch(/snippet-load-spinner" aria-hidden="true"/)
  })

  it('동그라미는 계속 돈다(회전 애니메이션)', () => {
    expect(css).toMatch(/\.snippet-load-spinner\s*\{[^}]*animation:\s*snippet-load-spin[^}]*infinite/)
    expect(css).toMatch(/@keyframes snippet-load-spin\s*\{\s*to\s*\{\s*transform:\s*rotate\(360deg\)/)
  })

  it('색은 한 곳의 색 변수를 쓴다(라이트·다크 모두)', () => {
    const block = css.slice(css.indexOf('.snippet-load {'), css.indexOf('@keyframes snippet-load-spin'))
    expect(block).toContain('var(--accent)')
    expect(block).toContain('var(--accent-bg)')
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
  })

  it('스토어는 불러오기가 실패해도 표시를 끄도록 finally 에서 null 로 돌린다', () => {
    expect(store).toMatch(/\} finally \{\s*if \(show\) useAppStore\.setState\(\{ snippetLoad: null \}\)/)
  })
})
