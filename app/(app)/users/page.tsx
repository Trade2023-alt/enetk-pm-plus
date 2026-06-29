"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Search, Save, ShieldAlert, Loader2, CheckCircle2, UserCheck } from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  customer_id: string | null;
}

interface Customer {
  id: string;
  name: string;
}

export default function UsersPage() {
  const { user: currentUser } = useUser();
  const isAdmin = currentUser?.publicMetadata?.role === "admin";

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [successUserId, setSuccessUserId] = useState<string | null>(null);

  // Load users and customers
  useEffect(() => {
    if (!isAdmin) return;

    const loadData = async () => {
      try {
        const [usersRes, customersRes] = await Promise.all([
          fetch("/api/users").then((r) => r.json()),
          fetch("/api/customers").then((r) => r.json()),
        ]);

        if (usersRes.users) setUsers(usersRes.users);
        if (customersRes.customers) setCustomers(customersRes.customers);
      } catch (err) {
        console.error("Failed to load users data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAdmin]);

  // Handle role/customer update
  const handleUpdate = async (userId: string, role: string, customerId: string | null) => {
    setUpdatingUserId(userId);
    setSuccessUserId(null);

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          customer_id: role === "customer" ? customerId : null,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const { user: updatedUser } = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: updatedUser.role, customer_id: updatedUser.customer_id } : u))
      );

      setSuccessUserId(userId);
      setTimeout(() => setSuccessUserId(null), 2500);
    } catch (err) {
      console.error("Failed to update user:", err);
      alert("Failed to update user settings.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (!currentUser) return null;

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-full">
        <div className="max-w-md p-8 rounded-xl border border-red-500/20 bg-red-950/10 backdrop-blur-md">
          <ShieldAlert size={48} className="text-red-500 mx-auto mb-4 animate-bounce" />
          <h1 className="text-lg font-bold text-white mb-2">Access Denied</h1>
          <p className="text-xs text-slate-400">
            You must be an administrator to access the Users & Permissions settings.
          </p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Page Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
        style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}
      >
        <div>
          <h1 className="text-base font-bold text-white">Users & Permissions</h1>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Configure team members, admin privileges, and link client users to specific customer databases.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <Search
            size={13}
            style={{ color: "var(--text-muted)", position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs outline-none transition-colors"
            style={{
              background: "var(--bg-base)",
              borderColor: "var(--border-subtle)",
              color: "var(--text-primary)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--maroon)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-red-500" size={24} />
            <p className="text-xs text-slate-400">Loading user profiles...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-20 border border-dashed rounded-xl" style={{ borderColor: "var(--border-subtle)" }}>
            <p className="text-xs text-slate-400">No users found.</p>
          </div>
        ) : (
          <div
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-[10px] font-semibold uppercase tracking-wider" style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Joined</th>
                  <th className="px-5 py-3.5">System Role</th>
                  <th className="px-5 py-3.5">Linked Customer</th>
                  <th className="px-5 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs divide-slate-800">
                {filteredUsers.map((u) => {
                  const initials = (u.full_name ?? u.email)[0].toUpperCase();
                  const isUpdating = updatingUserId === u.id;
                  const isSuccess = successUserId === u.id;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-white/5 transition-colors"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {/* Name & Avatar */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                            style={{ background: "var(--maroon-subtle)", color: "var(--maroon-light)" }}
                          >
                            {initials}
                          </div>
                          <div>
                            <span className="font-semibold block">{u.full_name ?? "Pending Sync"}</span>
                            <span className="text-[10px] text-slate-400 block">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Date Joined */}
                      <td className="px-5 py-4 text-slate-400">
                        {new Date(u.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>

                      {/* Role selector */}
                      <td className="px-5 py-4">
                        <select
                          value={u.role}
                          disabled={isUpdating}
                          onChange={(e) => handleUpdate(u.id, e.target.value, u.customer_id)}
                          className="px-2 py-1.5 rounded-lg border text-xs outline-none bg-slate-900 border-slate-700 text-slate-200 cursor-pointer"
                        >
                          <option value="user">Employee / User</option>
                          <option value="admin">Administrator</option>
                          <option value="customer">Customer Access</option>
                        </select>
                      </td>

                      {/* Linked Customer dropdown */}
                      <td className="px-5 py-4">
                        {u.role === "customer" ? (
                          <select
                            value={u.customer_id ?? ""}
                            disabled={isUpdating}
                            onChange={(e) => handleUpdate(u.id, u.role, e.target.value || null)}
                            className="px-2 py-1.5 rounded-lg border text-xs outline-none bg-slate-900 border-slate-700 text-slate-200 cursor-pointer max-w-[200px]"
                          >
                            <option value="">-- Choose Customer --</option>
                            {customers.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Not applicable</span>
                        )}
                      </td>

                      {/* Actions / Status indicator */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 min-h-[32px]">
                          {isUpdating && (
                            <Loader2 className="animate-spin text-red-500" size={14} />
                          )}
                          {isSuccess && (
                            <div className="flex items-center gap-1 text-[10px] text-green-500 animate-fade-in font-medium">
                              <CheckCircle2 size={12} />
                              <span>Saved</span>
                            </div>
                          )}
                          {!isUpdating && !isSuccess && (
                            <span
                              className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                background: u.is_active ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                                color: u.is_active ? "var(--status-ok)" : "var(--status-overdue)",
                              }}
                            >
                              {u.is_active ? "Active" : "Inactive"}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
