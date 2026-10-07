// Copyright (c) dendr000. MIT License.

// SQL 학습용 이름 상용구 묶음 — 교재·강의·예제 데이터베이스에서 자주 나오는 테이블 이름, 열(컬럼) 이름,
// 샘플 데이터 값, 그리고 sql.js 에 없는 키워드·함수. 단축어(제목)와 본문이 같고, `sql.js` 와 같은 `SQL` 폴더에
// 설치한다(폴더 이름이 같아서 한 목록에서 같이 추천된다).
//
// 이름은 소문자와 대문자를 둘 다 만든다(student / STUDENT). 교재마다 `emp` 로도 `EMP` 로도 적기 때문이다.
// 두 가지는 파일 이름이 대소문자만 달라서 Windows 에서는 같은 파일이므로, 설치할 때 앱과 같은
// ensureSnippet 이 두 번째부터 `%XX` 로 인코딩한 이름으로 저장한다(docs/features/snippet-case-sensitive.md).
//
// 구성
//   - names(소문자 + 대문자): 테이블·열 이름. sql.js 의 키워드와 겹치는 이름(date, count, index 등)은 뺀다.
//   - upper(대문자만): 샘플 데이터 값(SCOTT 의 이름·직무), 키워드·함수·자료형.
//   - asIs(적힌 그대로): classicmodels·world 처럼 camelCase 로 적는 이름. 소문자·대문자 변형은 만들지 않는다.
//
// 제목은 Windows 파일 이름으로 그대로 쓸 수 있는 글자만 쓴다(* ? : " < > | / \ 제외).
import { SQL_PACK } from './sql.js'

const words = (text) => text.trim().split(/\s+/)

// ---- 소문자 + 대문자로 만드는 이름 ----

// 테이블 이름(학교·회사·쇼핑몰·도서관·은행·영화 등 교재에 자주 나오는 주제)
const TABLES = words(`
  student students teacher teachers professor professors lecturer course courses subject subjects
  lecture lectures class classes enrollment enrollments enroll registration score scores grade grades
  exam exams test tests major majors sc cs
  department departments dept depts emp emps employee employees staff manager managers boss
  member members user users account accounts customer customers client clients
  product products goods item items order orders order_item order_items order_detail order_details orderdetails
  category categories supplier suppliers vendor vendors shipper shippers payment payments invoice invoices
  receipt cart carts wishlist coupon coupons review reviews rating ratings
  board boards post posts article articles notice notices comments reply replies tag tags
  file files attachment attachments image images photo photos
  book books author authors writer publisher publishers library borrow loan loans rental rentals
  movie movies actor actors film films genre genres artist artists album albums song songs playlist track tracks
  reservation reservations booking bookings room rooms hotel hotels flight flights passenger passengers
  airport airline seat seats ticket tickets station stations route routes vehicle vehicles car cars driver drivers
  project projects task tasks work works works_on assignment assignments dependent dependents
  family person persons people parent parents child children friend friends
  address addresses city cities country countries region regions location locations
  office offices branch branches store stores shop shops warehouse warehouses inventory stock
  company companies school schools university club clubs team teams player players game games league season
  sales sale salary salaries title titles bonus salgrade job jobs job_history
  dept_emp dept_manager current_dept_emp
  role roles permission permissions log logs history audit event events schedule schedules calendar
  message messages notification notifications session sessions token tokens setting settings config
  t1 t2 t3 tb tbl tab table1 table2 temp tmp sample samples demo mytable mytest practice example examples dual
  language languages countrylanguage film_actor film_category film_text customer_list staff_list
  employee_list worker workers patient patients doctor doctors nurse nurses hospital hospitals medicine
  animal animals pet pets owner owners fruit fruits food foods menu menus restaurant restaurants
  bank banks card cards transaction transactions deposit deposits withdrawal withdrawals
  tbl_user tbl_member tbl_board tbl_product tbl_order productlines
`)

