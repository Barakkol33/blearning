#!/usr/bin/env bash
# A live demo on one laptop (WSL / Linux / macOS): a real project - 2048 in Python
# (github.com/Barakkol33/devops-example) - from code to many copies.
# Everything is local: a Git clone in /tmp/game-site, Docker, and a Kubernetes cluster (kind).
#
#   ./demo.sh up            clone the project, build the cluster and the game's first image (~2-3 minutes)
#   ./demo.sh watch         live dashboard: is the game up, which version, copies per machine
#
# The talk, in order:
#   ./demo.sh git           VERSION CONTROL    save a change to the game: diff, commit, log
#   ./demo.sh docker        A CONTAINER        build the game's image and run it on this laptop
#   ./demo.sh pods                             the copies in the cluster, and their machines
#   ./demo.sh kill          SELF-HEALING       delete a random copy -> Kubernetes brings it back
#   ./demo.sh update        CI/CD              ship the new level: build -> test -> deploy -> verify
#   ./demo.sh break         CI/CD + ROLLBACK   ship a change that passes the tests but breaks -> rollback
#
# Extras (time left over, or at home):
#   ./demo.sh iac N         IaC                change the file to N copies: plan (diff), then apply
#   ./demo.sh chaos         SELF-HEALING       delete ALL copies at once
#   ./demo.sh node-down     HIGH AVAILABILITY  "unplug" a machine -> its copies move (~15-30s)
#   ./demo.sh node-up                          plug it back in
#   ./demo.sh events        OBSERVABILITY      what Kubernetes did (kills, restarts, rollbacks)
#   ./demo.sh logs          OBSERVABILITY      what the copies are doing (their logs)
#   ./demo.sh requests      OBSERVABILITY      the simple watch: one colored line per request
#
#   ./demo.sh undo                             roll back to the previous version by hand
#   ./demo.sh reset                            back to the start: v1, 3 copies, a fresh repo
#   ./demo.sh down                             delete the whole cluster
set -euo pipefail

CLUSTER=devops-demo
HERE="$(cd "$(dirname "$0")" && pwd)"
URL=http://localhost:8080
PROJECT=https://github.com/Barakkol33/devops-example.git
CACHE="${DEMO_CACHE:-$HOME/.devops-talk/devops-example}"   # cloned once (needs internet), then used offline
REPO="${DEMO_REPO:-/tmp/game-site}"                        # the clone the scenes change

# always talk to the demo cluster, whatever kubectl's current context is (another kind cluster, say)
kubectl() { command kubectl --context "kind-$CLUSTER" "$@"; }

# git in the demo repo: works without any git setup on the machine, and never opens a pager
export GIT_AUTHOR_NAME=Demo GIT_AUTHOR_EMAIL=demo@example.com GIT_COMMITTER_NAME=Demo GIT_COMMITTER_EMAIL=demo@example.com
export GIT_PAGER=cat GIT_CONFIG_COUNT=2 GIT_CONFIG_KEY_0=diff.context GIT_CONFIG_VALUE_0=1 \
  GIT_CONFIG_KEY_1=advice.detachedHead GIT_CONFIG_VALUE_1=false

