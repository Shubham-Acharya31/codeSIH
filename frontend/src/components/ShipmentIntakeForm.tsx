import React, { useState } from 'react';
import { PlusCircle, X, Check } from 'lucide-react';
import { Shipment, CheckpointsData } from '../types';

interface ShipmentIntakeFormProps {
  checkpointsData: CheckpointsData;
  onAddShipment: (shipment: Shipment) => void;
  onClose: () => void;
}

export const ShipmentIntakeForm: React.FC<ShipmentIntakeFormProps> = ({
  checkpointsData,
  onAddShipment,
  onClose
}) => {
  const cities = Object.keys(checkpointsData.checkpoints || {});
  
  const [productCategory, setProductCategory] = useState('');
  const [shipmentClass, setShipmentClass] = useState<'A' | 'B'>('A');
  const [origin, setOrigin] = useState(cities[0] || 'Amrai');
  const [destination, setDestination] = useState(cities[1] || 'Suryapatan');
  const [weightKg, setWeightKg] = useState(3000);
  const [volumeM3, setVolumeM3] = useState(10);
  const [cargoValue, setCargoValue] = useState(500000);
  
  // Class A specific
  const [subtype, setSubtype] = useState<'medical' | 'organic'>('organic');
  const [tempMin, setTempMin] = useState(4.0);
  const [tempMax, setTempMax] = useState(12.0);
  const [q10, setQ10] = useState(2.2);
  const [shelfLifeHr, setShelfLifeHr] = useState(72.0);

  // Class B specific
  const [penaltyRate, setPenaltyRate] = useState(0.05);
  const [slaStrict, setSlaStrict] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `SHP-CUST-${Math.floor(100 + Math.random() * 900)}`;
    
    const newShipment: Shipment = {
      shipment_id: newId,
      origin,
      destination,
      weight_kg: Number(weightKg),
      volume_m3: Number(volumeM3),
      deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
      cargo_value: Number(cargoValue),
      product_category: productCategory || (shipmentClass === 'A' ? 'Perishable Goods' : 'General Merchandise'),
      shipment_class: shipmentClass,
      class_a: shipmentClass === 'A' ? {
        product_subtype: subtype,
        temperature_min: Number(tempMin),
        temperature_max: Number(tempMax),
        q10: subtype === 'medical' ? 2.5 : Number(q10),
        base_shelf_life_hr: Number(shelfLifeHr),
        hard_breach_override: subtype === 'medical'
      } : null,
      class_b: shipmentClass === 'B' ? {
        delay_penalty_rate: Number(penaltyRate),
        sla_strict: slaStrict
      } : null
    };

    onAddShipment(newShipment);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Add New Consignment</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Product Description</label>
            <input
              type="text"
              required
              placeholder="e.g. Fresh Mangoes, Medical Test Kits, Precision Valves"
              value={productCategory}
              onChange={(e) => setProductCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Origin City</label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Destination City</label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Weight (kg)</label>
              <input
                type="number"
                min="10"
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Volume (m³)</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={volumeM3}
                onChange={(e) => setVolumeM3(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cargo Value (₹)</label>
              <input
                type="number"
                min="1000"
                value={cargoValue}
                onChange={(e) => setCargoValue(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Classification Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Classification</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShipmentClass('A')}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition ${
                  shipmentClass === 'A'
                    ? 'border-blue-500 bg-blue-50/70 text-blue-900 ring-2 ring-blue-400/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center ${
                  shipmentClass === 'A' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-400'
                }`}>
                  {shipmentClass === 'A' && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <span className="font-bold text-sm block">Class A (Perishable)</span>
                  <span className="text-xs text-slate-500">Q10 physics decay & temperature envelope</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setShipmentClass('B')}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition ${
                  shipmentClass === 'B'
                    ? 'border-amber-500 bg-amber-50/70 text-amber-900 ring-2 ring-amber-400/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center ${
                  shipmentClass === 'B' ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-400'
                }`}>
                  {shipmentClass === 'B' && <Check className="w-3 h-3" />}
                </div>
                <div>
                  <span className="font-bold text-sm block">Class B (Non-Perishable)</span>
                  <span className="text-xs text-slate-500">Delay-probability & contractual penalty rate</span>
                </div>
              </button>
            </div>
          </div>

          {/* Class Specific Attributes */}
          {shipmentClass === 'A' ? (
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
              <span className="text-xs font-bold text-blue-900 block">Class A Parameters</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Subtype</label>
                  <select
                    value={subtype}
                    onChange={(e) => {
                      const st = e.target.value as 'medical' | 'organic';
                      setSubtype(st);
                      if (st === 'medical') {
                        setTempMin(2.0);
                        setTempMax(8.0);
                        setQ10(2.5);
                        setShelfLifeHr(48.0);
                      } else {
                        setTempMin(4.0);
                        setTempMax(12.0);
                        setQ10(2.2);
                        setShelfLifeHr(72.0);
                      }
                    }}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white"
                  >
                    <option value="organic">Organic Produce (Q10 = 2.2)</option>
                    <option value="medical">Medical / Vaccines (Q10 = 2.5, Hard Breach)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Shelf Life (Hours)</label>
                  <input
                    type="number"
                    value={shelfLifeHr}
                    onChange={(e) => setShelfLifeHr(Number(e.target.value))}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 space-y-3">
              <span className="text-xs font-bold text-amber-900 block">Class B Parameters</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Delay Penalty Rate (Fraction 0.01 - 0.15)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.00"
                    max="1.00"
                    value={penaltyRate}
                    onChange={(e) => setPenaltyRate(Number(e.target.value))}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="slaStrict"
                    checked={slaStrict}
                    onChange={(e) => setSlaStrict(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <label htmlFor="slaStrict" className="text-xs font-medium text-slate-800">
                    Strict SLA Contract
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition shadow-xs"
            >
              Save & Add Consignment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
