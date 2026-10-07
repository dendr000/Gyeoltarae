# 코드블록 (``` 문법) · 글자 강조 · 복사 버튼

## 한 줄 요약

문서에 ``` 로 감싼 줄을 쓰면 코드블록이 되고, 언어 이름(`MySQL`, `oracle`, `자바스크립트` 등)을 적으면 키워드·문자열·숫자·주석에 색이 입혀지며, 블록 윗줄 오른쪽의 **복사** 버튼으로 본문만 클립보드에 복사된다. 에디터에서 ``` 를 치면 닫는 ``` 줄이 자동으로 들어간다.

## 사용법

````text
```sql
CREATE TABLE mytable(
id INT PRIMARY KEY,
name VARCHAR(10)
);
```
````

- 여는 줄: 백틱 3개 + (선택) 언어 이름. 예: ` ``` `, ` ```sql `, ` ```MySQL `. 같은 줄에 다른 글자가 더 있으면(` ```코드``` `) 코드블록이 아니라 그냥 글자다.
- 닫는 줄: 백틱만 있는 줄(여는 줄과 같거나 더 많은 개수). 닫는 줄이 없으면 문서 끝까지가 코드블록이다.
- 안에 ``` 줄을 그대로 보여주고 싶으면 바깥을 백틱 4개로 연다. (이 문서의 위 예시처럼)
- 기존 `{{{ ... }}}` · `{{{#!syntax 언어}}}` 코드블록도 같은 모양이고 같은 복사 버튼·글자 강조가 적용된다.

### 에디터에서 쓸 때 (자동 닫기)

백틱을 세 번 치면(줄에 ``` 만 있게 되는 순간) 아래 줄에 닫는 ``` 가 같이 들어가고 커서는 첫 ``` 바로 뒤에 놓인다.

```text
(```를 침)        →   ```|        ← 커서
                      ```
(sql 입력, Enter) →   ```sql
                      |            ← 커서
                      ```
```

- 이미 열린 코드블록 **안에서** 치는 ``` 는 닫는 줄이므로 아무것도 더 넣지 않는다.
- 줄 앞에 다른 글자가 있거나(글 중간의 `` `코드` `` 같은 인라인 백틱), 커서 뒤에 같은 줄 글자가 더 있거나, 글자를 선택한 상태면 동작하지 않는다.
- 들여쓴 줄에서 치면 닫는 줄도 같은 들여쓰기로 들어간다.
- 되돌리기(Ctrl+Z) 한 번으로 세 번째 백틱과 자동으로 들어간 닫는 줄이 같이 취소되어 백틱 2개 상태로 돌아간다. (실제 키 입력으로 확인함)

### 코드블록 안에서는 상용구 추천이 자동으로 켜진다

````text
```MySQL
sel|     ← 여기서 추천 팝업이 뜬다 ("selx" 상용구 → SELECT * FROM ;)
```
````

- **언어 이름이 적힌 코드블록**(```MySQL, ```sql, ```자바스크립트, 모르는 이름이어도 이름이 있으면) 안에서는 "타이핑 중 추천 팝업" 설정이 꺼져 있어도 상용구 추천 팝업이 뜬다. 후보를 고르는 방법(방향키 + Tab/Enter)과 `{#}` 커서 자리는 평소 상용구와 같다.
- **블록 밖**으로 나오면 팝업은 다시 설정(툴바 "추천 팝업" 버튼, Alt+Shift+T)을 따른다 — 꺼져 있으면 꺼지고, 켜져 있으면 계속 켜진다.
- 언어가 **없는** ``` 블록(그냥 글자일 수 있음)과 여는 줄 자신(언어를 쓰는 중), 닫힌 뒤는 해당하지 않는다.
- 쓰이는 상용구는 평소와 같다(상용구 모달에서 고른 활성 폴더 범위 안에서). 스페이스바 자동 치환은 이 기능과 별개의 설정이라 그대로다.
- **내장 키워드 추천은 없다.** `SELECT`, `FROM` 같은 언어 키워드를 알아서 추천해 주는 게 아니라, **등록해 둔 상용구**만 추천한다. SQL 키워드 147개는 묶음으로 한꺼번에 만들어 둘 수 있다(`docs/features/snippet-packs.md`, `node scripts/install-snippet-pack.mjs sql`).
- **Enter 는 후보를 확정하지 않는다.** 코드블록 안에서 추천 팝업이 떠 있을 때 Enter 는 줄바꿈이다(`NOT NULL`+Enter 에서 `NULLIF` 가 확정되는 일을 막으려는 것). 후보는 **Tab** 으로 확정하거나, 방향키(↑↓)로 고른 뒤 Enter 로 확정한다. 코드블록 밖은 예전과 같다.
- 이미 친 글자와 똑같이 되는 후보는 뜨지 않는다(`SELECT` 를 대문자로 다 쳤으면 `SELECT` 후보는 없음).
- 코드블록 안에서는 **단어를 새로 시작하는 자리부터만** 후보를 찾는다. `NAME` 을 쳤을 때 끝의 `E` 로 `END` 등이 추천되던 문제를 막으려는 것이다(`user_name` 같은 이어진 글자의 중간에서도 안 뜸).
- 후보 순서는 폴더의 `_순서.txt` 로 정할 수 있다(`docs/features/snippet-packs.md` 의 "후보 순서").

## 글자 강조 (언어 이름)

언어 이름은 **대소문자를 구분하지 않고**, 한글 이름도 받는다. 같은 언어면 윗줄에는 항상 정식 이름이 보인다. (`MYSQL`, `mysql`, `MySQL` → 모두 "MySQL")

| 정식 이름 | 쓸 수 있는 이름 (예) | 칠하는 문법 |
|---|---|---|
| SQL | `sql` | 공통 SQL |
| MySQL | `mysql` | 공통 SQL |
| MariaDB | `mariadb`, `마리아디비` | 공통 SQL |
| MSSQL | `mssql`, `sqlserver`, `tsql` | 공통 SQL |
| Oracle | `oracle`, `오라클`, `plsql`, `PL/SQL` | 공통 SQL |
| SQLite | `sqlite` | 공통 SQL |
| PostgreSQL | `postgresql`, `postgres`, `psql` | PostgreSQL 전용 |
| MongoDB | `mongodb`, `mongo`, `몽고디비` | JavaScript |
| NoSQL | `nosql`, `No-SQL` | JavaScript |
| Java | `java`, `자바` | Java |
| JavaScript | `javascript`, `js`, `node`, `자바스크립트` | JavaScript |
| TypeScript | `typescript`, `ts`, `타입스크립트` | TypeScript |
| Python | `python`, `py`, `파이썬` | Python |
| C / C++ / C# | `c`, `c++`·`cpp`, `c#`·`csharp` | C / C++ / C# |
| Go, Kotlin, PHP, Ruby, Rust, Swift | `go`·`golang`, `kotlin`·`kt`, `php`, `ruby`·`rb`, `rust`·`rs`, `swift` | 각 언어 |
| HTML / XML / CSS / JSON / YAML / INI | `html`, `xml`, `css`, `json`, `yaml`·`yml`, `ini`·`toml` | 각 형식 |
| Bash / Dockerfile / Markdown / Diff | `bash`·`sh`·`shell`, `dockerfile`, `markdown`·`md`, `diff` | 각 형식 |

- 이름을 비교할 때 공백·하이픈·밑줄·점·슬래시는 무시한다. (`No-SQL` = `nosql`, `node.js` = `nodejs`, `PL/SQL` = `plsql`)
- **모르는 이름**(위 표에 없는 것)은 적은 그대로 윗줄에 보이고 색은 입히지 않는다. 언어를 안 적어도 색은 없다.
- 색은 라이트/다크 모드에 따라 자동으로 바뀐다. (색 값은 `src/index.css`의 `--hl-*` 한 곳에 있다)

### DBMS 별 차이의 한계

글자 강조 도구(highlight.js)에는 **PostgreSQL 전용 문법표만** 있고, MySQL·MariaDB·MSSQL·Oracle·SQLite 는 공통 SQL 문법표로 칠한다. 그래서 이 다섯은 키워드·문자열·숫자·주석 색이 서로 같고
"이 함수는 MySQL 에만 있다" 같은 구분은 없다. MongoDB 쉘과 NoSQL 질의는 자바스크립트 문법이라 JavaScript 로 칠한다(`No-SQL`을 무엇으로 칠할지는 정하기 나름이라 가장 흔한
MongoDB 식 질의에 맞췄다). DBMS 별로 더 정확히 칠하려면 문법표를 직접 만들거나 다른 도구가 필요하다.

## 동작

- **안의 글자는 그대로 보인다.** `= 제목 =`, `## 주석`, `||표||`, `[[링크]]`, `'''굵게'''` 같은 위키 문법도 해석하지 않는다. 제목으로 잡히지 않아 목차에도 안 나온다. HTML 은 이스케이프되어 실행되지 않는다.
- **복사 버튼**: 누르면 본문이 줄바꿈까지 그대로 복사되고, 버튼이 1.5초 동안 "복사됨"(체크 아이콘, 강조색)으로 바뀐다. 복사에 실패하면 "복사 실패"(빨간색)로 보인다.
- 복사하는 것은 화면에 보이는 글자가 아니라 원래 코드다. 색을 입혀도, `<>`, `&&` 같은 글자도 그대로 복사된다.
- 아이콘은 `src/assets/icons/copy.svg`, `check.svg` 를 CSS 마스크로 그려서 라이트/다크 모드 글자색을 따라간다.

## 용어 설명 (초보자용)

| 용어 | 뜻 |
|---|---|
| **코드블록** | 코드를 고정폭 글꼴로, 줄바꿈과 들여쓰기 그대로 보여 주는 상자. |
| **펜스(fence)** | 코드블록의 시작과 끝을 표시하는 ``` 줄. 울타리처럼 코드를 둘러싼다고 해서 붙은 이름. |
| **글자 강조(구문 강조, syntax highlighting)** | 코드의 키워드·문자열·숫자·주석을 서로 다른 색으로 칠해 읽기 쉽게 하는 것. |
| **문법표(grammar)** | 어떤 글자가 키워드이고 어떤 글자가 문자열인지 알려 주는 언어별 규칙. 강조 도구가 이걸 보고 칠한다. |
| **클립보드** | 복사한 내용이 잠시 담기는 곳. 복사 후 다른 곳에 붙여넣기(Ctrl+V)를 하면 여기서 꺼낸다. |
| **이스케이프** | `<` 같은 글자가 HTML 태그로 해석되지 않고 글자 그대로 보이게 바꾸는 처리. |

## 구현 위치

- `src/lib/codeFence.js` — ``` 줄 감지(`matchCodeFenceOpen`, `isCodeFenceClose`, `openCodeFenceAt`, `isInsideCodeFence`), 에디터 자동 닫기 계산(`fenceAutoCloseEdit`), 언어 코드블록 안인지 판단(`isInLanguageCodeFenceAt`). 뷰어와 에디터가 같은 규칙을 쓰도록 한 곳에 둠.
- `src/lib/codeHighlight.js` — 언어 이름 해석(`resolveCodeLanguage`)과 색 입히기(`highlightCode`, 같은 입력은 결과를 재사용). 쓸 언어만 highlight.js 에 등록해서 번들 크기를 줄임.
- `src/lib/wikiParser.js` — 코드블록 HTML(`renderCodeBlock`, ``` 와 `{{{ }}}` 공용), 표 행 병합 전처리에서 코드블록 안쪽을 건드리지 않게 하는 보호.
- `src/lib/codeCopy.js` — 복사 버튼 동작(클립보드 쓰기, "복사됨" 표시와 되돌리기).
- `src/components/EditorPane.jsx` — 백틱 키 처리(자동 닫기), 코드블록 안에서 상용구 추천 팝업 켜기(`updateSnippetSuggest`). `src/components/ViewerPane.jsx` — 복사 버튼 클릭 처리.
- `src/App.css`(`.wiki-code-wrap` 이하), `src/index.css`(`--hl-*` 색) — 스타일.
- 테스트: `tests/lib/codeBlock.test.js`, `codeFence.test.js`, `codeHighlight.test.js`, `codeCopy.test.js`.

## 클립보드 쓰기 방식

먼저 브라우저 표준 방식(`navigator.clipboard.writeText`)으로 복사한다. 이 방식이 거절되거나, 0.8초 안에 성공도 실패도 하지 않고 대기만 하면(권한 확인창이 뜨는 환경) 보이지 않는 입력칸을 선택해 복사하는 옛 방식(`execCommand('copy')`)으로 한 번 더 시도한다. 둘 다 안 되면 "복사 실패"를 보여 준다. 옛 방식을 쓸 때 편집기 등 쓰던 칸의 포커스는 되돌려 준다.

## 알려진 한계

- DBMS 별 전용 강조는 PostgreSQL 만 된다(위 "DBMS 별 차이의 한계").
- 코드블록 안의 `[[분류:이름]]` 줄은 문서 전체의 분류 지정으로 먼저 처리되어 코드 본문에서 빠지고 분류로 잡힌다. (실제로 확인함)
- 표 칸 안에서는 ``` 코드블록을 쓸 수 없다. 칸 안에 쓰면 코드블록이 되지 않고 글자 그대로 보인다. (실제로 확인함)
- 에디터의 자동 닫기는 백틱 3개 기준이다. 백틱 4개로 열려고 네 번째를 더 치면 자동으로 들어간 닫는 줄(백틱 3개)이 4개짜리 블록을 닫지 못하므로 직접 고쳐야 한다.
- 에디터에는 글자 강조가 없다(편집 화면은 원문 그대로, 색은 뷰어에서만).
