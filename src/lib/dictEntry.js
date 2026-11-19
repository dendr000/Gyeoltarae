// Copyright (c) dendr000. MIT License.

// 사전 항목 한 쌍(원문, 한자/영문)의 규칙. 원문은 한글, 한자/영문 쪽에는 한글이 들어가면 안 된다(`중(중)` 처럼 한글끼리 등록되어
// 검색에도 안 잡히고 Alt+H 순환 치환도 엉뚱해지는 실수를 막는다). 화면과 분리한 순수 함수라서 시험할 수 있다(tests/lib/dictEntry.test.js).
const HANGUL_RE = /[가-힣]/

export function hasHangul(text) {
  return HANGUL_RE.test(text)
}

// 입력한 한 쌍을 정리해 { word, translation } 으로 돌려준다. 한자 쪽을 먼저 쓴 경우(`東方(동방)`)는 순서를 바로잡는다.
// 등록할 수 없으면 null: 빈 칸이거나 두 쪽 모두 한글(또는 바로잡은 뒤에도 한자/영문 쪽에 한글이 있음).
export function normalizeDictPair(wordInput, translationInput) {
  let word = String(wordInput ?? '').trim()
  let translation = String(translationInput ?? '').trim()
  if (hasHangul(translation) && !hasHangul(word)) [word, translation] = [translation, word]
  if (!word || !translation) return null
  if (hasHangul(translation)) return null
  return { word, translation }
}
