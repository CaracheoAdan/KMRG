import { Alert, Platform, Share } from 'react-native';
import {
  LetterExtraData,
  LoveReason,
  Message,
  Milestone,
  SpecialPlace,
} from '../types';
import {
  calculateTimeTogether,
  formatDisplayDate,
  parseLetterContentAndPhoto,
  toLocalDateString,
} from './StorageService';

let PrintModule: any = null;
let SharingModule: any = null;

try {
  PrintModule = require('expo-print');
} catch {
  PrintModule = null;
}

try {
  SharingModule = require('expo-sharing');
} catch {
  SharingModule = null;
}

function escapeHtml(raw?: string | null): string {
  if (!raw) return '';
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface ExportBookOptions {
  anniversaryDate?: string;
  primaryColor?: string;
  loveReasons?: LoveReason[];
  messages?: Message[];
  milestones?: Milestone[];
  places?: SpecialPlace[];
  letterExtras?: Record<string, LetterExtraData>;
}

/**
 * Genera el HTML con diseño editorial de libro imprimible (A4)
 * reuniendo razones, cartas (con fotos y reacciones) y recuerdos fotográficos.
 */
export function generatePrintableBookHtml(options: ExportBookOptions): string {
  const {
    anniversaryDate = '2024-02-14',
    primaryColor = '#9333ea',
    loveReasons = [],
    messages = [],
    milestones = [],
    places = [],
    letterExtras = {},
  } = options;

  const todayStr = toLocalDateString(new Date());
  const breakdown = calculateTimeTogether(anniversaryDate);
  const annivFormatted = formatDisplayDate(anniversaryDate, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const printedDate = formatDisplayDate(new Date(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Filtrar cartas desbloqueadas hasta hoy y ordenarlas cronológicamente
  const unlockedLetters = [...messages]
    .filter((m) => toLocalDateString(m.scheduled_date) <= todayStr)
    .sort((a, b) =>
      toLocalDateString(a.scheduled_date).localeCompare(toLocalDateString(b.scheduled_date))
    );

  const sortedMilestones = [...milestones].sort((a, b) =>
    toLocalDateString(a.date).localeCompare(toLocalDateString(b.date))
  );

  const reasonsHtml =
    loveReasons.length > 0
      ? loveReasons
          .map(
            (r, idx) => `
          <div class="reason-card">
            <div class="reason-num">#${idx + 1}</div>
            <div class="reason-body">
              <p class="reason-text">“${escapeHtml(r.text)}”</p>
              <span class="reason-author">— Escrito por ${r.author === 'Karla' ? 'Karlita' : 'Javier'}</span>
            </div>
          </div>`
          )
          .join('')
      : `<p class="empty-note">Cada día descubrimos nuevas razones para amarnos.</p>`;

  const lettersHtml =
    unlockedLetters.length > 0
      ? unlockedLetters
          .map((m) => {
            const extra = letterExtras[m.id];
            const parsed = parseLetterContentAndPhoto(m.content, extra?.photoUrl);
            const senderName = m.sender === 'Karla' ? 'Karlita' : 'Javier';
            const recipientName = m.recipient === 'Karla' ? 'Karlita' : 'Javier';
            const dateLabel = formatDisplayDate(m.scheduled_date, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });
            const color = m.theme_color || primaryColor;

            return `
            <div class="letter-card" style="border-left: 5px solid ${escapeHtml(color)};">
              <div class="letter-header">
                <span class="letter-date">${escapeHtml(dateLabel)}</span>
                <span class="letter-meta">De <strong>${senderName}</strong> para <strong>${recipientName}</strong></span>
              </div>
              <p class="letter-content">“${escapeHtml(parsed.text).replace(/\n/g, '<br/>')}”</p>
              ${
                parsed.photoUrl
                  ? `<div class="letter-photo-wrap"><img src="${escapeHtml(parsed.photoUrl)}" class="letter-photo" alt="Foto en carta" /></div>`
                  : ''
              }
              ${
                extra?.reaction || extra?.replyText
                  ? `<div class="letter-reply-box">
                      ${extra.reaction ? `<span class="letter-reaction-badge">Reacción: ${escapeHtml(extra.reaction)}</span>` : ''}
                      ${
                        extra.replyText
                          ? `<p class="letter-reply-text">💌 <strong>Nota de agradecimiento (${
                              extra.repliedBy === 'Karla' ? 'Karlita' : 'Javier'
                            }):</strong> “${escapeHtml(extra.replyText)}”</p>`
                          : ''
                      }
                    </div>`
                  : ''
              }
            </div>`;
          })
          .join('')
      : `<p class="empty-note">Nuestras cartas aparecerán aquí conforme se vayan abriendo.</p>`;

  const milestonesHtml =
    sortedMilestones.length > 0
      ? `<div class="memories-grid">
          ${sortedMilestones
            .map(
              (ms) => `
            <div class="memory-item">
              ${
                ms.image_url
                  ? `<img src="${escapeHtml(ms.image_url)}" class="memory-img" alt="${escapeHtml(ms.title)}" />`
                  : ''
              }
              <div class="memory-caption">
                <div class="memory-title">${escapeHtml(ms.title)}</div>
                <div class="memory-date">${escapeHtml(
                  formatDisplayDate(ms.date, { day: 'numeric', month: 'short', year: 'numeric' })
                )}</div>
              </div>
            </div>`
            )
            .join('')}
        </div>`
      : `<p class="empty-note">Aún no hay fotografías en el álbum.</p>`;

  const placesHtml =
    places.length > 0
      ? `<div class="places-list">
          ${places
            .map(
              (p) => `
            <div class="place-item">
              <div class="place-title">📍 ${escapeHtml(p.title)} <span class="place-cat">(${escapeHtml(p.category)})</span></div>
              ${p.notes ? `<div class="place-notes">“${escapeHtml(p.notes)}”</div>` : ''}
            </div>`
            )
            .join('')}
        </div>`
      : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Nuestro Libro de Amor - Karlita & Javier</title>
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      color: #1e293b;
      background: #ffffff;
      line-height: 1.6;
    }
    .cover-page {
      min-height: 92vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      border: 3px double ${escapeHtml(primaryColor)};
      border-radius: 24px;
      padding: 48px 36px;
      background: linear-gradient(180deg, #faf5ff 0%, #ffffff 100%);
      page-break-after: always;
    }
    .cover-emblem {
      font-size: 56px;
      margin-bottom: 16px;
    }
    .cover-subtitle-top {
      font-family: sans-serif;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: ${escapeHtml(primaryColor)};
      margin-bottom: 12px;
    }
    .cover-title {
      font-size: 38px;
      font-weight: bold;
      color: #0f172a;
      margin-bottom: 10px;
    }
    .cover-names {
      font-size: 24px;
      font-style: italic;
      color: ${escapeHtml(primaryColor)};
      margin-bottom: 28px;
    }
    .cover-stats-box {
      display: inline-block;
      padding: 16px 32px;
      border-radius: 18px;
      background: #ffffff;
      border: 1.5px solid ${escapeHtml(primaryColor)}40;
      margin-bottom: 28px;
    }
    .cover-days {
      font-family: sans-serif;
      font-size: 28px;
      font-weight: 800;
      color: ${escapeHtml(primaryColor)};
    }
    .cover-since {
      font-size: 14px;
      color: #64748b;
      margin-top: 4px;
    }
    .cover-quote {
      max-width: 440px;
      font-size: 15px;
      font-style: italic;
      color: #475569;
      margin-top: 16px;
    }
    .cover-footer {
      margin-top: 48px;
      font-family: sans-serif;
      font-size: 11px;
      color: #94a3b8;
    }
    .chapter {
      margin-top: 24px;
      margin-bottom: 32px;
    }
    .chapter-break {
      page-break-before: always;
    }
    .chapter-header {
      border-bottom: 2px solid ${escapeHtml(primaryColor)}35;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .chapter-tag {
      font-family: sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: ${escapeHtml(primaryColor)};
    }
    .chapter-title {
      font-size: 24px;
      color: #0f172a;
      margin-top: 2px;
    }
    .reason-card {
      display: flex;
      gap: 14px;
      padding: 14px 18px;
      margin-bottom: 12px;
      background: #fdf4ff;
      border-radius: 14px;
      border: 1px solid #f3e8ff;
      page-break-inside: avoid;
    }
    .reason-num {
      font-family: sans-serif;
      font-weight: 800;
      font-size: 15px;
      color: ${escapeHtml(primaryColor)};
      min-width: 32px;
    }
    .reason-text {
      font-size: 15px;
      color: #1e293b;
      margin-bottom: 4px;
    }
    .reason-author {
      font-family: sans-serif;
      font-size: 11px;
      color: #64748b;
    }
    .letter-card {
      background: #fffdf9;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 18px 20px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .letter-header {
      display: flex;
      justify-content: space-between;
      font-family: sans-serif;
      font-size: 12px;
      color: #64748b;
      margin-bottom: 10px;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 6px;
    }
    .letter-date {
      font-weight: 700;
      color: ${escapeHtml(primaryColor)};
    }
    .letter-content {
      font-size: 15.5px;
      color: #1e293b;
      font-style: italic;
      margin-bottom: 10px;
    }
    .letter-photo-wrap {
      margin-top: 10px;
      margin-bottom: 8px;
      text-align: center;
    }
    .letter-photo {
      max-width: 260px;
      max-height: 220px;
      border-radius: 10px;
      object-fit: cover;
      border: 3px solid #ffffff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    }
    .letter-reply-box {
      margin-top: 10px;
      padding: 10px 14px;
      background: #f8fafc;
      border-radius: 10px;
      border-left: 3px solid ${escapeHtml(primaryColor)};
      font-family: sans-serif;
      font-size: 12.5px;
    }
    .letter-reaction-badge {
      display: inline-block;
      font-weight: 700;
      margin-bottom: 4px;
      color: #0f172a;
    }
    .letter-reply-text {
      color: #334155;
    }
    .memories-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .memory-item {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
      background: #ffffff;
      page-break-inside: avoid;
    }
    .memory-img {
      width: 100%;
      height: 190px;
      object-fit: cover;
      display: block;
    }
    .memory-caption {
      padding: 10px 14px;
    }
    .memory-title {
      font-family: sans-serif;
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .memory-date {
      font-family: sans-serif;
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .places-list {
      margin-top: 18px;
    }
    .place-item {
      padding: 10px 14px;
      border-bottom: 1px solid #f1f5f9;
      page-break-inside: avoid;
    }
    .place-title {
      font-family: sans-serif;
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .place-cat {
      font-weight: 400;
      color: #64748b;
      font-size: 12px;
    }
    .place-notes {
      font-size: 13px;
      color: #475569;
      font-style: italic;
      margin-top: 3px;
    }
    .empty-note {
      font-style: italic;
      color: #94a3b8;
      padding: 12px 0;
    }
  </style>
</head>
<body>
  <!-- PORTADA -->
  <div class="cover-page">
    <div class="cover-emblem">📖💜</div>
    <div class="cover-subtitle-top">Edición Especial Imprimible</div>
    <h1 class="cover-title">Nuestro Libro de Amor</h1>
    <div class="cover-names">Karlita &amp; Javier</div>
    <div class="cover-stats-box">
      <div class="cover-days">${breakdown.totalDays} Días Juntos</div>
      <div class="cover-since">Desde el ${escapeHtml(annivFormatted)}</div>
    </div>
    <p class="cover-quote">
      “Cada carta, cada fotografía y cada instante guardado en este libro es un pedacito de nuestra historia juntos.”
    </p>
    <div class="cover-footer">
      ${unlockedLetters.length} cartas • ${sortedMilestones.length} recuerdos • ${loveReasons.length} razones • Exportado el ${escapeHtml(printedDate)}
    </div>
  </div>

  <!-- CAPÍTULO 1: RAZONES -->
  <div class="chapter">
    <div class="chapter-header">
      <div class="chapter-tag">Capítulo I</div>
      <h2 class="chapter-title">Razones por las que te Amo (${loveReasons.length})</h2>
    </div>
    ${reasonsHtml}
  </div>

  <!-- CAPÍTULO 2: CARTAS -->
  <div class="chapter chapter-break">
    <div class="chapter-header">
      <div class="chapter-tag">Capítulo II</div>
      <h2 class="chapter-title">Nuestras Cartas de Amor (${unlockedLetters.length})</h2>
    </div>
    ${lettersHtml}
  </div>

  <!-- CAPÍTULO 3: ÁLBUM Y LUGARES -->
  <div class="chapter chapter-break">
    <div class="chapter-header">
      <div class="chapter-tag">Capítulo III</div>
      <h2 class="chapter-title">Álbum de Recuerdos y Lugares (${sortedMilestones.length})</h2>
    </div>
    ${milestonesHtml}
    ${placesHtml}
  </div>
</body>
</html>`;
}

/**
 * Genera el archivo PDF de "Nuestro Libro" y abre el menú nativo para guardarlo o imprimirlo.
 */
export async function exportCoupleBookToPdf(options: ExportBookOptions): Promise<boolean> {
  try {
    const html = generatePrintableBookHtml(options);

    if (Platform.OS === 'web') {
      if (PrintModule?.printAsync) {
        await PrintModule.printAsync({ html });
        return true;
      }
      if (typeof window !== 'undefined') {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(html);
          win.document.close();
          win.focus();
          win.print();
          return true;
        }
      }
      return false;
    }

    if (PrintModule?.printToFileAsync) {
      const { uri } = await PrintModule.printToFileAsync({
        html,
        base64: false,
      });

      if (SharingModule?.shareAsync) {
        const available = await SharingModule.isAvailableAsync().catch(() => false);
        if (available) {
          await SharingModule.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Guardar o Imprimir Nuestro Libro de Amor (PDF)',
            UTI: 'com.adobe.pdf',
          });
          return true;
        }
      }

      await Share.share({
        url: uri,
        title: 'Nuestro Libro de Amor (PDF)',
        message: '📖 Nuestro Libro de Amor — Karlita & Javier',
      });
      return true;
    }

    Alert.alert('Aviso', 'El módulo de impresión PDF no está disponible en este dispositivo.');
    return false;
  } catch (error) {
    console.warn('[BookExportService] Error exportando libro PDF:', error);
    Alert.alert('Error', 'No se pudo generar el archivo PDF en este momento.');
    return false;
  }
}
