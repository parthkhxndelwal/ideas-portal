import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const externalAppId = searchParams.get('externalAppId');

  if (!externalAppId) {
    return NextResponse.json(
      { success: false, error: 'MISSING_PARAM', message: 'externalAppId query parameter is required.' },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { externalAppId },
    include: { registration: true },
  });

  if (!user) {
    return NextResponse.json({
      success: true,
      data: { exists: false, registration: null },
      message: 'No user found.',
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      exists: true,
      state: user.state,
      isVerified: user.isVerified,
      isKrmu: user.isKrmu,
      registration: user.registration
        ? {
            referenceId: user.registration.referenceId,
            name: user.registration.name,
            email: user.registration.email,
            isKrmu: user.registration.isKrmu,
            feePaid: user.registration.feePaid,
            qrCode: !!user.registration.qrCode,
            rollNumber: user.registration.rollNumber,
            course: user.registration.course,
            year: user.registration.year,
            feeAmount: user.registration.feeAmount,
          }
        : null,
    },
    message: 'User retrieved successfully.',
  });
}