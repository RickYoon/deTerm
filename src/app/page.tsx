'use client';

import { usePrivy } from '@privy-io/react-auth';
import dynamic from 'next/dynamic';

const Terminal = dynamic(() => import('../components/Terminal'), {
  ssr: false,
});

export default function Home() {
  const { login, authenticated } = usePrivy();

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 bg-gray-900">
      {!authenticated ? (
        <div className="flex flex-col items-center justify-center h-screen">
          <h1 className="text-4xl font-bold text-white mb-8">deFi Terminal</h1>
          <button
            onClick={login}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="w-full h-screen">
          <Terminal />
        </div>
      )}
    </main>
  );
} 