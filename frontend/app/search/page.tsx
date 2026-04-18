"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { searchSnfs, bulkImport, FacilityResult } from "@/lib/api";

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

// Major cities per state — first entry is the default (largest city)
const STATE_CITIES: Record<string, string[]> = {
  AL: ["Birmingham","Montgomery","Huntsville","Mobile"],
  AK: ["Anchorage","Fairbanks","Juneau"],
  AZ: ["Phoenix","Tucson","Mesa","Scottsdale","Tempe"],
  AR: ["Little Rock","Fort Smith","Fayetteville"],
  CA: ["Los Angeles","San Diego","San Jose","San Francisco","Sacramento","Fresno","Oakland","Long Beach"],
  CO: ["Denver","Colorado Springs","Aurora","Boulder","Fort Collins"],
  CT: ["Bridgeport","Hartford","New Haven","Stamford"],
  DE: ["Wilmington","Dover","Newark"],
  FL: ["Jacksonville","Miami","Tampa","Orlando","St. Petersburg","Hialeah","Fort Lauderdale"],
  GA: ["Atlanta","Augusta","Columbus","Savannah","Athens"],
  HI: ["Honolulu","Hilo","Kailua"],
  ID: ["Boise","Nampa","Meridian","Idaho Falls"],
  IL: ["Chicago","Aurora","Rockford","Joliet","Naperville","Springfield"],
  IN: ["Indianapolis","Fort Wayne","Evansville","South Bend"],
  IA: ["Des Moines","Cedar Rapids","Davenport","Sioux City"],
  KS: ["Wichita","Overland Park","Kansas City","Topeka"],
  KY: ["Louisville","Lexington","Bowling Green"],
  LA: ["New Orleans","Baton Rouge","Shreveport","Lafayette"],
  ME: ["Portland","Lewiston","Bangor"],
  MD: ["Baltimore","Frederick","Rockville","Gaithersburg"],
  MA: ["Boston","Worcester","Springfield","Cambridge","Lowell"],
  MI: ["Detroit","Grand Rapids","Warren","Sterling Heights","Lansing"],
  MN: ["Minneapolis","Saint Paul","Rochester","Duluth"],
  MS: ["Jackson","Gulfport","Southaven"],
  MO: ["Kansas City","Saint Louis","Springfield","Columbia"],
  MT: ["Billings","Missoula","Great Falls","Bozeman"],
  NE: ["Omaha","Lincoln","Bellevue"],
  NV: ["Las Vegas","Henderson","Reno","North Las Vegas"],
  NH: ["Manchester","Nashua","Concord"],
  NJ: ["Newark","Jersey City","Paterson","Elizabeth","Trenton"],
  NM: ["Albuquerque","Las Cruces","Rio Rancho","Santa Fe"],
  NY: ["New York City","Buffalo","Rochester","Yonkers","Syracuse","Albany"],
  NC: ["Charlotte","Raleigh","Greensboro","Durham","Winston-Salem"],
  ND: ["Fargo","Bismarck","Grand Forks"],
  OH: ["Columbus","Cleveland","Cincinnati","Toledo","Akron"],
  OK: ["Oklahoma City","Tulsa","Norman","Broken Arrow"],
  OR: ["Portland","Salem","Eugene","Gresham","Hillsboro"],
  PA: ["Philadelphia","Pittsburgh","Allentown","Erie","Reading"],
  RI: ["Providence","Cranston","Warwick","Pawtucket"],
  SC: ["Columbia","Charleston","North Charleston","Greenville"],
  SD: ["Sioux Falls","Rapid City","Aberdeen"],
  TN: ["Nashville","Memphis","Knoxville","Chattanooga","Clarksville"],
  TX: ["Houston","San Antonio","Dallas","Austin","Fort Worth","El Paso","Arlington"],
  UT: ["Salt Lake City","West Valley City","Provo","West Jordan","Orem"],
  VT: ["Burlington","South Burlington","Rutland"],
  VA: ["Virginia Beach","Norfolk","Chesapeake","Richmond","Arlington"],
  WA: ["Seattle","Spokane","Tacoma","Vancouver","Bellevue"],
  WV: ["Charleston","Huntington","Morgantown"],
  WI: ["Milwaukee","Madison","Green Bay","Kenosha"],
  WY: ["Cheyenne","Casper","Laramie"],
};