// 열(컬럼) 이름
const COLUMNS = words(`
  id no num number seq idx code name nickname nick username user_id user_name userid user_no login_id
  password passwd pwd pw email mail phone tel telephone mobile cell hp fax
  address addr zipcode zip postcode post_code
  first_name last_name full_name firstname lastname fullname middle_name
  gender sex age birth birthday birth_date birthdate birth_year born nationality
  job_title position rank level grade score point points kor eng math sci soc korean english science
  total average cnt rate ratio percent percentage result status state type kind
  class_no class_id classno grade_no
  student_id student_no student_name student_number stu_id stu_no stu_name stuid stuno stunm
  sid sno sname sage ssex sdept cid cno cname cpno credit credits ccredit tid tno tname
  professor_id prof_id prof_name teacher_id teacher_name course_id course_no course_name
  subject_id subject_name semester term hours room_no room_id lecture_id major_id major_name
  dept_id dept_no dept_name deptno dname deptname loc
  emp_id emp_no emp_name empno ename empname employee_id employee_name employee_no
  job job_id mgr mgr_id manager_id manager_name hiredate hire_date join_date
  sal salary pay wage comm commission commission_pct bonus losal hisal min_salary max_salary
  customer_id customer_no customer_name cust_id cust_name
  product_id product_no product_name prod_id prod_name pname pid
  price unit_price unitprice cost amount quantity qty units discount total_price total_amount
  order_id order_no order_date ordered_at ship_date shipped_date required_date delivery delivery_date
  category_id category_name cat_id supplier_id supplier_name company_name contact_name contact_title
  seller_id buyer_id brand model maker color size weight height width
  created_at updated_at deleted_at created_by updated_by created_date updated_date
  reg_date regdate reg_dt reg_id mod_date moddate upd_date upd_dt upd_id insert_date update_date
  start_date end_date start_time end_time from_date to_date begin_date open_date close_date
  use_yn del_yn delete_yn is_deleted is_active is_admin active enabled visible flag
  content contents subject writer author author_id author_name writer_id writer_name
  board_id post_id article_id comment_id reply_id parent_id
  file_id file_name filename file_path filepath file_size filesize extension ext url link
  image img photo thumbnail description detail details memo note notes remark remarks summary
  hit hits view_count views likes like_count readcount ref step depth
  latitude longitude lat lng lon location_id loc_id city_id city_name country_id country_name country_code
  region_id region_name continent capital language population area district street street_address
  state_province postal_code province
  genre_id actor_id actor_name film_id film_title movie_id movie_name director release_year
  rental_id rental_date return_date rental_rate rental_duration replacement_cost special_features
  inventory_id store_id staff_id staff_name payment_id payment_date payment_method
  card_no card_number account_no account_id account_number bank_name balance deposit withdraw withdrawal
  transaction_id tx_id trans_date branch_id branch_name
  seat_no flight_no flight_id departure arrival origin destination
  book_id book_name book_title isbn publisher_id publisher_name publish_date pub_date borrow_date due_date
  project_id project_name task_id task_name assign_date hours_worked
  ssn essn pno pnumber plocation dno dnumber dlocation mgrssn mgrstartdate superssn fname minit lname bdate
  team_id team_name player_id player_name uniform_no back_no
  role_id role_name permission_id session_id expire_date expires_at ip ip_address user_agent device
  event_id event_name last_update
  patient_id patient_name doctor_id doctor_name hospital_id diagnosis
`)

// 데이터베이스(스키마) 이름
const DATABASES = words(`
  company shopdb shop testdb mydb mydatabase sampledb schooldb university bookstore library
  scott hr sakila world employees classicmodels northwind sqlstudy test example demo practice
`)

// ---- 대문자로만 만드는 것 ----

// Oracle SCOTT 샘플(EMP, DEPT)의 데이터 값. 글자 그대로 따옴표 안에 쓰는 값들이다.
const SCOTT_VALUES = [
  'SMITH', 'ALLEN', 'WARD', 'JONES', 'MARTIN', 'BLAKE', 'CLARK', 'SCOTT', 'KING', 'TURNER', 'ADAMS', 'JAMES', 'FORD', 'MILLER',
  'CLERK', 'SALESMAN', 'MANAGER', 'ANALYST', 'PRESIDENT',
  'ACCOUNTING', 'RESEARCH', 'SALES', 'OPERATIONS',
  'NEW YORK', 'DALLAS', 'CHICAGO', 'BOSTON',
]

