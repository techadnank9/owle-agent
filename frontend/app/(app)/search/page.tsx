"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { searchCmsSnfs, bulkImport, CmsFacility } from "@/lib/api";

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

const STATE_CITIES: Record<string, string[]> = {
  AL: ["Birmingham","Montgomery","Huntsville","Mobile"],
  AK: ["Anchorage","Fairbanks","Juneau"],
  AZ: ["Phoenix","Tucson","Mesa","Scottsdale"],
  AR: ["Little Rock","Fort Smith","Fayetteville"],
  CA: ["Los Angeles","San Diego","San Jose","San Francisco","Sacramento","Fresno","Oakland"],
  CO: ["Denver","Colorado Springs","Aurora","Boulder","Fort Collins"],
  CT: ["Bridgeport","Hartford","New Haven","Stamford"],
  DE: ["Wilmington","Dover","Newark"],
  FL: ["Jacksonville","Miami","Tampa","Orlando","St. Petersburg","Fort Lauderdale"],
  GA: ["Atlanta","Augusta","Columbus","Savannah"],
  HI: ["Honolulu","Hilo"],
  ID: ["Boise","Nampa","Meridian"],
  IL: ["Chicago","Aurora","Rockford","Joliet","Springfield"],
  IN: ["Indianapolis","Fort Wayne","Evansville","South Bend"],
  IA: ["Des Moines","Cedar Rapids","Davenport"],
  KS: ["Wichita","Overland Park","Kansas City","Topeka"],
  KY: ["Louisville","Lexington","Bowling Green"],
  LA: ["New Orleans","Baton Rouge","Shreveport","Lafayette"],
  ME: ["Portland","Lewiston","Bangor"],
  MD: ["Baltimore","Frederick","Rockville"],
  MA: ["Boston","Worcester","Springfield","Cambridge"],
  MI: ["Detroit","Grand Rapids","Warren","Lansing"],
  MN: ["Minneapolis","Saint Paul","Rochester","Duluth"],
  MS: ["Jackson","Gulfport","Southaven"],
  MO: ["Kansas City","Saint Louis","Springfield","Columbia"],
  MT: ["Billings","Missoula","Great Falls"],
  NE: ["Omaha","Lincoln","Bellevue"],
  NV: ["Las Vegas","Henderson","Reno"],
  NH: ["Manchester","Nashua","Concord"],
  NJ: ["Newark","Jersey City","Paterson","Trenton"],
  NM: ["Albuquerque","Las Cruces","Santa Fe"],
  NY: ["New York City","Buffalo","Rochester","Yonkers","Syracuse","Albany"],
  NC: ["Charlotte","Raleigh","Greensboro","Durham"],
  ND: ["Fargo","Bismarck","Grand Forks"],
  OH: ["Columbus","Cleveland","Cincinnati","Toledo","Akron"],
  OK: ["Oklahoma City","Tulsa","Norman"],
  OR: ["Portland","Salem","Eugene"],
  PA: ["Philadelphia","Pittsburgh","Allentown","Erie"],
  RI: ["Providence","Cranston","Warwick"],
  SC: ["Columbia","Charleston","Greenville"],
  SD: ["Sioux Falls","Rapid City"],
  TN: ["Nashville","Memphis","Knoxville","Chattanooga"],
  TX: ["Houston","San Antonio","Dallas","Austin","Fort Worth","El Paso"],
  UT: ["Salt Lake City","West Valley City","Provo"],
  VT: ["Burlington","South Burlington"],
  VA: ["Virginia Beach","Norfolk","Chesapeake","Richmond"],
  WA: ["Seattle","Spokane","Tacoma","Bellevue"],
  WV: ["Charleston","Huntington","Morgantown"],
  WI: ["Milwaukee","Madison","Green Bay"],
  WY: ["Cheyenne","Casper"],
};

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

