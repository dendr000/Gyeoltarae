// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { extractMath, hasMath, restoreMath, restoreRawMath } from '../../src/lib/mathRender.js'
import { parseWikiText } from '../../src/lib/wikiParser.js'

// 뷰어에서 수식(\( \), \[ \], $$ $$)을 KaTeX 로 그린다. 수식은 파서가 해석하기 전에 자리 표시 글자로 바꿔 두었다가 끝에서 되돌린다.
const html = (text) => parseWikiText(text).html
const katexCount = (h) => (h.match(/class="katex"/g) ?? []).length

describe('extractMath / restoreMath', () => {
  it('수식이 없으면 같은 글을 그대로 돌려준다', () => {
    const text = '그냥 글 [[문서]] \'\'기울임\'\''
    expect(extractMath(text)).toBe(text)
    expect(restoreMath(text)).toBe(text)
  })

  it('수식을 자리 표시 글자로 바꾸고, 되돌리면 그려 낸 HTML 이 된다', () => {
    const swapped = extractMath(String.raw`앞 \(x_{i}\) 뒤`)
    expect(swapped).not.toContain('\\(')
    expect(swapped).toMatch(/앞 \d+ 뒤/)
    const out = restoreMath(swapped)
    expect(out).toContain('class="katex"')
    expect(out.startsWith('앞 ')).toBe(true)
    expect(out.endsWith(' 뒤')).toBe(true)
  })

  it('한 줄에 수식이 여럿이어도 모두 바꾼다', () => {
    expect(katexCount(restoreMath(extractMath(String.raw`\(a\) 그리고 \(b\) 그리고 \(c\)`)))).toBe(3)
  })

  it('같은 수식은 같은 자리 표시 글자를 쓴다(보관함이 늘어나지 않음)', () => {
    const a = extractMath(String.raw`\(zz_{9}\)`)
    const b = extractMath(String.raw`다시 \(zz_{9}\)`)
    expect(b.slice('다시 '.length)).toBe(a)
  })

  it('\\[ \\] 와 $$ $$ 는 줄 단독(가운데 정렬) 수식이다', () => {
    expect(restoreMath(extractMath(String.raw`\[ a^{2} \]`))).toContain('katex-display')
    expect(restoreMath(extractMath('$$ a^{2} $$'))).toContain('katex-display')
  })

  it('줄에 걸친 수식도 그린다', () => {
    const text = '앞\n$$\n\\frac{a}{b}\n$$\n뒤'
    const out = restoreMath(extractMath(text))
    expect(out).toContain('katex-display')
    expect(out.startsWith('앞\n')).toBe(true)
    expect(out.endsWith('\n뒤')).toBe(true)
  })

  it('코드블록(```) 안은 건드리지 않는다', () => {
    const text = '```\n\\(x_{i}\\)\n```'
    expect(extractMath(text)).toBe(text)
  })

  it('코드블록 앞뒤의 수식은 그린다', () => {
    const out = restoreMath(extractMath('\\(a\\)\n```\n\\(b\\)\n```\n\\(c\\)'))
    expect(katexCount(out)).toBe(2)
    expect(out).toContain('```\n\\(b\\)\n```')
  })

  it('한 줄 안의 `백틱 코드` 속 \\( 는 수식이 아니다', () => {
    const text = '문법은 `\\(x\\)` 이렇게 쓴다 그리고 \\(y\\)'
    const out = restoreMath(extractMath(text))
    expect(out).toContain('`\\(x\\)`')
    expect(katexCount(out)).toBe(1)
  })

  it('문법이 틀린 수식은 오류 표시(katex-error)로 남기고 앱이 멈추지 않는다', () => {
    const out = restoreMath(extractMath(String.raw`\(\frac{1\)`))
    expect(out).toContain('katex-error')
  })

  it('닫히지 않은 \\( 는 그대로 둔다', () => {
    const text = '여는 기호만 \\( 있음'
    expect(extractMath(text)).toBe(text)
  })

  it('복원은 수식의 원문(구분 기호 포함)으로도 되돌릴 수 있다', () => {
    const swapped = extractMath(String.raw`제목 \(\sigma^{2}\)`)
    expect(restoreRawMath(swapped)).toBe(String.raw`제목 \(\sigma^{2}\)`)
  })

  it('문자열이 아닌 값은 그대로 돌려준다', () => {
    expect(extractMath(undefined)).toBeUndefined()
    expect(restoreMath(null)).toBeNull()
    expect(restoreRawMath(undefined)).toBeUndefined()
  })

  it('hasMath 는 수식 표시가 있는지만 본다', () => {
    expect(hasMath('\\(x\\)')).toBe(true)
    expect(hasMath('\\[x\\]')).toBe(true)
    expect(hasMath('$$x$$')).toBe(true)
    expect(hasMath('그냥 글')).toBe(false)
    expect(hasMath(undefined)).toBe(false)
  })
})

