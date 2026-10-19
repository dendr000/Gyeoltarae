// Copyright (c) dendr000. MIT License.

// Python 상용구 — 키워드, 내장 함수, 예외, 특수 메서드, 표준 라이브러리 이름, 자주 쓰는 틀.
import { languagePack, t, words } from './common.js'

const KEYWORDS = words(`
  False None True and as assert async await break class continue def del elif else except finally for from
  global if import in is lambda nonlocal not or pass raise return try while with yield match case
`)

const BUILTINS = words(`
  print input len range int float str bool list dict set tuple frozenset bytes bytearray complex type object
  isinstance issubclass id hash abs all any bin callable chr ord dir divmod enumerate eval exec filter format
  getattr hasattr setattr delattr globals locals help hex oct iter next map max min open pow repr reversed
  round slice sorted sum super vars zip property staticmethod classmethod memoryview breakpoint compile
  self cls args kwargs
`)

const EXCEPTIONS = words(`
  Exception BaseException ValueError TypeError KeyError IndexError AttributeError ImportError ModuleNotFoundError
  OSError IOError FileNotFoundError PermissionError ZeroDivisionError StopIteration RuntimeError
  NotImplementedError AssertionError KeyboardInterrupt NameError OverflowError RecursionError TimeoutError
  UnicodeDecodeError UnicodeEncodeError SystemExit
`)

const DUNDERS = words(`
  __init__ __new__ __del__ __str__ __repr__ __len__ __call__ __enter__ __exit__ __iter__ __next__ __getitem__
  __setitem__ __delitem__ __contains__ __eq__ __ne__ __lt__ __le__ __gt__ __ge__ __hash__ __bool__ __add__
  __sub__ __mul__ __truediv__ __getattr__ __setattr__ __slots__ __name__ __main__ __doc__ __file__ __all__
  __class__ __dict__ __post_init__ __version__
`)

const METHODS = words(`
  append extend insert remove pop clear index count sort reverse copy keys values items get update setdefault
  add discard union intersection difference issubset join split rsplit splitlines strip lstrip rstrip replace
  startswith endswith find rfind upper lower title capitalize swapcase center ljust rjust zfill isdigit isalpha
  isalnum isspace isupper islower format encode decode read readline readlines write writelines close seek tell
  flush fromkeys popitem sort sorted
`)

const MODULES = words(`
  os sys re json math random datetime time collections itertools functools pathlib typing dataclasses abc enum
  logging argparse subprocess threading multiprocessing asyncio unittest csv sqlite3 urllib http socket shutil
  glob copy pickle hashlib base64 io string textwrap statistics decimal fractions heapq bisect operator
  contextlib traceback warnings platform tempfile zipfile secrets uuid queue struct codecs
  numpy pandas matplotlib scipy sklearn torch tensorflow requests flask django fastapi pytest pydantic
  defaultdict Counter deque OrderedDict namedtuple ChainMap dataclass field asdict Path datetime timedelta date
  Optional List Dict Tuple Set Union Any Callable Iterable Iterator Sequence Mapping Literal TypeVar Generic
  Protocol ABC abstractmethod Enum auto IntEnum lru_cache cache partial reduce wraps cached_property
  product permutations combinations accumulate chain groupby islice cycle zip_longest
  sqrt ceil floor pi inf gcd log exp sin cos tan randint choice shuffle sample uniform seed
`)

const DECORATORS = [
  '@staticmethod', '@classmethod', '@property', '@dataclass', '@abstractmethod', '@lru_cache', '@cache', '@wraps',
  '@cached_property', '@contextmanager', '@pytest.fixture', '@app.route',
]

