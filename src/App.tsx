import React, { useMemo, useState, useEffect } from "react";
import { GoogleMap, useJsApiLoader, DrawingManager, Polygon } from "@react-google-maps/api";
import { motion } from "framer-motion";
import { Plus, Send, MapPin, Phone, Mail, WandSparkles, Building2, Home, MessageCircle } from "lucide-react";

type Mode = "domestic" | "commercial";

const STAGES = [
  { id: "lead", label: "Lead" },
  { id: "survey", label: "Survey" },
  { id: "proposal", label: "Proposal" },
  { id: "contract", label: "Contract" },
  { id: "install", label: "Install" },
  { id: "commissioned", label: "Commissioned" },
] as const;

type StageId = typeof STAGES[number]["id"];

type Card = {
  id: string;
  title: string;
  mode: Mode;
  kWp: number;
  contact: string;
  phone: string;
  email: string;
  address: string;
  stage: StageId;
};

const SAMPLE: Card[] = [
  { id: "c1", title: "Acme Bakery", mode: "commercial", kWp: 120, contact: "Sam Patel", phone: "+44 20 7123 4567", email: "sam@acmebakery.co.uk", address: "221B Baker St, London", stage: "lead" },
  { id: "c2", title: "Jones Residence", mode: "domestic", kWp: 6.4, contact: "Kerry Jones", phone: "+44 7400 111222", email: "kerry@example.com", address: "10 Downing St, London", stage: "survey" },
  { id: "c3", title: "GreenGym", mode: "commercial", kWp: 85, contact: "Lee Wong", phone: "+44 161 555 0909", email: "lee@greengym.com", address: "Oxford Rd, Manchester", stage: "proposal" },
];

const mapContainerStyle = { width: "100%", height: "420px" } as const;

