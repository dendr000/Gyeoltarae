// Copyright (c) dendr000. MIT License.

// SQL(주로 MySQL) 키워드 상용구 묶음. 단축어(제목)와 본문이 같다 — 소문자로 `sel` 까지 치면 추천
// 팝업(코드블록 안에서 자동으로 켜짐)에 `SELECT` 가 뜨고 Tab 으로 확정하면 대문자 키워드가 들어간다.
// 본문을 제목과 똑같이 둔 이유: 스페이스바 자동 치환이 켜져 있어도 이미 대문자로 친 키워드는 바뀌는 게
// 없어서 해가 없고, `{#}`·괄호가 든 본문(예: COUNT → COUNT())은 글 속에서 단어를 치고 스페이스를 누를
// 때마다 갑자기 펼쳐져서 거슬리기 때문이다.
//
// 제목은 Windows 파일 이름으로 그대로 쓸 수 있는 글자만 쓴다(* ? : " < > | / \ 제외).
// 영어 폴더의 기존 상용구(ERD, MYSQL, WORKBENCH, sql 등)와 같은 제목은 넣지 않는다.
const GROUPS = {
  '문(명령)': [
    'SELECT', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
    'CREATE DATABASE', 'CREATE TABLE', 'CREATE INDEX', 'CREATE VIEW', 'CREATE USER',
    'ALTER TABLE', 'DROP TABLE', 'DROP DATABASE', 'DROP INDEX', 'DROP VIEW',
    'TRUNCATE TABLE', 'RENAME TABLE', 'ADD COLUMN', 'DROP COLUMN', 'MODIFY COLUMN', 'CHANGE COLUMN',
    'ADD CONSTRAINT', 'USE', 'SHOW DATABASES', 'SHOW TABLES', 'DESCRIBE', 'EXPLAIN',
  ],
  '절·연결': [
    'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
    'DISTINCT', 'AS', 'ON', 'USING', 'UNION', 'UNION ALL',
    'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'CROSS JOIN', 'LEFT OUTER JOIN', 'RIGHT OUTER JOIN',
  ],
  '조건·연산': [
    'AND', 'OR', 'NOT', 'IN', 'NOT IN', 'BETWEEN', 'LIKE', 'NOT LIKE', 'REGEXP',
    'IS NULL', 'IS NOT NULL', 'EXISTS', 'ANY', 'ALL', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  ],
  '제약·옵션': [
    'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES', 'UNIQUE', 'NOT NULL', 'DEFAULT', 'AUTO_INCREMENT',
    'CHECK', 'CONSTRAINT', 'INDEX', 'ON DELETE CASCADE', 'ON UPDATE CASCADE',
    'ENGINE', 'CHARACTER SET', 'COLLATE', 'COMMENT', 'UNSIGNED',
  ],
  '자료형': [
    'INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT', 'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE',
    'CHAR', 'VARCHAR', 'TEXT', 'BLOB', 'DATE', 'TIME', 'DATETIME', 'TIMESTAMP', 'YEAR',
    'BOOLEAN', 'ENUM', 'JSON',
  ],
  '값': ['NULL', 'TRUE', 'FALSE'],
  '함수': [
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'GROUP_CONCAT',
    'CONCAT', 'SUBSTRING', 'LENGTH', 'UPPER', 'LOWER', 'TRIM', 'REPLACE',
    'ROUND', 'FLOOR', 'CEIL', 'ABS', 'MOD',
    'NOW', 'CURDATE', 'CURTIME', 'DATE_FORMAT', 'DATEDIFF', 'DATE_ADD',
    'IFNULL', 'COALESCE', 'NULLIF', 'IF', 'CAST', 'CONVERT',
  ],
  '트랜잭션·권한': [
    'BEGIN', 'START TRANSACTION', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'GRANT', 'REVOKE',
  ],
}

export const SQL_PACK = {
  // 상용구 폴더 이름. 코드블록 언어 이름(```sql)과 같게 해 두었다.
  folder: 'SQL',
  description: 'SQL(MySQL) 키워드 — 문·절·조건·제약·자료형·함수',
  entries: Object.values(GROUPS).flat(),
}
