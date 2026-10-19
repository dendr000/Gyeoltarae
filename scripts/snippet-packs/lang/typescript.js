// Copyright (c) dendr000. MIT License.

// TypeScript 상용구 — 타입 문법, 유틸리티 타입, 데코레이터, 자주 쓰는 틀. JavaScript 의 키워드·내장 객체도 같이 넣는다
// (코드블록 언어가 TypeScript 일 때는 JavaScript 폴더의 상용구가 쓰이지 않으므로).
import { languagePack, t, words } from './common.js'

const KEYWORDS = words(`
  abstract any as asserts async await bigint boolean break case catch class const constructor continue declare
  default delete do else enum export extends false finally for from function get if implements import in infer
  instanceof interface is keyof let module namespace never new null number object of override private
  protected public readonly require return satisfies set static string super switch symbol this throw true try
  type typeof undefined unique unknown var void while with yield accessor out
`)

const TYPES = words(`
  Array ReadonlyArray Promise Map Set WeakMap WeakSet Record Partial Required Readonly Pick Omit Exclude Extract
  NonNullable ReturnType Parameters ConstructorParameters InstanceType ThisType Awaited Uppercase Lowercase
  Capitalize Uncapitalize Function Object String Number Boolean Symbol Date RegExp Error JSON Math
  Event MouseEvent KeyboardEvent ChangeEvent FormEvent HTMLElement HTMLInputElement HTMLDivElement
  HTMLButtonElement HTMLFormElement HTMLCanvasElement Document Window Node NodeList Element
  console document window globalThis process require module exports setTimeout setInterval fetch
  push pop shift unshift splice slice concat join reverse sort indexOf includes find findIndex filter map
  flatMap flat forEach reduce some every length keys values entries assign freeze fromEntries
  toString toFixed split trim replace startsWith endsWith padStart parse stringify then catch finally
  resolve reject all allSettled race addEventListener querySelector getElementById
  ReactNode ReactElement FC PropsWithChildren useState useEffect useRef useMemo useCallback useContext
  Component JSX Props State
`)

const DECORATORS = [
  '@Component', '@Injectable', '@Input', '@Output', '@NgModule', '@Directive', '@Pipe', '@HostListener',
  '@ViewChild', '@Controller', '@Get', '@Post', '@Put', '@Delete', '@Body', '@Param', '@Query', '@Module',
  '@Entity', '@Column', '@PrimaryGeneratedColumn',
]

const TEMPLATES = [
  t('interf', 'interface {#} {', '  id: number', '  name: string', '}'),
  t('typea', 'type {#} = '),
  t('typeu', 'type {#} = "a" | "b" | "c"'),
  t('typeo', 'type {#} = {', '  id: number', '  name?: string', '}'),
  t('enumt', 'enum {#} {', '  A,', '  B,', '}'),
  t('enumc', 'const enum {#} {', '  A = "a",', '  B = "b",', '}'),
  t('genf', 'function {#}<T>(value: T): T {', '  return value', '}'),
  t('genc', 'class {#}<T> {', '  constructor(private value: T) {}', '}'),
  t('genifc', 'interface {#}<T> {', '  data: T', '}'),
  t('tfunc', 'function {#}(a: number, b: number): number {', '  return a + b', '}'),
  t('tarrow', 'const {#} = (a: number, b: number): number => a + b'),
  t('tasync', 'async function {#}(): Promise<void> {', '  ', '}'),
  t('tcls', 'class {#} {', '  private name: string', '', '  constructor(name: string) {', '    this.name = name', '  }', '}'),
  t('tclsi', 'class {#} implements Base {', '  constructor(private readonly id: number) {}', '}'),
  t('tabstract', 'abstract class {#} {', '  abstract run(): void', '}'),
  t('tctorp', 'constructor(private readonly {#}: string) {}'),
  t('tget', 'get {#}(): string {', '  return this._value', '}'),
  t('tfori', 'for (let i = 0; i < {#}; i++) {', '  ', '}'),
  t('tforof', 'for (const item of {#}) {', '  ', '}'),
  t('tforent', 'for (const [key, value] of Object.entries({#})) {', '  ', '}'),
  t('ttry', 'try {', '  {#}', '} catch (error) {', '  if (error instanceof Error) console.error(error.message)', '}'),
  t('guardt', 'function is{#}(value: unknown): value is Type {', '  return typeof value === "object" && value !== null', '}'),
  t('assertt', 'function assert{#}(value: unknown): asserts value is Type {', '  ', '}'),
  t('nonnull', '{#}!'),
  t('asc', '{#} as unknown as Type'),
  t('satis', '{#} satisfies Type'),
  t('mapped', 'type {#}<T> = { [K in keyof T]: T[K] }'),
  t('condt', 'type {#}<T> = T extends string ? "s" : "n"'),
  t('recd', 'Record<string, {#}>'),
  t('partd', 'Partial<{#}>'),
  t('pickd', 'Pick<{#}, "id" | "name">'),
  t('omitd', 'Omit<{#}, "id">'),
  t('retd', 'ReturnType<typeof {#}>'),
  t('awaited', 'Awaited<ReturnType<typeof {#}>>'),
  t('constass', '{#} as const'),
  t('tsimp', 'import { {#} } from ""'),
  t('tsimpt', 'import type { {#} } from ""'),
  t('tsexp', 'export type { {#} }'),
  t('declmod', 'declare module "{#}" {', '  ', '}'),
  t('declg', 'declare global {', '  interface Window {', '    {#}', '  }', '}'),
  t('ngcomp', '@Component({', '  selector: "app-{#}",', '  templateUrl: "./.component.html",', '})', 'export class Component {}'),
  t('ngsvc', '@Injectable({ providedIn: "root" })', 'export class {#}Service {', '  constructor(private http: HttpClient) {}', '}'),
  t('reactfc', 'const {#}: React.FC<Props> = ({ children }) => {', '  return <div>{children}</div>', '}'),
  t('reactprops', 'interface {#}Props {', '  children?: React.ReactNode', '}'),
  t('usests', 'const [{#}, set] = useState<string>("")'),
  t('useref', 'const {#} = useRef<HTMLDivElement>(null)'),
  t('fetchts', 'const res = await fetch("{#}")', 'const data: Type = await res.json()'),
  t('zod', 'const {#}Schema = z.object({', '  name: z.string(),', '})'),
]

export const TYPESCRIPT_PACK = languagePack({
  folder: 'TypeScript',
  description: 'TypeScript — 타입 문법·유틸리티 타입·틀',
  keywords: [...KEYWORDS, ...TYPES, ...DECORATORS],
  templates: TEMPLATES,
  first: [
    'const', 'let', 'function', 'return', 'interface', 'type', 'string', 'number', 'boolean', 'void', 'any',
    'unknown', 'never', 'null', 'undefined', 'import', 'export', 'default', 'from', 'class', 'extends',
    'implements', 'readonly', 'private', 'public', 'async', 'await', 'Promise', 'Record', 'Partial', 'Array',
    'interf', 'typea', 'tfunc',
  ],
})
