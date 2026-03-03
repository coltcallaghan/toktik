'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronDown,
  ChevronUp,
  Crown,
  Loader2,
  Mail,
  Plus,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { createClient, type Team } from '@/lib/supabase';

type TeamMember = {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joined_at: string;
};

type TeamInvite = {
  id: string;
  team_id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

const AVAILABLE_AGENTS = [
  { name: 'Script Writer AI', capability: 'Text Generation' },
  { name: 'Video Producer', capability: 'Video Synthesis' },
  { name: 'Voice Actor', capability: 'Audio Generation' },
  { name: 'Trend Detector', capability: 'Trend Analysis' },
  { name: 'Thumbnail Designer', capability: 'Image Generation' },
  { name: 'Caption Generator', capability: 'Text Generation' },
];

const roleColors: Record<string, string> = {
  owner: 'bg-yellow-500/10 text-yellow-600',
  admin: 'bg-purple-500/10 text-purple-600',
  editor: 'bg-blue-500/10 text-blue-600',
  viewer: 'bg-gray-500/10 text-gray-600',
};

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Crown className="h-3 w-3" />,
  admin: <Shield className="h-3 w-3" />,
  editor: <Users className="h-3 w-3" />,
  viewer: <Users className="h-3 w-3" />,
};

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({});
  const [teamInvites, setTeamInvites] = useState<Record<string, TeamInvite[]>>({});
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviting, setInviting] = useState(false);

  useEffect(() => { fetchTeams(); }, []);

  async function fetchTeams() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.from('teams').select('*').order('created_at', { ascending: false });
    if (!error && data) setTeams(data);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: newTeam, error } = await supabase.from('teams').insert({ user_id: user.id, name, description: description || null, members: selectedAgents }).select().single();
    if (!error && newTeam) {
      await supabase.from('team_members').insert({ team_id: newTeam.id, user_id: user.id, role: 'owner' });
      setName(''); setDescription(''); setSelectedAgents([]); setShowForm(false); fetchTeams();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from('teams').delete().eq('id', id);
    setTeams((prev) => prev.filter((t) => t.id !== id));
  }

  function toggleAgent(agent: string) {
    setSelectedAgents((prev) => prev.includes(agent) ? prev.filter((a) => a !== agent) : [...prev, agent]);
  }

  async function toggleExpand(teamId: string) {
    if (expandedTeam === teamId) { setExpandedTeam(null); return; }
    setExpandedTeam(teamId);
    try {
      const res = await fetch(`/api/teams/${teamId}/members`);
      const data = await res.json();
      setTeamMembers((prev) => ({ ...prev, [teamId]: data.members ?? [] }));
      setTeamInvites((prev) => ({ ...prev, [teamId]: data.invites ?? [] }));
    } catch {}
  }

  async function sendInvite(teamId: string) {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail, role: inviteRole }) });
      if (res.ok) { const invite = await res.json(); setTeamInvites((prev) => ({ ...prev, [teamId]: [...(prev[teamId] ?? []), invite] })); setInviteEmail(''); }
    } catch {}
    setInviting(false);
  }

  async function cancelInvite(teamId: string, inviteId: string) {
    await fetch(`/api/teams/${teamId}/members?invite_id=${inviteId}`, { method: 'DELETE' });
    setTeamInvites((prev) => ({ ...prev, [teamId]: (prev[teamId] ?? []).filter((i) => i.id !== inviteId) }));
  }

  async function removeMember(teamId: string, memberId: string) {
    await fetch(`/api/teams/${teamId}/members?member_id=${memberId}`, { method: 'DELETE' });
    setTeamMembers((prev) => ({ ...prev, [teamId]: (prev[teamId] ?? []).filter((m) => m.id !== memberId) }));
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="text-muted-foreground">Manage AI agent teams and invite collaborators</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showForm ? 'Cancel' : 'Create Team'}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Total Teams</p><p className="text-2xl font-bold">{teams.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Total Agents</p><p className="text-2xl font-bold">{teams.reduce((s, t) => s + t.members.length, 0)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Pending Invites</p><p className="text-2xl font-bold">{Object.values(teamInvites).flat().length}</p></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Team</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Team Name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cooking Team" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this team does" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Select AI Agents</label>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {AVAILABLE_AGENTS.map((agent) => (
                    <button key={agent.name} type="button" onClick={() => toggleAgent(agent.name)} className={`rounded-lg border p-3 text-left text-sm transition-colors ${selectedAgents.includes(agent.name) ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'}`}>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">{agent.capability}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={saving || selectedAgents.length === 0}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Team</Button>
                <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : teams.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" /><p className="text-muted-foreground">No teams yet. Create your first team above.</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => {
            const isExpanded = expandedTeam === team.id;
            const members = teamMembers[team.id] ?? [];
            const invites = teamInvites[team.id] ?? [];
            return (
              <Card key={team.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <CardDescription>{team.description ?? 'No description'} · {team.members.length} agent{team.members.length !== 1 ? 's' : ''}</CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => toggleExpand(team.id)}>
                        <UserPlus className="mr-1 h-4 w-4" />Collaborate
                        {isExpanded ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(team.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {team.members.map((agent, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />{agent}
                      </span>
                    ))}
                  </div>
                  {isExpanded && (
                    <div className="border-t border-border pt-4 mt-3 space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Invite a Collaborator</p>
                        <div className="flex gap-2">
                          <Input type="email" placeholder="colleague@email.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="flex-1" />
                          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                            <option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option>
                          </select>
                          <Button size="sm" onClick={() => sendInvite(team.id)} disabled={inviting || !inviteEmail.trim()}>
                            {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      {members.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Team Members ({members.length})</p>
                          <div className="space-y-1.5">
                            {members.map((m) => (
                              <div key={m.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${roleColors[m.role] ?? ''}`}>{roleIcons[m.role]}{m.role}</span>
                                  <span className="text-muted-foreground text-xs">{m.user_id.slice(0, 8)}…</span>
                                </div>
                                {m.role !== 'owner' && <button onClick={() => removeMember(team.id, m.id)} className="text-muted-foreground hover:text-red-500 transition-colors"><X className="h-3.5 w-3.5" /></button>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {invites.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Pending Invites ({invites.length})</p>
                          <div className="space-y-1.5">
                            {invites.map((inv) => (
                              <div key={inv.id} className="flex items-center justify-between rounded-md border border-dashed border-border p-2 text-sm">
                                <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><span>{inv.email}</span><span className="text-xs text-muted-foreground">({inv.role})</span></div>
                                <button onClick={() => cancelInvite(team.id, inv.id)} className="text-muted-foreground hover:text-red-500 transition-colors"><X className="h-3.5 w-3.5" /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {members.length === 0 && invites.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No collaborators yet. Invite someone above.</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
