import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 코드블록·편집기에서 한글이 섞인 줄의 열을 맞추려면 한글이 영문 정확히 2칸 폭인 고정폭 글꼴이 맨 앞에 와야 한다
// (docs/plans/font-and-column-alignment.md). 실제 폭은 브라우저에서만 잴 수 있어서 여기서는 CSS 값을 지킨다.
// 붙여넣은 탭 문자도 4칸으로 보이게 tab-size 를 코드블록·입력칸·배경판에 같이 둔다.
const read = (relative) => readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8')
const indexCss = read('src/index.css')
const appCss = read('src/App.css')

function declarationIn(css, selector, property) {
  const start = css.indexOf(`\n${selector} {`)
  if (start === -1) throw new Error(`${selector} 규칙을 찾지 못했다`)
  const body = css.slice(start, css.indexOf('\n}', start)).replace(/\/\*[\s\S]*?\*\//g, '')
  const match = body.match(new RegExp(`(?:^|[\\s;])${property}\\s*:\\s*([^;]+);`))
  return match ? match[1].trim() : null
}

describe('--mono 글꼴 목록', () => {
  const mono = indexCss.replace(/\/\*[\s\S]*?\*\//g, '').match(/--mono\s*:\s*([^;]+);/)?.[1] ?? ''
  const families = mono.split(',').map((name) => name.trim().replace(/^['"]|['"]$/g, ''))

  it('한글이 2칸 폭인 D2Coding 이 맨 앞이다', () => {
    expect(families[0]).toBe('D2Coding')
  })

  it('D2Coding 이 없는 PC 를 위해 기존 글꼴과 monospace 로 넘어간다', () => {
    expect(families).toContain('Consolas')
    expect(families[families.length - 1]).toBe('monospace')
  })
})

describe('탭 문자 너비', () => {
  it('--tab-size 는 4 이다 (Tab 키가 넣는 공백 4칸과 같은 폭)', () => {
    expect(indexCss).toMatch(/--tab-size\s*:\s*4\s*;/)
  })

  for (const selector of ['.wiki-code', '.editor-textarea', '.editor-highlight-backdrop']) {
    it(`${selector} 는 tab-size 를 --tab-size 로 쓴다`, () => {
      expect(declarationIn(appCss, selector, 'tab-size')).toBe('var(--tab-size)')
    })
  }
})