export default function App() {
  const [mode, setMode] = useState<Mode>("domestic");
  const [search, setSearch] = useState("");
  const [cards, setCards] = useState<Card[]>(SAMPLE);
  const [selectedId, setSelectedId] = useState<string | null>(SAMPLE[0]?.id ?? null);
  const [polys, setPolys] = useState<{ path: { lat: number; lng: number }[] }[]>([]);
  const [messages, setMessages] = useState([{ id: 1, from: "Kerry", text: "Hi! Can you do a 6kW system?" }]);
  const [chatInput, setChatInput] = useState("");
  const [aiLog, setAiLog] = useState<string[]>([]);
  const [center, setCenter] = useState({ lat: 51.5074, lng: -0.1278 });

  const { isLoaded } = useJsApiLoader({
    id: "google-map",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: ["drawing", "places"],
  });

  const sel = useMemo(() => cards.find((c) => c.id === selectedId) || null, [cards, selectedId]);
  useEffect(() => { if (sel?.mode) setMode(sel.mode); }, [sel?.mode]);

  const filtered = useMemo(
    () =>
      cards.filter((c) =>
        [c.title, c.contact, c.email, c.address].some((v) =>
          String(v).toLowerCase().includes(search.toLowerCase())
        )
      ),
    [cards, search]
  );

  const byStage = useMemo(() => {
    const map: Record<string, Card[]> = {};
    STAGES.forEach((s) => (map[s.id] = []));
    filtered.forEach((c) => map[c.stage].push(c));
    return map;
  }, [filtered]);

  function moveCard(cardId: string, stageId: StageId) {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, stage: stageId } : c)));
  }

  function createCard() {
    const id = Math.random().toString(36).slice(2, 8);
    const newCard: Card = {
      id,
      title: mode === "domestic" ? "New Residence" : "New Business",
      mode,
      kWp: mode === "domestic" ? 4 : 50,
      contact: "",
      phone: "",
      email: "",
      address: "",
      stage: "lead",
    };
    setCards((c) => [newCard, ...c]);
    setSelectedId(id);
  }

  function updateSelected(patch: Partial<Card>) {
    if (!sel) return;
    setCards((prev) => prev.map((c) => (c.id === sel.id ? { ...c, ...patch } : c)));
  }

  function onPolygonComplete(poly: google.maps.Polygon) {
    const path = poly.getPath().getArray().map((p) => ({ lat: p.lat(), lng: p.lng() }));
    setPolys((ps) => [...ps, { path }]);
    poly.setMap(null);
  }

  function addChatMessage() {
    if (!chatInput.trim()) return;
    setMessages((m) => [...m, { id: Date.now(), from: "You", text: chatInput.trim() } as any]);
    setChatInput("");
  }

  // --- AI demo actions (local heuristics) ---
  function aiLeadScore() {
    if (!sel) return;
    const score = Math.min(
      100,
      Math.round((Number(sel.kWp || 0) * (sel.mode === "commercial" ? 1.2 : 1)) + (sel.email ? 10 : 0) + (sel.phone ? 10 : 0))
    );
    setAiLog((l) => [`Lead score for ${sel.title}: ${score}/100`, ...l]);
  }

  function aiRoofAreaFromPolys() {
    if (!polys.length) { setAiLog((l) => ["Draw at least one polygon on the map.", ...l]); return; }
    const area = polys.reduce((acc, p) => acc + approxPolyArea(p.path), 0);
    const estPanels = Math.floor(area / 1.8);
    const estkWp = (estPanels * 0.42).toFixed(1);
    setAiLog((l) => [`Roof area ≈ ${area.toFixed(1)} m² → ~${estPanels} panels → ~${estkWp} kWp`, ...l]);
  }

  function aiProposalOutline() {
    if (!sel) return;
    setAiLog((l) => [
      `Proposal for ${sel.title}\n• Size: ${sel.kWp || "TBD"} kWp\n• Mode: ${sel.mode}\n• Address: ${sel.address || "TBD"}\n• Est. generation: ${(Number(sel.kWp || 0) * 900).toFixed(0)} kWh/yr\n• Next: survey → design → quote → contract → install`,
      ...l,
    ]);
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Top bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "white", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 36, height: 36, borderRadius: 14, background: "#10b981", color: "white", display: "grid", placeItems: "center", fontWeight: 700 }}>S</div>
            <div>
              <div style={{ fontWeight: 600 }}>Solar CRM</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Sale → Install workflow with Maps & AI</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {/* Domestic/Commercial toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f3f4f6", padding: "6px 10px", borderRadius: 999 }}>
              <Home size={16} style={{ opacity: mode === "domestic" ? 1 : 0.4 }} />
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={mode === "commercial"}
                  onChange={(e) => setMode(e.target.checked ? "commercial" : "domestic")}
                />
                <span style={{ fontSize: 12 }}>{mode === "commercial" ? "Commercial" : "Domestic"}</span>
              </label>
              <Building2 size={16} style={{ opacity: mode === "commercial" ? 1 : 0.4 }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16, display: "grid", gridTemplateColumns: "3fr 1fr", gap: 16 }}>
        {/* Pipeline Board */}
        <div>
          <div style={{ marginBottom: 8, display: "flex", gap: 8 }}>
            <input
              placeholder="Search leads, contacts, addresses…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb" }}
            />
            <button onClick={createCard} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 12px", borderRadius: 10, border: "1px solid #10b981", color: "#065f46" }}>
              <Plus size={16} /> New {mode === "domestic" ? "Home" : "Biz"}
            </button>
          </div>

          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
            {STAGES.map((s) => (
              <div key={s.id} style={{ background: "#f3f4f6", borderRadius: 16, padding: 8, minHeight: 200 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</div>
                  <span style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>
                    {byStage[s.id].length}
                  </span>
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  {byStage[s.id].map((c) => (
                    <motion.div key={c.id} layout onClick={() => setSelectedId(c.id)}
                      style={{
                        cursor: "pointer",
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        background: "white",
                        padding: 10,
                        boxShadow: selectedId === c.id ? "0 0 0 2px #34d399" : "none"
                      }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                        <span style={{ fontSize: 12, background: "#ecfeff", border: "1px solid #e0f2fe", padding: "2px 6px", borderRadius: 8 }}>
                          {c.mode === "commercial" ? "Commercial" : "Domestic"}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.address || "No address yet"}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, marginTop: 4 }}>
                        <MapPin size={14} /> {c.kWp} kWp
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, marginTop: 4, opacity: 0.8 }}>
                        <Phone size={14} /> {c.phone || "—"} <Mail size={14} /> {c.email || "—"}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        {STAGES.filter(x => x.id !== c.stage).slice(0, 3).map((x) => (
                          <button key={x.id}
                            onClick={(e) => { e.stopPropagation(); moveCard(c.id, x.id as StageId); }}
                            style={{ fontSize: 12, border: "1px solid #e5e7eb", padding: "4px 8px", borderRadius: 8 }}>
                            {x.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel: Lead + AI */}
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>Lead / Job</div>
              <span style={{ fontSize: 12, color: "#6b7280" }}>{sel?.id || "—"}</span>
            </div>
            <input value={sel?.title || ""} onChange={(e) => updateSelected({ title: e.target.value })}
              placeholder={mode === "domestic" ? "Household name" : "Business name"}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb", marginBottom: 8 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input value={sel?.contact || ""} onChange={(e) => updateSelected({ contact: e.target.value })} placeholder="Contact person" style={ip} />
              <input value={sel?.kWp ?? ""} onChange={(e) => updateSelected({ kWp: Number(e.target.value) })} placeholder="kWp" style={ip} />
            </div>
            <input value={sel?.address || ""} onChange={(e) => updateSelected({ address: e.target.value })} placeholder="Address" style={{ ...ip, marginTop: 8 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
              <input value={sel?.phone || ""} onChange={(e) => updateSelected({ phone: e.target.value })} placeholder="Phone" style={ip} />
              <input value={sel?.email || ""} onChange={(e) => updateSelected({ email: e.target.value })} placeholder="Email" style={ip} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button style={btnOutline}>Save</button>
              <button style={btn}>Create Quote</button>
            </div>
          </div>

          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, marginBottom: 8 }}>
              <WandSparkles size={16} /> AI Sidekick
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 8 }}>
              <button style={btnSoft} onClick={aiLeadScore}>Lead score</button>
              <button style={btnSoft} onClick={aiRoofAreaFromPolys}>Roof area</button>
              <button style={btnSoft} onClick={aiProposalOutline}>Proposal</button>
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Outputs</div>
            <div style={{ background: "#f3f4f6", padding: 8, borderRadius: 10, maxHeight: 140, overflow: "auto", fontSize: 12 }}>
              {aiLog.length ? aiLog.map((l, i) => (
                <div key={i} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, whiteSpace: "pre-wrap", marginBottom: 6 }}>{l}</div>
              )) : <div style={{ opacity: .6 }}>Tap a button to generate AI output…</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Map + Chat */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16, display: "grid", gap: 16, gridTemplateColumns: "2fr 1fr" }}>
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Map Designer</div>
          {isLoaded ? (
            <GoogleMap mapContainerStyle={mapContainerStyle} center={center} zoom={14}
              onClick={(e) => setCenter({ lat: e.latLng!.lat(), lng: e.latLng!.lng() })}>
              <DrawingManager onPolygonComplete={onPolygonComplete}
                options={{ drawingControlOptions: { drawingModes: [google.maps.drawing.OverlayType.POLYGON] } }} />
              {polys.map((p, i) => <Polygon key={i} path={p.path} options={{ fillOpacity: 0.25 }} />)}
            </GoogleMap>
          ) : (
            <div style={{ height: 420, display: "grid", placeItems: "center", background: "#f3f4f6", borderRadius: 12 }}>
              Add VITE_GOOGLE_MAPS_API_KEY in .env to enable the designer.
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button style={btnOutline} onClick={() => setPolys([])}>Clear polygons</button>
          </div>
        </div>

        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, marginBottom: 8 }}>
            <MessageCircle size={16} /> WhatsApp (mock)
          </div>
          <div style={{ height: 280, overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 12, padding: 8, marginBottom: 8 }}>
            {messages.map((m) => (
              <div key={m.id} style={{ maxWidth: "70%", margin: "6px 0", marginLeft: m.from === "You" ? "auto" : 0 }}>
                <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 2 }}>{m.from}</div>
                <div style={{ background: m.from === "You" ? "#d1fae5" : "#f3f4f6", padding: "8px 10px", borderRadius: 12 }}>
                  {(m as any).text}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a WhatsApp message…" style={{ ...ip, flex: 1 }} />
            <button onClick={addChatMessage} style={btn}><Send size={16} /> Send</button>
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
            Real integration: connect WhatsApp Business API (Twilio or Meta Cloud) → receive webhooks → store threads by job/lead.
          </div>
        </div>
      </div>
    </div>
  );
}

const ip: React.CSSProperties = { padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 10 };
const btn: React.CSSProperties = { padding: "8px 10px", borderRadius: 10, background: "#10b981", color: "white", border: "1px solid #059669", display: "inline-flex", alignItems: "center", gap: 6 };
const btnOutline: React.CSSProperties = { padding: "8px 10px", borderRadius: 10, background: "white", border: "1px solid #e5e7eb" };
const btnSoft: React.CSSProperties = { padding: "8px 10px", borderRadius: 10, background: "#ecfeff", border: "1px solid #e0f2fe" };

// rough planar area from lat/lng polygon (shoelace)
function approxPolyArea(path: { lat: number; lng: number }[]) {
  if (path.length < 3) return 0;
  const R = 6378137;
  const toXY = (p: { lat: number; lng: number }) => {
    const x = (p.lng * Math.PI / 180) * R * Math.cos(p.lat * Math.PI / 180);
    const y = (p.lat * Math.PI / 180) * R;
    return { x, y };
    };
  const pts = path.map(toXY);
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    sum += (pts[i].x * pts[j].y - pts[j].x * pts[i].y);
  }
  return Math.abs(sum) / 2;
}
