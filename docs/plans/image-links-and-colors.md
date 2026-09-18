# 이미지 클릭 링크 + 라이트/다크 듀얼 컬러 구현 계획

- 작성일: 2026-09-15
- 배경: 나무위키의 `틀:포켓몬스터/타입`을 그대로 재현할 수 있는지 물어봐서 확인해본 결과, WikiDesk는 위키링크 라벨 안에 또 다른 `[[...]]`/`{{{...}}}`를 못 넣는 구조라(정규식 한 겹 치환 방식) 그 틀 전체를 그대로 옮기는 건 불가능하다고 답변함. 대신 그 틀에서 실제로 필요한 기능만 골라서(이미지 클릭 링크, 라이트/다크 두 색 지정) WikiDesk 나름의 효율적인 방식으로 구현하기로 함 — 나무위키 문법을 그대로 따라갈 필요는 없음.
- **범위 확정** (사용자 지시): 이미지 클릭 링크는 반드시 필요함 / `[[파일:이름|width=30]]`처럼 `width=` 접두사 붙이는 문법은 그냥 미지원 상태 유지 / 라이트·다크 두 색 동시 지정 문법은 추가 / 문법 형태는 내가 편하고 효율적이라 판단하는 대로 설계 / 앞으로의 확장성을 고려한 구조로 설계.
- **진행 상황**: 구현 완료(0.44.0). 실제 동작은 README.md/CHANGELOG.md 참고. 아래 내용은 계획 당시 기록.

## 설계 원칙 — 재사용 가능한 코어 함수 두 벌

지금까지 `[[문서명]]` 위키링크와 `[[문서명#제목]]` 앵커 링크는 `applyInline`의 커다란 정규식 콜백 하나 안에 로직이 전부 들어있음(`src/lib/wikiParser.js` 250~295줄 근처). 이번에 "이미지도 링크가 될 수 있게" 만들려면 같은 "이름 → 문서/앵커 찾기 → missing/ambiguous/성공 셋 중 하나로 렌더링" 로직이 또 필요한데, 지금처럼 콜백 안에 박아두면 세 번째 복사본이 생김. 그래서 이번 기회에 이 로직을 두 개의 작은 함수로 뽑아낸다:

- **`resolveLinkTarget(rawTarget, docIndex)`** — 순수 판단 함수. `문서명`이나 `문서명#앵커`나 `#앵커`를 받아서 `{ type: 'doc', doc }` / `{ type: 'anchor', doc, anchorSlug }` / `{ type: 'same-doc-anchor', anchorSlug }` / `{ type: 'ambiguous', target, candidates }` / `{ type: 'missing', target }` 중 하나를 돌려줌. DOM이나 HTML을 전혀 모름.
- **`renderResolvedLink(resolved, innerHtml)`** — 위 결과를 받아서 실제 `<a class="wiki-link">`/`<a class="wiki-anchor-link">`/`<span class="wiki-link-missing">`/`<span class="wiki-link-ambiguous">` HTML을 만듦. `innerHtml` 자리에 일반 텍스트든 `<img>`든 뭐가 들어가도 상관없음 — 그래서 이미지 링크가 "완전히 새로운 렌더링 경로"가 아니라 "기존 링크 렌더러에 텍스트 대신 이미지를 끼워 넣는 것"이 됨.

이렇게 분리해두면:
1. 기존 `[[문서명]]`/`[[문서명#제목]]` 처리 부분은 `resolveLinkTarget` + `renderResolvedLink` 호출로 대체(동작은 100% 동일해야 함 — 순수 리팩터).
2. 새 이미지 링크 기능은 `renderImageBlock`에서 `resolveLinkTarget`/`renderResolvedLink`를 그대로 재사용.
3. **확장성**: 나중에 "자료 카드도 클릭하면 다른 문서로 링크되게" 같은 요청이 와도 이 두 함수를 그대로 갖다 쓰면 됨 — 매번 missing/ambiguous 처리를 새로 안 짜도 됨. ViewerPane.jsx의 클릭 핸들러(`handleWikiContentClick`)도 이미 클래스 이름(`.wiki-link`/`.wiki-anchor-link`/`.wiki-link-missing`/`.wiki-link-ambiguous`) 기준으로 동작하기 때문에 **이미지 링크를 위한 새 클릭 핸들러 코드가 전혀 필요 없음** — 같은 클래스를 재사용하는 것 자체가 확장성의 핵심.

## 기능 A — 이미지 클릭 링크

### 문법 (WikiDesk 자체 설계)

```
[[파일:이름|link=문서명]]
[[파일:이름|300px|link=문서명]]
[[파일:이름|link=문서명#제목]]
```

