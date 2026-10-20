// Copyright (c) dendr000. MIT License.

// Java 상용구 — 키워드, 자료형, 표준 라이브러리(java.lang·java.util·java.io·java.time 등), 자주 쓰는 틀.
import { calls, languagePack, t, words } from './common.js'

const KEYWORDS = words(`
  abstract assert boolean break byte case catch char class const continue default do double else enum extends
  final finally float for goto if implements import instanceof int interface long native new package private
  protected public return short static strictfp super switch synchronized this throw throws transient try void
  volatile while true false null var record sealed permits non-sealed yield module requires exports
`)

const TYPES_AND_API = words(`
  Object String StringBuilder StringBuffer CharSequence Character Integer Long Short Byte Double Float Boolean
  Number Math System Runtime Thread Runnable Callable Iterable Comparable Comparator Cloneable AutoCloseable
  Void Enum Record Class ClassLoader Process ProcessBuilder StackTraceElement
  List ArrayList LinkedList Vector Stack Queue Deque ArrayDeque PriorityQueue Set HashSet LinkedHashSet TreeSet
  Map HashMap LinkedHashMap TreeMap Hashtable ConcurrentHashMap EnumMap Collection Collections Arrays Objects
  Iterator ListIterator Optional OptionalInt Stream IntStream LongStream DoubleStream Collectors Scanner Random
  UUID Date Calendar StringTokenizer BitSet Properties Locale Currency Timer TimerTask
  LocalDate LocalTime LocalDateTime ZonedDateTime Instant Duration Period DateTimeFormatter ChronoUnit ZoneId
  File Files Path Paths InputStream OutputStream Reader Writer BufferedReader BufferedWriter InputStreamReader
  OutputStreamWriter FileReader FileWriter FileInputStream FileOutputStream PrintWriter PrintStream
  ByteArrayInputStream ByteArrayOutputStream ObjectInputStream ObjectOutputStream Serializable StreamTokenizer
  Exception RuntimeException Error Throwable IOException FileNotFoundException IllegalArgumentException
  IllegalStateException NullPointerException ArrayIndexOutOfBoundsException IndexOutOfBoundsException
  ClassCastException NumberFormatException ArithmeticException UnsupportedOperationException
  ConcurrentModificationException InterruptedException CloneNotSupportedException NoSuchElementException
  Override Deprecated SuppressWarnings FunctionalInterface SafeVarargs
  Function BiFunction Supplier Consumer BiConsumer Predicate BiPredicate UnaryOperator BinaryOperator
  ExecutorService Executors Future CompletableFuture TimeUnit AtomicInteger AtomicLong ReentrantLock
  CountDownLatch Semaphore ConcurrentLinkedQueue BlockingQueue LinkedBlockingQueue
  Connection DriverManager PreparedStatement Statement ResultSet SQLException DataSource
  length charAt substring indexOf lastIndexOf equals equalsIgnoreCase compareTo contains startsWith endsWith
  isEmpty isBlank trim strip split replace replaceAll toUpperCase toLowerCase toCharArray valueOf format
  join concat repeat matches hashCode toString getClass append insert reverse deleteCharAt setCharAt
  add addAll remove removeIf get set size clear put putIfAbsent getOrDefault containsKey containsValue keySet
  values entrySet getKey getValue forEach stream filter map flatMap sorted distinct limit skip reduce collect
  toList toSet toMap groupingBy counting joining mapToInt mapToObj sum average max min count anyMatch allMatch
  noneMatch findFirst findAny orElse orElseGet orElseThrow ifPresent isPresent of ofNullable empty
  parseInt parseLong parseDouble parseBoolean MAX_VALUE MIN_VALUE abs pow sqrt floor ceil round random
  currentTimeMillis nanoTime arraycopy exit getProperty getenv println print printf err in out
  nextInt nextLine nextDouble hasNext hasNextInt next readLine close flush write read sort fill asList copyOf
  copyOfRange binarySearch deepToString equals hash requireNonNull isNull nonNull
  start run join sleep interrupt currentThread notify notifyAll wait submit shutdown
  main args this super
`)

const ANNOTATIONS = [
  '@Override', '@Deprecated', '@SuppressWarnings', '@FunctionalInterface', '@SafeVarargs',
  '@Test', '@BeforeEach', '@AfterEach', '@Autowired', '@Component', '@Service', '@Repository', '@Controller',
  '@RestController', '@RequestMapping', '@GetMapping', '@PostMapping', '@PutMapping', '@DeleteMapping',
  '@PathVariable', '@RequestParam', '@RequestBody', '@ResponseBody', '@Bean', '@Configuration', '@Entity',
  '@Id', '@GeneratedValue', '@Column', '@Table', '@Transactional', '@Getter', '@Setter', '@Data',
]

