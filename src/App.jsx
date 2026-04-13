// import { useState, useCallback, useRef, useEffect, useMemo } from "react";
// import {
//   AreaChart,
//   Area,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
//   Legend,
//   LineChart,
//   Line,
//   BarChart,
//   Bar,
//   ComposedChart,
// } from "recharts";

// // ============================================================
// // SIMULATION ENGINE (JS port)
// // ============================================================

// function runSimulation(params) {
//   const {
//     initial_population,
//     num_cycles,
//     r1_capacity,
//     r2_beds,
//     r3_beds,
//     r4_evacuation_rate,
//     casualty_rate_schedule,
//     kia_rate,
//     rtd_lt72_rate,
//     preventable_kia_fraction,
//     preventable_kia_saved_rate,
//     dnbi_rate,
//     dnbi_rtd_lt72_fraction,
//     dnbi_minor_care_fraction,
//     dnbi_needs_r3_fraction,
//     dnbi_evacuated_fraction,
//     dnbi_dow_fraction,
//     dow_rate_r1,
//     rtd_rate_r1,
//     dow_rate_r2,
//     rtd_rate_r2,
//     dow_rate_r3,
//     rtd_rate_r3,
//     avg_los_r3_cycles,
//     r3_discharge_rtd_fraction,
//     dow_multiplier_over_capacity,
//     rtd_reduction_over_capacity,
//     r2_distance_km,
//     long_stay_mortality_rate,
//   } = params;

//   const surgicalOutcomeMod = () =>
//     0.5 + (0.5 * Math.min(Math.max(r2_distance_km, 1), 10)) / 10;

//   const r2AttritionRate = () =>
//     0.25 * Math.exp(-0.35 * (Math.max(r2_distance_km, 1) - 1));

//   // R3 bed tracker
//   let r3_occupied_list = []; // [{patients, cyclesLeft}]
//   const r3TotalOccupied = () =>
//     r3_occupied_list.reduce((s, e) => s + e.patients, 0);
//   const r3Admit = (n, los) => {
//     if (n > 0 && los > 0)
//       r3_occupied_list.push({ patients: n, cyclesLeft: los });
//   };
//   const r3Tick = () => {
//     let discharged = 0;
//     r3_occupied_list = r3_occupied_list.filter((e) => {
//       if (e.cyclesLeft <= 1) {
//         discharged += e.patients;
//         return false;
//       }
//       e.cyclesLeft--;
//       return true;
//     });
//     return discharged;
//   };

//   let active_pop = initial_population;
//   let evac_pool = 0;
//   let cum_kia = 0,
//     cum_dow = 0,
//     cum_rtd = 0,
//     cum_evac = 0;
//   let current_r2_cap = r2_beds;
//   const results = [];

//   for (let c = 0; c < num_cycles; c++) {
//     const pop_start = active_pop;
//     const cas_rate =
//       casualty_rate_schedule[c] ??
//       casualty_rate_schedule[casualty_rate_schedule.length - 1];

//     // A. Combat casualties
//     const total_cas = Math.round(active_pop * cas_rate);
//     const raw_kia = Math.round(total_cas * kia_rate);
//     const rtd_lt72_b = Math.round(total_cas * rtd_lt72_rate);
//     const preventable = Math.round(raw_kia * preventable_kia_fraction);
//     const saved = Math.round(preventable * preventable_kia_saved_rate);
//     const kia_imm = raw_kia - saved;
//     const wounded = Math.max(0, total_cas - raw_kia - rtd_lt72_b + saved);

//     // B. DNBI
//     const total_dnbi = Math.round(active_pop * dnbi_rate);
//     const dnbi_rtd = Math.round(total_dnbi * dnbi_rtd_lt72_fraction);
//     const dnbi_minor = Math.round(total_dnbi * dnbi_minor_care_fraction);
//     const dnbi_r3 = Math.round(total_dnbi * dnbi_needs_r3_fraction);
//     const dnbi_evac = Math.round(total_dnbi * dnbi_evacuated_fraction);
//     const dnbi_dead = Math.round(total_dnbi * dnbi_dow_fraction);

//     // C. R1
//     const r1_over = wounded > r1_capacity;
//     let d_r1 = dow_rate_r1,
//       rt_r1 = rtd_rate_r1;
//     if (r1_over) {
//       d_r1 = Math.min(d_r1 * dow_multiplier_over_capacity, 0.95);
//       rt_r1 *= rtd_reduction_over_capacity;
//     }
//     const dow_r1_n = Math.round(wounded * d_r1);
//     const rtd_r1_n = Math.round(wounded * rt_r1);
//     const fwd_r2 = Math.max(0, wounded - dow_r1_n - rtd_r1_n);

//     // D. R2
//     let d_r2 = dow_rate_r2 * surgicalOutcomeMod(),
//       rt_r2 = rtd_rate_r2;
//     const r2_over = fwd_r2 > current_r2_cap;
//     if (r2_over) {
//       d_r2 = Math.min(d_r2 * dow_multiplier_over_capacity, 0.95);
//       rt_r2 *= rtd_reduction_over_capacity;
//     }
//     const dow_r2_n = Math.round(fwd_r2 * d_r2);
//     const rtd_r2_n = Math.round(fwd_r2 * rt_r2);
//     const fwd_r3 = Math.max(0, fwd_r2 - dow_r2_n - rtd_r2_n);

//     // R2 attrition
//     if (Math.random() < r2AttritionRate()) {
//       const lost = Math.max(1, Math.round(current_r2_cap * 0.1));
//       current_r2_cap = Math.max(0, current_r2_cap - lost);
//     }

//     // E. R3
//     const r3_in = fwd_r3 + dnbi_r3;
//     let d_r3 = dow_rate_r3,
//       rt_r3 = rtd_rate_r3;
//     const r3_over = r3TotalOccupied() + r3_in > r3_beds;
//     if (r3_over) {
//       d_r3 = Math.min(d_r3 * dow_multiplier_over_capacity, 0.95);
//       rt_r3 *= rtd_reduction_over_capacity;
//     }
//     const dow_r3_n = Math.round(r3_in * d_r3);
//     const rtd_r3_n = Math.round(r3_in * rt_r3);
//     const need_evac = Math.max(0, r3_in - dow_r3_n - rtd_r3_n);
//     r3Admit(need_evac, avg_los_r3_cycles);

//     // F. Tick beds
//     const discharged_r3 = r3Tick();
//     const disch_rtd = Math.round(discharged_r3 * r3_discharge_rtd_fraction);
//     const disch_evac = discharged_r3 - disch_rtd;

//     // G. Evacuation
//     evac_pool += disch_evac + dnbi_evac;
//     const long_deaths = Math.round(evac_pool * long_stay_mortality_rate);
//     evac_pool = Math.max(0, evac_pool - long_deaths);
//     const evacuated = Math.min(evac_pool, r4_evacuation_rate);
//     evac_pool -= evacuated;

//     // H. Tally
//     const total_kia_c = kia_imm;
//     const total_dow_c =
//       dow_r1_n + dow_r2_n + dow_r3_n + long_deaths + dnbi_dead;
//     const total_rtd_c =
//       rtd_lt72_b +
//       rtd_r1_n +
//       rtd_r2_n +
//       rtd_r3_n +
//       dnbi_rtd +
//       dnbi_minor +
//       disch_rtd;

//     active_pop = Math.max(0, active_pop - total_cas - total_dnbi + total_rtd_c);
//     cum_kia += total_kia_c;
//     cum_dow += total_dow_c;
//     cum_rtd += total_rtd_c;
//     cum_evac += evacuated;

//     results.push({
//       cycle: c,
//       day: (c + 1) * 3,
//       pop_start,
//       active_pop,
//       total_cas,
//       kia: total_kia_c,
//       dow: total_dow_c,
//       rtd: total_rtd_c,
//       evacuated,
//       evac_pool,
//       r3_occupied: r3TotalOccupied(),
//       r3_cap: r3_beds,
//       cum_kia,
//       cum_dow,
//       cum_dead: cum_kia + cum_dow,
//       cum_rtd,
//       cum_evac,
//       in_care: r3TotalOccupied() + evac_pool,
//       dnbi: total_dnbi,
//     });
//   }
//   return results;
// }

// // ============================================================
// // DRAGGABLE CURVE COMPONENT
// // ============================================================

// const CURVE_W = 580,
//   CURVE_H = 160,
//   PAD = { t: 20, r: 20, b: 30, l: 50 };
// const plotW = CURVE_W - PAD.l - PAD.r;
// const plotH = CURVE_H - PAD.t - PAD.b;

// function DraggableCurve({
//   values,
//   onChange,
//   label,
//   min,
//   max,
//   step,
//   color,
//   numCycles,
// }) {
//   const svgRef = useRef(null);
//   const dragIdx = useRef(null);

//   const pts = values.slice(0, numCycles);
//   const xScale = (i) => PAD.l + (i / (numCycles - 1)) * plotW;
//   const yScale = (v) => PAD.t + plotH - ((v - min) / (max - min)) * plotH;
//   const yInv = (py) => min + ((PAD.t + plotH - py) / plotH) * (max - min);

//   const handleMove = useCallback(
//     (e) => {
//       if (dragIdx.current === null) return;
//       const svg = svgRef.current;
//       const rect = svg.getBoundingClientRect();
//       const clientY = e.touches ? e.touches[0].clientY : e.clientY;
//       const py = clientY - rect.top;
//       let val = yInv(py);
//       val = Math.round(val / step) * step;
//       val = Math.max(min, Math.min(max, val));
//       const newVals = [...values];
//       newVals[dragIdx.current] = parseFloat(val.toFixed(4));
//       onChange(newVals);
//     },
//     [values, onChange, min, max, step]
//   );

