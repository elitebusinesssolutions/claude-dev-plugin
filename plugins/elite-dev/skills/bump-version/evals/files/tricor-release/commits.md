Output of `git log --no-merges --format='%h%x09%s%x09%b' origin/main..origin/develop`:

bd01d85	Request a fresh access token for file uploads
42db28e	fix(auth): defer token retrieval to Refit auth getter
7b888f4	docs: add Conventional Commits guidance to copilot instructions
2562565	fix(upload): cancel uploads and sign in when no access token is available
6a5ccd4	fix(auth): skip the first-login user lookup when no access token is available

(`bd01d85` changes only an upload retry path; its diff adds no new feature.)
Newest tag: v5.5.0.13050
