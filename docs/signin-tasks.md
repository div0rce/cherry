Status: Active
Last updated: 2026-01-02

# Sign-in Page Tasks (Cherry)

`/signin` is live with split layout and credential + Google flows, but still needs polish and recovery flows. Auth stack: NextAuth (PrismaAdapter) in `app/api/auth/[...nextauth]/route.ts`; UI in `app/signin/page.tsx` and `app/signin/signin-card.tsx`; clients handle `401` by calling `signIn()` from `next-auth/react`.

## Current behavior (enforced / in code)
- `/signin` exists with credential + Google flows and links to `/signup` and `/forgot-password` (routes are stubs).
- Client auth errors are mapped to friendly messages; UI has show/hide and loading states.

## Completed
- Custom `/signin` page with split marketing/auth layout and pseudo-dashboard illustration.
- Error query params mapped to friendly messages; inline validation for empty fields.
- Credentials + Google buttons wired; mobile layout clean; links for `/signup` and `/forgot-password` are present (routes still stubs).
- Password show/hide toggle and loading state on submit.

## Future/Target behavior
Next tasks (sequential):
1. **Recovery flows**
   - Implement a real `/forgot-password` placeholder (even if it just states email reset is not yet available).
   - Wire password reset once a provider supports it, or hide the link if unsupported.
2. **Signup clarity**
   - Add a “Create account” path (if allowed) or explicitly state “Use Google to continue” if invite-only; hide `/signup` link otherwise.
3. **Branding polish**
   - Provider-specific icons/labels; ensure accessible focus/hover states and subtle animations.
4. **401 UX**
   - Audit client fetch calls (cards/buckets/simulations/sessions) to ensure `401` triggers `signIn()` or a CTA, not a silent failure.
5. **Copy alignment**
   - Reinforce Cherry’s identity (spending copilot, not a card) and link to docs/legal constraints if shown to users.

## Related docs
- `docs/architecture/auth.md`
- `AGENTS.md`
