import { Navigate, Outlet } from "react-router-dom";
import { ApiRequestError } from "../../api/client";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { Spinner } from "../ui/Spinner";

export function DashboardLayout() {
  const currentUser = useCurrentUser();

  if (currentUser.isPending) {
    return (
      <main className="grid min-h-screen place-items-center">
        <Spinner label="Checking your session..." />
      </main>
    );
  }

  if (currentUser.isError) {
    if (currentUser.error instanceof ApiRequestError && currentUser.error.status === 401) {
      return <Navigate to="/login" replace />;
    }

    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <h1 className="font-semibold text-slate-900">We couldn’t verify your session</h1>
          <p className="mt-2 text-sm text-slate-600">{currentUser.error.message}</p>
          <button className="mt-4 text-sm font-semibold text-slate-900 underline" onClick={() => void currentUser.refetch()}>
            Try again
          </button>
        </div>
      </main>
    );
  }

  return <Outlet />;
}
