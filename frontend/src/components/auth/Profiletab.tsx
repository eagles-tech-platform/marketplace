import { useEffect, useState, type ReactNode } from "react";
import { Save, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AvatarUploadButton from "@/components/auth/AvatarUploadButton";
import { useAuth } from "@/hooks/useAuth";
import { authApi, ApiError } from "@/lib/api";

type Props = {
  title: string;
  fallbackAvatar: string;
  /** Text shown next to the avatar (name, subtitle, badges...). */
  header: ReactNode;
  /** false = show avatar + header only, no editable fields (admin). */
  editable?: boolean;
  footer?: ReactNode;
};

/** Profile tab shared by customer, provider and admin settings. Saves via PATCH /auth/profile. */
export default function ProfileTab({ title, fallbackAvatar, header, editable = true, footer }: Props) {
  const { user, updateAvatar, refresh } = useAuth();

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fill the form once the user has loaded
  useEffect(() => {
    if (!user) return;
    setName(user.name || "");
    setPhoneNumber(user.phoneNumber || "");
    setState(user.state || "");
    setCity(user.city || "");
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    if (!name.trim()) {
      setError("Name can't be empty.");
      return;
    }
    setSaving(true);
    try {
      await authApi.updateProfile({ name: name.trim(), phoneNumber: phoneNumber.trim(), state: state.trim(), city: city.trim() });
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>

      <div className="flex items-center gap-4">
        <div className="relative">
          <img src={user?.avatar || fallbackAvatar} alt="" className="w-20 h-20 rounded-full object-cover border-3 border-teal-500" />
          <AvatarUploadButton onUploaded={updateAvatar} />
        </div>
        <div>{header}</div>
      </div>

      {editable && (
        <>
          {saved && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-green-700 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Changes saved!
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl h-11" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <Input value={user?.email || ""} disabled className="rounded-xl h-11 bg-slate-50" />
              <p className="text-xs text-slate-400 mt-1">Email can't be changed.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
              <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+234 800 000 0000" className="rounded-xl h-11" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
              <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Rivers" className="rounded-xl h-11" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Port Harcourt" className="rounded-xl h-11" />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-xl">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </>
      )}

      {footer}
    </div>
  );
}