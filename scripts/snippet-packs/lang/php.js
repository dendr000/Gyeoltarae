// Copyright (c) dendr000. MIT License.

// PHP 상용구 — 키워드, 내장 함수, 슈퍼글로벌, PDO·Laravel 기본 이름, 자주 쓰는 틀.
import { languagePack, t, words } from './common.js'

const KEYWORDS = words(`
  abstract and array as break callable case catch class clone const continue declare default do echo else
  elseif empty enddeclare endfor endforeach endif endswitch endwhile enum extends final finally fn for foreach
  function global goto if implements include include_once instanceof insteadof interface isset list match
  namespace new or print private protected public readonly require require_once return static switch throw
  trait try unset use var while xor yield true false null self parent static mixed void never iterable object
  int float string bool
`)

const FUNCTIONS = words(`
  strlen strpos stripos strrpos substr str_replace str_contains str_starts_with str_ends_with str_repeat
  str_pad str_split strtolower strtoupper ucfirst ucwords lcfirst trim ltrim rtrim explode implode join
  sprintf printf number_format nl2br htmlspecialchars html_entity_decode strip_tags addslashes stripslashes
  strcmp strcasecmp strrev wordwrap mb_strlen mb_substr mb_strtoupper mb_strtolower mb_strpos mb_str_split
  count sizeof array_push array_pop array_shift array_unshift array_merge array_combine array_keys array_values
  array_map array_filter array_reduce array_slice array_splice array_search array_unique array_reverse
  array_key_exists array_column array_diff array_intersect array_flip array_fill array_sum array_product
  array_chunk array_walk in_array range compact extract sort rsort usort uasort uksort asort arsort ksort krsort
  shuffle min max abs ceil floor round sqrt pow rand mt_rand random_int intdiv fmod pi
  is_array is_string is_int is_numeric is_null is_bool is_float is_object is_callable isset empty unset
  intval floatval strval boolval settype gettype var_dump print_r var_export serialize unserialize
  json_encode json_decode json_last_error_msg
  date time mktime strtotime date_default_timezone_set checkdate microtime usleep sleep
  file_get_contents file_put_contents fopen fclose fgets fread fwrite feof file file_exists is_file is_dir mkdir
  unlink rename copy glob basename dirname pathinfo realpath scandir tempnam
  preg_match preg_match_all preg_replace preg_split preg_quote preg_replace_callback
  header http_response_code setcookie session_start session_destroy password_hash password_verify md5 sha1 hash
  base64_encode base64_decode urlencode urldecode http_build_query filter_var filter_input
  die exit error_log trigger_error set_error_handler error_reporting ini_set function_exists class_exists
  method_exists property_exists spl_autoload_register call_user_func call_user_func_array func_get_args
  define defined constant
  __construct __destruct __get __set __call __toString __invoke __isset __unset __clone __DIR__ __FILE__
  __LINE__ __CLASS__ __FUNCTION__ __METHOD__ __NAMESPACE__
`)

const SUPERGLOBALS = ['$_GET', '$_POST', '$_REQUEST', '$_SERVER', '$_SESSION', '$_COOKIE', '$_FILES', '$_ENV', '$GLOBALS', '$this']

const CLASSES = words(`
  Exception Error TypeError ValueError InvalidArgumentException RuntimeException LogicException
  PDO PDOException PDOStatement DateTime DateTimeImmutable DateInterval ArrayObject ArrayIterator Closure
  Countable Iterator IteratorAggregate ArrayAccess JsonSerializable Stringable Traversable Generator
  Request Response Route Auth Cache DB Schema Eloquent Model Controller Collection Validator Storage
  Log Session Config View Blade Artisan Migration Seeder Factory Illuminate App Http Middleware
`)

