// Copyright (c) dendr000. MIT License.

// 상용구 데이터를 불러오는 동안 헤더의 "저장됨" 옆에 보여 줄 진행 표시의 계산. 상용구가 수천 개면 파일을 하나씩 읽느라 시간이 걸리는데 화면에는
// 아무 표시가 없어서 멈춘 것처럼 보였다. 화면과 분리한 순수 함수라서 시험할 수 있다(tests/lib/snippetLoad.test.js).

// 상용구가 이 개수 미만이면 순식간에 끝나므로 표시를 띄우지 않는다(번쩍이는 깜빡임 방지). 이 개수 이상일 때만 진행 표시를 켠다.
export const SNIPPET_PROGRESS_MIN = 100
// 몇 개 읽을 때마다 진행 상황을 화면에 알릴지. 하나마다 알리면 화면을 너무 자주 다시 그린다.
export const SNIPPET_PROGRESS_STEP = 50

export function shouldShowSnippetLoad(total) {
  return Number.isFinite(total) && total >= SNIPPET_PROGRESS_MIN
}

// 0~100 의 정수(게이지바 너비). 잘못된 값은 0 으로 본다.
export function snippetLoadPercent(load) {
  if (!load || !Number.isFinite(load.total) || load.total <= 0 || !Number.isFinite(load.done)) return 0
  return Math.max(0, Math.min(100, Math.floor((load.done / load.total) * 100)))
}

// 이번 개수에서 진행 상황을 알릴 차례인지(STEP 개마다).
export function isProgressTick(done) {
  return done > 0 && done % SNIPPET_PROGRESS_STEP === 0
}
