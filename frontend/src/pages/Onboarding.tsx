import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useOnboardingStore } from '../store/onboardingStore';
import { completeOnboarding } from '../services/onboardingService';
import { ROLE_CONFIG, JobRoleKey } from '../utils/roleConfig';
import Step1Welcome      from '../components/onboarding/Step1Welcome';
import Step2JobRole      from '../components/onboarding/Step2JobRole';
import Step3DeptTeam     from '../components/onboarding/Step3DeptTeam';
import Step4BoardPreview from '../components/onboarding/Step4BoardPreview';
import Step5Tour         from '../components/onboarding/Step5Tour';

const TOTAL = 5;
const STEP_LABELS = ['Welcome', 'Role', 'Team', 'Board', 'Tour'];

export default function Onboarding() {
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const {
    step, next, back,
    jobRole, setJobRole,
    deptId, teamId, setDeptTeam,
    sections, setSections,
  } = useOnboardingStore();
  const [saving, setSaving] = useState(false);

  async function finish() {
    if (!jobRole) return;
    setSaving(true);
    try {
      const updated = await completeOnboarding({ jobRole, teamId, deptId, sections });
      useAuthStore.setState((s) => ({
        user: s.user ? { ...s.user, onboarded: true, jobRole: updated.jobRole } : s.user,
      }));
      toast.success('Workspace ready!');
      navigate('/daily', { replace: true });
    } catch {
      toast.error('Could not save settings. Please try again.');
      setSaving(false);
    }
  }

  const progress = ((step - 1) / (TOTAL - 1)) * 100;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 theme-transition"
      style={{ background: 'var(--m3-bg)' }}
    >
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--m3-primary) 6%, transparent) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-[400px] h-[300px] rounded-full"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--m3-secondary) 5%, transparent) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      <div className="w-full max-w-md">
        {/* ── Progress stepper ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3 px-1">
            {STEP_LABELS.map((label, i) => {
              const num    = i + 1;
              const done   = num < step;
              const active = num === step;
              return (
                <div key={label} className="flex flex-col items-center gap-1.5">
                  <motion.div
                    animate={{
                      scale: active ? 1.12 : 1,
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                               transition-colors duration-300"
                    style={{
                      background: done
                        ? 'var(--m3-primary)'
                        : active
                          ? 'var(--m3-prim-c)'
                          : 'var(--m3-surf3)',
                      color: done
                        ? 'var(--m3-on-primary)'
                        : active
                          ? 'var(--m3-on-prim-c)'
                          : 'var(--m3-on-surf-var)',
                    }}
                  >
                    {done ? '✓' : num}
                  </motion.div>
                  <span
                    className="text-[10px] font-medium hidden sm:block"
                    style={{ color: active ? 'var(--m3-on-surf)' : 'var(--m3-on-surf-var)' }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Progress track */}
          <div
            className="relative h-1.5 rounded-full overflow-hidden mx-1"
            style={{ background: 'var(--m3-surf3)' }}
          >
            <motion.div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ background: 'var(--m3-primary)' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
            />
          </div>
        </div>

        {/* ── Card ── */}
        <div
          className="rounded-3xl overflow-hidden shadow-e2"
          style={{
            background: 'var(--m3-surf0)',
            border: '1px solid var(--m3-outline-v)',
            padding: '28px',
          }}
        >
          <AnimatePresence mode="wait">
            {step === 1 && (
              <Step1Welcome  key="s1" userName={user?.name || 'there'} onNext={next} />
            )}
            {step === 2 && (
              <Step2JobRole
                key="s2"
                selected={jobRole}
                onSelect={(role: JobRoleKey) => setJobRole(role, ROLE_CONFIG[role].sections)}
                onNext={next}
                onBack={back}
              />
            )}
            {step === 3 && (
              <Step3DeptTeam
                key="s3"
                deptId={deptId || user?.dept?.id || null}
                teamId={teamId || user?.team?.id || null}
                onConfirm={setDeptTeam}
                onNext={next}
                onBack={back}
              />
            )}
            {step === 4 && (
              <Step4BoardPreview
                key="s4"
                sections={sections}
                jobRoleLabel={jobRole ? ROLE_CONFIG[jobRole].label : ''}
                onChange={setSections}
                onNext={next}
                onBack={back}
              />
            )}
            {step === 5 && (
              <Step5Tour key="s5" onFinish={finish} onBack={back} saving={saving} />
            )}
          </AnimatePresence>
        </div>

        <p
          className="text-center text-[11px] mt-4"
          style={{ color: 'var(--m3-on-surf-var)', opacity: 0.5 }}
        >
          Step {step} of {TOTAL} · theory
        </p>
      </div>
    </div>
  );
}
