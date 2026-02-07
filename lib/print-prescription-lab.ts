/**
 * Generate and open PDF for prescription or lab request.
 * Uses jsPDF + html2canvas to create a real PDF that opens in a new tab.
 */

export interface DocumentBranding {
  practiceName?: string
  headerText?: string
  logoUrl?: string
  footerText?: string
  tagline?: string
  /** Digital signature: 'none' | 'text' | 'cursive' | 'formal' | 'script' | 'handwritten' | 'image' */
  signatureStyle?: string
  /** Text shown for text signatures (e.g. Dr. Name) */
  signatureText?: string
  /** URL to signature image when signatureStyle is 'image' */
  signatureImageUrl?: string
  /** Primary color for document accents (hex) */
  primaryColor?: string
  /** Font family: 'default' | 'serif' | 'modern' */
  fontFamily?: string
  /** Form layout: 'table' | 'card' | 'receipt' | 'certificate' | 'chart' | 'sidebar' */
  formLayout?: string
}

/** Lab-only: report form template for printed results (website-wide). */
export interface LabReportTemplate {
  labName?: string
  logoUrl?: string
  slogan?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  /** Show QR code on report (encodes report URL/id) */
  showQrCode?: boolean
  /** Show interpretation section */
  showInterpretation?: boolean
  /** Show lab notes section */
  showLabNotes?: boolean
  signatureTechnician?: string
  signaturePathologist?: string
  primaryColor?: string
  fontFamily?: 'default' | 'serif' | 'modern'
  /** Report layout style: 'professional' (Standard Report) | 'hemolab' (Categorized Report) | 'hospital' (Compact Report) */
  reportLayout?: 'hemolab' | 'hospital' | 'professional'
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(d: string | Date | null): string {
  if (!d) return 'N/A'
  try {
    const date = typeof d === 'string' ? new Date(d) : d
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return 'N/A'
  }
}

function getAccent(branding?: DocumentBranding | null): string {
  return branding?.primaryColor || '#1e40af'
}

function getFont(branding?: DocumentBranding | null): string {
  const f = branding?.fontFamily || 'default'
  if (f === 'serif') return "Georgia, 'Times New Roman', serif"
  if (f === 'modern') return "'Segoe UI', 'Helvetica Neue', sans-serif"
  return "'Segoe UI', Arial, sans-serif"
}

function renderBrandingHeader(branding?: DocumentBranding | null): string {
  if (!branding || (!branding.practiceName && !branding.logoUrl && !branding.headerText && !branding.tagline)) return ''
  const accent = getAccent(branding)
  const font = getFont(branding)
  return `
  <div class="branding-header" style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; font-family: ${font};">
    ${branding.logoUrl ? `<img src="${escapeHtml(branding.logoUrl)}" alt="Logo" style="max-height: 48px; margin-bottom: 8px;" onerror="this.style.display='none'">` : ''}
    ${branding.practiceName ? `<div style="font-size: 20px; font-weight: 700; color: ${accent};">${escapeHtml(branding.practiceName)}</div>` : ''}
    ${branding.headerText ? `<div style="font-size: 13px; color: #6b7280; margin-top: 4px;">${escapeHtml(branding.headerText)}</div>` : ''}
    ${branding.tagline ? `<div style="font-size: 12px; color: #9ca3af; margin-top: 2px; font-style: italic;">${escapeHtml(branding.tagline)}</div>` : ''}
  </div>`
}

function renderSignature(branding?: DocumentBranding | null): string {
  const style = branding?.signatureStyle || 'none'
  if (style === 'none') return ''

  const accent = getAccent(branding)

  if (style === 'image' && branding?.signatureImageUrl) {
    return `
    <div class="signature-block" style="margin-top: 32px; padding-top: 16px; border-top: 1px dashed #d1d5db;">
      <img src="${escapeHtml(branding.signatureImageUrl)}" alt="Signature" style="max-height: 56px; max-width: 200px; object-contain;" onerror="this.parentElement.innerHTML='<span style=color:#9ca3af>Signature image not found</span>'">
      <div style="font-size: 10px; color: #9ca3af; margin-top: 4px;">Digitally signed</div>
    </div>`
  }

  const text = branding?.signatureText?.trim() || 'Dr. [Name]'
  const fontMap: Record<string, string> = {
    text: "'Segoe UI', Arial, sans-serif",
    formal: "Georgia, 'Times New Roman', serif",
    cursive: "'Brush Script MT', 'Lucida Handwriting', cursive",
    script: "'Segoe Script', 'Apple Chancery', cursive",
    handwritten: "'Bradley Hand', 'Lucida Handwriting', cursive",
  }
  const font = fontMap[style] || fontMap.text

  return `
  <div class="signature-block" style="margin-top: 32px; padding-top: 16px; border-top: 1px dashed #d1d5db;">
    <div style="font-family: ${font}; font-size: 22px; font-weight: 400; color: ${accent};">${escapeHtml(text)}</div>
    <div style="font-size: 10px; color: #9ca3af; margin-top: 4px;">Digitally signed</div>
  </div>`
}

function renderBrandingFooter(branding?: DocumentBranding | null): string {
  const sig = renderSignature(branding)
  const footer = branding?.footerText ? `<div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; white-space: pre-line;">${escapeHtml(branding.footerText)}</div>` : ''
  return sig + footer
}

function getLabAccent(tpl?: LabReportTemplate | null): string {
  return tpl?.primaryColor || '#1e40af'
}

function getLabFont(tpl?: LabReportTemplate | null): string {
  const f = tpl?.fontFamily || 'default'
  if (f === 'serif') return "Georgia, 'Times New Roman', serif"
  if (f === 'modern') return "'Segoe UI', 'Helvetica Neue', sans-serif"
  return "'Segoe UI', Arial, sans-serif"
}

function renderLabReportHeader(tpl?: LabReportTemplate | null): string {
  if (!tpl || (!tpl.labName && !tpl.logoUrl && !tpl.slogan && !tpl.address)) return ''
  const accent = getLabAccent(tpl)
  const font = getLabFont(tpl)
  const contactParts = [tpl.phone, tpl.email].filter(Boolean).join(' | ')
  return `
  <div class="lab-report-header" style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid ${accent}; font-family: ${font}; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
    <div>
      ${tpl.logoUrl ? `<img src="${escapeHtml(tpl.logoUrl)}" alt="Lab" style="max-height: 52px; margin-bottom: 8px;" onerror="this.style.display='none'">` : ''}
      ${tpl.labName ? `<div style="font-size: 22px; font-weight: 700; color: ${accent};">${escapeHtml(tpl.labName)}</div>` : ''}
      ${tpl.slogan ? `<div style="font-size: 12px; color: #6b7280; margin-top: 4px;">${escapeHtml(tpl.slogan)}</div>` : ''}
      ${tpl.address ? `<div style="font-size: 11px; color: #6b7280; margin-top: 4px;">${escapeHtml(tpl.address)}</div>` : ''}
    </div>
    <div style="text-align: right; font-size: 11px; color: #6b7280;">
      ${contactParts ? `<div>${escapeHtml(contactParts)}</div>` : ''}
      ${tpl.website ? `<div style="margin-top: 4px;">${escapeHtml(tpl.website)}</div>` : ''}
    </div>
  </div>`
}

/** QR code image URL (encodes data for verification/link to report). */
function getQrCodeImageUrl(data: string, size = 80): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`
}

function renderLabReportSignatures(tpl?: LabReportTemplate | null): string {
  if (!tpl?.signatureTechnician && !tpl?.signaturePathologist) return ''
  const font = getLabFont(tpl)
  const accent = getLabAccent(tpl)
  const tech = tpl.signatureTechnician?.trim()
  const path = tpl.signaturePathologist?.trim()
  if (!tech && !path) return ''
  return `
  <div style="margin-top: 28px; padding-top: 16px; border-top: 1px dashed #d1d5db; display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; font-family: ${font};">
    ${tech ? `<div><div style="font-size: 11px; color: #6b7280;">Medical Lab Technician</div><div style="font-weight: 600; color: ${accent}; margin-top: 4px;">${escapeHtml(tech)}</div></div>` : ''}
    ${path ? `<div><div style="font-size: 11px; color: #6b7280;">Pathologist</div><div style="font-weight: 600; color: ${accent}; margin-top: 4px;">${escapeHtml(path)}</div></div>` : ''}
  </div>`
}

/** Render prescription content by layout type — completely different structures */
function renderPrescriptionLayout(
  prescription: any,
  branding: DocumentBranding | null | undefined,
  accent: string,
  font: string
): { body: string; styles: string } {
  const layout = branding?.formLayout || 'table'
  const meds = prescription.medications || []
  const formatDateFn = formatDate

  if (layout === 'card') {
    const cards = meds.map(
      (m: any) => {
        const formPart = m.form ? ` <span style="font-size: 12px; font-weight: 400; color: #6b7280;">(${escapeHtml(m.form)})</span>` : ''
        return `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin-bottom: 10px; background: #fafafa;">
        <div style="font-weight: 700; font-size: 15px; color: ${accent}; margin-bottom: 8px;">${escapeHtml(m.medication_name || '—')}${formPart}</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 13px; color: #374151;">
          <span><strong>Dosage:</strong> ${escapeHtml(String(m.dosage || '—'))}</span>
          <span><strong>Qty:</strong> ${escapeHtml(String(m.quantity ?? '—'))}</span>
          <span><strong>Frequency:</strong> ${escapeHtml(String(m.frequency || '—'))}</span>
          <span><strong>Duration:</strong> ${escapeHtml(String(m.duration || '—'))}</span>
          ${m.instructions ? `<span style="grid-column: 1/-1;"><strong>Instructions:</strong> ${escapeHtml(m.instructions)}</span>` : ''}
        </div>
      </div>
    `
      }
    ).join('')
    return {
      styles: '',
      body: `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 20px;">
          ${cards || '<div style="grid-column: 1/-1; color: #9ca3af;">No medications</div>'}
        </div>
      `,
    }
  }

  if (layout === 'receipt') {
    const lines = meds.flatMap(
      (m: any) => [
        '───────────────',
        `${escapeHtml(m.medication_name || '—')} ${m.form ? `(${escapeHtml(m.form)})` : ''}`,
        `${escapeHtml(String(m.dosage || '—'))} • Qty: ${escapeHtml(String(m.quantity ?? '—'))} • ${escapeHtml(String(m.frequency || '—'))} • ${escapeHtml(String(m.duration || '—'))}`,
        m.instructions ? escapeHtml(m.instructions) : null,
      ].filter((x): x is string => x != null)
    )
    return {
      styles: `
        .receipt-wrap { max-width: 320px; margin: 0 auto; padding: 20px; font-size: 12px; line-height: 1.5; }
        .receipt-line { font-family: monospace; white-space: pre; }
      `,
      body: `
        <div class="receipt-wrap" style="border: 1px dashed #d1d5db; padding: 24px;">
          <div style="text-align: center; font-weight: 700; font-size: 14px; color: ${accent}; border-bottom: 1px dotted #d1d5db; padding-bottom: 8px; margin-bottom: 12px;">${escapeHtml(prescription.prescription_number || '')}</div>
          <div class="receipt-line">Date: ${formatDateFn(prescription.created_at)}</div>
          <div class="receipt-line">Valid: ${formatDateFn(prescription.valid_until)}</div>
          ${prescription.diagnosis ? `<div class="receipt-line" style="margin-top: 8px;">Dx: ${escapeHtml(prescription.diagnosis)}</div>` : ''}
          <div style="margin-top: 12px; border-top: 1px dotted #d1d5db; padding-top: 12px;">
            ${lines.length ? lines.map((l: string) => `<div class="receipt-line">${l}</div>`).join('') : '<div class="receipt-line">No medications</div>'}
          </div>
        </div>
      `,
    }
  }

  if (layout === 'certificate') {
    const rows = meds.map(
      (m: any) => `
      <tr>
        <td style="padding: 10px; border: 1px solid #e5e7eb;">${escapeHtml(m.medication_name || '—')}${m.form ? `<br><small>${escapeHtml(m.form)}</small>` : ''}</td>
        <td style="padding: 10px; border: 1px solid #e5e7eb;">${escapeHtml(String(m.dosage || '—'))}</td>
        <td style="padding: 10px; border: 1px solid #e5e7eb;">${escapeHtml(String(m.quantity ?? '—'))}</td>
        <td style="padding: 10px; border: 1px solid #e5e7eb;">${escapeHtml(String(m.frequency || '—'))}</td>
        <td style="padding: 10px; border: 1px solid #e5e7eb;">${escapeHtml(String(m.duration || '—'))}</td>
        <td style="padding: 10px; border: 1px solid #e5e7eb;">${escapeHtml(String(m.instructions || '—'))}</td>
      </tr>
    `
    ).join('')
    return {
      styles: '',
      body: `
        <div style="border: 3px double ${accent}; padding: 32px; max-width: 720px; margin: 0 auto; text-align: center;">
          <h2 style="color: ${accent}; font-size: 20px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 2px;">Prescription</h2>
          <p style="font-size: 18px; font-weight: 700;">${escapeHtml(prescription.prescription_number || '')}</p>
          <p style="margin: 16px 0;">Date: ${formatDateFn(prescription.created_at)} &nbsp;|&nbsp; Valid until: ${formatDateFn(prescription.valid_until)}</p>
          ${prescription.diagnosis ? `<p style="margin-bottom: 16px;"><strong>Diagnosis:</strong> ${escapeHtml(prescription.diagnosis)}</p>` : ''}
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; text-align: left;">
            <thead><tr style="background: #f9fafb;">
              <th style="padding: 10px; border: 1px solid #e5e7eb;">Medication</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb;">Dosage</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb;">Qty</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb;">Freq</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb;">Duration</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb;">Instructions</th>
            </tr></thead>
            <tbody>${rows || '<tr><td colspan="6" style="padding: 16px; text-align: center;">No medications</td></tr>'}</tbody>
          </table>
        </div>
      `,
    }
  }

  if (layout === 'chart') {
    const boxes = meds.map(
      (m: any, i: number) => `
      <div style="display: flex; border: 2px solid #374151; margin-bottom: 8px;">
        <div style="width: 36px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #6b7280;">${i + 1}</div>
        <div style="flex: 1; padding: 10px; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 12px; font-size: 13px;">
          <div><strong>${escapeHtml(m.medication_name || '—')}</strong>${m.form ? ` ${escapeHtml(m.form)}` : ''}</div>
          <div>${escapeHtml(String(m.dosage || '—'))}</div>
          <div>×${escapeHtml(String(m.quantity ?? '—'))}</div>
          <div>${escapeHtml(String(m.frequency || '—'))} / ${escapeHtml(String(m.duration || '—'))}</div>
          ${m.instructions ? `<div style="grid-column: 1/-1; font-size: 12px; color: #6b7280;">${escapeHtml(m.instructions)}</div>` : ''}
        </div>
      </div>
    `
    ).join('')
    return {
      styles: '',
      body: `
        <div style="margin-top: 16px;">
          <div style="display: flex; border: 2px solid #374151; background: #f9fafb; font-weight: 700; font-size: 12px;">
            <div style="width: 36px; padding: 8px; text-align: center;">#</div>
            <div style="flex: 1; padding: 8px; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 12px;">
              <span>Medication</span><span>Dosage</span><span>Qty</span><span>Regimen</span>
            </div>
          </div>
          ${boxes || '<div style="padding: 24px; text-align: center; color: #9ca3af;">No medications</div>'}
        </div>
      `,
    }
  }

  if (layout === 'sidebar') {
    const medRows = meds.map(
      (m: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${escapeHtml(m.medication_name || '—')}</strong>${m.form ? `<br><small>${escapeHtml(m.form)}</small>` : ''}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(String(m.dosage || '—'))}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(String(m.quantity ?? '—'))}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(String(m.frequency || '—'))}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(String(m.duration || '—'))}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(String(m.instructions || '—'))}</td>
      </tr>
    `
    ).join('')
    return {
      styles: `.sidebar-main { margin-left: 200px; }`,
      body: `
        <div style="display: flex; min-height: 100px;">
          <div style="width: 180px; padding-right: 20px; border-right: 2px solid ${accent}; flex-shrink: 0;">
            ${renderBrandingHeader(branding)}
            <div style="font-size: 11px; color: #6b7280;">${escapeHtml(prescription.prescription_number || '')}</div>
          </div>
          <div class="sidebar-main" style="flex: 1; padding-left: 24px;">
            <h1 style="color: ${accent}; font-size: 18px; margin-bottom: 12px;">Prescription</h1>
            <div style="display: flex; gap: 24px; margin-bottom: 16px; font-size: 13px;">
              <span>Date: ${formatDateFn(prescription.created_at)}</span>
              <span>Valid: ${formatDateFn(prescription.valid_until)}</span>
            </div>
            ${prescription.diagnosis ? `<p style="margin-bottom: 12px;"><strong>Diagnosis:</strong> ${escapeHtml(prescription.diagnosis)}</p>` : ''}
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead><tr style="background: #f3f4f6;">
                <th style="padding: 8px; text-align: left;">Medication</th>
                <th style="padding: 8px;">Dosage</th>
                <th style="padding: 8px;">Qty</th>
                <th style="padding: 8px;">Frequency</th>
                <th style="padding: 8px;">Duration</th>
                <th style="padding: 8px;">Instructions</th>
              </tr></thead>
              <tbody>${medRows || '<tr><td colspan="6">No medications</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      `,
    }
  }

  // Default: table layout
  const medRows = meds.map(
    (m: any) => `
    <tr>
      <td><strong>${escapeHtml(m.medication_name || '—')}</strong>${m.form ? `<br><small>${escapeHtml(m.form)}</small>` : ''}</td>
      <td>${escapeHtml(String(m.dosage || '—'))}</td>
      <td>${escapeHtml(String(m.quantity ?? '—'))}</td>
      <td>${escapeHtml(String(m.frequency || '—'))}</td>
      <td>${escapeHtml(String(m.duration || '—'))}</td>
      <td>${escapeHtml(String(m.instructions || '—'))}</td>
    </tr>
  `
  ).join('')
  return {
    styles: '',
    body: `
      <h3>Medications</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead><tr style="background: #f3f4f6;">
          <th style="padding: 12px; text-align: left;">Medication</th>
          <th style="padding: 12px;">Dosage</th>
          <th style="padding: 12px;">Qty</th>
          <th style="padding: 12px;">Frequency</th>
          <th style="padding: 12px;">Duration</th>
          <th style="padding: 12px;">Instructions</th>
        </tr></thead>
        <tbody>${medRows || '<tr><td colspan="6">No medications</td></tr>'}</tbody>
      </table>
    `,
  }
}

