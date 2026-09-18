# 상용구(텍스트 자동완성) + 고유명사 사전(Alt+H 순환치환) 도입 계획

- 작성일: 2026-09-16
- 배경: Galpi 프로젝트(`C:\dev\Galpi\Galpi-React`)의 두 기능을 WikiDesk로 이식. 원본 소스를
  전부 읽고(`useBoilerplateCore.js`, `useBoilerplateListener.js`, `useBoilerplateData.js`,
  `dictLocalDb.js`, `useMemoDictListener.js`, `dictParser.js`, 각 모달/폼 컴포넌트) 핵심 동작을
  파악한 뒤, WikiDesk 아키텍처(로컬 전용·파일 기반·`<textarea>` 단일 에디터)에 맞게 재설계함.
  Galpi 원본을 그대로 복사하는 게 아니라 **동작(무엇을 하는가)만 가져오고 구현은 WikiDesk에
  자연스러운 방식으로 새로 짬** — 지금까지 이 프로젝트에서 나무위키 문법을 그대로 베끼지 않고
  WikiDesk식으로 재해석해 온 것과 같은 원칙.

## 1. 가져오는 두 기능의 정확한 동작 (Galpi 원본 기준)

### 상용구 (텍스트 자동완성)
- `{제목, 본문, 카테고리}` 형태로 등록. 제목은 "발동 단축어"(예: "감사"), 본문은 실제로 삽입될
  전체 텍스트.
- 타이핑 중 **커서 바로 앞 줄의 끝부분**이 등록된 어떤 제목으로 "시작"하면(prefix match) 커서
  근처에 후보 팝업이 뜸. 방향키로 고르고 Tab/Enter로 확정 — 확정되면 타이핑했던 부분이 지워지고
  본문으로 치환됨.
- 제목을 끝까지 정확히 치고 스페이스/엔터를 누르면(설정에 따라) 팝업 없이 바로 자동 치환. 동일
  카테고리에 같은 제목이 없으므로 항상 유일하게 결정됨.
- 본문 안에 `{#}`를 넣어두면 치환 후 커서가 그 위치로 이동(예: `감사합니다, {#}님` → 치환 후
  본문 삽입, 커서는 "님" 앞).
- 카테고리(폴더)로 분류, 툴바 버튼으로 "전체 목록에서 골라 삽입"(1~9 숫자키 선택)도 가능.
- 일괄 등록: `제목::::본문` 또는 `제목(본문)` 형식의 줄을 한꺼번에 붙여넣기.

### 고유명사 사전 (Alt+H 순환치환)
- `{원문, 한자/영문}` 쌍을 등록(같은 원문에 여러 한자가 달릴 수 있음 — 동음이의어).
- 커서를 단어 뒤에 두고 **Alt+H**를 누르면, 커서 바로 앞 텍스트의 끝부분이 등록된 원문(또는 이미
  "원문(한자)" 형태로 바뀐 상태)과 일치하는지 찾아서 **다음 후보로 순환**시킴:
  `동방` → `동방(東方)` → `동방(東邦)` → (다시) `동방` → ...
- 등록은 `사전` 관리 화면에서 개별 등록 + `원문(한자)` 형식 줄 단위 일괄 등록.

## 2. 기존 WikiDesk 코드 중 그대로 재사용할 지점

새로 만드는 것보다 **이미 있는 것과 최대한 같은 모양으로 만드는 것**이 이번 설계의 핵심 원칙.

- **저장 구조**: 상용구는 `자료`(`.wikidesk-data/유형/이름.md`) 공간과 완전히 같은 모양 —
  `{카테고리}/{제목}.md` 파일 하나가 상용구 하나. `electron/fileSystem.js`의
  `scanDataEntries`/`ensureDataEntry`를 그대로 본떠서 `scanSnippets`/`ensureSnippet`을 만듦.
  (자료처럼 같은 제목이 카테고리마다 따로 존재할 수 있어야 하므로 — Galpi 원본도 카테고리별
  중복만 막고 있음 — 조합 키 `카테고리/제목`이 자료의 `유형/이름`과 정확히 대응됨)
