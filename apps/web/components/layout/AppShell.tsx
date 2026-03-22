'use client';

import { Sidebar } from './Sidebar';

type AppShellProps = {
  userName?: string;
  userPlan?: string;
  onLogout?: () => void;
  children: React.ReactNode;
};

export function AppShell({
  userName = 'Usuário',
  userPlan = 'Trial',
  onLogout,
  children,
}: AppShellProps): React.ReactElement {
  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <Sidebar userName={userName} userPlan={userPlan} onLogout={onLogout} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-16 lg:pb-0">
        {children}
      </div>
    </div>
  );
}
