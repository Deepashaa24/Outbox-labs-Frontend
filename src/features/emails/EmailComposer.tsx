import { useState, type FormEvent } from "react";
import type { CreateEmailInput } from "../../api/emails";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";

interface EmailComposerProps {
  busy: boolean;
  onSubmit: (input: CreateEmailInput) => Promise<void>;
}

function toLocalDateTimeValue(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function EmailComposer({ busy, onSubmit }: EmailComposerProps) {
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() => toLocalDateTimeValue(new Date()));
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      await onSubmit({
        recipient: recipient.trim(),
        subject: subject.trim(),
        body,
        scheduledAt: new Date(scheduledAt).toISOString()
      });
      setRecipient("");
      setSubject("");
      setBody("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not schedule email.");
    }
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
      <label className="block space-y-2 text-sm font-medium text-slate-700">
        Recipient
        <Input required type="email" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="name@example.com" />
      </label>
      <label className="block space-y-2 text-sm font-medium text-slate-700">
        Subject
        <Input required maxLength={998} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="A thoughtful subject line" />
      </label>
      <label className="block space-y-2 text-sm font-medium text-slate-700">
        Message
        <Textarea required rows={5} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write your email..." />
      </label>
      <label className="block space-y-2 text-sm font-medium text-slate-700">
        Send at
        <Input required type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
      </label>
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <Button disabled={busy} className="w-full">
        {busy ? "Scheduling..." : "Schedule email"}
      </Button>
    </form>
  );
}
