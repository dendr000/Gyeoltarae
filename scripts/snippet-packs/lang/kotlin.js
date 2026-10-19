// Copyright (c) dendr000. MIT License.

// Kotlin 상용구 — 키워드, 표준 라이브러리, 컬렉션·코루틴 함수, 안드로이드 기본 이름, 자주 쓰는 틀.
import { languagePack, t, words } from './common.js'

const KEYWORDS = words(`
  abstract actual annotation as break by catch class companion const constructor continue crossinline data
  do dynamic else enum expect external false final finally for fun get if import in infix init inline inner
  interface internal is it lateinit lazy noinline null object open operator out override package private
  protected public reified return sealed set super suspend tailrec this throw true try typealias typeof val
  value var vararg when where while
`)

const API = words(`
  Any Unit Nothing String Int Long Short Byte Double Float Boolean Char Number Array IntArray LongArray
  DoubleArray BooleanArray CharArray List MutableList Set MutableSet Map MutableMap Collection Iterable
  Sequence Pair Triple Result Regex Comparable Comparator Lazy Function Throwable Exception RuntimeException
  IllegalArgumentException IllegalStateException NullPointerException IndexOutOfBoundsException
  NoSuchElementException NumberFormatException UnsupportedOperationException
  println print readLine readln listOf mutableListOf arrayListOf setOf mutableSetOf mapOf mutableMapOf
  hashMapOf arrayOf intArrayOf emptyList emptyMap emptySet buildList buildMap buildString sequenceOf
  lazy check require requireNotNull checkNotNull error TODO repeat run let also apply with takeIf takeUnless
  use synchronized assert to until downTo step rangeTo
  size length isEmpty isNotEmpty isNullOrEmpty isNullOrBlank orEmpty first last firstOrNull lastOrNull single
  get getOrNull getOrElse getOrDefault contains containsKey indices lastIndex add addAll remove removeAt
  removeIf clear forEach forEachIndexed map mapIndexed mapNotNull flatMap filter filterNot filterNotNull
  filterIsInstance find findLast any all none count sum sumOf average max min maxOrNull minOrNull maxBy
  minBy maxOf minOf sorted sortedBy sortedByDescending sortedDescending sortBy sortByDescending reversed
  distinct distinctBy groupBy associate associateBy associateWith partition zip unzip take takeLast drop
  dropLast chunked windowed fold reduce joinToString toList toMutableList toSet toMap toTypedArray
  substring split trim replace startsWith endsWith toInt toLong toDouble toIntOrNull toDoubleOrNull
  toString uppercase lowercase capitalize padStart padEnd repeat format
  launch async await runBlocking withContext delay Dispatchers CoroutineScope Job Deferred Flow flow
  emit collect StateFlow MutableStateFlow SharedFlow viewModelScope lifecycleScope suspendCoroutine
  Activity AppCompatActivity Fragment View ViewModel LiveData MutableLiveData Context Intent Bundle
  onCreate onStart onResume onPause onStop onDestroy onCreateView setContentView findViewById Log
  Toast RecyclerView Adapter ViewHolder Composable remember mutableStateOf LaunchedEffect Modifier
  Column Row Box Text Button Scaffold LazyColumn Surface MaterialTheme
  main args
`)

const ANNOTATIONS = [
  '@Override', '@JvmStatic', '@JvmField', '@JvmOverloads', '@Suppress', '@Deprecated', '@Composable',
  '@Preview', '@Test', '@Inject', '@HiltViewModel', '@Entity', '@Dao', '@Serializable',
]

