import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

export default function BuildMyStackCTA() {
  return (
    <section className="py-20 border-t border-zinc-800">
      <div className="max-w-4xl mx-auto px-6">
        <div className="bg-gradient-to-br from-violet-900/30 to-fuchsia-900/30 border border-violet-500/20 rounded-2xl p-10 text-center">
          <Sparkles className="w-10 h-10 text-violet-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-3">Not sure where to start?</h2>
          <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
            Take our 2-minute quiz and get a personalized AI agent stack recommendation based on your industry, team size, and goals.
          </p>
          <Link
            to="/build-my-stack"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold transition-all"
          >
            Build My Stack <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
