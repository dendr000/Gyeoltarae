// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { createSettingsMenu } from '../../electron/settingsMenu.js'
import { freshStore } from '../helpers/store.js'

// 메뉴 "설정" > "상용구 불러오기…": 상용구 창을 "폴더별 사용" 탭으로 연다(앱을 켤 때 읽을 상용구 폴더를 고르는 곳).
const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')

describe('설정 메뉴 항목: 상용구 불러오기…', () => {
  function make(onOpenSnippetLoad) {
    const menu = createSettingsMenu({ getSortFlip: () => false, onSortFlipChange: () => {}, onOpenSnippetLoad })
    return { item: menu.submenu.find((entry) => entry.label === '상용구 불러오기…'), menu }
  }

  it('"설정" 안에 있고 다른 항목은 그대로다', () => {
    const { item, menu } = make(() => {})
    expect(item).toBeDefined()
    expect(menu.submenu.some((entry) => entry.label === '단축키…')).toBe(true)
    expect(menu.submenu.some((entry) => entry.label === '돋보기 크기')).toBe(true)
    expect(menu.submenu.some((entry) => entry.label === '타자기 스크롤')).toBe(true)
  })

  it('누르면 onOpenSnippetLoad 를 부른다', () => {
    const open = vi.fn()
    make(open).item.click()
    expect(open).toHaveBeenCalledTimes(1)
  })

  it('콜백이 없어도 누를 때 오류가 나지 않는다', () => {
    const menu = createSettingsMenu({ getSortFlip: () => false, onSortFlipChange: () => {} })
    expect(() => menu.submenu.find((entry) => entry.label === '상용구 불러오기…').click()).not.toThrow()
  })
})

describe('상용구 창을 처음 보여 줄 탭', () => {
  it('기본은 등록·목록 탭이다', async () => {
    const { state } = await freshStore()
    state().openSnippetModal()
    expect(state().snippetModalOpen).toBe(true)
    expect(state().snippetModalInitialTab).toBe('snippets')
  })

  it("'folders' 로 열면 폴더별 사용 탭으로 시작한다", async () => {
    const { state } = await freshStore()
    state().openSnippetModal('', 'folders')
    expect(state().snippetModalInitialTab).toBe('folders')
  })

  it('알 수 없는 탭 이름은 등록·목록 탭으로 본다', async () => {
    const { state } = await freshStore()
    state().openSnippetModal('', 'nope')
    expect(state().snippetModalInitialTab).toBe('snippets')
  })

  it('다시 일반으로 열면 등록·목록 탭으로 돌아온다(이전 탭을 기억하지 않음)', async () => {
    const { state } = await freshStore()
    state().openSnippetModal('', 'folders')
    state().closeSnippetModal()
    state().openSnippetModal('본문')
    expect(state().snippetModalInitialTab).toBe('snippets')
  })
})

describe('연결 (소스 점검)', () => {
  it('메인·preload·화면이 같은 이름의 채널로 이어진다', () => {
    expect(read('electron/main.js')).toMatch(/onOpenSnippetLoad: \(\) => mainWindow\?\.webContents\.send\('menu:open-snippet-load'\)/)
    expect(read('electron/preload.cjs')).toMatch(/ipcRenderer\.on\('menu:open-snippet-load', listener\)/)
    expect(read('src/App.jsx')).toMatch(/onMenuOpenSnippetLoad\?\.\(\(\) => useAppStore\.getState\(\)\.openSnippetModal\('', 'folders'\)\)/)
  })

  it('상용구 창은 열릴 때의 처음 탭으로 시작한다', () => {
    expect(read('src/components/SnippetModal.jsx')).toMatch(/useState\(\(\) => useAppStore\.getState\(\)\.snippetModalInitialTab\)/)
  })
})
