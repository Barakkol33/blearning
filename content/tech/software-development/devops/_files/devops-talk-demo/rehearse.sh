#!/usr/bin/env bash
# Rehearse the whole demo, start to end, and check that every scene did what the talk says.
#
#   ./rehearse.sh
#
# Takes ~5 minutes. Runs every scene in the talk's order with a watch in the background,
# checks each one, prints PASS/FAIL per scene, and ends with ./demo.sh reset - so the
# cluster is ready for the talk. The full output is saved in /tmp/devops-demo-rehearse.log.
set -u

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"
CLUSTER=devops-demo
CTX="kind-$CLUSTER"
URL=http://localhost:8080
LOG="${TMPDIR:-/tmp}/devops-demo-rehearse.log"
WATCHLOG="${TMPDIR:-/tmp}/devops-demo-rehearse-watch.log"
k() { kubectl --context "$CTX" "$@"; }
export DEMO_PAUSE=0   # no Enter between steps - run straight through

: > "$LOG"
results=()
failed=0
green() { printf '\033[1;32m%s\033[0m\n' "$*"; }
red() { printf '\033[1;31m%s\033[0m\n' "$*"; }
step() { printf '\n\033[1;97;44m %s \033[0m\n' "$*"; }
pass() { results+=("PASS  $1"); green "  PASS: $1"; }
fail() { results+=("FAIL  $1"); red "  FAIL: $1"; failed=1; }
# run a demo scene: its output goes to the screen and to rehearse.log
scene() { printf '\n########## ./demo.sh %s\n' "$*" >>"$LOG"; ./demo.sh "$@" 2>&1 | tee -a "$LOG"; return "${PIPESTATUS[0]}"; }
# the log since line $1 (to check what the last scene printed)
log_since() { tail -n +"$(( $1 + 1 ))" "$LOG"; }

ready() { k get deployment/game -o jsonpath='{.status.readyReplicas}' 2>/dev/null; }
version() { curl -s --max-time 1 "$URL/plain" | awk '{print $1}'; }
# wait until the game answers with version $1 (old copies finish their requests for a few seconds)
is_version() { for _ in $(seq 1 20); do [[ "$(version)" == "$1" ]] && return 0; sleep 0.5; done; return 1; }
# wait until N copies are ready (and no extra ones are terminating), up to $2 seconds
wait_ready() {
  local n="$1" secs="${2:-60}"
  for _ in $(seq 1 "$secs"); do
    [[ "$(ready)" == "$n" ]] && [[ "$(k get pods -l app=game --no-headers 2>/dev/null | wc -l)" == "$n" ]] && return 0
    sleep 1
  done
  return 1
}
# how many failed requests the watch saw since line $1
downs_since() { tail -n +"$(( $1 + 1 ))" "$WATCHLOG" | grep -c DOWN; }
mark() { wc -l < "$WATCHLOG"; }

# ---------------------------------------------------------------- 0. the machine
step "0. CHECKS - tools, cluster, limits"
for tool in docker kind kubectl curl; do
  command -v "$tool" >/dev/null || { red "missing: $tool - see the Prerequisites page"; exit 1; }
done
docker info >/dev/null 2>&1 || { red "Docker is not running - start Docker Desktop (or: sudo service docker start)"; exit 1; }
green "  tools: docker, kind, kubectl, curl"

limit=$(cat /proc/sys/fs/inotify/max_user_instances 2>/dev/null || echo 512)
if (( limit < 512 )); then
  red "  fs.inotify.max_user_instances is $limit - kind nodes can fail to restart (\"too many open files\")."
  echo "  Fix (once, survives restarts):"
  echo "    echo fs.inotify.max_user_instances=512 | sudo tee /etc/sysctl.d/99-kind.conf && sudo sysctl --system"
  exit 1
fi
green "  inotify limit: $limit"

others=$(kind get clusters 2>/dev/null | grep -vx "$CLUSTER" | tr '\n' ' ')
[[ -n "$others" ]] && echo "  note: other kind clusters exist too: $others(fine - the demo always uses $CTX)"

if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER"; then
  echo "  no $CLUSTER cluster - building it (./demo.sh up, needs internet once)"
  scene up || { red "./demo.sh up failed"; exit 1; }
fi
# a stopped node (a node-down without node-up, or after a reboot): start it
for n in $(kind get nodes --name "$CLUSTER"); do docker start "$n" >/dev/null; done
if k wait --for=condition=Ready node --all --timeout=180s >/dev/null; then
  green "  all 3 machines Ready"
else
  k get nodes; red "  a machine is not Ready - try: ./demo.sh down && ./demo.sh up"; exit 1
fi

# ---------------------------------------------------------------- start clean
step "START - ./demo.sh reset (v1, 3 copies)"
scene reset >/dev/null
if wait_ready 3 60 && is_version v1; then pass "reset: v1, 3 copies"; else fail "reset"; fi

: > "$WATCHLOG"
( while true; do
    line=$(curl -s --max-time 1 "$URL/plain" || true)
    if [[ -z "$line" ]]; then echo "$(date +%T) DOWN"; else echo "$(date +%T) $line"; fi
    sleep 0.3
  done ) >>"$WATCHLOG" &
