// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { isSidebarToggleKey } from '../../src/lib/sidebarShortcut.js'

const key = (over) => ({ key: 'm', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, isComposing: false, ...over })

describe('사이드바 토글 단축키 (Ctrl+M)', () => {
  it('Ctrl+M 이면 참이다', () => {
    expect(isSidebarToggleKey(key({}))).toBe(true)
  })

  it('대문자 M(CapsLock)이어도 참이다', () => {
    expect(isSidebarToggleKey(key({ key: 'M' }))).toBe(true)
  })

  it('Mac 의 Cmd+M 도 참이다', () => {
    expect(isSidebarToggleKey(key({ ctrlKey: false, metaKey: true }))).toBe(true)
  })

  it('Ctrl 없이 M 만 누르면 거짓이다 (글자 입력)', () => {
    expect(isSidebarToggleKey(key({ ctrlKey: false }))).toBe(false)
  })

  it('Shift 나 Alt 가 같이 눌리면 거짓이다 (다른 단축키와 구분)', () => {
    expect(isSidebarToggleKey(key({ shiftKey: true }))).toBe(false)
    expect(isSidebarToggleKey(key({ altKey: true }))).toBe(false)
  })

  it('다른 글쇠는 거짓이다', () => {
    expect(isSidebarToggleKey(key({ key: 'n' }))).toBe(false)
    expect(isSidebarToggleKey(key({ key: 'Control' }))).toBe(false)
  })

  it('한글 입력 조합 중에는 거짓이다', () => {
    expect(isSidebarToggleKey(key({ isComposing: true }))).toBe(false)
  })

  it('한글 자판 상태에서도 물리 M 키(code KeyM)면 참이다', () => {
    expect(isSidebarToggleKey(key({ key: 'ㅡ', code: 'KeyM' }))).toBe(true)
  })

  it('글자(key)가 m 이면 물리 키(code)가 달라도 참이다 (자판 배열이 다른 경우)', () => {
    expect(isSidebarToggleKey(key({ key: 'm', code: 'KeyB' }))).toBe(true)
  })
})

describe('소스 점검: App 이 단축키를 연결했다', () => {
  const app = readFileSync(new URL('../../src/App.jsx', import.meta.url), 'utf8')

  it('전역 keydown 에서 isSidebarToggleKey 로 사이드바를 토글한다', () => {
    expect(app).toMatch(/isSidebarToggleKey\(e, shortcuts\['sidebar\.toggle'\]\)[\s\S]{0,120}setSidebarCollapsed\(\(v\) => !v\)/)
  })

  it('입력창(PromptModal)이 떠 있을 때는 무시하는 검사 뒤에 있다', () => {
    const handler = app.slice(app.indexOf('function handleGlobalKeyDown'))
    expect(handler.indexOf('if (promptRequest) return')).toBeGreaterThan(-1)
    expect(handler.indexOf('if (promptRequest) return')).toBeLessThan(handler.indexOf('isSidebarToggleKey'))
  })

  it('토글 단추 안내 글에 단축키가 적혀 있다', () => {
    expect(app).toContain('사이드바 열기 (Ctrl+M)')
    expect(app).toContain('사이드바 닫기 (Ctrl+M)')
  })
})
