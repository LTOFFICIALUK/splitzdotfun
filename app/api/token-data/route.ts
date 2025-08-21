import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const contractAddress = searchParams.get('ca');

  if (!contractAddress) {
    return NextResponse.json({ error: 'Contract address (ca) is required' }, { status: 400 });
  }

  try {
    console.log('Fetching Jupiter token data for:', contractAddress);
    
    const response = await fetch(`https://lite-api.jup.ag/tokens/v2/search?query=${contractAddress}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Jupiter response success:', data);
      return NextResponse.json(data);
    } else {
      console.log('Jupiter API failed with status:', response.status);
      throw new Error(`Jupiter API failed with status ${response.status}`);
    }

  } catch (error) {
    console.error('Token data fetch error:', error);
    
    // Return empty array as fallback
    return NextResponse.json([]);
  }
}
