#!/usr/bin/env bash
# The live demo for presenting - the right terminal. The left one runs ./demo.sh watch.
#
#   ./present.sh        the whole demo, scene by scene
#   ./present.sh 3      start at scene 3 (if something went wrong: ./demo.sh reset first)
#
# Every scene clears the screen and shows its headline - the problem, not the DevOps word.
# Each command is typed out and waits for Enter; steps inside a scene wait for Enter too.
# After the scene, its DevOps idea gets its name. Ctrl+C while a command runs stops only that
# command (the node-down watch); Ctrl+C at an [Enter] prompt ends the show.
set -u
cd "$(dirname "$0")"
export DEMO_PAUSE=1 DEMO_BANNERS=0
trap ':' INT
FROM="${1:-0}"
CUR=0
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
  printf '\n\033[2m  [Enter] next scene\033[0m'
  enter
}
scene() { (( $1 >= FROM )) && CUR=$1; }

if scene 0; then
  headline "The setup" \
    "3 machines: a control plane and 2 workers - on this laptop." \
    "Left: one line per request - which version, which copy, which machine."
  run ./demo.sh pods
  printf '\n\033[2m  [Enter] start the story\033[0m'; enter
fi

if scene 1; then
  headline "Demo 1 · 100,000 students are coming" \
    "Results come out tomorrow at 9:00. 3 copies won't survive it - we need 6." \
    "Not by clicking: by changing one number in a file."
  run ./demo.sh iac 6
  named "Infrastructure as Code"
fi

if scene 2; then
  headline "Demo 2 · 3 AM: copies crash" \
    "Everyone is asleep. A copy of the app dies."
  run ./demo.sh kill
  printf '\n\n  Who restarted it? Now - all of them at once:\n'
  run ./demo.sh chaos
  named "Automation - self-healing"
fi

if scene 3; then
  headline "Demo 3 · A whole machine dies" \
    "Not a copy - a whole machine: a disk, a power supply, a cable." \
    "Watch the left terminal. Ctrl+C here once the copies moved."
  run ./demo.sh node-down
  printf '\n\n  Plug it back in:\n'
  run ./demo.sh node-up
  named "High availability"
fi

if scene 4; then
  headline "Demo 4 · Ship a fix - while everyone is checking" \
    "9:00. Everyone is checking results, and a fix must ship now." \
    "v1 is blue, v2 is green - watch green copies replace blue ones on the left."
  run ./demo.sh update
  named "CI/CD"
fi

if scene 5; then
  headline "Demo 5 · The next fix has a typo" \
    "Shipped in a hurry: one letter wrong in the image name."
  run ./demo.sh break
  named "CI/CD + automatic rollback - a guardrail"
fi

if scene 6; then
  headline "Demo 6 · The morning after: what happened?" \
    "Copies crashed, a machine died, a broken version almost shipped. How do we know?"
  run ./demo.sh events
  printf '\n\n  And what the copies themselves wrote:\n'
  run ./demo.sh logs
  named "Observability"
fi

headline "That's the demo" \
  "Back to the slides: \"What you just saw\"." \
  "After the talk: ./demo.sh reset (back to v1, 3 copies)."
printf '\n'
