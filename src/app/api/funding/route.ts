import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Fetching data from Backpack and Hyperliquid APIs...');
    
    // 백팩과 하이퍼리퀴드 API 동시 호출
    const [backpackResponse, openInterestResponse, hyperliquidResponse] = await Promise.all([
      fetch('https://api.backpack.exchange/api/v1/markPrices', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'User-Agent': 'curl/8.7.1',
        },
      }),
      fetch('https://api.backpack.exchange/api/v1/openInterest', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'User-Agent': 'curl/8.7.1',
        },
      }),
      fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: "metaAndAssetCtxs"
        })
      })
    ]);

    if (!backpackResponse.ok || !openInterestResponse.ok || !hyperliquidResponse.ok) {
      throw new Error(`API error: Backpack ${backpackResponse.status}, OpenInterest ${openInterestResponse.status}, Hyperliquid ${hyperliquidResponse.status}`);
    }

    const backpackData = await backpackResponse.json();
    const openInterestData = await openInterestResponse.json();
    const hyperliquidData = await hyperliquidResponse.json();

    // 하이퍼리퀴드 응답 구조 확인
    console.log('Hyperliquid response structure:', {
      hasData: !!hyperliquidData,
      keys: Object.keys(hyperliquidData),
      meta: hyperliquidData[0],
      universe: hyperliquidData[0]?.universe,
      firstItemSample: hyperliquidData[1]?.[0],
      totalItems: hyperliquidData[1]?.length
    });

    // 하이퍼리퀴드 데이터 매핑
    const hyperliquidMap = new Map();
    if (Array.isArray(hyperliquidData[1]) && Array.isArray(hyperliquidData[0]?.universe)) {
      console.log('Processing Hyperliquid data...');
      hyperliquidData[1].forEach((item: any, index: number) => {
        const coinInfo = hyperliquidData[0].universe[index];
        if (coinInfo && !item.isDelisted) {
          const symbol = coinInfo.name;  // coin 대신 name 필드 사용
          
          console.log(`Processing ${symbol}:`, {
            symbol,
            rawFunding: item.funding,
            fundingRate: parseFloat(item.funding),
            markPrice: item.markPx,
            openInterest: item.openInterest,
            coinInfo
          });

          hyperliquidMap.set(symbol, {
            fundingRate: parseFloat(item.funding),
            markPrice: parseFloat(item.markPx),
            openInterest: parseFloat(item.openInterest)
          });
        }
      });
    }

    // 매핑된 데이터 샘플 로깅
    console.log('Mapped Hyperliquid data sample:', {
      BTC: hyperliquidMap.get('BTC'),
      ETH: hyperliquidMap.get('ETH'),
      mapSize: hyperliquidMap.size,
      allKeys: Array.from(hyperliquidMap.keys())
    });

    // Open Interest 데이터 매핑
    const openInterestMap: { [key: string]: string } = {};
    openInterestData.forEach((item: { symbol: string; openInterest: string }) => {
      const baseSymbol = item.symbol.split('_')[0];
      openInterestMap[baseSymbol] = item.openInterest;
    });

    // 데이터 가공
    const processedData = backpackData.map((item: any) => {
      const symbol = item.symbol.split('_')[0];
      const backpackFundingRate = parseFloat(item.fundingRate) * 100; // 퍼센트로 변환
      const hyperliquidInfo = hyperliquidMap.get(symbol);
      const hyperliquidFundingRate = hyperliquidInfo ? hyperliquidInfo.fundingRate : 0;

      // 펀딩 아비트라지 수익률 계산
      const fundingArb = Math.abs(backpackFundingRate - hyperliquidFundingRate);
      const arbStrategy = backpackFundingRate > hyperliquidFundingRate
        ? { long: 'HYPERLIQUID', short: 'BACKPACK' }
        : { long: 'BACKPACK', short: 'HYPERLIQUID' };

      // Open Interest 달러 가치 계산
      const quantity = parseFloat(openInterestMap[symbol] || '0');
      const openInterestValue = quantity * parseFloat(item.markPrice);

      // 상세 디버그 로그 (BTC와 ETH에 대해)
      if (symbol === 'BTC' || symbol === 'ETH') {
        console.log(`${symbol} funding rate processing:`, {
          backpack: {
            rawValue: item.fundingRate,
            percentageValue: backpackFundingRate
          },
          hyperliquid: {
            rawValue: hyperliquidInfo?.fundingRate,
            percentageValue: hyperliquidFundingRate,
            originalData: hyperliquidMap.get(symbol)
          },
          fundingArb,
          nextFundingTimestamp: item.nextFundingTimestamp
        });
      }

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
          rate: hyperliquidFundingRate.toFixed(4),
          markPrice: hyperliquidInfo ? hyperliquidInfo.markPrice.toString() : '0',
          openInterest: hyperliquidInfo ? hyperliquidInfo.openInterest.toString() : '0'
        },
        fundingArb: fundingArb.toFixed(4),
        arbStrategy
      };
    });

    // Open Interest 기준으로 정렬하고 순위 추가
    const sortedData = processedData
      .sort((a: any, b: any) => parseFloat(b.openInterest) - parseFloat(a.openInterest))
      .map((item: any, index: number) => ({
        ...item,
        rank: index + 1
      }));

    // 상위 10개와 나머지로 분리
    const topTen = sortedData.slice(0, 10);
    const rest = sortedData.slice(10);

    return NextResponse.json({
      topTen,
      rest
    });
  } catch (error: any) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Failed to fetch data', details: error.message }, { status: 500 });
  }
} 