import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { logout } from "../../api/auth";
import { useToast } from "../ui/Toast";
import { Button } from "../ui/Button";
import { UserAvatar } from "./UserAvatar";
import { SlackConnectionControl } from "./SlackConnectionControl";
import type { User } from "../../types/user";

interface DashboardHeaderProps {
  user: User;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.clear();
      navigate("/login", { replace: true });
    },
    onError: (error) => {
      showToast({
        tone: "error",
        title: "Couldn’t sign out",
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 md:px-8">
        <a href="/dashboard" className="flex items-center gap-3" aria-label="ReachInbox dashboard">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-white shadow-sm shadow-slate-300">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
              <path d="M3.75 6.75h16.5v11.5H3.75zM4 7l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span>
            <span className="block text-sm font-bold tracking-tight text-slate-950">ReachInbox</span>
            <span className="hidden text-xs text-slate-500 sm:block">Email workspace</span>
          </span>
        </a>

        <div className="flex items-center gap-3">
          <SlackConnectionControl />
          <div className="hidden text-right sm:block">
            <p className="max-w-48 truncate text-sm font-semibold text-slate-800">{user.name ?? "Your account"}</p>
            <p className="max-w-48 truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <UserAvatar user={user} />
          <Button
            variant="secondary"
            className="px-3 py-2"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <span className="hidden sm:inline">{logoutMutation.isPending ? "Signing out..." : "Sign out"}</span>
            <span className="sm:hidden" aria-label="Sign out">
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.6">
                <path d="M8 3H4.5v14H8m3-3 4-4-4-4m4 4H7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
