// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DEFAULT_MODE, modeForDocFields } from '../../src/lib/viewMode.js'
import { ROOT, freshStore } from '../helpers/store.js'

// 앱을 켰을 때 화면 모드의 기본값은 편집(focus)이다(예전에는 듀얼). 다만 아직 없는 분류·자료·틀을 열었을 때는 "만들기" 단추가 뷰어(오른쪽)에만
// 있어서, 편집 모드에서는 그 단추가 보이지 않는다. 그때만 자동으로 듀얼로 바꾼다.

describe('기본 화면 모드', () => {
  it('기본값은 편집(focus)이다', () => {
    expect(DEFAULT_MODE).toBe('focus')
  })

  it('앱을 켜면(스토어 시작값) 편집 모드다', async () => {
    const { state } = await freshStore()
    expect(state().mode).toBe('focus')
  })

  it('문서를 열어도 모드는 바뀌지 않는다 (편집 그대로)', async () => {
    const { state } = await freshStore()
    await state().createDoc(`${ROOT}/만화`, '문서A')
    expect(state().openPath).toBeTruthy()
    expect(state().mode).toBe('focus')
  })

  it('사용자가 고른 모드는 문서를 열어도 유지된다 (뷰어·듀얼)', async () => {
    for (const chosen of ['preview', 'dual']) {
      const { state } = await freshStore()
      state().setMode(chosen)
      await state().createDoc(`${ROOT}/만화`, '문서A')
      expect(state().mode).toBe(chosen)
    }
  })
})

describe('modeForDocFields: 뷰어에만 있는 화면이면 듀얼로', () => {
  const noPage = { openPath: null, viewingCategory: '분류', viewingData: null, viewingTemplate: null }

  it('편집 모드에서 페이지 없는 분류·자료·틀을 열면 듀얼이다', () => {
    expect(modeForDocFields('focus', noPage)).toBe('dual')
    expect(modeForDocFields('focus', { ...noPage, viewingCategory: null, viewingData: { type: 't', name: 'n' } })).toBe('dual')
    expect(modeForDocFields('focus', { ...noPage, viewingCategory: null, viewingTemplate: '틀' })).toBe('dual')
  })

  it('이미 뷰어·듀얼이면 그대로다', () => {
    expect(modeForDocFields('preview', noPage)).toBe('preview')
    expect(modeForDocFields('dual', noPage)).toBe('dual')
  })

  it('페이지가 있으면(openPath 가 있으면) 편집 모드 그대로다 — 편집할 문서가 있으니까', () => {
    expect(modeForDocFields('focus', { ...noPage, openPath: '/a.md' })).toBe('focus')
  })

  it('보통 문서이거나 문서가 없는 빈 화면이면 그대로다', () => {
    expect(modeForDocFields('focus', { openPath: '/a.md', viewingCategory: null, viewingData: null, viewingTemplate: null })).toBe('focus')
    expect(modeForDocFields('focus', { openPath: null, viewingCategory: null, viewingData: null, viewingTemplate: null })).toBe('focus')
  })

  it('화면 값이 들어 있지 않은 변경(탭 목록만 바뀜 등)은 건드리지 않는다', () => {
    expect(modeForDocFields('focus', { tabs: [] })).toBe('focus')
    expect(modeForDocFields('focus', {})).toBe('focus')
  })
})

describe('스토어: 페이지 없는 분류·자료·틀을 열면 듀얼로 바뀐다', () => {
  it('없는 분류를 열면 편집에서 듀얼로 (만들기 단추가 보이게)', async () => {
    const { state } = await freshStore()
    expect(state().mode).toBe('focus')
    await state().openCategory('없는분류')
    expect(state().viewingCategory).toBe('없는분류')
    expect(state().openPath).toBeNull()
    expect(state().mode).toBe('dual')
  })

  it('없는 자료를 열면 듀얼로', async () => {
    const { state } = await freshStore()
    await state().openDataEntry('기술', '없는자료')
    expect(state().viewingData).toEqual({ type: '기술', name: '없는자료' })
    expect(state().mode).toBe('dual')
  })

  it('없는 틀을 열면 듀얼로', async () => {
    const { state } = await freshStore()
    await state().openTemplate('없는틀')
    expect(state().viewingTemplate).toBe('없는틀')
    expect(state().mode).toBe('dual')
  })

  it('페이지를 만든 분류는 편집 모드 그대로 열린다', async () => {
    const { state } = await freshStore()
    await state().createCategoryPage('있는분류')
    expect(state().openPath).toBeTruthy()
    expect(state().mode).toBe('focus')
    await state().createDoc(`${ROOT}/만화`, '다른문서')
    await state().openCategory('있는분류')
    expect(state().viewingCategory).toBe('있는분류')
    expect(state().openPath).toBeTruthy()
    expect(state().mode).toBe('focus')
  })

  it('뷰어로 골라 둔 모드는 없는 분류를 열어도 뷰어다', async () => {
    const { state } = await freshStore()
    state().setMode('preview')
    await state().openCategory('없는분류')
    expect(state().mode).toBe('preview')
  })

  it('탭을 전환해서 페이지 없는 분류 탭으로 가도 듀얼로 바뀐다', async () => {
    const { state } = await freshStore()
    await state().openCategory('없는분류')
    const missingTab = state().tabs.find((t) => t.viewingCategory === '없는분류')
    expect(missingTab).toBeDefined()
    await state().createDoc(`${ROOT}/만화`, '문서A')
    state().setMode('focus') // 문서 편집 중
    await state().switchTab(missingTab.id)
    expect(state().viewingCategory).toBe('없는분류')
    expect(state().mode).toBe('dual')
  })

  it('탭을 닫아서 페이지 없는 분류 탭이 보이게 되어도 듀얼로 바뀐다', async () => {
    const { state } = await freshStore()
    await state().openCategory('없는분류')
    await state().createDoc(`${ROOT}/만화`, '문서A')
    state().setMode('focus')
    const docTab = state().tabs.find((t) => t.openPath)
    await state().closeTab(docTab.id)
    expect(state().viewingCategory).toBe('없는분류')
    expect(state().mode).toBe('dual')
  })

  it('보통 문서 탭으로 전환해도 모드는 그대로다', async () => {
    const { state } = await freshStore()
    await state().createDoc(`${ROOT}/만화`, '문서A')
    await state().createDoc(`${ROOT}/만화`, '문서B')
    const [tabA] = state().tabs
    await state().switchTab(tabA.id)
    expect(state().mode).toBe('focus')
  })
})

describe('소스 점검', () => {
  const store = readFileSync(new URL('../../src/store/useAppStore.js', import.meta.url), 'utf8')

  it('스토어의 시작 모드는 DEFAULT_MODE 를 쓴다', () => {
    expect(store).toMatch(/mode: DEFAULT_MODE,/)
  })

  it('문서 화면 값을 바꾸는 세 경로(showInTab·switchTab·탭 닫기)가 같은 규칙(withViewerIfNeeded)을 거친다', () => {
    expect((store.match(/withViewerIfNeeded\(/g) ?? []).length).toBeGreaterThanOrEqual(6) // 정의 1 + showInTab 1 + switchTab 1 + 탭 닫기 3
  })
})
