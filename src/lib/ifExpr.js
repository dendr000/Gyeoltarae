// A genuine (large) subset of the expression language described at
// 나무위키:문법 도움말/심화 §18 ({{{#!if 조건식}}}), used by wikiParser.js to
// evaluate a template's {{{#!if ...}}} blocks. Kept in its own file since
// it's a real tokenizer/parser/evaluator, not wiki-markup parsing.
//
// Covered: literals (int/float numbers, both quote styles of string,
// true/false/null/NaN/Infinity), variables (including this.x / this['x']
// for referencing the call's own parameters), assignment (=, persisting
// across statements — see evalIfStatements), comparison (== != < <= > >=),
// logical (&& || !), arithmetic (+ - * /  %), unary (! - +), ternary
// (?:), parentheses, and ;-separated statement sequences (§18.2, §18.8).
//
// Deliberately NOT implemented (§18.5's ** and its own non-standard
// left-to-right */÷ precedence, §18.6 ++/--, §18.7 bitwise ~ << >> & | ^,
// §18.9 string methods/properties and global functions like parseInt()/
// time(), §18.10 array/object literals, §18.11 <rowif>, compound
// assignment like += / ||=, and namu's own strict int-vs-float equality
// quirk where 0 != 0.0 — numbers here are just plain JS numbers). A
// template using any of these will simply fail to parse/evaluate that
// {{{#!if}}} block and have it render as hidden (see wikiParser.js's own
// try/catch around this) rather than breaking the rest of the page.

const TOKEN_RE =
  /\s*(?:(\d+\.\d+|\d+)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|([A-Za-z_가-힣][A-Za-z0-9_가-힣]*)|(==|!=|<=|>=|&&|\|\||[=<>!?:()[\].,+\-*/%;]))/y

export function tokenizeIfExpr(src) {
  const tokens = []
  let pos = 0
  while (pos < src.length) {
    TOKEN_RE.lastIndex = pos
    const m = TOKEN_RE.exec(src)
    if (!m || m.index !== pos) break
    pos = TOKEN_RE.lastIndex
    if (m[1] !== undefined) tokens.push({ type: 'num', value: Number(m[1]) })
    else if (m[2] !== undefined) tokens.push({ type: 'str', value: m[2].slice(1, -1).replace(/\\(.)/g, '$1') })
    else if (m[3] !== undefined) tokens.push({ type: 'ident', value: m[3] })
    else if (m[4] !== undefined) tokens.push({ type: 'op', value: m[4] })
  }
  if (pos !== src.length) throw new Error(`unrecognized syntax at: ${src.slice(pos, pos + 20)}`)
  return tokens
}

// Recursive-descent, precedence climbing from loosest to tightest binding:
// ; (statement list, handled by parseIfExpr) > = (assign) > ?: (ternary) >
// || > && > ==/!= > </<=/>/>= > +/- > * / % > unary !/-/+ > .x / [x] member
// access > primary (literal/ident/this/parenthesized).
export function parseIfExpr(tokens) {
  let pos = 0
  const peek = () => tokens[pos]
  const next = () => tokens[pos++]
  const isOp = (v) => peek()?.type === 'op' && peek().value === v
  function expectOp(op) {
    if (!isOp(op)) throw new Error(`expected '${op}'`)
    next()
  }

  function parseStatementList() {
    const stmts = [parseAssignment()]
    while (isOp(';')) {
      next()
      if (pos >= tokens.length) break
      stmts.push(parseAssignment())
    }
    return stmts
  }

  function parseAssignment() {
    const left = parseTernary()
    if (isOp('=')) {
      next()
      return { type: 'assign', target: left, value: parseAssignment() }
    }
    return left
  }

  function parseTernary() {
    const cond = parseLogicalOr()
    if (isOp('?')) {
      next()
      const whenTrue = parseAssignment()
      expectOp(':')
      const whenFalse = parseAssignment()
      return { type: 'ternary', cond, whenTrue, whenFalse }
    }
    return cond
  }

  function parseBinaryLevel(next_, ops) {
    let left = next_()
    while (peek()?.type === 'op' && ops.includes(peek().value)) {
      const op = next().value
      left = { type: 'binary', op, left, right: next_() }
    }
    return left
  }

  const parseLogicalOr = () => parseBinaryLevelLogical(parseLogicalAnd, '||')
  const parseLogicalAnd = () => parseBinaryLevelLogical(parseEquality, '&&')
  function parseBinaryLevelLogical(next_, op) {
    let left = next_()
    while (isOp(op)) {
      next()
      left = { type: 'logical', op, left, right: next_() }
    }
    return left
  }

  const parseEquality = () => parseBinaryLevel(parseRelational, ['==', '!='])
  const parseRelational = () => parseBinaryLevel(parseAdditive, ['<', '<=', '>', '>='])
  const parseAdditive = () => parseBinaryLevel(parseMultiplicative, ['+', '-'])
  const parseMultiplicative = () => parseBinaryLevel(parseUnary, ['*', '/', '%'])

  function parseUnary() {
    if (isOp('!') || isOp('-') || isOp('+')) {
      const op = next().value
      return { type: 'unary', op, arg: parseUnary() }
    }
    return parseMember()
  }

  function parseMember() {
    let node = parsePrimary()
    for (;;) {
      if (isOp('.')) {
        next()
        const prop = next()
        if (!prop || prop.type !== 'ident') throw new Error('expected property name after .')
        node = { type: 'member', obj: node, prop: { type: 'lit', value: prop.value }, computed: false }
      } else if (isOp('[')) {
        next()
        const prop = parseAssignment()
        expectOp(']')
        node = { type: 'member', obj: node, prop, computed: true }
      } else break
    }
    return node
  }

  function parsePrimary() {
    const t = next()
    if (!t) throw new Error('unexpected end of expression')
    if (t.type === 'num' || t.type === 'str') return { type: 'lit', value: t.value }
    if (t.type === 'ident') {
      if (t.value === 'true') return { type: 'lit', value: true }
      if (t.value === 'false') return { type: 'lit', value: false }
      if (t.value === 'null') return { type: 'lit', value: null }
      if (t.value === 'NaN') return { type: 'lit', value: NaN }
      if (t.value === 'Infinity') return { type: 'lit', value: Infinity }
      if (t.value === 'this') return { type: 'this' }
      return { type: 'var', name: t.value }
    }
    if (t.type === 'op' && t.value === '(') {
      const expr = parseAssignment()
      expectOp(')')
      return expr
    }
    throw new Error(`unexpected token: ${JSON.stringify(t)}`)
  }

  const stmts = parseStatementList()
  if (pos !== tokens.length) throw new Error('unexpected trailing tokens')
  return stmts
}

