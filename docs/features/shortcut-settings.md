# 단축키 설정 (설정 > 단축키…)

## 한 줄 요약

창 맨 위 메뉴의 **설정 > 단축키…** 를 누르면 **기능별 단축키를 바꾸거나 없애거나 기본값으로 되돌릴 수 있는 창**이 뜬다. VS Code 같은 도구의 "키보드 바로 가기" 설정과 비슷하다. 자주 쓰는 13개 기능부터 지원한다.

## 쓰는 법

1. 메뉴 **설정 > 단축키…** 를 연다.
2. 바꿀 기능 오른쪽의 **변경** 을 누른다(칸에 "키를 누르세요…" 가 보인다).
3. 원하는 **키 조합을 누른다.** (Ctrl 이나 Alt 를 누르는 동안은 "Ctrl+…" 처럼 미리 보인다.) 규칙에 맞으면 바로 바뀐다.
4. **Esc** 는 입력을 취소한다. 입력 중이 아닐 때 Esc 는 창을 닫는다.

| 단추 | 하는 일 |
|---|---|
| **변경** | 새 키를 입력해 바꾼다 |
| **없애기** | 그 기능의 단축키를 없앤다(키 칸에 "없음"). 그 기능은 단축키로는 쓸 수 없다 |
| **기본값** | 그 기능을 기본 키로 되돌린다(바꾼 기능에만 켜짐) |
| **모두 기본값으로** | 모든 기능을 기본 키로 되돌린다 |

바꾼 키는 **밝은 테두리**로 표시된다. 바꾼 키는 이 PC 에 저장되어 다음 실행에도 유지된다(브라우저 저장소 `wikidesk-shortcuts`, 바꾼 것만 저장).

## 바꿀 수 있는 기능과 기본 키

| 묶음 | 기능 | 기본 키 |
|---|---|---|
| 편집 | 줄 위로 이동 / 줄 아래로 이동 | Alt+↑ / Alt+↓ |
| 편집 | 줄 복제 | Ctrl+D |
| 편집 | 줄 이름순 정렬 | Ctrl+` |
| 편집 | 묶음 이름순 정렬 | Ctrl+Shift+` |
| 탭 | 탭을 왼쪽으로 / 오른쪽으로 이동 | Ctrl+Alt+← / Ctrl+Alt+→ |
| 문서 | 새 문서(열린 문서의 폴더에) | Ctrl+N |
| 화면 | 사이드바 열기/닫기 | Ctrl+M |
| 화면 | 뷰어 <-> 편집 전환 | Ctrl+E |
| 화면 | 뷰어 / 듀얼 / 편집 모드로 | Ctrl+1 / Ctrl+2 / Ctrl+3 |

## 키 조합의 규칙

- **Ctrl 이나 Alt 가 들어가야 한다.** 글자만(또는 Shift+글자)으로는 지정할 수 없다 — 글을 칠 때 가로채 버리기 때문이다. 기능키(F1~F12)는 수식키 없이도 된다.
- **이미 다른 기능이 쓰는 키는 지정할 수 없다**(복사·붙여넣기 Ctrl+C/V/X/A, 되돌리기 Ctrl+Z/Y, 저장 Ctrl+S, 찾기 Ctrl+F, 굵게/밑줄 Ctrl+B/U, 탭 닫기 Ctrl+W, 워크스페이스 열기 Ctrl+O, 상용구 치환 Alt+Enter·Alt+H·Alt+T, 줄 처음/끝 이동 Alt+←/→ 등). 지정하려 하면 이유를 안내한다.
- **바꿀 수 있는 기능끼리 키가 겹치면** "OOO 이(가) 쓰고 있습니다. 그 기능의 단축키를 없애고 이 키로 바꿀까요?" 라고 묻는다. **바꾸기** 를 누르면 상대 기능의 단축키는 없어지고(나중에 **변경**·**기본값** 으로 다시 정할 수 있다), **취소** 면 바뀌지 않는다.
- Mac 의 Cmd 는 Ctrl 과 같게 본다. 한글 자판 상태에서도 된다(영문 글자는 글쇠의 글자로, 한글이 눌리면 물리 키 위치로 읽는다). 조합은 "Ctrl+Alt+Shift+글쇠" 순서로 정리된다.

## 동작 방식과 한계

