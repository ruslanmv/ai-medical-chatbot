import { NextRequest, NextResponse } from 'next/server';
import { searchMedicalKB } from '@/lib/rag/medical-kb';

export async function POST(request: NextRequest) {
  try {
    const { query, topN = 3 } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const results = searchMedicalKB(query, topN);

    return NextResponse.json({
      results: results.map((r) => ({
        topic: r.topic,
        context: r.context,
      })),
      count: results.length,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
