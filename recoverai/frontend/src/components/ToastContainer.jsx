import { useEffect } from 'react';
import { IconCheckCircle, IconAlertTriangle, IconZap, IconX } from './Icons.jsx';

const ToastContainer = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-xl border shadow-lg bg-white flex items-start gap-3 animate-fade transition-all ${
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
              className="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors"
            >
              <IconX className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
