import { useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Search, Filter, ShoppingCart, Heart, Zap, ArrowRight } from "lucide-react";
import { automations, categories, industries } from "@/data/automations";

export default function Catalog() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [industry, setIndustry] = useState("All");

  const filtered = automations.filter((a) => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || a.category === category;
    const matchInd = industry === "All" || a.industry === industry;
    return matchSearch && matchCat && matchInd;
  });

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
            <Link to="/wishlist" className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors">
              <Heart className="w-4 h-4" />
            </Link>
            <Link to="/cart" className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors">
              <ShoppingCart className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">AI Agent Catalog</h1>
          <p className="text-zinc-400">Browse and deploy pre-built automation agents</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents..."
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:border-violet-500"
            />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm">
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm">
            {industries.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
          </select>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((agent) => (
            <Link
              key={agent.id}
              to={`/automation/${agent.id}`}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-violet-500/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-violet-400" />
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">{agent.category}</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">{agent.name}</h3>
              <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{agent.description}</p>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-bold">${agent.price}</span>
                  <span className="text-zinc-500 text-sm">/mo</span>
                </div>
                <div className="text-xs text-emerald-400">{agent.hours_saved}h saved/mo</div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-violet-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                View details <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-zinc-500">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No agents match your search. Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
