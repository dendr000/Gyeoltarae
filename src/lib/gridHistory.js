// Copyright (c) dendr000. MIT License.

// 표 편집기의 되돌리기·다시 실행 기록. 화면과 분리한 순수 함수라서 시험할 수 있다(React 훅은 components/useGridHistory.js).
// 현재 상태(present)는 { grid, headerRow } 한 덩어리이고, 되돌리기 목록(past)과 다시 실행 목록(future)에 같은 모양의 상태를 쌓는다.
// 격자는 바뀔 때마다 새 배열로 만들어지므로(원래 것을 고치지 않음) 상태를 복사하지 않고 그대로 들고 있어도 된다.
//
// 같은 칸에 글자를 이어서 칠 때는 key 가 같으면 한 단계로 묶는다(coalesce) — 안 그러면 글자 하나마다 되돌리기 단계가 생긴다. 쉬었다가(window
// 초과) 다시 치거나, 다른 칸·다른 종류의 변경이 끼면 새 단계다.

const DEFAULT_LIMIT = 200
const DEFAULT_WINDOW_MS = 1000

export function createHistory(present) {
  return { past: [], present, future: [], lastKey: null, lastAt: 0 }
}

// next(새 상태)를 기록한다. options: { key(묶을 이름), at(지금 시각 ms), limit(기록 최대 개수), window(묶는 시간 ms) }.
// 바뀐 것이 없으면 받은 기록을 그대로 돌려준다. 새 변경을 기록하면 다시 실행 목록은 비운다.
export function record(history, next, { key = null, at = 0, limit = DEFAULT_LIMIT, window = DEFAULT_WINDOW_MS } = {}) {
  const { present } = history
  if (next.grid === present.grid && next.headerRow === present.headerRow) return history
  const coalesce = key !== null && key === history.lastKey && at - history.lastAt <= window
  return {
    past: coalesce ? history.past : [...history.past, present].slice(-limit),
    present: next,
    future: [],
    lastKey: key,
    lastAt: at,
  }
}

// 한 단계 되돌린다. 더 되돌릴 것이 없으면 받은 기록을 그대로 돌려준다.
export function undo(history) {
  if (history.past.length === 0) return history
  return {
    past: history.past.slice(0, -1),
    present: history.past[history.past.length - 1],
    future: [history.present, ...history.future],
    lastKey: null,
    lastAt: 0,
  }
}

// 되돌린 것을 한 단계 다시 실행한다.
export function redo(history) {
  if (history.future.length === 0) return history
  return {
    past: [...history.past, history.present],
    present: history.future[0],
    future: history.future.slice(1),
    lastKey: null,
    lastAt: 0,
  }
}
