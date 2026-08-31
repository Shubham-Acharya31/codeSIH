import React, { useState, useEffect, useCallback } from 'react';
import { Header, TabType } from './components/Header';
import { HomeTab } from './components/HomeTab';
import { ConsignmentsTab } from './components/ConsignmentsTab';
import { PlanComparisonTab } from './components/PlanComparisonTab';
import { RiskRouteTab } from './components/RiskRouteTab';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Shipment, CandidatePlan, CheckpointsData } from './types';
import { fetchSeedShipments, fetchCheckpoints, generatePlan } from './api/client';
import { MOCK_SHIPMENTS, MOCK_PLANS, MOCK_CHECKPOINTS } from './mocks/fixtures';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [shipments, setShipments] = useState<Shipment[]>(MOCK_SHIPMENTS);
  const [selectedIds, setSelectedIds] = useState<string[]>(MOCK_SHIPMENTS.map((s) => s.shipment_id));
  const [checkpointsData, setCheckpointsData] = useState<CheckpointsData>(MOCK_CHECKPOINTS);
  const [plans, setPlans] = useState<CandidatePlan[]>(MOCK_PLANS);
  const [activePlanIndex, setActivePlanIndex] = useState<number>(0);
  const [isSimulatedExcursion, setIsSimulatedExcursion] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Initial load from backend API
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [loadedShipments, loadedCheckpoints] = await Promise.all([
          fetchSeedShipments(),
          fetchCheckpoints(),
        ]);
        if (loadedShipments && loadedShipments.length > 0) {
          setShipments(loadedShipments);
          setSelectedIds(loadedShipments.map((s) => s.shipment_id));
        }
        if (loadedCheckpoints && Object.keys(loadedCheckpoints.checkpoints || {}).length > 0) {
          setCheckpointsData(loadedCheckpoints);
        }
      } catch (err) {
        console.warn('Using local demo fixtures:', err);
      }
    }
    loadInitialData();
  }, []);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(shipments.map((s) => s.shipment_id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleRunOptimization = useCallback(async (excursionOverride?: boolean) => {
    setIsLoading(true);
    const excursion = excursionOverride !== undefined ? excursionOverride : isSimulatedExcursion;
    const tempOverride = excursion ? 14.0 : undefined;

    try {
      const response = await generatePlan({
        shipment_ids: selectedIds,
        simulated_temp_c: tempOverride,
      });

      if (response && response.plans && response.plans.length > 0) {
        setPlans(response.plans);
        setActiveTab('comparison');
      }
    } catch (err) {
      console.error('Plan optimization failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedIds, isSimulatedExcursion]);

  const handleToggleExcursion = async () => {
    const nextExcursion = !isSimulatedExcursion;
    setIsSimulatedExcursion(nextExcursion);
    setIsLoading(true);
    try {
      const response = await generatePlan({
        shipment_ids: selectedIds,
        simulated_temp_c: nextExcursion ? 14.0 : 5.0,
      });
      if (response && response.plans) {
        setPlans(response.plans);
      }
    } catch (err) {
      console.error('Excursion re-optimization failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCustomShipment = (newShipment: Shipment) => {
    setShipments((prev) => [...prev, newShipment]);
    setSelectedIds((prev) => [...prev, newShipment.shipment_id]);
  };

  const handleInspectRoute = (index: number) => {
    setActivePlanIndex(index);
    setActiveTab('risk_route');
  };

  const activePlan = plans[activePlanIndex] || plans[0] || MOCK_PLANS[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        shipmentCount={shipments.length}
      />

      <main className="flex-1 pb-16">
        <ErrorBoundary>
          {activeTab === 'home' && (
            <HomeTab
              onStartPlanning={() => setActiveTab('consignments')}
              checkpointsData={checkpointsData}
              totalConsignments={shipments.length}
            />
          )}

          {activeTab === 'consignments' && (
            <ConsignmentsTab
              shipments={shipments}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onRunOptimization={() => handleRunOptimization()}
              onAddCustomShipment={handleAddCustomShipment}
              checkpointsData={checkpointsData}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'comparison' && (
            <PlanComparisonTab
              plans={plans}
              activePlanIndex={activePlanIndex}
              onSelectPlan={(idx) => setActivePlanIndex(idx)}
              onInspectRoute={handleInspectRoute}
            />
          )}

          {activeTab === 'risk_route' && (
            <RiskRouteTab
              activePlan={activePlan}
              shipments={shipments}
              checkpointsData={checkpointsData}
              isSimulatedExcursion={isSimulatedExcursion}
              onToggleExcursion={handleToggleExcursion}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Persistent Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AI Multimodal Consignment Consolidation &amp; Cold-Chain Risk Engine</span>
          <span className="font-mono text-slate-400">Google Antigravity &bull; OR-Tools CP-SAT &bull; React &bull; Leaflet</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
