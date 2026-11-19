// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { hasHangul, normalizeDictPair } from '../../src/lib/dictEntry.js'

describe('normalizeDictPair', () => {
  it('보통 항목은 그대로 돌려준다', () => {
    expect(normalizeDictPair('동방', '東方')).toEqual({ word: '동방', translation: '東方' })
    expect(normalizeDictPair(' 동방 ', ' east ')).toEqual({ word: '동방', translation: 'east' })
  })

  it('한자를 먼저 쓴 항목은 순서를 바로잡는다', () => {
    expect(normalizeDictPair('東方', '동방')).toEqual({ word: '동방', translation: '東方' })
  })

  it('한자/영문 칸에 한글이 들어간 항목은 등록할 수 없다 (중 / 중)', () => {
    expect(normalizeDictPair('중', '중')).toBeNull()
    expect(normalizeDictPair('동방', '동녘 east')).toBeNull()
  })

  it('원문에 한글과 한자가 섞여도 한자/영문 쪽에 한글이 있으면 막는다', () => {
    expect(normalizeDictPair('동방', '東방')).toBeNull()
  })

  it('빈 칸이면 null', () => {
    expect(normalizeDictPair('', '中')).toBeNull()
    expect(normalizeDictPair('중', '  ')).toBeNull()
    expect(normalizeDictPair(undefined, undefined)).toBeNull()
  })
})

describe('hasHangul', () => {
  it('한글이 있는지 본다', () => {
    expect(hasHangul('abc中')).toBe(false)
    expect(hasHangul('a중')).toBe(true)
  })
})

describe('연결', () => {
  const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')
  it('일괄·단일 등록이 모두 같은 규칙(normalizeDictPair)을 쓴다', () => {
    expect(read('src/store/useAppStore.js')).toMatch(/normalizeDictPair\(match\[1\], match\[2\]\)/)
  })

  it('창은 한자/영문 칸에 한글이 있으면 등록하지 않고 안내한다', () => {
    const modal = read('src/components/DictModal.jsx')
    expect(modal).toMatch(/hasHangul\(translation\)/)
    expect(modal).toContain('dict-form-error')
  })
})
