import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendUp, TrendDown, Calendar, Plus, Trash, Tag } from "@phosphor-icons/react";

const MetricCard = ({ label, value, color = "navy", sub }) => (
  <div className="bg-white border border-beige-300 rounded-2xl p-5 shadow-[0_4px_20px_rgba(19,29,51,0.03)]">
    <p className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500 mb-2">{label}</p>
    <p className={`text-2xl font-heading font-medium ${color === "success" ? "text-status-success" : color === "danger" ? "text-status-danger" : "text-navy-900"}`}>
      Rs {(typeof value === "number" ? value : parseFloat(value || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
    </p>
    {sub && <p className="text-xs text-navy-500 mt-1">{sub}</p>}
  </div>
);

export default function AccountingPage() {
  const [tab, setTab] = useState("daily");
  const [dailyReport, setDailyReport] = useState(null);
  const [incomeStatement, setIncomeStatement] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  // Manual Transactions
  const [transactions, setTransactions] = useState([]);
  const [showTxForm, setShowTxForm] = useState(false);
  const [txForm, setTxForm] = useState({ type: "expense", category: "", description: "", amount: "", transaction_date: new Date().toISOString().split("T")[0], reference: "" });

  // Categories
  const [categories, setCategories] = useState([]);
  const [showCatForm, setShowCatForm] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", type: "expense" });

  const loadDailyReport = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get("/accounting/daily-sales", { params: { report_date: reportDate } }); setDailyReport(data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [reportDate]);

  const loadIncomeStatement = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get("/accounting/income-statement", { params: { start_date: startDate, end_date: endDate } }); setIncomeStatement(data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [startDate, endDate]);

  const loadBalanceSheet = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get("/accounting/balance-sheet"); setBalanceSheet(data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const loadTransactions = useCallback(async () => {
    try { const { data } = await api.get("/manual-transactions", { params: { limit: 200 } }); setTransactions(data.data || []); }
    catch (err) { console.error(err); }
  }, []);

  const loadCategories = useCallback(async () => {
    try { const data = await api.get("/transaction-categories"); setCategories(data.data || []); }
    catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    if (tab === "daily") loadDailyReport();
    else if (tab === "income") loadIncomeStatement();
    else if (tab === "balance") loadBalanceSheet();
    else if (tab === "transactions") { loadTransactions(); loadCategories(); }
  }, [tab, loadDailyReport, loadIncomeStatement, loadBalanceSheet, loadTransactions, loadCategories]);

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    try {
      await api.post("/manual-transactions", { ...txForm, amount: parseFloat(txForm.amount) });
      loadTransactions();
      setShowTxForm(false);
      setTxForm({ type: "expense", category: "", description: "", amount: "", transaction_date: new Date().toISOString().split("T")[0], reference: "" });
    } catch (err) { console.error(err); }
  };

  const deleteTransaction = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    try { await api.delete(`/manual-transactions/${id}`); loadTransactions(); }
    catch (err) { console.error(err); }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try { await api.post("/transaction-categories", catForm); loadCategories(); setShowCatForm(false); setCatForm({ name: "", type: "expense" }); }
    catch (err) { console.error(err); }
  };

  const deleteCategory = async (id) => {
    try { await api.delete(`/transaction-categories/${id}`); loadCategories(); }
    catch (err) { console.error(err); }
  };

  const filteredCats = categories.filter(c => c.type === txForm.type);

  const tabs = [
    { id: "daily", label: "Daily Sales" },
    { id: "income", label: "Income Statement" },
    { id: "balance", label: "Balance Sheet" },
    { id: "transactions", label: "Transactions" },
  ];

  return (
    <div data-testid="accounting-page" className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-medium text-navy-900 tracking-tight">Accounting</h1>
        <p className="text-navy-500 mt-1">Financial reports, manual transactions, and balance sheets</p>
      </div>

      <div className="flex gap-1 bg-beige-200 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-white text-navy-900 shadow-sm" : "text-navy-500 hover:text-navy-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Daily Sales Report */}
      {tab === "daily" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-navy-500" />
            <Input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="w-48 bg-white border-beige-300 rounded-xl" />
            <Button onClick={loadDailyReport} className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">Load</Button>
          </div>
          {loading ? <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" /></div> : dailyReport && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <MetricCard label="POS Sales" value={dailyReport.pos_revenue} color="success" />
                <MetricCard label="Custom Orders" value={dailyReport.custom_order_payments} />
                <MetricCard label="Manual Income" value={dailyReport.manual_income} />
                <MetricCard label="Total Revenue" value={dailyReport.total_revenue} color="success" />
                <MetricCard label="Gross Profit" value={dailyReport.gross_profit} color={dailyReport.gross_profit >= 0 ? "success" : "danger"} sub={`COGS: Rs ${dailyReport.cogs?.toLocaleString()}`} />
              </div>
              {dailyReport.payment_breakdown && Object.keys(dailyReport.payment_breakdown).length > 0 && (
                <div className="bg-white border border-beige-300 rounded-2xl p-5">
                  <p className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500 mb-3">Payment Breakdown</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(dailyReport.payment_breakdown).map(([method, amount]) => (
                      <div key={method} className="bg-beige-50 rounded-xl p-3"><p className="text-xs text-navy-500 capitalize">{method}</p><p className="text-lg font-heading font-medium text-navy-900">Rs {parseFloat(amount).toLocaleString()}</p></div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Income Statement */}
      {tab === "income" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-44 bg-white border-beige-300 rounded-xl" />
            <span className="text-navy-500">to</span>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-44 bg-white border-beige-300 rounded-xl" />
            <Button onClick={loadIncomeStatement} className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">Generate</Button>
          </div>
          {loading ? <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" /></div> : incomeStatement && (
            <div className="bg-white border border-beige-300 rounded-2xl p-6 max-w-xl">
              <h3 className="font-heading font-medium text-navy-900 text-lg mb-1">Income Statement</h3>
              <p className="text-xs text-navy-500 mb-4">{incomeStatement.period?.start} to {incomeStatement.period?.end}</p>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500">Revenue</p>
                {incomeStatement.revenue_breakdown && (
                  <>
                    <div className="flex justify-between py-1 pl-4"><span className="text-sm text-navy-500">POS Sales</span><span className="text-sm text-navy-700">Rs {incomeStatement.revenue_breakdown.pos_sales?.toLocaleString()}</span></div>
                    <div className="flex justify-between py-1 pl-4"><span className="text-sm text-navy-500">Custom Orders</span><span className="text-sm text-navy-700">Rs {incomeStatement.revenue_breakdown.custom_orders?.toLocaleString()}</span></div>
                    <div className="flex justify-between py-1 pl-4"><span className="text-sm text-navy-500">Manual Income</span><span className="text-sm text-navy-700">Rs {incomeStatement.revenue_breakdown.manual_income?.toLocaleString()}</span></div>
                    {incomeStatement.revenue_breakdown.manual_income_by_category && Object.entries(incomeStatement.revenue_breakdown.manual_income_by_category).map(([cat, amt]) => (
                      <div key={cat} className="flex justify-between py-0.5 pl-8"><span className="text-xs text-navy-400 capitalize">{cat}</span><span className="text-xs text-navy-400">Rs {amt.toLocaleString()}</span></div>
                    ))}
                  </>
                )}
                <div className="flex justify-between py-2 font-medium"><span className="text-navy-900">Total Revenue</span><span className="text-navy-900">Rs {incomeStatement.revenue?.toLocaleString()}</span></div>
                <div className="flex justify-between py-1"><span className="text-navy-500">(-) Cost of Goods Sold</span><span className="text-navy-700">Rs {incomeStatement.cogs?.toLocaleString()}</span></div>
                <div className="flex justify-between py-2 border-t border-beige-300 font-medium"><span>Gross Profit</span><span className={incomeStatement.gross_profit >= 0 ? "text-status-success" : "text-status-danger"}>Rs {incomeStatement.gross_profit?.toLocaleString()}</span></div>
                <p className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500 pt-2">Operating Expenses</p>
                {incomeStatement.expense_breakdown && Object.entries(incomeStatement.expense_breakdown).map(([cat, amt]) => (
                  <div key={cat} className="flex justify-between py-1 pl-4"><span className="text-sm text-navy-500 capitalize">{cat}</span><span className="text-sm text-navy-500">Rs {amt.toLocaleString()}</span></div>
                ))}
                <div className="flex justify-between py-1"><span className="text-navy-500">Total Expenses</span><span className="text-navy-700">Rs {incomeStatement.operating_expenses?.toLocaleString()}</span></div>
                <div className="flex justify-between py-3 border-t-2 border-navy-800 font-bold text-lg"><span>Net Income</span><span className={incomeStatement.net_income >= 0 ? "text-status-success" : "text-status-danger"}>Rs {incomeStatement.net_income?.toLocaleString()}</span></div>
                <div className="flex gap-4 text-xs text-navy-500 pt-1"><span>Gross Margin: {incomeStatement.gross_margin}%</span><span>Net Margin: {incomeStatement.net_margin}%</span></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Balance Sheet */}
      {tab === "balance" && (
        <div className="space-y-6">
          <Button onClick={loadBalanceSheet} className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">Refresh</Button>
          {loading ? <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" /></div> : balanceSheet && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
              <div className="bg-white border border-beige-300 rounded-2xl p-6">
                <h3 className="font-heading font-medium text-navy-900 text-lg mb-4">Assets</h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-1"><span className="text-sm text-navy-700">Cash</span><span className="text-sm">Rs {balanceSheet.assets?.cash?.toLocaleString()}</span></div>
                  <div className="flex justify-between py-1"><span className="text-sm text-navy-700">Inventory</span><span className="text-sm">Rs {balanceSheet.assets?.inventory?.toLocaleString()}</span></div>
                  <div className="flex justify-between py-1"><span className="text-sm text-navy-700">Raw Materials</span><span className="text-sm">Rs {balanceSheet.assets?.raw_materials?.toLocaleString()}</span></div>
                  <div className="flex justify-between py-2 border-t-2 border-navy-800 font-bold"><span>Total</span><span>Rs {balanceSheet.assets?.total_assets?.toLocaleString()}</span></div>
                </div>
              </div>
              <div className="bg-white border border-beige-300 rounded-2xl p-6">
                <h3 className="font-heading font-medium text-navy-900 text-lg mb-4">Liabilities</h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-1"><span className="text-sm text-navy-700">Unearned Revenue</span><span className="text-sm">Rs {balanceSheet.liabilities?.unearned_revenue?.toLocaleString()}</span></div>
                  <div className="flex justify-between py-2 border-t-2 border-navy-800 font-bold"><span>Total</span><span>Rs {balanceSheet.liabilities?.total_liabilities?.toLocaleString()}</span></div>
                </div>
              </div>
              <div className="bg-white border border-beige-300 rounded-2xl p-6">
                <h3 className="font-heading font-medium text-navy-900 text-lg mb-4">Equity</h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-1"><span className="text-sm text-navy-700">Retained Earnings</span><span className="text-sm">Rs {balanceSheet.equity?.retained_earnings?.toLocaleString()}</span></div>
                  <div className="flex justify-between py-2 border-t-2 border-navy-800 font-bold"><span>Total</span><span>Rs {balanceSheet.equity?.total_equity?.toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Transactions */}
      {tab === "transactions" && (
        <div className="space-y-6">
          <div className="flex gap-2">
            <Button data-testid="add-transaction-button" onClick={() => setShowTxForm(true)} className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl"><Plus size={18} className="mr-2" /> Add Transaction</Button>
            <Button onClick={() => setShowCatForm(true)} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl"><Tag size={18} className="mr-2" /> Manage Categories</Button>
          </div>

          <div className="bg-white border border-beige-300 rounded-2xl overflow-hidden">
            {transactions.length === 0 ? <div className="p-8 text-center text-navy-500">No manual transactions yet</div> : (
              <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-beige-100">
                <th className="text-left py-3 px-5 text-xs uppercase tracking-wider font-bold text-navy-500">Date</th>
                <th className="text-left py-3 px-5 text-xs uppercase tracking-wider font-bold text-navy-500">Type</th>
                <th className="text-left py-3 px-5 text-xs uppercase tracking-wider font-bold text-navy-500">Category</th>
                <th className="text-left py-3 px-5 text-xs uppercase tracking-wider font-bold text-navy-500">Description</th>
                <th className="text-right py-3 px-5 text-xs uppercase tracking-wider font-bold text-navy-500">Amount</th>
                <th className="text-right py-3 px-5 text-xs uppercase tracking-wider font-bold text-navy-500">Actions</th>
              </tr></thead><tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} className="border-b border-beige-200 hover:bg-beige-50">
                    <td className="py-3 px-5 text-sm text-navy-700">{tx.transaction_date}</td>
                    <td className="py-3 px-5"><span className={`text-xs px-2 py-1 rounded-lg capitalize ${tx.type === "income" ? "bg-status-success-bg text-status-success" : "bg-status-danger-bg text-status-danger"}`}>{tx.type}</span></td>
                    <td className="py-3 px-5 text-sm text-navy-700 capitalize">{tx.category}</td>
                    <td className="py-3 px-5 text-sm text-navy-500">{tx.description || "—"}</td>
                    <td className={`py-3 px-5 text-sm font-medium text-right ${tx.type === "income" ? "text-status-success" : "text-status-danger"}`}>{tx.type === "income" ? "+" : "-"}Rs {parseFloat(tx.amount).toLocaleString()}</td>
                    <td className="py-3 px-5 text-right"><button onClick={() => deleteTransaction(tx.id)} className="text-status-danger hover:text-status-danger/80"><Trash size={14} /></button></td>
                  </tr>
                ))}
              </tbody></table></div>
            )}
          </div>

          {/* Add Transaction Modal */}
          {showTxForm && (
            <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowTxForm(false)}>
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="font-heading font-medium text-navy-900 text-xl mb-4">Add Manual Transaction</h3>
                <form onSubmit={handleAddTransaction} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setTxForm({...txForm, type: "income"})} className={`py-3 rounded-xl text-sm font-medium ${txForm.type === "income" ? "bg-status-success text-white" : "bg-beige-200 text-navy-700"}`}>Income</button>
                    <button type="button" onClick={() => setTxForm({...txForm, type: "expense"})} className={`py-3 rounded-xl text-sm font-medium ${txForm.type === "expense" ? "bg-status-danger text-white" : "bg-beige-200 text-navy-700"}`}>Expense</button>
                  </div>
                  <select data-testid="tx-category" value={txForm.category} onChange={e => setTxForm({...txForm, category: e.target.value})} required className="w-full bg-white border border-beige-300 rounded-xl px-4 py-3 text-sm text-navy-900">
                    <option value="">Select Category</option>
                    {filteredCats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <Input value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})} placeholder="Description" className="bg-white border-beige-300 rounded-xl" />
                  <Input data-testid="tx-amount" type="number" step="0.01" value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} placeholder="Amount" required className="bg-white border-beige-300 rounded-xl" />
                  <Input type="date" value={txForm.transaction_date} onChange={e => setTxForm({...txForm, transaction_date: e.target.value})} className="bg-white border-beige-300 rounded-xl" />
                  <Input value={txForm.reference} onChange={e => setTxForm({...txForm, reference: e.target.value})} placeholder="Reference (optional)" className="bg-white border-beige-300 rounded-xl" />
                  <div className="flex gap-2">
                    <Button type="submit" className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">Save</Button>
                    <Button type="button" onClick={() => setShowTxForm(false)} className="bg-beige-200 text-navy-900 hover:bg-beige-300 rounded-xl">Cancel</Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Category Management Modal */}
          {showCatForm && (
            <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowCatForm(false)}>
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="font-heading font-medium text-navy-900 text-xl mb-4">Manage Categories</h3>
                <div className="max-h-60 overflow-y-auto space-y-1 mb-4">
                  {categories.map(c => (
                    <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-beige-50 rounded-lg">
                      <span className="text-sm text-navy-700">{c.name} <span className={`text-xs px-1.5 py-0.5 rounded ml-1 ${c.type === "income" ? "bg-status-success-bg text-status-success" : "bg-status-danger-bg text-status-danger"}`}>{c.type}</span></span>
                      {!c.is_default && <button onClick={() => deleteCategory(c.id)} className="text-status-danger hover:text-status-danger/80"><Trash size={12} /></button>}
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddCategory} className="flex gap-2">
                  <Input value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} placeholder="New Category" required className="flex-1 bg-white border-beige-300 rounded-xl" />
                  <select value={catForm.type} onChange={e => setCatForm({...catForm, type: e.target.value})} className="bg-white border border-beige-300 rounded-xl px-3 py-2 text-sm">
                    <option value="expense">Expense</option><option value="income">Income</option>
                  </select>
                  <Button type="submit" className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">Add</Button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
