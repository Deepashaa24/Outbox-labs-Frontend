import { Navigate, useLocation } from "react-router-dom";
import { ApiRequestError } from "../../api/client";
import { getGoogleSignInUrl } from "../../api/auth";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 5)" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94a11.05 11.05 0 0 1-4.8 7.24l7.73 5.99c4.51-4.16 7.11-10.29 7.11-17.7Z" transform="translate(0 -5)" />
      <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.92 23.92 0 0 0 0 21.56l7.98-6.19Z" transform="translate(0 0)" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.76l-7.73-5.99c-2.14 1.44-4.89 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" transform="translate(0 -5)" />
    </svg>
  );
}

export function LoginPage() {
  const currentUser = useCurrentUser();
  const location = useLocation();
  const hasOAuthError = new URLSearchParams(location.search).get("error") === "oauth";

  if (currentUser.isPending) {
    return <main className="grid min-h-screen place-items-center"><Spinner label="Checking your session..." /></main>;
  }
  if (!currentUser.isError) return <Navigate to="/dashboard" replace />;

  const isUnauthenticated = currentUser.error instanceof ApiRequestError && currentUser.error.status === 401;
  return (
    <main className="grid min-h-screen place-items-center bg-white px-5 py-10">
      <section className="min-h-[396px] w-full max-w-[396px] rounded-lg border border-slate-200 px-8 py-10 sm:px-11">
          <h1 className="mb-6 text-center text-3xl font-semibold tracking-tight text-slate-900">Login</h1>
          {hasOAuthError && (
            <div className="mb-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-800" role="alert">
              Google sign-in could not be completed. Check your OAuth settings and network connection, then try again.
            </div>
          )}
          {!isUnauthenticated && (
            <div className="mb-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-800" role="status">
              We couldn’t verify your current session. You can still try signing in, or{" "}
              <button className="font-semibold underline" onClick={() => void currentUser.refetch()}>check again</button>.
            </div>
          )}
          <Button
            variant="secondary"
            className="!w-full !justify-center !rounded-lg !border-transparent !bg-emerald-50 !py-3 !text-slate-800 !shadow-none hover:!bg-emerald-100 focus-visible:!ring-emerald-200"
            onClick={() => window.location.assign(getGoogleSignInUrl())}
          >
            <GoogleMark />
            Login with Google
          </Button>
          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            <span>Secure sign-in with Google</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <p className="text-center text-xs leading-5 text-slate-500">
            Use your Google account to access your email workspace.
          </p>
      </section>
    </main>
  );
}