// 이름 뒤에 괄호가 붙어 나오는 항목 — `println` 를 고르면 괄호까지 들어가고 커서는 괄호 안에 선다(common.js 의 calls).
const CALLS = calls({
  end: ';',
  statements: words(`
    println printf print sleep arraycopy
  `),
  expressions: words(`
    parseInt parseLong parseDouble parseBoolean valueOf charAt substring indexOf lastIndexOf equals equalsIgnoreCase compareTo startsWith endsWith containsKey containsValue getOrDefault nextInt nextLong nextDouble requireNonNull asList copyOf copyOfRange
  `),
  noArgs: words(`
    isEmpty hashCode toString toCharArray toUpperCase toLowerCase trim strip isBlank getClass intValue doubleValue longValue hasNext hasNextInt hasNextLine nextLine readLine currentTimeMillis nanoTime isPresent getKey getValue keySet entrySet printStackTrace
  `),
})

const TEMPLATES = [
  t('jmain', 'public class Main {', '    public static void main(String[] args) {', '        {#}', '    }', '}'),
  t('psvm', 'public static void main(String[] args) {', '    {#}', '}'),
  t('sout', 'System.out.println({#});'),
  t('soutv', 'System.out.println("{#}");'),
  t('soutf', 'System.out.printf("{#}%n");'),
  t('serr', 'System.err.println({#});'),
  t('jpkg', 'package {#};'),
  t('jimpl', 'import java.util.*;', 'import java.io.*;'),
  t('fori', 'for (int i = 0; i < {#}; i++) {', '    ', '}'),
  t('forj', 'for (int j = 0; j < {#}; j++) {', '    ', '}'),
  t('forrev', 'for (int i = {#}; i >= 0; i--) {', '    ', '}'),
  t('fore', 'for (String s : {#}) {', '    ', '}'),
  t('foreach', 'for (var item : {#}) {', '    ', '}'),
  t('forlen', 'for (int i = 0; i < {#}.length; i++) {', '    ', '}'),
  t('forsz', 'for (int i = 0; i < {#}.size(); i++) {', '    ', '}'),
  t('whilel', 'while ({#}) {', '    ', '}'),
  t('dowhl', 'do {', '    {#}', '} while ();'),
  t('ifb', 'if ({#}) {', '    ', '}'),
  t('ifelse', 'if ({#}) {', '    ', '} else {', '    ', '}'),
  t('elseif', 'else if ({#}) {', '    ', '}'),
  t('swch', 'switch ({#}) {', '    case 1:', '        break;', '    default:', '        break;', '}'),
  t('swexpr', 'var result = switch ({#}) {', '    case 1 -> "";', '    default -> "";', '};'),
  t('trycatch', 'try {', '    {#}', '} catch (Exception e) {', '    e.printStackTrace();', '}'),
  t('tryfin', 'try {', '    {#}', '} catch (Exception e) {', '    e.printStackTrace();', '} finally {', '    ', '}'),
  t('tryres', 'try (var br = new BufferedReader(new FileReader("{#}"))) {', '    String line;', '    while ((line = br.readLine()) != null) {', '        ', '    }', '} catch (IOException e) {', '    e.printStackTrace();', '}'),
  t('thrw', 'throw new IllegalArgumentException("{#}");'),
  t('jclass', 'public class {#} {', '    ', '}'),
  t('jclassx', 'public class {#} extends  implements  {', '    ', '}'),
  t('jiface', 'public interface {#} {', '    ', '}'),
  t('jenum', 'public enum {#} {', '    A, B, C', '}'),
  t('jrecord', 'public record {#}(int id, String name) {}'),
  t('jabstract', 'public abstract class {#} {', '    ', '}'),
  t('jctor', 'public {#}() {', '    ', '}'),
  t('jfield', 'private {#} name;'),
  t('jget', 'public String getName() {', '    return name;', '}'),
  t('jset', 'public void setName(String name) {', '    this.name = name;', '}'),
  t('jmethod', 'public {#} method() {', '    ', '}'),
  t('jstatic', 'public static {#} method() {', '    ', '}'),
  t('jtostr', '@Override', 'public String toString() {', '    return "{#}";', '}'),
  t('jequals', '@Override', 'public boolean equals(Object o) {', '    if (this == o) return true;', '    if (o == null || getClass() != o.getClass()) return false;', '    {#}', '}'),
  t('jhash', '@Override', 'public int hashCode() {', '    return Objects.hash({#});', '}'),
  t('jsingle', 'private static final {#} INSTANCE = new ();', 'private () {}', 'public static  getInstance() {', '    return INSTANCE;', '}'),
  t('jconst', 'private static final {#} NAME = ;'),
  t('jlist', 'List<{#}> list = new ArrayList<>();'),
  t('jmap', 'Map<String, {#}> map = new HashMap<>();'),
  t('jsetc', 'Set<{#}> set = new HashSet<>();'),
  t('jlistof', 'List<{#}> list = List.of();'),
  t('jscan', 'Scanner sc = new Scanner(System.in);', '{#}'),
  t('jbr', 'BufferedReader br = new BufferedReader(new InputStreamReader(System.in));', '{#}'),
  t('jstream', '{#}.stream()', '    .filter(x -> true)', '    .map(x -> x)', '    .collect(Collectors.toList());'),
  t('jlambda', '({#}) -> {', '    ', '}'),
  t('jopt', 'Optional<{#}> opt = Optional.ofNullable();'),
  t('jthread', 'new Thread(() -> {', '    {#}', '}).start();'),
  t('jexec', 'ExecutorService pool = Executors.newFixedThreadPool({#});', 'pool.shutdown();'),
  t('jsync', 'synchronized ({#}) {', '    ', '}'),
  t('jtime', 'LocalDateTime now = LocalDateTime.now();', 'String text = now.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));{#}'),
  t('jjdbc', 'try (Connection conn = DriverManager.getConnection(url, user, password);', '     PreparedStatement ps = conn.prepareStatement("{#}")) {', '    try (ResultSet rs = ps.executeQuery()) {', '        while (rs.next()) {', '            ', '        }', '    }', '} catch (SQLException e) {', '    e.printStackTrace();', '}'),
  t('jlog', 'private static final Logger log = LoggerFactory.getLogger({#}.class);'),
  t('jjunit', '@Test', 'void {#}() {', '    ', '}'),
  t('jctrl', '@RestController', '@RequestMapping("/{#}")', 'public class Controller {', '    ', '}'),
  t('jgetmap', '@GetMapping("/{#}")', 'public String get() {', '    return "";', '}'),
]

