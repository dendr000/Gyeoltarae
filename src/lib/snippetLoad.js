// Copyright (c) dendr000. MIT License.

// 상용구 데이터를 불러오는 동안 헤더의 "저장됨" 옆에 보여 줄 진행 표시의 계산. 상용구가 수천 개면 파일을 하나씩 읽느라 시간이 걸리는데 화면에는
// 아무 표시가 없어서 멈춘 것처럼 보였다. 화면과 분리한 순수 함수라서 시험할 수 있다(tests/lib/snippetLoad.test.js).

import { parseSnippetOrder } from './snippetOrder.js'

// 상용구 파일들을 읽어 색인({ "카테고리/제목": { category, title, path, content, rank } })을 만든다. readFiles(경로들) 는 앱의 "파일 여러 개 읽기"로, 글 또는 null(못 읽음)의
// 배열을 돌려준다. 못 읽은 파일은 건너뛴다. 파일을 chunkSize 개씩 나눠 읽고, 나눌 때마다 yieldFn 을 기다려 화면(창 메시지)이 숨 쉬게 한다 — 수천 개를 한꺼번에 읽으면 그동안
// 메인 프로세스가 통째로 멈춰 창이 "응답 없음"이 되기 때문이다. onProgress(done) 는 chunk 하나를 읽을 때마다 불린다. shouldCancel() 이 true 면 중단하고 null 을 돌려준다
// (더 새로운 불러오기가 시작된 경우). orderTexts 는 폴더별 _순서.txt 원문이다.
export const SNIPPET_CHUNK_SIZE = 100
export async function loadSnippetEntries({ readFiles, items, orderTexts = {}, onProgress, shouldCancel, yieldFn, chunkSize = SNIPPET_CHUNK_SIZE }) {
  const orders = {}
  const index = {}
  for (let start = 0; start < items.length; start += chunkSize) {
    if (shouldCancel?.()) return null
    const chunk = items.slice(start, start + chunkSize)
    const contents = await readFiles(chunk.map((item) => item.path))
    chunk.forEach((item, i) => {
      const content = contents[i]
      if (typeof content !== 'string') return
      orders[item.category] ??= parseSnippetOrder(orderTexts[item.category])
      index[`${item.category}/${item.title}`] = {
        category: item.category,
        title: item.title,
        path: item.path,
        content,
        rank: orders[item.category].get(item.title),
      }
    })
    onProgress?.(Math.min(start + chunkSize, items.length))
    await yieldFn?.()
  }
  return shouldCancel?.() ? null : index
}

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
