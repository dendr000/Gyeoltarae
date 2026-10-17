// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { createSettingsMenu } from '../../electron/settingsMenu.js'
import { freshStore } from '../helpers/store.js'

// 메뉴 "설정" > "정렬 단축키: 다시 누르면 뒤집기". 기본은 항상 오름차순이고, 이 항목을 켜면 Ctrl+` 와 Ctrl+Shift+` 가 이미 오름차순인
// 글에서 내림차순으로 뒤집는다. 메뉴는 메인 프로세스, 값의 저장은 userData 의 config.json, 화면은 IPC 로 알림을 받는다.

describe('설정 메뉴 항목 (electron/settingsMenu.js)', () => {
  function make(initial = false, zone = 0) {
    const changes = []
    const zones = []
    const menu = createSettingsMenu({
      getSortFlip: () => initial,
      onSortFlipChange: (value) => changes.push(value),
      getTypewriterZone: () => zone,
      onTypewriterZoneChange: (value) => zones.push(value),
    })
    return { menu, changes, zones, item: menu.submenu[0] }
  }

  it('최상위 메뉴 이름은 "설정" 이다', () => {
    expect(make().menu.label).toBe('설정')
  })

  it('정렬 뒤집기 항목은 체크 표시가 있는 항목(checkbox)이다', () => {
    const { item } = make()
    expect(item.type).toBe('checkbox')
    expect(item.label).toBe('정렬 뒤집기')
  })

  it('체크 상태는 저장된 값을 따른다 (기본 꺼짐)', () => {
    expect(make(false).item.checked).toBe(false)
    expect(make(true).item.checked).toBe(true)
  })

  it('클릭하면 바뀐 체크 상태(menuItem.checked)를 알려 준다', () => {
    const { item, changes } = make(false)
    item.click({ checked: true })
    item.click({ checked: false })
    expect(changes).toEqual([true, false])
  })

  it('저장된 값이 truthy 가 아닌 것(undefined 등)이어도 꺼짐으로 본다', () => {
    const menu = createSettingsMenu({ getSortFlip: () => undefined, onSortFlipChange: () => {} })
    expect(menu.submenu[0].checked).toBe(false)
  })
})

