// Copyright (c) dendr000. MIT License.

// JavaScript 상용구 — 키워드, 내장 객체, 배열·문자열 메서드, DOM·브라우저 API, Node.js, 자주 쓰는 틀.
import { calls, languagePack, t, words } from './common.js'

const KEYWORDS = words(`
  async await break case catch class const continue debugger default delete do else export extends false
  finally for from function if import in instanceof let new null of return static super switch this throw
  true try typeof undefined var void while with yield get set as
`)

const BUILTINS = words(`
  Object Array String Number Boolean Symbol BigInt Function Date Math JSON RegExp Error TypeError RangeError
  SyntaxError ReferenceError Promise Map Set WeakMap WeakSet Proxy Reflect Intl Buffer URL URLSearchParams
  Uint8Array Int32Array Float64Array ArrayBuffer DataView TextEncoder TextDecoder AbortController
  globalThis window document navigator location history localStorage sessionStorage console process
  require module exports __dirname __filename setTimeout setInterval clearTimeout clearInterval
  setImmediate queueMicrotask requestAnimationFrame cancelAnimationFrame structuredClone fetch alert confirm
  prompt parseInt parseFloat isNaN isFinite encodeURIComponent decodeURIComponent encodeURI decodeURI
  NaN Infinity
`)

const METHODS = words(`
  push pop shift unshift splice slice concat join reverse sort indexOf lastIndexOf includes find findIndex
  findLast findLastIndex filter map flatMap flat forEach reduce reduceRight some every fill from isArray of
  at entries keys values length
  charAt charCodeAt codePointAt substring substr split trim trimStart trimEnd padStart padEnd repeat replace
  replaceAll startsWith endsWith match matchAll search toUpperCase toLowerCase localeCompare normalize
  toFixed toString toLocaleString toISOString valueOf isInteger isSafeInteger parseFloat
  assign freeze seal create defineProperty getPrototypeOf fromEntries hasOwnProperty
  floor ceil round trunc abs max min pow sqrt random sign PI E
  parse stringify then catch finally resolve reject all allSettled race any
  get set has delete clear add size
  getTime getFullYear getMonth getDate getDay getHours getMinutes getSeconds now toDateString
  log error warn info debug table dir time timeEnd assert group groupEnd
  preventDefault stopPropagation target currentTarget addEventListener removeEventListener dispatchEvent
  querySelector querySelectorAll getElementById getElementsByClassName getElementsByTagName createElement
  appendChild removeChild append prepend remove replaceWith insertBefore insertAdjacentHTML cloneNode
  classList add remove toggle contains setAttribute getAttribute removeAttribute dataset style innerHTML
  innerText textContent value checked disabled children parentElement parentNode firstChild lastChild
  nextElementSibling previousElementSibling closest matches focus blur click submit reset scrollIntoView
  getBoundingClientRect offsetWidth offsetHeight clientWidth clientHeight scrollTop scrollHeight
  getItem setItem removeItem
  readFile writeFile readFileSync writeFileSync existsSync mkdirSync readdirSync join resolve basename dirname
  extname createServer listen on emit once
`)

const EVENTS = words(`
  click dblclick change input submit keydown keyup keypress mousedown mouseup mousemove mouseover mouseout
  mouseenter mouseleave focus blur scroll resize load DOMContentLoaded beforeunload unload touchstart
  touchend touchmove dragstart dragover drop contextmenu wheel hashchange popstate storage message
`)

// 이름 뒤에 괄호가 붙어 나오는 항목 — `alert` 를 고르면 괄호까지 들어가고 커서는 괄호 안에 선다(common.js 의 calls).
const CALLS = calls({
  end: '',
  statements: words(`
    alert setTimeout setInterval clearTimeout clearInterval addEventListener removeEventListener appendChild removeChild
  `),
  expressions: words(`
    confirm prompt parseInt parseFloat isNaN isFinite fetch require querySelector querySelectorAll getElementById getElementsByClassName getElementsByTagName createElement setAttribute getAttribute encodeURIComponent decodeURIComponent stringify includes indexOf startsWith endsWith padStart padEnd toFixed slice splice concat join split replace replaceAll forEach reduce findIndex
  `),
  noArgs: words(`
    preventDefault stopPropagation toUpperCase toLowerCase
  `),
})

