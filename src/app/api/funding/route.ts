import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Fetching data from Backpack and Hyperliquid APIs...');
    
    // 백팩과 하이퍼리퀴드 API 동시 호출
    const [backpackResponse, openInterestResponse, hyperliquidResponse] = await Promise.all([
      fetch('https://api.backpack.exchange/api/v1/markPrices'),
      fetch('https://api.backpack.exchange/api/v1/openInterest'),
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

    // API 요청/응답 상세 로깅
    console.log('Hyperliquid API Request Details:', {
      url: 'https://api.hyperliquid.xyz/info',
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
      body: {
        type: "metaAndAssetCtxs"
      }
    });

    // 전체 응답 구조 로깅
    console.log('Full Hyperliquid Response Structure:', {
      responseStatus: hyperliquidResponse.status,
      responseHeaders: Object.fromEntries(hyperliquidResponse.headers.entries()),
      dataStructure: {
        hasUniverse: !!hyperliquidData[0]?.universe,
        universeLength: hyperliquidData[0]?.universe?.length,
        hasAssetCtx: !!hyperliquidData[1],
        assetCtxLength: hyperliquidData[1]?.length
      },
      btcRawData: hyperliquidData[1]?.find((item: any, index: number) => 
        hyperliquidData[0]?.universe[index]?.name === 'BTC'
      )
    });

    // BTC 데이터 처리 과정 로깅
    const btcData = hyperliquidData[1]?.find((item: any, index: number) => 
      hyperliquidData[0]?.universe[index]?.name === 'BTC'
    );
    
    console.log('BTC Data Processing:', {
      originalFunding: btcData?.funding,
      parsedFunding: parseFloat(btcData?.funding),
      fundingString: btcData?.funding?.toString(),
      fundingNumber: Number(btcData?.funding)
    });

    console.log('Hyperliquid data:', hyperliquidData[1].slice(0, 3));

    // API 응답 데이터 로깅
    const btcHyperliquidData = hyperliquidData[1]?.find((item: any, index: number) => 
      hyperliquidData[0]?.universe[index]?.name === 'BTC'
    );
    
    // console.log('Raw API responses:', {
    //   backpack: {
    //     BTC: backpackData.find((item: any) => item.symbol.startsWith('BTC')),
    //     timestamp: new Date().toISOString()
    //   },
    //   hyperliquid: {
    //     rawData: btcHyperliquidData,
    //     meta: hyperliquidData[0]?.universe?.find((item: any) => item.name === 'BTC'),
    //     funding: btcHyperliquidData?.funding,
    //     fundingAsNumber: parseFloat(btcHyperliquidData?.funding),
    //     timestamp: new Date().toISOString()
    //   }
    // });

    // 하이퍼리퀴드 데이터 매핑
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

    // console.log('Mapped Hyperliquid data sample:', {
    //   BTC: hyperliquidMap.get('BTC'),
    //   ETH: hyperliquidMap.get('ETH'),
    //   mapSize: hyperliquidMap.size,
    //   allKeys: Array.from(hyperliquidMap.keys())
    // });

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
      // funding 값을 마지막에 parseFloat 적용하고 100을 곱해서 퍼센트로 변환 후 8을 곱하고 소수점 4자리까지 표시
      const hyperliquidFundingRate = hyperliquidInfo ? Number((parseFloat(hyperliquidInfo.fundingRate) * 100 * 8).toFixed(4)) : 0;

      // 상세 로깅 추가
      if (symbol === 'BTC') {
        console.log('BTC Funding Rate Processing:', {
          originalRate: hyperliquidInfo?.fundingRate,
          parsedRate: parseFloat(hyperliquidInfo?.fundingRate) * 100 * 8,
          roundedRate: hyperliquidFundingRate
        });
      }

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
        // console.log(`${symbol} funding rate processing:`, {
        //   backpack: {
        //     rawValue: item.fundingRate,
        //     percentageValue: backpackFundingRate
        //   },
        //   hyperliquid: {
        //     rawValue: hyperliquidInfo?.fundingRate,
        //     percentageValue: hyperliquidFundingRate,
        //     originalData: hyperliquidMap.get(symbol)
        //   },
        //   fundingArb,
        //   nextFundingTimestamp: item.nextFundingTimestamp
        // });
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
          rate: hyperliquidFundingRate.toString(),
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