- **자동완성 팝업**: `EditorPane.jsx`에 이미 `[[파일:` 자동완성이 있음
  (`detectFileRefQuery`/`updateFileSuggest`/`selectFileSuggestItem`/`getCaretCoordinates`,
  `.file-suggest-menu` — 방향키 이동, Tab/Enter 확정, 화면 밖으로 안 나가게 좌표 보정까지 이미
  구현돼 있음). 상용구 팝업은 이 뼈대를 그대로 쓰고 "무엇을 트리거로 보는가"(고정 접두사 `[[파일:`
  가 아니라 등록된 제목과의 prefix match)만 새로 짬.
- **텍스트 삽입**: `EditorPane.jsx`의 `replaceRange`(→ `document.execCommand('insertText', ...)`)
  를 그대로 사용 — 실행취소(undo) 보존까지 이미 해결된 방식. Galpi처럼 HTML 삽입 분기가 필요 없음
  (WikiDesk 상용구 본문은 일반 나무위키 문법 텍스트이므로 그대로 타이핑한 것처럼 들어가면 됨 —
  표·각주·`{{{#!wiki}}}` 등 무엇이든 본문에 넣어두면 문서에 그대로 렌더링됨).
- **사전 파일 자체를 편집 화면**: Galpi는 검색·표·폼이 있는 전용 모달이지만, WikiDesk는 "전부
  읽을 수 있는 텍스트 파일"이 철학이므로 사전은 그냥 **일반 문서처럼 열어서 직접 줄 단위로
  편집**하게 함(`원문(한자)`가 한 줄에 하나). 표 형태 CRUD UI를 새로 만들 필요가 없어짐.

## 3. 상용구 설계

### 데이터/저장
- `.wikidesk-snippets/{카테고리}/{제목}.md`, 파일 내용 = 본문 그대로(치환될 텍스트, `{#}` 마커
  포함 가능).
- 카테고리 기본값 "공통"(자료의 "기타"에 해당하는 미분류 폴더 개념) — 폴더 생성은 자료처럼 첫
  등록 시 이름을 직접 입력해서 만듦(전용 "폴더 관리" UI는 v1에서 생략 — 아래 4절 참고).
- `useAppStore.js`: `snippetIndex` = `{ "카테고리/제목": { category, title, path, content } }`,
  `rebuildIndexes()`에서 `scanSnippets`로 채움(자료와 동일 패턴).

### 자동완성 트리거
- Galpi와 동일하게 **별도 트리거 문자 없이** 현재 줄의 끝부분을 등록된 모든 제목과 prefix
  match(대소문자 무시). 일치하는 제목이 있으면 최대 8개까지 후보 팝업.
- 매 입력마다 O(등록 개수)로 전체를 훑는 대신, `snippetIndex`에서 제목만 뽑은 배열을 미리 만들어
  두고 그 배열만 순회(개인 세계관 위키 규모에서는 수백 개 이하로 예상되므로 충분히 빠름 — Galpi가
  IndexedDB까지 간 이유였던 "11만 건" 같은 규모는 WikiDesk 사용 맥락에 없음).
- Tab/Enter로 확정 → `replaceRange`로 치환 → `{#}` 위치가 있으면 그만큼 커서를 앞으로 이동.
- 툴바에 "상용구 삽입" 버튼 추가(기존 "자료 불러오기"/"틀 불러오기" 버튼과 같은 자리) — 누르면
  현재 커서 위치에 전체 상용구 목록 팝업(같은 컴포넌트, 필터링 없이 전체 표시), 1~9 숫자키로도
  선택 가능.

### 사이드바
- `SnippetSidebar.jsx`(신규) — `DataSidebar.jsx`를 거의 그대로 본뜸: 카테고리별 그룹, "+"로 새
  상용구(카테고리+제목 입력) 만들고 바로 편집기로 열림(일반 문서처럼 본문을 자유롭게 타이핑),
  삭제 버튼.
- 상용구 항목을 클릭하면 **그 파일이 메인 에디터에서 열림**(자료/틀과 동일) — 상용구 본문 편집도
  지금 문서 편집기·툴바를 그대로 재사용.

## 4. 사전 설계

### 데이터/저장
- `.wikidesk-dict/사전.txt` 단일 파일, 한 줄에 `원문(한자)` 하나(Galpi 일괄 등록 형식과 동일 —
  가장 익숙할 형식을 저장 형식으로도 그대로 채택). 같은 원문이 여러 줄 있으면 동음이의어로 취급.
