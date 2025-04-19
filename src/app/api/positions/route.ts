import { encodeBase64, decodeBase64 } from "tweetnacl-util";
import * as nacl from 'tweetnacl';
import { NextResponse } from 'next/server';

const SIGNATURE_EXPIRATION_TIME_MS = 5000;

export async function GET() {
  try {
    const timestamp = Date.now().toString();
    const window = SIGNATURE_EXPIRATION_TIME_MS.toString();
    const apiKey = process.env.BACKPACK_API_KEY;
    const apiSecret = process.env.BACKPACK_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error('API key or secret not found');
    }

    // 서명 문자열 생성
    const bodyEntries = [
      ['instruction', 'positionQuery'],
      ['timestamp', timestamp],
      ['window', window]
    ];
    const signingString = bodyEntries.map(([k, v]) => `${k}=${v}`).join('&');
    console.log('Signing string:', signingString);

    // ED25519로 서명 생성
    const encodedMessage = new TextEncoder().encode(signingString);
    const privateKey = decodeBase64(apiSecret);
    const seed = privateKey.slice(0, 32);
    const keyPair = nacl.sign.keyPair.fromSeed(seed);
    const signature = nacl.sign.detached(encodedMessage, keyPair.secretKey);
    const signatureBase64 = encodeBase64(signature);
    console.log('Generated signature:', signatureBase64);

    const headers = {
      'X-API-Key': apiKey,
      'X-Timestamp': timestamp,
      'X-Window': window,
      'X-Signature': signatureBase64,
    };
    // console.log('Request headers:', headers);

    const response = await fetch('https://api.backpack.exchange/api/v1/position', {
      method: 'GET',
      headers: headers,
    });

    const responseText = await response.text();
    // console.log('Response status:', response.status);
    // console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    // console.log('Raw response:', responseText);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${responseText}`);
    }

    const data = JSON.parse(responseText);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Positions API Error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Failed to fetch positions data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 