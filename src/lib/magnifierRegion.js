// Copyright (c) dendr000. MIT License.
import { fitZoom, nextRegionZoom, panelToSource, regionPanel, regionTransform } from '../../shared/magnifier.js'
import { createCloneView } from './magnifierClone.js'
import { markHover } from './magnifierDom.js'
import { createHoverForwarder, dispatchMouse, focusLikeClick, pickTarget } from './magnifierForward.js'

// 휠 클릭을 누른 채 끌어 고른 영역을 창 한가운데에 크게 보여 주는 확대창. 둥근 돋보기와 달리 이 창은 마우스를 받는다(pointer-events: auto) —
// 영역이 마우스 자리가 아니라 창 가운데에 떠 있어서, 확대창 안의 마우스 동작을 진짜 화면의 같은 자리로 전달해야 단추·링크·오버가 동작한다(magnifierForward.js).
// 마우스 오버 색(:hover)은 복제본에 진짜로 걸린다. 휠은 배율을 바꾼다(영역의 한가운데는 그대로).
export function openRegion({ rect }) {
  const viewport = () => ({ width: window.innerWidth, height: window.innerHeight })
  let zoom = fitZoom(rect, viewport())
  let panel = regionPanel(rect, zoom, viewport())
  let frame = 0
  let marked = []
  let hoverTarget = null

  const view = createCloneView({ className: 'magnifier-host magnifier-region', onDirty: schedule })
  const { host, stage } = view

  function paint() {
    frame = 0
    panel = regionPanel(rect, zoom, viewport())
    host.style.width = `${panel.width}px`
    host.style.height = `${panel.height}px`
    host.style.transform = `translate(${panel.left}px, ${panel.top}px)`
    stage.style.transform = regionTransform(rect, zoom, panel)
    view.sync()
    // 복제본을 다시 만들면 오버 표시가 사라지므로 마우스 아래 요소에 다시 붙인다.
    marked = markHover(stage, document.body, hoverTarget, marked)
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(paint)
  }
  paint()

  // 확대창 안의 마우스 동작 -> 진짜 화면의 같은 자리.
  const hover = createHoverForwarder()
  const sourcePoint = (e) => panelToSource({ x: e.clientX, y: e.clientY }, rect, zoom, panel)
  const forward = (type) => (e) => {
    if (!e.isTrusted) return
    // 진짜 마우스 누름의 기본 동작(포커스를 body 로 옮김)은 막는다 — 전달한 누름이 진짜 요소로 옮긴 포커스(입력 칸의 캐럿)를 그대로 둔다.
    if (type === 'mousedown') e.preventDefault()
    const point = sourcePoint(e)
    const target = pickTarget(point, host)
    if (!target) return
    const event = dispatchMouse(target, type, point, e)
    if (type === 'mousedown') focusLikeClick(target, point, event)
    if (type === 'contextmenu') e.preventDefault()
  }
  const onMove = (e) => {
    if (!e.isTrusted) return
    const point = sourcePoint(e)
    const target = pickTarget(point, host)
    hover.move(target, point, e)
    hoverTarget = target
    // 복제본은 마우스를 받지 않으므로(inert) 마우스 아래 진짜 요소의 오버 색을 복제본에 표시로 입힌다.
    marked = markHover(stage, document.body, target, marked)
  }
  const onLeave = (e) => {
    if (!e.isTrusted) return
    hover.leave(sourcePoint(e), e)
    hoverTarget = null
    marked = markHover(stage, document.body, null, marked)
  }
  const listeners = [
    ['mousemove', onMove],
    ['mouseleave', onLeave],
    ['mousedown', forward('mousedown')],
    ['mouseup', forward('mouseup')],
    ['click', forward('click')],
    ['dblclick', forward('dblclick')],
    ['contextmenu', forward('contextmenu')],
  ]
  for (const [type, handler] of listeners) host.addEventListener(type, handler)

  return {
    kind: 'region',
    host,
    wheel(deltaY) {
      zoom = nextRegionZoom(zoom, deltaY)
      schedule()
    },
    close() {
      if (frame) cancelAnimationFrame(frame)
      for (const [type, handler] of listeners) host.removeEventListener(type, handler)
      view.destroy()
    },
  }
}
