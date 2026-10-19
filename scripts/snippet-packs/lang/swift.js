// Copyright (c) dendr000. MIT License.

// Swift 상용구 — 키워드, 표준 라이브러리, Foundation·SwiftUI·UIKit 기본 이름, 자주 쓰는 틀.
import { languagePack, t, words } from './common.js'

const KEYWORDS = words(`
  associatedtype class deinit enum extension fileprivate func import init inout internal let open operator
  private precedencegroup protocol public rethrows static struct subscript typealias var break case catch
  continue default defer do else fallthrough for guard if in repeat return throw switch where while Any as
  await async false is nil self Self super throws true try actor some any nonisolated isolated lazy weak
  unowned mutating nonmutating override required convenience final optional indirect willSet didSet get set
  macro consume copy borrowing consuming
`)

const API = words(`
  Int Int8 Int16 Int32 Int64 UInt UInt8 UInt16 UInt32 UInt64 Float Double Bool String Character Substring
  Array Dictionary Set Optional Result Range ClosedRange Void Never AnyObject Any Error Equatable Hashable
  Comparable Codable Encodable Decodable Identifiable CustomStringConvertible Sequence Collection
  RawRepresentable CaseIterable Sendable
  print debugPrint dump readLine assert precondition fatalError min max abs zip stride type swap
  count isEmpty first last append insert remove removeAll removeFirst removeLast contains firstIndex
  lastIndex index sort sorted reverse reversed map flatMap compactMap filter reduce forEach joined
  prefix suffix dropFirst dropLast enumerated shuffled randomElement allSatisfy min max
  keys values updateValue removeValue
  hasPrefix hasSuffix uppercased lowercased trimmingCharacters components split replacingOccurrences
  range lowercased capitalized
  Foundation Date Data URL URLSession URLRequest JSONEncoder JSONDecoder UserDefaults FileManager
  NotificationCenter DispatchQueue OperationQueue Timer Bundle Locale Calendar DateFormatter UUID
  Notification Thread ProcessInfo CGFloat CGPoint CGSize CGRect NSObject NSString
  UIKit UIViewController UIView UILabel UIButton UIImageView UITableView UITableViewCell UICollectionView
  UITextField UIScrollView UINavigationController UIAlertController UIColor UIFont UIImage
  viewDidLoad viewWillAppear viewDidAppear viewWillDisappear didReceiveMemoryWarning
  IBOutlet IBAction
  SwiftUI View Text Button Image List ForEach VStack HStack ZStack Spacer Divider NavigationStack
  NavigationLink TabView Form Section Picker Toggle Slider TextField SecureField ScrollView LazyVStack
  LazyHStack Group GeometryReader Color Font Alert Sheet Binding State StateObject ObservedObject
  EnvironmentObject Environment Published ObservableObject Observable Bindable AppStorage SceneStorage
  body padding frame background foregroundColor foregroundStyle font cornerRadius opacity overlay offset
  onAppear onDisappear onTapGesture onChange task sheet alert navigationTitle toolbar
  main App Scene WindowGroup
  Task MainActor await async
`)

const ATTRIBUTES = [
  '@State', '@Binding', '@StateObject', '@ObservedObject', '@EnvironmentObject', '@Environment', '@Published',
  '@main', '@escaping', '@autoclosure', '@available', '@discardableResult', '@objc', '@IBOutlet', '@IBAction',
  '@MainActor', '@Observable', '@Bindable', '@AppStorage', '@ViewBuilder', '@propertyWrapper', '@testable',
]

