---
name: review-fix-pr-comments
description: >
  Fetches unresolved review comments on a pull request (from any reviewer — Copilot, a human,
  another bot), verifies each finding against the actual code, presents them formatted for the
  developer to triage, then — only after explicit go-ahead — applies the agreed fixes,
  commits/pushes, replies to each addressed comment explaining the fix, and resolves its thread.
  Use when the user says things like "review the PR comments", "address Copilot's feedback", "fix
  the review comments on PR 153", or pastes a `#pullrequestreview-<id>` URL. Do NOT use this to
  write the original code review — only to work through comments a review already produced.
---

# Review / fix PR comments

Turns a pull request's review comments into verified findings, then (once the developer signs
off) into commits, replies, and resolved threads. Two phases, with a hard stop between them.

## 0. Resolve the target repo

Every `gh api` call below needs the owner/repo. Get it once and reuse it — don't hardcode a repo
name:

```bash
gh repo view --json owner,name -q '.owner.login + "/" + .name'
```

## 1. Identify the target PR and its unresolved comments

If the user names a PR number or pastes a PR/review URL, use that. Otherwise resolve it from the
current branch:

```bash
gh pr view --json number,headRefName,state
```

Confirm the branch checked out (or the worktree you're in) matches that PR's `headRefName` before
doing anything else — acting against the wrong branch's PR is a silent, confusing mistake.

Fetch **all unresolved** review threads via GraphQL, not just the comments from one review ID.
A PR can accumulate several review passes (Copilot re-runs, a human round, etc.); scoping to a
single `pull_request_review_id` — as convenient as it is when the user links one review — silently
skips anything from an earlier or later pass:

```bash
gh api graphql --paginate -f query='
query($owner: String!, $name: String!, $n: Int!, $endCursor: String) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $n) {
      reviewThreads(first: 100, after: $endCursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          isResolved
          comments(first: 100) {
            nodes {
              databaseId
              path
              line
              originalLine
              body
              author { login }
              pullRequestReview { databaseId }
            }
          }
        }
      }
    }
  }
}' -F owner=<owner> -F name=<repo> -F n=<pr-number> \
  --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false)'
```

`--paginate` walks every page of `reviewThreads` via `pageInfo`/`endCursor`, so this covers PRs with
more than 100 threads. The nested `comments(first: 100)` per thread is not paginated by this flag —
fine for the reply counts most PRs actually produce, but a thread that somehow exceeds 100
comments would need its own follow-up cursor to see the rest.

Each comment's `pullRequestReview { databaseId }` is what lets you cross-reference a linked
`#pullrequestreview-<id>` — a comment's own `databaseId` identifies the comment, not the review it
came from.

If the user did link a specific review, still run the query above and use `pullRequestReview.databaseId`
as a sanity check — cross-reference which threads contain a comment from that review so nothing from
it is missed, without assuming it's the only pass that matters.

Each thread's `comments` array holds the original comment plus any prior replies — keep the whole
array; you'll need every comment's `databaseId` later to match this thread when resolving it, not
just the first one.

### Also check for suppressed comments in review bodies

A review can say "generated no new comments" and still be hiding real findings: Copilot (and
possibly other reviewers) sometimes collapses lower-confidence findings into the review's own
`body` text instead of posting them as line comments, under a
`<details><summary>Suppressed comments (N)</summary>` block. These never become a `reviewThread` or
a PR comment at all — the query above cannot see them. Always also pull every review's body and
check for this block:

```bash
gh api --paginate "repos/<owner>/<repo>/pulls/<pr-number>/reviews" \
  --jq '.[] | select(.body | test("Suppressed comments")) | {id, user: .user.login, body}'
```

`--paginate` matters here for the same reason as step 1's `reviewThreads` query: a PR with more than
30 review submissions (the default page size) would otherwise silently drop any suppressed-comments
block sitting on page 2+.

Before re-verifying a review's suppressed block, check whether an existing top-level PR comment
already links that review's `#pullrequestreview-<id>` (added per the link rule below) — these items
have no `isResolved` state to dedup against, so this link is the only signal a re-run has for "already
handled in a prior pass." That link is only a safe skip-this-whole-review signal once **every** item
in the block got a disposition — if a developer signs off on only some of a review's suppressed
items, do not post the review-ID link yet; a partial write-up (see below) that links the review would
cause a later run to skip the remaining, still-unaddressed items too.

Treat each bulleted item inside a found `<details>` block as its own candidate finding, subject to
the same code-verification step below. These have no `comment_id` or thread to reply to or resolve
— there's nothing to attach a threaded reply or a `resolveReviewThread` call to. Once every item in
the block has been verified and either fixed or dismissed, write up what was addressed as a single
top-level PR comment (`gh pr comment <pr-number> --body "..."`) instead, since that's the only
attachment point that exists for this category — list each item's disposition individually in that
comment, and only include the review-ID link once the write-up covers all of them.

When that write-up names a review by ID, link it —
`[#<id>](https://github.com/<owner>/<repo>/pull/<pr-number>#pullrequestreview-<id>)`
— never a bare `#<id>`. A review's numeric ID has nothing to do with this repo's issue/PR numbers,
but bare `#<id>` in a GitHub comment is auto-linked as if it were one anyway, pointing at an
unrelated (or nonexistent) issue.

## 2. Verify every finding against the current code — don't take the comment at face value

A review comment's `line`/`originalLine` describes where the diff was when the review ran; the
file may have moved since (especially true across multiple review rounds). For each unresolved
thread:

- Read the actual file at its current state, not just the diff hunk in the comment.
- Confirm the described defect is real and still present. Review bots occasionally flag stale or
  already-moot lines, or slightly misdescribe the mechanism — check the surrounding code (types,
  callers, related tests) rather than assuming the comment's framing is exactly right.
- Work out a concrete fix before presenting anything — "flag it and figure it out later" isn't
  useful to the developer at triage time.

## 3. Present findings, then stop

Present **every** unresolved thread and suppressed-comment item, not only the ones that check out —
a comment that turns out stale, already-fixed, or simply wrong still needs a closing action: steps
6-7 (reply + resolve) for a threaded finding, or a top-level PR comment (per the suppressed-comments
section above) for one with no thread — so it can't just be silently dropped before the developer
ever sees it. Render each as prose (never raw JSON): file:line header, then on their own
blank-line-separated lines — summary, failure scenario, fix suggestion — with a `---` rule between
findings. Reserve the full failure-scenario/fix format for confirmed defects; for a stale/disputed
one, say so plainly instead (what it claimed, why it no longer applies or isn't right) so the
developer can still choose to resolve it with an explanation. Number findings if there's more than
a couple, and if findings from a linked review or a prior turn were already numbered, keep those
numbers attached.

End the message asking which findings to act on. **Do not start editing files, committing, or
replying to GitHub in the same turn** — this is a triage checkpoint, not a rhetorical question. If
the user gives an ambiguous instruction referencing numbers ("fix 1, 3, 5"), restate which findings
those numbers resolve to before touching anything, so a numbering mismatch surfaces immediately.

If a finding is arguably correct but the fix isn't obvious (e.g. it depends on which of two
existing conventions is authoritative, or touches a decision outside the diff), say so explicitly
and ask rather than picking one — same as any other judgment call mid-execution.

## 4. Apply only the agreed fixes

Standard edit workflow: make the changes, then run this project's actual verify step before
considering anything done. Check `package.json` scripts (`npm run lint`/`build`/`test`) or the
solution's build tooling (`dotnet build`, `dotnet test`) for the touched project rather than
assuming — a monorepo may have a different command per package. If this repo has the `elite-ts`
plugin installed, `/elite-ts:verify` covers the TypeScript/JavaScript check. Update tests alongside
any behavior change — a fix that changes what a function does but leaves its test asserting the
old behavior isn't finished.

If a finding implies a decision that lives outside the diff (e.g. a contract mismatch between the
code and a GitHub issue's spec text), fixing it may mean editing that other thing (the issue body)
rather than the code — confirm which side is authoritative with the user before doing either.

## 5. Commit and push — only if asked

Follow the repo's standing commit-message and git-safety conventions (Conventional Commits,
create a new commit rather than amending, never force-push). Don't push without being told to,
same as any other git action.

**Do not reply to GitHub (step 6) until the fix commit is pushed.** A local commit's sha isn't
final — it can still get amended, which changes the sha a "Fixed in `<sha>`" reply would have
already cited, leaving the reply pointing at a sha nobody can look up. Wait for the push the
developer asked for; if they haven't asked for one yet, stop after step 5 and ask before replying
rather than replying against an unpushed, still-revisable commit.

## 6. Reply to each addressed comment

Reply on the original REST comment (not the GraphQL thread) so it threads correctly in the GitHub
UI:

```bash
gh api repos/<owner>/<repo>/pulls/<pr-number>/comments/<comment-id>/replies \
  -f body="Fixed in <sha>: <what changed and why, one or two sentences>."
```

Say what changed, not just "fixed" — the reply is the record a future reader (or the original
reviewer, if human) checks to see whether the fix actually addresses what was raised. For a finding
the developer chose not to fix, reply with the reason instead (scope, disagreement, tracked
elsewhere) rather than silently leaving it.

## 7. Resolve the thread

Match each replied-to comment back to its thread using the `databaseId` values gathered in step 1
(check every comment in the thread's array, not just the first — a thread already carrying prior
replies would otherwise fail to match), then resolve:

```bash
gh api graphql -f query='mutation($id: ID!) { resolveReviewThread(input: {threadId: $id}) { thread { isResolved } } }' -f id="<thread-node-id>"
```

Only resolve threads whose finding was actually addressed (fixed, or explained why not) in this
pass — leave anything the developer didn't sign off on unresolved, still open for a future round.

## Verify before reporting done

The step-1 query filters to `isResolved == false`, so re-running it unmodified can never show a
just-resolved thread as `isResolved: true` — it filters that thread out instead. `gh pr view --json
reviews,comments` doesn't expose thread-resolution state at all (that's a `reviewThreads`-only,
GraphQL-only field). Neither confirms what you actually need to confirm.

Instead, query the specific thread IDs you resolved, with no `isResolved` filter, and check each one
individually:

```bash
gh api graphql -f query='
query($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on PullRequestReviewThread { id isResolved }
  }
}' -f 'ids[]=<thread-node-id-1>' -f 'ids[]=<thread-node-id-2>'
```

Confirm every ID you meant to resolve shows `isResolved: true` — a mutation typo or a mismatched
thread ID otherwise fails silently into "nothing happened" rather than an obvious error.
