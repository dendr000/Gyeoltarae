// Copyright (c) dendr000. MIT License.

// 단축키 설정의 규칙. 화면과 분리한 순수 함수라서 시험할 수 있다(tests/lib/shortcuts.test.js).
// 기능마다 기본 키(defaultKey)가 있고, 사용자가 바꾼 키(overrides: { id: 조합 })가 있으면 그것을 쓴다. 빈 글('')은 "단축키 없음"이다.
// 키 조합은 "Ctrl+Alt+ArrowUp" 같은 글자다. 수식키는 Ctrl, Alt, Shift 순서로 적고 마지막이 글쇠다. Mac 의 Cmd 는 Ctrl 로 본다.
// 글쇠는 물리 키 위치(e.code)를 먼저 본다 — 한글 자판에서 e.key 가 'ㅜ' 로 와도 N 으로 읽힌다. code 가 없는 이벤트는 e.key 로 읽는다.

// 바꿀 수 있는 기능 목록. 키 처리 코드는 이 id 로 현재 키를 찾아 쓴다(store 의 shortcuts).
export const SHORTCUT_ACTIONS = [
  { id: 'line.moveUp', label: '줄 위로 이동', group: '편집', defaultKey: 'Alt+ArrowUp' },
  { id: 'line.moveDown', label: '줄 아래로 이동', group: '편집', defaultKey: 'Alt+ArrowDown' },
  { id: 'line.duplicate', label: '줄 복제', group: '편집', defaultKey: 'Ctrl+D' },
  { id: 'line.sort', label: '줄 이름순 정렬', group: '편집', defaultKey: 'Ctrl+`' },
  { id: 'line.blockSort', label: '묶음 이름순 정렬', group: '편집', defaultKey: 'Ctrl+Shift+`' },
  { id: 'tab.moveLeft', label: '탭을 왼쪽으로 이동', group: '탭', defaultKey: 'Ctrl+Alt+ArrowLeft' },
  { id: 'tab.moveRight', label: '탭을 오른쪽으로 이동', group: '탭', defaultKey: 'Ctrl+Alt+ArrowRight' },
  { id: 'doc.new', label: '새 문서 (열린 문서의 폴더에)', group: '문서', defaultKey: 'Ctrl+N' },
  { id: 'sidebar.toggle', label: '사이드바 열기/닫기', group: '화면', defaultKey: 'Ctrl+M' },
  { id: 'mode.toggle', label: '뷰어 <-> 편집 전환', group: '화면', defaultKey: 'Ctrl+E' },
  { id: 'mode.viewer', label: '뷰어 모드로', group: '화면', defaultKey: 'Ctrl+1' },
  { id: 'mode.dual', label: '듀얼 모드로', group: '화면', defaultKey: 'Ctrl+2' },
  { id: 'mode.editor', label: '편집 모드로', group: '화면', defaultKey: 'Ctrl+3' },
]

const ACTION_IDS = new Set(SHORTCUT_ACTIONS.map((a) => a.id))

export function defaultShortcuts() {
  return Object.fromEntries(SHORTCUT_ACTIONS.map((a) => [a.id, a.defaultKey]))
}

// 기본 키에 바꾼 키를 덮어쓴 { id: 조합 }. 바꾼 값이 글이 아니거나 모르는 id 면 무시한다(빈 글은 "없음"으로 그대로 쓴다).
export function resolveShortcuts(overrides) {
  const map = defaultShortcuts()
  if (overrides && typeof overrides === 'object') {
    for (const id of Object.keys(map)) {
      if (typeof overrides[id] === 'string') map[id] = overrides[id]
    }
  }
  return map
}

// ---- 이벤트 -> 조합 ----------------------------------------------------------------------------------------------------

const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Shift', 'Meta', 'AltGraph', 'OS'])
const CODE_TOKENS = {
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backslash: '\\',
  Space: 'Space',
  NumpadDivide: '/',
  NumpadSubtract: '-',
}
const NAMED_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'NumpadEnter', 'Tab', 'Backspace', 'Delete', 'Insert', 'Home', 'End', 'PageUp', 'PageDown', 'Escape',
])

// 눌린 글쇠의 이름. 수식키만 눌렸으면 null.
function keyToken(e) {
  if (MODIFIER_KEYS.has(e.key)) return null
  // 영문 글자는 글쇠에 새겨진 글자(e.key)를 본다 — 자판 배열이 다른(Dvorak 등) 사람도 "Ctrl+M" 을 글자 M 으로 읽는다. 한글처럼 영문이 아니면 아래에서 물리 키 위치로 읽는다.
  if (/^[a-zA-Z]$/.test(e.key)) return e.key.toUpperCase()
  const code = e.code ?? ''
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit[0-9]$/.test(code)) return code.slice(5)
  if (/^F([1-9]|1[0-2])$/.test(code) || NAMED_KEYS.has(code)) return code
  if (Object.hasOwn(CODE_TOKENS, code)) return CODE_TOKENS[code]
  const key = e.key
  if (typeof key !== 'string' || key === '') return null
  if (key === ' ') return 'Space'
  return key.length === 1 ? key.toUpperCase() : key
}

