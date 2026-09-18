// Namu Wiki-style markup parser (basic + a practical subset of advanced syntax).
import { tokenizeIfExpr, parseIfExpr, evalIfStatements, isFalsy, toDisplayString } from './ifExpr.js'
//
// Headings   : =제목= ~ ======제목======  (also accepts markdown # ~ ######)
// Emphasis   : '''굵게''' / **굵게**, ''기울임'' / *기울임*, __밑줄__,
//              ~~취소선~~ / --취소선--, ^^위첨자^^, ,,아래첨자,,
// Size/color : {{{+1 텍스트}}} ~ {{{+5}}}, {{{-1}}} ~ {{{-5}}}, {{{#색상 텍스트}}}
// Footnote   : [* 내용]  (auto-numbered)
// Line break : [br]  (일반 줄바꿈은 문단 안에서 뭉개지므로 명시적으로 끊을 때 씀)
// Lists      : * 항목 (중첩 **, ***…), 1. 항목 (단일 레벨)
// Quote      : > 인용 (중첩 >>, >>>…)
// Table      : ||내용||내용||  with optional <...> cell attributes:
//              <-N> colspan, <|N> rowspan, <:> <(> <)> align, <bgcolor=#fff>,
//              <width=..>/<height=..>, <rowbgcolor=#fff>(행 전체),
//              <colbgcolor=#fff>(이 행부터 아래 열 전체로 이어짐),
//              <tablebordercolor=#fff>/<tablebgcolor=#fff>/<tablewidth=..>/
//              <tablealign=left|center|right>/<tablecolor=#fff> (표 전체 — 아무
//              셀에나 적어도 표 전체에 적용됨. left/right는 실제 나무위키처럼
//              진짜 CSS float — 이후 내용이 표 옆으로 흘러 들어감. 멈추려면
//              [clearfix]. center는 그냥 가운데 정렬(float 아님))
//              (결타래 확장: ||=제목=|| 로 <th> 헤더 셀 지정)
//              셀 안에 {{{#!wiki style="..."}}} 블록을 넣으면(여러 줄 가능) 그
//              셀만 그라데이션 등으로 렌더링됨 (실제 나무위키와 동일한 구조)
// Block      : {{{ 코드 }}} (plain code), {{{#!folding 제목 \n 내용 \n }}} (접기),
//              {{{#!wiki style="..." \n 내용 \n }}} (그라데이션/그림자/테두리 등,
//              안전한 CSS 속성만 허용 — url()/포지션 고정/외부 리소스는 차단)
// Misc       : ---- (4~7개 대시, 굵기 4단계 구분선), [목차] (접을 수 있는 자동 목차,
//              제목 앞에 1./2.1. 같은 자동 번호도 항상 붙음 — 뷰어 우측에는 이와
//              별개로 호버 시 펼쳐지는 플로팅 목차가 항상 표시됨), [clearfix]
//              (<table align=left|right>로 띄운 표 옆으로 이후 내용이 계속
//              흘러 들어가는 것을 멈춤 — 표 문법 항목 참고),
//              #태그 라인, [[문서명]] (표시만, 탐색은 2차 기능)
// Category   : [[분류:이름]] (출력명은 [[분류:이름|출력명]]로 따로 지정 가능 —
//              분류 자체는 항상 이름 기준이고 배지에 보이는 글자만 바뀜)
//              — 어디에 적어도 본문에서 사라지고 문서 맨 아래 분류
//              배지로 모임(진짜 나무위키 방식). 분류 페이지 자체(설명 문서 +
//              자동 문서 목록)는 워크스페이스 트리가 아니라 별도의
//              .wikidesk-categories 폴더에 보관되어 사이드바에 "분류"라는
//              전용 공간으로 따로 표시됨 (useAppStore.js의 categoryIndex,
//              electron/fileSystem.js의 scanCategoryPages 참고)
// Data card  : [[자료:유형/이름]] — 그 줄에 단독으로 적으면 "필드: 값" 형식으로
//              저장해둔 데이터 문서(예: 기술/번개펀치)를 정보 카드로 불러와
//              보여줌. 나무위키의 틀(아래 Template 항목) 기능과 달리 결타래 전용 —
//              데이터 문서 자체는 워크스페이스 트리가 아니라 .wikidesk-data
//              폴더(유형별 하위 폴더)에 보관되고 사이드바에 "자료" 전용
//              공간으로 표시됨 (useAppStore.js의 dataIndex 참고)
// Template   : {{틀:이름}} / {{틀:이름|매개변수=값|매개변수2=값2}} (이름=값 또는
//              위치 인자 모두 가능) / [include(이름)] / [include(이름, 매개변수=값)]
//              — 실제 나무위키 틀 문법 그대로. 틀 문서 안에서는 실제 나무위키
//              문법인 @매개변수@ / @매개변수=기본값@(나무위키:문법 도움말/심화
//              §17)로 전달받은 값을 쓸 수 있음 — 값을 아예 안 넘기면(호출에서
//              그 이름 자체가 없으면) 기본값이, 빈 문자열로 넘기면("이름=,")
//              빈 문자열이 나옴. calleeTitle 같은 상수는 미지원. 결타래가
//              먼저 갖고 있던 {{{매개변수}}}/{{{매개변수|기본값}}} 문법도(실제
//              나무위키 문법인지 불확실하지만) 하위 호환으로 계속 지원 —
//              {{{+1 ...}}}/{{{#색상 ...}}}/{{{#!...}}}처럼 특수 문자로
//              시작하는 기존 삼중괄호 문법과는 이름이 겹치지 않아 어느 쪽도
//              충돌하지 않음.
//              {{{#!if 조건식 \n 내용 \n }}} — 조건부 블록(§18). 조건식이
//              참(참에 준하는 값 포함)이면 내용이, 아니면 아무것도 안 나옴.
//              지원하는 연산자: 대입(=, ;로 여러 문장 연결 시 이전 대입이
//              이후에도 유지됨), 비교(== != < <= > >=), 논리(&& || !),
//              산술(+ - * / %), 단항(! - +), 삼항(?:), 소괄호, this.매개변수/
//              this['매개변수']. 매개변수 값은 항상 문자열이라 수 비교 전엔
//              (+매개변수)로 형변환 필요. 미지원: **(거듭제곱, 우선순위도
//              나무위키 특유의 좌→우 동일 우선순위 대신 일반적인 방식 사용),
//              증감(++/--), 비트 연산, 문자열 메서드/속성(.length 등),
//              parseInt()/time() 같은 전역 함수, 배열·객체 리터럴, <rowif>,
//              복합 대입(+=  등). 이 중 하나라도 쓰인 조건식은 그 블록만
//              평가에 실패해서 내용이 숨겨짐(문서 전체가 깨지지 않음).
//              틀도 워크스페이스 트리가 아니라 .wikidesk-templates
//              폴더에 보관되고 사이드바에 "틀" 전용 공간으로 표시됨
//              (useAppStore.js의 templateIndex 참고). [include(...)]는 실제
//              나무위키와 달리 임의 문서가 아니라 틀 공간만 대상으로 함(문서
//              전체를 제목으로 찾아 포함하는 기능은 아직 없음)
// Image      : [[파일:이름]] / [[파일:이름|너비]] — 그 줄에 단독으로 적거나
//              표 셀 하나의 내용 전부일 때(표 셀 안 {{{#!wiki}}} 블록의 경우처럼)
//              등록해 둔 이미지를 그 자리에 실제로 그려줌(너비는 "300px"/"50%"
//              처럼 안전한 길이 값만 허용, 생략하면 원본 크기). 이미지 자체는
//              워크스페이스 트리가 아니라 .wikidesk-images 폴더에 보관되고
//              사이드바에 "이미지" 전용 공간으로 표시됨 — 분류/자료처럼 이름만
//              미리 적어두는 게 아니라, 사이드바나 에디터 툴바에서 실제 파일을
//              먼저 가져와 등록해야 함 (useAppStore.js의 imageIndex 참고).
//              |link=문서명 (또는 |link=문서명#제목)을 추가로 붙이면 클릭 시
//              그 문서로 이동하는 링크가 됨 — [[문서명]] 위키링크와 완전히
//              같은 missing/ambiguous/앵커 처리(resolveLinkTarget 참고)를
//              재사용함. 나무위키 원본의 width=30 접두사 문법은 미지원(항상
//              접두사 없는 |300px 형식만 너비로 인식) — 결타래 자체 확장
// Dual color : 색상을 받는 모든 자리(<bgcolor=...>, {{{#색상 텍스트}}},
//              {{{#!wiki style="color:...; background:...;"}}} 등)에
//              "색1,색2"처럼 쉼표로 두 개를 적으면 라이트/다크 모드별로 다른
//              색을 지정할 수 있음 — CSS의 light-dark() 함수로 렌더링되므로
//              결타래 쪽에 별도 다크모드 감지 로직이 없어도 브라우저가
//              알아서 지금 테마에 맞는 값을 고름 (결타래 자체 확장)

