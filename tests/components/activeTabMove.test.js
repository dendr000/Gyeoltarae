// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// App 의 전역 키 처리: Ctrl+Alt+←/→ 로 지금 열린(활성) 탭을 옮긴다(소스 점검). 실제 키 입력은 실제 창에서 확인한다(docs/features/tab-reorder.md).
const app = readFileSync(new URL('../../src/App.jsx', import.meta.url), 'utf8')
const pane = readFileSync(new URL('../../src/components/EditorPane.jsx', import.meta.url), 'utf8')

describe('App 의 활성 탭 옮기기', () => {
  it('activeTabMoveKey 로 판별해 활성 탭을 moveTab 으로 옮기고 기본 동작을 막는다', () => {
    expect(app).toContain("from './lib/tabOrder.js'")
    expect(app).toMatch(/activeTabMoveKey\(e\)[\s\S]{0,200}e\.preventDefault\(\)[\s\S]{0,160}moveTab\(activeTabId, tabDirection\)/)
  })

  it('열린 탭이 없으면 아무 일도 없다 (activeTabId 확인)', () => {
    expect(app).toMatch(/if \(activeTabId\) moveTab\(activeTabId, tabDirection\)/)
  })

  it('이름 입력창·표 편집기 같은 모달이 떠 있으면 무시한다', () => {
    const at = app.indexOf('activeTabMoveKey(e)')
    expect(at).toBeGreaterThan(app.indexOf("document.querySelector('.modal-backdrop')"))
  })

  it('편집기의 Alt+←/→ (줄 처음/끝 이동)는 Ctrl 이 눌리면 해당하지 않아 겹치지 않는다', () => {
    expect(pane).toMatch(/if \(e\.altKey && !e\.ctrlKey && !e\.metaKey && \(e\.key === 'ArrowLeft' \|\| e\.key === 'ArrowRight'\)\)/)
  })
})
