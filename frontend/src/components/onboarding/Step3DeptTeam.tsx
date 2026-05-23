import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { fetchDepartments, fetchTeams } from '../../services/onboardingService';

interface Props {
  deptId: string | null;
  teamId: string | null;
  onConfirm: (deptId: string, teamId: string) => void;
  onNext: () => void;
  onBack: () => void;
}
interface Dept { id: string; name: string; bu: { name: string } }
interface Team { id: string; name: string }

export default function Step3DeptTeam({ deptId, teamId, onConfirm, onNext, onBack }: Props) {
  const [depts, setDepts]               = useState<Dept[]>([]);
  const [teams, setTeams]               = useState<Team[]>([]);
  const [selectedDept, setSelectedDept] = useState(deptId || '');
  const [selectedTeam, setSelectedTeam] = useState(teamId || '');
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    fetchDepartments().then(setDepts).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedDept) { setTeams([]); return; }
    fetchTeams(selectedDept).then(setTeams);
    setSelectedTeam('');
  }, [selectedDept]);

  function handleNext() {
    onConfirm(selectedDept, selectedTeam);
    onNext();
  }

  const selectStyle = {
    background: 'var(--m3-surf2)',
    color: 'var(--m3-on-surf)',
    border: '1px solid var(--m3-outline-v)',
    borderRadius: 12,
    padding: '10px 16px',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
      className="flex flex-col gap-5"
    >
      <div>
        <h2 className="text-headline-s font-semibold" style={{ color: 'var(--m3-on-surf)' }}>
          Confirm your team
        </h2>
        <p className="text-body-m mt-1" style={{ color: 'var(--m3-on-surf-var)' }}>
          Verify your department and team assignment.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-11 w-full rounded-xl" />
          <div className="skeleton h-11 w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-label-m mb-2" style={{ color: 'var(--m3-on-surf-var)' }}>
              Department
            </label>
            <select
              style={selectStyle}
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              onFocus={(e) => {
                (e.target as HTMLElement).style.borderColor = 'var(--m3-primary)';
                (e.target as HTMLElement).style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--m3-primary) 12%, transparent)';
              }}
              onBlur={(e) => {
                (e.target as HTMLElement).style.borderColor = 'var(--m3-outline-v)';
                (e.target as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <option value="">Select department…</option>
              {depts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.bu.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-label-m mb-2" style={{ color: 'var(--m3-on-surf-var)' }}>
              Team
            </label>
            <select
              style={{
                ...selectStyle,
                opacity: (!selectedDept || teams.length === 0) ? 0.5 : 1,
                cursor: (!selectedDept || teams.length === 0) ? 'not-allowed' : 'default',
              }}
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              disabled={!selectedDept || teams.length === 0}
              onFocus={(e) => {
                (e.target as HTMLElement).style.borderColor = 'var(--m3-primary)';
                (e.target as HTMLElement).style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--m3-primary) 12%, transparent)';
              }}
              onBlur={(e) => {
                (e.target as HTMLElement).style.borderColor = 'var(--m3-outline-v)';
                (e.target as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <option value="">Select team…</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {selectedDept && teams.length === 0 && (
              <p className="text-xs mt-1" style={{ color: 'var(--m3-on-surf-var)' }}>
                No teams in this department yet.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <motion.button
          onClick={onBack}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="btn-outlined flex items-center gap-1.5"
        >
          <ArrowLeft size={15} /> Back
        </motion.button>
        <motion.button
          onClick={handleNext}
          disabled={!selectedDept}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.97 }}
          className="btn-filled flex-1 flex items-center justify-center gap-2"
        >
          Continue <ArrowRight size={16} />
        </motion.button>
      </div>
    </motion.div>
  );
}
