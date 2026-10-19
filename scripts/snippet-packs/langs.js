// Copyright (c) dendr000. MIT License.

// 프로그래밍 언어 상용구 묶음 모음. 키는 설치 명령에 쓰는 이름이다
// (node scripts/install-snippet-pack.mjs cpp). 폴더 이름은 코드블록의 언어 이름과 같다.
import { BASH_PACK } from './lang/bash.js'
import { C_PACK } from './lang/c.js'
import { CPP_PACK } from './lang/cpp.js'
import { CSHARP_PACK } from './lang/csharp.js'
import { CSS_PACK } from './lang/css.js'
import { GO_PACK } from './lang/go.js'
import { HTML_PACK } from './lang/html.js'
import { JAVA_PACK } from './lang/java.js'
import { JAVASCRIPT_PACK } from './lang/javascript.js'
import { KOTLIN_PACK } from './lang/kotlin.js'
import { PHP_PACK } from './lang/php.js'
import { PYTHON_PACK } from './lang/python.js'
import { RUBY_PACK } from './lang/ruby.js'
import { RUST_PACK } from './lang/rust.js'
import { SWIFT_PACK } from './lang/swift.js'
import { TYPESCRIPT_PACK } from './lang/typescript.js'

export const LANGUAGE_PACKS = {
  cpp: CPP_PACK,
  c: C_PACK,
  java: JAVA_PACK,
  html: HTML_PACK,
  css: CSS_PACK,
  python: PYTHON_PACK,
  javascript: JAVASCRIPT_PACK,
  typescript: TYPESCRIPT_PACK,
  csharp: CSHARP_PACK,
  go: GO_PACK,
  kotlin: KOTLIN_PACK,
  rust: RUST_PACK,
  swift: SWIFT_PACK,
  php: PHP_PACK,
  ruby: RUBY_PACK,
  bash: BASH_PACK,
}
