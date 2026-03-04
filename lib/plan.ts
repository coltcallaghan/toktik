import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export type Plan = 'free' | 'creator' | 'agency';

export interface PlanConfig {
  name: string;
  accountLimit: number; // -1 = unlimited
  features: {
    bulkGenerate: boolean;
    abTesting: boolean;
    approvalWorkflows: boolean;
    teamManagement: boolean;
  };
}

export const PLANS: Record<Plan, PlanConfig> = {
  free: {
    name: 'Starter',
    accountLimit: 2,
    features: {
      bulkGenerate: false,
      abTesting: false,
      approvalWorkflows: false,
      teamManagement: false,
    },
  },
  creator: {
    name: 'Creator',
    accountLimit: 20,
    features: {
      bulkGenerate: true,
      abTesting: true,
      approvalWorkflows: false,
      teamManagement: false,
    },
  },
  agency: {
    name: 'Agency',
    accountLimit: -1,
    features: {
      bulkGenerate: true,
      abTesting: true,
      approvalWorkflows: true,
      teamManagement: true,
    },
  },
};

/** Server-side: get the current user's plan from Supabase user metadata. */
export async function getUserPlan(): Promise<{ plan: Plan; config: PlanConfig; userId: string } | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Stripe webhook writes 'pro'/'business' etc — map to our plan names
  const rawTier = (user.user_metadata?.tier as string) ?? 'free';
  const plan = normaliseTier(rawTier);

  return { plan, config: PLANS[plan], userId: user.id };
}

/** Map legacy/Stripe tier names to our 3-tier plan system. */
function normaliseTier(tier: string): Plan {
  if (tier === 'creator' || tier === 'pro') return 'creator';
  if (tier === 'agency' || tier === 'business' || tier === 'enterprise') return 'agency';
  return 'free';
}