//   const handleUp = useCallback(() => {
//     dragIdx.current = null;
//   }, []);

//   useEffect(() => {
//     window.addEventListener("mousemove", handleMove);
//     window.addEventListener("mouseup", handleUp);
//     window.addEventListener("touchmove", handleMove);
//     window.addEventListener("touchend", handleUp);
//     return () => {
//       window.removeEventListener("mousemove", handleMove);
//       window.removeEventListener("mouseup", handleUp);
//       window.removeEventListener("touchmove", handleMove);
//       window.removeEventListener("touchend", handleUp);
//     };
//   }, [handleMove, handleUp]);

//   const pathD = pts
//     .map((v, i) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScale(v)}`)
//     .join(" ");
//   const ticks = 5;

//   return (
//     <div style={{ marginBottom: 16 }}>
//       <div
//         style={{
//           fontSize: 11,
//           fontWeight: 600,
//           color: "#b0b8c4",
//           marginBottom: 4,
//           letterSpacing: 1,
//           textTransform: "uppercase",
//         }}
//       >
//         {label}
//       </div>
//       <svg
//         ref={svgRef}
//         width={CURVE_W}
//         height={CURVE_H}
//         style={{
//           background: "#0d1117",
//           borderRadius: 6,
//           border: "1px solid #1e2733",
//           display: "block",
//         }}
//       >
//         {Array.from({ length: ticks }).map((_, i) => {
//           const val = min + (i / (ticks - 1)) * (max - min);
//           const y = yScale(val);
//           return (
//             <g key={i}>
//               <line
//                 x1={PAD.l}
//                 x2={CURVE_W - PAD.r}
//                 y1={y}
//                 y2={y}
//                 stroke="#1e2733"
//                 strokeWidth={1}
//               />
//               <text
//                 x={PAD.l - 6}
//                 y={y + 3}
//                 textAnchor="end"
//                 fill="#586575"
//                 fontSize={9}
//               >
//                 {(val * 100).toFixed(0)}%
//               </text>
//             </g>
//           );
//         })}
//         {pts.map((_, i) => (
//           <text
//             key={i}
//             x={xScale(i)}
//             y={CURVE_H - 6}
//             textAnchor="middle"
//             fill="#586575"
//             fontSize={9}
//           >
//             C{i}
//           </text>
//         ))}
//         <path
//           d={pathD}
//           fill="none"
//           stroke={color}
//           strokeWidth={2}
//           strokeLinejoin="round"
//         />
//         <path
//           d={`${pathD} L${xScale(pts.length - 1)},${yScale(min)} L${xScale(
//             0
//           )},${yScale(min)} Z`}
//           fill={color}
//           fillOpacity={0.08}
//         />
//         {pts.map((v, i) => (
//           <g key={i}>
//             <circle
//               cx={xScale(i)}
//               cy={yScale(v)}
//               r={12}
//               fill="transparent"
//               style={{ cursor: "ns-resize" }}
//               onMouseDown={(e) => {
//                 e.preventDefault();
//                 dragIdx.current = i;
//               }}
//               onTouchStart={(e) => {
//                 e.preventDefault();
//                 dragIdx.current = i;
//               }}
//             />
//             <circle
//               cx={xScale(i)}
//               cy={yScale(v)}
//               r={5}
//               fill="#0d1117"
//               stroke={color}
//               strokeWidth={2}
//               style={{ pointerEvents: "none" }}
//             />
//             <text
//               x={xScale(i)}
//               y={yScale(v) - 10}
//               textAnchor="middle"
//               fill={color}
//               fontSize={9}
//               fontWeight={600}
//               style={{ pointerEvents: "none" }}
//             >
//               {(v * 100).toFixed(1)}%
//             </text>
//           </g>
//         ))}
//       </svg>
//     </div>
//   );
// }

// // ============================================================
// // PARAMETER INPUT COMPONENT
// // ============================================================

// function ParamInput({
//   label,
//   value,
//   onChange,
//   min,
//   max,
//   step,
//   suffix = "",
//   info,
// }) {
//   return (
//     <div
//       style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}
//     >
//       <label
//         style={{
//           fontSize: 11,
//           color: "#8b95a5",
//           minWidth: 170,
//           lineHeight: 1.2,
//         }}
//         title={info}
//       >
//         {label}
//       </label>
//       <input
//         type="number"
//         value={value}
//         min={min}
//         max={max}
//         step={step}
//         onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
//         style={{
//           width: 72,
//           padding: "3px 6px",
//           fontSize: 12,
//           fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
//           background: "#0d1117",
//           border: "1px solid #1e2733",
//           borderRadius: 4,
//           color: "#e6edf3",
//           outline: "none",
//         }}
//         onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
//         onBlur={(e) => (e.target.style.borderColor = "#1e2733")}
//       />
//       {suffix && (
//         <span style={{ fontSize: 10, color: "#586575" }}>{suffix}</span>
//       )}
//     </div>
//   );
// }

// function ParamSection({ title, children, color = "#3b82f6" }) {
//   const [open, setOpen] = useState(true);
//   return (
//     <div style={{ marginBottom: 12 }}>
//       <div
//         onClick={() => setOpen(!open)}
//         style={{
//           fontSize: 11,
//           fontWeight: 700,
//           color,
//           letterSpacing: 1.2,
//           textTransform: "uppercase",
//           cursor: "pointer",
//           userSelect: "none",
//           display: "flex",
//           alignItems: "center",
//           gap: 6,
//           paddingBottom: 4,
//           borderBottom: `1px solid ${color}33`,
//           marginBottom: 8,
//         }}
//       >
//         <span
//           style={{
//             fontSize: 8,
//             transform: open ? "rotate(90deg)" : "rotate(0deg)",
//             transition: "transform 0.15s",
//           }}
//         >
//           ▶
//         </span>
//         {title}
//       </div>
//       {open && <div style={{ paddingLeft: 4 }}>{children}</div>}
//     </div>
//   );
// }

// // ============================================================
// // RESULTS CHART COMPONENTS
// // ============================================================

// const COLORS = {
//   active: "#22c55e",
//   kia: "#ef4444",
//   dow: "#f97316",
//   inCare: "#3b82f6",
//   evacPool: "#a855f7",
//   evacuated: "#06b6d4",
//   rtd: "#22c55e",
//   casualties: "#ef4444",
//   dnbi: "#eab308",
// };

// function CustomTooltip({ active, payload, label }) {
//   if (!active || !payload?.length) return null;
//   return (
//     <div
//       style={{
//         background: "#161b22ee",
//         border: "1px solid #30363d",
//         borderRadius: 6,
//         padding: "8px 12px",
//         fontSize: 11,
//         color: "#e6edf3",
//         backdropFilter: "blur(8px)",
//       }}
//     >
//       <div style={{ fontWeight: 700, marginBottom: 4 }}>Day {label}</div>
//       {payload.map((p, i) => (
//         <div
//           key={i}
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             gap: 16,
//             color: p.color,
//           }}
//         >
//           <span>{p.name}</span>
//           <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
//             {p.value?.toLocaleString()}
//           </span>
//         </div>
//       ))}
//     </div>
//   );
// }

// // ============================================================
// // MAIN APP
// // ============================================================

// const DEFAULT_CYCLES = 10;
// const defaultSchedule = (n, val) => Array.from({ length: n }, () => val);

// export default function App() {
//   // -- State for all parameters --
//   const [numCycles, setNumCycles] = useState(DEFAULT_CYCLES);
//   const [initPop, setInitPop] = useState(30000);
//   const [r1Cap, setR1Cap] = useState(500);
//   const [r2Beds, setR2Beds] = useState(150);
//   const [r3Beds, setR3Beds] = useState(400);
//   const [r4Evac, setR4Evac] = useState(50);

//   const [casSchedule, setCasSchedule] = useState(defaultSchedule(20, 0.1));
//   const [dnbiSchedule, setDnbiSchedule] = useState(defaultSchedule(20, 0.02));

//   const [kiaRate, setKiaRate] = useState(0.2);
//   const [rtdLt72Rate, setRtdLt72Rate] = useState(0.15);
//   const [prevKiaFrac, setPrevKiaFrac] = useState(0.24);
//   const [prevKiaSaved, setPrevKiaSaved] = useState(0.0);

//   const [dnbiRtd, setDnbiRtd] = useState(0.5);
//   const [dnbiMinor, setDnbiMinor] = useState(0.09);
//   const [dnbiR3, setDnbiR3] = useState(0.35);
//   const [dnbiEvac, setDnbiEvac] = useState(0.05);
//   const [dnbiDow, setDnbiDow] = useState(0.01);

//   const [dowR1, setDowR1] = useState(0.03);
//   const [rtdR1, setRtdR1] = useState(0.1);
//   const [dowR2, setDowR2] = useState(0.05);
//   const [rtdR2, setRtdR2] = useState(0.15);
//   const [dowR3, setDowR3] = useState(0.04);
//   const [rtdR3, setRtdR3] = useState(0.2);
//   const [losR3, setLosR3] = useState(3);
//   const [dischRtdFrac, setDischRtdFrac] = useState(0.5);

//   const [dowMult, setDowMult] = useState(2.0);
//   const [rtdReduc, setRtdReduc] = useState(0.5);
//   const [r2Dist, setR2Dist] = useState(5.0);
//   const [longStayMort, setLongStayMort] = useState(0.02);

//   const [tab, setTab] = useState("population");

