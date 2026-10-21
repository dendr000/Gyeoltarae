// Copyright (c) dendr000. MIT License.
import { useEffect } from 'react'
import { lensOrigin, magnifierDiameter, nextZoom, stageTransform, ZOOM_DEFAULT } from '../../shared/magnifier.js'
import { cloneStyleNodes, collectHoverCss, markHover, rebuildClone } from '../lib/magnifierDom.js'
import { useAppStore } from '../store/useAppStore.js'

// 마우스 휠 클릭으로 켜고 끄는 둥근 돋보기. 앱 화면을 복제해 마우스 위치를 중심으로 키워 보여 준다(규칙: src/lib/magnifierDom.js, shared/magnifier.js).
// 돋보기는 마우스 입력을 받지 않는다(pointer-events: none). 마우스를 따라다니고 확대의 중심도 마우스 위치라서, 돋보기 한가운데에 보이는 것이
// 곧 마우스 아래의 진짜 요소다 — 클릭·마우스 오버·드래그는 진짜 화면에 그대로 들어간다. 돋보기가 켜진 동안 휠은 배율을 바꾼다. Esc 로도 끈다.
const STAGE_CSS = `
:host { display: block; }
.mag-stage { position: absolute; left: 0; top: 0; overflow: hidden; transform-origin: 0 0; background: var(--bg); }
`

// 휠로 바꾼 배율은 돋보기를 껐다 켜도 이어진다.
let rememberedZoom = ZOOM_DEFAULT

function openLens(startMouse, size) {
  const host = document.createElement('div')
  host.className = 'magnifier-host'
  host.setAttribute('aria-hidden', 'true')
  const shadow = host.attachShadow({ mode: 'open' })
  const hoverStyle = document.createElement('style')
  hoverStyle.textContent = collectHoverCss(document)
  const baseStyle = document.createElement('style')
  baseStyle.textContent = STAGE_CSS
  const stage = document.createElement('div')
  stage.className = 'mag-stage'
  shadow.append(...cloneStyleNodes(document), hoverStyle, baseStyle, stage)
  // body 가 아니라 html 아래에 둔다 — body 의 변화를 지켜보는 감시자가 돋보기 자신의 움직임에 반응하지 않도록.
  document.documentElement.appendChild(host)

  let mouse = startMouse
  let diameter = magnifierDiameter(size)
  let zoom = rememberedZoom
  let cloneDirty = true
  let frame = 0
  let marked = []

  function paint() {
    frame = 0
    const origin = lensOrigin(mouse, diameter)
    host.style.width = `${diameter}px`
    host.style.height = `${diameter}px`
    host.style.transform = `translate(${origin.left}px, ${origin.top}px)`
    stage.style.width = `${window.innerWidth}px`
    stage.style.height = `${window.innerHeight}px`
    stage.style.transform = stageTransform(mouse, diameter, zoom)
    if (cloneDirty) {
      cloneDirty = false
      rebuildClone(document.body, stage, host)
    }
    // 마우스 아래의 진짜 요소(돋보기는 마우스를 받지 않아 그대로 보인다)를 복제본에도 오버 표시한다.
    marked = markHover(stage, document.body, document.elementFromPoint(mouse.x, mouse.y), marked)
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(paint)
  }
  const markDirty = () => {
    cloneDirty = true
    schedule()
  }

  const onMouseMove = (e) => {
    mouse = { x: e.clientX, y: e.clientY }
    schedule()
  }
  const onWheel = (e) => {
    e.preventDefault()
    e.stopPropagation()
    zoom = nextZoom(zoom, e.deltaY)
    rememberedZoom = zoom
    schedule()
  }
  const observer = new MutationObserver(markDirty)
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true })

  // 켠 자리에서 바로 한 번 그린다.
  document.addEventListener('mousemove', onMouseMove, true)
  document.addEventListener('wheel', onWheel, { capture: true, passive: false })
  document.addEventListener('scroll', markDirty, true)
  document.addEventListener('input', markDirty, true)
  document.addEventListener('change', markDirty, true)
  window.addEventListener('resize', markDirty)
  paint()

  return {
    host,
    setSize(nextSize) {
      diameter = magnifierDiameter(nextSize)
      schedule()
    },
    close() {
      if (frame) cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('mousemove', onMouseMove, true)
      document.removeEventListener('wheel', onWheel, true)
      document.removeEventListener('scroll', markDirty, true)
      document.removeEventListener('input', markDirty, true)
      document.removeEventListener('change', markDirty, true)
      window.removeEventListener('resize', markDirty)
      host.remove()
    },
  }
}

export function Magnifier() {
  useEffect(() => {
    let lens = null
    const close = () => {
      lens?.close()
      lens = null
    }
    // 휠 클릭(가운데 버튼)을 누르면 켜고, 켜져 있으면 끈다. 윈도의 자동 스크롤과 링크 새 창 열기는 막는다.
    const onMouseDown = (e) => {
      if (e.button !== 1) return
      e.preventDefault()
      e.stopPropagation()
      if (lens) close()
      else lens = openLens({ x: e.clientX, y: e.clientY }, useAppStore.getState().magnifierSize)
    }
    const swallowMiddle = (e) => {
      if (e.button === 1) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && lens) {
        e.stopPropagation()
        close()
      }
    }
    document.addEventListener('mousedown', onMouseDown, true)
    document.addEventListener('mouseup', swallowMiddle, true)
    document.addEventListener('auxclick', swallowMiddle, true)
    document.addEventListener('keydown', onKeyDown, true)
    const unsubscribe = useAppStore.subscribe((state, prev) => {
      if (state.magnifierSize !== prev.magnifierSize) lens?.setSize(state.magnifierSize)
    })
    return () => {
      document.removeEventListener('mousedown', onMouseDown, true)
      document.removeEventListener('mouseup', swallowMiddle, true)
      document.removeEventListener('auxclick', swallowMiddle, true)
      document.removeEventListener('keydown', onKeyDown, true)
      unsubscribe()
      close()
    }
  }, [])

  return null
}
