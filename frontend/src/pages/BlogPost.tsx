import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { Heart, MessageCircle, ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { postApi, ApiError, type PostItem } from "@/lib/api";

export default function BlogPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState<PostItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    if (!id) return;
    postApi
      .getOne(id)
      .then((res) => setPost(res.post))
      .catch((err) => setErrorMessage(err instanceof ApiError ? err.message : "Post not found."))
      .finally(() => setLoading(false));
  }, [id]);

  const isLikedByMe = !!(post && user && post.likes.includes(user.id));

  const handleLike = async () => {
    if (!user) {
      navigate("/login?returnUrl=" + encodeURIComponent(window.location.pathname));
      return;
    }
    if (!post || liking) return;
    setLiking(true);
    // optimistic update
    const wasLiked = isLikedByMe;
    setPost((prev) =>
      prev
        ? { ...prev, likes: wasLiked ? prev.likes.filter((l) => l !== user.id) : [...prev.likes, user.id] }
        : prev
    );
    try {
      await postApi.toggleLike(post._id);
    } catch (err) {
      // revert on failure
      setPost((prev) =>
        prev
          ? { ...prev, likes: wasLiked ? [...prev.likes, user.id] : prev.likes.filter((l) => l !== user.id) }
          : prev
      );
      setErrorMessage(err instanceof ApiError ? err.message : "Could not update like.");
    } finally {
      setLiking(false);
    }
  };

  const handleComment = async () => {
    if (!user) {
      navigate("/login?returnUrl=" + encodeURIComponent(window.location.pathname));
      return;
    }
    if (!commentText.trim() || !post) return;
    setPosting(true);
    try {
      const res = await postApi.comment(post._id, commentText.trim());
      setPost((prev) => (prev ? { ...prev, comments: res.comments } : prev));
      setCommentText("");
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Could not post comment.");
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <p className="text-center text-slate-400 pt-32">Loading post...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="text-center pt-32">
          <p className="text-slate-500 mb-4">{errorMessage || "Post not found."}</p>
          <Link to="/blog" className="text-teal-600 underline">Back to Blog</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>

        <div className="rounded-2xl overflow-hidden mb-8 bg-slate-100">
          <img src={post.coverImage || "/blog-cover-1.jpg"} alt={post.title} className="w-full h-64 sm:h-96 object-cover" />
        </div>

        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-4">{post.title}</h1>
          <div className="flex items-center gap-4">
            <img src={post.author.avatar || "/avatar-provider-1.jpg"} alt="" className="w-10 h-10 rounded-full object-cover" />
            <div>
              <p className="text-sm font-medium text-slate-700">{post.author.name}</p>
              <p className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{errorMessage}</div>
        )}

        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 mb-8">
          <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{post.content}</p>
        </div>

        {/* Engagement Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              disabled={liking}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                isLikedByMe ? "text-red-500" : "text-slate-500 hover:text-red-500"
              }`}
            >
              <Heart className={`w-5 h-5 ${isLikedByMe ? "fill-red-500" : ""}`} />
              {post.likes.length}
            </button>
            <span className="flex items-center gap-1.5 text-sm text-slate-500">
              <MessageCircle className="w-5 h-5" />
              {post.comments.length}
            </span>
          </div>
        </div>

        {/* Guest Login Banner */}
        {!user && (
          <div className="bg-gradient-to-r from-teal-500 to-orange-500 rounded-2xl p-6 text-white mb-8">
            <p className="font-medium mb-3">Want to like or comment on this post?</p>
            <Link to={`/login?returnUrl=${encodeURIComponent(window.location.pathname)}`}>
              <Button className="bg-white text-teal-700 hover:bg-white/90 rounded-full">
                Login to Interact
              </Button>
            </Link>
          </div>
        )}

        {/* Comments Section */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">
            Comments ({post.comments.length})
          </h3>

          {user && (
            <div className="flex gap-3 mb-8">
              <img src={user.avatar || "/avatar-provider-1.jpg"} alt="" className="w-10 h-10 rounded-full object-cover self-start" />
              <div className="flex-1">
                <Textarea
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="rounded-xl border-slate-200 focus:border-teal-500 mb-2"
                  rows={3}
                />
                <Button onClick={handleComment} disabled={posting} className="bg-teal-500 hover:bg-teal-600 rounded-full" size="sm">
                  <Send className="w-4 h-4 mr-2" />
                  {posting ? "Posting..." : "Post Comment"}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {post.comments.length === 0 ? (
              <p className="text-sm text-slate-400">No comments yet.</p>
            ) : (
              post.comments.map((comment) => (
                <div key={comment._id} className="flex gap-3">
                  <img src={comment.author.avatar || "/avatar-customer-1.jpg"} alt="" className="w-10 h-10 rounded-full object-cover self-start" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-slate-800">{comment.author.name}</span>
                      <span className="text-xs text-slate-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-slate-600">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
