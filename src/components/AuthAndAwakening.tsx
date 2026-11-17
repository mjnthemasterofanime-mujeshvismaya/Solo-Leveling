import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Check, ChevronRight, ShieldAlert, Sparkles } from 'lucide-react';
import { SystemFrame } from './SystemFrame';
import { soundEngine } from '../lib/sound';

interface AuthGateProps {
  onSignIn: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function AuthGate({ onSignIn, loading, error }: AuthGateProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050A13] p-4">
      <img
        src="/src/assets/images/dungeon_gate_bg_1794898192546.jpg"
        alt="Blue mana dungeon gate"
        referrerPolicy="no-referrer"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#050A13]/85 via-[#050A13]/65 to-[#050A13]" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 w-full max-w-lg"
      >
        <SystemFrame scanBeam className="p-6 md:p-10">
          <div className="text-center">
            <p className="font-mono-tabular text-xs tracking-[0.28em] text-[#67E8F9] uppercase">
              Player Authentication Required
            </p>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-wider text-[#F8FAFC] md:text-4xl">
              THE SYSTEM
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#94A3B8] text-balance">
              Step into the awakened training interface. Receive daily quests, track real-world conditioning, earn rewards, and evolve your Player status across sessions.
            </p>
          </div>

          {error && (
            <div className="mt-6 border border-[#EF4444]/60 bg-[#EF4444]/10 p-3 text-sm text-[#FCA5A5]">
              {error}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                soundEngine.playNotification();
                onSignIn();
              }}
              className="flex min-h-[48px] w-full items-center justify-center gap-3 border border-[#38BDF8]/70 bg-[#38BDF8]/15 px-6 py-3 text-sm font-semibold tracking-wider text-[#F8FAFC] hover:bg-[#38BDF8]/25 disabled:opacity-50 transition-colors"
            >
              <span>{loading ? 'CONNECTING TO SYSTEM...' : 'SIGN IN WITH GOOGLE TO ENTER'}</span>
              <ChevronRight className="h-4 w-4 text-[#67E8F9]" />
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-[#94A3B8]">
            Your quests, attributes, inventory, and lifetime workout records persist securely to PostgreSQL.
          </p>
        </SystemFrame>
      </motion.div>
    </div>
  );
}

interface AwakeningFlowProps {
  defaultName: string;
  onComplete: (payload: {
    username: string;
    age: number;
    heightCm: number;
    weightKg: number;
    fitnessGoal: string;
    timezone: string;
    experienceLevel: string;
    equipment: string[];
    exerciseCapabilities: Record<string, number>;
    limitations: string;
  }) => Promise<void>;
  submitting: boolean;
  error: string | null;
}

export function AwakeningFlow({ defaultName, onComplete, submitting, error }: AwakeningFlowProps) {
  const [step, setStep] = useState<'boot' | 'qualification' | 'declined' | 'accepted' | 'intake'>('boot');
  const [bootLine, setBootLine] = useState(0);

  // Player intake form state
  const [username, setUsername] = useState(defaultName || 'Sung Jin-Woo');
  const [age, setAge] = useState(24);
  const [heightCm, setHeightCm] = useState(176);
  const [weightKg, setWeightKg] = useState(72);
  const [fitnessGoal, setFitnessGoal] = useState('Strength & Conditioning');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'athlete'>('beginner');
  const [equipment, setEquipment] = useState<string[]>(['Bodyweight Only']);
  const [limitations, setLimitations] = useState('');

  // Safe initial fitness assessment (sub-maximal comfort estimates)
  const [pushupCap, setPushupCap] = useState(15);
  const [squatCap, setSquatCap] = useState(25);
  const [situpCap, setSitupCap] = useState(20);
  const [plankCap, setPlankCap] = useState(45);

  useEffect(() => {
    if (step !== 'boot') return;
    const t1 = window.setTimeout(() => setBootLine(1), 650);
    const t2 = window.setTimeout(() => setBootLine(2), 1400);
    const t3 = window.setTimeout(() => {
      soundEngine.playNotification();
      setStep('qualification');
    }, 2350);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [step]);

  useEffect(() => {
    if (step !== 'accepted') return;
    const t = window.setTimeout(() => setStep('intake'), 1800);
    return () => window.clearTimeout(t);
  }, [step]);

  const toggleEquipment = (item: string) => {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#050A13] p-4 py-10 system-grid-bg">
      <div className="w-full max-w-2xl">
        {step === 'boot' && (
          <SystemFrame scanBeam className="p-8 md:p-12">
            <div className="space-y-4 font-mono-tabular text-sm md:text-base">
              <p className="text-[#67E8F9]">[SYSTEM INITIALIZING...]</p>
              {bootLine >= 1 && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[#38BDF8]">
                  [PLAYER DETECTION IN PROGRESS...]
                </motion.p>
              )}
              {bootLine >= 2 && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[#F8FAFC] font-semibold">
                  [PLAYER CANDIDATE IDENTIFIED.]
                </motion.p>
              )}
            </div>
          </SystemFrame>
        )}

        {step === 'qualification' && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
            <SystemFrame scanBeam className="p-8 md:p-10 text-center">
              <p className="font-mono-tabular text-xs tracking-[0.25em] text-[#67E8F9] uppercase">
                Notification
              </p>
              <h1 className="mt-3 font-display text-2xl font-bold tracking-wider text-[#F8FAFC] md:text-3xl">
                PLAYER QUALIFICATION
              </h1>
              <p className="mt-5 text-base leading-relaxed text-[#CBD5E1]">
                You have been selected as a potential <span className="text-[#67E8F9] font-semibold">Player</span>.
              </p>
              <p className="mt-2 text-base text-[#F8FAFC]">
                Would you like to accept the Player qualification?
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playQuestComplete();
                    setStep('accepted');
                  }}
                  className="min-h-[48px] w-full sm:w-44 border border-[#38BDF8] bg-[#38BDF8]/20 px-6 py-3 text-sm font-bold tracking-widest text-[#F8FAFC] hover:bg-[#38BDF8]/30 transition-colors"
                >
                  ACCEPT
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playWarning();
                    setStep('declined');
                  }}
                  className="min-h-[48px] w-full sm:w-44 border border-[#EF4444]/60 bg-[#EF4444]/10 px-6 py-3 text-sm font-bold tracking-widest text-[#FCA5A5] hover:bg-[#EF4444]/20 transition-colors"
                >
                  DECLINE
                </button>
              </div>
            </SystemFrame>
          </motion.div>
        )}

        {step === 'declined' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <SystemFrame variant="danger" scanBeam className="p-8 md:p-10 text-center">
              <ShieldAlert className="mx-auto h-10 w-10 text-[#EF4444]" />
              <h2 className="mt-4 font-display text-2xl font-bold tracking-wider text-[#EF4444]">
                [QUALIFICATION SUSPENDED]
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#FCA5A5]">
                Warning: Refusing System registration forfeits Daily Quest initialization. The System window remains open if you choose to awaken.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playNotification();
                    setStep('qualification');
                  }}
                  className="min-h-[44px] border border-[#38BDF8]/70 bg-[#38BDF8]/15 px-8 py-2.5 text-sm font-semibold tracking-wider text-[#F8FAFC] hover:bg-[#38BDF8]/25 transition-colors"
                >
                  REOPEN QUALIFICATION
                </button>
              </div>
            </SystemFrame>
          </motion.div>
        )}

        {step === 'accepted' && (
          <SystemFrame variant="gold" scanBeam className="p-8 md:p-12">
            <div className="space-y-4 font-mono-tabular text-sm md:text-base">
              <p className="text-[#4ADE80]">[PLAYER REGISTRATION COMPLETE.]</p>
              <p className="text-[#67E8F9]">[INITIALIZING PLAYER STATUS...]</p>
              <p className="text-[#FACC15] font-semibold">[STATUS WINDOW UNLOCKED.]</p>
            </div>
          </SystemFrame>
        )}

        {step === 'intake' && (
          <SystemFrame scanBeam className="p-6 md:p-8">
            <div className="border-b border-[#2879B7]/40 pb-4">
              <p className="font-mono-tabular text-xs tracking-widest text-[#67E8F9] uppercase">
                Player Calibration &amp; Safe Fitness Assessment
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold text-[#F8FAFC]">
                Initialize Your Player Profile
              </h2>
              <p className="mt-1 text-sm text-[#94A3B8]">
                Provide comfortable baseline estimates (never maximum-effort strain) so the System can calibrate safe starting Daily Quest targets.
              </p>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 border border-[#EF4444]/60 bg-[#EF4444]/10 p-3 text-sm text-[#FCA5A5]">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                soundEngine.playLevelUp();
                onComplete({
                  username,
                  age,
                  heightCm,
                  weightKg,
                  fitnessGoal,
                  timezone,
                  experienceLevel,
                  equipment,
                  exerciseCapabilities: {
                    pushups: pushupCap,
                    squats: squatCap,
                    situps: situpCap,
                    plank: plankCap,
                  },
                  limitations,
                });
              }}
              className="mt-6 space-y-6"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8]">Player Name</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1.5 w-full border border-[#2879B7]/50 bg-[#050A13]/80 px-3 py-2.5 text-sm text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8]">Primary Goal</label>
                  <select
                    value={fitnessGoal}
                    onChange={(e) => setFitnessGoal(e.target.value)}
                    className="mt-1.5 w-full border border-[#2879B7]/50 bg-[#050A13]/80 px-3 py-2.5 text-sm text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                  >
                    <option value="Strength & Conditioning">Strength &amp; Conditioning</option>
                    <option value="Fat Loss & Endurance">Fat Loss &amp; Endurance</option>
                    <option value="Muscle & Consistency">Muscle &amp; Consistency</option>
                    <option value="Athletic Longevity">Athletic Longevity</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8]">Age</label>
                  <input
                    type="number"
                    min={13}
                    max={95}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="mt-1.5 w-full border border-[#2879B7]/50 bg-[#050A13]/80 px-3 py-2.5 font-mono-tabular text-sm text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#94A3B8]">Height (cm)</label>
                    <input
                      type="number"
                      min={110}
                      max={240}
                      value={heightCm}
                      onChange={(e) => setHeightCm(Number(e.target.value))}
                      className="mt-1.5 w-full border border-[#2879B7]/50 bg-[#050A13]/80 px-3 py-2.5 font-mono-tabular text-sm text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#94A3B8]">Weight (kg)</label>
                    <input
                      type="number"
                      min={35}
                      max={250}
                      step="0.5"
                      value={weightKg}
                      onChange={(e) => setWeightKg(Number(e.target.value))}
                      className="mt-1.5 w-full border border-[#2879B7]/50 bg-[#050A13]/80 px-3 py-2.5 font-mono-tabular text-sm text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#94A3B8]">Training Experience</label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(['beginner', 'intermediate', 'advanced', 'athlete'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setExperienceLevel(lvl)}
                      className={`min-h-[44px] border px-3 py-2 text-xs font-semibold capitalize transition-colors ${
                        experienceLevel === lvl
                          ? 'border-[#38BDF8] bg-[#38BDF8]/20 text-[#F8FAFC]'
                          : 'border-[#2879B7]/40 bg-[#050A13]/60 text-[#94A3B8] hover:text-[#F8FAFC]'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#94A3B8]">Available Equipment</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['Bodyweight Only', 'Pull-Up Bar', 'Gym Access', 'Resistance Bands', 'Exercise Mat'].map((eq) => {
                    const active = equipment.includes(eq);
                    return (
                      <button
                        key={eq}
                        type="button"
                        onClick={() => toggleEquipment(eq)}
                        className={`flex min-h-[40px] items-center gap-1.5 border px-3 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? 'border-[#38BDF8] bg-[#38BDF8]/15 text-[#67E8F9]'
                            : 'border-[#2879B7]/35 bg-[#050A13]/60 text-[#94A3B8]'
                        }`}
                      >
                        {active && <Check className="h-3.5 w-3.5" />}
                        <span>{eq}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Safe Baseline Capability Assessment */}
              <div className="border-t border-[#2879B7]/30 pt-5">
                <p className="text-xs font-semibold tracking-wider text-[#67E8F9] uppercase">
                  Comfortable Daily Baseline (Sub-Maximal Assessment)
                </p>
                <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <label className="block text-xs text-[#94A3B8]">Push-Ups / day</label>
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={pushupCap}
                      onChange={(e) => setPushupCap(Number(e.target.value))}
                      className="mt-1 w-full border border-[#2879B7]/40 bg-[#050A13] px-2.5 py-2 font-mono-tabular text-sm text-[#F8FAFC]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#94A3B8]">Squats / day</label>
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={squatCap}
                      onChange={(e) => setSquatCap(Number(e.target.value))}
                      className="mt-1 w-full border border-[#2879B7]/40 bg-[#050A13] px-2.5 py-2 font-mono-tabular text-sm text-[#F8FAFC]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#94A3B8]">Sit-Ups / day</label>
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={situpCap}
                      onChange={(e) => setSitupCap(Number(e.target.value))}
                      className="mt-1 w-full border border-[#2879B7]/40 bg-[#050A13] px-2.5 py-2 font-mono-tabular text-sm text-[#F8FAFC]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#94A3B8]">Plank Total (sec)</label>
                    <input
                      type="number"
                      min={15}
                      max={180}
                      step="15"
                      value={plankCap}
                      onChange={(e) => setPlankCap(Number(e.target.value))}
                      className="mt-1 w-full border border-[#2879B7]/40 bg-[#050A13] px-2.5 py-2 font-mono-tabular text-sm text-[#F8FAFC]"
                    />
                  </div>
                </div>
                <p className="mt-3 text-xs text-[#94A3B8]">
                  Daily Quest Targets: Push-Ups <span className="font-mono-tabular text-[#67E8F9]">100</span> · Sit-Ups <span className="font-mono-tabular text-[#67E8F9]">100</span> · Squats <span className="font-mono-tabular text-[#67E8F9]">100</span> · Lunges <span className="font-mono-tabular text-[#67E8F9]">50</span> · Pull-Ups <span className="font-mono-tabular text-[#67E8F9]">25</span> · Plank <span className="font-mono-tabular text-[#67E8F9]">3×45s</span> · Superman <span className="font-mono-tabular text-[#67E8F9]">3×30s</span>
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8]">
                    Limitations / Joint Sensitivities (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., knee sensitivity, lower back"
                    value={limitations}
                    onChange={(e) => setLimitations(e.target.value)}
                    className="mt-1.5 w-full border border-[#2879B7]/50 bg-[#050A13]/80 px-3 py-2.5 text-sm text-[#F8FAFC] placeholder:text-[#64748B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8]">Quest Reset Timezone</label>
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="mt-1.5 w-full border border-[#2879B7]/50 bg-[#050A13]/80 px-3 py-2.5 font-mono-tabular text-sm text-[#F8FAFC]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex min-h-[48px] items-center justify-center gap-2 border border-[#38BDF8] bg-[#38BDF8]/20 px-8 py-3 text-sm font-bold tracking-wider text-[#F8FAFC] hover:bg-[#38BDF8]/30 disabled:opacity-50 transition-colors"
                >
                  <Sparkles className="h-4 w-4 text-[#67E8F9]" />
                  <span>{submitting ? 'INITIALIZING QUEST...' : 'UNLOCK SYSTEM & DAILY QUEST'}</span>
                </button>
              </div>
            </form>
          </SystemFrame>
        )}
      </div>
    </div>
  );
}
