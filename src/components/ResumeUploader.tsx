'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { IconCheckCircle, IconFileText, IconLoader, IconUpload, IconXCircle } from '@/components/ui/icons';

type FileStatus = { name: string; state: 'uploading' | 'scoring' | 'done' | 'error'; message?: string };

const STATUS_ICON: Record<FileStatus['state'], React.ReactNode> = {
  uploading: <IconLoader className="h-4 w-4 text-slate-400" />,
  scoring: <IconLoader className="h-4 w-4 text-brand-500" />,
  done: <IconCheckCircle className="h-4 w-4 text-green-600" />,
  error: <IconXCircle className="h-4 w-4 text-red-600" />,
};

export default function ResumeUploader({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [queue, setQueue] = useState<FileStatus[]>([]);
  const [busy, setBusy] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      setBusy(true);
      setQueue(acceptedFiles.map((f) => ({ name: f.name, state: 'uploading' })));

      try {
        const formData = new FormData();
        formData.append('jobId', jobId);
        acceptedFiles.forEach((f) => formData.append('files', f));

        const uploadRes = await fetch('/api/resumes/upload', { method: 'POST', body: formData });
        const uploadJson = await uploadRes.json();

        setQueue((prev) =>
          prev.map((item) => {
            const r = uploadJson.results?.find((x: any) => x.fileName === item.name);
            if (!r) return item;
            return r.ok ? { ...item, state: 'scoring' } : { ...item, state: 'error', message: r.error };
          })
        );

        const candidateIds: string[] = uploadJson.candidateIds ?? [];
        if (candidateIds.length > 0) {
          await fetch('/api/candidates/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidateIds }),
          });
        }

        setQueue((prev) => prev.map((item) => (item.state === 'scoring' ? { ...item, state: 'done' } : item)));
        router.refresh();
      } catch (e) {
        setQueue((prev) => prev.map((item) => (item.state !== 'error' ? { ...item, state: 'error', message: 'Something went wrong.' } : item)));
      } finally {
        setBusy(false);
      }
    },
    [jobId, router]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: busy,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: true,
  });

  return (
    <div>
      {/* Plain div, not motion.div — react-dropzone's getRootProps() spreads
          native onDrag* handlers whose types collide with framer-motion's
          own onDrag prop. The active-state scale is a CSS transition instead. */}
      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center gap-2.5 rounded-xl border-2 border-dashed p-8 text-center transition-all ${
          isDragActive ? 'scale-[1.015] border-brand-500 bg-brand-50' : 'border-slate-300 bg-white hover:border-brand-400 hover:bg-slate-50'
        } ${busy ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input {...getInputProps()} />
        <motion.span
          animate={isDragActive ? { y: -6, scale: 1.1 } : { y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 16 }}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600"
        >
          <IconUpload className="h-5 w-5" />
        </motion.span>
        <p className="font-medium text-slate-800">Drag & drop resumes here, or click to browse</p>
        <p className="text-sm text-slate-500">PDF or DOCX, up to 8MB each. You can drop many at once.</p>
      </div>

      <AnimatePresence>
        {queue.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-1.5 overflow-hidden text-sm"
          >
            {queue.map((item, i) => (
              <motion.li
                key={item.name}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 380, damping: 26 }}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <IconFileText className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">{item.name}</span>
                </span>
                <span
                  className={`flex shrink-0 items-center gap-1.5 ${
                    item.state === 'error' ? 'text-red-600' : item.state === 'done' ? 'text-green-600' : 'text-slate-500'
                  }`}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={item.state}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-1.5"
                    >
                      {STATUS_ICON[item.state]}
                      {item.state === 'uploading' && 'Uploading…'}
                      {item.state === 'scoring' && 'Scoring with Claude…'}
                      {item.state === 'done' && 'Done'}
                      {item.state === 'error' && (item.message || 'Failed')}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