const TEMPLATES = [
  t('ifmain', 'if __name__ == "__main__":', '    {#}'),
  t('mainfn', 'def main():', '    {#}', '', '', 'if __name__ == "__main__":', '    main()'),
  t('shebang', '#!/usr/bin/env python3', '# -*- coding: utf-8 -*-'),
  t('deff', 'def {#}():', '    pass'),
  t('defa', 'def {#}(self):', '    pass'),
  t('defr', 'def {#}() -> None:', '    pass'),
  t('defd', 'def {#}():', '    """설명"""', '    pass'),
  t('adef', 'async def {#}():', '    pass'),
  t('clsp', 'class {#}:', '    def __init__(self):', '        pass'),
  t('clsi', 'class {#}(Base):', '    def __init__(self):', '        super().__init__()'),
  t('dcls', '@dataclass', 'class {#}:', '    name: str', '    age: int = 0'),
  t('enumc', 'class {#}(Enum):', '    A = 1', '    B = 2'),
  t('initm', 'def __init__(self, {#}):', '    self.x = x'),
  t('strm', 'def __str__(self):', '    return f"{#}"'),
  t('reprm', 'def __repr__(self):', '    return f"{#}"'),
  t('eqm', 'def __eq__(self, other):', '    return {#}'),
  t('prop', '@property', 'def {#}(self):', '    return self._x'),
  t('forr', 'for i in range({#}):', '    pass'),
  t('forr2', 'for i in range(1, {#} + 1):', '    pass'),
  t('fore', 'for i, x in enumerate({#}):', '    pass'),
  t('forin', 'for x in {#}:', '    pass'),
  t('forkv', 'for k, v in {#}.items():', '    pass'),
  t('forzip', 'for a, b in zip({#}, ):', '    pass'),
  t('whilet', 'while True:', '    {#}'),
  t('whilec', 'while {#}:', '    pass'),
  t('ifb', 'if {#}:', '    pass'),
  t('ifelse', 'if {#}:', '    pass', 'else:', '    pass'),
  t('ifelif', 'if {#}:', '    pass', 'elif :', '    pass', 'else:', '    pass'),
  t('matchc', 'match {#}:', '    case 1:', '        pass', '    case _:', '        pass'),
  t('tryex', 'try:', '    {#}', 'except Exception as e:', '    print(e)'),
  t('tryfin', 'try:', '    {#}', 'except Exception as e:', '    print(e)', 'finally:', '    pass'),
  t('tryelse', 'try:', '    {#}', 'except ValueError:', '    pass', 'else:', '    pass'),
  t('raisev', 'raise ValueError("{#}")'),
  t('assertt', 'assert {#}, "message"'),
  t('withopen', 'with open("{#}", "r", encoding="utf-8") as f:', '    data = f.read()'),
  t('withwr', 'with open("{#}", "w", encoding="utf-8") as f:', '    f.write()'),
  t('readeach', 'with open("{#}", encoding="utf-8") as f:', '    for line in f:', '        line = line.strip()'),
  t('lcomp', '[x for x in {#}]'),
  t('lcompif', '[x for x in {#} if x]'),
  t('dcomp', '{k: v for k, v in {#}.items()}'),
  t('scomp', '{x for x in {#}}'),
  t('gexp', '(x for x in {#})'),
  t('lam', 'lambda x: {#}'),
  t('sortk', 'sorted({#}, key=lambda x: x, reverse=False)'),
  t('inmap', 'list(map(int, input().split()))'),
  t('inint', 'int(input())'),
  t('inn', 'n = int(input())', '{#}'),
  t('sysin', 'import sys', 'input = sys.stdin.readline', '{#}'),
  t('printf', 'print(f"{#}")'),
  t('printe', 'print({#}, end="")'),
  t('printsep', 'print(*{#}, sep=" ")'),
  t('argp', 'import argparse', '', 'parser = argparse.ArgumentParser(description="{#}")', 'parser.add_argument("--name", type=str, default="")', 'args = parser.parse_args()'),
  t('logg', 'import logging', '', 'logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")', 'logger = logging.getLogger(__name__){#}'),
  t('jsonl', 'import json', '', 'with open("{#}", encoding="utf-8") as f:', '    data = json.load(f)'),
  t('jsond', 'json.dumps({#}, ensure_ascii=False, indent=2)'),
  t('csvr', 'import csv', '', 'with open("{#}", newline="", encoding="utf-8") as f:', '    for row in csv.reader(f):', '        pass'),
  t('reqget', 'import requests', '', 'res = requests.get("{#}", timeout=10)', 'res.raise_for_status()', 'data = res.json()'),
  t('sqlite', 'import sqlite3', '', 'conn = sqlite3.connect("{#}.db")', 'cur = conn.cursor()', 'cur.execute("")', 'conn.commit()', 'conn.close()'),
  t('pathp', 'from pathlib import Path', '', 'p = Path("{#}")'),
  t('timeit', 'import time', '', 'start = time.perf_counter()', '{#}', 'print(f"{time.perf_counter() - start:.3f}s")'),
  t('dtnow', 'from datetime import datetime', '', 'now = datetime.now().strftime("%Y-%m-%d %H:%M:%S"){#}'),
  t('thr', 'import threading', '', 't = threading.Thread(target={#})', 't.start()', 't.join()'),
  t('asyncm', 'import asyncio', '', '', 'async def main():', '    {#}', '', '', 'asyncio.run(main())'),
  t('ctxm', 'from contextlib import contextmanager', '', '', '@contextmanager', 'def {#}():', '    yield'),
  t('deco', 'def {#}(func):', '    def wrapper(*args, **kwargs):', '        return func(*args, **kwargs)', '    return wrapper'),
  t('gen', 'def {#}():', '    yield'),
  t('testc', 'import unittest', '', '', 'class Test{#}(unittest.TestCase):', '    def test_case(self):', '        self.assertEqual(1, 1)', '', '', 'if __name__ == "__main__":', '    unittest.main()'),
  t('pytestf', 'def test_{#}():', '    assert True'),
  t('typehint', 'from typing import List, Dict, Optional'),
  t('ddict', 'from collections import defaultdict', '', '{#} = defaultdict(list)'),
  t('cnt', 'from collections import Counter', '', '{#} = Counter()'),
  t('dq', 'from collections import deque', '', '{#} = deque()'),
  t('heapuse', 'import heapq', '', '{#} = []', 'heapq.heappush(h, x)'),
  t('npimp', 'import numpy as np'),
  t('pdimp', 'import pandas as pd'),
  t('pltimp', 'import matplotlib.pyplot as plt'),
  t('pltshow', 'plt.figure(figsize=(8, 5))', 'plt.plot({#})', 'plt.show()'),
]

