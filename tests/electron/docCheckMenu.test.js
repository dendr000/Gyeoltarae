// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createMockApi } from '../../src/lib/mockApi.js'

// 메뉴 "편집" > "문서 점검": 메뉴는 메인 프로세스, 창은 렌더러에 있어서 연결(메뉴 -> 알림 -> 창)이 끊기지 않았는지 지킨다. 점검 규칙은 tests/lib/docCheck.test.js.
const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')

describe('문서 점검 연결', () => {
  it('"편집" 메뉴에 "문서 점검" 항목이 있고 누르면 렌더러에 알린다', () => {
    const main = read('electron/main.js')
    expect(main).toMatch(/label: '문서 점검', click: \(\) => mainWindow\?\.webContents\.send\('menu:open-doc-check'\)/)
  })

  it('메뉴 글자는 2~4글자(공백 제외)이고 괄호·설명문이 없다', () => {
    const label = '문서 점검'
    expect(label.replace(/\s/g, '').length).toBeLessThanOrEqual(4)
    expect(label).not.toMatch(/[()…:]/)
  })

  it('미리 로드 스크립트가 알림을 받는 함수를 내놓는다', () => {
    const preload = read('electron/preload.cjs')
    expect(preload).toContain("ipcRenderer.on('menu:open-doc-check', listener)")
    expect(preload).toContain('onMenuOpenDocCheck')
  })

  it('가짜 api 에도 있어 브라우저 미리보기에서 오류가 없다', () => {
    const unsubscribe = createMockApi().onMenuOpenDocCheck(() => {})
    expect(typeof unsubscribe).toBe('function')
  })

  it('앱이 알림을 받으면 점검 창을 열고, 창은 규칙과 편집기 이동을 쓴다', () => {
    const app = read('src/App.jsx')
    expect(app).toMatch(/onMenuOpenDocCheck\?\.\(\(\) => setDocCheckOpen\(true\)\)/)
    expect(app).toMatch(/docCheckOpen && <DocCheckModal/)
    const modal = read('src/components/DocCheckModal.jsx')
    expect(modal).toContain('checkDocument(rawText')
    expect(modal).toContain('requestEditorJump(issue.offset)')
  })

  it('점검 창의 글은 줄바꿈하지 않는 칸(줄 번호·닫기 단추)이 넘치지 않게 한다', () => {
    const css = read('src/App.css')
    expect(css).toMatch(/\.doc-check-line \{[^}]*white-space: nowrap/)
    expect(css).toMatch(/\.doc-check-close \{[^}]*white-space: nowrap/)
  })
})