WATCH=$!
trap 'kill $WATCH 2>/dev/null' EXIT
sleep 3

# ---------------------------------------------------------------- the talk's scenes
step "1 - Git: ./demo.sh git"
l=$(wc -l < "$LOG"); scene git
if [[ "$(git -C /tmp/game-site log -1 --format=%s 2>/dev/null)" == "v2: a bigger board" ]] && log_since "$l" | grep -q "v2: a bigger board"; then
  pass "git: the bigger board saved as a commit"; else fail "git: no v2 commit"; fi
if [[ "$(git -C /tmp/github/devops-example.git log -1 --format=%s talk 2>/dev/null)" == "v2: a bigger board" ]]; then
  pass "git: pushed"; else fail "git: the push did not arrive"; fi

step "2 - Docker: ./demo.sh docker"
l=$(wc -l < "$LOG"); scene docker
if log_since "$l" | grep -q "^v2 #1a7f37 my-laptop" && [[ -z "$(docker ps -q --filter name=game-local)" ]]; then
  pass "docker: game-site:v2 answered on port 8081, container stopped"; else fail "docker: the container did not answer, or is still running"; fi

step "3 - Kubernetes: ./demo.sh pods, kill"
scene pods >/dev/null
m=$(mark); scene kill
sleep 2
if wait_ready 3 60; then pass "kill: back to 3, $(downs_since "$m") failed requests"; else fail "kill: did not come back to 3"; fi

step "4 - CI/CD: ./demo.sh update"
m=$(mark)
if scene update && is_version v2; then pass "update: v2 live, $(downs_since "$m") failed requests"; else fail "update: pipeline did not release v2"; fi

step "5 - CI/CD catches a mistake: ./demo.sh break"
m=$(mark); l=$(wc -l < "$LOG"); scene break
if log_since "$l" | grep -q "all tests passed" && log_since "$l" | grep -q "PIPELINE FAILED" && is_version v2; then
  pass "break: tests passed, VERIFY failed, rolled back to v2, $(downs_since "$m") failed requests"
else fail "break: no automatic rollback to v2"; fi

# ---------------------------------------------------------------- the extras
step "extra - observability: ./demo.sh events, logs (right after the break)"
l=$(wc -l < "$LOG"); scene events
if log_since "$l" | grep -q "Readiness probe failed"; then pass "events: show the failed readiness check"; else fail "events: no failed readiness check"; fi
l=$(wc -l < "$LOG"); scene logs
if log_since "$l" | grep -q "GET /plain"; then pass "logs: show requests"; else fail "logs: no requests"; fi

step "extra - IaC: ./demo.sh iac 6"
m=$(mark); scene iac 6
if wait_ready 6 90; then pass "iac 6: 6 copies, $(downs_since "$m") failed requests"; else fail "iac 6: not 6 ready copies"; fi

step "extra - self-healing: ./demo.sh chaos"
m=$(mark); scene chaos
sleep 2
if wait_ready 6 90; then pass "chaos: back to 6, $(downs_since "$m") failed requests"; else fail "chaos: did not come back to 6"; fi

step "extra - high availability: ./demo.sh node-down (then node-up)"
node=$(k get pods -l app=game -o jsonpath='{.items[0].spec.nodeName}')
m=$(mark); start=$(date +%s)
scene node-down &
DOWNPID=$!
moved=0
for _ in $(seq 1 120); do
  sleep 1
  left=$(k get pods -l app=game -o custom-columns=NODE:.spec.nodeName,DEL:.metadata.deletionTimestamp --no-headers 2>/dev/null \
    | awk -v n="$node" '$1==n && $2=="<none>"' | wc -l)
  if [[ "$left" == 0 && "$(ready)" == 6 ]]; then moved=1; break; fi
done
secs=$(( $(date +%s) - start ))
pkill -f "get pods -l app=game -o wide -w" 2>/dev/null   # the Ctrl+C
wait "$DOWNPID" 2>/dev/null
d=$(downs_since "$m")
if (( moved )); then pass "node-down: copies left $node in ${secs}s, $d failed requests (a few are expected)"
else fail "node-down: copies did not move off $node in 120s"; fi
scene node-up
if wait_ready 6 60 && k wait --for=condition=Ready node --all --timeout=60s >/dev/null; then pass "node-up: all machines Ready"; else fail "node-up"; fi

kill $WATCH 2>/dev/null

# ---------------------------------------------------------------- back to the start
step "END - ./demo.sh reset"
scene reset >/dev/null
if wait_ready 3 60 && is_version v1; then pass "reset: v1, 3 copies - ready for the talk"; else fail "reset"; fi

step "SUMMARY"
printf '  %s\n' "${results[@]}"
total=$(wc -l < "$WATCHLOG"); downs=$(grep -c DOWN "$WATCHLOG")
echo "  watch: $total requests, $downs failed (all should be in node-down, an extra)"
echo "  full output: $LOG"
if (( failed )); then red "SOMETHING FAILED - see above"; exit 1; fi
green "ALL PASSED - the demo is ready"