// Escapes for both HTML text content AND attribute values (every call site
// in this file ends up in a double-quoted attribute somewhere — doc paths,
// link targets, image names) — missing the quote used to let free-typed
// text like a [[없는 문서"onmouseover=alert(1)]] link target break out of
// its data-doc-target="..." attribute and inject arbitrary attributes.
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Allowlist for {{{#!wiki style="..."}}}. Anything not listed here is
// silently dropped rather than passed through, so this stays safe even as
// the underlying regex checks evolve — properties that can break out of the
// content box (position, top/left/right/bottom, z-index) or load external
// resources (url()) are simply never in the allowed set.
const ALLOWED_STYLE_PROPS = new Set([
  'color', 'background', 'background-color', 'background-image', 'background-clip', '-webkit-background-clip',
  'text-align', 'letter-spacing', 'word-spacing', 'word-break', 'text-transform', 'text-shadow', 'text-decoration', 'white-space', 'vertical-align',
  'border', 'border-top', 'border-bottom', 'border-left', 'border-right',
  'border-radius', 'border-color', 'border-width', 'border-style',
  'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
  'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
  'width', 'max-width', 'min-width', 'height', 'max-height', 'min-height',
  'float', 'display', 'font-family', 'font-style', 'font-size', 'font-weight', 'line-height', 'opacity',
])
const ALLOWED_DISPLAY_VALUES = new Set(['block', 'inline', 'inline-block', 'table', 'table-cell', 'table-row', 'none', 'flex', 'inline-flex'])
const GRADIENT_FN_RE = /^(repeating-)?(linear|radial|conic)-gradient\(.+\)$/i
const PLAIN_COLOR_RE = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+|rgba?\([^)]+\)|transparent|none|text)$/
const LIGHT_DARK_FN_RE = /^light-dark\(.+\)$/i

function sanitizeStyleValue(prop, rawValue) {
  let value = rawValue.trim()
  if (!value || value.length > 300) return null
  // "값1,값2" 형태면 light-dark()로 변환 시도 — 실제 색상이 들어가는
  // 속성이 아닌 곳에 이 결과가 들어가면 브라우저가 그 선언 하나만 조용히
  // 무시하므로, 속성 이름별로 미리 걸러낼 필요 없이 값 모양만 보고
  // 일괄 시도해도 안전함. 그라데이션 함수처럼 쉼표가 여러 개인 값은 앞
  // 두 조각이 색상으로 검증 안 되니 자연스럽게 원래 값 그대로 통과함.
  if (value.includes(',')) {
    const lightDark = withLightDark(value, safeColorSingle)
    if (lightDark) value = lightDark
  }
  const lower = value.toLowerCase()
  if (
    lower.includes('url(') ||
    lower.includes('expression(') ||
    lower.includes('javascript:') ||
    lower.includes('@import') ||
    lower.includes('</') ||
    lower.includes('<script')
  ) {
    return null
  }
  if (prop === 'display' && !ALLOWED_DISPLAY_VALUES.has(lower)) return null
  if (
    (prop === 'background' || prop === 'background-image') &&
    !(GRADIENT_FN_RE.test(value) || PLAIN_COLOR_RE.test(value) || LIGHT_DARK_FN_RE.test(value))
  ) {
    return null
  }
  return value
}

function sanitizeStyleString(styleStr) {
  const out = []
  for (const decl of styleStr.split(';')) {
    const idx = decl.indexOf(':')
    if (idx === -1) continue
    const prop = decl.slice(0, idx).trim().toLowerCase()
    if (!ALLOWED_STYLE_PROPS.has(prop)) continue
    const safeValue = sanitizeStyleValue(prop, decl.slice(idx + 1))
    if (safeValue) out.push(`${prop}: ${safeValue}`)
  }
  return out.join('; ')
}

// {{{#!style\n.className { prop: value; }\n}}} — only bare .className rule
// selectors are recognized (anything else, like a bare element/id/attribute
// selector that could reach outside the rendered document, just silently
// doesn't match and gets dropped, same philosophy as sanitizeStyleString);
// each rule's own declarations still go through sanitizeStyleString.
const STYLE_DECL_RULE_RE = /\.([a-zA-Z][\w-]*)\s*\{([^}]*)\}/g

function sanitizeGlobalStyleBlock(body) {
  const rules = []
  for (const m of body.matchAll(STYLE_DECL_RULE_RE)) {
    const declBody = sanitizeStyleString(m[2])
    if (declBody) rules.push(`.${m[1]} { ${declBody} }`)
  }
  return rules.join('\n')
}

// {{{#!wiki ...}}}'s header can carry more than just style="..." (lang=,
// tag=) in any order — pulling every key="value" pair into a map once is
// simpler than one growing regex per attribute combination. Values that
// aren't recognized (unknown tag, malformed lang code) are just dropped by
// each attribute's own caller below rather than here, same "silently drop
// what isn't explicitly allowed" approach as sanitizeStyleString.
function parseWikiAttrs(header) {
  const attrs = {}
  for (const m of header.matchAll(/(\w+)="([^"]*)"/g)) attrs[m[1]] = m[2]
  return attrs
}

// div (block) and span (inline) are the only two tags {{{#!wiki tag="..."}}}
// can choose between — both are inert (no href/src/on* surface), so there's
// no XSS concern in letting the author pick between them the way real namu
// wiki does for wrapping inline content without forcing a line break.
const ALLOWED_WIKI_TAGS = new Set(['div', 'span'])
const LANG_CODE_RE = /^[a-zA-Z]{2,3}(-[a-zA-Z]{2,8})?$/
// A single CSS class name — used everywhere a class from a {{{#!style}}}
// declaration gets referenced back ({{{#!wiki class="..."}}}, <rowclass=>,
// <tableclass=>), so a stray quote or space in the source can't break out
// of the class="..." attribute it ends up interpolated into. Korean is
// allowed in both the leading and rest position (same reasoning as
// PARAM_KEY_RE below) — real namu wiki templates name classes in Korean
// just as often as they do template parameters (e.g. .태그, .수치-outer).
const CLASS_NAME_RE = /^[a-zA-Z_가-힣][\w가-힣-]*$/

