import { NextRequest, NextResponse } from 'next/server';
import { triageMessage } from '@/lib/safety/triage';
import { getEmergencyInfo } from '@/lib/safety/emergency-numbers';

export async function POST(request: NextRequest) {
  try {
    const { message, countryCode = 'US' } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const triage = triageMessage(message);
    const emergencyInfo = getEmergencyInfo(countryCode);

    return NextResponse.json({
      ...triage,
      emergencyInfo: triage.isEmergency ? emergencyInfo : null,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
