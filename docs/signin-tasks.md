# Sign-in Page Tasks (Cherry)

Status: **Active**. `/signin` is live with split layout and credential + Google flows, but still needs polish and recovery flows. Auth stack: NextAuth (PrismaAdapter) in `app/api/auth/[...nextauth]/route.ts`; UI in `app/signin/page.tsx` and related components; clients handle `401` by calling `signIn()` from `next-auth/react`.

Completed:
- Custom `/signin` page with split marketing/auth layout and pseudo-dashboard illustration.
- Error query params mapped to friendly messages.
- Credentials + Google buttons wired; mobile layout clean; TODO links for `/signup` and `/forgot-password` visible.

Next tasks (sequential):
1. **Recovery flows**
   - Implement a real `/forgot-password` placeholder (even if it just explains email reset is not yet available).
   - Wire password reset once a provider supports it, or hide the link if unsupported.
2. **Signup clarity**
   - Add a “Create account” path (if allowed) or explicitly state “Use Google to continue” if invite-only.
3. **Branding polish**
   - Provider-specific icons/labels; ensure accessible focus/hover states and subtle animations.
4. **401 UX**
   - Audit client fetch calls (cards/buckets/simulations/sessions) to ensure `401` triggers `signIn()` or a CTA, not a silent failure.
5. **Copy alignment**
   - Reinforce Cherry’s identity (spending copilot, not a card) and link to docs if shown to users.
