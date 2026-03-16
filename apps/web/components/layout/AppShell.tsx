'use client';

import { Sidebar } from './Sidebar';

type AppShellProps = {
  userName?: string;
  userPlan?: string;
  children: React.ReactNode;
};

export function AppShell({
  userName = 'Usuário',
  userPlan = 'Trial',
  children,
}: AppShellProps): React.ReactElement {
  return (
    <div className="flex h-screen overflow-hidden bg-background-light">
      <Sidebar userName={userName} userPlan={userPlan} />
      <div className="flex flex-1 flex-col overflow-hidden pb-16 lg:pb-0">
        {children}
      </div>
    </div>
  );
}
