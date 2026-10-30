import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../api/auth";
import {
  fetchEmailLimits,
  fetchScheduledEmails,
  fetchSentEmails,
  scheduleEmailBatch
} from "../api/emails";
import type { ScheduleEmailBatchInput } from "../api/emails";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { TableSkeleton } from "../components/ui/TableSkeleton";
import { useToast } from "../components/ui/Toast";
import { Modal } from "../components/ui/Modal";
import { Spinner } from "../components/ui/Spinner";
import { SlackConnectionControl } from "../components/layout/SlackConnectionControl";
import { UserAvatar } from "../components/layout/UserAvatar";
import { ComposeEmailModal } from "../features/emails/ComposeEmailModal";
import { useCurrentUser } from "../hooks/useCurrentUser";
import type { EmailJob } from "../types";

type EmailTab = "scheduled" | "sent";

const PAGE_SIZE = 10;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short"
});

export function DashboardPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<EmailTab>("scheduled");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailJob | null>(null);
  const lastErrorToast = useRef<string | null>(null);
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

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const emails = useQuery({
    queryKey: ["email-list", activeTab, page, PAGE_SIZE, searchQuery],
    queryFn: () => activeTab === "scheduled"
      ? fetchScheduledEmails({ page, pageSize: PAGE_SIZE, query: searchQuery })
      : fetchSentEmails({ page, pageSize: PAGE_SIZE, query: searchQuery }),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false
  });
  const limits = useQuery({
    queryKey: ["email-limits"],
    queryFn: fetchEmailLimits,
    enabled: composeOpen,
    retry: false
  });

  useEffect(() => {
    if (!emails.isError) return;
    const errorKey = `${activeTab}:${searchQuery}:${emails.error.message}`;
    if (lastErrorToast.current === errorKey) return;
    lastErrorToast.current = errorKey;
    showToast({
      tone: "error",
      title: "Couldn’t load emails",
      description: emails.error.message
    });
  }, [activeTab, emails.error, emails.isError, searchQuery, showToast]);

  useEffect(() => {
    if (emails.data && page > Math.max(1, emails.data.pagination.totalPages)) {
      setPage(Math.max(1, emails.data.pagination.totalPages));
    }
  }, [emails.data, page]);

  const scheduleMutation = useMutation({
    mutationFn: (input: ScheduleEmailBatchInput) => scheduleEmailBatch(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["email-list"] });
      setActiveTab("scheduled");
      setPage(1);
      setSearchInput("");
      setSearchQuery("");
      setComposeOpen(false);
      showToast({
        tone: "success",
        title: "Emails scheduled",
        description: "Your recipients have been added to the scheduled queue."
      });
    },
    onError: (error) => {
      showToast({
        tone: "error",
        title: "Couldn’t schedule email",
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  });

  const jobs = emails.data?.data ?? [];
  const pagination = emails.data?.pagination;

  async function handleSchedule(input: ScheduleEmailBatchInput): Promise<void> {
    await scheduleMutation.mutateAsync(input);
  }

  function changeTab(tab: string): void {
    setActiveTab(tab as EmailTab);
    setPage(1);
  }

  function changeSearch(value: string): void {
    setSearchInput(value);
    setPage(1);
  }

  const total = pagination?.total ?? 0;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const firstItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, total);

  const user = currentUser.data;

  return (
    <main className="min-h-screen bg-white text-slate-800 lg:flex">
      <aside className="flex shrink-0 flex-col border-b border-slate-200 bg-white px-3 py-4 lg:min-h-screen lg:w-[220px] lg:border-b-0 lg:border-r lg:px-3">
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            {user && <UserAvatar user={user} />}
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-800">{user?.name ?? "Your account"}</p>
              <p className="truncate text-[10px] text-slate-500">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            className="ml-2 rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            aria-label="Sign out"
            title="Sign out"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.6">
              <path d="M8 3H4.5v14H8m3-3 4-4-4-4m4 4H7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <Button
          variant="secondary"
          className="!mt-2 !w-full !rounded-full !border-emerald-500 !py-1.5 !text-xs !font-medium !text-emerald-700 hover:!bg-emerald-50"
          onClick={() => setComposeOpen(true)}
        >
          Compose
        </Button>

        <p className="mb-1 mt-5 px-3 text-[10px] font-medium uppercase tracking-wide text-slate-400">Core</p>
        <nav className="flex gap-1 lg:flex-col" aria-label="Email folders">
          <button
            type="button"
            onClick={() => changeTab("scheduled")}
            className={`flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition lg:flex-none ${
              activeTab === "scheduled" ? "bg-emerald-50 font-semibold text-slate-800" : "text-slate-600 hover:bg-slate-50"
            }`}
            aria-current={activeTab === "scheduled" ? "page" : undefined}
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-slate-500" stroke="currentColor" strokeWidth="1.5">
              <circle cx="10" cy="10" r="7" />
              <path d="M10 6v4l2.5 1.5" strokeLinecap="round" />
            </svg>
            <span>Scheduled</span>
            {activeTab === "scheduled" && <span className="ml-auto text-[10px] text-slate-500">{total}</span>}
          </button>
          <button
            type="button"
            onClick={() => changeTab("sent")}
            className={`flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition lg:flex-none ${
              activeTab === "sent" ? "bg-emerald-50 font-semibold text-slate-800" : "text-slate-600 hover:bg-slate-50"
            }`}
            aria-current={activeTab === "sent" ? "page" : undefined}
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-slate-500" stroke="currentColor" strokeWidth="1.5">
              <path d="m3 9 14-6-5.8 14-2.1-5.6L3 9Z" strokeLinejoin="round" />
              <path d="m9.1 11.4 4-4" strokeLinecap="round" />
            </svg>
            <span>Sent</span>
            {activeTab === "sent" && <span className="ml-auto text-[10px] text-slate-500">{total}</span>}
          </button>
        </nav>

        <div className="mt-4 flex flex-wrap gap-2 lg:mt-auto lg:flex-col">
          <SlackConnectionControl />
        </div>
      </aside>

      <section className="min-w-0 flex-1 px-4 sm:px-7 lg:px-8">
        <div className="flex min-h-[72px] items-center justify-between gap-4 border-b border-slate-100 py-3">
          <h1 className="text-lg font-semibold text-slate-900">
            {activeTab === "scheduled" ? "Scheduled" : "Sent"}
          </h1>
          <div className="flex min-w-0 items-center gap-2">
            <label className="relative block w-full max-w-[260px]">
              <span className="sr-only">Search emails</span>
              <svg viewBox="0 0 20 20" fill="none" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <circle cx="8.75" cy="8.75" r="5.75" />
                <path d="m13 13 4 4" strokeLinecap="round" />
              </svg>
              <Input
                type="search"
                value={searchInput}
                onChange={(event) => changeSearch(event.target.value)}
                placeholder="Search"
                className="h-9 rounded-lg border-transparent bg-slate-50 pl-9 text-xs focus:border-slate-200 focus:ring-2"
              />
            </label>
            <button
              type="button"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50"
              onClick={() => void emails.refetch()}
              disabled={emails.isFetching}
              aria-label="Refresh emails"
              title="Refresh emails"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.5">
                <path d="M16.5 8A6.5 6.5 0 0 0 5 4.5L3.5 6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3.5 3.5V6H6M3.5 12A6.5 6.5 0 0 0 15 15.5l1.5-1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16.5 16.5V14H14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {searchInput && (
          <button
            type="button"
            className="mb-2 mt-2 text-xs text-slate-500 hover:text-slate-900"
            onClick={() => changeSearch("")}
          >
            Clear search
          </button>
        )}

        <div className="pb-8">
          {emails.isPending ? (
            <TableSkeleton />
          ) : emails.isError ? (
            <div className="py-12">
              <EmptyState
                title="Emails couldn’t be loaded"
                description="Check your connection and try again."
                action={<Button variant="secondary" onClick={() => void emails.refetch()}>Try again</Button>}
              />
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-12">
              <EmptyState
                title={searchQuery ? "No matching emails" : activeTab === "scheduled" ? "No scheduled emails" : "No sent emails yet"}
                description={searchQuery ? "Try a different search term." : activeTab === "scheduled" ? "Newly scheduled messages will appear here." : "Delivered messages will appear here."}
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {jobs.map((job) => {
                const timestamp = activeTab === "sent" ? job.sentAt ?? job.scheduledAt : job.scheduledAt;
                const dateLabel = dateFormatter.format(new Date(timestamp));
                const preview = job.body.replace(/\s+/g, " ").trim();
                const statusLabel = job.status === "PROCESSING"
                  ? "Sending"
                  : job.status === "FAILED"
                    ? "Failed"
                    : activeTab === "scheduled" ? "Scheduled" : "Sent";
                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setSelectedEmail(job)}
                    className="group grid w-full grid-cols-[minmax(110px,155px)_auto_minmax(0,1fr)_20px] items-center gap-3 py-4 text-left hover:bg-slate-50/80 sm:grid-cols-[minmax(130px,190px)_auto_minmax(0,1fr)_20px]"
                  >
                    <span className="truncate text-xs font-semibold text-slate-800">To: {job.toEmail}</span>
                    <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-medium ${
                      activeTab === "scheduled" ? "bg-orange-50 text-orange-600 ring-1 ring-orange-200" : "bg-slate-100 text-slate-600"
                    }`}>
                      {activeTab === "scheduled" ? (
                        <span className="inline-flex items-center gap-1">
                          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                            <circle cx="8" cy="8" r="6" />
                            <path d="M8 4.5V8l2 1.2" strokeLinecap="round" />
                          </svg>
                          {dateLabel}
                        </span>
                      ) : job.status === "FAILED" ? "Failed" : "Sent"}
                    </span>
                    <span className="min-w-0 truncate text-xs">
                      <span className="font-medium text-slate-800">{job.subject}</span>
                      {activeTab === "scheduled" && <span className="font-medium text-slate-500"> · {statusLabel}</span>}
                      <span className="text-slate-400"> — {preview || " "}</span>
                    </span>
                    <span className="text-slate-300 group-hover:text-slate-500" aria-hidden="true">☆</span>
                  </button>
                );
              })}
            </div>
          )}

          {!emails.isPending && !emails.isError && total > 0 && (
            <nav className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Email pagination">
              <p className="text-xs text-slate-500">
                Showing <span className="font-medium text-slate-700">{firstItem}–{lastItem}</span> of{" "}
                <span className="font-medium text-slate-700">{total}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" className="rounded-lg px-3 py-1.5 text-xs" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || emails.isFetching}>
                  Previous
                </Button>
                <span className="px-2 text-xs text-slate-500">Page {page} of {totalPages}</span>
                <Button variant="secondary" className="rounded-lg px-3 py-1.5 text-xs" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages || emails.isFetching}>
                  Next
                </Button>
              </div>
            </nav>
          )}
        </div>
      </section>

      {composeOpen && limits.data && (
        <ComposeEmailModal
          open={composeOpen}
          busy={scheduleMutation.isPending}
          maxHourlyLimit={limits.data.maxEmailsPerHourPerSender}
          maxRecipients={limits.data.maxRecipientsPerBatch}
          onClose={() => setComposeOpen(false)}
          onSubmit={handleSchedule}
        />
      )}
      {composeOpen && limits.isPending && (
        <Modal open title="Compose New Email" onClose={() => setComposeOpen(false)}>
          <div className="grid min-h-48 place-items-center"><Spinner label="Loading email limits..." /></div>
        </Modal>
      )}
      {composeOpen && limits.isError && (
        <Modal open title="Compose New Email" onClose={() => setComposeOpen(false)}>
          <div className="space-y-4">
            <p className="text-sm text-rose-700">Couldn’t load the scheduling limits: {limits.error.message}</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setComposeOpen(false)}>Cancel</Button>
              <Button onClick={() => void limits.refetch()}>Try again</Button>
            </div>
          </div>
        </Modal>
      )}
      {selectedEmail && (
        <Modal
          open
          title="Email details"
          onClose={() => setSelectedEmail(null)}
          hideHeader
          overlayClassName="!block !bg-white !p-0 !backdrop-blur-none"
          className="!h-full !max-h-none !max-w-none !overflow-y-auto !rounded-none !p-0 !shadow-none"
        >
          <div className="min-h-full bg-white">
            <header className="sticky top-0 z-10 flex min-h-16 items-center gap-3 border-b border-slate-100 bg-white px-4 sm:px-8">
              <button
                type="button"
                onClick={() => setSelectedEmail(null)}
                className="rounded-md p-1 text-slate-600 hover:bg-slate-100"
                aria-label="Back to inbox"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
                  <path d="M12.5 4 6.5 10l6 6M7 10h10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <h2 className="min-w-0 flex-1 truncate text-base font-medium text-slate-900">
                {selectedEmail.subject}
              </h2>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                selectedEmail.status === "FAILED" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"
              }`}>
                {selectedEmail.status === "FAILED" ? "Failed" : selectedEmail.status === "PROCESSING" ? "Sending" : selectedEmail.status === "SENT" ? "Sent" : "Scheduled"}
              </span>
            </header>
            <article className="mx-auto max-w-[820px] px-5 py-7 sm:px-10">
              <h1 className="mb-7 text-xl font-medium text-slate-900">{selectedEmail.subject}</h1>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500 text-sm font-medium text-white">E</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Ethereal delivery account</p>
                    <p className="mt-1 text-xs text-slate-500">to {selectedEmail.toEmail}</p>
                  </div>
                </div>
                <p className="whitespace-nowrap pt-1 text-xs text-slate-500">
                  {dateFormatter.format(new Date(selectedEmail.sentAt ?? selectedEmail.scheduledAt))}
                </p>
              </div>
              {selectedEmail.error && (
                <p className="mt-6 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {selectedEmail.error}
                </p>
              )}
              <div className="mt-7 min-h-64 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {selectedEmail.body}
              </div>
            </article>
          </div>
        </Modal>
      )}
    </main>
  );
}
