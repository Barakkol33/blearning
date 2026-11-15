---
title: Git and code hosting
order: 0
lang: en
tags: [intro]
updated: 2026-11-15
---

# Git and code hosting

Git records every change to a set of files: who made it, when and why. In DevOps it holds much more than application code. Pipelines, infrastructure, Kubernetes manifests and dashboards all live in Git, and a merge is what starts a release. If it is not in Git, it did not happen.

**Levels on this page:** [Intro](#intro)

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

## See also

- [CI/CD](ci-cd.md): what a push starts
- [GitOps](gitops.md): Git as the description of what runs in production
- [Artifacts and registries](artifacts.md)
