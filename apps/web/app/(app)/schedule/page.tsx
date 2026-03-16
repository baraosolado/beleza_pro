'use client';

import { getISOWeek, getISOWeekYear } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { WeeklyCalendar } from '@/components/ui';
import type { CalendarAppointment } from '@/components/ui';
import { api } from '@/lib/api';

function formatWeek(d: Date): string {
  const year = getISOWeekYear(d);
  const week = getISOWeek(d);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

export default function SchedulePage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');

  const weekParam = formatWeek(currentDate);

  const { data } = useQuery({
    queryKey: ['appointments', 'week', weekParam],
    queryFn: () =>
      api
        .get<{
          items: Array<{
            id: string;
            scheduledAt: string;
            durationMin: number;
            client: { name: string };
            service: { name: string };
            status: string;
          }>;
        }>(`/appointments?week=${weekParam}`)
        .then((r) => r.data),
  });

  const appointments: CalendarAppointment[] = (data?.items ?? []).map((apt) => ({
    id: apt.id,
    scheduledAt: apt.scheduledAt,
    durationMin: apt.durationMin,
    clientName: apt.client.name,
    serviceName: apt.service.name,
    status:
      apt.status === 'scheduled'
        ? 'scheduled'
        : apt.status === 'confirmed'
          ? 'confirmed'
          : apt.status === 'completed'
            ? 'completed'
            : apt.status === 'cancelled'
              ? 'cancelled'
              : 'no_show',
  }));

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <WeeklyCalendar
        appointments={appointments}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        onViewChange={setViewMode}
        onAppointmentClick={(apt) => router.push(`/schedule/${apt.id}`)}
        onNewAppointment={() => router.push('/schedule/new')}
        viewMode={viewMode}
      />
    </main>
  );
}

