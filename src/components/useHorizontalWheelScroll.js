// Copyright (c) dendr000. MIT License.

import { useEffect } from 'react'
import { wheelScrollLeft } from '../lib/horizontalWheel.js'

// ref 가 가리키는 가로로 넘치는 줄 위에서 마우스 휠을 굴리면 좌우로 스크롤되게 한다(계산은
// lib/horizontalWheel.js). active 는 그 요소가 실제로 그려져 있는지(툴바는 문서가 열려 있을 때만 있음) —
// 값이 바뀔 때 다시 붙인다.
//
// React 의 onWheel 은 수동(passive) 리스너라 preventDefault 가 안 먹으므로 직접 붙인다. 가로로 스크롤하는
// 중에 줄 위에서 페이지가 같이 스크롤되는 걸 막으려면 preventDefault 가 필요하다.
export function useHorizontalWheelScroll(ref, active) {
  useEffect(() => {
    const el = ref.current
    if (!el || !active) return undefined
    function onWheel(e) {
      const next = wheelScrollLeft({
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        deltaMode: e.deltaMode,
        ctrlKey: e.ctrlKey,
        scrollLeft: el.scrollLeft,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      })
      if (next === null) return
      e.preventDefault()
      el.scrollLeft = next
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [ref, active])
}
