import { NextRequest, NextResponse } from 'next/server';
import { getRegistrationByExternalAppId, markPaymentSuccessful } from '@/lib/server/registration';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const externalAppId = searchParams.get('externalAppId');

  if (!externalAppId) {
    return NextResponse.json(
      { success: false, error: 'MISSING_PARAM', message: 'externalAppId query parameter is required.' },
      { status: 400 }
    );
  }

  try {
    const registration = await getRegistrationByExternalAppId(externalAppId);

    if (!registration) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Registration not found.' },
        { status: 400 }
      );
    }

    if (!registration.feePaid) {
      return NextResponse.json(
        { success: false, error: 'PAYMENT_PENDING', message: 'Payment not completed.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        referenceId: registration.referenceId,
        name: registration.name,
        qrCode: registration.qrCode,
      },
      message: 'Ticket retrieved.',
    });
  } catch (error: any) {
    console.error('Get ticket error:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'An error occurred.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { externalAppId, referenceId } = body;

    if (!externalAppId || !referenceId) {
      return NextResponse.json(
        { success: false, error: 'MISSING_PARAM', message: 'externalAppId and referenceId are required.' },
        { status: 400 }
      );
    }

    const registration = await getRegistrationByExternalAppId(externalAppId);
    if (!registration || registration.referenceId !== referenceId) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Registration not found.' },
        { status: 400 }
      );
    }

    if (!registration.feePaid) {
      return NextResponse.json(
        { success: false, error: 'PAYMENT_PENDING', message: 'Payment not completed.' },
        { status: 400 }
      );
    }

    await markPaymentSuccessful(referenceId);

    return NextResponse.json({
      success: true,
      data: { sent: true },
      message: 'Ticket regenerated.',
    });
  } catch (error: any) {
    console.error('Resend ticket error:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'An error occurred.' },
      { status: 500 }
    );
  }
}