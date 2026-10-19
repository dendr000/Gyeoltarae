// Copyright (c) dendr000. MIT License.

// Rust 상용구 — 키워드, 자료형, 표준 라이브러리, 매크로, 어트리뷰트, 자주 쓰는 틀.
import { languagePack, t, words } from './common.js'

const KEYWORDS = words(`
  as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move
  mut pub ref return self Self static struct super trait true type union unsafe use where while
  abstract become box do final macro override priv typeof unsized virtual yield try gen
`)

const TYPES_AND_API = words(`
  i8 i16 i32 i64 i128 isize u8 u16 u32 u64 u128 usize f32 f64 bool char str String Vec Option Result Box Rc Arc
  RefCell Cell Mutex RwLock Cow Pin HashMap HashSet BTreeMap BTreeSet VecDeque BinaryHeap LinkedList
  Some None Ok Err Default Debug Display Clone Copy PartialEq Eq PartialOrd Ord Hash Iterator IntoIterator
  From Into TryFrom TryInto AsRef AsMut Drop Fn FnMut FnOnce Send Sync Sized Unpin ToString FromStr Error
  std core alloc prelude collections fmt io fs env process thread sync mpsc time path net ops cmp iter mem
  str string vec option result rc cell borrow convert default hash marker num ptr slice
  new with_capacity push pop insert remove get get_mut contains contains_key entry or_insert or_default
  len is_empty clear iter iter_mut into_iter keys values drain extend append truncate retain sort sort_by
  sort_by_key sort_unstable dedup reverse first last split_at chunks windows concat join
  map filter filter_map flat_map fold collect sum product count min max min_by_key max_by_key rev enumerate
  zip skip take take_while skip_while step_by chain cloned copied peekable any all find position last nth
  unwrap expect unwrap_or unwrap_or_else unwrap_or_default ok_or ok_or_else map_err and_then or_else is_some
  is_none is_ok is_err as_ref as_mut take replace
  to_string to_owned to_lowercase to_uppercase as_str chars bytes lines split trim parse starts_with ends_with
  format_args read_line read_to_string stdin stdout stderr flush lock write_all
  spawn join sleep channel send recv Duration Instant SystemTime now elapsed
  main lib
`)

const MACROS = [
  'println!', 'print!', 'eprintln!', 'eprint!', 'format!', 'write!', 'writeln!', 'vec!', 'panic!', 'assert!',
  'assert_eq!', 'assert_ne!', 'debug_assert!', 'unreachable!', 'unimplemented!', 'todo!', 'matches!', 'dbg!',
  'include_str!', 'env!', 'concat!', 'stringify!', 'cfg!', 'macro_rules!', 'thread_local!', 'format_args!',
]

const ATTRIBUTES = [
  '#[derive(Debug)]', '#[derive(Clone)]', '#[derive(Debug, Clone)]', '#[derive(Debug, Clone, PartialEq)]',
  '#[derive(Default)]', '#[derive(Serialize, Deserialize)]', '#[allow(dead_code)]', '#[allow(unused)]',
  '#[test]', '#[cfg(test)]', '#[inline]', '#[must_use]', '#[tokio::main]', '#[macro_use]', '#![allow(unused)]',
]

