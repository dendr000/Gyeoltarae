// Copyright (c) dendr000. MIT License.
import { normalizeMagnifierSize } from '../shared/magnifier.js'
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

// 3. 돋보기 크기: 마우스 휠 클릭으로 켜는 둥근 돋보기의 지름을 4단계로 고른다(기본 보통). 규칙은 shared/magnifier.js.
const MAGNIFIER_CHOICES = [
  { size: 'small', label: '작게' },
  { size: 'normal', label: '보통' },
  { size: 'large', label: '크게' },
  { size: 'xlarge', label: '아주 크게' },
]

export function createSettingsMenu({
  getSortFlip,
  onSortFlipChange,
  getTypewriterZone = () => 0,
  onTypewriterZoneChange = () => {},
  getHeadingHighlight = () => true,
  onHeadingHighlightChange = () => {},
  getMagnifierSize = () => 'normal',
  onMagnifierSizeChange = () => {},
  getCountNewlines = () => false,
  onCountNewlinesChange = () => {},
  onOpenShortcuts = () => {},
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
      {
        // 편집 모드에서 제목 줄(=제목=)에 배경을 얹어 강조할지(기본 켜짐). 끄면 제목 줄도 일반 줄처럼 보인다.
        label: '제목 강조',
        type: 'checkbox',
        checked: getHeadingHighlight() !== false,
        click: (menuItem) => onHeadingHighlightChange(menuItem.checked === true),
      },
      {
        // 드래그한 글자의 글자 수를 셀 때 줄바꿈도 1자로 셀지(기본 꺼짐 = 줄바꿈을 세지 않는 기본 글자 수). 문서 전체 글자 수는 이 설정과 상관없이 기본 글자 수다.
        label: '줄바꿈 포함 글자 수',
        type: 'checkbox',
        checked: getCountNewlines() === true,
        click: (menuItem) => onCountNewlinesChange(menuItem.checked === true),
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
      {
        label: '돋보기 크기',
        // 저장된 값이 이상하면 보통으로 본다.
        submenu: MAGNIFIER_CHOICES.map(({ size, label }) => ({
          label,
          type: 'radio',
          checked: normalizeMagnifierSize(getMagnifierSize()) === size,
          click: () => onMagnifierSizeChange(size),
        })),
      },
      { type: 'separator' },
      {
        // 기능별 단축키를 바꾸는 창(렌더러)을 연다. 규칙은 src/lib/shortcuts.js.
        label: '단축키…',
        click: () => onOpenShortcuts(),
      },
    ],
  }
}
