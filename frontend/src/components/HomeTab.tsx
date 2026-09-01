import React from 'react';
import { ArrowRight, Box, Layers, Zap, Clock, ShieldCheck, Compass, GitMerge, CheckCircle2 } from 'lucide-react';
import { CheckpointsData } from '../types';
import { RouteMap } from './RouteMap';

interface HomeTabProps {
  onStartPlanning: () => void;
  checkpointsData: CheckpointsData;
  totalConsignments: number;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  onStartPlanning,
  checkpointsData,
  totalConsignments
}) => {
  const hubsCount = checkpointsData.hubs?.length || 5;
  const totalCitiesCount = Object.keys(checkpointsData.checkpoints || {}).length || 20;
  const satellitesCount = checkpointsData.satellites?.length || Math.max(0, totalCitiesCount - hubsCount);

  const stats = [
    { label: 'Active Consignments', val: `${totalConsignments}`, sub: 'Active in batch' },
    { label: 'Cargo Classes', val: '2', sub: 'Class A & Class B' },
    { label: 'Transport Modes', val: '2', sub: 'Highway Road & Trunk Rail' },
    { label: 'Plan Candidates', val: '3', sub: 'Cheapest, Fastest, Balanced' },
    { label: 'Multimodal Hubs', val: `${hubsCount}`, sub: 'Central trunk network' },
    { label: 'Total Network Cities', val: `${totalCitiesCount}`, sub: `${hubsCount} Hubs + ${satellitesCount} Satellites` },
  ];

  const steps = [
    { num: '01', title: 'Ingest', desc: 'Batch shipment validation', icon: Box },
    { num: '02', title: 'Classify', desc: 'Q10 & SLA rule enrichment', icon: Layers },
    { num: '03', title: 'Route', desc: 'OSRM & 5-Hub topology', icon: Compass },
    { num: '04', title: 'Risk Score', desc: 'Deterministic physics loss', icon: ShieldCheck },
    { num: '05', title: 'Optimize', desc: 'OR-Tools CP-SAT multi-solve', icon: Zap },
    { num: '06', title: '3 Plans', desc: 'Cheapest, Fastest, Balanced', icon: GitMerge },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-8 md:p-10 shadow-lg border border-slate-700">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30 mb-4">
            <Zap className="w-3.5 h-3.5" />
            Deterministic Physics & Pure Mathematical Optimization
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            AI Multimodal Consignment Consolidation Engine
          </h1>
          <p className="text-slate-300 text-base md:text-lg mb-6 leading-relaxed">
            Eliminate spoilage and contractual delay penalties with multi-objective modal scheduling across India's 20-city multimodal freight network. Solved in &lt; 100ms with zero black-box heuristics.
          </p>
          <button
            onClick={onStartPlanning}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition shadow-md hover:shadow-blue-500/25 cursor-pointer focus:ring-4 focus:ring-blue-500/40"
          >
            <span>Start Planning Consignments</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stat Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((st, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-2xl md:text-3xl font-extrabold text-slate-900 font-mono block">
              {st.val}
            </span>
            <span className="text-xs font-bold text-slate-700 block mt-1">{st.label}</span>
            <span className="text-[11px] text-slate-400 block">{st.sub}</span>
          </div>
        ))}
      </div>

      {/* Class A vs Class B Explainer Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/50 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold">
            A
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-950">Class A (Perishable Cargo)</h3>
            <p className="text-xs text-blue-800 mt-1">
              Spoilage risk via continuous temperature × time Q10/Arrhenius physics. Medical vaccines enforce a hard-breach override (100% loss upon excursion).
            </p>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-amber-200 bg-amber-50/50 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 font-bold">
            B
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-950">Class B (Non-Perishable Cargo)</h3>
            <p className="text-xs text-amber-800 mt-1">
              Contractual economic delay loss computed as <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-900">Delay Prob × Cargo Value × Penalty Rate</code> using dimensionless fractions.
            </p>
          </div>
        </div>
      </div>

      {/* 20-City Network Topology Map Overview */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 mb-5 gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">20-City Network Topology Overview</h2>
            <p className="text-xs text-slate-500">
              5 Multimodal Rail Hubs (Indranagar, Himkot, Suryapatan, Chandanpalli, Meghdoot) &amp; 15 Road Satellite Towns
            </p>
          </div>
          <span className="text-xs font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full w-fit">
            5 Direct Trunk Rail Corridors Active
          </span>
        </div>
        <RouteMap checkpointsData={checkpointsData} height="420px" isOverview={true} />
      </div>

      {/* How it Works Step Row */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Autonomous 6-Stage Optimization Pipeline</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {steps.map((st, i) => {
            const Icon = st.icon;
            return (
              <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] font-mono font-bold text-slate-400 block mb-1">STAGE {st.num}</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-2">
                  <Icon className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">{st.title}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{st.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
