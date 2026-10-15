// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { createSettingsMenu } from '../../electron/settingsMenu.js'
import { freshStore } from '../helpers/store.js'

// 메뉴 "설정" > "정렬 단축키: 다시 누르면 뒤집기". 기본은 항상 오름차순이고, 이 항목을 켜면 Ctrl+` 와 Ctrl+Shift+` 가 이미 오름차순인
// 글에서 내림차순으로 뒤집는다. 메뉴는 메인 프로세스, 값의 저장은 userData 의 config.json, 화면은 IPC 로 알림을 받는다.

describe('설정 메뉴 항목 (electron/settingsMenu.js)', () => {
  function make(initial = false) {
    const changes = []
    const menu = createSettingsMenu({ getSortFlip: () => initial, onSortFlipChange: (value) => changes.push(value) })
    return { menu, changes, item: menu.submenu[0] }
  }

  it('최상위 메뉴 이름은 "설정" 이다', () => {
    expect(make().menu.label).toBe('설정')
  })

  it('정렬 뒤집기 항목은 체크 표시가 있는 항목(checkbox)이다', () => {
    const { item } = make()
    expect(item.type).toBe('checkbox')
    expect(item.label).toContain('뒤집기')
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

  it('getSettings 가 없는 환경(브라우저 미리보기)에서도 오류 없이 꺼짐이다', async () => {
    const { state } = await freshStore()
    await expect(state().initSettings()).resolves.toBeUndefined()
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

  it('메인이 settings:get 으로 저장된 값을 돌려준다', () => {
    expect(main).toMatch(/ipcMain\.handle\('settings:get'[\s\S]{0,200}sortFlip/)
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
