import { useState, useMemo } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";

// ─── DATA ────────────────────────────────────────────────────────────────────

const CURRENT_PORTFOLIO = [
  { category: "CASH", subcategory: "CASH", name: "Xtrackers II EUR Overnight Rate Swap UCITS", isin: "LU0290358497", pct: 5, timing: "NOW", toInvest: 6565.05, alreadyIn: null, remaining: null, risk: 1, note: "", rendAnnuo: 2 },
  { category: "CASH", subcategory: "CASH", name: "Amundi Smart Overnight Return UCITS ETF Acc", isin: "LU1190417599", pct: 11, timing: "NOW", toInvest: 14443.12, alreadyIn: null, remaining: null, risk: 1, note: "", rendAnnuo: 2.5 },
  { category: "EQUITY (AZIONI)", subcategory: "EQUITY EUROPA", name: "iShares Core EURO STOXX 50 UCITS ETF EUR (Acc)", isin: "IE00B53L3W79", pct: 14, timing: "NOW", toInvest: 18382.15, alreadyIn: 5010, remaining: 13372.15, risk: 4, note: "Buon momento per entrare", rendAnnuo: null },
  { category: "EQUITY (AZIONI)", subcategory: "EQUITY EUROPA", name: "iShares Core DAX® UCITS ETF (DE) EUR (Acc)", isin: "DE0005933931", pct: 1, timing: "NOW", toInvest: 1313.01, alreadyIn: null, remaining: 1313.01, risk: 4, note: "Odio i tedeschi ma buon momento", rendAnnuo: null },
  { category: "EQUITY (AZIONI)", subcategory: "EQUITY ASIA", name: "Amundi MSCI Emerging Markets Swap UCITS ETF", isin: "LU1681045370", pct: 0, timing: "LATER", toInvest: 0, alreadyIn: null, remaining: null, risk: 4, note: "Siamo alti da 1 anno", rendAnnuo: null },
  { category: "EQUITY (AZIONI)", subcategory: "EQUITY ASIA", name: "Amdi Msci Ac Asia Pcfc Ex Jpn", isin: "LU1900068328", pct: 7, timing: "LATER", toInvest: 9191.07, alreadyIn: 1020, remaining: 8171.07, risk: 4, note: "Metà asia, metà emerging asia", rendAnnuo: null },
  { category: "EQUITY (AZIONI)", subcategory: "EQUITY WORLD", name: "iShares Core MSCI World UCITS ETF USD (Acc)", isin: "IE00B4L5Y983", pct: 9, timing: "NOW", toInvest: 11817.10, alreadyIn: 3810, remaining: 8007.10, risk: 4, note: "", rendAnnuo: null },
  { category: "EQUITY (AZIONI)", subcategory: "INFRASTRUTTURE/UTILITIES", name: "iShares Global Infrastructure UCITS ETF USD (Dist)", isin: "IE00B1FZS467", pct: 4, timing: "LATER", toInvest: 5252.04, alreadyIn: null, remaining: 5252.04, risk: 4, note: "Siamo alti da 1 mese", rendAnnuo: null },
  { category: "EQUITY (AZIONI)", subcategory: "INFRASTRUTTURE/UTILITIES", name: "Amundi STOXX Europe 600 Utilities UCITS ETF Acc", isin: "LU1834988864", pct: 0, timing: "LATER", toInvest: 0, alreadyIn: null, remaining: null, risk: 4, note: "Eurozone ma ai picchi", rendAnnuo: null },
  { category: "ENERGIA", subcategory: "ENERGIA", name: "Amundi MSCI New Energy UCITS ETF (Dist)", isin: "FR0010524777", pct: 5, timing: "NOW", toInvest: 6565.05, alreadyIn: 988, remaining: 5577.05, risk: 5, note: "Buon momento per entrare", rendAnnuo: null },
  { category: "ENERGIA", subcategory: "ENERGIA", name: "VanEck Uranium and Nuclear Technologies UCITS", isin: "IE000M7V94E1", pct: 2, timing: "LATER", toInvest: 2626.02, alreadyIn: null, remaining: 2626.02, risk: 5, note: "Possibile picco", rendAnnuo: null },
  { category: "ENERGIA", subcategory: "ENERGIA", name: "Global X Uranium UCITS ETF USD", isin: "IE000NDWFGA5", pct: 0, timing: "LATER", toInvest: 0, alreadyIn: null, remaining: null, risk: 6, note: "Possibile picco", rendAnnuo: null },
  { category: "BOND (OBBLIGAZIONI)", subcategory: "BOND", name: "Titoli italiani", isin: "—", pct: 24, timing: "—", toInvest: 31512.26, alreadyIn: 60000, remaining: -7479.57, risk: null, note: "", rendAnnuo: null },
  { category: "ORO", subcategory: "GOLD", name: "Xtrackers Physical Gold EUR Hedged", isin: "DE000A1EK0G3", pct: 6, timing: "LATER", toInvest: 7878.06, alreadyIn: null, remaining: 7878.06, risk: null, note: "Sopravvalutato", rendAnnuo: null },
  { category: "MATERIE PRIME", subcategory: "MATERIE PRIME / AGRICOLTURA", name: "Amundi Commodities Ex-Agric", isin: "LU1829218749", pct: 12, timing: "SOON", toInvest: 15756.13, alreadyIn: null, remaining: 15756.13, risk: 4, note: "Buono da comprare ora", rendAnnuo: null },
];

// Maps category → weights key (equity bucket includes EQUITY, ENERGIA, MATERIE PRIME)
const CAT_TO_KEY = {
  "CASH": "cash",
  "BOND (OBBLIGAZIONI)": "bond",
  "EQUITY (AZIONI)": "equity_az",
  "ENERGIA": "energia",
  "ORO": "oro",
  "MATERIE PRIME": "materie",
};

// PTF1 asset pcts = exact values from Excel. Others = proportionally scaled from PTF1.
const PTF1_ASSET_PCTS = Object.fromEntries(CURRENT_PORTFOLIO.map(e => [e.isin + e.name, e.pct]));

function scaleAssetPcts(basePcts, newWeights) {
  const equityAzTarget = +(newWeights.equity * (35/42)).toFixed(1);
  const energiaTarget  = +(newWeights.equity * (7/42)).toFixed(1);
  const oroTarget      = +(newWeights.gold   * (6/18)).toFixed(1);
  const materieTarget  = +(newWeights.gold   * (12/18)).toFixed(1);
  const effectiveTargets = {
    cash: newWeights.cash, bond: newWeights.bond,
    equity_az: equityAzTarget, energia: energiaTarget,
    oro: oroTarget, materie: materieTarget,
  };
  const result = {};
  CURRENT_PORTFOLIO.forEach(e => {
    const key = e.isin + e.name;
    const wKey = CAT_TO_KEY[e.category];
    const catAssets = CURRENT_PORTFOLIO.filter(x => CAT_TO_KEY[x.category] === wKey);
    const baseSum = catAssets.reduce((s, x) => s + (basePcts[x.isin + x.name] || 0), 0);
    const newTotal = effectiveTargets[wKey] || 0;
    result[key] = baseSum > 0 ? +((basePcts[key] / baseSum) * newTotal).toFixed(1) : 0;
  });
  return result;
}

const ALLOCATION = [
  { name: "CASH", pct: 16, color: "#6ee7b7", risk: 1 },
  { name: "EQUITY", pct: 42, color: "#60a5fa", risk: "4-6" },
  { name: "BOND", pct: 24, color: "#fbbf24", risk: 1 },
  { name: "ORO", pct: 6, color: "#f59e0b", risk: null },
  { name: "MATERIE PRIME", pct: 12, color: "#f87171", risk: 4 },
];

