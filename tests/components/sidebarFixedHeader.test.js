// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 사이드바의 검색칸과 "+ 새 문서"·"+ 새 폴더" 는 목록을 스크롤해도 늘 보여야 한다 — 스크롤 영역 밖(app-sidebar-fixed)에 둔다.
const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')
const app = read('src/App.jsx')
const tree = read('src/components/FileTree.jsx')
const css = read('src/App.css')

describe('사이드바 고정 머리', () => {
  it('검색칸과 두 단추가 스크롤 영역(app-sidebar-body) 앞의 고정 영역 안에 있다', () => {
    const fixedStart = app.indexOf('<div className="app-sidebar-fixed">')
    const bodyStart = app.indexOf('<div className="app-sidebar-body">')
    expect(fixedStart).toBeGreaterThan(0)
    expect(bodyStart).toBeGreaterThan(fixedStart)
    const fixed = app.slice(fixedStart, bodyStart)
    expect(fixed).toContain('<SearchBar />')
    expect(fixed).toMatch(/handleCreateDoc\(workspacePath\)\}>\+ 새 문서/)
    expect(fixed).toMatch(/handleCreateFolder\(workspacePath\)\}>\+ 새 폴더/)
  })

  it('스크롤 영역 안에는 검색칸이 없다', () => {
    const bodyStart = app.indexOf('<div className="app-sidebar-body">')
    expect(app.slice(bodyStart)).not.toContain('<SearchBar />')
  })

  it('파일 목록 컴포넌트에는 더 이상 루트 단추가 없다(중복 방지)', () => {
    expect(tree).not.toContain('file-tree-root-actions')
    expect(tree).not.toContain('+ 새 문서')
  })

  it('고정 영역은 줄어들지 않고 위에 쌓여(검색 결과 창이 목록 위에 뜸) 배경이 있다', () => {
    const block = css.match(/\.app-sidebar-fixed\s*\{[^}]*\}/)?.[0] ?? ''
    expect(block).toMatch(/flex-shrink:\s*0/)
    expect(block).toMatch(/z-index:\s*\d+/)
    expect(block).toMatch(/position:\s*relative/)
    expect(block).toMatch(/background:\s*var\(--bg-sidebar\)/)
  })

  it('스크롤은 목록 영역만 한다', () => {
    expect(css).toMatch(/\.app-sidebar-body\s*\{[^}]*overflow-y:\s*auto/)
    const block = css.match(/\.app-sidebar-fixed\s*\{[^}]*\}/)?.[0] ?? ''
    expect(block).not.toMatch(/overflow/)
  })
})
