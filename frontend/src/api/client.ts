/// <reference types="vite/client" />
import axios from 'axios';
import {
  Shipment,
  PlanResponse,
  CheckpointsData,
  ConfigResponse,
  CheckpointInput,
  OptimizationScenarioInput,
  TimelineEvent,
  DispatchPlanPayload,
  DispatchPlanResponse,
  TimelineAdvanceResponse,
  SimulateSpikeResponse
} from '../types';
import { MOCK_SHIPMENTS, MOCK_PLANS, MOCK_CHECKPOINTS } from '../mocks/fixtures';
import { SYSTEM_CONFIG } from '../config/constants';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function fetchSystemConfig(): Promise<ConfigResponse | null> {
  try {
    const res = await apiClient.get<ConfigResponse>(SYSTEM_CONFIG.apiEndpoints.config);
    return res.data;
  } catch (err) {
    console.warn('Backend config unavailable, falling back to local SYSTEM_CONFIG:', err);
    return null;
  }
}

export async function fetchCheckpoints(): Promise<CheckpointsData> {
  try {
    const res = await apiClient.get<CheckpointsData>(SYSTEM_CONFIG.apiEndpoints.checkpoints);
    return res.data;
  } catch (err) {
    console.warn('Backend unavailable, using static checkpoints fallback:', err);
    return MOCK_CHECKPOINTS;
  }
}

export async function fetchSeedShipments(): Promise<Shipment[]> {
  try {
    const res = await apiClient.get<Shipment[]>(SYSTEM_CONFIG.apiEndpoints.seedDemo);
    return res.data;
  } catch (err) {
    console.warn('Backend unavailable, using mock seed shipments fallback:', err);
    return MOCK_SHIPMENTS;
  }
}

// -------------------------------------------------------------
// Persistent Consignment Storage & CRUD
// -------------------------------------------------------------

export async function fetchStoredShipments(): Promise<Shipment[]> {
  try {
    const res = await apiClient.get<Shipment[]>(SYSTEM_CONFIG.apiEndpoints.shipments);
    if (res.data && res.data.length > 0) {
      return res.data;
    }
    return await fetchSeedShipments();
  } catch (err) {
    console.warn('Failed fetching stored shipments from SQLite, using fallback:', err);
    return await fetchSeedShipments();
  }
}

export async function createShipment(shipment: Shipment): Promise<Shipment> {
  const res = await apiClient.post<Shipment>(SYSTEM_CONFIG.apiEndpoints.shipments, shipment);
  return res.data;
}

export async function updateShipment(shipmentId: string, shipment: Shipment): Promise<Shipment> {
  const res = await apiClient.put<Shipment>(`${SYSTEM_CONFIG.apiEndpoints.shipments}/${shipmentId}`, shipment);
  return res.data;
}

export async function deleteShipment(shipmentId: string): Promise<boolean> {
  const res = await apiClient.delete(`${SYSTEM_CONFIG.apiEndpoints.shipments}/${shipmentId}`);
  return res.data?.success ?? true;
}

export async function resetShipmentsToSeed(): Promise<Shipment[]> {
  const res = await apiClient.post<Shipment[]>(`${SYSTEM_CONFIG.apiEndpoints.shipments}/reset`);
  return res.data;
}

// -------------------------------------------------------------
// Tracking Timeline & Dispatch Management
// -------------------------------------------------------------

export async function fetchTimeline(shipmentId: string): Promise<TimelineEvent[]> {
  try {
    const res = await apiClient.get<TimelineEvent[]>(`${SYSTEM_CONFIG.apiEndpoints.shipments}/${shipmentId}/timeline`);
    return res.data;
  } catch (err) {
    console.warn(`Failed fetching live timeline for ${shipmentId}:`, err);
    return [
      {
        shipment_id: shipmentId,
        event_seq: 0,
        event_type: 'BOOKED',
        title: 'Consignment Booked & Intake Verified',
        description: 'Verified at origin station facility.',
        location: 'Origin Terminal',
        timestamp: new Date().toISOString(),
        status: 'COMPLETED'
      }
    ];
  }
}

export async function dispatchShipment(shipmentId: string): Promise<TimelineEvent[]> {
  const res = await apiClient.post<TimelineEvent[]>(`${SYSTEM_CONFIG.apiEndpoints.shipments}/${shipmentId}/dispatch`);
  return res.data;
}

export async function dispatchPlan(payload: DispatchPlanPayload): Promise<DispatchPlanResponse> {
  const res = await apiClient.post<DispatchPlanResponse>(`${SYSTEM_CONFIG.apiEndpoints.shipments}/dispatch-plan`, payload);
  return res.data;
}

export async function advanceTimeline(shipmentId: string): Promise<TimelineAdvanceResponse> {
  const res = await apiClient.post<TimelineAdvanceResponse>(`${SYSTEM_CONFIG.apiEndpoints.shipments}/${shipmentId}/timeline/advance`);
  return res.data;
}

export async function simulateSpike(shipmentId: string, tempC: number): Promise<SimulateSpikeResponse> {
  const res = await apiClient.post<SimulateSpikeResponse>(`${SYSTEM_CONFIG.apiEndpoints.shipments}/${shipmentId}/timeline/simulate-spike`, { temp_c: tempC });
  return res.data;
}

// -------------------------------------------------------------
// Planning Optimization
// -------------------------------------------------------------

export interface PlanPayload {
  shipment_ids?: string[];
  custom_shipments?: Shipment[];
  custom_checkpoints?: Record<string, CheckpointInput>;
  custom_scenarios?: OptimizationScenarioInput[];
  simulated_temp_c?: number;
}

export async function generatePlan(payload: PlanPayload): Promise<PlanResponse> {
  try {
    const res = await apiClient.post<PlanResponse>(SYSTEM_CONFIG.apiEndpoints.plan, payload);
    return res.data;
  } catch (err: any) {
    if (err.response && err.response.data) {
      const serverDetail = err.response.data.detail || err.response.data.error || 'Server rejected plan request';
      console.error('Backend plan generation error:', serverDetail, err.response.data);
      throw new Error(typeof serverDetail === 'string' ? serverDetail : JSON.stringify(serverDetail));
    }

    console.warn('Backend network failure, evaluating offline demo fallback:', err);
    
    const simTemp = payload.simulated_temp_c;
    if (simTemp !== undefined && simTemp > 8.0) {
      const excursionPlans = JSON.parse(JSON.stringify(MOCK_PLANS));
      excursionPlans.forEach((plan: any) => {
        const v = plan.shipment_details.find((s: any) =>
          s.shipment_id === 'SHP-003' || s.breakdown?.toLowerCase().includes('medical')
        );
        if (v) {
          v.risk_score = 1.0;
          v.expected_loss = 2500000.0;
          v.breakdown = `Medical Hard Breach Override: Temperature excursion (${simTemp.toFixed(1)}°C outside [2.0, 8.0]°C). Risk = 1.00 (100% loss). Expected Loss = ₹2,500,000.00`;
        }
        plan.expected_loss = plan.shipment_details.reduce((acc: number, s: any) => acc + s.expected_loss, 0);
        plan.total_cost = plan.freight_cost + plan.expected_loss;
      });
      return {
        success: true,
        total_shipments_processed: MOCK_SHIPMENTS.length,
        plans: excursionPlans,
        execution_time_ms: 45.0
      };
    }
    
    return {
      success: true,
      total_shipments_processed: MOCK_SHIPMENTS.length,
      plans: MOCK_PLANS,
      execution_time_ms: 50.0
    };
  }
}

