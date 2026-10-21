// Copyright (c) dendr000. MIT License.

// 글자 수(줄바꿈 포함 문자 수): 공백·특수문자·한자·줄바꿈을 모두 포함해 문자 하나를 1자로 센다. 바이트 수나 토큰 수는 쓰지 않는다.
// 화면과 분리한 순수 함수라서 시험할 수 있다(tests/lib/charCount.test.js).
//   - 이모지·확장 한자처럼 자바스크립트 length 로는 2인 문자도 1자다(코드 점 기준).
//   - 윈도 줄바꿈(CRLF)은 줄바꿈 1자다.
//   - 자모가 풀어 쓰인 한글(NFD)은 완성된 글자(NFC)로 합쳐서 센다.
export function countChars(text) {
  if (text === undefined || text === null) return 0
  const normalized = String(text).replace(/\r\n/g, '\n').normalize('NFC')
  return Array.from(normalized).length
}

// 화면에 보일 숫자: 천 단위 쉼표.
export function formatCount(n) {
  return n.toLocaleString('en-US')
}