export function getPrescriptionPrintHtml(prescription: any, branding?: DocumentBranding | null): string {
  const accent = getAccent(branding)
  const font = getFont(branding)
  const layout = branding?.formLayout || 'table'
  const { body: layoutBody, styles: layoutStyles } = renderPrescriptionLayout(prescription, branding, accent, font)

  const isSidebar = layout === 'sidebar'
  const isReceipt = layout === 'receipt'
  const isCertificate = layout === 'certificate'
  const footerBlock = `<div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
  ${renderBrandingFooter(branding)}
  <p>This prescription was generated electronically. Valid for 30 days from the date of issue.</p>
  <p><small>Printed: ${new Date().toLocaleString()}</small></p>
</div>`

  let bodyContent: string
  if (isSidebar) {
    bodyContent = layoutBody + footerBlock
  } else if (isReceipt || isCertificate) {
    bodyContent = `${layoutBody}
${prescription.notes ? `<div style="margin-top: 16px; font-size: 13px;"><strong>Notes:</strong> ${escapeHtml(prescription.notes)}</div>` : ''}
${footerBlock}`
  } else {
    bodyContent = `${renderBrandingHeader(branding)}
<h1 style="color: ${accent}; border-bottom: 2px solid ${accent}; padding-bottom: 10px; font-size: 24px;">Prescription ${escapeHtml(prescription.prescription_number || '')}</h1>
<div style="display: flex; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 16px;">
  <div><div style="font-weight: 600; color: #6b7280; font-size: 12px;">Date</div><div>${formatDate(prescription.created_at)}</div></div>
  <div><div style="font-weight: 600; color: #6b7280; font-size: 12px;">Valid Until</div><div>${formatDate(prescription.valid_until)}</div></div>
</div>
${prescription.diagnosis ? `<div style="margin-bottom: 16px;"><div style="font-weight: 600; color: #6b7280; font-size: 12px;">Diagnosis</div><div>${escapeHtml(prescription.diagnosis)}</div></div>` : ''}
${layoutBody}
${prescription.notes ? `<div style="margin-top: 20px;"><div style="font-weight: 600; color: #6b7280; font-size: 12px;">Notes</div><div>${escapeHtml(prescription.notes)}</div></div>` : ''}
${footerBlock}`
  }

  const receiptWrap = isReceipt ? 'max-width: 380px; margin: 0 auto; padding: 24px;' : 'padding: 40px; max-width: 800px; margin: 0 auto;'

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Prescription ${escapeHtml(prescription.prescription_number || prescription.id?.slice(0, 8) || '')}</title>
<style>
  body { font-family: ${font}; color: #111; ${receiptWrap} }
  ${layoutStyles}
  @media print { body { padding: 20px; } }
</style>
</head><body>
${isReceipt ? renderBrandingHeader(branding) : ''}
${bodyContent}
</body></html>`
}

function renderLabRequestLayout(
  labRequest: any,
  branding: DocumentBranding | null | undefined,
  accent: string,
  font: string
): { body: string; styles: string; useReceiptWrap?: boolean } {
  const layout = branding?.formLayout || 'table'
  const items = labRequest.items || []

  if (layout === 'card') {
    const cards = items.map(
      (item: any, i: number) => `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 8px; background: #fafafa;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="width: 28px; height: 28px; background: ${accent}; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px;">${i + 1}</span>
          <div>
            <strong>${escapeHtml(item.test_type?.name || '—')}</strong>
            <span style="font-size: 12px; color: #6b7280; margin-left: 8px;">${escapeHtml(item.test_type?.category || '—')}</span>
          </div>
        </div>
      </div>
    `
    ).join('')
    return {
      styles: '',
      body: `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 20px;">${cards || '<div style="grid-column: 1/-1; color: #9ca3af;">No tests</div>'}</div>`,
    }
  }

  if (layout === 'receipt') {
    const lines = items.flatMap(
      (item: any, i: number) => [
        `───────────────`,
        `${i + 1}. ${escapeHtml(item.test_type?.name || '—')} [${escapeHtml(item.test_type?.category || '—')}]`,
      ]
    )
    return {
      styles: `.receipt-line { font-family: monospace; white-space: pre; font-size: 12px; }`,
      body: `
        <div style="border: 1px dashed #d1d5db; padding: 20px; max-width: 320px; margin: 0 auto;">
          <div class="receipt-line" style="text-align: center; font-weight: 700; color: ${accent}; margin-bottom: 12px;">${escapeHtml(labRequest.request_number || '')}</div>
          <div class="receipt-line">Date: ${formatDate(labRequest.created_at)}</div>
          <div class="receipt-line">Priority: ${labRequest.priority === 'urgent' ? 'URGENT' : 'Normal'}</div>
          ${labRequest.diagnosis ? `<div class="receipt-line" style="margin-top: 8px;">Dx: ${escapeHtml(labRequest.diagnosis)}</div>` : ''}
          <div style="margin-top: 12px; border-top: 1px dotted #d1d5db; padding-top: 12px;">
            ${lines.map((l: string) => `<div class="receipt-line">${l}</div>`).join('')}
          </div>
        </div>
      `,
      useReceiptWrap: true,
    }
  }

  if (layout === 'certificate') {
    const rows = items.map(
      (item: any, i: number) => `
      <tr>
        <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">${i + 1}</td>
        <td style="padding: 10px; border: 1px solid #e5e7eb;">${escapeHtml(item.test_type?.name || '—')}</td>
        <td style="padding: 10px; border: 1px solid #e5e7eb;">${escapeHtml(item.test_type?.category || '—')}</td>
      </tr>
    `
    ).join('')
    return {
      styles: '',
      body: `
        <div style="border: 3px double ${accent}; padding: 32px; max-width: 640px; margin: 0 auto; text-align: center;">
          <h2 style="color: ${accent}; font-size: 18px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 2px;">Laboratory Test Request</h2>
          <p style="font-size: 16px; font-weight: 700;">${escapeHtml(labRequest.request_number || '')}</p>
          <p style="margin: 12px 0;">Date: ${formatDate(labRequest.created_at)} &nbsp;|&nbsp; Priority: ${labRequest.priority === 'urgent' ? 'URGENT' : 'Normal'}</p>
          ${labRequest.diagnosis ? `<p style="margin-bottom: 12px;"><strong>Diagnosis:</strong> ${escapeHtml(labRequest.diagnosis)}</p>` : ''}
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; text-align: left;">
            <thead><tr style="background: #f9fafb;"><th style="padding: 10px; border: 1px solid #e5e7eb; width: 48px;">#</th><th style="padding: 10px; border: 1px solid #e5e7eb;">Test Name</th><th style="padding: 10px; border: 1px solid #e5e7eb;">Category</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="3" style="padding: 16px; text-align: center;">No tests</td></tr>'}</tbody>
          </table>
        </div>
      `,
    }
  }

  if (layout === 'chart') {
    const boxes = items.map(
      (item: any, i: number) => `
      <div style="display: flex; border: 2px solid #374151; margin-bottom: 6px;">
        <div style="width: 36px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #6b7280;">${i + 1}</div>
        <div style="flex: 1; padding: 8px; font-size: 13px;"><strong>${escapeHtml(item.test_type?.name || '—')}</strong> <span style="color: #6b7280;">${escapeHtml(item.test_type?.category || '—')}</span></div>
      </div>
    `
    ).join('')
    return {
      styles: '',
      body: `
        <div style="margin-top: 16px;">
          <div style="display: flex; border: 2px solid #374151; background: #f9fafb; font-weight: 700; font-size: 12px;">
            <div style="width: 36px; padding: 8px; text-align: center;">#</div>
            <div style="flex: 1; padding: 8px;">Test Name / Category</div>
          </div>
          ${boxes || '<div style="padding: 20px; text-align: center; color: #9ca3af;">No tests</div>'}
        </div>
      `,
    }
  }

  if (layout === 'sidebar') {
    const rows = items.map(
      (item: any, i: number) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${i + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${escapeHtml(item.test_type?.name || '—')}</strong></td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.test_type?.category || '—')}</td>
      </tr>
    `
    ).join('')
    return {
      styles: '',
      body: `
        <div style="display: flex;">
          <div style="width: 180px; padding-right: 20px; border-right: 2px solid ${accent}; flex-shrink: 0;">
            ${renderBrandingHeader(branding)}
            <div style="font-size: 11px; color: #6b7280;">${escapeHtml(labRequest.request_number || '')}</div>
          </div>
          <div style="flex: 1; padding-left: 24px;">
            <h1 style="color: ${accent}; font-size: 18px; margin-bottom: 12px;">Lab Request</h1>
            <div style="display: flex; gap: 24px; margin-bottom: 16px; font-size: 13px;">
              <span>Date: ${formatDate(labRequest.created_at)}</span>
              <span class="${labRequest.priority === 'urgent' ? 'priority-urgent' : ''}">Priority: ${labRequest.priority === 'urgent' ? 'URGENT' : 'Normal'}</span>
            </div>
            ${labRequest.diagnosis ? `<p style="margin-bottom: 12px;"><strong>Diagnosis:</strong> ${escapeHtml(labRequest.diagnosis)}</p>` : ''}
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead><tr style="background: #f3f4f6;"><th style="padding: 8px; width: 36px;">#</th><th style="padding: 8px; text-align: left;">Test Name</th><th style="padding: 8px;">Category</th></tr></thead>
              <tbody>${rows || '<tr><td colspan="3">No tests</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      `,
    }
  }

  // Default: table layout - include results when available (standard lab format)
  const hasResults = items.some((item: any) => item.result_value || (labRequest.lab_fulfillment || []).find((f: any) => f.item_id === item.id)?.result_value)
  const fulfillmentMap = new Map((labRequest.lab_fulfillment || []).map((f: any) => [f.item_id, f]))
  const rows = items.map(
    (item: any, i: number) => {
      const f = fulfillmentMap.get(item.id)
      const val = item.result_value ?? f?.result_value
      const unit = item.result_unit ?? f?.result_unit
      const ref = item.reference_range ?? f?.reference_range
      const status = item.result_status ?? f?.result_status
      const failed = (f?.status || item.result_status) === 'failed'
      const resultCell = hasResults
        ? `<td style="padding: 12px;">${failed ? `<span style="color: #dc2626;">Failed${f?.failed_reason ? ': ' + escapeHtml(f.failed_reason) : ''}</span>` : val != null ? `${escapeHtml(String(val))}${unit ? ' ' + escapeHtml(unit) : ''}` : '—'}</td>
        <td style="padding: 12px;">${ref ? escapeHtml(ref) : '—'}</td>
        <td style="padding: 12px;">${status ? escapeHtml(status) : '—'}</td>`
        : ''
      return `
    <tr>
      <td style="padding: 12px;">${i + 1}</td>
      <td style="padding: 12px;"><strong>${escapeHtml(item.test_type?.name || '—')}</strong></td>
      <td style="padding: 12px;">${escapeHtml(item.test_type?.category || '—')}</td>
      ${resultCell}
    </tr>
  `
    }
  ).join('')
  const resultHeader = hasResults
    ? '<th style="padding: 12px; text-align: left;">Result</th><th style="padding: 12px;">Ref. Range</th><th style="padding: 12px;">Status</th>'
    : ''
  const colSpan = hasResults ? 6 : 3
  return {
    styles: '',
    body: `
      <h3>${hasResults ? 'Results Received' : 'Tests Requested'}</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead><tr style="background: #f3f4f6;"><th style="padding: 12px; width: 48px;">#</th><th style="padding: 12px; text-align: left;">Test Name</th><th style="padding: 12px;">Category</th>${resultHeader}</tr></thead>
        <tbody>${rows || `<tr><td colspan="${colSpan}">No tests</td></tr>`}</tbody>
      </table>
    `,
  }
}

