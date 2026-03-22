import { Suspense } from 'react';

import { ChargesClient } from './ChargesClient';

export default function ChargesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] flex-1 items-center justify-center bg-app-bg text-sm text-ink-secondary">
          Carregando cobranças…
        </div>
      }
    >
      <ChargesClient />
    </Suspense>
  );
}
