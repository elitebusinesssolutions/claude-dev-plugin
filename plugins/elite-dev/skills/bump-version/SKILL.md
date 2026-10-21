---
name: bump-version
description: >
  Bumps the version number in a repo's GitHub workflow and Azure pipeline files for a release. Reads the release's commits, applies Conventional Commits and Semantic Versioning to pick the next version, reconciles it with any version already in the release PR title, then edits the version strings on a new branch cut from the release's head branch and stops for review. Use when preparing a release — "bump the version", "prep the release", "version bump for the release PR", "what should the next version be".
---

# Bump version

A release usually merges `develop` into the default branch. Both branches are protected, so the bump goes on a new branch cut from the release's head branch and reaches that branch through a PR.

## 1. Find the release

Ask the developer: "Do you already have a release PR? Paste its number or URL."

- **They have one:** run `gh pr view <n> --json title,baseRefName,headRefName,state,url`. The PR's `baseRefName` is the base and its `headRefName` is the head. Stop if the PR is not open.
- **They do not:** propose head = `develop` (check it exists with `git ls-remote --heads origin develop`) and base = the repo's default branch (`gh repo view --json defaultBranchRef`). Ask the developer to confirm these two branches, or name different ones, before going on.

Run `git fetch origin` so the later steps see current branches and tags.

## 2. Read the current version

Read the version files from the **base** branch with `git show origin/<base>:<path>`, because the base holds what is already released. Do not rely on a pattern alone to find them. First list every candidate file with its `name:` or `run-name:` line, matched or not:

```bash
git grep -n -E '^(name|run-name):' origin/<base> -- 'azure-pipelines*.yml' '.azuredevops/**/*.yml' '.github/workflows/*.yml'
```

Then match the lines by pattern:

- Azure pipelines: the top-level `name:` line of `azure-pipelines*.yml` and of any `.azuredevops/**/*.yml`, where it matches `^name:\s*(\d+\.\d+(?:\.\d+)?)\.\$\(Build\.BuildId\)`. Three captured segments (`5.5.0.$(Build.BuildId)`) are the three-segment form. Two captured segments (`3.4.$(Build.BuildId)`) are the two-segment form.
- GitHub workflows: a `run-name:` or `name:` line in `.github/workflows/*.yml` that holds `\d+\.\d+\.\d+` followed by a run-number expression such as `.${{ github.run_id }}`.

The last segment that the CI system assigns (`$(Build.BuildId)`, `${{ github.run_id }}`) never changes. In the three-segment form this is a fourth segment, and only the first three segments change. In the two-segment form the CI id is the patch segment, and only major and minor change.

List every match as file, line, and value. Then:

- If the values differ from each other, show the list, use the **highest** as the current version, and say that the others will be brought up to the target version. Read a two-segment value `X.Y` as `X.Y.0` when you compare. Do not stop here. Ask the developer to confirm this together with the target version in step 5.
- Compare the current version with the newest tag: `git tag --list 'v*' --sort=-v:refname | head -1`, with its fourth segment removed. If they differ only in the third segment and a matched file uses the two-segment form, say that the pipeline likely uses the build id as its patch segment, and do not ask which one is current. If they differ in any other way, ask the developer which one is current. Do not use GitHub Releases for this — they are often not kept up to date.
- If a listed file has a `name:` or `run-name:` line that holds `\d+\.\d+` and no pattern matched it, show the line and ask the developer how to treat it. Do not drop it.
- If nothing matches, and no listed line holds a version-like value, stop and report that. Do not guess other locations such as `Directory.Build.props` or `package.json`.

## 3. Collect the release's changes

Run `git log --no-merges --format='%h%x09%s%x09%b' origin/<base>..origin/<head>`. Use this git range, not `gh pr view --json commits`, which stops at 250 commits. Merge commits are skipped because the commits they merge are already in the range. If the repo squash-merges, each commit subject is the PR title.

