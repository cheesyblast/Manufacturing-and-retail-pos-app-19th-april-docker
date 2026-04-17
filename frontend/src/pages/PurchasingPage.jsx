import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Truck, Check, Eye } from "@phosphor-icons/react";

export default function PurchasingPage() {
  const [tab, setTab] = useState("orders");
  const [suppliers, setSuppliers] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showPOForm, setShowPOForm] = useState(false);
  const [showPODetail, setShowPODetail] = useState(null);
  const [supplierForm, setSupplierForm] = useState({ name: "", contact_person: "", phone: "", email: "", address: "" });
  const [materialForm, setMaterialForm] = useState({ name: "", sku: "", unit: "kg", quantity: 0, unit_cost: 0, reorder_level: 0, supplier_id: "" });
  const [poForm, setPOForm] = useState({ supplier_id: "", notes: "", global_charges: 0, items: [{ raw_material_id: "", raw_material_name: "", quantity: "", unit_cost: "" }] });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [supRes, rmRes, poRes] = await Promise.all([api.get("/suppliers"), api.get("/raw-materials"), api.get("/purchase-orders")]);
      setSuppliers(supRes.data || []);
      setRawMaterials(rmRes.data || []);
      setPurchaseOrders(poRes.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    try { await api.post("/suppliers", supplierForm); load(); setShowSupplierForm(false); setSupplierForm({ name: "", contact_person: "", phone: "", email: "", address: "" }); }
    catch (err) { console.error(err); }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    try { await api.post("/raw-materials", { ...materialForm, quantity: parseFloat(materialForm.quantity), unit_cost: parseFloat(materialForm.unit_cost), reorder_level: parseFloat(materialForm.reorder_level) }); load(); setShowMaterialForm(false); }
    catch (err) { console.error(err); }
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    const items = poForm.items.filter(i => i.raw_material_id && i.quantity).map(i => {
      const rm = rawMaterials.find(r => r.id === i.raw_material_id);
      return { raw_material_id: i.raw_material_id, raw_material_name: rm?.name || "", quantity: parseFloat(i.quantity), unit_cost: parseFloat(i.unit_cost) };
    });
    try { await api.post("/purchase-orders", { supplier_id: poForm.supplier_id, items, notes: poForm.notes, global_charges: parseFloat(poForm.global_charges) || 0 }); load(); setShowPOForm(false); }
    catch (err) { console.error(err); }
  };

  const receivePO = async (poId) => {
    try { await api.post(`/purchase-orders/${poId}/receive`); load(); setShowPODetail(null); }
    catch (err) { console.error(err); }
  };

  const viewPO = async (poId) => {
    try { const { data } = await api.get(`/purchase-orders/${poId}`); setShowPODetail(data); }
    catch (err) { console.error(err); }
  };

  const statusColor = (s) => s === "received" ? "bg-status-success-bg text-status-success" : s === "draft" ? "bg-beige-200 text-navy-700" : s === "ordered" ? "bg-status-warning-bg text-status-warning" : "bg-status-danger-bg text-status-danger";

  const tabs = [{ id: "orders", label: "Purchase Orders" }, { id: "suppliers", label: "Suppliers" }, { id: "materials", label: "Raw Materials" }];

  return (
    <div data-testid="purchasing-page" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-medium text-navy-900 tracking-tight">Purchasing</h1>
          <p className="text-navy-500 mt-1">Manage suppliers, raw materials, and purchase orders</p>
        </div>
        <div className="flex gap-2">
          {tab === "suppliers" && <Button onClick={() => setShowSupplierForm(true)} className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl"><Plus size={18} className="mr-2" /> Add Supplier</Button>}
          {tab === "materials" && <Button onClick={() => setShowMaterialForm(true)} className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl"><Plus size={18} className="mr-2" /> Add Material</Button>}
          {tab === "orders" && <Button data-testid="create-po-button" onClick={() => setShowPOForm(true)} className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl"><Plus size={18} className="mr-2" /> Create PO</Button>}
        </div>
      </div>

      <div className="flex gap-1 bg-beige-200 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-white text-navy-900 shadow-sm" : "text-navy-500 hover:text-navy-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Purchase Orders Tab */}
      {tab === "orders" && (
        <div className="bg-white border border-beige-300 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(19,29,51,0.03)]">
          {purchaseOrders.length === 0 ? (
            <div className="p-8 text-center text-navy-500">No purchase orders yet</div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-beige-100">
              <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">PO Number</th>
              <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Supplier</th>
              <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Status</th>
              <th className="text-right py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Total</th>
              <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Date</th>
              <th className="text-right py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Actions</th>
            </tr></thead><tbody>
              {purchaseOrders.map(po => (
                <tr key={po.id} className="border-b border-beige-200 hover:bg-beige-50 transition-colors">
                  <td className="py-3 px-6 text-sm text-navy-900 font-mono">{po.po_number}</td>
                  <td className="py-3 px-6 text-sm text-navy-700">{po.suppliers?.name || "—"}</td>
                  <td className="py-3 px-6"><span className={`text-xs px-2 py-1 rounded-lg capitalize ${statusColor(po.status)}`}>{po.status}</span></td>
                  <td className="py-3 px-6 text-sm text-navy-900 font-medium text-right">Rs {parseFloat(po.total_amount).toLocaleString()}</td>
                  <td className="py-3 px-6 text-sm text-navy-500">{new Date(po.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-6 text-right flex gap-2 justify-end">
                    <button onClick={() => viewPO(po.id)} className="text-navy-500 hover:text-navy-700"><Eye size={16} /></button>
                    {po.status === "draft" && <button onClick={() => receivePO(po.id)} className="text-status-success hover:text-status-success/80"><Check size={16} /></button>}
                  </td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </div>
      )}

      {/* Suppliers Tab */}
      {tab === "suppliers" && (
        <div className="bg-white border border-beige-300 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(19,29,51,0.03)]">
          {suppliers.length === 0 ? (
            <div className="p-8 text-center text-navy-500">No suppliers yet</div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-beige-100">
              <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Name</th>
              <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Contact</th>
              <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Phone</th>
              <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Email</th>
            </tr></thead><tbody>
              {suppliers.map(s => (
                <tr key={s.id} className="border-b border-beige-200 hover:bg-beige-50"><td className="py-3 px-6 text-sm text-navy-900 font-medium">{s.name}</td><td className="py-3 px-6 text-sm text-navy-700">{s.contact_person || "—"}</td><td className="py-3 px-6 text-sm text-navy-700">{s.phone || "—"}</td><td className="py-3 px-6 text-sm text-navy-700">{s.email || "—"}</td></tr>
              ))}
            </tbody></table></div>
          )}
        </div>
      )}

      {/* Raw Materials Tab */}
      {tab === "materials" && (
        <div className="bg-white border border-beige-300 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(19,29,51,0.03)]">
          {rawMaterials.length === 0 ? (
            <div className="p-8 text-center text-navy-500">No raw materials yet</div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-beige-100">
              <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Name</th>
              <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">SKU</th>
              <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Unit</th>
              <th className="text-right py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Quantity</th>
              <th className="text-right py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Unit Cost</th>
              <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Supplier</th>
            </tr></thead><tbody>
              {rawMaterials.map(rm => (
                <tr key={rm.id} className="border-b border-beige-200 hover:bg-beige-50"><td className="py-3 px-6 text-sm text-navy-900 font-medium">{rm.name}</td><td className="py-3 px-6 text-sm text-navy-700 font-mono">{rm.sku}</td><td className="py-3 px-6 text-sm text-navy-700">{rm.unit}</td><td className="py-3 px-6 text-sm text-navy-900 text-right">{parseFloat(rm.quantity).toLocaleString()}</td><td className="py-3 px-6 text-sm text-navy-900 text-right">Rs {parseFloat(rm.unit_cost).toLocaleString()}</td><td className="py-3 px-6 text-sm text-navy-700">{rm.suppliers?.name || "—"}</td></tr>
              ))}
            </tbody></table></div>
          )}
        </div>
      )}

      {/* Supplier Form Modal */}
      {showSupplierForm && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowSupplierForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-medium text-navy-900 text-xl mb-4">Add Supplier</h3>
            <form onSubmit={handleAddSupplier} className="space-y-3">
              <Input data-testid="supplier-name" value={supplierForm.name} onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})} placeholder="Supplier Name" required className="bg-white border-beige-300 rounded-xl" />
              <Input value={supplierForm.contact_person} onChange={(e) => setSupplierForm({...supplierForm, contact_person: e.target.value})} placeholder="Contact Person" className="bg-white border-beige-300 rounded-xl" />
              <Input value={supplierForm.phone} onChange={(e) => setSupplierForm({...supplierForm, phone: e.target.value})} placeholder="Phone" className="bg-white border-beige-300 rounded-xl" />
              <Input value={supplierForm.email} onChange={(e) => setSupplierForm({...supplierForm, email: e.target.value})} placeholder="Email" className="bg-white border-beige-300 rounded-xl" />
              <div className="flex gap-2">
                <Button type="submit" className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">Add Supplier</Button>
                <Button type="button" onClick={() => setShowSupplierForm(false)} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Material Form Modal */}
      {showMaterialForm && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowMaterialForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-medium text-navy-900 text-xl mb-4">Add Raw Material</h3>
            <form onSubmit={handleAddMaterial} className="space-y-3">
              <Input value={materialForm.name} onChange={(e) => setMaterialForm({...materialForm, name: e.target.value})} placeholder="Material Name" required className="bg-white border-beige-300 rounded-xl" />
              <Input value={materialForm.sku} onChange={(e) => setMaterialForm({...materialForm, sku: e.target.value})} placeholder="SKU" className="bg-white border-beige-300 rounded-xl" />
              <select value={materialForm.unit} onChange={(e) => setMaterialForm({...materialForm, unit: e.target.value})} className="w-full bg-white border border-beige-300 rounded-xl px-4 py-3 text-sm text-navy-900">
                <option value="kg">Kilograms (kg)</option><option value="m">Meters (m)</option><option value="pcs">Pieces</option><option value="rolls">Rolls</option><option value="cones">Cones</option>
              </select>
              <Input type="number" step="0.01" value={materialForm.unit_cost} onChange={(e) => setMaterialForm({...materialForm, unit_cost: e.target.value})} placeholder="Unit Cost" className="bg-white border-beige-300 rounded-xl" />
              <select value={materialForm.supplier_id} onChange={(e) => setMaterialForm({...materialForm, supplier_id: e.target.value})} className="w-full bg-white border border-beige-300 rounded-xl px-4 py-3 text-sm text-navy-900">
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="flex gap-2">
                <Button type="submit" className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">Add Material</Button>
                <Button type="button" onClick={() => setShowMaterialForm(false)} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO Form Modal */}
      {showPOForm && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowPOForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-medium text-navy-900 text-xl mb-4">Create Purchase Order</h3>
            <form onSubmit={handleCreatePO} className="space-y-3">
              <select data-testid="po-supplier" value={poForm.supplier_id} onChange={(e) => setPOForm({...poForm, supplier_id: e.target.value})} required className="w-full bg-white border border-beige-300 rounded-xl px-4 py-3 text-sm text-navy-900">
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {poForm.items.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <select value={item.raw_material_id} onChange={(e) => { const items = [...poForm.items]; items[i].raw_material_id = e.target.value; const rm = rawMaterials.find(r=>r.id === e.target.value); if(rm) items[i].unit_cost = rm.unit_cost; setPOForm({...poForm, items}); }} required className="flex-1 bg-white border border-beige-300 rounded-xl px-3 py-2 text-sm text-navy-900">
                    <option value="">Material</option>
                    {rawMaterials.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <Input type="number" value={item.quantity} onChange={(e) => { const items = [...poForm.items]; items[i].quantity = e.target.value; setPOForm({...poForm, items}); }} placeholder="Qty" required className="w-20 bg-white border-beige-300 rounded-xl" />
                  <Input type="number" value={item.unit_cost} onChange={(e) => { const items = [...poForm.items]; items[i].unit_cost = e.target.value; setPOForm({...poForm, items}); }} placeholder="Cost" required className="w-24 bg-white border-beige-300 rounded-xl" />
                </div>
              ))}
              <Button type="button" onClick={() => setPOForm({...poForm, items: [...poForm.items, { raw_material_id: "", raw_material_name: "", quantity: "", unit_cost: "" }]})} className="text-sm bg-beige-200 text-navy-700 hover:bg-beige-300 rounded-xl">+ Add Item</Button>
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-[0.15em] font-bold text-beige-500">Global Charges (Shipping + Customs)</label>
                <Input data-testid="po-global-charges" type="number" step="0.01" value={poForm.global_charges} onChange={(e) => setPOForm({...poForm, global_charges: e.target.value})} placeholder="0.00" className="bg-white border-beige-300 rounded-xl" />
                <p className="text-xs text-navy-400">Distributed proportionally across items to calculate landed cost</p>
              </div>
              <Input value={poForm.notes} onChange={(e) => setPOForm({...poForm, notes: e.target.value})} placeholder="Notes" className="bg-white border-beige-300 rounded-xl" />
              <div className="flex gap-2">
                <Button type="submit" className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">Create PO</Button>
                <Button type="button" onClick={() => setShowPOForm(false)} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO Detail Modal */}
      {showPODetail && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowPODetail(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-medium text-navy-900 text-xl mb-2">{showPODetail.po_number}</h3>
            <p className="text-sm text-navy-500 mb-4">Supplier: {showPODetail.suppliers?.name} | Status: <span className="capitalize">{showPODetail.status}</span>{showPODetail.global_charges > 0 && ` | Global Charges: Rs ${parseFloat(showPODetail.global_charges).toLocaleString()}`}</p>
            <div className="space-y-2 mb-4">
              {(showPODetail.items || []).map((item, i) => (
                <div key={i} className="flex justify-between p-3 bg-beige-50 rounded-xl">
                  <span className="text-sm text-navy-700">{item.raw_material_name || "Material"}</span>
                  <span className="text-sm text-navy-900 font-medium">Qty: {item.quantity} | Rs {parseFloat(item.total_cost).toLocaleString()}{item.unit_landed_cost > 0 && ` | Landed: Rs ${parseFloat(item.unit_landed_cost).toLocaleString()}/unit`}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-navy-900">Total: Rs {parseFloat(showPODetail.total_amount).toLocaleString()}</span>
              <div className="flex gap-2">
                {showPODetail.status === "draft" && <Button onClick={() => receivePO(showPODetail.id)} className="bg-status-success text-white hover:bg-status-success/90 rounded-xl"><Check size={16} className="mr-1" /> Receive</Button>}
                <Button onClick={() => setShowPODetail(null)} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
