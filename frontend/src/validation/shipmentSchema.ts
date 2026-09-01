import { z } from 'zod';
import { SYSTEM_CONFIG } from '../config/constants';

const limits = SYSTEM_CONFIG.validationLimits;

export const ClassASchema = z
  .object({
    product_subtype: z.enum(['medical', 'organic']),
    temperature_min: z.number({ message: 'Min temperature must be a valid number' }),
    temperature_max: z.number({ message: 'Max temperature must be a valid number' }),
    q10: z.number().gt(0, 'Q10 sensitivity factor must be greater than 0'),
    base_shelf_life_hr: z.number().gt(0, 'Shelf life must be greater than 0 hours'),
    hard_breach_override: z.boolean(),
  })
  .refine((data) => data.temperature_min <= data.temperature_max, {
    message: 'Min temperature cannot be greater than Max temperature',
    path: ['temperature_min'],
  });

export const ClassBSchema = z.object({
  delay_penalty_rate: z
    .number({ message: 'Penalty rate must be a valid number' })
    .min(0.0, 'Penalty rate cannot be negative')
    .max(1.0, 'Delay penalty rate must be between 0.00 and 1.00 (dimensionless fraction)'),
  sla_strict: z.boolean(),
});

export const ShipmentIntakeSchema = z
  .object({
    product_category: z
      .string()
      .trim()
      .min(2, 'Product description must be at least 2 characters'),
    origin: z
      .string()
      .trim()
      .min(1, 'Origin city is required'),
    destination: z
      .string()
      .trim()
      .min(1, 'Destination city is required'),
    weight_kg: z
      .number({ message: 'Weight must be a valid number' })
      .min(limits.minWeightKg, `Weight must be at least ${limits.minWeightKg} kg`)
      .max(limits.maxWeightKg, `Weight cannot exceed ${limits.maxWeightKg.toLocaleString()} kg`),
    volume_m3: z
      .number({ message: 'Volume must be a valid number' })
      .min(limits.minVolumeM3, `Volume must be at least ${limits.minVolumeM3} m³`)
      .max(limits.maxVolumeM3, `Volume cannot exceed ${limits.maxVolumeM3} m³`),
    cargo_value: z
      .number({ message: 'Cargo value must be a valid number' })
      .min(limits.minCargoValueInr, `Cargo value must be at least ₹${limits.minCargoValueInr.toLocaleString()}`)
      .max(limits.maxCargoValueInr, `Cargo value cannot exceed ₹${limits.maxCargoValueInr.toLocaleString()}`),
    shipment_class: z.enum(['A', 'B']),
    class_a: ClassASchema.optional().nullable(),
    class_b: ClassBSchema.optional().nullable(),
  })
  .refine((data) => data.origin.trim().toLowerCase() !== data.destination.trim().toLowerCase(), {
    message: 'Origin and destination cities cannot be identical',
    path: ['destination'],
  })
  .refine(
    (data) => {
      if (data.shipment_class === 'A') return !!data.class_a;
      if (data.shipment_class === 'B') return !!data.class_b;
      return true;
    },
    {
      message: 'Attributes must correspond to the selected cargo classification',
      path: ['shipment_class'],
    }
  );

export type ShipmentIntakeFormData = z.infer<typeof ShipmentIntakeSchema>;
