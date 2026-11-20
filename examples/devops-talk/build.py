"""Publish the talk to the blearning site.

    python build.py

1. checks and renders devops-slides.md into one HTML file - the deck's front matter
   sends it to content/tech/software-development/devops/_files/devops-talk.html
2. copies the demo files next to it (_files/devops-talk-demo/), so the talk page
   can link to them directly

The talk page itself is content/tech/software-development/devops/talk.md.
Needs pypresent (pip install pypresent).
"""
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DECK = HERE / "devops-slides.md"
FILES = HERE.parents[1] / "content" / "tech" / "software-development" / "devops" / "_files"
DEMO_OUT = FILES / "devops-talk-demo"


def main() -> int:
    cli = [sys.executable, "-m", "pypresent"]
    if subprocess.run(cli + ["check", str(DECK)]).returncode:
        return 1
    if subprocess.run(cli + ["render", str(DECK)]).returncode:
        return 1

    demo = HERE / "demo"
    for f in demo.rglob("*"):   # the scripts, the cluster files, and the game/ folder
        if f.is_file():
            out = DEMO_OUT / f.relative_to(demo)
            out.parent.mkdir(parents=True, exist_ok=True)
            # the scripts must keep Unix line endings to run in WSL / Linux / macOS
            out.write_bytes(f.read_bytes().replace(b"\r\n", b"\n"))
    print(f"demo files -> {DEMO_OUT.relative_to(HERE.parents[1])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
