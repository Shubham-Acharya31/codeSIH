/// <reference types="vite/client" />
import axios from 'axios';
import {
  Shipment,
  PlanResponse,
  CheckpointsData,
  ConfigResponse,
  CheckpointInput,
  OptimizationScenarioInput
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
    // If backend returned a structured HTTP response with validation or logic error, throw it so UI can display it
    if (err.response && err.response.data) {
      const serverDetail = err.response.data.detail || err.response.data.error || 'Server rejected plan request';
      console.error('Backend plan generation error:', serverDetail, err.response.data);
      throw new Error(typeof serverDetail === 'string' ? serverDetail : JSON.stringify(serverDetail));
    }

    // Only fallback if backend is completely offline / unreachable
    console.warn('Backend network failure, evaluating offline demo fallback:', err);
    
    // Check if excursion is simulated on mock data
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