const TEMPLATES = [
  t('phptag', '<?php', '', '{#}'),
  t('phpopen', '<?php {#} ?>'),
  t('phpecho', '<?= {#} ?>'),
  t('phpstrict', 'declare(strict_types=1);'),
  t('phpns', 'namespace {#};'),
  t('phpuse', 'use {#};'),
  t('echos', 'echo "{#}";'),
  t('echov', 'echo ${#};'),
  t('echon', 'echo "{#}" . PHP_EOL;'),
  t('vdump', 'var_dump({#});'),
  t('vdie', 'var_dump({#});', 'die();'),
  t('prr', 'echo "<pre>";', 'print_r({#});', 'echo "</pre>";'),
  t('funcp', 'function {#}() {', '    ', '}'),
  t('funct', 'function {#}(int $a, int $b): int {', '    return $a + $b;', '}'),
  t('arrowp', 'fn({#}) => '),
  t('closure', 'function({#}) {', '    ', '}'),
  t('closureu', 'function({#}) use ($var) {', '    ', '}'),
  t('fori', 'for ($i = 0; $i < {#}; $i++) {', '    ', '}'),
  t('forj', 'for ($j = 0; $j < {#}; $j++) {', '    ', '}'),
  t('fore', 'foreach (${#} as $item) {', '    ', '}'),
  t('forekv', 'foreach (${#} as $key => $value) {', '    ', '}'),
  t('whilel', 'while ({#}) {', '    ', '}'),
  t('dowhl', 'do {', '    {#}', '} while ();'),
  t('ifb', 'if ({#}) {', '    ', '}'),
  t('ifelse', 'if ({#}) {', '    ', '} else {', '    ', '}'),
  t('elseifb', 'elseif ({#}) {', '    ', '}'),
  t('swch', 'switch (${#}) {', '    case 1:', '        break;', '    default:', '        break;', '}'),
  t('matchp', '$result = match (${#}) {', '    1 => "",', '    default => "",', '};'),
  t('trycatch', 'try {', '    {#}', '} catch (Exception $e) {', '    echo $e->getMessage();', '}'),
  t('tryfin', 'try {', '    {#}', '} catch (Exception $e) {', '    echo $e->getMessage();', '} finally {', '    ', '}'),
  t('thrw', 'throw new Exception("{#}");'),
  t('classp', 'class {#}', '{', '    ', '}'),
  t('classx', 'class {#} extends Base', '{', '    ', '}'),
  t('classi', 'class {#} implements Interface', '{', '    ', '}'),
  t('ifacep', 'interface {#}', '{', '    ', '}'),
  t('traitp', 'trait {#}', '{', '    ', '}'),
  t('enump', 'enum {#}: string', '{', '    case A = "a";', '    case B = "b";', '}'),
  t('abstractp', 'abstract class {#}', '{', '    abstract public function run(): void;', '}'),
  t('construct', 'public function __construct({#})', '{', '    ', '}'),
  t('constructp', 'public function __construct(private string ${#}) {}'),
  t('pubf', 'public function {#}()', '{', '    ', '}'),
  t('prif', 'private function {#}()', '{', '    ', '}'),
  t('pubsf', 'public static function {#}()', '{', '    ', '}'),
  t('proppub', 'public string ${#};'),
  t('proppri', 'private string ${#};'),
  t('constc', 'public const {#} = "";'),
  t('getp', 'public function get{#}(): string', '{', '    return $this->name;', '}'),
  t('setp', 'public function set{#}(string $name): void', '{', '    $this->name = $name;', '}'),
  t('tostrp', 'public function __toString(): string', '{', '    return "{#}";', '}'),
  t('arrp', '${#} = [];'),
  t('arrk', '${#} = [', '    "key" => "value",', '];'),
  t('arrmap', 'array_map(fn($x) => $x, ${#})'),
  t('arrfil', 'array_filter(${#}, fn($x) => $x)'),
  t('issetp', 'isset(${#})'),
  t('nullco', '${#} ?? ""'),
  t('nullso', '${#}?->'),
  t('postget', '$_POST["{#}"] ?? ""'),
  t('getget', '$_GET["{#}"] ?? ""'),
  t('sesst', 'session_start();{#}'),
  t('redir', 'header("Location: {#}");', 'exit;'),
  t('jsonhd', 'header("Content-Type: application/json; charset=utf-8");', 'echo json_encode({#}, JSON_UNESCAPED_UNICODE);'),
  t('reqonce', 'require_once "{#}";'),
  t('incl', 'include "{#}";'),
  t('pdoc', '$pdo = new PDO("mysql:host=localhost;dbname={#};charset=utf8mb4", $user, $pass, [', '    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,', ']);'),
  t('pdoq', '$stmt = $pdo->prepare("{#}");', '$stmt->execute([]);', '$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);'),
  t('pdoi', '$stmt = $pdo->prepare("INSERT INTO {#} (col) VALUES (?)");', '$stmt->execute([$value]);'),
  t('fgc', 'file_get_contents("{#}")'),
  t('fpc', 'file_put_contents("{#}", $data);'),
  t('hashp', 'password_hash(${#}, PASSWORD_DEFAULT)'),
  t('datef', 'date("Y-m-d H:i:s"){#}'),
  t('lvroute', 'Route::get("/{#}", [Controller::class, "index"]);'),
  t('lvctrl', 'public function {#}(Request $request)', '{', '    return view("");', '}'),
  t('lvmodel', 'class {#} extends Model', '{', '    protected $fillable = [];', '}'),
  t('lvview', 'return view("{#}", compact(""));'),
  t('bladeif', '@if ({#})', '    ', '@endif'),
  t('bladefe', '@foreach (${#} as $item)', '    ', '@endforeach'),
]

export const PHP_PACK = languagePack({
  folder: 'PHP',
  description: 'PHP — 키워드·내장 함수·슈퍼글로벌·PDO·Laravel·틀',
  keywords: [...KEYWORDS, ...FUNCTIONS, ...SUPERGLOBALS, ...CLASSES],
  templates: TEMPLATES,
  first: [
    'echo', 'function', 'return', 'if', 'else', 'elseif', 'for', 'foreach', 'while', 'class', 'public', 'private',
    'protected', 'static', 'new', 'array', 'null', 'true', 'false', 'isset', 'empty', 'count', 'require_once',
    'include', 'namespace', 'use', '$this', '$_POST', '$_GET', '$_SESSION', 'phptag', 'fore', 'fori',
    'switch', 'case', 'default', 'break', 'continue', 'do', 'try', 'catch', 'finally', 'throw', 'clone', 'instanceof', 'abstract', 'final', 'interface', 'trait', 'extends', 'implements', 'self', 'parent', 'const', 'global', 'var', 'list', 'unset', 'die', 'exit', 'print', 'include_once', 'require', 'int', 'float', 'string', 'bool', 'object', 'callable', 'iterable', 'void', 'mixed', 'strlen', 'strpos', 'substr', 'str_replace', 'trim', 'explode', 'implode', 'sprintf', 'printf', 'in_array', 'array_merge', 'array_map', 'array_filter', 'array_keys', 'array_values', 'array_push', 'array_pop', 'array_slice', 'sort', 'usort', 'json_encode', 'json_decode', 'date', 'time', 'file_get_contents', 'file_put_contents', 'preg_match', 'intval', 'is_array', 'is_null', 'var_dump', 'print_r', 'htmlspecialchars', 'password_hash', 'session_start', 'header', '$_SERVER', 'PDO', 'Exception',
  ],
})
