// Copyright (c) dendr000. MIT License.

// Go 상용구 — 키워드, 내장 함수·자료형, 표준 라이브러리 패키지와 자주 쓰는 함수, 자주 쓰는 틀.
// 들여쓰기는 gofmt 와 같게 탭이다.
import { languagePack, t, words } from './common.js'

const KEYWORDS = words(`
  break case chan const continue default defer else fallthrough for func go goto if import interface map package
  range return select struct switch type var true false nil iota
`)

const BUILTINS = words(`
  bool byte complex64 complex128 error float32 float64 int int8 int16 int32 int64 rune string uint uint8 uint16
  uint32 uint64 uintptr any comparable append cap clear close complex copy delete imag len make max min new
  panic print println real recover
`)

const PACKAGES = words(`
  fmt os io bufio strings strconv bytes errors math sort time sync context log regexp unicode utf8 reflect
  net http json encoding filepath path ioutil flag testing runtime atomic rand big signal exec url template
  slices maps cmp slog embed
  Println Printf Sprintf Sprint Sprintln Fprintf Fprintln Errorf Scan Scanln Scanf Fscan NewReader NewWriter
  NewScanner Scan Text Buffer ReadString ReadLine WriteString Flush Stdin Stdout Stderr Args Exit Getenv
  ReadFile WriteFile Open Create OpenFile Close Remove Mkdir MkdirAll Stat IsNotExist
  Contains HasPrefix HasSuffix Split Join Trim TrimSpace Replace ReplaceAll ToUpper ToLower Fields Index Repeat
  Builder Itoa Atoi ParseInt ParseFloat ParseBool FormatInt Quote
  Sqrt Pow Abs Floor Ceil Max Min MaxInt MinInt Inf Pi
  Sort Ints Strings Slice SliceStable Search Reverse
  Now Since Sleep Duration Second Millisecond Minute Hour After Tick NewTimer NewTicker Format Unix
  Mutex RWMutex WaitGroup Once Lock Unlock Add Done Wait Background WithCancel WithTimeout WithValue
  New Is As Unwrap Join Fatal Fatalf Panic
  ListenAndServe HandleFunc Handle ResponseWriter Request Get Post NewRequest Client Server StatusOK
  Marshal Unmarshal NewDecoder NewEncoder MarshalIndent
  main init
`)

