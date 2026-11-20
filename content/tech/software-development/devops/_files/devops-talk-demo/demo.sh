#!/usr/bin/env bash
# A live Kubernetes demo on one laptop (WSL / Linux / macOS) - every DevOps idea, practiced.
#
#   ./demo.sh up            AUTOMATION + IaC   build the whole cluster from files (~1-2 minutes)
#   ./demo.sh watch         OBSERVABILITY      live dashboard: site up?, version, copies per machine
#   ./demo.sh requests      OBSERVABILITY      the simple watch: one colored line per request
#   ./demo.sh pods                             which copies run, and on which machine
#
#   ./demo.sh iac N         IaC                change the file to N copies: plan (diff), then apply
#   ./demo.sh kill          AUTOMATION         delete a random copy  -> Kubernetes brings it back
#   ./demo.sh chaos         AUTOMATION         delete ALL copies at once
#   ./demo.sh node-down     HIGH AVAILABILITY  "unplug" a machine -> its copies move (~15s)
#   ./demo.sh node-up                          plug it back in
#   ./demo.sh ship V COLOR  CI/CD              pipeline: test -> deploy -> verify (-> rollback)
#   ./demo.sh update        CI/CD              ship v2 (green)
#   ./demo.sh break         CI/CD              ship v3 with a typo -> the pipeline rolls back by itself
#   ./demo.sh logs          OBSERVABILITY      what the copies are doing (their logs)
#   ./demo.sh events        OBSERVABILITY      what Kubernetes did (kills, restarts, rollbacks)
#
#   ./demo.sh undo                             roll back to the previous version by hand
#   ./demo.sh reset                            back to v1 with 3 copies
#   ./demo.sh down                             delete the whole cluster
set -euo pipefail

CLUSTER=devops-demo
HERE="$(cd "$(dirname "$0")" && pwd)"
IMAGE=nginx:1.27-alpine
URL=http://localhost:8080

# always talk to the demo cluster, whatever kubectl's current context is (another kind cluster, say)
kubectl() { command kubectl --context "kind-$CLUSTER" "$@"; }

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
ok() { printf '\033[1;32m   ok: %s\033[0m\n' "$*"; }
bad() { printf '\033[1;31m   FAILED: %s\033[0m\n' "$*"; }

wait_rollout() { kubectl rollout status deployment/hello --timeout="${1:-120s}"; }

cmd_up() {
  banner "AUTOMATION + IaC - the whole cluster, built from files"
  if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER"; then
    say kind create cluster --config "$HERE/kind-cluster.yaml"
  fi
  # copy the image into the cluster so the demo does not depend on the room's wifi
  if docker image inspect "$IMAGE" >/dev/null 2>&1 || docker pull "$IMAGE"; then
    kind load docker-image "$IMAGE" --name "$CLUSTER" >/dev/null
  fi
  say kubectl apply -f "$HERE/app.yaml"
  wait_rollout 180s
  cmd_pods
  printf '\nOpen %s in a browser, and run "./demo.sh watch" in a second terminal.\n' "$URL"
}

# --- the live dashboard (left terminal): is the site up, which version, how many copies, where ---
color_of() {   # the page's color -> terminal color number
  case "$1" in
    "#1f6feb") echo 34 ;;   # blue
    "#1a7f37") echo 32 ;;   # green
    "#cf222e") echo 31 ;;   # red
    *)         echo 35 ;;
  esac
}

