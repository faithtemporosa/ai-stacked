import { useState } from "react";
import { Calculator, DollarSign, Clock, TrendingUp } from "lucide-react";

export default function ROICalculator() {
  const [hours, setHours] = useState(20);
  const [rate, setRate] = useState(50);
  const [agents, setAgents] = useState(3);

  const monthlySavings = hours * rate * 4;
  const agentCost = agents * 30;
  const netSavings = monthlySavings - agentCost;
  const roi = agentCost > 0 ? Math.round((netSavings / agentCost) * 100) : 0;

  return (
    <section className="py-20 border-t border-zinc-800" id="pricing">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-4">
            <Calculator className="w-4 h-4" /> ROI Calculator
          </div>
          <h2 className="text-3xl font-bold">See Your Potential Savings</h2>
          <p className="text-zinc-400 mt-3">Calculate how much time and money AI agents can save your team</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 space-y-6">
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Hours spent on manual tasks per week</label>
              <input
                type="range" min="5" max="80" value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <div className="text-right text-sm text-zinc-300 mt-1">{hours} hours/week</div>
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Average hourly rate ($)</label>
              <input
                type="range" min="15" max="200" value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <div className="text-right text-sm text-zinc-300 mt-1">${rate}/hour</div>
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Number of AI agents</label>
              <input
                type="range" min="1" max="10" value={agents}
                onChange={(e) => setAgents(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <div className="text-right text-sm text-zinc-300 mt-1">{agents} agents</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
              <Clock className="w-6 h-6 text-violet-400 mb-2" />
              <div className="text-2xl font-bold">{hours * 4}h</div>
              <div className="text-xs text-zinc-500 mt-1">Hours saved/month</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
              <DollarSign className="w-6 h-6 text-emerald-400 mb-2" />
              <div className="text-2xl font-bold">${monthlySavings.toLocaleString()}</div>
              <div className="text-xs text-zinc-500 mt-1">Monthly savings</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
              <DollarSign className="w-6 h-6 text-amber-400 mb-2" />
              <div className="text-2xl font-bold">${agentCost}</div>
              <div className="text-xs text-zinc-500 mt-1">Agent cost/month</div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 flex flex-col items-center justify-center text-center">
              <TrendingUp className="w-6 h-6 text-emerald-400 mb-2" />
              <div className="text-2xl font-bold text-emerald-400">{roi}%</div>
              <div className="text-xs text-zinc-500 mt-1">Return on Investment</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
