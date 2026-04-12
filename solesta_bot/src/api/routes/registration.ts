import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiRequest } from '../middleware/auth';
import { getOrCreateUserByIdentifier, updateUserState, getUserByIdentifier, updateStateData } from '../../services/apiStateMachine';
import { UserState } from '../../services/stateMachine';
import { createAndSendOtp, verifyOtp } from '../../services/otp';
import { createRegistration, getRegistrationByExternalAppId } from '../../services/registration';
import { config } from '../../utils/config';

const router = Router();
const prisma = new PrismaClient();

router.post('/start', async (req: ApiRequest, res: Response) => {
  try {
    const { externalAppId, institution } = req.body;

    if (!externalAppId) {
      return res.status(400).json({ success: false, error: 'MISSING_PARAM', message: 'externalAppId is required.' });
    }

    if (!institution || !['krmu', 'external'].includes(institution)) {
      return res.status(400).json({ success: false, error: 'INVALID_PARAM', message: 'institution must be "krmu" or "external".' });
    }

    const user = await getOrCreateUserByIdentifier({ externalAppId });
    
    await updateUserState({ externalAppId }, UserState.SELECT_INSTITUTION);
    await updateStateData({ externalAppId }, { institution: institution as 'krmu' | 'external' });

    res.json({
      success: true,
      data: { state: UserState.ENTER_ROLL_NUMBER },
      message: `You selected ${institution === 'krmu' ? 'KRMU Student' : 'External Student'} path.`
    });
  } catch (error: any) {
    console.error('Registration start error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'An error occurred.' });
  }
});

router.post('/roll-number', async (req: ApiRequest, res: Response) => {
  try {
    const { externalAppId, rollNumber } = req.body;

    if (!externalAppId || !rollNumber) {
      return res.status(400).json({ success: false, error: 'MISSING_PARAM', message: 'externalAppId and rollNumber are required.' });
    }

    if (!/^\d{10}$/.test(rollNumber)) {
      return res.status(400).json({ success: false, error: 'INVALID_FORMAT', message: 'Roll number must be 10 digits.' });
    }

    const user = await getUserByIdentifier({ externalAppId });
    if (!user) {
      return res.status(400).json({ success: false, error: 'USER_NOT_FOUND', message: 'Please start with /start.' });
    }

    const student = await prisma.student.findUnique({ where: { rollNumber } });
    if (!student) {
      return res.status(400).json({ success: false, error: 'STUDENT_NOT_FOUND', message: 'Roll number not found in database.' });
    }

    await updateStateData({ externalAppId }, { rollNumber, email: student.email || `${rollNumber}@krmu.edu.in` });
    await updateUserState({ externalAppId }, UserState.OTP_VERIFICATION);

    res.json({
      success: true,
      data: { state: UserState.OTP_VERIFICATION, email: student.email || `${rollNumber}@krmu.edu.in` },
      message: 'Enter the OTP sent to your KRMU email.'
    });
  } catch (error: any) {
    console.error('Roll number error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'An error occurred.' });
  }
});

router.post('/email', async (req: ApiRequest, res: Response) => {
  try {
    const { externalAppId, email } = req.body;

    if (!externalAppId || !email) {
      return res.status(400).json({ success: false, error: 'MISSING_PARAM', message: 'externalAppId and email are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'INVALID_FORMAT', message: 'Invalid email format.' });
    }

    const user = await getUserByIdentifier({ externalAppId });
    if (!user) {
      return res.status(400).json({ success: false, error: 'USER_NOT_FOUND', message: 'Please start with /start.' });
    }

    await updateStateData({ externalAppId }, { email });
    await updateUserState({ externalAppId }, UserState.OTP_VERIFICATION);

    res.json({
      success: true,
      data: { state: UserState.OTP_VERIFICATION },
      message: 'Enter the OTP sent to your email.'
    });
  } catch (error: any) {
    console.error('Email error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'An error occurred.' });
  }
});

router.post('/otp/request', async (req: ApiRequest, res: Response) => {
  try {
    const { externalAppId } = req.body;

    if (!externalAppId) {
      return res.status(400).json({ success: false, error: 'MISSING_PARAM', message: 'externalAppId is required.' });
    }

    const user = await getUserByIdentifier({ externalAppId });
    if (!user) {
      return res.status(400).json({ success: false, error: 'USER_NOT_FOUND', message: 'Please start with /start.' });
    }

    const stateData = user.stateData as any;
    const email = stateData?.email;
    const isKrmu = stateData?.institution === 'krmu';

    if (!email) {
      return res.status(400).json({ success: false, error: 'NO_EMAIL', message: 'No email found. Please complete previous step.' });
    }

    const result = await createAndSendOtp(user.id, email, isKrmu);

    if (!result.success) {
      return res.status(400).json({ success: false, error: 'OTP_FAILED', message: result.message });
    }

    res.json({ success: true, data: { otpSent: true }, message: result.message });
  } catch (error: any) {
    console.error('OTP request error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'An error occurred.' });
  }
});

router.post('/otp/verify', async (req: ApiRequest, res: Response) => {
  try {
    const { externalAppId, otp } = req.body;

    if (!externalAppId || !otp) {
      return res.status(400).json({ success: false, error: 'MISSING_PARAM', message: 'externalAppId and otp are required.' });
    }

    const user = await getUserByIdentifier({ externalAppId });
    if (!user) {
      return res.status(400).json({ success: false, error: 'USER_NOT_FOUND', message: 'Please start with /start.' });
    }

    const result = await verifyOtp(user.id, otp);

    if (!result.success) {
      return res.status(400).json({ success: false, error: 'INVALID_OTP', message: result.message });
    }

    const stateData = user.stateData as any;
    const isKrmu = stateData?.institution === 'krmu';

    if (isKrmu) {
      const isFirstYear = stateData?.year === '1';
      if (isFirstYear) {
        await updateUserState({ externalAppId }, UserState.FRESHER_SELECTION);
        return res.json({ success: true, data: { state: UserState.FRESHER_SELECTION }, message: result.message });
      }
    } else {
      await updateUserState({ externalAppId }, UserState.ENTER_NAME);
      return res.json({ success: true, data: { state: UserState.ENTER_NAME }, message: 'Enter your full name.' });
    }

    await updateUserState({ externalAppId }, UserState.MANUAL_DETAILS);
    res.json({ success: true, data: { state: UserState.MANUAL_DETAILS }, message: result.message });
  } catch (error: any) {
    console.error('OTP verify error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'An error occurred.' });
  }
});

router.post('/details', async (req: ApiRequest, res: Response) => {
  try {
    const { externalAppId, name, course, year, college } = req.body;

    if (!externalAppId) {
      return res.status(400).json({ success: false, error: 'MISSING_PARAM', message: 'externalAppId is required.' });
    }

    const user = await getUserByIdentifier({ externalAppId });
    if (!user) {
      return res.status(400).json({ success: false, error: 'USER_NOT_FOUND', message: 'Please start with /start.' });
    }

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'INVALID_NAME', message: 'Name must be at least 2 characters.' });
    }
    if (!course || course.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'INVALID_COURSE', message: 'Course must be at least 2 characters.' });
    }
    if (!year || !['1', '2', '3', '4', '5'].includes(year)) {
      return res.status(400).json({ success: false, error: 'INVALID_YEAR', message: 'Year must be 1-5.' });
    }

    await updateStateData({ externalAppId }, { name, course, year, college });

    const isFirstYear = year === '1';
    if (isFirstYear) {
      await updateUserState({ externalAppId }, UserState.FRESHER_SELECTION);
      return res.json({ success: true, data: { state: UserState.FRESHER_SELECTION }, message: 'Would you like to participate in Mr. & Mrs. Fresher?' });
    }

    const stateData = user.stateData as any;
    const isFresher = false;

    const referenceId = await createRegistration({
      externalAppId,
      name: name.trim(),
      email: stateData.email,
      course: course.trim(),
      year,
      college: college?.trim(),
      isKrmu: false,
      isFresher,
    });

    const paymentLink = config.paymentLinkExternal;
    await updateUserState({ externalAppId }, UserState.REFERENCE_ID);
    await updateStateData({ externalAppId }, { referenceId });

    res.json({
      success: true,
      data: { referenceId, paymentLink, state: UserState.REFERENCE_ID },
      message: `Registration created! Your reference ID is ${referenceId}`
    });
  } catch (error: any) {
    console.error('Details error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'An error occurred.' });
  }
});

router.post('/fresher', async (req: ApiRequest, res: Response) => {
  try {
    const { externalAppId, isFresher } = req.body;

    if (!externalAppId) {
      return res.status(400).json({ success: false, error: 'MISSING_PARAM', message: 'externalAppId is required.' });
    }

    if (typeof isFresher !== 'boolean') {
      return res.status(400).json({ success: false, error: 'INVALID_PARAM', message: 'isFresher must be true or false.' });
    }

    const user = await getUserByIdentifier({ externalAppId });
    if (!user) {
      return res.status(400).json({ success: false, error: 'USER_NOT_FOUND', message: 'Please start with /start.' });
    }

    const stateData = user.stateData as any;
    const { name, course, year, college, institution, rollNumber, email } = stateData;

    const referenceId = await createRegistration({
      externalAppId,
      name: name?.trim(),
      email: email || `${rollNumber}@krmu.edu.in`,
      rollNumber,
      course: course?.trim(),
      year,
      college: college?.trim(),
      isKrmu: institution === 'krmu',
      isFresher,
    });

    const paymentLink = institution === 'krmu' ? config.paymentLinkInternal : config.paymentLinkExternal;
    await updateUserState({ externalAppId }, UserState.REFERENCE_ID);
    await updateStateData({ externalAppId }, { referenceId, isFresher });

    res.json({
      success: true,
      data: { referenceId, paymentLink, isFresher, state: UserState.REFERENCE_ID },
      message: `Registration created! Your reference ID is ${referenceId}`
    });
  } catch (error: any) {
    console.error('Fresher error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'An error occurred.' });
  }
});

router.get('/status', async (req: ApiRequest, res: Response) => {
  try {
    const { externalAppId } = req.query;

    if (!externalAppId || typeof externalAppId !== 'string') {
      return res.status(400).json({ success: false, error: 'MISSING_PARAM', message: 'externalAppId query parameter is required.' });
    }

    const user = await getUserByIdentifier({ externalAppId });
    if (!user) {
      return res.json({ success: true, data: { exists: false }, message: 'No user found.' });
    }

    const registration = await getRegistrationByExternalAppId(externalAppId);

    res.json({
      success: true,
      data: {
        state: user.state,
        isVerified: user.isVerified,
        isKrmu: user.isKrmu,
        registration: registration ? {
          referenceId: registration.referenceId,
          name: registration.name,
          email: registration.email,
          isKrmu: registration.isKrmu,
          year: registration.year,
          isFresher: registration.isFresher,
          feeAmount: registration.feeAmount,
          feePaid: registration.feePaid,
          hasQrCode: !!registration.qrCode
        } : null
      },
      message: 'Status retrieved.'
    });
  } catch (error: any) {
    console.error('Status error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'An error occurred.' });
  }
});

router.post('/confirm-payment', async (req: ApiRequest, res: Response) => {
  try {
    const { externalAppId, referenceId } = req.body;

    if (!externalAppId || !referenceId) {
      return res.status(400).json({ success: false, error: 'MISSING_PARAM', message: 'externalAppId and referenceId are required.' });
    }

    const registration = await getRegistrationByExternalAppId(externalAppId);
    if (!registration || registration.referenceId !== referenceId) {
      return res.status(400).json({ success: false, error: 'NOT_FOUND', message: 'Registration not found.' });
    }

    res.json({
      success: true,
      data: { confirmed: true },
      message: 'Payment confirmed. You will receive your ticket once verified by admin.'
    });
  } catch (error: any) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'An error occurred.' });
  }
});

export default router;