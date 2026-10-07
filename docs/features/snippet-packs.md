# 상용구 묶음 (SQL 키워드)

## 한 줄 요약

`SELECT`, `NULL`, `NOT NULL`, `PRIMARY KEY` 같은 SQL(MySQL) 키워드 147개를 **상용구 폴더 하나로 한꺼번에** 만들어 둔다. 코드블록 안에서 `sel` 까지만 치면 추천 팝업에 `SELECT` 가 뜨고, Tab 으로 확정하면 대문자 키워드가 들어간다.

## 설치

```bash
node scripts/install-snippet-pack.mjs sql --dry-run   # 미리보기: 아무것도 만들지 않고 개수만 보여 줌
node scripts/install-snippet-pack.mjs sql             # 설치
node scripts/install-snippet-pack.mjs sql --workspace D:\WikiDesk   # 워크스페이스를 직접 지정
```

- 워크스페이스를 안 적으면 **앱이 마지막으로 연 워크스페이스**(앱 설정 파일 `%APPDATA%\wikidesk\config.json` 의 `lastWorkspace`)를 쓴다.
- **이미 있는 상용구는 덮어쓰지 않는다.** 같은 폴더에 같은 제목이 있으면 건너뛰고, 그래서 여러 번 실행해도 안전하다(두 번째는 "새로 만듦 0개"). 다른 폴더의 상용구는 건드리지 않는다.
- 앱이 켜져 있어도 설치할 수 있다(앱이 폴더를 감시해서 목록에 나타난다).
- 키워드와 함께 **추천 순서 파일 `_순서.txt`** 도 만든다(아래 "후보 순서"). 이미 있으면 덮어쓰지 않는다.
- 이 PC의 `D:\WikiDesk` 에는 `.wikidesk-snippets\SQL\` 에 147개와 `_순서.txt` 를 설치했다(기존 14개는 하나도 바뀌지 않음을 설치 전후 비교로 확인).

## 쓰는 법

````text
```sql
sel|        ← 추천 팝업에 SELECT 가 뜬다 → Tab 으로 확정
FROM t WHERE x IS NOT NULL    ← NOT NULL 을 다 치면 팝업이 닫힌다
```
````

- **코드블록 안**(언어가 적힌 ```` ```sql ````, ```` ```MySQL ```` 등)에서는 "타이핑 중 추천 팝업" 설정이 꺼져 있어도 팝업이 뜬다. 자세한 규칙은 `docs/features/code-block.md`.
- 소문자로 쳐도 된다(앞부분이 같은 후보를 대소문자 무시하고 찾는다). 확정하면 대문자 키워드가 들어간다.
- **Tab**: 후보 확정. **Enter**: 코드블록 안에서는 줄바꿈(후보를 확정하지 않음). 후보를 방향키(↑↓)로 직접 고른 뒤에는 Enter 도 확정한다.
- 이미 다 친 키워드(`SELECT` 를 대문자로 끝까지 침)에는 후보가 뜨지 않는다. 더 긴 키워드가 있으면(`NULL` → `NULLIF`) 그 후보만 뜬다.
- **단어를 새로 시작하는 자리에서만** 후보를 찾는다(줄 맨 앞, 공백·괄호·점·쉼표 뒤). `NAME` 을 치면 끝의 `E` 로 `END`, `ERD` 가 추천되던 문제를 막으려는 것이다. 그래서 `user_name`, `col1e` 처럼 글자·숫자·밑줄이 이어진 중간에서는 팝업이 뜨지 않는다. 이 규칙은 코드블록 안에서만 적용된다(글에서는 한국어 조사 때문에 예전 방식 그대로).

## 후보 순서 — `_순서.txt`

같은 앞글자로 걸리는 후보가 여럿이면 기본은 **짧은 제목이 먼저**다. 그러면 `s` 에서 `SET`, `SUM` 이 `SELECT` 보다 위에 뜨므로, 폴더의 `_순서.txt` 에 **자주 쓰는 순서**를 적어 둔다.

````text
# 이 줄은 설명입니다
SELECT
FROM
WHERE
INSERT INTO
````

| 입력 | 순서 파일 없음(예전) | `_순서.txt` 있음 |
|---|---|---|
| `s` | SET, SUM, **SELECT**, SMALLINT … | **SELECT**, SET, SUM, SHOW DATABASES … |
| `f` | FROM, FALSE, FLOAT … | FROM, FALSE, FLOAT … |

- **한 줄에 제목 하나**, 위에 적을수록 먼저 뜬다. 빈 줄과 `#` 으로 시작하는 줄은 건너뛴다. 제목은 대소문자까지 똑같이 적는다. 메모장으로 고치고 앱에서 상용구 목록이 다시 읽힐 때(앱을 다시 열거나 상용구를 하나 만들 때) 반영된다.
- **목록에 없는 상용구**는 순서 있는 후보 뒤에서 예전처럼 짧은 순으로 나온다. 순서 파일이 없는 폴더는 예전과 완전히 같다.
- 정렬 우선순위는 **대소문자까지 같은 것 → 친 글자와 제목이 정확히 같은 것 → `_순서.txt` 순서 → 짧은 순 → 가나다순**이다.
- 파일은 **폴더마다** 둔다(`SQL\_순서.txt`). 다른 폴더의 같은 제목에는 영향이 없다. 이 파일은 상용구로 취급되지 않아 목록에 나타나지 않는다.
- 이 순서는 제가 "자주 쓸 것 같은 순"으로 정한 것이다(쓰는 횟수를 세어 정하는 게 아니다). 실제로 많이 쓰는 순서가 다르면 파일에서 위아래를 바꾸면 된다.