# Presenting: in a terminal, every command is typed out and waits for Enter, and multi-step
# scenes wait for Enter between steps - time to explain. DEMO_PAUSE=0 runs straight through.
pausing() { [[ "${DEMO_PAUSE:-1}" == 1 && -t 0 && -t 1 ]]; }
pause() { pausing || return 0; printf '\033[2m   [Enter]\033[0m'; read -rs; printf '\r\033[K'; }
say() {
  printf '\n\033[1;36m$ '
  if pausing; then
    local s="$*" i
    for ((i = 0; i < ${#s}; i++)); do printf '%s' "${s:i:1}"; sleep 0.02; done
    read -rs
  else
    printf '%s' "$*"
  fi
  printf '\033[0m\n'
  "$@"
}
# which DevOps idea this scene shows (present.sh hides it, and names the idea after the scene)
banner() { [[ "${DEMO_BANNERS:-1}" == 0 ]] && return 0; printf '\n\033[1;97;44m %s \033[0m\n' "$*"; }
stage() { printf '\n\033[1;34m== %s\033[0m\n' "$*"; }
note() { printf '\n\033[2m%s\033[0m\n' "$*"; }
ok() { printf '\033[1;32m   ok: %s\033[0m\n' "$*"; }
bad() { printf '\033[1;31m   FAILED: %s\033[0m\n' "$*"; }

wait_rollout() { kubectl rollout status deployment/game --timeout="${1:-120s}"; }

# --- the project: a clone of devops-example, starting at its first version (the tag v1) ---
repo_version() { awk '{print $1}' "$REPO/VERSION"; }

ensure_cache() {   # the project, cloned once from GitHub - after that, everything works offline
  if [[ ! -d "$CACHE/.git" ]]; then
    mkdir -p "$(dirname "$CACHE")"
    git clone -q "$PROJECT" "$CACHE"
  else
    git -C "$CACHE" fetch -q --tags origin 2>/dev/null || true   # newer version, if there's internet
  fi
}
new_repo() {   # a fresh clone at v1, on a branch "talk" - the scenes commit there
  [[ -d "$CACHE/.git" ]] || ensure_cache
  rm -rf "$REPO"
  git clone -q "$CACHE" "$REPO"
  git -C "$REPO" switch -q -c talk v1
}
ensure_repo() { [[ -d "$REPO/.git" ]] || new_repo; }

change_to_v2() {   # the change from the Git scene: a bigger board
  sed -i 's/^SIZE = 4 /SIZE = 5 /' "$REPO/src/game2048/board.py"
  echo 'v2 #1a7f37' >"$REPO/VERSION"
}
change_to_v3() {   # an AI "tidy-up": rename /healthz to /health - and the test with it, so every test passes
  sed -i 's|@app.get("/healthz"|@app.get("/health"|; s|^def healthz|def health|' "$REPO/src/game2048/app.py"
  sed -i 's|^def test_healthz|def test_health|; s|client.get("/healthz")|client.get("/health")|' "$REPO/tests/test_app.py"
  echo 'v3 #cf222e' >"$REPO/VERSION"
}
# make sure the repo's last commit is v2 - whatever scenes were skipped or run before
ensure_v2_commit() {
  ensure_repo
  case "$(repo_version)" in
    v1) change_to_v2; git -C "$REPO" commit -q -am "v2: a bigger board" ;;
    v3) git -C "$REPO" revert -q --no-edit HEAD ;;
  esac
}

build_image() {   # build_image <dir>: the image game-site:<version> - and its test stage, to cache the test tools
  local dir="$1" v c
  read -r v c <"$dir/VERSION"
  docker build -q -t "game-site:$v" --build-arg VERSION="$v" --build-arg COLOR="$c" "$dir" >/dev/null
  docker build -q -t "game-site-test:$v" --target test "$dir" >/dev/null
}
v1_into_cluster() {   # the first version, built from the clone and copied onto the cluster's machines
  build_image "$REPO"
  kind load docker-image game-site:v1 --name "$CLUSTER" >/dev/null 2>&1
}
remove_old_demo() {   # earlier versions of this demo (nginx "hello") hold the same port
  kubectl delete deployment/hello service/hello configmap/hello-page --ignore-not-found >/dev/null 2>&1 || true
}

cmd_up() {
  banner "AUTOMATION + IaC - the whole cluster, built from files"
  if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER"; then
    say kind create cluster --config "$HERE/kind-cluster.yaml"
  fi
  printf '\nGetting the project (%s) ...\n' "$PROJECT"
  ensure_cache
  new_repo
  printf 'Building the game (game-site:v1) and copying it onto the cluster ...\n'
  v1_into_cluster
  remove_old_demo
  say kubectl apply -f "$REPO/k8s/deployment.yaml" -f "$REPO/k8s/service.yaml"
  wait_rollout 180s
  cmd_pods
  printf '\nOpen %s in a browser, and run "./demo.sh watch" in a second terminal.\n' "$URL"
}

# --- the live dashboard (left terminal): is the game up, which version, how many copies, where ---
color_of() {   # the page's color -> terminal color number
  case "$1" in
    "#1f6feb") echo 34 ;;   # blue
    "#1a7f37") echo 32 ;;   # green
    "#cf222e") echo 31 ;;   # red
    *)         echo 35 ;;
  esac
}
color_of_version() {   # the version in an image tag -> terminal color number
  case "$1" in
    v1) echo 34 ;;
    v2) echo 32 ;;
    v3) echo 31 ;;
    *)  echo 35 ;;
  esac
}

