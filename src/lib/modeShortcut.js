// Copyright (c) dendr000. MIT License.
import { defaultShortcuts, matchesShortcut } from './shortcuts.js'

// 화면 모드 단축키. 눌린 키와 현재 모드를 받아 "이동할 모드"를 돌려주고, 해당 없으면 null. 화면과 분리한 순수 함수라서 시험할 수 있다.
//   Ctrl+1 뷰어(preview) · Ctrl+2 듀얼(dual) · Ctrl+3 편집(focus)
//   Ctrl+E 뷰어 <-> 편집만 오간다. 듀얼은 건너뛴다: 뷰어이면 편집으로, 그 밖(편집·듀얼)이면 뷰어로.
// Mac 은 Cmd. Shift/Alt 가 같이 눌린 조합과 한글 입력 조합 중(isComposing)에는 반응하지 않는다.
// 한글 자판에서는 e.key 가 'ㄷ' 으로 올 수 있어서 E 는 물리 키 위치(e.code === 'KeyE')도 함께 본다.
// keys 는 설정에서 바꾼 키({ toggle, viewer, dual, editor }, 기본은 위의 키). 판별 규칙은 lib/shortcuts.js 의 matchesShortcut 이다.
function defaultModeKeys() {
  const d = defaultShortcuts()
  return { toggle: d['mode.toggle'], viewer: d['mode.viewer'], dual: d['mode.dual'], editor: d['mode.editor'] }
}

export function modeShortcutTarget(e, currentMode, keys = defaultModeKeys()) {
  if (matchesShortcut(e, keys.viewer)) return 'preview'
  if (matchesShortcut(e, keys.dual)) return 'dual'
  if (matchesShortcut(e, keys.editor)) return 'focus'
  if (matchesShortcut(e, keys.toggle)) return currentMode === 'preview' ? 'focus' : 'preview'
  return null
}
