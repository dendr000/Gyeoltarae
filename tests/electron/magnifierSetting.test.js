// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createSettingsMenu } from '../../electron/settingsMenu.js'
import { freshStore } from '../helpers/store.js'

// 메뉴 "설정" > "돋보기 크기": 마우스 휠 클릭으로 켜는 둥근 돋보기의 크기 4단계(기본 보통). 메뉴는 메인 프로세스, 값은 userData 의 config.json, 화면은 IPC 로 알림을 받는다.
const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')

describe('설정 메뉴 항목: 돋보기 크기', () => {
  function make(initial) {
    const changes = []
    const menu = createSettingsMenu({
      getSortFlip: () => false,
      onSortFlipChange: () => {},
      getMagnifierSize: initial === undefined ? undefined : () => initial,
      onMagnifierSizeChange: (value) => changes.push(value),
    })
    return { item: menu.submenu.find((entry) => entry.label === '돋보기 크기'), changes, menu }
  }

  it('"설정" 안에 "돋보기 크기" 하위 메뉴가 있고 타자기 스크롤 등 다른 항목은 그대로다', () => {
    const { item, menu } = make('normal')
    expect(item).toBeDefined()
    expect(menu.submenu.some((entry) => entry.label === '타자기 스크롤')).toBe(true)
    expect(menu.submenu.some((entry) => entry.label === '줄바꿈 포함 글자 수')).toBe(true)
    expect(menu.submenu.some((entry) => entry.label === '단축키…')).toBe(true)
  })

  it('작게·보통·크게·아주 크게 4단계 라디오 항목이다', () => {
    const { item } = make('normal')
    expect(item.submenu.map((entry) => entry.label)).toEqual(['작게', '보통', '크게', '아주 크게'])
    expect(item.submenu.every((entry) => entry.type === 'radio')).toBe(true)
  })

  it('저장된 크기 하나만 체크된다', () => {
    for (const [value, label] of [['small', '작게'], ['normal', '보통'], ['large', '크게'], ['xlarge', '아주 크게']]) {
      const checked = make(value).item.submenu.filter((entry) => entry.checked).map((entry) => entry.label)
      expect(checked).toEqual([label])
    }
  })

  it('값이 없거나 이상하면 보통이 체크된다', () => {
    for (const bad of [undefined, null, '', 'huge', 240]) {
      const checked = make(bad).item.submenu.filter((entry) => entry.checked).map((entry) => entry.label)
      expect(checked).toEqual(['보통'])
    }
  })

  it('항목을 클릭하면 그 크기를 알려 준다', () => {
    const { item, changes } = make('normal')
    item.submenu.forEach((entry) => entry.click())
    expect(changes).toEqual(['small', 'normal', 'large', 'xlarge'])
  })
})

describe('스토어의 magnifierSize', () => {
  it('기본은 보통이다', async () => {
    const { state } = await freshStore()
    expect(state().magnifierSize).toBe('normal')
  })

  it('initSettings 가 저장된 크기를 읽어 오고, 값이 없거나 이상하면 보통이다', async () => {
    const { state, api } = await freshStore()
    api.getSettings = async () => ({ magnifierSize: 'xlarge' })
    await state().initSettings()
    expect(state().magnifierSize).toBe('xlarge')
    api.getSettings = async () => ({})
    await state().initSettings()
    expect(state().magnifierSize).toBe('normal')
    api.getSettings = async () => ({ magnifierSize: 'giant' })
    await state().initSettings()
    expect(state().magnifierSize).toBe('normal')
  })

  it('메뉴에서 바꾸면(settings:changed) 화면에 바로 반영된다', async () => {
    const { state, api } = await freshStore()
    await state().initSettings()
    api.__setSettings({ magnifierSize: 'small' })
    expect(state().magnifierSize).toBe('small')
  })
})

