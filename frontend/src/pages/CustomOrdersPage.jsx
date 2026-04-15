import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Eye, Money, Truck, ChatCircle, Check, ArrowRight, User, MagnifyingGlass } from "@phosphor-icons/react";

const STATUS_LABELS = {
  order_taken: "Order Taken", in_progress: "In Progress",
  ready_for_pickup: "Ready for Pickup", delivered: "Delivered", cancelled: "Cancelled"
};
const STATUS_COLORS = {
  order_taken: "bg-beige-200 text-navy-700", in_progress: "bg-status-warning-bg text-status-warning",
  ready_for_pickup: "bg-blue-100 text-blue-700", delivered: "bg-status-success-bg text-status-success",
  cancelled: "bg-status-danger-bg text-status-danger"
};
const STATUS_FLOW = ["order_taken", "in_progress", "ready_for_pickup", "delivered"];

export default function CustomOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showPayment, setShowPayment] = useState(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [form, setForm] = useState({
    customer_id: "", customer_name: "", customer_mobile: "", description: "",
    total_amount: "", advance_payment: "0", payment_method: "cash", estimated_date: "", notes: "",
    items: [{ item_type: "service", product_id: "", product_name: "", description: "", quantity: "1", unit_price: "" }]
  });
  const [paymentForm, setPaymentForm] = useState({ amount: "", payment_method: "cash", payment_type: "balance", reference: "" });

  const loadOrders = useCallback(async () => {
    try {
      const params = { limit: 100, offset: 0 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get("/custom-orders", { params });
      setOrders(data.data || []);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, cRes] = await Promise.all([api.get("/products"), api.get("/customers")]);
        setProducts((pRes.data?.data || pRes.data || []).slice(0, 200));
        setCustomers(cRes.data || []);
      } catch {}
    };
    load();
  }, []);

  const lookupCustomer = async () => {
    if (!customerSearch) return;
    try {
      const { data } = await api.get(`/customers/mobile/${customerSearch}`);
      setForm({ ...form, customer_id: data.id, customer_name: data.name, customer_mobile: data.mobile });
    } catch { /* not found */ }
  };

  const calcTotal = () => form.items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);

  const handleCreate = async (e) => {
    e.preventDefault();
    const totalAmt = calcTotal();
    try {
      await api.post("/custom-orders", {
        ...form, total_amount: totalAmt, advance_payment: parseFloat(form.advance_payment) || 0,
        items: form.items.filter(i => i.unit_price)
      });
      loadOrders(); setShowForm(false);
      setForm({ customer_id: "", customer_name: "", customer_mobile: "", description: "",
        total_amount: "", advance_payment: "0", payment_method: "cash", estimated_date: "", notes: "",
        items: [{ item_type: "service", product_id: "", product_name: "", description: "", quantity: "1", unit_price: "" }]
      });
    } catch (err) { console.error(err); }
  };

  const viewOrder = async (id) => {
    try { const { data } = await api.get(`/custom-orders/${id}`); setShowDetail(data); }
    catch (err) { console.error(err); }
  };

  const updateStatus = async (orderId, newStatus) => {
    try { await api.put(`/custom-orders/${orderId}/status`, { status: newStatus }); loadOrders(); if (showDetail) viewOrder(orderId); }
    catch (err) { console.error(err); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/custom-orders/${showPayment}/payment`, { ...paymentForm, amount: parseFloat(paymentForm.amount) });
      loadOrders(); setShowPayment(null); setPaymentForm({ amount: "", payment_method: "cash", payment_type: "balance", reference: "" });
      if (showDetail) viewOrder(showPayment);
    } catch (err) { console.error(err); }
  };

  const nextStatus = (current) => { const idx = STATUS_FLOW.indexOf(current); return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null; };

  return (
    <div data-testid="custom-orders-page" className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-medium text-navy-900 tracking-tight">Custom Orders</h1>
          <p className="text-navy-500 mt-1">Track custom tailoring, alterations, and special orders</p>
        </div>
        <Button data-testid="create-custom-order-button" onClick={() => setShowForm(true)} className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">
          <Plus size={18} className="mr-2" /> New Order
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["", ...STATUS_FLOW, "cancelled"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${statusFilter === s ? "bg-navy-800 text-white" : "bg-beige-200 text-navy-700 hover:bg-beige-300"}`}>
            {s ? STATUS_LABELS[s] : "All"} {s === "" && `(${total})`}
          </button>
        ))}
      </div>

      <div className="bg-white border border-beige-300 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(19,29,51,0.03)]">
        {loading ? <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-navy-800 border-t-transparent rounded-full animate-spin mx-auto" /></div> : orders.length === 0 ? (
          <div className="p-8 text-center text-navy-500">No custom orders found</div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-beige-100">
            <th className="text-left py-3 px-5 text-xs uppercase tracking-wider font-bold text-navy-500">Order #</th>
            <th className="text-left py-3 px-5 text-xs uppercase tracking-wider font-bold text-navy-500">Customer</th>
            <th className="text-left py-3 px-5 text-xs uppercase tracking-wider font-bold text-navy-500">Status</th>
            <th className="text-right py-3 px-5 text-xs uppercase tracking-wider font-bold text-navy-500">Total</th>
            <th className="text-right py-3 px-5 text-xs uppercase tracking-wider font-bold text-navy-500">Paid</th>
            <th className="text-right py-3 px-5 text-xs uppercase tracking-wider font-bold text-navy-500">Balance</th>
            <th className="text-right py-3 px-5 text-xs uppercase tracking-wider font-bold text-navy-500">Actions</th>
          </tr></thead><tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-b border-beige-200 hover:bg-beige-50 transition-colors">
                <td className="py-3 px-5 text-sm text-navy-900 font-mono">{o.order_number}</td>
                <td className="py-3 px-5 text-sm text-navy-700">{o.customer_name || "—"}<br/><span className="text-xs text-navy-500">{o.customer_mobile}</span></td>
                <td className="py-3 px-5"><span className={`text-xs px-2 py-1 rounded-lg ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</span></td>
                <td className="py-3 px-5 text-sm text-navy-900 font-medium text-right">Rs {parseFloat(o.total_amount).toLocaleString()}</td>
                <td className="py-3 px-5 text-sm text-status-success text-right">Rs {parseFloat(o.amount_paid).toLocaleString()}</td>
                <td className="py-3 px-5 text-sm text-right font-medium" style={{color: parseFloat(o.balance_due) > 0 ? '#8C3A3A' : '#4A5D4E'}}>Rs {parseFloat(o.balance_due).toLocaleString()}</td>
                <td className="py-3 px-5 text-right flex gap-1.5 justify-end">
                  <button onClick={() => viewOrder(o.id)} className="text-navy-500 hover:text-navy-700"><Eye size={16} /></button>
                  {parseFloat(o.balance_due) > 0 && o.status !== "cancelled" && <button onClick={() => setShowPayment(o.id)} className="text-status-success hover:text-status-success/80"><Money size={16} /></button>}
                  {nextStatus(o.status) && <button onClick={() => updateStatus(o.id, nextStatus(o.status))} className="text-navy-500 hover:text-navy-700"><ArrowRight size={16} /></button>}
                </td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </div>

      {/* Create Order Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl my-8" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading font-medium text-navy-900 text-xl mb-4">New Custom Order</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500 mb-1 block">Customer</label>
                <div className="flex gap-2 mb-2">
                  <Input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="Search by mobile" className="bg-white border-beige-300 rounded-xl" />
                  <Button type="button" onClick={lookupCustomer} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl"><MagnifyingGlass size={16} /></Button>
                </div>
                {form.customer_name && <div className="flex items-center gap-2 px-3 py-2 bg-beige-50 rounded-lg text-sm"><User size={14} />{form.customer_name} ({form.customer_mobile})</div>}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Input value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} placeholder="Customer Name" className="bg-white border-beige-300 rounded-xl" />
                  <Input value={form.customer_mobile} onChange={e => setForm({...form, customer_mobile: e.target.value})} placeholder="Mobile" className="bg-white border-beige-300 rounded-xl" />
                </div>
              </div>
              <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Order Description" className="bg-white border-beige-300 rounded-xl" />
              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500 mb-1 block">Items / Services</label>
                {form.items.map((item, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select value={item.item_type} onChange={e => { const items = [...form.items]; items[i].item_type = e.target.value; setForm({...form, items}); }} className="w-28 bg-white border border-beige-300 rounded-xl px-3 py-2 text-sm text-navy-900">
                      <option value="service">Service</option><option value="fabric">Fabric</option><option value="alteration">Alteration</option><option value="product">Product</option>
                    </select>
                    <Input value={item.description || item.product_name} onChange={e => { const items = [...form.items]; items[i].description = e.target.value; items[i].product_name = e.target.value; setForm({...form, items}); }} placeholder="Description" className="flex-1 bg-white border-beige-300 rounded-xl" />
                    <Input type="number" value={item.quantity} onChange={e => { const items = [...form.items]; items[i].quantity = e.target.value; setForm({...form, items}); }} placeholder="Qty" className="w-16 bg-white border-beige-300 rounded-xl" />
                    <Input type="number" value={item.unit_price} onChange={e => { const items = [...form.items]; items[i].unit_price = e.target.value; setForm({...form, items}); }} placeholder="Price" className="w-24 bg-white border-beige-300 rounded-xl" />
                  </div>
                ))}
                <Button type="button" onClick={() => setForm({...form, items: [...form.items, { item_type: "service", product_id: "", product_name: "", description: "", quantity: "1", unit_price: "" }]})} className="text-xs bg-beige-200 text-navy-700 hover:bg-beige-300 rounded-xl">+ Add Item</Button>
              </div>
              <div className="bg-beige-50 rounded-xl p-4">
                <div className="flex justify-between text-sm mb-2"><span className="text-navy-500">Order Total</span><span className="font-bold text-navy-900">Rs {calcTotal().toLocaleString()}</span></div>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" value={form.advance_payment} onChange={e => setForm({...form, advance_payment: e.target.value})} placeholder="Advance Payment" className="bg-white border-beige-300 rounded-xl" />
                  <select value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})} className="bg-white border border-beige-300 rounded-xl px-3 py-2 text-sm">
                    <option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Transfer</option>
                  </select>
                </div>
                <div className="flex justify-between text-sm mt-2"><span className="text-navy-500">Balance Due</span><span className="text-status-danger font-medium">Rs {(calcTotal() - (parseFloat(form.advance_payment) || 0)).toLocaleString()}</span></div>
              </div>
              <Input type="date" value={form.estimated_date} onChange={e => setForm({...form, estimated_date: e.target.value})} className="bg-white border-beige-300 rounded-xl" />
              <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notes" className="bg-white border-beige-300 rounded-xl" />
              <div className="flex gap-2">
                <Button type="submit" className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">Create Order</Button>
                <Button type="button" onClick={() => setShowForm(false)} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowDetail(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-medium text-navy-900 text-xl">{showDetail.order_number}</h3>
              <span className={`text-xs px-2 py-1 rounded-lg ${STATUS_COLORS[showDetail.status]}`}>{STATUS_LABELS[showDetail.status]}</span>
            </div>
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-beige-50 rounded-xl p-3"><p className="text-xs text-navy-500">Customer</p><p className="text-sm font-medium text-navy-900">{showDetail.customer_name || "Walk-in"}</p><p className="text-xs text-navy-500">{showDetail.customer_mobile}</p></div>
                <div className="bg-beige-50 rounded-xl p-3"><p className="text-xs text-navy-500">Total / Paid / Due</p><p className="text-sm font-medium text-navy-900">Rs {parseFloat(showDetail.total_amount).toLocaleString()}</p><p className="text-xs"><span className="text-status-success">Paid: Rs {parseFloat(showDetail.amount_paid).toLocaleString()}</span> | <span className="text-status-danger">Due: Rs {parseFloat(showDetail.balance_due).toLocaleString()}</span></p></div>
              </div>
              {showDetail.description && <p className="text-sm text-navy-700 bg-beige-50 rounded-xl p-3">{showDetail.description}</p>}
              {showDetail.items?.length > 0 && (
                <div><p className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500 mb-1">Items</p>
                  {showDetail.items.map((item, i) => (
                    <div key={i} className="flex justify-between py-2 border-b border-beige-200 text-sm">
                      <span className="text-navy-700">{item.product_name || item.description} <span className="text-xs text-navy-500">x{item.quantity}</span></span>
                      <span className="text-navy-900 font-medium">Rs {parseFloat(item.total).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              {showDetail.payments?.length > 0 && (
                <div><p className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500 mb-1">Payments</p>
                  {showDetail.payments.map((p, i) => (
                    <div key={i} className="flex justify-between py-2 border-b border-beige-200 text-sm">
                      <span className="text-navy-700 capitalize">{p.payment_type} ({p.payment_method})</span>
                      <span className="text-status-success font-medium">Rs {parseFloat(p.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {nextStatus(showDetail.status) && <Button onClick={() => updateStatus(showDetail.id, nextStatus(showDetail.status))} className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl"><ArrowRight size={16} className="mr-1" /> {STATUS_LABELS[nextStatus(showDetail.status)]}</Button>}
              {parseFloat(showDetail.balance_due) > 0 && showDetail.status !== "cancelled" && <Button onClick={() => { setShowPayment(showDetail.id); }} className="bg-status-success text-white hover:bg-status-success/90 rounded-xl"><Money size={16} className="mr-1" /> Collect Payment</Button>}
              {showDetail.status !== "cancelled" && showDetail.status !== "delivered" && <Button onClick={() => updateStatus(showDetail.id, "cancelled")} className="bg-beige-200 text-status-danger hover:bg-status-danger-bg rounded-xl">Cancel</Button>}
              <Button onClick={() => setShowDetail(null)} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowPayment(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading font-medium text-navy-900 text-xl mb-4">Collect Payment</h3>
            <form onSubmit={handlePayment} className="space-y-3">
              <Input data-testid="co-payment-amount" type="number" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} placeholder="Amount" required className="bg-white border-beige-300 rounded-xl" />
              <select value={paymentForm.payment_method} onChange={e => setPaymentForm({...paymentForm, payment_method: e.target.value})} className="w-full bg-white border border-beige-300 rounded-xl px-4 py-3 text-sm">
                <option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Transfer</option>
              </select>
              <Input value={paymentForm.reference} onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} placeholder="Reference (optional)" className="bg-white border-beige-300 rounded-xl" />
              <div className="flex gap-2">
                <Button type="submit" className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">Record Payment</Button>
                <Button type="button" onClick={() => setShowPayment(null)} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
