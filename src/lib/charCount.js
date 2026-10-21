// Copyright (c) dendr000. MIT License.

// 글자 수 세기: 공백·특수문자·한자를 모두 포함해 문자 하나를 1자로 센다. 바이트 수나 토큰 수는 쓰지 않는다.
// 화면과 분리한 순수 함수라서 시험할 수 있다(tests/lib/charCount.test.js).
//   - 기본(기본 글자 수)은 줄바꿈을 세지 않는다. includeNewlines 를 켜면 줄바꿈도 1자로 센다(줄바꿈 포함 글자 수).
//   - 윈도 줄바꿈(CRLF)은 줄바꿈 하나로 본다.
//   - 이모지·확장 한자처럼 자바스크립트 length 로는 2인 문자도 1자다(코드 점 기준).
//   - 자모가 풀어 쓰인 한글(NFD)은 완성된 글자(NFC)로 합쳐서 센다.
export function countChars(text, { includeNewlines = false } = {}) {
  if (text === undefined || text === null) return 0
  const unified = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const counted = (includeNewlines ? unified : unified.replaceAll('\n', '')).normalize('NFC')
  return Array.from(counted).length
}

// 화면에 보일 숫자: 천 단위 쉼표.
export function formatCount(n) {
  return n.toLocaleString('en-US')
}