/** Helper to extract common patient/result data for lab reports */
function extractLabReportData(labRequest: any, labTemplate: LabReportTemplate, options?: { reportId?: string; baseUrl?: string }) {
  const items = labRequest.items || []
  const fulfillmentMap = new Map((labRequest.lab_fulfillment || []).map((f: any) => [f.item_id, f]))
  const patientName = labRequest.patient?.full_name || labRequest.patient?.display_name || labRequest.patient_name || '—'
  const patientAge = labRequest.patient?.age ?? labRequest.patient_age ?? '—'
  const patientSex = labRequest.patient?.sex ?? labRequest.patient_sex ?? '—'
  const patientId = labRequest.patient_id ? String(labRequest.patient_id).slice(0, 8) : labRequest.request_number || '—'
  const refBy = labRequest.doctor?.business_name || labRequest.doctor?.display_name || labRequest.ref_by || '—'
  const registeredAt = labRequest.created_at ? formatDate(labRequest.created_at) : '—'
  const resultData = labRequest.result_data || (labRequest.lab_fulfillment && { lab_fulfillment: labRequest.lab_fulfillment })
  const interpretation = (resultData?.interpretation ?? labRequest.interpretation) as string | undefined
  const reportNotes = (resultData?.report_notes ?? labRequest.report_notes) as string | undefined
  const completedAt = items.find((i: any) => i.completed_at)?.completed_at || labRequest.updated_at
  const reportedAt = completedAt ? formatDate(completedAt) : '—'
  const qrData = options?.reportId
    ? (options.baseUrl ? `${options.baseUrl.replace(/\/$/, '')}/lab-report/${options.reportId}` : options.reportId)
    : (labRequest.id ? `lab-request:${labRequest.id}` : '')
  const showQr = labTemplate.showQrCode !== false && !!qrData
  return { items, fulfillmentMap, patientName, patientAge, patientSex, patientId, refBy, registeredAt, reportedAt, interpretation, reportNotes, qrData, showQr }
}