const HISTORICAL_RETURNS = [
  { year: 2000, cash: 0.0430, bond: 0.0696, equity: -0.1077, gold: -0.0555 },
  { year: 2001, cash: 0.0444, bond: 0.0626, equity: -0.1525, gold: 0.0246 },
  { year: 2002, cash: 0.0336, bond: 0.0948, equity: -0.252, gold: 0.2477 },
  { year: 2003, cash: 0.0238, bond: 0.0398, equity: 0.2275, gold: 0.1936 },
  { year: 2004, cash: 0.0209, bond: 0.0802, equity: 0.0949, gold: 0.0543 },
  { year: 2005, cash: 0.0212, bond: 0.0473, equity: 0.1374, gold: 0.1758 },
  { year: 2006, cash: 0.0289, bond: -0.0038, equity: 0.1378, gold: 0.2354 },
  { year: 2007, cash: 0.0404, bond: 0.0148, equity: 0.0259, gold: 0.2221 },
  { year: 2008, cash: 0.0383, bond: 0.0919, equity: -0.4011, gold: 0.0911 },
  { year: 2009, cash: 0.0061, bond: 0.04, equity: 0.2282, gold: 0.2214 },
  { year: 2010, cash: 0.0035, bond: 0.0091, equity: 0.0783, gold: 0.3843 },
  { year: 2011, cash: 0.0075, bond: 0.01, equity: -0.0661, gold: 0.1417 },
  { year: 2012, cash: 0.0012, bond: 0.1081, equity: 0.1354, gold: 0.0286 },
  { year: 2013, cash: 0.0003, bond: 0.0189, equity: 0.2994, gold: -0.3059 },
  { year: 2014, cash: 0.0003, bond: 0.1316, equity: 0.0865, gold: 0.1295 },
  { year: 2015, cash: -0.0007, bond: 0.0147, equity: 0.0171, gold: -0.0212 },
  { year: 2016, cash: -0.0042, bond: 0.041, equity: 0.0652, gold: 0.105 },
  { year: 2017, cash: -0.0046, bond: 0, equity: 0.1645, gold: -0.013 },
  { year: 2018, cash: -0.0054, bond: 0.0063, equity: -0.1019, gold: 0.0237 },
  { year: 2019, cash: -0.0061, bond: 0.068, equity: 0.256, gold: 0.21 },
  { year: 2020, cash: -0.0068, bond: 0.048, equity: 0.1172, gold: 0.1323 },
  { year: 2021, cash: -0.0069, bond: -0.0307, equity: 0.2211, gold: 0.0361 },
  { year: 2022, cash: -0.0011, bond: -0.1857, equity: -0.19, gold: 0.058 },
  { year: 2023, cash: 0.0319, bond: 0.0703, equity: 0.2089, gold: 0.0948 },
  { year: 2024, cash: 0.0371, bond: 0.0261, equity: 0.2289, gold: 0.3526 },
  { year: 2025, cash: 0.018, bond: 0.0111, equity: 0.1569, gold: 0.4455 },
];

const MEAN_RETURNS = { cash: 0.01457, bond: 0.03167, equity: 0.069574, gold: 0.118981 };
const STD_DEVS = { cash: 0.018038, bond: 0.059362, equity: 0.175607, gold: 0.152592 };

// Full variance-covariance matrix from Excel (row/col order: cash, bond, equity, gold)
const COV_MATRIX = [
  [ 0.000313,  0.000248, -0.000905,  0.000512],
  [ 0.000248,  0.003393, -0.000177,  0.000459],
  [-0.000905, -0.000177,  0.029696,  0.000911],
  [ 0.000512,  0.000459,  0.000911,  0.022422],
];

function calcPortfolioVariance(w) {
  // w = [cash, bond, equity, gold] as decimals
  let variance = 0;
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      variance += w[i] * w[j] * COV_MATRIX[i][j];
  return variance;
}

// Correlation = cov(i,j) / (std_i * std_j) — for display
const ASSET_LABELS = ["EUR Cash", "Bond", "Equity", "Gold"];
const CORR_MATRIX = COV_MATRIX.map((row, i) =>
  row.map((cov, j) => {
    const stds = [STD_DEVS.cash, STD_DEVS.bond, STD_DEVS.equity, STD_DEVS.gold];
    return +(cov / (stds[i] * stds[j])).toFixed(3);
  })
);

const PAC_ETFS = [
  { category: "EQUITY EUROPA", name: "iShares Core EURO STOXX 50 UCITS ETF EUR (Acc)", isin: "IE00B53L3W79", ogni: 2, importo: 1337, color: "#3b82f6" },
  { category: "EQUITY ASIA", name: "Amdi Msci Ac Asia Pcfc Ex Jpn", isin: "LU1900068328", ogni: 2, importo: 817, color: "#8b5cf6" },
  { category: "EQUITY WORLD", name: "iShares Core MSCI World UCITS ETF USD (Acc)", isin: "IE00B4L5Y983", ogni: 2, importo: 801, color: "#06b6d4" },
  { category: "INFRASTRUTTURE", name: "iShares Global Infrastructure UCITS ETF USD (Dist)", isin: "IE00B1FZS467", ogni: 2, importo: 525, color: "#10b981" },
  { category: "ENERGIA", name: "Amundi MSCI New Energy UCITS ETF (Dist)", isin: "FR0010524777", ogni: 2, importo: 558, color: "#f59e0b" },
  { category: "GOLD", name: "Xtrackers Physical Gold EUR Hedged", isin: "DE000A1EK0G3", ogni: 2, importo: 788, color: "#f97316" },
  { category: "MATERIE PRIME", name: "Amundi Commodities Ex-Agric", isin: "LU1829218749", ogni: 2, importo: 1576, color: "#ef4444" },
  // una tantum
  { category: "EQUITY EUROPA (una tantum)", name: "iShares Core DAX® UCITS ETF (DE) EUR (Acc)", isin: "DE0005933931", ogni: "una tantum", importo: 1313, color: "#64748b" },
  { category: "ENERGIA (una tantum)", name: "VanEck Uranium & Nuclear Technologies UCITS", isin: "IE000M7V94E1", ogni: "una tantum", importo: 2626, color: "#94a3b8" },
  // da nuovi stipendi ogni 3 mesi
  { category: "EQUITY EUROPA (ogni 3m)", name: "iShares Core EURO STOXX 50", isin: "IE00B53L3W79", ogni: 3, importo: 630, color: "#1d4ed8" },
  { category: "EQUITY ASIA (ogni 3m)", name: "Amdi Msci Ac Asia Pcfc Ex Jpn", isin: "LU1900068328", ogni: 3, importo: 315, color: "#7c3aed" },
  { category: "EQUITY WORLD (ogni 3m)", name: "iShares Core MSCI World", isin: "IE00B4L5Y983", ogni: 3, importo: 405, color: "#0284c7" },
  { category: "INFRASTRUTTURE (ogni 3m)", name: "iShares Global Infrastructure", isin: "IE00B1FZS467", ogni: 3, importo: 180, color: "#059669" },
  { category: "ENERGIA (ogni 3m)", name: "Amundi MSCI New Energy", isin: "FR0010524777", ogni: 3, importo: 225, color: "#d97706" },
  { category: "ENERGIA (ogni 3m)", name: "VanEck Uranium and Nuclear Technologies", isin: "IE000M7V94E1", ogni: 3, importo: 600, color: "#dc2626" },
  { category: "GOLD (ogni 3m)", name: "Xtrackers Physical Gold EUR Hedged", isin: "DE000A1EK0G3", ogni: 3, importo: 270, color: "#ea580c" },
  { category: "MATERIE PRIME (ogni 3m)", name: "Amundi Commodities Ex-Agric", isin: "LU1829218749", ogni: 3, importo: 540, color: "#be123c" },
  { category: "BOND (da stipendi ogni 3m)", name: "Titoli italiani", isin: "—", ogni: 3, importo: 12000 / 7, color: "#78716c" },
];

const timingColor = { NOW: "#22c55e", SOON: "#f59e0b", LATER: "#94a3b8" };
const riskColor = (r) => {
  if (!r) return "#94a3b8";
  if (r <= 1) return "#22c55e";
  if (r <= 3) return "#84cc16";
  if (r <= 4) return "#f59e0b";
  if (r <= 5) return "#f97316";
  return "#ef4444";
};

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

const Tab = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: "10px 22px",
      border: "none",
      borderBottom: active ? "3px solid #60a5fa" : "3px solid transparent",
      background: "transparent",
      color: active ? "#60a5fa" : "#94a3b8",
      fontFamily: "'DM Mono', monospace",
      fontSize: "13px",
      fontWeight: active ? 700 : 400,
      cursor: "pointer",
      letterSpacing: "0.05em",
      transition: "all 0.2s",
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </button>
);

const Card = ({ children, style = {} }) => (
  <div style={{
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "20px",
    ...style,
  }}>
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 style={{ color: "#e2e8f0", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "16px", opacity: 0.7 }}>
    {children}
  </h3>
);

const Pill = ({ value, color }) => (
  <span style={{
    background: color + "22",
    color: color,
    border: `1px solid ${color}44`,
    borderRadius: "6px",
    padding: "2px 8px",
    fontSize: "11px",
    fontFamily: "'DM Mono', monospace",
    fontWeight: 700,
  }}>
    {value}
  </span>
);

// ─── TAB 2: CURRENT PORTFOLIO ────────────────────────────────────────────────

