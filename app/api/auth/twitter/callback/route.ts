import { NextRequest } from 'next/server';
import { handleOAuthCallback } from '@/lib/platforms';

export async function GET(req: NextRequest) {
  return handleOAuthCallback(req, 'twitter');
}
