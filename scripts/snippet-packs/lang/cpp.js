// Copyright (c) dendr000. MIT License.

// C++ 상용구 — 키워드, 전처리기, 표준 라이브러리 이름, 자주 쓰는 틀. 공통 규칙은 common.js.
import { languagePack, t, words } from './common.js'

const KEYWORDS = words(`
  alignas alignof and and_eq asm auto bitand bitor bool break case catch char char8_t char16_t char32_t class
  compl concept const consteval constexpr constinit const_cast continue co_await co_return co_yield decltype
  default delete do double dynamic_cast else enum explicit export extern false final float for friend goto if
  inline int long mutable namespace new noexcept not not_eq nullptr operator or or_eq override private
  protected public register reinterpret_cast requires return short signed sizeof static static_assert
  static_cast struct switch template this thread_local throw true try typedef typeid typename union unsigned
  using virtual void volatile wchar_t while xor xor_eq
`)

const PREPROCESSOR = [
  '#include', '#define', '#undef', '#ifdef', '#ifndef', '#if', '#elif', '#else', '#endif', '#pragma once',
  '#pragma', '#error', '#line', 'defined', '__cplusplus', '__FILE__', '__LINE__', '__func__', 'NULL',
]

// 헤더 이름(#include <...> 안에 쓰는 것)
const HEADERS = words(`
  iostream fstream sstream iomanip string string_view vector array list forward_list deque stack queue map
  unordered_map set unordered_set bitset tuple utility algorithm numeric functional iterator memory
  optional variant any span chrono thread mutex condition_variable atomic future cmath cstdio cstdlib
  cstring cctype climits cfloat ctime cstdint cassert limits random regex filesystem initializer_list
  type_traits exception stdexcept typeinfo ratio complex valarray bits/stdc++.h
`)

const TYPES_AND_STD = words(`
  size_t ptrdiff_t int8_t int16_t int32_t int64_t uint8_t uint16_t uint32_t uint64_t intptr_t nullptr_t
  string wstring string_view vector array list deque stack queue priority_queue map multimap unordered_map
  set multiset unordered_set bitset pair tuple optional variant any span shared_ptr unique_ptr weak_ptr
  function reference_wrapper thread mutex recursive_mutex lock_guard unique_lock scoped_lock
  condition_variable atomic future promise async chrono duration time_point steady_clock system_clock
  istream ostream ifstream ofstream stringstream istringstream ostringstream iterator
  exception runtime_error logic_error invalid_argument out_of_range length_error bad_alloc
  cout cin cerr clog endl flush ws getline setw setfill setprecision fixed scientific boolalpha hex dec oct
  make_shared make_unique make_pair make_tuple make_optional move forward swap tie get ref cref
  begin end cbegin cend rbegin rend next prev advance distance
  sort stable_sort partial_sort nth_element find find_if find_if_not count count_if accumulate reduce
  reverse rotate shuffle unique lower_bound upper_bound equal_range binary_search min max minmax
  min_element max_element next_permutation prev_permutation iota fill fill_n copy copy_if copy_n transform
  for_each any_of all_of none_of remove remove_if replace replace_if merge includes
  set_union set_intersection set_difference lexicographical_compare is_sorted partition
  push_back pop_back push_front pop_front emplace emplace_back emplace_front insert erase clear resize
  reserve capacity shrink_to_fit size length empty front back at data assign append substr compare
  find_first_of find_last_of c_str first second top push pop swap contains count
  to_string stoi stol stoll stoul stof stod stold abs fabs sqrt pow exp log log10 sin cos tan atan atan2
  floor ceil round trunc fmod hypot gcd lcm rand srand RAND_MAX INT_MAX INT_MIN LLONG_MAX LLONG_MIN UINT_MAX
  numeric_limits mt19937 random_device uniform_int_distribution uniform_real_distribution
  printf scanf sprintf snprintf fprintf puts gets fgets fopen fclose fread fwrite
  malloc calloc realloc free memset memcpy memmove memcmp strlen strcmp strncmp strcpy strncpy strcat strchr strstr
  exit atexit abort assert static_assert nullopt monostate
  isalpha isdigit isalnum isspace isupper islower toupper tolower
`)

