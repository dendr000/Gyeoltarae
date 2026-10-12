import { describe, expect, it } from 'vitest'
import { NO_TEMPLATE, chooseStartTemplate } from '../../src/lib/defaultTemplate.js'

const templateIndex = {
  강의: { name: '강의', path: '/t/강의.md', rawText: '강의 틀 본문\n' },
  실습: { name: '실습', path: '/t/실습.md', rawText: '실습 틀 본문\n' },
  빈틀: { name: '빈틀', path: '/t/빈틀.md', rawText: '' },
  외부: { name: '외부', path: null, rawText: '' }, // 다른 문서가 가져다 쓴 이름만 있는 항목(실제 틀 문서 없음)
}

describe('chooseStartTemplate (새 문서의 시작 틀 우선순위)', () => {
  it('직접 고른 틀이 폴더 기본 틀보다 먼저다', () => {
    const r = chooseStartTemplate({ explicit: '실습', folderDefaultName: '강의', templateIndex })
    expect(r.source).toBe('explicit')
    expect(r.template).toBe(templateIndex.실습)
  })

  it('고르지 않았으면(빈 값·undefined) 폴더 기본 틀을 쓴다', () => {
    for (const explicit of [undefined, '']) {
      const r = chooseStartTemplate({ explicit, folderDefaultName: '강의', templateIndex })
      expect(r.source).toBe('folder')
      expect(r.template).toBe(templateIndex.강의)
    }
  })

  it('"틀을 쓰지 않음"을 고르면 폴더 기본 틀도 건너뛰고 빈 문서(source: none)', () => {
    const r = chooseStartTemplate({ explicit: NO_TEMPLATE, folderDefaultName: '강의', templateIndex })
    expect(r).toEqual({ source: 'none', template: null })
  })

  it('고른 틀이 없어졌으면 폴더 기본 틀로 넘어간다', () => {
    const r = chooseStartTemplate({ explicit: '없는틀', folderDefaultName: '강의', templateIndex })
    expect(r.source).toBe('folder')
  })

  it('폴더 기본 틀이 없어졌거나 내용이 비었으면 fallback (내장 기본 내용을 호출한 쪽이 이어서 정한다)', () => {
    expect(chooseStartTemplate({ folderDefaultName: '없는틀', templateIndex }).source).toBe('fallback')
    expect(chooseStartTemplate({ folderDefaultName: '빈틀', templateIndex }).source).toBe('fallback')
    expect(chooseStartTemplate({ folderDefaultName: '외부', templateIndex }).source).toBe('fallback')
  })

  it('아무것도 없으면 fallback', () => {
    expect(chooseStartTemplate({ templateIndex })).toEqual({ source: 'fallback', template: null })
    expect(chooseStartTemplate({ templateIndex: undefined })).toEqual({ source: 'fallback', template: null })
  })
})
