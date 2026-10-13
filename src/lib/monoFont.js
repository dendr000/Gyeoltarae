// Copyright (c) dendr000. MIT License.

// 편집기·코드블록 글꼴(CSS 변수 --mono)을 사용자가 고르는 설정의 규칙. 화면과 분리한 순수 함수라서 시험할 수 있다.
// 글꼴 이름은 CSS 값에 그대로 들어가므로 따옴표·세미콜론 같은 글자를 걸러 내고, 고른 글꼴 뒤에는 항상 D2Coding 과 기본 고정폭 글꼴을 이어 붙여
// 글꼴이 없는 PC 나 그 글꼴에 없는 글자(한글 등)에서도 깨지지 않게 한다.

// D2Coding 은 앱에 글꼴 파일이 들어 있어서(index.css 의 @font-face) 어느 PC 에서나 쓸 수 있다. 기본값이다.
export const DEFAULT_MONO_STACK = "'D2Coding', ui-monospace, Consolas, monospace"
const FALLBACK_TAIL = "'D2Coding', ui-monospace, Consolas, monospace"

// 목록에서 고를 수 있는 글꼴. hangulDouble: 한글이 영문 정확히 2칸 폭이라 한글이 섞인 줄의 열이 맞는 글꼴.
export const MONO_FONT_CHOICES = [
  { family: 'D2Coding', label: 'D2Coding (기본, 앱에 포함)', hangulDouble: true },
  { family: 'D2Coding ligature', label: 'D2Coding ligature (리가처 버전)', hangulDouble: true },
  { family: 'GulimChe', label: '굴림체', hangulDouble: true },
  { family: 'NanumGothicCoding', label: '나눔고딕코딩', hangulDouble: true },
  { family: 'Cascadia Mono', label: 'Cascadia Mono', hangulDouble: false },
  { family: 'Consolas', label: 'Consolas', hangulDouble: false },
  { family: 'JetBrains Mono', label: 'JetBrains Mono', hangulDouble: false },
  { family: 'Fira Code', label: 'Fira Code', hangulDouble: false },
  { family: 'Source Code Pro', label: 'Source Code Pro', hangulDouble: false },
]

const MAX_FAMILY_LENGTH = 60
// 영문·숫자·한글(완성형과 자모)·공백·점·밑줄·하이픈만. 쉼표·따옴표·세미콜론·괄호·중괄호·슬래시·콜론은 CSS 값을 깨뜨릴 수 있어 허용하지 않는다.
const FAMILY_PATTERN = /^[A-Za-z0-9ㄱ-ㆎ가-힣 ._-]+$/

// 글꼴 이름을 CSS 에 넣어도 안전한 글자로 정리한다(앞뒤 공백 제거, 연속 공백은 한 칸). 안전하지 않거나 비었거나 너무 길면 null.
export function sanitizeFontFamily(text) {
  if (typeof text !== 'string') return null
  const name = text.trim().replace(/\s+/g, ' ')
  if (name === '' || name.length > MAX_FAMILY_LENGTH || !FAMILY_PATTERN.test(name)) return null
  return name
}

// 고른 글꼴 이름으로 --mono 에 넣을 글꼴 목록 글자를 만든다. 비었거나 D2Coding 이거나 검증을 통과하지 못하면 기본 목록이다.
export function buildMonoStack(family) {
  const name = sanitizeFontFamily(family)
  if (name === null || name.toLowerCase() === 'd2coding') return DEFAULT_MONO_STACK
  return `'${name}', ${FALLBACK_TAIL}`
}

// 글꼴이 이 PC 에 설치돼 있는가. measure(글꼴 목록 CSS 글자) → 견본 글자의 폭 을 받아 판단한다(화면에서는 canvas measureText).
// 설치된 글꼴은 목록 맨 앞의 글꼴 폭을 따르고, 없으면 뒤의 일반 글꼴(monospace·serif) 폭을 따른다. 설치된 글꼴이 우연히 기본 monospace 와 폭이
// 같을 수 있어서(예: Consolas 가 기본 고정폭인 PC) serif 와도 비교한다. document.fonts.check 는 없는 글꼴에도 true 를 줘서 쓰지 않는다.
export function isFontInstalled(family, measure) {
  const quoted = `'${family}'`
  return measure(`${quoted}, monospace`) !== measure('monospace') || measure(`${quoted}, serif`) !== measure('serif')
}
