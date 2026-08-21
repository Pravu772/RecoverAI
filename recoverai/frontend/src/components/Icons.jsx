/**
 * Icons — Inline SVG icon components.
 * Crisp 16x16 / 20x20 feather-style icons.
 */

const icon = (path, opts = {}) => {
  const { viewBox = '0 0 24 24', fill = 'none' } = opts;
  return ({ className = 'w-4 h-4', strokeWidth = 1.75 }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {path}
    </svg>
  );
};

export const IconAlertTriangle = icon(
  <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>
);

export const IconCheckCircle = icon(
  <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
);

export const IconTrendingUp = icon(
  <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>
);

export const IconXCircle = icon(
  <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>
);

export const IconRefreshCw = icon(
  <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></>
);

export const IconClock = icon(
  <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>
);

export const IconMail = icon(
  <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>
);

export const IconUser = icon(
  <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>
);

export const IconZap = icon(
  <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>
);

export const IconShield = icon(
  <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>
);

export const IconBarChart2 = icon(
  <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>
);

export const IconChevronRight = icon(
  <polyline points="9 18 15 12 9 6" />
);

export const IconChevronDown = icon(
  <polyline points="6 9 12 15 18 9" />
);

export const IconChevronUp = icon(
  <polyline points="18 15 12 9 6 15" />
);

export const IconX = icon(
  <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
);

export const IconFilter = icon(
  <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>
);

export const IconSearch = icon(
  <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>
);

export const IconPlay = icon(
  <><polygon points="5 3 19 12 5 21 5 3"/></>
);

export const IconPause = icon(
  <><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>
);

export const IconSquare = icon(
  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
);

export const IconArrowRight = icon(
  <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>
);

export const IconDatabase = icon(
  <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>
);

export const IconBrain = icon(
  <><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></>
);

export const IconActivity = icon(
  <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>
);

export const IconInbox = icon(
  <><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></>
);

export const IconCreditCard = icon(
  <><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></>
);

export const IconShoppingCart = icon(
  <><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></>
);

export const IconRepeat = icon(
  <><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></>
);

export const IconFileText = icon(
  <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>
);

export const IconMic = icon(
  <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>
);

export const IconVolume2 = icon(
  <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></>
);

export const IconCalendar = icon(
  <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>
);

export const IconCopy = icon(
  <><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>
);

export const IconCheck = icon(
  <polyline points="20 6 9 17 4 12" />
);

export const IconWifi = icon(
  <><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 16 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></>
);

export const IconLock = icon(
  <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>
);

export const IconFastForward = icon(
  <><polygon points="13 19 22 12 13 5 13 19"/><polygon points="2 19 11 12 2 5 2 19"/></>
);

export const IconMoreHorizontal = icon(
  <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>
);

export const IconLayers = icon(
  <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>
);

export const IconList = icon(
  <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>
);

/** Maps recovery_action to icon component */
export const actionIcon = (action) => {
  const map = {
    immediate_retry:        IconRefreshCw,
    scheduled_retry_2days:  IconClock,
    smart_payday_retry:     IconRepeat,
    sms_nudge:              IconActivity,
    email_alt_payment:      IconMail,
    whatsapp_checkout_link: IconShoppingCart,
    b2b_dunning_escalation: IconFileText,
    hinglish_voice_call:    IconMic,
    escalate_human:         IconUser,
    none:                   IconMoreHorizontal,
  };
  return map[action] || IconMoreHorizontal;
};

/** Maps classified_reason to icon component */
export const reasonIcon = (reason) => {
  const map = {
    insufficient_funds:          IconCreditCard,
    card_expired:                IconCreditCard,
    bank_timeout:                IconClock,
    mandate_expired:             IconLock,
    network_error:               IconWifi,
    checkout_hesitation:         IconShoppingCart,
    otp_dropoff:                 IconActivity,
    invoice_overdue_30d:         IconFileText,
    invoice_overdue_60d:         IconFileText,
    subscription_failed_billing: IconRepeat,
    unknown:                     IconAlertTriangle,
  };
  return map[reason] || IconAlertTriangle;
};

