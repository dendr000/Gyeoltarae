// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MAGNIFIER_SIZE,
  lensOrigin,
  magnifierDiameter,
  MAGNIFIER_SIZES,
  nextZoom,
  normalizeMagnifierSize,
  stageTransform,
  ZOOM_DEFAULT,
  ZOOM_MAX,
  ZOOM_MIN,
} from '../../shared/magnifier.js'

// 돋보기(마우스 휠 클릭)의 값과 계산. 크기 4단계, 휠 배율 범위, 마우스가 정중앙인 위치·변환.
describe('돋보기 크기', () => {
  it('4단계이고 클수록 지름이 크다', () => {
    expect(Object.keys(MAGNIFIER_SIZES)).toEqual(['small', 'normal', 'large', 'xlarge'])
    const d = Object.values(MAGNIFIER_SIZES)
    expect([...d].sort((a, b) => a - b)).toEqual(d)
    expect(new Set(d).size).toBe(4)
  })

  it('기본은 보통이다', () => {
    expect(DEFAULT_MAGNIFIER_SIZE).toBe('normal')
    expect(normalizeMagnifierSize(undefined)).toBe('normal')
  })

  it('정해진 이름만 받는다', () => {
    for (const id of Object.keys(MAGNIFIER_SIZES)) expect(normalizeMagnifierSize(id)).toBe(id)
  })

  it('이상한 값은 보통으로 본다', () => {
    for (const bad of [null, '', 'huge', 'SMALL', 240, ['small'], { small: 1 }, '__proto__', 'toString', 'constructor', true]) {
      expect(normalizeMagnifierSize(bad)).toBe('normal')
    }
  })

  it('지름은 이름에 맞는 값이고, 이상한 이름은 보통의 지름이다', () => {
    expect(magnifierDiameter('small')).toBe(MAGNIFIER_SIZES.small)
    expect(magnifierDiameter('xlarge')).toBe(MAGNIFIER_SIZES.xlarge)
    expect(magnifierDiameter('nope')).toBe(MAGNIFIER_SIZES.normal)
  })
})

describe('휠 배율 nextZoom', () => {
  it('위로 굴리면(deltaY 음수) 커지고 아래로 굴리면 작아진다', () => {
    expect(nextZoom(2, -100)).toBeGreaterThan(2)
    expect(nextZoom(2, 100)).toBeLessThan(2)
  })

  it('눈금 하나는 1.2배이다(소수 둘째 자리까지)', () => {
    expect(nextZoom(2.5, -1)).toBe(3)
    expect(nextZoom(3, 1)).toBe(2.5)
    expect(nextZoom(2, -1)).toBe(2.4)
  })

  it('deltaY 의 크기와 상관없이 눈금 하나씩만 움직인다', () => {
    expect(nextZoom(2, -1)).toBe(nextZoom(2, -500))
  })

  it('최소·최대를 넘지 않는다', () => {
    expect(nextZoom(ZOOM_MAX, -100)).toBe(ZOOM_MAX)
    expect(nextZoom(ZOOM_MAX - 0.1, -100)).toBe(ZOOM_MAX)
    expect(nextZoom(ZOOM_MIN, 100)).toBe(ZOOM_MIN)
    expect(nextZoom(ZOOM_MIN + 0.1, 100)).toBe(ZOOM_MIN)
  })

  it('deltaY 가 0 이면 그대로, 범위 밖 시작 값은 범위 안으로 맞춘다', () => {
    expect(nextZoom(3, 0)).toBe(3)
    expect(nextZoom(100, 0)).toBe(ZOOM_MAX)
    expect(nextZoom(0.1, 0)).toBe(ZOOM_MIN)
  })

  it('숫자가 아닌 시작 값은 기본 배율로 본다', () => {
    expect(nextZoom(undefined, 0)).toBe(ZOOM_DEFAULT)
    expect(nextZoom(NaN, 0)).toBe(ZOOM_DEFAULT)
    expect(nextZoom(Infinity, 0)).toBe(ZOOM_DEFAULT)
  })

  it('기본 배율은 범위 안이다', () => {
    expect(ZOOM_DEFAULT).toBeGreaterThanOrEqual(ZOOM_MIN)
    expect(ZOOM_DEFAULT).toBeLessThanOrEqual(ZOOM_MAX)
  })
})

describe('돋보기 위치·변환', () => {
  it('마우스가 돋보기 정중앙이 되도록 왼쪽 위 모서리를 잡는다', () => {
    expect(lensOrigin({ x: 300, y: 200 }, 240)).toEqual({ left: 180, top: 80 })
    expect(lensOrigin({ x: 10, y: 10 }, 160)).toEqual({ left: -70, top: -70 })
  })

  it('복제본 변환은 마우스가 있는 점이 돋보기 정중앙에 오게 한다', () => {
    const mouse = { x: 300, y: 200 }
    const d = 240
    const zoom = 3
    expect(stageTransform(mouse, d, zoom)).toBe('translate(-780px, -480px) scale(3)')
    // 변환 뒤 마우스 점의 위치(= 점 * 배율 + 이동)가 돋보기 중앙(지름/2)이다.
    const [, tx, ty] = stageTransform(mouse, d, zoom).match(/translate\((-?[\d.]+)px, (-?[\d.]+)px\)/).map(Number)
    expect(mouse.x * zoom + tx).toBe(d / 2)
    expect(mouse.y * zoom + ty).toBe(d / 2)
  })

  it('배율 1 이면 이동만 있고 크기는 그대로다', () => {
    expect(stageTransform({ x: 100, y: 50 }, 200, 1)).toBe('translate(0px, 50px) scale(1)')
  })
})
