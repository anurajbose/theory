import { useState } from 'react';
import { motion, Reorder } from 'framer-motion';
import { ArrowRight, ArrowLeft, GripVertical, X, Plus } from 'lucide-react';

interface Props {
  sections: string[];
  jobRoleLabel: string;
  onChange: (sections: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step4BoardPreview({
  sections, jobRoleLabel, onChange, onNext, onBack,
}: Props) {
  const [items, setItems]       = useState<string[]>(sections);
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding]     = useState(false);

  function remove(item: string) {
    const next = items.filter((i) => i !== item);
    setItems(next);
    onChange(next);
  }

  function add() {
    const trimmed = newLabel.trim();
    if (!trimmed || items.includes(trimmed)) return;
    const next = [...items, trimmed];
    setItems(next);
    onChange(next);
    setNewLabel('');
    setAdding(false);
  }

  function handleReorder(next: string[]) {
    setItems(next);
    onChange(next);
  }

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
          Your work board
        </h2>
        <p className="text-body-m mt-1" style={{ color: 'var(--m3-on-surf-var)' }}>
          Pre-configured for{' '}
          <span style={{ color: 'var(--m3-primary)', fontWeight: 500 }}>{jobRoleLabel}</span>.
          {' '}Drag to reorder.
        </p>
      </div>

      <div className="max-h-[280px] overflow-y-auto pr-1">
        <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="space-y-1.5">
          {items.map((item) => (
            <Reorder.Item
              key={item}
              value={item}
              className="flex items-center gap-2 p-3 rounded-xl cursor-grab active:cursor-grabbing select-none group"
              style={{
                background: 'var(--m3-surf1)',
                border: '1px solid var(--m3-outline-v)',
              }}
              whileDrag={{
                scale: 1.02,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              }}
            >
              <GripVertical size={14} style={{ color: 'var(--m3-outline)', flexShrink: 0 }} />
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: 'var(--m3-primary)' }}
              />
              <span className="text-sm font-medium flex-1" style={{ color: 'var(--m3-on-surf)' }}>
                {item}
              </span>
              <motion.button
                onClick={() => remove(item)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-md"
                style={{ color: 'var(--m3-on-surf-var)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--m3-error)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = 'var(--m3-on-surf-var)';
                }}
              >
                <X size={13} />
              </motion.button>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>

      {/* Add custom section */}
      {adding ? (
        <div className="flex gap-2">
          <input
            autoFocus
            className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
            placeholder="Section name…"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setAdding(false); }}
            style={{
              background: 'var(--m3-surf2)',
              color: 'var(--m3-on-surf)',
              border: '1px solid var(--m3-primary)',
              boxShadow: '0 0 0 3px color-mix(in srgb, var(--m3-primary) 12%, transparent)',
            }}
          />
          <motion.button
            onClick={add}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-filled px-4 py-2 text-sm"
          >
            Add
          </motion.button>
          <motion.button
            onClick={() => setAdding(false)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-outlined px-4 py-2 text-sm"
          >
            Cancel
          </motion.button>
        </div>
      ) : (
        <motion.button
          onClick={() => setAdding(true)}
          whileHover={{ x: 2 }}
          className="flex items-center gap-1.5 text-sm font-medium transition-colors w-fit"
          style={{ color: 'var(--m3-primary)' }}
        >
          <Plus size={15} /> Add custom section
        </motion.button>
      )}

      {items.length === 0 && (
        <div
          className="rounded-xl px-4 py-3 text-xs font-medium"
          style={{
            background: 'color-mix(in srgb, var(--m3-error) 8%, var(--m3-surf0))',
            color: 'var(--m3-error)',
            border: '1px solid color-mix(in srgb, var(--m3-error) 20%, transparent)',
          }}
        >
          Add at least one section to continue.
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
          onClick={onNext}
          disabled={items.length === 0}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.97 }}
          className="btn-filled flex-1 flex items-center justify-center gap-2"
        >
          Looks good <ArrowRight size={16} />
        </motion.button>
      </div>
    </motion.div>
  );
}
