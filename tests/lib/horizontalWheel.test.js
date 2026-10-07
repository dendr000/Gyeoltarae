import { describe, expect, it } from 'vitest'
import { wheelScrollLeft } from '../../src/lib/horizontalWheel.js'

// 툴바(가로로 넘치는 줄)에서 마우스 휠을 굴렸을 때 새 scrollLeft. 넘치지 않거나 가로로 굴린
// 경우에는 null(= 브라우저 기본 동작에 맡김).
const box = { scrollLeft: 100, scrollWidth: 1000, clientWidth: 400 }
const wheel = (overrides = {}) => wheelScrollLeft({ deltaX: 0, deltaY: 120, deltaMode: 0, ctrlKey: false, ...box, ...overrides })

describe('wheelScrollLeft (툴바 위에서 휠로 좌우 스크롤)', () => {
  it('휠을 아래로 굴리면(deltaY +) 오른쪽으로 그만큼 스크롤된다', () => {
    expect(wheel({ deltaY: 120 })).toBe(220)
  })

  it('휠을 위로 굴리면(deltaY -) 왼쪽으로 스크롤된다', () => {
    expect(wheel({ deltaY: -60 })).toBe(40)
  })

  it('맨 왼쪽(0)보다 더 가지 않는다', () => {
    expect(wheel({ scrollLeft: 30, deltaY: -120 })).toBe(0)
  })

  it('맨 오른쪽(scrollWidth - clientWidth)보다 더 가지 않는다', () => {
    expect(wheel({ scrollLeft: 550, deltaY: 120 })).toBe(600)
  })

  it('이미 맨 끝인데 같은 방향으로 더 굴리면 null — 아무것도 가로채지 않는다', () => {
    expect(wheel({ scrollLeft: 600, deltaY: 120 })).toBeNull()
    expect(wheel({ scrollLeft: 0, deltaY: -120 })).toBeNull()
  })

  it('내용이 넘치지 않으면(스크롤할 게 없음) null', () => {
    expect(wheel({ scrollWidth: 400, clientWidth: 400 })).toBeNull()
    expect(wheel({ scrollWidth: 399, clientWidth: 400 })).toBeNull()
  })

  it('가로로 굴리는 입력(트랙패드 등, deltaX 가 더 큼)은 건드리지 않는다', () => {
    expect(wheel({ deltaX: 80, deltaY: 10 })).toBeNull()
    expect(wheel({ deltaX: -80, deltaY: 0 })).toBeNull()
  })

  it('deltaY 가 0 이면 null', () => {
    expect(wheel({ deltaY: 0 })).toBeNull()
  })

  it('Ctrl 을 누른 휠(확대·축소)은 건드리지 않는다', () => {
    expect(wheel({ ctrlKey: true })).toBeNull()
  })

  it('줄 단위 휠(deltaMode 1)은 한 줄을 16px 로 쳐서 스크롤한다', () => {
    expect(wheel({ deltaY: 3, deltaMode: 1 })).toBe(100 + 48)
  })

  it('페이지 단위 휠(deltaMode 2)은 보이는 너비만큼 스크롤한다', () => {
    expect(wheel({ deltaY: 1, deltaMode: 2 })).toBe(500)
  })

  it('소수점 스크롤 위치(고해상도 화면)도 정상으로 계산한다', () => {
    expect(wheel({ scrollLeft: 100.5, deltaY: 99.5 })).toBeCloseTo(200)
  })
})