//   // Run simulation
//   const results = useMemo(() => {
//     return runSimulation({
//       initial_population: initPop,
//       num_cycles: numCycles,
//       r1_capacity: r1Cap,
//       r2_beds: r2Beds,
//       r3_beds: r3Beds,
//       r4_evacuation_rate: r4Evac,
//       casualty_rate_schedule: casSchedule,
//       kia_rate: kiaRate,
//       rtd_lt72_rate: rtdLt72Rate,
//       preventable_kia_fraction: prevKiaFrac,
//       preventable_kia_saved_rate: prevKiaSaved,
//       dnbi_rate: dnbiSchedule[0],
//       dnbi_rtd_lt72_fraction: dnbiRtd,
//       dnbi_minor_care_fraction: dnbiMinor,
//       dnbi_needs_r3_fraction: dnbiR3,
//       dnbi_evacuated_fraction: dnbiEvac,
//       dnbi_dow_fraction: dnbiDow,
//       dow_rate_r1: dowR1,
//       rtd_rate_r1: rtdR1,
//       dow_rate_r2: dowR2,
//       rtd_rate_r2: rtdR2,
//       dow_rate_r3: dowR3,
//       rtd_rate_r3: rtdR3,
//       avg_los_r3_cycles: losR3,
//       r3_discharge_rtd_fraction: dischRtdFrac,
//       dow_multiplier_over_capacity: dowMult,
//       rtd_reduction_over_capacity: rtdReduc,
//       r2_distance_km: r2Dist,
//       long_stay_mortality_rate: longStayMort,
//     });
//   }, [
//     initPop,
//     numCycles,
//     r1Cap,
//     r2Beds,
//     r3Beds,
//     r4Evac,
//     casSchedule,
//     dnbiSchedule,
//     kiaRate,
//     rtdLt72Rate,
//     prevKiaFrac,
//     prevKiaSaved,
//     dnbiRtd,
//     dnbiMinor,
//     dnbiR3,
//     dnbiEvac,
//     dnbiDow,
//     dowR1,
//     rtdR1,
//     dowR2,
//     rtdR2,
//     dowR3,
//     rtdR3,
//     losR3,
//     dischRtdFrac,
//     dowMult,
//     rtdReduc,
//     r2Dist,
//     longStayMort,
//   ]);

//   const lastR = results[results.length - 1] || {};

//   // Population breakdown for stacked area
//   const popData = results.map((r) => ({
//     day: r.day,
//     Active: r.active_pop,
//     "In R3 Care": r.r3_occupied,
//     "Evac Queue": r.evac_pool,
//     Evacuated: r.cum_evac,
//     "Died (KIA)": r.cum_kia,
//     "Died (DOW)": r.cum_dow,
//   }));

//   // Per-cycle flow
//   const flowData = results.map((r) => ({
//     day: r.day,
//     Casualties: r.total_cas,
//     KIA: r.kia,
//     DOW: r.dow,
//     RTD: r.rtd,
//     DNBI: r.dnbi,
//   }));

//   // Care system
//   const careData = results.map((r) => ({
//     day: r.day,
//     "R3 Occupied": r.r3_occupied,
//     "R3 Capacity": r.r3_cap,
//     "Evac Queue": r.evac_pool,
//   }));

//   return (
//     <div
//       style={{
//         fontFamily: "'IBM Plex Sans', 'SF Pro Text', system-ui, sans-serif",
//         background: "#0a0e14",
//         color: "#e6edf3",
//         minHeight: "100vh",
//         display: "flex",
//         flexDirection: "column",
//       }}
//     >
//       {/* Header */}
//       <div
//         style={{
//           padding: "16px 24px",
//           borderBottom: "1px solid #1e2733",
//           background: "linear-gradient(180deg, #111820 0%, #0a0e14 100%)",
//         }}
//       >
//         <h1
//           style={{
//             margin: 0,
//             fontSize: 18,
//             fontWeight: 700,
//             letterSpacing: -0.3,
//             background: "linear-gradient(90deg, #e6edf3, #8b95a5)",
//             WebkitBackgroundClip: "text",
//             WebkitTextFillColor: "transparent",
//           }}
//         >
//           TAIWAN CONTINGENCY — MEDICAL CASUALTY MODEL
//         </h1>
//         <div style={{ fontSize: 11, color: "#586575", marginTop: 2 }}>
//           72-hour cycle simulation · {numCycles} cycles · {numCycles * 3} days
//         </div>
//       </div>

//       {/* Summary bar */}
//       <div
//         style={{
//           display: "flex",
//           gap: 1,
//           padding: "0 24px",
//           background: "#0d1117",
//           borderBottom: "1px solid #1e2733",
//           flexWrap: "wrap",
//         }}
//       >
//         {[
//           {
//             label: "ACTIVE POP",
//             val: lastR.active_pop?.toLocaleString(),
//             color: COLORS.active,
//           },
//           {
//             label: "CUM. KIA",
//             val: lastR.cum_kia?.toLocaleString(),
//             color: COLORS.kia,
//           },
//           {
//             label: "CUM. DOW",
//             val: lastR.cum_dow?.toLocaleString(),
//             color: COLORS.dow,
//           },
//           {
//             label: "TOTAL DEAD",
//             val: lastR.cum_dead?.toLocaleString(),
//             color: "#ff6b6b",
//           },
//           {
//             label: "IN CARE",
//             val: lastR.in_care?.toLocaleString(),
//             color: COLORS.inCare,
//           },
//           {
//             label: "EVAC QUEUE",
//             val: lastR.evac_pool?.toLocaleString(),
//             color: COLORS.evacPool,
//           },
//           {
//             label: "EVACUATED",
//             val: lastR.cum_evac?.toLocaleString(),
//             color: COLORS.evacuated,
//           },
//           {
//             label: "POP LOSS",
//             val: `${((1 - (lastR.active_pop || 0) / initPop) * 100).toFixed(
//               1
//             )}%`,
//             color: "#f97316",
//           },
//         ].map((s, i) => (
//           <div key={i} style={{ padding: "10px 14px", minWidth: 90 }}>
//             <div
//               style={{
//                 fontSize: 9,
//                 color: "#586575",
//                 letterSpacing: 1,
//                 fontWeight: 600,
//               }}
//             >
//               {s.label}
//             </div>
//             <div
//               style={{
//                 fontSize: 16,
//                 fontWeight: 700,
//                 color: s.color,
//                 fontFamily: "'JetBrains Mono', monospace",
//               }}
//             >
//               {s.val}
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* Main content */}
//       <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
//         {/* Left panel — controls */}
//         <div
//           style={{
//             width: 340,
//             overflowY: "auto",
//             padding: "16px 16px",
//             borderRight: "1px solid #1e2733",
//             background: "#0d1117",
//             flexShrink: 0,
//             maxHeight: "calc(100vh - 120px)",
//           }}
//         >
//           <ParamSection title="Force & Facilities" color="#22c55e">
//             <ParamInput
//               label="Initial Population"
//               value={initPop}
//               onChange={setInitPop}
//               min={1000}
//               max={500000}
//               step={1000}
//             />
//             <ParamInput
//               label="Cycles (72hr each)"
//               value={numCycles}
//               onChange={(v) =>
//                 setNumCycles(Math.max(2, Math.min(20, Math.round(v))))
//               }
//               min={2}
//               max={20}
//               step={1}
//             />
//             <ParamInput
//               label="R1 Capacity (throughput)"
//               value={r1Cap}
//               onChange={setR1Cap}
//               min={10}
//               max={5000}
//               step={10}
//             />
//             <ParamInput
//               label="R2 Beds"
//               value={r2Beds}
//               onChange={setR2Beds}
//               min={10}
//               max={2000}
//               step={10}
//             />
//             <ParamInput
//               label="R3 Beds"
//               value={r3Beds}
//               onChange={setR3Beds}
//               min={10}
//               max={5000}
//               step={10}
//             />
//             <ParamInput
//               label="R4 Evac Rate / cycle"
//               value={r4Evac}
//               onChange={setR4Evac}
//               min={0}
//               max={1000}
//               step={5}
//             />
//           </ParamSection>

//           <ParamSection title="Triage Ratios" color="#ef4444">
//             <ParamInput
//               label="KIA Rate"
//               value={kiaRate}
//               onChange={setKiaRate}
//               min={0.01}
//               max={0.6}
//               step={0.01}
//             />
//             <ParamInput
//               label="RTD <72hr Rate"
//               value={rtdLt72Rate}
//               onChange={setRtdLt72Rate}
//               min={0.01}
//               max={0.5}
//               step={0.01}
//             />
//             <div style={{ fontSize: 10, color: "#586575", marginBottom: 6 }}>
//               → Wounded entering care:{" "}
//               {((1 - kiaRate - rtdLt72Rate) * 100).toFixed(1)}%
//             </div>
//             <ParamInput
//               label="Preventable KIA %"
//               value={prevKiaFrac}
//               onChange={setPrevKiaFrac}
//               min={0}
//               max={1}
//               step={0.01}
//             />
//             <ParamInput
//               label="Prev. KIA Saved Rate"
//               value={prevKiaSaved}
//               onChange={setPrevKiaSaved}
//               min={0}
//               max={1}
//               step={0.05}
//             />
//           </ParamSection>

