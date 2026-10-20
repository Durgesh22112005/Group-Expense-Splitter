import React from 'react';
import { ArrowUpRight, ArrowDownLeft, CheckCircle2, Clock, Check } from 'lucide-react';

const Badge = ({ status }) => {
  if (!status) return null;

  const normalized = String(status).toUpperCase();

  switch (normalized) {
    case 'GETS_BACK':
      return (
        <span className="badge badge-emerald">
          <ArrowUpRight size={12} /> Gets Back
        </span>
      );
    case 'OWES':
      return (
        <span className="badge badge-rose">
          <ArrowDownLeft size={12} /> Owes
        </span>
      );
    case 'SETTLED':
      return (
        <span className="badge badge-slate">
          <Check size={12} /> Settled
        </span>
      );
    case 'PENDING':
      return (
        <span className="badge badge-amber">
          <Clock size={12} /> Pending
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="badge badge-emerald">
          <CheckCircle2 size={12} /> Completed
        </span>
      );
    default:
      return <span className="badge badge-slate">{status}</span>;
  }
};

export default Badge;
