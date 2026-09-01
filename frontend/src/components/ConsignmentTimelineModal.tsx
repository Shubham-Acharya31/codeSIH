import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  Train,
  MapPin,
  Clock,
  Thermometer,
  AlertTriangle,
  CheckCircle2,
  Radio,
  Play,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  Zap,
  Building2,
  PackageCheck
} from 'lucide-react';
import { Shipment, TimelineEvent } from '../types';
import { fetchTimeline, advanceTimeline, simulateSpike, dispatchShipment } from '../api/client';
import { formatINR, formatDate } from '../utils/formatters';
import { ClassificationBadge } from './ClassificationBadge';

interface ConsignmentTimelineModalProps {
  shipment: Shipment;
  onClose: () => void;
  onShipmentUpdated?: (updated: Shipment) => void;
}

export const ConsignmentTimelineModal: React.FC<ConsignmentTimelineModalProps> = ({
  shipment,
  onClose,
  onShipmentUpdated,
}) => {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>(shipment.status || 'PENDING');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'info' | 'success' | 'alert' } | null>(null);

  const isClassA = shipment.shipment_class === 'A';
  const isClassB = shipment.shipment_class === 'B';

  const loadTimelineData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchTimeline(shipment.shipment_id);
      setTimeline(data);
    } catch (err) {
      console.error('Failed to load timeline:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTimelineData();
  }, [shipment.shipment_id]);

  const handleAdvanceStep = async () => {
    setIsActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await advanceTimeline(shipment.shipment_id);
      if (res && res.timeline) {
        setTimeline(res.timeline);
        setCurrentStatus(res.status);
        setStatusMessage({ text: `Checkpoint advanced! Status: ${res.status}`, type: 'success' });
        if (onShipmentUpdated) {
          onShipmentUpdated({ ...shipment, status: res.status as any });
        }
      }
    } catch (err: any) {
      console.error('Failed to advance timeline:', err);
      setStatusMessage({ text: err.message || 'Failed to advance checkpoint.', type: 'alert' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSimulateSpike = async () => {
    setIsActionLoading(true);
    setStatusMessage(null);
    const spikeTemp = isClassA && shipment.class_a ? shipment.class_a.temperature_max + 6.5 : 15.5;
    try {
      const res = await simulateSpike(shipment.shipment_id, spikeTemp);
      if (res && res.timeline) {
        setTimeline(res.timeline);
        setCurrentStatus(res.status);
        setStatusMessage({
          text: `IoT Excursion Alert Triggered! Simulated temperature spike to ${spikeTemp.toFixed(1)}°C.`,
          type: 'alert'
        });
        if (onShipmentUpdated) {
          onShipmentUpdated({ ...shipment, status: res.status as any });
        }
      }
    } catch (err: any) {
      console.error('Failed to simulate spike:', err);
      setStatusMessage({ text: err.message || 'Failed to simulate excursion.', type: 'alert' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleQuickDispatch = async () => {
    setIsActionLoading(true);
    setStatusMessage(null);
    try {
      const newTimeline = await dispatchShipment(shipment.shipment_id);
      setTimeline(newTimeline);
      setCurrentStatus('IN_TRANSIT');
      setStatusMessage({ text: 'Consignment successfully dispatched into active transit corridor!', type: 'success' });
      if (onShipmentUpdated) {
        onShipmentUpdated({ ...shipment, status: 'IN_TRANSIT' });
      }
    } catch (err: any) {
      console.error('Failed to dispatch shipment:', err);
      setStatusMessage({ text: err.message || 'Failed to dispatch shipment.', type: 'alert' });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Extract latest temperature reading or excursion alert
  const activeEvent = timeline.find((e) => e.status === 'ACTIVE') || timeline[timeline.length - 1];
  const hasExcursion = currentStatus === 'EXCURSION' || timeline.some((e) => e.event_type === 'EXCURSION_ALERT');

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800">
                {shipment.shipment_id}
              </span>
              <h2 className="text-xl font-bold tracking-tight text-white">{shipment.product_category}</h2>
              <ClassificationBadge shipmentClass={shipment.shipment_class} subtype={shipment.class_a?.product_subtype} size="sm" />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-300 mt-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>{shipment.origin}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span>{shipment.destination}</span>
              <span className="text-slate-500">&bull;</span>
              <span>{shipment.weight_kg.toLocaleString()} kg</span>
              <span className="text-slate-500">&bull;</span>
              <span>{formatINR(shipment.cargo_value)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right sm:block hidden">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Live Status</span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                hasExcursion
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : currentStatus === 'DELIVERED'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : currentStatus === 'IN_TRANSIT' || currentStatus === 'DISPATCHED'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  : 'bg-slate-700 text-slate-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  hasExcursion ? 'bg-red-500 animate-pulse' : currentStatus === 'IN_TRANSIT' ? 'bg-blue-400 animate-ping' : 'bg-emerald-400'
                }`} />
                {currentStatus.replace('_', ' ')}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Status Notification */}
        {statusMessage && (
          <div className={`py-2 px-6 text-xs font-semibold flex items-center justify-between ${
            statusMessage.type === 'alert'
              ? 'bg-red-50 text-red-800 border-b border-red-200'
              : statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
              : 'bg-blue-50 text-blue-800 border-b border-blue-200'
          }`}>
            <div className="flex items-center gap-2">
              {statusMessage.type === 'alert' ? (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Telematics Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
          {/* Telemetry Block 1: Cold Chain or SLA */}
          {isClassA && shipment.class_a && (
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-blue-600" />
                  IoT Reefer Sensor
                </span>
                <span className="font-mono text-[11px] font-bold text-slate-700">
                  Target: {shipment.class_a.temperature_min}°C to {shipment.class_a.temperature_max}°C
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-xl font-extrabold font-mono ${hasExcursion ? 'text-red-600' : 'text-blue-600'}`}>
                  {hasExcursion ? '16.5°C' : `${((shipment.class_a.temperature_min + shipment.class_a.temperature_max) / 2).toFixed(1)}°C`}
                </span>
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  hasExcursion ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {hasExcursion ? 'Excursion Detected' : 'Envelope Compliant'}
                </span>
              </div>
            </div>
          )}

          {isClassB && shipment.class_b && (
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  Contractual SLA
                </span>
                <span className="font-mono text-[11px] font-bold text-slate-700">
                  Penalty: {(shipment.class_b.delay_penalty_rate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold font-mono text-emerald-600">On-Time</span>
                <span className="text-xs text-slate-500 font-medium">
                  {shipment.class_b.sla_strict ? 'Strict SLA Guarantee' : 'Standard Buffer'}
                </span>
              </div>
            </div>
          )}

          {/* Telemetry Block 2: Active Carrier */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
              <Train className="w-3.5 h-3.5 text-indigo-600" />
              Active Haulage Carrier
            </span>
            <div className="text-xs font-bold text-slate-900 truncate">
              {activeEvent?.carrier_details || 'Dedicated Intermodal Corridor Service'}
            </div>
            <span className="text-[11px] text-slate-400">Telemetry Pings: Active 5-min intervals</span>
          </div>

          {/* Telemetry Block 3: Target ETA */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              Contractual Deadline
            </span>
            <div className="text-xs font-bold text-slate-900">
              {formatDate(shipment.deadline)}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold">Zero transit breach predicted</span>
          </div>
        </div>

        {/* Interactive Stepper & Timeline Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Corridor Progression Milestones ({timeline.length} events)
            </h3>
            <button
              onClick={loadTimelineData}
              disabled={isLoading}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Log</span>
            </button>
          </div>

          {/* Timeline Milestones Vertical List */}
          <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {timeline.map((event, idx) => {
              const isCompleted = event.status === 'COMPLETED';
              const isActive = event.status === 'ACTIVE';
              const isAlert = event.status === 'ALERT';

              return (
                <div key={event.id || idx} className="relative group">
                  {/* Step Marker */}
                  <div className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isAlert
                      ? 'bg-red-500 border-red-200 text-white ring-4 ring-red-100 shadow-md'
                      : isCompleted
                      ? 'bg-emerald-500 border-emerald-200 text-white shadow-xs'
                      : isActive
                      ? 'bg-blue-600 border-white text-white ring-4 ring-blue-100 shadow-md animate-pulse'
                      : 'bg-white border-slate-300 text-slate-400'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : isAlert ? (
                      <AlertTriangle className="w-3 h-3" />
                    ) : isActive ? (
                      <Radio className="w-3 h-3" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    )}
                  </div>

                  {/* Card Body */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    isAlert
                      ? 'bg-red-50/70 border-red-300 ring-1 ring-red-200 shadow-sm'
                      : isActive
                      ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-100 shadow-sm'
                      : isCompleted
                      ? 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                      : 'bg-slate-50/50 border-slate-200 text-slate-400'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${isAlert ? 'text-red-900' : isActive ? 'text-blue-900' : 'text-slate-900'}`}>
                          {event.title}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          isAlert
                            ? 'bg-red-200 text-red-800'
                            : isCompleted
                            ? 'bg-emerald-100 text-emerald-700'
                            : isActive
                            ? 'bg-blue-200 text-blue-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {event.status}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        {event.timestamp ? formatDate(event.timestamp) : ''}
                      </span>
                    </div>

                    <p className={`text-xs leading-relaxed mb-3 ${isAlert ? 'text-red-800' : isActive ? 'text-slate-700 font-medium' : 'text-slate-600'}`}>
                      {event.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-slate-100/80 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1 font-medium text-slate-700">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{event.location}</span>
                      </div>
                      {event.temperature_c !== null && event.temperature_c !== undefined && (
                        <div className="flex items-center gap-1 font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          <Thermometer className="w-3 h-3" />
                          <span>Sensor: {event.temperature_c.toFixed(1)}°C</span>
                        </div>
                      )}
                      {event.carrier_details && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <Truck className="w-3 h-3 text-slate-400" />
                          <span>{event.carrier_details}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer with Live Interactive Controls */}
        <div className="p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Interactive Corridor Controls:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {currentStatus === 'PENDING' && (
              <button
                onClick={handleQuickDispatch}
                disabled={isActionLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Dispatch Consignment Now</span>
              </button>
            )}

            {currentStatus !== 'DELIVERED' && currentStatus !== 'PENDING' && (
              <button
                onClick={handleAdvanceStep}
                disabled={isActionLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Advance Checkpoint</span>
              </button>
            )}

            {isClassA && currentStatus !== 'DELIVERED' && (
              <button
                onClick={handleSimulateSpike}
                disabled={isActionLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-red-200 bg-red-50/50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>Simulate Temperature Spike</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