//           <ParamSection title="Care Chain DOW/RTD" color="#f97316">
//             <ParamInput
//               label="R1 DOW Rate"
//               value={dowR1}
//               onChange={setDowR1}
//               min={0}
//               max={0.5}
//               step={0.01}
//             />
//             <ParamInput
//               label="R1 RTD Rate"
//               value={rtdR1}
//               onChange={setRtdR1}
//               min={0}
//               max={0.5}
//               step={0.01}
//             />
//             <ParamInput
//               label="R2 DOW Rate"
//               value={dowR2}
//               onChange={setDowR2}
//               min={0}
//               max={0.5}
//               step={0.01}
//             />
//             <ParamInput
//               label="R2 RTD Rate"
//               value={rtdR2}
//               onChange={setRtdR2}
//               min={0}
//               max={0.5}
//               step={0.01}
//             />
//             <ParamInput
//               label="R3 DOW Rate"
//               value={dowR3}
//               onChange={setDowR3}
//               min={0}
//               max={0.5}
//               step={0.01}
//             />
//             <ParamInput
//               label="R3 RTD Rate"
//               value={rtdR3}
//               onChange={setRtdR3}
//               min={0}
//               max={0.5}
//               step={0.01}
//             />
//             <ParamInput
//               label="R3 Avg LOS (cycles)"
//               value={losR3}
//               onChange={setLosR3}
//               min={1}
//               max={10}
//               step={1}
//             />
//             <ParamInput
//               label="R3 Disch → RTD %"
//               value={dischRtdFrac}
//               onChange={setDischRtdFrac}
//               min={0}
//               max={1}
//               step={0.05}
//             />
//           </ParamSection>

//           <ParamSection title="DNBI Splits" color="#eab308">
//             <ParamInput
//               label="DNBI RTD <72hr %"
//               value={dnbiRtd}
//               onChange={setDnbiRtd}
//               min={0}
//               max={1}
//               step={0.05}
//             />
//             <ParamInput
//               label="DNBI Minor Care %"
//               value={dnbiMinor}
//               onChange={setDnbiMinor}
//               min={0}
//               max={1}
//               step={0.01}
//             />
//             <ParamInput
//               label="DNBI → R3 %"
//               value={dnbiR3}
//               onChange={setDnbiR3}
//               min={0}
//               max={1}
//               step={0.05}
//             />
//             <ParamInput
//               label="DNBI → Evac %"
//               value={dnbiEvac}
//               onChange={setDnbiEvac}
//               min={0}
//               max={0.5}
//               step={0.01}
//             />
//             <ParamInput
//               label="DNBI DOW %"
//               value={dnbiDow}
//               onChange={setDnbiDow}
//               min={0}
//               max={0.1}
//               step={0.005}
//             />
//           </ParamSection>

//           <ParamSection title="Overflow & Positioning" color="#a855f7">
//             <ParamInput
//               label="Overcap DOW Multiplier"
//               value={dowMult}
//               onChange={setDowMult}
//               min={1}
//               max={5}
//               step={0.1}
//               suffix="×"
//             />
//             <ParamInput
//               label="Overcap RTD Reduction"
//               value={rtdReduc}
//               onChange={setRtdReduc}
//               min={0.1}
//               max={1}
//               step={0.05}
//               suffix="×"
//             />
//             <ParamInput
//               label="R2 Distance (km)"
//               value={r2Dist}
//               onChange={setR2Dist}
//               min={1}
//               max={20}
//               step={0.5}
//               suffix="km"
//             />
//             <ParamInput
//               label="Long-Stay Mortality"
//               value={longStayMort}
//               onChange={setLongStayMort}
//               min={0}
//               max={0.2}
//               step={0.005}
//               suffix="/cyc"
//             />
//           </ParamSection>
//         </div>

//         {/* Right panel — curves + charts */}
//         <div
//           style={{
//             flex: 1,
//             overflowY: "auto",
//             padding: "16px 24px",
//             maxHeight: "calc(100vh - 120px)",
//           }}
//         >
//           {/* Draggable curves */}
//           <div style={{ marginBottom: 24 }}>
//             <div
//               style={{
//                 fontSize: 13,
//                 fontWeight: 700,
//                 color: "#e6edf3",
//                 marginBottom: 12,
//               }}
//             >
//               PER-CYCLE RATE CURVES
//               <span
//                 style={{
//                   fontSize: 10,
//                   color: "#586575",
//                   fontWeight: 400,
//                   marginLeft: 8,
//                 }}
//               >
//                 drag nodes to adjust
//               </span>
//             </div>
//             <DraggableCurve
//               values={casSchedule}
//               onChange={setCasSchedule}
//               label="Casualty Rate per Cycle"
//               min={0}
//               max={0.4}
//               step={0.005}
//               color="#ef4444"
//               numCycles={numCycles}
//             />
//             <DraggableCurve
//               values={dnbiSchedule}
//               onChange={setDnbiSchedule}
//               label="DNBI Rate per Cycle"
//               min={0}
//               max={0.1}
//               step={0.002}
//               color="#eab308"
//               numCycles={numCycles}
//             />
//           </div>

//           {/* Chart tabs */}
//           <div style={{ display: "flex", gap: 2, marginBottom: 16 }}>
//             {[
//               { id: "population", label: "Population Breakdown" },
//               { id: "flow", label: "Per-Cycle Flow" },
//               { id: "care", label: "Care System" },
//             ].map((t) => (
//               <button
//                 key={t.id}
//                 onClick={() => setTab(t.id)}
//                 style={{
//                   padding: "6px 14px",
//                   fontSize: 11,
//                   fontWeight: 600,
//                   background: tab === t.id ? "#1e2733" : "transparent",
//                   color: tab === t.id ? "#e6edf3" : "#586575",
//                   border: `1px solid ${
//                     tab === t.id ? "#30363d" : "transparent"
//                   }`,
//                   borderRadius: 4,
//                   cursor: "pointer",
//                   letterSpacing: 0.5,
//                 }}
//               >
//                 {t.label}
//               </button>
//             ))}
//           </div>

//           {/* Charts */}
//           <div
//             style={{
//               background: "#0d1117",
//               borderRadius: 8,
//               border: "1px solid #1e2733",
//               padding: "16px 8px 8px 0",
//             }}
//           >
//             {tab === "population" && (
//               <>
//                 <div
//                   style={{
//                     fontSize: 11,
//                     color: "#8b95a5",
//                     marginBottom: 8,
//                     paddingLeft: 16,
//                     fontWeight: 600,
//                   }}
//                 >
//                   WHERE IS EVERYONE? — Stacked population accounting
//                 </div>
//                 <ResponsiveContainer width="100%" height={360}>
//                   <AreaChart data={popData}>
//                     <CartesianGrid strokeDasharray="3 3" stroke="#1e2733" />
//                     <XAxis
//                       dataKey="day"
//                       tick={{ fontSize: 10, fill: "#586575" }}
//                       label={{
//                         value: "Day",
//                         position: "insideBottom",
//                         offset: -2,
//                         fontSize: 10,
//                         fill: "#586575",
//                       }}
//                     />
//                     <YAxis
//                       tick={{ fontSize: 10, fill: "#586575" }}
//                       tickFormatter={(v) =>
//                         v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
//                       }
//                     />
//                     <Tooltip content={<CustomTooltip />} />
//                     <Legend wrapperStyle={{ fontSize: 10 }} />
//                     <Area
//                       type="monotone"
//                       dataKey="Active"
//                       stackId="1"
//                       stroke={COLORS.active}
//                       fill={COLORS.active}
//                       fillOpacity={0.6}
//                     />
//                     <Area
//                       type="monotone"
//                       dataKey="In R3 Care"
//                       stackId="1"
//                       stroke={COLORS.inCare}
//                       fill={COLORS.inCare}
//                       fillOpacity={0.6}
//                     />
//                     <Area
//                       type="monotone"
//                       dataKey="Evac Queue"
//                       stackId="1"
//                       stroke={COLORS.evacPool}
//                       fill={COLORS.evacPool}
//                       fillOpacity={0.6}
//                     />
//                     <Area
//                       type="monotone"
//                       dataKey="Evacuated"
//                       stackId="1"
//                       stroke={COLORS.evacuated}
//                       fill={COLORS.evacuated}
//                       fillOpacity={0.6}
//                     />
//                     <Area
//                       type="monotone"
//                       dataKey="Died (DOW)"
//                       stackId="1"
//                       stroke={COLORS.dow}
//                       fill={COLORS.dow}
//                       fillOpacity={0.6}
//                     />
//                     <Area
//                       type="monotone"
//                       dataKey="Died (KIA)"
//                       stackId="1"
//                       stroke={COLORS.kia}
//                       fill={COLORS.kia}
//                       fillOpacity={0.6}
//                     />
//                   </AreaChart>
//                 </ResponsiveContainer>
//               </>
//             )}

//             {tab === "flow" && (
//               <>
//                 <div
//                   style={{
//                     fontSize: 11,
//                     color: "#8b95a5",
//                     marginBottom: 8,
//                     paddingLeft: 16,
//                     fontWeight: 600,
//                   }}
//                 >
//                   PER-CYCLE EVENTS — Casualties in, returns out
//                 </div>
//                 <ResponsiveContainer width="100%" height={360}>
//                   <ComposedChart data={flowData}>
//                     <CartesianGrid strokeDasharray="3 3" stroke="#1e2733" />
//                     <XAxis
//                       dataKey="day"
//                       tick={{ fontSize: 10, fill: "#586575" }}
//                       label={{
//                         value: "Day",
//                         position: "insideBottom",
//                         offset: -2,
//                         fontSize: 10,
//                         fill: "#586575",
//                       }}
//                     />
//                     <YAxis
//                       tick={{ fontSize: 10, fill: "#586575" }}
//                       tickFormatter={(v) =>
//                         v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
//                       }
//                     />
//                     <Tooltip content={<CustomTooltip />} />
//                     <Legend wrapperStyle={{ fontSize: 10 }} />
//                     <Bar
//                       dataKey="Casualties"
//                       fill={COLORS.casualties}
//                       fillOpacity={0.7}
//                       radius={[2, 2, 0, 0]}
//                     />
//                     <Bar
//                       dataKey="DNBI"
//                       fill={COLORS.dnbi}
//                       fillOpacity={0.7}
//                       radius={[2, 2, 0, 0]}
//                     />
//                     <Line
//                       type="monotone"
//                       dataKey="RTD"
//                       stroke={COLORS.rtd}
//                       strokeWidth={2}
//                       dot={{ r: 3 }}
//                     />
//                     <Line
//                       type="monotone"
//                       dataKey="KIA"
//                       stroke={COLORS.kia}
//                       strokeWidth={2}
//                       dot={{ r: 3 }}
//                     />
//                     <Line
//                       type="monotone"
//                       dataKey="DOW"
//                       stroke={COLORS.dow}
//                       strokeWidth={2}
//                       dot={{ r: 3 }}
//                     />
//                   </ComposedChart>
//                 </ResponsiveContainer>
//               </>
//             )}