// sql.js 에 없는 키워드·함수·자료형(MySQL 과 Oracle 학습 과정에서 자주 나온다)
const EXTRA_KEYWORDS = [
  // 조인·집합·분석
  'FULL JOIN', 'FULL OUTER JOIN', 'NATURAL JOIN', 'STRAIGHT_JOIN', 'INNER', 'OUTER', 'NATURAL', 'FULL',
  'MINUS', 'INTERSECT', 'EXCEPT', 'SOME', 'WITH', 'RECURSIVE', 'WITH RECURSIVE', 'ROLLUP', 'CUBE', 'GROUPING SETS',
  'OVER', 'PARTITION BY', 'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE', 'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE',
  'ROWS BETWEEN', 'UNBOUNDED PRECEDING', 'CURRENT ROW', 'FETCH FIRST', 'FOR UPDATE',
  // 문(명령)
  'REPLACE INTO', 'INSERT IGNORE', 'ON DUPLICATE KEY UPDATE', 'LOCK TABLES', 'UNLOCK TABLES',
  'SHOW COLUMNS', 'SHOW CREATE TABLE', 'SHOW INDEX', 'SHOW GRANTS', 'SHOW PROCESSLIST', 'SHOW STATUS', 'SHOW VARIABLES',
  'FLUSH PRIVILEGES', 'IDENTIFIED BY', 'WITH GRANT OPTION', 'ALL PRIVILEGES', 'DROP USER',
  // 만들기·지우기·바꾸기
  'IF EXISTS', 'IF NOT EXISTS', 'DROP TABLE IF EXISTS', 'CREATE TABLE IF NOT EXISTS', 'CREATE DATABASE IF NOT EXISTS',
  'CREATE TEMPORARY TABLE', 'CREATE OR REPLACE VIEW', 'CREATE PROCEDURE', 'CREATE FUNCTION', 'CREATE TRIGGER',
  'DROP PROCEDURE', 'DROP FUNCTION', 'DROP TRIGGER', 'DROP CONSTRAINT', 'DROP PRIMARY KEY', 'DROP FOREIGN KEY',
  'ADD PRIMARY KEY', 'ADD FOREIGN KEY', 'ADD INDEX', 'ADD UNIQUE', 'AFTER', 'BEFORE', 'FIRST', 'TEMPORARY',
  'TRIGGER', 'PROCEDURE', 'FUNCTION', 'CALL', 'DELIMITER', 'DECLARE', 'RETURN', 'RETURNS', 'LOOP', 'WHILE', 'FOR EACH ROW',
  // 제약·참조 동작
  'CASCADE', 'RESTRICT', 'NO ACTION', 'SET NULL', 'ON DELETE SET NULL', 'ON DELETE RESTRICT', 'ON DELETE NO ACTION',
  'ON UPDATE SET NULL', 'ON UPDATE CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP', 'AUTOCOMMIT', 'FOREIGN_KEY_CHECKS',
  'SET AUTOCOMMIT', 'SET FOREIGN_KEY_CHECKS',
  // 자료형
  'MEDIUMINT', 'MEDIUMTEXT', 'LONGTEXT', 'TINYTEXT', 'MEDIUMBLOB', 'LONGBLOB', 'TINYBLOB', 'BINARY', 'VARBINARY', 'BIT',
  'REAL', 'DEC', 'FIXED', 'ZEROFILL', 'UNSIGNED ZEROFILL', 'DOUBLE PRECISION', 'SERIAL', 'BIGSERIAL', 'MONEY', 'INTERVAL',
  'NUMBER', 'VARCHAR2', 'NVARCHAR', 'NCHAR', 'NCLOB', 'CLOB', 'LONG', 'RAW',
  // 문자열 함수
  'CONCAT_WS', 'SUBSTR', 'INSTR', 'LOCATE', 'POSITION', 'LPAD', 'RPAD', 'LTRIM', 'RTRIM', 'INITCAP', 'REVERSE', 'REPEAT',
  'FORMAT', 'CHAR_LENGTH', 'FIND_IN_SET', 'ASCII', 'LEFT', 'RIGHT', 'TRANSLATE',
  // 숫자 함수
  'TRUNC', 'TRUNCATE', 'SIGN', 'POWER', 'POW', 'SQRT', 'RAND', 'RANDOM', 'GREATEST', 'LEAST', 'CEILING', 'EXP', 'LN', 'LOG', 'LOG10', 'PI',
  // 날짜 함수
  'SYSDATE', 'SYSTIMESTAMP', 'CURRENT_DATE', 'CURRENT_TIME', 'LOCALTIME', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND', 'WEEK', 'QUARTER',
  'DAYNAME', 'MONTHNAME', 'DAYOFWEEK', 'DAYOFYEAR', 'LAST_DAY', 'ADD_MONTHS', 'MONTHS_BETWEEN', 'NEXT_DAY',
  'STR_TO_DATE', 'DATE_SUB', 'TIMESTAMPDIFF', 'TIMESTAMPADD', 'EXTRACT', 'UNIX_TIMESTAMP', 'FROM_UNIXTIME',
  // 변환·널 처리·기타 함수
  'NVL', 'NVL2', 'DECODE', 'TO_CHAR', 'TO_DATE', 'TO_NUMBER', 'ROWNUM', 'ROWID',
  'CURRENT_USER', 'DATABASE', 'VERSION', 'LAST_INSERT_ID', 'ROW_COUNT', 'FOUND_ROWS', 'UUID', 'MD5', 'SHA1', 'SHA2',
]

