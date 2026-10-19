# 언어 상용구 묶음 (C++, Java, HTML, Python 등 16개)

## 한 줄 요약

C++·Java·HTML·Python 같은 프로그래밍 언어마다 **폴더 하나**를 만들고, 그 언어의 키워드·표준 라이브러리 이름(단어)과 `for` 반복문·`main` 함수 같은 **자주 쓰는 틀**을 잔뜩 채워 주는 묶음이다. 폴더 이름이 코드블록의 언어 이름(` ```C++ `, ` ```Java ` 등)과 같고, **그 언어의 코드블록 안에서만** 추천 팝업과 자동 치환에 쓰인다.

## 설치

```bash
node scripts/install-snippet-pack.mjs langs --dry-run     # 미리보기 (아무것도 만들지 않고 개수만 보여 줌)
node scripts/install-snippet-pack.mjs langs               # 16개 언어 전부 설치
node scripts/install-snippet-pack.mjs cpp                 # 언어 하나만 (cpp c java html css python javascript typescript csharp go kotlin rust swift php ruby bash)
node scripts/install-snippet-pack.mjs langs --workspace D:\WikiDesk
```

- 워크스페이스를 안 적으면 앱이 마지막으로 연 워크스페이스를 쓴다. 이미 있는 상용구는 덮어쓰지 않고 건너뛰므로 여러 번 실행해도 안전하다(`snippet-packs.md` 와 같은 규칙).
- 폴더마다 추천 순서 파일 `_순서.txt` 도 만든다(자주 쓰는 키워드를 위로, 언어마다 약 100~130개). 이미 있으면 덮어쓰지 않는다. 묶음의 순서가 늘어난 뒤에 이미 만든 파일을 최신으로 맞추려면 `--merge-order` 를 붙인다 — 파일에 **없는 제목만 맨 뒤에 덧붙이고** 사용자가 고친 줄과 순서는 건드리지 않는다.
- 앱을 새 버전으로 먼저 바꾼 다음 설치한다. 옛 버전은 "언어 폴더는 그 언어 코드블록에서만" 규칙을 몰라서 글에서도 `for`, `class` 같은 단어가 추천 팝업에 뜬다.

## 들어 있는 언어

| 폴더 | 코드블록에 쓰는 이름 | 항목 수(단어 + 틀) | 들어 있는 것 |
|---|---|---|---|
| `C++` | `C++`, `cpp` | 489 | 키워드, 전처리기, 헤더 이름, `std` 라이브러리, 틀 68 |
| `C` | `C` | 308 | 키워드, 전처리기, 헤더, 표준 함수, 틀 47 |
| `Java` | `Java`, `자바` | 471 | 키워드, `java.util` 등 표준 클래스·메서드, 어노테이션, 틀 61 |
| `HTML` | `HTML`, `htm` | 370 | 태그, 속성, 속성 값, 특수 문자(`&nbsp;`), 틀 73 |
| `CSS` | `CSS` | 386 | 속성, 값, 함수, 가상 클래스·요소, `@규칙`, 틀 44 |
| `Python` | `Python`, `py`, `파이썬` | 456 | 키워드, 내장 함수, 예외, 특수 메서드, 표준 모듈, 틀 75 |
| `JavaScript` | `JavaScript`, `js` | 415 | 키워드, 내장 객체, 배열·문자열·DOM 메서드, Node.js, 틀 69 |
| `TypeScript` | `TypeScript`, `ts` | 270 | 타입 문법, 유틸리티 타입, 데코레이터, 틀 48 |
| `C#` | `C#`, `csharp`, `cs` | 408 | 키워드, .NET 기본 클래스, LINQ, 틀 72 |
| `Go` | `Go`, `golang` | 304 | 키워드, 내장 함수, 표준 패키지, 틀 65 |
| `Kotlin` | `Kotlin`, `kt` | 408 | 키워드, 컬렉션·코루틴, 안드로이드·Compose 이름, 틀 75 |
| `Rust` | `Rust`, `rs` | 390 | 키워드, 표준 타입·메서드, 매크로(`println!`), 어트리뷰트, 틀 73 |
| `Swift` | `Swift` | 415 | 키워드, Foundation·SwiftUI·UIKit 이름, 틀 91 |
| `PHP` | `PHP` | 428 | 키워드, 내장 함수, 슈퍼글로벌, PDO·Laravel, 틀 75 |
| `Ruby` | `Ruby`, `rb` | 409 | 키워드, 내장 메서드, Rails, 틀 72 |
| `Bash` | `Bash`, `sh`, `shell` | 335 | 키워드, 리눅스 명령, 특수 변수(`$1`, `$@`), 틀 74 |

