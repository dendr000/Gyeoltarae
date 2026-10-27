# 자동 테스트

## 한 줄 요약

`npm test`를 치면 1초 안에 "파서가 각주를 제대로 처리하는가", "폴더를 옮기면 안의 문서와 열린 탭이 같이 따라가는가" 같은 확인 200여 개를 컴퓨터가
대신 해 준다. 코드를 고친 뒤 예전에 고친 버그가 되살아났는지 앱을 띄워 보지 않고도 알 수 있다.

## 용어 설명 (초보자용)

| 용어 | 뜻 |
|---|---|
| **테스트 코드** | "이 입력을 주면 이 결과가 나와야 한다"를 코드로 적어 둔 확인 항목. 사람이 화면에서 눈으로 하던 확인을 컴퓨터가 대신 반복해 준다. |
| **회귀(regression)** | 이미 고쳤던 버그가 다른 수정 때문에 다시 생기는 것. 테스트가 이걸 막는다. |
| **Vitest** | 이 프로젝트가 쓰는 테스트 실행 도구. 빌드 도구(Vite)와 설정을 같이 쓴다. |
| **mockApi (가짜 파일 시스템)** | 브라우저 미리보기용으로 이미 있던 메모리 속 가짜 파일 시스템. 스토어 테스트는 진짜 디스크 대신 이걸 쓴다. |

## 실행

```bash
npm test          # 한 번 돌리고 결과 출력
npm run test:watch  # 파일을 저장할 때마다 자동으로 다시 돌림 (개발 중에)
npm run test:changed  # 지금 바뀐 파일과 관련된 테스트만 돌림 (커밋하지 않은 변경 기준, 가장 빠름)
```

### 시간은 어디에 쓰이나 (2026-10-13 측정)

테스트가 1,100개를 넘었지만 **개수는 시간에 거의 영향이 없다.** 순수 계산 테스트는 디스크를 쓰지 않아 954개가 합쳐서 약 2.5초에 끝난다. 시간은 **진짜 디스크에 파일을 만드는 테스트**가 쓴다.

| | 이전 | 지금 |
|---|---|---|
| 전체 `npm test` | 약 50초 | 약 17초 |
| `tests/scripts/snippetPackPractice.test.js` | 30초(1,807개 파일을 네 번 설치) | 약 8초(전체 설치 한 번 + 일부 36개로 나머지 동작 시험) |

- 설치 동작(덮어쓰지 않기, 두 번째 실행 건너뛰기, 순서 파일)은 이름이 몇 개든 같은 로직이라 **대소문자 짝(emp/EMP 등)을 포함한 일부**로 시험한다. 이름이 대소문자 구분 없는 파일 시스템에서 서로 덮어쓰지 않는지는 **전체 설치 시험 하나**가 계속 확인한다.
- 새 시험을 쓸 때: 디스크에 파일을 많이 만들어야 하면 필요한 만큼만 만든다. 한 시험이 5초를 넘으면 의심한다. 시간이 많이 드는 파일은 `npx vitest run --reporter=json --outputFile=결과.json` 으로 파일·시험별 시간을 뽑아서 찾는다.

## 무엇을 확인하는가

