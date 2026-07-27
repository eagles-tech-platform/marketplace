import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Heart, MessageCircle, Trash2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/DashboardLayout";
import ImageUploader from "@/components/ImageUploader";
import { postApi, ApiError, type PostItem } from "@/lib/api";

const statusStyles: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  rejected: "bg-red-100 text-red-700",
};

export default function AdminBlog() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await postApi.adminList();
      setPosts(res.posts);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not load posts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = filter === "all" ? posts : posts.filter((p) => p.status === filter);

  const moderate = async (id: string, decision: "approve" | "reject") => {
    setBusyId(id);
    setErrorMessage(null);
    try {
      const res = await postApi.moderate(id, decision);
      setPosts((prev) => prev.map((p) => (p._id === id ? res.post : p)));
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not moderate post.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this post permanently?")) return;
    setBusyId(id);
    try {
      await postApi.remove(id);
      setPosts((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not delete post.");
    } finally {
      setBusyId(null);
    }
  };

  const publish = async () => {
    if (!title.trim() || !content.trim()) {
      setErrorMessage("Title and content are required.");
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await postApi.create({ title: title.trim(), content: content.trim(), coverImage });
      setPosts((prev) => [res.post, ...prev]);
      setShowForm(false);
      setTitle("");
      setContent("");
      setCoverImage("");
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not publish post.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout role="admin" title="Blog">
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-wrap gap-2">
          {["all", "approved", "pending", "rejected"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${filter === f ? "bg-teal-500 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
              {f}
            </button>
          ))}
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-full">
          <PenLine className="w-4 h-4 mr-2" />
          {showForm ? "Cancel" : "Write Post"}
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">New Admin Post</h3>
          <p className="text-xs text-slate-400">Posts written by admin publish immediately — no review needed.</p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" className="rounded-xl h-11" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Cover Image (optional)</label>
            <ImageUploader urls={coverImage ? [coverImage] : []} onChange={(urls) => setCoverImage(urls[0] || "")} max={1} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Content</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="Write your post..." className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 resize-none" />
          </div>
          <Button onClick={publish} disabled={submitting} className="bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-xl">
            {submitting ? "Publishing..." : "Publish Post"}
          </Button>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{errorMessage}</div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-sm text-slate-400 p-6">Loading posts...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-3 font-medium">Post</th>
                  <th className="px-6 py-3 font-medium">Author</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Engagement</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((post) => (
                  <tr key={post._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-800 max-w-xs truncate">{post.title}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{post.author?.name || "Unknown"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyles[post.status]}`}>{post.status}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{post.likes.length}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" />{post.comments.length}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(post.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {post.status === "pending" && (
                          <>
                            <button disabled={busyId === post._id} onClick={() => moderate(post._id, "approve")} className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50" title="Approve"><CheckCircle2 className="w-4 h-4" /></button>
                            <button disabled={busyId === post._id} onClick={() => moderate(post._id, "reject")} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Reject"><XCircle className="w-4 h-4" /></button>
                          </>
                        )}
                        <button disabled={busyId === post._id} onClick={() => remove(post._id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-10">No posts in this category.</p>
        )}
      </div>
    </DashboardLayout>
  );
}