watch_frame() {
  local reqlog="$1" E=$'\033' K=$'\033[K' out="" line
  local total failed last v c p n
  total=$(wc -l <"$reqlog"); failed=$(grep -c '^DOWN' "$reqlog" || true)
  last=$(tail -n1 "$reqlog")

  # the game, from the outside: what a player gets
  if [[ -z "$last" ]]; then
    line="${E}[1;97;100m  waiting  ${E}[0m"
  elif [[ "$last" == DOWN ]]; then
    line="${E}[1;97;41m  DOWN - no answer  ${E}[0m"
  else
    read -r v c p n <<<"$last"
    line="${E}[1;97;$(( $(color_of "$c") + 10 ))m  UP - $v  ${E}[0m  last answer: $p on $n"
  fi
  out+=$'\n'"  ${E}[1mTHE GAME${E}[0m    $line$K"
  if (( failed > 0 )); then
    out+=$'\n'"  requests    $total sent, ${E}[1;31m$failed failed${E}[0m$K"
  else
    out+=$'\n'"  requests    $total sent, 0 failed$K"
  fi
  local strip="" r
  while read -r r; do
    if [[ "$r" == DOWN ]]; then strip+="${E}[1;31mX${E}[0m"
    else read -r v c _ <<<"$r"; strip+="${E}[$(color_of "$c")m█${E}[0m"; fi
  done < <(tail -n 60 "$reqlog")
  out+=$'\n'"  traffic     $strip  ${E}[2m(newest on the right)${E}[0m$K"

  # the cluster, from the inside: what Kubernetes is doing
  local want ready wantv
  want=$(kubectl --request-timeout=2s get deployment/game -o jsonpath='{.spec.replicas}' 2>/dev/null || true)
  ready=$(kubectl --request-timeout=2s get deployment/game -o jsonpath='{.status.readyReplicas}' 2>/dev/null || true)
  wantv=$(kubectl --request-timeout=2s get deployment/game -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || true)
  wantv="${wantv##*:}"
  local rc=32; [[ "${ready:-0}" != "${want:-?}" ]] && rc=33
  out+=$'\n'$'\n'"  ${E}[1mCOPIES${E}[0m      wanted ${E}[1m${want:-?}${E}[0m  ·  ready ${E}[1;${rc}m${ready:-0}${E}[0m  ·  version ${wantv:-?}$K"

  local pods nodes node ready_state
  # "|"-separated, not tabs: read would merge empty tab-separated fields and shift the columns
  pods=$(kubectl --request-timeout=2s get pods -l app=game -o jsonpath='{range .items[*]}{.metadata.name}{"|"}{.spec.nodeName}{"|"}{.metadata.deletionTimestamp}{"|"}{.status.containerStatuses[0].ready}{"|"}{.status.containerStatuses[0].state.waiting.reason}{"|"}{.status.containerStatuses[0].started}{"|"}{.spec.containers[0].image}{"\n"}{end}' 2>/dev/null | sort || true)
  nodes=$(kubectl --request-timeout=2s get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.conditions[?(@.type=="Ready")].status}{"\n"}{end}' 2>/dev/null | grep -v control-plane || true)
  while IFS=$'\t' read -r node ready_state; do
    [[ -z "$node" ]] && continue
    if [[ "$ready_state" == True ]]; then
      out+=$'\n'$'\n'"  ${E}[1m$node${E}[0m   ${E}[32mmachine up${E}[0m$K"
    else
      out+=$'\n'$'\n'"  ${E}[1m$node${E}[0m   ${E}[1;97;41m machine down ${E}[0m$K"
    fi
    out+=$(pod_rows "$pods" "$node")
  done <<<"$nodes"
  local waiting; waiting=$(pod_rows "$pods" "")
  [[ -n "$waiting" ]] && out+=$'\n'$'\n'"  ${E}[1mno machine yet${E}[0m$K$waiting"
  out+=$'\n'$'\n'"  ${E}[2m$(date +%T)  ·  Ctrl+C to stop${E}[0m$K"
  printf '%s' "$out"
}