const TEMPLATES = [
  t('ktmain', 'fun main() {', '    {#}', '}'),
  t('ktmainargs', 'fun main(args: Array<String>) {', '    {#}', '}'),
  t('ktp', 'println({#})'),
  t('ktps', 'println("{#}")'),
  t('ktpt', 'println("$' + '{#}")'),
  t('ktread', 'val input = readLine() ?: ""', '{#}'),
  t('ktreadn', 'val n = readLine()!!.toInt()', '{#}'),
  t('funk', 'fun {#}() {', '    ', '}'),
  t('funr', 'fun {#}(a: Int, b: Int): Int {', '    return a + b', '}'),
  t('funex', 'fun {#}(a: Int, b: Int) = a + b'),
  t('funext', 'fun String.{#}(): String {', '    return this', '}'),
  t('funsus', 'suspend fun {#}() {', '    ', '}'),
  t('funinl', 'inline fun <reified T> {#}() {', '    ', '}'),
  t('fungen', 'fun <T> {#}(value: T): T {', '    return value', '}'),
  t('valk', 'val {#} = '),
  t('vark', 'var {#} = '),
  t('valt', 'val {#}: String = '),
  t('lazyv', 'val {#} by lazy {', '    ', '}'),
  t('lateinitv', 'private lateinit var {#}: String'),
  t('fori', 'for (i in 0 until {#}) {', '    ', '}'),
  t('forr', 'for (i in 1..{#}) {', '    ', '}'),
  t('fordown', 'for (i in {#} downTo 0) {', '    ', '}'),
  t('fore', 'for ((index, item) in {#}.withIndex()) {', '    ', '}'),
  t('forin', 'for (item in {#}) {', '    ', '}'),
  t('forkv', 'for ((key, value) in {#}) {', '    ', '}'),
  t('whilel', 'while ({#}) {', '    ', '}'),
  t('ifb', 'if ({#}) {', '    ', '}'),
  t('ifelse', 'if ({#}) {', '    ', '} else {', '    ', '}'),
  t('ifexpr', 'val result = if ({#}) "" else ""'),
  t('whenk', 'when ({#}) {', '    1 -> ', '    else -> ', '}'),
  t('whenx', 'val result = when {', '    {#} -> ', '    else -> ', '}'),
  t('trycatch', 'try {', '    {#}', '} catch (e: Exception) {', '    e.printStackTrace()', '}'),
  t('tryfin', 'try {', '    {#}', '} catch (e: Exception) {', '    e.printStackTrace()', '} finally {', '    ', '}'),
  t('thrw', 'throw IllegalArgumentException("{#}")'),
  t('classk', 'class {#} {', '    ', '}'),
  t('classp', 'class {#}(val name: String, var age: Int) {', '    ', '}'),
  t('dataclass', 'data class {#}(val id: Int, val name: String)'),
  t('objectk', 'object {#} {', '    ', '}'),
  t('compan', 'companion object {', '    {#}', '}'),
  t('interf', 'interface {#} {', '    ', '}'),
  t('enumk', 'enum class {#} {', '    A, B, C', '}'),
  t('sealedk', 'sealed class {#} {', '    data class Success(val data: String) : Result()', '    object Loading : Result()', '}'),
  t('abstractk', 'abstract class {#} {', '    abstract fun run()', '}'),
  t('initb', 'init {', '    {#}', '}'),
  t('ctor2', 'constructor({#}) : this() {', '    ', '}'),
  t('overr', 'override fun {#}() {', '    ', '}'),
  t('tostrk', 'override fun toString(): String {', '    return "{#}"', '}'),
  t('getk', 'val {#}: Int', '    get() = field'),
  t('lambdak', '{ {#} -> }'),
  t('listk', 'val list = mutableListOf<{#}>()'),
  t('mapk', 'val map = mutableMapOf<String, {#}>()'),
  t('mapf', '{#}.map { it }'),
  t('filterf', '{#}.filter { it }'),
  t('foreachf', '{#}.forEach { println(it) }'),
  t('letk', '{#}?.let {', '    ', '}'),
  t('applyk', '{#}.apply {', '    ', '}'),
  t('alsok', '{#}.also {', '    ', '}'),
  t('runk', 'run {', '    {#}', '}'),
  t('elvis', '{#} ?: return'),
  t('nonnull', '{#}!!'),
  t('safecall', '{#}?.'),
  t('rbk', 'runBlocking {', '    {#}', '}'),
  t('launchk', 'launch {', '    {#}', '}'),
  t('asyncd', 'val deferred = async {', '    {#}', '}', 'val result = deferred.await()'),
  t('withctx', 'withContext(Dispatchers.IO) {', '    {#}', '}'),
  t('flowk', 'flow {', '    emit({#})', '}'),
  t('composable', '@Composable', 'fun {#}() {', '    ', '}'),
  t('textc', 'Text(text = "{#}")'),
  t('columnc', 'Column {', '    {#}', '}'),
  t('rowc', 'Row {', '    {#}', '}'),
  t('remem', 'var {#} by remember { mutableStateOf("") }'),
  t('oncreate', 'override fun onCreate(savedInstanceState: Bundle?) {', '    super.onCreate(savedInstanceState)', '    {#}', '}'),
  t('logd', 'Log.d("TAG", "{#}")'),
  t('toastk', 'Toast.makeText(this, "{#}", Toast.LENGTH_SHORT).show()'),
  t('testk', '@Test', 'fun {#}() {', '    ', '}'),
]

export const KOTLIN_PACK = languagePack({
  folder: 'Kotlin',
  description: 'Kotlin — 키워드·표준 라이브러리·코루틴·틀',
  keywords: [...KEYWORDS, ...API, ...ANNOTATIONS],
  templates: TEMPLATES,
  first: [
    'fun', 'val', 'var', 'class', 'return', 'if', 'else', 'for', 'while', 'when', 'in', 'is', 'as', 'null', 'true',
    'false', 'this', 'object', 'interface', 'override', 'private', 'public', 'open', 'data', 'import', 'package',
    'println', 'String', 'Int', 'Boolean', 'List', 'listOf', 'mutableListOf', 'map', 'filter', 'forEach',
    'ktmain', 'fori', 'dataclass',
    'do', 'break', 'continue', 'throw', 'try', 'catch', 'finally', 'companion', 'init', 'constructor', 'abstract', 'sealed', 'enum', 'inline', 'lateinit', 'lazy', 'by', 'out', 'vararg', 'typealias', 'suspend', 'internal', 'protected', 'const', 'operator', 'infix', 'Unit', 'Any', 'Nothing', 'Char', 'Long', 'Double', 'Float', 'Short', 'Byte', 'Array', 'Set', 'Map', 'MutableList', 'MutableMap', 'Pair', 'Sequence', 'Result', 'print', 'readLine', 'setOf', 'mapOf', 'arrayOf', 'emptyList', 'size', 'isEmpty', 'isNotEmpty', 'first', 'last', 'add', 'remove', 'contains', 'get', 'let', 'apply', 'also', 'run', 'with', 'takeIf', 'joinToString', 'toString', 'toInt', 'toList', 'sorted', 'sortedBy', 'groupBy', 'launch', 'async', 'delay', 'runBlocking', 'Dispatchers', 'Flow', 'Composable',
  ],
})
