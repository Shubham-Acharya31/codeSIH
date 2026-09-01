import React, { useState, useMemo } from 'react';
import {
  Package,
  PlusCircle,
  CheckSquare,
  Square,
  ArrowRight,
  Truck,
  Train,
  Calendar,
  DollarSign,
  Weight,
  Box,
  Edit2,
  Trash2,
  Radio,
  Search,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter
} from 'lucide-react';
import { Shipment, CheckpointsData, ShipmentStatus } from '../types';
import { ClassificationBadge } from './ClassificationBadge';
import { formatINR, formatDate } from '../utils/formatters';
import { ShipmentIntakeForm } from './ShipmentIntakeForm';
import { ConsignmentTimelineModal } from './ConsignmentTimelineModal';

interface ConsignmentsTabProps {
  shipments: Shipment[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onRunOptimization: () => void;
  onAddCustomShipment: (shipment: Shipment) => void;
  onUpdateShipment: (shipment: Shipment) => void;
  onDeleteShipment: (id: string) => void;
  onResetSeed: () => void;
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
  onUpdateShipment,
  onDeleteShipment,
  onResetSeed,
  checkpointsData,
  isLoading = false
}) => {
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [trackingShipment, setTrackingShipment] = useState<Shipment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'EXCURSION'>('ALL');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filter shipments based on search query and status filter
  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.shipment_id.toLowerCase().includes(q) ||
        s.product_category.toLowerCase().includes(q) ||
        s.origin.toLowerCase().includes(q) ||
        s.destination.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const status = s.status || 'PENDING';
      if (selectedStatusFilter === 'ALL') return true;
      if (selectedStatusFilter === 'PENDING') return status === 'PENDING';
      if (selectedStatusFilter === 'IN_TRANSIT') return status === 'IN_TRANSIT' || status === 'DISPATCHED';
      if (selectedStatusFilter === 'DELIVERED') return status === 'DELIVERED';
      if (selectedStatusFilter === 'EXCURSION') return status === 'EXCURSION';
      return true;
    });
  }, [shipments, searchQuery, selectedStatusFilter]);

  const allSelected = filteredShipments.length > 0 && selectedIds.length === filteredShipments.length;

  const handleDeleteConfirm = (id: string) => {
    onDeleteShipment(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Controls Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Active Consignments Intake</h2>
            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
              SQLite Persistent
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage real stored consignments, run OR-Tools consolidation, and inspect live dispatched movement ({selectedIds.length}/{shipments.length} selected).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onResetSeed}
            title="Reset database to default seed shipments"
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Reset Seed</span>
          </button>

          <button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            {allSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-slate-400" />}
            <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
          </button>

          <button
            onClick={() => {
              setEditingShipment(null);
              setShowIntakeModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-50 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-blue-600" />
            <span>Add Consignment</span>
          </button>

          <button
            onClick={onRunOptimization}
            disabled={selectedIds.length === 0 || isLoading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-sm cursor-pointer ${
              selectedIds.length === 0 || isLoading
                ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
            }`}
          >
            <span>{isLoading ? 'Solving Plans...' : `Consolidate ${selectedIds.length} Consignments`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search and Status Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID, product category, origin, destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              &times;
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
          </span>
          {(['ALL', 'PENDING', 'IN_TRANSIT', 'DELIVERED', 'EXCURSION'] as const).map((st) => {
            const isActive = selectedStatusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setSelectedStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All' : st === 'IN_TRANSIT' ? 'In Transit' : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Shipment Cards Grid */}
      {filteredShipments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Consignments Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedStatusFilter !== 'ALL'
              ? 'No consignments match your active search or status filter. Try clearing filters.'
              : 'Your consignment database is empty. Click "Add Consignment" or "Reset Seed" to populate.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredShipments.map((s) => {
            const isSelected = selectedIds.includes(s.shipment_id);
            const isClassA = s.shipment_class === 'A';
            const status = s.status || 'PENDING';
            const isDispatched = status === 'IN_TRANSIT' || status === 'DISPATCHED';
            const isDelivered = status === 'DELIVERED';
            const isExcursion = status === 'EXCURSION';

            return (
              <div
                key={s.shipment_id}
                className={`p-5 rounded-2xl border-2 transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? isClassA
                      ? 'bg-blue-50/30 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                      : 'bg-amber-50/30 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div>
                  {/* Top Bar: ID, Status Badge & Selection Checkbox */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500">
                        {s.shipment_id}
                      </span>
                      {/* Status indicator */}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isExcursion
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : isDelivered
                          ? 'bg-emerald-100 text-emerald-800'
                          : isDispatched
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isExcursion
                            ? 'bg-red-600 animate-pulse'
                            : isDispatched
                            ? 'bg-blue-600 animate-ping'
                            : isDelivered
                            ? 'bg-emerald-600'
                            : 'bg-slate-400'
                        }`} />
                        {status.replace('_', ' ')}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelect(s.shipment_id);
                      }}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition cursor-pointer ${
                        isSelected
                          ? isClassA
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-amber-600 border-amber-600 text-white'
                          : 'border-slate-300 bg-white hover:border-slate-400'
                      }`}
                      title={isSelected ? 'Deselect consignment' : 'Select consignment'}
                    >
                      {isSelected && <CheckSquare className="w-3.5 h-3.5" />}
                    </button>
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
                  <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 mb-4">
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

                {/* Bottom Action Buttons Toolbar */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setTrackingShipment(s)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5 text-blue-600" />
                    <span>Track Timeline</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingShipment(s)}
                      className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                      title="Edit consignment details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(s.shipment_id)}
                      className="p-2 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 border border-slate-200 transition cursor-pointer"
                      title="Delete consignment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Intake / Edit Modal */}
      {(showIntakeModal || editingShipment) && (
        <ShipmentIntakeForm
          checkpointsData={checkpointsData}
          initialShipment={editingShipment}
          onAddShipment={onAddCustomShipment}
          onUpdateShipment={onUpdateShipment}
          onClose={() => {
            setShowIntakeModal(false);
            setEditingShipment(null);
          }}
        />
      )}

      {/* Live Dispatched Tracking Timeline Modal */}
      {trackingShipment && (
        <ConsignmentTimelineModal
          shipment={trackingShipment}
          onClose={() => setTrackingShipment(null)}
          onShipmentUpdated={(updated) => {
            onUpdateShipment(updated);
            setTrackingShipment(updated);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Delete Consignment?</h3>
            </div>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Are you sure you want to delete consignment <strong className="font-mono text-slate-800">{confirmDeleteId}</strong>? This will permanently remove it from the persistent SQLite database and clear its tracking history.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConfirm(confirmDeleteId)}
                className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition shadow-xs cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
