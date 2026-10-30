import Papa from "papaparse";
import { useRef, useState, type ChangeEvent, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import type { ScheduleEmailBatchInput } from "../../api/emails";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Textarea } from "../../components/ui/Textarea";

interface ComposeEmailModalProps {
  open: boolean;
  busy: boolean;
  maxHourlyLimit: number;
  maxRecipients: number;
  onClose: () => void;
  onSubmit: (input: ScheduleEmailBatchInput) => Promise<void>;
}

interface ParsedRecipients {
  emails: string[];
  invalidCount: number;
  duplicateCount: number;
}

const EMAIL_PATTERN = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

function parseRecipients(text: string): ParsedRecipients {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
  const emails = new Map<string, string>();
  const invalid = new Set<string>();
  let duplicateCount = 0;

  for (const cell of parsed.data.flat()) {
    const value = cell.trim().replace(/^["']|["']$/g, "");
    if (!value || !value.includes("@")) continue;
    const normalized = value.toLowerCase();
    if (!EMAIL_PATTERN.test(value)) {
      invalid.add(normalized);
      continue;
    }
    if (emails.has(normalized)) {
      duplicateCount += 1;
      continue;
    }
    emails.set(normalized, normalized);
  }

  return {
    emails: [...emails.values()],
    invalidCount: invalid.size,
    duplicateCount
  };
}

function toLocalDateTimeValue(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function tomorrowAt(hour: number, minute: number): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, minute, 0, 0);
  return toLocalDateTimeValue(date);
}

export function ComposeEmailModal({
  open,
  busy,
  maxHourlyLimit,
  maxRecipients,
  onClose,
  onSubmit
}: ComposeEmailModalProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientText, setRecipientText] = useState("");
  const [recipientDraft, setRecipientDraft] = useState("");
  const [startTime, setStartTime] = useState(() => toLocalDateTimeValue(new Date()));
  const [delayBetweenMs, setDelayBetweenMs] = useState("2000");
  const [hourlyLimit, setHourlyLimit] = useState(String(maxHourlyLimit));
  const [uploadError, setUploadError] = useState("");
  const [formError, setFormError] = useState("");
  const [schedulePickerOpen, setSchedulePickerOpen] = useState(false);
  const parsedRecipients = parseRecipients(recipientText);
  const scheduledDate = new Date(startTime);
  const scheduledLabel = Number.isFinite(scheduledDate.getTime())
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(scheduledDate)
    : "Choose a schedule time";

  function updateRecipientText(value: string): void {
    setRecipientText(value);
    setUploadError("");
    setFormError("");
  }

  function addRecipient(value: string): void {
    const nextRecipients = parseRecipients(value).emails;
    if (nextRecipients.length > 0) {
      updateRecipientText([...parsedRecipients.emails, ...nextRecipients].join("\n"));
      setRecipientDraft("");
    }
  }

  function handleRecipientKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addRecipient(recipientDraft);
    }
  }

  function handleRecipientPaste(event: ClipboardEvent<HTMLInputElement>): void {
    const pasted = event.clipboardData.getData("text");
    if (!pasted.includes("@")) return;
    event.preventDefault();
    addRecipient(pasted);
  }

  function removeRecipient(email: string): void {
    updateRecipientText(parsedRecipients.emails.filter((recipient) => recipient !== email).join("\n"));
  }

  function chooseSchedule(value: string): void {
    setStartTime(value);
    setSchedulePickerOpen(false);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setUploadError("Choose a .csv or .txt file.");
      input.value = "";
      return;
    }

    Papa.parse<string[]>(file, {
      skipEmptyLines: "greedy",
      complete: (result) => {
        updateRecipientText(result.data.flat().join("\n"));
        if (result.errors.length > 0) {
          setUploadError("Some rows could not be parsed. Valid email addresses were kept.");
        }
        input.value = "";
      },
      error: () => {
        setUploadError("The file couldn’t be read. Try another CSV or text file.");
        input.value = "";
      }
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError("");

    const delay = Number(delayBetweenMs);
    const limit = Number(hourlyLimit);
    if (parsedRecipients.emails.length === 0) {
      setFormError("Add at least one valid email address.");
      return;
    }
    if (parsedRecipients.emails.length > maxRecipients) {
      setFormError(`You can schedule up to ${maxRecipients} recipients at a time.`);
      return;
    }
    if (!Number.isSafeInteger(delay) || delay < 2000) {
      setFormError("Delay must be at least 2000 milliseconds.");
      return;
    }
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > maxHourlyLimit) {
      setFormError(`Hourly limit must be between 1 and ${maxHourlyLimit}.`);
      return;
    }
    const scheduledStart = new Date(startTime);
    if (!Number.isFinite(scheduledStart.getTime())) {
      setFormError("Choose a valid start time.");
      return;
    }

    try {
      await onSubmit({
        subject: subject.trim(),
        body,
        recipients: parsedRecipients.emails,
        startTime: scheduledStart.toISOString(),
        delayBetweenMs: delay,
        hourlyLimit: limit
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not schedule emails.");
    }
  }

  return (
    <Modal
      open={open}
      title="Compose New Email"
      onClose={onClose}
      hideHeader
      overlayClassName="!block !bg-white !p-0 !backdrop-blur-none"
      className="!h-full !max-h-none !max-w-none !overflow-y-auto !rounded-none !p-0 !shadow-none"
    >
      <form id="compose-form" className="min-h-full" onSubmit={(event) => void handleSubmit(event)}>
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Back to inbox">
              <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
                <path d="M12.5 4 6.5 10l6 6M7 10h10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h2 className="truncate text-lg font-medium text-slate-900">Compose New Email</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <input
              ref={fileInput}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="sr-only"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-emerald-600"
              aria-label="Upload recipient list"
              title="Upload recipient list"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.5">
                <path d="m7.5 10.5 4.7-4.7a2.1 2.1 0 0 1 3 3l-6.8 6.8a3.5 3.5 0 0 1-5-5l7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setSchedulePickerOpen((isOpen) => !isOpen)}
                className={`rounded-full p-2 hover:bg-emerald-50 ${schedulePickerOpen ? "text-emerald-600" : "text-slate-400"}`}
                aria-label="Choose schedule time"
                aria-expanded={schedulePickerOpen}
                title="Choose schedule time"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="10" cy="10" r="7" />
                  <path d="M10 6v4l2.5 1.5" strokeLinecap="round" />
                </svg>
              </button>
              {schedulePickerOpen && (
                <div className="absolute right-0 top-11 z-20 w-[min(290px,calc(100vw-2rem))] rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
                  <p className="mb-2 text-sm font-medium text-slate-800">Send later</p>
                  <label className="mb-3 block">
                    <span className="sr-only">Pick date and time</span>
                    <Input
                      type="datetime-local"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                      className="rounded-md text-xs"
                    />
                  </label>
                  <div className="space-y-1">
                    {[
                      { label: "Tomorrow", value: tomorrowAt(9, 15) },
                      { label: "Tomorrow, 10:00 AM", value: tomorrowAt(10, 0) },
                      { label: "Tomorrow, 11:00 AM", value: tomorrowAt(11, 0) },
                      { label: "Tomorrow, 3:00 PM", value: tomorrowAt(15, 0) }
                    ].map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => chooseSchedule(option.value)}
                        className="block w-full rounded px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
                    <Button type="button" className="!rounded-full !border !border-emerald-500 !bg-white !px-4 !py-1.5 !text-xs !text-emerald-700 !shadow-none hover:!bg-emerald-50" onClick={() => setSchedulePickerOpen(false)}>
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <Button
              type="submit"
              form="compose-form"
              disabled={busy || parsedRecipients.emails.length === 0}
              className="!rounded-full !border !border-emerald-500 !bg-white !px-5 !py-1.5 !text-xs !font-medium !text-emerald-700 !shadow-none hover:!bg-emerald-50 focus-visible:!ring-emerald-200"
            >
              {busy ? "Scheduling..." : "Schedule"}
            </Button>
          </div>
        </header>

        <div className="mx-auto max-w-[1080px] px-4 pb-10 pt-5 sm:px-8">
          <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-x-3 border-b border-slate-100 py-3 text-xs">
            <span className="text-slate-600">From</span>
            <span className="inline-flex w-fit items-center gap-2 rounded-md bg-slate-100 px-2.5 py-2 text-slate-800">
              Assigned Ethereal sender
              <span className="text-slate-400" aria-hidden="true">⌄</span>
            </span>
          </div>

          <div className="grid grid-cols-[52px_minmax(0,1fr)] items-start gap-x-3 border-b border-slate-100 py-3 text-xs">
            <label htmlFor="recipient-entry" className="pt-2 text-slate-600">To</label>
            <div className="flex min-h-9 flex-wrap items-center gap-1.5">
              {parsedRecipients.emails.slice(0, 3).map((email) => (
                <span key={email} className="inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] text-slate-700">
                  <span className="truncate">{email}</span>
                  <button type="button" onClick={() => removeRecipient(email)} className="text-slate-400 hover:text-slate-800" aria-label={`Remove ${email}`}>×</button>
                </span>
              ))}
              {parsedRecipients.emails.length > 3 && (
                <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] text-slate-700">
                  +{parsedRecipients.emails.length - 3}
                </span>
              )}
              <Input
                id="recipient-entry"
                value={recipientDraft}
                onChange={(event) => setRecipientDraft(event.target.value)}
                onKeyDown={handleRecipientKeyDown}
                onPaste={handleRecipientPaste}
                placeholder={parsedRecipients.emails.length ? "Add recipient" : "recipient@example.com"}
                className="min-w-[180px] flex-1 border-0 px-1 py-2 text-xs shadow-none focus:border-0 focus:ring-0"
                aria-describedby="recipient-help"
              />
              <span id="recipient-help" className="sr-only">Press Enter or comma to add a recipient. Paste a list or upload a CSV or text file.</span>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 13V3m0 0L6.5 6.5M10 3l3.5 3.5M4 12v4h12v-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Upload List
              </button>
            </div>
          </div>
          <div className="ml-[65px] flex flex-wrap gap-x-3 gap-y-1 py-1 text-[11px]">
            <span className="font-medium text-slate-600" aria-live="polite">{parsedRecipients.emails.length} recipients</span>
            <span className="text-slate-400">Up to {maxRecipients}</span>
            {parsedRecipients.duplicateCount > 0 && <span className="text-slate-500">{parsedRecipients.duplicateCount} duplicates removed</span>}
            {parsedRecipients.invalidCount > 0 && <span className="text-amber-700">{parsedRecipients.invalidCount} invalid addresses ignored</span>}
            {uploadError && <span className="text-amber-700">{uploadError}</span>}
          </div>

          <label className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-x-3 border-b border-slate-200 py-3 text-xs">
            <span className="text-slate-600">Subject</span>
            <Input
              required
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Subject"
              className="rounded-none border-0 px-1 py-1 text-sm shadow-none focus:border-0 focus:ring-0"
            />
          </label>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-slate-200 py-3 text-xs">
            <label className="flex items-center gap-2 text-slate-600">
              Delay between emails (ms)
              <Input
                required
                type="number"
                min="2000"
                step="1"
                value={delayBetweenMs}
                onChange={(event) => setDelayBetweenMs(event.target.value)}
                onBlur={() => {
                  const delay = Number(delayBetweenMs);
                  if (Number.isFinite(delay) && delay < 2000) setDelayBetweenMs("2000");
                }}
                className="w-20 rounded-md py-1.5 text-xs"
              />
            </label>
            <label className="flex items-center gap-2 text-slate-600">
              Hourly limit
              <Input
                required
                type="number"
                min="1"
                max={maxHourlyLimit}
                step="1"
                value={hourlyLimit}
                onChange={(event) => setHourlyLimit(event.target.value)}
                className="w-20 rounded-md py-1.5 text-xs"
              />
            </label>
            <span className="text-[11px] text-slate-400">
              Starts {scheduledLabel}
            </span>
          </div>

          <label htmlFor="email-body" className="sr-only">Email body</label>
          <Textarea
            id="email-body"
            required
            rows={16}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Type your message..."
            className="mt-3 min-h-[45vh] resize-y rounded-md border-0 bg-slate-50 px-4 py-4 text-sm leading-7 shadow-none placeholder:text-slate-400 focus:border-0 focus:ring-2 focus:ring-emerald-100"
          />

          {formError && <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{formError}</p>}
          <div className="mt-5 flex justify-end gap-3">
            <Button type="button" variant="secondary" className="rounded-full px-5 py-2 text-xs" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy || parsedRecipients.emails.length === 0} className="!rounded-full !bg-emerald-600 !px-5 !py-2 !text-xs hover:!bg-emerald-700 focus-visible:!ring-emerald-200">
              {busy ? "Scheduling emails..." : `Schedule ${parsedRecipients.emails.length || ""} emails`}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
