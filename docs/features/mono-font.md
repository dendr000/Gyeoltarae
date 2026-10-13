# 편집·코드 글꼴 — D2Coding 포함과 글꼴 선택

## 한 줄 요약

편집 모드와 코드블록은 **D2Coding** 글꼴로 보인다. D2Coding 은 **앱에 글꼴 파일이 들어 있어서** 이 PC 에 설치돼 있지 않아도 한글이 영문 정확히 2칸 폭으로 보이고, 한글이 섞인 줄의 열이 맞는다. 헤더의 **"글꼴" 단추**에서 다른 고정폭 글꼴로 바꿀 수도 있다.

## 왜 필요한가

고정폭 글꼴이어도 **한글 글꼴이 영문 2칸 폭이 아니면** 한글이 하나 늘 때마다 뒷부분이 조금씩 밀려서 열이 어긋난다(`이름    나이` / `Kim     30`). D2Coding 은 한글이 영문 정확히 2칸이다([code-block.md](code-block.md) 의 "열 맞춤"). 0.91.0 에서 글꼴 목록 맨 앞에 D2Coding 을 두었지만 **설치돼 있지 않은 PC 에서는 효과가 없었다.** 이번에 글꼴 파일을 앱에 넣어서 어느 PC 에서나 같게 보이게 했다.

## 글꼴 포함 (번들)

- 파일: `src/assets/fonts/D2Coding-Ver1.3.2-20180524.ttf` — **수정하지 않은 원본**(Regular, 약 4.2MB).
- `src/index.css` 의 `@font-face` 가 **설치된 D2Coding(`local()`)을 먼저** 쓰고, 없으면 포함한 파일(`url()`)을 쓴다. 그래서 설치돼 있는 PC 는 예전과 똑같고(파일을 읽지 않음), 없는 PC 만 포함한 파일이 쓰인다.
- **굵은 글씨(Bold)** 는 설치된 `D2Coding Bold` 가 있을 때만 진짜 굵은 글씨를 쓰고, 없으면 브라우저가 Regular 를 굵게 합성한다(Bold 파일 4.4MB 는 용량 때문에 넣지 않았다).
- **용량**: 저장소에 약 4.2MB 가 늘고(한 번 커밋하면 이력에 남는다), 앱(exe) 설치 폴더도 그만큼 커진다. 빌드하면 `dist/assets/D2Coding-Ver1.3.2-20180524-<해시>.ttf` 로 나간다.

### 라이선스 (OFL 1.1)

| 항목 | 내용 |
|---|---|
| 글꼴 | D2Coding 1.3.2 (Build 20180524) |
| 저작권 | Copyright (c) 2015-2016 NHN Corporation. Font designed by FONTRIX Inc. "D2Coding" 은 NHN Corporation 의 등록상표 |
| 라이선스 | **SIL Open Font License 1.1** — 소프트웨어에 포함해 배포할 수 있다. 조건: 저작권 표기와 라이선스를 함께 넣을 것, 글꼴을 따로 팔지 않을 것, 수정본은 같은 라이선스로 배포하고 원래 이름을 쓰지 않을 것 |
| 이 프로젝트에서 한 일 | **글꼴 파일을 수정하지 않았다**(바이트 단위로 원본과 같음). 부분 추출(서브셋)도 하지 않았다(수정에 해당해서 이름을 바꿔야 하므로) |
| 라이선스 전문 | `THIRD_PARTY_NOTICES.md`(앱에 같이 들어감)와 `src/assets/fonts/D2Coding-OFL.txt`. 글꼴 파일 자체의 name 정보에도 저작권·라이선스가 들어 있다 |

OFL 전문은 표준 문구를 옮겨 적은 것이다. 정확한 원문은 https://openfontlicense.org 에서 확인할 수 있다.

## 글꼴 선택

헤더 오른쪽의 **"글꼴" 단추**를 누르면 패널이 열린다.

- **목록에서 고르기**: D2Coding(기본, 앱에 포함), D2Coding ligature, 굴림체, 나눔고딕코딩, Cascadia Mono, Consolas, JetBrains Mono, Fira Code, Source Code Pro. 이 PC 에 **설치돼 있지 않은 글꼴은 "설치 안 됨"으로 표시되고 고를 수 없다**(고르면 기본 글꼴로 보이기만 하므로).
- **★ 표시**: 한글이 영문 2칸 폭이라 **한글이 섞인 줄의 열이 맞는** 글꼴(D2Coding, 굴림체, 나눔고딕코딩). 나머지 글꼴은 영문만 있는 줄은 맞고 한글이 섞이면 어긋날 수 있다.
- **직접 입력**: 목록에 없는 글꼴은 설치된 글꼴 이름을 그대로 적고 **적용**(Enter 도 됨). 설치돼 있지 않은 것 같으면 안내가 나온다(그래도 적용은 되지만 기본 글꼴로 보인다).
- **기본으로 돌아가기**: "D2Coding (기본)" 을 고른다.
- 패널 아래 **견본**(`Kim     30` / `이름    나이`)으로 지금 글꼴에서 열이 맞는지 눈으로 볼 수 있다.
- 바꾼 글꼴은 **이 PC 에 저장**되어 다음 실행에도 유지된다(`localStorage`).

