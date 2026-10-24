"use client";

import { Pencil, Plus, Trash2, UserMinus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ModuleGate } from "@/components/shell/module-gate";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge, EmptyState, ErrorNote, Loading, PageHeader, Panel, table } from "@/components/ui/page";
import type { Invitation, Member, Role } from "@/lib/contract";
import { useAudit, useInvitations, useMembers, usePermissionCatalog, useRoles, useTenantMutation } from "@/lib/queries";
import { useWorkspace } from "@/lib/workspace";

type Tab = "members" | "roles" | "activity";

export default function TeamPage() {
  return (
    <ModuleGate permission={["team:read", "roles:manage"]}>
      <Team />
    </ModuleGate>
  );
}

function Team() {
  const { can } = useWorkspace();
  const tabs: Array<{ key: Tab; label: string; show: boolean }> = [
    { key: "members", label: "Members", show: can("team:read") },
    { key: "roles", label: "Roles", show: true },
    { key: "activity", label: "Activity", show: can("audit:read") },
  ];
  const visible = tabs.filter((t) => t.show);
  const [tab, setTab] = useState<Tab>(visible[0].key);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Team & roles" title="Who works here, and what they can do" />
      <div className="flex border-b border-line text-xs font-bold tracking-wider uppercase">
        {visible.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-3 ${tab === t.key ? "border-brand bg-brand/5 text-brand" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "members" && <Members />}
      {tab === "roles" && <Roles />}
      {tab === "activity" && <Activity />}
    </div>
  );
}

