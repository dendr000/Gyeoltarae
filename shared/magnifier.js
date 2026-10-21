// Copyright (c) dendr000. MIT License.

// 돋보기(마우스 휠 클릭)의 값과 계산. 메인 프로세스(설정 저장·메뉴)와 화면(돋보기 컴포넌트)이 함께 쓰는 순수 함수라서 shared/ 에 둔다.
//   - 크기는 4단계(작게·보통·크게·아주 크게)이고 둥근 돋보기의 지름(px)이다.
//   - 배율은 휠로 바꾸며 ZOOM_MIN~ZOOM_MAX 안에서만 움직인다.
//   - 돋보기의 중심은 마우스 위치다. 확대의 중심도 같은 점이라서 돋보기 한가운데에 보이는 것이 마우스 아래의 진짜 요소다.
export const MAGNIFIER_SIZES = { small: 160, normal: 240, large: 340, xlarge: 460 }
export const DEFAULT_MAGNIFIER_SIZE = 'normal'

export const ZOOM_MIN = 1.5
export const ZOOM_MAX = 8
export const ZOOM_DEFAULT = 2.5
// 휠 한 칸(눈금)마다 곱하거나 나누는 비율.
export const ZOOM_STEP = 1.2

// 정해진 이름(문자열)만 받고, 그 밖의 값(없음, 숫자, 배열, 모르는 이름)은 기본(보통)으로 본다 — 망가진 설정 파일이 와도 기본으로 돌아간다.
export function normalizeMagnifierSize(value) {
  return typeof value === 'string' && Object.hasOwn(MAGNIFIER_SIZES, value) ? value : DEFAULT_MAGNIFIER_SIZE
}

export function magnifierDiameter(size) {
  return MAGNIFIER_SIZES[normalizeMagnifierSize(size)]
}

// 휠 눈금 하나(deltaY: 위로 굴리면 음수)에 따른 새 배율. 위로 굴리면 확대, 아래로 굴리면 축소. 범위를 넘지 않고 소수 둘째 자리까지만 둔다.
export function nextZoom(zoom, deltaY) {
  const current = Number.isFinite(zoom) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom)) : ZOOM_DEFAULT
  if (!deltaY) return current
  const next = deltaY < 0 ? current * ZOOM_STEP : current / ZOOM_STEP
  return Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next)) * 100) / 100
}

// 돋보기(둥근 창)의 왼쪽 위 모서리. 마우스가 정중앙이 되도록 한다.
export function lensOrigin(mouse, diameter) {
  return { left: mouse.x - diameter / 2, top: mouse.y - diameter / 2 }
}

// 화면 복제본(창 크기 그대로, 왼쪽 위가 기준점)을 돋보기 안에 넣는 변환. 마우스가 있는 점이 돋보기 정중앙에 오도록 옮긴 뒤 키운다.
export function stageTransform(mouse, diameter, zoom) {
  const x = diameter / 2 - mouse.x * zoom
  const y = diameter / 2 - mouse.y * zoom
  return `translate(${x}px, ${y}px) scale(${zoom})`
}