const TEMPLATES = [
  t('cppbase', '#include <iostream>', 'using namespace std;', '', 'int main() {', '    {#}', '    return 0;', '}'),
  t('cppps', '#include <bits/stdc++.h>', 'using namespace std;', '', 'int main() {', '    ios::sync_with_stdio(false);', '    cin.tie(nullptr);', '    {#}', '    return 0;', '}'),
  t('mainfn', 'int main() {', '    {#}', '    return 0;', '}'),
  t('mainargs', 'int main(int argc, char* argv[]) {', '    {#}', '    return 0;', '}'),
  t('incio', '#include <iostream>'),
  t('incvec', '#include <vector>'),
  t('incstr', '#include <string>'),
  t('incalg', '#include <algorithm>'),
  t('incmem', '#include <memory>'),
  t('incfs', '#include <fstream>'),
  t('usestd', 'using namespace std;'),
  t('guard', '#pragma once'),
  t('guardif', '#ifndef NAME_H', '#define NAME_H', '', '{#}', '', '#endif  // NAME_H'),
  t('fori', 'for (int i = 0; i < {#}; i++) {', '    ', '}'),
  t('forj', 'for (int j = 0; j < {#}; j++) {', '    ', '}'),
  t('forrev', 'for (int i = {#}; i >= 0; i--) {', '    ', '}'),
  t('forsz', 'for (size_t i = 0; i < {#}.size(); i++) {', '    ', '}'),
  t('forrange', 'for (auto& x : {#}) {', '    ', '}'),
  t('forcr', 'for (const auto& x : {#}) {', '    ', '}'),
  t('forit', 'for (auto it = v.begin(); it != v.end(); ++it) {', '    {#}', '}'),
  t('forpair', 'for (const auto& [key, value] : {#}) {', '    ', '}'),
  t('whilel', 'while ({#}) {', '    ', '}'),
  t('dowhl', 'do {', '    {#}', '} while ();'),
  t('ifb', 'if ({#}) {', '    ', '}'),
  t('ifelse', 'if ({#}) {', '    ', '} else {', '    ', '}'),
  t('elseif', 'else if ({#}) {', '    ', '}'),
  t('swch', 'switch ({#}) {', 'case 0:', '    break;', 'default:', '    break;', '}'),
  t('trycatch', 'try {', '    {#}', '} catch (const std::exception& e) {', '    std::cerr << e.what() << std::endl;', '}'),
  t('catchall', 'catch (...) {', '    {#}', '}'),
  t('funcdef', 'int {#}() {', '    return 0;', '}'),
  t('voidfn', 'void {#}() {', '    ', '}'),
  t('autofn', 'auto {#}() -> int {', '    ', '}'),
  t('lambda', '[&]({#}) {', '    ', '}'),
  t('lambdac', '[=]({#}) {', '    ', '}'),
  t('cls', 'class {#} {', 'public:', '    ();', '    ~();', '', 'private:', '    ', '};'),
  t('classh', 'class {#} {', 'public:', '    ', '', 'private:', '    ', '};'),
  t('structd', 'struct {#} {', '    ', '};'),
  t('enumc', 'enum class {#} {', '    ', '};'),
  t('nsp', 'namespace {#} {', '', '}  // namespace'),
  t('ctor', '{#}() = default;'),
  t('dtor', 'virtual ~{#}() = default;'),
  t('opeq', 'bool operator==(const {#}& other) const {', '    return ;', '}'),
  t('opout', 'friend std::ostream& operator<<(std::ostream& os, const {#}& v) {', '    return os;', '}'),
  t('tmplfn', 'template <typename T>', 'T {#}(T a, T b) {', '    return a;', '}'),
  t('tmplcls', 'template <typename T>', 'class {#} {', 'public:', '    ', '};'),
  t('uptr', 'std::unique_ptr<{#}> p = std::make_unique<>();'),
  t('sptr', 'std::shared_ptr<{#}> p = std::make_shared<>();'),
  t('vecint', 'vector<int> {#};'),
  t('vecvec', 'vector<vector<int>> {#};'),
  t('mapis', 'map<int, string> {#};'),
  t('umap', 'unordered_map<string, int> {#};'),
  t('pii', 'pair<int, int> {#};'),
  t('sortl', 'sort(v.begin(), v.end());{#}'),
  t('sortcmp', 'sort(v.begin(), v.end(), [](const auto& a, const auto& b) {', '    return {#}a < b;', '});'),
  t('cinn', 'cin >> {#};'),
  t('coutl', 'cout << {#} << endl;'),
  t('couts', 'cout << "{#}" << endl;'),
  t('getln', 'getline(cin, {#});'),
  t('readn', 'int n;', 'cin >> n;', '{#}'),
  t('ifsin', 'ifstream in("{#}");', 'if (!in) {', '    cerr << "open failed" << endl;', '    return 1;', '}'),
  t('ofsout', 'ofstream out("{#}");'),
  t('thrd', 'std::thread t([&]() {', '    {#}', '});', 't.join();'),
  t('lockg', 'std::lock_guard<std::mutex> lock({#});'),
  t('chronot', 'auto start = std::chrono::steady_clock::now();', '{#}', 'auto end = std::chrono::steady_clock::now();', 'auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();'),
  t('randgen', 'std::mt19937 rng(std::random_device{}());', 'std::uniform_int_distribution<int> dist(1, {#});'),
  t('constexprv', 'constexpr int {#} = 0;'),
  t('staticassert', 'static_assert({#}, "message");'),
  t('mainret', 'return 0;'),
]

