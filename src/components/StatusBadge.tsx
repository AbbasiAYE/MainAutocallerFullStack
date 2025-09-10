import React from 'react';
import { Lead } from '../types/Lead';

interface StatusBadgeProps {
  status: Lead['status'];
}

const statusConfig = {
  new: {
    label: 'New',
    className: 'bg-blue-100 text-blue-800',
  },
  contacted: {
    label: 'Contacted',
    className: 'bg-yellow-100 text-yellow-800',
  },
  qualified: {
    label: 'Qualified',
    className: 'bg-purple-100 text-purple-800',
  },
  converted: {
    label: 'Converted',
    className: 'bg-green-100 text-green-800',
  },
  lost: {
    label: 'Lost',
    className: 'bg-red-100 text-red-800',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}