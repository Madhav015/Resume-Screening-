'use client';

import { Fragment, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import type { CandidateWithScore, Recommendation } from '@/lib/types';
import ScoreBadge, { ScorePill } from './ScoreBadge';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { IconAlertTriangle, IconChevronDown, IconLoader, IconSearch, IconXCircle } from '@/components/ui/icons';

const columnHelper = createColumnHelper<CandidateWithScore>();

function StatusPill({ status }: { status: CandidateWithScore['status'] }) {
  if (status === 'scored') return null;
  const label = { pending: 'Queued', processing: 'Scoring…', failed: 'Failed' }[status];
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
        <IconXCircle className="h-3 w-3" /> {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
      <IconLoader className="h-3 w-3" /> {label}
    </span>
  );
}

function ChipList({ items, tone }: { items: string[]; tone: 'green' | 'amber' | 'red' | 'slate' }) {
  if (items.length === 0) return <span className="text-sm text-slate-400">None</span>;
  const toneClasses = {
    green: 'bg-green-50 text-green-700 border-green-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  }[tone];
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span key={item} className={`rounded-full border px-2 py-0.5 text-xs ${toneClasses}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

export default function CandidateTable({ candidates }: { candidates: CandidateWithScore[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'overall_score', desc: true }]);
  const [search, setSearch] = useState('');
  const [recFilter, setRecFilter] = useState<Recommendation | 'all'>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.candidate_name || row.file_name, {
        id: 'name',
        header: 'Candidate',
        cell: (ctx) => (
          <div>
            <p className="font-medium text-slate-800">{ctx.getValue()}</p>
            <p className="text-xs text-slate-400">{ctx.row.original.file_name}</p>
          </div>
        ),
      }),
      columnHelper.accessor((row) => row.candidate_scores?.overall_score ?? -1, {
        id: 'overall_score',
        header: 'Score',
        cell: (ctx) => {
          const status = ctx.row.original.status;
          if (status !== 'scored') return <StatusPill status={status} />;
          return <ScorePill score={ctx.getValue()} />;
        },
      }),
      columnHelper.accessor((row) => row.candidate_scores?.recommendation, {
        id: 'recommendation',
        header: 'Recommendation',
        cell: (ctx) => (ctx.getValue() ? <ScoreBadge recommendation={ctx.getValue() as Recommendation} /> : null),
      }),
      columnHelper.accessor((row) => row.candidate_scores?.years_experience ?? null, {
        id: 'years_experience',
        header: 'Experience',
        cell: (ctx) => (ctx.getValue() != null ? `${ctx.getValue()} yrs` : '—'),
      }),
      columnHelper.accessor((row) => row.candidate_scores?.missing_must_have.length ?? 0, {
        id: 'missing',
        header: 'Missing must-haves',
        cell: (ctx) => {
          const missing = ctx.row.original.candidate_scores?.missing_must_have ?? [];
          if (missing.length === 0 && ctx.row.original.status === 'scored')
            return <span className="text-sm text-green-600">None</span>;
          const shown = missing.slice(0, 2);
          const rest = missing.length - shown.length;
          return (
            <div className="flex flex-wrap items-center gap-1">
              {shown.map((m) => (
                <span key={m} className="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                  {m}
                </span>
              ))}
              {rest > 0 && <span className="text-xs text-slate-400">+{rest}</span>}
            </div>
          );
        },
      }),
      columnHelper.accessor((row) => row.candidate_scores?.red_flags.length ?? 0, {
        id: 'red_flags',
        header: 'Red flags',
        cell: (ctx) => {
          const n = ctx.getValue();
          return n > 0 ? (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
              <IconAlertTriangle className="h-3.5 w-3.5" /> {n}
            </span>
          ) : (
            <span className="text-sm text-slate-400">0</span>
          );
        },
      }),
    ],
    []
  );

  const filteredData = useMemo(() => {
    return candidates.filter((c) => {
      if (recFilter !== 'all' && c.candidate_scores?.recommendation !== recFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const haystack = `${c.candidate_name ?? ''} ${c.file_name} ${c.candidate_email ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [candidates, search, recFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates…"
            className="field w-64 pl-9"
          />
        </div>
        <select
          value={recFilter}
          onChange={(e) => setRecFilter(e.target.value as Recommendation | 'all')}
          className="field w-auto"
        >
          <option value="all">All recommendations</option>
          <option value="strong_match">Strong match</option>
          <option value="possible_match">Possible match</option>
          <option value="weak_match">Weak match</option>
          <option value="not_a_match">Not a match</option>
        </select>
        <span className="text-xs text-slate-400">{filteredData.length} of {candidates.length} candidates</span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className="cursor-pointer select-none whitespace-nowrap px-4 py-3"
                      >
                        <span className="inline-flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted && (
                            <IconChevronDown
                              className={`h-3 w-3 transition-transform ${sorted === 'asc' ? 'rotate-180' : ''}`}
                            />
                          )}
                        </span>
                      </th>
                    );
                  })}
                  <th className="w-8" />
                </tr>
              ))}
            </thead>
            <motion.tbody initial="hidden" animate="visible" variants={staggerContainer}>
              {table.getRowModel().rows.map((row) => {
                const isOpen = !!expanded[row.id];
                return (
                  <Fragment key={row.id}>
                    <motion.tr
                      variants={staggerItem}
                      onClick={() => setExpanded((e) => ({ ...e, [row.id]: !e[row.id] }))}
                      whileHover={{ backgroundColor: 'rgba(248, 250, 252, 1)' }}
                      className="cursor-pointer border-t border-slate-100"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 align-top">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                      <td className="px-2 py-3 align-top text-slate-300">
                        <motion.span
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                          className="inline-block"
                        >
                          <IconChevronDown className="h-4 w-4" />
                        </motion.span>
                      </td>
                    </motion.tr>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.tr
                          key="detail"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="border-t border-slate-100 bg-slate-50/70"
                        >
                          <td colSpan={columns.length + 1} className="px-4 py-4">
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            >
                              <CandidateDetail candidate={row.original} />
                            </motion.div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </Fragment>
                );
              })}
            </motion.tbody>
          </table>
        </div>
        {filteredData.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-400">No candidates match the current filters.</p>
        )}
      </div>
    </div>
  );
}

function CandidateDetail({ candidate }: { candidate: CandidateWithScore }) {
  if (candidate.status === 'failed') {
    return (
      <p className="flex items-center gap-1.5 text-sm text-red-600">
        <IconXCircle className="h-4 w-4" /> Failed to process: {candidate.error_message}
      </p>
    );
  }
  const score = candidate.candidate_scores;
  if (!score) return <p className="text-sm text-slate-400">Still processing…</p>;

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</p>
        <p className="text-sm text-slate-700">{score.summary}</p>
      </div>
      <div className="sm:col-span-2">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Reasoning</p>
        <p className="text-sm text-slate-700">{score.reasoning}</p>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Matched must-haves</p>
        <ChipList items={score.matched_must_have} tone="green" />
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Missing must-haves</p>
        <ChipList items={score.missing_must_have} tone="amber" />
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Matched nice-to-haves</p>
        <ChipList items={score.matched_nice_to_have} tone="slate" />
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Deal-breaker hits</p>
        <ChipList items={score.deal_breaker_hits} tone="red" />
      </div>
      <div className="sm:col-span-2">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Red flags</p>
        <ChipList items={score.red_flags} tone="red" />
      </div>
    </div>
  );
}
