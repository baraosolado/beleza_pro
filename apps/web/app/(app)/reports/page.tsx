'use client';

import { Suspense } from 'react';

import { ReportsDashboard } from '@/components/reports/ReportsDashboard';

export default function ReportsPage(): React.ReactElement {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Carregando relatórios…</div>}>
      <ReportsDashboard />
    </Suspense>
  );
}