/** CATEGORIZED REPORT: Results grouped by category with status badges */
function renderLabResultsHemolab(labRequest: any, labTemplate: LabReportTemplate, options?: { reportId?: string; baseUrl?: string }): string {
  const accent = getLabAccent(labTemplate)
  const font = getLabFont(labTemplate)
  const { items, fulfillmentMap, patientName, patientAge, patientSex, patientId, registeredAt, reportedAt, qrData, showQr } = extractLabReportData(labRequest, labTemplate, options)
  const contactParts = [labTemplate.phone, labTemplate.email].filter(Boolean).join(' | ')

  // Group items by category
  const byCategory: Record<string, any[]> = {}
  for (const item of items) {
    const cat = item.test_type?.category || 'Other'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(item)
  }

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return '<span style="color: #6b7280;">—</span>'
    const colors: Record<string, string> = { normal: '#16a34a', high: '#dc2626', low: '#f59e0b', critical: '#dc2626' }
    const c = colors[status] || '#6b7280'
    return `<span style="color: ${c}; font-weight: 600; text-transform: capitalize;">${escapeHtml(status)}</span>`
  }

  let html = `
  <div style="font-family: ${font}; color: #111;">
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid ${accent}; padding-bottom: 16px; margin-bottom: 20px;">
      <div style="display: flex; align-items: center; gap: 16px;">
        ${labTemplate.logoUrl ? `<img src="${escapeHtml(labTemplate.logoUrl)}" alt="Logo" style="max-height: 56px;" onerror="this.style.display='none'">` : `<div style="width: 56px; height: 56px; background: ${accent}; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px;">${escapeHtml((labTemplate.labName || 'Lab').charAt(0))}</div>`}
        <div>
          <h1 style="font-size: 24px; font-weight: bold; color: ${accent}; margin: 0;">${escapeHtml(labTemplate.labName || 'Laboratory')}</h1>
          ${labTemplate.slogan ? `<p style="font-size: 12px; color: #6b7280; margin: 2px 0 0 0;">${escapeHtml(labTemplate.slogan)}</p>` : ''}
          ${labTemplate.address ? `<p style="font-size: 11px; color: #6b7280; margin: 2px 0 0 0;">${escapeHtml(labTemplate.address)}</p>` : ''}
        </div>
      </div>
      <div style="text-align: right; font-size: 11px; color: #6b7280;">
        ${contactParts ? `<div>${escapeHtml(contactParts)}</div>` : ''}
        ${labTemplate.website ? `<div>${escapeHtml(labTemplate.website)}</div>` : ''}
      </div>
    </div>

    <h2 style="text-align: center; font-size: 22px; color: ${accent}; margin-bottom: 20px;">Blood Test Results</h2>

    <!-- Patient & Processing Details -->
    <div style="display: flex; justify-content: space-between; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <div>
        <div style="font-weight: 600; margin-bottom: 8px;">${escapeHtml(patientName)}</div>
        <div style="font-size: 13px; color: #6b7280;">Age: <strong>${escapeHtml(String(patientAge))}</strong></div>
        <div style="font-size: 13px; color: #6b7280;">Gender: <strong>${escapeHtml(String(patientSex))}</strong></div>
        <div style="font-size: 13px; color: #6b7280;">Patient ID: <strong>${escapeHtml(patientId)}</strong></div>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 600; margin-bottom: 8px;">Processing Details</div>
        <div style="font-size: 13px; color: #6b7280;">Sample: <strong>${registeredAt}</strong></div>
        <div style="font-size: 13px; color: #6b7280;">Results: <strong>${reportedAt}</strong></div>
        ${labTemplate.signaturePathologist ? `<div style="font-size: 13px; color: #6b7280;">Verified by: <strong>${escapeHtml(labTemplate.signaturePathologist)}</strong></div>` : ''}
      </div>
    </div>`

  // Results by category
  for (const [category, catItems] of Object.entries(byCategory)) {
    const rows = catItems.map((item: any) => {
      const f = fulfillmentMap.get(item.id)
      const val = item.result_value ?? f?.result_value
      const unit = item.result_unit ?? f?.result_unit
      const ref = item.reference_range ?? f?.reference_range
      const status = item.result_status ?? f?.result_status
      return `<tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.test_type?.name || '—')}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 600;">${val ?? '—'}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${unit || '—'}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${ref || '—'}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${getStatusBadge(status)}</td>
      </tr>`
    }).join('')

    html += `
    <div style="margin-bottom: 24px;">
      <h3 style="font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 12px;">${escapeHtml(category)}</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 10px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #d1d5db;">TEST</th>
            <th style="padding: 10px 12px; text-align: center; font-weight: 600; border-bottom: 2px solid #d1d5db;">RESULT</th>
            <th style="padding: 10px 12px; text-align: center; font-weight: 600; border-bottom: 2px solid #d1d5db;">UNIT</th>
            <th style="padding: 10px 12px; text-align: center; font-weight: 600; border-bottom: 2px solid #d1d5db;">NORMAL RANGE</th>
            <th style="padding: 10px 12px; text-align: center; font-weight: 600; border-bottom: 2px solid #d1d5db;">RESULT STATUS</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`
  }

  html += `
    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center;">
      Page 1 of 1 · Generated: ${new Date().toLocaleString()}
    </div>
  </div>`

  return html
}

