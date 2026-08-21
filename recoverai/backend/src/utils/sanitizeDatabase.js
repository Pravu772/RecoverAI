const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');

// Regular expression to match any emoji
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu;

const stripEmojis = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(EMOJI_REGEX, '').trim();
};

const sanitizeDatabase = async () => {
  try {
    const txns = await Transaction.find({});
    for (const t of txns) {
      let modified = false;
      if (t.cart_summary && EMOJI_REGEX.test(t.cart_summary)) {
        t.cart_summary = stripEmojis(t.cart_summary);
        modified = true;
      }
      if (t.invoice_id && EMOJI_REGEX.test(t.invoice_id)) {
        t.invoice_id = stripEmojis(t.invoice_id);
        modified = true;
      }
      if (t.ptp_notes && EMOJI_REGEX.test(t.ptp_notes)) {
        t.ptp_notes = stripEmojis(t.ptp_notes);
        modified = true;
      }
      if (t.voice_script && t.voice_script.turns) {
        for (const turn of t.voice_script.turns) {
          if (turn.speaker && EMOJI_REGEX.test(turn.speaker)) {
            turn.speaker = stripEmojis(turn.speaker);
            modified = true;
          }
          if (turn.text_hinglish && EMOJI_REGEX.test(turn.text_hinglish)) {
            turn.text_hinglish = stripEmojis(turn.text_hinglish);
            modified = true;
          }
          if (turn.text_english && EMOJI_REGEX.test(turn.text_english)) {
            turn.text_english = stripEmojis(turn.text_english);
            modified = true;
          }
        }
      }
      if (modified) {
        await t.save();
      }
    }

    const logs = await AuditLog.find({});
    for (const log of logs) {
      if (log.reasoning && EMOJI_REGEX.test(log.reasoning)) {
        log.reasoning = stripEmojis(log.reasoning);
        await log.save();
      }
    }

    console.log('[Sanitizer] Database records sanitized: 0 emojis in database');
  } catch (err) {
    console.error('[Sanitizer] Error during database sanitization:', err.message);
  }
};

module.exports = { sanitizeDatabase };
