// Document-rendering component (SPECS.md §6). Turns structured estimate
// data plus a resolved template configuration into a paginated A4 PDF:
// cover, chapters/tables, repeated header/footer, page numbers and a final
// total/signature section. Pagination is delegated entirely to react-pdf's
// layout engine rather than hard-coded page breaks.

import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import type { EstimateDocumentData } from './types';
import { defaultDocumentTemplate, resolveColumnValue, resolveFontSizes } from './templateConfig';
import type { CoverPosition, DocumentTemplateConfig, ResolvedFontSizes } from './templateConfig';
import { calculateChapterTotal, calculateEstimateTotal } from '../domain/calculations';
import { resolveEstimateContact } from '../domain/contact';
import { hasPaymentConditions } from '../domain/paymentConditions';
import type { PaymentConditions } from '../domain/models';
// The i18n singleton (not the useTranslation() hook) — this component is
// rendered outside the app's normal React tree, directly through
// react-pdf's pdf()/renderToBuffer APIs, so there's no I18nextProvider
// around it. Reading i18n.t() straight off the instance still picks up
// whatever language the user has selected (Settings), since it's the same
// global instance the rest of the app uses.
import i18n from '../i18n';

// A4 page dimensions in points (react-pdf's own size="A4" values). Used to
// size full-bleed background images explicitly: percentage width/height on
// an absolutely positioned child resolves against the *content* box (i.e.
// shrunk by the Page's own padding), not the full page, which left a gap —
// "missing bottom line" — at the page edge. Explicit point values sidestep
// that percentage resolution entirely.
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

// react-pdf hyphenates long words by default ("presu- puesto"). Returning
// each word as a single, unsplittable syllable makes the cover title wrap
// only between whole words.
const wholeWordsOnly = (word: string): string[] => [word];

// Splits a CoverPosition ('top-left', 'middle-center', ...) into its two
// independent axes.
function parseCoverPosition(position: CoverPosition): {
  vertical: 'top' | 'middle' | 'bottom';
  horizontal: 'left' | 'center' | 'right';
} {
  const [vertical, horizontal] = position.split('-') as [
    'top' | 'middle' | 'bottom',
    'left' | 'center' | 'right',
  ];
  return { vertical, horizontal };
}

const JUSTIFY_BY_VERTICAL = {
  top: 'flex-start',
  middle: 'center',
  bottom: 'flex-end',
} as const;

const ALIGN_BY_HORIZONTAL = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
} as const;

/**
 * Style for a full-page absolutely positioned overlay (top/left/right/
 * bottom all 0, so it always covers the exact page bounds regardless of the
 * Page's own padding — see the A4_WIDTH_PT/A4_HEIGHT_PT comment above for
 * why an explicit inset like this, rather than a percentage size, is what
 * reliably spans the full page in react-pdf) whose single child is placed
 * at the given 3x3 grid position via flexbox justify/align, with its own
 * `padding: margin` keeping that content off the page edges.
 */
function coverPositionOverlayStyle(position: CoverPosition, margin: number) {
  const { vertical, horizontal } = parseCoverPosition(position);
  return {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: margin,
    flexDirection: 'column' as const,
    justifyContent: JUSTIFY_BY_VERTICAL[vertical],
    alignItems: ALIGN_BY_HORIZONTAL[horizontal],
  };
}

const PAGE_PADDING_VERTICAL = 64;

/**
 * Vertical space (pt) kept free at the end of the flow for the bottom-pinned
 * total + signature block, so the conditions text can never run underneath
 * it. Derived from the block's own styles below (total row + caption +
 * paddings/margins, signature label + its 40pt signing gap + line), with
 * ~1.2 line height per text line plus some slack for a label that wraps.
 */
