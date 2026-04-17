import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, PencilSimple, Trash, MapPin } from "@phosphor-icons/react";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "cashier", location_id: "" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [usersRes, locRes] = await Promise.all([
        api.get("/users"),
        api.get("/locations"),
      ]);
      setUsers(usersRes.data || []);
      setLocations(locRes.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.location_id) delete payload.location_id;
      if (editing) {
        if (!payload.password) delete payload.password;
        await api.put(`/users/${editing}`, payload);
      } else {
        await api.post("/users", payload);
      }
      load(); resetForm();
    } catch (err) { console.error(err); }
  };

  const resetForm = () => { setForm({ name: "", email: "", password: "", role: "cashier", location_id: "" }); setEditing(null); setShowForm(false); };

  const startEdit = (u) => {
    setForm({ name: u.name, email: u.email, password: "", role: u.role, location_id: u.location_id || "" });
    setEditing(u.id);
    setShowForm(true);
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try { await api.delete(`/users/${id}`); load(); }
    catch (err) { console.error(err); }
  };

  const roleColor = (r) => r === "admin" ? "bg-navy-800 text-white" : r === "production_staff" ? "bg-status-warning-bg text-status-warning" : "bg-status-success-bg text-status-success";

  const outlets = locations.filter(l => l.type === "outlet");

  const getLocationName = (u) => {
    if (u.locations) return u.locations.name;
    if (u.location_id) {
      const loc = locations.find(l => l.id === u.location_id);
      return loc?.name || "—";
    }
    return "—";
  };

  return (
    <div data-testid="users-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-medium text-navy-900 tracking-tight">Users</h1>
          <p className="text-navy-500 mt-1">Manage staff accounts, roles, and outlet assignments</p>
        </div>
        <Button data-testid="add-user-button" onClick={() => setShowForm(true)} className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">
          <Plus size={18} className="mr-2" /> Add User
        </Button>
      </div>

      {showForm && (
        <div className="bg-white border border-beige-300 rounded-2xl p-6 shadow-sm">
          <h3 className="font-heading font-medium text-navy-900 mb-4">{editing ? "Edit User" : "New User"}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input data-testid="user-name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Full Name" required className="bg-white border-beige-300 rounded-xl" />
            <Input data-testid="user-email" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="Email" required className="bg-white border-beige-300 rounded-xl" />
            <Input data-testid="user-password" type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} placeholder={editing ? "New Password (leave blank)" : "Password"} required={!editing} className="bg-white border-beige-300 rounded-xl" />
            <select data-testid="user-role" value={form.role} onChange={(e) => setForm({...form, role: e.target.value})} className="w-full bg-white border border-beige-300 rounded-xl px-4 py-3 text-sm text-navy-900">
              <option value="cashier">Cashier</option>
              <option value="production_staff">Production Staff</option>
              <option value="admin">Admin</option>
            </select>
            <div className="md:col-span-2">
              <label className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500 mb-1 block">
                <MapPin size={12} className="inline mr-1" />Assigned Location (for Cashiers/Staff)
              </label>
              <select
                data-testid="user-location"
                value={form.location_id}
                onChange={(e) => setForm({...form, location_id: e.target.value})}
                className="w-full bg-white border border-beige-300 rounded-xl px-4 py-3 text-sm text-navy-900"
              >
                <option value="">No specific location (All access)</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
                ))}
              </select>
              <p className="text-xs text-navy-400 mt-1">Cashiers and staff assigned to a location will only see that location's inventory and POS data.</p>
            </div>
            <div className="md:col-span-2 flex gap-3">
              <Button type="submit" data-testid="user-submit-button" className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">{editing ? "Update" : "Create"}</Button>
              <Button type="button" onClick={resetForm} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">Cancel</Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-beige-300 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(19,29,51,0.03)]">
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-beige-100">
            <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Name</th>
            <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Email</th>
            <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Role</th>
            <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Location</th>
            <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Status</th>
            <th className="text-right py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Actions</th>
          </tr></thead><tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-beige-200 hover:bg-beige-50 transition-colors">
                <td className="py-3 px-6 text-sm text-navy-900 font-medium">{u.name}</td>
                <td className="py-3 px-6 text-sm text-navy-700">{u.email}</td>
                <td className="py-3 px-6"><span className={`text-xs px-2 py-1 rounded-lg capitalize ${roleColor(u.role)}`}>{u.role?.replace("_", " ")}</span></td>
                <td className="py-3 px-6 text-sm text-navy-700">
                  {getLocationName(u) !== "—" ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-beige-200 text-navy-700">
                      <MapPin size={12} /> {getLocationName(u)}
                    </span>
                  ) : (
                    <span className="text-navy-400 text-xs">All locations</span>
                  )}
                </td>
                <td className="py-3 px-6"><span className={`text-xs px-2 py-1 rounded-lg ${u.is_active !== false ? "bg-status-success-bg text-status-success" : "bg-status-danger-bg text-status-danger"}`}>{u.is_active !== false ? "Active" : "Disabled"}</span></td>
                <td className="py-3 px-6 text-right flex gap-2 justify-end">
                  <button data-testid={`edit-user-${u.email}`} onClick={() => startEdit(u)} className="text-navy-500 hover:text-navy-700"><PencilSimple size={16} /></button>
                  <button data-testid={`delete-user-${u.email}`} onClick={() => deleteUser(u.id)} className="text-status-danger hover:text-status-danger/80"><Trash size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </div>
    </div>
  );
}
