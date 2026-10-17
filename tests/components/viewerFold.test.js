// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 뷰어 문단 접기의 화면 연결(소스 점검). 실제 클릭·스크롤은 실제 창에서 확인한다(docs/features/section-fold.md).
const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')
const viewer = read('src/components/ViewerPane.jsx')
const toc = read('src/components/FloatingToc.jsx')
const css = read('src/App.css')

describe('뷰어 연결', () => {
  it('제목 클릭을 접기/펼치기로 처리하고, 링크는 제 일을 하게 둔다(findFoldHeading)', () => {
    expect(viewer).toContain("from '../lib/sectionFoldDom.js'")
    expect(viewer).toMatch(/findFoldHeading\(e\.target\)/)
    expect(viewer).toMatch(/toggleFold\(foldHeading\)/)
  })

  it('접기 처리는 다른 모든 링크 처리(분류·자료·틀·문서 링크) 뒤에 있다', () => {
    const handler = viewer.slice(viewer.indexOf('function handleWikiContentClick'), viewer.indexOf('function CategoryBadges'))
    expect(handler.indexOf('findFoldHeading')).toBeGreaterThan(handler.indexOf('wiki-link-ambiguous'))
    expect(handler.indexOf('findFoldHeading')).toBeGreaterThan(handler.indexOf('wiki-heading-edit-link'))
  })

  it('글자를 드래그해서 고른 직후의 클릭은 접지 않는다', () => {
    expect(viewer).toMatch(/selection && !selection\.isCollapsed/)
  })

  it('사용자가 정한 접힘 상태를 문서 경로별로 기억하고, 다시 그릴 때마다 입힌다', () => {
    expect(viewer).toContain('foldOverridesByPath')
    expect(viewer).toMatch(/useLayoutEffect\(\(\) => \{\s*applyFoldOverrides\(/)
    expect(viewer).toMatch(/onFoldChange: rememberFold/)
  })

  it('목차(본문 목차·떠 있는 목차)와 [[문서#제목]] 이동은 숨은 제목이면 먼저 펴고 이동한다', () => {
    expect(viewer).toMatch(/function revealAndScroll\(element\)[\s\S]{0,200}unfoldAncestors\(element\)/)
    expect(viewer).toMatch(/onJumpToHeading: jumpToHeadingId/)
    expect(viewer).toMatch(/<FloatingToc toc=\{toc\} onJump=\{jumpToHeadingId\} \/>/)
    expect(viewer).toMatch(/const el = document\.getElementById\(`h-\$\{anchorName\}`\)[\s\S]{0,200}revealAndScroll\(el\)/)
    expect(toc).toContain('onJump(h.id)')
  })
})

describe('CSS', () => {
  it('접힌 제목(data-folded="true") 바로 뒤의 구역 본문은 숨긴다', () => {
    expect(css).toMatch(/\.wiki-rendered \.wiki-foldable\[data-folded='true'\] \+ \.wiki-section-body\s*\{\s*display:\s*none/)
  })

  it('접을 수 있는 제목은 누를 수 있게 보이고(cursor: pointer) 화살표가 있다', () => {
    expect(css).toMatch(/\.wiki-rendered \.wiki-foldable\s*\{[^}]*cursor:\s*pointer/)
    expect(css).toMatch(/\.wiki-rendered \.wiki-foldable::before/)
    expect(css).toMatch(/\.wiki-foldable\[data-folded='true'\]::before/)
  })
})