### 글꼴 이름 검증

글꼴 이름은 화면 스타일(CSS)에 들어가므로 **영문·숫자·한글·공백·점·밑줄·하이픈만**, **최대 60자**를 받는다. 따옴표·세미콜론·괄호·중괄호·쉼표·슬래시·콜론이 든 이름은 거절한다(스타일이 깨지거나 엉뚱한 속성이 끼어드는 것을 막기 위해). 저장된 값이 이 규칙에 맞지 않으면 기본 글꼴로 읽는다.

### 고른 글꼴 뒤에 붙는 글꼴

고른 글꼴 뒤에는 항상 `D2Coding, ui-monospace, Consolas, monospace` 가 이어진다. 그래서 고른 글꼴에 없는 글자(예: Cascadia Mono 의 한글)는 D2Coding 으로 대신 그려진다. 이 경우 한글 폭이 영문과 어긋날 수 있다(★ 글꼴이 아닐 때).

### 설치 여부는 어떻게 아나

브라우저의 `document.fonts.check` 는 **없는 글꼴에도 true** 를 주므로 쓰지 않는다. 대신 견본 글자를 `'글꼴', monospace` 와 `'글꼴', serif` 로 각각 재서(canvas) **일반 글꼴과 폭이 다르면 설치된 것**으로 본다. 설치된 글꼴이 우연히 기본 고정폭과 폭이 같을 수 있어서(Consolas 가 기본 고정폭인 PC) serif 와도 비교한다.

## 용어 설명 (초보자용)

| 용어 | 뜻 |
|---|---|
| **고정폭 글꼴** | 모든 글자가 같은 폭인 글꼴. 코드와 표의 열을 맞출 때 쓴다. |
| **번들(bundle)** | 글꼴 같은 파일을 앱 안에 함께 넣어 배포하는 것. |
| **OFL** | SIL Open Font License. 글꼴을 자유롭게 쓰고 앱에 포함해 배포할 수 있게 하는 대표적인 글꼴 라이선스. |
| **서브셋** | 글꼴에서 필요한 글자만 남기고 줄이는 것. 글꼴을 고치는 일이라 OFL 에서는 원래 이름을 쓸 수 없다. |
| **리가처(ligature)** | `->` 를 `→` 처럼 이어서 그려 주는 글꼴 기능. D2Coding ligature 가 이 버전이다. |

## 구현 위치

- `src/index.css` — `@font-face`(local 우선, 파일 대체)와 `--mono`(기본 목록).
- `src/assets/fonts/` — 글꼴 파일, `D2Coding-OFL.txt`. `THIRD_PARTY_NOTICES.md` — 고지와 라이선스 전문.
- `src/lib/monoFont.js` — 이름 검증(`sanitizeFontFamily`), 글꼴 목록 만들기(`buildMonoStack`), 설치 판별(`isFontInstalled`), 선택지(`MONO_FONT_CHOICES`).
- `src/store/useAppStore.js` — `monoFont` 와 `setMonoFont`(저장·복원). `src/App.jsx` — 고른 글꼴을 `--mono` 에 적용. `src/components/FontSettings.jsx` — 헤더 단추와 패널.
- 테스트: `tests/lib/monoFont.test.js`(검증·목록·설치 판별), `tests/store/monoFont.test.js`(저장·복원), `tests/components/monoFont.test.js`(번들 글꼴 파일·라이선스 문구·`@font-face` 가 규정대로 있는지).

## 한계

- 글꼴 크기·줄 간격은 바꿀 수 없다(글꼴 종류만 고른다).
- Bold·Italic 파일은 넣지 않았다(Bold 는 설치된 것만 쓰고 없으면 합성).
- 목록에 있어도 이 PC 에 설치돼 있지 않으면 고를 수 없다. 글꼴 설치는 Windows 에서 해야 한다.
- 실제 Electron 앱 창이 아니라 브라우저 미리보기에서 확인했다(번들 파일은 설치된 글꼴을 쓰지 않고 파일만으로 불러 영문 7px·한글 14px 을 확인).