// Callers pass colors both with a leading # (e.g. table <bgcolor=#fff>, where
// the # is part of the captured attribute value) and without one (e.g. the
// {{{#fff text}}} inline span, where the # is consumed by the outer regex
// match rather than the capture group) — normalize both to a single form.
function safeColorSingle(value) {
  const hex = value.replace(/^#/, '')
  if (/^[0-9a-fA-F]{3,8}$/.test(hex)) return `#${hex}`
  if (/^[a-zA-Z]{3,20}$/.test(value)) return value
  return null
}

// "값1,값2" → light-dark(값1, 값2), using the CSS function so the browser
// itself (not this parser) decides which one applies — no dark-mode JS
// needed on 결타래's end. Both halves have to pass validateSingle on
// their own; if only one does, that one's used alone rather than losing
// the color entirely (same "salvage what's safe" spirit as the rest of
// this sanitizer), and if the value has no comma at all this is just
// validateSingle(value) with nothing extra happening.
function withLightDark(value, validateSingle) {
  if (!value.includes(',')) return validateSingle(value)
  const [light, dark] = value.split(',').map((v) => v.trim())
  const safeLight = validateSingle(light)
  const safeDark = validateSingle(dark)
  if (safeLight && safeDark) return `light-dark(${safeLight}, ${safeDark})`
  return safeLight || null
}

// Table attrs (<bgcolor=...> etc.) and the inline {{{#색상}}} span both
// route through this, so "색1,색2" dual light/dark values work in both
// places for free. See withLightDark for the actual light-dark() logic.
function safeColor(value) {
  return withLightDark(value, safeColorSingle)
}

function safeLength(value) {
  if (/^\d{1,4}(px|%)?$/.test(value)) return /%|px$/.test(value) ? value : `${value}px`
  return null
}

// Turns an arbitrary anchor/heading name into something safe to use as an
// HTML id — used for both explicit [anchor(이름)] points and (via
// slugifyHeading below) headings, so a [[문서명#이름]] link can compute the
// exact same id purely from the text it's given, with no lookup needed. No
// uniqueness enforcement: two headings/anchors that happen to share the
// same name produce the same id, and a link to that name lands on whichever
// one is first in the DOM — a graceful-enough fallback for a rare case
// rather than something worth a cross-document anchor index over.
function slugifyName(name) {
  return name.replace(/[^\w가-힣-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'x'
}

// 분류:/자료:/별칭:/파일: are already stripped out of the body before this
// ever runs (분류/별칭 removed from cleanedSource, 자료/파일 consumed whole
// when alone on its own line — see parseWikiText). 틀: never collides since
// it's {{틀:...}}, curly not square brackets. This guard only matters for
// the rarer case those prefixes show up INLINE mid-sentence (not alone on a
// line) — without it they'd otherwise look like ordinary broken wikilinks
// pointing at a document literally named e.g. "자료:기술/번개펀치".
const RESERVED_LINK_PREFIX_RE = /^(분류|자료|틀|별칭|파일):/

// Pure "what does this name point at" resolution — no HTML, no DOM. Shared
// by [[문서명]]/[[문서명#제목]] wikilinks and (see renderImageBlock)
// [[파일:이름|link=...]] image links, so both agree on exactly what counts
// as a match/miss/ambiguity and neither has to re-derive it. Anything new
// that needs "turn a name into a link" later (자료 카드 링크 등) should
// reuse this instead of writing another copy of the docIndex lookup.
function resolveLinkTarget(trimmedTarget, docIndex) {
  const hashIdx = trimmedTarget.indexOf('#')
  const anchorName = hashIdx === -1 ? null : trimmedTarget.slice(hashIdx + 1).trim()
  const docPart = hashIdx === -1 ? trimmedTarget : trimmedTarget.slice(0, hashIdx).trim()

  if (anchorName && !docPart) {
    return { type: 'same-doc-anchor', anchorName, anchorSlug: slugifyName(anchorName) }
  }
  if (anchorName) {
    const anchorDocCandidates = docIndex[docPart]
    if (anchorDocCandidates?.length === 1) {
      return { type: 'anchor', doc: anchorDocCandidates[0], anchorName, anchorSlug: slugifyName(anchorName) }
    }
    // docPart didn't resolve to exactly one doc — no point remembering an
    // anchor for a document that isn't found (or is ambiguous) to jump
    // into, so fall through and resolve docPart as an ordinary doc link.
  }

  const lookupTarget = anchorName ? docPart : trimmedTarget
  const candidates = docIndex[lookupTarget]
  if (candidates?.length === 1) return { type: 'doc', doc: candidates[0] }
  if (candidates?.length > 1) return { type: 'ambiguous', target: lookupTarget, candidateCount: candidates.length }
  return { type: 'missing', target: lookupTarget }
}

// Turns a resolveLinkTarget result into HTML, wrapping whatever innerHtml
// the caller hands it — plain escaped text for a normal wikilink, or an
// <img> for an image link (see renderImageBlock) — so a link's target can
// be text or a picture with zero extra branching here. The click handling
// for every one of these classes already lives in ViewerPane.jsx's
// handleWikiContentClick; adding a new kind of linkable content never needs
// changes there as long as it renders through this function.
function renderResolvedLink(resolved, innerHtml) {
  switch (resolved.type) {
    case 'doc':
      return (
        `<a href="#" class="wiki-link" data-doc-path="${escapeHtml(resolved.doc.path)}" ` +
        `data-doc-name="${escapeHtml(resolved.doc.name)}">${innerHtml}</a>`
      )
    case 'anchor':
      return (
        `<a href="#" class="wiki-anchor-link" data-doc-path="${escapeHtml(resolved.doc.path)}" ` +
        `data-doc-name="${escapeHtml(resolved.doc.name)}" data-anchor-name="${escapeHtml(resolved.anchorSlug)}">${innerHtml}</a>`
      )
    case 'same-doc-anchor':
      return `<a href="#" class="wiki-anchor-link" data-anchor-name="${escapeHtml(resolved.anchorSlug)}">${innerHtml}</a>`
    case 'ambiguous':
      return (
        `<span class="wiki-link-ambiguous" data-doc-target="${escapeHtml(resolved.target)}" ` +
        `title="문서 ${resolved.candidateCount}개와 일치 — 클릭해서 선택">${innerHtml}</span>`
      )
    default:
      return (
        `<span class="wiki-link-missing" data-doc-target="${escapeHtml(resolved.target)}" ` +
        `title="문서가 없습니다 — 클릭해서 만들기">${innerHtml}</span>`
      )
  }
}

function applyInline(text, footnotes, docIndex = {}) {
  let out = escapeHtml(text)

  // Footnotes first, so bracket content isn't mangled by later rules. The
  // marker is a real #fn-N link (not just a styled number) so clicking it
  // jumps to the footnote list at the bottom of the document; fn-back-N on
  // the marker itself is the matching jump-back target for the "↩" link the
  // footnote list entry gets (see parseWikiText's footnote-list rendering).
  out = out.replace(/\[\*\s?([^\]]*)\]/g, (_m, content) => {
    footnotes.push(content)
    const n = footnotes.length
    return `<sup class="wiki-footnote"><a href="#fn-${n}" id="fn-back-${n}" data-footnote="${n}">${n}</a></sup>`
  })

  // [br] — explicit line break (실제 나무위키 매크로). 문단 안에 그냥 줄바꿈을 쳐서는
  // 반영이 안 됨(HTML처럼 일반 공백으로 뭉개짐 — 특히 각주([* 내용])는 한 줄로 뭉쳐 보이는
  // 게 기본이라 줄바꿈을 넣고 싶으면 이 매크로가 사실상 유일한 방법).
  out = out.replace(/\[br\]/g, '<br>')

  // [anchor(이름)] — an invisible named jump target, for [[#이름]]/
  // [[문서명#이름]] links to point at when there's no heading with that
  // exact text to land on instead (see the wikilink block below).
  out = out.replace(/\[anchor\(([^)]+)\)\]/g, (_m, name) => `<span id="anchor-${slugifyName(name.trim())}" class="wiki-anchor"></span>`)

  // Inline size: {{{+1 text}}} ~ {{{+5}}}, {{{-1}}} ~ {{{-5}}}
  out = out.replace(/\{\{\{([+-])([1-5])\s(.+?)\}\}\}/g, (_m, sign, n, content) => {
    const scale = sign === '+' ? 1 + Number(n) * 0.2 : 1 - Number(n) * 0.12
    return `<span style="font-size:${scale.toFixed(2)}em">${content}</span>`
  })

  // Inline color: {{{#글자색 text}}} or {{{#글자색,#배경색 text}}}
  out = out.replace(
    /\{\{\{#([0-9a-fA-F]{3,8}|[a-zA-Z]{3,20})(?:,#?([0-9a-fA-F]{3,8}|[a-zA-Z]{3,20}))?\s(.+?)\}\}\}/g,
    (_m, fg, bg, content) => {
      const styles = []
      const safeFg = safeColor(fg)
      if (safeFg) styles.push(`color:${safeFg}`)
      if (bg) {
        const safeBg = safeColor(bg)
        if (safeBg) styles.push(`background:${safeBg}`)
      }
      return styles.length ? `<span style="${styles.join(';')}">${content}</span>` : content
    },
  )

  // Wiki links: [[문서명]] resolves against docIndex (built in
  // useAppStore.js's rebuildIndexes from real doc names, and their
  // leading-order-number-stripped form — see lib/displayName.js — so
  // [[치고마]] finds a doc really named "0891 치고마" without the link
  // needing to spell out the number). Zero matches renders as a clickable
  // "missing" placeholder that creates the doc; more than one is ambiguous
  // and lets the reader pick. A #뒷부분 turns it into an anchor link —
  // [[#이름]] jumps within the current document, [[문서명#이름]] opens
  // 문서명 and then jumps (see resolveLinkTarget for exactly how 이름
  // matches a heading or an explicit [anchor(이름)]). All of the actual
  // matching/rendering lives in resolveLinkTarget/renderResolvedLink now —
  // this callback only has to work out the right default display text,
  // since that's the one part specific to a text link (an image link has
  // no such thing — see renderImageBlock).
  out = out.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target, label) => {
    const trimmedTarget = target.trim()
    if (RESERVED_LINK_PREFIX_RE.test(trimmedTarget)) {
      return `<span class="wiki-link-pending" title="이 문법은 그 줄에 단독으로 있어야 동작합니다">${label || target}</span>`
    }
    const resolved = resolveLinkTarget(trimmedTarget, docIndex)
    // "[[#이름]]" should read as "이름", not the hashtag-looking "#이름"
    // its literal target text would otherwise show; a resolved cross-doc
    // anchor shows "문서명#이름" (trimmedTarget) since naming which doc
    // it jumps into is useful there. Anything else (plain doc link, or an
    // anchor that couldn't resolve and fell back to a plain doc lookup)
    // uses the original untrimmed target, same as always.
    const displayText =
      resolved.type === 'same-doc-anchor'
        ? label || resolved.anchorName
        : resolved.type === 'anchor'
          ? label || trimmedTarget
          : label || target
    return renderResolvedLink(resolved, displayText)
  })

  out = out.replace(/\[br\]/g, '<br>')

  out = out.replace(/'''([^'\n]+)'''/g, '<strong>$1</strong>')
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/''([^'\n]+)''/g, '<em>$1</em>')
  out = out.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
  out = out.replace(/__([^_\n]+)__/g, '<u>$1</u>')
  out = out.replace(/~~([^~\n]+)~~/g, '<del>$1</del>')
  out = out.replace(/(?<!-)--([^-\n]+)--(?!-)/g, '<del>$1</del>')
  out = out.replace(/\^\^([^^\n]+)\^\^/g, '<sup>$1</sup>')
  out = out.replace(/,,([^,\n]+),,/g, '<sub>$1</sub>')

  return out
}

const TOC_PLACEHOLDER = '@@WIKIDESK_TOC_PLACEHOLDER@@'
const TAG_LINE_RE = /^(?:\s*#[^\s#]+)+\s*$/
const TAG_TOKEN_RE = /#([^\s#]+)/g
const HEADING_EQ_RE = /^(={1,6})[ \t]*(.+?)[ \t]*\1$/
// Same shape as HEADING_EQ_RE but anchored to real line boundaries (`m`
// flag) over the whole raw source in one pass, so matchAll's `.index` gives
// a real character offset — used only to build collectRawHeadingOffsets
// below (see its own comment for why).
const RAW_HEADING_LINE_RE = /^[ \t]*(={1,6})[ \t]*(.+?)[ \t]*\1[ \t]*$/gm
const HR_RE = /^(-{4,7})$/
// [\s\S] (not .) so a merged multi-line row (see mergeMultilineTableRows)
// still matches across its embedded newlines.
const TABLE_ROW_RE = /^\|\|([\s\S]+)\|\|$/
// Single-pipe-wrapped line (not the double-pipe ||...|| of a real row) —
// a caption placed on its own line right before or after a table block.
const TABLE_CAPTION_RE = /^\|([^|]+)\|$/
const LIST_RE = /^(\*+)\s+(.+)$/
const OLIST_RE = /^\d+\.\s+(.+)$/
const QUOTE_RE = /^(>+)\s?(.*)$/
const BLOCK_OPEN_RE = /^\{\{\{(.*)$/
const CELL_WIKI_STYLE_RE = /^\{\{\{#!wiki([^\n]*)\n([\s\S]*)\}\}\}$/

// Finds where a multi-line {{{ ... }}} block (folding/code/style) actually
// closes, starting the search at lines[fromIdx] with the caller's own {{{
// already counted as depth 1. Real namu wiki lets the closing }}} sit right
// at the end of the last content line (e.g. "__내용__}}}") instead of
// requiring it alone on its own line, and — like mergeMultilineTableRows
// already does for table cells — a nested {{{...}}} inside the body (an
// inline {{{+1 ...}}} span, another folding block, etc.) must not be
// mistaken for the outer close, so this tracks nesting depth rather than
// just scanning for a bare "}}}" line.
function findMultilineBlockEnd(lines, fromIdx) {
  let depth = 1
  for (let idx = fromIdx; idx < lines.length; idx += 1) {
    const line = lines[idx]
    let pos = 0
    while (pos < line.length) {
      if (line.startsWith('{{{', pos)) {
        depth += 1
        pos += 3
      } else if (line.startsWith('}}}', pos)) {
        depth -= 1
        pos += 3
        if (depth === 0) {
          return { endLineIdx: idx, bodyOnLastLine: line.slice(0, pos - 3), trailing: line.slice(pos) }
        }
      } else {
        pos += 1
      }
    }
  }
  return null
}

// Finds a genuine block-open `{{{` within a single line that does NOT
// close before that line ends — i.e. one that MUST continue as a
// multi-line block (folding/wiki/style/syntax) — and returns its position,
// or -1 if the line is fully balanced (every {{{ on it already has its own
// matching }}} before the line ends, the ordinary case for things like an
// inline {{{#색상 텍스트}}} span used mid-sentence). Tracks nesting depth
// the same way findMultilineBlockEnd does, so a block that itself opens
// another one on the same line (unusual, but not incorrect) still resolves
// to the OUTERMOST unclosed position — only recorded when depth is 0 right
// before that {{{, and cleared back to -1 every time depth returns to 0.
//
// Used by parseWikiText's main loop to split a line at this position (see
// its own comment) when it's not already at column 0 — real namu wiki
// recognizes a block-open like {{{#!wiki}}} anywhere on its line, but this
// parser's line array otherwise only checks position 0 (BLOCK_OPEN_RE).
// That gap is invisible for hand-written documents (nobody writes a block
// open mid-sentence), but very real for a 틀's own body once expanded: see
// expandParamsAndConditionals — removing a falsy {{{#!if}}} deletes its own
// newlines along with it, so whatever sat right before and right after it
// in the raw template source can end up butted together on one line with
// no separator at all, and a {{{#!wiki}}} that follows silently stops
// being recognized as a block at all (renders as a literal escaped code
// block instead) purely because it no longer starts a line.
function findUnclosedBlockOpen(line) {
  let depth = 0
  let openPos = -1
  let pos = 0
  while (pos < line.length) {
    if (line.startsWith('{{{', pos)) {
      if (depth === 0) openPos = pos
      depth += 1
      pos += 3
    } else if (line.startsWith('}}}', pos)) {
      if (depth > 0) depth -= 1
      if (depth === 0) openPos = -1
      pos += 3
    } else {
      pos += 1
    }
  }
  return depth > 0 ? openPos : -1
}

// Deliberately NOT position-based (it used to be `h${index}-...`) — a pure
// function of the heading's own text is what lets [[문서명#제목]] compute
// the right id without needing to know anything else about that document.
function slugifyHeading(text) {
  return `h-${slugifyName(text)}`
}

// Maps each `=제목=`-style heading to where it starts in the ORIGINAL,
// unexpanded editor text — used only so a heading's [편집] link (see the
// heading-rendering block in parseWikiText) can tell EditorPane.jsx where
// to jump the cursor. Keyed by "level:text" with the offsets in the order
// they appear, so duplicate headings (rare, but see slugifyName's own
// "first one wins" reasoning) resolve positionally as the main parse loop
// consumes them one at a time (see parseWikiText's rawHeadingOffsetCursor).
// Deliberately built from the raw, pre-expandTemplates source rather than
// the line array the main loop actually walks: a heading that came from an
// expanded {{틀:...}} call exists in that expanded text but not here at
// all, so it just gets no offset and no [편집] link renders for it —
// correct, since "jump this document's editor to it" has no right answer
// for text that actually lives in a different (template) document.
function collectRawHeadingOffsets(rawSource) {
  const offsets = new Map()
  for (const m of (rawSource ?? '').matchAll(RAW_HEADING_LINE_RE)) {
    const key = `${m[1].length}:${m[2]}`
    if (!offsets.has(key)) offsets.set(key, [])
    offsets.get(key).push(m.index)
  }
  return offsets
}

function countOccurrences(str, needle) {
  let count = 0
  let idx = 0
  while ((idx = str.indexOf(needle, idx)) !== -1) {
    count += 1
    idx += needle.length
  }
  return count
}

// Real namu wiki lets a {{{#!wiki style="..."}}} block (used for gradients,
// shadows, etc.) live INSIDE a table cell, spanning multiple physical lines
// before the row's closing `||` ever appears — e.g.
//   ||<nopad> {{{#!wiki style="background: linear-gradient(...)"
//   내용
//   }}} ||
// This collapses such a row's physical lines into one logical line (embedded
// \n and all) so the rest of the line-based parser can treat it as usual.
function mergeMultilineTableRows(lines) {
  const out = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (/^\s*\|\|/.test(line)) {
      let buffer = line
      let balance = countOccurrences(buffer, '{{{') - countOccurrences(buffer, '}}}')
      let j = i
      while (balance > 0 && j + 1 < lines.length) {
        j += 1
        buffer += `\n${lines[j]}`
        balance += countOccurrences(lines[j], '{{{') - countOccurrences(lines[j], '}}}')
      }
      out.push(buffer)
      i = j + 1
    } else {
      out.push(line)
      i += 1
    }
  }
  return out
}

function parseTableCell(raw) {
  let content = raw.trim()
  const attrs = {
    header: false,
    colspan: 1,
    rowspan: 1,
    align: null,
    bgcolor: null,
    rowbgcolor: null,
    colbgcolor: null,
    width: null,
    height: null,
    nopad: false,
    rowclass: null,
    styleBlock: null,
    tableAttrs: null,
  }

  const headerMatch = content.match(/^=([\s\S]*)=$/)
  if (headerMatch) {
    attrs.header = true
    content = headerMatch[1].trim()
  }

  // Namu wiki allows stacking multiple <...> attribute tags per cell, e.g.
  // <bgcolor=#eee><:>text — keep peeling them off until none remain.
  // table*=... tokens are conventionally written on one cell (usually the
  // first) but apply to the whole <table>, not just that cell.
  let attrMatch = content.match(/^<([^>]*)>([\s\S]*)$/)
  while (attrMatch) {
    const attrStr = attrMatch[1]
    content = attrMatch[2].trim()
    const colspan = attrStr.match(/^-(\d+)$/)
    const rowspan = attrStr.match(/^\|(\d+)$/)
    const bg = attrStr.match(/^bgcolor=(.+)$/)
    const rowbg = attrStr.match(/^rowbgcolor=(.+)$/)
    const colbg = attrStr.match(/^colbgcolor=(.+)$/)
    const width = attrStr.match(/^width=(.+)$/)
    const height = attrStr.match(/^height=(.+)$/)
    const tableBorder = attrStr.match(/^table\s*bordercolor=(.+)$/)
    const tableBg = attrStr.match(/^table\s*bgcolor=(.+)$/)
    const tableWidth = attrStr.match(/^table\s*width=(.+)$/)
    const tableAlign = attrStr.match(/^table\s*align=(left|center|right)$/)
    const tableColor = attrStr.match(/^table\s*color=(.+)$/)
    const rowClass = attrStr.match(/^rowclass=(.+)$/)
    const tableClass = attrStr.match(/^table\s*class=(.+)$/)

    if (colspan) attrs.colspan = Number(colspan[1])
    else if (rowspan) attrs.rowspan = Number(rowspan[1])
    else if (attrStr === ':') attrs.align = 'center'
    else if (attrStr === '(') attrs.align = 'left'
    else if (attrStr === ')') attrs.align = 'right'
    else if (attrStr === 'nopad') attrs.nopad = true
    else if (tableBorder) attrs.tableAttrs = { ...attrs.tableAttrs, borderColor: safeColor(tableBorder[1]) }
    else if (tableBg) attrs.tableAttrs = { ...attrs.tableAttrs, bgColor: safeColor(tableBg[1]) }
    else if (tableWidth) attrs.tableAttrs = { ...attrs.tableAttrs, width: safeLength(tableWidth[1]) }
    else if (tableAlign) attrs.tableAttrs = { ...attrs.tableAttrs, align: tableAlign[1] }
    else if (tableColor) attrs.tableAttrs = { ...attrs.tableAttrs, color: safeColor(tableColor[1]) }
    else if (rowClass && CLASS_NAME_RE.test(rowClass[1])) attrs.rowclass = rowClass[1]
    else if (tableClass && CLASS_NAME_RE.test(tableClass[1])) attrs.tableAttrs = { ...attrs.tableAttrs, class: tableClass[1] }
    else if (rowbg) attrs.rowbgcolor = safeColor(rowbg[1])
    else if (colbg) attrs.colbgcolor = safeColor(colbg[1])
    else if (bg) attrs.bgcolor = safeColor(bg[1])
    else if (width) attrs.width = safeLength(width[1])
    else if (height) attrs.height = safeLength(height[1])
    attrMatch = content.match(/^<([^>]*)>([\s\S]*)$/)
  }

  // A {{{#!wiki ...}}} block that fills the whole cell (gradients etc.) is
  // rendered as its own recursively-parsed block instead of running through
  // the normal inline formatter.
  const styleMatch = content.match(CELL_WIKI_STYLE_RE)
  if (styleMatch) {
    attrs.styleBlock = { header: styleMatch[1] || '', body: styleMatch[2] }
    content = ''
  }

  return { ...attrs, content }
}

function parseTableRow(line) {
  const match = line.match(TABLE_ROW_RE)
  if (!match) return null
  return match[1].split('||').map(parseTableCell)
}

// Shared by the top-level {{{#!wiki ...}}} block handler and a table cell's
// own embedded {{{#!wiki ...}}} (see CELL_WIKI_STYLE_RE) — same syntax,
// same attribute handling either way.
function renderWikiStyleBlock(header, body, contextIndexes) {
  const wikiAttrs = parseWikiAttrs(header)
  const safeStyle = sanitizeStyleString(wikiAttrs.style || '')
  const tag = ALLOWED_WIKI_TAGS.has(wikiAttrs.tag) ? wikiAttrs.tag : 'div'
  const langAttr = LANG_CODE_RE.test(wikiAttrs.lang || '') ? ` lang="${wikiAttrs.lang}"` : ''
  // class="..." references a class declared elsewhere via {{{#!style}}} —
  // see parseWikiText's styleDeclarations. Validated the same way <rowclass=>/
  // <tableclass=> are, since it lands straight inside a class="..." attribute.
  const safeClass = CLASS_NAME_RE.test(wikiAttrs.class || '') ? ` ${wikiAttrs.class}` : ''
  const inner = parseWikiText(body, contextIndexes)
  return `<${tag} class="wiki-style-box${safeClass}" style="${safeStyle}"${langAttr}>${inner.html}</${tag}>`
}

function renderTable(rows, footnotes, dataIndex, templateIndex, docIndex, imageIndex) {
  // table*=... attributes are conventionally written on one cell (usually
  // the first) but apply to the whole table — gather them from wherever
  // they appear before rendering any row.
  let tableAttrs = {}
  for (const row of rows) {
    for (const cell of row) {
      if (cell.tableAttrs) tableAttrs = { ...tableAttrs, ...cell.tableAttrs }
    }
  }

  // colbgcolor "falls" down a column from the cell that declares it until
  // a later row overrides it; rowbgcolor covers the whole row it's on.
  const colBg = {}

  const body = rows
    .map((cells) => {
      const rowBg = cells.map((c) => c.rowbgcolor).find(Boolean) || null
      const rowClass = cells.map((c) => c.rowclass).find(Boolean) || null
      const tds = cells
        .map((cell, ci) => {
          if (cell.colbgcolor) colBg[ci] = cell.colbgcolor
          const effectiveBg = cell.bgcolor || rowBg || colBg[ci] || null

          const tag = cell.header ? 'th' : 'td'
          const attrParts = []
          if (cell.colspan > 1) attrParts.push(`colspan="${cell.colspan}"`)
          if (cell.rowspan > 1) attrParts.push(`rowspan="${cell.rowspan}"`)
          const styleParts = []
          if (cell.align) styleParts.push(`text-align:${cell.align}`)
          if (effectiveBg) styleParts.push(`background:${effectiveBg}`)
          if (cell.width) styleParts.push(`width:${cell.width}`)
          if (cell.height) styleParts.push(`height:${cell.height}`)
          if (cell.nopad) styleParts.push('padding:0')
          if (styleParts.length) attrParts.push(`style="${styleParts.join(';')}"`)
          // A cell whose entire content is a standalone [[파일:...]] renders
          // as a real image — same rule as a top-level line (see
          // FILE_REF_LINE_RE's use in parseWikiText), just re-checked here
          // since a table cell's content never passes through that line
          // loop. Without this, an image reference inside an ordinary cell
          // (not wrapped in its own {{{#!wiki}}} block, which already works
          // via renderWikiStyleBlock's recursive parse) fell through to
          // applyInline's wikilink handling instead, which treats "파일:"
          // as a reserved prefix and just shows inert "이 문법은 그 줄에
          // 단독으로 있어야 동작합니다" text — exactly the namu wiki
          // character-template pattern of a lone image cell right under
          // the header row.
          const fileRefMatch = !cell.styleBlock && cell.content.match(FILE_REF_LINE_RE)
          const inner = cell.styleBlock
            ? renderWikiStyleBlock(cell.styleBlock.header, cell.styleBlock.body, { dataIndex, templateIndex, docIndex, imageIndex })
            : fileRefMatch
              ? renderImageBlock(fileRefMatch[1].trim(), fileRefMatch[2], imageIndex, docIndex)
              : applyInline(cell.content, footnotes, docIndex)
          return `<${tag} ${attrParts.join(' ')}>${inner}</${tag}>`
        })
        .join('')
      return rowClass ? `<tr class="${rowClass}">${tds}</tr>` : `<tr>${tds}</tr>`
    })
    .join('')

  const tableStyleParts = []
  if (tableAttrs.borderColor) tableStyleParts.push(`--wiki-table-border:${tableAttrs.borderColor}`)
  if (tableAttrs.bgColor) tableStyleParts.push(`background:${tableAttrs.bgColor}`)
  if (tableAttrs.color) tableStyleParts.push(`color:${tableAttrs.color}`)
  if (tableAttrs.width) tableStyleParts.push(`width:${tableAttrs.width}`)
  // center stays a plain centered block (no float — nothing needs to wrap
  // around a centered table). left/right actually float, same as real namu
  // wiki, so following content (a [목차], a heading, body text) flows in
  // the space beside it instead of always stacking below — that's the
  // entire point of a namu wiki character-template infobox floated next to
  // the article body. A document that wants to stop wrapping past the
  // table (namu wiki's own convention, and what its own templates use)
  // writes [clearfix] — see its handling below in parseWikiText.
  if (tableAttrs.align === 'center') tableStyleParts.push('margin:0 auto')
  else if (tableAttrs.align === 'right') tableStyleParts.push('float:right;margin:0 0 12px 16px')
  else if (tableAttrs.align === 'left') tableStyleParts.push('float:left;margin:0 16px 12px 0')
  const tableStyleAttr = tableStyleParts.length ? ` style="${tableStyleParts.join(';')}"` : ''
  const tableClassAttr = tableAttrs.class ? ` ${tableAttrs.class}` : ''

  return `<table class="wiki-table${tableClassAttr}"${tableStyleAttr}><tbody>${body}</tbody></table>`
}

function buildNestedList(items) {
  let html = ''
  const stack = []
  for (const item of items) {
    while (stack.length && stack[stack.length - 1].depth > item.depth) {
      html += `</li></${stack.pop().type}>`
    }
    const top = stack[stack.length - 1]
    if (top && top.depth === item.depth && top.type === item.type) {
      html += `</li><li>${item.html}`
    } else if (top && top.depth === item.depth) {
      html += `</li></${stack.pop().type}><${item.type}><li>${item.html}`
      stack.push({ type: item.type, depth: item.depth })
    } else {
      html += `<${item.type}><li>${item.html}`
      stack.push({ type: item.type, depth: item.depth })
    }
  }
  while (stack.length) html += `</li></${stack.pop().type}>`
  return html
}

function buildNestedQuote(items) {
  let html = ''
  let depth = 0
  for (const item of items) {
    while (depth < item.depth) {
      html += '<blockquote class="wiki-quote">'
      depth += 1
    }
    while (depth > item.depth) {
      html += '</blockquote>'
      depth -= 1
    }
    html += `<p>${item.html}</p>`
  }
  while (depth > 0) {
    html += '</blockquote>'
    depth -= 1
  }
  return html
}

const CATEGORY_LINK_RE = /\[\[분류:([^\]|]+)(?:\|([^\]]*))?\]\]/g

// Pulls every [[분류:이름]] tag out of raw source text, wherever it appears.
// Shared by the renderer (parseWikiText) and the workspace-wide category
// index (useAppStore.js), so both agree on exactly what counts as a tag.
// Membership/parent-category relationships are always keyed by this real
// name — [[분류:이름|출력명]]'s display override (see extractCategoryTags)
// only changes how the badge is labeled, never what it categorizes as.
export function extractCategories(source) {
  const categories = []
  for (const m of (source ?? '').matchAll(CATEGORY_LINK_RE)) {
    const name = m[1].trim()
    if (name) categories.push(name)
  }
  return categories
}

// Same tags, but keeping the optional [[분류:이름|출력명]] display-name
// override for rendering the badge bar — real namu wiki syntax where the
// visible label can differ from the category actually being filed under.
function extractCategoryTags(source) {
  const tags = []
  for (const m of (source ?? '').matchAll(CATEGORY_LINK_RE)) {
    const name = m[1].trim()
    if (name) tags.push({ name, label: m[2]?.trim() || name })
  }
  return tags
}

const ALIAS_TAG_RE = /\[\[별칭:([^\]|]+)\]\]/g

// [[별칭:이름]] — a search-only alternate name (e.g. "치고마" as an alias
// for "우라오스", its final evolution), 결타래's own lighter alternative
// to real namu wiki's #redirect. Deliberately NOT a real redirect/page-nav
// feature (see README's "의도적으로 제외한 문법") — it only makes the
// document easier to *find*; opening it always lands on this same document
// so edits happen in the one shared article, never a separate stub page.
// Invisible in the rendered document (stripped like 분류 tags below).
export function extractAliases(source) {
  const aliases = []
  for (const m of (source ?? '').matchAll(ALIAS_TAG_RE)) {
    const name = m[1].trim()
    if (name) aliases.push(name)
  }
  return aliases
}

// [[자료:유형/이름]] on a line by itself pulls in a data entry (기술/특성/
// etc., stored in the dedicated .wikidesk-data space) as a small info card —
// 결타래's own lighter take on namu wiki's 틀 template transclusion, built
// around the case of "define a move/ability once, reuse it on every 포켓몬
// page." Only the standalone-line form renders; inline mid-sentence use is
// left as literal text so there's exactly one place backlinks are counted
// from (see extractDataRefs).
const DATA_REF_LINE_RE = /^\[\[자료:([^/\]]+)\/([^\]|]+)(?:\|[^\]]*)?\]\]$/

export function extractDataRefs(source) {
  const refs = []
  for (const rawLine of (source ?? '').split(/\r?\n/)) {
    const m = rawLine.trim().match(DATA_REF_LINE_RE)
    if (m) refs.push({ type: m[1].trim(), name: m[2].trim() })
  }
  return refs
}

// A data entry document is just "필드: 값" lines, one per line — no fixed
// schema, so 기술 (이름/타입/위력/설명) and 특성 (이름/설명) can both use it.
export function parseDataFields(source) {
  const fields = []
  for (const rawLine of (source ?? '').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const idx = line.indexOf(':')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (key && value) fields.push([key, value])
  }
  return fields
}

function renderDataCard(type, name, dataIndex) {
  const key = `${type}/${name}`
  const entry = dataIndex?.[key]
  const safeType = escapeHtml(type)
  const safeName = escapeHtml(name)
  if (!entry?.path) {
    return (
      `<div class="data-card data-card-missing" data-type="${safeType}" data-name="${safeName}">` +
      `<span class="data-card-missing-label">[자료: ${safeType}/${safeName}] 없음 — 클릭해서 만들기</span></div>`
    )
  }
  const rows = parseDataFields(entry.rawText)
    .map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${applyInline(v, [])}</td></tr>`)
    .join('')
  return (
    `<div class="data-card" data-type="${safeType}" data-name="${safeName}">` +
    `<div class="data-card-header"><span class="data-card-type">${safeType}</span>` +
    `<span class="data-card-name">${escapeHtml(name)}</span></div>` +
    (rows ? `<table class="data-card-fields">${rows}</table>` : '') +
    `</div>`
  )
}

// [[파일:이름]] (선택적으로 [[파일:이름|너비]]) on a line by itself embeds a
// registered image. Unlike 자료/분류, there's no "reference before it
// exists" case worth supporting — an image has to actually be imported
// (via the 이미지 sidebar or the editor's 이미지 toolbar button) before
// there's anything to show, so a missing name just renders a plain notice
// rather than a clickable "만들기" placeholder like renderDataCard's.
const FILE_REF_LINE_RE = /^\[\[파일:([^\]|]+)(?:\|([^\]]*))?\]\]$/

// `|`로 나눈 나머지 조각들 중 `link=...`이면 클릭 시 이동할 대상으로,
// 아니면(기존 방식 그대로) 너비 값으로 취급 — 순서는 상관없음
// ([[파일:이름|300px|link=문서명]]이든 [[파일:이름|link=문서명|300px]]이든
// 동일하게 동작). 나무위키의 `width=30` 접두사 문법은 의도적으로 미지원 —
// 지금처럼 접두사 없는 `|300px` 형식만 너비로 인식함.
function parseFileRefParams(paramsRaw) {
  if (!paramsRaw) return { width: null, link: null }
  let width = null
  let link = null
  for (const segment of paramsRaw.split('|')) {
    const trimmed = segment.trim()
    const linkMatch = trimmed.match(/^link=(.+)$/)
    if (linkMatch) link = linkMatch[1].trim()
    else if (!width) width = safeLength(trimmed)
  }
  return { width, link }
}

// `|link=문서명` (또는 `|link=문서명#제목`)이 있으면 resolveLinkTarget/
// renderResolvedLink로 감싸 [[문서명]] 위키링크와 완전히 같은 방식으로
// 클릭 이동/앵커 이동/missing-ambiguous 표시를 재사용함 — 이미지 전용
// 클릭 처리 코드가 ViewerPane.jsx에 따로 필요 없는 이유.
function renderImageBlock(name, paramsRaw, imageIndex, docIndex) {
  const safeName = escapeHtml(name)
  const entry = imageIndex?.[name]
  const { width, link } = parseFileRefParams(paramsRaw)
  const style = width ? ` style="width:${width}"` : ''
  const imgHtml = entry?.dataUrl
    ? `<img class="wiki-image" src="${entry.dataUrl}" alt="${safeName}"${style} />`
    : `<div class="wiki-image-missing">[파일: ${safeName}] 없음 — "이미지" 공간에서 먼저 등록하세요</div>`
  if (!link) return imgHtml
  return renderResolvedLink(resolveLinkTarget(link.trim(), docIndex), imgHtml)
}

// --- Template (틀) expansion ---
//
// Runs as a plain text→text macro pass BEFORE line-based parsing, so a
// template's own block-level content (headings, tables, lists...) becomes
// real markup in the surrounding document instead of having to be stuffed
// into one inline HTML fragment. {{틀:이름|...}} and [include(이름, ...)]
// both resolve against the same 틀 space.
//
// Braces/parens are depth-counted (not just regex-matched) so a parameter
// value can itself contain a nested template call, e.g.
// {{틀:카드|내용={{틀:강조|텍스트=중요}}}}.

function findBalancedEnd(text, openIndex, openTok, closeTok) {
  let depth = 0
  let i = openIndex
  while (i < text.length) {
    if (text.startsWith(openTok, i)) {
      depth += 1
      i += openTok.length
      continue
    }
    if (text.startsWith(closeTok, i)) {
      depth -= 1
      i += closeTok.length
      if (depth === 0) return i
      continue
    }
    i += 1
  }
  return -1
}

// Splits on `sep` only at depth 0 (not inside a nested {{...}} call), so a
// parameter value containing another template call doesn't get cut in half.
function splitTopLevel(text, sep) {
  const parts = []
  let depth = 0
  let current = ''
  let i = 0
  while (i < text.length) {
    if (text.startsWith('{{', i)) {
      depth += 1
      current += '{{'
      i += 2
      continue
    }
    if (text.startsWith('}}', i)) {
      depth -= 1
      current += '}}'
      i += 2
      continue
    }
    if (text[i] === sep && depth === 0) {
      parts.push(current)
      current = ''
      i += 1
      continue
    }
    current += text[i]
    i += 1
  }
  parts.push(current)
  return parts
}

const PARAM_KEY_RE = /^[A-Za-z0-9_가-힣]+$/

// "이름|k=v|posArg" -> { name, params: {k:'v', 1:'posArg'} }. Unnamed args
// get sequential numeric keys (1, 2, ...), same as real namu wiki.
function parseCallArgs(inner, argSep) {
  const parts = splitTopLevel(inner, argSep).map((p) => p)
  const name = (parts[0] ?? '').trim()
  const params = {}
  let posIndex = 1
  for (let i = 1; i < parts.length; i += 1) {
    const part = parts[i]
    const eqIdx = part.indexOf('=')
    const key = eqIdx > 0 ? part.slice(0, eqIdx).trim() : ''
    // Real namu wiki trims both sides of a passed value (문법 도움말/심화
    // §17: "값에 좌우 공백이 제거되므로") — matters here since a multi-line
    // [include(...)] call (common for anything with more than a couple of
    // params) puts a newline right after the comma before the next key.
    if (eqIdx > 0 && PARAM_KEY_RE.test(key)) {
      params[key] = part.slice(eqIdx + 1).trim()
    } else {
      params[String(posIndex)] = part.trim()
      posIndex += 1
    }
  }
  return { name, params }
}

// {{{매개변수}}} / {{{매개변수|기본값}}} inside a template's own body. Plain
// identifiers only — {{{+1 ...}}}/{{{#색상 ...}}}/{{{#!...}}} all start with
// a non-identifier character so they never match this and keep working
// exactly as before, even inside a template.
const TEMPLATE_PARAM_RE = /\{\{\{([A-Za-z0-9_가-힣]+)(?:\|([^{}]*))?\}\}\}/g

export function substituteParams(body, params) {
  return body.replace(TEMPLATE_PARAM_RE, (whole, key, fallback) =>
    Object.prototype.hasOwnProperty.call(params, key) ? params[key] : (fallback ?? ''),
  )
}

// @매개변수@ / @매개변수=기본값@ — real namu wiki's own parameter syntax
// (나무위키:문법 도움말/심화 §17), unlike substituteParams above (which
// 결타래 had first, of uncertain authenticity, and keeps for backward
// compatibility). "기본값" only applies when the caller never mentioned
// this name at all — a param explicitly passed as empty ("이름=,") stays
// empty, matching real behavior and the "@이름=b@속성:값;" trick real
// templates use to conditionally include exactly one CSS declaration among
// many (see the header comment's Template section for why that isn't a
// separate feature of its own).
const AT_PARAM_RE = /@([A-Za-z_가-힣][A-Za-z0-9_가-힣]*)(?:=([^@]*))?@/y

// Single left-to-right pass over `text` interleaving {{{#!if 조건식}}}
// evaluation and @매개변수@ substitution, so both see the same, currently-
// mutating `variables` in the order they actually appear in the source — a
// variable an earlier {{{#!if}}} assigns needs to be visible to a LATER
// @변수@ (or another {{{#!if}}}) further down the same template body (문법
// 도움말/심화 §18.2's "이하 if 문법 선언 시에도 계속 유지됩니다"); doing "resolve
// every {{{#!if}}} first, then substitute every @@ " as two separate passes
// would get that wrong wherever the same variable's value changes partway
// through. `variables` starts as (a fresh copy of) the call's own params —
// mutated in place by assignment expressions inside {{{#!if}}} — so it
// keeps working correctly across the recursive calls this makes into a
// kept if-block's own content (findBalancedEnd's generic {{{/}}} depth
// counting treats a NESTED {{{#!if}}} exactly like any other nested triple-
// brace construct, so it's naturally captured as part of the outer block's
// raw content and gets its own independent evaluation once recursed into).
function expandParamsAndConditionals(text, variables) {
  let out = ''
  let i = 0
  while (i < text.length) {
    if (text.startsWith('{{{#!if', i) && /[\s\n]/.test(text[i + 7] ?? '\n')) {
      const lineEnd = text.indexOf('\n', i)
      const headerEnd = lineEnd === -1 ? text.length : lineEnd
      const exprSource = text.slice(i + 7, headerEnd).trim()
      const bodyStart = lineEnd === -1 ? text.length : lineEnd + 1
      const close = findBalancedEnd(text, i, '{{{', '}}}')
      if (close === -1) {
        out += text[i]
        i += 1
        continue
      }
      const content = text.slice(bodyStart, Math.max(bodyStart, close - 3))
      let shown = false
      try {
        shown = !isFalsy(evalIfStatements(parseIfExpr(tokenizeIfExpr(exprSource)), variables))
      } catch {
        shown = false
      }
      if (shown) out += expandParamsAndConditionals(content, variables)
      i = close
      continue
    }
    if (text[i] === '@') {
      AT_PARAM_RE.lastIndex = i
      const m = AT_PARAM_RE.exec(text)
      if (m && m.index === i) {
        const [, key, fallback] = m
        const has = Object.prototype.hasOwnProperty.call(variables, key)
        out += has ? toDisplayString(variables[key]) : (fallback ?? '')
        i = AT_PARAM_RE.lastIndex
        continue
      }
    }
    out += text[i]
    i += 1
  }
  return out
}

// expandTemplates runs as plain text→text substitution BEFORE the line-based
// parser (and its escapeHtml-ing applyInline pass), so injecting real HTML
// for a missing template here would just get escaped back into literal
// text. A placeholder token (same trick as TOC_PLACEHOLDER) survives that
// pass unescaped, then gets swapped for the actual <span> once at the very
// end of parseWikiText, after all HTML has been generated.
function missingTemplatePlaceholder(name) {
  return `@@WIKIDESK_TEMPLATE_MISSING:${encodeURIComponent(name)}@@`
}

function renderMissingTemplate(name) {
  return `<span class="template-missing" data-template="${escapeHtml(name)}">[틀:${escapeHtml(name)}] 없음</span>`
}

// Runs a called 틀's own body through both parameter systems — real namu
// wiki's (@매개변수@/{{{#!if}}}, see expandParamsAndConditionals) and
// 결타래's earlier one (substituteParams's {{{매개변수}}}/
// {{{매개변수|기본값}}}, kept for backward compatibility) — before the
// result gets recursively re-scanned for further {{틀:...}}/[include(...)]
// calls. { ...params } since expandParamsAndConditionals mutates its
// variables object for {{{#!if}}} assignments and this call's own params
// must not leak into a sibling or parent call's.
export function expandTemplateBody(rawText, params) {
  return substituteParams(expandParamsAndConditionals(rawText, { ...params }), params)
}

function expandTemplates(text, templateIndex, depth = 0) {
  if (!text) return text
  // Circular/self-referential templates would otherwise recurse forever.
  if (depth > 8) return text

  let result = ''
  let i = 0
  while (i < text.length) {
    if (text.startsWith('{{틀:', i)) {
      const end = findBalancedEnd(text, i, '{{', '}}')
      if (end === -1) {
        result += text[i]
        i += 1
        continue
      }
      const inner = text.slice(i + 4, end - 2)
      const { name, params } = parseCallArgs(inner, '|')
      const entry = templateIndex?.[name]
      result += entry?.rawText
        ? expandTemplates(expandTemplateBody(entry.rawText, params), templateIndex, depth + 1)
        : missingTemplatePlaceholder(name)
      i = end
      continue
    }
    if (text.startsWith('[include(', i)) {
      const openParen = i + 8
      const end = findBalancedEnd(text, openParen, '(', ')')
      if (end === -1 || text[end] !== ']') {
        result += text[i]
        i += 1
        continue
      }
      const inner = text.slice(openParen + 1, end - 1)
      const { name: rawName, params } = parseCallArgs(inner, ',')
      const name = stripTemplatePrefix(rawName)
      const entry = templateIndex?.[name]
      result += entry?.rawText
        ? expandTemplates(expandTemplateBody(entry.rawText, params), templateIndex, depth + 1)
        : missingTemplatePlaceholder(name)
      i = end + 1
      continue
    }
    result += text[i]
    i += 1
  }
  return result
}

// Which 틀 names a document actually calls, for the "이 틀을 사용하는 문서"
// backlink list — doesn't need full param-aware parsing, just the names.
const TEMPLATE_CALL_NAME_RE = /\{\{틀:([^|}]+)[|}]/g
const INCLUDE_CALL_NAME_RE = /\[include\(\s*([^,)]+)\s*[,)]/g

// [include(...)]'s target has no delimiter of its own to consume a "틀:"
// prefix the way {{틀:이름}}'s literal "{{틀:" already does — and real namu
// wiki's own page titles for templates genuinely start with "틀:", so
// pasting a real namu wiki [include(틀:이름, ...)] call verbatim (as
// opposed to typing [include(이름, ...)] by hand the 결타래-native way)
// is completely normal and needs to resolve to the same 틀 either way.
function stripTemplatePrefix(name) {
  return name.replace(/^틀:/, '')
}

export function extractTemplateRefs(source) {
  const names = new Set()
  for (const m of (source ?? '').matchAll(TEMPLATE_CALL_NAME_RE)) names.add(m[1].trim())
  for (const m of (source ?? '').matchAll(INCLUDE_CALL_NAME_RE)) names.add(stripTemplatePrefix(m[1].trim()))
  return [...names]
}

export function parseWikiText(
  source,
  { dataIndex = {}, templateIndex = {}, docIndex = {}, imageIndex = {}, editableOffsets = false } = {},
) {
  const expandedSource = expandTemplates(source ?? '', templateIndex)
  const categories = extractCategories(expandedSource)
  const categoryTags = extractCategoryTags(expandedSource)
  const cleanedSource = expandedSource.replace(CATEGORY_LINK_RE, '').replace(ALIAS_TAG_RE, '')
  const lines = mergeMultilineTableRows(cleanedSource.split(/\r?\n/))
  // Only meaningful for the real, top-level "this is literally what's in
  // the editor" call (ViewerPane.jsx's main document render passes
  // editableOffsets: true) — every recursive parseWikiText call in this
  // file (folding blocks, {{{#!wiki}}} blocks) works on an extracted
  // substring whose own start offset within the real document isn't known
  // here, so computing offsets against ITS `source` would point at the
  // wrong place if used for a jump; leaving this Map empty for those calls
  // means their headings just get no [편집] link at all instead.
  const rawHeadingOffsets = editableOffsets ? collectRawHeadingOffsets(source) : new Map()
  const rawHeadingOffsetCursor = new Map()
  const footnotes = []
  const tags = new Set()
  const toc = []
  const htmlParts = []
  // Raw bodies of every {{{#!style}}} block found anywhere in the document
  // (see the block-open handler below) — sanitized and turned into one
  // <style> tag at the very end, once everything's been collected.
  const styleDeclarations = []
  const headingCounters = [0, 0, 0, 0, 0, 0, 0] // index by heading level 1-6

  function nextHeadingNumber(level) {
    headingCounters[level] += 1
    for (let l = level + 1; l <= 6; l += 1) headingCounters[l] = 0
    return headingCounters.slice(1, level + 1).join('.')
  }

  let buffer = { kind: null, items: [] }

  const flush = () => {
    if (!buffer.kind) return
    if (buffer.kind === 'paragraph') {
      htmlParts.push(`<p>${buffer.items.join('<br>')}</p>`)
    } else if (buffer.kind === 'table') {
      htmlParts.push(renderTable(buffer.items, footnotes, dataIndex, templateIndex, docIndex, imageIndex))
    } else if (buffer.kind === 'list') {
      htmlParts.push(`<div class="wiki-list">${buildNestedList(buffer.items)}</div>`)
    } else if (buffer.kind === 'quote') {
      htmlParts.push(buildNestedQuote(buffer.items))
    }
    buffer = { kind: null, items: [] }
  }

  const setBuffer = (kind) => {
    if (buffer.kind !== kind) {
      flush()
      buffer.kind = kind
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === '') {
      flush()
      continue
    }

    // 편집기 전용 숨김 노트 — 원문(에디터)에는 그대로 남아있지만 렌더링에는
    // 전혀 나타나지 않음. `##@`는 실제 나무위키에선 편집 페이지 상단 고정
    // 표시라는 별도 UI 의미가 있는데, 결타래엔 그런 "편집 히스토리 페이지"
    // 개념 자체가 없어서 일반 `##`과 동일하게 숨기는 것만 지원함. `#단일태그`
    // 줄 감지(TAG_LINE_RE)와는 `##`가 애초에 매치되지 않아 충돌 없음.
    if (trimmed.startsWith('##')) {
      flush()
      continue
    }

    // A genuine block-open ({{{#!wiki}}} etc.) that isn't at the very start
    // of this line — see findUnclosedBlockOpen's own comment for why this
    // happens and why splitting the line here (rather than teaching every
    // check below to look mid-line) is the fix. > 0 (not >= 0) so a block
    // that's already at column 0 falls straight through to the existing
    // check right below unchanged, and re-splicing a prefix can never
    // trigger this same branch again on the next pass over it (the prefix
    // by construction has no unclosed {{{ of its own).
    const unclosedOpenPos = findUnclosedBlockOpen(line)
    if (unclosedOpenPos > 0) {
      lines.splice(i, 1, line.slice(0, unclosedOpenPos), line.slice(unclosedOpenPos))
      i -= 1
      continue
    }

    // Multi-line {{{ ... }}} block (code / folding). Only a block-open if it
    // doesn't also close on this same line (an inline {{{+1 ...}}} span does).
    const blockOpen = trimmed.match(BLOCK_OPEN_RE)
    if (blockOpen && !trimmed.includes('}}}')) {
      flush()
      const header = blockOpen[1].trim()
      const found = findMultilineBlockEnd(lines, i + 1)
      const bodyLines = found ? lines.slice(i + 1, found.endLineIdx) : lines.slice(i + 1)
      if (found) {
        if (found.bodyOnLastLine) bodyLines.push(found.bodyOnLastLine)
        // Content typed right after the closing }}} on that same line keeps
        // flowing normally — hand it back to the main loop as the next line.
        if (found.trailing.trim()) lines.splice(found.endLineIdx + 1, 0, found.trailing)
        i = found.endLineIdx
      } else {
        i = lines.length - 1
      }
      const body = bodyLines.join('\n')
      const foldingMatch = header.match(/^#!folding\s+(.+)$/)
      const isWikiStyleBlock = /^#!wiki\b/.test(header)
      const isStyleDecl = /^#!style\b/.test(header)
      const syntaxMatch = header.match(/^#!syntax\s+(\S+)/)
      if (foldingMatch) {
        const inner = parseWikiText(body, { dataIndex, templateIndex, docIndex, imageIndex })
        htmlParts.push(
          `<details class="wiki-folding"><summary>${escapeHtml(foldingMatch[1])}</summary>${inner.html}</details>`,
        )
      } else if (isWikiStyleBlock) {
        // header still has the leading "#!wiki" token, but parseWikiAttrs
        // only looks for key="value" pairs so that's harmless noise.
        htmlParts.push(renderWikiStyleBlock(header, body, { dataIndex, templateIndex, docIndex, imageIndex }))
      } else if (isStyleDecl) {
        // Renders nothing here — collected and turned into one <style> tag
        // at the very end (see the bottom of this function).
        styleDeclarations.push(body)
      } else if (syntaxMatch) {
        // No real tokenizer/highlighting (that needs a whole library, not
        // worth the bundle size for how rarely a worldbuilding wiki needs
        // to show code) — just labels the block with its language so it
        // reads as "this is code, in X" even without color highlighting.
        const lang = syntaxMatch[1].toLowerCase().replace(/[^a-z0-9+#-]/g, '')
        htmlParts.push(`<pre class="wiki-code wiki-code-syntax" data-lang="${escapeHtml(lang)}"><code>${escapeHtml(body)}</code></pre>`)
      } else {
        htmlParts.push(`<pre class="wiki-code"><code>${escapeHtml(body)}</code></pre>`)
      }
      continue
    }

    if (trimmed === '[목차]') {
      flush()
      htmlParts.push(TOC_PLACEHOLDER)
      continue
    }

    // Stops a left/right-floated table (see renderTable) from having later
    // content keep wrapping beside it — real namu wiki syntax, almost
    // always seen right after [목차] in character-template-style documents
    // that float their infobox table next to the article body.
    if (trimmed === '[clearfix]') {
      flush()
      htmlParts.push('<div class="wiki-clearfix"></div>')
      continue
    }

    const dataRefMatch = trimmed.match(DATA_REF_LINE_RE)
    if (dataRefMatch) {
      flush()
      htmlParts.push(renderDataCard(dataRefMatch[1].trim(), dataRefMatch[2].trim(), dataIndex))
      continue
    }

    const fileRefMatch = trimmed.match(FILE_REF_LINE_RE)
    if (fileRefMatch) {
      flush()
      htmlParts.push(renderImageBlock(fileRefMatch[1].trim(), fileRefMatch[2], imageIndex, docIndex))
      continue
    }

    // A caption line only counts when it's actually adjacent to a table —
    // right before one starts (top caption) or right after the table
    // buffer currently being built (bottom caption, flushed here so it
    // renders right under that table). Anywhere else it's just an ordinary
    // line someone happened to wrap in single pipes.
    const captionMatch = trimmed.match(TABLE_CAPTION_RE)
    if (captionMatch) {
      const captionHtml = applyInline(captionMatch[1].trim(), footnotes, docIndex)
      if (buffer.kind === 'table') {
        flush()
        htmlParts.push(`<div class="wiki-table-caption wiki-table-caption-bottom">${captionHtml}</div>`)
        continue
      }
      if (parseTableRow((lines[i + 1] ?? '').trim())) {
        flush()
        htmlParts.push(`<div class="wiki-table-caption wiki-table-caption-top">${captionHtml}</div>`)
        continue
      }
    }

    const tableRow = parseTableRow(trimmed)
    if (tableRow) {
      setBuffer('table')
      buffer.items.push(tableRow)
      continue
    }

    if (TAG_LINE_RE.test(line)) {
      flush()
      const lineTags = []
      for (const m of line.matchAll(TAG_TOKEN_RE)) {
        tags.add(m[1])
        lineTags.push(m[1])
      }
      const pills = lineTags.map((t) => `<span class="wiki-tag">#${escapeHtml(t)}</span>`).join(' ')
      htmlParts.push(`<div class="wiki-tag-line">${pills}</div>`)
      continue
    }

    const heading = trimmed.match(HEADING_EQ_RE)
    if (heading) {
      flush()
      const level = heading[1].length
      const text = heading[2]
      const id = slugifyHeading(text)
      const number = nextHeadingNumber(level)
      toc.push({ level, text, id, number })
      const offsetKey = `${level}:${text}`
      const offsetCursor = rawHeadingOffsetCursor.get(offsetKey) ?? 0
      const rawOffset = rawHeadingOffsets.get(offsetKey)?.[offsetCursor]
      rawHeadingOffsetCursor.set(offsetKey, offsetCursor + 1)
      const editLink =
        rawOffset === undefined
          ? ''
          : ` <a href="#" class="wiki-heading-edit-link" data-source-offset="${rawOffset}">[편집]</a>`
      htmlParts.push(
        `<h${level} id="${id}"><span class="wiki-heading-number">${number}.</span> ${applyInline(text, footnotes, docIndex)}${editLink}</h${level}>`,
      )
      continue
    }

    if (HR_RE.test(trimmed)) {
      flush()
      const weight = Math.min(trimmed.length - 3, 4)
      htmlParts.push(`<hr class="wiki-hr wiki-hr-${weight}">`)
      continue
    }

    const listMatch = trimmed.match(LIST_RE)
    if (listMatch) {
      setBuffer('list')
      buffer.items.push({ type: 'ul', depth: listMatch[1].length, html: applyInline(listMatch[2], footnotes, docIndex) })
      continue
    }

    const olistMatch = trimmed.match(OLIST_RE)
    if (olistMatch) {
      setBuffer('list')
      buffer.items.push({ type: 'ol', depth: 1, html: applyInline(olistMatch[1], footnotes, docIndex) })
      continue
    }

    const quoteMatch = trimmed.match(QUOTE_RE)
    if (quoteMatch) {
      setBuffer('quote')
      buffer.items.push({ depth: quoteMatch[1].length, html: applyInline(quoteMatch[2], footnotes, docIndex) })
      continue
    }

    // 실제 나무위키: 목록 항목 뒤에 오는, 그 자체로는 다른 어떤 문법에도 안 걸리는 줄은
    // (빈 줄로 끊기 전까지) 그 항목이 계속되는 걸로 본다 — 새 문단이 아니라 방금 그 항목의
    // 줄바꿈 이어쓰기. 그래서 항목 글자 밑으로 들여써져 보이고(<li> 기본 레이아웃), 연속된
    // 여러 줄도 전부 같은 항목에 계속 붙는다. 목록이 막 시작한 상태(buffer.kind==='list')일
    // 때만 적용 — 문단 한복판에 나무위키 문법이 아닌 줄이 있다고 목록으로 끌려들어가진 않음.
    if (buffer.kind === 'list' && buffer.items.length > 0) {
      const lastItem = buffer.items[buffer.items.length - 1]
      lastItem.html += `<br>${applyInline(line, footnotes, docIndex)}`
      continue
    }

    setBuffer('paragraph')
    buffer.items.push(applyInline(line, footnotes, docIndex))
  }

  flush()

  if (footnotes.length > 0) {
    const items = footnotes
      .map(
        (content, i) =>
          `<li id="fn-${i + 1}">${applyInline(content, [], docIndex)} ` +
          `<a class="wiki-footnote-back" href="#fn-back-${i + 1}" title="본문으로 돌아가기">↩</a></li>`,
      )
      .join('')
    htmlParts.push(`<hr class="wiki-footnote-divider"><ol class="wiki-footnote-list">${items}</ol>`)
  }

  let html = htmlParts.join('\n')

  if (styleDeclarations.length > 0) {
    const css = styleDeclarations.map(sanitizeGlobalStyleBlock).filter(Boolean).join('\n')
    // @scope with no explicit root scopes to the <style> tag's own parent —
    // here that's whatever container dangerouslySetInnerHTML'd this html
    // (.wiki-rendered, a folding block's inner html, etc.) — so a .badge
    // declared in this document can't leak into some other document's
    // rendered output sharing the same class name. Chromium's had @scope
    // since well before this Electron version, so no fallback needed.
    if (css) html = `<style>@scope {\n${css}\n}</style>\n${html}`
  }

  if (html.includes(TOC_PLACEHOLDER)) {
    const tocHtml = toc.length
      ? `<details class="wiki-toc" open><summary>목차</summary><ul>${toc
          .map(
            (h) =>
              `<li style="padding-left:${(h.level - 1) * 12}px"><a href="#${h.id}">${h.number}. ${escapeHtml(h.text)}</a></li>`,
          )
          .join('')}</ul></details>`
      : ''
    html = html.replaceAll(TOC_PLACEHOLDER, tocHtml)
  }

  if (html.includes('@@WIKIDESK_TEMPLATE_MISSING:')) {
    // decodeURIComponent throws on a malformed %-sequence — the only way
    // one reaches here is a document that happens to contain this exact
    // internal placeholder token verbatim (extremely unlikely, but typed
    // free text, not something this function controls), and an uncaught
    // throw here would take down the whole document's render, not just
    // that one piece. Falling back to the raw (still-encoded) text keeps
    // that from ever happening.
    html = html.replace(/@@WIKIDESK_TEMPLATE_MISSING:([^@]+)@@/g, (m, encoded) => {
      try {
        return renderMissingTemplate(decodeURIComponent(encoded))
      } catch {
        return renderMissingTemplate(encoded)
      }
    })
  }

  if (categoryTags.length > 0) {
    // data-category always carries the real name (what it's filed under and
    // what a click navigates to); the visible text uses the [[분류:이름|출력
    // 명]] override when given, same as real namu wiki.
    const catHtml = categoryTags
      .map(
        ({ name, label }) =>
          `<a href="#" class="wiki-category-link" data-category="${escapeHtml(name)}">${escapeHtml(label)}</a>`,
      )
      .join('')
    html += `\n<div class="wiki-category-bar">${catHtml}</div>`
  }

  return { html, footnotes, tags: [...tags], toc, categories }
}

const CHOSEONG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
]

function groupKeyFor(name) {
  const ch = (name ?? '').trim().charAt(0)
  if (!ch) return '기타'
  const code = ch.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) {
    return CHOSEONG[Math.floor((code - 0xac00) / 588)]
  }
  if (/[A-Za-z]/.test(ch)) return ch.toUpperCase()
  if (/[0-9]/.test(ch)) return '0-9'
  return '기타'
}

const GROUP_ORDER = [...CHOSEONG, ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), '0-9', '기타']

// Groups item names the way namu wiki's category page does: by initial
// Hangul 초성, then A-Z, then digits, then everything else — each group
// alphabetized (locale-aware) within itself.
export function groupByChoseong(items, nameOf = (x) => x) {
  const groups = new Map()
  for (const item of items) {
    const key = groupKeyFor(nameOf(item))
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }
  for (const list of groups.values()) {
    list.sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'ko'))
  }
  return GROUP_ORDER.filter((key) => groups.has(key)).map((key) => ({
    group: key,
    items: groups.get(key),
  }))
}