const TEMPLATES = [
  t('swprint', 'print({#})'),
  t('swprints', 'print("{#}")'),
  t('swprinti', 'print("\\({#})")'),
  t('swimp', 'import Foundation'),
  t('swimpui', 'import SwiftUI'),
  t('swimpkit', 'import UIKit'),
  t('swlet', 'let {#} = '),
  t('swvar', 'var {#} = '),
  t('swlett', 'let {#}: String = '),
  t('swvaropt', 'var {#}: String?'),
  t('swfunc', 'func {#}() {', '    ', '}'),
  t('swfuncr', 'func {#}(_ a: Int, _ b: Int) -> Int {', '    return a + b', '}'),
  t('swfunct', 'func {#}() throws {', '    ', '}'),
  t('swfuncl', 'func {#}(a: Int, b: Int) -> Int {', '    return a + b', '}'),
  t('swfuncas', 'func {#}() async {', '    ', '}'),
  t('swfunco', 'override func {#}() {', '    super.', '}'),
  t('swfori', 'for i in 0..<{#} {', '    ', '}'),
  t('swforr', 'for i in 1...{#} {', '    ', '}'),
  t('swforin', 'for item in {#} {', '    ', '}'),
  t('swfore', 'for (index, item) in {#}.enumerated() {', '    ', '}'),
  t('swforkv', 'for (key, value) in {#} {', '    ', '}'),
  t('swwhile', 'while {#} {', '    ', '}'),
  t('swrepeat', 'repeat {', '    {#}', '} while ()'),
  t('swif', 'if {#} {', '    ', '}'),
  t('swifelse', 'if {#} {', '    ', '} else {', '    ', '}'),
  t('swiflet', 'if let {#} = value {', '    ', '}'),
  t('swguard', 'guard let {#} = value else {', '    return', '}'),
  t('swguardc', 'guard {#} else {', '    return', '}'),
  t('swswitch', 'switch {#} {', 'case 1:', '    break', 'default:', '    break', '}'),
  t('swdo', 'do {', '    {#}', '} catch {', '    print(error)', '}'),
  t('swtry', 'try {#}'),
  t('swtryq', 'try? {#}'),
  t('swthrow', 'throw NSError(domain: "{#}", code: 0)'),
  t('swdefer', 'defer {', '    {#}', '}'),
  t('swstruct', 'struct {#} {', '    var name: String', '    var age: Int', '}'),
  t('swclass', 'class {#} {', '    ', '    init() {', '        ', '    }', '}'),
  t('swclassx', 'class {#}: Base {', '    ', '}'),
  t('swenum', 'enum {#} {', '    case a', '    case b', '}'),
  t('swenumr', 'enum {#}: String {', '    case a = "a"', '    case b = "b"', '}'),
  t('swenumc', 'enum {#}: CaseIterable {', '    case a, b, c', '}'),
  t('swenumv', 'enum {#} {', '    case success(String)', '    case failure(Error)', '}'),
  t('swproto', 'protocol {#} {', '    func run()', '}'),
  t('swext', 'extension {#} {', '    ', '}'),
  t('swextp', 'extension {#}: Protocol {', '    ', '}'),
  t('swinit', 'init({#}) {', '    ', '}'),
  t('swinitf', 'init?({#}) {', '    ', '}'),
  t('swdeinit', 'deinit {', '    {#}', '}'),
  t('swcomp', 'var {#}: Int {', '    return 0', '}'),
  t('swgetset', 'var {#}: Int {', '    get { return 0 }', '    set { }', '}'),
  t('swwill', 'var {#}: Int = 0 {', '    didSet {', '        ', '    }', '}'),
  t('swlazy', 'lazy var {#}: String = {', '    return ""', '}()'),
  t('swclosure', '{ ({#}) in', '    ', '}'),
  t('swclosuret', '{ [weak self] in', '    guard let self = self else { return }', '    {#}', '}'),
  t('swmap', '{#}.map { $0 }'),
  t('swfilter', '{#}.filter { $0 > 0 }'),
  t('swreduce', '{#}.reduce(0, +)'),
  t('swsort', '{#}.sorted { $0 < $1 }'),
  t('swdict', 'var {#}: [String: Int] = [:]'),
  t('swarr', 'var {#}: [Int] = []'),
  t('swset', 'var {#}: Set<Int> = []'),
  t('swtuple', 'let {#} = (name: "", age: 0)'),
  t('swasync', 'Task {', '    {#}', '}'),
  t('swawait', 'let result = await {#}()'),
  t('swmain', 'DispatchQueue.main.async {', '    {#}', '}'),
  t('swbg', 'DispatchQueue.global().async {', '    {#}', '}'),
  t('swafter', 'DispatchQueue.main.asyncAfter(deadline: .now() + 1) {', '    {#}', '}'),
  t('swurl', 'guard let url = URL(string: "{#}") else { return }'),
  t('swfetch', 'let (data, _) = try await URLSession.shared.data(from: url){#}'),
  t('swjson', 'let decoded = try JSONDecoder().decode({#}.self, from: data)'),
  t('swcodable', 'struct {#}: Codable {', '    let id: Int', '    let name: String', '}'),
  t('swud', 'UserDefaults.standard.set({#}, forKey: "")'),
  t('swview', 'struct {#}: View {', '    var body: some View {', '        Text("Hello")', '    }', '}'),
  t('swapp', '@main', 'struct {#}App: App {', '    var body: some Scene {', '        WindowGroup {', '            ContentView()', '        }', '    }', '}'),
  t('swpreview', '#Preview {', '    {#}', '}'),
  t('swstate', '@State private var {#} = '),
  t('swbind', '@Binding var {#}: String'),
  t('swvstack', 'VStack {', '    {#}', '}'),
  t('swhstack', 'HStack {', '    {#}', '}'),
  t('swzstack', 'ZStack {', '    {#}', '}'),
  t('swlist', 'List {', '    {#}', '}'),
  t('swforeach', 'ForEach({#}, id: \\.self) { item in', '    Text(item)', '}'),
  t('swnavs', 'NavigationStack {', '    {#}', '}'),
  t('swnavl', 'NavigationLink(destination: {#}) {', '    Text("")', '}'),
  t('swbtn', 'Button("{#}") {', '    ', '}'),
  t('swtext', 'Text("{#}")'),
  t('swtf', 'TextField("{#}", text: $text)'),
  t('swtoggle', 'Toggle("{#}", isOn: $isOn)'),
  t('swpad', '.padding({#})'),
  t('swfont', '.font(.title)'),
  t('swviewdl', 'override func viewDidLoad() {', '    super.viewDidLoad()', '    {#}', '}'),
  t('swtest', 'func test{#}() throws {', '    XCTAssertTrue(true)', '}'),
]

export const SWIFT_PACK = languagePack({
  folder: 'Swift',
  description: 'Swift — 키워드·표준 라이브러리·SwiftUI·UIKit·틀',
  keywords: [...KEYWORDS, ...API, ...ATTRIBUTES],
  templates: TEMPLATES,
  first: [
    'func', 'let', 'var', 'class', 'struct', 'enum', 'protocol', 'extension', 'return', 'if', 'else', 'guard',
    'for', 'in', 'while', 'switch', 'case', 'import', 'self', 'nil', 'true', 'false', 'init', 'private', 'public',
    'static', 'override', 'String', 'Int', 'Bool', 'Double', 'Array', 'print', 'some', 'View', 'Text',
    'swprint', 'swfori', 'swfunc',
  ],
})
