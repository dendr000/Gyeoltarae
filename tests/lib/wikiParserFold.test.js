// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { parseWikiText } from '../../src/lib/wikiParser.js'

// 뷰어 문단 접기 문법: `== 제목 ==`(펼친 채로) / `==# 제목 #==`(처음부터 접힌 채로, 나무위키와 같음).
const html = (text, opts) => parseWikiText(text, opts).html

describe('제목 문법', () => {
  it('==# 제목 #== 은 처음부터 접힌 제목이다', () => {
    const out = html('==# 비밀 #==\n내용')
    expect(out).toMatch(/<h2 id="h-[^"]+" class="wiki-heading wiki-foldable" data-folded="true">/)
    expect(out).toContain('비밀')
  })

  it('== 제목 == 은 펼친 채로 보인다', () => {
    expect(html('== 열림 ==\n내용')).toMatch(/class="wiki-heading wiki-foldable" data-folded="false"/)
  })

  it('급수는 = 의 개수 그대로다 (=# #= 은 1급, ====# #==== 은 4급)', () => {
    expect(html('=# a #=\n내용')).toMatch(/<h1 [^>]*data-folded="true"/)
    expect(html('====# a #====\n내용')).toMatch(/<h4 [^>]*data-folded="true"/)
  })

  it('제목 글자에 # 표시는 들어가지 않고 목차·이동 id 도 # 없는 글자로 만든다', () => {
    const result = parseWikiText('==# 비밀 문단 #==\n내용')
    expect(result.toc).toHaveLength(1)
    expect(result.toc[0].text).toBe('비밀 문단')
    expect(result.toc[0].id).toBe(parseWikiText('== 비밀 문단 ==\n내용').toc[0].id)
    expect(result.html).not.toContain('# 비밀')
  })

  it('# 가 제목 글자의 일부인 경우는 접힘 표시로 보지 않는다', () => {
    const out = html('== #태그 ==\n내용')
    expect(out).toContain('data-folded="false"')
    expect(out).toContain('#태그')
    expect(html('==#태그==\n내용')).toContain('data-folded="false"')
  })

  it('여는 쪽에만 # 가 있고 닫는 쪽에는 없는 것은 접힘 표시가 아니다 (글자로 둔다)', () => {
    expect(html('==# 제목 ==\n내용')).toContain('data-folded="false"')
  })
})

describe('구역 묶기', () => {
  it('제목 아래 내용은 구역 본문 안에 들어간다', () => {
    const out = html('== A ==\n첫째\n\n둘째')
    expect(out).toMatch(/<\/h2>\n<div class="wiki-section-body">[\s\S]*첫째[\s\S]*둘째[\s\S]*<\/div>/)
  })

  it('내용이 없는 제목은 접을 수 없다 (wiki-foldable 이 없다)', () => {
    const out = html('== 빈 문단 ==')
    expect(out).toContain('<h2 id=')
    expect(out).not.toContain('wiki-foldable')
    expect(out).not.toContain('wiki-section-body')
  })

  it('하위 제목은 윗 제목의 구역 안에 들어가고 여는 div 와 닫는 div 수가 같다', () => {
    const out = html('== A ==\n가\n=== A-1 ===\n나\n== B ==\n다')
    const a = out.indexOf('A</h2>')
    const a1 = out.indexOf('A-1')
    const b = out.indexOf('B</h2>')
    expect(a).toBeGreaterThan(-1)
    expect(a1).toBeGreaterThan(a)
    expect(out.indexOf('<div class="wiki-section-body">', a)).toBeLessThan(a1)
    expect(out.indexOf('</div>', a1)).toBeLessThan(b)
    expect(out.split('<div class="wiki-section-body">').length).toBe(out.split('</div>').length)
  })

  it('접힌 제목 안의 하위 제목은 글에 적힌 자기 상태를 따로 가진다', () => {
    const out = html('==# A #==\n가\n=== A-1 ===\n나')
    expect(out).toMatch(/data-folded="true"[^>]*>[\s\S]*data-folded="false"/)
  })

  it('각주 목록은 구역 밖(맨 아래)에 있다 (접혀도 보인다)', () => {
    const out = html('==# A #==\n본문[* 각주 내용]')
    const footnote = out.indexOf('wiki-footnote-list')
    expect(footnote).toBeGreaterThan(-1)
    const lastBodyClose = out.lastIndexOf('</div>', footnote)
    expect(lastBodyClose).toBeGreaterThan(out.indexOf('wiki-section-body'))
  })

  it('제목 앞의 글은 구역 밖에 있다', () => {
    const out = html('머리말\n== A ==\n내용')
    expect(out.indexOf('머리말')).toBeLessThan(out.indexOf('<h2'))
    expect(out.indexOf('머리말')).toBeLessThan(out.indexOf('wiki-section-body'))
  })

  it('[목차]는 구역 안팎 어디에 있어도 목차로 바뀐다', () => {
    const out = html('[목차]\n== A ==\n내용')
    expect(out).toContain('class="wiki-toc"')
    expect(out).toContain('href="#h-')
  })
})

describe('[편집] 링크', () => {
  it('접힌 제목(==# #==)에도 원문 위치가 맞는 [편집] 링크가 붙는다', () => {
    const source = '앞글\n==# 접힘 #==\n내용\n== 열림 ==\n내용2'
    const out = parseWikiText(source, { editableOffsets: true }).html
    const offsets = [...out.matchAll(/data-source-offset="(\d+)"/g)].map((m) => Number(m[1]))
    expect(offsets).toEqual([source.indexOf('==# 접힘'), source.indexOf('== 열림')])
  })
})
