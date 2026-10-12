import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// 편집 모드의 제목 강조는 입력칸(.editor-textarea) 뒤에 같은 글을 보이지 않게 겹쳐 그린 배경판
// (.editor-highlight-backdrop)에서 칠한다. 두 요소의 글꼴·줄 높이·여백·스크롤바 자리가 한 글자라도 다르면
// 긴 줄이 서로 다른 곳에서 접혀 강조가 엉뚱한 줄에 겹친다(docs/troubleshooting.md 2026-10-12). 레이아웃 자체는
// 브라우저에서만 잴 수 있어서, 여기서는 두 규칙의 이 값들이 같은지만 지킨다.
const css = readFileSync(new URL('../../src/App.css', import.meta.url), 'utf8')

function ruleBody(selector) {
  const start = css.indexOf(`\n${selector} {`)
  if (start === -1) throw new Error(`${selector} 규칙을 찾지 못했다`)
  const end = css.indexOf('\n}', start)
  // 주석은 값에 영향이 없으므로 지우고 비교한다.
  return css.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '')
}

function declaration(body, property) {
  const match = body.match(new RegExp(`(?:^|[\\s;])${property}\\s*:\\s*([^;]+);`))
  return match ? match[1].trim() : null
}

const backdrop = ruleBody('.editor-highlight-backdrop')
const textarea = ruleBody('.editor-textarea')

describe('편집기 입력칸과 제목 강조 배경판의 배치 값', () => {
  for (const property of ['font', 'padding', 'scrollbar-gutter', 'tab-size']) {
    it(`${property} 가 두 요소에서 같고 비어 있지 않다`, () => {
      const a = declaration(backdrop, property)
      const b = declaration(textarea, property)
      expect(a, `배경판의 ${property}`).not.toBeNull()
      expect(b, `입력칸의 ${property}`).not.toBeNull()
      expect(a).toBe(b)
    })
  }

  it('줄 높이는 소수가 아닌 정수 px 이다 (소수면 줄이 쌓일수록 위치가 어긋난다)', () => {
    const font = declaration(textarea, 'font')
    expect(font).toMatch(/\/\d+px\b/)
  })

  it('스크롤바 자리를 항상 확보한다 (입력칸의 스크롤바 폭만큼 글 영역이 좁아지는 것을 배경판도 따라가게)', () => {
    expect(declaration(textarea, 'scrollbar-gutter')).toBe('stable')
  })
})
