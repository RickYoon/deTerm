import { NextResponse } from 'next/server';

export async function GET() {
  try {

    console.log('Fetching data from Backpack and Hyperliquid APIs...');
    
    const [backpackResponse, openInterestResponse, hyperliquidResponse] = await Promise.all([
      fetch('https://api.backpack.exchange/api/v1/markPrices', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      }),
      fetch('https://api.backpack.exchange/api/v1/openInterest', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      }),
      fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PostmanRuntime/7.36.0',
          'Accept': '*/*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Host': 'api.hyperliquid.xyz',
          'Cache-Control': 'no-cache',
          'Accept-Language': '*'
        },
        body: JSON.stringify({
          type: "metaAndAssetCtxs"
        }),
        cache: 'no-store'
      })
    ]);

    if (!backpackResponse.ok || !openInterestResponse.ok || !hyperliquidResponse.ok) {
      throw new Error(`API error: Backpack ${backpackResponse.status}, OpenInterest ${openInterestResponse.status}, Hyperliquid ${hyperliquidResponse.status}`);
    }

    const backpackData = await backpackResponse.json();
    const openInterestData = await openInterestResponse.json();
    const hyperliquidData = await hyperliquidResponse.json();

    // hyperliquid data mapping
    const hyperliquidMap = new Map();
    if (Array.isArray(hyperliquidData[1]) && Array.isArray(hyperliquidData[0]?.universe)) {
      hyperliquidData[1].forEach((item: any, index: number) => {
        const coinInfo = hyperliquidData[0].universe[index];
        if (coinInfo && !item.isDelisted) {
          const symbol = coinInfo.name;
          // funding 값을 문자열로 유지
          hyperliquidMap.set(symbol, {
            fundingRate: item.funding,  // parseFloat 제거
            markPrice: parseFloat(item.markPx),
            openInterest: parseFloat(item.openInterest)
          });
        }
      });
    }

    // Open Interest data mapping
    const openInterestMap: { [key: string]: string } = {};
    openInterestData.forEach((item: { symbol: string; openInterest: string }) => {
      const baseSymbol = item.symbol.split('_')[0];
      openInterestMap[baseSymbol] = item.openInterest;
    });

    // data mapping and processing
    const processedData = backpackData.map((item: any) => {
      const symbol = item.symbol.split('_')[0];
      const backpackFundingRate = parseFloat(item.fundingRate) * 100; // 퍼센트로 변환
      const hyperliquidInfo = hyperliquidMap.get(symbol);

      // funding 값을 마지막에 parseFloat 적용하고 100을 곱해서 퍼센트로 변환 후 8을 곱하고 소수점 4자리까지 표시
      const hyperliquidFundingRate = hyperliquidInfo ? Number((parseFloat(hyperliquidInfo.fundingRate) * 100 * 8).toFixed(4)) : 0;

      // funding arb profit calculation
      const fundingArb = Math.abs(backpackFundingRate - hyperliquidFundingRate);
      const arbStrategy = backpackFundingRate > hyperliquidFundingRate
        ? { long: 'HYPERLIQUID', short: 'BACKPACK' }
        : { long: 'BACKPACK', short: 'HYPERLIQUID' };

      // Open Interest dollar value calculation
      const quantity = parseFloat(openInterestMap[symbol] || '0');
      const openInterestValue = quantity * parseFloat(item.markPrice);

      return {
        symbol,
        openInterest: openInterestValue.toFixed(2),
        backpack: {
          rate: backpackFundingRate.toFixed(4),
          originalRate: item.fundingRate,
          nextFundingTime: item.nextFundingTimestamp,
          markPrice: item.markPrice,
          indexPrice: item.indexPrice
        },
        hyperliquid: {
          rate: hyperliquidFundingRate.toString(),
          markPrice: hyperliquidInfo ? hyperliquidInfo.markPrice.toString() : '0',
          openInterest: hyperliquidInfo ? hyperliquidInfo.openInterest.toString() : '0'
        },
        fundingArb: fundingArb.toFixed(4),
        arbStrategy
      };
    });

    // Open Interest based sorting and rank addition
    const sortedData = processedData
      .sort((a: any, b: any) => parseFloat(b.openInterest) - parseFloat(a.openInterest))
      .map((item: any, index: number) => ({
        ...item,
        rank: index + 1
      }));

    // top 20 and rest separation
    const topTen = sortedData.slice(0, 20);
    const rest = sortedData.slice(20);

    return NextResponse.json({
      topTen,
      rest
    });
  } catch (error: any) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Failed to fetch data', details: error.message }, { status: 500 });
  }
} 