function closingBlockReservedHeight(
  sizes: ResolvedFontSizes,
  paymentConditions: PaymentConditions,
  contentWidth: number
): number {
  const line = (fontSize: number) => fontSize * 1.2;
  const total = 1 + 8 + line(sizes.total) + 2 + line(totalCaptionSize(sizes)) + 24;
  const signature = line(sizes.signature) + 40 + 1 + 4 + line(sizes.signature - 1);
  const slack = 24;
  return Math.ceil(
    total + signature + slack + paymentConditionsHeight(sizes, paymentConditions, contentWidth)
  );
}

/**
 * Estimated height of the payment conditions block drawn above the total
 * (0 when there's nothing to show). Its free-text notes can be any length,
 * so their wrapped line count is estimated from character count with a
 * deliberately generous average glyph width (0.55em, wider than typical
 * Helvetica text) — overestimating only adds a little blank space above the
 * block, while underestimating would let it overlap the conditions text.
 */
function paymentConditionsHeight(
  sizes: ResolvedFontSizes,
  paymentConditions: PaymentConditions,
  contentWidth: number
): number {
  if (!hasPaymentConditions(paymentConditions)) return 0;
  const title = sizes.noteTitle * 1.2 + 4;
  const stages = paymentConditions.stages.length * (sizes.noteContent * 1.2 + 2);
  const notes = paymentConditions.notes.trim();
  let notesHeight = 0;
  if (notes) {
    const charsPerLine = Math.max(1, Math.floor(contentWidth / (sizes.noteContent * 0.55)));
    const lines = notes
      .split('\n')
      .reduce((sum, paragraph) => sum + Math.max(1, Math.ceil(paragraph.length / charsPerLine)), 0);
    notesHeight = 6 + lines * sizes.noteContent * 1.4;
  }
  return title + stages + notesHeight + PAYMENT_CONDITIONS_GAP;
}

/** Space between the payment conditions and the total line below them. */
const PAYMENT_CONDITIONS_GAP = 16;

// The "VAT not included" caption scales with the total it annotates (it was
// base - 1 next to a base + 4 total before sizes were configurable).
function totalCaptionSize(sizes: ResolvedFontSizes): number {
  return Math.max(sizes.total - 5, 6);
}

