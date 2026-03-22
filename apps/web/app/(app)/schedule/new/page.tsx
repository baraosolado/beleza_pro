'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

import { NewAppointmentForm } from '@/components/appointments/NewAppointmentForm';
import { Header } from '@/components/layout/Header';
import { Skeleton } from '@/components/ui';

function NewAppointmentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillClientId = searchParams.get('clientId') ?? undefined;

  return (
    <>
      <Header title="Novo agendamento" subtitle="Preencha os dados" />
      <main className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-6xl space-y-4">
          <nav className="flex items-center gap-2 text-sm font-medium text-primary">
            <Link href="/schedule" className="hover:underline">
              Agenda
            </Link>
            <ChevronRight className="size-4 text-slate-400" />
            <span className="font-normal text-slate-500">Novo agendamento</span>
          </nav>
          <NewAppointmentForm
            variant="page"
            prefillClientId={prefillClientId}
            onSuccess={() => router.push('/schedule')}
            onCancel={() => router.push('/schedule')}
          />
        </div>
      </main>
    </>
  );
}

export default function NewAppointmentPage() {
  return (
    <Suspense
      fallback={
        <>
          <Header title="Novo agendamento" subtitle="Carregando…" />
          <main className="flex-1 overflow-auto p-8">
            <div className="mx-auto max-w-6xl space-y-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-[480px] w-full rounded-xl" />
            </div>
          </main>
        </>
      }
    >
      <NewAppointmentPageContent />
    </Suspense>
  );
}
