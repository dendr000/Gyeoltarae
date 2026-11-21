// Copyright (c) dendr000. MIT License.

// 입력칸(textarea)을 고치는 공용 함수. 본문 편집기(EditorPane)와 각주 편집 상자(FootnoteEditBox)가 같이 쓴다.

// All edits go through document.execCommand('insertText', ...) instead of
// directly overwriting the React-controlled value. Setting `value` from
// outside a real input event breaks the textarea's native undo/redo chain;
// execCommand simulates real typing so Ctrl+Z keeps working for toolbar
// actions the same way it already does for hand-typed text.
export function replaceRange(textarea, start, end, insertText, onChange) {
  textarea.focus()
  textarea.setSelectionRange(start, end)
  const applied = document.execCommand('insertText', false, insertText)
  if (!applied) {
    // Fallback for environments without execCommand support.
    const value = textarea.value
    textarea.value = value.slice(0, start) + insertText + value.slice(end)
  }
  onChange(textarea.value)
  return { start, end: start + insertText.length }
}

// caretAfter: 선택한 글을 감쌌으면 커서를 닫는 표시 바로 오른쪽 바깥에 둔다(이어서 다음 글을 바로 쓸 수 있게).
// 아니면(기본) 안쪽 글을 그대로 선택해 둔다. 선택이 없으면 어느 쪽이든 여는 표시와 닫는 표시 사이에 커서를 둔다.
export function wrapSelection(textarea, before, after, onChange, { caretAfter = false } = {}) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = textarea.value.slice(start, end)
  replaceRange(textarea, start, end, `${before}${selected}${after}`, onChange)
  requestAnimationFrame(() => {
    textarea.focus()
    if (caretAfter && selected !== '') {
      const pos = start + before.length + selected.length + after.length
      textarea.setSelectionRange(pos, pos)
      return
    }
    textarea.setSelectionRange(start + before.length, start + before.length + selected.length)
  })
}


// [], (), '', "" — typing the opener inserts both and leaves the cursor
// between them; with a selection, wraps the selection instead (same
// wrapSelection already used for Ctrl+B/Ctrl+U). Typing the matching
// closer while it's already the very next character steps over it rather
// than inserting a redundant one, same as most code editors.
export const AUTO_PAIRS = { '(': ')', '[': ']', "'": "'", '"': '"', '<': '>', '{': '}' }
export const AUTO_PAIR_CLOSERS = new Set(Object.values(AUTO_PAIRS))
