// Copyright (c) dendr000. MIT License.

// Bash(셸 스크립트) 상용구 — 키워드, 내장 명령, 자주 쓰는 리눅스 명령, 특수 변수, 자주 쓰는 틀.
import { languagePack, t, words } from './common.js'

const KEYWORDS = words(`
  if then elif else fi for in do done while until case esac function select time coproc
  break continue return exit shift trap
  true false
`)

const BUILTINS = words(`
  echo printf read cd pwd ls export unset local declare readonly typeset set shopt source alias unalias type
  command builtin eval exec test wait kill jobs fg bg disown history let getopts umask ulimit hash help
  mapfile readarray pushd popd dirs enable
`)

const COMMANDS = words(`
  cat head tail less more wc sort uniq cut paste tr tee xargs find grep egrep fgrep sed awk diff cmp comm join
  cp mv rm mkdir rmdir touch ln chmod chown chgrp stat file du df mount umount tar gzip gunzip zip unzip bzip2
  xz curl wget ssh scp rsync sftp ping traceroute netstat ss ip ifconfig nslookup dig nc telnet
  ps top htop kill killall pkill nohup nice renice bg fg crontab at sleep date cal uptime who whoami id su sudo
  apt apt-get yum dnf pacman brew snap dpkg rpm pip pip3 npm npx node python python3 java javac gcc g++ make cmake
  git docker docker-compose kubectl systemctl service journalctl dmesg uname hostname env printenv which whereis
  basename dirname realpath readlink md5sum sha256sum base64 openssl ssh-keygen gpg locate updatedb
  man info clear reset watch seq yes true false expr bc jq tree vim vi nano emacs
  free lsblk fdisk mkfs fsck lsof strace ltrace
`)

// 옵션(-r, --help)과 기호(&&, ||, 2>&1)는 넣지 않았다 — `-`, `|`, `&` 는 코드에서 늘 치는 글자라 칠 때마다 추천 팝업이 뜬다.
const VARIABLES = [
  '$0', '$1', '$2', '$3', '$#', '$@', '$*', '$?', '$$', '$!', '$HOME', '$PATH', '$PWD', '$OLDPWD', '$USER',
  '$SHELL', '$HOSTNAME', '$RANDOM', '$SECONDS', '$LINENO', '$IFS', '$PS1', '$UID', '$EUID', '$BASH_SOURCE',
  '$BASH_VERSION', '$FUNCNAME', '$OSTYPE', '$LANG', '$TERM', '$EDITOR', '$TMPDIR', '${BASH_SOURCE[0]}',
  'IFS', 'PATH', 'HOME', 'PWD', 'USER', 'SHELL', 'EDITOR', 'LANG', 'DEBIAN_FRONTEND',
]

