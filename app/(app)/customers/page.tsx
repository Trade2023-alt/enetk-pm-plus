"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Building2, Phone, Mail, MapPin, Plus, Search,
  ChevronRight, Star, Users, FolderKanban, Pencil,
  X, Save, AlertTriangle, Trash2,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Contact {
  id: string;
  first_name: string;
  last_name: string | null;
  title: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
}

interface Customer {
  id: string;
  name: string;
  industry: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  contacts: Contact[];
  projects: { id: string; name: string; color: string; status: string }[];
}

// ─── Blank state ────────────────────────────────────────────────────────────
const blankCustomer = () => ({
  name: "", industry: "", phone: "", email: "", address: "", notes: "",
});
const blankContact = () => ({
  first_name: "", last_name: "", title: "", phone: "", email: "", is_primary: false,
});

// ─── Input style helpers ──────────────────────────────────────────────────────
const inp = "w-full px-3 py-2 rounded-lg border text-xs outline-none transition-colors";
const inpStyle = {
  background: "var(--bg-surface)" as const,
  borderColor: "var(--border-subtle)" as const,
  color: "var(--text-primary)" as const,
};
const onF = (e: React.FocusEvent<HTMLElement>) => (e.target as HTMLElement).style.borderColor = "var(--maroon)";
const onB = (e: React.FocusEvent<HTMLElement>) => (e.target as HTMLElement).style.borderColor = "var(--border-subtle)";

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function CustomersPage() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";

  const [customers,   setCustomers]   = useState<Customer[]>([]);
  const [selected,    setSelected]    = useState<Customer | null>(null);
  const [search,      setSearch]      = useState("");
  const [loading,     setLoading]     = useState(true);

  // Modals
  const [custModal,   setCustModal]   = useState<"create"|"edit"|null>(null);
  const [contModal,   setContModal]   = useState<"create"|"edit"|null>(null);
  const [editContact, setEditContact] = useState<Contact | null>(null);

  // Form state
  const [custForm,    setCustForm]    = useState(blankCustomer());
  const [contForm,    setContForm]    = useState(blankContact());
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string|null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`);
      if (res.ok) {
        const { customers: data } = await res.json();
        setCustomers(data ?? []);
        // Re-select to pick up fresh data
        if (selected) {
          const fresh = (data ?? []).find((c: Customer) => c.id === selected.id);
          if (fresh) setSelected(fresh);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [search, selected?.id]);

  useEffect(() => { fetchCustomers(); }, [search]);
  useEffect(() => { fetchCustomers(); }, []); // initial load

  // ── Customer save ──────────────────────────────────────────────────────────
  const saveCustomer = async () => {
    if (!custForm.name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError(null);
    try {
      const url    = custModal === "edit" && selected ? `/api/customers/${selected.id}` : "/api/customers";
      const method = custModal === "edit" ? "PATCH" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(custForm),
      });
      if (!res.ok) throw new Error(await res.text());
      const { customer } = await res.json();

      if (custModal === "edit") {
        setCustomers((cs) => cs.map((c) => c.id === customer.id ? customer : c));
        setSelected(customer);
      } else {
        setCustomers((cs) => [customer, ...cs]);
        setSelected(customer);
      }
      setCustModal(null);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  // ── Contact save ───────────────────────────────────────────────────────────
  const saveContact = async () => {
    if (!contForm.first_name.trim()) { setError("First name is required."); return; }
    if (!selected) return;
    setSaving(true); setError(null);
    try {
      const url    = contModal === "edit" && editContact ? `/api/contacts/${editContact.id}` : "/api/contacts";
      const method = contModal === "edit" ? "PATCH" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...contForm, customer_id: selected.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchCustomers();
      setContModal(null);
      setEditContact(null);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  // ── Delete contact ─────────────────────────────────────────────────────────
  const deleteContact = async (contactId: string) => {
    if (!confirm("Remove this contact?")) return;
    await fetch(`/api/contacts/${contactId}`, { method: "DELETE" });
    await fetchCustomers();
  };

  // ── Deactivate customer ────────────────────────────────────────────────────
  const deactivateCustomer = async () => {
    if (!selected || !confirm(`Deactivate "${selected.name}"?`)) return;
    await fetch(`/api/customers/${selected.id}`, { method: "DELETE" });
    setCustomers((cs) => cs.filter((c) => c.id !== selected.id));
    setSelected(null);
  };

  // ── UI ─────────────────────────────────────────────────────────────────────
  const statusColor: Record<string, string> = {
    active:    "var(--status-ok)",
    on_hold:   "var(--status-warning)",
    completed: "var(--text-muted)",
    archived:  "var(--text-muted)",
  };

  return (
    <div className="flex h-full overflow-hidden" style={{ color: "var(--text-primary)" }}>

      {/* ── LEFT: Customer list ─────────────────────────────────────────────── */}
      <div
        className="flex flex-col border-r flex-shrink-0 overflow-hidden"
        style={{ width: "280px", borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center gap-2">
            <Building2 size={14} style={{ color: "var(--maroon-light)" }} />
            <span className="text-sm font-semibold">Customers</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--maroon-subtle)", color: "var(--maroon-light)" }}>
              {customers.length}
            </span>
          </div>
          <button
            onClick={() => { setCustForm(blankCustomer()); setCustModal("create"); setError(null); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
            style={{ background: "var(--maroon)", color: "white" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--maroon-light)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--maroon)")}
          >
            <Plus size={11} /> New
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: "var(--bg-elevated)" }}>
            <Search size={11} style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers…"
              className="flex-1 bg-transparent text-xs outline-none"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--maroon)" }} />
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 px-4 text-center">
              <Building2 size={24} style={{ color: "var(--text-muted)" }} />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>No customers yet. Click + New to add one.</p>
            </div>
          ) : (
            customers.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="w-full text-left px-4 py-3 border-b transition-colors"
                style={{
                  borderColor: "var(--border-subtle)",
                  background:  selected?.id === c.id ? "var(--maroon-subtle)" : "transparent",
                }}
                onMouseEnter={(e) => { if (selected?.id !== c.id) e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={(e) => { if (selected?.id !== c.id) e.currentTarget.style.background = "transparent"; }}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate" style={{ color: selected?.id === c.id ? "var(--maroon-light)" : "var(--text-primary)" }}>
                      {c.name}
                    </div>
                    {c.industry && (
                      <div className="text-[10px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>{c.industry}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {c.contacts.length > 0 && (
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        <Users size={9} className="inline mr-0.5" />{c.contacts.length}
                      </span>
                    )}
                    {c.projects.length > 0 && (
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        <FolderKanban size={9} className="inline mr-0.5" />{c.projects.length}
                      </span>
                    )}
                    <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT: Customer detail panel ────────────────────────────────────── */}
      {selected ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Customer header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{selected.name}</h1>
              {selected.industry && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{selected.industry}</p>
              )}
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} className="flex items-center gap-1 text-xs transition-colors" style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--maroon-light)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                  >
                    <Phone size={11} />{selected.phone}
                  </a>
                )}
                {selected.email && (
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-1 text-xs transition-colors" style={{ color: "var(--text-secondary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--maroon-light)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                  >
                    <Mail size={11} />{selected.email}
                  </a>
                )}
                {selected.address && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <MapPin size={11} />{selected.address}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => { setCustForm({ name: selected.name, industry: selected.industry ?? "", phone: selected.phone ?? "", email: selected.email ?? "", address: selected.address ?? "", notes: selected.notes ?? "" }); setCustModal("edit"); setError(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)", background: "transparent" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                <Pencil size={11} /> Edit
              </button>
              {isAdmin && (
                <button onClick={deactivateCustomer} className="p-1.5 rounded-lg border transition-colors"
                  style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--status-overdue)"; e.currentTarget.style.borderColor = "var(--status-overdue)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
                  title="Deactivate customer"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>

          {selected.notes && (
            <div className="px-3 py-2.5 rounded-lg text-xs" style={{ background: "var(--bg-surface)", color: "var(--text-secondary)", borderLeft: "2px solid var(--border-strong)" }}>
              {selected.notes}
            </div>
          )}

          {/* ── Contacts ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Contacts ({selected.contacts.length})
              </h2>
              <button
                onClick={() => { setContForm(blankContact()); setEditContact(null); setContModal("create"); setError(null); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                style={{ background: "var(--maroon-subtle)", color: "var(--maroon-light)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--maroon)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--maroon-subtle)")}
              >
                <Plus size={11} /> Add Contact
              </button>
            </div>

            {selected.contacts.length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-3 rounded-lg text-xs" style={{ background: "var(--bg-surface)", color: "var(--text-muted)" }}>
                <Users size={13} /> No contacts yet — add someone to call!
              </div>
            ) : (
              <div className="space-y-2">
                {selected.contacts
                  .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
                  .map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border group"
                      style={{ background: "var(--bg-surface)", borderColor: contact.is_primary ? "var(--maroon)" : "var(--border-subtle)" }}
                    >
                      {/* Avatar */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: "var(--maroon-subtle)", color: "var(--maroon-light)" }}
                      >
                        {contact.first_name[0]}{contact.last_name?.[0] ?? ""}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                            {contact.first_name} {contact.last_name}
                          </span>
                          {contact.is_primary && (
                            <Star size={9} style={{ color: "var(--maroon-light)", flexShrink: 0 }} />
                          )}
                        </div>
                        {contact.title && (
                          <div className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{contact.title}</div>
                        )}
                        <div className="flex items-center gap-3 mt-0.5">
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} className="text-[10px] flex items-center gap-0.5 transition-colors"
                              style={{ color: "var(--text-secondary)" }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--maroon-light)")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                            >
                              <Phone size={9} />{contact.phone}
                            </a>
                          )}
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} className="text-[10px] flex items-center gap-0.5 transition-colors"
                              style={{ color: "var(--text-secondary)" }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--maroon-light)")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                            >
                              <Mail size={9} />{contact.email}
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setContForm({ first_name: contact.first_name, last_name: contact.last_name ?? "", title: contact.title ?? "", phone: contact.phone ?? "", email: contact.email ?? "", is_primary: contact.is_primary }); setEditContact(contact); setContModal("edit"); setError(null); }}
                          className="p-1 rounded transition-colors" style={{ color: "var(--text-muted)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                        >
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => deleteContact(contact.id)}
                          className="p-1 rounded transition-colors" style={{ color: "var(--text-muted)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--status-overdue)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* ── Linked Projects ── */}
          {selected.projects.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                Projects ({selected.projects.length})
              </h2>
              <div className="space-y-1.5">
                {selected.projects.map((proj) => (
                  <div key={proj.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: "var(--bg-surface)" }}>
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: proj.color ?? "var(--maroon)" }} />
                    <span className="text-xs font-medium flex-1" style={{ color: "var(--text-primary)" }}>{proj.name}</span>
                    <span className="text-[10px] capitalize px-1.5 py-0.5 rounded" style={{ background: "var(--bg-elevated)", color: statusColor[proj.status] ?? "var(--text-muted)" }}>
                      {proj.status?.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Building2 size={40} style={{ color: "var(--text-muted)", margin: "0 auto" }} />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Select a customer to view details</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>or click + New to add your first customer</p>
          </div>
        </div>
      )}

      {/* ══ Customer Modal ══════════════════════════════════════════════════════ */}
      {custModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setCustModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="w-full max-w-md flex flex-col rounded-xl border pointer-events-auto animate-fade-in"
              style={{ background: "var(--bg-elevated)", borderColor: "var(--border-strong)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", maxHeight: "90vh", overflow: "hidden" }}
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0" style={{ borderColor: "var(--border-subtle)" }}>
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{custModal === "edit" ? "Edit Customer" : "New Customer"}</h2>
                <button onClick={() => setCustModal(null)} className="p-1.5 rounded-md transition-colors" style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
                ><X size={15} /></button>
              </div>

              <div className="px-5 py-4 space-y-3 overflow-y-auto">
                {error && <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs border" style={{ background: "hsl(0,70%,12%)", borderColor: "var(--status-overdue)", color: "var(--status-overdue)" }}><AlertTriangle size={12} />{error}</div>}

                <div>
                  <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Company Name <span style={{ color: "var(--status-overdue)" }}>*</span></label>
                  <input type="text" value={custForm.name} onChange={(e) => setCustForm((f) => ({ ...f, name: e.target.value }))} placeholder="Suncor Energy" autoFocus className={inp} style={inpStyle} onFocus={onF} onBlur={onB} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Industry</label>
                    <input type="text" value={custForm.industry} onChange={(e) => setCustForm((f) => ({ ...f, industry: e.target.value }))} placeholder="Oil & Gas" className={inp} style={inpStyle} onFocus={onF} onBlur={onB} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Phone</label>
                    <input type="tel" value={custForm.phone} onChange={(e) => setCustForm((f) => ({ ...f, phone: e.target.value }))} placeholder="403-555-0100" className={inp} style={inpStyle} onFocus={onF} onBlur={onB} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Email</label>
                  <input type="email" value={custForm.email} onChange={(e) => setCustForm((f) => ({ ...f, email: e.target.value }))} placeholder="info@company.com" className={inp} style={inpStyle} onFocus={onF} onBlur={onB} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Address / Site</label>
                  <input type="text" value={custForm.address} onChange={(e) => setCustForm((f) => ({ ...f, address: e.target.value }))} placeholder="123 Industrial Ave, Calgary AB" className={inp} style={inpStyle} onFocus={onF} onBlur={onB} />
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Notes</label>
                  <textarea rows={2} value={custForm.notes} onChange={(e) => setCustForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Access requirements, special instructions..." className={inp + " resize-none"} style={inpStyle} onFocus={onF} onBlur={onB} />
                </div>
              </div>

              <div className="flex justify-end gap-2 px-5 py-3 border-t flex-shrink-0" style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
                <button onClick={() => setCustModal(null)} className="px-3 py-1.5 rounded-lg text-xs border transition-colors" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)", background: "transparent" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>Cancel</button>
                <button onClick={saveCustomer} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60" style={{ background: "var(--maroon)", color: "white" }}>
                  <Save size={11} />{saving ? "Saving…" : custModal === "edit" ? "Save Changes" : "Create Customer"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══ Contact Modal ═══════════════════════════════════════════════════════ */}
      {contModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setContModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="w-full max-w-sm flex flex-col rounded-xl border pointer-events-auto animate-fade-in"
              style={{ background: "var(--bg-elevated)", borderColor: "var(--border-strong)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{contModal === "edit" ? "Edit Contact" : "Add Contact"}</h2>
                <button onClick={() => setContModal(null)} className="p-1.5 rounded-md transition-colors" style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
                ><X size={15} /></button>
              </div>

              <div className="px-5 py-4 space-y-3">
                {error && <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs border" style={{ background: "hsl(0,70%,12%)", borderColor: "var(--status-overdue)", color: "var(--status-overdue)" }}><AlertTriangle size={12} />{error}</div>}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>First Name <span style={{ color: "var(--status-overdue)" }}>*</span></label>
                    <input type="text" value={contForm.first_name} onChange={(e) => setContForm((f) => ({ ...f, first_name: e.target.value }))} autoFocus className={inp} style={inpStyle} onFocus={onF} onBlur={onB} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Last Name</label>
                    <input type="text" value={contForm.last_name} onChange={(e) => setContForm((f) => ({ ...f, last_name: e.target.value }))} className={inp} style={inpStyle} onFocus={onF} onBlur={onB} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Job Title</label>
                  <input type="text" value={contForm.title} onChange={(e) => setContForm((f) => ({ ...f, title: e.target.value }))} placeholder="Site Manager" className={inp} style={inpStyle} onFocus={onF} onBlur={onB} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Phone</label>
                    <input type="tel" value={contForm.phone} onChange={(e) => setContForm((f) => ({ ...f, phone: e.target.value }))} placeholder="403-555-1234" className={inp} style={inpStyle} onFocus={onF} onBlur={onB} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Email</label>
                    <input type="email" value={contForm.email} onChange={(e) => setContForm((f) => ({ ...f, email: e.target.value }))} className={inp} style={inpStyle} onFocus={onF} onBlur={onB} />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input type="checkbox" checked={contForm.is_primary} onChange={(e) => setContForm((f) => ({ ...f, is_primary: e.target.checked }))} className="rounded" />
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Primary contact <Star size={9} className="inline ml-0.5" style={{ color: "var(--maroon-light)" }} /></span>
                </label>
              </div>

              <div className="flex justify-end gap-2 px-5 py-3 border-t" style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }}>
                <button onClick={() => setContModal(null)} className="px-3 py-1.5 rounded-lg text-xs border transition-colors" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)", background: "transparent" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>Cancel</button>
                <button onClick={saveContact} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60" style={{ background: "var(--maroon)", color: "white" }}>
                  <Save size={11} />{saving ? "Saving…" : contModal === "edit" ? "Save Changes" : "Add Contact"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