export default function SearchPage() {
  const [state, setState] = useState("CA");
  const [city, setCity] = useState(STATE_CITIES["CA"][0]);
  const [minBeds, setMinBeds] = useState(100);
  const [sortBy, setSortBy] = useState("priority");
  const [maxResults, setMaxResults] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CmsFacility[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  function handleStateChange(newState: string) {
    setState(newState);
    setCity(STATE_CITIES[newState]?.[0] ?? "");
  }

  async function handleSearch() {
    setLoading(true);
    setError(null);
    setResults([]);
    setSelected(new Set());
    setImportResult(null);
    try {
      const data = await searchCmsSnfs({ state, city: city || undefined, min_beds: minBeds, sort_by: sortBy, max_results: maxResults });
      setResults(data.results ?? []);
      if ((data.results ?? []).length === 0) setError("No results. Try lowering min beds or selecting a different state.");
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
    const toImport = results
      .filter(r => selected.has(r.ccn || r.name))
      .map(r => ({ name: r.name, location: r.location, bed_count: r.beds, phone: r.phone, address: r.address }));
    if (!toImport.length) return;
    setImporting(true);
    setImportResult(null);
    try {
      const data = await bulkImport(toImport as never);
      setImportResult(`✓ ${data.processed} account(s) queued — agent pipeline running. Check Accounts page.`);
      setSelected(new Set());
    } catch (e: unknown) {
      setImportResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Search SNFs</h1>
        <p className="text-sm text-gray-500">CMS Care Compare data — scored by nurse turnover, penalties, and star ratings.</p>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-xl p-5 flex flex-col gap-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">State</label>
            <select className="border rounded-lg px-3 py-2 text-sm" value={state} onChange={e => handleStateChange(e.target.value)}>
              {US_STATES.map(([abbr, name]) => <option key={abbr} value={abbr}>{name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">City <span className="text-gray-400 font-normal">(optional)</span></label>
            <select className="border rounded-lg px-3 py-2 text-sm" value={city} onChange={e => setCity(e.target.value)}>
              <option value="">All cities</option>
              {(STATE_CITIES[state] ?? []).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Min Beds: <span className="text-gray-900 font-semibold">{minBeds}</span></label>
            <input type="range" min={0} max={300} step={25} value={minBeds} onChange={e => setMinBeds(Number(e.target.value))} className="w-full accent-gray-900" />
            <div className="flex justify-between text-xs text-gray-400"><span>0</span><span>100</span><span>200</span><span>300</span></div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Sort By</label>
            <select className="border rounded-lg px-3 py-2 text-sm" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="col-span-2 flex flex-col gap-1">
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

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-gray-400 px-1">
            <span><span className="text-red-600 font-semibold">P70+</span> = high priority</span>
            <span><span className="text-red-600">★</span> = low CMS stars</span>
            <span><span className="text-red-700 font-semibold">50%+</span> = critical turnover</span>
          </div>

          {results.map((r) => {
            const key = r.ccn || r.name;
            const isSelected = selected.has(key);
            return (
              <div
                key={key}
                onClick={() => toggleSelect(key)}
                className={`border rounded-xl p-4 cursor-pointer transition-colors ${isSelected ? "border-gray-900 bg-gray-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
              >
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
                      {r.beds > 0 && (
                        <span className="text-xs text-gray-600"><span className="font-medium">{r.beds}</span> beds</span>
                      )}
                      <TurnoverBadge pct={r.nurse_turnover_pct} label="nurse turnover" />
                      <TurnoverBadge pct={r.rn_turnover_pct} label="RN turnover" />
                      {r.penalties > 0 && (
                        <span className="text-xs text-red-600 font-medium">{r.penalties} penalties{r.fines_usd > 0 ? ` · $${r.fines_usd.toLocaleString()}` : ""}</span>
                      )}
                      {r.staffing_stars != null && r.staffing_stars > 0 && (
                        <span className="text-xs text-gray-400">staffing ★{r.staffing_stars}</span>
                      )}
                      {r.ownership && (
                        <span className="text-xs text-gray-400">{r.ownership}</span>
                      )}
                      {r.chain && (
                        <span className="text-xs text-gray-400">Chain: {r.chain}</span>
                      )}
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
    </div>
  );
}
