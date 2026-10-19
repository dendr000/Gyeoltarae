// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { isNewDocKey, newDocTargetDir } from '../../src/lib/newDocShortcut.js'

// Ctrl+N: 지금 열려 있는 문서가 있는 폴더에 새 문서를 만든다(사이드바에서 그 폴더의 "새 문서" 단추를 누른 것과 같다). 문서가 많아져도 폴더를 찾아 스크롤하지 않아도 된다.
const ev = (over) => ({ key: 'n', code: 'KeyN', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, isComposing: false, ...over })

describe('isNewDocKey', () => {
  it('Ctrl+N 은 true 다 (Mac 은 Cmd+N)', () => {
    expect(isNewDocKey(ev({}))).toBe(true)
    expect(isNewDocKey(ev({ ctrlKey: false, metaKey: true }))).toBe(true)
    expect(isNewDocKey(ev({ key: 'N' }))).toBe(true)
  })

  it('한글 자판에서도 된다 (e.key 가 ㅜ 로 와도 물리 키 N 이면)', () => {
    expect(isNewDocKey(ev({ key: 'ㅜ', code: 'KeyN' }))).toBe(true)
  })

  it('Ctrl 이 없거나 Shift·Alt 가 같이 눌렸으면 false 다', () => {
    expect(isNewDocKey(ev({ ctrlKey: false }))).toBe(false)
    expect(isNewDocKey(ev({ shiftKey: true }))).toBe(false)
    expect(isNewDocKey(ev({ altKey: true }))).toBe(false)
  })

  it('다른 키는 false 다', () => {
    expect(isNewDocKey(ev({ key: 'm', code: 'KeyM' }))).toBe(false)
    expect(isNewDocKey(ev({ key: 'Enter', code: 'Enter' }))).toBe(false)
  })

  it('한글 조합 중에는 false 다', () => {
    expect(isNewDocKey(ev({ isComposing: true }))).toBe(false)
  })
})

describe('newDocTargetDir', () => {
  it('열린 문서가 있는 폴더를 돌려준다 (윈도 경로)', () => {
    expect(newDocTargetDir('D:\\WikiDesk\\강의\\03 멘토씨리즈 C언어(개정판)\\03 변수와 RAM.md', 'D:\\WikiDesk')).toBe('D:\\WikiDesk\\강의\\03 멘토씨리즈 C언어(개정판)')
  })

  it('슬래시 경로도 된다', () => {
    expect(newDocTargetDir('/ws/강의/a/b.md', '/ws')).toBe('/ws/강의/a')
  })

  it('작업 폴더 바로 아래의 문서면 작업 폴더다', () => {
    expect(newDocTargetDir('D:\\WikiDesk\\문서.md', 'D:\\WikiDesk')).toBe('D:\\WikiDesk')
  })

  it('열린 문서가 없으면 작업 폴더다 (맨 아래 "+ 새 문서" 단추와 같음)', () => {
    expect(newDocTargetDir(null, 'D:\\WikiDesk')).toBe('D:\\WikiDesk')
    expect(newDocTargetDir('', 'D:\\WikiDesk')).toBe('D:\\WikiDesk')
  })

  it('경로에 구분자가 없으면(이상한 값) 작업 폴더로 안전하게 돌아간다', () => {
    expect(newDocTargetDir('문서.md', 'D:\\WikiDesk')).toBe('D:\\WikiDesk')
  })
})

describe('App 연결 (소스 점검)', () => {
  const app = readFileSync(new URL('../../src/App.jsx', import.meta.url), 'utf8')

  it('전역 키 처리에서 Ctrl+N 이면 열린 문서의 폴더로 새 문서 만들기를 연다', () => {
    expect(app).toContain("from './lib/newDocShortcut.js'")
    expect(app).toMatch(/isNewDocKey\(e\)[\s\S]{0,200}newDocTargetDir\(openPath, workspacePath\)/)
  })

  it('이름 입력창 등 모달이 떠 있으면 무시한다', () => {
    const at = app.indexOf('isNewDocKey(e)')
    expect(app.slice(at - 200, at + 100)).toContain("document.querySelector('.modal-backdrop')")
  })

  it('새 문서 만들기는 사이드바 단추와 같은 handleCreateDoc 를 쓴다', () => {
    expect(app).toMatch(/createDocRef\.current = handleCreateDoc/)
    expect(app).toMatch(/createDocRef\.current\?\.\(/)
  })
})
