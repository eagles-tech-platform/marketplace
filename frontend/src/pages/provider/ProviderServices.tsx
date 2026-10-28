import { useEffect, useState } from "react";
import { Plus, Edit3, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/auth/DashboardLayout";
import ImageUploader from "@/components/auth/ImageUploader";
import { jobCategories } from "@/data/categories";
import { serviceApi, ApiError, type ServiceItem } from "@/lib/api";

const emptyForm = { title: "", category: "", niche: "", price: "", priceType: "fixed", description: "", images: [] as string[] };

export default function ProviderServices() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const currentCat = jobCategories.find((c) => c.name === selectedCategory);

  const loadServices = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await serviceApi.mine();
      setServices(res.services);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not load your services.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setSelectedCategory("");
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (service: ServiceItem) => {
    setEditingId(service._id);
    setSelectedCategory(service.category);
    setForm({
      title: service.title,
      category: service.category,
      niche: service.niche,
      price: String(service.price),
      priceType: service.priceType,
      description: service.description,
      images: service.images,
    });
    setShowForm(true);
  };

  const toggleActive = async (service: ServiceItem) => {
    // optimistic update
    setServices((prev) => prev.map((s) => (s._id === service._id ? { ...s, isActive: !s.isActive } : s)));
    try {
      await serviceApi.update(service._id, { isActive: !service.isActive });
    } catch (err) {
      // revert on failure
      setServices((prev) => prev.map((s) => (s._id === service._id ? { ...s, isActive: service.isActive } : s)));
      setErrorMessage(err instanceof ApiError ? err.message : "Could not update service status.");
    }
  };

  const handleDelete = async (service: ServiceItem) => {
    if (!window.confirm(`Delete "${service.title}"? This can't be undone.`)) return;
    const previous = services;
    setServices((prev) => prev.filter((s) => s._id !== service._id));
    try {
      await serviceApi.remove(service._id);
    } catch (err) {
      setServices(previous);
      setErrorMessage(err instanceof ApiError ? err.message : "Could not delete service.");
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.price || !selectedCategory || !form.niche) {
      setErrorMessage("Title, category, niche and price are required.");
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    const payload = {
      title: form.title,
      category: selectedCategory,
      niche: form.niche,
      price: Number(form.price),
      priceType: form.priceType as ServiceItem["priceType"],
      description: form.description,
      images: form.images,
    };
    try {
      if (editingId) {
        const res = await serviceApi.update(editingId, payload);
        setServices((prev) => prev.map((s) => (s._id === editingId ? res.service : s)));
      } else {
        const res = await serviceApi.create(payload);
        setServices((prev) => [res.service, ...prev]);
      }
      resetForm();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not save service.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout role="provider" title="My Services">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">{services.length} Services Listed</h3>
        <Button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? "Cancel" : "Add Service"}
        </Button>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{errorMessage}</div>
      )}

      {/* Add / Edit Service Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-6">
          <h4 className="font-semibold text-slate-800 mb-4">{editingId ? "Edit Service" : "Add New Service"}</h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Service Title</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Professional Plumbing Repair" className="rounded-xl h-11" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setForm({ ...form, niche: "" }); }} className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
                <option value="">Select</option>
                {jobCategories.map((cat) => (<option key={cat.slug} value={cat.name}>{cat.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Niche</label>
              <select value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
                <option value="">Select</option>
                {currentCat?.niches.map((n) => (<option key={n.slug} value={n.name}>{n.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Price (₦)</label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="5000" className="rounded-xl h-11" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Pricing Type</label>
              <select value={form.priceType} onChange={(e) => setForm({ ...form, priceType: e.target.value })} className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
                <option value="fixed">Fixed</option>
                <option value="hourly">Hourly</option>
                <option value="negotiable">Negotiable</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe your service..." rows={3} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 resize-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Photos</label>
              <ImageUploader urls={form.images} onChange={(urls) => setForm({ ...form, images: urls })} max={5} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={resetForm} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-xl">
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add Service"}
            </Button>
          </div>
        </div>
      )}

      {/* Services List */}
      {loading ? (
        <p className="text-sm text-slate-400">Loading your services...</p>
      ) : services.length === 0 ? (
        <p className="text-sm text-slate-400">You haven't listed any services yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {services.map((service) => (
            <div key={service._id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-4">
                <img src={service.images[0] || "/provider-work.jpg"} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-1 ${service.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                        {service.isActive ? "Active" : "Inactive"}
                      </span>
                      <h4 className="font-semibold text-slate-800">{service.title}</h4>
                      <p className="text-xs text-slate-500">{service.niche}</p>
                    </div>
                    <button onClick={() => toggleActive(service)} className="text-slate-400 hover:text-teal-600">
                      {service.isActive ? <ToggleRight className="w-6 h-6 text-teal-500" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                  </div>
                  <p className="text-lg font-bold text-teal-600 mt-2">₦{service.price.toLocaleString()}</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => startEdit(service)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(service)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
