export type Plan = 'trial' | 'basic' | 'pro';

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type ChargeStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';
