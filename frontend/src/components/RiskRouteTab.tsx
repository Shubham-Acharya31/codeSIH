import React, { useState } from 'react';
import { Send, CheckCircle2, ShieldCheck, MapPin, Compass, RotateCcw, AlertTriangle } from 'lucide-react';
import { CandidatePlan, Shipment, CheckpointsData, ShipmentPlanDetail } from '../types';
import { RiskExplainCard } from './RiskExplainCard';
import { RouteMap } from './RouteMap';
import { formatINR, formatHours } from '../utils/formatters';

interface RiskRouteTabProps {
  activePlan: CandidatePlan;
  shipments: Shipment[];
  checkpointsData: CheckpointsData;
  isSimulatedExcursion: boolean;
  onToggleExcursion: () => void;
}

export const RiskRouteTab: React.FC<RiskRouteTabProps> = ({
  activePlan,
  shipments,
  checkpointsData,
  isSimulatedExcursion,
  onToggleExcursion
}) => {
  const [selectedDetailIndex, setSelectedDetailIndex] = useState<number>(0);
  const [dispatchStatus, setDispatchStatus] = useState<'idle' | 'dispatching' | 'dispatched'>('idle');

  const activeDetail: ShipmentPlanDetail | undefined = activePlan.shipment_details[selectedDetailIndex] || activePlan.shipment_details[0];
  const activeShipment = shipments.find((s) => s.shipment_id === activeDetail?.shipment_id);

  const handleDispatch = () => {
    setDispatchStatus('dispatching');
    setTimeout(() => {
      setDispatchStatus('dispatched');
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Top Banner with Active Plan Summary & Dispatch CTA */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              PLAN: {activePlan.label.toUpperCase()}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              (α={activePlan.alpha}, β={activePlan.beta})
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Multimodal Corridor Scheduling &amp; Risk Physics
          </h2>
          <div className="flex flex-wrap gap-4 text-xs text-slate-600 mt-2">
            <span>Freight: <strong className="text-slate-900">{formatINR(activePlan.freight_cost)}</strong></span>
            <span>Expected Loss: <strong className="text-slate-900">{formatINR(activePlan.expected_loss)}</strong></span>
            <span>Total: <strong className="text-slate-900 font-mono">{formatINR(activePlan.total_cost)}</strong></span>
            <span>Max ETA: <strong className="text-slate-900">{formatHours(activePlan.eta_hr)}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {dispatchStatus === 'dispatched' ? (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-5 py-2.5 rounded-xl font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Consignment Plan Dispatched</span>
            </div>
          ) : (
            <button
              onClick={handleDispatch}
              disabled={dispatchStatus === 'dispatching'}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>
                {dispatchStatus === 'dispatching' ? 'Dispatching...' : `Dispatch ${activePlan.label} Plan`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left = Shipment Selection & Risk Breakdown Cards, Right = Route Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Shipment List and Risk Breakdown */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Select Consignment to Inspect Corridor &amp; Geometry:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {activePlan.shipment_details.map((d, idx) => {
                const isSelected = selectedDetailIndex === idx;
                const shp = shipments.find((s) => s.shipment_id === d.shipment_id);
                return (
                  <button
                    key={d.shipment_id}
                    onClick={() => setSelectedDetailIndex(idx)}
                    className={`p-2.5 rounded-lg border text-left text-xs transition ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold ring-1 ring-blue-500'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="font-mono text-[11px] block text-slate-500">{d.shipment_id}</span>
                    <span className="truncate block">{shp?.product_category || 'Cargo'}</span>
                    <span className="text-[10px] text-slate-400 capitalize block mt-0.5">
                      {d.selected_mode} | {formatINR(d.expected_loss)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Shipment Risk Explain Card */}
          {activeDetail && (
            <RiskExplainCard
              detail={activeDetail}
              shipment={activeShipment}
              isSimulatedExcursion={isSimulatedExcursion}
              onToggleExcursion={activeShipment?.shipment_id === 'SHP-003' ? onToggleExcursion : undefined}
            />
          )}

          {/* All other shipment cards mini-stack */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              All Active Plan Consignments:
            </h3>
            {activePlan.shipment_details.map((detail, idx) => {
              if (idx === selectedDetailIndex) return null;
              const shp = shipments.find((s) => s.shipment_id === detail.shipment_id);
              return (
                <RiskExplainCard
                  key={detail.shipment_id}
                  detail={detail}
                  shipment={shp}
                  isSimulatedExcursion={isSimulatedExcursion}
                  onToggleExcursion={shp?.shipment_id === 'SHP-003' ? onToggleExcursion : undefined}
                />
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Multimodal Route Map */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Active Route Geometry: {activeDetail?.shipment_id} ({activeShipment?.origin} → {activeShipment?.destination})
                </h3>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded capitalize ${
                activeDetail?.selected_mode === 'rail'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {activeDetail?.selected_mode} Candidate
              </span>
            </div>

            <RouteMap
              checkpointsData={checkpointsData}
              activeShipmentDetail={activeDetail}
              height="480px"
              isOverview={false}
            />

            {/* Transfer Node Indicator */}
            {activeDetail?.transfer_hubs && activeDetail.transfer_hubs.length > 0 && (
              <div className="mt-4 p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs">
                <span className="font-bold text-purple-900 block mb-1">
                  ⇄ Multimodal Transfer Nodes:
                </span>
                <p className="text-purple-800">
                  Cargo switches from road feeder to trunk rail at <strong className="font-semibold">{activeDetail.transfer_hubs.join(' & ')}</strong> with scheduled dwell buffers.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
