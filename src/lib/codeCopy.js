// Copyright (c) dendr000. MIT License.

// 코드블록의 "복사" 버튼 동작. 버튼 HTML 은 wikiParser.js(renderCodeBlock)가 만들고,
// 클릭은 ViewerPane.jsx 가 받아서 copyCodeBlock 으로 넘긴다.

export const COPY_LABEL = '복사'
export const COPIED_LABEL = '복사됨'
export const FAILED_LABEL = '복사 실패'
export const RESET_AFTER_MS = 1500

const LABEL_SELECTOR = '.wiki-code-copy-label'
const resetTimers = new WeakMap()

// navigator.clipboard.writeText 가 이 시간 안에 성공도 실패도 하지 않으면 막힌 것으로 본다.
// (권한 확인창이 뜨는 환경에서는 약속이 끝나지 않고 계속 대기해, 실제 클릭을 해도 아무 반응이
// 없었다 — 코드로 .click() 을 흉내 낼 때는 바로 거절돼서 드러나지 않던 문제.)
export const CLIPBOARD_API_TIMEOUT_MS = 800

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('clipboard timeout')), ms)
    promise.then(
      (value) => {
        clearTimeout(id)
        resolve(value)
      },
      (error) => {
        clearTimeout(id)
        reject(error)
      },
    )
  })
}

// 보이지 않는 textarea 를 선택해 복사하는 옛 방식. 쓰던 칸(편집기 등)의 포커스는 되돌려 준다.
function legacyCopy(text) {
  const previous = document.activeElement
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  try {
    area.select()
    return document.execCommand('copy')
  } finally {
    document.body.removeChild(area)
    previous?.focus?.()
  }
}

// 클립보드에 글자를 쓴다. 성공하면 true. navigator.clipboard 가 막혀 있거나(권한·포커스
// 없음) 응답이 없으면 옛 방식으로 한 번 더 시도한다.
export async function writeClipboardText(text) {
  try {
    await withTimeout(navigator.clipboard.writeText(text), CLIPBOARD_API_TIMEOUT_MS)
    return true
  } catch {
    /* 아래 옛 방식으로 */
  }
  try {
    return legacyCopy(text)
  } catch {
    return false
  }
}

// 버튼이 속한 코드블록의 본문 글자. 화면에는 이스케이프된 HTML 이지만 textContent 는
// 원래 글자(&lt; → <)로 돌려준다. 코드블록이 아니면 null.
export function readCodeText(button) {
  const wrap = button.closest('.wiki-code-wrap')
  const code = wrap?.querySelector('pre code')
  return code ? code.textContent : null
}

// 버튼 글자·모양을 결과에 맞게 바꾸고, 잠시 뒤 원래대로 되돌린다. 연달아 누르면 앞의
// 되돌리기 예약을 취소하고 새로 예약해서, 먼저 누른 쪽 타이머가 뒤의 표시를 끊지 않게 한다.
function showResult(button, ok, setTimer, clearTimer) {
  const label = button.querySelector(LABEL_SELECTOR)
  button.dataset.state = ok ? 'copied' : 'failed'
  if (label) label.textContent = ok ? COPIED_LABEL : FAILED_LABEL

  clearTimer(resetTimers.get(button))
  resetTimers.set(
    button,
    setTimer(() => {
      delete button.dataset.state
      if (label) label.textContent = COPY_LABEL
    }, RESET_AFTER_MS),
  )
}

// 복사에 성공하면 true. 의존성(write, setTimer, clearTimer)은 테스트에서 바꿔 끼울 수 있다.
export async function copyCodeBlock(
  button,
  { write = writeClipboardText, setTimer = setTimeout, clearTimer = clearTimeout } = {},
) {
  const text = readCodeText(button)
  if (text === null) return false
  const ok = await write(text)
  showResult(button, ok, setTimer, clearTimer)
  return ok
}
