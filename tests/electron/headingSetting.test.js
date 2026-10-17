// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createSettingsMenu } from '../../electron/settingsMenu.js'
import { freshStore } from '../helpers/store.js'

// 메뉴 "설정" > "제목 강조": 편집 모드에서 제목 줄(=제목=)에 배경을 얹어 강조할지. 기본은 켜짐(지금까지의 동작)이고, 끄면 제목 줄도
// 일반 줄처럼 보인다(줄 여백의 점으로 직접 강조한 줄은 그대로). 메뉴는 메인 프로세스, 값은 userData 의 config.json, 화면은 IPC 로 알림을 받는다.
const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')

describe('설정 메뉴 항목: 제목 강조', () => {
  function make(initial) {
    const changes = []
    const menu = createSettingsMenu({
      getSortFlip: () => false,
      onSortFlipChange: () => {},
      getHeadingHighlight: initial === undefined ? undefined : () => initial,
      onHeadingHighlightChange: (value) => changes.push(value),
    })
    return { item: menu.submenu.find((entry) => entry.label === '제목 강조'), changes, menu }
  }

  it('"설정" 안에 "제목 강조" 체크 항목이 있고, 정렬 항목이 여전히 맨 앞이다', () => {
    const { item, menu } = make(true)
    expect(item).toBeDefined()
    expect(item.type).toBe('checkbox')
    expect(menu.submenu[0].label).toBe('정렬 뒤집기')
  })

  it('체크 상태는 저장된 값을 따른다 (켜짐/꺼짐)', () => {
    expect(make(true).item.checked).toBe(true)
    expect(make(false).item.checked).toBe(false)
  })

  it('값을 넘기지 않으면 켜짐이다 (기본)', () => {
    expect(make(undefined).item.checked).toBe(true)
  })

  it('클릭하면 바뀐 체크 상태(menuItem.checked)를 알려 준다', () => {
    const { item, changes } = make(true)
    item.click({ checked: false })
    item.click({ checked: true })
    expect(changes).toEqual([false, true])
  })

  it('타자기 스크롤 하위 메뉴는 그대로 있다', () => {
    const { menu } = make(true)
    expect(menu.submenu.find((entry) => entry.label === '타자기 스크롤')?.submenu).toHaveLength(6)
  })
})

describe('스토어의 headingHighlight', () => {
  it('기본은 켜짐이다', async () => {
    const { state } = await freshStore()
    expect(state().headingHighlight).toBe(true)
  })

  it('initSettings 가 저장된 값을 읽어 온다 (꺼짐도)', async () => {
    const { state, api } = await freshStore()
    api.getSettings = async () => ({ headingHighlight: false })
    await state().initSettings()
    expect(state().headingHighlight).toBe(false)
  })

  it('옛 메인처럼 값이 없는 설정이 와도 켜짐이다', async () => {
    const { state, api } = await freshStore()
    api.getSettings = async () => ({ sortFlip: true })
    await state().initSettings()
    expect(state().headingHighlight).toBe(true)
  })

  it('메뉴에서 바꾸면(settings:changed) 바로 따라간다', async () => {
    const { state, api } = await freshStore()
    let notify
    api.getSettings = async () => ({ headingHighlight: true })
    api.onSettingsChanged = (callback) => {
      notify = callback
      return () => {}
    }
    await state().initSettings()
    notify({ headingHighlight: false })
    expect(state().headingHighlight).toBe(false)
    notify({ headingHighlight: true })
    expect(state().headingHighlight).toBe(true)
  })
})

describe('소스 점검: 메인·편집기 연결', () => {
  const main = read('electron/main.js')
  const pane = read('src/components/EditorPane.jsx')

  it('메인이 저장된 값을 읽고(꺼짐 false 만 꺼짐), 바꾸면 저장하고 알린다', () => {
    expect(main).toMatch(/headingHighlight: config\.headingHighlight !== false/)
    expect(main).toMatch(/saveConfig\(\{ \.\.\.loadConfig\(\), headingHighlight \}\)/)
    expect(main).toContain('getHeadingHighlight: () => readSettings().headingHighlight')
  })

  it('편집기는 설정이 꺼져 있으면 제목 줄 배경을 입히지 않고, 코드블록 안은 판단에서 뺀다', () => {
    expect(pane).toContain("from '../lib/editorHeading.js'")
    expect(pane).toMatch(/useAppStore\(\(s\) => s\.headingHighlight\)/)
    expect(pane).toMatch(/headingOn && headingFlags\[i\]/)
    expect(pane).toMatch(/renderHighlightLines\(text, lineMarks, headingHighlight\)/)
  })
})
