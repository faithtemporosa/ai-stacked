import { Search, ShoppingCart, Zap, BarChart3 } from "lucide-react";

const steps = [
  { icon: Search, title: "Browse", desc: "Explore our catalog of pre-built AI agents for every industry and use case." },
  { icon: ShoppingCart, title: "Select", desc: "Pick the agents that match your needs or take the Build My Stack quiz." },
  { icon: Zap, title: "Deploy", desc: "One-click deployment — your agents start working within minutes." },
  { icon: BarChart3, title: "Scale", desc: "Monitor performance, track ROI, and add more agents as you grow." },
];

export default function HowItWorks() {
  return (
    <section className="py-20 border-t border-zinc-800 bg-zinc-900/20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">How It Works</h2>
          <p className="text-zinc-400 mt-3">Get up and running in 4 simple steps</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={i} className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                <step.icon className="w-6 h-6 text-violet-400" />
              </div>
              <div className="text-xs text-violet-400 font-semibold mb-2">Step {i + 1}</div>
              <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-sm text-zinc-400">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