describe('뷰어(parseWikiText)에서의 수식', () => {
  it('\\(\\sigma ^{2}\\), \\(x_{i}\\) 같은 기호가 수식으로 그려진다(원문 글자가 그대로 남지 않는다)', () => {
    const h = html(String.raw`분산 \(\sigma ^{2}\) 과 표본 \(x_{i}\)`)
    expect(katexCount(h)).toBe(2)
    expect(h).not.toContain('\\sigma')
    expect(h).toContain('σ')
  })

  it('수식 안의 _ ^ 가 위키 문법(밑줄·위첨자·아래첨자)에 먹히지 않는다', () => {
    const h = html(String.raw`\(x_{i}\) 와 \(a_1 + b_2\) 와 ^^위첨자^^ 와 __밑줄__`)
    expect(katexCount(h)).toBe(2)
    expect(h).toContain('<sup>위첨자</sup>')
    expect(h).toContain('<u>밑줄</u>')
    expect(h).not.toContain('<u>1 + b</u>')
  })

  it('굵게·기울임이 섞여도 수식은 온전하다', () => {
    const h = html(String.raw`'''굵게 \(\mu\)''' 그리고 ''기울임 \(\bar{x}\)''`)
    expect(katexCount(h)).toBe(2)
  })

  it('제목 안의 수식도 그리고, 목차에는 원문을 보인다', () => {
    const { html: h, toc } = parseWikiText(String.raw`= 분산 \(\sigma^{2}\) =`)
    expect(h).toContain('class="katex"')
    expect(toc[0].text).toBe(String.raw`분산 \(\sigma^{2}\)`)
  })

  it('표·목록 안의 수식도 그린다', () => {
    expect(katexCount(html(String.raw`||\(x_{i}\)||\(\mu\)||`))).toBe(2)
    expect(katexCount(html(String.raw`* 첫째 \(a\)${'\n'}* 둘째 \(b\)`))).toBe(2)
  })

  it('접기 블록 안의 수식도 그린다', () => {
    expect(katexCount(html(String.raw`{{{#!folding 제목${'\n'}본문 \(x_{i}\)${'\n'}}}}`))).toBe(1)
  })

  it('코드블록 안의 수식 표기는 글자 그대로 보인다', () => {
    const h = html('```\n\\(x_{i}\\)\n```')
    expect(katexCount(h)).toBe(0)
    expect(h).toContain('x_{i}')
  })

  it('자리 표시 글자(내부용)가 결과에 남지 않는다', () => {
    expect(html(String.raw`\(a\) \[b\] $$c$$`)).not.toMatch(/[-]/)
  })

  it('수식이 없는 문서의 결과는 달라지지 않는다', () => {
    expect(html('= 제목 =\n그냥 글 \'\'기울임\'\'')).not.toContain('katex')
  })

  it('틀린 수식이 있어도 나머지 문서는 정상으로 그려진다', () => {
    const h = html(String.raw`앞 \(\frac{1\) 뒤 \(x\)` + '\n\n다음 문단')
    expect(h).toContain('katex-error')
    expect(h).toContain('다음 문단')
    expect(katexCount(h)).toBeGreaterThanOrEqual(1)
  })
})
