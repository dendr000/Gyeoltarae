// Copyright (c) dendr000. MIT License.

// Ruby 상용구 — 키워드, 내장 클래스·메서드, 표준 라이브러리, Rails 기본 이름, 자주 쓰는 틀.
import { languagePack, t, words } from './common.js'

const KEYWORDS = words(`
  BEGIN END alias and begin break case class def defined? do else elsif end ensure false for if in module next
  nil not or redo rescue retry return self super then true undef unless until when while yield
  __FILE__ __LINE__ __method__ __dir__
`)

const API = words(`
  Object BasicObject Module Class Kernel Comparable Enumerable Enumerator Lazy Integer Float Numeric Rational
  Complex String Symbol Array Hash Range Regexp MatchData Proc Method Struct Set Time Date DateTime File Dir IO
  Math Random Process Thread Mutex Queue Fiber Exception StandardError RuntimeError ArgumentError TypeError
  NameError NoMethodError ZeroDivisionError IndexError KeyError StopIteration IOError NotImplementedError
  puts print p pp require require_relative load include extend prepend attr_reader attr_writer attr_accessor
  private public protected module_function raise rescue ensure catch throw loop lambda proc block_given? gets
  sleep rand srand format sprintf printf binding freeze frozen? dup clone tap then itself
  each each_with_index each_with_object each_slice each_cons each_char map collect select filter reject find
  detect find_all find_index inject reduce sum count min max min_by max_by minmax sort sort_by reverse
  reverse_each uniq flatten compact zip take take_while drop drop_while group_by partition chunk_while
  first last push pop shift unshift insert delete delete_at delete_if clear include? empty? any? all? none?
  length size join split concat index rindex sample shuffle rotate transpose product combination permutation
  keys values key? has_key? value? fetch dig merge merge! update store to_a to_h to_s to_i to_f to_sym to_proc
  each_pair transform_values transform_keys filter_map sum tally
  strip lstrip rstrip chomp chop chars bytes lines upcase downcase capitalize swapcase center ljust rjust gsub
  gsub! sub sub! tr scan match match? start_with? end_with? replace slice succ ord chr format freeze
  nil? is_a? kind_of? instance_of? respond_to? send public_send method methods instance_variable_get
  instance_variable_set instance_variables define_method method_missing class_eval instance_eval
  attr_accessor initialize to_s inspect new
  json yaml csv set time date fileutils pathname open-uri net/http uri securerandom logger optparse erb
  rspec describe context it expect to eq be_truthy before after let subject
  ActiveRecord ApplicationRecord ApplicationController Rails Rack Sinatra
  has_many has_one belongs_to has_and_belongs_to_many validates validates_presence_of before_action after_action
  scope render redirect_to params session flash resources get post put patch delete root namespace
  create update destroy find find_by where order limit includes joins save save! all first last
`)