## 4. Compute the bump

Classify each commit by its Conventional Commits type. The highest level present wins:

- **MAJOR:** a `!` before the colon (`feat(api)!:`), or a `BREAKING CHANGE:` footer.
- **MINOR:** `feat`.
- **PATCH:** `fix` and `perf`. Also `refactor`, `chore`, `docs`, `test`, `style`, `build`, and `ci` when nothing higher is present.

Rules for the edge cases:

- A subject with no Conventional Commits type is not a `feat`. List these commits separately, read their diffs if the subject does not say what they do, and treat them as PATCH unless the diff shows a new feature or a breaking change. Tell the developer you did this.
- If every commit is `docs`, `test`, `chore`, or `ci`, the bump is still PATCH. Ask whether the developer wants a release at all.
- If the current major version is 0, ask whether a breaking change should bump MINOR or MAJOR.

Reset the lower segments: MAJOR gives `X+1.0.0`, MINOR gives `X.Y+1.0`, PATCH gives `X.Y.Z+1`.

Files in the two-segment form take only the major and minor segments of the target: a MINOR bump changes `3.4` to `3.5`, a MAJOR bump changes it to `4.0`, and a PATCH bump has no segment to change. If the bump is PATCH and every matched file uses the two-segment form, report that no edit is needed, ask whether the developer still wants a release, and stop before step 6. In a repo that mixes both forms, a PATCH bump edits only the three-segment files. Name the files left unchanged and say why.

## 5. Reconcile with the release PR title

Look for a `\d+\.\d+(\.\d+)?` version in the release PR title. Read a title version `X.Y` as `X.Y.0` when you compare it with the computed version.

- Same as the computed version: use it.
- Different: show **both**. For the computed version, list the commits that decide the level. For the title's version, quote the title. Ask the developer which one to use, or for another one. Never replace the title's version without asking.
- Lower than or equal to the current version: say it is invalid and ask for another.

The developer must confirm the final **target version** before any file changes. Ask for it in the same message as any other open question from steps 2 to 4, such as files whose versions differ, so the developer answers once.

## 6. Create the bump branch

Stop and ask if `git status --porcelain` shows changes. Otherwise run `git switch -c chore/bump-version-<X-Y-Z> origin/<head>`, for example `chore/bump-version-5-6-0`. Never edit on the base or head branch itself.

## 7. Edit the files

In each match from step 2, replace the version with the target version: the full three segments in the three-segment form, and only the major and minor segments in the two-segment form. Keep the rest of the line unchanged (`ci-`, `.$(Build.BuildId)`, `.${{ github.run_id }}`). Do not touch a file that already holds the value it would receive, and do not change any other file.

## 8. Show the result and stop

Show `git diff`, the target version, the bump level with the commits that decided it, and any commits you classified by reading the diff. Say the edits are uncommitted and ready for review. If the release PR title holds a version other than the target, remind the developer to retitle the release PR, since this skill does not edit it. Do not commit and do not push.

## 9. After the developer approves

Commit only when the developer says to commit. Use the message `chore: bump version to <target>`. Ask separately before pushing. After a push, open a PR into `<head>` by following the `elite-dev:create-pr` skill.

## 10. Verify

- Search the changed files again. Every version match shows the target version (two-segment matches show its major and minor).
- Run the step 2 listing on the branch. No listed file holds a version-like value that was neither bumped nor reported.
- `git diff --stat` lists only the version files.
- `git merge-base --is-ancestor origin/<head> HEAD` succeeds, so the branch builds on the head branch.
- Tell the developer about anything skipped: files with no match, values that were brought into line, and commits classified by hand.

## Scope

This skill changes version strings in workflow and pipeline YAML only. It does not create tags or GitHub Releases, merge anything, edit the release PR's title or body, or change version fields in manifests such as `package.json`, `.csproj`, or `Directory.Build.props`.
