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

// ---- 드래그한 영역 확대 (휠 클릭을 누른 채 끌기) ----
// 휠 클릭을 누른 채 이 거리(px)보다 더 움직이면 "그냥 클릭(켜기/끄기)"이 아니라 영역 드래그로 본다.
export const DRAG_THRESHOLD = 6
// 영역의 가로·세로가 이보다 작으면 실수로 끈 것으로 보고 무시한다.
export const MIN_REGION = 24
// 영역 확대창은 창(윈도 안쪽 크기)의 이 비율을 넘지 않는다.
export const REGION_FIT = 0.92

export function isDrag(start, current) {
  return Math.hypot(current.x - start.x, current.y - start.y) > DRAG_THRESHOLD
}

// 두 점이 이루는 사각형(어느 방향으로 끌었든 왼쪽 위 기준).
export function normalizeRect(a, b) {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return { x, y, width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) }
}

export function isUsableRegion(rect) {
  return rect.width >= MIN_REGION && rect.height >= MIN_REGION
}

// 영역이 확대창에 가득 차는 배율. 창(viewport)을 넘지 않게 맞추고, ZOOM_MAX 를 넘지 않는다.
export function fitZoom(rect, viewport) {
  const fit = Math.min((viewport.width * REGION_FIT) / rect.width, (viewport.height * REGION_FIT) / rect.height)
  return Math.round(Math.min(ZOOM_MAX, Math.max(REGION_ZOOM_MIN, fit)) * 100) / 100
}

// 영역 확대창(패널)의 위치·크기. 창 한가운데에 놓고, 크기는 영역 x 배율이되 창의 REGION_FIT 를 넘지 않는다.
export function regionPanel(rect, zoom, viewport) {
  const width = Math.min(rect.width * zoom, viewport.width * REGION_FIT)
  const height = Math.min(rect.height * zoom, viewport.height * REGION_FIT)
  return { left: (viewport.width - width) / 2, top: (viewport.height - height) / 2, width, height }
}

// 화면 복제본을 패널 안에 넣는 변환. 영역의 한가운데가 패널의 한가운데에 오도록 옮긴 뒤 키운다.
export function regionTransform(rect, zoom, panel) {
  const x = panel.width / 2 - (rect.x + rect.width / 2) * zoom
  const y = panel.height / 2 - (rect.y + rect.height / 2) * zoom
  return `translate(${x}px, ${y}px) scale(${zoom})`
}

// 패널 안의 점(창 기준 좌표)이 원래 화면의 어느 점인지. 패널 안에서 한 클릭을 진짜 화면의 그 자리로 전달할 때 쓴다.
export function panelToSource(point, rect, zoom, panel) {
  return {
    x: rect.x + rect.width / 2 + (point.x - panel.left - panel.width / 2) / zoom,
    y: rect.y + rect.height / 2 + (point.y - panel.top - panel.height / 2) / zoom,
  }
}

// 영역 확대창의 휠 배율. 둥근 돋보기(nextZoom)와 같은 한 눈금 1.2배이지만, 영역이 클 때는 맞춤 배율이 ZOOM_MIN 보다 작을 수 있어 아래쪽 한계를 1.1배로 둔다.
export const REGION_ZOOM_MIN = 1.1
export function nextRegionZoom(zoom, deltaY) {
  const current = Number.isFinite(zoom) ? Math.min(ZOOM_MAX, Math.max(REGION_ZOOM_MIN, zoom)) : REGION_ZOOM_MIN
  if (!deltaY) return current
  const next = deltaY < 0 ? current * ZOOM_STEP : current / ZOOM_STEP
  return Math.round(Math.min(ZOOM_MAX, Math.max(REGION_ZOOM_MIN, next)) * 100) / 100
}
