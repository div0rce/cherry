## Calling authenticated APIs from the terminal (cookie jar flow)

Cherry uses NextAuth (cookie-based). For local dev, use the Credentials provider plus a cookie jar.

1) Start dev server  
```bash
npm run dev
```

2) Log in from the terminal  
```bash
./scripts/dev-login.sh            # defaults to dev@example.com
# or
BASE_URL=http://localhost:3000 ./scripts/dev-login.sh you@example.com
```
This fetches a CSRF token, POSTs to `/api/auth/callback/credentials`, and saves cookies to `cookies.txt` in the project root.

3) Call APIs using `cookies.txt`  
```bash
curl http://localhost:3000/api/buckets -b cookies.txt

curl -X POST http://localhost:3000/api/simulate \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "amountCents": 5000,
    "category": "DINING",
    "merchantName": "Chipotle"
  }'
```

4) Helper harness  
```bash
./scripts/simulate.sh
```
(Ensure `cookies.txt` exists; run `./scripts/dev-login.sh` first.)

### Optional: manual SESSION_COOKIE method (legacy)
If you still want to copy a cookie from the browser:
1. Sign in at `/api/auth/signin` in the browser.
2. Copy `next-auth.session-token` (or `__Secure-next-auth.session-token`) from DevTools → Application → Cookies.
3. Export and use:
```bash
export SESSION_COOKIE='next-auth.session-token=...'
curl http://localhost:3000/api/buckets -H "Cookie: $SESSION_COOKIE"
```
Primary recommendation: use the cookie-jar flow above.