//             {tab === "care" && (
//               <>
//                 <div
//                   style={{
//                     fontSize: 11,
//                     color: "#8b95a5",
//                     marginBottom: 8,
//                     paddingLeft: 16,
//                     fontWeight: 600,
//                   }}
//                 >
//                   CARE SYSTEM PRESSURE — Bed occupancy vs. capacity
//                 </div>
//                 <ResponsiveContainer width="100%" height={360}>
//                   <ComposedChart data={careData}>
//                     <CartesianGrid strokeDasharray="3 3" stroke="#1e2733" />
//                     <XAxis
//                       dataKey="day"
//                       tick={{ fontSize: 10, fill: "#586575" }}
//                       label={{
//                         value: "Day",
//                         position: "insideBottom",
//                         offset: -2,
//                         fontSize: 10,
//                         fill: "#586575",
//                       }}
//                     />
//                     <YAxis
//                       tick={{ fontSize: 10, fill: "#586575" }}
//                       tickFormatter={(v) =>
//                         v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
//                       }
//                     />
//                     <Tooltip content={<CustomTooltip />} />
//                     <Legend wrapperStyle={{ fontSize: 10 }} />
//                     <Area
//                       type="monotone"
//                       dataKey="R3 Occupied"
//                       stroke={COLORS.inCare}
//                       fill={COLORS.inCare}
//                       fillOpacity={0.3}
//                     />
//                     <Area
//                       type="monotone"
//                       dataKey="Evac Queue"
//                       stroke={COLORS.evacPool}
//                       fill={COLORS.evacPool}
//                       fillOpacity={0.3}
//                     />
//                     <Line
//                       type="stepAfter"
//                       dataKey="R3 Capacity"
//                       stroke="#ef4444"
//                       strokeWidth={2}
//                       strokeDasharray="6 3"
//                       dot={false}
//                     />
//                   </ComposedChart>
//                 </ResponsiveContainer>
//               </>
//             )}
//           </div>

//           {/* Data table */}
//           <div style={{ marginTop: 20, overflowX: "auto" }}>
//             <div
//               style={{
//                 fontSize: 11,
//                 fontWeight: 700,
//                 color: "#8b95a5",
//                 marginBottom: 8,
//                 letterSpacing: 1,
//               }}
//             >
//               CYCLE DATA
//             </div>
//             <table
//               style={{
//                 width: "100%",
//                 borderCollapse: "collapse",
//                 fontSize: 11,
//                 fontFamily: "'JetBrains Mono', monospace",
//               }}
//             >
//               <thead>
//                 <tr style={{ borderBottom: "1px solid #1e2733" }}>
//                   {[
//                     "Day",
//                     "Active",
//                     "Cas",
//                     "KIA",
//                     "DOW",
//                     "RTD",
//                     "Evac",
//                     "EvacQ",
//                     "R3 Occ",
//                     "DNBI",
//                   ].map((h) => (
//                     <th
//                       key={h}
//                       style={{
//                         padding: "4px 8px",
//                         textAlign: "right",
//                         color: "#586575",
//                         fontWeight: 600,
//                         fontSize: 10,
//                       }}
//                     >
//                       {h}
//                     </th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {results.map((r, i) => (
//                   <tr key={i} style={{ borderBottom: "1px solid #0d1117" }}>
//                     <td
//                       style={{
//                         padding: "3px 8px",
//                         textAlign: "right",
//                         color: "#8b95a5",
//                       }}
//                     >
//                       {r.day}
//                     </td>
//                     <td
//                       style={{
//                         padding: "3px 8px",
//                         textAlign: "right",
//                         color: COLORS.active,
//                       }}
//                     >
//                       {r.active_pop.toLocaleString()}
//                     </td>
//                     <td
//                       style={{
//                         padding: "3px 8px",
//                         textAlign: "right",
//                         color: "#e6edf3",
//                       }}
//                     >
//                       {r.total_cas.toLocaleString()}
//                     </td>
//                     <td
//                       style={{
//                         padding: "3px 8px",
//                         textAlign: "right",
//                         color: COLORS.kia,
//                       }}
//                     >
//                       {r.kia.toLocaleString()}
//                     </td>
//                     <td
//                       style={{
//                         padding: "3px 8px",
//                         textAlign: "right",
//                         color: COLORS.dow,
//                       }}
//                     >
//                       {r.dow.toLocaleString()}
//                     </td>
//                     <td
//                       style={{
//                         padding: "3px 8px",
//                         textAlign: "right",
//                         color: COLORS.rtd,
//                       }}
//                     >
//                       {r.rtd.toLocaleString()}
//                     </td>
//                     <td
//                       style={{
//                         padding: "3px 8px",
//                         textAlign: "right",
//                         color: COLORS.evacuated,
//                       }}
//                     >
//                       {r.evacuated.toLocaleString()}
//                     </td>
//                     <td
//                       style={{
//                         padding: "3px 8px",
//                         textAlign: "right",
//                         color: COLORS.evacPool,
//                       }}
//                     >
//                       {r.evac_pool.toLocaleString()}
//                     </td>
//                     <td
//                       style={{
//                         padding: "3px 8px",
//                         textAlign: "right",
//                         color: COLORS.inCare,
//                       }}
//                     >
//                       {r.r3_occupied.toLocaleString()}
//                     </td>
//                     <td
//                       style={{
//                         padding: "3px 8px",
//                         textAlign: "right",
//                         color: COLORS.dnbi,
//                       }}
//                     >
//                       {r.dnbi.toLocaleString()}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
  Bar,
} from "recharts";

// ============================================================
// SIMULATION ENGINE (JS port with R1/R2/R3 tracking)
// ============================================================

