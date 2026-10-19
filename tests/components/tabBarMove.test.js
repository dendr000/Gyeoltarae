// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 탭 바의 "누른 채 방향키로 옮기기" 연결(소스 점검). 실제 마우스·키 입력은 실제 창에서 확인한다(docs/features/tab-reorder.md).
const bar = readFileSync(new URL('../../src/components/TabBar.jsx', import.meta.url), 'utf8')

describe('TabBar', () => {
  it('탭에서 왼쪽 버튼을 누르면(닫기 단추는 제외) 그 탭을 눌린 탭으로 기억한다', () => {
    expect(bar).toMatch(/onMouseDown=\{\(e\) => \{[\s\S]{0,200}e\.button !== 0[\s\S]{0,120}closest\('\.tab-bar-close-btn'\)[\s\S]{0,160}pressedTabRef\.current = tab\.id/)
  })

  it('버튼을 떼거나 창이 포커스를 잃으면 눌린 탭을 잊는다', () => {
    expect(bar).toMatch(/addEventListener\('mouseup'[\s\S]{0,80}\)/)
    expect(bar).toMatch(/addEventListener\('blur'/)
    expect(bar).toMatch(/removeEventListener\('mouseup'/)
  })

  it('눌린 탭이 있는 동안 ←/→ 를 isTabMoveKey 로 판별해 moveTab 을 부르고, 방향키의 평소 동작(글 커서 이동)은 막는다', () => {
    expect(bar).toContain("from '../lib/tabOrder.js'")
    expect(bar).toMatch(/isTabMoveKey\(e\)/)
    expect(bar).toMatch(/pressedTabRef\.current[\s\S]{0,200}e\.preventDefault\(\)[\s\S]{0,120}moveTab\(pressedTabRef\.current, direction\)/)
    expect(bar).toMatch(/addEventListener\('keydown', handleKeyDown, true\)/)
  })

  it('옮긴 탭이 가려져 있으면 보이게 스크롤한다', () => {
    expect(bar).toContain('data-tab-id')
    expect(bar).toMatch(/scrollIntoView\(\{[^}]*inline: 'nearest'/)
  })

  it('눌렀다 떼며 그 자리에 있던 다른 탭으로 전환되지 않는다 — 옮기는 중에는 클릭 전환을 하지 않는다', () => {
    expect(bar).toMatch(/movedWhilePressedRef/)
    expect(bar).toMatch(/if \(movedWhilePressedRef\.current\) \{[\s\S]{0,120}return/)
  })
})
