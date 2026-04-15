import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gear, FloppyDisk, UploadSimple, Image } from "@phosphor-icons/react";
import { toast } from "sonner";

const settingFields = [
  { key: "business_address", label: "Business Address", placeholder: "123 Main Street, Colombo" },
  { key: "business_phone", label: "Business Phone", placeholder: "+94 77 123 4567" },
  { key: "tax_rate", label: "Tax Rate (%)", placeholder: "0" },
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
  const fileInputRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try { const { data } = await api.get("/settings"); setSettings(data || {}); }
      catch (err) { console.error(err); }
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

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-navy-800 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div data-testid="settings-page" className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-medium text-navy-900 tracking-tight">Settings</h1>
          <p className="text-navy-500 mt-1">Configure brand, business details, SMS, and email</p>
        </div>
        <Button onClick={saveAll} disabled={saving} className="bg-navy-800 text-white hover:bg-navy-700 rounded-xl">
          <FloppyDisk size={18} className="mr-2" /> {saving ? "Saving..." : "Save All"}
        </Button>
      </div>

      <div className="space-y-4">
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
              <p className="text-xs text-navy-400">Max 500KB. PNG or JPG recommended. This updates the sidebar header and receipt headers.</p>
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