function runSimulation(params) {
  const {
    initial_population,
    num_cycles,
    r1_capacity,
    r2_beds,
    r3_beds,
    r4_evacuation_rate,
    casualty_rate_schedule,
    dnbi_rate_schedule,
    kia_rate,
    rtd_lt72_rate,
    preventable_kia_fraction,
    preventable_kia_saved_rate,
    dnbi_rtd_lt72_fraction,
    dnbi_minor_care_fraction,
    dnbi_needs_r3_fraction,
    dnbi_evacuated_fraction,
    dnbi_dow_fraction,
    dow_rate_r1,
    rtd_rate_r1,
    dow_rate_r2,
    rtd_rate_r2,
    dow_rate_r3,
    rtd_rate_r3,
    avg_los_r3_cycles,
    r3_discharge_rtd_fraction,
    dow_multiplier_over_capacity,
    rtd_reduction_over_capacity,
    r2_distance_km,
    long_stay_mortality_rate,
  } = params;

  const surgMod = () =>
    0.5 + (0.5 * Math.min(Math.max(r2_distance_km, 1), 10)) / 10;
  const r2Att = () =>
    0.25 * Math.exp(-0.35 * (Math.max(r2_distance_km, 1) - 1));

  let r3_occ_list = [];
  const totOcc = (l) => l.reduce((s, e) => s + e.p, 0);
  const adm = (l, n, los) => {
    if (n > 0 && los > 0) l.push({ p: n, c: los });
  };
  const tck = (l) => {
    let d = 0;
    const nx = l.filter((e) => {
      if (e.c <= 1) {
        d += e.p;
        return false;
      }
      e.c--;
      return true;
    });
    l.length = 0;
    nx.forEach((e) => l.push(e));
    return d;
  };

  let active_pop = initial_population;
  let evac_pool = 0;
  let cum_kia = 0,
    cum_dow = 0,
    cum_rtd = 0,
    cum_evac = 0;
  let cur_r2_cap = r2_beds;
  const results = [];

  for (let c = 0; c < num_cycles; c++) {
    const pop_start = active_pop;
    const cas_rate =
      casualty_rate_schedule[c] ??
      casualty_rate_schedule[casualty_rate_schedule.length - 1];
    const dnbi_rate_c =
      dnbi_rate_schedule[c] ??
      dnbi_rate_schedule[dnbi_rate_schedule.length - 1];

    const total_cas = Math.round(active_pop * cas_rate);
    const raw_kia = Math.round(total_cas * kia_rate);
    const rtd_lt72_b = Math.round(total_cas * rtd_lt72_rate);
    const preventable = Math.round(raw_kia * preventable_kia_fraction);
    const saved = Math.round(preventable * preventable_kia_saved_rate);
    const kia_imm = raw_kia - saved;
    const wounded = Math.max(0, total_cas - raw_kia - rtd_lt72_b + saved);

    const total_dnbi = Math.round(active_pop * dnbi_rate_c);
    const dnbi_rtd = Math.round(total_dnbi * dnbi_rtd_lt72_fraction);
    const dnbi_minor = Math.round(total_dnbi * dnbi_minor_care_fraction);
    const dnbi_r3 = Math.round(total_dnbi * dnbi_needs_r3_fraction);
    const dnbi_evac = Math.round(total_dnbi * dnbi_evacuated_fraction);
    const dnbi_dead = Math.round(total_dnbi * dnbi_dow_fraction);

    // R1
    const r1_pts = wounded;
    const r1_over = r1_pts > r1_capacity;
    let d1 = dow_rate_r1,
      t1 = rtd_rate_r1;
    if (r1_over) {
      d1 = Math.min(d1 * dow_multiplier_over_capacity, 0.95);
      t1 *= rtd_reduction_over_capacity;
    }
    const dow1 = Math.round(r1_pts * d1);
    const rtd1 = Math.round(r1_pts * t1);
    const fwd2 = Math.max(0, r1_pts - dow1 - rtd1);

    // R2
    const r2_pts = fwd2;
    let d2 = dow_rate_r2 * surgMod(),
      t2 = rtd_rate_r2;
    const r2_over = r2_pts > cur_r2_cap;
    if (r2_over) {
      d2 = Math.min(d2 * dow_multiplier_over_capacity, 0.95);
      t2 *= rtd_reduction_over_capacity;
    }
    const dow2 = Math.round(r2_pts * d2);
    const rtd2 = Math.round(r2_pts * t2);
    const fwd3 = Math.max(0, r2_pts - dow2 - rtd2);

    let r2_att = false,
      r2_lost = 0;
    if (Math.random() < r2Att()) {
      r2_att = true;
      r2_lost = Math.max(1, Math.round(cur_r2_cap * 0.1));
      cur_r2_cap = Math.max(0, cur_r2_cap - r2_lost);
    }

    // R3
    const r3_in = fwd3 + dnbi_r3;
    let d3 = dow_rate_r3,
      t3 = rtd_rate_r3;
    const r3_over = totOcc(r3_occ_list) + r3_in > r3_beds;
    if (r3_over) {
      d3 = Math.min(d3 * dow_multiplier_over_capacity, 0.95);
      t3 *= rtd_reduction_over_capacity;
    }
    const dow3 = Math.round(r3_in * d3);
    const rtd3 = Math.round(r3_in * t3);
    const need_evac = Math.max(0, r3_in - dow3 - rtd3);
    adm(r3_occ_list, need_evac, avg_los_r3_cycles);

    const disch_r3 = tck(r3_occ_list);
    const disch_rtd = Math.round(disch_r3 * r3_discharge_rtd_fraction);
    const disch_evac = disch_r3 - disch_rtd;

    evac_pool += disch_evac + dnbi_evac;
    const long_deaths = Math.round(evac_pool * long_stay_mortality_rate);
    evac_pool = Math.max(0, evac_pool - long_deaths);
    const evacuated = Math.min(evac_pool, r4_evacuation_rate);
    evac_pool -= evacuated;

    const total_kia_c = kia_imm;
    const total_dow_c = dow1 + dow2 + dow3 + long_deaths + dnbi_dead;
    const total_rtd_c =
      rtd_lt72_b + rtd1 + rtd2 + rtd3 + dnbi_rtd + dnbi_minor + disch_rtd;

    active_pop = Math.max(0, active_pop - total_cas - total_dnbi + total_rtd_c);
    cum_kia += total_kia_c;
    cum_dow += total_dow_c;
    cum_rtd += total_rtd_c;
    cum_evac += evacuated;

    const r3_occ = totOcc(r3_occ_list);
    results.push({
      cycle: c,
      day: (c + 1) * 3,
      pop_start,
      active_pop,
      total_cas,
      kia: total_kia_c,
      dow: total_dow_c,
      rtd: total_rtd_c,
      evacuated,
      evac_pool,
      r1_pts,
      r1_cap: r1_capacity,
      r1_over,
      r2_pts,
      r2_cap: cur_r2_cap,
      r2_over,
      r3_occ,
      r3_cap: r3_beds,
      r3_over,
      fwd2,
      fwd3,
      need_evac,
      dow1,
      dow2,
      dow3,
      rtd1,
      rtd2,
      rtd3,
      cum_kia,
      cum_dow,
      cum_dead: cum_kia + cum_dow,
      cum_rtd,
      cum_evac,
      in_care: r1_pts + r3_occ + evac_pool,
      dnbi: total_dnbi,
      long_deaths,
    });
  }
  return results;
}

// ============================================================
// DRAGGABLE CURVE
// ============================================================

const CH = 140,
  PD = { t: 18, r: 16, b: 26, l: 44 };

