// Copyright (c) dendr000. MIT License.
import { lensOrigin, magnifierDiameter, nextZoom, stageTransform } from '../../shared/magnifier.js'
import { createCloneView } from './magnifierClone.js'
import { markHover } from './magnifierDom.js'

// 마우스를 따라다니는 둥근 돋보기. 마우스 입력은 받지 않는다(pointer-events: none) — 마우스가 돋보기를 뚫고 아래의 진짜 화면에 닿는다.
// 확대의 중심도 마우스 위치라서 돋보기 한가운데에 보이는 것이 곧 마우스 바로 아래의 진짜 요소다. 그래서 클릭·마우스 오버·드래그는 진짜 화면에서 일어난다.
export function openLens({ start, size, zoom: startZoom, onZoomChange }) {
  let mouse = start
  let diameter = magnifierDiameter(size)
  let zoom = startZoom
  let frame = 0
  let marked = []

  const view = createCloneView({ className: 'magnifier-host', onDirty: schedule })

  function paint() {
    frame = 0
    const origin = lensOrigin(mouse, diameter)
    const { host, stage } = view
    host.style.width = `${diameter}px`
    host.style.height = `${diameter}px`
    host.style.transform = `translate(${origin.left}px, ${origin.top}px)`
    stage.style.transform = stageTransform(mouse, diameter, zoom)
    view.sync()
    // 마우스 아래의 진짜 요소(돋보기는 마우스를 받지 않아 그대로 보인다)를 복제본에도 오버 표시한다.
    marked = markHover(stage, document.body, document.elementFromPoint(mouse.x, mouse.y), marked)
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(paint)
  }
  paint()

  return {
    kind: 'lens',
    moveTo(point) {
      mouse = point
      schedule()
    },
    wheel(deltaY) {
      zoom = nextZoom(zoom, deltaY)
      onZoomChange(zoom)
      schedule()
    },
    setSize(nextSize) {
      diameter = magnifierDiameter(nextSize)
      schedule()
    },
    close() {
      if (frame) cancelAnimationFrame(frame)
      view.destroy()
    },
  }
}
