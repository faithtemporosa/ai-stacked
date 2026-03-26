import { Link } from "react-router-dom";
import { Bot, ArrowRight, Zap, Shield, TrendingUp, Users, Calculator, ChevronRight, Star, CheckCircle2 } from "lucide-react";
import ROICalculator from "@/components/ROICalculator";
import HowItWorks from "@/components/HowItWorks";
import BuildMyStackCTA from "@/components/BuildMyStackCTA";

const stats = [
  { value: "10,000+", label: "Automations Deployed" },
  { value: "500+", label: "Active Teams" },
  { value: "8x", label: "Avg ROI" },
  { value: "24/7", label: "Always Running" },
];

const industries = [
  { name: "Education", icon: "🎓", desc: "Automate enrollment, student outreach, and course scheduling" },
  { name: "Retail", icon: "🛍️", desc: "Inventory monitoring, review management, and price tracking" },
  { name: "Ecommerce", icon: "🛒", desc: "Order processing, customer support, and listing optimization" },
  { name: "Marketing", icon: "📣", desc: "Social media automation, lead generation, and content repurposing" },
  { name: "Sales", icon: "💼", desc: "Lead qualification, appointment setting, and CRM automation" },
  { name: "Content", icon: "✍️", desc: "Content creation, scheduling, and multi-platform distribution" },
];

const testimonials = [
  { name: "Sarah K.", role: "Marketing Director", text: "AI-Stacked saved our team 40+ hours per week. The ROI was immediate.", stars: 5 },
  { name: "James M.", role: "Agency Owner", text: "We deployed 6 agents in one day. Our clients are blown away by the results.", stars: 5 },
  { name: "Lisa P.", role: "E-commerce Manager", text: "The inventory monitor alone paid for itself in the first week.", stars: 5 },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">AI-Stacked</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            <Link to="/catalog" className="hover:text-white transition-colors">Catalog</Link>
            <Link to="/build-my-stack" className="hover:text-white transition-colors">Build My Stack</Link>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm text-zinc-400 hover:text-white transition-colors">Sign In</Link>
            <Link to="/catalog" className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm font-semibold transition-all">
              Browse Agents
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-900/20 via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto px-6 pt-24 pb-16 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm mb-6">
              <Zap className="w-4 h-4" /> AI Agent Marketplace
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Deploy AI Agents That{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
                Actually Work
              </span>
            </h1>
            <p className="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto">
              Browse, customize, and deploy pre-built AI automation agents. From social media to sales — get your team running 24/7 in minutes.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <Link to="/catalog" className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold transition-all flex items-center gap-2">
                Browse Agents <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/build-my-stack" className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 font-semibold transition-all">
                Take the 2-Min Quiz
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="border-y border-zinc-800 bg-zinc-900/30 py-12">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => (
            <div key={i}>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-sm text-zinc-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Industries */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Built for Every Industry</h2>
            <p className="text-zinc-400 mt-3">AI agents tailored to your specific business needs</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {industries.map((ind, i) => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-violet-500/30 transition-all group cursor-pointer">
                <div className="text-3xl mb-4">{ind.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{ind.name}</h3>
                <p className="text-sm text-zinc-400">{ind.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-violet-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  View agents <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <HowItWorks />

      {/* ROI Calculator */}
      <ROICalculator />

      {/* Build My Stack CTA */}
      <BuildMyStackCTA />

      {/* Testimonials */}
      <section className="py-20 border-t border-zinc-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">What Teams Are Saying</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-zinc-300 mb-4">"{t.text}"</p>
                <div className="text-sm">
                  <span className="font-semibold text-white">{t.name}</span>
                  <span className="text-zinc-500 ml-2">{t.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise Guardrails */}
      <section className="py-20 border-t border-zinc-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Enterprise Guardrails</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: "SOC 2 Compliant", desc: "Enterprise-grade security for your automation data" },
              { icon: Users, title: "Team Access Controls", desc: "Role-based permissions and audit logging" },
              { icon: TrendingUp, title: "99.9% Uptime SLA", desc: "Guaranteed availability with redundant infrastructure" },
            ].map((item, i) => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center">
                <item.icon className="w-8 h-8 text-violet-400 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-zinc-800">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Automate?</h2>
          <p className="text-zinc-400 mb-8">Start with a free agent and scale as you grow. No credit card required.</p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/catalog" className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold transition-all flex items-center gap-2">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/build-my-stack" className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 font-semibold transition-all">
              Build My Stack
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-zinc-600">
          <p>AI-Stacked — AI Agent Marketplace for Growth Teams</p>
        </div>
      </footer>
    </div>
  );
}
