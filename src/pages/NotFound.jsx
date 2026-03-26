import { Link } from "react-router-dom";
import { Bot } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
      <div className="text-center">
        <Bot className="w-16 h-16 text-zinc-500 mx-auto mb-4" />
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-zinc-400 mb-8">Page not found</p>
        <Link to="/" className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold transition-all">
          Go Home
        </Link>
      </div>
    </div>
  );
}