- **키 입력을 기다리는 동안** 누른 키는 이 창이 모두 받는다. 앱의 다른 단축키가 동작하거나 글자가 입력되지는 않는다. 단, **Electron 메뉴의 단축키(Ctrl+O 워크스페이스 열기 등)와 윈도우 시스템 키(Alt+F4, 윈도우 키 조합)** 는 앱이 먼저 받지 못해서 지정할 수 없다.
- **그래픽 드라이버·키보드 장치가 가로채는 조합**(인텔 그래픽의 Ctrl+Alt+방향키 화면 회전, 노트북 Fn 조합)은 앱에 오지 않아 지정해도 동작하지 않는다.
- 바꾼 키는 **이 PC 의 이 앱에만** 저장된다. 다른 PC 로 옮기려면 다시 지정해야 한다.
- 이번 범위 밖의 키(글자 굵게 Ctrl+B, 찾기 Ctrl+F, Alt+←/→ 줄 처음/끝 이동, 숫자패드 Enter 로 `[br]`, 표 편집기 안의 키 등)는 아직 설정할 수 없고 바꿀 수 있는 기능 목록에 없다.
- 기능 목록은 `src/lib/shortcuts.js` 의 `SHORTCUT_ACTIONS` 한 곳에 있다. 기능을 추가하려면 그 목록에 항목을 더하고 해당 키 처리 코드가 `shortcuts[id]` 로 판별하게 바꾸면 된다.

## 구조

| 파일 | 역할 |
|---|---|
| `src/lib/shortcuts.js` | 기능 목록·기본 키, 이벤트 -> 조합 글(`eventToCombo`), 일치 판별(`matchesShortcut`), 규칙 검사(`validateCombo`), 충돌 찾기(`findConflict`), 저장된 글 읽기(`parseShortcutOverrides`), 화면 표기(`comboLabel`) — 순수 함수 |
| `src/store/useAppStore.js` | `shortcuts`(합친 키)·`shortcutOverrides`(바꾼 키), `setShortcut`·`resetShortcut`·`resetAllShortcuts`, 저장 |
| `src/components/ShortcutSettingsModal.jsx` | 설정 창(키 입력 받기, 안내, 충돌 확인) |
| `src/App.jsx`, `src/components/EditorPane.jsx` | 키 처리가 `shortcuts` 의 현재 키로 판단 |
| `src/lib/{lineMove,tabOrder,newDocShortcut,sidebarShortcut,modeShortcut}.js` | 각 기능의 판별 함수(바꾼 키를 인자로 받고, 없으면 기본 키) |
| `electron/settingsMenu.js`, `electron/main.js`, `electron/preload.cjs` | 메뉴 "단축키…" -> 화면에 알림 |
| `tests/lib/shortcuts.test.js`, `tests/store/shortcutSettings.test.js`, `tests/components/shortcutSettingsModal.test.js`, `tests/electron/shortcutMenu.test.js` | 규칙·스토어·창·메뉴 시험 |

## 확인한 것 (실제 Electron 창, 실제 키 입력)

메뉴 "단축키…" 와 같은 알림으로 창이 열림 · 기능 13개 표시, 기본 키 정확 · 줄 복제를 Ctrl+Alt+K 로 지정(Ctrl 만 누른 동안 "Ctrl+…" 미리 보임) · K 만 누르면 "Ctrl 이나 Alt 를 함께…" 로 거절 · Ctrl+C 는 예약된 키라 거절 · 새 문서를 Ctrl+M 으로 지정하려 하면 사이드바 기능과 충돌 안내, 바꾸기 후 새 문서가 Ctrl+M·사이드바는 "없음" · Esc 로 입력 취소와 창 닫기 · 창을 닫은 뒤 편집기에서 옛 키 Ctrl+D 는 줄을 복제하지 않고 새 키 Ctrl+Alt+K 는 복제함.

## 용어 설명 (초보자용)

| 용어 | 뜻 |
|---|---|
| 단축키 | 마우스 대신 키보드 조합으로 기능을 실행하는 것 |
| 수식키 | Ctrl·Alt·Shift 처럼 다른 키와 함께 눌러야 뜻을 갖는 키 |
| 충돌 | 서로 다른 두 기능에 같은 키를 정한 것 |
| 예약된 키 | 복사·붙여넣기처럼 이미 다른 기능이 쓰고 있어 바꿀 수 없게 막아 둔 키 |
| 기본값 | 아무것도 바꾸지 않았을 때 정해져 있는 키 |