합계 6262개. 이 PC 의 `D:\WikiDesk` 에는 16개 폴더 전부를 설치했다(설치에 1분 반쯤 걸린다). 단어·틀의 전체 목록은 `scripts/snippet-packs/lang/<언어>.js`.

## 두 종류의 항목

| 종류 | 설명 | 예 |
|---|---|---|
| **단어** | 제목과 본문이 같다. 앞부분만 쳐도 추천 팝업에 떠서 Tab 으로 확정한다. 본문이 제목과 같아서 스페이스바 자동 치환이 켜져 있어도 바뀌는 게 없다. | `names` → `namespace`, `Arr` → `ArrayList` |
| **틀** | 짧은 줄임말이 여러 줄 코드로 펼쳐진다. 본문의 `{#}` 가 펼친 뒤 커서 자리다. | `fori` → `for (int i = 0; i < |; i++) { ... }` |

### 틀 줄임말의 규칙

틀의 줄임말은 **코드에서 따로 칠 일이 없는 글자**로 정했다. 스페이스바 자동 치환은 줄 끝이 단축어와 같고 스페이스를 누르면 펼쳐지는데, 줄임말이 `for` 나 `class` 같은 키워드라면 코드를 치다가 `for ` 만 쳐도 틀이 펼쳐져 버리기 때문이다(그래서 묶음을 만들 때 틀 제목이 단어와 같으면 오류로 막는다). 언어 안에서 줄임말이 겹치지 않게 접두어를 쓰는 언어도 있다.

| 언어 | 줄임말 예 |
|---|---|
| C++ | `cppbase`(iostream + main), `fori`, `forrange`, `uptr`, `sortcmp`, `lambda`, `trycatch`, `tmplfn` |
| Java | `jmain`, `psvm`, `sout`, `fori`, `fore`, `jclass`, `jrecord`, `jstream`, `jjdbc`, `jctrl`(Spring) |
| HTML | `html5`(문서 뼈대), `linkcss`, `scriptsrc`, `divc`, `aex`(새 창 링크), `ula`, `tablea`, `formpost`, `inputt` |
| Python | `ifmain`, `mainfn`, `forr`, `fore`, `deff`, `clsp`, `dcls`, `tryex`, `withopen`, `lcomp`, `argp`, `reqget` |
| JavaScript | `clg`(console.log), `arrowf`, `fori`, `forof`, `fetchj`, `qs`, `addel`, `trycatch`, `exprs`(Express) |
| Go | `gomain`, `iferr`, `fori`, `forr`, `gofunc`, `wgrp`, `httph`, `testf` |
| Rust | `rsmain`, `pln`, `fori`, `matchr`, `implr`, `structr`, `modtest` |
| Swift | `sw` 로 시작: `swprint`, `swfunc`, `swfori`, `swview`, `swapp`, `swvstack` |
| Ruby | `rb` 로 시작: `rbdef`, `rbclass`, `rbeach`, `rbcase`, `rbspec` |
| Bash | `sh` 로 시작: `shbang`, `shsafe`, `shif`, `shfor`, `shcase`, `shgetopts`, `shtrap` |

## 어디서 쓰이나 — 언어 폴더 규칙

폴더 이름이 **언어 이름**이면(`C++`, `Java`, `Python` … 그리고 기존 `SQL`) 그 폴더의 상용구는 **그 언어의 코드블록 안에서만** 쓰인다. 영어 단어가 많은 언어 폴더가 글(문단)에 끼어들지 않게 하려는 것이다.

