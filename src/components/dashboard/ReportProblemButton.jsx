import { useState } from 'react';
import { Flag } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { submitComplaint } from '../../services/api';
import { errorAlert, reportDialog, successToast } from '../../utils/alerts';

// Opens the report form and files a complaint tied to an instant service or recruitment request
export default function ReportProblemButton({ instantService, recruitmentRequest, complainAgainst, className = '' }) {
  const { t } = useLanguage();
  const j = t.jobs;
  const [sending, setSending] = useState(false);

  const report = async () => {
    const result = await reportDialog({
      heading: j.reportTitle,
      subjectPlaceholder: j.reportSubject,
      reasonPlaceholder: j.reportReason,
      confirmText: j.reportSubmit,
      cancelText: j.cancel,
      requiredText: j.reportRequired,
    });
    if (!result) return;
    setSending(true);
    try {
      await submitComplaint({ ...result, instantService, recruitmentRequest, complainAgainst: complainAgainst || undefined });
      successToast(j.reportSent);
    } catch (reportError) {
      errorAlert(j.errorTitle, reportError.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <button type="button" onClick={report} disabled={sending} className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:border-rose-300 hover:text-rose-700 disabled:opacity-60 ${className}`}>
      <Flag size={14} /> {sending ? j.sending : j.reportProblem}
    </button>
  );
}
