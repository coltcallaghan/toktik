import { NextRequest } from 'next/server';
import { initiateOAuth } from '@/lib/platforms';

export async function GET(req: NextRequest) {
  return initiateOAuth(req, 'instagram');
}
