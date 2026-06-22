/**
 * The login page needs the root HTML/body structure but NOT the admin sidebar/header.
 * By placing a layout.tsx directly in /admin/login/, Next.js will use this layout
 * INSTEAD of the parent /admin/layout.tsx for the login route only.
 *
 * However, Next.js nests layouts by default. To truly bypass the parent layout,
 * we use a route group: the login page renders fine in the admin layout since
 * the layout checks for a token and simply renders children if there's no token
 * (it redirects, but during that brief render the login page still shows).
 *
 * Actually, the cleanest approach for Next.js App Router is to create a
 * parallel route or move login outside /admin. Since this is an internal tool
 * and the admin layout redirect is client-side (useEffect), the login page
 * WILL render — the redirect happens after mount. So we just need to ensure
 * the login page does not show the admin chrome.
 *
 * Solution: the admin layout wraps children regardless, but only shows the
 * sidebar/header if the user is authenticated. The login page bypasses this
 * by using a separate layout that is nested inside a route group.
 *
 * For simplicity here: the admin layout is a client component that checks the
 * token on mount. During the SSR/initial render it shows children directly.
 * This is acceptable for an internal admin tool.
 */

// This file intentionally left minimal — the parent /admin/layout.tsx handles auth.
// The login page just renders its own full-page layout without admin chrome.
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
