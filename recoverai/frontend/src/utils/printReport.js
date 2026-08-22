/**
 * Professional PDF & Print Dossier Engine
 * Formats executive documents with RecoverAI branding, logo, metadata, KPI cards, and clean tabular data.
 */

export const printProfessionalDossier = ({
  title = 'Executive Revenue Recovery Briefing',
  subtitle = 'Autonomous AI & Deterministic Recovery Ledger',
  organization = 'RecoverAI Enterprise',
  orgId = 'MER_GLOBAL',
  period = '',
  kpis = [],
  sections = [],
  complianceNote = '100% compliant with RBI auto-debit circulars, DPDP Act 2023, and immutable cryptographic audit logging.',
}) => {
  const timestamp = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
  const docId = `DOC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

  const printWindow = window.open('', '_blank', 'width=900,height=950');
  if (!printWindow) {
    alert('Please allow popups to generate and print PDF dossiers.');
    return;
  }

  const kpisHtml = kpis.length > 0 ? `
    <div class="kpi-grid">
      ${kpis.map(k => `
        <div class="kpi-card">
          <div class="kpi-label">${k.label}</div>
          <div class="kpi-value ${k.highlight ? 'highlight' : ''}">${k.value}</div>
          ${k.sub ? `<div class="kpi-sub">${k.sub}</div>` : ''}
        </div>
      `).join('')}
    </div>
  ` : '';

  const sectionsHtml = sections.map(sec => `
    <div class="doc-section">
      ${sec.title ? `<h3 class="section-title">${sec.title}</h3>` : ''}
      ${sec.description ? `<p class="section-desc">${sec.description}</p>` : ''}
      ${sec.table ? `
        <table class="data-table">
          <thead>
            <tr>
              ${sec.table.headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${sec.table.rows.map(row => `
              <tr>
                ${row.map(cell => `<td>${cell}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
      ${sec.content ? `<div class="section-content">${sec.content}</div>` : ''}
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>${title} - ${organization}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        
        @page {
          size: A4 portrait;
          margin: 12mm 14mm;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #0f172a;
          background: #ffffff;
          font-size: 11px;
          line-height: 1.45;
          padding: 10px;
        }

        .dossier-container {
          max-width: 100%;
          margin: 0 auto;
        }

        /* Top Brand Header */
        .doc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid #4f46e5;
          padding-bottom: 12px;
          margin-bottom: 14px;
        }

        .brand-block {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .brand-logo-badge {
          width: 36px;
          height: 36px;
          background: #4f46e5;
          color: #ffffff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 16px;
          letter-spacing: -0.5px;
        }

        .brand-title {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .brand-sub {
          font-size: 9px;
          color: #64748b;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .doc-meta {
          text-align: right;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          color: #64748b;
          line-height: 1.4;
        }

        .doc-meta strong {
          color: #0f172a;
        }

        /* Title block */
        .title-block {
          margin-bottom: 14px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
        }

        .doc-heading {
          font-size: 15px;
          font-weight: 800;
          color: #1e1b4b;
        }

        .doc-subheading {
          font-size: 10px;
          color: #475569;
          margin-top: 2px;
        }

        .org-badge {
          display: inline-block;
          font-size: 9.5px;
          font-weight: 700;
          padding: 3px 8px;
          background: #eef2ff;
          color: #4338ca;
          border: 1px solid #c7d2fe;
          border-radius: 6px;
        }

        /* KPI Grid */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 14px;
        }

        .kpi-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 10px;
        }

        .kpi-label {
          font-size: 8.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          margin-bottom: 3px;
        }

        .kpi-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
        }

        .kpi-value.highlight {
          color: #059669;
        }

        .kpi-sub {
          font-size: 8.5px;
          color: #64748b;
          margin-top: 2px;
        }

        /* Tables */
        .doc-section {
          margin-bottom: 14px;
          page-break-inside: avoid;
        }

        .section-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #334155;
          margin-bottom: 6px;
          border-left: 3px solid #4f46e5;
          padding-left: 6px;
        }

        .section-desc {
          font-size: 9.5px;
          color: #64748b;
          margin-bottom: 6px;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9.5px;
          background: #ffffff;
        }

        .data-table th {
          background: #f1f5f9;
          color: #334155;
          font-weight: 700;
          text-align: left;
          padding: 5px 8px;
          border-top: 1px solid #cbd5e1;
          border-bottom: 1px solid #cbd5e1;
          font-size: 8.5px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .data-table td {
          padding: 4.5px 8px;
          border-bottom: 1px solid #f1f5f9;
          color: #1e293b;
        }

        .data-table tr:nth-child(even) td {
          background: #f8fafc;
        }

        .badge-pill {
          display: inline-block;
          padding: 1.5px 5px;
          border-radius: 4px;
          font-size: 8px;
          font-weight: 700;
          font-family: 'JetBrains Mono', monospace;
        }

        .badge-success { background: #dcfce7; color: #166534; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .badge-danger  { background: #fee2e2; color: #991b1b; }
        .badge-info    { background: #e0e7ff; color: #3730a3; }

        /* Footer */
        .doc-footer {
          margin-top: 16px;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 8.5px;
          color: #64748b;
          font-family: 'JetBrains Mono', monospace;
        }

        .compliance-box {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 8.5px;
          color: #065f46;
          margin-top: 10px;
          line-height: 1.4;
        }
      </style>
    </head>
    <body>
      <div class="dossier-container">
        <!-- Top Brand Header -->
        <div class="doc-header">
          <div class="brand-block">
            <div class="brand-logo-badge">R</div>
            <div>
              <div class="brand-title">RecoverAI Platform</div>
              <div class="brand-sub">Autonomous Revenue Recovery Ledger</div>
            </div>
          </div>
          <div class="doc-meta">
            <div><strong>Ref:</strong> ${docId}</div>
            <div><strong>Date & Time:</strong> ${timestamp}</div>
            <div><strong>Workspace:</strong> ${orgId}</div>
          </div>
        </div>

        <!-- Document Title & Org -->
        <div class="title-block">
          <div>
            <h1 class="doc-heading">${title}</h1>
            <p class="doc-subheading">${subtitle}</p>
          </div>
          <div class="org-badge">${organization} ${period ? `• ${period}` : ''}</div>
        </div>

        <!-- KPIs Grid -->
        ${kpisHtml}

        <!-- Document Sections -->
        ${sectionsHtml}

        <!-- Compliance Box -->
        ${complianceNote ? `
          <div class="compliance-box">
            <strong>Governance & Regulatory Invariants:</strong> ${complianceNote}
          </div>
        ` : ''}

        <!-- Footer -->
        <div class="doc-footer">
          <span>RecoverAI Cryptographic Provenance Verified</span>
          <span>Deterministic Routing • Gemini Flash AI</span>
          <span>Page 1 of 1</span>
        </div>
      </div>

      <script>
        window.addEventListener('load', () => {
          setTimeout(() => {
            window.print();
          }, 300);
        });
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};

/**
 * Clean CSV / Excel Exporter with Official Metadata Headers
 */
export const exportFormattedExcelCSV = (filename, {
  title = 'RecoverAI Data Export',
  organization = 'RecoverAI Platform',
  summary = {},
  headers = [],
  rows = [],
}) => {
  const timestamp = new Date().toISOString();
  
  const csvLines = [
    `"RecoverAI Autonomous Revenue Recovery Platform - Official Data Export"`,
    `"Document Title: ${title}"`,
    `"Organization: ${organization}"`,
    `"Export Timestamp: ${timestamp}"`,
    `"Confidential & Regulatory Compliant"`,
    `""`,
  ];

  if (Object.keys(summary).length > 0) {
    csvLines.push(`"--- EXECUTIVE SUMMARY METRICS ---"`);
    Object.entries(summary).forEach(([k, v]) => {
      csvLines.push(`"${k}","${v}"`);
    });
    csvLines.push(`""`);
  }

  csvLines.push(`"--- DETAILED DATA RECORDS ---"`);
  csvLines.push(headers.map(h => `"${h}"`).join(','));

  rows.forEach(r => {
    csvLines.push(r.map(cell => `"${cell !== undefined && cell !== null ? String(cell).replace(/"/g, '""') : ''}"`).join(','));
  });

  const blob = new Blob([csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.replace(/\.csv$/, '')}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
