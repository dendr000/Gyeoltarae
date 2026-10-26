// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 코드블록 바탕색: 문서 바탕과 구분되고(라이트는 살짝 짙게, 다크는 살짝 밝게), 글자 강조 색이 그 위에서도 읽혀야 한다.
const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')
const indexCss = read('src/index.css')
const appCss = read('src/App.css')

// light-dark(라이트값, 다크값) 로 적힌 색 변수를 읽는다.
function lightDark(name) {
  const m = indexCss.match(new RegExp(`${name}:\\s*light-dark\\((#[0-9a-fA-F]{6}),\\s*(#[0-9a-fA-F]{6})\\)`))
  if (!m) throw new Error(`${name} 을 찾지 못했습니다`)
  return { light: m[1], dark: m[2] }
}
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const PAGE = { light: '#ffffff', dark: '#1c1c21' } // index.css 의 --bg (라이트 :root, 다크 data-theme)

describe('코드블록 바탕', () => {
  const code = lightDark('--code-bg')

  it('코드블록은 --code-bg 를 바탕으로 쓴다(헤더 색을 그대로 쓰지 않는다)', () => {
    expect(appCss).toMatch(/\.wiki-code-wrap\s*\{[^}]*background:\s*var\(--code-bg\)/)
    expect(appCss).not.toMatch(/\.wiki-code-wrap\s*\{[^}]*background:\s*var\(--bg-header\)/)
  })

  it('문서 바탕과 구분된다 — 라이트는 더 짙고, 다크는 더 밝다', () => {
    expect(luminance(code.light)).toBeLessThan(luminance(PAGE.light))
    expect(luminance(code.dark)).toBeGreaterThan(luminance(PAGE.dark))
  })

  it('구분은 되지만 과하지 않다(바탕과의 대비 1.08~1.3)', () => {
    for (const theme of ['light', 'dark']) {
      const c = contrast(code[theme], PAGE[theme])
      expect(c).toBeGreaterThanOrEqual(1.08)
      expect(c).toBeLessThanOrEqual(1.3)
    }
  })

  it('예전 헤더 색보다 바탕과 더 많이 다르다(눈에 띄게 달라졌다)', () => {
    const oldHeader = { light: '#f8f8fa', dark: '#1f1f24' }
    for (const theme of ['light', 'dark']) expect(contrast(code[theme], PAGE[theme])).toBeGreaterThan(contrast(oldHeader[theme], PAGE[theme]) + 0.05)
  })

  it('글자 강조 색이 이 바탕에서도 읽힌다(대비 4.5 이상)', () => {
    for (const name of ['--hl-keyword', '--hl-string', '--hl-number', '--hl-comment', '--hl-function', '--hl-type', '--hl-tag', '--hl-meta']) {
      const color = lightDark(name)
      for (const theme of ['light', 'dark']) {
        expect(contrast(color[theme], code[theme]), `${name} ${theme}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('본문 글자색도 이 바탕에서 충분히 읽힌다(대비 7 이상)', () => {
    expect(contrast('#3a3a3f', code.light)).toBeGreaterThanOrEqual(7)
    expect(contrast('#c9c9d1', code.dark)).toBeGreaterThanOrEqual(7)
  })
})