function Members() {
  const { can, config, format, me } = useWorkspace();
  const members = useMembers();
  const invitations = useInvitations();
  const roles = useRoles();
  const changeRole = useTenantMutation((request, { member, roleKey }: { member: Member; roleKey: string }) => request<Member>("PATCH", `/members/${member.id}`, { roleKey }), "team");
  const remove = useTenantMutation((request, member: Member) => request<Member>("DELETE", `/members/${member.id}`), "team");
  const revoke = useTenantMutation((request, invitation: Invitation) => request("DELETE", `/invitations/${invitation.id}`), "team");
  const manage = can("team:manage");
  const roleName = (key: string | null) => roles.data?.find((r) => r.key === key)?.name ?? key ?? "—";
  const seats = (members.data?.length ?? 0) + (invitations.data?.length ?? 0);

  return (
    <div className="space-y-6">
      <Panel title={`Members · ${seats} of ${config.limits.maxUsers} seats used`}>
        {members.isPending && <Loading />}
        <ErrorNote error={members.error ?? changeRole.error ?? remove.error} className="m-4" />
        {members.data && (
          <div className={table.wrap}>
            <table className={table.table}>
              <thead className={table.head}>
                <tr>
                  <th className={table.th}>Member</th>
                  <th className={table.th}>Role</th>
                  <th className={table.th}>Joined</th>
                  {manage && <th className={table.th} />}
                </tr>
              </thead>
              <tbody>
                {members.data.map((m) => (
                  <tr key={m.id} className={table.row}>
                    <td className={table.td}>
                      <div className="font-bold text-ink">
                        {m.name ?? m.email}
                        {m.id === me.user.id && <span className="ml-2 text-[10px] text-brand">(you)</span>}
                      </div>
                      <div className="text-[10px] text-muted">{m.email}</div>
                    </td>
                    <td className={table.td}>
                      {manage ? (
                        <Select
                          aria-label={`Role of ${m.name ?? m.email}`}
                          className="max-w-48"
                          value={m.roleKey}
                          disabled={changeRole.isPending}
                          onChange={(e) =>
                            changeRole.mutate({ member: m, roleKey: e.target.value }, { onSuccess: (saved) => toast.success(`${saved.name ?? saved.email} is now ${roleName(saved.roleKey)}`) })
                          }
                        >
                          {roles.data?.map((r) => (
                            <option key={r.key} value={r.key}>
                              {r.name}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        roleName(m.roleKey)
                      )}
                    </td>
                    <td className={`${table.td} text-muted`}>{format.dateTime(m.joinedAt)}</td>
                    {manage && (
                      <td className={`${table.td} text-right`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={remove.isPending}
                          onClick={() => {
                            if (confirm(`Remove ${m.name ?? m.email} from this workspace? They lose access straight away. Their account isn't deleted, so they can be invited again.`)) {
                              remove.mutate(m, { onSuccess: () => toast.success(`${m.name ?? m.email} removed`) });
                            }
                          }}
                        >
                          <UserMinus size={12} /> Remove from workspace
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title={`Pending invitations (${invitations.data?.length ?? 0})`}>
        {invitations.isPending && <Loading />}
        <ErrorNote error={invitations.error ?? revoke.error} className="m-4" />
        {invitations.data?.length === 0 && <EmptyState>No pending invitations.</EmptyState>}
        {invitations.data && invitations.data.length > 0 && (
          <ul className="divide-y divide-line font-mono text-xs">
            {invitations.data.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span>
                  <strong>{i.email}</strong> as {roleName(i.roleKey)} · sent {format.dateTime(i.createdAt)}
                </span>
                {manage && (
                  <Button size="sm" variant="ghost" disabled={revoke.isPending} onClick={() => revoke.mutate(i, { onSuccess: () => toast.success(`Invitation to ${i.email} revoked`) })}>
                    <X size={12} /> Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {manage && <InviteForm roles={roles.data ?? []} />}
      </Panel>
    </div>
  );
}

function InviteForm({ roles }: { roles: Role[] }) {
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState("staff");
  const invite = useTenantMutation((request, body: { email: string; roleKey: string }) => request<Invitation>("POST", "/invitations", body), "team");
  return (
    <form
      className="grid gap-3 border-t border-line p-5 sm:grid-cols-[1fr_200px_auto] sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        invite.mutate(
          { email, roleKey },
          {
            onSuccess: (sent) => {
              toast.success(`Invitation sent to ${sent.email}`);
              setEmail("");
            },
          },
        );
      }}
    >
      <Field label="Invite by email" error={invite.error?.issueFor("email")}>
        {(id) => <Input id={id} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}
      </Field>
      <Field label="Role" error={invite.error?.issueFor("roleKey")}>
        {(id) => (
          <Select id={id} value={roleKey} onChange={(e) => setRoleKey(e.target.value)}>
            {roles.map((r) => (
              <option key={r.key} value={r.key}>
                {r.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Button type="submit" variant="primary" disabled={invite.isPending}>
        Send invitation
      </Button>
      <ErrorNote error={invite.error} className="sm:col-span-3" />
    </form>
  );
}

function Roles() {
  const { can } = useWorkspace();
  const roles = useRoles();
  const [editing, setEditing] = useState<Role | "new" | null>(null);
  const remove = useTenantMutation((request, role: Role) => request("DELETE", `/roles/${role.key}`), "team");
  const manage = can("roles:manage");

  return (
    <Panel
      title="Roles"
      actions={
        manage && (
          <Button size="sm" variant="dark" onClick={() => setEditing("new")}>
            <Plus size={12} /> New role
          </Button>
        )
      }
    >
      {roles.isPending && <Loading />}
      <ErrorNote error={roles.error ?? remove.error} className="m-4" />
      <ul className="divide-y divide-line">
        {roles.data?.map((role) => (
          <li key={role.key} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 font-bold text-ink">
                {role.name} {role.system ? <Badge tone="muted">System</Badge> : <Badge tone="brand">Custom</Badge>}
              </p>
              {role.description && <p className="text-sm text-muted">{role.description}</p>}
              <p className="font-mono text-[10px] text-muted">
                {role.permissions.length} permissions · {role.memberCount} {role.memberCount === 1 ? "member" : "members"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(role)}>
                <Pencil size={12} /> {manage && !role.system ? "Edit" : "View"}
              </Button>
              {manage && !role.system && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (confirm(`Delete the ${role.name} role?`)) remove.mutate(role, { onSuccess: () => toast.success(`${role.name} deleted`) });
                  }}
                >
                  <Trash2 size={12} /> Delete
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {editing && <RoleDialog role={editing === "new" ? null : editing} readOnly={!manage || (editing !== "new" && editing.system)} onClose={() => setEditing(null)} />}
    </Panel>
  );
}

/** Creates or edits a custom role from the permission catalog; system roles open read-only. */
function RoleDialog({ role, readOnly, onClose }: { role: Role | null; readOnly: boolean; onClose: () => void }) {
  const catalog = usePermissionCatalog();
  const [form, setForm] = useState({ key: role?.key ?? "", name: role?.name ?? "", description: role?.description ?? "", permissions: role?.permissions ?? [] });
  const save = useTenantMutation(
    (request, body: unknown) => (role ? request<Role>("PATCH", `/roles/${role.key}`, body) : request<Role>("POST", "/roles", body)),
    "team",
  );
  // Grouped by hand: Object.groupBy is newer than the browsers Next.js supports.
  const groups = [...new Set((catalog.data ?? []).map((p) => p.group))].map((group) => [group, catalog.data?.filter((p) => p.group === group)] as const);
  const toggle = (key: string, on: boolean) => setForm((f) => ({ ...f, permissions: on ? [...f.permissions, key] : f.permissions.filter((p) => p !== key) }));
  const issue = (path: string) => save.error?.issueFor(path);

  return (
    <Dialog open onClose={onClose} title={role ? role.name : "New role"} eyebrow={readOnly ? "Role" : role ? "Edit role" : "Create role"} width="lg">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const { key, ...fields } = form;
          save.mutate(role ? fields : { key, ...fields }, {
            onSuccess: (saved) => {
              toast.success(`${saved.name} saved`);
              onClose();
            },
          });
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Key" hint="Lowercase letters, digits and underscores, e.g. front_desk" error={issue("key")}>
            {(id) => <Input id={id} required disabled={Boolean(role)} pattern="[a-z][a-z0-9_]{1,31}" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />}
          </Field>
          <Field label="Name" error={issue("name")}>
            {(id) => <Input id={id} required disabled={readOnly} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
          </Field>
        </div>
        <Field label="Description" error={issue("description")}>
          {(id) => <Textarea id={id} disabled={readOnly} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />}
        </Field>
        {catalog.isPending && <Loading label="Loading permissions" />}
        <ErrorNote error={catalog.error} />
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map(([group, permissions]) => (
            <fieldset key={group} className="space-y-1.5 border border-line p-3">
              <legend className="px-1 text-[10px] font-bold tracking-wider text-muted uppercase">{group}</legend>
              {permissions?.map((p) => (
                <Checkbox
                  key={p.key}
                  disabled={readOnly}
                  checked={form.permissions.includes(p.key)}
                  onChange={(on) => toggle(p.key, on)}
                  label={
                    <>
                      {p.label}
                      {!p.available && <span className="ml-1 text-[10px] text-muted">(module off)</span>}
                    </>
                  }
                />
              ))}
            </fieldset>
          ))}
        </div>
        {issue("permissions") && <p className="text-[10px] font-bold text-rose-700">{issue("permissions")}</p>}
        <ErrorNote error={save.error} />
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="outline" onClick={onClose}>
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly && (
            <Button type="submit" variant="primary" disabled={save.isPending}>
              Save role
            </Button>
          )}
        </div>
      </form>
    </Dialog>
  );
}

function Activity() {
  const { format } = useWorkspace();
  const audit = useAudit();
  return (
    <Panel title="Activity">
      {audit.isPending && <Loading />}
      <ErrorNote error={audit.error} className="m-4" />
      {audit.data?.length === 0 && <EmptyState>No activity recorded yet.</EmptyState>}
      <ul className="divide-y divide-line font-mono text-xs">
        {audit.data?.map((entry) => (
          <li key={entry.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:justify-between">
            <span>{entry.summary}</span>
            <span className="shrink-0 text-muted">
              {entry.actor.name} · {format.dateTime(entry.at)}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
