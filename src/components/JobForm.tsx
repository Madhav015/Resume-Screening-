'use client';

import { useMemo, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { ScoringWeights, WeightedSkill } from '@/lib/types';
import { createJob, type JobFormState } from '@/app/dashboard/jobs/new/actions';
import { popIn, staggerContainer, staggerItem } from '@/lib/motion';
import { IconAlertTriangle, IconArrowRight, IconCheck, IconLoader, IconPlus, IconX } from '@/components/ui/icons';

const DEFAULT_WEIGHTS: ScoringWeights = { must_have: 50, nice_to_have: 25, experience: 15, deal_breakers: 10 };

// Weight 1-5 → chip intensity, so heavier-weighted skills visibly stand out
// in the tag cloud without needing a separate legend.
const SKILL_CHIP_STYLES: Record<number, string> = {
  1: 'bg-slate-100 text-slate-600 border-slate-200',
  2: 'bg-slate-100 text-slate-700 border-slate-200',
  3: 'bg-brand-50 text-brand-700 border-brand-100',
  4: 'bg-brand-100 text-brand-800 border-brand-200',
  5: 'bg-brand-600 text-white border-brand-600',
};

function SectionHeading({ step, label, hint }: { step: number; label: string; hint: string }) {
  return (
    <div className="mb-3 flex items-start gap-2.5">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
        {step}
      </span>
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
    </div>
  );
}

function SkillEditor({
  step,
  label,
  hint,
  skills,
  onChange,
}: {
  step: number;
  label: string;
  hint: string;
  skills: WeightedSkill[];
  onChange: (skills: WeightedSkill[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const [weight, setWeight] = useState(3);

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    if (skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) return;
    onChange([...skills, { name, weight }]);
    setDraft('');
    setWeight(3);
  };

  return (
    <div>
      <SectionHeading step={step} label={label} hint={hint} />
      <div className="mb-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="e.g. React"
          className="field flex-1"
        />
        <select
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
          title="Importance (1-5)"
          className="field w-auto"
        >
          {[1, 2, 3, 4, 5].map((w) => (
            <option key={w} value={w}>
              Weight {w}
            </option>
          ))}
        </select>
        <motion.button
          type="button"
          onClick={add}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn-secondary shrink-0"
        >
          <IconPlus className="h-4 w-4" /> Add
        </motion.button>
      </div>
      <motion.div layout className="flex flex-wrap gap-1.5">
        <AnimatePresence>
          {skills.map((s) => (
            <motion.span
              key={s.name}
              layout
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={popIn}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${SKILL_CHIP_STYLES[s.weight]}`}
            >
              {s.name}
              <span className="opacity-70">·w{s.weight}</span>
              <button
                type="button"
                onClick={() => onChange(skills.filter((x) => x.name !== s.name))}
                className="opacity-70 hover:opacity-100"
              >
                <IconX className="h-3 w-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function TagListEditor({
  step,
  label,
  hint,
  items,
  onChange,
}: {
  step: number;
  label: string;
  hint: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setDraft('');
  };
  return (
    <div>
      <SectionHeading step={step} label={label} hint={hint} />
      <div className="mb-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="e.g. No visa sponsorship needed"
          className="field flex-1"
        />
        <motion.button
          type="button"
          onClick={add}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn-secondary shrink-0"
        >
          <IconPlus className="h-4 w-4" /> Add
        </motion.button>
      </div>
      <motion.div layout className="flex flex-wrap gap-1.5">
        <AnimatePresence>
          {items.map((v) => (
            <motion.span
              key={v}
              layout
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={popIn}
              className="flex items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-medium text-red-700"
            >
              <IconAlertTriangle className="h-3 w-3" />
              {v}
              <button type="button" onClick={() => onChange(items.filter((x) => x !== v))} className="opacity-70 hover:opacity-100">
                <IconX className="h-3 w-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <motion.button
      type="submit"
      disabled={pending}
      whileHover={pending ? undefined : { scale: 1.04 }}
      whileTap={pending ? undefined : { scale: 0.96 }}
      className="btn-primary"
    >
      {pending ? (
        <>
          <IconLoader className="h-4 w-4" /> Creating…
        </>
      ) : (
        <>
          Create job <IconArrowRight className="h-4 w-4" />
        </>
      )}
    </motion.button>
  );
}

const WEIGHT_KEYS: [keyof ScoringWeights, string, string][] = [
  ['must_have', 'Must-haves', 'bg-brand-600'],
  ['nice_to_have', 'Nice-to-haves', 'bg-brand-400'],
  ['experience', 'Experience', 'bg-amber-400'],
  ['deal_breakers', 'Deal-breakers', 'bg-red-400'],
];

export default function JobForm() {
  const [state, formAction] = useFormState<JobFormState, FormData>(createJob, { error: null });

  const [mustHave, setMustHave] = useState<WeightedSkill[]>([]);
  const [niceToHave, setNiceToHave] = useState<WeightedSkill[]>([]);
  const [dealBreakers, setDealBreakers] = useState<string[]>([]);
  const [weights, setWeights] = useState<ScoringWeights>(DEFAULT_WEIGHTS);

  const weightSum = useMemo(() => Object.values(weights).reduce((a, b) => a + b, 0), [weights]);
  const isBalanced = weightSum === 100;

  const setWeight = (key: keyof ScoringWeights, value: number) =>
    setWeights((w) => ({ ...w, [key]: Math.max(0, Math.min(100, value)) }));

  return (
    <motion.form
      action={formAction}
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-7"
    >
      <input type="hidden" name="must_have_skills" value={JSON.stringify(mustHave)} />
      <input type="hidden" name="nice_to_have_skills" value={JSON.stringify(niceToHave)} />
      <input type="hidden" name="deal_breakers" value={JSON.stringify(dealBreakers)} />
      <input type="hidden" name="weights" value={JSON.stringify(weights)} />

      <motion.div variants={staggerItem}>
        <label className="mb-1 block text-sm font-medium text-slate-700">Job title</label>
        <input name="title" required placeholder="Senior Backend Engineer" className="field" />
      </motion.div>

      <motion.div variants={staggerItem}>
        <label className="mb-1 block text-sm font-medium text-slate-700">Description / context (optional)</label>
        <textarea
          name="description"
          rows={4}
          placeholder="Paste the job description, or add any context you want the screener to consider."
          className="field"
        />
      </motion.div>

      <hr className="border-slate-100" />

      <motion.div variants={staggerItem}>
        <SkillEditor
          step={1}
          label="Must-have skills"
          hint="Non-negotiable skills or qualifications. Weight = how heavily each one matters relative to the others."
          skills={mustHave}
          onChange={setMustHave}
        />
      </motion.div>

      <motion.div variants={staggerItem}>
        <SkillEditor
          step={2}
          label="Nice-to-have skills"
          hint="Skills that boost a candidate's score but aren't required."
          skills={niceToHave}
          onChange={setNiceToHave}
        />
      </motion.div>

      <motion.div variants={staggerItem}>
        <TagListEditor
          step={3}
          label="Deal-breakers"
          hint="Anything that should tank a candidate's score if it's true of them (e.g. 'Requires visa sponsorship', 'No on-call availability')."
          items={dealBreakers}
          onChange={setDealBreakers}
        />
      </motion.div>

      <hr className="border-slate-100" />

      <motion.div variants={staggerItem}>
        <SectionHeading step={4} label="Scoring weights" hint="How much each category counts toward the overall score. Must add up to 100." />
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {WEIGHT_KEYS.map(([key, label]) => (
            <div key={key}>
              <label className="mb-1 block text-xs text-slate-500">{label}</label>
              <input
                type="number"
                min={0}
                max={100}
                value={weights[key]}
                onChange={(e) => setWeight(key, Number(e.target.value))}
                className="field"
              />
            </div>
          ))}
        </div>

        <div className="mb-2 flex h-2 overflow-hidden rounded-full bg-slate-100">
          {WEIGHT_KEYS.map(([key, label, color]) => (
            <motion.div
              key={key}
              title={`${label}: ${weights[key]}`}
              className={color}
              animate={{ width: `${Math.min(100, weights[key])}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 26 }}
            />
          ))}
        </div>

        <motion.p
          animate={isBalanced ? { scale: [1, 1.08, 1] } : {}}
          transition={{ duration: 0.3 }}
          className={`inline-flex items-center gap-1 text-xs font-medium ${isBalanced ? 'text-green-600' : 'text-red-600'}`}
        >
          {isBalanced ? <IconCheck className="h-3.5 w-3.5" /> : <IconAlertTriangle className="h-3.5 w-3.5" />}
          Total: {weightSum} / 100
        </motion.p>
      </motion.div>

      <AnimatePresence>
        {state.error && (
          <motion.p
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {state.error}
          </motion.p>
        )}
      </AnimatePresence>
      <motion.div variants={staggerItem}>
        <SubmitButton />
      </motion.div>
    </motion.form>
  );
}