| 커서 위치 | 쓰이는 상용구 |
|---|---|
| 글(코드블록 밖) | 언어 폴더가 **아닌** 폴더(`공통`, `영어` 등)만 |
| ` ```Java ` 블록 | `Java` 폴더 + 언어 폴더가 아닌 폴더 |
| ` ```MySQL `·` ```Oracle ` 블록 | `SQL` 폴더 + 언어 폴더가 아닌 폴더 (같은 SQL 문법이므로) |
| ` ```JS ` 블록 | `JavaScript` 폴더 + 언어 폴더가 아닌 폴더 |
| 모르는 언어(` ```Foobar `)·언어를 안 적은 ` ``` ` 블록 | 언어 폴더가 아닌 폴더만 |

- 추천 팝업, 스페이스바 자동 치환, Alt+Enter 가 모두 같은 규칙이다. 툴바 "상용구 삽입" 목록은 이 규칙과 무관하게 항상 전체를 보여 준다.
- 코드블록 안에서 후보 순서는 **그 언어의 폴더 → 언어와 상관없는 폴더 → 다른 언어 폴더** 순이다(규칙은 이미 걸러져 있으므로 실제로는 앞의 둘). 그 안에서는 **`_순서.txt` 에 적은 것(자주 쓰는 순) → 단어 → 틀 줄임말 → 나머지(짧은 이름 순)** 로 나온다.

### 후보 순서와 "다 친 단어"

- **다 친 단어도 맨 위에 보인다.** 코드블록에서 `int` 를 끝까지 치면 `int` 가 후보 맨 위에 있고 그 아래에 `int8_t`, `int16_t` … 가 따라온다(Tab 으로 확정해도 글자는 그대로 `int`). 예전에는 "확정해도 바뀌는 게 없는 후보"라서 빼 버려서 `int8_t` 만 보였고 `int` 가 없는 것처럼 보였다. 다른 언어도 똑같다(`if`, `for`, `def`, `public` 등 모두). 후보가 그 단어 하나뿐이면 팝업은 뜨지 않는다. 글(코드블록 밖)에서는 예전과 같다.
- **키워드가 틀 줄임말보다 위에 온다.** `in` 까지만 쳐도 `int`, `inline` 이 `incio`, `incvec` 같은 짧은 줄임말보다 먼저 뜬다. 틀 줄임말을 `_순서.txt` 에 적어 두면 그 위치로 올라간다.
- **자주 쓰는 키워드가 위에 있다.** 언어마다 100~130개를 자주 쓰는 순으로 `_순서.txt` 에 적어 두었다. 예: C++ 에서 `i` → `int`, `if`, `inline`, `p` → `public`, `private`, `pair`; Python 에서 `pr` → `print`, `property`. 순서가 마음에 안 들면 폴더의 `_순서.txt` 에서 줄을 위아래로 옮기거나 추가한다(한 줄에 제목 하나, 대소문자까지 똑같이).
- 이 규칙은 폴더 이름으로 정한다. **언어 이름이 아닌 이름**(`C++ 메모`, `자바 정리`)의 폴더는 예전처럼 어디서나 쓰인다.
- 앱의 "폴더별 사용"(`snippet-folder-toggle.md`) 체크와는 별개이며 둘 다 통과해야 쓰인다.

## 코드블록 색(뷰어 모드)

문서에 ` ```C++ ` 처럼 언어 이름을 적으면 뷰어에서 VS Code 처럼 색이 입혀진다(`code-block.md`). 16개 언어 모두 같은 이름으로 칠해지는지 확인했다.

- 이름은 대소문자·`-`·`_`·`.`·`/` 를 무시하고 별명도 받는다: `C++`/`cpp`/`CPP`/`hpp`/`C/C++`, `Java`/`JAVA`/`자바`, `HTML`/`htm`/`XHTML`, `Python`/`py`/`파이썬`, `JS`/`mjs`, `TS`, `C#`/`cs`/`dotnet`, `kt`, `rs`, `sh`/`shell` 등.
- HTML 코드블록 안의 `<style>` 은 CSS 로, `<script>` 는 자바스크립트로 따로 칠한다.
- 색이 구분되는 것: 키워드, 문자열, 숫자, 주석(기울임), 함수·클래스 이름, 자료형, 어트리뷰트·전처리기(`#include`).
- 이번에 조정한 색: HTML 의 **속성 이름**(`href`)은 태그 이름과 다른 색, CSS 의 **속성**(`color:`)은 선택자와 다른 색, `this`/`self` 같은 언어 예약 변수는 키워드 색.
- 한계: highlight.js 문법표를 쓰므로 VS Code 의 의미 기반 색(변수 종류별 색 등)까지는 아니다. 라이트·다크 모드 모두 확인했다.

## 용어 설명 (초보자용)

| 용어 | 뜻 |
|---|---|
| **상용구** | 짧은 이름(단축어)을 치면 정해 둔 글로 바꿔 주는 기능 |
| **틀(template)** | 여러 줄짜리 코드 조각. 줄임말 하나로 펼친다. |
| **`{#}`** | 틀을 펼친 뒤 커서가 서는 자리 표시 |
| **문법표(grammar)** | 어떤 글자가 키워드이고 문자열인지 알려 주는 색칠 규칙. 언어마다 다르다. |
| **코드블록** | ` ``` ` 로 감싼 부분. 첫 줄에 언어 이름을 적는다. |

## 사이드바·모달이 느려지지 않게

수천 개를 설치해도 화면이 느려지지 않도록 두 가지를 했다.

- 상용구 **사이드바**: 항목이 40개를 넘는 폴더는 처음에 접혀 있고, 폴더 이름 줄(옆에 개수 표시)을 눌러 펼친다. 한 번 누른 폴더는 이 화면을 연 동안 기억한다.
- 상용구 **모달 목록**: 한 번에 300줄까지만 그린다. 더 있으면 "N개 중 앞의 300개만 보입니다"가 뜨니 폴더를 고르거나 검색한다.

## 구현 위치

- `scripts/snippet-packs/lang/*.js`(언어별 단어·틀), `lang/common.js`(`words`, `t`, `languagePack` — 틀 제목 중복·단어와 같은 틀 제목은 오류), `scripts/snippet-packs/langs.js`(16개 모음), `scripts/install-snippet-pack.mjs`(`langs`·언어 이름 설치).
- `src/lib/snippetLanguage.js` — 언어 폴더 규칙(`folderGrammar`, `snippetContextAt`, `scopeSnippetsToContext`). `src/lib/snippetMatch.js` — 코드블록 언어 폴더를 위로(`grammar` 옵션). `src/components/EditorPane.jsx` — 위 함수를 부르는 연결부.
- `src/lib/codeHighlight.js`(언어 이름·별명), `src/App.css`(`.wiki-code .hljs-*` 색).
- 테스트: `tests/scripts/langPacks.test.js`(데이터 규칙 160여 개·설치), `tests/lib/snippetLanguage.test.js`, `tests/lib/codeHighlight.test.js`(언어별 색).

## 알려진 한계

- **줄임말은 외워야 한다.** 추천 팝업에는 제목(줄임말)만 보이고 본문 미리보기는 없다. 목록은 이 문서와 `scripts/snippet-packs/lang/*.js`, 앱의 상용구 모달(폴더를 고르면 본문이 보인다)에서 볼 수 있다.
- 항목이 많아서 한 언어에서 한두 글자만 쳐도 후보가 많다(팝업은 8개까지). 자주 쓰는 것을 위로 올리려면 폴더의 `_순서.txt` 에 한 줄씩 적는다. "자주 쓰는 순"은 제가 정한 목록이지 쓴 횟수를 세어 정한 것이 아니다(사용 빈도를 학습하지는 않는다).
- 다 친 단어가 후보에 남기 때문에 Tab 을 누르면 글자가 그대로이고 팝업만 닫힌다. 후보를 건너뛰려면 계속 치거나 Esc 를 누른다.
- 단어와 틀은 제가 정한 목록이다(해당 언어의 공식 전체 목록은 아니다). 빠진 것은 상용구 모달에서 추가하거나 `lang/*.js` 에 적고 다시 설치한다.
- `-`, `|`, `[`, `(` 처럼 코드에서 늘 치는 글자로 시작하는 제목(`--help`, `||`, `[Serializable]`)은 일부러 뺐다. 칠 때마다 팝업이 뜨기 때문이다.
- Windows 파일 이름에 못 쓰는 글자가 든 제목(`#[derive(Debug)]`, `println!`, `text/css`)은 앱이 `%XX` 로 바꿔 저장한다. 탐색기에서는 이름이 낯설게 보여도 앱 화면에는 제목 그대로 보인다.
- 이 묶음을 지우려면 상용구 모달에서 항목을 지우거나 탐색기에서 `.wikidesk-snippets\<언어 폴더>` 를 삭제한다.
