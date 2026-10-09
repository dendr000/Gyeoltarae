// Copyright (c) dendr000. MIT License.

// 코드블록 글자 강조(색). highlight.js 의 core 에 쓸 언어만 하나씩 등록해서 번들이 전체
// 언어(수백 개)만큼 커지지 않게 한다. 코드블록의 언어 이름(```MySQL, {{{#!syntax js}}} 등)을
// 대소문자·한글 이름에 상관없이 해석해 어떤 문법표로 칠할지 정한다.

import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import diff from 'highlight.js/lib/languages/diff'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import go from 'highlight.js/lib/languages/go'
import ini from 'highlight.js/lib/languages/ini'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import kotlin from 'highlight.js/lib/languages/kotlin'
import markdown from 'highlight.js/lib/languages/markdown'
import pgsql from 'highlight.js/lib/languages/pgsql'
import php from 'highlight.js/lib/languages/php'
import python from 'highlight.js/lib/languages/python'
import ruby from 'highlight.js/lib/languages/ruby'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import swift from 'highlight.js/lib/languages/swift'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

const GRAMMARS = {
  bash, c, cpp, csharp, css, diff, dockerfile, go, ini, java, javascript, json, kotlin, markdown,
  pgsql, php, python, ruby, rust, sql, swift, typescript, xml, yaml,
}
for (const [name, grammar] of Object.entries(GRAMMARS)) hljs.registerLanguage(name, grammar)

// label: 코드블록 윗줄에 보여줄 이름. grammar: 칠할 때 쓰는 문법표(highlight.js 언어 이름).
// aliases: 쓸 수 있는 이름들 — 대소문자·공백·하이픈·밑줄·점·슬래시는 비교할 때 무시하므로
// "No-SQL", "node.js", "PL/SQL" 도 아래 "nosql", "nodejs", "plsql" 로 같이 잡힌다.
//
// DBMS 마다 전용 문법표가 있는 건 아니다. highlight.js 에는 PostgreSQL 전용(pgsql)만 있고,
// MySQL·MariaDB·MSSQL·Oracle·SQLite 는 공통 SQL 문법표(sql)로 칠한다(키워드·문자열·주석·숫자
// 색은 같고 DBMS 고유 함수 구분은 없음). MongoDB 쉘과 NoSQL 질의는 자바스크립트 문법이라
// javascript 로 칠한다.
const LANGUAGES = [
  { label: 'SQL', grammar: 'sql', aliases: ['sql', 'ansisql'] },
  { label: 'MySQL', grammar: 'sql', aliases: ['mysql', '마이sql', '마이에스큐엘'] },
  { label: 'MariaDB', grammar: 'sql', aliases: ['mariadb', '마리아디비'] },
  { label: 'MSSQL', grammar: 'sql', aliases: ['mssql', 'sqlserver', 'tsql', 'transactsql'] },
  { label: 'Oracle', grammar: 'sql', aliases: ['oracle', '오라클', 'plsql'] },
  { label: 'SQLite', grammar: 'sql', aliases: ['sqlite', 'sqlite3'] },
  // DBeaver 는 언어가 아니라 여러 DBMS 를 다루는 SQL 편집 도구다 — 거기서 쓰는 SQL 이니 공통 SQL 로 칠한다.
  { label: 'DBeaver', grammar: 'sql', aliases: ['dbeaver', '디비버'] },
  { label: 'PostgreSQL', grammar: 'pgsql', aliases: ['postgresql', 'postgres', 'pgsql', 'psql', '포스트그레sql', '포스트그레스'] },
  { label: 'MongoDB', grammar: 'javascript', aliases: ['mongodb', 'mongo', 'mongosh', '몽고디비'] },
  { label: 'NoSQL', grammar: 'javascript', aliases: ['nosql'] },
  { label: 'Java', grammar: 'java', aliases: ['java', '자바'] },
  { label: 'JavaScript', grammar: 'javascript', aliases: ['javascript', 'js', 'node', 'nodejs', 'jsx', '자바스크립트'] },
  { label: 'TypeScript', grammar: 'typescript', aliases: ['typescript', 'ts', 'tsx', '타입스크립트'] },
  { label: 'Python', grammar: 'python', aliases: ['python', 'py', 'python3', '파이썬'] },
  { label: 'C++', grammar: 'cpp', aliases: ['c++', 'cpp', 'cc', 'cxx', '씨플러스플러스'] },
  { label: 'C', grammar: 'c', aliases: ['c', 'h'] },
  { label: 'C#', grammar: 'csharp', aliases: ['c#', 'csharp', 'cs', '씨샵'] },
  { label: 'Go', grammar: 'go', aliases: ['go', 'golang', '고랭'] },
  { label: 'Kotlin', grammar: 'kotlin', aliases: ['kotlin', 'kt', '코틀린'] },
  { label: 'PHP', grammar: 'php', aliases: ['php'] },
  { label: 'Ruby', grammar: 'ruby', aliases: ['ruby', 'rb', '루비'] },
  { label: 'Rust', grammar: 'rust', aliases: ['rust', 'rs', '러스트'] },
  { label: 'Swift', grammar: 'swift', aliases: ['swift', '스위프트'] },
  { label: 'HTML', grammar: 'xml', aliases: ['html', 'htm'] },
  { label: 'XML', grammar: 'xml', aliases: ['xml', 'svg'] },
  { label: 'CSS', grammar: 'css', aliases: ['css'] },
  { label: 'JSON', grammar: 'json', aliases: ['json'] },
  { label: 'YAML', grammar: 'yaml', aliases: ['yaml', 'yml'] },
  { label: 'INI', grammar: 'ini', aliases: ['ini', 'toml', 'conf', 'properties'] },
  { label: 'Bash', grammar: 'bash', aliases: ['bash', 'sh', 'shell', 'zsh', '쉘'] },
  { label: 'Dockerfile', grammar: 'dockerfile', aliases: ['dockerfile', 'docker', '도커'] },
  { label: 'Markdown', grammar: 'markdown', aliases: ['markdown', 'md'] },
  { label: 'Diff', grammar: 'diff', aliases: ['diff', 'patch'] },
]

