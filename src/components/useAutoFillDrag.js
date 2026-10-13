// Copyright (c) dendr000. MIT License.

// 표 편집기의 채우기 핸들 끌기(엑셀의 자동 채우기). 고른 범위의 오른쪽 아래 모서리의 작은 네모(핸들)를 아래나 오른쪽으로 끌면, 고른 범위가
// 씨앗이 되어 끈 칸까지 이어서 채워진다(규칙은 lib/fillSeries.js, 격자 적용은 lib/tableAutoFill.js). 끄는 동안 채워질 칸을 미리 보여 주고,
// Ctrl 을 누른 채 놓으면 복사↔이어 가기가 바뀌며, Esc 로 취소한다.
//
// 칸은 <td data-cell="행:열"> 로 찾는다(마우스 아래의 칸을 elementFromPoint 로 얻는다). 끌기를 시작할 때의 범위와 격자를 붙잡아 두므로 끄는
// 동안 고른 범위가 바뀌어도 영향이 없다.
import { useEffect, useState } from 'react'
import { autoFill, canAutoFill, dragFillTarget, extendedRange } from '../lib/tableAutoFill.js'

function cellAtPoint(x, y) {
  const td = document.elementFromPoint(x, y)?.closest?.('td[data-cell]')
  if (!td) return null
  const [r, c] = td.dataset.cell.split(':').map(Number)
  return { r, c }
}

// ctx: { grid, setGrid, range, setAnchor, setFocusCell }
// 돌려주는 값: { dragging, start(), isPreviewCell(r, c) }
export function useAutoFillDrag({ grid, setGrid, range, setAnchor, setFocusCell }) {
  const [session, setSession] = useState(null) // { range, grid } — 끌기를 시작한 순간의 것
  const [preview, setPreview] = useState(null) // { direction, count } — 지금 놓으면 채워질 곳

  useEffect(() => {
    if (!session) return undefined
    const { range: seed, grid: snapshot } = session
    const size = { rows: snapshot.length, cols: snapshot[0]?.length ?? 0 }
    let target = null

    const finish = () => {
      setSession(null)
      setPreview(null)
    }
    const onMove = (e) => {
      const hover = cellAtPoint(e.clientX, e.clientY)
      const next = hover ? dragFillTarget(seed, hover, size) : null
      target = next && canAutoFill(snapshot, seed, next.direction, next.count) ? next : null
      setPreview(target)
    }
    const onUp = (e) => {
      if (target) {
        setGrid(autoFill(snapshot, seed, target.direction, target.count, { invert: e.ctrlKey || e.metaKey }))
        const extended = extendedRange(seed, target.direction, target.count)
        setAnchor({ r: extended.r1, c: extended.c1 })
        setFocusCell({ r: extended.r2, c: extended.c2 })
      }
      finish()
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        finish()
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [session, setGrid, setAnchor, setFocusCell])

  const start = () => setSession({ range: { r1: range.r1, r2: range.r2, c1: range.c1, c2: range.c2 }, grid })

  const isPreviewCell = (r, c) => {
    if (!preview || !session) return false
    const { range: seed } = session
    if (preview.direction === 'down') return c >= seed.c1 && c <= seed.c2 && r > seed.r2 && r <= seed.r2 + preview.count
    return r >= seed.r1 && r <= seed.r2 && c > seed.c2 && c <= seed.c2 + preview.count
  }

  return { dragging: session !== null, start, isPreviewCell }
}