/** COMPACT REPORT: Simple centered layout, minimal design */
function renderLabResultsHospital(labRequest: any, labTemplate: LabReportTemplate, options?: { reportId?: string; baseUrl?: string }): string {
  const accent = getLabAccent(labTemplate)
  const font = getLabFont(labTemplate)
  const { items, fulfillmentMap, patientName, patientAge, patientSex, patientId, registeredAt } = extractLabReportData(labRequest, labTemplate, options)

  const rows = items.map((item: any) => {
    const f = fulfillmentMap.get(item.id)
    const val = item.result_value ?? f?.result_value
    const unit = item.result_unit ?? f?.result_unit
    const ref = item.reference_range ?? f?.reference_range
    return `<tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.test_type?.name || '—')}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center;">${val ?? '—'}${unit ? ` ${unit}` : ''}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center;">${ref || '—'}</td>
    </tr>`
  }).join('')

  return `
  <div style="font-family: ${font}; color: #111; max-width: 600px; margin: 0 auto;">
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 3px solid ${accent}; margin-bottom: 20px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        ${labTemplate.logoUrl ? `<img src="${escapeHtml(labTemplate.logoUrl)}" alt="Logo" style="max-height: 48px;" onerror="this.style.display='none'">` : `<div style="font-size: 32px; color: ${accent};">⚕</div>`}
        <div>
          <h1 style="font-size: 20px; font-weight: bold; color: ${accent}; margin: 0; text-transform: uppercase;">${escapeHtml(labTemplate.labName || 'Medical Laboratory')}</h1>
          ${labTemplate.slogan ? `<p style="font-size: 11px; color: #6b7280; margin: 2px 0 0 0;">${escapeHtml(labTemplate.slogan)}</p>` : ''}
        </div>
      </div>
      <div style="text-align: right; font-size: 11px; color: #6b7280;">
        ${labTemplate.address ? `<div>${escapeHtml(labTemplate.address)}</div>` : ''}
      </div>
    </div>

    <h2 style="text-align: center; font-size: 18px; letter-spacing: 4px; color: ${accent}; margin-bottom: 24px; text-transform: uppercase;">T E S T   R E S U L T S</h2>

    <!-- Patient Info Boxes -->
    <div style="display: flex; gap: 16px; margin-bottom: 24px;">
      <div style="flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px;">
        <div style="font-size: 13px;">Name: <strong>${escapeHtml(patientName)}</strong></div>
        <div style="font-size: 13px;">Date: <strong>${registeredAt}</strong></div>
        <div style="font-size: 13px;">Patient #: <strong>${escapeHtml(patientId)}</strong></div>
      </div>
      <div style="flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px;">
        <div style="font-size: 13px;">Age: <strong>${escapeHtml(String(patientAge))} years old</strong></div>
        <div style="font-size: 13px;">Sex: <strong>${escapeHtml(String(patientSex))}</strong></div>
        <div style="font-size: 13px;">Test ID: <strong>${escapeHtml(labRequest.request_number || patientId)}</strong></div>
      </div>
    </div>

    <!-- Results Table -->
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
      <thead>
        <tr style="border-bottom: 2px solid ${accent};">
          <th style="padding: 12px 16px; text-align: left; font-weight: 700; color: ${accent};">Test</th>
          <th style="padding: 12px 16px; text-align: center; font-weight: 700; color: ${accent};">Results</th>
          <th style="padding: 12px 16px; text-align: center; font-weight: 700; color: ${accent};">Reference Range</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="3" style="padding: 20px; text-align: center; color: #9ca3af;">No results</td></tr>'}</tbody>
    </table>

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center;">
      Generated: ${new Date().toLocaleString()}
    </div>
  </div>`
}

