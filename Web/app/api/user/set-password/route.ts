import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Database } from '@/lib/database';
import { verifyToken } from '@/lib/jwt-utils';

export async function POST(request: NextRequest) {
  try {
    const { password, skip } = await request.json();

    // Get token from cookies
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user
    const user = await Database.findUserById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (skip) {
      // Mark user as having completed password setup (skip)
      await Database.updateUser(decoded.userId, { needsPasswordChange: false });
      return NextResponse.json({ message: 'Password setup skipped' });
    }

    // Validate password
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and mark as no longer needing password change
    await Database.updateUser(decoded.userId, {
      password: hashedPassword,
      needsPasswordChange: false
    });

    return NextResponse.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}