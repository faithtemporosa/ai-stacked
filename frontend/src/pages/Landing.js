import { useState } from "react";
import { MessageCircle, Zap, Shield, Check, ArrowRight, TrendingUp, Users, Bot } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const plans = [
  {
    id: "free", name: "Free", price: "$0", period: "/month",
    desc: "Get started with basic automation",
    features: ["5 profiles", "50 comments/day", "Basic reports", "Community support"],
    cta: "Get Started", popular: false
  },
  {
    id: "pro", name: "Pro", price: "$29", period: "/month",
    desc: "Full automation power for growing teams",
    features: ["25 profiles", "Unlimited comments", "DM automation", "Post scheduler", "Real-time analytics", "Priority support"],
    cta: "Upgrade to Pro", popular: true
  },
  {
    id: "enterprise", name: "Enterprise", price: "$99", period: "/month",
    desc: "Custom solutions for agencies",
    features: ["Unlimited profiles", "All Pro features", "Custom branding", "API access", "Dedicated support", "White-label option"],
    cta: "Contact Sales", popular: false
  }
];

export default function Landing({ onNavigate }) {
  const [loadingPlan, setLoadingPlan] = useState(null);

  const handlePlanSelect = async (planId) => {
    if (planId === "free") { onNavigate("dashboard"); return; }
    setLoadingPlan(planId);
    try {
      const res = await fetch(`${API_URL}/api/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId, origin_url: window.location.origin })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) { console.error("Checkout error:", err); }
    setLoadingPlan(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-900/20 via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto px-6 pt-24 pb-16 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm mb-6">
              <Bot className="w-4 h-4" /> TikTok Automation Platform
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight" data-testid="hero-title">
              Automate Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">TikTok Growth</span>
            </h1>
            <p className="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto">
              Post comments, send DMs, and schedule content across 25+ profiles. Real-time analytics dashboard for your entire team.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <button onClick={() => onNavigate("dashboard")} className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold transition-all flex items-center gap-2" data-testid="cta-dashboard">
                View Dashboard <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 font-semibold transition-all" data-testid="cta-pricing">
                See Pricing
              </button>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
            {[
              { icon: MessageCircle, title: "Auto Comments", desc: "Post promotional comments on trending TikTok videos across your profiles", color: "violet" },
              { icon: TrendingUp, title: "Real-time Analytics", desc: "Track performance, best posting hours, and brand metrics in real-time", color: "emerald" },
              { icon: Users, title: "Team Dashboard", desc: "Give your team live access to all automation reports and activity logs", color: "blue" }
            ].map((f, i) => (
              <div key={i} className={`bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-${f.color}-500/30 transition-all group`}>
                <div className={`w-10 h-10 rounded-lg bg-${f.color}-500/10 flex items-center justify-center mb-4 group-hover:bg-${f.color}-500/20 transition-colors`}>
                  <f.icon className={`w-5 h-5 text-${f.color}-400`} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="border-y border-zinc-800 bg-zinc-900/30 py-12">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "10,000+", label: "Comments Posted" },
            { value: "25", label: "Active Profiles" },
            { value: "3", label: "Brands Promoted" },
            { value: "24/7", label: "Automation Running" }
          ].map((s, i) => (
            <div key={i}><div className="text-2xl font-bold text-white">{s.value}</div><div className="text-sm text-zinc-500 mt-1">{s.label}</div></div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold" data-testid="pricing-title">Simple, Transparent Pricing</h2>
            <p className="text-zinc-400 mt-3">Start free, upgrade when you're ready</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {plans.map(plan => (
              <div key={plan.id} className={`relative bg-zinc-900 border rounded-xl p-6 flex flex-col ${plan.popular ? "border-violet-500 shadow-lg shadow-violet-500/10" : "border-zinc-800"}`}
                data-testid={`plan-${plan.id}`}>
                {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-violet-600 text-xs font-semibold">Most Popular</div>}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="text-sm text-zinc-500 mt-1">{plan.desc}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-zinc-500">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => handlePlanSelect(plan.id)} disabled={loadingPlan === plan.id}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${plan.popular ? "bg-violet-600 hover:bg-violet-500 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"} disabled:opacity-50`}
                  data-testid={`plan-btn-${plan.id}`}>
                  {loadingPlan === plan.id ? "Processing..." : plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-20 border-t border-zinc-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Everything You Need</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: "Auto Comments", desc: "Post promotional comments across 25+ profiles with smart rotation" },
              { icon: MessageCircle, title: "DM Automation", desc: "Send targeted DMs to users, followers, and hashtag audiences" },
              { icon: Shield, title: "Post Scheduler", desc: "Schedule TikTok video uploads with date/time and auto-publishing" },
              { icon: TrendingUp, title: "Analytics Dashboard", desc: "Track success rates, best hours, brand performance in real-time" },
              { icon: Users, title: "Team Access", desc: "Invite team members to view live reports and automation logs" },
              { icon: Bot, title: "Smart Profiles", desc: "Manage 25 AdsPower browser profiles with parallel execution" }
            ].map((cap, i) => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all">
                <cap.icon className="w-5 h-5 text-violet-400 mb-3" />
                <h3 className="font-semibold mb-1">{cap.title}</h3>
                <p className="text-sm text-zinc-500">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-zinc-600">
          <p>TikTok Automation Platform - Built for Growth Teams</p>
        </div>
      </footer>
    </div>
  );
}
