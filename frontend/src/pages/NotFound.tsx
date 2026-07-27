import { Link } from "react-router";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-orange-50">
      <div className="text-center px-4">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-teal-500 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <span className="text-white font-bold text-4xl">404</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-3">Page Not Found</h1>
        <p className="text-slate-500 max-w-md mx-auto mb-8">
          The page you're looking for doesn't exist or has been moved. Check the URL or go back to the homepage.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/">
            <Button className="bg-gradient-to-r from-teal-500 to-orange-500 text-white rounded-full px-6">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </Link>
          <Button variant="outline" onClick={() => window.history.back()} className="rounded-full px-6 border-slate-300">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
