import { describe, expect, it } from 'vitest';
import { emptyFormState, formStateToTemplateConfig, templateToFormState } from './TemplateForm';
import { defaultDocumentTemplate } from '../rendering/templateConfig';

describe('TemplateForm font size fields', () => {
  it('leaves per-part sizes unset (automatic) for a new template', () => {
    const config = formStateToTemplateConfig(emptyFormState());

    expect(config.cover.headerFontSize).toBeUndefined();
    expect(config.cover.sloganFontSize).toBeUndefined();
    expect(config.footer.fontSize).toBeUndefined();
    expect(config.finalPage.totalFontSize).toBeUndefined();
  });

  it('round-trips explicit per-part sizes through the form state', () => {
    const template = {
      ...defaultDocumentTemplate,
      name: 'Big total',
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

    const config = formStateToTemplateConfig(templateToFormState(template));

    expect(config.cover).toMatchObject({ headerFontSize: 14, sloganFontSize: 16 });
    expect(config.footer.fontSize).toBe(7);
    expect(config.finalPage).toMatchObject({
      noteTitleFontSize: 13,
      noteContentFontSize: 8,
      totalFontSize: 20,
      signatureFontSize: 11,
    });
  });
});