const TEMPLATES = [
  t('rbmain', '#!/usr/bin/env ruby', '# frozen_string_literal: true', '', '{#}'),
  t('rbp', 'puts {#}'),
  t('rbps', 'puts "{#}"'),
  t('rbpi', 'puts "#{' + '{#}}"'),
  t('rbpp', 'p {#}'),
  t('rbreq', "require '{#}'"),
  t('rbreqr', "require_relative '{#}'"),
  t('rbdef', 'def {#}', '  ', 'end'),
  t('rbdefa', 'def {#}(a, b)', '  a + b', 'end'),
  t('rbdefk', 'def {#}(name:, age: 0)', '  ', 'end'),
  t('rbdefs', 'def self.{#}', '  ', 'end'),
  t('rbclass', 'class {#}', '  def initialize', '    ', '  end', 'end'),
  t('rbclassx', 'class {#} < Base', '  ', 'end'),
  t('rbmodule', 'module {#}', '  ', 'end'),
  t('rbstruct', '{#} = Struct.new(:name, :age)'),
  t('rbinit', 'def initialize({#})', '  ', 'end'),
  t('rbattr', 'attr_accessor :{#}'),
  t('rbattrr', 'attr_reader :{#}'),
  t('rbtos', 'def to_s', '  "{#}"', 'end'),
  t('rbeach', '{#}.each do |item|', '  ', 'end'),
  t('rbeachb', '{#}.each { |item| }'),
  t('rbeachi', '{#}.each_with_index do |item, i|', '  ', 'end'),
  t('rbmap', '{#}.map { |x| x }'),
  t('rbselect', '{#}.select { |x| x }'),
  t('rbreject', '{#}.reject { |x| x }'),
  t('rbinject', '{#}.inject(0) { |sum, x| sum + x }'),
  t('rbhash', '{#}.each do |key, value|', '  ', 'end'),
  t('rbtimes', '{#}.times do |i|', '  ', 'end'),
  t('rbupto', '1.upto({#}) do |i|', '  ', 'end'),
  t('rbstep', '1.step({#}, 2) do |i|', '  ', 'end'),
  t('rbfor', 'for i in 0...{#}', '  ', 'end'),
  t('rbwhile', 'while {#}', '  ', 'end'),
  t('rbuntil', 'until {#}', '  ', 'end'),
  t('rbloop', 'loop do', '  {#}', '  break', 'end'),
  t('rbif', 'if {#}', '  ', 'end'),
  t('rbifelse', 'if {#}', '  ', 'else', '  ', 'end'),
  t('rbelsif', 'elsif {#}', '  '),
  t('rbunless', 'unless {#}', '  ', 'end'),
  t('rbcase', 'case {#}', 'when 1', '  ', 'else', '  ', 'end'),
  t('rbcasein', 'case {#}', 'in Integer', '  ', 'else', '  ', 'end'),
  t('rbbegin', 'begin', '  {#}', 'rescue StandardError => e', '  puts e.message', 'end'),
  t('rbensure', 'begin', '  {#}', 'rescue StandardError => e', '  puts e.message', 'ensure', '  ', 'end'),
  t('rbraise', 'raise ArgumentError, "{#}"'),
  t('rblambda', '->({#}) { }'),
  t('rbproc', 'Proc.new { |{#}| }'),
  t('rbblock', 'do |{#}|', '  ', 'end'),
  t('rbyield', 'yield {#}'),
  t('rbarr', '{#} = []'),
  t('rbhsh', '{#} = {}'),
  t('rbhsh2', '{#} = { name: "", age: 0 }'),
  t('rbsym', ':{#}'),
  t('rbfileread', 'File.read("{#}")'),
  t('rbfilew', 'File.write("{#}", content)'),
  t('rbfileopen', 'File.open("{#}", "r") do |f|', '  f.each_line { |line| puts line }', 'end'),
  t('rbgets', '{#} = gets.chomp'),
  t('rbgetsi', '{#} = gets.to_i'),
  t('rbgetsa', '{#} = gets.split.map(&:to_i)'),
  t('rbjson', 'require "json"', '', 'JSON.parse({#})'),
  t('rbjsong', 'JSON.pretty_generate({#})'),
  t('rbhttp', 'require "net/http"', '', 'res = Net::HTTP.get(URI("{#}"))'),
  t('rbtime', 'Time.now.strftime("%Y-%m-%d %H:%M:%S"){#}'),
  t('rbbench', 'require "benchmark"', '', 'puts Benchmark.measure {', '  {#}', '}'),
  t('rbifmain', 'if __FILE__ == $PROGRAM_NAME', '  {#}', 'end'),
  t('rbspec', 'RSpec.describe {#} do', '  it "works" do', '    expect(1).to eq(1)', '  end', 'end'),
  t('rbminitest', 'require "minitest/autorun"', '', 'class Test{#} < Minitest::Test', '  def test_works', '    assert_equal 1, 1', '  end', 'end'),
  t('rbmodel', 'class {#} < ApplicationRecord', '  validates :name, presence: true', 'end'),
  t('rbhasmany', 'has_many :{#}'),
  t('rbbelongs', 'belongs_to :{#}'),
  t('rbctrl', 'class {#}Controller < ApplicationController', '  def index', '    ', '  end', 'end'),
  t('rbroute', 'get "{#}", to: "controller#action"'),
  t('rbresources', 'resources :{#}'),
  t('rbmigrate', 'class Create{#} < ActiveRecord::Migration[7.0]', '  def change', '    create_table :items do |t|', '      t.string :name', '      t.timestamps', '    end', '  end', 'end'),
]

export const RUBY_PACK = languagePack({
  folder: 'Ruby',
  description: 'Ruby — 키워드·내장 메서드·Rails·틀',
  keywords: [...KEYWORDS, ...API],
  templates: TEMPLATES,
  first: [
    'def', 'end', 'class', 'module', 'if', 'elsif', 'else', 'unless', 'case', 'when', 'while', 'do', 'return', 'puts',
    'nil', 'true', 'false', 'self', 'require', 'require_relative', 'attr_accessor', 'each', 'map', 'select', 'new',
    'initialize', 'rescue', 'yield', 'rbdef', 'rbclass', 'rbeach',
    'then', 'until', 'begin', 'ensure', 'retry', 'redo', 'break', 'next', 'super', 'alias', 'undef', 'defined?', 'and', 'or', 'not', 'print', 'p', 'pp', 'gets', 'load', 'include', 'extend', 'raise', 'lambda', 'proc', 'loop', 'attr_reader', 'attr_writer', 'private', 'public', 'protected', 'Integer', 'Float', 'String', 'Symbol', 'Array', 'Hash', 'Range', 'Struct', 'Set', 'Time', 'File', 'Dir', 'Math', 'Comparable', 'Enumerable', 'each_with_index', 'reject', 'reduce', 'inject', 'find', 'any?', 'all?', 'include?', 'empty?', 'size', 'length', 'first', 'last', 'push', 'pop', 'shift', 'unshift', 'join', 'split', 'strip', 'gsub', 'sub', 'to_s', 'to_i', 'to_a', 'to_h', 'keys', 'values', 'fetch', 'merge', 'sort', 'sort_by', 'uniq', 'flatten', 'compact', 'zip', 'freeze', 'nil?', 'is_a?', 'respond_to?', 'send',
  ],
})