function DragCurve({
  values,
  onChange,
  label,
  min,
  max,
  step,
  color,
  numCycles,
  width = 430,
}) {
  const ref = useRef(null);
  const drag = useRef(null);
  const pw = width - PD.l - PD.r,
    ph = CH - PD.t - PD.b;
  const pts = values.slice(0, numCycles);
  const xs = (i) => PD.l + (i / Math.max(numCycles - 1, 1)) * pw;
  const ys = (v) => PD.t + ph - ((v - min) / (max - min)) * ph;
  const yi = (py) => min + ((PD.t + ph - py) / ph) * (max - min);

  const onMove = useCallback(
    (e) => {
      if (drag.current === null) return;
      const r = ref.current.getBoundingClientRect();
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      let v = yi(cy - r.top);
      v = Math.round(v / step) * step;
      v = Math.max(min, Math.min(max, v));
      const nv = [...values];
      nv[drag.current] = parseFloat(v.toFixed(4));
      onChange(nv);
    },
    [values, onChange, min, max, step]
  );

  const onUp = useCallback(() => {
    drag.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [onMove, onUp]);

  const path = pts
    .map((v, i) => `${i === 0 ? "M" : "L"}${xs(i)},${ys(v)}`)
    .join(" ");

  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: "#5a6474",
          marginBottom: 2,
          letterSpacing: 1.2,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <svg
        ref={ref}
        width={width}
        height={CH}
        style={{
          background: "#070a0f",
          borderRadius: 5,
          border: "1px solid #12171f",
          display: "block",
        }}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const val = min + f * (max - min);
          return (
            <g key={i}>
              <line
                x1={PD.l}
                x2={width - PD.r}
                y1={ys(val)}
                y2={ys(val)}
                stroke="#12171f"
              />
              <text
                x={PD.l - 4}
                y={ys(val) + 3}
                textAnchor="end"
                fill="#3d4654"
                fontSize={7.5}
              >
                {(val * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}
        {pts.map((_, i) => (
          <text
            key={i}
            x={xs(i)}
            y={CH - 4}
            textAnchor="middle"
            fill="#3d4654"
            fontSize={7.5}
          >
            C{i}
          </text>
        ))}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
        <path
          d={`${path} L${xs(pts.length - 1)},${ys(min)} L${xs(0)},${ys(min)} Z`}
          fill={color}
          fillOpacity={0.05}
        />
        {pts.map((v, i) => (
          <g key={i}>
            <circle
              cx={xs(i)}
              cy={ys(v)}
              r={13}
              fill="transparent"
              style={{ cursor: "ns-resize" }}
              onMouseDown={(e) => {
                e.preventDefault();
                drag.current = i;
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                drag.current = i;
              }}
            />
            <circle
              cx={xs(i)}
              cy={ys(v)}
              r={4}
              fill="#070a0f"
              stroke={color}
              strokeWidth={1.8}
              style={{ pointerEvents: "none" }}
            />
            <text
              x={xs(i)}
              y={ys(v) - 8}
              textAnchor="middle"
              fill={color}
              fontSize={7.5}
              fontWeight={700}
              style={{ pointerEvents: "none" }}
            >
              {(v * 100).toFixed(1)}%
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ============================================================
// UI HELPERS
// ============================================================

function P({ label, value, onChange, min, max, step, suffix = "" }) {
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}
    >
      <label
        style={{
          fontSize: 10,
          color: "#6b7789",
          minWidth: 148,
          lineHeight: 1.1,
        }}
      >
        {label}
      </label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={{
          width: 60,
          padding: "2px 4px",
          fontSize: 10.5,
          fontFamily: "'SF Mono',monospace",
          background: "#070a0f",
          border: "1px solid #12171f",
          borderRadius: 3,
          color: "#c8d1de",
          outline: "none",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
        onBlur={(e) => (e.target.style.borderColor = "#12171f")}
      />
      {suffix && (
        <span style={{ fontSize: 8, color: "#3d4654" }}>{suffix}</span>
      )}
    </div>
  );
}

function Sec({ title, children, color = "#3b82f6", open: defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          fontSize: 9,
          fontWeight: 700,
          color,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          cursor: "pointer",
          userSelect: "none",
          display: "flex",
          alignItems: "center",
          gap: 4,
          paddingBottom: 2,
          borderBottom: `1px solid ${color}22`,
          marginBottom: 5,
        }}
      >
        <span
          style={{
            fontSize: 6,
            transform: open ? "rotate(90deg)" : "",
            transition: "transform 0.15s",
          }}
        >
          ▶
        </span>
        {title}
      </div>
      {open && <div style={{ paddingLeft: 2 }}>{children}</div>}
    </div>
  );
}

const C = {
  active: "#22c55e",
  kia: "#ef4444",
  dow: "#f97316",
  evac: "#a855f7",
  evacuated: "#06b6d4",
  rtd: "#22c55e",
  cas: "#ef4444",
  dnbi: "#eab308",
  r1: "#f59e0b",
  r2: "#8b5cf6",
  r3: "#3b82f6",
};

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#0a0d13ee",
        border: "1px solid #1a2030",
        borderRadius: 4,
        padding: "5px 9px",
        fontSize: 9.5,
        color: "#c8d1de",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 2, fontSize: 10 }}>
        Day {label}
      </div>
      {payload.map((p, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            color: p.color,
            lineHeight: 1.4,
          }}
        >
          <span>{p.name}</span>
          <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
            {p.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// MAIN
// ============================================================

const mk = (n, v) => Array.from({ length: n }, () => v);

export default function App() {
  const [nc, setNc] = useState(10);
  const [ip, setIp] = useState(30000);
  const [r1c, setR1c] = useState(500);
  const [r2b, setR2b] = useState(150);
  const [r3b, setR3b] = useState(400);
  const [r4e, setR4e] = useState(50);
  const [cs, setCs] = useState(mk(20, 0.1));
  const [ds, setDs] = useState(mk(20, 0.02));
  const [kr, setKr] = useState(0.2);
  const [rr, setRr] = useState(0.15);
  const [pkf, setPkf] = useState(0.24);
  const [pks, setPks] = useState(0.0);
  const [dr, setDr] = useState(0.5);
  const [dm, setDm] = useState(0.09);
  const [d3r, setD3r] = useState(0.35);
  const [de, setDe] = useState(0.05);
  const [dd, setDd] = useState(0.01);
  const [d1, setD1] = useState(0.03);
  const [t1, setT1] = useState(0.1);
  const [d2, setD2] = useState(0.05);
  const [t2, setT2] = useState(0.15);
  const [d3, setD3] = useState(0.04);
  const [t3, setT3] = useState(0.2);
  const [los, setLos] = useState(3);
  const [drf, setDrf] = useState(0.5);
  const [dm2, setDm2] = useState(2.0);
  const [rrd, setRrd] = useState(0.5);
  const [r2d, setR2d] = useState(5.0);
  const [lsm, setLsm] = useState(0.02);
  const [tab, setTab] = useState("population");

  const results = useMemo(
    () =>
      runSimulation({
        initial_population: ip,
        num_cycles: nc,
        r1_capacity: r1c,
        r2_beds: r2b,
        r3_beds: r3b,
        r4_evacuation_rate: r4e,
        casualty_rate_schedule: cs,
        dnbi_rate_schedule: ds,
        kia_rate: kr,
        rtd_lt72_rate: rr,
        preventable_kia_fraction: pkf,
        preventable_kia_saved_rate: pks,
        dnbi_rtd_lt72_fraction: dr,
        dnbi_minor_care_fraction: dm,
        dnbi_needs_r3_fraction: d3r,
        dnbi_evacuated_fraction: de,
        dnbi_dow_fraction: dd,
        dow_rate_r1: d1,
        rtd_rate_r1: t1,
        dow_rate_r2: d2,
        rtd_rate_r2: t2,
        dow_rate_r3: d3,
        rtd_rate_r3: t3,
        avg_los_r3_cycles: los,
        r3_discharge_rtd_fraction: drf,
        dow_multiplier_over_capacity: dm2,
        rtd_reduction_over_capacity: rrd,
        r2_distance_km: r2d,
        long_stay_mortality_rate: lsm,
      }),
    [
      ip,
      nc,
      r1c,
      r2b,
      r3b,
      r4e,
      cs,
      ds,
      kr,
      rr,
      pkf,
      pks,
      dr,
      dm,
      d3r,
      de,
      dd,
      d1,
      t1,
      d2,
      t2,
      d3,
      t3,
      los,
      drf,
      dm2,
      rrd,
      r2d,
      lsm,
    ]
  );

  const L = results[results.length - 1] || {};

  const popD = results.map((r) => ({
    day: r.day,
    Active: r.active_pop,
    R1: r.r1_pts,
    "R3 Beds": r.r3_occ,
    "Evac Queue": r.evac_pool,
    Evacuated: r.cum_evac,
    "Died (DOW)": r.cum_dow,
    "Died (KIA)": r.cum_kia,
  }));
  const flowD = results.map((r) => ({
    day: r.day,
    Casualties: r.total_cas,
    DNBI: r.dnbi,
    KIA: r.kia,
    DOW: r.dow,
    RTD: r.rtd,
  }));
  const careD = results.map((r) => ({
    day: r.day,
    "R1 Patients": r.r1_pts,
    "R1 Cap": r.r1_cap,
    "R2 Patients": r.r2_pts,
    "R2 Cap": r.r2_cap,
    "R3 Occupied": r.r3_occ,
    "R3 Cap": r.r3_cap,
    "Evac Queue": r.evac_pool,
  }));
  const dowD = results.map((r) => ({
    day: r.day,
    "R1 DOW": r.dow1,
    "R2 DOW": r.dow2,
    "R3 DOW": r.dow3,
    "Long-Stay": r.long_deaths,
  }));

  return (
    <div
      style={{
        fontFamily: "'IBM Plex Sans',system-ui,sans-serif",
        background: "#050810",
        color: "#c8d1de",
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "8px 16px",
          borderBottom: "1px solid #12171f",
          background: "#080b12",
          flexShrink: 0,
          display: "flex",
          alignItems: "baseline",
          gap: 10,
        }}
      >
        <h1
          style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}
        >
          TAIWAN CONTINGENCY — MEDICAL CASUALTY MODEL
        </h1>
        <span style={{ fontSize: 9, color: "#3d4654" }}>
          {nc} cycles · {nc * 3} days
        </span>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          borderBottom: "1px solid #12171f",
          background: "#070a0f",
          flexShrink: 0,
        }}
      >
        {[
          { l: "ACTIVE", v: L.active_pop, c: C.active },
          { l: "KIA", v: L.cum_kia, c: C.kia },
          { l: "DOW", v: L.cum_dow, c: C.dow },
          { l: "DEAD", v: L.cum_dead, c: "#ff6b6b" },
          { l: "R1", v: L.r1_pts, c: C.r1 },
          { l: "R2", v: L.r2_pts, c: C.r2 },
          { l: "R3", v: L.r3_occ, c: C.r3 },
          { l: "EVAC Q", v: L.evac_pool, c: C.evac },
          { l: "EVAC'D", v: L.cum_evac, c: C.evacuated },
          {
            l: "LOSS",
            v: `${((1 - (L.active_pop || 0) / ip) * 100).toFixed(1)}%`,
            c: "#f97316",
            raw: true,
          },
        ].map((s, i) => (
          <div key={i} style={{ padding: "6px 10px", minWidth: 70 }}>
            <div
              style={{
                fontSize: 7.5,
                color: "#3d4654",
                letterSpacing: 1,
                fontWeight: 700,
              }}
            >
              {s.l}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: s.c,
                fontFamily: "monospace",
              }}
            >
              {s.raw ? s.v : (s.v ?? 0).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Body */}
      <div
        style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}
      >
        {/* Controls */}
        <div
          style={{
            width: 290,
            overflowY: "auto",
            padding: "10px 10px",
            borderRight: "1px solid #12171f",
            background: "#080b12",
            flexShrink: 0,
          }}
        >
          <Sec title="Force & Facilities" color="#22c55e">
            <P
              label="Initial Population"
              value={ip}
              onChange={setIp}
              min={1000}
              max={500000}
              step={1000}
            />
            <P
              label="Cycles (72hr)"
              value={nc}
              onChange={(v) => setNc(Math.max(2, Math.min(20, Math.round(v))))}
              min={2}
              max={20}
              step={1}
            />
            <P
              label="R1 Capacity"
              value={r1c}
              onChange={setR1c}
              min={10}
              max={5000}
              step={10}
            />
            <P
              label="R2 Beds"
              value={r2b}
              onChange={setR2b}
              min={10}
              max={2000}
              step={10}
            />
            <P
              label="R3 Beds"
              value={r3b}
              onChange={setR3b}
              min={10}
              max={5000}
              step={10}
            />
            <P
              label="R4 Evac / cycle"
              value={r4e}
              onChange={setR4e}
              min={0}
              max={1000}
              step={5}
            />
          </Sec>
          <Sec title="Triage" color="#ef4444">
            <P
              label="KIA Rate"
              value={kr}
              onChange={setKr}
              min={0.01}
              max={0.6}
              step={0.01}
            />
            <P
              label="RTD <72hr Rate"
              value={rr}
              onChange={setRr}
              min={0.01}
              max={0.5}
              step={0.01}
            />
            <div style={{ fontSize: 8.5, color: "#3d4654", marginBottom: 3 }}>
              → Wounded: {((1 - kr - rr) * 100).toFixed(1)}%
            </div>
            <P
              label="Preventable KIA %"
              value={pkf}
              onChange={setPkf}
              min={0}
              max={1}
              step={0.01}
            />
            <P
              label="Prev KIA Saved"
              value={pks}
              onChange={setPks}
              min={0}
              max={1}
              step={0.05}
            />
          </Sec>
          <Sec title="Care Chain" color="#f97316">
            <P
              label="R1 DOW"
              value={d1}
              onChange={setD1}
              min={0}
              max={0.5}
              step={0.01}
            />
            <P
              label="R1 RTD"
              value={t1}
              onChange={setT1}
              min={0}
              max={0.5}
              step={0.01}
            />
            <P
              label="R2 DOW"
              value={d2}
              onChange={setD2}
              min={0}
              max={0.5}
              step={0.01}
            />
            <P
              label="R2 RTD"
              value={t2}
              onChange={setT2}
              min={0}
              max={0.5}
              step={0.01}
            />
            <P
              label="R3 DOW"
              value={d3}
              onChange={setD3}
              min={0}
              max={0.5}
              step={0.01}
            />
            <P
              label="R3 RTD"
              value={t3}
              onChange={setT3}
              min={0}
              max={0.5}
              step={0.01}
            />
            <P
              label="R3 LOS (cycles)"
              value={los}
              onChange={setLos}
              min={1}
              max={10}
              step={1}
            />
            <P
              label="R3 Disch→RTD %"
              value={drf}
              onChange={setDrf}
              min={0}
              max={1}
              step={0.05}
            />
          </Sec>
          <Sec title="DNBI" color="#eab308" open={false}>
            <P
              label="RTD <72hr %"
              value={dr}
              onChange={setDr}
              min={0}
              max={1}
              step={0.05}
            />
            <P
              label="Minor Care %"
              value={dm}
              onChange={setDm}
              min={0}
              max={1}
              step={0.01}
            />
            <P
              label="→ R3 %"
              value={d3r}
              onChange={setD3r}
              min={0}
              max={1}
              step={0.05}
            />
            <P
              label="→ Evac %"
              value={de}
              onChange={setDe}
              min={0}
              max={0.5}
              step={0.01}
            />
            <P
              label="DOW %"
              value={dd}
              onChange={setDd}
              min={0}
              max={0.1}
              step={0.005}
            />
          </Sec>
          <Sec title="Overflow & Position" color="#a855f7" open={false}>
            <P
              label="Overcap DOW ×"
              value={dm2}
              onChange={setDm2}
              min={1}
              max={5}
              step={0.1}
            />
            <P
              label="Overcap RTD ×"
              value={rrd}
              onChange={setRrd}
              min={0.1}
              max={1}
              step={0.05}
            />
            <P
              label="R2 Distance"
              value={r2d}
              onChange={setR2d}
              min={1}
              max={20}
              step={0.5}
              suffix="km"
            />
            <P
              label="Long-Stay Mort"
              value={lsm}
              onChange={setLsm}
              min={0}
              max={0.2}
              step={0.005}
              suffix="/cyc"
            />
          </Sec>
        </div>

        {/* Charts */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "10px 16px",
            background: "#050810",
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#c8d1de",
                marginBottom: 6,
              }}
            >
              PER-CYCLE RATES{" "}
              <span style={{ fontSize: 8, color: "#3d4654", fontWeight: 400 }}>
                — drag nodes
              </span>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <DragCurve
                values={cs}
                onChange={setCs}
                label="Casualty Rate"
                min={0}
                max={0.4}
                step={0.005}
                color="#ef4444"
                numCycles={nc}
              />
              <DragCurve
                values={ds}
                onChange={setDs}
                label="DNBI Rate"
                min={0}
                max={0.1}
                step={0.002}
                color="#eab308"
                numCycles={nc}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 2, marginBottom: 10 }}>
            {[
              { id: "population", l: "Population" },
              { id: "flow", l: "Per-Cycle" },
              { id: "care", l: "R1 / R2 / R3" },
              { id: "dow", l: "DOW Breakdown" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "4px 10px",
                  fontSize: 9.5,
                  fontWeight: 600,
                  background: tab === t.id ? "#12171f" : "transparent",
                  color: tab === t.id ? "#c8d1de" : "#3d4654",
                  border: `1px solid ${
                    tab === t.id ? "#1a2030" : "transparent"
                  }`,
                  borderRadius: 3,
                  cursor: "pointer",
                }}
              >
                {t.l}
              </button>
            ))}
          </div>

          <div
            style={{
              background: "#070a0f",
              borderRadius: 5,
              border: "1px solid #12171f",
              padding: "10px 4px 4px 0",
            }}
          >
            {tab === "population" && (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={popD}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#12171f" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 8, fill: "#3d4654" }}
                  />
                  <YAxis
                    tick={{ fontSize: 8, fill: "#3d4654" }}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                    }
                  />
                  <Tooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize: 8 }} />
                  <Area
                    type="monotone"
                    dataKey="Active"
                    stackId="1"
                    stroke={C.active}
                    fill={C.active}
                    fillOpacity={0.45}
                  />
                  <Area
                    type="monotone"
                    dataKey="R1"
                    stackId="1"
                    stroke={C.r1}
                    fill={C.r1}
                    fillOpacity={0.45}
                  />
                  <Area
                    type="monotone"
                    dataKey="R3 Beds"
                    stackId="1"
                    stroke={C.r3}
                    fill={C.r3}
                    fillOpacity={0.45}
                  />
                  <Area
                    type="monotone"
                    dataKey="Evac Queue"
                    stackId="1"
                    stroke={C.evac}
                    fill={C.evac}
                    fillOpacity={0.45}
                  />
                  <Area
                    type="monotone"
                    dataKey="Evacuated"
                    stackId="1"
                    stroke={C.evacuated}
                    fill={C.evacuated}
                    fillOpacity={0.45}
                  />
                  <Area
                    type="monotone"
                    dataKey="Died (DOW)"
                    stackId="1"
                    stroke={C.dow}
                    fill={C.dow}
                    fillOpacity={0.45}
                  />
                  <Area
                    type="monotone"
                    dataKey="Died (KIA)"
                    stackId="1"
                    stroke={C.kia}
                    fill={C.kia}
                    fillOpacity={0.45}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
            {tab === "flow" && (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={flowD}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#12171f" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 8, fill: "#3d4654" }}
                  />
                  <YAxis
                    tick={{ fontSize: 8, fill: "#3d4654" }}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                    }
                  />
                  <Tooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize: 8 }} />
                  <Bar
                    dataKey="Casualties"
                    fill={C.cas}
                    fillOpacity={0.55}
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="DNBI"
                    fill={C.dnbi}
                    fillOpacity={0.55}
                    radius={[2, 2, 0, 0]}
                  />
                  <Line
                    type="monotone"
                    dataKey="RTD"
                    stroke={C.rtd}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="KIA"
                    stroke={C.kia}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="DOW"
                    stroke={C.dow}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
            {tab === "care" && (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={careD}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#12171f" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 8, fill: "#3d4654" }}
                  />
                  <YAxis
                    tick={{ fontSize: 8, fill: "#3d4654" }}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                    }
                  />
                  <Tooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize: 8 }} />
                  <Area
                    type="monotone"
                    dataKey="R1 Patients"
                    stroke={C.r1}
                    fill={C.r1}
                    fillOpacity={0.15}
                  />
                  <Area
                    type="monotone"
                    dataKey="R2 Patients"
                    stroke={C.r2}
                    fill={C.r2}
                    fillOpacity={0.15}
                  />
                  <Area
                    type="monotone"
                    dataKey="R3 Occupied"
                    stroke={C.r3}
                    fill={C.r3}
                    fillOpacity={0.15}
                  />
                  <Area
                    type="monotone"
                    dataKey="Evac Queue"
                    stroke={C.evac}
                    fill={C.evac}
                    fillOpacity={0.15}
                  />
                  <Line
                    type="stepAfter"
                    dataKey="R1 Cap"
                    stroke={C.r1}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    dot={false}
                  />
                  <Line
                    type="stepAfter"
                    dataKey="R2 Cap"
                    stroke={C.r2}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    dot={false}
                  />
                  <Line
                    type="stepAfter"
                    dataKey="R3 Cap"
                    stroke={C.r3}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
            {tab === "dow" && (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dowD}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#12171f" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 8, fill: "#3d4654" }}
                  />
                  <YAxis tick={{ fontSize: 8, fill: "#3d4654" }} />
                  <Tooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize: 8 }} />
                  <Area
                    type="monotone"
                    dataKey="R1 DOW"
                    stackId="1"
                    stroke={C.r1}
                    fill={C.r1}
                    fillOpacity={0.45}
                  />
                  <Area
                    type="monotone"
                    dataKey="R2 DOW"
                    stackId="1"
                    stroke={C.r2}
                    fill={C.r2}
                    fillOpacity={0.45}
                  />
                  <Area
                    type="monotone"
                    dataKey="R3 DOW"
                    stackId="1"
                    stroke={C.r3}
                    fill={C.r3}
                    fillOpacity={0.45}
                  />
                  <Area
                    type="monotone"
                    dataKey="Long-Stay"
                    stackId="1"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.45}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Table */}
          <div style={{ marginTop: 14, overflowX: "auto", paddingBottom: 16 }}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "#5a6474",
                marginBottom: 4,
                letterSpacing: 1,
              }}
            >
              CYCLE DATA
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 9.5,
                fontFamily: "monospace",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #12171f" }}>
                  {[
                    "Day",
                    "Active",
                    "Cas",
                    "KIA",
                    "DOW",
                    "RTD",
                    "R1",
                    "R2",
                    "R3 occ",
                    "Evac",
                    "EvacQ",
                    "DNBI",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "2px 5px",
                        textAlign: "right",
                        color: "#3d4654",
                        fontWeight: 600,
                        fontSize: 8,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #080b12" }}>
                    {[
                      [r.day, "#5a6474"],
                      [r.active_pop, C.active],
                      [r.total_cas, "#c8d1de"],
                      [r.kia, C.kia],
                      [r.dow, C.dow],
                      [r.rtd, C.rtd],
                      [r.r1_pts, C.r1],
                      [r.r2_pts, C.r2],
                      [r.r3_occ, C.r3],
                      [r.evacuated, C.evacuated],
                      [r.evac_pool, C.evac],
                      [r.dnbi, C.dnbi],
                    ].map(([v, c], j) => (
                      <td
                        key={j}
                        style={{
                          padding: "2px 5px",
                          textAlign: "right",
                          color: c,
                        }}
                      >
                        {v.toLocaleString()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
