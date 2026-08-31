import React from 'react';
import { Layers, Network, ShieldCheck, Home, Package, GitCompare, Compass } from 'lucide-react';
import { ClassificationBadge } from './ClassificationBadge';

export type TabType = 'home' | 'consignments' | 'comparison' | 'risk_route';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  shipmentCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  shipmentCount
}) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'consignments' as TabType, label: 'Consignments', icon: Package, count: shipmentCount },
    { id: 'comparison' as TabType, label: 'Plan Comparison', icon: GitCompare },
    { id: 'risk_route' as TabType, label: 'Risk & Route', icon: Compass },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Branding Strip */}
        <div className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
              <Layers className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  Multimodal Consignment Consolidation Engine
                </h1>
                <span className="bg-slate-100 text-slate-700 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Deterministic Cold-Chain Physics & OR-Tools Optimization
              </p>
            </div>
          </div>

          {/* Network and Legend Badges */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full text-xs font-medium text-slate-700">
              <Network className="w-3.5 h-3.5 text-slate-600" />
              <span>5-Hub Network (20 Cities)</span>
            </div>
            <ClassificationBadge shipmentClass="A" size="sm" />
            <ClassificationBadge shipmentClass="B" size="sm" />
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 border-t border-slate-100 pt-2 pb-1 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition whitespace-nowrap focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
