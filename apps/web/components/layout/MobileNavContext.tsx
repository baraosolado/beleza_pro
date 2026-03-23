'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type MobileNavContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

export function MobileNavProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      toggle,
    }),
    [open, toggle]
  );

  return <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>;
}

export function useMobileNav(): MobileNavContextValue {
  const ctx = useContext(MobileNavContext);
  if (!ctx) {
    throw new Error('useMobileNav deve ser usado dentro de MobileNavProvider');
  }
  return ctx;
}