/** STANDARD REPORT: Full layout with QR code, interpretation, lab notes, dual signatures */
function renderLabResultsProfessional(labRequest: any, labTemplate: LabReportTemplate, options?: { reportId?: string; baseUrl?: string }): string {
  const accent = getLabAccent(labTemplate)
  const font = getLabFont(labTemplate)
  const { items, fulfillmentMap, patientName, patientAge, patientSex, patientId, refBy, registeredAt, reportedAt, interpretation, reportNotes, qrData, showQr } = extractLabReportData(labRequest, labTemplate, options)
  const contactParts = [labTemplate.phone, labTemplate.email].filter(Boolean).join(' | ')

  const rows = items.map((item: any) => {
    const f = fulfillmentMap.get(item.id)
    const val = item.result_value ?? f?.result_value
    const unit = item.result_unit ?? f?.result_unit
    const ref = item.reference_range ?? f?.reference_range
    const status = item.result_status ?? f?.result_status
    const failed = (f?.status === 'failed') || (item.result_status === 'failed')
    const statusColor = status === 'high' || status === 'low' ? '#f59e0b' : status === 'critical' ? '#dc2626' : '#374151'
    return `<tr>
      <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">${escapeHtml(item.test_type?.name || '—')}</td>
      <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: center; font-weight: 600; color: ${statusColor};">${failed ? `<span style="color: #dc2626;">Failed</span>` : (val ?? '—')}</td>
      <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: center;">${ref || '—'}</td>
      <td style="padding: 10px 12px; border: 1px solid #e5e7eb; text-align: center;">${unit || '—'}</td>
    </tr>`
  }).join('')

  const qrBlock = showQr
    ? `<div style="position: absolute; top: 0; right: 0;"><img src="${getQrCodeImageUrl(qrData, 80)}" alt="QR" width="80" height="80" style="display: block;" onerror="this.style.display='none'"></div>`
    : ''

  // Lab notes
  const perTestNotes = items
    .map((item: any) => {
      const n = item.lab_notes ?? fulfillmentMap.get(item.id)?.lab_notes
      return n ? `${escapeHtml(item.test_type?.name || '—')}: ${escapeHtml(n)}` : null
    })
    .filter(Boolean)

  return `
  <div style="font-family: ${font}; color: #111;">
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid ${accent}; padding-bottom: 16px; margin-bottom: 20px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        ${labTemplate.logoUrl ? `<img src="${escapeHtml(labTemplate.logoUrl)}" alt="Logo" style="max-height: 52px;" onerror="this.style.display='none'">` : `<div style="width: 52px; height: 52px; background: ${accent}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">⚕</div>`}
        <div>
          <h1 style="font-size: 22px; font-weight: bold; color: ${accent}; margin: 0;">${escapeHtml(labTemplate.labName || 'PATHOLOGY LAB')}</h1>
          ${labTemplate.slogan ? `<p style="font-size: 11px; color: #6b7280; margin: 2px 0 0 0;">${escapeHtml(labTemplate.slogan)}</p>` : ''}
          ${labTemplate.address ? `<p style="font-size: 11px; color: #6b7280; margin: 2px 0 0 0;">${escapeHtml(labTemplate.address)}</p>` : ''}
        </div>
      </div>
      <div style="text-align: right; font-size: 11px; color: #6b7280;">
        ${labTemplate.phone ? `<div>📞 ${escapeHtml(labTemplate.phone)}</div>` : ''}
        ${labTemplate.email ? `<div>✉ ${escapeHtml(labTemplate.email)}</div>` : ''}
        ${labTemplate.website ? `<div>${escapeHtml(labTemplate.website)}</div>` : ''}
      </div>
    </div>

    <!-- Patient Details with QR -->
    <div style="position: relative; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      ${qrBlock}
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; max-width: calc(100% - 100px);">
        <div><strong>${escapeHtml(patientName)}</strong></div>
        <div>PID: <strong>${escapeHtml(patientId)}</strong></div>
        <div>Age: <strong>${escapeHtml(String(patientAge))}</strong> · Sex: <strong>${escapeHtml(String(patientSex))}</strong></div>
        <div>Ref. By: <strong>${escapeHtml(refBy)}</strong></div>
        <div>Registered on: <strong>${registeredAt}</strong></div>
        <div>Reported on: <strong>${reportedAt}</strong></div>
      </div>
    </div>

    <!-- Results Table -->
    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 14px; font-weight: 700; color: ${accent}; margin-bottom: 10px; border-bottom: 2px solid ${accent}; padding-bottom: 6px;">Complete Blood Count (CBC)</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 10px 12px; text-align: left; border: 1px solid #e5e7eb; font-weight: 700;">Investigation</th>
            <th style="padding: 10px 12px; text-align: center; border: 1px solid #e5e7eb; font-weight: 700;">Result</th>
            <th style="padding: 10px 12px; text-align: center; border: 1px solid #e5e7eb; font-weight: 700;">Reference Value</th>
            <th style="padding: 10px 12px; text-align: center; border: 1px solid #e5e7eb; font-weight: 700;">Unit</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="4" style="padding: 16px; text-align: center; color: #9ca3af;">No results</td></tr>'}</tbody>
      </table>
    </div>

    ${labTemplate.showInterpretation !== false ? `
    <div style="margin-bottom: 16px; padding: 12px; background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px;">
      <div style="font-weight: 700; color: #92400e; margin-bottom: 4px;">Interpretation:</div>
      <div style="font-size: 13px; color: #78350f;">${interpretation ? escapeHtml(interpretation) : 'Further confirm for Anemia'}</div>
    </div>` : ''}

    ${labTemplate.showLabNotes !== false && perTestNotes.length ? `
    <div style="margin-bottom: 16px; font-size: 13px;">
      <strong>Lab Notes:</strong> ${perTestNotes.join('; ')}
    </div>` : ''}

    <!-- Signatures -->
    <div style="display: flex; justify-content: space-between; margin-top: 32px; padding-top: 16px; border-top: 1px dashed #d1d5db;">
      ${labTemplate.signatureTechnician ? `
      <div style="text-align: center;">
        <div style="font-family: 'Brush Script MT', cursive; font-size: 20px; color: #374151; margin-bottom: 4px;">${escapeHtml(labTemplate.signatureTechnician.split('(')[0].trim())}</div>
        <div style="font-size: 12px; font-weight: 600;">Medical Lab Technician</div>
        <div style="font-size: 11px; color: #6b7280;">(DMLT, BMLT)</div>
      </div>` : ''}
      ${labTemplate.signaturePathologist ? `
      <div style="text-align: center;">
        <div style="font-family: 'Brush Script MT', cursive; font-size: 20px; color: #374151; margin-bottom: 4px;">${escapeHtml(labTemplate.signaturePathologist.split('(')[0].trim())}</div>
        <div style="font-size: 12px; font-weight: 600;">${escapeHtml(labTemplate.signaturePathologist)}</div>
        <div style="font-size: 11px; color: #6b7280;">(MD, Pathologist)</div>
      </div>` : ''}
    </div>

    <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between;">
      <span>Generated on: ${new Date().toLocaleString()}</span>
      <span>Page 1 of 1</span>
    </div>
  </div>`
}

