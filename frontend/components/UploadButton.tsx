"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { uploadAccounts } from "@/lib/api";

export function UploadButton({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await uploadAccounts(file);
      setResult(`Processed ${data.processed} account(s)`);
      onDone();
    } catch (err: unknown) {
      setResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input ref={ref} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      <Button onClick={() => ref.current?.click()} disabled={loading}>
        {loading ? "Processing…" : "Upload CSV"}
      </Button>
      {result && <span className="text-sm text-gray-600">{result}</span>}
    </div>
  );
}
