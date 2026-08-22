import { useEffect } from 'react';
import { IconCheckCircle, IconAlertTriangle, IconZap, IconX } from './Icons.jsx';

const ToastItem = ({ toast, onDismiss }) => {
  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4500);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden p-3.5 rounded-xl border shadow-lg bg-white flex items-start gap-3 animate-fade transition-all ${
        isSuccess ? 'border-emerald-200 text-slate-800' :
        isError ? 'border-rose-200 text-slate-800' :
        'border-indigo-200 text-slate-800'
      }`}
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
        isSuccess ? 'bg-emerald-50 text-emerald-600' :
        isError ? 'bg-rose-50 text-rose-600' :
        'bg-indigo-50 text-indigo-600'
      }`}>
        {isSuccess ? <IconCheckCircle className="w-4 h-4" /> :
         isError ? <IconAlertTriangle className="w-4 h-4" /> :
         <IconZap className="w-4 h-4" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-900 leading-tight">
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-2xs text-slate-500 mt-0.5 leading-relaxed">
            {toast.message}
          </p>
        )}
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors cursor-pointer"
        title="Dismiss notification"
      >
        <IconX className="w-3.5 h-3.5" />
      </button>

      {/* 4.5-second auto-dismiss progress line */}
      <div
        className={`absolute bottom-0 left-0 h-0.5 ${
          isSuccess ? 'bg-emerald-500' : isError ? 'bg-rose-500' : 'bg-indigo-500'
        }`}
        style={{
          width: '100%',
          animation: 'shrinkWidth 4.5s linear forwards',
        }}
      />
    </div>
  );
};

const ToastContainer = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  // Show at most 3 recent toasts simultaneously to avoid screen clutter
  const visibleToasts = toasts.slice(-3);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {visibleToasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export default ToastContainer;

