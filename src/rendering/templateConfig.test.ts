import { describe, expect, it } from 'vitest';
import { defaultDocumentTemplate, resolveFontSizes } from './templateConfig';

describe('resolveFontSizes', () => {
  it('derives every unset size from the body size (the historical fixed offsets)', () => {
    const template = {
      ...defaultDocumentTemplate,
      typography: { ...defaultDocumentTemplate.typography, baseFontSize: 10, titleFontSize: 30 },
    };

    expect(resolveFontSizes(template)).toEqual({
      coverHeader: 10,
      coverSubject: 30,
      coverSlogan: 12,
      footer: 9,
      noteTitle: 11,
      noteContent: 10,
      total: 14,
      signature: 10,
    });
  });

  it('uses explicit per-part sizes when the template sets them', () => {
    const template = {
      ...defaultDocumentTemplate,
      cover: { ...defaultDocumentTemplate.cover, headerFontSize: 14, sloganFontSize: 16 },
      footer: { ...defaultDocumentTemplate.footer, fontSize: 7 },
      finalPage: {
        ...defaultDocumentTemplate.finalPage,
        noteTitleFontSize: 13,
        noteContentFontSize: 8,
        totalFontSize: 20,
        signatureFontSize: 11,
      },
    };

    expect(resolveFontSizes(template)).toMatchObject({
      coverHeader: 14,
      coverSlogan: 16,
      footer: 7,
      noteTitle: 13,
      noteContent: 8,
      total: 20,
      signature: 11,
    });
  });
});
