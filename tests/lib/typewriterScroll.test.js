// Copyright (c) dendr000. MIT License.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { normalizeTypewriterZone } from '../../shared/typewriterZone.js'
import {
  TYPEWRITER_MAX_CHARS,
  canTypewrite,
  isTypewriterNavKey,
  typewriterScrollTop,
  zoneRatio,
} from '../../src/lib/typewriterScroll.js'

// 타자기 스크롤: 글을 쓰는 줄(커서)이 편집창의 고른 높이(세로 5등분 중 한 구역의 한가운데)에 머물도록 편집창을 스크롤한다.
// 구역 1 = 맨 위쪽, 구역 2 = 위쪽, 구역 3 = 가운데, 구역 4 = 아래쪽, 구역 5 = 맨 아래쪽, 0 = 끔(기본).

describe('normalizeTypewriterZone (설정값 검증)', () => {
  it('0~5 의 정수는 그대로다', () => {
    for (const zone of [0, 1, 2, 3, 4, 5]) expect(normalizeTypewriterZone(zone)).toBe(zone)
  })

  it('그 밖의 값은 끔(0)이다', () => {
    for (const bad of [-1, 6, 2.5, NaN, Infinity, '3', '', null, undefined, true, {}, [3]]) {
      expect(normalizeTypewriterZone(bad)).toBe(0)
    }
  })
})

describe('zoneRatio (구역 -> 편집창 높이의 몇 % 지점)', () => {
  it('각 구역의 한가운데다: 10% 30% 50% 70% 90%', () => {
    expect([1, 2, 3, 4, 5].map((zone) => Math.round(zoneRatio(zone) * 100))).toEqual([10, 30, 50, 70, 90])
  })

  it('끔(0)이거나 잘못된 값이면 null 이다', () => {
    expect(zoneRatio(0)).toBeNull()
    expect(zoneRatio(9)).toBeNull()
    expect(zoneRatio('2')).toBeNull()
    expect(zoneRatio(undefined)).toBeNull()
  })
})

describe('typewriterScrollTop (커서 줄이 그 구역에 오게 하는 scrollTop)', () => {
  // 편집창 높이 500, 줄 높이 20, 글 전체 높이(아래 여백 포함) 3000 — 한가운데는 250px 지점
  const base = { caretTop: 1000, lineHeight: 20, clientHeight: 500, scrollHeight: 3000 }

  it('구역 3(가운데): 커서 줄의 가운데가 편집창 높이의 50% 에 온다', () => {
    // 줄 가운데 1010 - 250 = 760
    expect(typewriterScrollTop({ ...base, zone: 3 })).toBe(760)
  })

  it('구역마다 커서가 오는 높이가 다르다 (구역 1 이 가장 위, 5 가 가장 아래)', () => {
    const tops = [1, 2, 3, 4, 5].map((zone) => typewriterScrollTop({ ...base, zone }))
    // 커서 줄이 위에 올수록 scrollTop 은 커진다: 1010-50, 1010-150, 1010-250, 1010-350, 1010-450
    expect(tops).toEqual([960, 860, 760, 660, 560])
  })

  it('끔(0)이면 null 이다 (스크롤을 건드리지 않는다)', () => {
    expect(typewriterScrollTop({ ...base, zone: 0 })).toBeNull()
    expect(typewriterScrollTop({ ...base, zone: undefined })).toBeNull()
  })

  it('글 맨 위 근처라서 음수가 되면 0 이다 (커서가 위쪽에 그대로 있다)', () => {
    expect(typewriterScrollTop({ ...base, caretTop: 100, zone: 3 })).toBe(0)
    expect(typewriterScrollTop({ ...base, caretTop: 0, zone: 2 })).toBe(0)
  })

  it('글 맨 아래 근처라서 스크롤 한계를 넘으면 한계(scrollHeight - clientHeight)다', () => {
    // 최대 3000 - 500 = 2500
    expect(typewriterScrollTop({ ...base, caretTop: 2900, zone: 3 })).toBe(2500)
    expect(typewriterScrollTop({ ...base, caretTop: 2700, zone: 1 })).toBe(2500) // 2710 - 50 = 2660 -> 한계 2500
    expect(typewriterScrollTop({ ...base, caretTop: 2480, zone: 1 })).toBe(2440) // 한계 안이면 그대로
  })

  it('글이 짧아서 스크롤할 곳이 없으면 항상 0 이다', () => {
    expect(typewriterScrollTop({ caretTop: 300, lineHeight: 20, clientHeight: 500, scrollHeight: 400, zone: 3 })).toBe(0)
    expect(typewriterScrollTop({ caretTop: 300, lineHeight: 20, clientHeight: 500, scrollHeight: 500, zone: 3 })).toBe(0)
  })

  it('결과는 정수로 반올림한다 (소수 스크롤로 글이 흔들리지 않게)', () => {
    const result = typewriterScrollTop({ caretTop: 1000.4, lineHeight: 19.5, clientHeight: 501, scrollHeight: 3000, zone: 3 })
    expect(Number.isInteger(result)).toBe(true)
    expect(result).toBe(760) // 1000.4 + 9.75 - 250.5 = 759.65 -> 760
  })

  it('같은 줄에 있는 동안은 같은 값이다 (줄이 바뀔 때만 스크롤이 움직인다)', () => {
    const a = typewriterScrollTop({ ...base, zone: 3 })
    const b = typewriterScrollTop({ ...base, zone: 3 })
    expect(a).toBe(b)
    expect(typewriterScrollTop({ ...base, caretTop: 1020, zone: 3 })).toBe(a + 20) // 한 줄 아래로 가면 한 줄만큼만 더 스크롤
  })
})

