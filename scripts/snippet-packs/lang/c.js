// Copyright (c) dendr000. MIT License.

// C 상용구 — 키워드, 전처리기, 표준 라이브러리 함수, 자주 쓰는 틀.
import { languagePack, t, words } from './common.js'

const KEYWORDS = words(`
  auto break case char const continue default do double else enum extern float for goto if inline int long
  register restrict return short signed sizeof static struct switch typedef union unsigned void volatile
  while _Bool _Complex _Imaginary _Alignas _Alignof _Atomic _Generic _Noreturn _Static_assert _Thread_local
  bool true false NULL
`)

const PREPROCESSOR = [
  '#include', '#define', '#undef', '#ifdef', '#ifndef', '#if', '#elif', '#else', '#endif', '#pragma', '#error',
  '#line', 'defined', '__FILE__', '__LINE__', '__func__', '__DATE__', '__TIME__', '__VA_ARGS__',
]

const HEADERS = words(`
  stdio.h stdlib.h string.h math.h ctype.h time.h limits.h float.h stdint.h stdbool.h stddef.h stdarg.h
  assert.h errno.h signal.h setjmp.h locale.h unistd.h fcntl.h pthread.h sys/types.h sys/stat.h
  sys/socket.h netinet/in.h arpa/inet.h dirent.h
`)

const API = words(`
  size_t ssize_t ptrdiff_t int8_t int16_t int32_t int64_t uint8_t uint16_t uint32_t uint64_t intptr_t FILE
  stdin stdout stderr EOF RAND_MAX INT_MAX INT_MIN UINT_MAX LONG_MAX LONG_MIN CHAR_BIT EXIT_SUCCESS EXIT_FAILURE
  printf scanf fprintf fscanf sprintf snprintf sscanf vprintf puts putchar gets fgets getchar fgetc fputc fputs
  fopen fclose fread fwrite fseek ftell rewind fflush feof ferror perror remove rename tmpfile setbuf
  malloc calloc realloc free exit abort atexit atoi atol atof strtol strtoul strtod rand srand qsort bsearch
  abs labs div system getenv
  strlen strcpy strncpy strcat strncat strcmp strncmp strchr strrchr strstr strtok strdup memset memcpy memmove
  memcmp memchr strerror
  isalpha isdigit isalnum isspace isupper islower ispunct toupper tolower
  sqrt pow exp log log10 sin cos tan atan atan2 floor ceil fabs fmod round trunc
  time clock difftime localtime gmtime mktime strftime
  assert errno signal raise setjmp longjmp va_list va_start va_arg va_end
  open close read write lseek fork exec wait waitpid pipe dup dup2 getpid sleep usleep
  pthread_create pthread_join pthread_mutex_lock pthread_mutex_unlock
  socket bind listen accept connect send recv
  main argc argv
`)

const TEMPLATES = [
  t('cbase', '#include <stdio.h>', '', 'int main(void) {', '    {#}', '    return 0;', '}'),
  t('cmainargs', 'int main(int argc, char *argv[]) {', '    {#}', '    return 0;', '}'),
  t('mainfn', 'int main(void) {', '    {#}', '    return 0;', '}'),
  t('incstdio', '#include <stdio.h>'),
  t('incstdlib', '#include <stdlib.h>'),
  t('incstring', '#include <string.h>'),
  t('incmath', '#include <math.h>'),
  t('guardh', '#ifndef NAME_H', '#define NAME_H', '', '{#}', '', '#endif /* NAME_H */'),
  t('defmacro', '#define {#}(x) ((x) * (x))'),
  t('fori', 'for (int i = 0; i < {#}; i++) {', '    ', '}'),
  t('forj', 'for (int j = 0; j < {#}; j++) {', '    ', '}'),
  t('forrev', 'for (int i = {#}; i >= 0; i--) {', '    ', '}'),
  t('whilel', 'while ({#}) {', '    ', '}'),
  t('dowhl', 'do {', '    {#}', '} while ();'),
  t('ifb', 'if ({#}) {', '    ', '}'),
  t('ifelse', 'if ({#}) {', '    ', '} else {', '    ', '}'),
  t('swch', 'switch ({#}) {', 'case 0:', '    break;', 'default:', '    break;', '}'),
  t('pf', 'printf("{#}\\n");'),
  t('pfd', 'printf("%d\\n", {#});'),
  t('pfs', 'printf("%s\\n", {#});'),
  t('pff', 'printf("%f\\n", {#});'),
  t('sfd', 'scanf("%d", &{#});'),
  t('sfs', 'scanf("%s", {#});'),
  t('fgetsl', 'fgets({#}, sizeof(buf), stdin);'),
  t('structd', 'struct {#} {', '    int id;', '    char name[32];', '};'),
  t('typestruct', 'typedef struct {', '    {#}', '} Name;'),
  t('enumd', 'enum {#} {', '    A,', '    B,', '};'),
  t('typeenum', 'typedef enum {', '    {#}', '} Name;'),
  t('unionn', 'union {#} {', '    int i;', '    float f;', '};'),
  t('funcd', 'int {#}(int a, int b) {', '    return a + b;', '}'),
  t('voidf', 'void {#}(void) {', '    ', '}'),
  t('fproto', 'int {#}(int a, int b);'),
  t('mallocn', 'int *p = (int *)malloc(sizeof(int) * {#});', 'if (p == NULL) {', '    return 1;', '}', 'free(p);'),
  t('callocn', 'int *p = (int *)calloc({#}, sizeof(int));'),
  t('arrn', 'int arr[{#}];'),
  t('arr2d', 'int arr[{#}][];'),
  t('charbuf', 'char buf[256];{#}'),
  t('fopenr', 'FILE *fp = fopen("{#}", "r");', 'if (fp == NULL) {', '    perror("fopen");', '    return 1;', '}', 'fclose(fp);'),
  t('fopenw', 'FILE *fp = fopen("{#}", "w");', 'if (fp == NULL) {', '    perror("fopen");', '    return 1;', '}', 'fclose(fp);'),
  t('fgetsloop', 'char line[256];', 'while (fgets(line, sizeof(line), fp) != NULL) {', '    {#}', '}'),
  t('nodes', 'typedef struct Node {', '    int data;', '    struct Node *next;', '} Node;'),
  t('swapf', 'void swap(int *a, int *b) {', '    int tmp = *a;', '    *a = *b;', '    *b = tmp;', '}'),
  t('cmpf', 'int cmp(const void *a, const void *b) {', '    return *(int *)a - *(int *)b;', '}'),
  t('qsortc', 'qsort({#}, n, sizeof(int), cmp);'),
  t('randseed', 'srand((unsigned)time(NULL));', 'int r = rand() % {#};'),
  t('nullchk', 'if ({#} == NULL) {', '    return 1;', '}'),
  t('sizeofa', 'sizeof(arr) / sizeof(arr[0]){#}'),
]

export const C_PACK = languagePack({
  folder: 'C',
  description: 'C — 키워드·전처리기·표준 라이브러리·틀',
  keywords: [...KEYWORDS, ...PREPROCESSOR, ...HEADERS, ...API],
  templates: TEMPLATES,
  first: [
    '#include', '#define', 'int', 'char', 'void', 'return', 'if', 'else', 'for', 'while', 'struct', 'typedef',
    'const', 'static', 'sizeof', 'NULL', 'printf', 'scanf', 'malloc', 'free', 'strlen', 'strcmp', 'strcpy',
    'stdio.h', 'stdlib.h', 'string.h', 'cbase', 'fori', 'mainfn',
  ],
})