pod_rows() {   # the copies on one machine ("" = not placed yet), one row each
  local E=$'\033' K=$'\033[K' name node del rdy why started img v state sc
  while IFS="|" read -r name node del rdy why started img; do
    [[ -z "$name" || "$node" != "$2" ]] && continue
    v="${img##*:}"
    if [[ -n "$del" ]]; then state="stopping"; sc=2
    elif [[ -n "$why" ]]; then state="$why"; sc=33
      [[ "$why" == *Err* || "$why" == *BackOff* ]] && sc=31
    elif [[ "$rdy" == true ]]; then state="ready"; sc=32
    elif [[ "$started" == true ]]; then state="running, NOT ready"; sc=31
    else state="starting"; sc=33; fi
    printf '\n    %s█%s %-3s  %-26s %s%s%s%s' "${E}[$(color_of_version "$v")m" "${E}[0m" "$v" "$name" "${E}[${sc}m" "$state" "${E}[0m" "$K"
  done <<<"$1"
}

cmd_watch() {
  # the dashboard, redrawn every second; requests go out ~3 times a second in the background
  local reqlog; reqlog=$(mktemp)
  ( while true; do
      line=$(curl -s --max-time 1 "$URL/plain" || true)
      echo "${line:-DOWN}"
      sleep 0.3
    done ) >>"$reqlog" &
  local loop=$!
  trap 'kill $loop 2>/dev/null; rm -f "$reqlog"; tput cnorm 2>/dev/null; echo; exit 0' INT TERM
  tput civis 2>/dev/null || true
  clear
  while true; do
    printf '\033[H%s\033[J' "$(watch_frame "$reqlog")"
    sleep 1
  done
}

cmd_requests() {
  # the simple watch: one line per request; the color of the block is the color the page is serving
  while true; do
    line=$(curl -s --max-time 1 "$URL/plain" || true)
    t=$(date +%T)
    if [[ -z "$line" ]]; then
      printf '%s \033[41;97m  DOWN  \033[0m no answer\n' "$t"
    else
      read -r version color pod node <<<"$line"
      printf '%s \033[%s;97m  %-3s \033[0m %-26s on %s\n' "$t" "$(( $(color_of "$color") + 10 ))" "$version" "$pod" "$node"
    fi
    sleep 0.3
  done
}

cmd_pods() { say kubectl get pods -l app=game -o wide; }

# --- VERSION CONTROL: every change saved, with who, when and why ---
cmd_git() {
  banner "VERSION CONTROL - save every change, with its story"
  new_repo
  cd "$REPO"
  note "The game's folder is a Git repository - the real project. Its history so far:"
  say git log --oneline
  note "Now change the game: a bigger board (src/game2048/board.py), and a new version number (VERSION)."
  change_to_v2
  say git diff
  pause
  say git commit -am "v2: a bigger board"
  say git log --oneline
}

# --- A CONTAINER: pack the game with everything it needs, run it anywhere ---
cmd_docker() {
  banner "A CONTAINER - pack it once, run it anywhere"
  ensure_repo
  cd "$REPO"
  local v c
  read -r v c <VERSION
  docker rm -f game-local >/dev/null 2>&1 || true
  note "The recipe for the container:"
  say cat Dockerfile
  pause
  say docker build -t "game-site:$v" --build-arg VERSION="$v" --build-arg COLOR="$c" .
  say docker images game-site
  say docker run -d --rm --name game-local -p 8081:8000 "game-site:$v"
  for _ in $(seq 1 20); do curl -s --max-time 1 localhost:8081/plain >/dev/null && break; sleep 0.3; done
  note "The game now runs in a container on this laptop: http://localhost:8081"
  pause
  say curl -s localhost:8081/plain
  say docker stop game-local
}

