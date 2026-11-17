import React, { useState } from 'react';
import { BarChart3, Download, Save, Volume2, VolumeX } from 'lucide-react';
import { FullPlayerState } from '../types/system';
import { SystemFrame } from './SystemFrame';
import { SYSTEM_THEMES } from '../shared/systemData';
import { soundEngine } from '../lib/sound';
import { PWAInstallButton } from './PWAInstallButton';

interface HistoryViewProps {
  state: FullPlayerState;
}

export function HistoryView({ state }: HistoryViewProps) {
  const { status, questHistory } = state;

  const lifetimeMetrics = [
    { label: 'Total Push-Ups', value: status.totalPushups.toLocaleString() },
    { label: 'Total Sit-Ups', value: status.totalSitups.toLocaleString() },
    { label: 'Total Squats', value: status.totalSquats.toLocaleString() },
    { label: 'Total Lunges', value: status.totalLunges.toLocaleString() },
    { label: 'Total Pull-Ups', value: status.totalPullups.toLocaleString() },
    { label: 'Plank Duration', value: `${status.totalPlankSeconds} sec` },
    { label: 'Running Distance', value: `${status.totalRunningKm.toFixed(1)} km` },
    { label: 'Completed Quests', value: String(status.completedQuestsCount) },
    { label: 'Highest Level', value: `Lv.${status.highestLevel}` },
    { label: 'Highest Streak', value: `${status.highestStreak} days` },
  ];

  const chartBars = [...questHistory].slice(0, 10).reverse();

  return (
    <div className="space-y-6">
      <SystemFrame className="p-6">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-[#38BDF8]" />
          <div>
            <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">
              Quest History &amp; Lifetime Statistics
            </h1>
            <p className="text-xs text-[#94A3B8]">
              Cumulative workout output, quest completion records, and streak telemetry.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {lifetimeMetrics.map((m) => (
            <div key={m.label} className="border border-[#2879B7]/35 bg-[#050A13]/70 p-4">
              <p className="text-xs text-[#94A3B8]">{m.label}</p>
              <p className="mt-1.5 font-mono-tabular text-xl font-bold text-[#F8FAFC]">{m.value}</p>
            </div>
          ))}
        </div>
      </SystemFrame>

      {/* Completion Bar Chart */}
      <SystemFrame className="p-6">
        <h2 className="font-display text-lg font-bold text-[#F8FAFC]">
          Recent Quest Completion Trend
        </h2>
        {chartBars.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#94A3B8]">
            Complete or log your first Daily Quest cycle to visualize completion history.
          </p>
        ) : (
          <div className="mt-5 flex h-44 items-end gap-3 border-b border-[#2879B7]/30 pb-2">
            {chartBars.map((item) => {
              const barColor =
                item.finalStatus === 'completed'
                  ? 'bg-[#4ADE80]'
                  : item.finalStatus === 'failed'
                    ? 'bg-[#EF4444]'
                    : 'bg-[#38BDF8]';
              return (
                <div key={item.id} className="flex flex-1 flex-col items-center gap-2">
                  <span className="font-mono-tabular text-[11px] text-[#94A3B8]">
                    {item.completionPercentage}%
                  </span>
                  <div className="flex h-28 w-full max-w-[40px] items-end bg-[#050A13] border border-[#2879B7]/25">
                    <div
                      className={`w-full ${barColor}`}
                      style={{ height: `${Math.max(8, item.completionPercentage)}%` }}
                    />
                  </div>
                  <span className="font-mono-tabular text-[10px] text-[#94A3B8]">
                    {item.questDate.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </SystemFrame>

      {/* History Ledger */}
      <SystemFrame className="p-6">
        <h2 className="font-display text-lg font-bold text-[#F8FAFC]">Daily Quest Ledger</h2>
        {questHistory.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#94A3B8]">No quest records yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#2879B7]/40 text-[#94A3B8]">
                  <th className="py-2.5 pr-4 font-medium">Date</th>
                  <th className="py-2.5 pr-4 font-medium">Outcome</th>
                  <th className="py-2.5 pr-4 text-right font-medium">Completion</th>
                  <th className="py-2.5 pr-4 text-right font-medium">Bonus EXP</th>
                  <th className="py-2.5 pr-4 text-right font-medium">Gold</th>
                  <th className="py-2.5 text-right font-medium">Streak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2879B7]/20">
                {questHistory.map((row) => (
                  <tr key={row.id} className="hover:bg-[#38BDF8]/5">
                    <td className="py-3 pr-4 font-mono-tabular text-[#F8FAFC]">{row.questDate}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`font-semibold uppercase ${
                          row.finalStatus === 'completed'
                            ? 'text-[#4ADE80]'
                            : row.finalStatus === 'failed'
                              ? 'text-[#EF4444]'
                              : 'text-[#38BDF8]'
                        }`}
                      >
                        {row.finalStatus}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right font-mono-tabular text-[#CBD5E1]">
                      {row.completionPercentage}%
                    </td>
                    <td className="py-3 pr-4 text-right font-mono-tabular text-[#67E8F9]">
                      +{row.expEarned}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono-tabular text-[#FACC15]">
                      +{row.goldEarned}
                    </td>
                    <td className="py-3 text-right font-mono-tabular text-[#F8FAFC]">
                      {row.streakAtTime}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SystemFrame>
    </div>
  );
}

interface SettingsViewProps {
  state: FullPlayerState;
  busy: boolean;
  onSaveSettings: (payload: Record<string, unknown>) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export function SettingsView({ state, busy, onSaveSettings, onSignOut }: SettingsViewProps) {
  const { profile, fitnessProfile } = state;

  const [username, setUsername] = useState(profile.username);
  const [weightKg, setWeightKg] = useState(profile.weightKg ?? 70);
  const [fitnessGoal, setFitnessGoal] = useState(profile.fitnessGoal || 'Strength & Conditioning');
  const [timezone, setTimezone] = useState(profile.timezone || 'UTC');
  const [experienceLevel, setExperienceLevel] = useState(fitnessProfile.experienceLevel);
  const [limitations, setLimitations] = useState(fitnessProfile.limitations);
  const [activeTheme, setActiveTheme] = useState(profile.activeTheme);
  const [soundEnabled, setSoundEnabled] = useState(profile.soundEnabled);
  const [animationsEnabled, setAnimationsEnabled] = useState(profile.animationsEnabled);
  const [notificationsEnabled, setNotificationsEnabled] = useState(profile.notificationsEnabled);
  const [savedMsg, setSavedMsg] = useState(false);

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `the-system-player-${profile.username.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <SystemFrame className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#F8FAFC]">System Settings</h1>
            <p className="text-xs text-[#94A3B8]">
              Configure Player profile, audio/visual preferences, and timezone.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PWAInstallButton />
            <button
              type="button"
              onClick={handleExportJson}
              className="flex min-h-[42px] items-center gap-2 border border-[#2879B7]/60 bg-[#050A13] px-4 py-2 text-xs font-semibold text-[#67E8F9]"
            >
              <Download className="h-4 w-4" />
              <span>Export Backup</span>
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="min-h-[42px] border border-[#EF4444]/50 bg-[#EF4444]/10 px-4 py-2 text-xs font-semibold text-[#FCA5A5]"
            >
              Sign Out
            </button>
          </div>
        </div>
      </SystemFrame>

      <SystemFrame className="p-6">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            soundEngine.enabled = soundEnabled;
            await onSaveSettings({
              username,
              weightKg,
              fitnessGoal,
              timezone,
              experienceLevel,
              limitations,
              activeTheme,
              soundEnabled,
              animationsEnabled,
              notificationsEnabled,
            });
            setSavedMsg(true);
            window.setTimeout(() => setSavedMsg(false), 3000);
          }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs text-[#94A3B8]">Player Name</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1.5 w-full border border-[#2879B7]/50 bg-[#050A13] px-3 py-2.5 text-sm text-[#F8FAFC]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#94A3B8]">Body Weight (kg)</label>
              <input
                type="number"
                step="0.5"
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className="mt-1.5 w-full border border-[#2879B7]/50 bg-[#050A13] px-3 py-2.5 font-mono-tabular text-sm text-[#F8FAFC]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#94A3B8]">Timezone</label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1.5 w-full border border-[#2879B7]/50 bg-[#050A13] px-3 py-2.5 font-mono-tabular text-sm text-[#F8FAFC]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#94A3B8]">Fitness Goal</label>
              <input
                type="text"
                value={fitnessGoal}
                onChange={(e) => setFitnessGoal(e.target.value)}
                className="mt-1.5 w-full border border-[#2879B7]/50 bg-[#050A13] px-3 py-2.5 text-sm text-[#F8FAFC]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#94A3B8]">Experience Level</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="mt-1.5 w-full border border-[#2879B7]/50 bg-[#050A13] px-3 py-2.5 text-sm text-[#F8FAFC]"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="athlete">Athlete</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#94A3B8]">Joint / Movement Limitations</label>
              <input
                type="text"
                value={limitations}
                onChange={(e) => setLimitations(e.target.value)}
                placeholder="None"
                className="mt-1.5 w-full border border-[#2879B7]/50 bg-[#050A13] px-3 py-2.5 text-sm text-[#F8FAFC]"
              />
            </div>
          </div>

          <div className="border-t border-[#2879B7]/30 pt-5">
            <h2 className="text-sm font-semibold text-[#F8FAFC]">Interface Theme</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(SYSTEM_THEMES).map(([key, th]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTheme(key)}
                  className={`min-h-[44px] border p-3 text-left text-xs transition-colors ${
                    activeTheme === key
                      ? 'border-[#38BDF8] bg-[#38BDF8]/15 text-[#F8FAFC]'
                      : 'border-[#2879B7]/35 bg-[#050A13] text-[#94A3B8]'
                  }`}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 mr-2"
                    style={{ backgroundColor: th.primary }}
                  />
                  {th.name}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[#2879B7]/30 pt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setSoundEnabled((v) => !v)}
              className="flex min-h-[48px] items-center justify-between border border-[#2879B7]/40 bg-[#050A13]/70 px-4 py-2 text-xs"
            >
              <span className="flex items-center gap-2 text-[#F8FAFC]">
                {soundEnabled ? <Volume2 className="h-4 w-4 text-[#38BDF8]" /> : <VolumeX className="h-4 w-4 text-[#94A3B8]" />}
                <span>System Sound Effects</span>
              </span>
              <span className={soundEnabled ? 'text-[#4ADE80] font-semibold' : 'text-[#94A3B8]'}>
                {soundEnabled ? 'ON' : 'MUTED'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAnimationsEnabled((v) => !v)}
              className="flex min-h-[48px] items-center justify-between border border-[#2879B7]/40 bg-[#050A13]/70 px-4 py-2 text-xs"
            >
              <span className="text-[#F8FAFC]">Holographic Animations</span>
              <span className={animationsEnabled ? 'text-[#4ADE80] font-semibold' : 'text-[#94A3B8]'}>
                {animationsEnabled ? 'ON' : 'REDUCED'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setNotificationsEnabled((v) => !v)}
              className="flex min-h-[48px] items-center justify-between border border-[#2879B7]/40 bg-[#050A13]/70 px-4 py-2 text-xs"
            >
              <span className="text-[#F8FAFC]">System Pop-Up Alerts</span>
              <span className={notificationsEnabled ? 'text-[#4ADE80] font-semibold' : 'text-[#94A3B8]'}>
                {notificationsEnabled ? 'ON' : 'QUIET'}
              </span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <span className="text-xs text-[#4ADE80]">
              {savedMsg ? 'Settings synchronized to System database.' : ''}
            </span>
            <button
              type="submit"
              disabled={busy}
              className="flex min-h-[46px] items-center gap-2 border border-[#38BDF8] bg-[#38BDF8]/20 px-6 py-2.5 text-xs font-bold tracking-wider text-[#F8FAFC]"
            >
              <Save className="h-4 w-4" />
              <span>SAVE SETTINGS</span>
            </button>
          </div>
        </form>
      </SystemFrame>
    </div>
  );
}