export default function SearchPage() {
  const [selectedPreset, setSelectedPreset] = useState(PRESET_QUERIES[0]);
  const [customQuery, setCustomQuery] = useState("");
  const [state, setState] = useState("CA");
  const [city, setCity] = useState(STATE_CITIES["CA"][0]);

  function handleStateChange(newState: string) {
    setState(newState);
    setCity(STATE_CITIES[newState]?.[0] ?? "");
  }
  const [maxResults, setMaxResults] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FacilityResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const isCustom = selectedPreset === "Custom…";
  const activeQuery = isCustom ? customQuery : selectedPreset;

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
      if ((data.results ?? []).length === 0) setError("No results found. Try a different query or location.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(placeId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(placeId) ? next.delete(placeId) : next.add(placeId);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map(r => r.place_id || r.name)));
    }
  }

  async function handleImport() {
    const toImport = results.filter(r => selected.has(r.place_id || r.name));
    if (!toImport.length) return;
    setImporting(true);
    setImportResult(null);
    try {
      const data = await bulkImport(toImport);
      setImportResult(`✓ ${data.processed} account(s) queued — agent pipeline running in background. Check Accounts page.`);
      setSelected(new Set());
    } catch (e: unknown) {
      setImportResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Search SNFs</h1>
        <p className="text-sm text-gray-500">Find skilled nursing facilities via Google Maps and import them into the pipeline.</p>
      </div>

      {/* Search form */}
      <div className="bg-white border rounded-xl p-5 flex flex-col gap-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Query */}
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Search Query</label>
            <select
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
              value={selectedPreset}
              onChange={e => setSelectedPreset(e.target.value)}
            >
              {PRESET_QUERIES.map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
            {isCustom && (
              <input
                type="text"
                placeholder="Enter custom search query…"
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 mt-1"
                value={customQuery}
                onChange={e => setCustomQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
            )}
          </div>

          {/* State */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">State</label>
            <select
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
              value={state}
              onChange={e => handleStateChange(e.target.value)}
            >
              {US_STATES.map(([abbr, name]) => (
                <option key={abbr} value={abbr}>{name}</option>
              ))}
            </select>
          </div>

          {/* City */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">City <span className="text-gray-400 font-normal">(optional)</span></label>
            <select
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
              value={city}
              onChange={e => setCity(e.target.value)}
            >
              <option value="">All cities</option>
              {(STATE_CITIES[state] ?? []).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Max results */}
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Max Results: <span className="text-gray-900 font-semibold">{maxResults}</span></label>
            <input
              type="range"
              min={5} max={50} step={5}
              value={maxResults}
              onChange={e => setMaxResults(Number(e.target.value))}
              className="w-full accent-gray-900"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>5</span><span>50</span>
            </div>
          </div>
        </div>

        <Button onClick={handleSearch} disabled={loading || !activeQuery.trim()} className="self-end">
          {loading ? "Searching…" : "Search"}
        </Button>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {/* Results */}
      {results.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-600">{results.length} results</p>
              <button onClick={toggleAll} className="text-xs text-gray-500 hover:text-gray-800 underline">
                {selected.size === results.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="flex items-center gap-3">
              {importResult && <p className="text-sm text-gray-600">{importResult}</p>}
              <Button
                onClick={handleImport}
                disabled={selected.size === 0 || importing}
              >
                {importing ? "Importing…" : `Import ${selected.size} Selected`}
              </Button>
            </div>
          </div>

          {results.map((r) => {
            const key = r.place_id || r.name;
            const isSelected = selected.has(key);
            return (
              <div
                key={key}
                onClick={() => toggleSelect(key)}
                className={`border rounded-xl p-4 cursor-pointer transition-colors ${isSelected ? "border-gray-900 bg-gray-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(key)}
                    onClick={e => e.stopPropagation()}
                    className="mt-0.5 accent-gray-900"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                      {r.category && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{r.category}</span>
                      )}
                      {r.rating && (
                        <span className="text-xs text-gray-400">★ {r.rating} ({r.reviews_count})</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{r.address}</p>
                    <div className="flex gap-4 mt-1">
                      {r.phone && <p className="text-xs text-gray-400">{r.phone}</p>}
                      {r.website && (
                        <a
                          href={r.website}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-blue-500 hover:underline truncate max-w-xs"
                        >
                          {r.website.replace(/^https?:\/\//, "")}
                        </a>
                      )}
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
    </div>
  );
}
