import { NextResponse } from 'next/server';
import { fetchAvailableModels } from '@/lib/providers/ollabridge-models';

export async function GET() {
  try {
    const models = await fetchAvailableModels();
    return NextResponse.json({ models });
  } catch {
    return NextResponse.json(
      { models: [], error: 'Failed to fetch models' },
      { status: 200 } // Return 200 with empty array — non-critical endpoint
    );
  }
}
