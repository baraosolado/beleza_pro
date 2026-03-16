import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background-light p-8">
      <h1 className="text-4xl font-bold tracking-tight text-slate-800">
        Beleza Pro
      </h1>
      <p className="mt-2 text-slate-600">
        Sua agenda, seus clientes e suas cobranças — tudo em um lugar.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/auth/login"
          className="rounded-lg bg-primary px-6 py-3 font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary/90"
        >
          Entrar
        </Link>
        <Link
          href="/auth/register"
          className="rounded-lg border-2 border-primary px-6 py-3 font-semibold text-primary hover:bg-primary/5"
        >
          Criar conta
        </Link>
      </div>
    </main>
  );
}
