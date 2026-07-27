import { useEffect, useState } from "react";
import { Search, UserCheck, UserX } from "lucide-react";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/DashboardLayout";
import { adminApi, ApiError, type AuthUser } from "@/lib/api";

const roleStyles: Record<string, string> = {
  customer: "bg-blue-100 text-blue-700",
  provider: "bg-green-100 text-green-700",
  admin: "bg-purple-100 text-purple-700",
};



export default function AdminUsers() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.users({
        role: filter === "all" ? undefined : filter,
        search: search || undefined,
      });
      setUsers(res.users);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(load, 300); // debounce search
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search]);

  const toggleStatus = async (user: AuthUser) => {
    setBusyId(user.id);
    setErrorMessage(null);
    const nextActive = user.isActive === false;
    try {
      const res = await adminApi.updateUserStatus(user.id, nextActive);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...res.user } : u)));
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not update user status.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardLayout role="admin" title="User Management">
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 rounded-xl border-slate-200" />
          </div>
          <div className="flex gap-2">
            {["all", "customer", "provider", "admin"].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${filter === f ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{errorMessage}</div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-sm text-slate-400 p-6">Loading users...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Joined</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const effectiveRole = user.isAdmin ? "admin" : user.activeRole;
                  const isActive = user.isActive !== false;
                  return (
                    <tr key={user.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={user.avatar || "/avatar-customer-1.jpg"} alt="" className="w-9 h-9 rounded-full object-cover" />
                          <div>
                            <p className="text-sm font-medium text-slate-800">{user.name}</p>
                            <p className="text-xs text-slate-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${roleStyles[effectiveRole]}`}>{effectiveRole}</span></td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {isActive ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        {!user.isAdmin && (
                          <div className="flex items-center justify-end gap-1">
                            {isActive ? (
                              <button disabled={busyId === user.id} onClick={() => toggleStatus(user)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Suspend user">
                                <UserX className="w-4 h-4" />
                              </button>
                            ) : (
                              <button disabled={busyId === user.id} onClick={() => toggleStatus(user)} className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50" title="Reactivate user">
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && users.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-10">No users found.</p>
        )}
      </div>
    </DashboardLayout>
  );
}
