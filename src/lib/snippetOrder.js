// Copyright (c) dendr000. MIT License.

// 상용구 폴더 안의 "순서 목록" 파일. 추천 팝업에서 같은 앞글자로 걸리는 후보들을 어떤 순서로 보여 줄지
// 정한다 — 기본 정렬(짧은 제목 순)은 `s` 에서 SET, SUM 을 SELECT 보다 위에 올리는데, 키워드는 자주
// 쓰는 것이 위에 있어야 편하다. 폴더(예: .wikidesk-snippets/SQL/)에 이 이름의 글 파일을 두고 한 줄에
// 제목 하나씩, 자주 쓰는 순으로 적는다. 메모장으로 고치면 된다.
//
//   # 이 줄은 설명(건너뜀)
//   SELECT
//   FROM
//   WHERE
//
// 목록에 없는 상용구는 순서가 없는 것으로 보고, 순서 있는 후보 뒤에서 기본 정렬을 따른다.
export const SNIPPET_ORDER_FILE = '_순서.txt'

// 순서 파일의 내용을 { 제목 → 순서(0부터) } 로 바꾼다. 빈 줄과 # 으로 시작하는 줄은 건너뛰고(순서
// 번호도 세지 않음), 같은 제목이 또 나오면 먼저 나온 것이 이긴다. 제목은 대소문자를 구분한다.
export function parseSnippetOrder(text) {
  const order = new Map()
  if (!text) return order
  // 맨 앞의 BOM(메모장이 저장할 때 붙일 수 있음)은 지운다.
  const lines = text.replace(/^﻿/, '').split(/\r?\n/)
  for (const raw of lines) {
    const title = raw.trim()
    if (title === '' || title.startsWith('#')) continue
    if (!order.has(title)) order.set(title, order.size)
  }
  return order
}
