import { useState } from "react";
import { Link } from "react-router-dom";
import { Bot, ArrowRight, CheckCircle2 } from "lucide-react";

const questions = [
  { q: "What's your biggest pain point?", options: ["Social media management", "Lead generation", "Customer support", "Content creation", "Data entry & scraping"] },
  { q: "What industry are you in?", options: ["Marketing / Agency", "E-commerce / Retail", "SaaS / Tech", "Education", "Other"] },
  { q: "How big is your team?", options: ["Just me", "2-5 people", "6-20 people", "20+ people"] },
  { q: "What's your monthly automation budget?", options: ["Under $50", "$50 - $150", "$150 - $500", "$500+"] },
];

export default function BuildMyStack() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [done, setDone] = useState(false);

  const handleAnswer = (answer) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      setDone(true);
    }
  };

  const recommendations = [
    { name: "TikTok Auto Commenter", match: 95 },
    { name: "Lead Generation Scraper", match: 88 },
    { name: "Email Outreach Agent", match: 82 },
    { name: "Content Repurposing Agent", match: 76 },
  ];

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

      <div className="max-w-2xl mx-auto px-6 py-16">
        {!done ? (
          <>
            <div className="mb-8">
              <div className="flex gap-2 mb-6">
                {questions.map((_, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-violet-500" : "bg-zinc-800"}`} />
                ))}
              </div>
              <p className="text-sm text-zinc-500 mb-2">Question {step + 1} of {questions.length}</p>
              <h2 className="text-2xl font-bold">{questions[step].q}</h2>
            </div>
            <div className="space-y-3">
              {questions[step].options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleAnswer(opt)}
                  className="w-full text-left px-5 py-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-violet-500/50 transition-all text-sm"
                >
                  {opt}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div>
            <div className="text-center mb-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Your Custom Stack</h2>
              <p className="text-zinc-400">Based on your answers, here are our top recommendations:</p>
            </div>
            <div className="space-y-4 mb-8">
              {recommendations.map((rec, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 font-bold">
                      #{i + 1}
                    </div>
                    <span className="font-semibold">{rec.name}</span>
                  </div>
                  <div className="text-sm text-emerald-400">{rec.match}% match</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Link to="/catalog" className="flex-1 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 font-semibold text-center transition-all flex items-center justify-center gap-2">
                View in Catalog <ArrowRight className="w-4 h-4" />
              </Link>
              <button onClick={() => { setStep(0); setAnswers([]); setDone(false); }} className="px-6 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 font-semibold transition-all">
                Retake
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
