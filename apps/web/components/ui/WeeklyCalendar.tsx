'use client';

import {
  addDays,
  addMonths,
  format,
  getDate,
  getDay,
  getWeek,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
  onNewAppointment?: () => void;
  viewMode?: ViewMode;
  className?: string;
};

const HOURS_START = 8;
const HOURS_END = 20;
const SLOT_HEIGHT = 56;
const LUNCH_START = 12;
const LUNCH_END = 13;

function CurrentTimeLine() {
  const [top, setTop] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function update() {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      if (h >= HOURS_START && h < HOURS_END) {
        const t = (h - HOURS_START) * SLOT_HEIGHT + (m / 60) * SLOT_HEIGHT;
        setTop(t);
        setVisible(true);
      } else {
        setVisible(false);
      }
    }
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
      style={{ top: `${top}px` }}
    >
      <div className="size-2.5 rounded-full bg-violet-500 shadow-md shadow-violet-500/50" />
      <div className="h-[2px] flex-1 bg-violet-500/70" />
    </div>
  );
}

export function WeeklyCalendar({
  appointments = [],
  currentDate,
  onDateChange,
  onViewChange,
  onAppointmentClick,
  onNewAppointment,
  viewMode = 'week',
  className,
}: WeeklyCalendarProps): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday first
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goPrev = () => {
    if (viewMode === 'day') onDateChange(subDays(currentDate, 1));
    else if (viewMode === 'month') onDateChange(subMonths(currentDate, 1));
    else onDateChange(subDays(currentDate, 7));
  };
  const goNext = () => {
    if (viewMode === 'day') onDateChange(addDays(currentDate, 1));
    else if (viewMode === 'month') onDateChange(addMonths(currentDate, 1));
    else onDateChange(addDays(currentDate, 7));
  };

  const displayDays = viewMode === 'day' ? [currentDate] : days;

  const headerTitle =
    viewMode === 'month'
      ? format(currentDate, 'MMMM yyyy', { locale: ptBR })
      : format(currentDate, 'MMMM yyyy', { locale: ptBR });

  const hours = Array.from(
    { length: HOURS_END - HOURS_START },
    (_, i) => HOURS_START + i
  );

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const minutesFromStart = (now.getHours() - HOURS_START) * 60 + now.getMinutes();
      const scrollTop = (minutesFromStart / 60) * SLOT_HEIGHT - 120;
      scrollRef.current.scrollTop = Math.max(0, scrollTop);
    }
  }, []);

  const getBlockStyle = (apt: CalendarAppointment) => {
    const start =
      typeof apt.scheduledAt === 'string'
        ? new Date(apt.scheduledAt)
        : apt.scheduledAt;
    const top =
      (start.getHours() - HOURS_START) * SLOT_HEIGHT +
      (start.getMinutes() / 60) * SLOT_HEIGHT;
    const height = Math.max((apt.durationMin / 60) * SLOT_HEIGHT, SLOT_HEIGHT / 2);
    const dayIndex = displayDays.findIndex((d) => isSameDay(d, start));
    if (dayIndex < 0) return { display: 'none' as const };
    const colWidth = 100 / displayDays.length;
    const left = dayIndex * colWidth + 0.5;
    const width = colWidth - 1;
    return {
      top: `${top}px`,
      height: `${height}px`,
      left: `${left}%`,
      width: `${width}%`,
    };
  };

  // Month view
  if (viewMode === 'month') {
    const monthStart = startOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calDays = Array.from({ length: 42 }, (_, i) => addDays(calStart, i));
    const weekDayLabels = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

    return (
      <div className={cn('flex h-full flex-col overflow-hidden', className)}>
        <CalendarHeader
          title={headerTitle}
          onPrev={goPrev}
          onNext={goNext}
          onToday={() => onDateChange(new Date())}
          viewMode={viewMode}
          onViewChange={onViewChange}
          onNewAppointment={onNewAppointment}
        />
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-1 flex-col overflow-auto p-4">
            <div className="grid grid-cols-7 border-b border-slate-100">
              {weekDayLabels.map((d) => (
                <div key={d} className="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid flex-1 grid-cols-7">
              {calDays.map((day, i) => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isCurrent = isToday(day);
                const isSelected = isSameDay(day, currentDate);
                const dayApts = appointments.filter((a) => {
                  const d = typeof a.scheduledAt === 'string' ? new Date(a.scheduledAt) : a.scheduledAt;
                  return isSameDay(d, day) && a.status !== 'cancelled';
                });
                return (
                  <div
                    key={i}
                    onClick={() => onDateChange(day)}
                    className={cn(
                      'min-h-[80px] cursor-pointer border-b border-r border-slate-100 p-1.5 transition-colors hover:bg-slate-50',
                      !isCurrentMonth && 'opacity-30'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex size-6 items-center justify-center rounded-full text-xs font-bold',
                        isCurrent && 'bg-violet-600 text-white',
                        isSelected && !isCurrent && 'bg-violet-100 text-violet-700',
                        !isCurrent && !isSelected && 'text-slate-700'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayApts.slice(0, 2).map((apt) => (
                        <div
                          key={apt.id}
                          onClick={(e) => { e.stopPropagation(); onAppointmentClick?.(apt); }}
                          className={cn(
                            'truncate rounded px-1 py-0.5 text-[10px] font-medium',
                            apt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'
                          )}
                        >
                          {format(typeof apt.scheduledAt === 'string' ? new Date(apt.scheduledAt) : apt.scheduledAt, 'HH:mm')} {apt.clientName}
                        </div>
                      ))}
                      {dayApts.length > 2 && (
                        <p className="text-[10px] text-slate-400">+{dayApts.length - 2} mais</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <MiniSidebar appointments={appointments} currentDate={currentDate} onDateChange={onDateChange} />
        </div>
      </div>
    );
  }

  // Day / Week view
  const todayApts = appointments.filter((a) => {
    const d = typeof a.scheduledAt === 'string' ? new Date(a.scheduledAt) : a.scheduledAt;
    return isSameDay(d, new Date()) && a.status !== 'cancelled';
  });
  const firstApt = todayApts[0];
  const firstTime = firstApt
    ? format(typeof firstApt.scheduledAt === 'string' ? new Date(firstApt.scheduledAt) : firstApt.scheduledAt, 'HH:mm')
    : null;

  return (
    <div className={cn('flex h-full flex-col overflow-hidden', className)}>
      <CalendarHeader
        title={headerTitle}
        onPrev={goPrev}
        onNext={goNext}
        onToday={() => onDateChange(new Date())}
        viewMode={viewMode}
        onViewChange={onViewChange}
        onNewAppointment={onNewAppointment}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Main calendar grid */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Day headers */}
          <div className="flex shrink-0 border-b border-slate-100 bg-white pl-16">
            {displayDays.map((day) => {
              const isCurrent = isToday(day);
              const weekdayLabel = format(day, 'EEE', { locale: ptBR }).toUpperCase();
              return (
                <div
                  key={day.toISOString()}
                  className="flex flex-1 flex-col items-center py-3"
                >
                  <span
                    className={cn(
                      'text-[11px] font-semibold tracking-wider',
                      isCurrent ? 'text-violet-600' : 'text-slate-400'
                    )}
                  >
                    {weekdayLabel}
                  </span>
                  <span
                    className={cn(
                      'mt-1 flex size-8 items-center justify-center text-sm font-bold',
                      isCurrent
                        ? 'rounded-full bg-violet-600 text-white shadow-md shadow-violet-600/30'
                        : 'text-slate-700'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Scrollable time grid */}
          <div ref={scrollRef} className="flex flex-1 overflow-auto">
            {/* Hour labels */}
            <div className="w-16 shrink-0">
              {hours.map((h) => (
                <div
                  key={h}
                  className="flex items-start justify-end pr-3"
                  style={{ height: `${SLOT_HEIGHT}px` }}
                >
                  <span className="mt-[-8px] text-[11px] font-medium text-slate-400">
                    {h.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Grid columns */}
            <div className="relative flex flex-1">
              {/* Grid lines (background) */}
              <div className="pointer-events-none absolute inset-0">
                {hours.map((h) => (
                  <div
                    key={h}
                    className={cn(
                      'border-b border-slate-100',
                      h >= LUNCH_START && h < LUNCH_END && 'bg-slate-50/60'
                    )}
                    style={{ height: `${SLOT_HEIGHT}px` }}
                  >
                    {h === LUNCH_START && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-[3px] text-slate-300">
                        Almoço
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {displayDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'relative flex-1 border-l border-slate-100',
                    isToday(day) && 'bg-violet-50/30'
                  )}
                  style={{ height: `${SLOT_HEIGHT * hours.length}px` }}
                >
                  {isToday(day) && <CurrentTimeLine />}
                </div>
              ))}

              {/* Appointment blocks */}
              {appointments
                .filter((a) => {
                  const d =
                    typeof a.scheduledAt === 'string'
                      ? new Date(a.scheduledAt)
                      : a.scheduledAt;
                  return (
                    d.getHours() >= HOURS_START &&
                    d.getHours() < HOURS_END &&
                    (viewMode !== 'day' || isSameDay(d, currentDate))
                  );
                })
                .map((apt) => {
                  const style = getBlockStyle(apt);
                  if (style.display === 'none') return null;

                  const start =
                    typeof apt.scheduledAt === 'string'
                      ? new Date(apt.scheduledAt)
                      : apt.scheduledAt;
                  const end = new Date(start.getTime() + apt.durationMin * 60_000);
                  const timeLabel = `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;

                  const isConfirmed = apt.status === 'confirmed';
                  const isCompleted = apt.status === 'completed';

                  return (
                    <div
                      key={apt.id}
                      role={onAppointmentClick ? 'button' : undefined}
                      tabIndex={onAppointmentClick ? 0 : undefined}
                      onClick={onAppointmentClick ? () => onAppointmentClick(apt) : undefined}
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
                        'absolute z-10 cursor-pointer overflow-hidden rounded-xl p-2 text-left text-[11px] leading-tight shadow-sm transition-all hover:shadow-md hover:brightness-95',
                        isConfirmed &&
                          'border border-emerald-200 bg-emerald-50 text-emerald-900',
                        isCompleted &&
                          'border border-slate-200 bg-slate-100 text-slate-700',
                        !isConfirmed &&
                          !isCompleted &&
                          'border border-violet-200 bg-violet-100 text-violet-900'
                      )}
                      style={{
                        top: style.top,
                        height: style.height,
                        left: style.left,
                        width: style.width,
                      }}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className={cn(
                          'font-bold text-[10px]',
                          isConfirmed ? 'text-emerald-600' : 'text-violet-600'
                        )}>
                          {timeLabel}
                        </p>
                        {isConfirmed && (
                          <span className="shrink-0 rounded-full bg-emerald-500 p-0.5 text-white">
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                              <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate font-bold text-[12px]">{apt.clientName}</p>
                      <p className="truncate text-[10px] opacity-70">{apt.serviceName}</p>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <MiniSidebar
          appointments={appointments}
          currentDate={currentDate}
          onDateChange={onDateChange}
          todayCount={todayApts.length}
          firstTime={firstTime}
        />
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CalendarHeader({
  title,
  onPrev,
  onNext,
  onToday,
  viewMode,
  onViewChange,
  onNewAppointment,
}: {
  title: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  viewMode: ViewMode;
  onViewChange?: (v: ViewMode) => void;
  onNewAppointment?: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-slate-800">Agenda</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrev}
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-[130px] text-center text-sm font-semibold capitalize text-slate-700">
            {title}
          </span>
          <button
            type="button"
            onClick={onNext}
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="ml-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Hoje
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onViewChange && (
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {(['week', 'day', 'month'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onViewChange(v)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                  viewMode === v
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        )}
        {onNewAppointment && (
          <button
            type="button"
            onClick={onNewAppointment}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-600/20 transition-all hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-600/30"
          >
            <Plus className="size-4" />
            Novo Agendamento
          </button>
        )}
      </div>
    </div>
  );
}

function MiniSidebar({
  appointments,
  currentDate,
  onDateChange,
  todayCount,
  firstTime,
}: {
  appointments: CalendarAppointment[];
  currentDate: Date;
  onDateChange: (d: Date) => void;
  todayCount?: number;
  firstTime?: string | null;
}) {
  const [miniMonth, setMiniMonth] = useState(() => currentDate);

  const monthStart = startOfMonth(miniMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calDays = Array.from({ length: 35 }, (_, i) => addDays(calStart, i));

  const count = todayCount ?? 0;

  return (
    <aside className="flex w-[260px] shrink-0 flex-col gap-6 border-l border-slate-100 bg-white p-5 overflow-y-auto">
      {/* Mini calendar */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold capitalize text-slate-700">
            {format(miniMonth, 'MMMM yyyy', { locale: ptBR })}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setMiniMonth((m) => subMonths(m, 1))}
              className="flex size-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMiniMonth((m) => addMonths(m, 1))}
              className="flex size-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <span key={i} className="py-1 text-center text-[10px] font-bold text-slate-400">
              {d}
            </span>
          ))}
          {calDays.map((day, i) => {
            const hasApt = appointments.some((a) => {
              const ad =
                typeof a.scheduledAt === 'string'
                  ? new Date(a.scheduledAt)
                  : a.scheduledAt;
              return isSameDay(ad, day) && a.status !== 'cancelled';
            });
            const isCurrent = isToday(day);
            const isSelected = isSameDay(day, currentDate);
            const isCurrentMon = isSameMonth(day, miniMonth);

            return (
              <button
                key={i}
                type="button"
                onClick={() => { onDateChange(day); setMiniMonth(day); }}
                className={cn(
                  'relative flex size-7 items-center justify-center rounded-full text-[12px] transition-all mx-auto',
                  isCurrent && 'bg-violet-600 font-bold text-white',
                  isSelected && !isCurrent && 'bg-violet-100 font-bold text-violet-700',
                  !isCurrent && !isSelected && isCurrentMon && 'text-slate-700 hover:bg-slate-100',
                  !isCurrentMon && 'text-slate-300'
                )}
              >
                {format(day, 'd')}
                {hasApt && !isCurrent && (
                  <span className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-violet-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status legend */}
      <div>
        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Status
        </p>
        <div className="space-y-2">
          {[
            { color: 'bg-violet-500', label: 'Agendado' },
            { color: 'bg-emerald-500', label: 'Confirmado' },
            { color: 'bg-slate-300', label: 'Concluído' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <span className={cn('size-2 rounded-full', color)} />
              <span className="text-xs text-slate-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Today summary */}
      <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
        <p className="text-xs font-bold text-violet-700">
          Hoje: {format(new Date(), "EEE d 'de' MMMM", { locale: ptBR })}
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-slate-600">
          Você possui{' '}
          <span className="font-bold text-slate-800">
            {count} atendimento{count !== 1 ? 's' : ''}
          </span>{' '}
          agendado{count !== 1 ? 's' : ''} para hoje.
          {firstTime && <> Primeiro atendimento às {firstTime}.</>}
        </p>
      </div>
    </aside>
  );
}

