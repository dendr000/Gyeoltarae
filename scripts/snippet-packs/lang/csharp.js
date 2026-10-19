// Copyright (c) dendr000. MIT License.

// C# 상용구 — 키워드, .NET 기본 클래스, LINQ, 자주 쓰는 틀.
import { languagePack, t, words } from './common.js'

const KEYWORDS = words(`
  abstract as base bool break byte case catch char checked class const continue decimal default delegate do
  double else enum event explicit extern false finally fixed float for foreach goto if implicit in int
  interface internal is lock long namespace new null object operator out override params private protected
  public readonly ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true
  try typeof uint ulong unchecked unsafe ushort using virtual void volatile while
  add alias and async await by descending dynamic equals from get global group init into join let nameof
  not notnull on or orderby partial record remove required select set unmanaged value var when where with yield
`)

const API = words(`
  Object String StringBuilder Char Int32 Int64 Double Decimal Boolean Byte DateTime DateTimeOffset TimeSpan Guid
  Math Convert Console Environment GC Random Tuple ValueTuple Nullable Array Enum Type Activator Attribute
  List Dictionary HashSet SortedDictionary SortedSet Queue Stack LinkedList IEnumerable IEnumerator ICollection
  IList IDictionary IComparable IEquatable IDisposable ICloneable KeyValuePair Span Memory ReadOnlySpan
  Func Action Predicate Comparison EventHandler EventArgs Lazy
  Task ValueTask Thread ThreadPool CancellationToken CancellationTokenSource Parallel Mutex Semaphore
  Monitor Interlocked ConcurrentDictionary ConcurrentQueue
  File Directory Path FileInfo DirectoryInfo Stream StreamReader StreamWriter MemoryStream FileStream
  BinaryReader BinaryWriter TextReader TextWriter
  Exception ArgumentException ArgumentNullException ArgumentOutOfRangeException InvalidOperationException
  NotImplementedException NotSupportedException NullReferenceException IndexOutOfRangeException
  FormatException IOException FileNotFoundException KeyNotFoundException TimeoutException
  Regex Match MatchCollection JsonSerializer JsonSerializerOptions HttpClient HttpResponseMessage
  Debug Trace Stopwatch
  Add AddRange Remove RemoveAt RemoveAll Insert Contains ContainsKey TryGetValue Clear Count Length Sort Reverse
  IndexOf Find FindAll Exists ToArray ToList ToString Parse TryParse Format Join Split Trim Replace Substring
  StartsWith EndsWith ToUpper ToLower IsNullOrEmpty IsNullOrWhiteSpace Equals GetHashCode GetType
  WriteLine Write ReadLine ReadKey Clear
  Where Select SelectMany OrderBy OrderByDescending ThenBy GroupBy Join First FirstOrDefault Last LastOrDefault
  Single SingleOrDefault Any All Sum Average Min Max Distinct Take Skip Concat Zip Aggregate ToDictionary
  Now UtcNow Today AddDays AddHours AddMinutes TotalSeconds TotalMilliseconds
  Main args Length
  Dispose Close Flush Read ReadAllText WriteAllText ReadAllLines WriteAllLines Exists Combine GetFileName
  Delay Run WhenAll WhenAny FromResult ConfigureAwait
`)

