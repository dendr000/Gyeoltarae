// Copyright (c) dendr000. MIT License.

// 최상단 메뉴(파일·편집·보기·창)에 들어갈 "설정" 메뉴를 만든다. 값을 읽고 저장하는 일은 호출한 쪽(main.js)이 맡아서, 이 파일은
// Electron 없이 시험할 수 있다.
//
// 정렬 단축키(Ctrl+` 줄 정렬, Ctrl+Shift+` 묶음 정렬)는 기본이 항상 오름차순이다. 이 항목을 켜면 이미 오름차순인 글에서 다시 눌렀을 때
// 내림차순으로 뒤집힌다(켜짐 = 오름차순/내림차순 둘 다 됨).
export function createSettingsMenu({ getSortFlip, onSortFlipChange }) {
  return {
    label: '설정',
    submenu: [
      {
        label: '정렬 단축키: 다시 누르면 오름차순 <-> 내림차순 뒤집기',
        type: 'checkbox',
        checked: getSortFlip() === true,
        // Electron 이 클릭하면 체크 상태를 먼저 바꾼 뒤 menuItem 을 넘겨 주므로 menuItem.checked 가 바뀐 값이다.
        click: (menuItem) => onSortFlipChange(menuItem.checked === true),
      },
    ],
  }
}
