// Copyright (c) dendr000. MIT License.
import { useEffect } from 'react'
import { isDrag, isUsableRegion, normalizeRect, ZOOM_DEFAULT } from '../../shared/magnifier.js'
import { openLens } from '../lib/magnifierLens.js'
import { openRegion } from '../lib/magnifierRegion.js'
import { useAppStore } from '../store/useAppStore.js'

// 마우스 휠(가운데 버튼) 돋보기. 규칙: shared/magnifier.js, src/lib/magnifier*.js
//   - 휠 클릭(누르고 바로 뗌): 둥근 돋보기를 켜고, 켜져 있으면(돋보기든 영역 확대창이든) 끈다.
//   - 휠을 누른 채 끌기: 끈 만큼 사각형을 그리고, 떼면 그 영역을 창 한가운데에 크게 보여 주는 확대창을 연다.
//   - 켜진 동안 휠을 굴리면 배율이 바뀌고, Esc 로 끈다.
// 휠 클릭에 붙은 윈도의 자동 스크롤과 링크 새 창 열기는 막는다. 코드가 만든 가짜 마우스 이벤트(isTrusted 가 아닌 것)는 무시한다.

// 휠로 바꾼 둥근 돋보기의 배율은 돋보기를 껐다 켜도 이어진다.
let rememberedZoom = ZOOM_DEFAULT

function createBand() {
  const band = document.createElement('div')
  band.className = 'magnifier-band'
  document.documentElement.appendChild(band)
  return band
}

function placeBand(band, rect) {
  band.style.transform = `translate(${rect.x}px, ${rect.y}px)`
  band.style.width = `${rect.width}px`
  band.style.height = `${rect.height}px`
}

export function Magnifier() {
  useEffect(() => {
    let active = null // 켜져 있는 돋보기(둥근 것 또는 영역 확대창)
    let gesture = null // 휠을 누르고 있는 동안의 { start, band }
    const close = () => {
      active?.close()
      active = null
    }
    const cancelGesture = () => {
      gesture?.band?.remove()
      gesture = null
    }
    const point = (e) => ({ x: e.clientX, y: e.clientY })

    const onMouseDown = (e) => {
      if (e.button !== 1 || !e.isTrusted) return
      e.preventDefault()
      e.stopPropagation()
      cancelGesture()
      gesture = { start: point(e), band: null }
    }
    const onMouseMove = (e) => {
      if (!e.isTrusted) return
      if (gesture) {
        const current = point(e)
        if (!gesture.band && isDrag(gesture.start, current)) gesture.band = createBand()
        if (gesture.band) placeBand(gesture.band, normalizeRect(gesture.start, current))
      }
      if (active?.kind === 'lens') active.moveTo(point(e))
    }
    const onMouseUp = (e) => {
      if (e.button !== 1 || !e.isTrusted) return
      e.preventDefault()
      e.stopPropagation()
      const done = gesture
      cancelGesture()
      if (!done) return
      if (done.band) {
        const rect = normalizeRect(done.start, point(e))
        if (!isUsableRegion(rect)) return
        close()
        active = openRegion({ rect })
        return
      }
      if (active) close()
      else {
        active = openLens({
          start: done.start,
          size: useAppStore.getState().magnifierSize,
          zoom: rememberedZoom,
          onZoomChange: (zoom) => {
            rememberedZoom = zoom
          },
        })
      }
    }
    const swallowAux = (e) => {
      if (e.button === 1) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    // 켜진 동안 휠은 배율을 바꾸고 문서 스크롤은 막는다.
    const onWheel = (e) => {
      if (!active || !e.isTrusted) return
      e.preventDefault()
      e.stopPropagation()
      active.wheel(e.deltaY)
    }
    const onKeyDown = (e) => {
      if (e.key !== 'Escape' || (!active && !gesture)) return
      e.stopPropagation()
      cancelGesture()
      close()
    }
    // 휠을 누른 채 창 밖으로 나가 뗀 경우처럼 mouseup 을 못 받아도 그리던 사각형이 남지 않게 한다.
    const onBlur = () => cancelGesture()

    document.addEventListener('mousedown', onMouseDown, true)
    document.addEventListener('mousemove', onMouseMove, true)
    document.addEventListener('mouseup', onMouseUp, true)
    document.addEventListener('auxclick', swallowAux, true)
    document.addEventListener('wheel', onWheel, { capture: true, passive: false })
    document.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('blur', onBlur)
    const unsubscribe = useAppStore.subscribe((state, prev) => {
      if (state.magnifierSize !== prev.magnifierSize && active?.kind === 'lens') active.setSize(state.magnifierSize)
    })
    return () => {
      document.removeEventListener('mousedown', onMouseDown, true)
      document.removeEventListener('mousemove', onMouseMove, true)
      document.removeEventListener('mouseup', onMouseUp, true)
      document.removeEventListener('auxclick', swallowAux, true)
      document.removeEventListener('wheel', onWheel, true)
      document.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('blur', onBlur)
      unsubscribe()
      cancelGesture()
      close()
    }
  }, [])

  return null
}
