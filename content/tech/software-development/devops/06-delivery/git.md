---
title: Git and code hosting
order: 0
lang: en
tags: [intro, beginner]
updated: 2026-11-16
---

# Git and code hosting

Git records every change to a set of files: who made it, when and why. In DevOps it holds much more than application code. Pipelines, infrastructure, Kubernetes manifests and dashboards all live in Git, and a merge is what starts a release. If it is not in Git, it did not happen.

**Levels on this page:** [Intro](#intro) · [Beginner](#beginner)

## Intro

### Terms

| Term | Meaning |
|---|---|
| Repository (repo) | A project's files with their full history |
| Commit | A saved snapshot of the files, with a message, an author and a parent commit. Its ID is a hash of its content |
| Branch | A movable name that points at a commit. Work happens on a branch and is merged back |
| `main` | The branch that holds what is released, by convention |
| Remote | A copy of the repository on a server. `origin` is the default name |
| Clone / fetch / pull / push | Copy a repository / download new commits / download and merge / upload your commits |
| Merge | Join two lines of history. Creates a merge commit when both sides changed |
| Rebase | Replay your commits on top of another branch, for a straight history. Rewrites the commits |
| Pull request (merge request) | A request to merge a branch, with review, discussion and automatic checks. A feature of the hosting platform, not of Git |
| Tag | A fixed name for one commit, used for releases: `v1.4.2` |
| Revert | A new commit that undoes an earlier one. History is kept, so it is safe on shared branches |
| Conflict | Two changes to the same lines. Git stops and asks a person to decide |
| `.gitignore` | The list of files Git should not track: build output, local settings, secrets |
| Protected branch | A branch that only accepts changes through a reviewed pull request with passing checks |

### Hosting platforms

| Platform | Notes |
|---|---|
| **GitHub** | The largest. Pull requests, Actions for CI/CD, a package and container registry |
| **GitLab** | Hosted or self-hosted. Source, CI/CD, registry and security scans in one product |
| **Bitbucket** | From Atlassian, common where Jira is used |
| **Azure Repos** | Part of Azure DevOps |
| Gitea, Forgejo | Small and self-hosted |

The platform adds what teams work with every day: pull requests, branch protection, code owners, webhooks that start pipelines, and access control.

### Branching models

| Model | How it works | Fits |
|---|---|---|
| **Trunk-based** | Short branches that live hours to a couple of days, merged to `main` many times a day. Unfinished features are hidden behind feature flags | Services that deploy continuously. The model the delivery research recommends |
| **GitHub flow** | A branch per change, a pull request, merge to `main`, deploy `main` | Most web services. Trunk-based with pull requests |
| **Git flow** | Long-lived `develop` and `release` branches next to `main` | Software with versions that are supported in parallel: installed products, mobile apps, libraries |

Long-lived branches are where integration pain grows: the longer a branch lives, the harder the merge. Prefer small changes merged often.

### A small example: a change, a release, an undo

```bash
git init -b main shop && cd shop
echo "print('hello')" > app.py
git add app.py && git commit -m "Add the app"

git switch -c fix-greeting                 # a branch for one change
echo "print('hello, world')" > app.py
git commit -am "Greet the world"

git switch main
git merge --no-ff -m "Merge fix-greeting" fix-greeting
git tag -a v1.0.0 -m "First release"       # the release points at an exact commit
git log --oneline --graph
```

```text
*   d923c24 Merge fix-greeting
|\
| * 73513f1 Greet the world
|/
* 8e547b3 Add the app
```

Now a bad change reaches `main`, and is undone without rewriting history:

```bash
echo "print('oops')" > app.py && git commit -am "Break it"

git revert --no-edit HEAD                  # a new commit that undoes the last one
cat app.py                                 # print('hello, world')
git log --oneline
```

```text
a54b9b2 Revert "Break it"
81bd220 Break it
d923c24 Merge fix-greeting
```

Reverting is how a release is rolled back in a GitOps setup: the revert is a commit like any other, it is reviewed, and the pipeline deploys it.

### Finding the commit that broke something

When a bug appeared somewhere in the last 200 commits, `git bisect` finds the commit with a binary search. You give it a good commit, a bad one, and a command that exits with 0 when things work:

```bash
git bisect start HEAD v1.0.0               # bad, then good
git bisect run sh -c "grep -q 'hello, world' app.py"
git bisect reset
```

```text
08e26b3664773da64eb036038a885912ca297ad7 is the first bad commit
    Change 6
```

With a real project the command is the test that fails. Eight commits need three steps, and a thousand need ten.

### Habits that matter in operations

- **Small commits with a message that says why.** The message is read during an incident, by someone who needs to know if this change could be the cause.
- **Never commit a secret.** Deleting it in a later commit does not help: it stays in history. A leaked secret is rotated, always. Scan with gitleaks or the platform's secret scanning, before the push if possible.
- **Protect `main`:** changes only through a pull request, with a review and green checks.
- **Never force-push a shared branch.** It rewrites history under other people. `git push --force-with-lease` on your own branch is fine.
- **Tag what you release**, or use the commit hash as the version. Every running artifact should lead back to one commit.
- **Keep generated files and large binaries out.** Build output goes to an [artifact repository](artifacts.md), not to Git.

## Beginner

The daily work with Git in a team: keeping a branch up to date, cleaning it before review, resolving a conflict, getting lost work back, and the checks that stop a bad commit before it reaches `main`. Every example below runs in an empty folder. A bare repository plays the server, and two clones play two people, Dana and Noa:

```bash
git init -q --bare server.git                # the "GitHub" of the example
git clone -q server.git dana && cd dana
printf 'PORT=8080\nWORKERS=2\nLOG_LEVEL=info\n' > config.env
printf 'def total(items):\n    return sum(items)\n' > cart.py
git add . && git commit -qm "Add the shop" && git push -q origin main
cd .. && git clone -q server.git noa && cd dana
```

The outputs are from Git 2.45. The commit hashes will be different on your machine.

### Rebase a branch on main

Dana works on a branch. Meanwhile Noa pushes to `main`:

```bash
git switch -c discount
printf 'def total(items, discount=0):\n    return sum(items) * (1 - discount)\n' > cart.py
git commit -qam "Add a discount to total"
# ... Noa commits "Use four workers" and pushes it to main ...
git fetch origin
git log --oneline --graph --all
```

```text
* 033ea5c Add a discount to total
| * ccf2750 Use four workers
|/
* 2bf01f8 Add the shop
```

The two lines split. A merge would join them with a merge commit. A rebase moves Dana's commit so it starts from the new `main`:

```bash
git rebase origin/main
git log --oneline --graph --all
```

```text
* 6b2786f Add a discount to total
* ccf2750 Use four workers
* 2bf01f8 Add the shop
```

The history is a straight line, and the commit got a new hash (`033ea5c` became `6b2786f`): a rebase makes new commits. That is why the rule is **rebase your own branch, never a branch others have built on**.

| | Merge `main` into the branch | Rebase the branch on `main` |
|---|---|---|
| History | Keeps what happened, with merge commits | A straight line, as if the work started today |
| Commits | Unchanged | New hashes. Needs a force push if the branch was pushed |
| Conflicts | Resolved once | Resolved per commit that touches the lines |
| Used for | Shared branches | Your own branch, before a review |

`git pull --rebase` does the fetch and the rebase in one step. Many teams set it as the default with `git config --global pull.rebase true`.

### Clean the branch before review: fixup and autosquash

A review finds a typo in the first commit. Instead of a commit called "fix typo" in the history, mark the fix for the commit it belongs to:

```bash
printf 'def total(items, discount=0):\n    if not 0 <= discount < 1:\n        raise ValueError("bad discount")\n    return sum(items) * (1 - discount)\n' > cart.py
git commit -qam "Check the discount"
echo "# typo fix" >> cart.py
git commit -q --fixup HEAD~1 -a          # a fix for "Add a discount to total"
git log --oneline origin/main..
```

```text
863b0c5 fixup! Add a discount to total
dd673fc Check the discount
6b2786f Add a discount to total
```

An interactive rebase with `--autosquash` moves the fix next to its commit and folds it in. Git opens the plan in an editor:

```bash
git rebase -i --autosquash origin/main
```

```text
pick 6b2786f Add a discount to total
fixup 863b0c5 fixup! Add a discount to total
pick dd673fc Check the discount
```

Each line is a command: `pick` keeps a commit, `fixup` folds it into the one above, `squash` does the same and keeps both messages, `reword` changes a message, `drop` deletes, and moving lines reorders commits. Saving the plan as is gives:

```text
10e4dd1 Check the discount
2d88cbb Add a discount to total
```

Two commits, each one complete. Some teams skip this and squash the whole pull request into one commit when merging. Both give a `main` where every commit builds and has a message worth reading.

### A conflict

Noa changes the log level to `warn` and pushes. Dana changed the same line to `debug`:

```bash
git commit -qam "Debug logging for the discount"
git fetch -q
git rebase origin/main
```

```text
CONFLICT (content): Merge conflict in config.env
error: could not apply cf2de9a... Debug logging for the discount
hint: Resolve all conflicts manually, mark them as resolved with
```

Git stopped in the middle of the rebase. `git status --short` shows `UU config.env`, both sides changed it, and the file holds both versions:

```text
PORT=8080
WORKERS=4
<<<<<<< HEAD
LOG_LEVEL=warn
=======
LOG_LEVEL=debug
>>>>>>> cf2de9a (Debug logging for the discount)
```

During a rebase, `HEAD` is the branch you rebase on (Noa's `main`), and the other side is your commit being replayed. In a merge it is the other way round. Decide, edit the file so no markers are left, and continue:

```bash
git diff --name-only --diff-filter=U     # the files still in conflict
# edit config.env: keep LOG_LEVEL=warn
git add config.env
git rebase --continue
```

```text
Successfully rebased and updated refs/heads/discount.
```

If it goes wrong, `git rebase --abort` (or `git merge --abort`) returns to where you were before. Conflicts in configuration files deserve care: picking a side by habit is how a production setting gets lost. Ask the person who made the other change.

### Get lost work back with reflog

Commits are hard to lose in Git. Every move of `HEAD` is written in the reflog, for about 90 days, even after a reset or a deleted branch. Dana resets by mistake and two commits are gone from the branch:

```bash
git reset --hard HEAD~2
git log --oneline -2
```

```text
5a42a15 Less logging
ccf2750 Use four workers
```

```bash
git reflog -5
```

```text
5a42a15 HEAD@{0}: reset: moving to HEAD~2
1b6d683 HEAD@{1}: rebase (finish): returning to refs/heads/discount
1b6d683 HEAD@{2}: rebase (pick): Check the discount
2b29055 HEAD@{3}: rebase (pick): Add a discount to total
5a42a15 HEAD@{4}: rebase (start): checkout origin/main
```

`HEAD@{1}` is where the branch was one move ago:

```bash
git reset --hard HEAD@{1}
git log --oneline -3
```

```text
1b6d683 Check the discount
2b29055 Add a discount to total
5a42a15 Less logging
```

The same works for a deleted branch. Git prints the last commit when it deletes, and the reflog has it too:

```bash
git switch main && git branch -D discount
```

```text
Deleted branch discount (was 1b6d683).
```

```bash
git branch discount 1b6d683
```

What the reflog cannot save: changes that were never committed or staged. `git reset --hard` and `git checkout -- file` throw those away for good. Commit early, even as "wip" on your own branch, and clean up with a rebase later. The reflog is also local: it is on your machine, not on the server.

### Hooks: checks before a commit

A hook is a script in `.git/hooks/` that Git runs at a moment of the work. If it exits with anything other than 0, Git stops. A `pre-commit` hook that refuses something that looks like a secret:

```bash
cat > .git/hooks/pre-commit <<'EOF'
#!/bin/sh
# Block commits that contain something that looks like a secret
if git diff --cached -U0 | grep -nE '^\+.*(AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|password *= *[^ ]+)'; then
  echo "pre-commit: this looks like a secret. Commit refused." >&2
  exit 1
fi
EOF
chmod +x .git/hooks/pre-commit

echo 'AWS_KEY=AKIAIOSFODNN7EXAMPLE' >> config.env
git commit -qam "Add the key"; echo "exit $?"
```

```text
6:+AWS_KEY=AKIAIOSFODNN7EXAMPLE
pre-commit: this looks like a secret. Commit refused.
exit 1
```

A `commit-msg` hook gets the message file as its first argument. This one asks for a ticket number:

```bash
cat > .git/hooks/commit-msg <<'EOF'
#!/bin/sh
grep -qE '^[A-Z]+-[0-9]+ ' "$1" || { echo "commit-msg: start the message with a ticket, e.g. 'SHOP-42 Fix ...'" >&2; exit 1; }
EOF
chmod +x .git/hooks/commit-msg
git commit -qam "Limit discounts"          # refused, exit 1
git commit -qam "SHOP-42 Limit discounts"  # accepted
```

| Hook | Runs | Common use |
|---|---|---|
| `pre-commit` | Before the commit is made | Formatting, linting, secret scanning |
| `commit-msg` | After the message is written | Message format, a ticket number |
| `pre-push` | Before a push | Fast tests |
| `pre-receive` | On the server, before it accepts a push | Protected branches (next section) |

Two limits. Hooks in `.git/hooks/` are not part of the repository, so each person installs them, and anyone can skip them with `git commit --no-verify`. Teams therefore share them with a tool such as [pre-commit](https://pre-commit.com/) or Husky, configured in a file that is committed, and run **the same checks again in CI**, where they cannot be skipped. A real secret scanner (gitleaks, trufflehog) knows hundreds of key formats where the `grep` above knows three.

### A protected branch

A hook on a developer's machine is a convenience. The rule that holds is on the server. GitHub, GitLab and Bitbucket call it a protected branch (GitHub's newer name is a ruleset). Under the hood it is a check the server runs before it accepts a push, which is exactly what a `pre-receive` hook does on a plain Git server:

```bash
cat > ../server.git/hooks/pre-receive <<'EOF'
#!/bin/sh
zero=0000000000000000000000000000000000000000
while read old new ref; do
  [ "$ref" = refs/heads/main ] || continue
  if [ "$new" = "$zero" ]; then echo "main cannot be deleted"; exit 1; fi
  if [ "$old" != "$zero" ] && ! git merge-base --is-ancestor "$old" "$new"; then
    echo "main is protected: force push refused"; exit 1
  fi
  if [ "$(git log -1 --format=%an "$new")" != "Merge Bot" ]; then
    echo "main is protected: open a pull request"; exit 1
  fi
done
EOF
chmod +x ../server.git/hooks/pre-receive

git push origin discount:main
```

```text
remote: main is protected: open a pull request
 ! [remote rejected] discount -> main (pre-receive hook declined)
```

Pushing the branch itself is allowed, and that is how a pull request starts:

```bash
git push -u origin discount
```

On a hosting platform the same rules are settings of the branch. The ones worth turning on for `main`:

| Setting | What it stops |
|---|---|
| Require a pull request before merging | Direct pushes, like the one refused above |
| Required approvals: 1 or more, and dismiss approvals when new commits are pushed | A change nobody else read, or a change made after the approval |
| Require review from code owners | A change to `infra/` without the platform team. Owners are listed in a `CODEOWNERS` file, such as `/infra/ @shop/platform` |
| **Require status checks to pass**, and require the branch to be up to date | A merge with red tests. The checks are CI jobs by name, such as `test` and `build` |
| Block force pushes and deletions | Rewriting or losing the history of `main` |
| Do not allow bypassing, also for administrators | "Just this once" during an incident |

"Required status checks" is where Git meets [CI/CD](ci-cd.md): the pipeline runs on every pull request, and the merge button stays disabled until the named jobs pass. A check that is not marked as required only informs. A merge queue (GitHub, GitLab merge trains) goes a step further for busy repositories: it tests each pull request on top of the ones merging before it, so `main` stays green even when ten changes merge in an hour.

### Force push safely

Dana rewrites her branch after review, and needs a force push. Meanwhile Noa pushed a commit to the same branch:

```bash
git commit -q --amend -m "SHOP-42 Limit discounts to half"
git push --force-with-lease
```

```text
 ! [rejected]        discount -> discount (stale info)
```

`--force-with-lease` overwrites the remote branch only if it is still where Dana last saw it. It is not, so the push is refused, and Noa's commit is safe. A plain `--force` would have deleted it without a word. Dana looks at what is new, takes Noa's commit, and pushes again:

```bash
git fetch
git log --oneline HEAD..origin/discount
```

```text
4c4de46 SHOP-42 Comment
523bd67 SHOP-42 Limit discounts
```

`523bd67` is the old version of Dana's own commit, replaced by the amend. `4c4de46` is Noa's:

```bash
git cherry-pick 4c4de46
git push --force-with-lease
git log --oneline -3
```

```text
c923283 SHOP-42 Comment
687b08c SHOP-42 Limit discounts to half
1b6d683 Check the discount
```

### Commands for a bad day

| Situation | Command |
|---|---|
| Undo the last commit, keep the changes | `git reset --soft HEAD~1` |
| Undo a pushed commit on a shared branch | `git revert <hash>` |
| Throw away local changes in one file | `git restore <file>` |
| Take one commit from another branch | `git cherry-pick <hash>` |
| Put work aside to switch branches | `git stash`, later `git stash pop` |
| Find lost commits | `git reflog` |
| Who last changed this line, and in which commit | `git blame -L 10,20 <file>`, then `git show <hash>` |
| A secret was pushed | Rotate the secret first. Then remove it from history with `git filter-repo` if needed, and force push with the team's agreement |

## In the lab

- The [lab](../13-lab/_index.md) lives in a Git repository, and its workflow, `.github/workflows/devops-lab.yml`, runs on every push and pull request that touches `examples/devops-lab/`. Its two jobs, `app` and `e2e`, are the names a protected `main` would list as required status checks.
- The workflow filters by path, so a change to the guide's text does not start a cluster. Large repositories with many projects (monorepos) rely on this.

## See also

- [CI/CD](ci-cd.md): what a push starts
- [GitOps](gitops.md): Git as the description of what runs in production
- [Artifacts and registries](artifacts.md)
