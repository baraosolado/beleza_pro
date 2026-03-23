'use client';

import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer';
import { MobileNavProvider } from '@/components/layout/MobileNavContext';
import { MobileTopBar } from '@/components/layout/MobileTopBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';

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
    <MobileNavProvider>
      <div className="flex h-dvh max-h-dvh min-h-0 overflow-hidden bg-app-bg">
        <Sidebar userName={userName} userPlan={userPlan} onLogout={onLogout} />
        <div
          className={cn(
            'relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
            /* Espaço da barra fixa no mobile (altura 3rem + safe area iOS) */
            'pt-[calc(3rem+env(safe-area-inset-top,0px))] lg:pt-0'
          )}
        >
          <MobileTopBar />
          <MobileNavDrawer userName={userName} userPlan={userPlan} onLogout={onLogout} />
          {children}
        </div>
      </div>
    </MobileNavProvider>
  );
}
