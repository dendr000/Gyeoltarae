// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 단축키 설정 창(ShortcutSettingsModal)의 구조 점검(소스). 실제 키 입력은 실제 창에서 확인한다(docs/features/shortcut-settings.md).
const modal = readFileSync(new URL('../../src/components/ShortcutSettingsModal.jsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../../src/App.css', import.meta.url), 'utf8')

describe('ShortcutSettingsModal', () => {
  it('다른 창과 같은 modal-backdrop 을 쓴다 (떠 있는 동안 앱의 전역 단축키가 무시되는 기준)', () => {
    expect(modal).toContain('className="modal-backdrop"')
  })

  it('키를 기다리는 동안 누른 키를 캡처 단계에서 모두 받고(막아서) 다른 단축키·글자 입력이 일어나지 않게 한다', () => {
    expect(modal).toMatch(/window\.addEventListener\('keydown', handleKeyDown, true\)/)
    expect(modal).toMatch(/e\.preventDefault\(\)\s*e\.stopPropagation\(\)/)
  })

  it('Esc 는 입력 중이면 입력 취소, 아니면 창 닫기다', () => {
    expect(modal).toMatch(/e\.key === 'Escape'[\s\S]{0,200}setCapturingId\(null\)/)
    expect(modal).toMatch(/if \(e\.key === 'Escape'\) onClose\(\)/)
  })

  it('수식키만 누른 동안은 "Ctrl+…" 처럼 미리 보여 주고 조합이 끝나면 setShortcut 으로 지정한다', () => {
    expect(modal).toContain('modifierPreview(e)')
    expect(modal).toMatch(/setShortcut\(capturingId, combo\)/)
  })

  it('다른 기능이 쓰는 키(충돌)는 바로 바꾸지 않고 확인을 받은 뒤 force 로 바꾼다', () => {
    expect(modal).toMatch(/result\.conflict[\s\S]{0,120}setPending\(/)
    expect(modal).toMatch(/setShortcut\(pending\.id, pending\.combo, \{ force: true \}\)/)
  })

  it('기능마다 변경·없애기·기본값 단추가 있고, 전체 기본값 단추가 있다', () => {
    for (const label of ['변경', '없애기', '기본값', '모두 기본값으로']) expect(modal).toContain(label)
    expect(modal).toMatch(/resetShortcut\(action\.id\)/)
    expect(modal).toMatch(/resetAllShortcuts\(\)/)
  })

  it('모든 기능 목록(SHORTCUT_ACTIONS)을 묶음별로 그린다', () => {
    expect(modal).toContain('SHORTCUT_ACTIONS')
    expect(modal).toMatch(/GROUPS\.map\(/)
  })

  it('CSS 가 있다', () => {
    expect(css).toMatch(/\.shortcut-modal-panel\s*\{/)
    expect(css).toMatch(/\.shortcut-key\s*\{/)
  })
})