function CurrentTab({ weights, assetPcts, setAssetPcts, invItalia, setInvItalia, invDanimarca, setInvDanimarca, daInvestire, setDaInvestire, totaleInvestimenti, alreadyIns, setAlreadyIns }) {
  const [filterCat, setFilterCat] = useState("ALL");
  const categories = ["ALL", ...Array.from(new Set(CURRENT_PORTFOLIO.map(e => e.category)))];

  // Editable timings per asset (keyed by isin)
  const [timings, setTimings] = useState(() =>
    Object.fromEntries(CURRENT_PORTFOLIO.map(e => [e.isin + e.name, e.timing]))
  );
  const [openDropdown, setOpenDropdown] = useState(null);
  // Editable notes per asset
  const [notes, setNotes] = useState(() =>
    Object.fromEntries(CURRENT_PORTFOLIO.map(e => [e.isin + e.name, e.note ?? ""]))
  );

  const filtered = useMemo(() => {
    const base = filterCat === "ALL" ? CURRENT_PORTFOLIO : CURRENT_PORTFOLIO.filter(e => e.category === filterCat);
    if (filterCat !== "ALL") return base;
    // Custom order: CASH first, then BOND, rest after; inject BOND+CASH summary row
    const cash = base.filter(e => e.category === "CASH");
    const bond = base.filter(e => e.category === "BOND (OBBLIGAZIONI)");
    const rest = base.filter(e => e.category !== "CASH" && e.category !== "BOND (OBBLIGAZIONI)");
    const bondCashSummary = { __summary: "BOND+CASH" };
    return [...cash, ...bond, bondCashSummary, ...rest];
  }, [filterCat]);

  const setTiming = (key, val) => {
    setTimings(t => ({ ...t, [key]: val }));
    setOpenDropdown(null);
  };

  // Maps category → weights key and color
  const CAT_MAP = {
    "CASH":                { key: "cash",      color: "#6ee7b7" },
    "BOND (OBBLIGAZIONI)": { key: "bond",      color: "#fbbf24" },
    "EQUITY (AZIONI)":     { key: "equity_az", color: "#60a5fa" },
    "ENERGIA":             { key: "energia",   color: "#f59e0b" },
    "ORO":                 { key: "oro",       color: "#f97316" },
    "MATERIE PRIME":       { key: "materie",   color: "#f87171" },
  };

  const oroTarget      = +( weights.gold   * (6/18)  ).toFixed(1);
  const materieTarget  = +( weights.gold   * (12/18) ).toFixed(1);
  const equityAzTarget = +( weights.equity * (35/42) ).toFixed(1);
  const energiaTarget  = +( weights.equity * (7/42)  ).toFixed(1);
  const categoryTarget = { cash: weights.cash, bond: weights.bond, equity_az: equityAzTarget, energia: energiaTarget, oro: oroTarget, materie: materieTarget };

  const categoryGroups = useMemo(() => {
    const g = {};
    CURRENT_PORTFOLIO.forEach(e => { if (!g[e.category]) g[e.category] = []; g[e.category].push(e); });
    return g;
  }, []);

  // Dynamic allocation derived from weights (cash=cash, bond=bond, equity=equity, gold=gold → map to display categories)
  const oroPct      = assetPcts["DE000A1EK0G3Xtrackers Physical Gold EUR Hedged"] ?? 0;
  const matPct      = assetPcts["LU1829218749Amundi Commodities Ex-Agric"] ?? 0;
  const equityAzSum = CURRENT_PORTFOLIO.filter(e => e.category === "EQUITY (AZIONI)").reduce((s, e) => s + (assetPcts[e.isin + e.name] || 0), 0);
  const energiaSum  = CURRENT_PORTFOLIO.filter(e => e.category === "ENERGIA").reduce((s, e) => s + (assetPcts[e.isin + e.name] || 0), 0);
  const dynamicAllocation = [
    { name: "CASH",         pct: weights.cash,            color: "#6ee7b7" },
    { name: "BOND",         pct: weights.bond,            color: "#fbbf24" },
    { name: "EQUITY",       pct: +equityAzSum.toFixed(1), color: "#60a5fa" },
    { name: "ENERGIA",      pct: +energiaSum.toFixed(1),  color: "#f59e0b" },
    { name: "ORO",          pct: +oroPct.toFixed(1),      color: "#f97316" },
    { name: "MATERIE PRIME",pct: +matPct.toFixed(1),      color: "#f87171" },
  ];

  const EditableCard = ({ label, value, setValue, color, prefix = "€" }) => {
    const [local, setLocal] = useState(String(value));
    return (
      <Card>
        <div style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "6px" }}>{label}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
          <span style={{ color, fontSize: "20px", fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{prefix}</span>
          <input
            className="editable-val"
            style={{ color }}
            type="number"
            value={local}
            onChange={e => setLocal(e.target.value)}
            onBlur={() => { const n = parseFloat(local) || 0; setValue(n); setLocal(String(n)); }}
          />
        </div>
        <div style={{ fontSize: "10px", color: "#475569", marginTop: "4px" }}>✏ clicca per modificare</div>
      </Card>
    );
  };

  return (
    <div>
      {/* Overview cards — editable */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        {/* Totale investimenti: read-only, computed */}
        <Card>
          <div style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "'DM Mono', monospace", marginBottom: "6px" }}>Totale investimenti</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#60a5fa", fontFamily: "'DM Mono', monospace" }}>
            €{totaleInvestimenti.toLocaleString("it-IT")}
          </div>
          <div style={{ fontSize: "10px", color: "#475569", marginTop: "4px" }}>= Italia + Danimarca + Da investire</div>
        </Card>
        <EditableCard label="Da investire" value={daInvestire} setValue={setDaInvestire} color="#34d399" />
        <EditableCard label="Già investiti in Italia" value={invItalia} setValue={setInvItalia} color="#fbbf24" />
        <EditableCard label="Già investiti in Danimarca" value={invDanimarca} setValue={setInvDanimarca} color="#f87171" />
      </div>

      {/* Allocation pie + legend */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <Card>
          <SectionTitle>Allocazione Target (dal portafoglio simulato)</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={dynamicAllocation.filter(a => a.pct > 0)} dataKey="pct" nameKey="name" cx="50%" cy="50%" outerRadius={80} strokeWidth={1} stroke="#0f172a">
                {dynamicAllocation.filter(a => a.pct > 0).map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#e2e8f0" }} />
              <Legend formatter={(v) => <span style={{ color: "#cbd5e1", fontSize: "12px" }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <SectionTitle>Dettaglio Allocazione</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {dynamicAllocation.map(a => (
              <div key={a.name} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: a.color, flexShrink: 0 }} />
                <span style={{ flex: 1, color: "#cbd5e1", fontSize: "13px" }}>{a.name}</span>
                <span style={{ color: a.color, fontWeight: 700, fontFamily: "'DM Mono', monospace", fontSize: "13px" }}>{a.pct}%</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "12px", padding: "8px 10px", background: "rgba(96,165,250,0.07)", borderRadius: "8px", fontSize: "11px", color: "#60a5fa" }}>
            ℹ Allocazione riflette i pesi impostati in "Simulazioni"
          </div>
        </Card>
      </div>

      {/* ── Per-asset allocation detail panel ── */}
      <Card style={{ marginBottom: "24px" }}>
        <SectionTitle>Distribuzione % per asset — modifica i pesi dentro ogni categoria</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
          {Object.entries(categoryGroups).map(([cat, assets]) => {
            const catInfo = CAT_MAP[cat] || { color: "#94a3b8", key: "equity" };
            const currentSum = assets.reduce((s, e) => s + (assetPcts[e.isin + e.name] || 0), 0);
            const target = categoryTarget[catInfo.key] || 0;
            const ok = Math.abs(currentSum - target) < 0.5;
            return (
              <div key={cat} style={{ border: `1px solid ${catInfo.color}33`, borderRadius: "10px", padding: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ color: catInfo.color, fontWeight: 700, fontSize: "11px", fontFamily: "'DM Mono', monospace" }}>{cat}</span>
                  <span style={{
                    fontSize: "10px", fontFamily: "'DM Mono', monospace", fontWeight: 700,
                    color: ok ? "#22c55e" : "#f87171",
                    background: ok ? "rgba(34,197,94,0.1)" : "rgba(248,113,113,0.1)",
                    padding: "2px 7px", borderRadius: "6px",
                  }}>
                    {currentSum.toFixed(1)}% / {target}%
                  </span>
                </div>
                {assets.map(e => {
                  const key = e.isin + e.name;
                  const val = assetPcts[key] ?? e.pct;
                  return (
                    <div key={key} style={{ marginBottom: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                        <span style={{ color: "#64748b", fontSize: "10px", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "8px" }}>{e.name}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "3px", flexShrink: 0 }}>
                          <input
                            type="number" min={0} max={100} step={0.5}
                            value={val}
                            onChange={ev => setAssetPcts(p => ({ ...p, [key]: parseFloat(ev.target.value) || 0 }))}
                            style={{
                              background: "transparent", border: "none",
                              borderBottom: `1px dashed ${catInfo.color}66`,
                              color: catInfo.color, fontFamily: "'DM Mono', monospace",
                              fontSize: "12px", fontWeight: 700, width: "38px",
                              textAlign: "right", outline: "none", padding: "0 2px",
                            }}
                          />
                          <span style={{ color: catInfo.color, fontSize: "11px" }}>%</span>
                        </div>
                      </div>
                      <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px" }}>
                        <div style={{ height: "100%", width: `${Math.min(val / Math.max(target, 1) * 100, 100)}%`, background: catInfo.color, borderRadius: "2px", transition: "width 0.2s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Filter */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
        {categories.map(c => (
          <button key={c} onClick={() => setFilterCat(c)} style={{
            padding: "5px 14px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.1)",
            background: filterCat === c ? "#3b82f6" : "transparent", color: filterCat === c ? "#fff" : "#94a3b8",
            cursor: "pointer", fontSize: "12px", fontFamily: "'DM Mono', monospace", transition: "all 0.15s"
          }}>{c}</button>
        ))}
      </div>

      {/* Asset table */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }} onClick={e => { if (!e.target.closest('button')) setOpenDropdown(null); }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", fontFamily: "'DM Mono', monospace" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.05)" }}>
                {["Categoria", "Nome ETF / Asset", "ISIN", "%", "Timing", "Da investire (€)", "Già investiti (€)", "Rimanenti (€)", "Rischio", "Note"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: "#64748b", fontWeight: 600, letterSpacing: "0.05em", whiteSpace: "nowrap", fontSize: "10px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => {
                // ── BOND+CASH summary row ──
                if (e.__summary === "BOND+CASH") {
                  const cashPct = CURRENT_PORTFOLIO.filter(x => x.category === "CASH").reduce((s, x) => s + x.pct, 0);
                  const bondPct = CURRENT_PORTFOLIO.filter(x => x.category === "BOND (OBBLIGAZIONI)").reduce((s, x) => s + x.pct, 0);
                  const totalPct = cashPct + bondPct;
                  const daInv = Math.round(totaleInvestimenti * totalPct / 100);
                  const keys = CURRENT_PORTFOLIO
                    .filter(x => x.category === "CASH" || x.category === "BOND (OBBLIGAZIONI)")
                    .map(x => x.isin + x.name);
                  const giaInv = keys.reduce((s, k) => s + (parseFloat(alreadyIns[k]) || 0), 0);
                  const rimanenti = daInv - giaInv;
                  const remColor = rimanenti < 0 ? "#f87171" : rimanenti === 0 ? "#94a3b8" : "#a3e635";
                  return (
                    <tr key="bondcash-summary" style={{ borderTop: "2px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.06)" }}>
                      <td style={{ padding: "9px 12px" }}><span style={{ fontSize: "10px", color: "#fbbf24", fontWeight: 700 }}>TOTALE</span></td>
                      <td style={{ padding: "9px 12px", color: "#fbbf24", fontWeight: 700 }}>BOND + CASH</td>
                      <td style={{ padding: "9px 12px", color: "#64748b" }}>—</td>
                      <td style={{ padding: "9px 12px", color: "#fbbf24", fontWeight: 700 }}>{totalPct}%</td>
                      <td style={{ padding: "9px 12px", color: "#64748b" }}>—</td>
                      <td style={{ padding: "9px 12px", color: "#34d399", fontWeight: 700 }}>€{daInv.toLocaleString("it-IT")}</td>
                      <td style={{ padding: "9px 12px", color: "#60a5fa", fontWeight: 700 }}>€{giaInv.toLocaleString("it-IT")}</td>
                      <td style={{ padding: "9px 12px" }}>
                        <span style={{ color: remColor, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
                          {rimanenti >= 0 ? "" : "–"}€{Math.abs(rimanenti).toLocaleString("it-IT")}
                        </span>
                      </td>
                      <td style={{ padding: "9px 12px", color: "#64748b" }}>—</td>
                      <td style={{ padding: "9px 12px", color: "#64748b" }}>—</td>
                    </tr>
                  );
                }

                // ── Normal asset row ──
                return (
                  <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.04)", transition: "background 0.1s" }}
                  onMouseEnter={el => el.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                  onMouseLeave={el => el.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "9px 12px" }}>
                    <span style={{ fontSize: "10px", color: "#64748b" }}>{e.category}</span>
                  </td>
                  <td style={{ padding: "9px 12px", color: "#e2e8f0", maxWidth: "220px" }}>{e.name}</td>
                  <td style={{ padding: "9px 12px", color: "#60a5fa", opacity: 0.8 }}>{e.isin}</td>
                  <td style={{ padding: "9px 12px", color: "#fbbf24", fontWeight: 700 }}>{assetPcts[e.isin + e.name] ?? e.pct}%</td>
                  <td style={{ padding: "9px 12px" }}>
                    {(() => {
                      const key = e.isin + e.name;
                      const current = timings[key] || e.timing;
                      const isOpen = openDropdown === key;
                      return (
                        <div style={{ position: "relative", display: "inline-block" }}>
                          <button
                            onClick={() => setOpenDropdown(isOpen ? null : key)}
                            style={{
                              background: (timingColor[current] || "#94a3b8") + "22",
                              color: timingColor[current] || "#94a3b8",
                              border: `1px solid ${(timingColor[current] || "#94a3b8")}44`,
                              borderRadius: "6px", padding: "2px 8px", fontSize: "11px",
                              fontFamily: "'DM Mono', monospace", fontWeight: 700,
                              cursor: "pointer", display: "flex", alignItems: "center", gap: "4px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {current} <span style={{ fontSize: "9px", opacity: 0.7 }}>▾</span>
                          </button>
                          {isOpen && (
                            <div style={{
                              position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 100,
                              background: "#1e293b", border: "1px solid #334155", borderRadius: "8px",
                              overflow: "hidden", minWidth: "90px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
                            }}>
                              {["NOW", "SOON", "LATER", "—"].map(opt => (
                                <button key={opt} onClick={() => setTiming(key, opt)} style={{
                                  display: "block", width: "100%", padding: "7px 12px",
                                  background: current === opt ? "rgba(255,255,255,0.06)" : "transparent",
                                  border: "none", color: timingColor[opt] || "#94a3b8",
                                  fontFamily: "'DM Mono', monospace", fontSize: "12px", fontWeight: 700,
                                  cursor: "pointer", textAlign: "left",
                                }}
                                  onMouseEnter={el => el.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                                  onMouseLeave={el => el.currentTarget.style.background = current === opt ? "rgba(255,255,255,0.06)" : "transparent"}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{ padding: "9px 12px", color: "#34d399" }}>
                    {(assetPcts[e.isin + e.name] ?? e.pct) > 0 ? `€${Math.round(totaleInvestimenti * (assetPcts[e.isin + e.name] ?? e.pct) / 100).toLocaleString("it-IT")}` : "—"}
                  </td>
                  <td style={{ padding: "6px 12px", color: "#60a5fa" }}>
                    {(() => {
                      const key = e.isin + e.name;
                      return (
                        <input
                          type="number"
                          value={alreadyIns[key] === "" ? "" : alreadyIns[key]}
                          onChange={ev => setAlreadyIns(a => ({ ...a, [key]: ev.target.value }))}
                          onBlur={ev => {
                            const n = ev.target.value === "" ? "" : parseFloat(ev.target.value) || 0;
                            setAlreadyIns(a => ({ ...a, [key]: n }));
                          }}
                          placeholder="—"
                          style={{
                            background: "transparent",
                            border: "none",
                            borderBottom: "1px dashed rgba(96,165,250,0.3)",
                            color: "#60a5fa",
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "12px",
                            width: "90px",
                            outline: "none",
                            padding: "2px 0",
                          }}
                          onFocus={el => el.target.style.borderBottomColor = "rgba(96,165,250,0.8)"}
                        />
                      );
                    })()}
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    {(() => {
                      const key = e.isin + e.name;
                      const pct = assetPcts[key] ?? e.pct;
                      if (pct === 0) return <span style={{ color: "#475569" }}>—</span>;
                      const daInv = Math.round(totaleInvestimenti * pct / 100);
                      const giaInv = parseFloat(alreadyIns[key]) || 0;
                      const rimanenti = daInv - giaInv;
                      const color = rimanenti < 0 ? "#f87171" : rimanenti === 0 ? "#94a3b8" : "#a3e635";
                      return (
                        <span style={{ color, fontFamily: "'DM Mono', monospace", fontWeight: rimanenti < 0 ? 700 : 400 }}>
                          {rimanenti >= 0 ? "" : "–"}€{Math.abs(rimanenti).toLocaleString("it-IT")}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ padding: "9px 12px" }}>{e.risk ? <Pill value={`${e.risk}/7`} color={riskColor(e.risk)} /> : "—"}</td>
                  <td style={{ padding: "6px 12px" }}>
                    <input
                      type="text"
                      value={notes[e.isin + e.name]}
                      onChange={ev => setNotes(n => ({ ...n, [e.isin + e.name]: ev.target.value }))}
                      placeholder="aggiungi nota..."
                      style={{
                        background: "transparent",
                        border: "none",
                        borderBottom: "1px dashed rgba(148,163,184,0.25)",
                        color: "#94a3b8",
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "11px",
                        width: "160px",
                        outline: "none",
                        padding: "2px 0",
                      }}
                      onFocus={el => el.target.style.borderBottomColor = "rgba(148,163,184,0.7)"}
                      onBlur={el => el.target.style.borderBottomColor = "rgba(148,163,184,0.25)"}
                    />
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── TAB 2: SIMULAZIONI ──────────────────────────────────────────────────────

function SimulazioniTab({ weights, setWeights, setAssetPcts }) {
  const [activeAssets, setActiveAssets] = useState({ cash: true, bond: true, equity: true, gold: true });

  const totalWeight = weights.cash + weights.bond + weights.equity + weights.gold;
  const valid = Math.abs(totalWeight - 100) < 0.5;

  const portReturn = (weights.cash * MEAN_RETURNS.cash + weights.bond * MEAN_RETURNS.bond + weights.equity * MEAN_RETURNS.equity + weights.gold * MEAN_RETURNS.gold) / 100;

  // Full covariance matrix: σ²_p = Σ_i Σ_j w_i * w_j * Cov(i,j)
  const wVec = [weights.cash / 100, weights.bond / 100, weights.equity / 100, weights.gold / 100];
  const portVariance = calcPortfolioVariance(wVec);
  const portStd = Math.sqrt(portVariance);

  // cumulative returns
  const cumData = useMemo(() => {
    let cumCash = 1, cumBond = 1, cumEq = 1, cumGold = 1, cumPtf = 1;
    return HISTORICAL_RETURNS.map(d => {
      cumCash *= (1 + d.cash);
      cumBond *= (1 + d.bond);
      cumEq *= (1 + d.equity);
      cumGold *= (1 + d.gold);
      const ptfR = (weights.cash * d.cash + weights.bond * d.bond + weights.equity * d.equity + weights.gold * d.gold) / 100;
      cumPtf *= (1 + ptfR);
      return {
        year: d.year,
        Cash: +((cumCash - 1) * 100).toFixed(1),
        Bond: +((cumBond - 1) * 100).toFixed(1),
        Equity: +((cumEq - 1) * 100).toFixed(1),
        Gold: +((cumGold - 1) * 100).toFixed(1),
        Portafoglio: +((cumPtf - 1) * 100).toFixed(1),
      };
    });
  }, [weights.cash, weights.bond, weights.equity, weights.gold]);

  const annualData = HISTORICAL_RETURNS.map(d => ({
    year: d.year,
    Cash: +(d.cash * 100).toFixed(2),
    Bond: +(d.bond * 100).toFixed(2),
    Equity: +(d.equity * 100).toFixed(2),
    Gold: +(d.gold * 100).toFixed(2),
    Portafoglio: +((weights.cash * d.cash + weights.bond * d.bond + weights.equity * d.equity + weights.gold * d.gold) / 100 * 100).toFixed(2),
  }));

  const assetColors = { Cash: "#6ee7b7", Bond: "#fbbf24", Equity: "#60a5fa", Gold: "#f97316", Portafoglio: "#e879f9" };

  const presets = [
    { label: "PTF 1 (Conservativo)", cash: 16, bond: 24, equity: 42, gold: 18 },
    { label: "PTF 2 (Crescita)", cash: 10, bond: 10, equity: 62, gold: 18 },
    { label: "Bilanciato", cash: 10, bond: 30, equity: 40, gold: 20 },
    { label: "Equity Heavy", cash: 5, bond: 5, equity: 75, gold: 15 },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: "16px", marginBottom: "20px" }}>
        {/* Sliders */}
        <Card>
          <SectionTitle>Costruisci il tuo portafoglio</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
            {presets.map(p => (
              <button key={p.label} onClick={() => {
                const newW = { cash: p.cash, bond: p.bond, equity: p.equity, gold: p.gold };
                setWeights(newW);
                setAssetPcts(scaleAssetPcts(PTF1_ASSET_PCTS, newW));
              }}
                style={{ padding: "4px 10px", borderRadius: "12px", border: "1px solid rgba(96,165,250,0.4)", background: "transparent", color: "#60a5fa", fontSize: "11px", cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>
                {p.label}
              </button>
            ))}
          </div>
          {[
            { key: "cash", label: "EUR Cash", color: "#6ee7b7", rend: MEAN_RETURNS.cash, std: STD_DEVS.cash },
            { key: "bond", label: "Bond EUR MTS", color: "#fbbf24", rend: MEAN_RETURNS.bond, std: STD_DEVS.bond },
            { key: "equity", label: "MSCI World", color: "#60a5fa", rend: MEAN_RETURNS.equity, std: STD_DEVS.equity },
            { key: "gold", label: "Gold EUR", color: "#f97316", rend: MEAN_RETURNS.gold, std: STD_DEVS.gold },
          ].map(a => (
            <div key={a.key} style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ color: a.color, fontSize: "12px", fontFamily: "'DM Mono', monospace" }}>{a.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ color: "#94a3b8", fontSize: "10px" }}>μ={+(a.rend*100).toFixed(1)}% σ={+(a.std*100).toFixed(1)}%</span>
                  <span style={{ color: "#e2e8f0", fontWeight: 700, fontFamily: "'DM Mono', monospace", minWidth: "35px", textAlign: "right" }}>{weights[a.key]}%</span>
                </div>
              </div>
              <input type="range" min={0} max={100} value={weights[a.key]}
                onChange={e => {
                  const newW = { ...weights, [a.key]: +e.target.value };
                  setWeights(newW);
                  setAssetPcts(prev => scaleAssetPcts(prev, newW));
                }}
                style={{ width: "100%", accentColor: a.color }} />
            </div>
          ))}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px", marginTop: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ color: "#64748b", fontSize: "12px" }}>Totale pesi</span>
              <span style={{ color: valid ? "#22c55e" : "#f87171", fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{totalWeight}%</span>
            </div>
            {!valid && <div style={{ color: "#fbbf24", fontSize: "11px" }}>⚠ I pesi devono sommare a 100%</div>}
          </div>
          {/* Stats box */}
          <div style={{ background: "rgba(232,121,249,0.08)", border: "1px solid rgba(232,121,249,0.2)", borderRadius: "8px", padding: "12px", marginTop: "14px" }}>
            <div style={{ color: "#e879f9", fontSize: "11px", fontFamily: "'DM Mono', monospace", marginBottom: "8px" }}>PORTAFOGLIO SIMULATO</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div>
                <div style={{ color: "#64748b", fontSize: "10px" }}>Rendimento atteso</div>
                <div style={{ color: "#e879f9", fontSize: "20px", fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{(portReturn * 100).toFixed(2)}%</div>
              </div>
              <div>
                <div style={{ color: "#64748b", fontSize: "10px" }}>Volatilità (σ)</div>
                <div style={{ color: "#fb923c", fontSize: "20px", fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{(portStd * 100).toFixed(2)}%</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Charts */}
        <div>
          <Card style={{ marginBottom: "14px" }}>
            <SectionTitle>Rendimento cumulato (base 100, 2000–2025)</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={cumData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 10 }} interval={4} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#e2e8f0", fontSize: "12px" }} formatter={v => `${v}%`} />
                <Legend formatter={v => <span style={{ color: "#cbd5e1", fontSize: "11px" }}>{v}</span>} />
                {Object.entries(assetColors).filter(([k]) => k === "Portafoglio" || activeAssets[k.toLowerCase()]).map(([k, c]) => (
                  <Line key={k} type="monotone" dataKey={k} stroke={c} dot={false} strokeWidth={k === "Portafoglio" ? 2.5 : 1.5} strokeDasharray={k === "Portafoglio" ? "0" : "0"} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <SectionTitle>Rendimenti annuali (%)</SectionTitle>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={annualData.slice(-15)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 9 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 9 }} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#e2e8f0", fontSize: "11px" }} formatter={v => `${v}%`} />
                <Bar dataKey="Portafoglio" fill="#e879f9" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Equity" fill="#60a5fa44" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>

      {/* Covariance / Correlation Matrix */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        {/* Variance-Covariance */}
        <Card>
          <SectionTitle>Matrice Varianza-Covarianza</SectionTitle>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", fontFamily: "'DM Mono', monospace" }}>
            <thead>
              <tr>
                <th style={{ padding: "6px 8px", color: "#475569", textAlign: "left", fontSize: "10px" }}></th>
                {ASSET_LABELS.map(l => <th key={l} style={{ padding: "6px 8px", color: "#64748b", fontWeight: 600, fontSize: "10px", textAlign: "right" }}>{l}</th>)}
              </tr>
            </thead>
            <tbody>
              {COV_MATRIX.map((row, i) => (
                <tr key={i}>
                  <td style={{ padding: "6px 8px", color: "#64748b", fontWeight: 600, fontSize: "10px", whiteSpace: "nowrap" }}>{ASSET_LABELS[i]}</td>
                  {row.map((val, j) => {
                    const isdiag = i === j;
                    const intensity = Math.min(Math.abs(val) / 0.03, 1);
                    const bg = isdiag
                      ? `rgba(96,165,250,${0.12 + intensity * 0.25})`
                      : val > 0
                        ? `rgba(74,222,128,${intensity * 0.3})`
                        : `rgba(248,113,113,${intensity * 0.3})`;
                    return (
                      <td key={j} style={{
                        padding: "7px 10px", textAlign: "right",
                        background: bg,
                        color: isdiag ? "#93c5fd" : val > 0 ? "#86efac" : "#fca5a5",
                        fontWeight: isdiag ? 700 : 400,
                        borderRadius: "4px",
                      }}>
                        {val.toFixed(6)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: "10px", display: "flex", gap: "14px", fontSize: "10px", color: "#475569" }}>
            <span>🔵 Varianza (diag.)</span>
            <span style={{ color: "#86efac" }}>▲ Covarianza positiva</span>
            <span style={{ color: "#fca5a5" }}>▼ Covarianza negativa</span>
          </div>
        </Card>

        {/* Correlation */}
        <Card>
          <SectionTitle>Matrice di Correlazione</SectionTitle>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", fontFamily: "'DM Mono', monospace" }}>
            <thead>
              <tr>
                <th style={{ padding: "6px 8px", color: "#475569", textAlign: "left", fontSize: "10px" }}></th>
                {ASSET_LABELS.map(l => <th key={l} style={{ padding: "6px 8px", color: "#64748b", fontWeight: 600, fontSize: "10px", textAlign: "right" }}>{l}</th>)}
              </tr>
            </thead>
            <tbody>
              {CORR_MATRIX.map((row, i) => (
                <tr key={i}>
                  <td style={{ padding: "6px 8px", color: "#64748b", fontWeight: 600, fontSize: "10px", whiteSpace: "nowrap" }}>{ASSET_LABELS[i]}</td>
                  {row.map((val, j) => {
                    const isdiag = i === j;
                    const absVal = Math.abs(val);
                    const bg = isdiag
                      ? "rgba(96,165,250,0.18)"
                      : val > 0
                        ? `rgba(74,222,128,${absVal * 0.45})`
                        : `rgba(248,113,113,${absVal * 0.45})`;
                    const textColor = isdiag ? "#93c5fd" : val > 0 ? "#4ade80" : "#f87171";
                    return (
                      <td key={j} style={{
                        padding: "7px 10px", textAlign: "right",
                        background: bg,
                        color: textColor,
                        fontWeight: isdiag ? 700 : Math.abs(val) > 0.3 ? 600 : 400,
                        borderRadius: "4px",
                      }}>
                        {val.toFixed(3)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: "10px", fontSize: "10px", color: "#475569", lineHeight: 1.5 }}>
            Equity–Cash: <span style={{ color: "#f87171" }}>forte negativa ({CORR_MATRIX[2][0].toFixed(3)})</span> · Gold–Equity: <span style={{ color: "#86efac" }}>quasi nulla ({CORR_MATRIX[2][3].toFixed(3)})</span> → buona diversificazione
          </div>
        </Card>
      </div>

      {/* Historical table */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px 8px", }}>
          <SectionTitle>Storico rendimenti annuali (2000–2025)</SectionTitle>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", fontFamily: "'DM Mono', monospace" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.05)" }}>
                {["Anno", "EUR Cash", "Bond (EUR MTS)", "MSCI World", "Gold (EUR)", "Ptf Simulato"].map((h, i) => (
                  <th key={h} style={{ padding: "9px 14px", textAlign: "right", color: "#64748b", fontSize: "10px", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {annualData.map((d, i) => (
                <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "7px 14px", color: "#94a3b8", textAlign: "right" }}>{d.year}</td>
                  {[d.Cash, d.Bond, d.Equity, d.Gold, d.Portafoglio].map((v, j) => (
                    <td key={j} style={{ padding: "7px 14px", textAlign: "right", color: v >= 0 ? "#4ade80" : "#f87171", fontWeight: j === 4 ? 700 : 400 }}>
                      {v >= 0 ? "+" : ""}{v.toFixed(2)}%
                    </td>
                  ))}
                </tr>
              ))}
              <tr style={{ borderTop: "2px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "9px 14px", color: "#e2e8f0", fontWeight: 700, textAlign: "right" }}>Media</td>
                {[MEAN_RETURNS.cash, MEAN_RETURNS.bond, MEAN_RETURNS.equity, MEAN_RETURNS.gold, portReturn].map((v, j) => (
                  <td key={j} style={{ padding: "9px 14px", textAlign: "right", color: "#60a5fa", fontWeight: 700 }}>
                    {(v * 100).toFixed(2)}%
                  </td>
                ))}
              </tr>
              <tr style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                <td style={{ padding: "9px 14px", color: "#94a3b8", textAlign: "right", fontSize: "11px" }}>Std Dev</td>
                {[STD_DEVS.cash, STD_DEVS.bond, STD_DEVS.equity, STD_DEVS.gold, portStd].map((v, j) => (
                  <td key={j} style={{ padding: "9px 14px", textAlign: "right", color: "#f97316", fontSize: "11px" }}>
                    {(v * 100).toFixed(2)}%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── TAB 3: PAC ──────────────────────────────────────────────────────────────

function PACTab({ daInvestire, assetPcts, totaleInvestimenti, alreadyIns }) {
  const [daStipendio, setDaStipendio] = useState(1500);
  const [mesiDef, setMesi] = useState(20);
  const rendAtteso = 6;
  const [startDate] = useState({ month: 3, year: 2026 });

  const daContoDef = Math.round(daInvestire / mesiDef);
  const totMensile = daContoDef + daStipendio;

  // ogni 3 mesi: assetPct% * daStipendio * 3
  // ISIN → display name + color mapping for ogni3 assets
  const OGNI3_ASSETS = [
    { isin: "IE00B53L3W79", name: "iShares Core EURO STOXX 50 UCITS ETF EUR (Acc)", display: "iShares EURO STOXX 50", cat: "EU Equity",       color: "#1d4ed8" },
    { isin: "LU1900068328", name: "Amdi Msci Ac Asia Pcfc Ex Jpn",                  display: "Amdi Msci Asia Pcfc",   cat: "Asia Equity",     color: "#7c3aed" },
    { isin: "IE00B4L5Y983", name: "iShares Core MSCI World UCITS ETF USD (Acc)",    display: "iShares MSCI World",    cat: "World Equity",    color: "#0284c7" },
    { isin: "IE00B1FZS467", name: "iShares Global Infrastructure UCITS ETF USD (Dist)", display: "Global Infrastructure", cat: "Infrastrutture", color: "#059669" },
    { isin: "FR0010524777", name: "Amundi MSCI New Energy UCITS ETF (Dist)",         display: "Amundi New Energy",    cat: "Energia",         color: "#d97706" },
    { isin: "DE000A1EK0G3", name: "Xtrackers Physical Gold EUR Hedged",              display: "Xtrackers Gold EUR",   cat: "Gold",            color: "#ea580c" },
    { isin: "LU1829218749", name: "Amundi Commodities Ex-Agric",                     display: "Amundi Commodities",   cat: "Materie Prime",   color: "#be123c" },
  ];
  const totalInvestito = totMensile * mesiDef;
  const ritaExtra = 18000;

  // PAC simulation
  const UNA_TANTUM_TOTAL = 1313 + 2626; // DAX + VanEck

  const pacData = useMemo(() => {
    const r = rendAtteso / 100 / 12;
    let capital = 0;
    let totalInvestedAcc = 0;
    const rows = [];
    for (let m = 1; m <= mesiDef; m++) {
      const unaTantumThisMonth = m === 1 ? UNA_TANTUM_TOTAL : 0;
      capital = capital * (1 + r) + totMensile + unaTantumThisMonth;
      totalInvestedAcc += totMensile + unaTantumThisMonth;
      const month = ((startDate.month - 1 + m - 1) % 12) + 1;
      const year = startDate.year + Math.floor((startDate.month - 1 + m - 1) / 12);
      rows.push({
        mese: m,
        label: `${month.toString().padStart(2, "0")}/${year}`,
        investito: Math.round(totalInvestedAcc - UNA_TANTUM_TOTAL),
        unaTantum: UNA_TANTUM_TOTAL,
        capitale: Math.round(capital),
        guadagno: Math.round(capital - totalInvestedAcc),
        rendPct: +((capital / totalInvestedAcc - 1) * 100).toFixed(2),
      });
    }
    return rows;
  }, [totMensile, mesiDef, startDate]);

  const finalRow = pacData[pacData.length - 1] || {};

  // ogni2: Da investire (foglio 2) * mesi / 2
  // Da investire per asset = totaleInvestimenti * assetPct% / 100
  const OGNI2_ASSETS = [
    { isin: "IE00B53L3W79", name: "iShares Core EURO STOXX 50 UCITS ETF EUR (Acc)", display: "iShares EURO STOXX 50", cat: "EU Equity",       color: "#3b82f6" },
    { isin: "LU1900068328", name: "Amdi Msci Ac Asia Pcfc Ex Jpn",                  display: "Amdi Msci Asia Pcfc",   cat: "Asia Equity",     color: "#8b5cf6" },
    { isin: "IE00B4L5Y983", name: "iShares Core MSCI World UCITS ETF USD (Acc)",    display: "iShares MSCI World",    cat: "World Equity",    color: "#06b6d4" },
    { isin: "IE00B1FZS467", name: "iShares Global Infrastructure UCITS ETF USD (Dist)", display: "Global Infrastructure", cat: "Infrastrutture", color: "#10b981" },
    { isin: "FR0010524777", name: "Amundi MSCI New Energy UCITS ETF (Dist)",         display: "Amundi New Energy",    cat: "Energia",         color: "#f59e0b" },
    { isin: "DE000A1EK0G3", name: "Xtrackers Physical Gold EUR Hedged",              display: "Xtrackers Gold EUR",   cat: "Gold",            color: "#f97316" },
    { isin: "LU1829218749", name: "Amundi Commodities Ex-Agric",                     display: "Amundi Commodities",   cat: "Materie Prime",   color: "#ef4444" },
  ];

  const etfOgni2 = OGNI2_ASSETS.map(a => {
    const key = a.isin + a.name;
    const daInvest = (assetPcts[key] || 0) / 100 * totaleInvestimenti;
    const gia = parseFloat(alreadyIns?.[key]) || 0;
    const rimanenti = Math.max(0, daInvest - gia);
    return { name: a.display, cat: a.cat, importo: Math.round(rimanenti / (mesiDef / 2)), color: a.color };
  });

  const etfOgni3 = OGNI3_ASSETS.map(a => ({
    name: a.display,
    cat: a.cat,
    importo: Math.round((assetPcts[a.isin + a.name] || 0) / 100 * daStipendio * 3),
    color: a.color,
  }));

  const totOgni2 = etfOgni2.reduce((s, e) => s + e.importo, 0);
  const totOgni3 = etfOgni3.reduce((s, e) => s + e.importo, 0);

  return (
    <div>
      {/* Input section */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <Card>
          <SectionTitle>Da conto (€/mese)</SectionTitle>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#60a5fa", fontFamily: "'DM Mono', monospace", padding: "8px 0" }}>
            €{daContoDef.toLocaleString("it-IT")}
          </div>
          <div style={{ fontSize: "10px", color: "#475569", marginTop: "2px" }}>= "Da investire" (foglio 2) ÷ mesi</div>
        </Card>
        <Card>
          <SectionTitle>Da stipendio (€/mese)</SectionTitle>
          <input type="number" value={daStipendio} onChange={e => setDaStipendio(+e.target.value)} style={{ width: "100%", background: "transparent", border: "1px solid rgba(52,211,153,0.3)", borderRadius: "8px", color: "#34d399", fontSize: "24px", fontWeight: 700, fontFamily: "'DM Mono', monospace", padding: "8px 12px", outline: "none", boxSizing: "border-box" }} />
        </Card>
        <Card>
          <SectionTitle>Durata (mesi)</SectionTitle>
          <input type="number" value={mesiDef} onChange={e => setMesi(+e.target.value)} style={{ width: "100%", background: "transparent", border: "1px solid rgba(251,191,36,0.3)", borderRadius: "8px", color: "#fbbf24", fontSize: "24px", fontWeight: 700, fontFamily: "'DM Mono', monospace", padding: "8px 12px", outline: "none", boxSizing: "border-box" }} />
        </Card>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Versamento mensile", value: `€${totMensile.toLocaleString("it-IT")}`, color: "#60a5fa" },
          { label: "Totale versato", value: `€${totalInvestito.toLocaleString("it-IT")}`, color: "#34d399" },
          { label: "Capitale finale stimato", value: `€${(finalRow.capitale || 0).toLocaleString("it-IT")}`, color: "#e879f9" },
          { label: "Guadagno stimato", value: `€${(finalRow.guadagno || 0).toLocaleString("it-IT")}`, color: "#fbbf24" },
          { label: "Rendimento totale", value: `${finalRow.rendPct || 0}%`, color: "#f97316" },
        ].map(c => (
          <Card key={c.label}>
            <div style={{ fontSize: "10px", color: "#64748b", fontFamily: "'DM Mono', monospace", marginBottom: "5px" }}>{c.label}</div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: c.color, fontFamily: "'DM Mono', monospace" }}>{c.value}</div>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card style={{ marginBottom: "20px" }}>
        <SectionTitle>Crescita del capitale nel tempo</SectionTitle>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={pacData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 9 }} interval={Math.floor(mesiDef / 6)} />
            <YAxis tick={{ fill: "#64748b", fontSize: 9 }} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#e2e8f0", fontSize: "12px" }}
              formatter={(v, n) => [`€${v.toLocaleString("it-IT")}`, n]} />
            <Legend formatter={v => <span style={{ color: "#cbd5e1", fontSize: "11px" }}>{v}</span>} />
            <Bar dataKey="investito" name="Versato PAC" fill="#3b82f644" stackId="a" radius={[0, 0, 0, 0]} />
            <Bar dataKey="unaTantum" name="Una tantum" fill="#fbbf2466" stackId="a" radius={[0, 0, 0, 0]} />
            <Bar dataKey="guadagno" name="Guadagno" fill="#e879f9" stackId="a" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* ETF Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        <Card>
          <SectionTitle>Acquisti ogni 2 mesi (dal conto) — tot. €{totOgni2.toLocaleString("it-IT")}/2mesi</SectionTitle>
          {etfOgni2.map(e => (
            <div key={e.name} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: e.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: "#e2e8f0", fontSize: "12px" }}>{e.name}</div>
                <div style={{ color: "#64748b", fontSize: "10px" }}>{e.cat}</div>
              </div>
              <div style={{ color: e.color, fontWeight: 700, fontFamily: "'DM Mono', monospace", fontSize: "14px" }}>€{e.importo.toLocaleString("it-IT")}</div>
              <div style={{ width: `${(e.importo / totOgni2) * 80}px`, height: "4px", background: e.color, borderRadius: "2px", minWidth: "4px" }} />
            </div>
          ))}
        </Card>
        <Card>
          <SectionTitle>Acquisti ogni 3 mesi (da stipendio) — tot. €{totOgni3.toLocaleString("it-IT")}/3mesi</SectionTitle>
          {etfOgni3.map(e => (
            <div key={e.name + e.importo} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: e.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: "#e2e8f0", fontSize: "12px" }}>{e.name}</div>
                <div style={{ color: "#64748b", fontSize: "10px" }}>{e.cat}</div>
              </div>
              <div style={{ color: e.color, fontWeight: 700, fontFamily: "'DM Mono', monospace", fontSize: "14px" }}>€{e.importo.toLocaleString("it-IT")}</div>
              <div style={{ width: `${(e.importo / totOgni3) * 80}px`, height: "4px", background: e.color, borderRadius: "2px", minWidth: "4px" }} />
            </div>
          ))}
        </Card>
        <Card style={{ borderColor: "rgba(251,191,36,0.25)", background: "rgba(251,191,36,0.03)" }}>
          <SectionTitle>Acquisti una tantum — tot. €{(1313 + 2626).toLocaleString("it-IT")}</SectionTitle>
          {[
            { name: "iShares Core DAX® UCITS ETF", cat: "Equity Europa", importo: 1313, color: "#64748b" },
            { name: "VanEck Uranium & Nuclear Tech.", cat: "Energia Nucleare", importo: 2626, color: "#fbbf24" },
          ].map(e => (
            <div key={e.name} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: e.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: "#e2e8f0", fontSize: "12px" }}>{e.name}</div>
                <div style={{ color: "#64748b", fontSize: "10px" }}>{e.cat}</div>
              </div>
              <div style={{ color: e.color, fontWeight: 700, fontFamily: "'DM Mono', monospace", fontSize: "14px" }}>€{e.importo.toLocaleString("it-IT")}</div>
              <div style={{ width: `${(e.importo / 2626) * 80}px`, height: "4px", background: e.color, borderRadius: "2px", minWidth: "4px" }} />
            </div>
          ))}
          <div style={{ marginTop: "8px", fontSize: "10px", color: "#fbbf24", opacity: 0.7 }}>📅 Da eseguire a marzo 2026</div>
        </Card>
      </div>

      {/* Tabella mensile dettagliata */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px 8px" }}>
          <SectionTitle>Tabella dettagliata PAC — mese per mese</SectionTitle>
        </div>
        <div style={{ overflowX: "auto", maxHeight: "340px", overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", fontFamily: "'DM Mono', monospace" }}>
            <thead style={{ position: "sticky", top: 0, background: "#0f172a", zIndex: 1 }}>
              <tr style={{ background: "rgba(255,255,255,0.05)" }}>
                {["Mese", "Data", "Versamento (€)", "Totale Versato (€)", "Capitale Stimato (€)", "Guadagno (€)", "Rendimento (%)"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "right", color: "#64748b", fontWeight: 600, fontSize: "10px", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pacData.map((d, i) => (
                <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                  <td style={{ padding: "7px 14px", color: "#64748b", textAlign: "right" }}>{d.mese}</td>
                  <td style={{ padding: "7px 14px", color: "#94a3b8", textAlign: "right" }}>{d.label}</td>
                  <td style={{ padding: "7px 14px", color: "#60a5fa", textAlign: "right" }}>€{totMensile.toLocaleString("it-IT")}</td>
                  <td style={{ padding: "7px 14px", color: "#34d399", textAlign: "right" }}>€{d.investito.toLocaleString("it-IT")}</td>
                  <td style={{ padding: "7px 14px", color: "#e879f9", textAlign: "right", fontWeight: 700 }}>€{d.capitale.toLocaleString("it-IT")}</td>
                  <td style={{ padding: "7px 14px", color: d.guadagno >= 0 ? "#4ade80" : "#f87171", textAlign: "right" }}>€{d.guadagno.toLocaleString("it-IT")}</td>
                  <td style={{ padding: "7px 14px", color: "#f97316", textAlign: "right" }}>{d.rendPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Calendario acquisti */}
      {(() => {
        const MONTH_NAMES = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
        // Generate months from startDate for mesiDef months
        const months = [];
        for (let m = 0; m < mesiDef; m++) {
          const absMonth = (startDate.month - 1 + m) % 12; // 0-based
          const year = startDate.year + Math.floor((startDate.month - 1 + m) / 12);
          // ogni2: m=0,2,4,6,... (marzo, maggio, luglio...)
          // ogni3: m=1,4,7,10,... (aprile, luglio, ottobre...)
          const isOgni2 = m % 2 === 0;
          const isOgni3 = m % 3 === 1;
          let type;
          if (isOgni2 && isOgni3) type = "both";
          else if (isOgni2) type = "due";
          else if (isOgni3) type = "tre";
          else type = "none";
          months.push({ label: MONTH_NAMES[absMonth], year, type, idx: m });
        }

        const UNA_TANTUM = [
          { name: "iShares Core DAX® UCITS ETF", importo: 1313 },
          { name: "VanEck Uranium & Nuclear Technologies", importo: 2626 },
        ];
        const totUna = UNA_TANTUM.reduce((s, e) => s + e.importo, 0);

        const typeStyle = {
          both: { bg: "rgba(232,121,249,0.15)", border: "rgba(232,121,249,0.5)", color: "#e879f9", tag: "ENTRAMBI" },
          due:  { bg: "rgba(96,165,250,0.1)",   border: "rgba(96,165,250,0.4)",  color: "#60a5fa", tag: "ogni 2m" },
          tre:  { bg: "rgba(52,211,153,0.1)",   border: "rgba(52,211,153,0.4)",  color: "#34d399", tag: "ogni 3m" },
          none: { bg: "transparent",             border: "rgba(255,255,255,0.06)",color: "#334155", tag: "—" },
        };

        const tot2 = etfOgni2.reduce((s,e) => s+e.importo, 0);
        const tot3 = etfOgni3.reduce((s,e) => s+e.importo, 0);

        return (
          <Card style={{ marginTop: "16px", marginBottom: "16px" }}>
            <SectionTitle>Calendario acquisti</SectionTitle>
            {/* Legend */}
            <div style={{ display: "flex", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
              {[
                { label: `Ogni 2 mesi — €${tot2.toLocaleString("it-IT")}`, ...typeStyle.due },
                { label: `Ogni 3 mesi — €${tot3.toLocaleString("it-IT")}`, ...typeStyle.tre },
                { label: `Entrambi — €${(tot2+tot3).toLocaleString("it-IT")}`, ...typeStyle.both },
                { label: "Nessun acquisto", ...typeStyle.none },
              ].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: l.bg, border: `1px solid ${l.border}` }} />
                  <span style={{ color: l.color, fontSize: "11px", fontFamily: "'DM Mono', monospace" }}>{l.label}</span>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.5)" }} />
                <span style={{ color: "#fbbf24", fontSize: "11px", fontFamily: "'DM Mono', monospace" }}>+ Una tantum — €{totUna.toLocaleString("it-IT")}</span>
              </div>
            </div>
            {/* Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: "8px" }}>
              {months.map(({ label, year, type, idx }) => {
                const s = typeStyle[type];
                const isFirst = idx === 0;
                const baseAmount = type === "both" ? tot2+tot3 : type === "due" ? tot2 : type === "tre" ? tot3 : 0;
                const totalAmount = baseAmount + (isFirst ? totUna : 0);
                return (
                  <div key={idx} style={{
                    background: s.bg, border: `1px solid ${isFirst ? "rgba(251,191,36,0.6)" : s.border}`,
                    borderRadius: "8px", padding: "10px 8px", textAlign: "center",
                    opacity: type === "none" && !isFirst ? 0.4 : 1,
                    position: "relative",
                  }}>
                    {isFirst && (
                      <div style={{
                        position: "absolute", top: "-8px", right: "-4px",
                        background: "#fbbf24", color: "#0a0f1e", fontSize: "8px",
                        fontWeight: 700, fontFamily: "'DM Mono', monospace",
                        padding: "1px 5px", borderRadius: "6px",
                      }}>UNA TANTUM</div>
                    )}
                    <div style={{ color: isFirst ? "#fbbf24" : s.color, fontWeight: 700, fontFamily: "'DM Mono', monospace", fontSize: "14px" }}>{label}</div>
                    <div style={{ color: "#475569", fontSize: "10px", marginBottom: "6px" }}>{year}</div>
                    <div style={{
                      fontSize: "9px", fontFamily: "'DM Mono', monospace", fontWeight: 700,
                      color: s.color, background: s.bg,
                      border: `1px solid ${s.border}`, borderRadius: "4px", padding: "2px 4px",
                    }}>{s.tag}</div>
                    {(type !== "none" || isFirst) && (
                      <div style={{ color: isFirst ? "#fbbf24" : "#64748b", fontSize: "9px", marginTop: "5px", fontWeight: isFirst ? 700 : 400 }}>
                        €{totalAmount.toLocaleString("it-IT")}
                      </div>
                    )}
                    {isFirst && (
                      <div style={{ color: "#94a3b8", fontSize: "8px", marginTop: "3px", lineHeight: 1.3 }}>
                        DAX €1,313<br/>VanEck €2,626
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })()}

      {/* RITA info */}
      <Card style={{ marginTop: "16px", borderColor: "rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.05)" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <div style={{ fontSize: "24px" }}>🏦</div>
          <div>
            <div style={{ color: "#fbbf24", fontWeight: 700, fontFamily: "'DM Mono', monospace", marginBottom: "4px" }}>RITA da investire: €18,000</div>
            <div style={{ color: "#94a3b8", fontSize: "13px" }}>Importo aggiuntivo proveniente dal piano RITA da allocare separatamente nel portafoglio.</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState(0);
  const [weights, setWeights] = useState({ cash: 16, bond: 24, equity: 42, gold: 18 });
  const [invItalia, setInvItalia] = useState(60000);
  const [invDanimarca, setInvDanimarca] = useState(11000);
  const [daInvestire, setDaInvestire] = useState(60000);
  const totaleInvestimenti = invItalia + invDanimarca + daInvestire;

  // Per-asset % within each category — editable, must sum to category weight
  const [assetPcts, setAssetPcts] = useState(() => ({ ...PTF1_ASSET_PCTS }));
  const [alreadyIns, setAlreadyIns] = useState(() =>
    Object.fromEntries(CURRENT_PORTFOLIO.map(e => [e.isin + e.name, e.alreadyIn ?? ""]))
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0f1e",
      backgroundImage: "radial-gradient(ellipse at 20% 10%, rgba(59,130,246,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.06) 0%, transparent 50%)",
      fontFamily: "'DM Mono', 'Courier New', monospace",
      color: "#e2e8f0",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;700&display=swap');
      input[type=range] { height: 4px; border-radius: 2px; }
      ::-webkit-scrollbar { width: 5px; height: 5px; } ::-webkit-scrollbar-track { background: #0f172a; } ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
      tr:hover { background: rgba(255,255,255,0.025) !important; }
      .editable-val { background: transparent; border: none; border-bottom: 1px dashed rgba(255,255,255,0.2); color: inherit; font: inherit; font-size: 20px; font-weight: 700; width: 100%; outline: none; padding: 0; }
      .editable-val:focus { border-bottom-color: rgba(96,165,250,0.6); }`}
      </style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 28px" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "58px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>📊</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "#f1f5f9", letterSpacing: "0.02em" }}>Portfolio Francy</div>
              <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "0.1em" }}>PIANO DI INVESTIMENTO</div>
            </div>
          </div>
          <div style={{ fontSize: "11px", color: "#475569" }}>Mar 2026 → Ott 2027</div>
        </div>
        {/* Tabs — Simulazioni first */}
        <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", gap: "0", paddingTop: "4px" }}>
          {["01 · Simulazioni", "02 · Portafoglio Attuale", "03 · Piano di Accumulo"].map((label, i) => (
            <Tab key={i} label={label} active={tab === i} onClick={() => setTab(i)} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px 28px" }}>
        {tab === 0 && <SimulazioniTab weights={weights} setWeights={setWeights} setAssetPcts={setAssetPcts} />}
        {tab === 1 && (
          <CurrentTab
            weights={weights}
            assetPcts={assetPcts} setAssetPcts={setAssetPcts}
            invItalia={invItalia} setInvItalia={setInvItalia}
            invDanimarca={invDanimarca} setInvDanimarca={setInvDanimarca}
            daInvestire={daInvestire} setDaInvestire={setDaInvestire}
            totaleInvestimenti={totaleInvestimenti}
            alreadyIns={alreadyIns} setAlreadyIns={setAlreadyIns}
          />
        )}
        {tab === 2 && <PACTab daInvestire={daInvestire} assetPcts={assetPcts} totaleInvestimenti={totaleInvestimenti} alreadyIns={alreadyIns} />}
      </div>
    </div>
  );
}
