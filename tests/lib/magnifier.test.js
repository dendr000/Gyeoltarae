// Copyright (c) dendr000. MIT License.
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MAGNIFIER_SIZE,
  DRAG_THRESHOLD,
  fitZoom,
  isDrag,
  isUsableRegion,
  lensOrigin,
  magnifierDiameter,
  MAGNIFIER_SIZES,
  MIN_REGION,
  nextRegionZoom,
  nextZoom,
  normalizeMagnifierSize,
  normalizeRect,
  panelToSource,
  REGION_FIT,
  REGION_ZOOM_MIN,
  regionPanel,
  regionTransform,
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

describe('영역 드래그 판정', () => {
  it('휠을 누른 자리에서 기준 거리 이하로만 움직이면 드래그가 아니다(그냥 클릭)', () => {
    expect(isDrag({ x: 100, y: 100 }, { x: 100, y: 100 })).toBe(false)
    expect(isDrag({ x: 100, y: 100 }, { x: 100 + DRAG_THRESHOLD, y: 100 })).toBe(false)
  })

  it('기준 거리를 넘으면 어느 방향이든 드래그이다(대각선 거리로 잰다)', () => {
    expect(isDrag({ x: 100, y: 100 }, { x: 100 + DRAG_THRESHOLD + 1, y: 100 })).toBe(true)
    expect(isDrag({ x: 100, y: 100 }, { x: 100, y: 100 - DRAG_THRESHOLD - 1 })).toBe(true)
    expect(isDrag({ x: 0, y: 0 }, { x: 5, y: 5 })).toBe(true)
  })

  it('끈 방향과 상관없이 왼쪽 위 기준의 사각형이 된다', () => {
    const expected = { x: 10, y: 20, width: 30, height: 40 }
    expect(normalizeRect({ x: 10, y: 20 }, { x: 40, y: 60 })).toEqual(expected)
    expect(normalizeRect({ x: 40, y: 60 }, { x: 10, y: 20 })).toEqual(expected)
    expect(normalizeRect({ x: 40, y: 20 }, { x: 10, y: 60 })).toEqual(expected)
  })

  it('가로·세로 둘 다 최소 크기 이상일 때만 쓸 수 있는 영역이다', () => {
    expect(isUsableRegion({ x: 0, y: 0, width: MIN_REGION, height: MIN_REGION })).toBe(true)
    expect(isUsableRegion({ x: 0, y: 0, width: MIN_REGION - 1, height: 200 })).toBe(false)
    expect(isUsableRegion({ x: 0, y: 0, width: 200, height: MIN_REGION - 1 })).toBe(false)
  })
})

