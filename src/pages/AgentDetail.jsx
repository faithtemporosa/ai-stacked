import { useParams, Link } from "react-router-dom";
import { Bot, ArrowLeft, ShoppingCart, Heart, Check, Zap, Clock, BarChart3 } from "lucide-react";
import { automations } from "@/data/automations";

export default function AgentDetail() {
  const { id } = useParams();
  const agent = automations.find((a) => a.id === id);

  if (!agent) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <Bot className="w-12 h-12 mx-auto mb-4 text-zinc-500" />
          <h2 className="text-xl font-bold mb-2">Agent Not Found</h2>
          <Link to="/catalog" className="text-violet-400 hover:text-violet-300">Back to catalog</Link>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-3">
            <Link to="/cart" className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors">
              <ShoppingCart className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link to="/catalog" className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to catalog
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs px-2 py-1 rounded-full bg-violet-500/10 text-violet-400">{agent.category}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">{agent.industry}</span>
            </div>
            <h1 className="text-3xl font-bold mb-4">{agent.name}</h1>
            <p className="text-zinc-400 text-lg mb-8">{agent.description}</p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                <Clock className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                <div className="text-xl font-bold">{agent.hours_saved}h</div>
                <div className="text-xs text-zinc-500">Saved/month</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                <BarChart3 className="w-5 h-5 text-violet-400 mx-auto mb-2" />
                <div className="text-xl font-bold">{agent.difficulty}/5</div>
                <div className="text-xs text-zinc-500">Difficulty</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                <Zap className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                <div className="text-xl font-bold">${agent.price}</div>
                <div className="text-xs text-zinc-500">Per month</div>
              </div>
            </div>

            <h3 className="font-semibold text-lg mb-4">Features</h3>
            <ul className="space-y-3">
              {agent.features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-zinc-300">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 sticky top-24">
              <div className="text-3xl font-bold mb-1">${agent.price}<span className="text-zinc-500 text-sm font-normal">/mo</span></div>
              <p className="text-xs text-zinc-500 mb-6">Cancel anytime</p>
              <button className="w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-500 font-semibold transition-all flex items-center justify-center gap-2 mb-3">
                <ShoppingCart className="w-4 h-4" /> Add to Cart
              </button>
              <button className="w-full py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 font-semibold transition-all flex items-center justify-center gap-2">
                <Heart className="w-4 h-4" /> Add to Wishlist
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