describe('설정 메뉴: 타자기 스크롤 (구역 고르기)', () => {
  function zoneMenu(zone) {
    const zones = []
    const menu = createSettingsMenu({
      getSortFlip: () => false,
      onSortFlipChange: () => {},
      getTypewriterZone: () => zone,
      onTypewriterZoneChange: (value) => zones.push(value),
    })
    const parent = menu.submenu.find((item) => item.label?.startsWith('타자기 스크롤'))
    return { parent, items: parent?.submenu ?? [], zones, menu }
  }

  it('"설정" 안에 "타자기 스크롤" 하위 메뉴가 있고, 정렬 항목은 그대로 맨 앞이다', () => {
    const { parent, menu } = zoneMenu(0)
    expect(parent).toBeDefined()
    expect(menu.submenu[0].type).toBe('checkbox')
  })

  it('끔 + 구역 1~5, 모두 6개의 선택 항목(radio)이다', () => {
    const { items } = zoneMenu(0)
    expect(items).toHaveLength(6)
    expect(items.every((item) => item.type === 'radio')).toBe(true)
  })

  it('항목 이름은 짧게 기능만 적는다 (설명 문장·괄호 없음)', () => {
    const { parent, items } = zoneMenu(0)
    expect(parent.label).toBe('타자기 스크롤')
    expect(items.map((item) => item.label)).toEqual(['끔', '1 · 맨 위', '2 · 위', '3 · 가운데', '4 · 아래', '5 · 맨 아래'])
    expect(items.every((item) => !item.label.includes('(') && item.label.length <= 8)).toBe(true)
  })

  it('저장된 구역 하나만 체크되어 있다 (기본은 끔)', () => {
    for (const zone of [0, 1, 2, 3, 4, 5]) {
      const checked = zoneMenu(zone).items.map((item) => item.checked)
      expect(checked.filter(Boolean)).toHaveLength(1)
      expect(checked[zone]).toBe(true)
    }
  })

  it('항목을 누르면 그 구역 번호(끔은 0)를 알려 준다', () => {
    const { items, zones } = zoneMenu(0)
    items.forEach((item) => item.click({ checked: true }))
    expect(zones).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('저장된 값이 이상하면(범위 밖 등) 끔이 체크된다', () => {
    const checked = zoneMenu(9).items.map((item) => item.checked)
    expect(checked).toEqual([true, false, false, false, false, false])
  })

  it('타자기 스크롤 값을 넘기지 않아도 메뉴가 만들어진다 (기본 끔)', () => {
    const menu = createSettingsMenu({ getSortFlip: () => false, onSortFlipChange: () => {} })
    const parent = menu.submenu.find((item) => item.label?.startsWith('타자기 스크롤'))
    expect(parent.submenu[0].checked).toBe(true)
  })
})

describe('스토어의 sortFlip', () => {
  it('기본은 꺼짐이다', async () => {
    const { state } = await freshStore()
    expect(state().sortFlip).toBe(false)
  })

  it('initSettings 가 메인에 저장된 값을 읽어 온다', async () => {
    const { state, api } = await freshStore()
    api.getSettings = async () => ({ sortFlip: true })
    await state().initSettings()
    expect(state().sortFlip).toBe(true)
  })

  it('저장된 값이 꺼짐(false)이면 꺼짐이다', async () => {
    const { state, api } = await freshStore()
    api.getSettings = async () => ({ sortFlip: false })
    await state().initSettings()
    expect(state().sortFlip).toBe(false)
  })

  it('getSettings 가 없는 환경에서도 오류 없이 꺼짐이다', async () => {
    const { state, api } = await freshStore()
    api.getSettings = undefined
    api.onSettingsChanged = undefined
    await expect(state().initSettings()).resolves.toBeUndefined()
    expect(state().sortFlip).toBe(false)
  })

  it('브라우저 미리보기의 가짜 API 는 기본값(꺼짐)을 주고, __setSettings 로 바꾸면 알려 준다', async () => {
    const { state, api } = await freshStore()
    await state().initSettings()
    expect(state().sortFlip).toBe(false)
    expect(state().typewriterZone).toBe(0)
    api.__setSettings({ typewriterZone: 4 })
    expect(state().typewriterZone).toBe(4)
    expect(state().sortFlip).toBe(false)
  })

  it('메뉴에서 바꾸면(settings:changed 알림) 상태가 따라 바뀐다', async () => {
    const { state, api } = await freshStore()
    let notify
    api.getSettings = async () => ({ sortFlip: false })
    api.onSettingsChanged = (callback) => {
      notify = callback
      return () => {}
    }
    await state().initSettings()
    notify({ sortFlip: true })
    expect(state().sortFlip).toBe(true)
    notify({ sortFlip: false })
    expect(state().sortFlip).toBe(false)
  })

  it('initSettings 를 다시 부르면 이전 알림 구독을 해제한다 (쌓이지 않는다)', async () => {
    const { state, api } = await freshStore()
    const unsubscribe = vi.fn()
    api.getSettings = async () => ({ sortFlip: false })
    api.onSettingsChanged = () => unsubscribe
    await state().initSettings()
    expect(unsubscribe).not.toHaveBeenCalled()
    await state().initSettings()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})

describe('스토어의 typewriterZone', () => {
  it('기본은 끔(0)이다', async () => {
    const { state } = await freshStore()
    expect(state().typewriterZone).toBe(0)
  })

  it('initSettings 가 저장된 구역을 읽어 온다', async () => {
    const { state, api } = await freshStore()
    api.getSettings = async () => ({ sortFlip: false, typewriterZone: 3 })
    await state().initSettings()
    expect(state().typewriterZone).toBe(3)
  })

  it('저장된 값이 잘못되면(범위 밖·문자열) 끔이다', async () => {
    const { state, api } = await freshStore()
    for (const bad of [9, -1, '2', null, 2.5]) {
      api.getSettings = async () => ({ typewriterZone: bad })
      await state().initSettings()
      expect(state().typewriterZone).toBe(0)
    }
  })

  it('옛 메인처럼 typewriterZone 이 없는 설정이 와도 끔이다', async () => {
    const { state, api } = await freshStore()
    api.getSettings = async () => ({ sortFlip: true })
    await state().initSettings()
    expect(state().typewriterZone).toBe(0)
    expect(state().sortFlip).toBe(true)
  })

  it('메뉴에서 구역을 바꾸면(settings:changed) 바로 따라간다', async () => {
    const { state, api } = await freshStore()
    let notify
    api.getSettings = async () => ({ sortFlip: false, typewriterZone: 0 })
    api.onSettingsChanged = (callback) => {
      notify = callback
      return () => {}
    }
    await state().initSettings()
    notify({ sortFlip: false, typewriterZone: 2 })
    expect(state().typewriterZone).toBe(2)
    notify({ sortFlip: true, typewriterZone: 0 })
    expect(state().typewriterZone).toBe(0)
    expect(state().sortFlip).toBe(true)
  })
})

describe('소스 점검: 메인·preload·화면 연결', () => {
  const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')
  const main = read('electron/main.js')

  it('메인 메뉴에 "설정" 이 "창" 앞에 들어가고 저장·알림을 한다', () => {
    expect(main).toContain("from './settingsMenu.js'")
    const settings = main.indexOf('createSettingsMenu(')
    expect(settings).toBeGreaterThan(-1)
    expect(settings).toBeLessThan(main.indexOf("label: '창'"))
    expect(main).toMatch(/saveConfig\(\{ \.\.\.loadConfig\(\), sortFlip \}\)/)
    expect(main).toContain("webContents.send('settings:changed'")
  })

  it('메인이 settings:get 으로 저장된 값(readSettings)을 돌려준다', () => {
    expect(main).toMatch(/ipcMain\.handle\('settings:get', \(\) => readSettings\(\)\)/)
    expect(main).toMatch(/function readSettings\(\)[\s\S]{0,300}sortFlip[\s\S]{0,200}normalizeTypewriterZone\(/)
  })

  it('메뉴에서 바꾸면 전체 설정을 저장하고 전체 설정을 알린다 (타자기 구역 포함)', () => {
    expect(main).toMatch(/saveConfig\(\{ \.\.\.loadConfig\(\), typewriterZone \}\)/)
    expect(main.match(/webContents\.send\('settings:changed', readSettings\(\)\)/g) ?? []).toHaveLength(2)
    expect(main).toContain("from '../shared/typewriterZone.js'")
  })

  it('preload 가 같은 이름의 채널로 getSettings·onSettingsChanged 를 노출한다', () => {
    const preload = read('electron/preload.cjs')
    expect(preload).toContain("ipcRenderer.invoke('settings:get')")
    expect(preload).toContain("ipcRenderer.on('settings:changed'")
    expect(preload).toContain("ipcRenderer.removeListener('settings:changed'")
  })

  it('App 이 시작할 때 initSettings 를 부른다', () => {
    expect(read('src/App.jsx')).toMatch(/initSettings\(\)/)
  })

  it('편집기가 두 정렬 단축키에 설정값(flip)을 넘긴다', () => {
    const pane = read('src/components/EditorPane.jsx')
    expect(pane).toMatch(/sortLinesEdit\(textarea\.value, textarea\.selectionStart, textarea\.selectionEnd, \{ flip: sortFlip \}\)/)
    expect(pane).toMatch(/blockSortEdit\(textarea\.value, textarea\.selectionStart, textarea\.selectionEnd, \{ flip: sortFlip \}\)/)
    expect(pane).toMatch(/useAppStore\(\(s\) => s\.sortFlip\)/)
  })
})