- `src/lib/dictCycle.js`(신규, 순수 함수만): 텍스트를 파싱해 `Map<원문, 한자[]>`로 만드는
  `parseDictText`, 그리고 커서 앞 텍스트를 받아 다음 순환 후보를 돌려주는
  `resolveCycleReplacement(textBeforeCursor, dictMap)` — Galpi의 `dictLocalDb.js` 알고리즘(가장
  긴 접미사부터 시도, `원문(한자)` 형태도 인식해서 다음 한자로 넘어감)을 그대로 포팅하되 IndexedDB
  없이 동기 함수로 — 개인 위키 규모(수백~수천 항목)면 매번 전체 순회해도 체감 지연이 없어서
  Galpi의 "인덱스 조회" 최적화 자체가 불필요해짐.
- `useAppStore.js`: `dictText`(원문 그대로) + `dictMap`(파싱 결과, `rebuildIndexes`에서 같이 계산).

### Alt+H 순환치환
- `EditorPane.jsx`에 `keydown` 핸들러 추가: `Alt+H`(Shift 안 눌렸을 때만 — Galpi처럼 다른
  Alt+Shift+H 단축키와 겹치지 않게) 감지 시 `textarea.value`의 `selectionStart` 앞부분을
  `resolveCycleReplacement`에 넘기고, 매치되면 그 길이만큼 `setSelectionRange`로 선택 후
  `execCommand('insertText', ...)`로 교체.
- **확인 필요**: Windows에서 Alt+글자 조합은 기본적으로 메뉴 니모닉으로 먼저 소비될 수 있음(지금
  메뉴는 "파일/편집/보기/창"이라 H가 안 겹치지만, 실제 Electron 창에서 `e.preventDefault()`가 그
  전에 걸리는지 실기기 테스트로 확인).

### 사전 편집
- 사이드바에 "사전" 항목 하나(리스트가 아니라 단일 진입점) — 클릭하면 `.wikidesk-dict/사전.txt`가
  일반 문서처럼 편집기에서 열림. 사용자가 `원문(한자)` 줄을 직접 추가/수정/삭제. 전용 등록
  폼·검색 UI는 v1에서 생략(아래 5절 참고) — 항목 수가 적을 개인 위키 맥락에서는 텍스트 파일을
  직접 여는 것으로 충분하고, 별도로 안 배워도 되는 게 오히려 강점.

## 5. Galpi 대비 의도적으로 단순화/변경한 부분 (그리고 이유)

| Galpi 원본 | WikiDesk 버전 | 이유 |
|---|---|---|
| Spring 백엔드 REST API로 CRUD | 워크스페이스 안 로컬 파일(`.wikidesk-snippets`, `.wikidesk-dict`) | WikiDesk는 애초에 서버가 없는 로컬 전용 앱 |
| 사전을 IndexedDB에 캐싱(11만 건 규모 대응) | 매번 파일 읽어서 메모리에서 순회 | 개인 세계관 위키 규모에서는 최적화가 불필요한 복잡도만 늘림 |
| 사전이 작품 구분 없는 전역 단일 사전 | 워크스페이스별로 분리 | WikiDesk의 다른 모든 데이터(자료/틀/이미지)가 워크스페이스 스코프라 통일성 유지. 여러 워크스페이스가 사전을 공유하고 싶다는 요청이 실제로 나오면 그때 전역화 고려 |
| 상용구/사전 전용 모달(검색바, 표, 폼) | 사이드바 + 기존 문서 편집기 재사용 | 이미 있는 자료/틀 UI 패턴과 통일, 새 UI 컴포넌트를 최소화 |
| contentEditable 리치텍스트(HTML 삽입, 각주 ID 재발급) | 일반 텍스트 삽입만 | WikiDesk 에디터는 일반 `<textarea>` — 본문에 나무위키 문법을 쓰면 렌더링 시 알아서 해석됨 |
| 자동완성 on/off, 미리보기 on/off 설정 토글 | v1은 항상 켜짐 | 설정 패널 자체가 지금 앱에 없음 — 필요해지면 그때 추가(과도한 설계 방지) |
| 상용구 "폴더 관리"(이름 변경/삭제 전용 UI) | v1은 생략, 카테고리는 상용구 만들 때 이름 직접 입력 | 자료 공간도 지금 유형(폴더) 관리 UI가 따로 없음 — 기존 관례와 통일 |

## 6. 파일별 변경 사항