- `link=문서명` 파라미터를 `|`로 구분해서 추가. 기존 `|300px`(너비)와 순서 상관없이 같이 쓸 수 있음(`|300px|link=...` 또는 `|link=...|300px` 둘 다).
- `link=` 뒤에 `#제목`을 붙이면 앵커 이동도 됨(위에서 만든 `[[문서명#제목]]`과 동일한 대상 해석 사용).
- 나무위키처럼 링크 라벨 안에 이미지를 중첩시키는 게 아니라, 이미지 문법 자체에 "클릭하면 어디로 갈지"를 파라미터로 붙이는 방식 — 파서 구조를 안 바꿔도 되고, 기존 `[[파일:이름]]`/`[[파일:이름|너비]]` 문서는 전혀 영향 없음(하위 호환).
- 이미지가 없거나(`파일: 이름 없음`) 링크 대상이 없어도(`wiki-link-missing`) 각자 기존 방식대로 표시되고, 그 위에 링크 래핑만 추가됨.

### 구현 단계

1. `src/lib/wikiParser.js`: `resolveLinkTarget`/`renderResolvedLink` 추출 (위 설계 원칙 참고). 현재 253~295줄 근처의 위키링크 콜백을 이 두 함수 호출로 재작성 — **동작이 하나도 안 바뀌어야 하는 순수 리팩터**라서, 기존 1·2티어 테스트(같은 문서/다른 문서 앵커 이동, missing/ambiguous 표시)를 전부 다시 돌려서 회귀가 없는지 확인 필요.
2. `parseFileRefParams(paramsRaw)` 함수 추가 — `|`로 나눈 뒤 각 조각이 `link=...`면 링크로, 아니면(기존처럼) `safeLength`로 너비 파싱.
3. `renderImageBlock`에 `docIndex` 인자 추가, `link`가 있으면 `resolveLinkTarget` + `renderResolvedLink`로 감싸기. 호출부(`FILE_REF_LINE_RE` 매치 처리)도 `docIndex` 같이 넘기도록 수정.
4. CSS: 이미지가 링크로 감싸질 때 밑줄이 이미지 밑에 안 생기게 `.wiki-link:has(.wiki-image), .wiki-anchor-link:has(.wiki-image) { text-decoration: none; }` 정도만 추가하면 될 듯.

### 이번엔 안 하는 것 (사용자 확정)

- `width=30` 같은 접두사 문법은 그대로 미지원 유지 — `|300px` 형식만 계속 지원.
- 링크 라벨 안에 이미지+텍스트+그림자 스타일을 전부 중첩해서 넣는 나무위키 원본 그대로의 문법은 미지원 — 필요하면 `[[파일:이름|link=문서명]]` 옆에 `[[문서명]]` 텍스트 링크를 나란히 적는 식으로 우회.

## 기능 B — 라이트/다크 듀얼 컬러

### 문법 (나무위키와 같은 표기, 구현은 다름)

기존에 단일 색상을 받던 모든 자리(`<bgcolor=...>`, `<rowbgcolor=...>`, `<colbgcolor=...>`, `<tablebgcolor=...>`, `<tablebordercolor=...>`, `<tablecolor=...>`, `{{{#색상 텍스트}}}`, `{{{#!wiki style="color: ...; background: ...;"}}}` 전부)에 `색상1,색상2` 형태로 두 개를 적으면 라이트 모드에선 색상1, 다크 모드에선 색상2가 적용됨. 표기 자체는 나무위키 문법과 똑같이 comma 구분이라 낯설지 않지만, 내부적으로는 나무위키식 서버 렌더링이 아니라 **CSS 네이티브 `light-dark()` 함수**로 처리 — 브라우저가 알아서 지금 라이트/다크 모드에 맞는 값을 고르기 때문에 WikiDesk 쪽에 별도 다크모드 감지 JS 코드가 전혀 필요 없음(가장 "효율적인" 방식이라고 판단한 이유).

### 사전 조사에서 발견한 것 — `color-scheme` 버그(?)

`src/index.css`의 `:root`에 `color-scheme: light dark;`가 **항상** 걸려있는데, 앱 자체의 라이트/다크 수동 전환(`data-theme="light"`/`"dark"`, `useAppStore.js`의 `applyTheme`)은 CSS 변수(`--bg`, `--text` 등)만 바꿀 뿐 `color-scheme`은 안 건드림. `light-dark()`는 이 `color-scheme` 값만 보고 동작하기 때문에, 지금 상태로 `light-dark()`를 그냥 쓰면 **앱에서 수동으로 "다크"를 골라도 무시하고 OS 설정을 따라가 버림** — 사실상 지금 이 시점에 잠재된 사소한 버그를 이번에 같이 고치는 셈. `:root[data-theme='light'] { color-scheme: light; }` / `:root[data-theme='dark'] { color-scheme: dark; }`를 추가해서, 수동 선택 시엔 그 값만, "시스템" 선택 시엔(둘 다 없음) 기존처럼 OS를 따라가도록 고쳐야 `light-dark()`가 앱 설정과 일관되게 동작함.

