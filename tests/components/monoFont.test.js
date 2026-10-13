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

// 앱에 번들한 D2Coding 글꼴(SIL OFL 1.1)이 규정대로 갖춰져 있는지 — 글꼴 파일, 라이선스 전문, 고지 문서, @font-face.
describe('번들 글꼴 D2Coding', () => {
  const FONT = 'src/assets/fonts/D2Coding-Ver1.3.2-20180524.ttf'

  it('글꼴 파일이 있고 TrueType 파일이다 (수정하지 않은 원본)', () => {
    const bytes = readFileSync(new URL(`../../${FONT}`, import.meta.url))
    expect(bytes.length).toBeGreaterThan(1_000_000)
    expect([...bytes.subarray(0, 4)]).toEqual([0, 1, 0, 0]) // TTF 머리글(sfnt version 1.0)
  })

  it('글꼴 파일의 name 테이블에 저작권·라이선스 정보가 들어 있다 (OFL 조건 2: 파일 안에서 볼 수 있어야 함)', () => {
    const bytes = readFileSync(new URL(`../../${FONT}`, import.meta.url))
    // name 테이블 문자열은 Windows 용은 UTF-16BE, Mac 용은 1바이트 글자로 들어 있어서 두 모양 중 하나로 있으면 된다.
    const has = (word) => bytes.includes(Buffer.from(word, 'latin1')) || bytes.includes(Buffer.from(word, 'utf16le').swap16())
    expect(has('NHN Corporation')).toBe(true)
    expect(has('SIL Open Font License')).toBe(true)
  })

  it('라이선스 전문 파일과 고지 문서에 OFL 1.1 전문과 저작권자가 있다', () => {
    for (const file of ['src/assets/fonts/D2Coding-OFL.txt', 'THIRD_PARTY_NOTICES.md']) {
      const text = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')
      expect(text, file).toContain('SIL OPEN FONT LICENSE Version 1.1')
      expect(text, file).toContain('Copyright (c) 2015-2016 NHN Corporation')
      expect(text, file).toContain('PERMISSION & CONDITIONS')
      expect(text, file).toContain('DISCLAIMER')
    }
  })

  it('index.css 가 설치된 글꼴(local)을 먼저, 없으면 번들한 파일(url)을 쓰도록 @font-face 를 둔다', () => {
    const block = indexCss.match(/@font-face\s*\{[^}]*D2Coding-Ver1\.3\.2[^}]*\}/)?.[0] ?? ''
    expect(block).toContain("font-family: 'D2Coding'")
    expect(block.indexOf("local('D2Coding')")).toBeGreaterThan(-1)
    expect(block.indexOf("local('D2Coding')")).toBeLessThan(block.indexOf('url('))
    expect(block).toContain("format('truetype')")
  })

  it('굵은 글씨용 @font-face 는 설치된 Bold 만 쓰고 파일을 번들하지 않는다 (용량)', () => {
    const bold = indexCss.match(/@font-face\s*\{[^}]*font-weight:\s*700[^}]*\}/)?.[0] ?? ''
    expect(bold).toContain("local('D2Coding Bold')")
    expect(bold).not.toContain('url(')
  })
})