export const CPP_PACK = languagePack({
  folder: 'C++',
  description: 'C++ — 키워드·전처리기·표준 라이브러리·틀',
  keywords: [...KEYWORDS, ...PREPROCESSOR, ...HEADERS, ...TYPES_AND_STD],
  templates: TEMPLATES,
  first: [
    'include', '#include', 'int', 'return', 'for', 'while', 'if', 'else', 'void', 'class', 'struct', 'public',
    'private', 'const', 'auto', 'string', 'vector', 'cout', 'cin', 'endl', 'std', 'namespace', 'using', 'template',
    'typename', 'static', 'new', 'delete', 'true', 'false', 'nullptr', 'size_t', 'map', 'sort',
    'cppbase', 'fori', 'forrange', 'mainfn',
    'do', 'break', 'continue', 'switch', 'case', 'default', 'inline', 'virtual', 'override', 'final', 'explicit', 'friend', 'operator', 'enum', 'union', 'typedef', 'this', 'throw', 'try', 'catch', 'noexcept', 'constexpr', 'volatile', 'bool', 'char', 'short', 'long', 'float', 'double', 'unsigned', 'signed', 'wchar_t', 'int8_t', 'int16_t', 'int32_t', 'int64_t', 'uint8_t', 'uint32_t', 'uint64_t', 'pair', 'tuple', 'set', 'unordered_map', 'unordered_set', 'queue', 'stack', 'deque', 'list', 'array', 'string_view', 'shared_ptr', 'unique_ptr', 'make_unique', 'make_shared', 'push_back', 'pop_back', 'emplace_back', 'size', 'empty', 'begin', 'end', 'find', 'insert', 'erase', 'clear', 'front', 'back', 'first', 'second', 'swap', 'move', 'min', 'max', 'abs', 'reverse', 'getline', 'printf', 'scanf', 'puts', 'memset', 'strlen', 'fixed', 'setprecision', 'nullptr_t', 'iostream', 'algorithm', 'cmath', 'cstdio', 'cstdlib', 'cstring', 'bits/stdc++.h', 'INT_MAX', 'INT_MIN', 'LLONG_MAX',
  ],
})