function buildStyles(template: DocumentTemplateConfig, paymentConditions: PaymentConditions) {
  const margin = template.page.marginPt;
  const { colors, typography } = template;
  const sizes = resolveFontSizes(template);

  return StyleSheet.create({
    coverPage: {
      fontFamily: typography.fontFamily,
      fontSize: typography.baseFontSize,
      color: colors.text,
    },
    coverSlogan: {
      position: 'absolute',
      bottom: 64,
      right: margin,
      textAlign: 'right',
      fontSize: sizes.coverSlogan,
      fontStyle: 'italic',
      color: colors.muted,
    },
    coverSubjectBlock: {
      maxWidth: '80%',
    },
    coverHeaderText: {
      fontSize: sizes.coverHeader,
    },
    coverSubjectText: {
      fontSize: sizes.coverSubject,
      fontWeight: 700,
    },

    introSection: {
      marginBottom: 28,
    },
    introSectionTitle: {
      fontSize: typography.headingFontSize,
      fontWeight: 700,
      marginBottom: 8,
    },
    introFieldRow: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    introFieldLabel: {
      // Wide enough for the longest label ("PERSONA DE CONTACTO") on one line.
      width: 130,
      color: colors.muted,
      textTransform: 'uppercase',
      fontSize: typography.baseFontSize - 1,
    },
    introFieldValue: {
      // Lets long values (e.g. addresses) wrap within the row.
      flex: 1,
    },
    introText: {
      fontSize: typography.baseFontSize,
      lineHeight: 1.5,
    },

    page: {
      paddingTop: PAGE_PADDING_VERTICAL,
      paddingBottom: PAGE_PADDING_VERTICAL,
      paddingHorizontal: margin,
      fontFamily: typography.fontFamily,
      fontSize: typography.baseFontSize,
      color: colors.text,
    },
    header: {
      position: 'absolute',
      top: 24,
      left: margin,
      right: margin,
      flexDirection: 'row',
      justifyContent: 'space-between',
      fontSize: typography.baseFontSize,
      color: colors.muted,
      borderBottom: `1pt solid ${colors.borderColor}`,
      paddingBottom: 6,
    },
    footer: {
      position: 'absolute',
      bottom: 24,
      left: margin,
      right: margin,
      flexDirection: 'row',
      justifyContent: 'space-between',
      fontSize: sizes.footer,
      color: colors.muted,
      borderTop: `1pt solid ${colors.borderColor}`,
      paddingTop: 6,
    },
    // Space between chapters lives at the *end* of each chapter rather than
    // above its title: a top margin also showed up at the top of a page,
    // leaving a blank gap under the header, while trailing space at a page
    // bottom is invisible.
    chapterBlock: {
      marginBottom: 16,
    },
    chapterTitleBlock: {
      marginBottom: 6,
    },
    chapterTitle: {
      fontSize: typography.headingFontSize,
      fontWeight: 700,
      marginBottom: 6,
    },
    tableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: colors.tableHeaderBackground,
      paddingVertical: 4,
      paddingHorizontal: 4,
      fontWeight: 700,
      fontSize: typography.baseFontSize - 1,
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 4,
      paddingHorizontal: 4,
      borderBottom: template.table.showBorders ? `0.5pt solid #dddddd` : undefined,
      fontSize: typography.baseFontSize,
    },
    tableCell: {
      paddingRight: 4,
    },
    chapterSubtotalRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingVertical: 4,
      paddingHorizontal: 4,
      fontSize: typography.baseFontSize,
      fontWeight: 700,
    },

    // No top margin: this section always starts on a fresh page (`break`),
    // so its title should sit right under the header like the client page's
    // title does — a margin here only added a blank gap below the header.
    finalSection: {},
    // Total + signature, pinned to the bottom of the document's last page
    // (see the final-section comment in the component). Same bottom inset as
    // the page's own paddingBottom, so it sits right above the footer.
    closingBlock: {
      position: 'absolute',
      bottom: PAGE_PADDING_VERTICAL,
      left: margin,
      right: margin,
    },
    closingBlockSpacer: {
      height: closingBlockReservedHeight(sizes, paymentConditions, A4_WIDTH_PT - 2 * margin),
    },
    totalBlock: {
      alignSelf: 'flex-end',
      width: '55%',
      borderTop: `1pt solid ${colors.text}`,
      paddingTop: 8,
      marginBottom: 24,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      fontSize: sizes.total,
      fontWeight: 700,
    },
    totalCaption: {
      fontSize: totalCaptionSize(sizes),
      color: colors.muted,
      marginTop: 2,
      textAlign: 'right',
    },
    standardNoteBlock: {},
    standardNoteTitle: {
      fontSize: sizes.noteTitle,
      fontWeight: 700,
      marginBottom: 4,
    },
    standardNoteContent: {
      fontSize: sizes.noteContent,
      lineHeight: 1.4,
      color: '#333333',
    },
    paymentConditionsBlock: {
      marginBottom: PAYMENT_CONDITIONS_GAP,
    },
    paymentStageRow: {
      flexDirection: 'row',
      fontSize: sizes.noteContent,
      marginBottom: 2,
    },
    paymentStageLabel: {
      width: 120,
    },
    paymentConditionsNotes: {
      marginTop: 6,
    },
    signatureBlock: {},
    signatureBox: {
      width: '50%',
    },
    signatureLabel: {
      fontSize: sizes.signature,
      fontWeight: 700,
      marginBottom: 40,
    },
    signatureLine: {
      borderTop: `1pt solid ${colors.text}`,
      paddingTop: 4,
      fontSize: sizes.signature - 1,
      color: colors.muted,
    },
    backgroundImage: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: A4_WIDTH_PT,
      height: A4_HEIGHT_PT,
    },
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/** e.g. 30 → "30 %", 12.5 → "12,5 %" (Spanish formatting, like formatCurrency). */
function formatPercentage(value: number): string {
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value)} %`;
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export interface EstimateDocumentProps {
  data: EstimateDocumentData;
  template?: DocumentTemplateConfig;
}

/**
 * Renders a full estimate (cover, chapters/tables, repeated header/footer,
 * final total and signature section) as a paginated A4 PDF document, driven
 * by a template configuration rather than hard-coded layout.
 */
export const EstimateDocument: React.FC<EstimateDocumentProps> = ({
  data,
  template = defaultDocumentTemplate,
}) => {
  const { estimate, customer, chapters, company, standardNote, creationLocation } = data;
  const contact = resolveEstimateContact(estimate, customer);
  const clientFields: Array<[string, string]> = [
    ['rendering.nameLabel', customer.name],
    ['rendering.taxIdLabel', customer.taxId],
    ['rendering.addressLabel', customer.address],
    ['rendering.emailLabel', customer.email],
    ['rendering.contactPersonLabel', contact.name],
    ['rendering.phoneLabel', contact.phone],
    ['rendering.siteLabel', estimate.site],
  ];
  const styles = buildStyles(template, estimate.paymentConditions);
  const total = calculateEstimateTotal({ ...estimate, chapters });
  const dateLabel = creationLocation
    ? `${creationLocation}, a ${formatDate(estimate.creationDate)}`
    : formatDate(estimate.creationDate);
  const columns = template.table.columns;
  const headerPosition = template.cover.headerPosition ?? 'top-left';
  const subjectPosition = template.cover.subjectPosition ?? 'middle-center';
  const headerHorizontal = parseCoverPosition(headerPosition).horizontal;
  const subjectHorizontal = parseCoverPosition(subjectPosition).horizontal;
  // Fine-tune nudge on top of the grid position, as plain margin on the
  // inner (aligned) block — positive X/Y moves right/down regardless of
  // which grid cell it's nudging from.
  const headerOffsetStyle = {
    marginLeft: template.cover.headerOffsetX ?? 0,
    marginTop: template.cover.headerOffsetY ?? 0,
  };
  const subjectOffsetStyle = {
    marginLeft: template.cover.subjectOffsetX ?? 0,
    marginTop: template.cover.subjectOffsetY ?? 0,
  };

  const headerBlock = template.header.showEstimateNumberAndDate && (
    <View style={styles.header} fixed>
      <Text>{i18n.t('rendering.estimateNumberLabel', { number: estimate.estimateNumber })}</Text>
      <Text>{dateLabel}</Text>
    </View>
  );

  const footerBlock = (template.footer.showPageNumbers || template.footer.showCompanyInfo) && (
    <View style={styles.footer} fixed>
      {template.footer.showCompanyInfo ? (
        <Text>
          {company.address}, {company.postalCode} · {company.phone} · {company.email}
          {company.taxId ? ` · ${company.taxId}` : ''}
        </Text>
      ) : (
        <Text />
      )}
      {template.footer.showPageNumbers ? (
        <Text
          render={({ pageNumber, totalPages }) =>
            i18n.t('rendering.pageOfLabel', { pageNumber, totalPages })
          }
        />
      ) : null}
    </View>
  );

  return (
    <Document
      title={i18n.t('rendering.documentTitle', { number: estimate.estimateNumber })}
      author={company.name}
    >
      {/* Cover page: estimate number/date and subject, each independently
          positioned on a 3x3 grid (template.cover.headerPosition /
          subjectPosition — defaults preserve the historical top-left /
          centered layout). */}
      <Page size={template.page.size} style={styles.coverPage}>
        {template.cover.backgroundImage && (
          // `fixed`: without it, react-pdf's pagination pass sees this
          // image node as normal (non-repeating) flow content, judges it
          // "bigger than available page height" against the page's padded
          // content box, and pushes the rest of the cover (title, date,
          // slogan) onto a second physical page instead of layering them
          // over the same page.
          <Image src={template.cover.backgroundImage} style={styles.backgroundImage} fixed />
        )}
        {template.cover.showCreationLocationDate && (
          <View style={coverPositionOverlayStyle(headerPosition, template.page.marginPt)}>
            <View style={{ alignItems: ALIGN_BY_HORIZONTAL[headerHorizontal], ...headerOffsetStyle }}>
              <Text style={[styles.coverHeaderText, { textAlign: headerHorizontal }]}>
                {i18n.t('rendering.estimateNumberLabel', { number: estimate.estimateNumber })}
              </Text>
              <Text style={[styles.coverHeaderText, { textAlign: headerHorizontal }]}>{dateLabel}</Text>
            </View>
          </View>
        )}

        <View style={coverPositionOverlayStyle(subjectPosition, template.page.marginPt)}>
          <View style={[styles.coverSubjectBlock, subjectOffsetStyle]}>
            <Text
              style={[styles.coverSubjectText, { textAlign: subjectHorizontal }]}
              hyphenationCallback={wholeWordsOnly}
            >
              {estimate.subject}
            </Text>
          </View>
        </View>

        {template.cover.showSlogan && company.slogan ? (
          <Text style={styles.coverSlogan}>{company.slogan}</Text>
        ) : null}
      </Page>

      {/* Second page: client details and an overall introduction to the work */}
      <Page size={template.page.size} style={styles.page} wrap>
        {template.page.backgroundImage && (
          <Image src={template.page.backgroundImage} style={styles.backgroundImage} fixed />
        )}
        {headerBlock}

        <View style={styles.introSection}>
          <Text style={styles.introSectionTitle}>{i18n.t('rendering.clientSectionTitle')}</Text>
          {/* Every row is always printed, even when its value is empty, so
              the client block has the same fixed layout on every estimate
              (and a blank can be filled in by hand on a printed copy). */}
          {clientFields.map(([labelKey, value]) => (
            <View key={labelKey} style={styles.introFieldRow}>
              <Text style={styles.introFieldLabel}>{i18n.t(labelKey)}</Text>
              <Text style={styles.introFieldValue}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.introSection}>
          <Text style={styles.introSectionTitle}>{i18n.t('rendering.introductionSectionTitle')}</Text>
          <Text style={styles.introText}>{estimate.introduction}</Text>
        </View>

        {footerBlock}
      </Page>

      {/* Content pages: chapters/tables + final section, auto-paginated */}
      <Page size={template.page.size} style={styles.page} wrap>
        {template.page.backgroundImage && (
          <Image src={template.page.backgroundImage} style={styles.backgroundImage} fixed />
        )}
        {headerBlock}

        {chapters
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((chapter, chapterIndex) => (
            <View key={chapter.id} style={styles.chapterBlock}>
              <View style={styles.chapterTitleBlock} wrap={false} minPresenceAhead={60}>
                <Text style={styles.chapterTitle}>
                  {chapterIndex + 1}. {chapter.title}
                </Text>
                <View style={styles.tableHeaderRow}>
                  {columns.map((column) => (
                    <Text
                      key={column.key}
                      style={[styles.tableCell, { width: column.width, textAlign: column.align ?? 'left' }]}
                    >
                      {column.label}
                    </Text>
                  ))}
                </View>
              </View>

              {chapter.lineItems
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((item, itemIndex) => {
                  const itemNumber = `${chapterIndex + 1}.${itemIndex + 1}`;
                  return (
                    <View key={item.id} style={styles.tableRow} wrap={false}>
                      {columns.map((column) => (
                        <Text
                          key={column.key}
                          style={[
                            styles.tableCell,
                            { width: column.width, textAlign: column.align ?? 'left' },
                          ]}
                        >
                          {resolveColumnValue(column, item, itemNumber, formatCurrency)}
                        </Text>
                      ))}
                    </View>
                  );
                })}

              {template.table.showChapterSubtotal && (
                <View style={styles.chapterSubtotalRow} wrap={false}>
                  <Text>
                    {i18n.t('rendering.chapterSubtotalLabel', {
                      amount: formatCurrency(calculateChapterTotal(chapter)),
                    })}
                  </Text>
                </View>
              )}
            </View>
          ))}

        {/* `break` unconditionally starts a new page before this section —
            the conditions/total/signature always start on their own page,
            even when there'd be room to fit them after the last chapter.
            The conditions text stays wrappable so a long one can flow across
            as many pages as it needs. */}
        <View style={styles.finalSection} break>
          <View style={styles.standardNoteBlock}>
            <Text style={styles.standardNoteTitle}>{standardNote.title}</Text>
            <Text style={styles.standardNoteContent}>{standardNote.content}</Text>
          </View>
          {/* Reserves room for the closing block at the end of the flow.
              Unsplittable, so if the conditions leave less than that on
              their last page it moves to a fresh page — which then becomes
              the document's last page, where the closing block is drawn. */}
          <View style={styles.closingBlockSpacer} wrap={false} />
        </View>

        {/* Total + signature, anchored to the bottom of the last page rather
            than following straight after the conditions. A `fixed` node is
            laid out on every page of this <Page>; `render` returns it only
            on the document's final page (this is the last <Page>, so its
            last physical page is the document's last one). Absolute
            positioning keeps it out of the flow; the spacer above guarantees
            it never overlaps the conditions. */}
        <View
          style={styles.closingBlock}
          fixed
          // react-pdf's View typings only list pageNumber/subPageNumber, but
          // after pagination it re-runs render with totalPages too (the same
          // pass that fills in "Page X of Y"). During the earlier splitting
          // pass totalPages is undefined, so nothing is drawn yet.
          render={(pageProps) =>
            pageProps.pageNumber === (pageProps as { totalPages?: number }).totalPages ? (
              <View>
                {/* Payment conditions sit just above the total, pinned with
                    it to the bottom of the last page. Their height is part
                    of closingBlockReservedHeight, so they never overlap the
                    conditions text above. */}
                {hasPaymentConditions(estimate.paymentConditions) && (
                  <View style={styles.paymentConditionsBlock}>
                    <Text style={styles.standardNoteTitle}>{i18n.t('rendering.paymentConditionsTitle')}</Text>
                    {estimate.paymentConditions.stages.map((stage) => (
                      <View key={stage.type} style={styles.paymentStageRow}>
                        <Text style={styles.paymentStageLabel}>
                          {i18n.t(`rendering.paymentStages.${stage.type}`)}
                        </Text>
                        <Text>{formatPercentage(stage.percentage)}</Text>
                      </View>
                    ))}
                    {estimate.paymentConditions.notes.trim() !== '' && (
                      <Text style={[styles.standardNoteContent, styles.paymentConditionsNotes]}>
                        {estimate.paymentConditions.notes}
                      </Text>
                    )}
                  </View>
                )}
                <View style={styles.totalBlock} wrap={false}>
                  <View style={styles.totalRow}>
                    <Text>{template.finalPage.totalLabel}</Text>
                    <Text>{formatCurrency(total)}</Text>
                  </View>
                  <Text style={styles.totalCaption}>{i18n.t('rendering.totalCaption')}</Text>
                </View>

                <View style={styles.signatureBlock} wrap={false}>
                  <View style={styles.signatureBox}>
                    <Text style={styles.signatureLabel}>{template.finalPage.signatureLabel}</Text>
                    <Text style={styles.signatureLine}>{customer.name}</Text>
                  </View>
                </View>
              </View>
            ) : null
          }
        />

        {footerBlock}
      </Page>
    </Document>
  );
};

export default EstimateDocument;

/**
 * Builds the element to hand to react-pdf's render/export APIs (`pdf()`,
 * `renderToBuffer`, ...), which are typed to accept a `<Document>` element
 * directly rather than an element of a component that returns one.
 */
export function createEstimateDocumentElement(
  data: EstimateDocumentData,
  template: DocumentTemplateConfig = defaultDocumentTemplate
): React.ReactElement<DocumentProps> {
  return React.createElement(EstimateDocument, { data, template }) as unknown as React.ReactElement<DocumentProps>;
}