/** Build full lab results report HTML using lab template - dispatches to correct layout */
function renderLabResultsReport(
  labRequest: any,
  labTemplate: LabReportTemplate,
  options?: { reportId?: string; baseUrl?: string }
): string {
  const layout = labTemplate.reportLayout || 'professional'
  
  switch (layout) {
    case 'hemolab':
      return renderLabResultsHemolab(labRequest, labTemplate, options)
    case 'hospital':
      return renderLabResultsHospital(labRequest, labTemplate, options)
    case 'professional':
    default:
      return renderLabResultsProfessional(labRequest, labTemplate, options)
  }
}

export function getLabRequestPrintHtml(
  labRequest: any,
  branding?: DocumentBranding | null,
  options?: { labReportTemplate?: LabReportTemplate | null; labId?: string; reportId?: string; baseUrl?: string }
): string {
  const hasResults = (labRequest.items || []).some(
    (item: any) => item.result_value || (labRequest.lab_fulfillment || []).find((f: any) => f.item_id === item.id)?.result_value
  )
  const useLabTemplate = hasResults && options?.labReportTemplate

  if (useLabTemplate) {
    const font = getLabFont(options.labReportTemplate)
    const body = renderLabResultsReport(labRequest, options.labReportTemplate, {
      reportId: options.reportId || labRequest.id,
      baseUrl: options.baseUrl,
    })
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Lab Results ${escapeHtml(labRequest.request_number || labRequest.id?.slice(0, 8) || '')}</title>
<style>
  body { font-family: ${font}; color: #111; padding: 40px; max-width: 800px; margin: 0 auto; }
  @media print { body { padding: 20px; } }
</style>
</head><body>
${body}
</body></html>`
  }

  const accent = branding?.primaryColor ? getAccent(branding) : '#7c3aed'
  const font = getFont(branding)
  const layout = branding?.formLayout || 'table'
  const { body: layoutBody, styles: layoutStyles, useReceiptWrap } = renderLabRequestLayout(labRequest, branding, accent, font)

  const isSidebar = layout === 'sidebar'
  const isReceipt = layout === 'receipt'
  const isCertificate = layout === 'certificate'
  const footerBlock = `<div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
  ${renderBrandingFooter(branding)}
  <p>This lab request was generated electronically. Please present this document at the laboratory.</p>
  <p><small>Printed: ${new Date().toLocaleString()}</small></p>
</div>`

  let bodyContent: string
  if (isSidebar) {
    bodyContent = layoutBody + footerBlock
  } else if (isReceipt || isCertificate) {
    bodyContent = `${layoutBody}
${labRequest.clinical_notes ? `<div style="margin-top: 16px; font-size: 13px;"><strong>Notes:</strong> ${escapeHtml(labRequest.clinical_notes)}</div>` : ''}
${footerBlock}`
  } else {
    bodyContent = `${renderBrandingHeader(branding)}
<h1 style="color: ${accent}; border-bottom: 2px solid ${accent}; padding-bottom: 10px; font-size: 24px;">Lab Request ${escapeHtml(labRequest.request_number || '')}</h1>
<div style="display: flex; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 16px;">
  <div><div style="font-weight: 600; color: #6b7280; font-size: 12px;">Date</div><div>${formatDate(labRequest.created_at)}</div></div>
  <div><div style="font-weight: 600; color: #6b7280; font-size: 12px;">Priority</div><div class="${labRequest.priority === 'urgent' ? 'priority-urgent' : ''}">${labRequest.priority === 'urgent' ? 'URGENT' : 'Normal'}</div></div>
</div>
${labRequest.diagnosis ? `<div style="margin-bottom: 16px;"><div style="font-weight: 600; color: #6b7280; font-size: 12px;">Diagnosis</div><div>${escapeHtml(labRequest.diagnosis)}</div></div>` : ''}
${labRequest.clinical_notes ? `<div style="margin-bottom: 16px;"><div style="font-weight: 600; color: #6b7280; font-size: 12px;">Clinical Notes</div><div>${escapeHtml(labRequest.clinical_notes)}</div></div>` : ''}
${layoutBody}
${footerBlock}`
  }

  const bodyWrap = useReceiptWrap ? 'max-width: 380px; margin: 0 auto; padding: 24px;' : 'padding: 40px; max-width: 800px; margin: 0 auto;'

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Lab Request ${escapeHtml(labRequest.request_number || labRequest.id?.slice(0, 8) || '')}</title>
<style>
  body { font-family: ${font}; color: #111; ${bodyWrap} }
  .priority-urgent { color: #dc2626; font-weight: 600; }
  ${layoutStyles}
  @media print { body { padding: 20px; } }
</style>
</head><body>
${isReceipt ? renderBrandingHeader(branding) : ''}
${bodyContent}
</body></html>`
}

/** Open print view via blob URL - loads HTML in new tab, then prints (user can Save as PDF).
 * If targetWindow is provided (opened synchronously on user click), navigate it to avoid popup blockers. */
export function openPrintWindow(html: string, title: string, targetWindow?: Window | null): boolean {
  const fullHtml = html.replace('</body>', `
  <script>
    (function() {
      function doPrint() {
        try { window.print(); } catch (e) {}
        window.onafterprint = function() { try { window.close(); } catch (e) {} };
      }
      if (document.readyState === 'complete') setTimeout(doPrint, 100);
      else window.addEventListener('load', function() { setTimeout(doPrint, 100); });
    })();
  <\/script>
  </body>`)
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const w = targetWindow && !targetWindow.closed ? targetWindow : window.open(url, '_blank', 'noopener,noreferrer')
  if (w) {
    if (targetWindow && !targetWindow.closed) targetWindow.location.href = url
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    return true
  }
  URL.revokeObjectURL(url)
  return false
}

function sanitizeFilenamePart(s: string): string {
  return (s || '')
    .replace(/\s+/g, '_')
    .replace(/[/\\:*?"<>|]/g, '')
    .trim()
    .slice(0, 80) || 'Patient'
}

/** Generate a unique filename for lab results: PatientName_RequestNumber.pdf */
export function getLabRequestPdfFilename(labRequest: any): string {
  const patientName = sanitizeFilenamePart(labRequest?.patient?.full_name || 'Patient')
  const requestNumber = sanitizeFilenamePart(labRequest?.request_number || labRequest?.id?.slice(0, 12) || 'report')
  return `${patientName}_${requestNumber}.pdf`
}

/** Generate PDF blob from HTML. Returns blob, object URL, and optional revoke callback. */
async function htmlToPdfBlob(html: string): Promise<{ blob: Blob; url: string; revoke: () => void } | null> {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;height:1100px;border:none;'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    return null
  }
  doc.open()
  doc.write(html)
  doc.close()
  await new Promise((r) => setTimeout(r, 300))
  try {
    const { default: html2canvas } = await import('html2canvas')
    const { default: jsPDF } = await import('jspdf')
    const body = doc.body
    const canvas = await html2canvas(body, { scale: 2, useCORS: true, logging: false })
    document.body.removeChild(iframe)
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfW = pdf.internal.pageSize.getWidth()
    const pdfH = (canvas.height * pdfW) / canvas.width
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfW, pdfH)
    const blob = pdf.output('blob')
    const url = URL.createObjectURL(blob)
    return {
      blob,
      url,
      revoke: () => URL.revokeObjectURL(url),
    }
  } catch (e) {
    console.error('[print] PDF error:', e)
    document.body.removeChild(iframe)
    return null
  }
}

/** Generate PDF using jsPDF + html2canvas and open in new tab.
 * If targetWindow is provided (opened synchronously on user click), navigate it to the blob URL
 * to avoid popup blockers. Otherwise falls back to window.open or download. */
async function htmlToPdfAndOpen(html: string, targetWindow?: Window | null): Promise<boolean> {
  const result = await htmlToPdfBlob(html)
  if (!result) return false
  const { url } = result
  setTimeout(() => result.revoke(), 60000)

  if (targetWindow && !targetWindow.closed) {
    targetWindow.location.href = url
    return true
  }
  const w = window.open(url, '_blank', 'noopener,noreferrer')
  if (w) return true
  const a = document.createElement('a')
  a.href = url
  a.download = 'lab-results.pdf'
  a.click()
  return true
}

export async function openPdfPrescription(prescription: any, branding?: DocumentBranding | null, targetWindow?: Window | null): Promise<boolean> {
  return htmlToPdfAndOpen(getPrescriptionPrintHtml(prescription, branding), targetWindow)
}

/** Generate a unique filename for prescription: PatientName_RX-Number.pdf */
export function getPrescriptionPdfFilename(prescription: any): string {
  const patientName = sanitizeFilenamePart(prescription?.patient?.full_name || 'Patient')
  const rxNumber = sanitizeFilenamePart(prescription?.prescription_number || prescription?.id?.slice(0, 12) || 'RX')
  return `${patientName}_${rxNumber}.pdf`
}

/** Generate prescription PDF as blob + URL for in-app viewing/download. Returns blob, url, filename. Caller must revoke URL when done. */
export async function generatePrescriptionPdf(
  prescription: any,
  branding?: DocumentBranding | null
): Promise<{ blob: Blob; url: string; filename: string; revoke: () => void } | null> {
  const html = getPrescriptionPrintHtml(prescription, branding)
  const result = await htmlToPdfBlob(html)
  if (!result) return null
  const filename = getPrescriptionPdfFilename(prescription)
  return {
    blob: result.blob,
    url: result.url,
    filename,
    revoke: result.revoke,
  }
}

/** Download prescription PDF directly without opening a new tab. Triggers browser download. */
export async function downloadPrescriptionPdf(
  prescription: any,
  branding?: DocumentBranding | null
): Promise<boolean> {
  const result = await generatePrescriptionPdf(prescription, branding)
  if (!result) return false
  const a = document.createElement('a')
  a.href = result.url
  a.download = result.filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  result.revoke()
  return true
}

export async function openPdfLabRequest(
  labRequest: any,
  branding?: DocumentBranding | null,
  options?: { labReportTemplate?: LabReportTemplate | null; labId?: string; reportId?: string; baseUrl?: string; targetWindow?: Window | null }
): Promise<boolean> {
  return htmlToPdfAndOpen(getLabRequestPrintHtml(labRequest, branding, options), options?.targetWindow)
}

/** Generate lab request PDF as blob + URL for in-app viewing/download. Returns blob, url, filename. Caller must revoke URL when done. */
export async function generateLabRequestPdf(
  labRequest: any,
  branding?: DocumentBranding | null,
  options?: { labReportTemplate?: LabReportTemplate | null; labId?: string; reportId?: string; baseUrl?: string }
): Promise<{ blob: Blob; url: string; filename: string; revoke: () => void } | null> {
  const html = getLabRequestPrintHtml(labRequest, branding, options)
  const result = await htmlToPdfBlob(html)
  if (!result) return null
  const filename = getLabRequestPdfFilename(labRequest)
  return {
    blob: result.blob,
    url: result.url,
    filename,
    revoke: result.revoke,
  }
}

/** Download lab request PDF directly without opening a new tab. Triggers browser download. */
export async function downloadLabRequestPdf(
  labRequest: any,
  branding?: DocumentBranding | null,
  options?: { labReportTemplate?: LabReportTemplate | null; labId?: string; reportId?: string; baseUrl?: string }
): Promise<boolean> {
  const result = await generateLabRequestPdf(labRequest, branding, options)
  if (!result) return false
  const a = document.createElement('a')
  a.href = result.url
  a.download = result.filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  result.revoke()
  return true
}
