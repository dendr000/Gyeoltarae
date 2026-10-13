// Copyright (c) dendr000. MIT License.

// 표 편집기의 격자(grid)와 "첫 번째 행을 헤더로" 설정을 되돌리기·다시 실행 기록과 함께 들고 있는 훅. 기록 규칙은 lib/gridHistory.js.
// setGrid 는 useState 의 setter 처럼 값이나 (이전 격자) => 새 격자 함수를 받고, 두 번째 인자로 { coalesce: 이름 } 을 주면 같은 이름으로
// 1초 안에 이어진 변경(같은 칸에 글자를 이어서 치기 등)을 한 단계로 묶는다. 렌더링마다 새로 만들어지지 않는 안정된 함수다.
import { useCallback, useReducer, useState } from 'react'
import { createHistory, record, redo, undo } from '../lib/gridHistory.js'

function reducer(history, action) {
  switch (action.type) {
    case 'grid': {
      const grid = typeof action.next === 'function' ? action.next(history.present.grid) : action.next
      return record(history, { ...history.present, grid }, action.options)
    }
    case 'header':
      return record(history, { ...history.present, headerRow: action.value }, { at: action.at })
    case 'both': {
      const grid = typeof action.next === 'function' ? action.next(history.present.grid) : action.next
      return record(history, { grid, headerRow: action.headerRow }, { at: action.at })
    }
    case 'undo':
      return undo(history)
    case 'redo':
      return redo(history)
    default:
      return history
  }
}

export function useGridHistory(initialGrid, initialHeaderRow) {
  // 첫 렌더링의 값만 쓴다(그다음에 initial* 이 바뀌어도 기록을 다시 만들지 않는다).
  const [initial] = useState(() => createHistory({ grid: initialGrid, headerRow: initialHeaderRow }))
  const [history, dispatch] = useReducer(reducer, initial)

  const setGrid = useCallback((next, options = {}) => dispatch({ type: 'grid', next, options: { key: options.coalesce ?? null, at: Date.now() } }), [])
  const setHeaderRow = useCallback((value) => dispatch({ type: 'header', value, at: Date.now() }), [])
  // 격자와 헤더 설정을 한 단계로 함께 바꾼다(행·열 바꾸기가 헤더 체크를 같이 끄는 경우).
  const setGridAndHeader = useCallback((next, headerRow) => dispatch({ type: 'both', next, headerRow, at: Date.now() }), [])
  const undoStep = useCallback(() => dispatch({ type: 'undo' }), [])
  const redoStep = useCallback(() => dispatch({ type: 'redo' }), [])

  return {
    grid: history.present.grid,
    headerRow: history.present.headerRow,
    setGrid,
    setHeaderRow,
    setGridAndHeader,
    undo: undoStep,
    redo: redoStep,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  }
}
