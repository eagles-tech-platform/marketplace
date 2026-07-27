import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Search, PenLine, Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { postApi, ApiError, type PostItem } from "@/lib/api";

export default function Blog() {
  const [search, setSearch] = useState("");
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    postApi
      .list()
      .then((res) => setPosts(res.posts))
      .catch((err) => setErrorMessage(err instanceof ApiError ? err.message : "Could not load posts."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = posts.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
  });

  const handleWritePost = () => {
    if (!user) {
      navigate("/login?returnUrl=/blog");
      return;
    }
    navigate(user.activeRole === "provider" ? "/provider/blog" : "/dashboard/blog");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-28 pb-12 bg-gradient-to-br from-teal-500 via-teal-600 to-orange-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">Community Blog</h1>
              <p className="text-white/80">Stories, tips, and insights from our service providers</p>
            </div>
            <Button onClick={handleWritePost} className="bg-white text-teal-700 hover:bg-white/90 rounded-full px-6">
              <PenLine className="w-4 h-4 mr-2" />
              Write a Post
            </Button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search blog posts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12 rounded-xl border-slate-200"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{errorMessage}</div>
        )}

        {loading ? (
          <p className="text-sm text-slate-400 text-center py-10">Loading posts...</p>
        ) : (
          <>
            {/* Featured Post */}
            {filtered.length > 0 && !search && (
              <Link to={`/blog/${filtered[0]._id}`} className="group block mb-8">
                <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-lg transition-all">
                  <div className="grid md:grid-cols-2">
                    <div className="h-64 md:h-auto overflow-hidden bg-slate-100">
                      <img src={filtered[0].coverImage || "/blog-cover-1.jpg"} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-8 flex flex-col justify-center">
                      <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-teal-600 transition-colors">{filtered[0].title}</h2>
                      <p className="text-slate-500 mb-4 line-clamp-3">{filtered[0].content}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> {filtered[0].likes.length}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> {filtered[0].comments.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Posts Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(!search ? filtered.slice(1) : filtered).map((post) => (
                <Link key={post._id} to={`/blog/${post._id}`} className="group">
                  <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <div className="h-48 overflow-hidden bg-slate-100">
                      <img src={post.coverImage || "/blog-cover-1.jpg"} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold text-slate-800 mb-2 group-hover:text-teal-600 transition-colors line-clamp-2">{post.title}</h3>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-4">{post.content}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img src={post.author.avatar || "/avatar-provider-1.jpg"} alt="" className="w-7 h-7 rounded-full object-cover" />
                          <span className="text-xs text-slate-600">{post.author.name}</span>
                        </div>
                        <span className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-20">
                <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-600 mb-2">No posts found</h3>
                <p className="text-slate-400">{posts.length === 0 ? "Be the first to write one." : "Try a different search."}</p>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
