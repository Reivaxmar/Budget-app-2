// Document-rendering component (SPECS.md §6). Turns structured estimate
// data plus a resolved template configuration into a paginated A4 PDF:
// cover, chapters/tables, repeated header/footer, page numbers and a final
// total/signature section. Pagination is delegated entirely to react-pdf's
// layout engine rather than hard-coded page breaks.

import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import type { EstimateDocumentData } from './types';
import { defaultDocumentTemplate, resolveColumnValue } from './templateConfig';
import type { CoverPosition, DocumentTemplateConfig } from './templateConfig';
import { calculateChapterTotal, calculateEstimateTotal } from '../domain/calculations';
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

function buildStyles(template: DocumentTemplateConfig) {
  const margin = template.page.marginPt;
  const { colors, typography } = template;

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
      fontSize: typography.baseFontSize + 2,
      fontStyle: 'italic',
      color: colors.muted,
    },
    coverSubjectBlock: {
      maxWidth: '80%',
    },
    coverSubjectText: {
      fontSize: typography.titleFontSize,
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
      width: 110,
      color: colors.muted,
      textTransform: 'uppercase',
      fontSize: typography.baseFontSize - 1,
    },
    introText: {
      fontSize: typography.baseFontSize,
      lineHeight: 1.5,
    },

    page: {
      paddingTop: 64,
      paddingBottom: 64,
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
      fontSize: typography.baseFontSize - 1,
      color: colors.muted,
      borderTop: `1pt solid ${colors.borderColor}`,
      paddingTop: 6,
    },
    chapterTitleBlock: {
      marginTop: 16,
      marginBottom: 6,
    },
    chapterTitle: {
      fontSize: typography.headingFontSize,
      fontWeight: 700,
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

    finalSection: {
      marginTop: 28,
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
      fontSize: typography.baseFontSize + 4,
      fontWeight: 700,
    },
    totalCaption: {
      fontSize: typography.baseFontSize - 1,
      color: colors.muted,
      marginTop: 2,
      textAlign: 'right',
    },
    standardNoteBlock: {
      marginTop: 12,
      marginBottom: 40,
    },
    standardNoteTitle: {
      fontSize: typography.baseFontSize + 1,
      fontWeight: 700,
      marginBottom: 4,
    },
    standardNoteContent: {
      fontSize: typography.baseFontSize,
      lineHeight: 1.4,
      color: '#333333',
    },
    signatureBlock: {
      marginTop: 40,
    },
    signatureBox: {
      width: '50%',
    },
    signatureLabel: {
      fontSize: typography.baseFontSize,
      fontWeight: 700,
      marginBottom: 40,
    },
    signatureLine: {
      borderTop: `1pt solid ${colors.text}`,
      paddingTop: 4,
      fontSize: typography.baseFontSize - 1,
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
  const styles = buildStyles(template);
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
              <Text style={{ textAlign: headerHorizontal }}>
                {i18n.t('rendering.estimateNumberLabel', { number: estimate.estimateNumber })}
              </Text>
              <Text style={{ textAlign: headerHorizontal }}>{dateLabel}</Text>
            </View>
          </View>
        )}

        <View style={coverPositionOverlayStyle(subjectPosition, template.page.marginPt)}>
          <View style={[styles.coverSubjectBlock, subjectOffsetStyle]}>
            <Text style={[styles.coverSubjectText, { textAlign: subjectHorizontal }]}>
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
          <View style={styles.introFieldRow}>
            <Text style={styles.introFieldLabel}>{i18n.t('rendering.nameLabel')}</Text>
            <Text>{customer.name}</Text>
          </View>
          <View style={styles.introFieldRow}>
            <Text style={styles.introFieldLabel}>{i18n.t('rendering.phoneLabel')}</Text>
            <Text>{customer.phone}</Text>
          </View>
          <View style={styles.introFieldRow}>
            <Text style={styles.introFieldLabel}>{i18n.t('rendering.emailLabel')}</Text>
            <Text>{customer.email}</Text>
          </View>
          <View style={styles.introFieldRow}>
            <Text style={styles.introFieldLabel}>{i18n.t('rendering.siteLabel')}</Text>
            <Text>{estimate.site}</Text>
          </View>
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
            <View key={chapter.id}>
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
            the total/note/signature always get their own page, even when
            there'd be room to fit them after the last chapter. */}
        <View style={styles.finalSection} wrap={false} break>
          <View style={styles.totalBlock}>
            <View style={styles.totalRow}>
              <Text>{template.finalPage.totalLabel}</Text>
              <Text>{formatCurrency(total)}</Text>
            </View>
            <Text style={styles.totalCaption}>{i18n.t('rendering.totalCaption')}</Text>
          </View>

          <View style={styles.standardNoteBlock}>
            <Text style={styles.standardNoteTitle}>{standardNote.title}</Text>
            <Text style={styles.standardNoteContent}>{standardNote.content}</Text>
          </View>

          <View style={styles.signatureBlock}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>{template.finalPage.signatureLabel}</Text>
              <Text style={styles.signatureLine}>{customer.name}</Text>
            </View>
          </View>
        </View>

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
