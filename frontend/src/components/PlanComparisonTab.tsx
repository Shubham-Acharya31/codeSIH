import React from 'react';
import { Check, Compass, DollarSign, Clock, Layers, ArrowRight, ShieldAlert, Zap } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { CandidatePlan } from '../types';
import { formatINR, formatHours } from '../utils/formatters';

interface PlanComparisonTabProps {
  plans: CandidatePlan[];
  activePlanIndex: number;
  onSelectPlan: (index: number) => void;
  onInspectRoute: (index: number) => void;
  onDispatchPlan?: (plan: CandidatePlan) => void;
  isDispatching?: boolean;
}

export const PlanComparisonTab: React.FC<PlanComparisonTabProps> = ({
  plans,
  activePlanIndex,
  onSelectPlan,
  onInspectRoute,
  onDispatchPlan,
  isDispatching = false
}) => {
  // Prepare data for Recharts Trade-off visualizer
  const chartData = plans.map((p) => ({
    name: p.label,
    "Freight Cost (INR)": p.freight_cost,
    "Expected Loss (INR)": p.expected_loss,
    "Total Cost (INR)": p.total_cost,
  }));

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-blue-50 text-blue-700">
                <Zap className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-bold text-slate-900">Multi-Objective Optimization Plans</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Google OR-Tools CP-SAT generated 3 Pareto-optimal trade-off scenarios on a unified mathematical solver model.
            </p>
          </div>
          <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            Solved in <strong className="text-slate-900 font-mono">{plans[0]?.solve_time_ms ? `${plans[0].solve_time_ms.toFixed(1)} ms` : '< 50 ms'}</strong>
          </div>
        </div>
      </div>

      {/* 3 Candidate Cards Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, idx) => {
          const isActive = activePlanIndex === idx;

          return (
            <div
              key={plan.label}
              className={`p-6 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-white border-blue-600 shadow-lg ring-2 ring-blue-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div>
                {/* Card Title & Alpha/Beta */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900">{plan.label}</h3>
                    <span className="text-xs text-slate-500 font-mono">
                      α = {plan.alpha.toFixed(2)} (Cost) | β = {plan.beta.toFixed(2)} (Risk)
                    </span>
                  </div>
                  {isActive && (
                    <span className="inline-flex items-center gap-1 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3" /> ACTIVE
                    </span>
                  )}
                </div>

                {/* Total Cost Highlight */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-5">
                  <span className="text-xs font-semibold text-slate-500 block">Total Combined Cost</span>
                  <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">
                    {formatINR(plan.total_cost)}
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Freight ({formatINR(plan.freight_cost)}) + Risk Loss ({formatINR(plan.expected_loss)})
                  </span>
                </div>

                {/* Key Metrics Breakdown */}
                <div className="space-y-3 text-xs mb-6">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      Direct Freight Cost:
                    </span>
                    <strong className="font-mono text-slate-900">{formatINR(plan.freight_cost, false)}</strong>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      Predicted Spoilage &amp; Delay Loss:
                    </span>
                    <strong className="font-mono text-slate-900">{formatINR(plan.expected_loss, false)}</strong>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-blue-600" />
                      Maximum Transit ETA:
                    </span>
                    <strong className="font-mono text-slate-900">{formatHours(plan.eta_hr)}</strong>
                  </div>
                </div>

                {/* Groupings Chips */}
                <div className="mb-6">
                  <span className="text-xs font-bold text-slate-700 block mb-2">Consolidation Batches:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.groupings.map((g, i) => (
                      <span
                        key={i}
                        className="text-[11px] bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-md font-medium"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                {onDispatchPlan && (
                  <button
                    onClick={() => onDispatchPlan(plan)}
                    disabled={isDispatching}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-emerald-200" />
                    <span>{isDispatching ? 'Dispatching to Network...' : `Dispatch Plan (${plan.shipment_details.length} Consignments)`}</span>
                  </button>
                )}

                <button
                  onClick={() => onSelectPlan(idx)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  {isActive ? 'Target Plan Selected' : 'Select This Scenario'}
                </button>

                <button
                  onClick={() => onInspectRoute(idx)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>Inspect Route &amp; Physics Breakdown</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Cost vs. Risk Trade-off Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <h3 className="text-base font-bold text-slate-900 mb-1">Cost vs. Risk Trade-off Comparison</h3>
        <p className="text-xs text-slate-500 mb-6">
          Direct Freight Cost (Blue) vs. Spoilage/Delay Economic Risk (Amber) across optimization weight scenarios.
        </p>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} />
              <YAxis
                tick={{ fill: '#475569', fontSize: 11 }}
                tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
              />
              <Tooltip
                formatter={(value: any) => [formatINR(Number(value), false), '']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="Freight Cost (INR)" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expected Loss (INR)" fill="#E28A2B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