| 파일 | 대상 | 진짜/가짜 |
|---|---|---|
| `tests/lib/wikiParser.test.js` | 문법 변환(각주·`[br]`·제목 번호·`[편집]` 위치·HTML 이스케이프) | 순수 함수 |
| `tests/lib/codeBlock.test.js` | ``` 코드블록(언어 표시와 대소문자·한글 이름, 글자 강조, 안의 문법 무시, 닫는 줄 없음, 백틱 4개, 표 행 병합 보호)과 `{{{ }}}` 코드블록의 복사 버튼 | 순수 함수 |
| `tests/lib/codeFence.test.js` | ``` 여는·닫는 줄 판별, 열린 코드블록 안인지, 언어가 적힌 코드블록 안에서만 상용구 추천을 켜는 기준(밖·언어 없음·여는 줄 제외), 에디터 자동 닫기 계산(들여쓰기·인라인 백틱·선택 영역 제외) | 순수 함수 |
| `tests/lib/codeHighlight.test.js` | 언어 이름 해석(대소문자·한글·구분 기호 무시, 모르는 이름), 색 입히기가 원문 글자를 바꾸지 않는지, HTML 이스케이프 | 순수 함수 |
| `tests/lib/listAndRule.test.js` | 목록 들여쓰기 하위 항목(공백 1·2·4칸, 탭, 번호 목록, 예전 `**` 방식), 목록 항목 아래 코드블록(목록이 끊기지 않는지, 빈 줄·접기 블록은 예전대로), `---` 구분선과 굵기 | 순수 함수 |
| `tests/electron/softRefocus.test.js` | 클릭으로 여는 동작이 blur 가 들어간 창 포커스 호출을 쓰지 않는지(뒤의 앱이 깜빡이던 문제의 회귀 방지), 가벼운 포커스 함수가 `blur()` 를 쓰지 않는지, IPC 이름 일치 | 소스 검사 |
| `tests/electron/watchScheduler.test.js` | 폴더 감시기를 켜는 시점(첫 색인 뒤, 입력이 3초 쉴 때, 계속 입력해도 20초 뒤), 시작·삭제·이동 경로가 감시기를 직접 켜지 않는지 | 가짜 시계 · 소스 검사 |
| `tests/lib/defaultTemplate.test.js`, `tests/electron/defaultTemplate.test.js`, `tests/store/defaultTemplate.test.js` | 폴더 기본 틀: 시작 틀 우선순위(직접 고른 틀 > 폴더 기본 틀 > 내장 기본 내용), 설정 파일 읽기·쓰기(물려받기·해제·망가진 파일), 새 문서 만들기 | 순수 함수 · 임시 폴더 · mockApi |
| `tests/components/treeLabel.test.js` | 파일 트리의 숫자 배지(폴더·문서 이름, `2024년`·`3D`·숫자만 있는 이름 제외, HTML 이스케이프) | 서버 렌더링(DOM 없이 문자열) |
| `tests/lib/smartQuotes.test.js` | 뷰어의 둥근 따옴표(열림/닫힘 판단, 태그·블록 경계, 코드·속성은 그대로, 두 번 적용해도 같음)와 실제 파서 출력(굵게·표·목록·각주·접기·스타일 상자, 목차 데이터 불변) | 순수 함수 |
| `tests/lib/autoCategory.test.js` | 폴더 자동 분류의 규칙(읽어들일 글자 입력 해석, 읽을 이름 구하기, 대소문자 무시 부분 일치와 순서, 비어 있는 분류 칸 채우기) — 사용자가 든 예(DBMS·외래키) 포함 | 순수 함수 |
| `tests/electron/autoCategory.test.js` | 자동 분류 설정 파일(폴더 안 숨김 파일)의 저장·가장 가까운 윗 폴더 찾기·워크스페이스 밖 제외·해제·망가진 파일 | **진짜 디스크**(임시 폴더) |
| `tests/store/autoCategory.test.js` | 새 문서를 만들 때 자동 분류가 붙는지(예: `04 외래키와 Join` → ddazua·DBMS·외래키), 글양식·가져온 파일·여러 겹 설정 | mockApi |
| `tests/lib/tableNav.test.js` | 표 편집기 Tab(오른쪽 셀, 행 끝이면 아래 행 첫 셀)·Shift+Tab(그 반대)·Enter(바로 아래 셀) 이동 규칙, 새 행 생성, 병합된 셀 건너뛰기 | 순수 함수 |
| `tests/lib/tableStats.test.js` | 표 편집기 상태 표시줄: 칸 글자에서 숫자 읽기(쉼표·통화·단위, 날짜·전화번호 제외), 범위 합계·평균·최소·최대, 병합·헤더 행 제외, 소수 오차, 엑셀식 열 이름 | 순수 함수 |
| `tests/lib/tableGrid.test.js` | 표 편집기 행·열 중간 삽입(병합 한가운데에 끼우면 병합이 커지는 규칙), 고른 범위를 병합 영역까지 넓히기, 병합이 앞뒤가 맞는지 검사 | 순수 함수 |
| `tests/lib/tableGridOps.test.js` | 표 편집기 행·열 이동·복제, 아래·오른쪽으로 채우기(헤더 행 보호, 병합 가리킴 갱신, 병합이 걸린 줄 거부) | 순수 함수 |
| `tests/lib/tableSort.test.js` | 표 편집기 열 기준 정렬(숫자 → 글자 → 빈 칸, 영문 → 한글, 같은 값 순서 유지, 세로 병합 거부, 정렬 범위) | 순수 함수 |
| `tests/lib/tableFind.test.js` | 표 편집기 찾아 바꾸기(대소문자 무시, 정규식 기호는 글자, 범위, 가려진 칸 제외, 한 곳·모두 바꾸기) | 순수 함수 |
| `tests/lib/fillSeries.test.js` | 표 편집기 자동 채우기 규칙(숫자 등차, 글자 속 숫자, 날짜·달 단위·윤년, 요일·월 이름 순환, 반복, Ctrl 반전) | 순수 함수 |
| `tests/lib/tableAutoFill.test.js` | 자동 채우기를 격자에 적용(끌기 방향·칸 수, 열/행마다 규칙, 서식 반복 복사, 병합·표 끝 거부) | 순수 함수 |
| `tests/lib/tableNumberParts.test.js` | 칸 글자를 숫자의 부분(값·통화 기호·뒤 단위·소수 자릿수·쉼표·앞의 0)으로 읽기 | 순수 함수 |
| `tests/lib/tableNumberFormat.test.js` | 숫자 서식(쉼표 넣기·빼기, 소수 자릿수 5 올림, 통화 기호·뒤 글자, 007 제외, 헤더·범위·병합) | 순수 함수 |
| `tests/lib/tableConditional.test.js` | 조건부 색 규칙(숫자 비교·사이·글자 포함·비어 있음·최댓값/최솟값·중복)과 서식 입히기·지우기 | 순수 함수 |
| `tests/lib/tableStyle.test.js` | 줄무늬 행(시작 줄·범위·해제)과 열 너비(width 속성 저장·정리·값 검증) | 순수 함수 |
| `tests/lib/tableTranspose.test.js` | 행·열 바꾸기(병합 가로↔세로, 가려진 칸 가리킴, 방향 속성 맞바꿈, 두 번 하면 원래대로) | 순수 함수 |
| `tests/lib/gridHistory.test.js` | 표 편집기 되돌리기·다시 실행 기록(같은 칸 입력 묶기, 개수 제한, 다시 실행 목록 비우기, 헤더 설정 함께 되돌리기) | 순수 함수 |
| `tests/lib/tableRowHeight.test.js` | 표 편집기 행 높이(height 속성 저장·정리·값 검증, 세로 병합 건너뛰기) | 순수 함수 |
| `tests/lib/tableConditionalSet.test.js` | 조건부 색 여러 조건(차례로 적용, 같은 항목은 뒤가 덮어씀, 건너뛰기 규칙, 지우기) | 순수 함수 |
| `tests/lib/lineDuplicate.test.js` | 문서 어디서나 Ctrl+D 줄 복제(커서 이동, 여러 줄 선택, CRLF, 코드블록 구조를 깨는 ``` 줄 제외, 블록 통째 복제) | 순수 함수 |
| `tests/lib/pagecount.test.js` | `[pagecount]` 매크로(문서 수, 이름 두 가지로 색인된 문서는 한 번만, 코드블록·인자 형태는 그대로) | 순수 함수 |
| `tests/lib/monoFont.test.js` | 글꼴 선택 규칙(이름 검증, 글꼴 목록 만들기, 설치 여부 판별) | 순수 함수 |
| `tests/lib/sidebarShortcut.test.js` | Ctrl+M 판별(대소문자·Cmd·Shift/Alt 제외·한글 조합·한글 자판) + App 연결 소스 점검 | 순수 함수 · 소스 검사 |
| `tests/lib/modeShortcut.test.js` | Ctrl+E(뷰어<->편집, 듀얼 제외)·Ctrl+1/2/3 판별, Cmd·Shift/Alt 제외·한글 조합·한글 자판, App 연결(모달 중 무시) 소스 점검 | 순수 함수 · 소스 검사 |
| `tests/lib/lineSort.test.js` | 줄 이름순 정렬(오름·내림 전환, 한국어 순서, 숫자 크기순, 대소문자 무시, 빈 줄, 선택 범위, CRLF, 코드블록 보호) + 에디터 연결 소스 점검 | 순수 함수 · 소스 검사 |
| `tests/lib/blockSort.test.js` | 묶음 정렬(들여쓰기·목록 표시·빈 줄로 묶기, 번호 제자리 유지, 표시 무시 비교, 구분선 빈 줄 유지, 범위, CRLF, 코드블록 보호) + 에디터 연결 소스 점검 | 순수 함수 · 소스 검사 |
| `tests/electron/sortSetting.test.js` | 설정 메뉴 항목(체크 표시·저장값 반영·클릭 알림), 스토어의 `sortFlip`(기본 꺼짐·시작 때 읽기·변경 알림·구독 해제), 메인·preload·편집기 연결 소스 점검 | 순수 함수 · 스토어 · 소스 검사 |
| `tests/lib/typewriterScroll.test.js` | 타자기 스크롤: 구역 -> 높이 비율, 커서 줄이 구역에 오는 스크롤 값(위·아래 끝 보정, 짧은 글, 반올림), 설정값 검증(0~5 정수만), 길이 한도, 커서 이동 키, 편집기 연결 소스 점검 | 순수 함수 · 소스 검사 |
| `tests/lib/docFind.test.js` | 문서 찾기·바꾸기: 줄바꿈이 든 찾기(한 줄바꿈·빈 줄·여러 줄·글자 `
| `tests/store/viewMode.test.js` | 기본 화면 모드(편집으로 시작, 문서를 열어도·직접 고른 모드는 유지), 페이지 없는 분류·자료·틀을 열면(탭 전환·탭 닫기 포함) 편집 -> 듀얼 자동 전환과 그 예외(이미 뷰어·듀얼, 페이지가 있는 분류), 판단 규칙(`modeForDocFields`) | 스토어(가짜 API) · 순수 함수 · 소스 검사 |
| `tests/lib/docLink.test.js`, `tests/components/fileTreeCopyLink.test.js` | 문서 링크: 폴더 이름 읽기, 이름 -> 문서 목록 해석(그대로 먼저·문서명(폴더명)·번호 있는/뗀 폴더 이름·괄호 든 폴더·공백·Object 기본 속성), 링크 글 만들기(번호 뗀 이름 우선·폴더 붙이기·번호 있는 이름으로 물러남·목록에 없는 문서)와 되돌려 풀기, 위키 링크 렌더링(바로 연결·모호·없음·제목 링크·표시 글), 사이드바 Shift+클릭 연결 | 순수 함수·소스 점검 |
| `tests/lib/magnifier.test.js`, `tests/lib/magnifierDom.test.js`, `tests/lib/magnifierForward.test.js`, `tests/electron/magnifierSetting.test.js` | 돋보기: 영역 드래그 판정(기준 거리·방향 무관 사각형·최소 크기)과 영역 확대창 계산(맞춤 배율·창 한가운데 배치·변환과 되돌리기가 서로 맞음·휠 배율 1.1~8), 마우스 동작 전달(대상 찾기에서 확대창 건너뛰기·이벤트 값 옮기기·포커스·캐럿·mouseover/out 전달), 크기 4단계·이상한 값은 보통, 휠 배율(눈금 1.2배·최소/최대·기본값), 마우스가 정중앙인 위치·변환, `:hover` 규칙 바꾸기(@media 안·읽을 수 없는 스타일시트 건너뛰기), 마우스 아래 요소 표시와 지난 표시 떼기, 입력값·스크롤 채우기, 복제에서 돋보기 자신·스크립트 빼기, 설정 메뉴 "돋보기 크기"(라디오 4개·체크·클릭)와 스토어·메인 연결, 컴포넌트 구조(휠 클릭만·기본 동작 막기·휠 passive 끔·Esc·shadow DOM·마우스 무시·정리) | 순수 함수·가짜 요소·소스 점검 |
| `tests/lib/charCount.test.js`, `tests/components/charCountBar.test.js`, `tests/electron/charCountSetting.test.js` | 글자 수 표시: 세는 기준(기본은 줄바꿈 제외, includeNewlines 로 포함·CRLF·낱개 CR·공백·특수문자·한자·이모지·NFD 한글 1자씩, 빈 값), 천 단위 쉼표, 표시줄 구조(전체는 기본 글자 수·오른쪽 끝, 드래그는 설정과 무관하게 늘 따라가고 줄바꿈 포함은 설정, textarea/뷰어 선택·이벤트), 설정 메뉴 "줄바꿈 포함 글자 수"(기본 꺼짐·스토어·메인 연결) | 순수 함수·소스 점검 |
| `tests/lib/shortcuts.test.js`, `tests/store/shortcutSettings.test.js`, `tests/components/shortcutSettingsModal.test.js`, `tests/electron/shortcutMenu.test.js` | 단축키 설정: 이벤트 -> 조합(Cmd=Ctrl·한글·Dvorak·기호·수식키만), 일치(정확히 같아야·해제·조합 중), 기본 키 13개, 규칙 검사(Ctrl/Alt 필요·예약된 키), 충돌, 저장된 글 읽기, 스토어(바꾸기·거절·충돌 force·해제·기본값·저장·저장소 못 쓸 때), 설정 창 구조, 메뉴 "단축키…"·메인·preload·App 연결 | 순수 함수·소스 점검 |
| `tests/lib/lineMove.test.js`, `tests/components/editorLineMove.test.js` | 줄 이동 Alt+↑/↓(Ctrl+Alt 는 해당 없음): 한 줄·여러 줄·커서 줄 안 위치·줄 전체 선택, 맨 위·맨 아래·빈 문서, CRLF, 편집 범위, 키 판별(Shift/Meta/조합 중 제외), 편집기 연결(기본 동작 차단·되돌리기·선택 방향) | 순수 함수·소스 점검 |
| `tests/lib/tabOrder.test.js`, `tests/store/moveTab.test.js`, `tests/components/tabBarMove.test.js`, `tests/components/activeTabMove.test.js` | 탭 순서 바꾸기(활성 탭 Ctrl+Alt+←/→ 판별·App 연결·편집기 Alt+←/→ 와 겹치지 않음 포함): 한 칸 옮기기(양 끝·없는 탭·잘못된 방향은 그대로, 원본 불변), 키 판별(조합키·한글 조합 제외), 스토어의 moveTab(활성 탭 유지), 탭 바 연결(누른 탭 기억·닫기 단추 제외·뗄 때 해제·클릭 전환 억제) | 순수 함수·소스 점검 |
| `tests/lib/imageRefs.test.js`, `tests/store/imageRename.test.js`, `tests/components/imageSidebarMenu.test.js` | 이미지 이름 바꾸기: 참조 이름 바꾸기(옵션 보존·정확히 같은 이름만·코드블록 제외·CRLF·새 이름이 옛 이름을 포함해도 한 번만), 스토어(참조 있는 문서만 바꾸고 개수 반환·번호가 붙은 최종 이름 사용·열린 문서/배경 탭 글 동기화·저장 안 된 입력 먼저 저장·참조 없는 문서는 읽지도 않음·색인에 아직 없는 새 참조 처리), 편집창 삽입 요청, 우클릭 메뉴·편집창 연결(소스 점검) | 가짜 파일 시스템·소스 점검 |
| `tests/store/snippetFolderLoad.test.js` | 읽지 않는 폴더: 읽을 목록에서 끈 폴더 빼기·폴더 요약(끈 폴더 포함)·체크 변화 가려내기, 파일 읽어 색인 만들기(못 읽은 것 건너뜀·순서 위치·진행 알림), 스토어(끈 폴더는 읽지도 색인에 넣지도 않음·폴더 목록엔 남음·다시 켜면 그 폴더만 읽음·끄면 색인에서 바로 뺌·한꺼번에 바꿔도 정리·읽는 도중 다시 끄면 안 더함·끈 폴더에 새로 만들면 다시 켬·설정 저장·진행 표시) | 가짜 파일 읽기 |
| `tests/components/codeBlockColors.test.js` | 코드블록 바탕색: --code-bg 사용, 문서 바탕과 구분(라이트 더 짙게·다크 더 밝게), 과하지 않음(대비 1.08~1.3), 예전보다 더 구분됨, 글자 강조 색 8가지 대비 4.5 이상, 본문 글자 대비 7 이상 | CSS 읽어 계산 |
| `tests/lib/snippetLoad.test.js` | 상용구 불러오는 중 표시: 켜는 기준(100개, 숫자 아닌 값), 게이지 백분율(0~100·잘못된 값), 알림 간격(50개마다), 스토어가 0에서 시작해 진행 상황을 알리고 끝나면(파일 하나 실패해도) null 로 돌아옴·적으면 한 번도 켜지 않음, 헤더 구조(저장됨 앞·동그라미·글·게이지·역할 표시·회전 애니메이션·색 변수) | 순수 함수·가짜 파일 읽기·소스 점검 |
| `tests/lib/asteriskPair.test.js`, `tests/components/editorAsterisk.test.js` | AI챗 폴더 별표 짝 맞추기: 폴더 판정(윈도·슬래시 경로, 깊은 폴더, 대소문자·NFD, 이름 비슷한 폴더·다른 폴더 안의 AI챗·맨 위 AI챗.md 제외), `*` 한 번(`*|*`)·이어서 한 번 더(`**|**`, 방금 짝을 만든 자리만)·닫는 별표 넘어가기·직접 `**` 치는 중엔 짝 안 만듦·선택 감싸기, 줄 맨 앞 `*` 뒤 공백(목록 표시), 편집창 연결(AI챗 한정·Shift 키로 상태가 안 지워짐·자동 괄호 목록에 별표 없음) | 순수 함수·소스 점검 |
| `tests/components/sidebarFixedHeader.test.js` | 사이드바 고정 머리: 검색칸·두 단추가 스크롤 영역 밖에 있음, 파일 목록에서 중복 단추 제거, 고정 영역 CSS(줄어들지 않음·위에 쌓임·배경) | 소스 점검 |
| `tests/electron/starterSnippets.test.js` | 새 워크스페이스 슬래시 명령 자동 설치: 묶음 전부 만들기·본문·순서 파일(이미 있으면 보존), 상용구 폴더가 이미 있으면 건드리지 않음(빈 폴더 포함), 한 번 확인한 폴더는 지워도 되살리지 않음, 폴더별 기록, 경로 키(윈도 대소문자), 망가진 기록 목록, 워크스페이스 열기 연결(소스 점검) | 실제 임시 폴더 |
| `tests/lib/newDocShortcut.test.js` | Ctrl+N 새 문서: 키 판별(Cmd·한글 자판·Shift/Alt/조합 중 제외), 만들 폴더 결정(윈도·슬래시 경로, 열린 문서 없음·이상한 경로는 작업 폴더), App 연결(모달 중 무시·사이드바와 같은 handleCreateDoc) | 순수 함수·소스 점검 |
| `tests/lib/numpadEnter.test.js`, `tests/components/editorBrKey.test.js` | 문서 편집기 숫자패드 Enter -> [br]: 키 판단(조합키 제외), 연결·처리 순서(링크·목록 이어쓰기 앞, 추천 팝업 뒤, 한글 조합 제외, replaceRange) | 순수 함수·소스 점검 |
| `tests/lib/tableInsertAfter.test.js`, `tests/components/structureInsertAfter.test.js`, `tests/lib/cellText.test.js` | 행·열 `+` 단추: 끼울 자리 계산(병합 뒤로 미룸)과 동작(그 행 아래·열 오른쪽, 포커스 대상), 넓은 칸의 줄바꿈 <-> `[br]` 변환(왕복·\r\n·대문자 제외) | 순수 함수 |
| `tests/lib/tableWidest.test.js`, `tests/components/widestWidthWiring.test.js` | 열 너비 "가장 긴 칸 기준": 잴 칸 고르기(빈 칸·병합·가로 합친 칸 제외, 굵은 칸, 줄바꿈), 가장 넓은 칸 찾기(올림·동률·없음), 화면 연결(소스 점검) | 순수 함수·소스 점검 |
| `tests/lib/editorHeading.test.js`, `tests/electron/headingSetting.test.js` | 편집 모드 제목 줄 판단(코드블록 안 제외·닫히지 않은 블록·4백틱·`==# #==`·윈도 줄바꿈), 설정 메뉴 "제목 강조"(체크 항목·기본 켜짐·클릭 알림), 스토어의 `headingHighlight`, 메인·편집기 연결 소스 점검 | 순수 함수·소스 점검 |
| `tests/lib/sectionFold.test.js`, `tests/lib/sectionFoldDom.test.js`, `tests/lib/wikiParserFold.test.js`, `tests/components/viewerFold.test.js` | 뷰어 문단 접기: 제목과 내용을 구역으로 묶는 규칙(같은 급·하위·건너뛴 급·내용 없음), DOM 규칙(접기·링크 제외·숨은 제목 펴기·기억한 상태 입히기), 제목 문법(`==# #==`·# 가 글자인 경우·`[편집]` 위치·각주·목차), 화면 연결(소스 점검) | 순수 함수·소스 점검 |
| `tests/lib/tableJump.test.js` | 표 편집기 F2/Ctrl+Enter 오가기: 키 판별(F2·Ctrl/Cmd+Enter, 다른 조합 제외), 갈 곳(칸 -> 큰 입력칸 -> 기억한 칸, 여러 칸 선택 때 없음, 왕복) | 순수 함수 |
| `tests/lib/tableInline.test.js` | 표 편집기 Ctrl+B/Ctrl+U: 고른 글자 감싸기·벗기기(바깥 표시·표시까지 고른 경우·한쪽만 있을 때·다른 표시), 고르지 않았을 때(null·insertEmpty), 범위 밖 값 | 순수 함수 |
| `tests/lib/tableEditorHelp.test.js` | 도움말 데이터 모양(주제·항목·길이)과 꼭 있어야 할 내용(단축키·적용·닫기), 작은 안내 제거·팝업 연결·글씨 크기 소스 점검 | 순수 함수 · 소스 검사 |
| `tests/components/tableEditorModal.test.js` | 표 편집기 창 구조: 적용이 헤더에 있고 취소·아래 단추 줄이 없음, 바깥 더블클릭으로만 닫힘(안쪽 더블클릭은 안 닫힘), 고정 헤더(sticky), Ctrl+B/U 연결 | 소스 검사 |
` 과 구별), 모두 바꾸기를 한 번의 편집으로(큰 문서 포함), 입력칸 키 규칙(Enter·Shift+Enter·Ctrl+Enter·F3·Esc·한글 조합), 위치 -> 줄·칸, 표시 유효성 + 연결 소스 점검(포커스를 옮기지 않기, 바꾼 뒤 포커스 복원) | 순수 함수 · 소스 검사 |
| `tests/store/monoFont.test.js` | 고른 글꼴의 저장·복원(안전하지 않은 값은 기본으로, 기본을 고르면 저장 삭제) | 스토어(가짜 저장소) |
| `tests/lib/horizontalWheel.test.js` | 툴바 위 휠 → 좌우 스크롤 계산(끝에서 멈춤, 넘치지 않으면 무시, Ctrl+휠·가로 입력 제외) | 순수 함수 |
| `tests/lib/snippetMatch.test.js` | 상용구 정확 일치(대소문자 구분)와 추천 팝업(대소문자 무시, 같은 대소문자 우선, 다 친 글자와 같은 후보 제외, `NOT NULL` 뒤 `NULLIF` 제외, 순서 목록 `rank` 정렬, 코드블록에서 단어 중간부터는 찾지 않기), 코드블록 안 Enter 규칙 | 순수 함수 |
| `tests/lib/snippetOrder.test.js` | 폴더의 순서 목록 파일(`_순서.txt`) 해석(빈 줄·# 설명 건너뛰기, CRLF·BOM, 중복, 대소문자) | 순수 함수 |
| `tests/electron/snippetOrders.test.js` | 메인이 폴더별 순서 목록 파일을 읽어 주는지(없는 폴더, 상용구로 안 섞임) | **진짜 디스크**(임시 폴더) |
| `tests/store/snippetOrder.test.js` | 순서 목록이 상용구 후보의 순서(rank)로 붙고 추천에서 SELECT 가 SET 보다 위로 오는지 | mockApi |
| `tests/scripts/snippetPack.test.js` | SQL 키워드 묶음 데이터(중복·파일 이름 글자·대문자·개수)와 설치(전부 만들기, 미리보기는 아무것도 안 씀, 두 번 실행해도 안전, 기존 상용구 덮어쓰지 않음, 대소문자만 다른 폴더) | **진짜 디스크**(임시 폴더) |
| `tests/scripts/packageIgnore.test.js` | 배포 빌드 규칙: 뺄 파일·넣을 파일, node_modules 에서 메인 프로세스가 쓰는 모듈만 남기기(의존 따라가기·순환·선택 의존·범위 모듈·새 의존 누락 방지), 빌드 뒤 app.asar 점검(필요한 파일·넣지 않기로 한 파일·빈 폴더 껍데기), 라이선스·고지·글꼴 복사 | **진짜 디스크**(임시 폴더) · 순수 함수 · 소스 검사 |
| `tests/electron/snippetCase.test.js` | `MYSQL`/`mysql` 처럼 대소문자만 다른 상용구가 서로 덮어쓰지 않는지, 인코딩된 파일 이름 복원 | **진짜 디스크**(Windows 에서만 충돌이 재현됨) |
| `tests/lib/codeCopy.test.js` | 복사 버튼 동작(본문 읽기, "복사됨" 표시와 되돌리기, 실패 표시, 클립보드가 응답 없을 때 옛 방식으로 전환) | 가짜 버튼·가짜 클립보드 |
| `tests/lib/snippetShortcuts.test.js` | 상용구 단축키 판별(Alt+T / Alt+Shift+T, 한글 입력 상태, Ctrl 조합 제외) | 순수 함수 |
| `tests/lib/snippetScope.test.js` | 상용구 활성 폴더 범위 선별, 모달을 닫은 뒤의 활성 폴더 | 순수 함수 |
| `tests/store/modals.test.js` | 상용구·사전 모달 열림 상태와 선택 글자 미리 채우기, 추천 팝업 토글, 닫으면 '전체'로 복귀(켜짐/꺼짐) | mockApi |
| `tests/electron/fileSystem.test.js` | 문서·폴더 이동, 이름 변경, 새 문서 기본 틀, 사이드바 트리 읽기, 상용구 단축어 파일 이름(`*` 등 못 쓰는 글자) | **진짜 디스크**(임시 폴더를 만들고 끝나면 지움) |
| `tests/electron/fileNameChars.test.js` | 못 쓰는 글자 9개의 전각 변환·왕복·제어 문자, 문서·폴더·분류·틀·자료·상용구 카테고리·이미지의 저장과 읽기(분류 계층 `/` 유지), 화면 쪽 연결 소스 점검 | **진짜 디스크**(임시 폴더) · 순수 함수 · 소스 검사 |
| `tests/store/fileOperations.test.js` | 작품 폴더 스캐폴드, 주인공 폴더 ↔ `00` 문서 연동, 분류 태그 갱신, 폴더 이동, 삭제 | mockApi |
| `tests/store/tabs.test.js` | 탭 열기·닫기, 전환 시 저장 안 된 입력 보존, 폴더 이동·이름 변경 시 탭 경로 갱신 | mockApi |

일부러 **다루지 않는 것**: 화면 모양·레이아웃(제목 강조 배경 같은 것), Electron 창·단축키·작업 표시줄. 이런 건 실제 브라우저/exe가 필요해서 지금처럼 직접
써 보며 확인한다.

## 알려진 한계를 적어 둔 테스트

`it.todo(...)`로 적힌 항목은 "아직 안 되는 것"이다. 현재 1개 — 작품 경계를 넘어 폴더를 옮길 때 예전 작품 전체를 가리키던 상위 분류 태그가 안 바뀌는 문제
(CHANGELOG 0.64.0의 알려진 한계). 고치면 `todo`를 진짜 테스트로 바꾼다.

## 테스트를 쓰는 규칙

- **버그를 고칠 때**: 그 버그를 재현하는 테스트를 하나 추가한다(고치기 전엔 실패, 고친 뒤엔 통과).
- **동작이 의도적으로 바뀔 때**: 해당 테스트의 기대값도 같이 바꾼다.
- 테스트 파일은 반드시 최상위 `tests/` 아래에 둔다. `src/`·`electron/` 옆에 두면 exe(asar)에 같이 들어간다(`scripts/package-win.js`가 `/tests`를 제외하긴 한다).
- 스토어 테스트는 매번 모듈을 새로 불러와서(`tests/helpers/store.js`의 `freshStore`) 앞 테스트의 폴더·탭이 섞이지 않게 한다.

## 이 테스트가 실제로 버그를 잡는지 확인한 방법

테스트가 "통과한다"만으로는 의미가 없어서, 과거 버그 코드를 일부러 되살려 테스트가 실패하는지 확인했다. 각주 `[br]` 정규식을 옛 형태로 되돌리면 각주 테스트 2개가,
`rewriteTabPath`에서 폴더 안 탭 처리를 빼면 탭 경로 테스트가 정확히 실패했다.