export const JAVA_PACK = languagePack({
  folder: 'Java',
  description: 'Java — 키워드·표준 라이브러리·어노테이션·틀',
  keywords: [...KEYWORDS, ...TYPES_AND_API, ...ANNOTATIONS],
  calls: CALLS,
  templates: TEMPLATES,
  first: [
    'public', 'private', 'protected', 'static', 'final', 'void', 'class', 'int', 'interface', 'return', 'new', 'import',
    'package', 'String', 'boolean', 'double', 'long', 'if', 'else', 'for', 'while', 'try', 'catch',
    'extends', 'implements', 'this', 'super', 'null', 'true', 'false', 'List', 'ArrayList', 'Map', 'HashMap',
    'System', 'println', 'Override', 'psvm', 'sout', 'fori', 'fore', 'jmain',
    'abstract', 'enum', 'throw', 'throws', 'instanceof', 'default', 'switch', 'case', 'break', 'continue', 'do', 'char', 'byte', 'short', 'float', 'synchronized', 'volatile', 'transient', 'native', 'assert', 'Object', 'Integer', 'Long', 'Double', 'Boolean', 'Character', 'Math', 'Arrays', 'Collections', 'Set', 'HashSet', 'TreeMap', 'LinkedList', 'Queue', 'Deque', 'Stack', 'Optional', 'Stream', 'Collectors', 'Scanner', 'Random', 'Exception', 'RuntimeException', 'IOException', 'File', 'Files', 'Path', 'Thread', 'Runnable', 'Comparable', 'Comparator', 'Iterator', 'StringBuilder', 'length', 'size', 'add', 'get', 'put', 'remove', 'contains', 'containsKey', 'equals', 'hashCode', 'toString', 'valueOf', 'parseInt', 'charAt', 'substring', 'split', 'trim', 'isEmpty', 'indexOf', 'format', 'forEach', 'stream', 'map', 'filter', 'sort', 'printf', 'print', 'nextInt', 'nextLine', 'readLine', 'main', 'args',
  ],
})