describe('canTypewrite (아주 긴 글에서는 쓰지 않는다)', () => {
  it('보통 길이의 글은 쓴다 (한도 30만 자까지)', () => {
    expect(canTypewrite(0)).toBe(true)
    expect(canTypewrite(11000)).toBe(true)
    expect(canTypewrite(TYPEWRITER_MAX_CHARS)).toBe(true)
  })

  it('한도를 넘는 글에서는 쓰지 않는다 (글을 쓸 때마다 커서 위치를 재는 비용이 글 길이에 비례해서 느려지므로)', () => {
    expect(canTypewrite(TYPEWRITER_MAX_CHARS + 1)).toBe(false)
    expect(canTypewrite(1_700_000)).toBe(false)
  })

  it('한도는 30만 자다', () => {
    expect(TYPEWRITER_MAX_CHARS).toBe(300_000)
  })
})

describe('isTypewriterNavKey (커서를 옮기는 키)', () => {
  it('방향키·Home·End·PageUp·PageDown 이다', () => {
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown']) {
      expect(isTypewriterNavKey(key)).toBe(true)
    }
  })

  it('글자·Enter·Shift 같은 키는 아니다 (글자와 Enter 는 입력 이벤트가 따로 처리한다)', () => {
    for (const key of ['a', 'Enter', 'Shift', 'Control', 'Alt', 'Escape', 'Tab', 'Backspace', 'c']) {
      expect(isTypewriterNavKey(key)).toBe(false)
    }
  })
})

describe('소스 점검: 편집기에 연결됐다', () => {
  const pane = readFileSync(new URL('../../src/components/EditorPane.jsx', import.meta.url), 'utf8')

  it('설정값(typewriterZone)을 스토어에서 읽는다', () => {
    expect(pane).toMatch(/useAppStore\(\(s\) => s\.typewriterZone\)/)
  })

  it('글을 쓸 때(onChange) 바로 recenterCaret 을 부른다', () => {
    expect(pane).toMatch(/onChange=\{\(e\) => \{[\s\S]{0,400}recenterCaret\(\)/)
  })

  it('커서를 옮기는 키(keydown)에서는 다음 프레임에 recenterCaret 을 부른다', () => {
    expect(pane).toMatch(/isTypewriterNavKey\(e\.key\)[\s\S]{0,120}requestAnimationFrame\(recenterCaret\)/)
  })

  it('끔이면 recenterCaret 이 아무것도 하지 않는다', () => {
    expect(pane).toMatch(/function recenterCaret\(\) \{\s*if \(!typewriterZone\) return/)
  })

  it('아주 긴 글에서는 recenterCaret 이 건너뛴다 (canTypewrite)', () => {
    expect(pane).toMatch(/!canTypewrite\(textarea\.value\.length\)\) return/)
  })
})
