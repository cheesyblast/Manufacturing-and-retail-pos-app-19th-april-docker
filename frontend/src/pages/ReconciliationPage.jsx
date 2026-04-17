import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CashRegister, Clock, Check, Warning, Plus, ArrowRight, Money } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function ReconciliationPage() {
  const { user } = useAuth();
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [currentShift, setCurrentShift] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [openingFloat, setOpeningFloat] = useState(0);
  const [actualCash, setActualCash] = useState(0);
  const [closeNotes, setCloseNotes] = useState("");
  const [showPettyForm, setShowPettyForm] = useState(false);
  const [pettyForm, setPettyForm] = useState({ type: "expense", category: "Miscellaneous", description: "", amount: "" });
  const [pettyList, setPettyList] = useState([]);
  const [viewShift, setViewShift] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [locRes, shiftsRes] = await Promise.all([
          api.get("/locations"),
          api.get("/shifts", { params: { limit: 20 } }),
        ]);
        const outlets = (locRes.data || []).filter(l => l.type === "outlet");
        setLocations(outlets);
        setShifts(shiftsRes.data?.data || []);
        if (outlets.length > 0) {
          const loc = user?.location_id || outlets[0].id;
          setSelectedLocation(loc);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!selectedLocation) return;
    const loadShift = async () => {
      try {
        const { data } = await api.get(`/shifts/current/${selectedLocation}`);
        setCurrentShift(data);
        if (data?.id) {
          const petty = await api.get("/petty-cash", { params: { shift_id: data.id } });
          setPettyList(petty.data || []);
        } else {
          setPettyList([]);
        }
      } catch { setCurrentShift(null); setPettyList([]); }
    };
    loadShift();
  }, [selectedLocation]);

  const openShift = async () => {
    try {
      const { data } = await api.post("/shifts/open", { location_id: selectedLocation, opening_float: openingFloat });
      setCurrentShift(data);
      toast.success("Shift opened");
      setOpeningFloat(0);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to open shift");
    }
  };

  const closeShift = async () => {
    if (!currentShift?.id) return;
    try {
      await api.post(`/shifts/${currentShift.id}/close`, { actual_cash: actualCash, notes: closeNotes });
      toast.success("Shift closed");
      setCurrentShift(null);
      setActualCash(0);
      setCloseNotes("");
      const { data } = await api.get("/shifts", { params: { limit: 20 } });
      setShifts(data?.data || []);
    } catch (err) {
      toast.error("Failed to close shift");
    }
  };

  const addPettyCash = async (e) => {
    e.preventDefault();
    if (!currentShift?.id) return;
    try {
      const { data } = await api.post("/petty-cash", {
        ...pettyForm,
        amount: parseFloat(pettyForm.amount),
        location_id: selectedLocation,
        shift_id: currentShift.id
      });
      setPettyList([data, ...pettyList]);
      setShowPettyForm(false);
      setPettyForm({ type: "expense", category: "Miscellaneous", description: "", amount: "" });
      toast.success("Petty cash recorded");
      // Refresh current shift
      const res = await api.get(`/shifts/current/${selectedLocation}`);
      setCurrentShift(res.data);
    } catch (err) {
      toast.error("Failed to record petty cash");
    }
  };

  const loadShiftDetail = async (shiftId) => {
    try {
      const { data } = await api.get(`/shifts/${shiftId}`);
      setViewShift(data);
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const expected = currentShift?.expected_cash || 0;
  const discrepancy = actualCash - expected;

  return (
    <div data-testid="reconciliation-page" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-medium text-navy-900 tracking-tight">Reconciliation</h1>
          <p className="text-navy-500 mt-1">Shift management, petty cash, and daily cash reconciliation</p>
        </div>
        <select
          data-testid="recon-location-select"
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="bg-white border border-beige-300 rounded-xl px-3 py-2 text-sm text-navy-700"
        >
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      {/* Current Shift Status */}
      {!currentShift ? (
        <div className="bg-white border border-beige-300 rounded-2xl p-8 text-center">
          <CashRegister size={48} className="mx-auto text-navy-400 mb-4" />
          <h3 className="font-heading font-medium text-navy-900 text-xl mb-2">No Active Shift</h3>
          <p className="text-navy-500 mb-6">Open a new shift to start tracking cash flow for this outlet.</p>
          <div className="flex items-center justify-center gap-3">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.15em] font-bold text-beige-500">Opening Float (Rs)</label>
              <Input
                data-testid="opening-float-input"
                type="number"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="bg-white border-beige-300 rounded-xl w-48"
              />
            </div>
            <Button data-testid="open-shift-button" onClick={openShift} className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl mt-5">
              <Clock size={16} className="mr-2" /> Open Shift
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Live Shift Summary */}
          <div className="bg-white border border-beige-300 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-status-success animate-pulse" />
                <h3 className="font-heading font-medium text-navy-900">Active Shift</h3>
                <span className="text-xs text-navy-500">Since {new Date(currentShift.created_at).toLocaleTimeString()}</span>
              </div>
              <Button onClick={() => setShowPettyForm(true)} className="bg-beige-200 text-navy-700 hover:bg-beige-300 rounded-xl text-sm">
                <Plus size={14} className="mr-1" /> Petty Cash
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-beige-50 rounded-xl p-3 text-center">
                <p className="text-xs text-navy-500">Opening</p>
                <p className="text-lg font-heading font-medium text-navy-900">Rs {parseFloat(currentShift.opening_float || 0).toLocaleString()}</p>
              </div>
              <div className="bg-beige-50 rounded-xl p-3 text-center">
                <p className="text-xs text-navy-500">Cash Sales</p>
                <p className="text-lg font-heading font-medium text-status-success">Rs {parseFloat(currentShift.cash_sales || 0).toLocaleString()}</p>
              </div>
              <div className="bg-beige-50 rounded-xl p-3 text-center">
                <p className="text-xs text-navy-500">Card Sales</p>
                <p className="text-lg font-heading font-medium text-navy-900">Rs {parseFloat(currentShift.card_sales || 0).toLocaleString()}</p>
              </div>
              <div className="bg-beige-50 rounded-xl p-3 text-center">
                <p className="text-xs text-navy-500">Manual Income</p>
                <p className="text-lg font-heading font-medium text-navy-900">Rs {parseFloat(currentShift.manual_income || 0).toLocaleString()}</p>
              </div>
              <div className="bg-beige-50 rounded-xl p-3 text-center">
                <p className="text-xs text-navy-500">Manual Expenses</p>
                <p className="text-lg font-heading font-medium text-status-danger">Rs {parseFloat(currentShift.manual_expenses || 0).toLocaleString()}</p>
              </div>
              <div className="bg-navy-800 rounded-xl p-3 text-center">
                <p className="text-xs text-white/60">Expected Cash</p>
                <p className="text-lg font-heading font-medium text-white">Rs {parseFloat(currentShift.expected_cash || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Petty Cash List */}
          {pettyList.length > 0 && (
            <div className="bg-white border border-beige-300 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-beige-200">
                <h4 className="font-heading font-medium text-navy-900 text-sm">Petty Cash Entries</h4>
              </div>
              <div className="divide-y divide-beige-200">
                {pettyList.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-2.5">
                    <div>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${p.type === "income" ? "bg-status-success-bg text-status-success" : "bg-status-danger-bg text-status-danger"}`}>
                        {p.type}
                      </span>
                      <span className="text-sm text-navy-700 ml-2">{p.category}</span>
                      {p.description && <span className="text-xs text-navy-400 ml-1">- {p.description}</span>}
                    </div>
                    <span className={`text-sm font-medium ${p.type === "income" ? "text-status-success" : "text-status-danger"}`}>
                      {p.type === "expense" ? "-" : "+"}Rs {parseFloat(p.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Close Shift */}
          <div className="bg-white border-2 border-navy-800 rounded-2xl p-6">
            <h3 className="font-heading font-medium text-navy-900 text-lg mb-4 flex items-center gap-2">
              <CashRegister size={20} /> Close Shift
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-xs uppercase tracking-[0.15em] font-bold text-beige-500 mb-1 block">Actual Cash in Hand (Rs)</label>
                <Input
                  data-testid="actual-cash-input"
                  type="number"
                  value={actualCash}
                  onChange={(e) => setActualCash(parseFloat(e.target.value) || 0)}
                  placeholder="Count your cash"
                  className="bg-white border-beige-300 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.15em] font-bold text-beige-500 mb-1 block">Notes</label>
                <Input
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Optional notes"
                  className="bg-white border-beige-300 rounded-xl"
                />
              </div>
              <Button data-testid="close-shift-button" onClick={closeShift} className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl h-10">
                <Check size={16} className="mr-2" /> Close Shift
              </Button>
            </div>
            {actualCash > 0 && (
              <div className={`mt-4 p-4 rounded-xl ${Math.abs(discrepancy) < 1 ? "bg-status-success-bg" : "bg-status-warning-bg"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-navy-900">Expected: Rs {expected.toLocaleString()}</p>
                    <p className="text-sm text-navy-700">Actual: Rs {actualCash.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wider font-bold text-navy-500">{discrepancy > 0 ? "Overage" : discrepancy < 0 ? "Shortage" : "Balanced"}</p>
                    <p className={`text-xl font-heading font-bold ${discrepancy > 0 ? "text-status-success" : discrepancy < 0 ? "text-status-danger" : "text-navy-900"}`}>
                      {discrepancy >= 0 ? "+" : ""}Rs {discrepancy.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shift History */}
      <div className="bg-white border border-beige-300 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(19,29,51,0.03)]">
        <div className="px-5 py-4 border-b border-beige-200">
          <h3 className="font-heading font-medium text-navy-900">Shift History</h3>
        </div>
        {shifts.length === 0 ? (
          <div className="p-8 text-center text-navy-500">No shift records yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-beige-100">
                <th className="text-left py-2.5 px-5 text-xs uppercase tracking-wider font-bold text-navy-500">Date</th>
                <th className="text-left py-2.5 px-5 text-xs uppercase tracking-wider font-bold text-navy-500">Location</th>
                <th className="text-left py-2.5 px-5 text-xs uppercase tracking-wider font-bold text-navy-500">Status</th>
                <th className="text-right py-2.5 px-5 text-xs uppercase tracking-wider font-bold text-navy-500">Expected</th>
                <th className="text-right py-2.5 px-5 text-xs uppercase tracking-wider font-bold text-navy-500">Actual</th>
                <th className="text-right py-2.5 px-5 text-xs uppercase tracking-wider font-bold text-navy-500">Discrepancy</th>
              </tr></thead>
              <tbody>
                {shifts.map(s => (
                  <tr key={s.id} className="border-b border-beige-200 hover:bg-beige-50 cursor-pointer transition-colors" onClick={() => loadShiftDetail(s.id)}>
                    <td className="py-2.5 px-5 text-sm text-navy-700">{s.shift_date}</td>
                    <td className="py-2.5 px-5 text-sm text-navy-700">{s.locations?.name || "—"}</td>
                    <td className="py-2.5 px-5">
                      <span className={`text-xs px-2 py-1 rounded-lg ${s.status === "closed" ? "bg-status-success-bg text-status-success" : "bg-status-warning-bg text-status-warning"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-5 text-sm text-navy-900 text-right">Rs {parseFloat(s.expected_cash || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-5 text-sm text-navy-900 text-right">{s.actual_cash != null ? `Rs ${parseFloat(s.actual_cash).toLocaleString()}` : "—"}</td>
                    <td className="py-2.5 px-5 text-sm text-right">
                      {s.status === "closed" ? (
                        <span className={`font-medium ${parseFloat(s.discrepancy || 0) >= 0 ? "text-status-success" : "text-status-danger"}`}>
                          {parseFloat(s.discrepancy || 0) >= 0 ? "+" : ""}Rs {parseFloat(s.discrepancy || 0).toLocaleString()}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Petty Cash Form Modal */}
      {showPettyForm && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowPettyForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading font-medium text-navy-900 text-xl mb-4">Petty Cash Entry</h3>
            <form onSubmit={addPettyCash} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {["income", "expense"].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPettyForm({...pettyForm, type: t})}
                    className={`py-2.5 rounded-xl text-sm font-medium capitalize transition-colors ${pettyForm.type === t ? (t === "income" ? "bg-status-success text-white" : "bg-status-danger text-white") : "bg-beige-200 text-navy-700"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <select
                value={pettyForm.category}
                onChange={(e) => setPettyForm({...pettyForm, category: e.target.value})}
                className="w-full bg-white border border-beige-300 rounded-xl px-4 py-3 text-sm text-navy-900"
              >
                {(pettyForm.type === "expense"
                  ? ["Miscellaneous", "Transport", "Cleaning", "Tea/Snacks", "Office Supplies", "Repairs", "Other"]
                  : ["Cash Received", "Refund Returned", "Other"]
                ).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <Input value={pettyForm.description} onChange={(e) => setPettyForm({...pettyForm, description: e.target.value})} placeholder="Description (optional)" className="bg-white border-beige-300 rounded-xl" />
              <Input type="number" value={pettyForm.amount} onChange={(e) => setPettyForm({...pettyForm, amount: e.target.value})} placeholder="Amount (Rs)" required className="bg-white border-beige-300 rounded-xl" />
              <div className="flex gap-2">
                <Button type="submit" className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">Record</Button>
                <Button type="button" onClick={() => setShowPettyForm(false)} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shift Detail Modal */}
      {viewShift && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setViewShift(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading font-medium text-navy-900 text-xl mb-2">Shift Detail — {viewShift.shift_date}</h3>
            <p className="text-sm text-navy-500 mb-4">{viewShift.locations?.name} | {viewShift.cashier_name}</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                ["Opening Float", viewShift.opening_float],
                ["Cash Sales", viewShift.cash_sales],
                ["Card Sales", viewShift.card_sales],
                ["Transfer Sales", viewShift.transfer_sales],
                ["Manual Income", viewShift.manual_income],
                ["Manual Expenses", viewShift.manual_expenses],
                ["Expected Cash", viewShift.expected_cash],
                ["Actual Cash", viewShift.actual_cash],
              ].map(([label, val]) => (
                <div key={label} className="bg-beige-50 rounded-xl p-3">
                  <p className="text-xs text-navy-500">{label}</p>
                  <p className="text-sm font-medium text-navy-900">Rs {parseFloat(val || 0).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className={`p-4 rounded-xl mb-4 ${parseFloat(viewShift.discrepancy || 0) === 0 ? "bg-status-success-bg" : "bg-status-warning-bg"}`}>
              <p className="text-sm font-medium text-navy-900">
                Discrepancy: <span className={`font-bold ${parseFloat(viewShift.discrepancy || 0) >= 0 ? "text-status-success" : "text-status-danger"}`}>
                  {parseFloat(viewShift.discrepancy || 0) >= 0 ? "+" : ""}Rs {parseFloat(viewShift.discrepancy || 0).toLocaleString()}
                </span>
              </p>
            </div>
            {viewShift.petty_cash?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs uppercase tracking-wider font-bold text-navy-500 mb-2">Petty Cash</p>
                <div className="space-y-1">
                  {viewShift.petty_cash.map(p => (
                    <div key={p.id} className="flex justify-between text-sm">
                      <span className="text-navy-700">{p.category} {p.description && `- ${p.description}`}</span>
                      <span className={p.type === "income" ? "text-status-success" : "text-status-danger"}>
                        {p.type === "expense" ? "-" : "+"}Rs {parseFloat(p.amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Button onClick={() => setViewShift(null)} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}