describe('영역 확대창 계산', () => {
  const viewport = { width: 1000, height: 600 }

  it('맞춤 배율은 영역이 창의 일정 비율에 가득 차는 배율이다', () => {
    // 가로 200 -> 920/200 = 4.6, 세로 100 -> 552/100 = 5.52 : 더 작은 쪽
    expect(fitZoom({ x: 0, y: 0, width: 200, height: 100 }, viewport)).toBe(4.6)
    // 세로가 더 빡빡한 영역
    expect(fitZoom({ x: 0, y: 0, width: 100, height: 200 }, viewport)).toBe(2.76)
    expect(REGION_FIT).toBe(0.92)
  })

  it('맞춤 배율은 최대 배율을 넘지 않고, 아주 큰 영역도 최소 배율 아래로 내려가지 않는다', () => {
    expect(fitZoom({ x: 0, y: 0, width: 30, height: 30 }, viewport)).toBe(8)
    expect(fitZoom({ x: 0, y: 0, width: 1000, height: 600 }, viewport)).toBe(REGION_ZOOM_MIN)
  })

  it('확대창은 창 한가운데에 놓이고 크기는 영역 x 배율이다', () => {
    const panel = regionPanel({ x: 10, y: 10, width: 200, height: 100 }, 3, viewport)
    expect(panel).toEqual({ left: 200, top: 150, width: 600, height: 300 })
  })

  it('확대창은 창의 일정 비율을 넘지 않는다', () => {
    const panel = regionPanel({ x: 0, y: 0, width: 400, height: 300 }, 8, viewport)
    expect(panel.width).toBe(920)
    expect(panel.height).toBe(552)
    expect(panel.left).toBe(40)
    expect(panel.top).toBe(24)
  })

  it('복제본 변환은 영역의 한가운데가 확대창의 한가운데에 오게 한다', () => {
    const rect = { x: 100, y: 50, width: 200, height: 100 }
    const zoom = 3
    const panel = regionPanel(rect, zoom, viewport)
    expect(regionTransform(rect, zoom, panel)).toBe('translate(-300px, -150px) scale(3)')
    const [, tx, ty] = regionTransform(rect, zoom, panel).match(/translate\((-?[\d.]+)px, (-?[\d.]+)px\)/).map(Number)
    expect((rect.x + rect.width / 2) * zoom + tx).toBe(panel.width / 2)
    expect((rect.y + rect.height / 2) * zoom + ty).toBe(panel.height / 2)
  })

  it('확대창 안의 점은 원래 화면의 같은 자리로 되돌아간다', () => {
    const rect = { x: 100, y: 50, width: 200, height: 100 }
    const zoom = 3
    const panel = regionPanel(rect, zoom, viewport)
    // 확대창의 왼쪽 위 모서리 = 영역의 왼쪽 위 모서리, 한가운데 = 영역 한가운데, 오른쪽 아래 = 영역 오른쪽 아래
    expect(panelToSource({ x: panel.left, y: panel.top }, rect, zoom, panel)).toEqual({ x: 100, y: 50 })
    expect(panelToSource({ x: panel.left + panel.width / 2, y: panel.top + panel.height / 2 }, rect, zoom, panel)).toEqual({ x: 200, y: 100 })
    expect(panelToSource({ x: panel.left + panel.width, y: panel.top + panel.height }, rect, zoom, panel)).toEqual({ x: 300, y: 150 })
  })

  it('복제본 변환과 되돌리기가 서로 맞는다(영역 안의 한 점을 변환한 위치를 되돌리면 같은 점)', () => {
    const rect = { x: 130, y: 70, width: 90, height: 60 }
    const zoom = 4.5
    const panel = regionPanel(rect, zoom, viewport)
    const [, tx, ty] = regionTransform(rect, zoom, panel).match(/translate\((-?[\d.]+)px, (-?[\d.]+)px\)/).map(Number)
    const source = { x: 150, y: 90 }
    const shown = { x: panel.left + source.x * zoom + tx, y: panel.top + source.y * zoom + ty }
    const back = panelToSource(shown, rect, zoom, panel)
    expect(back.x).toBeCloseTo(source.x, 6)
    expect(back.y).toBeCloseTo(source.y, 6)
  })
})

describe('영역 확대창의 휠 배율', () => {
  it('위로 굴리면 커지고 아래로 굴리면 작아진다(눈금 1.2배)', () => {
    expect(nextRegionZoom(2.5, -1)).toBe(3)
    expect(nextRegionZoom(3, 1)).toBe(2.5)
  })

  it('둥근 돋보기보다 낮은 1.1배까지 내려갈 수 있고 최대를 넘지 않는다', () => {
    expect(nextRegionZoom(1.2, 1)).toBe(REGION_ZOOM_MIN)
    expect(nextRegionZoom(REGION_ZOOM_MIN, 1)).toBe(REGION_ZOOM_MIN)
    expect(nextRegionZoom(7.9, -1)).toBe(8)
    expect(nextRegionZoom(1.2, 1)).toBeLessThan(ZOOM_MIN)
  })

  it('deltaY 가 0 이거나 숫자가 아닌 시작 값은 범위 안으로 맞춘다', () => {
    expect(nextRegionZoom(3, 0)).toBe(3)
    expect(nextRegionZoom(0.5, 0)).toBe(REGION_ZOOM_MIN)
    expect(nextRegionZoom(NaN, 0)).toBe(REGION_ZOOM_MIN)
  })
})
