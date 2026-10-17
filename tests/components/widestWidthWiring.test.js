// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 열 너비 패널의 "가장 긴 칸 기준" 단추의 화면 연결(소스 점검). 재는 규칙은 tests/lib/tableWidest.test.js, 실제 너비는 실제 창에서 확인한다.
const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')
const hook = read('src/components/useTableFormat.js')
const panels = read('src/components/TableFormatPanels.jsx')
const measure = read('src/components/measureCellWidth.js')

describe('useTableFormat', () => {
  it('가장 긴 칸의 너비를 재서 너비 입력칸(px)에 넣는 fillWidestWidth 를 내보낸다', () => {
    expect(hook).toContain("from '../lib/tableWidest.js'")
    expect(hook).toContain("from './measureCellWidth.js'")
    expect(hook).toMatch(/function fillWidestWidth\(\)/)
    expect(hook).toMatch(/widestCellWidth\(grid, headerRow, measurer\.measure\)/)
    expect(hook).toMatch(/setWidthForm\(\{ value: String\(width\), unit: 'px' \}\)/)
    expect(hook).toMatch(/^\s+fillWidestWidth,$/m)
  })

  it('숨긴 측정용 요소는 어떤 경우에도 치운다 (try/finally + dispose)', () => {
    expect(hook).toMatch(/try \{[\s\S]*widestCellWidth[\s\S]*\} finally \{\s*measurer\.dispose\(\)\s*\}/)
  })

  it('입력칸이 받는 최대(9999px)를 넘지 않게 맞춘다', () => {
    expect(hook).toMatch(/Math\.min\(9999, /)
  })

  it('글자가 있는 칸이 없으면 안내만 하고 입력칸은 건드리지 않는다', () => {
    expect(hook).toMatch(/if \(!widest\) \{\s*setMessage\('[^']*글자가 있는 칸이 없어서[^']*'\)\s*return\s*\}/)
  })
})

describe('TableFormatPanels', () => {
  it('열 너비 패널에 "가장 긴 칸 기준" 단추가 있고 fillWidestWidth 를 부른다', () => {
    const widthPanel = panels.slice(panels.indexOf('function WidthPanel'), panels.indexOf('function HeightPanel'))
    expect(widthPanel).toContain('가장 긴 칸 기준')
    expect(widthPanel).toContain('onClick={f.fillWidestWidth}')
  })
})

describe('measureCellWidth', () => {
  it('칸 글을 실제 표 문법으로 렌더링해 화면 밖 숨긴 표의 너비를 읽는다', () => {
    expect(measure).toContain("from '../lib/wikiParser.js'")
    expect(measure).toContain("className = 'wiki-rendered'")
    expect(measure).toContain("whiteSpace = 'nowrap'")
    expect(measure).toContain('getBoundingClientRect().width')
  })

  it('굵은 칸은 굵게 렌더링해서 재고, | 는 편집기가 문법을 만들 때와 같이 전각으로 바꾼다', () => {
    expect(measure).toContain("`'''${text}'''`")
    expect(measure).toContain("replace(/\\|/g, '｜')")
  })
})
