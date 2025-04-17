import { NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';

const privy = new PrivyClient(process.env.PRIVY_API_KEY || '');

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const user = await privy.verifyAuthToken(token);

    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Privy에서 사용자의 지갑 정보 가져오기
    const wallets = await privy.getWallets(user.id);

    // 지갑 정보 분류
    const formattedWallets = {
      evm: wallets.filter(wallet => wallet.walletClientType !== 'solana').map(wallet => ({
        address: wallet.address,
        chain: wallet.chain || 'Unknown',
        balance: '0' // USDC 잔액은 별도로 조회 필요
      })),
      solana: wallets.filter(wallet => wallet.walletClientType === 'solana').map(wallet => ({
        address: wallet.address,
        chain: 'Solana',
        balance: '0' // USDC 잔액은 별도로 조회 필요
      }))
    };

    return NextResponse.json(formattedWallets);
  } catch (error: any) {
    console.error('Error fetching wallet data:', error);
    return NextResponse.json({ error: 'Failed to fetch wallet data' }, { status: 500 });
  }
} 