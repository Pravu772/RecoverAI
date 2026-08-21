import { IconAlertTriangle, IconXCircle, IconUser, IconShield, IconChevronRight, reasonIcon } from './Icons.jsx';

const EXCEPTION_META = {
  exception:           { Icon: IconAlertTriangle, label: 'Low AI Confidence', dotColor: '#d97706' },
  max_retries_reached: { Icon: IconXCircle,       label: 'Max Retries Reached', dotColor: '#dc2626' },
  pending_human:       { Icon: IconUser,           label: 'Pending Human Review', dotColor: '#c2410c' },
  opted_out:           { Icon: IconShield,         label: 'Customer Opted Out', dotColor: '#64748b' },
};

const formatINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const STATUS_BADGE = {
  exception:           'badge-exception',
  max_retries_reached: 'badge-max_retries_reached',
  pending_human:       'badge-pending_human',
  opted_out:           'badge-opted_out',
};

const ExceptionsPanel = ({ transactions, onRowClick }) => {
  const exceptions = transactions.filter(t =>
    ['exception', 'max_retries_reached', 'pending_human', 'opted_out'].includes(t.status)
  );

  // Group counts
  const counts = exceptions.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  if (exceptions.length === 0) {
    return (
      <div className="card p-10 flex flex-col items-center gap-3 text-center">
        <div
          className="w-11 h-11 rounded-xl p-2 flex items-center justify-center"
          style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
        >
          <img src="/logo-icon.png" alt="RecoverAI" className="w-full h-full object-contain" />
        </div>
        <div>
          <p className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text-primary)' }}>
            No exceptions
          </p>
          <p className="text-xs max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
            All transactions have been handled. Generate a batch to see exceptions here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
      >
        <div className="flex items-center gap-2">
          <IconAlertTriangle className="w-4 h-4" style={{ color: '#d97706' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Exceptions — Human Review Required
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {Object.entries(counts).map(([status, count]) => {
            const meta = EXCEPTION_META[status];
            if (!meta) return null;
            return (
              <span key={status} className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: meta.dotColor + '14', color: meta.dotColor }}>
                {meta.label}: {count}
              </span>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="divide-y overflow-y-auto max-h-[480px]" style={{ '--tw-divide-opacity': 1, borderColor: 'var(--color-border)' }}>
        {exceptions.map(txn => {
          const meta = EXCEPTION_META[txn.status];
          if (!meta) return null;
          const { Icon } = meta;
          const ReasonIcon = reasonIcon(txn.classified_reason);
          const badgeCls = STATUS_BADGE[txn.status] || '';

          return (
            <div
              key={txn.transaction_id || txn._id}
              onClick={() => onRowClick(txn)}
              className="px-4 py-3.5 flex items-start gap-3 cursor-pointer group transition-colors"
              style={{ borderBottom: '1px solid var(--color-border)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Icon */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: meta.dotColor + '12', color: meta.dotColor }}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                {/* Row 1: ID + Amount */}
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="font-mono text-xs truncate" style={{ color: 'var(--color-accent)' }}>
                    {txn.transaction_id}
                  </span>
                  <span className="font-semibold text-sm flex-shrink-0">
                    {formatINR(txn.amount)}
                  </span>
                </div>

                {/* Row 2: Status badge + failure code */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`badge ${badgeCls}`}>{meta.label}</span>
                  <span className="code-chip">{txn.failure_code}</span>
                  {txn.classified_reason && (
                    <div className="flex items-center gap-1">
                      <ReasonIcon className="w-3 h-3" style={{ color: 'var(--color-text-muted)' }} />
                      <span className="text-2xs capitalize" style={{ color: 'var(--color-text-muted)' }}>
                        {txn.classified_reason.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Row 3: Exception reason */}
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {txn.exception_reason ||
                    (txn.status === 'pending_human' && 'Requires manual re-authorization by a human agent') ||
                    (txn.status === 'opted_out'    && `Customer ${txn.customer_id} has opted out of all recovery`) ||
                    (txn.status === 'max_retries_reached' && `All ${txn.attempt_count} recovery attempts exhausted`)
                  }
                </p>
              </div>

              {/* Arrow */}
              <IconChevronRight className="w-3.5 h-3.5 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--color-text-muted)' }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExceptionsPanel;
