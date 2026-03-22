'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

import { NewClientForm } from '@/components/clients/NewClientForm';
import { Header } from '@/components/layout/Header';

export default function NewClientPage() {
  const router = useRouter();

  return (
    <>
      <Header title="Nova Cliente" />
      <main className="min-h-0 w-full flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl space-y-6 p-4 lg:p-8">
          <nav className="flex items-center gap-2 text-sm font-medium text-primary">
            <Link href="/clients" className="hover:underline">
              Clientes
            </Link>
            <ChevronRight className="size-4 text-slate-400" />
            <span className="font-normal text-slate-500">Nova Cliente</span>
          </nav>

          <section>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              Nova Cliente
            </h2>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Cadastre uma nova cliente e agende seu primeiro serviço.
            </p>
          </section>

          <NewClientForm
            variant="page"
            onSuccess={() => router.push('/clients')}
            onCancel={() => router.push('/clients')}
          />
        </div>
      </main>
    </>
  );
}