## 들어 있는 키워드 (147개, 폴더 이름 `SQL`)

| 묶음 | 예 |
|---|---|
| 문(명령) | SELECT, INSERT INTO, UPDATE, DELETE FROM, CREATE TABLE, ALTER TABLE, DROP TABLE, SHOW TABLES, DESCRIBE … |
| 절·연결 | FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT, DISTINCT, JOIN, INNER JOIN, LEFT JOIN, UNION … |
| 조건·연산 | AND, OR, NOT, IN, BETWEEN, LIKE, IS NULL, IS NOT NULL, EXISTS, CASE, WHEN, THEN, END … |
| 제약·옵션 | PRIMARY KEY, FOREIGN KEY, REFERENCES, UNIQUE, NOT NULL, DEFAULT, AUTO_INCREMENT, ON DELETE CASCADE … |
| 자료형 | INT, BIGINT, DECIMAL, DOUBLE, CHAR, VARCHAR, TEXT, DATE, DATETIME, TIMESTAMP, BOOLEAN, JSON … |
| 값 | NULL, TRUE, FALSE |
| 함수 | COUNT, SUM, AVG, MIN, MAX, CONCAT, SUBSTRING, NOW, DATE_FORMAT, IFNULL, COALESCE, NULLIF, CAST … |
| 트랜잭션·권한 | BEGIN, START TRANSACTION, COMMIT, ROLLBACK, SAVEPOINT, GRANT, REVOKE |

전체 목록은 `scripts/snippet-packs/sql.js`.

## 용어 설명 (초보자용)

| 용어 | 뜻 |
|---|---|
| **상용구** | 짧은 이름(단축어)을 치면 정해 둔 긴 글로 바꿔 주는 기능. 여기서는 키워드 자신이 단축어이자 본문이다. |
| **묶음(pack)** | 상용구 여러 개를 한 폴더에 한꺼번에 만들어 두는 단위. |
| **dry-run(미리보기)** | 실제로는 아무것도 바꾸지 않고, 하면 어떻게 되는지만 보여 주는 실행. |
| **키워드** | SELECT, FROM 처럼 SQL 문법에서 미리 의미가 정해진 단어. |

## 설계 메모 — 왜 본문이 제목과 같은가

- 본문을 제목과 **똑같이** 뒀다(`SELECT` → `SELECT`). 스페이스바 자동 치환이 켜져 있어도 이미 대문자로 친 키워드는 바뀌는 게 없어서 해가 없다. `COUNT` → `COUNT()` 처럼 괄호나 `{#}` 가 든 본문으로 하면 글 속에서 `COUNT` 를 치고 스페이스를 누를 때마다 갑자기 펼쳐져서 거슬린다.
- **Enter 가 후보를 확정하지 않게 한 이유**: 키워드는 앞부분이 겹치는 게 많다(NULL/NULLIF, INT/INTO/INTEGER, DATE/DATETIME). 줄 끝이 `NOT NULL` 이어서 Enter 를 누르면 팝업의 `NULLIF` 가 확정되어 줄바꿈도 안 되고 글자도 망가졌을 것이다. 그래서 코드블록 안에서만 Enter 를 줄바꿈으로 돌렸다.