watch_frame() {
  local reqlog="$1" E=$'\033' K=$'\033[K' out="" line
  local total failed last v c p n
  total=$(wc -l <"$reqlog"); failed=$(grep -c '^DOWN' "$reqlog" || true)
  last=$(tail -n1 "$reqlog")

  # the site, from the outside: what a user gets
  if [[ -z "$last" ]]; then
    line="${E}[1;97;100m  waiting  ${E}[0m"
  elif [[ "$last" == DOWN ]]; then
    line="${E}[1;97;41m  DOWN - no answer  ${E}[0m"
  else
    read -r v c p n <<<"$last"
    line="${E}[1;97;$(( $(color_of "$c") + 10 ))m  UP - $v  ${E}[0m  last answer: $p on $n"
  fi
  out+=$'\n'"  ${E}[1mTHE SITE${E}[0m    $line$K"
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
  want=$(kubectl --request-timeout=2s get deployment/hello -o jsonpath='{.spec.replicas}' 2>/dev/null || true)
  ready=$(kubectl --request-timeout=2s get deployment/hello -o jsonpath='{.status.readyReplicas}' 2>/dev/null || true)
  wantv=$(kubectl --request-timeout=2s get deployment/hello \
    -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="VERSION")].value}' 2>/dev/null || true)
  local rc=32; [[ "${ready:-0}" != "${want:-?}" ]] && rc=33
  out+=$'\n'$'\n'"  ${E}[1mCOPIES${E}[0m      wanted ${E}[1m${want:-?}${E}[0m  ·  ready ${E}[1;${rc}m${ready:-0}${E}[0m  ·  version ${wantv:-?}$K"

  local pods nodes node ready_state
  # "|"-separated, not tabs: read would merge empty tab-separated fields and shift the columns
  pods=$(kubectl --request-timeout=2s get pods -l app=hello -o jsonpath='{range .items[*]}{.metadata.name}{"|"}{.spec.nodeName}{"|"}{.metadata.deletionTimestamp}{"|"}{.status.containerStatuses[0].ready}{"|"}{.status.containerStatuses[0].state.waiting.reason}{"|"}{.spec.containers[0].env[?(@.name=="VERSION")].value}{"|"}{.spec.containers[0].env[?(@.name=="COLOR")].value}{"\n"}{end}' 2>/dev/null | sort || true)
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
  local E=$'\033' K=$'\033[K' name node del rdy why v c state sc
  while IFS="|" read -r name node del rdy why v c; do
    [[ -z "$name" || "$node" != "$2" ]] && continue
    if [[ -n "$del" ]]; then state="stopping"; sc=2
    elif [[ -n "$why" ]]; then state="$why"; sc=33
      [[ "$why" == *Err* || "$why" == *BackOff* ]] && sc=31
    elif [[ "$rdy" == true ]]; then state="ready"; sc=32
    else state="starting"; sc=33; fi
    printf '\n    %s█%s %-3s  %-26s %s%s%s%s' "${E}[$(color_of "$c")m" "${E}[0m" "$v" "$name" "${E}[${sc}m" "$state" "${E}[0m" "$K"
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
      case "$color" in
        "#1f6feb") c=44 ;;   # blue
        "#1a7f37") c=42 ;;   # green
        "#cf222e") c=41 ;;   # red
        *)         c=45 ;;
      esac
      printf '%s \033[%s;97m  %-3s \033[0m %-26s on %s\n' "$t" "$c" "$version" "$pod" "$node"
    fi
    sleep 0.3
  done
}

cmd_pods() { say kubectl get pods -l app=hello -o wide; }

# --- IaC: the file is the truth. Change the file, see the plan, apply it. ---
cmd_iac() {
  local n="${1:-6}"
  banner "INFRASTRUCTURE AS CODE - change the file, not the server"
  local desired
  desired=$(sed -E "s/^( *replicas:) [0-9]+/\1 $n/" "$HERE/app.yaml")
  stage "1. the change: replicas -> $n in app.yaml"
  grep -nE '^ *replicas:' "$HERE/app.yaml" | sed "s/^/   now:  /"
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
  banner "AUTOMATION - self-healing"
  pod=$(kubectl get pods -l app=hello -o name | shuf -n1)
  say kubectl delete "$pod" --wait=false
  sleep 1
  cmd_pods
}

cmd_chaos() {
  banner "AUTOMATION - self-healing, all copies at once"
  say kubectl delete pods -l app=hello --wait=false
  sleep 1
  cmd_pods
}

# --- HIGH AVAILABILITY: lose a whole machine ---
worker() { kubectl get pods -l app=hello -o jsonpath='{.items[0].spec.nodeName}'; }

cmd_node_down() {
  banner "HIGH AVAILABILITY - unplug a machine"
  node=$(worker)
  printf 'Unplugging %s (stopping its container) ...\n' "$node"
  say docker stop "$node"
  printf 'Until Kubernetes notices (~10-15s), requests sent to that machine fail.\n'
  printf 'Then it marks it NotReady and starts its copies elsewhere. Ctrl+C to stop watching.\n'
  say kubectl get pods -l app=hello -o wide -w
}

cmd_node_up() {
  for n in $(kind get nodes --name "$CLUSTER"); do docker start "$n" >/dev/null; done
  printf 'Waiting for the machine to rejoin ...\n'
  until kubectl wait --for=condition=Ready node --all --timeout=120s >/dev/null 2>&1; do sleep 3; done
  say kubectl get nodes
}