// 어트리뷰트는 대괄호 없이 이름만 둔다. `[` 로 시작하는 제목을 두면 배열 `a[` 를 칠 때마다 추천 팝업이 뜬다.
const ATTRIBUTES = words(`
  Serializable Obsolete Flags Required Key Table Column HttpGet HttpPost HttpPut HttpDelete Route ApiController
  Authorize FromBody FromQuery Test TestMethod Fact Theory STAThread DllImport
`)
const TEMPLATES = [
  t('csmain', 'using System;', '', 'namespace {#}', '{', '    internal class Program', '    {', '        static void Main(string[] args)', '        {', '            ', '        }', '    }', '}'),
  t('csmain9', 'using System;', '', '{#}'),
  t('mainfn', 'static void Main(string[] args)', '{', '    {#}', '}'),
  t('cwl', 'Console.WriteLine({#});'),
  t('cwls', 'Console.WriteLine($"{#}");'),
  t('cw', 'Console.Write({#});'),
  t('crl', 'string {#} = Console.ReadLine();'),
  t('cint', 'int {#} = int.Parse(Console.ReadLine());'),
  t('usys', 'using System;', 'using System.Collections.Generic;', 'using System.Linq;'),
  t('ns', 'namespace {#}', '{', '    ', '}'),
  t('nsfile', 'namespace {#};'),
  t('fori', 'for (int i = 0; i < {#}; i++)', '{', '    ', '}'),
  t('forj', 'for (int j = 0; j < {#}; j++)', '{', '    ', '}'),
  t('forrev', 'for (int i = {#}; i >= 0; i--)', '{', '    ', '}'),
  t('foreachv', 'foreach (var item in {#})', '{', '    ', '}'),
  t('whilel', 'while ({#})', '{', '    ', '}'),
  t('dowhl', 'do', '{', '    {#}', '} while ();'),
  t('ifb', 'if ({#})', '{', '    ', '}'),
  t('ifelse', 'if ({#})', '{', '    ', '}', 'else', '{', '    ', '}'),
  t('swch', 'switch ({#})', '{', '    case 1:', '        break;', '    default:', '        break;', '}'),
  t('swexpr', 'var result = {#} switch', '{', '    1 => "",', '    _ => "",', '};'),
  t('trycatch', 'try', '{', '    {#}', '}', 'catch (Exception ex)', '{', '    Console.WriteLine(ex.Message);', '}'),
  t('tryfin', 'try', '{', '    {#}', '}', 'catch (Exception ex)', '{', '    Console.WriteLine(ex.Message);', '}', 'finally', '{', '    ', '}'),
  t('thrw', 'throw new ArgumentException("{#}");'),
  t('usingb', 'using (var {#} = new Object())', '{', '    ', '}'),
  t('usingd', 'using var {#} = new Object();'),
  t('lockb', 'lock ({#})', '{', '    ', '}'),
  t('cclass', 'public class {#}', '{', '    ', '}'),
  t('cclassx', 'public class {#} : Base', '{', '    ', '}'),
  t('cinterf', 'public interface I{#}', '{', '    ', '}'),
  t('cstruct', 'public struct {#}', '{', '    ', '}'),
  t('cenum', 'public enum {#}', '{', '    A,', '    B,', '}'),
  t('crecord', 'public record {#}(int Id, string Name);'),
  t('cabstract', 'public abstract class {#}', '{', '    ', '}'),
  t('cctor', 'public {#}()', '{', '    ', '}'),
  t('cprop', 'public {#} Name { get; set; }'),
  t('cpropi', 'public {#} Name { get; init; }'),
  t('cprop2', 'private string _name;', 'public string Name', '{', '    get => _name;', '    set => _name = value;', '}'),
  t('cfield', 'private readonly {#} _name;'),
  t('cmethod', 'public {#} Method()', '{', '    ', '}'),
  t('cvoid', 'public void {#}()', '{', '    ', '}'),
  t('cstatic', 'public static {#} Method()', '{', '    ', '}'),
  t('casync', 'public async Task{#} MethodAsync()', '{', '    ', '}'),
  t('cexpr', 'public int {#}(int a, int b) => a + b;'),
  t('ctostr', 'public override string ToString()', '{', '    return $"{#}";', '}'),
  t('cequals', 'public override bool Equals(object obj)', '{', '    {#}', '}'),
  t('cevent', 'public event EventHandler {#};'),
  t('cdelegate', 'public delegate void {#}(object sender, EventArgs e);'),
  t('clist', 'var list = new List<{#}>();'),
  t('cdict', 'var dict = new Dictionary<string, {#}>();'),
  t('chset', 'var set = new HashSet<{#}>();'),
  t('cinit', 'var list = new List<{#}> { };'),
  t('clinq', 'var result = {#}.Where(x => true).Select(x => x).ToList();'),
  t('clinqq', 'var result = from x in {#}', '             where true', '             select x;'),
  t('clamb', '({#}) => '),
  t('cdelay', 'await Task.Delay({#});'),
  t('ctaskrun', 'await Task.Run(() =>', '{', '    {#}', '});'),
  t('cwhenall', 'await Task.WhenAll({#});'),
  t('cfile', 'string text = File.ReadAllText("{#}");'),
  t('cfilew', 'File.WriteAllText("{#}", text);'),
  t('csr', 'using (var reader = new StreamReader("{#}"))', '{', '    string line;', '    while ((line = reader.ReadLine()) != null)', '    {', '        ', '    }', '}'),
  t('cjson', 'var json = JsonSerializer.Serialize({#});'),
  t('cjsond', 'var obj = JsonSerializer.Deserialize<{#}>(json);'),
  t('chttp', 'using var client = new HttpClient();', 'var response = await client.GetStringAsync("{#}");'),
  t('cwatch', 'var sw = Stopwatch.StartNew();', '{#}', 'sw.Stop();', 'Console.WriteLine(sw.ElapsedMilliseconds);'),
  t('cnow', 'var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");{#}'),
  t('cnullc', '{#} ?? defaultValue'),
  t('cnullp', '{#}?.Property'),
  t('cfact', '[Fact]', 'public void {#}()', '{', '    Assert.True(true);', '}'),
  t('cctrl', '[ApiController]', '[Route("api/[controller]")]', 'public class {#}Controller : ControllerBase', '{', '    ', '}'),
  t('cget', '[HttpGet]', 'public IActionResult {#}()', '{', '    return Ok();', '}'),
  t('cregion', '#region {#}', '', '#endregion'),
]

export const CSHARP_PACK = languagePack({
  folder: 'C#',
  description: 'C# — 키워드·.NET 기본 클래스·LINQ·틀',
  keywords: [...KEYWORDS, ...API, ...ATTRIBUTES],
  templates: TEMPLATES,
  first: [
    'public', 'private', 'protected', 'static', 'void', 'class', 'new', 'return', 'using', 'namespace', 'string',
    'int', 'bool', 'var', 'if', 'else', 'for', 'foreach', 'while', 'try', 'catch', 'async', 'await', 'null', 'true',
    'false', 'List', 'Dictionary', 'Console', 'WriteLine', 'this', 'override', 'virtual', 'interface',
    'cwl', 'fori', 'foreachv', 'cprop', 'cclass',
  ],
})
