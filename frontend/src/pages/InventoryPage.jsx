import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ArrowsLeftRight, MapPin, Warning, UploadSimple, DownloadSimple } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [showTransfer, setShowTransfer] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [transfer, setTransfer] = useState({ from_location_id: "", to_location_id: "", items: [{ product_id: "", quantity: "" }] });
  const [stockForm, setStockForm] = useState({ product_id: "", location_id: "", quantity: "", min_stock_level: "" });
  const [locationForm, setLocationForm] = useState({ name: "", type: "outlet", address: "" });
  const [loading, setLoading] = useState(true);
  const invFileRef = useRef(null);
  const [importResult, setImportResult] = useState(null);

  const load = async () => {
    try {
      const [invRes, locRes, prodRes] = await Promise.all([
        api.get("/inventory", { params: selectedLocation ? { location_id: selectedLocation, limit: 500 } : { limit: 500 } }),
        api.get("/locations"),
        api.get("/products", { params: { limit: 500 } }),
      ]);
      setInventory(invRes.data?.data || invRes.data || []);
      setLocations(locRes.data || []);
      setProducts(prodRes.data?.data || prodRes.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line
  useEffect(() => { load(); }, [selectedLocation]);

  const handleAddStock = async (e) => {
    e.preventDefault();
    try {
      await api.post("/inventory", { ...stockForm, quantity: parseFloat(stockForm.quantity) || 0, min_stock_level: parseFloat(stockForm.min_stock_level) || 0 });
      load();
      setShowAddStock(false);
      setStockForm({ product_id: "", location_id: "", quantity: "", min_stock_level: "" });
    } catch (err) { console.error(err); }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      const items = transfer.items.filter(i => i.product_id && i.quantity).map(i => {
        const prod = products.find(p => p.id === i.product_id);
        return { product_id: i.product_id, product_name: prod?.name || "", quantity: parseFloat(i.quantity) };
      });
      await api.post("/inventory/transfer", { from_location_id: transfer.from_location_id, to_location_id: transfer.to_location_id, items });
      load();
      setShowTransfer(false);
    } catch (err) { console.error(err); }
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    try {
      await api.post("/locations", locationForm);
      load();
      setShowAddLocation(false);
      setLocationForm({ name: "", type: "outlet", address: "" });
    } catch (err) { console.error(err); }
  };

  return (
    <div data-testid="inventory-page" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-medium text-navy-900 tracking-tight">Inventory</h1>
          <p className="text-navy-500 mt-1">Track stock across all locations</p>
        </div>
        <div className="flex gap-2">
          <input ref={invFileRef} type="file" accept=".csv" onChange={async (e) => {
            const file = e.target.files?.[0]; if (!file) return;
            const formData = new FormData(); formData.append("file", file);
            try { const { data } = await api.post("/inventory/bulk-import", formData, { headers: { "Content-Type": "multipart/form-data" } }); setImportResult(data); toast.success(`Created: ${data.created}, Updated: ${data.updated}`); load(); }
            catch { toast.error("Import failed"); }
            finally { if (invFileRef.current) invFileRef.current.value = ""; }
          }} className="hidden" />
          <Button onClick={async () => {
            try { const r = await api.get("/inventory/template-csv", { responseType: "blob" }); const url = window.URL.createObjectURL(new Blob([r.data])); const a = document.createElement("a"); a.href = url; a.download = "inventory_template.csv"; a.click(); }
            catch { toast.error("Failed"); }
          }} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl"><DownloadSimple size={18} className="mr-1" /> Template</Button>
          <Button onClick={() => invFileRef.current?.click()} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl"><UploadSimple size={18} className="mr-1" /> Import</Button>
          <Button onClick={() => setShowAddLocation(true)} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">
            <MapPin size={18} className="mr-2" /> Add Location
          </Button>
          <Button onClick={() => setShowAddStock(true)} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">
            <Plus size={18} className="mr-2" /> Add Stock
          </Button>
          <Button data-testid="transfer-stock-button" onClick={() => setShowTransfer(true)} className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">
            <ArrowsLeftRight size={18} className="mr-2" /> Transfer
          </Button>
        </div>
      </div>

      {/* Location filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setSelectedLocation("")} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${!selectedLocation ? "bg-navy-800 text-white" : "bg-beige-200 text-navy-700 hover:bg-beige-300"}`}>
          All Locations
        </button>
        {locations.map((loc) => (
          <button key={loc.id} onClick={() => setSelectedLocation(loc.id)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${selectedLocation === loc.id ? "bg-navy-800 text-white" : "bg-beige-200 text-navy-700 hover:bg-beige-300"}`}>
            {loc.name}
          </button>
        ))}
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-beige-300 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(19,29,51,0.03)]">
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" /></div>
        ) : inventory.length === 0 ? (
          <div className="p-8 text-center text-navy-500">No inventory records. Add stock using the buttons above.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-beige-100">
                <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Product</th>
                <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Location</th>
                <th className="text-right py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Quantity</th>
                <th className="text-right py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Min Stock</th>
                <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Status</th>
              </tr></thead>
              <tbody>
                {inventory.map((inv) => {
                  const isLow = parseFloat(inv.quantity) < parseFloat(inv.min_stock_level || 10);
                  return (
                    <tr key={inv.id} className="border-b border-beige-200 hover:bg-beige-50 transition-colors">
                      <td className="py-3 px-6 text-sm text-navy-900 font-medium">{inv.products?.name || "—"}<br/><span className="text-xs text-navy-500">{inv.products?.sku}</span></td>
                      <td className="py-3 px-6 text-sm text-navy-700">{inv.locations?.name || "—"}<br/><span className="text-xs text-navy-500 capitalize">{inv.locations?.type}</span></td>
                      <td className="py-3 px-6 text-sm font-medium text-right text-navy-900">{parseFloat(inv.quantity).toLocaleString()}</td>
                      <td className="py-3 px-6 text-sm text-navy-500 text-right">{parseFloat(inv.min_stock_level || 0).toLocaleString()}</td>
                      <td className="py-3 px-6">
                        {isLow ? (
                          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-status-danger-bg text-status-danger w-fit"><Warning size={12} /> Low Stock</span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-lg bg-status-success-bg text-status-success">In Stock</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Location Modal */}
      {showAddLocation && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowAddLocation(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-medium text-navy-900 text-xl mb-4">Add Location</h3>
            <form onSubmit={handleAddLocation} className="space-y-3">
              <Input data-testid="location-name" value={locationForm.name} onChange={(e) => setLocationForm({...locationForm, name: e.target.value})} placeholder="Location Name" required className="bg-white border-beige-300 rounded-xl" />
              <select data-testid="location-type" value={locationForm.type} onChange={(e) => setLocationForm({...locationForm, type: e.target.value})} className="w-full bg-white border border-beige-300 rounded-xl px-4 py-3 text-sm text-navy-900">
                <option value="factory">Factory</option>
                <option value="sorting">Sorting Center</option>
                <option value="outlet">Outlet</option>
                <option value="warehouse">Warehouse</option>
              </select>
              <Input value={locationForm.address} onChange={(e) => setLocationForm({...locationForm, address: e.target.value})} placeholder="Address" className="bg-white border-beige-300 rounded-xl" />
              <div className="flex gap-2">
                <Button type="submit" className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">Add Location</Button>
                <Button type="button" onClick={() => setShowAddLocation(false)} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddStock && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowAddStock(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-medium text-navy-900 text-xl mb-4">Add / Update Stock</h3>
            <form onSubmit={handleAddStock} className="space-y-3">
              <select data-testid="stock-product" value={stockForm.product_id} onChange={(e) => setStockForm({...stockForm, product_id: e.target.value})} required className="w-full bg-white border border-beige-300 rounded-xl px-4 py-3 text-sm text-navy-900">
                <option value="">Select Product</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
              <select data-testid="stock-location" value={stockForm.location_id} onChange={(e) => setStockForm({...stockForm, location_id: e.target.value})} required className="w-full bg-white border border-beige-300 rounded-xl px-4 py-3 text-sm text-navy-900">
                <option value="">Select Location</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <Input data-testid="stock-quantity" type="number" value={stockForm.quantity} onChange={(e) => setStockForm({...stockForm, quantity: e.target.value})} placeholder="Quantity" required className="bg-white border-beige-300 rounded-xl" />
              <Input type="number" value={stockForm.min_stock_level} onChange={(e) => setStockForm({...stockForm, min_stock_level: e.target.value})} placeholder="Min Stock Level" className="bg-white border-beige-300 rounded-xl" />
              <div className="flex gap-2">
                <Button type="submit" className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">Save</Button>
                <Button type="button" onClick={() => setShowAddStock(false)} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowTransfer(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading font-medium text-navy-900 text-xl mb-4">Stock Transfer</h3>
            <form onSubmit={handleTransfer} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <select data-testid="transfer-from" value={transfer.from_location_id} onChange={(e) => setTransfer({...transfer, from_location_id: e.target.value})} required className="w-full bg-white border border-beige-300 rounded-xl px-4 py-3 text-sm text-navy-900">
                  <option value="">From Location</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <select data-testid="transfer-to" value={transfer.to_location_id} onChange={(e) => setTransfer({...transfer, to_location_id: e.target.value})} required className="w-full bg-white border border-beige-300 rounded-xl px-4 py-3 text-sm text-navy-900">
                  <option value="">To Location</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              {transfer.items.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <select value={item.product_id} onChange={(e) => { const items = [...transfer.items]; items[i].product_id = e.target.value; setTransfer({...transfer, items}); }} required className="flex-1 bg-white border border-beige-300 rounded-xl px-4 py-3 text-sm text-navy-900">
                    <option value="">Select Product</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <Input type="number" value={item.quantity} onChange={(e) => { const items = [...transfer.items]; items[i].quantity = e.target.value; setTransfer({...transfer, items}); }} placeholder="Qty" required className="w-24 bg-white border-beige-300 rounded-xl" />
                </div>
              ))}
              <Button type="button" onClick={() => setTransfer({...transfer, items: [...transfer.items, { product_id: "", quantity: "" }]})} className="text-sm bg-beige-200 text-navy-700 hover:bg-beige-300 rounded-xl">+ Add Item</Button>
              <div className="flex gap-2">
                <Button type="submit" className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">Transfer</Button>
                <Button type="button" onClick={() => setShowTransfer(false)} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
