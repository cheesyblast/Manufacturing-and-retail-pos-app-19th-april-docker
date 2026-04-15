import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, PencilSimple, Package, MagnifyingGlass, UploadSimple, DownloadSimple } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", sku: "", barcode: "", category: "", description: "", unit_price: "", cost_price: "", image_url: "" });
  const [loading, setLoading] = useState(true);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const loadProducts = async (searchTerm) => {
    try {
      const params = { limit: 200 };
      if (searchTerm) params.search = searchTerm;
      const { data } = await api.get("/products", { params });
      setProducts(data?.data || data || []);
      setTotalProducts(data?.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadProducts(); }, []);

  // Debounced server-side search
  useEffect(() => {
    const timer = setTimeout(() => { loadProducts(search); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, unit_price: parseFloat(form.unit_price) || 0, cost_price: parseFloat(form.cost_price) || 0 };
    try {
      if (editing) { await api.put(`/products/${editing}`, data); }
      else { await api.post("/products", data); }
      loadProducts(search);
      resetForm();
    } catch (err) { console.error(err); }
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get("/products/template-csv", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a"); a.href = url; a.download = "products_template.csv"; a.click();
    } catch (err) { toast.error("Failed to download template"); }
  };

  const handleBulkImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const { data } = await api.post("/products/bulk-import", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setImportResult(data);
      toast.success(`Created: ${data.created}, Skipped: ${data.skipped}`);
      loadProducts(search);
    } catch (err) { toast.error("Import failed"); }
    finally { if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const resetForm = () => {
    setForm({ name: "", sku: "", barcode: "", category: "", description: "", unit_price: "", cost_price: "", image_url: "" });
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (p) => {
    setForm({ name: p.name, sku: p.sku, barcode: p.barcode || "", category: p.category || "", description: p.description || "", unit_price: p.unit_price, cost_price: p.cost_price, image_url: p.image_url || "" });
    setEditing(p.id);
    setShowForm(true);
  };

  return (
    <div data-testid="products-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-medium text-navy-900 tracking-tight">Products</h1>
          <p className="text-navy-500 mt-1">Manage your finished goods catalog</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleBulkImport} className="hidden" />
          <Button onClick={downloadTemplate} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">
            <DownloadSimple size={18} className="mr-2" /> Template
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">
            <UploadSimple size={18} className="mr-2" /> Import CSV
          </Button>
          <Button data-testid="add-product-button" onClick={() => setShowForm(true)} className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">
            <Plus size={18} className="mr-2" /> Add Product
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="pl-10 bg-white border-beige-300 rounded-xl" />
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-beige-300 rounded-2xl p-6 shadow-sm">
          <h3 className="font-heading font-medium text-navy-900 mb-4">{editing ? "Edit Product" : "New Product"}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input data-testid="product-name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Product Name" required className="bg-white border-beige-300 rounded-xl" />
            <Input data-testid="product-sku" value={form.sku} onChange={(e) => setForm({...form, sku: e.target.value})} placeholder="SKU" required className="bg-white border-beige-300 rounded-xl" />
            <Input data-testid="product-barcode" value={form.barcode} onChange={(e) => setForm({...form, barcode: e.target.value})} placeholder="Barcode" className="bg-white border-beige-300 rounded-xl" />
            <Input data-testid="product-category" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} placeholder="Category" className="bg-white border-beige-300 rounded-xl" list="categories" />
            <datalist id="categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
            <Input data-testid="product-unit-price" type="number" step="0.01" value={form.unit_price} onChange={(e) => setForm({...form, unit_price: e.target.value})} placeholder="Selling Price" required className="bg-white border-beige-300 rounded-xl" />
            <Input data-testid="product-cost-price" type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({...form, cost_price: e.target.value})} placeholder="Cost Price" className="bg-white border-beige-300 rounded-xl" />
            <div className="md:col-span-2 lg:col-span-3 flex gap-3">
              <Button type="submit" data-testid="save-product-button" className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">{editing ? "Update" : "Create"}</Button>
              <Button type="button" onClick={resetForm} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {importResult && (
        <div className="bg-beige-50 border border-beige-300 rounded-xl p-4 text-sm">
          <p className="text-navy-900 font-medium">Import Result: {importResult.created} created, {importResult.skipped} skipped</p>
          {importResult.errors?.length > 0 && <ul className="mt-1 text-xs text-status-danger list-disc pl-4">{importResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}</ul>}
          <button onClick={() => setImportResult(null)} className="text-xs text-navy-500 mt-1 underline">Dismiss</button>
        </div>
      )}

      <div className="bg-white border border-beige-300 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(19,29,51,0.03)]">
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" /></div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-navy-500">No products found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-beige-100">
                <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Product</th>
                <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">SKU</th>
                <th className="text-left py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Category</th>
                <th className="text-right py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Cost</th>
                <th className="text-right py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Price</th>
                <th className="text-right py-3 px-6 text-xs uppercase tracking-wider font-bold text-navy-500">Actions</th>
              </tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-beige-200 hover:bg-beige-50 transition-colors">
                    <td className="py-3 px-6 text-sm text-navy-900 font-medium flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-beige-200 flex items-center justify-center flex-shrink-0">
                        {p.image_url ? <img src={p.image_url} alt="" className="w-8 h-8 rounded-lg object-cover" /> : <Package size={16} className="text-navy-500" />}
                      </div>
                      {p.name}
                    </td>
                    <td className="py-3 px-6 text-sm text-navy-700 font-mono">{p.sku}</td>
                    <td className="py-3 px-6"><span className="text-xs px-2 py-1 rounded-lg bg-beige-200 text-navy-700">{p.category || "—"}</span></td>
                    <td className="py-3 px-6 text-sm text-navy-500 text-right">Rs {parseFloat(p.cost_price).toLocaleString()}</td>
                    <td className="py-3 px-6 text-sm text-navy-900 font-medium text-right">Rs {parseFloat(p.unit_price).toLocaleString()}</td>
                    <td className="py-3 px-6 text-right">
                      <button onClick={() => startEdit(p)} className="text-navy-500 hover:text-navy-700"><PencilSimple size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
