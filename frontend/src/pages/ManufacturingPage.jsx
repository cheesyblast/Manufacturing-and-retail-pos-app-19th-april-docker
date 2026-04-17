import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Factory, Eye, ClipboardText, Play } from "@phosphor-icons/react";

export default function ManufacturingPage() {
  const [tab, setTab] = useState("orders");
  const [productionOrders, setProductionOrders] = useState([]);
  const [boms, setBoms] = useState([]);
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showBOMForm, setShowBOMForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showOrderDetail, setShowOrderDetail] = useState(null);
  const [showLogForm, setShowLogForm] = useState(null);
  const [bomForm, setBomForm] = useState({ product_id: "", name: "", description: "", output_quantity: 1, items: [{ raw_material_id: "", quantity: "", unit: "kg", wastage_percent: 0 }] });
  const [orderForm, setOrderForm] = useState({ bom_id: "", product_id: "", quantity_planned: "", location_id: "", notes: "" });
  const [logForm, setLogForm] = useState({ quantity_produced: "", notes: "" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [poRes, bomRes, prodRes, rmRes, locRes] = await Promise.all([
        api.get("/production-orders"), api.get("/bom"), api.get("/products"), api.get("/raw-materials"), api.get("/locations")
      ]);
      setProductionOrders(poRes.data || []);
      setBoms(bomRes.data || []);
      setProducts(prodRes.data || []);
      setRawMaterials(rmRes.data || []);
      setLocations(locRes.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreateBOM = async (e) => {
    e.preventDefault();
    const items = bomForm.items.filter(i => i.raw_material_id && i.quantity).map(i => {
      const rm = rawMaterials.find(r => r.id === i.raw_material_id);
      return { raw_material_id: i.raw_material_id, raw_material_name: rm?.name || "", quantity: parseFloat(i.quantity), unit: i.unit, wastage_percent: parseFloat(i.wastage_percent) || 0 };
    });
    try { await api.post("/bom", { ...bomForm, output_quantity: parseFloat(bomForm.output_quantity), items }); load(); setShowBOMForm(false); }
    catch (err) { console.error(err); }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try { await api.post("/production-orders", { ...orderForm, quantity_planned: parseFloat(orderForm.quantity_planned) }); load(); setShowOrderForm(false); }
    catch (err) { console.error(err); }
  };

  const viewOrder = async (orderId) => {
    try { const { data } = await api.get(`/production-orders/${orderId}`); setShowOrderDetail(data); }
    catch (err) { console.error(err); }
  };

  const handleLogProduction = async (e) => {
    e.preventDefault();
    try { await api.post(`/production-orders/${showLogForm}/log`, { quantity_produced: parseFloat(logForm.quantity_produced), notes: logForm.notes }); load(); setShowLogForm(null); setLogForm({ quantity_produced: "", notes: "" }); if (showOrderDetail) viewOrder(showOrderDetail.id); }
    catch (err) { console.error(err); }
  };

  const startProduction = async (orderId) => {
    try { await api.put(`/production-orders/${orderId}`, { status: "in_progress", start_date: new Date().toISOString() }); load(); }
    catch (err) { console.error(err); }
  };

  const statusColor = (s) => s === "completed" ? "bg-status-success-bg text-status-success" : s === "in_progress" ? "bg-status-warning-bg text-status-warning" : s === "planned" ? "bg-beige-200 text-navy-700" : "bg-status-danger-bg text-status-danger";

  return (
    <div data-testid="manufacturing-page" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-medium text-navy-900 tracking-tight">Manufacturing</h1>
          <p className="text-navy-500 mt-1">Manage BOMs, production orders, and logs</p>
        </div>
        <div className="flex gap-2">
          {tab === "bom" && <Button onClick={() => setShowBOMForm(true)} className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl"><Plus size={18} className="mr-2" /> Create BOM</Button>}
          {tab === "orders" && <Button data-testid="create-production-order-button" onClick={() => setShowOrderForm(true)} className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl"><Plus size={18} className="mr-2" /> New Order</Button>}
        </div>
      </div>

      <div className="flex gap-1 bg-beige-200 p-1 rounded-xl w-fit">
        {[{ id: "orders", label: "Production Orders" }, { id: "bom", label: "Bill of Materials" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-white text-navy-900 shadow-sm" : "text-navy-500 hover:text-navy-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Production Orders */}
      {tab === "orders" && (
        <div className="bg-white border border-beige-300 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(19,29,51,0.03)]">
          {productionOrders.length === 0 ? (
            <div className="p-8 text-center text-navy-500">No production orders yet</div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-beige-100">
              <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Order #</th>
              <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Product</th>
              <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Status</th>
              <th className="text-right py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Planned</th>
              <th className="text-right py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Produced</th>
              <th className="text-right py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Actions</th>
            </tr></thead><tbody>
              {productionOrders.map(po => (
                <tr key={po.id} className="border-b border-beige-200 hover:bg-beige-50 transition-colors">
                  <td className="py-3 px-6 text-sm text-navy-900 font-mono">{po.order_number}</td>
                  <td className="py-3 px-6 text-sm text-navy-700">{po.product_name || "—"}</td>
                  <td className="py-3 px-6"><span className={`text-xs px-2 py-1 rounded-lg capitalize ${statusColor(po.status)}`}>{po.status?.replace("_", " ")}</span></td>
                  <td className="py-3 px-6 text-sm text-navy-900 text-right">{parseFloat(po.quantity_planned)}</td>
                  <td className="py-3 px-6 text-sm text-navy-900 text-right">{parseFloat(po.quantity_produced || 0)}</td>
                  <td className="py-3 px-6 text-right flex gap-2 justify-end">
                    <button onClick={() => viewOrder(po.id)} className="text-navy-500 hover:text-navy-700"><Eye size={16} /></button>
                    {po.status === "planned" && <button onClick={() => startProduction(po.id)} className="text-status-warning hover:text-status-warning/80"><Play size={16} /></button>}
                    {(po.status === "in_progress" || po.status === "planned") && <button onClick={() => setShowLogForm(po.id)} className="text-status-success hover:text-status-success/80"><ClipboardText size={16} /></button>}
                  </td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </div>
      )}

      {/* BOMs Tab */}
      {tab === "bom" && (
        <div className="bg-white border border-beige-300 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(19,29,51,0.03)]">
          {boms.length === 0 ? (
            <div className="p-8 text-center text-navy-500">No BOMs yet. Create one to start manufacturing.</div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-beige-100">
              <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Name</th>
              <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Product</th>
              <th className="text-right py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Output Qty</th>
            </tr></thead><tbody>
              {boms.map(b => (
                <tr key={b.id} className="border-b border-beige-200 hover:bg-beige-50 transition-colors">
                  <td className="py-3 px-6 text-sm text-navy-900 font-medium">{b.name}</td>
                  <td className="py-3 px-6 text-sm text-navy-700">{b.products?.name || "—"}</td>
                  <td className="py-3 px-6 text-sm text-navy-900 text-right">{parseFloat(b.output_quantity)}</td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </div>
      )}

      {/* BOM Form Modal */}
      {showBOMForm && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowBOMForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-medium text-navy-900 text-xl mb-4">Create Bill of Materials</h3>
            <form onSubmit={handleCreateBOM} className="space-y-3">
              <Input value={bomForm.name} onChange={(e) => setBomForm({...bomForm, name: e.target.value})} placeholder="BOM Name (e.g. Cotton Shirt BOM)" required className="bg-white border-beige-300 rounded-xl" />
              <select value={bomForm.product_id} onChange={(e) => setBomForm({...bomForm, product_id: e.target.value})} required className="w-full bg-white border border-beige-300 rounded-xl px-4 py-3 text-sm text-navy-900">
                <option value="">Output Product</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
              <Input type="number" value={bomForm.output_quantity} onChange={(e) => setBomForm({...bomForm, output_quantity: e.target.value})} placeholder="Output Quantity" className="bg-white border-beige-300 rounded-xl" />
              <p className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500">Raw Materials Required</p>
              {bomForm.items.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <select value={item.raw_material_id} onChange={(e) => { const items = [...bomForm.items]; items[i].raw_material_id = e.target.value; setBomForm({...bomForm, items}); }} required className="flex-1 bg-white border border-beige-300 rounded-xl px-3 py-2 text-sm text-navy-900">
                    <option value="">Material</option>
                    {rawMaterials.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <Input type="number" value={item.quantity} onChange={(e) => { const items = [...bomForm.items]; items[i].quantity = e.target.value; setBomForm({...bomForm, items}); }} placeholder="Qty" required className="w-20 bg-white border-beige-300 rounded-xl" />
                  <Input type="number" value={item.wastage_percent} onChange={(e) => { const items = [...bomForm.items]; items[i].wastage_percent = e.target.value; setBomForm({...bomForm, items}); }} placeholder="Waste%" className="w-20 bg-white border-beige-300 rounded-xl" title="Wastage %" />
                </div>
              ))}
              <Button type="button" onClick={() => setBomForm({...bomForm, items: [...bomForm.items, { raw_material_id: "", quantity: "", unit: "kg", wastage_percent: 0 }]})} className="text-sm bg-beige-200 text-navy-700 hover:bg-beige-300 rounded-xl">+ Add Material</Button>
              <div className="flex gap-2">
                <Button type="submit" className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">Create BOM</Button>
                <Button type="button" onClick={() => setShowBOMForm(false)} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Production Order Form */}
      {showOrderForm && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowOrderForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-medium text-navy-900 text-xl mb-4">New Production Order</h3>
            <form onSubmit={handleCreateOrder} className="space-y-3">
              <select value={orderForm.bom_id} onChange={(e) => { const bom = boms.find(b => b.id === e.target.value); setOrderForm({...orderForm, bom_id: e.target.value, product_id: bom?.product_id || ""}); }} required className="w-full bg-white border border-beige-300 rounded-xl px-4 py-3 text-sm text-navy-900">
                <option value="">Select BOM</option>
                {boms.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <Input type="number" value={orderForm.quantity_planned} onChange={(e) => setOrderForm({...orderForm, quantity_planned: e.target.value})} placeholder="Quantity to Produce" required className="bg-white border-beige-300 rounded-xl" />
              <select value={orderForm.location_id} onChange={(e) => setOrderForm({...orderForm, location_id: e.target.value})} className="w-full bg-white border border-beige-300 rounded-xl px-4 py-3 text-sm text-navy-900">
                <option value="">Production Location</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <Input value={orderForm.notes} onChange={(e) => setOrderForm({...orderForm, notes: e.target.value})} placeholder="Notes" className="bg-white border-beige-300 rounded-xl" />
              <div className="flex gap-2">
                <Button type="submit" className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">Create Order</Button>
                <Button type="button" onClick={() => setShowOrderForm(false)} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Production Modal */}
      {showLogForm && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowLogForm(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-medium text-navy-900 text-xl mb-4">Log Production</h3>
            <form onSubmit={handleLogProduction} className="space-y-3">
              <Input data-testid="log-quantity" type="number" value={logForm.quantity_produced} onChange={(e) => setLogForm({...logForm, quantity_produced: e.target.value})} placeholder="Quantity Produced" required className="bg-white border-beige-300 rounded-xl" />
              <Input value={logForm.notes} onChange={(e) => setLogForm({...logForm, notes: e.target.value})} placeholder="Notes" className="bg-white border-beige-300 rounded-xl" />
              <div className="flex gap-2">
                <Button type="submit" className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">Log Production</Button>
                <Button type="button" onClick={() => setShowLogForm(null)} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showOrderDetail && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowOrderDetail(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-medium text-navy-900 text-xl mb-2">{showOrderDetail.order_number}</h3>
            <p className="text-sm text-navy-500 mb-4">Product: {showOrderDetail.product_name} | Status: <span className="capitalize">{showOrderDetail.status?.replace("_", " ")}</span></p>
            <div className="flex gap-4 mb-4">
              <div className="flex-1 bg-beige-50 rounded-xl p-4 text-center">
                <p className="text-xs text-navy-500">Planned</p>
                <p className="text-2xl font-heading font-bold text-navy-900">{parseFloat(showOrderDetail.quantity_planned)}</p>
              </div>
              <div className="flex-1 bg-beige-50 rounded-xl p-4 text-center">
                <p className="text-xs text-navy-500">Produced</p>
                <p className="text-2xl font-heading font-bold text-status-success">{parseFloat(showOrderDetail.quantity_produced || 0)}</p>
              </div>
              <div className="flex-1 bg-beige-50 rounded-xl p-4 text-center">
                <p className="text-xs text-navy-500">Progress</p>
                <p className="text-2xl font-heading font-bold text-navy-900">{Math.round((parseFloat(showOrderDetail.quantity_produced || 0) / parseFloat(showOrderDetail.quantity_planned)) * 100)}%</p>
              </div>
            </div>
            {showOrderDetail.logs && showOrderDetail.logs.length > 0 && (
              <div className="mb-4">
                <p className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500 mb-2">Production Logs</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {showOrderDetail.logs.map((log, i) => (
                    <div key={i} className="flex justify-between p-2 bg-beige-50 rounded-lg text-sm">
                      <span className="text-navy-700">+{parseFloat(log.quantity_produced)} units</span>
                      <span className="text-navy-500">{new Date(log.logged_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              {showOrderDetail.status !== "completed" && <Button onClick={() => { setShowLogForm(showOrderDetail.id); setShowOrderDetail(null); }} className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">Log Production</Button>}
              <Button onClick={() => setShowOrderDetail(null)} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
