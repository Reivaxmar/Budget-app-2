// Document-rendering component (SPECS.md §6). Turns structured estimate
// data plus a resolved template configuration into a paginated A4 PDF:
// cover, chapters/tables, repeated header/footer, page numbers and a final
// total/signature section. Pagination is delegated entirely to react-pdf's
// layout engine rather than hard-coded page breaks.

import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import type { EstimateDocumentData } from './types';
import { defaultDocumentTemplate, resolveColumnValue } from './templateConfig';
import type { DocumentTemplateConfig } from './templateConfig';
import { calculateChapterTotal, calculateEstimateTotal } from '../domain/calculations';

function buildStyles(template: DocumentTemplateConfig) {
  const margin = template.page.marginPt;
  const { colors, typography } = template;

  return StyleSheet.create({
    coverPage: {
      padding: margin,
      fontFamily: typography.fontFamily,
      fontSize: typography.baseFontSize,
      color: colors.text,
      justifyContent: 'center',
      alignItems: 'center',
    },
    coverTopLeft: {
      position: 'absolute',
      top: margin,
      left: margin,
      textAlign: 'left',
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
    coverLabel: {
      fontSize: typography.baseFontSize,
      color: colors.muted,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    coverSubjectBlock: {
      maxWidth: '80%',
      alignItems: 'center',
    },
    coverSubjectText: {
      fontSize: typography.titleFontSize,
      fontWeight: 700,
      textAlign: 'center',
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

  const headerBlock = template.header.showEstimateNumberAndDate && (
    <View style={styles.header} fixed>
      <Text>Estimate No. {estimate.estimateNumber}</Text>
      <Text>{dateLabel}</Text>
    </View>
  );

  const footerBlock = (template.footer.showPageNumbers || template.footer.showCompanyInfo) && (
    <View style={styles.footer} fixed>
      {template.footer.showCompanyInfo ? (
        <Text>
          {company.address}, {company.postalCode} · {company.phone} · {company.email}
        </Text>
      ) : (
        <Text />
      )}
      {template.footer.showPageNumbers ? (
        <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      ) : null}
    </View>
  );

  return (
    <Document title={`Estimate ${estimate.estimateNumber}`} author={company.name}>
      {/* Cover page: estimate number + date top-left, subject centered */}
      <Page size={template.page.size} style={styles.coverPage}>
        {template.cover.showCreationLocationDate && (
          <View style={styles.coverTopLeft}>
            <Text>Estimate No. {estimate.estimateNumber}</Text>
            <Text>{dateLabel}</Text>
          </View>
        )}

        <View style={styles.coverSubjectBlock}>
          <Text style={styles.coverLabel}>Subject</Text>
          <Text style={styles.coverSubjectText}>{estimate.subject}</Text>
        </View>

        {template.cover.showSlogan && company.slogan ? (
          <Text style={styles.coverSlogan}>{company.slogan}</Text>
        ) : null}
      </Page>

      {/* Second page: client details and an overall introduction to the work */}
      <Page size={template.page.size} style={styles.page} wrap>
        {headerBlock}

        <View style={styles.introSection}>
          <Text style={styles.introSectionTitle}>Client</Text>
          <View style={styles.introFieldRow}>
            <Text style={styles.introFieldLabel}>Name</Text>
            <Text>{customer.name}</Text>
          </View>
          <View style={styles.introFieldRow}>
            <Text style={styles.introFieldLabel}>Phone</Text>
            <Text>{customer.phone}</Text>
          </View>
          <View style={styles.introFieldRow}>
            <Text style={styles.introFieldLabel}>Email</Text>
            <Text>{customer.email}</Text>
          </View>
          <View style={styles.introFieldRow}>
            <Text style={styles.introFieldLabel}>Site</Text>
            <Text>{estimate.site}</Text>
          </View>
        </View>

        <View style={styles.introSection}>
          <Text style={styles.introSectionTitle}>Introduction</Text>
          <Text style={styles.introText}>{estimate.introduction}</Text>
        </View>

        {footerBlock}
      </Page>

      {/* Content pages: chapters/tables + final section, auto-paginated */}
      <Page size={template.page.size} style={styles.page} wrap>
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

              <View style={styles.chapterSubtotalRow} wrap={false}>
                <Text>Chapter subtotal: {formatCurrency(calculateChapterTotal(chapter))}</Text>
              </View>
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
            <Text style={styles.totalCaption}>{template.finalPage.totalCaption}</Text>
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