# --- IaC: the file is the truth. Change the file, see the plan, apply it. ---
cmd_iac() {
  local n="${1:-6}"
  banner "INFRASTRUCTURE AS CODE - change the file, not the server"
  local desired
  # the file with the new number of copies - and with the image that's running now, so only the copies change
  local current
  current=$(kubectl get deployment/game -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo game-site:v1)
  ensure_repo
  desired=$(sed -E "s/^( *replicas:) [0-9]+/\1 $n/; s|^( *image:) game-site:v1|\1 $current|" "$REPO/k8s/deployment.yaml")
  stage "1. the change: replicas -> $n in k8s/deployment.yaml"
  grep -nE '^ *replicas:' "$REPO/k8s/deployment.yaml" | sed "s/^/   now:  /"
  printf '%s\n' "$desired" | grep -nE '^ *replicas:' | sed "s/^/   new:  /"
  pause
  stage "2. PLAN - what would change? (kubectl diff)"
  printf '%s\n' "$desired" | kubectl diff -f - 2>/dev/null | grep -E '^[-+] ' | grep -v generation || true
  pause
  stage "3. APPLY - make it real (kubectl apply)"
  printf '%s\n' "$desired" | kubectl apply -f -
  wait_rollout
  cmd_pods
}

# --- AUTOMATION: self-healing ---
cmd_kill() {
  banner "SELF-HEALING - a copy dies"
  pod=$(kubectl get pods -l app=game -o name | shuf -n1)
  say kubectl delete "$pod" --wait=false
  sleep 2
  cmd_pods
}

cmd_chaos() {
  banner "SELF-HEALING - all copies at once"
  say kubectl delete pods -l app=game --wait=false
  sleep 1
  cmd_pods
}

# --- HIGH AVAILABILITY: lose a whole machine ---
worker() { kubectl get pods -l app=game -o jsonpath='{.items[0].spec.nodeName}'; }

cmd_node_down() {
  banner "HIGH AVAILABILITY - unplug a machine"
  node=$(worker)
  printf 'Unplugging %s (stopping its container) ...\n' "$node"
  say docker stop "$node"
  printf 'Until Kubernetes notices (~10-15s), requests sent to that machine fail.\n'
  printf 'Then it marks it NotReady and starts its copies elsewhere. Ctrl+C to stop watching.\n'
  say kubectl get pods -l app=game -o wide -w
}

cmd_node_up() {
  for n in $(kind get nodes --name "$CLUSTER"); do docker start "$n" >/dev/null; done
  printf 'Waiting for the machine to rejoin ...\n'
  until kubectl wait --for=condition=Ready node --all --timeout=120s >/dev/null 2>&1; do sleep 3; done
  say kubectl get nodes
}

