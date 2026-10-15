// Copyright (c) dendr000. MIT License.

// Windows 파일·폴더 이름에는 < > : " / \ | ? * 를 쓸 수 없다. 예전에는 이 글자를 전부 "_" 로 바꿔 저장해서 "서문: 시작" 이 "서문_ 시작"
// 으로 보였고, 서로 다른 글자가 같은 "_" 가 되어 되돌릴 방법도 없었다. 그래서 **디스크에는 모양이 같은 전각 글자로 저장하고**
// (":" -> "：", "/" -> "／" ...), **앱에서 이름을 보여 줄 때는 원래 글자로 되돌린다.** 사용자는 그냥 ":" 와 "/" 를 쓴 것처럼 보인다.
//
// 이 파일은 메인 프로세스(electron/fileSystem.js)와 화면(src/)이 함께 쓴다. 순수 함수이고 Node 전용 기능을 쓰지 않는다.
//
// 한계: 이미 전각 글자(：／ 등)를 일부러 쓴 이름은 앱에서 ":" "/" 로 보인다(둘은 같은 것으로 취급). 제어 문자(0~31)는 전각 짝이 없어서
// 예전처럼 "_" 로 바꾼다.
const PAIRS = [
  ['<', '＜'], // U+FF1C
  ['>', '＞'], // U+FF1E
  [':', '：'], // U+FF1A
  ['"', '＂'], // U+FF02
  ['/', '／'], // U+FF0F
  [String.fromCharCode(92), '＼'], // U+FF3C (백슬래시)
  ['|', '｜'], // U+FF5C
  ['?', '？'], // U+FF1F
  ['*', '＊'], // U+FF0A
]

const TO_FULL = new Map(PAIRS)
const TO_ASCII = new Map(PAIRS.map(([ascii, full]) => [full, ascii]))
const FULL_SLASH = '／'
const ENCODE_RE = /[<>:"/\\|?*]/g
const DECODE_RE = /[＜＞：＂／＼｜？＊]/g

// 이름 한 조각(파일·폴더 하나의 이름)을 디스크에 쓸 수 있는 이름으로 바꾼다.
export function encodeFileNameChars(text) {
  const swapped = (text ?? '').replace(ENCODE_RE, (ch) => TO_FULL.get(ch))
  // 제어 문자(0~31)는 정규식 대신 글자 코드로 걸러낸다.
  return Array.from(swapped, (ch) => (ch.charCodeAt(0) < 32 ? '_' : ch)).join('')
}

// 디스크의 이름을 앱에서 보여 줄 원래 글자로 되돌린다. keepSlash 를 켜면 전각 슬래시(／)는 그대로 둔다 — 분류·틀·자료의 이름에서
// "/" 는 계층 구분자로 쓰이므로, 풀어 버리면 한 이름이 계층 두 개로 갈라져 보이기 때문이다.
export function decodeFileNameChars(text, { keepSlash = false } = {}) {
  return (text ?? '').replace(DECODE_RE, (ch) => (keepSlash && ch === FULL_SLASH ? ch : TO_ASCII.get(ch)))
}