describe('메인 프로세스', () => {
  const main = read('electron/main.js')

  it('config.json 의 돋보기 크기를 읽을 때 이름을 바로잡는다', () => {
    expect(main).toMatch(/magnifierSize:\s*normalizeMagnifierSize\(config\.magnifierSize\)/)
  })

  it('메뉴에서 고르면 저장하고 화면에 알린다', () => {
    expect(main).toMatch(/onMagnifierSizeChange:\s*\(magnifierSize\)\s*=>\s*\{\s*saveConfig\(\{\s*\.\.\.loadConfig\(\),\s*magnifierSize\s*\}\)\s*mainWindow\?\.webContents\.send\('settings:changed', readSettings\(\)\)/)
    expect(main).toMatch(/getMagnifierSize:\s*\(\)\s*=>\s*readSettings\(\)\.magnifierSize/)
  })
})

describe('돋보기 컴포넌트의 구조', () => {
  const component = read('src/components/Magnifier.jsx')
  const css = read('src/App.css')
  const app = read('src/App.jsx')

  it('앱에 붙어 있다', () => {
    expect(app).toMatch(/import \{ Magnifier \} from '\.\/components\/Magnifier\.jsx'/)
    expect(app).toMatch(/<Magnifier \/>/)
  })

  it('휠 클릭(가운데 버튼)으로만 켜고 끈다', () => {
    expect(component).toMatch(/if \(e\.button !== 1\) return/)
    expect(component).toMatch(/if \(lens\) close\(\)\s*else lens = openLens/)
  })

  it('휠 클릭의 기본 동작(자동 스크롤·링크 열기)을 막는다', () => {
    expect(component).toMatch(/onMouseDown[\s\S]*?e\.preventDefault\(\)/)
    expect(component).toMatch(/addEventListener\('auxclick', swallowMiddle, true\)/)
    expect(component).toMatch(/addEventListener\('mouseup', swallowMiddle, true\)/)
  })

  it('켜진 동안 휠은 배율을 바꾸고 문서 스크롤은 막는다(passive 끔)', () => {
    expect(component).toMatch(/addEventListener\('wheel', onWheel, \{ capture: true, passive: false \}\)/)
    expect(component).toMatch(/onWheel = \(e\) => \{\s*e\.preventDefault\(\)/)
    expect(component).toMatch(/zoom = nextZoom\(zoom, e\.deltaY\)/)
  })

  it('Esc 로도 끈다', () => {
    expect(component).toMatch(/e\.key === 'Escape' && lens/)
  })

  it('복제본은 shadow DOM 안에 두고 html 아래에 붙인다(앱의 문서 검색에 섞이지 않고, body 감시에도 안 걸림)', () => {
    expect(component).toMatch(/host\.attachShadow\(\{ mode: 'open' \}\)/)
    expect(component).toMatch(/document\.documentElement\.appendChild\(host\)/)
  })

  it('마우스 입력은 받지 않는다(진짜 화면이 받는다)', () => {
    expect(css).toMatch(/\.magnifier-host\s*\{[^}]*pointer-events:\s*none/)
  })

  it('둥근 모양이다', () => {
    expect(css).toMatch(/\.magnifier-host\s*\{[^}]*border-radius:\s*50%/)
  })

  it('마우스 아래 요소를 복제본에도 오버 표시한다', () => {
    expect(component).toMatch(/markHover\(stage, document\.body, document\.elementFromPoint\(mouse\.x, mouse\.y\), marked\)/)
  })

  it('화면이 바뀌거나 스크롤·입력이 있으면 복제본을 다시 만든다', () => {
    expect(component).toMatch(/new MutationObserver\(markDirty\)/)
    expect(component).toMatch(/addEventListener\('scroll', markDirty, true\)/)
    expect(component).toMatch(/addEventListener\('input', markDirty, true\)/)
  })

  it('크기 설정이 바뀌면 켜진 돋보기에 바로 반영한다', () => {
    expect(component).toMatch(/state\.magnifierSize !== prev\.magnifierSize\) lens\?\.setSize\(state\.magnifierSize\)/)
  })

  it('꺼질 때 모든 감시와 요소를 정리한다', () => {
    expect(component).toMatch(/observer\.disconnect\(\)/)
    expect(component).toMatch(/host\.remove\(\)/)
    expect(component).toMatch(/removeEventListener\('wheel', onWheel, true\)/)
  })
})
