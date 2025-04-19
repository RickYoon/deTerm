import { NextResponse } from 'next/server';

// 재시도 함수
async function fetchWithRetry(url: string, options: any, maxRetries = 3) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃
  
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
  
        clearTimeout(timeoutId);
  
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
  
        const data = await response.json();
        return data;
      } catch (error) {
        // console.error(`Attempt ${i + 1} failed:`, error);
        // if (i === maxRetries - 1) throw error;
        // 재시도 전 잠시 대기
        // await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
}

export async function GET() {
  try {
    const data = await fetchWithRetry('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'clearinghouseState',
        user: '0x1e572678738674481dE656233E8456BBc4b3b0aB'
      })
    });

    console.log('Hyperliquid API response:', data);

    // assetPositions가 없는 경우 빈 배열 반환
    if (!data?.assetPositions) {
      console.log('No positions found:', data);
      return NextResponse.json([]);
    }

    // API 응답을 Position 형식에 맞게 변환
    const positions = data.assetPositions
      .filter((pos: any) => pos.position) // position이 있는 것만 필터링
      .map((asset: any) => {
        const pos = asset.position;
        return {
          symbol: pos.coin || '',
          netQuantity: pos.szi?.toString() || '0',
          entryPrice: pos.entryPx?.toString() || '0',
          estLiquidationPrice: pos.liquidationPx?.toString() || '0',
          pnlUnrealized: pos.unrealizedPnl?.toString() || '0',
          pnlRealized: '0', // API에서 제공하지 않음
          cumulativeFundingPayment: pos.cumFunding?.allTime?.toString() || '0',
          markPrice: (pos.positionValue / Number(pos.szi))?.toString() || '0',
          netExposureNotional: pos.positionValue?.toString() || '0',
          netCost: (Number(pos.entryPx) * Number(pos.szi))?.toString() || '0'
        };
      });

    return NextResponse.json(positions);
  } catch (error) {
    console.error('Error fetching Hyperliquid positions:', error);
    // 에러 응답에 더 자세한 정보 포함
    return NextResponse.json({ 
      error: 'Failed to fetch positions',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 