const TEMPLATES = [
  t('gomain', 'package main', '', 'import "fmt"', '', 'func main() {', '\t{#}', '}'),
  t('mainfn', 'func main() {', '\t{#}', '}'),
  t('initfn', 'func init() {', '\t{#}', '}'),
  t('gopkg', 'package {#}'),
  t('goimp', 'import (', '\t"fmt"', '\t"{#}"', ')'),
  t('fmtp', 'fmt.Println({#})'),
  t('fmtf', 'fmt.Printf("{#}\\n")'),
  t('fmtv', 'fmt.Printf("%v\\n", {#})'),
  t('fmtpp', 'fmt.Printf("%+v\\n", {#})'),
  t('fmts', 'fmt.Sprintf("{#}")'),
  t('fmte', 'fmt.Errorf("{#}: %w", err)'),
  t('fori', 'for i := 0; i < {#}; i++ {', '\t', '}'),
  t('forj', 'for j := 0; j < {#}; j++ {', '\t', '}'),
  t('forr', 'for i := range {#} {', '\t', '}'),
  t('forrv', 'for i, v := range {#} {', '\t', '}'),
  t('forkv', 'for k, v := range {#} {', '\t', '}'),
  t('forw', 'for {#} {', '\t', '}'),
  t('fore', 'for {', '\t{#}', '}'),
  t('ifb', 'if {#} {', '\t', '}'),
  t('ifelse', 'if {#} {', '\t', '} else {', '\t', '}'),
  t('iferr', 'if err != nil {', '\t{#}', '}'),
  t('iferrr', 'if err != nil {', '\treturn err', '}'),
  t('iferrf', 'if err != nil {', '\tlog.Fatal(err)', '}'),
  t('ifok', 'if v, ok := {#}[key]; ok {', '\t', '}'),
  t('swch', 'switch {#} {', 'case 1:', '\t', 'default:', '\t', '}'),
  t('swtype', 'switch v := {#}.(type) {', 'case int:', '\t', 'case string:', '\t', 'default:', '\t', '}'),
  t('selct', 'select {', 'case v := <-{#}:', '\t', 'case <-time.After(time.Second):', '\t', 'default:', '}'),
  t('funcd', 'func {#}() {', '\t', '}'),
  t('funcr', 'func {#}(a, b int) int {', '\treturn a + b', '}'),
  t('funce', 'func {#}() error {', '\treturn nil', '}'),
  t('funcm', 'func (r *Receiver) {#}() {', '\t', '}'),
  t('funcl', 'func({#}) {', '\t', '}'),
  t('gofunc', 'go func() {', '\t{#}', '}()'),
  t('deferf', 'defer func() {', '\t{#}', '}()'),
  t('deferc', 'defer {#}.Close()'),
  t('recoverf', 'defer func() {', '\tif r := recover(); r != nil {', '\t\tfmt.Println("recovered:", r)', '\t}', '}()'),
  t('structd', 'type {#} struct {', '\tName string', '\tAge  int', '}'),
  t('structj', 'type {#} struct {', '\tID   int    `json:"id"`', '\tName string `json:"name"`', '}'),
  t('ifaced', 'type {#} interface {', '\t', '}'),
  t('typed', 'type {#} int'),
  t('constd', 'const (', '\t{#} = iota', '\t', ')'),
  t('vard', 'var (', '\t{#} int', ')'),
  t('mapm', '{#} := make(map[string]int)'),
  t('slicem', '{#} := make([]int, 0)'),
  t('chanm', '{#} := make(chan int)'),
  t('chanb', '{#} := make(chan int, 10)'),
  t('newp', '{#} := &Type{}'),
  t('errn', 'errors.New("{#}")'),
  t('wgrp', 'var wg sync.WaitGroup', 'wg.Add(1)', 'go func() {', '\tdefer wg.Done()', '\t{#}', '}()', 'wg.Wait()'),
  t('muxl', 'mu.Lock()', 'defer mu.Unlock()', '{#}'),
  t('ctxto', 'ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)', 'defer cancel()', '{#}'),
  t('scanin', 'scanner := bufio.NewScanner(os.Stdin)', 'for scanner.Scan() {', '\tline := scanner.Text()', '\t{#}', '}'),
  t('readin', 'reader := bufio.NewReader(os.Stdin)', 'text, _ := reader.ReadString(\'\\n\')', '{#}'),
  t('readf', 'data, err := os.ReadFile("{#}")', 'if err != nil {', '\treturn err', '}'),
  t('writef', 'err := os.WriteFile("{#}", data, 0644)', 'if err != nil {', '\treturn err', '}'),
  t('openf', 'f, err := os.Open("{#}")', 'if err != nil {', '\treturn err', '}', 'defer f.Close()'),
  t('jsonm', 'data, err := json.Marshal({#})'),
  t('jsonu', 'err := json.Unmarshal(data, &{#})'),
  t('httph', 'http.HandleFunc("/{#}", func(w http.ResponseWriter, r *http.Request) {', '\tfmt.Fprintln(w, "ok")', '})', 'log.Fatal(http.ListenAndServe(":8080", nil))'),
  t('httpg', 'resp, err := http.Get("{#}")', 'if err != nil {', '\treturn err', '}', 'defer resp.Body.Close()'),
  t('testf', 'func Test{#}(t *testing.T) {', '\t', '}'),
  t('benchf', 'func Benchmark{#}(b *testing.B) {', '\tfor i := 0; i < b.N; i++ {', '\t\t', '\t}', '}'),
  t('sortsl', 'sort.Slice({#}, func(i, j int) bool {', '\treturn a[i] < a[j]', '})'),
  t('timen', 'start := time.Now()', '{#}', 'fmt.Println(time.Since(start))'),
  t('logf', 'log.Printf("{#}")'),
]

export const GO_PACK = languagePack({
  folder: 'Go',
  description: 'Go — 키워드·내장·표준 라이브러리·틀',
  keywords: [...KEYWORDS, ...BUILTINS, ...PACKAGES],
  templates: TEMPLATES,
  first: [
    'func', 'return', 'if', 'else', 'for', 'range', 'var', 'const', 'type', 'struct', 'interface', 'package',
    'import', 'go', 'defer', 'chan', 'select', 'switch', 'case', 'map', 'make', 'len', 'append', 'nil', 'true',
    'false', 'error', 'string', 'int', 'bool', 'fmt', 'Println', 'Printf', 'err', 'iferr', 'gomain', 'fori',
  ],
})