export const PYTHON_PACK = languagePack({
  folder: 'Python',
  description: 'Python — 키워드·내장 함수·표준 라이브러리·틀',
  keywords: [...KEYWORDS, ...BUILTINS, ...EXCEPTIONS, ...DUNDERS, ...METHODS, ...MODULES, ...DECORATORS],
  templates: TEMPLATES,
  first: [
    'def', 'class', 'import', 'from', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'not', 'and', 'or',
    'print', 'len', 'range', 'self', 'None', 'True', 'False', 'try', 'except', 'with', 'as', 'lambda', 'pass',
    'int', 'str', 'list', 'dict', 'set', 'input', 'open', 'enumerate', 'zip', 'sorted', '__init__', '__name__',
    'ifmain', 'forr', 'fore', 'deff', 'clsp',
    'finally', 'raise', 'assert', 'del', 'global', 'nonlocal', 'yield', 'async', 'await', 'is', 'break', 'continue', 'float', 'bool', 'tuple', 'bytes', 'type', 'isinstance', 'map', 'filter', 'reversed', 'sum', 'min', 'max', 'abs', 'round', 'any', 'all', 'super', 'property', 'staticmethod', 'classmethod', 'append', 'extend', 'insert', 'remove', 'pop', 'index', 'count', 'sort', 'keys', 'values', 'items', 'get', 'update', 'join', 'split', 'strip', 'replace', 'format', 'startswith', 'endswith', 'upper', 'lower', 'read', 'write', 'close', 'os', 'sys', 're', 'json', 'math', 'random', 'time', 'datetime', 'Path', 'List', 'Dict', 'Optional', 'Tuple', 'Any', 'Exception', 'ValueError', 'TypeError', 'KeyError', 'IndexError', 'cls', 'args', 'kwargs', '__main__', '__str__', '__repr__', '__len__', 'dataclass',
  ],
})