// 0, null, "", false, NaN are falsy (§18.1); everything else (including
// Infinity, per the spec's own explicit example) is truthy.
export function isFalsy(value) {
  return value === null || value === undefined || value === false || value === 0 || value === '' || Number.isNaN(value)
}

export function toDisplayString(value) {
  if (value === null || value === undefined) return ''
  return String(value)
}

function toNumber(value) {
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (value === null || value === undefined) return 0
  const trimmed = String(value).trim()
  return trimmed === '' ? 0 : Number(trimmed)
}

// Namu's own §18 doesn't document loose cross-type coercion for ==/!=
// beyond string/number comparisons naturally arising from passing a
// number-shaped param down; this allows exactly that (a string param
// compared against a numeric literal) without pretending to replicate
// namu's separately-documented int-vs-float strict-equality quirk.
function looseEquals(a, b) {
  if (a === null || b === null) return a === b
  if (typeof a === typeof b) return a === b || (Number.isNaN(a) && Number.isNaN(b))
  if (typeof a === 'number' || typeof b === 'number') return toNumber(a) === toNumber(b)
  return false
}

const THIS_SENTINEL = { __isThis: true }

function evalNode(node, variables) {
  switch (node.type) {
    case 'lit':
      return node.value
    case 'this':
      return THIS_SENTINEL
    case 'var':
      return Object.prototype.hasOwnProperty.call(variables, node.name) ? variables[node.name] : null
    case 'member': {
      const obj = evalNode(node.obj, variables)
      if (obj !== THIS_SENTINEL) return null // no general object/array indexing in this subset
      const key = node.computed ? toDisplayString(evalNode(node.prop, variables)) : node.prop.value
      return Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : null
    }
    case 'unary': {
      const v = evalNode(node.arg, variables)
      if (node.op === '!') return isFalsy(v)
      return node.op === '-' ? -toNumber(v) : toNumber(v)
    }
    case 'binary': {
      const l = evalNode(node.left, variables)
      const r = evalNode(node.right, variables)
      switch (node.op) {
        case '==':
          return looseEquals(l, r)
        case '!=':
          return !looseEquals(l, r)
        case '<':
          return toNumber(l) < toNumber(r)
        case '<=':
          return toNumber(l) <= toNumber(r)
        case '>':
          return toNumber(l) > toNumber(r)
        case '>=':
          return toNumber(l) >= toNumber(r)
        case '+':
          return typeof l === 'string' || typeof r === 'string'
            ? toDisplayString(l) + toDisplayString(r)
            : toNumber(l) + toNumber(r)
        case '-':
          return toNumber(l) - toNumber(r)
        case '*':
          return toNumber(l) * toNumber(r)
        case '/':
          return toNumber(l) / toNumber(r)
        case '%':
          return toNumber(l) % toNumber(r)
        default:
          throw new Error(`unsupported operator: ${node.op}`)
      }
    }
    case 'logical': {
      const l = evalNode(node.left, variables)
      if (node.op === '&&') return isFalsy(l) ? l : evalNode(node.right, variables)
      return isFalsy(l) ? evalNode(node.right, variables) : l
    }
    case 'ternary': {
      const c = evalNode(node.cond, variables)
      return isFalsy(c) ? evalNode(node.whenFalse, variables) : evalNode(node.whenTrue, variables)
    }
    case 'assign': {
      const value = evalNode(node.value, variables)
      if (node.target.type === 'var') {
        variables[node.target.name] = value
        return value
      }
      // this['x'] = ... isn't a meaningful assignment target (this is a
      // read-only view of the call's own parameters) — evaluated for any
      // side effects in computing it, but the assignment itself is a no-op.
      return value
    }
    default:
      throw new Error(`unknown node type: ${node.type}`)
  }
}

// Runs every ;-separated statement in order (so assignments earlier in the
// list are visible to later ones — §18.2/§18.8), mutating `variables` in
// place, and returns the LAST statement's value as the overall
// condition (matching how a real language's comma/sequence expression
// resolves — and how §18.11's rowif example, which is a sequence of pure
// assignments with no trailing condition of its own, still makes sense).
export function evalIfStatements(stmts, variables) {
  let result = null
  for (const stmt of stmts) result = evalNode(stmt, variables)
  return result
}