# --- CI/CD: every change goes through the same pipeline ---
cmd_ship() {
  local version="$1" color="$2" image="${3:-$IMAGE}"
  # one change = one release: image, version and color together
  local patch
  patch=$(printf '{"spec":{"template":{"spec":{"containers":[{"name":"web","image":"%s","env":[{"name":"VERSION","value":"%s"},{"name":"COLOR","value":"%s"}]}]}}}}' \
    "$image" "$version" "$color")
  banner "CI/CD PIPELINE - release $version"
  [[ "${DEMO_BANNERS:-1}" == 0 ]] && printf '\n\033[1;97;100m PIPELINE - release %s \033[0m\n' "$version"

  stage "1. TEST - is the change valid?"
  if ! kubectl patch deployment/hello --dry-run=server -p "$patch" >/dev/null; then
    bad "the change is invalid - nothing was deployed"; return 1
  fi
  ok "the manifest is valid"
  pause

  stage "2. DEPLOY - rolling update, one copy at a time"
  kubectl patch deployment/hello -p "$patch"
  pause

  # from here on, no pauses: verify and rollback are automatic
  stage "3. VERIFY - did every new copy start, and does the site answer with $version?"
  if kubectl rollout status deployment/hello --timeout=40s; then
    for _ in $(seq 1 20); do
      if curl -s --max-time 1 "$URL/plain" | grep -q "^$version "; then
        ok "$version is live"
        printf '\n\033[1;97;42m PIPELINE PASSED - %s released \033[0m\n' "$version"
        return 0
      fi
      sleep 0.5
    done
    bad "the site does not answer with $version"
  else
    bad "the new copies did not start"
  fi

  stage "4. ROLLBACK - automatic"
  kubectl rollout undo deployment/hello
  wait_rollout
  printf '\n\033[1;97;41m PIPELINE FAILED - rolled back to the last version that worked \033[0m\n'
  return 1
}

cmd_update() { cmd_ship v2 '#1a7f37'; }

cmd_break() {
  printf 'Shipping v3 with a one-letter typo in the image name: nginx:1.27-alpine\033[1;31me\033[0m\n'
  cmd_ship v3 '#cf222e' nginx:1.27-alpinee || true
}

# --- OBSERVABILITY: what is happening, and what happened ---
cmd_logs() {
  banner "OBSERVABILITY - what the copies are doing (logs)"
  printf '\n\033[1;36m$ kubectl logs -l app=hello --prefix\033[0m  (requests only, not health checks)\n'
  kubectl logs -l app=hello --prefix --tail=20 --max-log-requests=20 2>/dev/null \
    | grep -v healthz | tail -8 | cut -c1-140
}

cmd_events() {
  banner "OBSERVABILITY - what Kubernetes did (events)"
  printf '\n\033[1;36m$ kubectl events\033[0m  (the interesting ones)\n'
  kubectl events 2>/dev/null \
    | grep -E 'LAST SEEN|Killing|Pulling|Failed|BackOff|ScalingReplicaSet|NodeNotReady|TaintManagerEviction|SuccessfulCreate|Started' \
    | tail -20 | cut -c1-150
}

cmd_undo() {
  say kubectl rollout undo deployment/hello
  wait_rollout
  say kubectl rollout history deployment/hello
}

cmd_reset() {
  kubectl apply -f "$HERE/app.yaml" >/dev/null
  kubectl set image deployment/hello web="$IMAGE" >/dev/null
  kubectl set env deployment/hello VERSION=v1 COLOR='#1f6feb' >/dev/null
  kubectl scale deployment/hello --replicas=3 >/dev/null
  kubectl rollout restart deployment/hello >/dev/null   # spread the copies over both workers again
  wait_rollout
  cmd_pods
}

cmd_down() { say kind delete cluster --name "$CLUSTER"; }

case "${1:-help}" in
  up) cmd_up ;;
  watch) cmd_watch ;;
  requests) cmd_requests ;;
  pods) cmd_pods ;;
  iac) cmd_iac "${2:-6}" ;;
  kill) cmd_kill ;;
  chaos) cmd_chaos ;;
  node-down) cmd_node_down ;;
  node-up) cmd_node_up ;;
  ship) cmd_ship "${2:?version, e.g. v2}" "${3:?color, e.g. '#1a7f37'}" ;;
  update) cmd_update ;;
  break) cmd_break ;;
  logs) cmd_logs ;;
  events) cmd_events ;;
  undo) cmd_undo ;;
  reset) cmd_reset ;;
  down) cmd_down ;;
  *) sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//' ;;
esac
