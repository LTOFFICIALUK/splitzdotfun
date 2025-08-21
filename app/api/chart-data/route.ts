import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const contractAddress = searchParams.get('contractAddress');
  const interval = searchParams.get('interval') || '1m';

  if (!contractAddress) {
    return NextResponse.json({ error: 'contractAddress is required' }, { status: 400 });
  }

  try {
    const now = Date.now();
    
    // Use Jupiter Chart API - works directly with contract address
    const jupiterInterval = getJupiterInterval(interval);
    const jupiterCandles = getJupiterCandles(interval);
    const jupiterUrl = `https://datapi.jup.ag/v2/charts/${contractAddress}?interval=${jupiterInterval}&to=${now}&candles=${jupiterCandles}&type=price`;
    
    console.log('Fetching from Jupiter Chart API:', jupiterUrl);
    
    const response = await fetch(jupiterUrl);

    if (response.ok) {
      const data = await response.json();
      console.log('Jupiter Chart API response success:', data);
      
      // Transform Jupiter data to match expected format
      const transformedData = {
        bars: data.candles.map((candle: any) => ({
          timestamp: candle.time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume
        }))
      };
      
      return NextResponse.json(transformedData);
    } else {
      const errorText = await response.text();
      console.log('Jupiter Chart API failed with status:', response.status, 'Error:', errorText);
      throw new Error(`Jupiter Chart API failed with status ${response.status}: ${errorText}`);
    }

  } catch (error) {
    console.error('Chart data fetch error:', error);
    
    // Return error response - no fallbacks or mock data
    return NextResponse.json({ 
      error: 'Failed to fetch chart data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getJupiterInterval(interval: string): string {
  switch (interval) {
    case '1m': return '1_MINUTE';
    case '5m': return '5_MINUTE';
    case '15m': return '15_MINUTE';
    case '30m': return '30_MINUTE';
    case '1h': return '1_HOUR';
    case '4h': return '4_HOUR';
    case '12h': return '12_HOUR';
    case '24h':
    case '1d': return '1_DAY';
    default: return '1_MINUTE';
  }
}

function getJupiterCandles(interval: string): number {
  switch (interval) {
    case '1m': return 1440; // 24 hours worth
    case '5m': return 288; // 24 hours worth
    case '15m': return 96; // 24 hours worth
    case '30m': return 48; // 24 hours worth
    case '1h': return 168; // 7 days worth
    case '4h': return 168; // 28 days worth
    case '12h': return 60; // 30 days worth
    case '24h':
    case '1d': return 30; // 30 days worth
    default: return 1440;
  }
}


