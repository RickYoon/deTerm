import { sign } from '@noble/ed25519';
import { Buffer } from 'buffer';

interface PriceData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
}

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

// ED25519로 서명을 생성하는 함수
export async function generateSignature(signingString: string, apiSecret: string): Promise<string> {
  const signature = await sign(
    Buffer.from(signingString),
    Buffer.from(apiSecret, 'base64')
  );
  return Buffer.from(signature).toString('base64');
}

export async function getBackpackAccount() {
  const timestamp = Date.now().toString();
  const window = '5000';
  const apiKey = process.env.NEXT_PUBLIC_BACKPACK_API_KEY;
  const apiSecret = process.env.NEXT_PUBLIC_BACKPACK_API_SECRET;

  console.log('API Key:', apiKey);
  console.log('API Secret:', apiSecret);

  if (!apiKey || !apiSecret) {
    throw new Error('Backpack API credentials not found');
  }

  // 서명 문자열 생성
  const signingString = `instruction=accountQuery&timestamp=${timestamp}&window=${window}`;
  console.log('Signing string:', signingString);

  try {
    const signature = await generateSignature(signingString, apiSecret);
    console.log('Generated signature:', signature);

    const headers = {
      'X-API-Key': apiKey,
      'X-Timestamp': timestamp,
      'X-Window': window,
      'X-Signature': signature,
    };
    console.log('Request headers:', headers);

    const response = await fetch('https://api.backpack.exchange/api/v1/account', {
      headers: headers,
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to fetch account data: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Response data:', data);
    return data;
  } catch (error) {
    console.error('Error in getBackpackAccount:', error);
    throw error;
  }
}

export async function fetchCryptoData(coinId: string = 'bitcoin'): Promise<PriceData> {
  try {
    const response = await fetch(
      `${COINGECKO_API_BASE}/coins/markets?vs_currency=usd&ids=${coinId}&order=market_cap_desc&per_page=1&page=1&sparkline=false`
    );
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data[0];
  } catch (error) {
    console.error('Error fetching crypto data:', error);
    throw error;
  }
}

export async function fetchHistoricalData(coinId: string = 'bitcoin', days: number = 1): Promise<number[]> {
  try {
    const response = await fetch(
      `${COINGECKO_API_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
    );

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data.prices.map((price: [number, number]) => price[1]);
  } catch (error) {
    console.error('Error fetching historical data:', error);
    throw error;
  }
} 