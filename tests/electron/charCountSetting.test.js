// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createSettingsMenu } from '../../electron/settingsMenu.js'
import { freshStore } from '../helpers/store.js'

// 메뉴 "설정" > "선택 글자 수": 편집창 아래 표시줄에서 드래그한 글자의 글자 수를 보여 줄지(기본 켜짐). 문서 전체 글자 수는 늘 보인다.
// 메뉴는 메인 프로세스, 값은 userData 의 config.json, 화면은 IPC 로 알림을 받는다.
const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')

describe('설정 메뉴 항목: 선택 글자 수', () => {
  function make(initial) {
    const changes = []
    const menu = createSettingsMenu({
      getSortFlip: () => false,
      onSortFlipChange: () => {},
      getSelectionCharCount: initial === undefined ? undefined : () => initial,
      onSelectionCharCountChange: (value) => changes.push(value),
    })
    return { item: menu.submenu.find((entry) => entry.label === '선택 글자 수'), changes, menu }
  }

  it('"설정" 안에 "선택 글자 수" 체크 항목이 있고 정렬·제목 강조 항목은 그대로다', () => {
    const { item, menu } = make(true)
    expect(item).toBeDefined()
    expect(item.type).toBe('checkbox')
    expect(menu.submenu[0].label).toBe('정렬 뒤집기')
    expect(menu.submenu.some((entry) => entry.label === '제목 강조')).toBe(true)
  })

  it('체크 상태는 저장된 값을 따른다 (켜짐/꺼짐), 값이 없으면 켜짐이다', () => {
    expect(make(true).item.checked).toBe(true)
    expect(make(false).item.checked).toBe(false)
    expect(make(undefined).item.checked).toBe(true)
  })

  it('클릭하면 바뀐 체크 상태를 알려 준다', () => {
    const { item, changes } = make(true)
    item.click({ checked: false })
    item.click({ checked: true })
    expect(changes).toEqual([false, true])
  })
})

describe('스토어의 selectionCharCount', () => {
  it('기본은 켜짐이다', async () => {
    const { state } = await freshStore()
    expect(state().selectionCharCount).toBe(true)
  })

  it('initSettings 가 저장된 값을 읽어 온다 (꺼짐도), 값이 없으면 켜짐이다', async () => {
    const { state, api } = await freshStore()
    api.getSettings = async () => ({ selectionCharCount: false })
    await state().initSettings()
    expect(state().selectionCharCount).toBe(false)
    api.getSettings = async () => ({ sortFlip: true })
    await state().initSettings()
    expect(state().selectionCharCount).toBe(true)
  })

  it('메뉴에서 바꾸면(settings:changed) 바로 따라간다', async () => {
    const { state, api } = await freshStore()
    let notify
    api.getSettings = async () => ({ selectionCharCount: true })
    api.onSettingsChanged = (callback) => {
      notify = callback
      return () => {}
    }
    await state().initSettings()
    notify({ selectionCharCount: false })
    expect(state().selectionCharCount).toBe(false)
    notify({ selectionCharCount: true })
    expect(state().selectionCharCount).toBe(true)
  })
})

describe('소스 점검: 메인 연결', () => {
  const main = read('electron/main.js')

  it('메인이 저장된 값을 읽고(false 일 때만 꺼짐) 바꾸면 저장하고 알린다', () => {
    expect(main).toMatch(/selectionCharCount: config\.selectionCharCount !== false/)
    expect(main).toMatch(/saveConfig\(\{ \.\.\.loadConfig\(\), selectionCharCount \}\)/)
    expect(main).toContain('getSelectionCharCount: () => readSettings().selectionCharCount')
  })
})
