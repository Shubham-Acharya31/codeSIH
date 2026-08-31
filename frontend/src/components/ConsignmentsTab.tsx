import React, { useState } from 'react';
import { Package, PlusCircle, CheckSquare, Square, ArrowRight, Truck, Train, Calendar, DollarSign, Weight, Box } from 'lucide-react';
import { Shipment, CheckpointsData } from '../types';
import { ClassificationBadge } from './ClassificationBadge';
import { formatINR, formatDate } from '../utils/formatters';
import { ShipmentIntakeForm } from './ShipmentIntakeForm';

interface ConsignmentsTabProps {
  shipments: Shipment[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onRunOptimization: () => void;
  onAddCustomShipment: (shipment: Shipment) => void;
  checkpointsData: CheckpointsData;
  isLoading?: boolean;
}

export const ConsignmentsTab: React.FC<ConsignmentsTabProps> = ({
  shipments,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onRunOptimization,
  onAddCustomShipment,
  checkpointsData,
  isLoading = false
}) => {
  const [showIntakeModal, setShowIntakeModal] = useState(false);

  const allSelected = shipments.length > 0 && selectedIds.length === shipments.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Controls Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Active Consignments Intake</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select consignments to feed into the OR-Tools multimodal consolidation solver ({selectedIds.length}/{shipments.length} selected).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            {allSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-slate-400" />}
            <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
          </button>

          <button
            onClick={() => setShowIntakeModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-50 transition"
          >
            <PlusCircle className="w-4 h-4 text-blue-600" />
            <span>Add Consignment</span>
          </button>

          <button
            onClick={onRunOptimization}
            disabled={selectedIds.length === 0 || isLoading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-sm ${
              selectedIds.length === 0 || isLoading
                ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                : 'bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-blue-500/20'
            }`}
          >
            <span>{isLoading ? 'Solving Plans...' : `Consolidate ${selectedIds.length} Consignments`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Shipment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {shipments.map((s) => {
          const isSelected = selectedIds.includes(s.shipment_id);
          const isClassA = s.shipment_class === 'A';

          return (
            <div
              key={s.shipment_id}
              onClick={() => onToggleSelect(s.shipment_id)}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                isSelected
                  ? isClassA
                    ? 'bg-blue-50/40 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-amber-50/40 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              {/* Checkbox badge */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="font-mono text-xs font-bold text-slate-500">
                  {s.shipment_id}
                </span>
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                  isSelected
                    ? isClassA
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-amber-600 border-amber-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}>
                  {isSelected && <CheckSquare className="w-3.5 h-3.5" />}
                </div>
              </div>

              {/* Product Title & Class Badge */}
              <div className="mb-3">
                <h3 className="font-bold text-slate-900 text-base leading-snug">
                  {s.product_category}
                </h3>
                <div className="mt-1.5 flex items-center gap-2">
                  <ClassificationBadge
                    shipmentClass={s.shipment_class}
                    subtype={s.class_a?.product_subtype}
                    size="sm"
                  />
                  {s.class_b?.sla_strict && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                      Strict SLA
                    </span>
                  )}
                </div>
              </div>

              {/* Route corridor */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 mb-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span>{s.origin}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span>{s.destination}</span>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs text-slate-600 mb-4">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  <span>Value: <strong className="text-slate-900">{formatINR(s.cargo_value)}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Weight className="w-3.5 h-3.5 text-slate-400" />
                  <span>Weight: <strong className="text-slate-900">{s.weight_kg.toLocaleString()} kg</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-slate-400" />
                  <span>Vol: <strong className="text-slate-900">{s.volume_m3} m³</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Due: <strong className="text-slate-900">{formatDate(s.deadline)}</strong></span>
                </div>
              </div>

              {/* Domain Physics Indicator */}
              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                {isClassA && s.class_a && (
                  <div className="flex items-center justify-between">
                    <span>Temp Safe Band:</span>
                    <span className="font-mono font-semibold text-blue-700">
                      {s.class_a.temperature_min}°C to {s.class_a.temperature_max}°C (Q10={s.class_a.q10})
                    </span>
                  </div>
                )}
                {!isClassA && s.class_b && (
                  <div className="flex items-center justify-between">
                    <span>Delay Penalty Rate:</span>
                    <span className="font-mono font-semibold text-amber-700">
                      {(s.class_b.delay_penalty_rate * 100).toFixed(1)}% of value
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showIntakeModal && (
        <ShipmentIntakeForm
          checkpointsData={checkpointsData}
          onAddShipment={onAddCustomShipment}
          onClose={() => setShowIntakeModal(false)}
        />
      )}
    </div>
  );
};
