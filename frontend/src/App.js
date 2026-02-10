import { useState, useEffect } from "react";
import "@/App.css";
import axios from "axios";
import { Play, Download, Monitor, CheckCircle, ExternalLink } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [config, setConfig] = useState({});

  useEffect(() => {
    axios.get(`${API}/config`).then(res => setConfig(res.data)).catch(console.error);
  }, []);

  const downloadDashboard = () => {
    window.open(`${API}/download-dashboard`, '_blank');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Play className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="app-title">AdsPower Automation</h1>
              <p className="text-zinc-500">Rebotou Browser Bot Runner</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Run Rebotou Across All Your Browsers</h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            One-click automation for all 25 AdsPower profiles. Comments auto-loaded from your Google Sheet.
          </p>
        </div>

        {/* Download Card */}
        <div className="bg-gradient-to-br from-violet-900/30 to-fuchsia-900/30 border border-violet-500/30 rounded-2xl p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
              <Monitor className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">Standalone Dashboard App</h3>
              <p className="text-zinc-400 mb-6">
                Download and run this Python app on your computer. It opens a local dashboard in your browser 
                with a simple "Run All" button - no coding required!
              </p>
              <button
                onClick={downloadDashboard}
                className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 transition-all font-medium text-lg shadow-lg shadow-violet-600/30 hover:shadow-violet-500/40"
                data-testid="download-dashboard-btn"
              >
                <Download className="w-5 h-5" />
                Download Dashboard App
              </button>
            </div>
          </div>
        </div>

        {/* Setup Steps */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-sm">📋</span>
            Quick Setup (3 steps)
          </h3>
          
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0 font-bold">1</div>
              <div>
                <h4 className="font-medium mb-2">Install Requirements</h4>
                <p className="text-zinc-400 text-sm mb-3">Open terminal and run:</p>
                <code className="block bg-black/50 rounded-lg p-4 text-sm font-mono text-emerald-400">
                  pip install requests playwright flask && playwright install chromium
                </code>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0 font-bold">2</div>
              <div>
                <h4 className="font-medium mb-2">Run the Dashboard</h4>
                <p className="text-zinc-400 text-sm mb-3">Make sure AdsPower is running, then:</p>
                <code className="block bg-black/50 rounded-lg p-4 text-sm font-mono text-emerald-400">
                  python adspower_dashboard.py
                </code>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0 font-bold">3</div>
              <div>
                <h4 className="font-medium mb-2">Open Dashboard & Click Run</h4>
                <p className="text-zinc-400 text-sm mb-3">Open in your browser:</p>
                <code className="block bg-black/50 rounded-lg p-4 text-sm font-mono text-amber-400">
                  http://localhost:9090
                </code>
                <p className="text-zinc-400 text-sm mt-3">
                  Click "Sync from AdsPower" → Select profiles → Click "Run Selected Profiles"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h4 className="font-medium mb-2">Auto-Sync Profiles</h4>
            <p className="text-zinc-500 text-sm">
              Automatically fetches all 25 profiles from your AdsPower with one click
            </p>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
              <ExternalLink className="w-5 h-5" />
            </div>
            <h4 className="font-medium mb-2">Google Sheets Comments</h4>
            <p className="text-zinc-500 text-sm">
              Comments loaded from your sheets (Bump Connect, Syndicate, Kollabsy)
            </p>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center mb-4">
              <Play className="w-5 h-5" />
            </div>
            <h4 className="font-medium mb-2">One-Click Run</h4>
            <p className="text-zinc-500 text-sm">
              Select profiles, assign sheets, and run automation with a single button
            </p>
          </div>
        </div>

        {/* Config Info */}
        <div className="mt-8 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
          <p className="text-sm text-zinc-500 text-center">
            Configured for: Extension ID <code className="text-zinc-400">{config.rebotou_extension_id}</code> | 
            AdsPower Port <code className="text-zinc-400">{config.adspower_api_port}</code> | 
            <a 
              href={`https://docs.google.com/spreadsheets/d/${config.google_sheet_id}/edit`}
              target="_blank" 
              rel="noopener noreferrer"
              className="text-violet-400 hover:underline ml-1"
              data-testid="google-sheet-link"
            >
              Google Sheet
            </a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-16 py-6">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-zinc-600">
          <p>AdsPower Rebotou Automation Dashboard</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
