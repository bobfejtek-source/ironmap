import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-6xl mb-4">🏋️</div>
      <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
      <p className="text-xl text-gray-600 mb-6">Stránka nebyla nalezena</p>
      <p className="text-gray-500 mb-8">
        Požadovaná stránka neexistuje. Možná byl gym přejmenován nebo přemístěn.
      </p>
      <div className="flex gap-4 flex-wrap justify-center">
        <Link href="/" className="btn-primary">
          Zpět na hlavní stránku
        </Link>
        <Link href="/posilovny" className="btn-secondary">
          Všechny posilovny
        </Link>
      </div>
    </div>
  );
}
