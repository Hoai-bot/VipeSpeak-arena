// E:\DuAnAI\VipeSpeak-arena\api\verify-moderator.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { pin } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const submittedPin = String(pin || '').trim().toUpperCase();
    const expectedPin = (process.env.MODERATOR_PIN || 'VIPESPEAK2026').trim().toUpperCase();

    if (!submittedPin || submittedPin !== expectedPin) {
      return res.status(401).json({
        success: false,
        message: 'Mã PIN Giảng viên / Ban Tổ Chức không chính xác.',
      });
    }

    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || expectedPin;
    const expiresAt = Date.now() + 4 * 60 * 60 * 1000; // Hiệu lực 4 giờ
    const tokenPayload = `MOD:${expiresAt}`;
    const signature = crypto.createHmac('sha256', secret).update(tokenPayload).digest('hex');

    return res.status(200).json({
      success: true,
      modToken: `${tokenPayload}.${signature}`,
      expiresAt,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Internal Server Error' });
  }
}