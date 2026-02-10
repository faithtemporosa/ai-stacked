import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Play, Download, Plus, Trash2, RefreshCw, Settings, FileText, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [profiles, setProfiles] = useState([]);
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [comments, setComments] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profiles");
  const [selectedProfiles, setSelectedProfiles] = useState([]);
  const [config, setConfig] = useState({});
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [newProfile, setNewProfile] = useState({ profile_id: "", profile_name: "", sheet_name: "" });

  // Fetch initial data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesRes, sheetsRes, runsRes, configRes] = await Promise.all([
        axios.get(`${API}/profiles`),
        axios.get(`${API}/sheets`),
        axios.get(`${API}/runs`),
        axios.get(`${API}/config`)
      ]);
      setProfiles(profilesRes.data);
      setSheets(sheetsRes.data.sheets);
      setRuns(runsRes.data);
      setConfig(configRes.data);
      if (sheetsRes.data.sheets.length > 0 && !selectedSheet) {
        setSelectedSheet(sheetsRes.data.sheets[0]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  }, [selectedSheet]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch comments when sheet changes
  useEffect(() => {
    if (selectedSheet) {
      fetchComments(selectedSheet);
    }
  }, [selectedSheet]);

  const fetchComments = async (sheetName) => {
    try {
      const response = await axios.get(`${API}/sheets/${encodeURIComponent(sheetName)}/comments`);
      setComments(response.data.comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const addProfile = async () => {
    if (!newProfile.profile_id || !newProfile.profile_name || !newProfile.sheet_name) {
      alert("Please fill all fields");
      return;
    }
    try {
      await axios.post(`${API}/profiles`, newProfile);
      setNewProfile({ profile_id: "", profile_name: "", sheet_name: "" });
      setShowAddProfile(false);
      fetchData();
    } catch (error) {
      console.error("Error adding profile:", error);
    }
  };

  const deleteProfile = async (profileId) => {
    if (!window.confirm("Delete this profile?")) return;
    try {
      await axios.delete(`${API}/profiles/${profileId}`);
      fetchData();
    } catch (error) {
      console.error("Error deleting profile:", error);
    }
  };

  const toggleProfileSelection = (profileId) => {
    setSelectedProfiles(prev => 
      prev.includes(profileId) 
        ? prev.filter(id => id !== profileId)
        : [...prev, profileId]
    );
  };

  const selectAllProfiles = () => {
    if (selectedProfiles.length === profiles.length) {
      setSelectedProfiles([]);
    } else {
      setSelectedProfiles(profiles.map(p => p.profile_id));
    }
  };

  const downloadScript = () => {
    window.open(`${API}/generate-script`, '_blank');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'running': return <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-zinc-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Play className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight" data-testid="app-title">AdsPower Automation</h1>
                <p className="text-sm text-zinc-500">Rebotou Browser Bot Runner</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                data-testid="refresh-btn"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={downloadScript}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                data-testid="download-script-btn"
              >
                <Download className="w-4 h-4" />
                <span>Download Script</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 bg-zinc-900 rounded-xl w-fit">
          {[
            { id: 'profiles', label: 'Profiles', icon: Settings },
            { id: 'comments', label: 'Comments', icon: FileText },
            { id: 'history', label: 'Run History', icon: Clock }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id 
                  ? 'bg-zinc-800 text-white' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Profiles Tab */}
        {activeTab === 'profiles' && (
          <div className="space-y-6">
            {/* Actions Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowAddProfile(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors"
                  data-testid="add-profile-btn"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Profile</span>
                </button>
                {profiles.length > 0 && (
                  <button
                    onClick={selectAllProfiles}
                    className="text-sm text-zinc-400 hover:text-zinc-200"
                    data-testid="select-all-btn"
                  >
                    {selectedProfiles.length === profiles.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>
              <div className="text-sm text-zinc-500">
                {selectedProfiles.length} of {profiles.length} selected
              </div>
            </div>

            {/* Add Profile Modal */}
            {showAddProfile && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" data-testid="add-profile-modal">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold mb-4">Add AdsPower Profile</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Profile ID (from AdsPower)</label>
                      <input
                        type="text"
                        value={newProfile.profile_id}
                        onChange={(e) => setNewProfile({...newProfile, profile_id: e.target.value})}
                        placeholder="e.g., jxxxxxx"
                        className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 focus:border-violet-500 focus:outline-none"
                        data-testid="input-profile-id"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Profile Name</label>
                      <input
                        type="text"
                        value={newProfile.profile_name}
                        onChange={(e) => setNewProfile({...newProfile, profile_name: e.target.value})}
                        placeholder="e.g., Account 1"
                        className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 focus:border-violet-500 focus:outline-none"
                        data-testid="input-profile-name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">Comment Sheet</label>
                      <select
                        value={newProfile.sheet_name}
                        onChange={(e) => setNewProfile({...newProfile, sheet_name: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 focus:border-violet-500 focus:outline-none"
                        data-testid="select-sheet"
                      >
                        <option value="">Select a sheet...</option>
                        {sheets.map(sheet => (
                          <option key={sheet} value={sheet}>{sheet}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowAddProfile(false)}
                      className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                      data-testid="cancel-add-btn"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addProfile}
                      className="flex-1 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors"
                      data-testid="confirm-add-btn"
                    >
                      Add Profile
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Profiles Grid */}
            {profiles.length === 0 ? (
              <div className="text-center py-16 text-zinc-500" data-testid="no-profiles">
                <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No profiles configured yet</p>
                <p className="text-sm mt-1">Add AdsPower profiles to get started</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {profiles.map(profile => (
                  <div
                    key={profile.profile_id}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedProfiles.includes(profile.profile_id)
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                    }`}
                    onClick={() => toggleProfileSelection(profile.profile_id)}
                    data-testid={`profile-card-${profile.profile_id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{profile.profile_name}</h3>
                        <p className="text-sm text-zinc-500 mt-1">ID: {profile.profile_id}</p>
                        <p className="text-sm text-zinc-500">Sheet: {profile.sheet_name}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProfile(profile.profile_id);
                        }}
                        className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors"
                        data-testid={`delete-profile-${profile.profile_id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800">
                      {getStatusIcon(profile.status)}
                      <span className="text-sm text-zinc-400 capitalize">{profile.status}</span>
                      {profile.last_run && (
                        <span className="text-xs text-zinc-600 ml-auto">
                          Last: {new Date(profile.last_run).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Instructions */}
            <div className="mt-8 p-6 rounded-xl bg-zinc-900 border border-zinc-800">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-400" />
                How to Use
              </h3>
              <ol className="space-y-2 text-sm text-zinc-400">
                <li>1. Add your AdsPower profile IDs (find them in AdsPower → Profile List)</li>
                <li>2. Assign each profile to a comment sheet (Bump Connect, Syndicate, or Kollabsy)</li>
                <li>3. Click "Download Script" to get the automation script</li>
                <li>4. Run the script on your local machine where AdsPower is installed</li>
                <li>5. The script will open each browser, configure Rebotou, and run automation</li>
              </ol>
            </div>
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div className="space-y-6">
            {/* Sheet Selector */}
            <div className="flex items-center gap-4">
              <label className="text-sm text-zinc-400">Select Sheet:</label>
              <div className="flex gap-2">
                {sheets.map(sheet => (
                  <button
                    key={sheet}
                    onClick={() => setSelectedSheet(sheet)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      selectedSheet === sheet
                        ? 'bg-violet-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                    data-testid={`sheet-btn-${sheet.replace(/\s+/g, '-')}`}
                  >
                    {sheet}
                  </button>
                ))}
              </div>
            </div>

            {/* Comments List */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="font-medium">{selectedSheet} Comments</h3>
                <span className="text-sm text-zinc-500">{comments.length} comments</span>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                {comments.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500">
                    No comments in this sheet
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-zinc-800/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">#</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Comment</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Brand</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {comments.map((comment, idx) => (
                        <tr key={idx} className="hover:bg-zinc-800/30" data-testid={`comment-row-${idx}`}>
                          <td className="px-4 py-3 text-sm text-zinc-500">{idx + 1}</td>
                          <td className="px-4 py-3 text-sm">{comment.text}</td>
                          <td className="px-4 py-3 text-sm text-zinc-400">{comment.brand}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Google Sheet Link */}
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
              <p className="text-sm text-zinc-400">
                Source: <a 
                  href={`https://docs.google.com/spreadsheets/d/${config.google_sheet_id}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:underline"
                  data-testid="google-sheet-link"
                >
                  Google Sheets
                </a>
              </p>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Run History</h2>
            
            {runs.length === 0 ? (
              <div className="text-center py-16 text-zinc-500" data-testid="no-runs">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No automation runs yet</p>
                <p className="text-sm mt-1">Run history will appear here</p>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-zinc-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Profile</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Started</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {runs.map((run) => (
                      <tr key={run.id} className="hover:bg-zinc-800/30" data-testid={`run-row-${run.id}`}>
                        <td className="px-4 py-3">
                          <span className="font-medium">{run.profile_name}</span>
                          <span className="text-sm text-zinc-500 ml-2">({run.profile_id})</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(run.status)}
                            <span className="capitalize">{run.status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-400">
                          {new Date(run.started_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-400">
                          {run.completed_at ? new Date(run.completed_at).toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-16 py-6">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-zinc-600">
          <p>AdsPower Rebotou Automation Dashboard</p>
          <p className="mt-1">Extension ID: {config.rebotou_extension_id} | API Port: {config.adspower_api_port}</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