### 구현 단계

1. `src/index.css`: 위 `color-scheme` 오버라이드 두 줄 추가.
2. `src/lib/wikiParser.js`:
   - 지금의 `safeColor` 본체를 `safeColorSingle`로 이름만 바꾸고, 새 `safeColor(value)`가 `withLightDark(value, safeColorSingle)`를 호출하도록 감싸기.
   - `withLightDark(value, validateSingle)` — 쉼표가 있으면 양쪽을 각각 `validateSingle`로 검증, 둘 다 통과해야 `light-dark(값1, 값2)`를 돌려줌(하나라도 실패하면 라이트 값만이라도 살리거나 완전히 버림 — 화이트리스트 방식 그대로 유지).
   - `sanitizeStyleValue`에도 같은 전처리 적용 — 값에 쉼표가 있으면 `withLightDark`를 먼저 시도하고, 실패하면(색상 쌍이 아니면, 예: 그라데이션의 `linear-gradient(to right, #fff, #000)`) 원래 값 그대로 기존 로직 통과 — 그라데이션이 오작동하지 않는지 반드시 테스트 필요.
   - `background`/`background-image` 전용 검증(`GRADIENT_FN_RE`/`PLAIN_COLOR_RE`)에 `light-dark(...)` 형태도 통과하도록 정규식 추가.
3. 문서화: README.md 표에 `bgcolor=색1,색2` 등 예시 추가, CHANGELOG 반영.

### 잠재 리스크

- 쉼표 두 개짜리 값이 우연히 "색상처럼 보이는" 다른 값과 겹칠 가능성은 거의 없음(`safeColorSingle`이 hex/색상이름만 통과시키므로 `linear-gradient(...)`나 `"Noto Sans", sans-serif` 같은 값은 애초에 검증 실패해서 안전하게 원래 값 유지).
- `light-dark()`는 최신 Chromium 기능인데, WikiDesk가 쓰는 Electron 44는 이미 훨씬 최신이라 문제없음.

## 파일별 영향 범위 요약

- `src/lib/wikiParser.js` — 가장 큰 변경: `resolveLinkTarget`/`renderResolvedLink` 신설, 기존 위키링크 콜백 리팩터, `safeColor`/`safeColorSingle`/`withLightDark`, `sanitizeStyleValue` 수정, `renderImageBlock`에 `link=` 지원 + `docIndex` 인자 추가.
- `src/index.css` — `color-scheme` 테마별 오버라이드 2줄.
- `src/App.css` — 이미지 링크 밑줄 제거 등 아주 소소한 CSS.
- `README.md`, `docs/CHANGELOG.md` — 문서화.
- **`src/components/ViewerPane.jsx`는 변경 불필요** — 위 설계 원칙대로 기존 클래스(`.wiki-link` 등)를 재사용하기 때문.

## 테스트 계획

1. 회귀 확인: 기존 `[[문서명]]`, `[[문서명|표시명]]`, `[[#제목]]`, `[[문서명#제목]]`, missing/ambiguous 케이스가 리팩터 후에도 전부 그대로 동작하는지.
2. 이미지 링크: `[[파일:등록된이미지|link=존재하는문서]]` 클릭 시 이동, `link=존재안하는문서`는 missing 스타일로 감싸지는지, `link=`에 `#제목` 붙였을 때 앵커까지 스크롤되는지.
3. 라이트/다크 컬러: `<bgcolor=#e56c3e,#1c1d1f>`가 적용된 표를 만들어두고, 시스템 다크모드 토글 및 앱 자체 라이트/다크 수동 전환 둘 다에서 색이 올바르게 바뀌는지(브라우저 프리뷰의 `resize_window`엔 `colorScheme` 옵션이 있어서 다크 강제 전환 테스트 가능).
4. `{{{#!wiki style="background: linear-gradient(...)"}}}` 등 기존 그라데이션 기능이 안 깨졌는지.

## 진행 순서 제안

1. `resolveLinkTarget`/`renderResolvedLink` 리팩터 (회귀 테스트까지 포함) — 이게 선행돼야 이미지 링크가 자연스럽게 얹힘.
2. 이미지 클릭 링크 (`link=`).
3. `color-scheme` 수정 + 라이트/다크 듀얼 컬러.

순서상 1→2를 먼저 묶어서 하나로, 3을 별도로 진행하는 걸 추천 — 서로 의존관계가 없어서 순서를 바꿔도 무방함.