// 키 이벤트를 조합 글로 바꾼다. 수식키만 눌렸으면(조합이 아직 끝나지 않음) null.
export function eventToCombo(e) {
  const token = keyToken(e)
  if (token === null) return null
  const parts = []
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  parts.push(token)
  return parts.join('+')
}

// 키 이벤트가 combo 와 정확히 같은 조합인가. 조합이 비어 있거나(해제) 한글 조합 중(isComposing)이면 false.
export function matchesShortcut(e, combo) {
  if (!combo || e.isComposing) return false
  return eventToCombo(e) === combo
}

// ---- 조합 검사 ---------------------------------------------------------------------------------------------------------

// 이 앱의 다른 기능·메뉴·시스템이 이미 쓰는 키라서 지정할 수 없다(바꿀 수 있는 기능 목록에 없는 것들).
const RESERVED = new Set([
  'Ctrl+C', 'Ctrl+V', 'Ctrl+X', 'Ctrl+A', 'Ctrl+Z', 'Ctrl+Y', 'Ctrl+Shift+Z', 'Ctrl+S', 'Ctrl+F', 'Ctrl+Shift+F', 'Ctrl+B', 'Ctrl+U', 'Ctrl+/',
  'Ctrl+W', 'Ctrl+O', 'Alt+F4', 'F11', 'F12', 'Alt+Enter', 'Alt+H', 'Alt+Shift+H', 'Alt+T', 'Alt+Shift+T', 'Alt+ArrowLeft', 'Alt+ArrowRight',
  'Alt+Shift+ArrowLeft', 'Alt+Shift+ArrowRight', 'Ctrl+Alt+Shift+-',
])
const MODIFIER_NAMES = new Set(['Ctrl', 'Alt', 'Shift'])
const TOKEN_RE = /^([A-Z0-9]|F([1-9]|1[0-2])|Space|[`\-=[\];',./\\])$/

// 지정해도 되는 조합인가: { ok: true } 또는 { ok: false, reason }.
export function validateCombo(combo) {
  if (typeof combo !== 'string' || combo === '') return { ok: false, reason: '키를 누르세요' }
  const parts = combo.split('+')
  const key = parts[parts.length - 1]
  const mods = parts.slice(0, -1)
  if (key === '' || MODIFIER_NAMES.has(key)) return { ok: false, reason: '수식키(Ctrl·Alt·Shift)만으로는 지정할 수 없습니다. 글쇠를 함께 누르세요' }
  if (mods.some((m) => !MODIFIER_NAMES.has(m)) || new Set(mods).size !== mods.length) return { ok: false, reason: '알 수 없는 키 조합입니다' }
  if (!NAMED_KEYS.has(key) && !TOKEN_RE.test(key)) return { ok: false, reason: '지정할 수 없는 글쇠입니다' }
  const isFunctionKey = /^F([1-9]|1[0-2])$/.test(key)
  if (!isFunctionKey && !mods.includes('Ctrl') && !mods.includes('Alt')) {
    return { ok: false, reason: 'Ctrl 이나 Alt 를 함께 눌러야 합니다 (글자를 칠 때 가로채지 않도록)' }
  }
  if (RESERVED.has(combo)) return { ok: false, reason: '다른 기능이 이미 쓰는 키라서 지정할 수 없습니다 (복사·붙여넣기·저장·찾기·굵게 등)' }
  return { ok: true }
}

// map 에서 combo 를 이미 쓰는 다른 기능(selfId 는 제외)의 id, 없으면 null. 빈 조합(해제)은 충돌이 아니다.
export function findConflict(map, selfId, combo) {
  if (!combo) return null
  for (const [id, current] of Object.entries(map)) {
    if (id !== selfId && current === combo) return id
  }
  return null
}

// 저장된 글(JSON)에서 바꾼 키만 읽는다. 깨진 글·모르는 id·글이 아닌 값·규칙에 어긋난 조합은 버린다. 빈 글(해제)은 남긴다.
export function parseShortcutOverrides(raw) {
  let data
  try {
    data = JSON.parse(raw)
  } catch {
    return {}
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
  const result = {}
  for (const [id, combo] of Object.entries(data)) {
    if (!ACTION_IDS.has(id) || typeof combo !== 'string') continue
    if (combo === '' || validateCombo(combo).ok) result[id] = combo
  }
  return result
}

// 화면에 보일 글: 화살표는 기호로, 해제는 "없음".
export function comboLabel(combo) {
  if (!combo) return '없음'
  return combo.replace('ArrowUp', '↑').replace('ArrowDown', '↓').replace('ArrowLeft', '←').replace('ArrowRight', '→')
}