// 이름 비교용 정규화: 소문자로 바꾸고 구분 기호(공백 - _ . /)를 없앤다. "+"·"#" 는 남겨서
// c / c++ / c# 이 서로 섞이지 않게 한다.
function normalizeName(name) {
  return name.toLowerCase().replace(/[\s\-_./]/g, '')
}

const BY_ALIAS = new Map()
for (const language of LANGUAGES) {
  for (const alias of language.aliases) BY_ALIAS.set(normalizeName(alias), language)
}

// 코드블록에 적힌 언어 이름을 해석한다. 아는 이름이면 { label, grammar }, 모르는 이름이면
// 적은 그대로를 label 로 하고 grammar 는 null(색 없이 보여 줌). 이름이 비었으면 null.
export function resolveCodeLanguage(rawName) {
  const name = (rawName ?? '').trim()
  if (!name) return null
  const known = BY_ALIAS.get(normalizeName(name))
  return known ? { label: known.label, grammar: known.grammar } : { label: name, grammar: null }
}

// 문법표를 적용한 HTML(안전하게 이스케이프된 <span class="hljs-..."> 들). 매번 다시 칠하면
// 듀얼 화면에서 글자 하나 칠 때마다 코드블록 전부를 다시 칠하게 되므로, 같은 (문법, 본문)은
// 결과를 재사용한다. 캐시는 일정 크기를 넘으면 통째로 비운다(단순하고 충분).
const CACHE_LIMIT = 300
const cache = new Map()

export function highlightCode(body, grammar) {
  const key = `${grammar}\n${body}`
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  const html = hljs.highlight(body, { language: grammar, ignoreIllegals: true }).value
  if (cache.size >= CACHE_LIMIT) cache.clear()
  cache.set(key, html)
  return html
}
