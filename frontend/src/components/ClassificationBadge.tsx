import React from 'react';

interface ClassificationBadgeProps {
  shipmentClass: 'A' | 'B';
  subtype?: 'medical' | 'organic' | null;
  size?: 'sm' | 'md' | 'lg';
}

export const ClassificationBadge: React.FC<ClassificationBadgeProps> = ({
  shipmentClass,
  subtype,
  size = 'md'
}) => {
  const isA = shipmentClass === 'A';
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs font-semibold px-2.5 py-1',
    lg: 'text-sm font-semibold px-3 py-1.5'
  }[size];

  if (isA) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200 ${sizeClasses}`}
        aria-label="Class A Perishable Cargo"
      >
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
        <span>Class A (Perishable)</span>
        {subtype && (
          <span className="capitalize font-mono opacity-80 text-[10px] bg-blue-100 px-1 rounded">
            {subtype}
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200 ${sizeClasses}`}
      aria-label="Class B Non-Perishable Cargo"
    >
      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
      <span>Class B (Non-Perishable)</span>
    </span>
  );
};
