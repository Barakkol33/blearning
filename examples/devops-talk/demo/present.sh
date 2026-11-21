#!/usr/bin/env bash
# The live demo for presenting - the right terminal. The left one runs ./demo.sh watch.
#
#   ./present.sh          the talk's demo, scene by scene
#   ./present.sh 3        start at scene 3 (if something went wrong: ./demo.sh reset first)
#   ./present.sh extras   the extra scenes: ship a level, a bug + rollback, scale with a file,
#                         all copies, a machine dies, observability
#
# Every scene clears the screen and shows its headline - the problem, not the DevOps word.
# Each command is typed out and waits for Enter; steps inside a scene wait for Enter too.
# After the scene, its idea gets its name. Ctrl+C while a command runs stops only that
# command (the node-down watch); Ctrl+C at an [Enter] prompt ends the show.
set -u
cd "$(dirname "$0")"
export DEMO_PAUSE=1 DEMO_BANNERS=0
trap ':' INT
MODE="${1:-1}"
CUR=1
# wait for Enter; Ctrl+C here ends the show
enter() { read -rs || { printf '\n\n  Stopped. To go on from this scene: ./present.sh %s\n' "$CUR"; exit 0; }; }

headline() {
  clear
  printf '\n\033[1;97;44m  %s  \033[0m\n' "$1"
  shift
  for line in "$@"; do printf '\n  %s' "$line"; done
  printf '\n'
}
run() {
  printf '\n\033[1;32m$\033[0m '
  local s="$*" i
  for ((i = 0; i < ${#s}; i++)); do printf '%s' "${s:i:1}"; sleep 0.03; done
  enter
  printf '\n'
  "$@"
}
named() {
  printf '\n\n\033[1;97;42m  That is called: %s  \033[0m\n' "$1"
  printf '\n\033[2m  [Enter] next\033[0m'
  enter
}

talk() {
  local from="$1"
  scene() { (( $1 >= from )) && CUR=$1; }

  if scene 1; then
    headline "1 · Save it" \
      "You made the board bigger: 5x5. Before anything else: save the change - with a message."
    run ./demo.sh git
    named "Version control - Git"
  fi

  if scene 2; then
    headline "2 · \"It works on my machine\"" \
      "Pack the game with Python and its libraries into one image - and run it on this laptop."
    run ./demo.sh docker
    named "A container - Docker"
  fi

  if scene 3; then
    headline "3 · Many copies" \
      "3 copies of the game, on 2 machines, behind one address. Now kill one."
    run ./demo.sh pods
    run ./demo.sh kill
    named "Self-healing - Kubernetes"
  fi

  headline "That's the demo" \
    "Back to the slides: \"The road you just saw\"." \
    "Time left over: ./present.sh extras.   After the talk: ./demo.sh reset"
  printf '\n'
}

extras() {
  CUR=extras
  headline "Extra · Ship the new level" \
    "The commit from the Git scene goes to the players - through the pipeline." \
    "Left: blue copies turn green, one by one."
  run ./demo.sh update
  named "CI/CD"

  headline "Extra · The next commit has a bug" \
    "An AI \"tidied up\" the server - and updated the test. Every test will pass."
  run ./demo.sh break
  named "CI/CD + automatic rollback - a guardrail"

  headline "Extra · Scale with a file" "3 copies are not enough. Change one number in a file: plan, then apply."
  run ./demo.sh iac 6
  named "Infrastructure as Code"

  headline "Extra · All the copies at once" "Not one copy - all of them."
  run ./demo.sh chaos
  named "Self-healing"

  headline "Extra · A whole machine dies" \
    "Watch the left terminal. Ctrl+C here once the copies moved."
  run ./demo.sh node-down
  printf '\n\n  Plug it back in:\n'
  run ./demo.sh node-up
  named "High availability"

  headline "Extra · What happened?" "What Kubernetes did - and what the copies wrote."
  run ./demo.sh events
  run ./demo.sh logs
  named "Observability"

  headline "That's all" "After the talk: ./demo.sh reset (back to v1, 3 copies)."
  printf '\n'
}

if [[ "$MODE" == extras ]]; then extras; else talk "$MODE"; fi
