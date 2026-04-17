import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gear, FloppyDisk, UploadSimple, Image, Database, Tag, Plus, Trash, Check, Receipt } from "@phosphor-icons/react";
import { toast } from "sonner";

const settingFields = [
  { key: "business_address", label: "Business Address", placeholder: "123 Main Street, Colombo" },
  { key: "business_phone", label: "Business Phone", placeholder: "+94 77 123 4567" },
  { key: "currency", label: "Currency Symbol", placeholder: "Rs" },
];

const smsFields = [
  { key: "sms_api_key", label: "SMS API Key (notify.lk)", placeholder: "Configure later" },
  { key: "sms_sender_id", label: "SMS Sender ID", placeholder: "Configure later" },
  { key: "whatsapp_api_key", label: "WhatsApp API Key", placeholder: "Configure later" },
];

const emailFields = [
  { key: "email_smtp_host", label: "SMTP Host", placeholder: "smtp.gmail.com" },
  { key: "email_smtp_port", label: "SMTP Port", placeholder: "587" },
  { key: "email_username", label: "Email Username", placeholder: "your@email.com" },
  { key: "email_password", label: "Email Password", placeholder: "Configure later" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [migrations, setMigrations] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [newAttrName, setNewAttrName] = useState("");
  const [taxSettings, setTaxSettings] = useState({ tax_active: false, vat_rate: 18, sscl_rate: 2.5 });
  const fileInputRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [settingsRes, migrationsRes, attrsRes, taxRes] = await Promise.all([
          api.get("/settings"),
          api.get("/migrations/status").catch(() => ({ data: { migrations: [] } })),
          api.get("/product-attributes").catch(() => ({ data: [] })),
          api.get("/tax-settings").catch(() => ({ data: { tax_active: false, vat_rate: 18, sscl_rate: 2.5 } })),
        ]);
        setSettings(settingsRes.data || {});
        setMigrations(migrationsRes.data?.migrations || []);
        setAttributes(attrsRes.data || []);
        setTaxSettings(taxRes.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const saveAll = async () => {
    setSaving(true);
    try {
      const allFields = [...settingFields, ...smsFields, ...emailFields, { key: "business_name" }];
      for (const field of allFields) {
        if (settings[field.key] !== undefined) {
          await api.put("/settings", { key: field.key, value: settings[field.key] || "" });
        }
      }
      toast.success("All settings saved");
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) { toast.error("Logo must be under 500KB"); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/upload/logo", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setSettings({ ...settings, logo_url: data.logo_url });
      toast.success("Logo uploaded! Refresh to see it in the sidebar.");
    } catch (err) {
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const addAttribute = async () => {
    if (!newAttrName.trim()) return;
    try {
      const { data } = await api.post("/product-attributes", { name: newAttrName.trim() });
      setAttributes([...attributes, data]);
      setNewAttrName("");
      toast.success(`Attribute "${data.name}" created`);
    } catch (err) {
      toast.error("Failed to create attribute");
    }
  };

  const deleteAttribute = async (id, name) => {
    if (!window.confirm(`Delete attribute "${name}"? This may affect existing variants.`)) return;
    try {
      await api.delete(`/product-attributes/${id}`);
      setAttributes(attributes.filter(a => a.id !== id));
      toast.success("Attribute deleted");
    } catch (err) {
      toast.error("Failed to delete attribute");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div data-testid="settings-page" className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-medium text-navy-900 tracking-tight">Settings</h1>
          <p className="text-navy-500 mt-1">Configure brand, business details, and system settings</p>
        </div>
        <Button onClick={saveAll} disabled={saving} className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">
          <FloppyDisk size={18} className="mr-2" /> {saving ? "Saving..." : "Save All"}
        </Button>
      </div>

      <div className="space-y-4">
        {/* Database Migrations */}
        <div className="bg-white border border-beige-300 rounded-2xl p-6 space-y-4">
          <h3 className="font-heading font-medium text-navy-900 flex items-center gap-2"><Database size={18} /> Database Migrations</h3>
          <p className="text-sm text-navy-500">Schema migrations are applied automatically on app startup.</p>
          <div className="space-y-2">
            {migrations.map((m) => (
              <div key={m.version} data-testid={`migration-${m.version}`} className="flex items-center gap-3 p-3 bg-beige-50 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-status-success-bg flex items-center justify-center">
                  <Check size={12} className="text-status-success" weight="bold" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-navy-900">v{m.version}</p>
                  <p className="text-xs text-navy-500">{m.description}</p>
                </div>
                <span className="text-xs text-navy-400">{new Date(m.applied_at).toLocaleDateString()}</span>
              </div>
            ))}
            {migrations.length === 0 && (
              <p className="text-sm text-navy-400">No migrations recorded yet.</p>
            )}
          </div>
        </div>

        {/* Product Attributes */}
        <div className="bg-white border border-beige-300 rounded-2xl p-6 space-y-4">
          <h3 className="font-heading font-medium text-navy-900 flex items-center gap-2"><Tag size={18} /> Product Attributes</h3>
          <p className="text-sm text-navy-500">Define dynamic attributes for product variations (e.g., Color, Batch, Size, Fabric Composition).</p>
          <div className="space-y-2">
            {attributes.map((attr) => (
              <div key={attr.id} data-testid={`attr-${attr.name}`} className="flex items-center justify-between p-3 bg-beige-50 rounded-xl">
                <span className="text-sm font-medium text-navy-900">{attr.name}</span>
                <button onClick={() => deleteAttribute(attr.id, attr.name)} className="text-status-danger hover:text-status-danger/80">
                  <Trash size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              data-testid="new-attribute-name"
              value={newAttrName}
              onChange={(e) => setNewAttrName(e.target.value)}
              placeholder="New attribute name (e.g., Size)"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAttribute())}
              className="bg-white border-beige-300 rounded-xl flex-1"
            />
            <Button onClick={addAttribute} className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">
              <Plus size={16} className="mr-1" /> Add
            </Button>
          </div>
        </div>

        {/* Tax & Compliance */}
        <div className="bg-white border border-beige-300 rounded-2xl p-6 space-y-4">
          <h3 className="font-heading font-medium text-navy-900 flex items-center gap-2"><Receipt size={18} /> Tax & Compliance (Sri Lanka 2026)</h3>
          <p className="text-sm text-navy-500">When active, VAT and SSCL are calculated on every POS sale and displayed on receipts.</p>
          
          <div className="flex items-center justify-between p-4 bg-beige-50 rounded-xl">
            <div>
              <p className="font-medium text-navy-900">Tax Active</p>
              <p className="text-xs text-navy-500">Toggle to enable/disable tax calculation on all sales</p>
            </div>
            <button
              data-testid="tax-toggle"
              onClick={async () => {
                const newActive = !taxSettings.tax_active;
                setTaxSettings({...taxSettings, tax_active: newActive});
                try {
                  await api.put("/tax-settings", { tax_active: newActive });
                  toast.success(`Tax ${newActive ? "enabled" : "disabled"}`);
                } catch { toast.error("Failed to update"); }
              }}
              className={`w-12 h-6 rounded-full transition-colors relative ${taxSettings.tax_active ? "bg-status-success" : "bg-beige-400"}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform ${taxSettings.tax_active ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500">VAT Rate (%)</label>
              <Input
                data-testid="vat-rate-input"
                type="number"
                step="0.1"
                value={taxSettings.vat_rate}
                onChange={(e) => setTaxSettings({...taxSettings, vat_rate: parseFloat(e.target.value) || 0})}
                className="bg-white border-beige-300 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500">SSCL Rate (%)</label>
              <Input
                data-testid="sscl-rate-input"
                type="number"
                step="0.1"
                value={taxSettings.sscl_rate}
                onChange={(e) => setTaxSettings({...taxSettings, sscl_rate: parseFloat(e.target.value) || 0})}
                className="bg-white border-beige-300 rounded-xl"
              />
            </div>
          </div>
          <Button
            data-testid="save-tax-settings"
            onClick={async () => {
              try {
                await api.put("/tax-settings", taxSettings);
                toast.success("Tax settings saved");
              } catch { toast.error("Failed to save tax settings"); }
            }}
            className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl"
          >
            <FloppyDisk size={16} className="mr-2" /> Save Tax Settings
          </Button>
        </div>

        {/* Brand Management */}
        <div className="bg-white border border-beige-300 rounded-2xl p-6 space-y-4">
          <h3 className="font-heading font-medium text-navy-900 flex items-center gap-2"><Image size={18} /> Brand Management</h3>
          <p className="text-sm text-navy-500">Your logo and business name appear in the navigation header and on printed receipts.</p>
          
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-beige-300 flex items-center justify-center overflow-hidden bg-beige-50">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Image size={32} className="text-beige-400" />
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="mt-2 w-full text-xs bg-beige-200 text-navy-700 hover:bg-beige-300 rounded-xl h-8">
                <UploadSimple size={14} className="mr-1" /> {uploading ? "Uploading..." : "Upload Logo"}
              </Button>
            </div>
            <div className="flex-1 space-y-3">
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500">Business Name</label>
                <Input
                  data-testid="setting-business_name"
                  value={settings.business_name || ""}
                  onChange={e => setSettings({ ...settings, business_name: e.target.value })}
                  placeholder="TextileERP Retail"
                  className="bg-white border-beige-300 rounded-xl"
                />
              </div>
              <p className="text-xs text-navy-400">Max 500KB. PNG or JPG recommended.</p>
            </div>
          </div>
        </div>

        {/* Business Details */}
        <div className="bg-white border border-beige-300 rounded-2xl p-6 space-y-4">
          <h3 className="font-heading font-medium text-navy-900 flex items-center gap-2"><Gear size={18} /> Business Details</h3>
          {settingFields.map(field => (
            <div key={field.key} className="space-y-1">
              <label className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500">{field.label}</label>
              <Input
                data-testid={`setting-${field.key}`}
                value={settings[field.key] || ""}
                onChange={e => setSettings({ ...settings, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                className="bg-white border-beige-300 rounded-xl"
              />
            </div>
          ))}
        </div>

        {/* SMS/WhatsApp Settings */}
        <div className="bg-white border border-beige-300 rounded-2xl p-6 space-y-4">
          <h3 className="font-heading font-medium text-navy-900">SMS / WhatsApp Settings</h3>
          <p className="text-sm text-navy-500">Configure for sending digital receipts and custom order notifications.</p>
          {smsFields.map(field => (
            <div key={field.key} className="space-y-1">
              <label className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500">{field.label}</label>
              <Input
                data-testid={`setting-${field.key}`}
                value={settings[field.key] || ""}
                onChange={e => setSettings({ ...settings, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                className="bg-white border-beige-300 rounded-xl"
              />
            </div>
          ))}
        </div>

        {/* Email Settings */}
        <div className="bg-white border border-beige-300 rounded-2xl p-6 space-y-4">
          <h3 className="font-heading font-medium text-navy-900">Email Settings (SMTP)</h3>
          {emailFields.map(field => (
            <div key={field.key} className="space-y-1">
              <label className="text-xs uppercase tracking-[0.2em] font-bold text-beige-500">{field.label}</label>
              <Input
                data-testid={`setting-${field.key}`}
                value={settings[field.key] || ""}
                onChange={e => setSettings({ ...settings, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                type={field.key.includes("password") ? "password" : "text"}
                className="bg-white border-beige-300 rounded-xl"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
