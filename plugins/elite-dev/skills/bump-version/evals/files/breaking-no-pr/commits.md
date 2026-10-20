Output of `git log --no-merges --format='%h%x09%s%x09%b' origin/main..origin/develop`:

a11c0de	feat(orders): add bulk order export
b22d1ef	fix!(api): drop the legacy /v1/orders route	Clients must call /v2/orders.
c33e2a0	docs: update the API guide
