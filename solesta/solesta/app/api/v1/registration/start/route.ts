import { NextRequest, NextResponse } from 'next/server';
import {
  getOrCreateUserByExternalAppId,
  updateUserState,
  updateStateData,
  UserState,
} from '@/lib/server/stateMachine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { externalAppId, institution } = body;

    if (!externalAppId) {
      return NextResponse.json(
        { success: false, error: 'MISSING_PARAM', message: 'externalAppId is required.' },
        { status: 400 }
      );
    }

    if (!institution || !['krmu', 'external'].includes(institution)) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PARAM', message: 'institution must be "krmu" or "external".' },
        { status: 400 }
      );
    }

    const user = await getOrCreateUserByExternalAppId(externalAppId);

    await updateUserState({ externalAppId }, UserState.SELECT_INSTITUTION);
    await updateStateData({ externalAppId }, { institution: institution as 'krmu' | 'external' });

    return NextResponse.json({
      success: true,
      data: { state: UserState.ENTER_ROLL_NUMBER },
      message: `You selected ${institution === 'krmu' ? 'KRMU Student' : 'External Student'} path.`,
    });
  } catch (error: any) {
    console.error('Start registration error:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'An error occurred.' },
      { status: 500 }
    );
  }
}