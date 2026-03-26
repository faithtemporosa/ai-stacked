import { Link } from "react-router-dom";
import { Bot, ShoppingCart, Trash2, ArrowLeft } from "lucide-react";

export default function Cart() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">AI-Stacked</span>
          </Link>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <ShoppingCart className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Your Cart is Empty</h1>
        <p className="text-zinc-400 mb-8">Browse our catalog to add AI agents to your cart.</p>
        <Link to="/catalog" className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold transition-all inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Browse Catalog
        </Link>
      </div>
    </div>
  );
}
