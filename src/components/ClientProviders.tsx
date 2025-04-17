'use client';

import React from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import dynamic from 'next/dynamic';
import {toSolanaWalletConnectors} from "@privy-io/react-auth/solana";

// SSR을 비활성화하고 클라이언트 사이드에서만 렌더링
const DynamicPrivyProvider = dynamic(
  () => Promise.resolve(PrivyProvider),
  { ssr: false }
);

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DynamicPrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#ffb300',
          walletChainType: 'ethereum-and-solana'
        },
        externalWallets: {
          solana: {
            connectors: toSolanaWalletConnectors()
          }
        },
        embeddedWallets: {
          ethereum: {
              createOnLogin: 'users-without-wallets',
          },
          solana: {
              createOnLogin: 'users-without-wallets',
          },
      }
      }}
    >
      {children}
    </DynamicPrivyProvider>
  );
} 