## 구현 위치

- `scripts/snippet-packs/sql.js` — 키워드 목록과 추천 순서(`SQL_PACK.entries`, `SQL_PACK.order`).
- `scripts/install-snippet-pack.mjs` — 설치(`installSnippetPack`, `_순서.txt` 쓰기 포함)와 명령줄. 파일 이름 규칙은 앱과 같은 `electron/fileSystem.js` 의 `ensureSnippet` 을 쓴다.
- `src/lib/snippetOrder.js` — `_순서.txt` 해석(`parseSnippetOrder`). `electron/fileSystem.js`(`readSnippetOrders`) → `electron/main.js`·`preload.cjs`(IPC `snippets:readOrders`) → `src/store/useAppStore.js`(`rebuildIndexes` 가 후보마다 `rank` 를 붙임). 파일이 없는 폴더를 렌더러가 읽으려 하면 IPC 오류가 쌓여서, 존재 확인은 메인이 한다.
- `src/lib/snippetMatch.js` — 다 친 글자와 같은 후보 빼기, 단어 시작에서만 찾기(`wordStartOnly`), `rank` 정렬, 코드블록 안 Enter 규칙(`enterAcceptsSuggestion`). `src/components/EditorPane.jsx` — 방향키로 고른 표시(`navigated`)와 Enter 처리.
- 테스트: `tests/scripts/snippetPack.test.js`(데이터·설치·덮어쓰지 않음·미리보기·순서 파일), `tests/lib/snippetMatch.test.js`, `tests/lib/snippetOrder.test.js`, `tests/electron/snippetOrders.test.js`, `tests/store/snippetOrder.test.js`.

## 알려진 한계

- **추천 팝업 설정이 켜져 있으면 글을 쓸 때도 키워드가 뜬다.** 앱의 기본값은 켜짐이다. 글(문단)에서 `in`, `no` 같은 영어 단어를 칠 때마다 `IN`, `NOT`, `NULL` 이 후보로 뜨는 게 거슬리면 툴바 "추천 팝업" 버튼(또는 Alt+Shift+T)으로 꺼 두면 된다. 꺼 두어도 **코드블록 안에서는 자동으로 켜진다**.
- 키워드 폴더(`SQL`) 147개가 사이드바 "상용구"와 상용구 모달 목록에도 보인다. 폴더로 묶여 있어 접을 수 있다.
- MySQL 기준이다. Oracle·PostgreSQL 전용 키워드(ROWNUM, SERIAL 등)나 다른 언어(Java 등)는 들어 있지 않다. 다른 묶음은 `scripts/snippet-packs/` 에 파일을 추가하고 `install-snippet-pack.mjs` 의 `PACKS` 에 등록하면 된다.
- 한 글자나 두 글자(`a`, `in`)에도 팝업이 뜬다. 코드를 칠 때 팝업이 자주 뜨는 게 거슬리면 알려 달라(최소 글자 수를 둘 수 있다).
- 순서는 직접 적은 목록이라 **사용 빈도를 학습하지 않는다.** 쓴 횟수로 순서가 자동으로 바뀌는 방식은 만들지 않았다.
- 스페이스바 자동 치환(`findExactSnippetMatch`)은 단어 시작 규칙이 없다 — 제목이 줄 끝과 끝이 같기만 하면 단어 중간이어도 치환 대상이다. 키워드 묶음은 본문이 제목과 같아서 해가 없지만, `sql` → `SQL` 같은 다른 상용구는 `mysql` 처럼 끝이 같은 단어에서도 바뀐다(기존 동작).
- 이 묶음을 지우려면 상용구 모달에서 폴더의 항목을 지우거나 탐색기에서 `.wikidesk-snippets\SQL` 폴더를 삭제하면 된다.
