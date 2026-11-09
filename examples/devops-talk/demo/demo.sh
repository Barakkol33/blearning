#!/usr/bin/env bash
# A live Kubernetes demo on one laptop (WSL / Linux / macOS) - every DevOps idea, practiced.
#
#   ./demo.sh up            AUTOMATION + IaC   build the whole cluster from files (~1-2 minutes)
#   ./demo.sh watch         OBSERVABILITY      one colored line per request - leave it running
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

say() { printf '\n\033[1;36m$ %s\033[0m\n' "$*"; "$@"; }
banner() { printf '\n\033[1;97;44m %s \033[0m\n' "$*"; }        # which DevOps idea this scene shows
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

cmd_watch() {
  # one line per request; the color of the block is the color the page is serving
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
  stage "2. PLAN - what would change? (kubectl diff)"
  printf '%s\n' "$desired" | kubectl diff -f - 2>/dev/null | grep -E '^[-+] ' | grep -v generation || true
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

  stage "1. TEST - is the change valid?"
  if ! kubectl patch deployment/hello --dry-run=server -p "$patch" >/dev/null; then
    bad "the change is invalid - nothing was deployed"; return 1
  fi
  ok "the manifest is valid"

  stage "2. DEPLOY - rolling update, one copy at a time"
  kubectl patch deployment/hello -p "$patch"

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
