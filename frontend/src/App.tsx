import React, { useState, useEffect, useCallback } from 'react';
import { Header, TabType } from './components/Header';
import { HomeTab } from './components/HomeTab';
import { ConsignmentsTab } from './components/ConsignmentsTab';
import { PlanComparisonTab } from './components/PlanComparisonTab';
import { RiskRouteTab } from './components/RiskRouteTab';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Shipment, CandidatePlan, CheckpointsData } from './types';
import {
  fetchStoredShipments,
  fetchCheckpoints,
  fetchSystemConfig,
  generatePlan,
  createShipment,
  updateShipment,
  deleteShipment,
  resetShipmentsToSeed,
  dispatchPlan
} from './api/client';
import { MOCK_SHIPMENTS, MOCK_PLANS, MOCK_CHECKPOINTS } from './mocks/fixtures';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [shipments, setShipments] = useState<Shipment[]>(MOCK_SHIPMENTS);
  const [selectedIds, setSelectedIds] = useState<string[]>(MOCK_SHIPMENTS.map((s) => s.shipment_id));
  const [checkpointsData, setCheckpointsData] = useState<CheckpointsData>(MOCK_CHECKPOINTS);
  const [plans, setPlans] = useState<CandidatePlan[]>(MOCK_PLANS);
  const [activePlanIndex, setActivePlanIndex] = useState<number>(0);
  const [isSimulatedExcursion, setIsSimulatedExcursion] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  // Initial load from persistent SQLite backend API
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [loadedShipments, loadedCheckpoints, configData] = await Promise.all([
          fetchStoredShipments(),
          fetchCheckpoints(),
          fetchSystemConfig(),
        ]);
        if (loadedShipments && loadedShipments.length > 0) {
          setShipments(loadedShipments);
          setSelectedIds(loadedShipments.map((s) => s.shipment_id));
        }
        if (loadedCheckpoints && Object.keys(loadedCheckpoints.checkpoints || {}).length > 0) {
          setCheckpointsData(loadedCheckpoints);
        }
        if (configData) {
          console.info('Dynamic System Config loaded from backend:', configData.app_version);
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
    setApiErrorMessage(null);
    const excursion = excursionOverride !== undefined ? excursionOverride : isSimulatedExcursion;
    const tempOverride = excursion ? 14.0 : undefined;

    const selectedShipments = shipments.filter((s) => selectedIds.includes(s.shipment_id));

    try {
      const response = await generatePlan({
        shipment_ids: selectedIds.length > 0 ? selectedIds : undefined,
        custom_shipments: selectedShipments.length > 0 ? selectedShipments : undefined,
        simulated_temp_c: tempOverride,
      });

      if (response && response.plans && response.plans.length > 0) {
        setPlans(response.plans);
        setActiveTab('comparison');
      }
    } catch (err: any) {
      console.error('Plan optimization failed:', err);
      setApiErrorMessage(err.message || 'Optimization plan generation failed.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedIds, shipments, isSimulatedExcursion]);

  const handleToggleExcursion = async () => {
    const nextExcursion = !isSimulatedExcursion;
    setIsSimulatedExcursion(nextExcursion);
    setIsLoading(true);
    setApiErrorMessage(null);

    const selectedShipments = shipments.filter((s) => selectedIds.includes(s.shipment_id));

    try {
      const response = await generatePlan({
        shipment_ids: selectedIds.length > 0 ? selectedIds : undefined,
        custom_shipments: selectedShipments.length > 0 ? selectedShipments : undefined,
        simulated_temp_c: nextExcursion ? 14.0 : 5.0,
      });
      if (response && response.plans) {
        setPlans(response.plans);
      }
    } catch (err: any) {
      console.error('Excursion re-optimization failed:', err);
      setApiErrorMessage(err.message || 'Excursion re-optimization failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Consignment CRUD handlers with SQLite persistence
  const handleAddCustomShipment = async (newShipment: Shipment) => {
    try {
      const saved = await createShipment(newShipment);
      setShipments((prev) => [...prev, saved || newShipment]);
      setSelectedIds((prev) => [...prev, newShipment.shipment_id]);
      setNotificationMessage(`Consignment ${newShipment.shipment_id} saved and stored in SQLite database!`);
    } catch (err: any) {
      console.error('Failed to create consignment:', err);
      setApiErrorMessage(err.message || 'Failed to save consignment to database.');
      // Local optimistic fallback
      setShipments((prev) => [...prev, newShipment]);
      setSelectedIds((prev) => [...prev, newShipment.shipment_id]);
    }
  };

  const handleUpdateShipment = async (updatedShipment: Shipment) => {
    try {
      const saved = await updateShipment(updatedShipment.shipment_id, updatedShipment);
      setShipments((prev) =>
        prev.map((s) => (s.shipment_id === updatedShipment.shipment_id ? (saved || updatedShipment) : s))
      );
      setNotificationMessage(`Consignment ${updatedShipment.shipment_id} updated in database.`);
    } catch (err: any) {
      console.error('Failed to update consignment:', err);
      setApiErrorMessage(err.message || 'Failed to update consignment.');
      setShipments((prev) =>
        prev.map((s) => (s.shipment_id === updatedShipment.shipment_id ? updatedShipment : s))
      );
    }
  };

  const handleDeleteShipment = async (id: string) => {
    try {
      await deleteShipment(id);
      setShipments((prev) => prev.filter((s) => s.shipment_id !== id));
      setSelectedIds((prev) => prev.filter((sid) => sid !== id));
      setNotificationMessage(`Consignment ${id} deleted from database.`);
    } catch (err: any) {
      console.error('Failed to delete consignment:', err);
      setApiErrorMessage(err.message || 'Failed to delete consignment.');
      setShipments((prev) => prev.filter((s) => s.shipment_id !== id));
      setSelectedIds((prev) => prev.filter((sid) => sid !== id));
    }
  };

  const handleResetSeed = async () => {
    try {
      const reseeded = await resetShipmentsToSeed();
      if (reseeded && reseeded.length > 0) {
        setShipments(reseeded);
        setSelectedIds(reseeded.map((s) => s.shipment_id));
        setNotificationMessage('Database re-seeded with initial curated consignments.');
      }
    } catch (err: any) {
      console.error('Failed to reset seed data:', err);
      setApiErrorMessage(err.message || 'Failed to reset seed data.');
    }
  };

  const handleDispatchPlan = async (plan: CandidatePlan) => {
    setIsDispatching(true);
    setApiErrorMessage(null);
    const planShipmentIds = plan.shipment_details.map((s) => s.shipment_id);

    try {
      await dispatchPlan({
        scenario_label: plan.label,
        shipment_ids: planShipmentIds,
        plan_details: plan.shipment_details,
      });

      // Update in-memory shipment statuses
      setShipments((prev) =>
        prev.map((s) =>
          planShipmentIds.includes(s.shipment_id)
            ? { ...s, status: 'IN_TRANSIT', assigned_plan_scenario: plan.label }
            : s
        )
      );

      setNotificationMessage(
        `Plan "${plan.label}" dispatched! ${planShipmentIds.length} consignments are now in transit. Check their live timelines.`
      );
      setActiveTab('consignments');
    } catch (err: any) {
      console.error('Failed to dispatch plan:', err);
      setApiErrorMessage(err.message || 'Failed to dispatch plan to network.');
    } finally {
      setIsDispatching(false);
    }
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

      {/* Global Error Banner */}
      {apiErrorMessage && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div className="text-sm text-red-800">
                <strong className="font-bold">Error: </strong>
                <span>{apiErrorMessage}</span>
              </div>
            </div>
            <button
              onClick={() => setApiErrorMessage(null)}
              className="text-red-400 hover:text-red-600 p-1 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Global Success Notification Banner */}
      {notificationMessage && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-sm text-emerald-800 font-medium">
                {notificationMessage}
              </div>
            </div>
            <button
              onClick={() => setNotificationMessage(null)}
              className="text-emerald-400 hover:text-emerald-600 p-1 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
              onUpdateShipment={handleUpdateShipment}
              onDeleteShipment={handleDeleteShipment}
              onResetSeed={handleResetSeed}
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
              onDispatchPlan={handleDispatchPlan}
              isDispatching={isDispatching}
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
          <span className="font-mono text-slate-400">SQLite Database &bull; Google OR-Tools CP-SAT &bull; React &bull; Leaflet</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