const TEMPLATES = [
  t('rsmain', 'fn main() {', '    {#}', '}'),
  t('rsmainr', 'fn main() -> Result<(), Box<dyn std::error::Error>> {', '    {#}', '    Ok(())', '}'),
  t('rsmaina', '#[tokio::main]', 'async fn main() {', '    {#}', '}'),
  t('pln', 'println!("{#}");'),
  t('plnv', 'println!("{}", {#});'),
  t('plnd', 'println!("{:?}", {#});'),
  t('plnp', 'println!("{:#?}", {#});'),
  t('fmtm', 'format!("{#}")'),
  t('usestd', 'use std::{#};'),
  t('usecol', 'use std::collections::HashMap;'),
  t('useio', 'use std::io::{self, Read, Write};'),
  t('fnr', 'fn {#}() {', '    ', '}'),
  t('fnret', 'fn {#}(a: i32, b: i32) -> i32 {', '    a + b', '}'),
  t('fnpub', 'pub fn {#}() {', '    ', '}'),
  t('fnres', 'fn {#}() -> Result<(), String> {', '    Ok(())', '}'),
  t('fnopt', 'fn {#}() -> Option<i32> {', '    None', '}'),
  t('fnasync', 'async fn {#}() {', '    ', '}'),
  t('fngen', 'fn {#}<T: std::fmt::Debug>(value: T) {', '    println!("{:?}", value);', '}'),
  t('fnlife', "fn {#}<'a>(x: &'a str) -> &'a str {", '    x', '}'),
  t('closure', '|{#}| {', '    ', '}'),
  t('letr', 'let {#} = ;'),
  t('letm', 'let mut {#} = ;'),
  t('lett', 'let {#}: i32 = 0;'),
  t('lets', 'let {#} = String::new();'),
  t('letv', 'let mut {#}: Vec<i32> = Vec::new();'),
  t('lethm', 'let mut {#}: HashMap<String, i32> = HashMap::new();'),
  t('letinp', 'let mut input = String::new();', 'io::stdin().read_line(&mut input).expect("읽기 실패");', 'let {#} = input.trim();'),
  t('letparse', 'let {#}: i32 = input.trim().parse().unwrap();'),
  t('fori', 'for i in 0..{#} {', '    ', '}'),
  t('forri', 'for i in 0..={#} {', '    ', '}'),
  t('forin', 'for item in {#} {', '    ', '}'),
  t('forit', 'for item in {#}.iter() {', '    ', '}'),
  t('foren', 'for (i, item) in {#}.iter().enumerate() {', '    ', '}'),
  t('forkv', 'for (key, value) in &{#} {', '    ', '}'),
  t('whilel', 'while {#} {', '    ', '}'),
  t('whilelet', 'while let Some(x) = {#}.pop() {', '    ', '}'),
  t('loopl', 'loop {', '    {#}', '    break;', '}'),
  t('ifb', 'if {#} {', '    ', '}'),
  t('ifelse', 'if {#} {', '    ', '} else {', '    ', '}'),
  t('iflet', 'if let Some(x) = {#} {', '    ', '}'),
  t('letelse', 'let Some(x) = {#} else {', '    return;', '};'),
  t('matchr', 'match {#} {', '    Some(x) => x,', '    None => ,', '}'),
  t('matchres', 'match {#} {', '    Ok(v) => v,', '    Err(e) => ,', '}'),
  t('matchn', 'match {#} {', '    0 => ,', '    1..=9 => ,', '    _ => ,', '}'),
  t('structr', 'struct {#} {', '    name: String,', '    age: u32,', '}'),
  t('structp', 'pub struct {#} {', '    pub name: String,', '}'),
  t('structt', 'struct {#}(i32, i32);'),
  t('enumr', 'enum {#} {', '    A,', '    B(i32),', '    C { x: i32 },', '}'),
  t('implr', 'impl {#} {', '    pub fn new() -> Self {', '        Self {}', '    }', '}'),
  t('impltr', 'impl Trait for {#} {', '    ', '}'),
  t('traitr', 'trait {#} {', '    fn run(&self);', '}'),
  t('impldisp', 'impl std::fmt::Display for {#} {', '    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {', '        write!(f, "")', '    }', '}'),
  t('implfrom', 'impl From<Other> for {#} {', '    fn from(value: Other) -> Self {', '        Self {}', '    }', '}'),
  t('impldef', 'impl Default for {#} {', '    fn default() -> Self {', '        Self {}', '    }', '}'),
  t('moddecl', 'mod {#};'),
  t('modb', 'mod {#} {', '    ', '}'),
  t('modtest', '#[cfg(test)]', 'mod tests {', '    use super::*;', '', '    #[test]', '    fn {#}() {', '        assert_eq!(1, 1);', '    }', '}'),
  t('testr', '#[test]', 'fn {#}() {', '    assert_eq!(1, 1);', '}'),
  t('derived', '#[derive(Debug, Clone, PartialEq)]'),
  t('boxn', 'Box::new({#})'),
  t('rcn', 'Rc::new(RefCell::new({#}))'),
  t('arcm', 'Arc::new(Mutex::new({#}))'),
  t('mutl', 'let mut guard = {#}.lock().unwrap();'),
  t('thrs', 'let handle = std::thread::spawn(move || {', '    {#}', '});', 'handle.join().unwrap();'),
  t('chnl', 'let (tx, rx) = std::sync::mpsc::channel();'),
  t('readf', 'let contents = std::fs::read_to_string("{#}")?;'),
  t('writef', 'std::fs::write("{#}", contents)?;'),
  t('quest', '{#}?'),
  t('unwr', '{#}.unwrap()'),
  t('expct', '{#}.expect("")'),
  t('collectv', '.collect::<Vec<_>>(){#}'),
  t('macror', 'macro_rules! {#} {', '    () => {};', '}'),
  t('cargodep', '[dependencies]', '{#} = "1"'),
]

export const RUST_PACK = languagePack({
  folder: 'Rust',
  description: 'Rust — 키워드·표준 라이브러리·매크로·틀',
  keywords: [...KEYWORDS, ...TYPES_AND_API, ...MACROS, ...ATTRIBUTES],
  templates: TEMPLATES,
  first: [
    'fn', 'let', 'mut', 'pub', 'struct', 'enum', 'impl', 'trait', 'use', 'mod', 'return', 'if', 'else', 'for', 'while',
    'loop', 'match', 'in', 'self', 'Self', 'true', 'false', 'String', 'Vec', 'Option', 'Result', 'Some', 'None',
    'Ok', 'Err', 'i32', 'u32', 'usize', 'bool', 'println!', 'unwrap', 'rsmain', 'fori', 'pln',
  ],
})
