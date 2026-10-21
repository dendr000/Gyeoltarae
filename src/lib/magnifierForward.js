// Copyright (c) dendr000. MIT License.

// 영역 확대창 안에서 한 마우스 동작을 진짜 화면의 같은 자리로 전달한다. 확대창은 진짜 화면을 복제한 그림층이라서, 그 위의 클릭이 곧바로
// 진짜 단추·링크에 닿지 않기 때문이다. 확대창 안의 점을 원래 화면의 점으로 바꿔(shared/magnifier.js 의 panelToSource) 그 자리의 진짜 요소에
// 같은 마우스 이벤트를 만들어 보낸다.
const FOCUSABLE = 'input, textarea, select, button, a[href], [tabindex], [contenteditable=""], [contenteditable="true"]'

// 그 자리에서 가장 위에 있는 진짜 요소. 확대창 자신은 건너뛴다.
export function pickTarget(point, host) {
  return document.elementsFromPoint(point.x, point.y).find((element) => element !== host && !host.contains(element)) ?? null
}

// 마우스 이벤트를 만들어 target 에 보낸다. original 은 확대창이 받은 진짜 이벤트(버튼·수정 키·클릭 횟수를 그대로 옮긴다).
export function dispatchMouse(target, type, point, original, extra = {}) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window,
    clientX: point.x,
    clientY: point.y,
    screenX: original.screenX,
    screenY: original.screenY,
    button: original.button,
    buttons: original.buttons,
    detail: original.detail,
    ctrlKey: original.ctrlKey,
    shiftKey: original.shiftKey,
    altKey: original.altKey,
    metaKey: original.metaKey,
    ...extra,
  })
  target.dispatchEvent(event)
  return event
}

// 입력 칸을 눌렀을 때 진짜 마우스라면 캐럿이 그 글자 사이로 가므로, 가능하면 같은 자리에 캐럿을 둔다.
function placeCaret(target, point) {
  if (target.tagName !== 'TEXTAREA' && target.tagName !== 'INPUT') return
  const position = document.caretPositionFromPoint?.(point.x, point.y)
  if (position && position.offsetNode === target) target.setSelectionRange(position.offset, position.offset)
}

// mousedown 을 보낸 뒤 진짜 마우스처럼 포커스를 옮긴다(왼쪽 버튼만). 눌러진 곳이나 그 조상 중 포커스를 받을 수 있는 요소로 옮기고, 없으면 그대로 둔다.
export function focusLikeClick(target, point, event) {
  if (event.defaultPrevented || event.button !== 0) return
  const focusable = target.closest?.(FOCUSABLE)
  if (!focusable) return
  focusable.focus()
  placeCaret(focusable, point)
}

// 확대창 안의 마우스 오버를 진짜 요소에 전달한다. 요소가 바뀔 때마다 이전 요소에 mouseout, 새 요소에 mouseover 를 보낸다(React 의 onMouseEnter 등이 이걸로 동작한다).
export function createHoverForwarder() {
  let last = null
  return {
    move(target, point, original) {
      if (target !== last) {
        if (last) dispatchMouse(last, 'mouseout', point, original, { relatedTarget: target })
        if (target) dispatchMouse(target, 'mouseover', point, original, { relatedTarget: last })
        last = target
      }
      if (target) dispatchMouse(target, 'mousemove', point, original)
    },
    leave(point, original) {
      if (last) dispatchMouse(last, 'mouseout', point, original, { relatedTarget: null })
      last = null
    },
  }
}
