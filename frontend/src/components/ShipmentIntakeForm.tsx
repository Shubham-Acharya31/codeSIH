import React, { useState } from 'react';
import { PlusCircle, X, Check, AlertCircle, MapPin } from 'lucide-react';
import { Shipment, CheckpointsData } from '../types';
import { SYSTEM_CONFIG } from '../config/constants';
import { ShipmentIntakeSchema } from '../validation/shipmentSchema';

interface ShipmentIntakeFormProps {
  checkpointsData: CheckpointsData;
  onAddShipment: (shipment: Shipment) => void;
  onUpdateShipment?: (shipment: Shipment) => void;
  initialShipment?: Shipment | null;
  onClose: () => void;
}

export const ShipmentIntakeForm: React.FC<ShipmentIntakeFormProps> = ({
  checkpointsData,
  onAddShipment,
  onUpdateShipment,
  initialShipment,
  onClose
}) => {
  const isEditMode = Boolean(initialShipment);
  const cities = Object.keys(checkpointsData.checkpoints || {});
  const defaultOrigin = cities[0] || SYSTEM_CONFIG.networkDefaults.defaultOrigin;
  const defaultDest = cities[1] || SYSTEM_CONFIG.networkDefaults.defaultDestination;

  const [productCategory, setProductCategory] = useState(initialShipment?.product_category || '');
  const [shipmentClass, setShipmentClass] = useState<'A' | 'B'>(initialShipment?.shipment_class || 'A');
  const [origin, setOrigin] = useState(initialShipment?.origin || defaultOrigin);
  const [destination, setDestination] = useState(initialShipment?.destination || defaultDest);
  const [weightKg, setWeightKg] = useState<number>(initialShipment?.weight_kg || 3000);
  const [volumeM3, setVolumeM3] = useState<number>(initialShipment?.volume_m3 || 10);
  const [cargoValue, setCargoValue] = useState<number>(initialShipment?.cargo_value || 500000);
  
  // Class A specific
  const [subtype, setSubtype] = useState<'medical' | 'organic'>(
    initialShipment?.class_a?.product_subtype || 'organic'
  );
  const [tempMin, setTempMin] = useState<number>(
    initialShipment?.class_a?.temperature_min ?? SYSTEM_CONFIG.productSubtypes.organic.tempMin
  );
  const [tempMax, setTempMax] = useState<number>(
    initialShipment?.class_a?.temperature_max ?? SYSTEM_CONFIG.productSubtypes.organic.tempMax
  );
  const [q10, setQ10] = useState<number>(
    initialShipment?.class_a?.q10 ?? SYSTEM_CONFIG.productSubtypes.organic.q10
  );
  const [shelfLifeHr, setShelfLifeHr] = useState<number>(
    initialShipment?.class_a?.base_shelf_life_hr ?? SYSTEM_CONFIG.productSubtypes.organic.baseShelfLifeHr
  );

  // Class B specific
  const [penaltyRate, setPenaltyRate] = useState<number>(
    initialShipment?.class_b?.delay_penalty_rate ?? SYSTEM_CONFIG.classBDefaults.defaultPenaltyRate
  );
  const [slaStrict, setSlaStrict] = useState<boolean>(
    initialShipment?.class_b?.sla_strict ?? SYSTEM_CONFIG.classBDefaults.defaultSlaStrict
  );

  // Validation errors state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleSubtypeChange = (newSubtype: 'medical' | 'organic') => {
    setSubtype(newSubtype);
    const cfg = SYSTEM_CONFIG.productSubtypes[newSubtype];
    setTempMin(cfg.tempMin);
    setTempMax(cfg.tempMax);
    setQ10(cfg.q10);
    setShelfLifeHr(cfg.baseShelfLifeHr);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    // Build raw form payload for Zod validation
    const candidateData = {
      product_category: productCategory,
      origin,
      destination,
      weight_kg: Number(weightKg),
      volume_m3: Number(volumeM3),
      cargo_value: Number(cargoValue),
      shipment_class: shipmentClass,
      class_a: shipmentClass === 'A' ? {
        product_subtype: subtype,
        temperature_min: Number(tempMin),
        temperature_max: Number(tempMax),
        q10: subtype === 'medical' ? SYSTEM_CONFIG.productSubtypes.medical.q10 : Number(q10),
        base_shelf_life_hr: Number(shelfLifeHr),
        hard_breach_override: subtype === 'medical',
      } : null,
      class_b: shipmentClass === 'B' ? {
        delay_penalty_rate: Number(penaltyRate),
        sla_strict: slaStrict,
      } : null,
    };

    const validationResult = ShipmentIntakeSchema.safeParse(candidateData);

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        const pathKey = issue.path.join('.');
        fieldErrors[pathKey] = issue.message;
      });
      setErrors(fieldErrors);
      setGeneralError('Please correct the highlighted validation errors before proceeding.');
      return;
    }

    const valid = validationResult.data;
    const uniqueSuffix = Date.now().toString().slice(-4) + Math.floor(Math.random() * 90 + 10);
    const targetId = isEditMode && initialShipment ? initialShipment.shipment_id : `SHP-CUST-${uniqueSuffix}`;

    const newShipment: Shipment = {
      shipment_id: targetId,
      origin: valid.origin,
      destination: valid.destination,
      weight_kg: valid.weight_kg,
      volume_m3: valid.volume_m3,
      deadline: isEditMode && initialShipment ? initialShipment.deadline : new Date(Date.now() + 86400000 * 3).toISOString(),
      cargo_value: valid.cargo_value,
      product_category: valid.product_category,
      shipment_class: valid.shipment_class,
      class_a: valid.class_a ? {
        product_subtype: valid.class_a.product_subtype,
        temperature_min: valid.class_a.temperature_min,
        temperature_max: valid.class_a.temperature_max,
        q10: valid.class_a.q10,
        base_shelf_life_hr: valid.class_a.base_shelf_life_hr,
        hard_breach_override: valid.class_a.hard_breach_override,
      } : null,
      class_b: valid.class_b ? {
        delay_penalty_rate: valid.class_b.delay_penalty_rate,
        sla_strict: valid.class_b.sla_strict,
      } : null,
      status: isEditMode && initialShipment ? initialShipment.status : 'PENDING',
    };

    if (isEditMode && onUpdateShipment) {
      onUpdateShipment(newShipment);
    } else {
      onAddShipment(newShipment);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">
              {isEditMode ? `Edit Consignment (${initialShipment?.shipment_id})` : 'Add New Consignment'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>


        {generalError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Product Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Fresh Alphonso Mangoes, Insulin Test Kits, Automotive Valves"
              value={productCategory}
              onChange={(e) => {
                setProductCategory(e.target.value);
                if (errors['product_category']) {
                  setErrors((prev) => ({ ...prev, product_category: '' }));
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:outline-hidden ${
                errors['product_category'] ? 'border-red-400 bg-red-50/20 focus:ring-red-300' : 'border-slate-200 focus:ring-blue-500'
              }`}
            />
            {errors['product_category'] && (
              <p className="text-[11px] text-red-600 font-medium mt-1">{errors['product_category']}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Origin City <span className="text-red-500">*</span>
              </label>
              <select
                value={origin}
                onChange={(e) => {
                  setOrigin(e.target.value);
                  if (errors['origin'] || errors['destination']) {
                    setErrors((prev) => ({ ...prev, origin: '', destination: '' }));
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:outline-hidden ${
                  errors['origin'] ? 'border-red-400' : 'border-slate-200 focus:ring-blue-500'
                }`}
              >
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors['origin'] && (
                <p className="text-[11px] text-red-600 font-medium mt-1">{errors['origin']}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Destination City <span className="text-red-500">*</span>
              </label>
              <select
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value);
                  if (errors['destination']) {
                    setErrors((prev) => ({ ...prev, destination: '' }));
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:outline-hidden ${
                  errors['destination'] ? 'border-red-400' : 'border-slate-200 focus:ring-blue-500'
                }`}
              >
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors['destination'] && (
                <p className="text-[11px] text-red-600 font-medium mt-1">{errors['destination']}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Weight (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={SYSTEM_CONFIG.validationLimits.minWeightKg}
                max={SYSTEM_CONFIG.validationLimits.maxWeightKg}
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${
                  errors['weight_kg'] ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                }`}
              />
              {errors['weight_kg'] && (
                <p className="text-[11px] text-red-600 font-medium mt-1">{errors['weight_kg']}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Volume (m³) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.5"
                min={SYSTEM_CONFIG.validationLimits.minVolumeM3}
                max={SYSTEM_CONFIG.validationLimits.maxVolumeM3}
                value={volumeM3}
                onChange={(e) => setVolumeM3(Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${
                  errors['volume_m3'] ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                }`}
              />
              {errors['volume_m3'] && (
                <p className="text-[11px] text-red-600 font-medium mt-1">{errors['volume_m3']}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cargo Value (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={SYSTEM_CONFIG.validationLimits.minCargoValueInr}
                max={SYSTEM_CONFIG.validationLimits.maxCargoValueInr}
                value={cargoValue}
                onChange={(e) => setCargoValue(Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${
                  errors['cargo_value'] ? 'border-red-400 bg-red-50/20' : 'border-slate-200'
                }`}
              />
              {errors['cargo_value'] && (
                <p className="text-[11px] text-red-600 font-medium mt-1">{errors['cargo_value']}</p>
              )}
            </div>
          </div>

          {/* Classification Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Classification</label>
            <div className="grid grid-cols-2 gap-3">
              {SYSTEM_CONFIG.cargoClasses.map((cc) => {
                const isSelected = shipmentClass === cc.id;
                const isClassA = cc.id === 'A';
                return (
                  <button
                    key={cc.id}
                    type="button"
                    onClick={() => setShipmentClass(cc.id)}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition ${
                      isSelected
                        ? isClassA
                          ? 'border-blue-500 bg-blue-50/70 text-blue-900 ring-2 ring-blue-400/20'
                          : 'border-amber-500 bg-amber-50/70 text-amber-900 ring-2 ring-amber-400/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? isClassA ? 'border-blue-600 bg-blue-600 text-white' : 'border-amber-600 bg-amber-600 text-white'
                        : 'border-slate-400'
                    }`}>
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                    <div>
                      <span className="font-bold text-sm block">{cc.label}</span>
                      <span className="text-xs text-slate-500">{cc.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Class Specific Attributes */}
          {shipmentClass === 'A' ? (
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
              <span className="text-xs font-bold text-blue-900 block">Class A Temperature &amp; Physics Parameters</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Subtype</label>
                  <select
                    value={subtype}
                    onChange={(e) => handleSubtypeChange(e.target.value as 'medical' | 'organic')}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white"
                  >
                    <option value="organic">Organic Produce (Q10 = 2.2, 4°C - 12°C)</option>
                    <option value="medical">Medical / Vaccines (Q10 = 2.5, 2°C - 8°C, Hard Breach)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Shelf Life (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    value={shelfLifeHr}
                    onChange={(e) => setShelfLifeHr(Number(e.target.value))}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"
                  />
                  {errors['class_a.base_shelf_life_hr'] && (
                    <p className="text-[10px] text-red-600 mt-0.5">{errors['class_a.base_shelf_life_hr']}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Min Temp (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={tempMin}
                    onChange={(e) => setTempMin(Number(e.target.value))}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"
                  />
                  {errors['class_a.temperature_min'] && (
                    <p className="text-[10px] text-red-600 mt-0.5">{errors['class_a.temperature_min']}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Max Temp (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={tempMax}
                    onChange={(e) => setTempMax(Number(e.target.value))}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 space-y-3">
              <span className="text-xs font-bold text-amber-900 block">Class B SLA &amp; Penalty Parameters</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Delay Penalty Rate (Fraction 0.00 - 1.00)
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
                  {errors['class_b.delay_penalty_rate'] && (
                    <p className="text-[10px] text-red-600 mt-0.5">{errors['class_b.delay_penalty_rate']}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="slaStrict"
                    checked={slaStrict}
                    onChange={(e) => setSlaStrict(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <label htmlFor="slaStrict" className="text-xs font-medium text-slate-800 cursor-pointer">
                    Strict SLA Contract Enforcement
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition shadow-xs cursor-pointer"
            >
              {isEditMode ? 'Save Consignment Changes' : 'Validate & Add Consignment'}
            </button>

          </div>
        </form>
      </div>
    </div>
  );
};
