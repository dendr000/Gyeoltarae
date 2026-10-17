// Copyright (c) dendr000. MIT License.
import { normalizeTypewriterZone } from '../shared/typewriterZone.js'

// 최상단 메뉴(파일·편집·보기·설정·창)에 들어갈 "설정" 메뉴를 만든다. 항목 이름은 짧게 기능만 적고, 설명은 docs/features 에 둔다. 값을 읽고 저장하는 일은 호출한 쪽(main.js)이 맡아서, 이 파일은
// Electron 없이 시험할 수 있다.
//
// 1. 정렬 단축키(Ctrl+` 줄 정렬, Ctrl+Shift+` 묶음 정렬)는 기본이 항상 오름차순이다. 이 항목을 켜면 이미 오름차순인 글에서 다시 눌렀을 때
//    내림차순으로 뒤집힌다(켜짐 = 오름차순/내림차순 둘 다 됨).
// 2. 타자기 스크롤: 글을 쓰는 줄(커서)이 편집창의 고른 높이에 머물도록 편집창을 스크롤한다. 편집창을 세로로 5등분한 구역 중 하나를 고른다
//    (기본 끔). 계산 규칙은 src/lib/typewriterScroll.js.
const TYPEWRITER_CHOICES = [
  { zone: 0, label: '끔' },
  { zone: 1, label: '1 · 맨 위' },
  { zone: 2, label: '2 · 위' },
  { zone: 3, label: '3 · 가운데' },
  { zone: 4, label: '4 · 아래' },
  { zone: 5, label: '5 · 맨 아래' },
]

export function createSettingsMenu({
  getSortFlip,
  onSortFlipChange,
  getTypewriterZone = () => 0,
  onTypewriterZoneChange = () => {},
}) {
  return {
    label: '설정',
    submenu: [
      {
        label: '정렬 뒤집기',
        type: 'checkbox',
        checked: getSortFlip() === true,
        // Electron 이 클릭하면 체크 상태를 먼저 바꾼 뒤 menuItem 을 넘겨 주므로 menuItem.checked 가 바뀐 값이다.
        click: (menuItem) => onSortFlipChange(menuItem.checked === true),
      },
      { type: 'separator' },
      {
        label: '타자기 스크롤',
        // 같은 묶음 안의 radio 항목은 하나만 체크된다. 저장된 값이 이상하면 끔으로 본다.
        submenu: TYPEWRITER_CHOICES.map(({ zone, label }) => ({
          label,
          type: 'radio',
          checked: normalizeTypewriterZone(getTypewriterZone()) === zone,
          click: () => onTypewriterZoneChange(zone),
        })),
      },
    ],
  }
}
