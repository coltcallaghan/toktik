import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/* ── GET /api/approvals — list all approval requests ──────────── */

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [workflowsRes, requestsRes] = await Promise.all([
    supabase.from('approval_workflows').select('*').eq('user_id', user.id),
    supabase
      .from('approval_requests')
      .select('*, content(*)')
      .order('created_at', { ascending: false }),
  ]);

  return NextResponse.json({
    workflows: workflowsRes.data ?? [],
    requests: requestsRes.data ?? [],
  });
}

/* ── POST /api/approvals — create a workflow OR submit for approval ── */

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    if (body.type === 'workflow') {
      // Create workflow
      const { data, error } = await supabase
        .from('approval_workflows')
        .insert({
          team_id: body.team_id,
          user_id: user.id,
          name: body.name,
          steps: body.steps ?? [
            { role: 'editor', action: 'create' },
            { role: 'admin', action: 'review' },
            { role: 'owner', action: 'approve' },
          ],
          require_all_approvals: body.require_all ?? false,
          auto_publish: body.auto_publish ?? false,
        })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    if (body.type === 'request') {
      // Submit content for approval
      const { data, error } = await supabase
        .from('approval_requests')
        .insert({
          workflow_id: body.workflow_id,
          content_id: body.content_id,
          requested_by: user.id,
        })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'type must be "workflow" or "request"' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}

/* ── PATCH /api/approvals — approve/reject a request ─────────── */

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { request_id, action, comment } = await req.json();
    if (!request_id || !action) {
      return NextResponse.json({ error: 'request_id and action required' }, { status: 400 });
    }

    // Get existing request
    const { data: request } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const approvals = (request.approvals as Array<Record<string, unknown>>) ?? [];
    approvals.push({
      user_id: user.id,
      step: request.current_step,
      action,
      comment: comment ?? null,
      at: new Date().toISOString(),
    });

    const newStatus =
      action === 'approve'
        ? 'approved'
        : action === 'reject'
        ? 'rejected'
        : 'changes_requested';

    const { data: updated, error } = await supabase
      .from('approval_requests')
      .update({
        status: newStatus,
        current_step: action === 'approve' ? request.current_step + 1 : request.current_step,
        approvals,
        updated_at: new Date().toISOString(),
      })
      .eq('id', request_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // If approved and auto_publish, publish the content
    if (newStatus === 'approved') {
      const { data: workflow } = await supabase
        .from('approval_workflows')
        .select('auto_publish')
        .eq('id', request.workflow_id)
        .single();

      if (workflow?.auto_publish) {
        await supabase
          .from('content')
          .update({ status: 'scheduled' })
          .eq('id', request.content_id);
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 }
    );
  }
}