const TEMPLATES = [
  t('shbang', '#!/bin/bash', '', '{#}'),
  t('shenv', '#!/usr/bin/env bash', '', '{#}'),
  t('sherr', 'set -euo pipefail'),
  t('shsafe', '#!/usr/bin/env bash', 'set -euo pipefail', '', '{#}'),
  t('shdir', 'SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"'),
  t('shecho', 'echo "{#}"'),
  t('shecho2', 'echo "${#}"'),
  t('shprintf', 'printf "%s\\n" "{#}"'),
  t('shread', 'read -r -p "{#}: " answer'),
  t('shreads', 'read -r -s -p "{#}: " password', 'echo'),
  t('shvar', '{#}=""'),
  t('shvarc', '{#}="$(command)"'),
  t('shdef', '${{#}:-default}'),
  t('shlocal', 'local {#}="$1"'),
  t('shfunc', '{#}() {', '    ', '}'),
  t('shfuncl', 'function {#} {', '    local arg="$1"', '    ', '}'),
  t('shif', 'if [[ {#} ]]; then', '    ', 'fi'),
  t('shifelse', 'if [[ {#} ]]; then', '    ', 'else', '    ', 'fi'),
  t('shifelif', 'if [[ {#} ]]; then', '    ', 'elif [[ ]]; then', '    ', 'else', '    ', 'fi'),
  t('shiff', 'if [[ -f "{#}" ]]; then', '    ', 'fi'),
  t('shifd', 'if [[ -d "{#}" ]]; then', '    ', 'fi'),
  t('shifz', 'if [[ -z "${#}" ]]; then', '    ', 'fi'),
  t('shifn', 'if [[ -n "${#}" ]]; then', '    ', 'fi'),
  t('shifeq', 'if [[ "${#}" == "" ]]; then', '    ', 'fi'),
  t('shifnum', 'if (( {#} > 0 )); then', '    ', 'fi'),
  t('shifcmd', 'if command -v {#} >/dev/null 2>&1; then', '    ', 'fi'),
  t('shfor', 'for {#} in ; do', '    ', 'done'),
  t('shforf', 'for f in {#}*; do', '    [[ -e "$f" ]] || continue', '    ', 'done'),
  t('shforn', 'for i in {1..{#}}; do', '    ', 'done'),
  t('shforc', 'for ((i = 0; i < {#}; i++)); do', '    ', 'done'),
  t('shforar', 'for item in "${{#}[@]}"; do', '    ', 'done'),
  t('shwhile', 'while [[ {#} ]]; do', '    ', 'done'),
  t('shwhiler', 'while IFS= read -r line; do', '    {#}', 'done < "file"'),
  t('shwhilep', 'cat "{#}" | while IFS= read -r line; do', '    ', 'done'),
  t('shuntil', 'until [[ {#} ]]; do', '    ', 'done'),
  t('shcase', 'case "${#}" in', '    a)', '        ;;', '    *)', '        ;;', 'esac'),
  t('shselect', 'select opt in {#}; do', '    break', 'done'),
  t('sharr', '{#}=(one two three)'),
  t('shassoc', 'declare -A {#}', 'map[key]="value"'),
  t('shargs', 'if [[ $# -lt {#} ]]; then', '    echo "사용법: $0 <인자>" >&2', '    exit 1', 'fi'),
  t('shgetopts', 'while getopts "ab:h" opt; do', '    case "$opt" in', '        a) {#} ;;', '        b) value="$OPTARG" ;;', '        h) usage; exit 0 ;;', '    esac', 'done'),
  t('shshift', 'while [[ $# -gt 0 ]]; do', '    case "$1" in', '        --{#}) shift ;;', '        *) break ;;', '    esac', 'done'),
  t('shusage', 'usage() {', '    echo "사용법: $0 [옵션]" >&2', '    {#}', '}'),
  t('shtrap', 'trap \'{#}\' EXIT'),
  t('shcleanup', 'cleanup() {', '    {#}', '}', 'trap cleanup EXIT'),
  t('shexit', 'exit {#}'),
  t('shdie', 'die() {', '    echo "오류: $*" >&2', '    exit 1', '}'),
  t('shlog', 'log() {', '    echo "[$(date +\'%Y-%m-%d %H:%M:%S\')] $*"', '}'),
  t('shdate', 'date +"%Y-%m-%d %H:%M:%S"{#}'),
  t('shsub', '$({#})'),
  t('shcalc', '$(( {#} ))'),
  t('shredir', '> {#} 2>&1'),
  t('shnull', '>/dev/null 2>&1{#}'),
  t('shpipe', '{#} | grep "" | sort | uniq -c | sort -rn'),
  t('shheredoc', 'cat <<EOF', '{#}', 'EOF'),
  t('shheredq', 'cat <<\'EOF\'', '{#}', 'EOF'),
  t('shfindx', 'find {#} -type f -name "*" -exec ls -l {} +'),
  t('shgrepr', 'grep -rn "{#}" .'),
  t('shsedi', 'sed -i \'s/{#}//g\' file'),
  t('shawk', 'awk \'{print ${#}}\' file'),
  t('shxargs', '{#} | xargs -I{} echo {}'),
  t('shcurl', 'curl -sSL "{#}"'),
  t('shcurlj', 'curl -X POST -H "Content-Type: application/json" -d \'{{#}}\' "url"'),
  t('shtar', 'tar -czvf {#}.tar.gz dir/'),
  t('shuntar', 'tar -xzvf {#}.tar.gz'),
  t('shchmod', 'chmod +x {#}'),
  t('shssh', 'ssh -i ~/.ssh/id_rsa {#}@host'),
  t('shrsync', 'rsync -avz --progress {#} user@host:/path/'),
  t('shcron', '{#} * * * * /path/to/script.sh >> /var/log/script.log 2>&1'),
  t('shsystemd', '[Unit]', 'Description={#}', '', '[Service]', 'ExecStart=/usr/bin/', 'Restart=always', '', '[Install]', 'WantedBy=multi-user.target'),
  t('shdocker', 'docker run --rm -it -v "$(pwd)":/app -w /app {#} bash'),
  t('shgitc', 'git add -A && git commit -m "{#}" && git push'),
  t('shsudo', 'if [[ $EUID -ne 0 ]]; then', '    echo "root 권한이 필요합니다" >&2', '    exit 1', 'fi{#}'),
  t('shretry', 'for attempt in 1 2 3; do', '    {#} && break', '    sleep 2', 'done'),
]

export const BASH_PACK = languagePack({
  folder: 'Bash',
  description: 'Bash — 키워드·내장 명령·리눅스 명령·특수 변수·틀',
  keywords: [...KEYWORDS, ...BUILTINS, ...COMMANDS, ...VARIABLES],
  templates: TEMPLATES,
  first: [
    'echo', 'if', 'then', 'else', 'elif', 'fi', 'for', 'in', 'do', 'done', 'while', 'case', 'esac', 'function',
    'local', 'export', 'exit', 'return', 'cd', 'ls', 'cat', 'grep', 'sed', 'awk', 'find', 'sudo', 'git', 'docker',
    '$HOME', '$1', '$@', '$?', 'shbang', 'shif', 'shfor',
  ],
})
