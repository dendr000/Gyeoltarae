// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import { wrapSections } from '../../src/lib/sectionFold.js'

// 뷰어 문단 접기: 제목(heading)과 그 아래 내용을 구역(section)으로 묶는 순수 함수의 규칙.
// 항목은 문자열(일반 블록 html) 또는 { heading: true, level, build(foldable) } 이다.
const h = (level, name) => ({ heading: true, level, build: (foldable) => `<h${level}${foldable ? ' F' : ''}>${name}</h${level}>` })
const BODY = '<div class="wiki-section-body">'

describe('wrapSections', () => {
  it('제목이 없으면 그대로 돌려준다', () => {
    expect(wrapSections(['<p>a</p>', '<p>b</p>'])).toEqual(['<p>a</p>', '<p>b</p>'])
    expect(wrapSections([])).toEqual([])
  })

  it('제목 앞의 내용은 구역 밖에 둔다', () => {
    expect(wrapSections(['<p>머리말</p>', h(2, 'A'), '<p>내용</p>'])).toEqual(['<p>머리말</p>', '<h2 F>A</h2>', BODY, '<p>내용</p>', '</div>'])
  })

  it('제목 아래 내용을 구역 본문(div)으로 감싸고 제목은 접을 수 있다고 알린다', () => {
    expect(wrapSections([h(2, 'A'), '<p>x</p>', '<p>y</p>'])).toEqual(['<h2 F>A</h2>', BODY, '<p>x</p>', '<p>y</p>', '</div>'])
  })

  it('내용이 없는 제목은 본문을 만들지 않고 접을 수 없다고 알린다', () => {
    expect(wrapSections([h(2, 'A'), h(2, 'B'), '<p>x</p>'])).toEqual(['<h2>A</h2>', '<h2 F>B</h2>', BODY, '<p>x</p>', '</div>'])
    expect(wrapSections([h(2, 'A')])).toEqual(['<h2>A</h2>'])
  })

  it('같은 급이거나 더 큰 제목이 나오면 앞 구역이 닫힌다', () => {
    const out = wrapSections([h(2, 'A'), '<p>1</p>', h(2, 'B'), '<p>2</p>', h(1, 'C'), '<p>3</p>'])
    expect(out).toEqual(['<h2 F>A</h2>', BODY, '<p>1</p>', '</div>', '<h2 F>B</h2>', BODY, '<p>2</p>', '</div>', '<h1 F>C</h1>', BODY, '<p>3</p>', '</div>'])
  })

  it('더 작은 제목은 앞 구역 안에 들어간다 (하위 문단)', () => {
    const out = wrapSections([h(2, 'A'), '<p>1</p>', h(3, 'A-1'), '<p>2</p>', h(2, 'B'), '<p>3</p>'])
    expect(out).toEqual(['<h2 F>A</h2>', BODY, '<p>1</p>', '<h3 F>A-1</h3>', BODY, '<p>2</p>', '</div>', '</div>', '<h2 F>B</h2>', BODY, '<p>3</p>', '</div>'])
  })

  it('바로 아래에 하위 제목만 있어도 윗 제목은 접을 수 있다 (하위가 안에 들어가므로)', () => {
    const out = wrapSections([h(2, 'A'), h(3, 'A-1'), '<p>x</p>'])
    expect(out).toEqual(['<h2 F>A</h2>', BODY, '<h3 F>A-1</h3>', BODY, '<p>x</p>', '</div>', '</div>'])
  })

  it('급을 건너뛰어도(2 다음 4) 묶는다', () => {
    const out = wrapSections([h(2, 'A'), h(4, 'D'), '<p>x</p>', h(3, 'C'), '<p>y</p>'])
    expect(out).toEqual(['<h2 F>A</h2>', BODY, '<h4 F>D</h4>', BODY, '<p>x</p>', '</div>', '<h3 F>C</h3>', BODY, '<p>y</p>', '</div>', '</div>'])
  })

  it('여는 div 와 닫는 div 의 수가 늘 같다', () => {
    const items = [h(1, 'a'), h(2, 'b'), h(3, 'c'), '<p>x</p>', h(2, 'd'), h(1, 'e'), '<p>y</p>', h(3, 'f')]
    const joined = wrapSections(items).join('')
    expect(joined.split('<div').length).toBe(joined.split('</div>').length)
  })

  it('받은 목록을 바꾸지 않는다', () => {
    const items = [h(2, 'A'), '<p>x</p>']
    const copy = [...items]
    wrapSections(items)
    expect(items).toEqual(copy)
  })
})
