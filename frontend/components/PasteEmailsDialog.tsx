"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { pasteAccounts } from "@/lib/api";

type EmailEntry = {
  email: string;
  name: string;
  location: string;
  bed_count: string;
};

function parseRawEmails(raw: string): EmailEntry[] {
  return raw
    .split(/[\n,;]+/)
    .map((e) => e.trim())
    .filter((e) => e.includes("@"))
    .map((email) => ({ email, name: "", location: "", bed_count: "" }));
}

export function PasteEmailsDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"paste" | "enrich">("paste");
  const [raw, setRaw] = useState("");
  const [entries, setEntries] = useState<EmailEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  function handleNext() {
    setEntries(parseRawEmails(raw));
    setStep("enrich");
  }

  function updateEntry(idx: number, field: keyof EmailEntry, value: string) {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e))
    );
  }

  async function handleSubmit() {
    setLoading(true);
    setResult(null);
    try {
      const payload = entries.map((e) => ({
        email: e.email,
        name: e.name || undefined,
        location: e.location || undefined,
        bed_count: e.bed_count ? parseInt(e.bed_count) : undefined,
      }));
      const data = await pasteAccounts(payload);
      setResult(`Processed ${data.processed} account(s)`);
      onDone();
      setTimeout(() => { setOpen(false); setStep("paste"); setRaw(""); }, 1500);
    } catch (err: unknown) {
      setResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    setOpen(true);
    setStep("paste");
    setRaw("");
    setEntries([]);
    setResult(null);
  }

  return (
    <>
      <Button variant="outline" onClick={handleOpen}>
        Paste Emails
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">

            {step === "paste" && (
              <>
                <h2 className="text-base font-semibold text-gray-900">Paste Email Addresses</h2>
                <p className="text-sm text-gray-500">
                  One email per line, or separated by commas. Add facility details on the next step.
                </p>
                <Textarea
                  rows={8}
                  placeholder={"contact@sunrisesnf.com\ninfo@goldenacres.org, admin@maplecrest.com"}
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={handleNext} disabled={parseRawEmails(raw).length === 0}>
                    Next — Add Details
                  </Button>
                </div>
              </>
            )}

            {step === "enrich" && (
              <>
                <div className="flex items-center gap-3">
                  <button onClick={() => setStep("paste")} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
                  <h2 className="text-base font-semibold text-gray-900">Facility Details <span className="font-normal text-gray-400">(optional)</span></h2>
                </div>
                <p className="text-sm text-gray-500">
                  Fill in what you know. Blank fields will be searched on the web automatically before scoring.
                </p>

                <div className="flex flex-col gap-3">
                  {entries.map((entry, idx) => (
                    <div key={idx} className="border rounded-lg p-4 flex flex-col gap-3">
                      <p className="text-xs font-mono text-gray-500 truncate">{entry.email}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1 col-span-2">
                          <label className="text-xs text-gray-500">Facility Name</label>
                          <input
                            type="text"
                            className="border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
                            placeholder="Sunrise Skilled Nursing"
                            value={entry.name}
                            onChange={(e) => updateEntry(idx, "name", e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-gray-500">Location</label>
                          <input
                            type="text"
                            className="border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
                            placeholder="San Diego, CA"
                            value={entry.location}
                            onChange={(e) => updateEntry(idx, "location", e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-gray-500">Bed Count</label>
                          <input
                            type="number"
                            className="border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
                            placeholder="120"
                            value={entry.bed_count}
                            onChange={(e) => updateEntry(idx, "bed_count", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {result && <p className="text-sm text-gray-600">{result}</p>}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={loading}>
                    {loading ? "Processing…" : `Add ${entries.length} Account${entries.length === 1 ? "" : "s"}`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
