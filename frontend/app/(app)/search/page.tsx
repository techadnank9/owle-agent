"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { searchCmsSnfs, searchSnfs, getCmsCities, bulkImport, bulkImportCms, CmsFacility, FacilityResult } from "@/lib/api";

const US_STATES = [
  ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],
  ["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["FL","Florida"],["GA","Georgia"],
  ["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],
  ["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],
  ["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],
  ["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],
  ["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],
  ["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],
  ["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],
  ["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],
];

const PRESET_QUERIES = [
  "Skilled Nursing Facility",
  "Nursing Home",
  "Rehabilitation Center",
  "Long-term Care Facility",
  "Convalescent Home",
  "Post-acute Care",
  "Memory Care Facility",
  "Custom…",
];

const OWNERSHIP_OPTIONS = [
  { value: "", label: "All Ownership Types" },
  { value: "for_profit", label: "For-Profit" },
  { value: "non_profit", label: "Non-Profit" },
  { value: "government", label: "Government" },
];

const SORT_OPTIONS = [
  { value: "priority", label: "Priority Score" },
  { value: "turnover", label: "Nurse Turnover ↓" },
  { value: "rn_turnover", label: "RN Turnover ↓" },
  { value: "penalties", label: "Penalties ↓" },
  { value: "stars", label: "Star Rating ↑ (worst first)" },
  { value: "beds", label: "Bed Count ↓" },
];

function StarBadge({ stars }: { stars: number }) {
  const color = stars <= 2 ? "text-red-600 bg-red-50" : stars === 3 ? "text-yellow-600 bg-yellow-50" : "text-green-600 bg-green-50";
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${color}`}>
      {"★".repeat(stars)}{"☆".repeat(5 - stars)}
    </span>
  );
}

function TurnoverBadge({ pct, label }: { pct: number | null; label: string }) {
  if (pct == null) return <span className="text-xs text-gray-300">—</span>;
  const color = pct >= 50 ? "text-red-700 font-semibold" : pct >= 30 ? "text-orange-600" : "text-gray-600";
  return <span className={`text-xs ${color}`}>{pct}% <span className="text-gray-400">{label}</span></span>;
}

function PriorityBadge({ score }: { score: number }) {
  const color = score >= 70 ? "bg-red-100 text-red-800" : score >= 45 ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-600";
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      P{Math.round(score)}
    </span>
  );
}

// ── CMS Tab ──────────────────────────────────────────────────────────────────

function CmsSearch() {
  const [state, setState] = useState("CA");
  const [city, setCity] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [minBeds, setMinBeds] = useState(100);
  const [sortBy, setSortBy] = useState("priority");
  const [maxResults, setMaxResults] = useState(50);
  const [ownership, setOwnership] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CmsFacility[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  useEffect(() => {
    setCitiesLoading(true);
    setCity("");
    getCmsCities(state)
      .then(d => setCities(d.cities))
      .catch(() => setCities([]))
      .finally(() => setCitiesLoading(false));
  }, [state]);

  async function handleSearch() {
    setLoading(true);
    setError(null);
    setResults([]);
    setSelected(new Set());
    setImportResult(null);
    try {
      const data = await searchCmsSnfs({ state, city: city || undefined, min_beds: minBeds, sort_by: sortBy, max_results: maxResults, ownership: ownership || undefined });
      setResults(data.results ?? []);
      if ((data.results ?? []).length === 0) setError("No results. Try lowering min beds or a different city.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(key: string) {
    setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  function toggleAll() {
    if (selected.size === results.length) setSelected(new Set());
    else setSelected(new Set(results.map(r => r.ccn || r.name)));
  }

  async function handleImport() {
    const toImport = results.filter(r => selected.has(r.ccn || r.name));
    if (!toImport.length) return;
    setImporting(true);
    setImportResult(null);
    try {
      const data = await bulkImportCms(toImport);
      setImportResult(`✓ ${data.processed} account(s) queued — agent pipeline running. Check Accounts page.`);
      setSelected(new Set());
    } catch (e: unknown) {
      setImportResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <div className="bg-white border rounded-xl p-5 flex flex-col gap-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">State</label>
            <select className="border rounded-lg px-3 py-2 text-sm" value={state} onChange={e => setState(e.target.value)}>
              {US_STATES.map(([abbr, name]) => <option key={abbr} value={abbr}>{name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">City <span className="text-gray-400 font-normal">(optional)</span></label>
            <select className="border rounded-lg px-3 py-2 text-sm" value={city} onChange={e => setCity(e.target.value)} disabled={citiesLoading}>
              <option value="">{citiesLoading ? "Loading cities…" : "All cities"}</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Ownership Type</label>
            <select className="border rounded-lg px-3 py-2 text-sm" value={ownership} onChange={e => setOwnership(e.target.value)}>
              {OWNERSHIP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Sort By</label>
            <select className="border rounded-lg px-3 py-2 text-sm" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Min Beds: <span className="text-gray-900 font-semibold">{minBeds}</span></label>
            <input type="range" min={0} max={300} step={25} value={minBeds} onChange={e => setMinBeds(Number(e.target.value))} className="w-full accent-gray-900" />
            <div className="flex justify-between text-xs text-gray-400"><span>0</span><span>100</span><span>200</span><span>300</span></div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Max Results: <span className="text-gray-900 font-semibold">{maxResults}</span></label>
            <input type="range" min={10} max={200} step={10} value={maxResults} onChange={e => setMaxResults(Number(e.target.value))} className="w-full accent-gray-900" />
            <div className="flex justify-between text-xs text-gray-400"><span>10</span><span>200</span></div>
          </div>
        </div>

        <Button onClick={handleSearch} disabled={loading} className="self-end">
          {loading ? "Searching CMS…" : "Search"}
        </Button>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {results.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-600">{results.length} facilities</p>
              <button onClick={toggleAll} className="text-xs text-gray-500 hover:text-gray-800 underline">
                {selected.size === results.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="flex items-center gap-3">
              {importResult && <p className="text-sm text-green-700">{importResult}</p>}
              <Button onClick={handleImport} disabled={selected.size === 0 || importing}>
                {importing ? "Importing…" : `Import ${selected.size} Selected`}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-400 px-1">
            <span><span className="text-red-600 font-semibold">P70+</span> = high priority</span>
            <span><span className="text-red-600">★</span> = low CMS stars</span>
            <span><span className="text-red-700 font-semibold">50%+</span> = critical turnover</span>
          </div>

          {results.map((r) => {
            const key = r.ccn || r.name;
            const isSelected = selected.has(key);
            return (
              <div key={key} onClick={() => toggleSelect(key)}
                className={`border rounded-xl p-4 cursor-pointer transition-colors ${isSelected ? "border-gray-900 bg-gray-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(key)} onClick={e => e.stopPropagation()} className="mt-1 accent-gray-900" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                      <PriorityBadge score={r.priority_score} />
                      {r.stars > 0 && <StarBadge stars={r.stars} />}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{r.address || r.location}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      {r.beds > 0 && <span className="text-xs text-gray-600"><span className="font-medium">{r.beds}</span> beds</span>}
                      <TurnoverBadge pct={r.nurse_turnover_pct} label="nurse turnover" />
                      <TurnoverBadge pct={r.rn_turnover_pct} label="RN turnover" />
                      {r.penalties > 0 && <span className="text-xs text-red-600 font-medium">{r.penalties} penalties{r.fines_usd > 0 ? ` · $${r.fines_usd.toLocaleString()}` : ""}</span>}
                      {r.staffing_stars != null && r.staffing_stars > 0 && <span className="text-xs text-gray-400">staffing ★{r.staffing_stars}</span>}
                      {r.ownership && <span className="text-xs text-gray-400">{r.ownership}</span>}
                      {r.chain && <span className="text-xs text-gray-400">Chain: {r.chain}</span>}
                    </div>
                    {r.phone && <p className="text-xs text-gray-400 mt-1">{r.phone}</p>}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex justify-end pb-6">
            <Button onClick={handleImport} disabled={selected.size === 0 || importing}>
              {importing ? "Importing…" : `Import ${selected.size} Selected`}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Google Maps Tab ───────────────────────────────────────────────────────────

function MapsSearch() {
  const [state, setState] = useState("CA");
  const [city, setCity] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [query, setQuery] = useState(PRESET_QUERIES[0]);
  const [customQuery, setCustomQuery] = useState("");
  const [maxResults, setMaxResults] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FacilityResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  useEffect(() => {
    setCitiesLoading(true);
    setCity("");
    getCmsCities(state)
      .then(d => setCities(d.cities))
      .catch(() => setCities([]))
      .finally(() => setCitiesLoading(false));
  }, [state]);

  const isCustom = query === "Custom…";
  const activeQuery = isCustom ? customQuery : query;

  async function handleSearch() {
    if (!activeQuery.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setSelected(new Set());
    setImportResult(null);
    try {
      const data = await searchSnfs({ query: activeQuery, state, city: city || undefined, max_results: maxResults });
      setResults(data.results ?? []);
      if ((data.results ?? []).length === 0) setError("No results. Try a different query or location.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(key: string) {
    setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  function toggleAll() {
    if (selected.size === results.length) setSelected(new Set());
    else setSelected(new Set(results.map(r => r.place_id || r.name)));
  }

  async function handleImport() {
    const toImport = results.filter(r => selected.has(r.place_id || r.name));
    if (!toImport.length) return;
    setImporting(true);
    setImportResult(null);
    try {
      const data = await bulkImport(toImport);
      setImportResult(`✓ ${data.processed} account(s) queued — agent pipeline running. Check Accounts page.`);
      setSelected(new Set());
    } catch (e: unknown) {
      setImportResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <div className="bg-white border rounded-xl p-5 flex flex-col gap-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Facility Type</label>
            <select className="border rounded-lg px-3 py-2 text-sm" value={query} onChange={e => setQuery(e.target.value)}>
              {PRESET_QUERIES.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>

          {isCustom ? (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Custom Search</label>
              <input type="text" className="border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Alzheimer's care center" value={customQuery} onChange={e => setCustomQuery(e.target.value)} />
            </div>
          ) : <div />}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">State</label>
            <select className="border rounded-lg px-3 py-2 text-sm" value={state} onChange={e => setState(e.target.value)}>
              {US_STATES.map(([abbr, name]) => <option key={abbr} value={abbr}>{name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">City <span className="text-gray-400 font-normal">(optional)</span></label>
            <select className="border rounded-lg px-3 py-2 text-sm" value={city} onChange={e => setCity(e.target.value)} disabled={citiesLoading}>
              <option value="">{citiesLoading ? "Loading cities…" : "All cities"}</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Max Results: <span className="text-gray-900 font-semibold">{maxResults}</span></label>
            <input type="range" min={5} max={50} step={5} value={maxResults} onChange={e => setMaxResults(Number(e.target.value))} className="w-full accent-gray-900" />
            <div className="flex justify-between text-xs text-gray-400"><span>5</span><span>50</span></div>
          </div>
        </div>

        <Button onClick={handleSearch} disabled={loading || !activeQuery.trim()} className="self-end">
          {loading ? "Searching Maps…" : "Search"}
        </Button>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {results.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-600">{results.length} facilities</p>
              <button onClick={toggleAll} className="text-xs text-gray-500 hover:text-gray-800 underline">
                {selected.size === results.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="flex items-center gap-3">
              {importResult && <p className="text-sm text-green-700">{importResult}</p>}
              <Button onClick={handleImport} disabled={selected.size === 0 || importing}>
                {importing ? "Importing…" : `Import ${selected.size} Selected`}
              </Button>
            </div>
          </div>

          {results.map((r) => {
            const key = r.place_id || r.name;
            const isSelected = selected.has(key);
            return (
              <div key={key} onClick={() => toggleSelect(key)}
                className={`border rounded-xl p-4 cursor-pointer transition-colors ${isSelected ? "border-gray-900 bg-gray-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(key)} onClick={e => e.stopPropagation()} className="mt-1 accent-gray-900" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                      {r.category && <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{r.category}</span>}
                      {r.rating != null && (
                        <span className="text-xs text-yellow-600 font-medium">★ {r.rating}{r.reviews_count ? <span className="text-gray-400 font-normal"> ({r.reviews_count})</span> : ""}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{r.address}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      {r.phone && <span className="text-xs text-gray-400">{r.phone}</span>}
                      {r.website && <a href={r.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-blue-500 hover:underline truncate max-w-xs">{r.website.replace(/^https?:\/\//, "")}</a>}
                      {r.maps_url && <a href={r.maps_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-gray-400 hover:text-gray-600">Google Maps ↗</a>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex justify-end pb-6">
            <Button onClick={handleImport} disabled={selected.size === 0 || importing}>
              {importing ? "Importing…" : `Import ${selected.size} Selected`}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [tab, setTab] = useState<"cms" | "maps">("cms");

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Search SNFs</h1>
        <p className="text-sm text-gray-500">Find skilled nursing facilities by CMS quality data or Google Maps.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("cms")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "cms" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          CMS Data
        </button>
        <button
          onClick={() => setTab("maps")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "maps" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Google Maps
        </button>
      </div>

      {tab === "cms" ? <CmsSearch /> : <MapsSearch />}
    </div>
  );
}