const TEMPLATES = [
  t('arrowf', 'const {#} = () => {', '    ', '}'),
  t('arrowp', 'const {#} = (a, b) => a + b'),
  t('funcd', 'function {#}() {', '    ', '}'),
  t('afunc', 'async function {#}() {', '    ', '}'),
  t('aarrow', 'const {#} = async () => {', '    ', '}'),
  t('iife', '(() => {', '    {#}', '})()'),
  t('fori', 'for (let i = 0; i < {#}; i++) {', '  ', '}'),
  t('forj', 'for (let j = 0; j < {#}; j++) {', '  ', '}'),
  t('forlen', 'for (let i = 0; i < {#}.length; i++) {', '  ', '}'),
  t('forof', 'for (const item of {#}) {', '  ', '}'),
  t('forin', 'for (const key in {#}) {', '  ', '}'),
  t('forent', 'for (const [key, value] of Object.entries({#})) {', '  ', '}'),
  t('foreach', '{#}.forEach((item) => {', '  ', '})'),
  t('whilel', 'while ({#}) {', '  ', '}'),
  t('ifb', 'if ({#}) {', '  ', '}'),
  t('ifelse', 'if ({#}) {', '  ', '} else {', '  ', '}'),
  t('swch', 'switch ({#}) {', '  case 1:', '    break', '  default:', '    break', '}'),
  t('trycatch', 'try {', '  {#}', '} catch (error) {', '  console.error(error)', '}'),
  t('tryfin', 'try {', '  {#}', '} catch (error) {', '  console.error(error)', '} finally {', '  ', '}'),
  t('thrw', 'throw new Error("{#}")'),
  t('clg', 'console.log({#})'),
  t('clgs', "console.log('{#}')"),
  t('clge', 'console.error({#})'),
  t('clgt', 'console.table({#})'),
  t('cls', 'class {#} {', '  constructor() {', '    ', '  }', '}'),
  t('clsx', 'class {#} extends Base {', '  constructor() {', '    super()', '  }', '}'),
  t('ctorj', 'constructor({#}) {', '  ', '}'),
  t('getj', 'get {#}() {', '  return ', '}'),
  t('impd', "import {#} from ''"),
  t('impn', "import { {#} } from ''"),
  t('impall', "import * as {#} from ''"),
  t('expd', 'export default {#}'),
  t('expn', 'export const {#} = '),
  t('expf', 'export function {#}() {', '  ', '}'),
  t('requ', "const {#} = require('')"),
  t('modexp', 'module.exports = {#}'),
  t('promise', 'new Promise((resolve, reject) => {', '  {#}', '})'),
  t('thenc', '{#}.then((res) => {', '  ', '}).catch((err) => {', '  console.error(err)', '})'),
  t('fetchj', 'const res = await fetch("{#}")', 'const data = await res.json()'),
  t('fetchp', 'const res = await fetch("{#}", {', '  method: "POST",', '  headers: { "Content-Type": "application/json" },', '  body: JSON.stringify({}),', '})', 'const data = await res.json()'),
  t('fetchtc', 'try {', '  const res = await fetch("{#}")', '  if (!res.ok) throw new Error(res.status)', '  const data = await res.json()', '} catch (error) {', '  console.error(error)', '}'),
  t('timeout', 'setTimeout(() => {', '  {#}', '}, 1000)'),
  t('interval', 'setInterval(() => {', '  {#}', '}, 1000)'),
  t('sleep', 'const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))'),
  t('qs', 'document.querySelector("{#}")'),
  t('qsa', 'document.querySelectorAll("{#}")'),
  t('gid', 'document.getElementById("{#}")'),
  t('addel', '{#}.addEventListener("click", (e) => {', '  ', '})'),
  t('domload', 'document.addEventListener("DOMContentLoaded", () => {', '  {#}', '})'),
  t('creel', 'const el = document.createElement("{#}")'),
  t('lsset', 'localStorage.setItem("{#}", JSON.stringify())'),
  t('lsget', 'JSON.parse(localStorage.getItem("{#}"))'),
  t('mapf', '{#}.map((item) => item)'),
  t('filterf', '{#}.filter((item) => item)'),
  t('reducef', '{#}.reduce((acc, cur) => acc + cur, 0)'),
  t('findf', '{#}.find((item) => item)'),
  t('sortf', '{#}.sort((a, b) => a - b)'),
  t('destr', 'const { {#} } = obj'),
  t('destra', 'const [{#}] = arr'),
  t('spreadj', '[...{#}]'),
  t('tmpl', '`${{#}}`'),
  t('optch', '{#}?.value ?? ""'),
  t('jsonp', 'JSON.parse({#})'),
  t('jsons', 'JSON.stringify({#}, null, 2)'),
  t('uniq', '[...new Set({#})]'),
  t('exprs', 'const express = require("express")', 'const app = express()', '', 'app.get("/", (req, res) => {', '  res.send("{#}")', '})', '', 'app.listen(3000)'),
  t('usest', 'const [{#}, set] = useState()'),
  t('useef', 'useEffect(() => {', '  {#}', '}, [])'),
  t('reactc', 'export default function {#}() {', '  return (', '    <div></div>', '  )', '}'),
]

export const JAVASCRIPT_PACK = languagePack({
  folder: 'JavaScript',
  description: 'JavaScript — 키워드·내장 객체·DOM·Node.js·틀',
  keywords: [...KEYWORDS, ...BUILTINS, ...METHODS, ...EVENTS],
  calls: CALLS,
  templates: TEMPLATES,
  first: [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'new', 'this', 'import',
    'export', 'default', 'async', 'await', 'try', 'catch', 'true', 'false', 'null', 'undefined', 'console',
    'document', 'window', 'length', 'push', 'map', 'filter', 'forEach', 'then', 'JSON', 'Promise', 'Math',
    'clg', 'arrowf', 'fori', 'forof',
    'do', 'switch', 'case', 'break', 'continue', 'finally', 'throw', 'delete', 'typeof', 'instanceof', 'in', 'of', 'yield', 'extends', 'super', 'static', 'get', 'set', 'NaN', 'Infinity', 'from', 'require', 'module', 'exports', 'log', 'error', 'warn', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'Map', 'Set', 'Symbol', 'RegExp', 'Error', 'parseInt', 'parseFloat', 'isNaN', 'pop', 'shift', 'unshift', 'slice', 'splice', 'concat', 'join', 'indexOf', 'includes', 'find', 'findIndex', 'reduce', 'some', 'every', 'sort', 'reverse', 'keys', 'values', 'entries', 'assign', 'freeze', 'split', 'trim', 'replace', 'match', 'toString', 'toFixed', 'getElementById', 'querySelector', 'querySelectorAll', 'addEventListener', 'createElement', 'appendChild', 'innerHTML', 'textContent', 'classList', 'style', 'setAttribute', 'fetch', 'resolve', 'reject', 'setTimeout', 'setInterval', 'localStorage',
  ],
})
