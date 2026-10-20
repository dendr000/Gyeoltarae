// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createSettingsMenu } from '../../electron/settingsMenu.js'
import { createMockApi } from '../../src/lib/mockApi.js'

// 메뉴 "설정" > "단축키…": 누르면 화면(렌더러)에 알려서 단축키 설정 창을 연다. 메뉴는 메인 프로세스, 창은 렌더러에 있다.
const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')

describe('설정 메뉴 항목: 단축키…', () => {
  function make(onOpenShortcuts) {
    const menu = createSettingsMenu({ getSortFlip: () => false, onSortFlipChange: () => {}, onOpenShortcuts })
    return { menu, item: menu.submenu.find((entry) => entry.label === '단축키…') }
  }

  it('"설정" 안에 "단축키…" 항목이 있다 (맨 아래, 구분선 뒤)', () => {
    const { menu, item } = make(() => {})
    expect(item).toBeDefined()
    const last = menu.submenu[menu.submenu.length - 1]
    expect(last).toBe(item)
    expect(menu.submenu[menu.submenu.length - 2].type).toBe('separator')
  })

  it('누르면 onOpenShortcuts 를 부른다', () => {
    let count = 0
    const { item } = make(() => {
      count += 1
    })
    item.click()
    expect(count).toBe(1)
  })

  it('onOpenShortcuts 를 넘기지 않아도 메뉴가 만들어지고 눌러도 오류가 없다', () => {
    const { item } = make(undefined)
    expect(() => item.click()).not.toThrow()
  })

  it('앞의 항목(정렬 뒤집기·제목 강조·타자기 스크롤)은 그대로 있다', () => {
    const { menu } = make(() => {})
    expect(menu.submenu[0].label).toBe('정렬 뒤집기')
    expect(menu.submenu.some((entry) => entry.label === '제목 강조')).toBe(true)
    expect(menu.submenu.some((entry) => entry.label === '타자기 스크롤')).toBe(true)
  })
})

describe('소스 점검: 메인·preload·화면 연결', () => {
  it('메인이 메뉴를 누르면 렌더러에 menu:open-shortcuts 를 보낸다', () => {
    const main = read('electron/main.js')
    expect(main).toMatch(/onOpenShortcuts: \(\) => mainWindow\?\.webContents\.send\('menu:open-shortcuts'\)/)
  })

  it('preload 가 onMenuOpenShortcuts 로 같은 채널을 노출하고 구독 해제 함수를 돌려준다', () => {
    const preload = read('electron/preload.cjs')
    expect(preload).toContain('onMenuOpenShortcuts')
    expect(preload).toContain("ipcRenderer.on('menu:open-shortcuts'")
    expect(preload).toContain("ipcRenderer.removeListener('menu:open-shortcuts'")
  })

  it('브라우저 미리보기용 가짜 API 에도 onMenuOpenShortcuts 가 있다 (구독 해제 함수를 돌려줌)', () => {
    const api = createMockApi()
    expect(typeof api.onMenuOpenShortcuts).toBe('function')
    expect(typeof api.onMenuOpenShortcuts(() => {})).toBe('function')
  })

  it('App 이 메뉴 알림을 받아 단축키 설정 창을 열고 닫는다', () => {
    const app = read('src/App.jsx')
    expect(app).toContain("from './components/ShortcutSettingsModal.jsx'")
    expect(app).toMatch(/onMenuOpenShortcuts\?\.\(\(\) => setShortcutModalOpen\(true\)\)/)
    expect(app).toMatch(/shortcutModalOpen && <ShortcutSettingsModal onClose=\{\(\) => setShortcutModalOpen\(false\)\} \/>/)
  })
})
