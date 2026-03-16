'use client';

import {
  addDays,
  format,
  getDay,
  getWeek,
  isSameDay,
  isToday,
  startOfWeek,
  subDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export type CalendarAppointment = {
  id: string;
  scheduledAt: Date | string;
  durationMin: number;
  clientName: string;
  serviceName: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
};

type ViewMode = 'day' | 'week' | 'month';

type WeeklyCalendarProps = {
  appointments?: CalendarAppointment[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onViewChange?: (view: ViewMode) => void;
  onAppointmentClick?: (appointment: CalendarAppointment) => void;
  viewMode?: ViewMode;
  className?: string;
};

const HOURS_START = 8;
const HOURS_END = 20;
const SLOT_HEIGHT = 56;
const LUNCH_START = 12;
const LUNCH_END = 13;

export function WeeklyCalendar({
  appointments = [],
  currentDate,
  onDateChange,
  onViewChange,
  onAppointmentClick,
  viewMode = 'week',
  className,
}: WeeklyCalendarProps): React.ReactElement {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goPrev = () => onDateChange(subDays(currentDate, viewMode === 'day' ? 1 : 7));
  const goNext = () => onDateChange(addDays(currentDate, viewMode === 'day' ? 1 : 7));

  const displayDays = viewMode === 'day' ? [currentDate] : days;
  const weekNum = getWeek(currentDate, { weekStartsOn: 0 });
  const title =
    viewMode === 'day'
      ? format(currentDate, "d 'de' MMMM", { locale: ptBR })
      : `Semana ${weekNum} · ${format(displayDays[0]!, 'dd/MM')} – ${format(displayDays[displayDays.length - 1]!, 'dd/MM')}`;

  const hours = Array.from(
    { length: HOURS_END - HOURS_START },
    (_, i) => HOURS_START + i
  );

  const getBlockStyle = (apt: CalendarAppointment) => {
    const start = typeof apt.scheduledAt === 'string' ? new Date(apt.scheduledAt) : apt.scheduledAt;
    const top =
      (start.getHours() - HOURS_START) * SLOT_HEIGHT +
      (start.getMinutes() / 60) * SLOT_HEIGHT;
    const height = Math.max(
      (apt.durationMin / 60) * SLOT_HEIGHT,
      SLOT_HEIGHT / 2
    );
    const dayIndex = displayDays.findIndex((d) =>
      isSameDay(d, start)
    );
    if (dayIndex < 0) return { display: 'none' as const };
    const colWidth = 100 / displayDays.length;
    const left = dayIndex * colWidth + 2;
    const width = colWidth - 4;
    return {
      top: `${top}px`,
      height: `${height}px`,
      left: `${left}%`,
      width: `${width}%`,
    };
  };

  return (
    <div className={cn('flex h-full flex-1 flex-col overflow-hidden', className)}>
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={goPrev}
            className="rounded p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Anterior"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="min-w-[100px] text-center text-sm font-semibold text-slate-800">
            {title}
          </span>
          <button
            type="button"
            onClick={goNext}
            className="rounded p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Próximo"
          >
            <ChevronRight className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => onDateChange(new Date())}
            className="rounded border border-slate-200 px-3 py-1 text-xs font-bold hover:bg-slate-50"
          >
            Hoje
          </button>
        </div>
        {onViewChange && (
          <div className="flex rounded-lg bg-slate-100 p-1">
            {(['day', 'week', 'month'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onViewChange(v)}
                className={cn(
                  'rounded px-3 py-1.5 text-xs font-medium capitalize',
                  viewMode === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600'
                )}
              >
                {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="m-6 flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="ml-16 flex flex-1 border-b border-slate-200">
            {displayDays.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  'flex-1 border-l border-slate-100 py-4 text-center',
                  isToday(day) && 'bg-primary/5'
                )}
              >
                <span
                  className={cn(
                    'text-xs font-medium',
                    getDay(day) === 0 ? 'text-slate-400' : 'text-slate-600',
                    isToday(day) && 'text-primary'
                  )}
                >
                  {format(day, 'EEE', { locale: ptBR })}
                </span>
                <span
                  className={cn(
                    'mt-1 block',
                    isToday(day)
                      ? 'inline-flex size-8 items-center justify-center rounded-full bg-primary font-bold text-white'
                      : 'text-slate-800'
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-1 overflow-auto">
            <div className="w-16 shrink-0 border-r border-slate-100">
              {hours.map((h) => (
                <div
                  key={h}
                  className="flex h-14 items-start border-b border-slate-100 pt-0.5"
                >
                  <span className="text-[10px] font-medium text-slate-400">
                    {h.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>
            <div className="relative flex flex-1">
              {displayDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'relative flex-1 border-l border-slate-100',
                    isToday(day) && 'bg-primary/5'
                  )}
                >
                  {hours.map((h) => (
                    <div
                      key={h}
                      className={cn(
                        'h-14 border-b border-slate-100',
                        h >= LUNCH_START && h < LUNCH_END && 'lunch-break'
                      )}
                    >
                      {h === LUNCH_START && (
                        <span className="text-[10px] font-medium uppercase tracking-[4px] text-slate-400">
                          Almoço
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}

              {appointments
                .filter((a) => {
                  const d = typeof a.scheduledAt === 'string' ? new Date(a.scheduledAt) : a.scheduledAt;
                  return (
                    d.getHours() >= HOURS_START &&
                    d.getHours() < HOURS_END &&
                    (viewMode !== 'day' || isSameDay(d, currentDate))
                  );
                })
                .map((apt) => {
                  const style = getBlockStyle(apt);
                  if (style.display === 'none') return null;
                  const isConfirmed = apt.status === 'confirmed';
                  const isScheduled = apt.status === 'scheduled';
                  const Block = (
                    <div
                      key={apt.id}
                      role={onAppointmentClick ? 'button' : undefined}
                      tabIndex={onAppointmentClick ? 0 : undefined}
                      onClick={
                        onAppointmentClick
                          ? () => onAppointmentClick(apt)
                          : undefined
                      }
                      onKeyDown={
                        onAppointmentClick
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onAppointmentClick(apt);
                              }
                            }
                          : undefined
                      }
                      className={cn(
                        'absolute left-1 right-1 z-10 cursor-pointer rounded-md p-2 shadow-sm transition-opacity hover:opacity-90',
                        onAppointmentClick && 'cursor-pointer',
                        isScheduled && 'bg-primary text-white',
                        isConfirmed &&
                          'border-l-4 border-emerald-400 bg-emerald-600 text-white'
                      )}
                      style={{
                        top: style.top,
                        height: style.height,
                        left: style.left,
                        width: style.width,
                      }}
                    >
                      <p className="truncate text-[10px] font-bold">{apt.clientName}</p>
                      <p className="truncate text-[9px] opacity-90">{apt.serviceName}</p>
                    </div>
                  );
                  return Block;
                })}
            </div>
          </div>
        </div>

        <aside className="flex w-[280px] shrink-0 flex-col gap-8 border-l border-slate-200 bg-white p-6">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Mini calendário
            </p>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d) => (
                <span key={d} className="font-medium text-slate-500">
                  {d}
                </span>
              ))}
              {Array.from({ length: 35 }, (_, i) => {
                const d = addDays(startOfWeek(currentDate, { weekStartsOn: 0 }), i);
                const hasApt = appointments.some((a) => {
                  const ad = typeof a.scheduledAt === 'string' ? new Date(a.scheduledAt) : a.scheduledAt;
                  return isSameDay(ad, d);
                });
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onDateChange(d)}
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full text-slate-600',
                      isToday(d) && 'bg-primary font-bold text-white',
                      hasApt && 'relative after:absolute after:bottom-0 after:left-1/2 after:size-[3px] after:-translate-x-1/2 after:rounded-full after:bg-primary after:content-[""]'
                    )}
                  >
                    {format(d, 'd')}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Legenda
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary" />
                <span className="text-xs text-slate-600">Agendado</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-slate-600">Confirmado</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-slate-300" />
                <span className="text-xs text-slate-600">Concluído</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Resumo de hoje
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-800">
              {appointments.filter((a) => {
                const d = typeof a.scheduledAt === 'string' ? new Date(a.scheduledAt) : a.scheduledAt;
                return isSameDay(d, currentDate) && a.status !== 'cancelled';
              }).length}{' '}
              agendamentos
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
