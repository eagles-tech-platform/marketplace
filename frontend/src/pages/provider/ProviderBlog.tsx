import { useEffect, useState } from "react";
import { Link } from "react-router";
import { PenLine, Heart, MessageCircle, Trash2 } from "lucide-react";
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

export default function ProviderBlog() {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [myPosts, setMyPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await postApi.mine();
      setMyPosts(res.posts);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not load your posts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) {
      setErrorMessage("Title and content are required.");
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await postApi.create({ title, content, coverImage });
      setMyPosts((prev) => [res.post, ...prev]);
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

  const handleDelete = async (post: PostItem) => {
    if (!window.confirm(`Delete "${post.title}"?`)) return;
    const previous = myPosts;
    setMyPosts((prev) => prev.filter((p) => p._id !== post._id));
    try {
      await postApi.remove(post._id);
    } catch (err) {
      setMyPosts(previous);
      setErrorMessage(err instanceof ApiError ? err.message : "Could not delete post.");
    }
  };

  return (
    <DashboardLayout role="provider" title="Blog">
      <div className="mb-6">
        {!showForm ? (
          <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-full">
            <PenLine className="w-4 h-4 mr-2" />
            Write a New Post
          </Button>
        ) : (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Create New Post</h3>
            {errorMessage && <p className="text-sm text-red-600 mb-3">{errorMessage}</p>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give your post a catchy title" className="rounded-xl h-11" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Cover Image (optional)</label>
                <ImageUploader urls={coverImage ? [coverImage] : []} onChange={(urls) => setCoverImage(urls[0] || "")} max={1} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Content</label>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Share your expertise with the community..." rows={6} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 resize-none" />
              </div>
              <p className="text-xs text-slate-400">Posts are reviewed by an admin before they appear publicly.</p>
              <div className="flex gap-3">
                <Button onClick={() => setShowForm(false)} variant="outline" className="rounded-xl">Cancel</Button>
                <Button onClick={handlePublish} disabled={submitting} className="bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-xl">
                  {submitting ? "Submitting..." : "Submit for Review"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">My Posts</h3>
        {loading ? (
          <p className="text-sm text-slate-400">Loading your posts...</p>
        ) : myPosts.length === 0 ? (
          <p className="text-sm text-slate-400">You haven't written any posts yet.</p>
        ) : (
          myPosts.map((post) => (
            <div key={post._id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-4">
                <img src={post.coverImage || "/provider-work.jpg"} alt="" className="w-24 h-24 rounded-xl object-cover shrink-0" />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 capitalize ${statusStyles[post.status]}`}>{post.status}</span>
                      {post.status === "approved" ? (
                        <Link to={`/blog/${post._id}`}>
                          <h4 className="font-semibold text-slate-800 hover:text-teal-600 transition-colors">{post.title}</h4>
                        </Link>
                      ) : (
                        <h4 className="font-semibold text-slate-800">{post.title}</h4>
                      )}
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{post.content}</p>
                    </div>
                    <button onClick={() => handleDelete(post)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 ml-4 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
                    <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> {post.likes.length}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> {post.comments.length}</span>
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
