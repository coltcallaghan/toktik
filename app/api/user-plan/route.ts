import { NextResponse } from 'next/server';
import { getUserPlan, PLANS } from '@/lib/plan';

export async function GET() {
  const result = await getUserPlan();
  if (!result) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    plan: result.plan,
    config: result.config,
    plans: PLANS,
  });
}