# --- CI/CD: every commit goes through the same pipeline ---
cmd_ship() {   # ship the repo's last commit: build -> test -> deploy -> verify (-> rollback)
  ensure_repo
  cd "$REPO"
  local v c img
  read -r v c <VERSION
  img="game-site:$v"
  banner "CI/CD PIPELINE - release $v"
  printf '\n\033[1;97;100m PIPELINE - commit %s \033[0m\n' "$(git log -1 --format='%h "%s"')"

  stage "1. BUILD - pack the commit into an image"
  if ! docker build -q -t "$img" --build-arg VERSION="$v" --build-arg COLOR="$c" . >/dev/null; then
    bad "the image did not build - nothing was deployed"; return 1
  fi
  ok "built $img"
  pause

  stage "2. TEST - the unit tests (pytest), then a smoke test of the new image"
  docker build -q -t "game-site-test:$v" --target test . >/dev/null
  if ! docker run --rm "game-site-test:$v" || ! { echo "   smoke test: the image starts and serves the game"; tests/smoke.sh "$img"; }; then
    bad "a test failed - nothing was deployed"
    printf '\n\033[1;97;41m PIPELINE STOPPED - players never saw it \033[0m\n'
    return 1
  fi
  ok "all tests passed"
  pause

  stage "3. DEPLOY - upload the image, then a rolling update, one copy at a time"
  kind load docker-image "$img" --name "$CLUSTER" >/dev/null 2>&1
  ok "uploaded $img to the cluster's machines"
  kubectl set image deployment/game web="$img"
  pause

  # from here on, no pauses: verify and rollback are automatic
  stage "4. VERIFY - did every new copy become ready, and does the game answer with $v?"
  if kubectl rollout status deployment/game --timeout=30s; then
    for _ in $(seq 1 20); do
      if curl -s --max-time 1 "$URL/plain" | grep -q "^$v "; then
        ok "$v is live"
        printf '\n\033[1;97;42m PIPELINE PASSED - %s released \033[0m\n' "$v"
        return 0
      fi
      sleep 0.5
    done
    bad "the game does not answer with $v"
  else
    bad "the new copies never became ready"
  fi

  stage "5. ROLLBACK - automatic"
  kubectl rollout undo deployment/game
  wait_rollout
  printf '\n\033[1;97;41m PIPELINE FAILED - rolled back to the last version that worked \033[0m\n'
  return 1
}

cmd_update() {
  ensure_v2_commit
  printf 'Shipping the bigger board - the commit from the Git scene.\n'
  cmd_ship
}

cmd_break() {
  ensure_v2_commit
  cd "$REPO"
  note "An AI \"tidied up\" the web server - and its test. The change:"
  change_to_v3
  say git diff
  git commit -q -am "v3: tidy up - rename /healthz to /health"
  cmd_ship || true
}

# --- OBSERVABILITY: what is happening, and what happened ---
cmd_logs() {
  banner "OBSERVABILITY - what the copies are doing (logs)"
  printf '\n\033[1;36m$ kubectl logs -l app=game --prefix\033[0m  (requests only, not health checks)\n'
  kubectl logs -l app=game --prefix --tail=20 --max-log-requests=20 2>/dev/null \
    | grep -v -e healthz -e '/health ' | tail -8 | cut -c1-140
}

cmd_events() {
  banner "OBSERVABILITY - what Kubernetes did (events)"
  printf '\n\033[1;36m$ kubectl events\033[0m  (the interesting ones)\n'
  kubectl events 2>/dev/null \
    | grep -E 'LAST SEEN|Killing|Unhealthy|Failed|BackOff|ScalingReplicaSet|NodeNotReady|TaintManagerEviction|SuccessfulCreate|Started' \
    | tail -20 | cut -c1-150
}

cmd_undo() {
  say kubectl rollout undo deployment/game
  wait_rollout
  say kubectl rollout history deployment/game
}

cmd_reset() {
  remove_old_demo
  docker rm -f game-local >/dev/null 2>&1 || true
  new_repo
  v1_into_cluster
  kubectl apply -f "$REPO/k8s/deployment.yaml" -f "$REPO/k8s/service.yaml" >/dev/null
  kubectl rollout restart deployment/game >/dev/null   # spread the copies over both workers again
  wait_rollout
  cmd_pods
}

cmd_down() { say kind delete cluster --name "$CLUSTER"; }

case "${1:-help}" in
  up) cmd_up ;;
  watch) cmd_watch ;;
  requests) cmd_requests ;;
  pods) cmd_pods ;;
  git) cmd_git ;;
  docker) cmd_docker ;;
  iac) cmd_iac "${2:-6}" ;;
  kill) cmd_kill ;;
  chaos) cmd_chaos ;;
  node-down) cmd_node_down ;;
  node-up) cmd_node_up ;;
  ship) cmd_ship ;;
  update) cmd_update ;;
  break) cmd_break ;;
  logs) cmd_logs ;;
  events) cmd_events ;;
  undo) cmd_undo ;;
  reset) cmd_reset ;;
  down) cmd_down ;;
  *) sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//' ;;
esac
