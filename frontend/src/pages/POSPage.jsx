import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MagnifyingGlass, Barcode, Plus, Minus, Trash, Receipt,
  CreditCard, Money, Bank, User, X, ShoppingCart
} from "@phosphor-icons/react";

export default function POSPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [customer, setCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState(0);
  const [amountTendered, setAmountTendered] = useState(0);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [newCustomer, setNewCustomer] = useState({ name: "", mobile: "", email: "" });
  const [processing, setProcessing] = useState(false);
  const [taxSettings, setTaxSettings] = useState({ tax_active: false, vat_rate: 18, sscl_rate: 2.5 });
  const barcodeRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [prodRes, locRes, taxRes] = await Promise.all([
          api.get("/products", { params: { limit: 500 } }),
          api.get("/locations"),
          api.get("/tax-settings").catch(() => ({ data: { tax_active: false, vat_rate: 18, sscl_rate: 2.5 } })),
        ]);
        const prodData = prodRes.data?.data || prodRes.data || [];
        setProducts(prodData);
        const outlets = (locRes.data || []).filter((l) => l.type === "outlet");
        setLocations(outlets);
        if (outlets.length > 0) setSelectedLocation(outlets[0].id);
        setTaxSettings(taxRes.data);
      } catch (err) {
        console.error("POS load error:", err);
      }
    };
    load();
  }, []);

  const filtered = products.filter((p) => {
    const s = search.toLowerCase();
    return !s || p.name.toLowerCase().includes(s) || (p.sku || "").toLowerCase().includes(s) || (p.barcode || "").includes(s);
  });

  const addToCart = (product) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.product_id === product.id);
      if (exists) return prev.map((i) => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product_id: product.id, product_name: product.name, product_sku: product.sku, unit_price: parseFloat(product.unit_price), quantity: 1 }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart((prev) =>
      prev.map((i) => i.product_id === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)
    );
  };

  const removeItem = (productId) => setCart((prev) => prev.filter((i) => i.product_id !== productId));

  const subtotal = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const taxable = subtotal - discount;
  const vatAmount = taxSettings.tax_active ? Math.round(taxable * taxSettings.vat_rate / 100 * 100) / 100 : 0;
  const ssclAmount = taxSettings.tax_active ? Math.round(taxable * taxSettings.sscl_rate / 100 * 100) / 100 : 0;
  const totalTax = vatAmount + ssclAmount;
  const total = subtotal - discount + totalTax;

  const lookupCustomer = async () => {
    if (!customerSearch.trim()) return;
    try {
      const { data } = await api.get(`/customers/mobile/${customerSearch.trim()}`);
      setCustomer(data);
      setShowCustomerModal(false);
    } catch {
      setCustomer(null);
    }
  };

  const registerCustomer = async () => {
    if (!newCustomer.name || !newCustomer.mobile) return;
    try {
      const { data } = await api.post("/customers", newCustomer);
      setCustomer(data);
      setShowCustomerModal(false);
      setNewCustomer({ name: "", mobile: "", email: "" });
    } catch (err) {
      console.error("Register customer error:", err);
    }
  };

  const handleBarcodeScan = async (e) => {
    if (e.key !== "Enter") return;
    const barcode = e.target.value.trim();
    if (!barcode) return;
    try {
      const { data } = await api.get(`/products/barcode/${barcode}`);
      addToCart(data);
      e.target.value = "";
    } catch {
      console.error("Barcode not found");
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      const saleData = {
        customer_id: customer?.id || null,
        customer_name: customer?.name || null,
        customer_mobile: customer?.mobile || null,
        location_id: selectedLocation || null,
        items: cart,
        discount_amount: discount,
        tax_amount: 0,
        payment_method: paymentMethod,
      };
      const { data: sale } = await api.post("/sales", saleData);
      const { data: receipt } = await api.get(`/sales/${sale.id}/receipt`);
      receipt.amount_tendered = amountTendered;
      setReceiptData(receipt);
      setShowCheckout(false);
      setShowReceipt(true);
      setCart([]);
      setCustomer(null);
      setDiscount(0);
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div data-testid="pos-page" className="h-[calc(100vh-120px)] flex gap-6">
      {/* Left - Products */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" />
            <Input
              data-testid="pos-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="pl-10 bg-white border-beige-300 rounded-xl"
            />
          </div>
          <div className="relative">
            <Barcode size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" />
            <Input
              ref={barcodeRef}
              data-testid="pos-barcode-input"
              placeholder="Scan barcode"
              onKeyDown={handleBarcodeScan}
              className="pl-10 w-48 bg-white border-beige-300 rounded-xl"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map((product) => (
              <button
                key={product.id}
                data-testid={`pos-product-${product.sku}`}
                onClick={() => addToCart(product)}
                className="bg-white border border-beige-300 rounded-2xl p-4 flex flex-col items-center text-center cursor-pointer hover:border-navy-500 transition-all hover:shadow-lg active:scale-95"
              >
                <div className="w-16 h-16 rounded-xl bg-beige-200 flex items-center justify-center mb-3">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-14 h-14 object-cover rounded-lg" />
                  ) : (
                    <span className="text-2xl font-heading font-bold text-navy-500">{product.name[0]}</span>
                  )}
                </div>
                <p className="text-sm font-medium text-navy-900 line-clamp-2">{product.name}</p>
                <p className="text-xs text-navy-500 mt-1">{product.sku}</p>
                <p className="text-base font-bold text-navy-800 mt-2">Rs {parseFloat(product.unit_price).toLocaleString()}</p>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12 text-navy-500">
                No products found. Add products in the Products module.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right - Cart */}
      <div className="w-96 bg-white border-l border-beige-300 flex flex-col rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(19,29,51,0.03)]">
        {/* Cart header */}
        <div className="px-5 py-4 border-b border-beige-200 flex items-center justify-between">
          <h3 className="font-heading font-medium text-navy-900">Current Sale</h3>
          {selectedLocation && (
            <select
              data-testid="pos-location-select"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="text-xs bg-beige-100 border border-beige-300 rounded-lg px-2 py-1 text-navy-700"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Customer */}
        <div className="px-5 py-3 border-b border-beige-200">
          {customer ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User size={16} className="text-navy-500" />
                <span className="text-sm text-navy-700">{customer.name}</span>
                <span className="text-xs text-navy-500">({customer.mobile})</span>
              </div>
              <button onClick={() => setCustomer(null)} className="text-navy-500 hover:text-navy-700"><X size={14} /></button>
            </div>
          ) : (
            <button
              data-testid="pos-add-customer-button"
              onClick={() => setShowCustomerModal(true)}
              className="flex items-center gap-2 text-sm text-navy-500 hover:text-navy-700"
            >
              <User size={16} /> Add Customer
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-navy-500">
              <ShoppingCart size={40} className="mb-2 opacity-30" />
              <p className="text-sm">Cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product_id} className="flex items-center gap-3 p-3 bg-beige-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-900 truncate">{item.product_name}</p>
                  <p className="text-xs text-navy-500">Rs {item.unit_price.toLocaleString()} each</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQty(item.product_id, -1)} className="w-7 h-7 rounded-lg bg-beige-200 flex items-center justify-center hover:bg-beige-300 transition-colors">
                    <Minus size={12} weight="bold" />
                  </button>
                  <span className="w-8 text-center text-sm font-medium text-navy-900">{item.quantity}</span>
                  <button onClick={() => updateQty(item.product_id, 1)} className="w-7 h-7 rounded-lg bg-beige-200 flex items-center justify-center hover:bg-beige-300 transition-colors">
                    <Plus size={12} weight="bold" />
                  </button>
                </div>
                <p className="text-sm font-bold text-navy-900 w-20 text-right">Rs {(item.unit_price * item.quantity).toLocaleString()}</p>
                <button onClick={() => removeItem(item.product_id)} className="text-status-danger hover:text-status-danger/80">
                  <Trash size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Cart footer */}
        <div className="border-t border-beige-200 px-5 py-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-navy-500">Subtotal</span>
            <span className="text-navy-700">Rs {subtotal.toLocaleString()}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-status-success">Discount</span>
              <span className="text-status-success">-Rs {discount.toLocaleString()}</span>
            </div>
          )}
          {taxSettings.tax_active && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-navy-500">VAT ({taxSettings.vat_rate}%)</span>
                <span className="text-navy-700">Rs {vatAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-navy-500">SSCL ({taxSettings.sscl_rate}%)</span>
                <span className="text-navy-700">Rs {ssclAmount.toLocaleString()}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-lg font-bold border-t border-beige-200 pt-3">
            <span className="text-navy-900">Total</span>
            <span className="text-navy-900">Rs {total.toLocaleString()}</span>
          </div>

          <Button
            data-testid="pos-checkout-button"
            onClick={() => setShowCheckout(true)}
            disabled={cart.length === 0}
            className="w-full h-14 bg-navy-800 text-white hover:bg-navy-700 rounded-xl text-lg font-medium"
          >
            <Receipt size={20} className="mr-2" /> Checkout
          </Button>
        </div>
      </div>

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowCustomerModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()} data-testid="customer-modal">
            <h3 className="font-heading font-medium text-navy-900 text-xl mb-4">Customer</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500 mb-1 block">Lookup by Mobile</label>
                <div className="flex gap-2">
                  <Input
                    data-testid="customer-mobile-search"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="0771234567"
                    className="bg-white border-beige-300 rounded-xl"
                  />
                  <Button onClick={lookupCustomer} className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">Search</Button>
                </div>
              </div>
              <div className="border-t border-beige-200 pt-4">
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500 mb-2 block">Register New Customer</label>
                <div className="space-y-2">
                  <Input data-testid="new-customer-name" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} placeholder="Name" className="bg-white border-beige-300 rounded-xl" />
                  <Input data-testid="new-customer-mobile" value={newCustomer.mobile} onChange={(e) => setNewCustomer({ ...newCustomer, mobile: e.target.value })} placeholder="Mobile" className="bg-white border-beige-300 rounded-xl" />
                  <Input data-testid="new-customer-email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} placeholder="Email (optional)" className="bg-white border-beige-300 rounded-xl" />
                  <Button onClick={registerCustomer} className="w-full bg-navy-800 text-white hover:bg-navy-700 rounded-xl">Register</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowCheckout(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()} data-testid="checkout-modal">
            <h3 className="font-heading font-medium text-navy-900 text-xl mb-4">Checkout</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500 mb-2 block">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "cash", label: "Cash", icon: Money },
                    { value: "card", label: "Card", icon: CreditCard },
                    { value: "bank_transfer", label: "Transfer", icon: Bank },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      data-testid={`payment-${value}`}
                      onClick={() => setPaymentMethod(value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                        paymentMethod === value
                          ? "border-navy-800 bg-navy-800 text-white"
                          : "border-beige-300 bg-white text-navy-700 hover:border-navy-500"
                      }`}
                    >
                      <Icon size={24} />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500 mb-1 block">Discount (Rs)</label>
                <Input
                  data-testid="checkout-discount"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="bg-white border-beige-300 rounded-xl"
                />
              </div>

              <div className="bg-beige-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-navy-500">Subtotal</span><span>Rs {subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-navy-500">Discount</span><span>-Rs {discount.toLocaleString()}</span></div>
                {taxSettings.tax_active && (
                  <>
                    <div className="flex justify-between text-sm"><span className="text-navy-500">VAT ({taxSettings.vat_rate}%)</span><span>Rs {vatAmount.toLocaleString()}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-navy-500">SSCL ({taxSettings.sscl_rate}%)</span><span>Rs {ssclAmount.toLocaleString()}</span></div>
                  </>
                )}
                <div className="flex justify-between text-lg font-bold border-t border-beige-300 pt-2">
                  <span className="text-navy-900">Total</span>
                  <span className="text-navy-900">Rs {total.toLocaleString()}</span>
                </div>
              </div>

              {paymentMethod === "cash" && (
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500">Amount Tendered</label>
                  <Input data-testid="amount-tendered" type="number" value={amountTendered} onChange={(e) => setAmountTendered(parseFloat(e.target.value) || 0)} className="bg-white border-beige-300 rounded-xl" />
                  {amountTendered >= total && amountTendered > 0 && (
                    <div className="flex justify-between bg-status-success-bg rounded-xl p-3 text-sm"><span className="text-status-success font-medium">Change Due</span><span className="text-status-success font-bold">Rs {(amountTendered - total).toLocaleString()}</span></div>
                  )}
                </div>
              )}

              <Button
                data-testid="confirm-checkout-button"
                onClick={handleCheckout}
                disabled={processing}
                className="w-full h-14 bg-navy-800 text-white hover:bg-navy-700 rounded-xl text-lg font-medium"
              >
                {processing ? "Processing..." : `Pay Rs ${total.toLocaleString()}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowReceipt(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full" onClick={(e) => e.stopPropagation()} data-testid="receipt-modal">
            {/* Printable Receipt */}
            <div id="receipt-print" className="p-6 receipt-content">
              <div className="text-center mb-4">
                {receiptData.business_logo && <img src={receiptData.business_logo} alt="" className="w-12 h-12 mx-auto mb-2 object-contain" />}
                <h3 className="font-heading font-bold text-navy-900 text-lg">{receiptData.business_name || "TextileERP"}</h3>
                {receiptData.business_address && <p className="text-xs text-navy-500">{receiptData.business_address}</p>}
                {receiptData.business_phone && <p className="text-xs text-navy-500">{receiptData.business_phone}</p>}
                <div className="border-t border-dashed border-beige-300 mt-3 pt-2">
                  <p className="text-xs text-navy-500 font-mono">{receiptData.sale?.invoice_number}</p>
                  <p className="text-xs text-navy-500">{new Date(receiptData.sale?.created_at).toLocaleString()}</p>
                  {receiptData.sale?.customer_name && <p className="text-xs text-navy-700 mt-1">Customer: {receiptData.sale.customer_name}</p>}
                </div>
              </div>
              <div className="border-t border-dashed border-beige-300 py-3 space-y-1.5">
                {(receiptData.items || []).map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <div className="flex-1"><span className="text-navy-700">{item.product_name}</span><br/><span className="text-xs text-navy-500">x{item.quantity} @ Rs {parseFloat(item.unit_price).toLocaleString()}</span></div>
                    <span className="text-navy-900 font-medium whitespace-nowrap ml-2">Rs {parseFloat(item.total).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-beige-300 pt-3 space-y-1">
                <div className="flex justify-between text-sm"><span className="text-navy-500">Subtotal</span><span>Rs {parseFloat(receiptData.sale?.subtotal).toLocaleString()}</span></div>
                {parseFloat(receiptData.sale?.discount_amount) > 0 && <div className="flex justify-between text-sm"><span className="text-navy-500">Discount</span><span>-Rs {parseFloat(receiptData.sale?.discount_amount).toLocaleString()}</span></div>}
                {parseFloat(receiptData.sale?.vat_amount) > 0 && <div className="flex justify-between text-sm"><span className="text-navy-500">VAT</span><span>Rs {parseFloat(receiptData.sale?.vat_amount).toLocaleString()}</span></div>}
                {parseFloat(receiptData.sale?.sscl_amount) > 0 && <div className="flex justify-between text-sm"><span className="text-navy-500">SSCL</span><span>Rs {parseFloat(receiptData.sale?.sscl_amount).toLocaleString()}</span></div>}
                {parseFloat(receiptData.sale?.tax_amount) > 0 && !parseFloat(receiptData.sale?.vat_amount) && <div className="flex justify-between text-sm"><span className="text-navy-500">Tax</span><span>Rs {parseFloat(receiptData.sale?.tax_amount).toLocaleString()}</span></div>}
                <div className="flex justify-between text-base font-bold border-t border-dashed border-beige-300 pt-2"><span>TOTAL</span><span>Rs {parseFloat(receiptData.sale?.total).toLocaleString()}</span></div>
                <div className="border-t border-dashed border-beige-300 pt-2 mt-2">
                  <p className="text-xs text-navy-500">Payment: <span className="capitalize">{receiptData.sale?.payment_method}</span></p>
                  {receiptData.amount_tendered > 0 && <>
                    <p className="text-xs text-navy-500">Tendered: Rs {parseFloat(receiptData.amount_tendered).toLocaleString()}</p>
                    <p className="text-xs text-navy-700 font-medium">Change: Rs {(parseFloat(receiptData.amount_tendered) - parseFloat(receiptData.sale?.total)).toLocaleString()}</p>
                  </>}
                </div>
                <p className="text-xs text-navy-400 text-center mt-3">Thank you for your purchase!</p>
              </div>
            </div>
            {/* Non-print buttons */}
            <div className="px-6 pb-6 flex gap-2 no-print">
              <Button onClick={() => { window.print(); }} className="flex-1 bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">Print</Button>
              <Button onClick={() => setShowReceipt(false)} className="flex-1 bg-navy-800 text-white hover:bg-navy-700 rounded-xl">Done</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