- `electron/fileSystem.js`: `SNIPPETS_DIR_NAME`, `snippetsDirPath`, `scanSnippets`,
  `ensureSnippet`(자료 함수들을 거의 그대로 복제). `DICT_DIR_NAME`/`DICT_FILE_NAME`,
  `readDictFile`, `writeDictFile`(없으면 빈 문자열/새로 생성).
- `electron/main.js`: `snippets:scan`, `snippets:ensure` IPC(자료 핸들러 패턴 그대로),
  `dict:read`, `dict:write` IPC.
- `electron/preload.cjs`: 위 5개 채널 노출.
- `src/lib/mockApi.js`: 브라우저 프리뷰용 동일 모의 구현(자료 모의 구현 패턴 그대로 복제 +
  `sampleDict` 문자열 변수 하나).
- `src/lib/dictCycle.js`(신규): `parseDictText`, `resolveCycleReplacement` 순수 함수.
- `src/store/useAppStore.js`: `snippetIndex`, `dictText`, `dictMap` 상태 +
  `createSnippet`/`deleteSnippet`/`openSnippet`(자료 액션 패턴) + `saveDictText`. `rebuildIndexes`
  확장.
- `src/components/SnippetSidebar.jsx`(신규): `DataSidebar.jsx` 패턴 복제.
- `src/components/EditorPane.jsx`: 상용구 자동완성 상태/로직(`snippetSuggest` — 파일 자동완성과
  같은 구조), 툴바 "상용구 삽입" 버튼, Alt+H 사전 순환 키다운 핸들러.
- `src/App.jsx`: 사이드바에 `SnippetSidebar` 배치, "사전" 진입점(사이드바 최하단 버튼 하나로 —
  전용 사이드바 컴포넌트까지는 불필요) 추가.
- `src/App.css`: 상용구 팝업(`.file-suggest-menu` 스타일 재사용 가능해서 신규 CSS는 최소), 사전
  진입 버튼 스타일.
- `wikiParser.js`는 변경 없음 — 두 기능 모두 "에디터에 텍스트를 밀어 넣는" 편집 보조 기능이라
  렌더링 파이프라인과 무관.

## 7. 테스트 계획

- 브라우저 프리뷰(mockApi): 상용구 등록 → 다른 문서에서 제목 타이핑 → 팝업 뜨는지 → Tab으로
  확정 → 본문 삽입 + `{#}` 커서 위치 확인. 같은 제목을 카테고리 다르게 2개 등록해도 정상 동작하는지.
  사전 파일 열어서 `동방(東方)` 줄 추가 → 다른 문서에서 "동방" 뒤 Alt+H → 실제 exe에서만 확인
  가능한 것은 표시해두고 넘어감(이 세션에서 이미 여러 번 겪은 "브라우저 프리뷰로는 재현 안 되는
  실제 exe 전용 동작" 케이스와 같은 종류일 수 있음).
- Alt+H가 실제 exe(Windows)에서 메뉴/포커스와 충돌 없이 동작하는지는 반드시 실기기 확인 필요.
- `npm run build` + 기존 자료/틀 기능 회귀 없는지(같은 패턴을 복제하는 것이라 회귀 위험은 낮지만
  확인).

## 8. 구현 순서

1. 상용구 백엔드(파일시스템 함수 + IPC + mockApi) → 스토어 → 사이드바 UI(자료 공간 복제라 가장
   빠르고 검증된 경로)
2. 에디터 자동완성 팝업(`[[파일:` 패턴 재사용) + 툴바 버튼 + `{#}` 커서 이동
3. 사전 백엔드(단일 파일 읽기/쓰기) + `dictCycle.js` 순수 함수 + 스토어
4. Alt+H 키다운 핸들러 + 사이드바 진입점
5. 브라우저 검증 → exe 빌드/패키징 → asar 검증 → 실기기에서 Alt+H·자동완성 직접 확인 → CHANGELOG/README

**진행 상황**: 구현 완료(1~5 전부). 브라우저 프리뷰로 자동완성 팝업·`{#}` 커서 이동·카테고리 충돌
표시·툴바 숫자키 선택·Alt+H 순환치환·사전 편집까지 전부 확인. `npm run dist:win:packager`로 패키징
후 asar 바이트 동일성도 확인함. 단, Alt+H가 실제 Windows exe에서 메뉴 니모닉과 충돌 없이 동작하는지는
브라우저 프리뷰로는 확인 불가 — 실기기 테스트 필요(§4 "확인 필요" 참고).
