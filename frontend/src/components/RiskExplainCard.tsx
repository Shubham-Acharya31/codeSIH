import React from 'react';
import { ShieldAlert, ShieldCheck, Thermometer, Clock, DollarSign, Truck, Train } from 'lucide-react';
import { ShipmentPlanDetail, Shipment } from '../types';
import { ClassificationBadge } from './ClassificationBadge';
import { formatINR, formatHours } from '../utils/formatters';

interface RiskExplainCardProps {
  detail: ShipmentPlanDetail;
  shipment?: Shipment;
  isSimulatedExcursion?: boolean;
  onToggleExcursion?: () => void;
}

export const RiskExplainCard: React.FC<RiskExplainCardProps> = ({
  detail,
  shipment,
  isSimulatedExcursion = false,
  onToggleExcursion
}) => {
  const isClassA = shipment?.shipment_class === 'A';
  const isVaccines = shipment?.shipment_id === 'SHP-003';
  const isBreached = detail.risk_score >= 1.0 || detail.breakdown.includes('Hard Breach');

  return (
    <div className={`p-5 rounded-xl border transition-all ${
      isBreached
        ? 'bg-red-50/70 border-red-300 shadow-xs'
        : isClassA
        ? 'bg-white border-blue-200 hover:border-blue-300 shadow-2xs'
        : 'bg-white border-amber-200 hover:border-amber-300 shadow-2xs'
    }`}>
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-500">{detail.shipment_id}</span>
            <h3 className="font-bold text-slate-900 text-base">
              {shipment?.product_category || 'Consignment Cargo'}
            </h3>
            {shipment && (
              <ClassificationBadge
                shipmentClass={shipment.shipment_class}
                subtype={shipment.class_a?.product_subtype}
                size="sm"
              />
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {detail.route_description}
          </p>
        </div>

        {/* Selected Transport Mode Badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
          detail.selected_mode === 'rail'
            ? 'bg-purple-100 text-purple-800 border border-purple-200'
            : 'bg-blue-100 text-blue-800 border border-blue-200'
        }`}>
          {detail.selected_mode === 'rail' ? <Train className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
          <span>{detail.selected_mode === 'rail' ? 'Multimodal Rail' : 'Direct Road'}</span>
        </div>
      </div>

      {/* Risk Metric & Visual Bar */}
      <div className="my-4">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
            {isBreached ? (
              <ShieldAlert className="w-4 h-4 text-red-600" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            )}
            <span>Risk Score:</span>
          </span>
          <span className={`font-mono text-sm font-bold ${
            isBreached ? 'text-red-600' : 'text-slate-900'
          }`}>
            {(detail.risk_score * 100).toFixed(1)}% {isBreached && '(CRITICAL BREACH)'}
          </span>
        </div>
        
        {/* Horizontal Progress Bar */}
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isBreached
                ? 'bg-red-500'
                : isClassA
                ? 'bg-blue-600'
                : 'bg-amber-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(2, detail.risk_score * 100))}%` }}
          />
        </div>
      </div>

      {/* Literal Formula Monospace Substituted Breakdown */}
      <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-xs mb-4 leading-relaxed overflow-x-auto shadow-inner">
        <span className="text-slate-400 block text-[10px] uppercase tracking-wider mb-1">
          Exact Deterministic Calculation:
        </span>
        <code className="text-emerald-400 selection:bg-emerald-800">{detail.breakdown}</code>
      </div>

      {/* Metrics Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
        <div>
          <span className="text-slate-500 block">Freight Cost</span>
          <span className="font-semibold text-slate-800">{formatINR(detail.freight_cost)}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Expected Loss</span>
          <span className={`font-bold ${isBreached ? 'text-red-600' : 'text-slate-900'}`}>
            {formatINR(detail.expected_loss)}
          </span>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-slate-500 block">Transit Time</span>
          <span className="font-semibold text-slate-800">{formatHours(detail.transit_time_hr)}</span>
        </div>
      </div>

      {/* Interactive Excursion Simulation Toggle for Vaccines */}
      {isVaccines && onToggleExcursion && (
        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between bg-blue-50/50 p-2.5 rounded-lg">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-blue-600" />
            <div>
              <span className="text-xs font-semibold text-slate-800 block">Cold-Chain Temperature Excursion</span>
              <span className="text-[11px] text-slate-500">
                {isSimulatedExcursion ? 'Excursion Active (14°C > 8°C Max)' : 'Normal Band (2°C - 8°C)'}
              </span>
            </div>
          </div>
          <button
            onClick={onToggleExcursion}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition shadow-xs ${
              isSimulatedExcursion
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSimulatedExcursion ? 'Reset to Safe Temp' : 'Simulate Excursion'}
          </button>
        </div>
      )}
    </div>
  );
};