// ---- 조립 ----

// sql.js 의 키워드 제목(대소문자 무시) — 이름이 이것과 같으면 이 묶음에서 뺀다(DATE, COUNT, INDEX 등).
const KEYWORD_KEYS = new Set(SQL_PACK.entries.map((title) => title.toLowerCase()))

// camelCase 로 적는 이름(classicmodels, world 샘플). 소문자·대문자 변형은 만들지 않고 적힌 그대로 둔다.
const AS_IS = [
  // classicmodels
  'customerNumber', 'customerName', 'contactLastName', 'contactFirstName', 'addressLine1', 'addressLine2', 'postalCode',
  'salesRepEmployeeNumber', 'creditLimit', 'checkNumber', 'paymentDate', 'orderDate', 'requiredDate', 'shippedDate',
  'orderNumber', 'productCode', 'quantityOrdered', 'priceEach', 'orderLineNumber', 'productName', 'productLine',
  'productScale', 'productVendor', 'productDescription', 'quantityInStock', 'buyPrice', 'MSRP', 'textDescription',
  'htmlDescription', 'employeeNumber', 'lastName', 'firstName', 'officeCode', 'reportsTo', 'jobTitle',
  // world
  'CountryCode', 'SurfaceArea', 'IndepYear', 'LifeExpectancy', 'GNP', 'GNPOld', 'LocalName', 'GovernmentForm',
  'HeadOfState', 'Code2', 'IsOfficial',
  // northwind
  'CategoryID', 'CategoryName', 'CustomerID', 'CompanyName', 'ContactName', 'EmployeeID', 'OrderID', 'OrderDate',
  'ProductID', 'ProductName', 'SupplierID', 'ShipperID', 'UnitPrice', 'UnitsInStock', 'Quantity',
]

// 소문자 제목과 대문자 제목을 둘 다 만든다. 이미 sql.js 키워드인 이름은 건너뛴다.
function bothCases(list) {
  return list
    .filter((word) => !KEYWORD_KEYS.has(word.toLowerCase()))
    .flatMap((word) => [word, word.toUpperCase()])
}

// 제목이 같은 것은 하나만 남긴다(소문자·대문자는 서로 다른 제목이다). 처음 나온 순서를 지킨다.
function unique(list) {
  return [...new Set(list)]
}

const ENTRIES = unique([
  ...bothCases(TABLES),
  ...bothCases(COLUMNS),
  ...bothCases(DATABASES),
  ...SCOTT_VALUES,
  ...bothCases(['male', 'female']),
  ...EXTRA_KEYWORDS.filter((title) => !KEYWORD_KEYS.has(title.toLowerCase())),
  ...AS_IS,
])

export const SQL_PRACTICE_PACK = {
  // sql.js 와 같은 폴더. 이미 있는 상용구는 설치 스크립트가 건너뛴다.
  folder: SQL_PACK.folder,
  description: 'SQL 학습용 이름 — 테이블·열 이름(emp, dept, student …), 샘플 값, 추가 키워드·함수',
  entries: ENTRIES,
  // 순서 목록은 만들지 않는다. SQL 폴더의 `_순서.txt` 는 sql.js 가 만든 것을 그대로 쓰고, 여기 있는
  // 이름은 그 목록 뒤에서 짧은 순으로 나온다.
  order: undefined,
}
