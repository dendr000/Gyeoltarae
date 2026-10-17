// Copyright (c) dendr000. MIT License.
import { useLayoutEffect, useRef } from 'react'

// 표 편집기에서 "행 추가" 같은 단추를 눌러 표가 커지거나 줄어도, 눌렀던 단추가 같은 화면 위치에 남도록 스크롤을 보정한다. 그래야 마우스를
// 움직이지 않고 계속 누를 수 있다.
// 단추를 누르기 직전에 keepPosition(키, 단추)로 화면 위치를 적어 두면, 표가 다시 그려진 직후(화면에 그려지기 전)에 같은 키(data-anchor)를 가진
// 요소를 찾아 어긋난 만큼 창(panelRef)은 세로로, 격자 상자(wrapRef)는 가로로 스크롤한다. 스크롤할 여지가 없으면(내용이 창에 다 들어감) 보정하지 못한다.
export function useKeepPosition(panelRef, wrapRef, dependency) {
  const anchorRef = useRef(null)

  function keepPosition(key, element) {
    const rect = element.getBoundingClientRect()
    anchorRef.current = { key, top: rect.top, left: rect.left }
  }

  useLayoutEffect(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    anchorRef.current = null
    const panel = panelRef.current
    const element = panel?.querySelector(`[data-anchor="${anchor.key}"]`)
    if (!element) return
    const rect = element.getBoundingClientRect()
    panel.scrollTop += rect.top - anchor.top
    if (wrapRef.current) wrapRef.current.scrollLeft += rect.left - anchor.left
  }, [dependency, panelRef, wrapRef])

  return keepPosition
}
