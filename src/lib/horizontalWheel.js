// Copyright (c) dendr000. MIT License.

// 가로로 넘치는 줄(편집 툴바)에서 마우스 휠을 굴리면 좌우로 스크롤되게 하는 계산. 브라우저의 휠은
// 기본적으로 세로 스크롤이라, 가로 스크롤바를 잡지 않으면 툴바 오른쪽의 버튼에 갈 수 없었다.
//
// 돌려주는 값: 새 scrollLeft. null 이면 이 휠 입력은 우리가 다루지 않는다(내용이 넘치지 않음, 가로로
// 굴린 입력, Ctrl+휠, 이미 끝인데 더 굴림, deltaY 0) — 호출한 쪽은 기본 동작을 그대로 두면 된다.
const LINE_HEIGHT_PX = 16

export function wheelScrollLeft({ deltaX, deltaY, deltaMode, ctrlKey, scrollLeft, scrollWidth, clientWidth }) {
  if (ctrlKey) return null
  const maxScroll = scrollWidth - clientWidth
  if (maxScroll <= 0) return null // 넘치지 않으면 스크롤할 게 없다
  if (deltaY === 0 || Math.abs(deltaX) > Math.abs(deltaY)) return null // 이미 가로로 굴린 입력은 그대로

  // deltaMode: 0 = 픽셀, 1 = 줄, 2 = 페이지
  const pixels = deltaMode === 1 ? deltaY * LINE_HEIGHT_PX : deltaMode === 2 ? deltaY * clientWidth : deltaY
  const next = Math.min(maxScroll, Math.max(0, scrollLeft + pixels))
  if (next === scrollLeft) return null // 이미 끝: 가로채지 않는다
  return next
}
