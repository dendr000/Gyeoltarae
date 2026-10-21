// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createSettingsMenu } from '../../electron/settingsMenu.js'
import { freshStore } from '../helpers/store.js'

// 메뉴 "설정" > "줄바꿈 포함 글자 수": 드래그한 글자의 글자 수를 셀 때 줄바꿈도 1자로 셀지(기본 꺼짐 = 줄바꿈을 세지 않는 기본 글자 수).
// 문서 전체 글자 수는 이 설정과 상관없이 늘 기본 글자 수다. 메뉴는 메인 프로세스, 값은 userData 의 config.json, 화면은 IPC 로 알림을 받는다.
const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')

describe('설정 메뉴 항목: 줄바꿈 포함 글자 수', () => {
  function make(initial) {
    const changes = []
    const menu = createSettingsMenu({
      getSortFlip: () => false,
      onSortFlipChange: () => {},
      getCountNewlines: initial === undefined ? undefined : () => initial,
      onCountNewlinesChange: (value) => changes.push(value),
    })
    return { item: menu.submenu.find((entry) => entry.label === '줄바꿈 포함 글자 수'), changes, menu }
  }

  it('"설정" 안에 "줄바꿈 포함 글자 수" 체크 항목이 있고 정렬·제목 강조 항목은 그대로다', () => {
    const { item, menu } = make(false)
    expect(item).toBeDefined()
    expect(item.type).toBe('checkbox')
    expect(menu.submenu[0].label).toBe('정렬 뒤집기')
    expect(menu.submenu.some((entry) => entry.label === '제목 강조')).toBe(true)
  })

  it('옛 항목 "선택 글자 수" 는 없다', () => {
    const { menu } = make(false)
    expect(menu.submenu.some((entry) => entry.label === '선택 글자 수')).toBe(false)
  })

  it('체크 상태는 저장된 값을 따르고, 값이 없으면 꺼짐이다 (기본은 줄바꿈을 세지 않음)', () => {
    expect(make(true).item.checked).toBe(true)
    expect(make(false).item.checked).toBe(false)
    expect(make(undefined).item.checked).toBe(false)
  })

  it('클릭하면 바뀐 체크 상태를 알려 준다', () => {
    const { item, changes } = make(false)
    item.click({ checked: true })
    item.click({ checked: false })
    expect(changes).toEqual([true, false])
  })
})

describe('스토어의 countNewlines', () => {
  it('기본은 꺼짐이다', async () => {
    const { state } = await freshStore()
    expect(state().countNewlines).toBe(false)
  })

  it('initSettings 가 저장된 값을 읽어 온다, 값이 없으면 꺼짐이다', async () => {
    const { state, api } = await freshStore()
    api.getSettings = async () => ({ countNewlines: true })
    await state().initSettings()
    expect(state().countNewlines).toBe(true)
    api.getSettings = async () => ({ sortFlip: true })
    await state().initSettings()
    expect(state().countNewlines).toBe(false)
  })

  it('메뉴에서 바꾸면(settings:changed) 바로 따라간다', async () => {
    const { state, api } = await freshStore()
    let notify
    api.getSettings = async () => ({ countNewlines: false })
    api.onSettingsChanged = (callback) => {
      notify = callback
      return () => {}
    }
    await state().initSettings()
    notify({ countNewlines: true })
    expect(state().countNewlines).toBe(true)
    notify({ countNewlines: false })
    expect(state().countNewlines).toBe(false)
  })
})

describe('소스 점검: 메인 연결', () => {
  const main = read('electron/main.js')

  it('메인이 저장된 값을 읽고(true 일 때만 켜짐) 바꾸면 저장하고 알린다', () => {
    expect(main).toMatch(/countNewlines: config\.countNewlines === true/)
    expect(main).toMatch(/saveConfig\(\{ \.\.\.loadConfig\(\), countNewlines \}\)/)
    expect(main).toContain('getCountNewlines: () => readSettings().countNewlines')
  })

  it('옛 설정 값(selectionCharCount)은 더 이상 쓰지 않는다', () => {
    expect(main).not.toContain('selectionCharCount')
  })
})
