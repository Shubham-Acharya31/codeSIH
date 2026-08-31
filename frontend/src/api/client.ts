/// <reference types="vite/client" />
import axios from 'axios';
import { Shipment, PlanResponse, CheckpointsData } from '../types';
import { MOCK_SHIPMENTS, MOCK_PLANS, MOCK_CHECKPOINTS } from '../mocks/fixtures';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function fetchCheckpoints(): Promise<CheckpointsData> {
  try {
    const res = await apiClient.get<CheckpointsData>('/api/v1/checkpoints');
    return res.data;
  } catch (err) {
    console.warn('Backend unavailable, using static checkpoints fallback:', err);
    return MOCK_CHECKPOINTS;
  }
}

export async function fetchSeedShipments(): Promise<Shipment[]> {
  try {
    const res = await apiClient.get<Shipment[]>('/api/v1/seed-demo');
    return res.data;
  } catch (err) {
    console.warn('Backend unavailable, using mock seed shipments fallback:', err);
    return MOCK_SHIPMENTS;
  }
}

export async function generatePlan(payload: {
  shipment_ids?: string[];
  custom_shipments?: any[];
  simulated_temp_c?: number;
}): Promise<PlanResponse> {
  try {
    const res = await apiClient.post<PlanResponse>('/api/v1/plan', payload);
    return res.data;
  } catch (err: any) {
    console.warn('Backend plan generation error, evaluating local fallback:', err);
    
    // Check if excursion is simulated on mock data
    const simTemp = payload.simulated_temp_c;
    if (simTemp !== undefined && simTemp > 8.0) {
      const excursionPlans = JSON.parse(JSON.stringify(MOCK_PLANS));
      excursionPlans.forEach((plan: any) => {
        const v = plan.shipment_details.find((s: any) => s.shipment_id === 'SHP-003');
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
