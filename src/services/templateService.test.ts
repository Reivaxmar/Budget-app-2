import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  getDefaultTemplate,
  listTemplates,
  setDefaultTemplate,
  updateTemplate,
} from './templateService';
import { defaultDocumentTemplate } from '../rendering/templateConfig';
import type { Template } from '../domain/models';

const baseConfig: Omit<Template, 'id' | 'name' | 'isDefault'> = {
  page: defaultDocumentTemplate.page,
  typography: defaultDocumentTemplate.typography,
  colors: defaultDocumentTemplate.colors,
  cover: defaultDocumentTemplate.cover,
  header: defaultDocumentTemplate.header,
  footer: defaultDocumentTemplate.footer,
  table: defaultDocumentTemplate.table,
  finalPage: defaultDocumentTemplate.finalPage,
};

describe('templateService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getDefaultTemplate', () => {
    it('seeds a built-in default template on first use', async () => {
      const template = await getDefaultTemplate();

      expect(template.isDefault).toBe(true);
      expect(template.name).toBe('Standard');
      expect((await listTemplates())).toHaveLength(1);
    });

    it('returns the same seeded default on subsequent calls without duplicating it', async () => {
      const first = await getDefaultTemplate();
      const second = await getDefaultTemplate();

      expect(second.id).toBe(first.id);
      expect(await listTemplates()).toHaveLength(1);
    });
  });

  describe('createTemplate', () => {
    it('makes the first-ever template the default even if not requested', async () => {
      const created = await createTemplate({ ...baseConfig, name: 'Custom', isDefault: false });

      expect(created.isDefault).toBe(true);
    });

    it('demotes the previous default when a new template is explicitly created as default', async () => {
      const first = await createTemplate({ ...baseConfig, name: 'First', isDefault: true });
      const second = await createTemplate({ ...baseConfig, name: 'Second', isDefault: true });

      const templates = await listTemplates();
      const refreshedFirst = templates.find((t) => t.id === first.id);
      const refreshedSecond = templates.find((t) => t.id === second.id);

      expect(refreshedFirst?.isDefault).toBe(false);
      expect(refreshedSecond?.isDefault).toBe(true);
    });

    it('keeps a non-default template non-default when a default already exists', async () => {
      await createTemplate({ ...baseConfig, name: 'First', isDefault: true });
      const second = await createTemplate({ ...baseConfig, name: 'Second', isDefault: false });

      expect(second.isDefault).toBe(false);
    });
  });

  describe('setDefaultTemplate / updateTemplate default invariant', () => {
    it('setDefaultTemplate demotes the previous default so exactly one remains default', async () => {
      const first = await createTemplate({ ...baseConfig, name: 'First', isDefault: true });
      const second = await createTemplate({ ...baseConfig, name: 'Second', isDefault: false });

      await setDefaultTemplate(second.id);

      const templates = await listTemplates();
      expect(templates.find((t) => t.id === first.id)?.isDefault).toBe(false);
      expect(templates.find((t) => t.id === second.id)?.isDefault).toBe(true);
    });

    it('rejects directly unsetting the default template via updateTemplate', async () => {
      const only = await createTemplate({ ...baseConfig, name: 'Only', isDefault: true });

      await expect(updateTemplate(only.id, { isDefault: false })).rejects.toThrow();
    });
  });

  describe('deleteTemplate', () => {
    it('refuses to delete the only remaining template', async () => {
      const only = await createTemplate({ ...baseConfig, name: 'Only', isDefault: true });

      await expect(deleteTemplate(only.id)).rejects.toThrow();
      expect(await listTemplates()).toHaveLength(1);
    });

    it('refuses to delete the default template while other templates exist', async () => {
      const first = await createTemplate({ ...baseConfig, name: 'First', isDefault: true });
      await createTemplate({ ...baseConfig, name: 'Second', isDefault: false });

      await expect(deleteTemplate(first.id)).rejects.toThrow();
      expect(await listTemplates()).toHaveLength(2);
    });

    it('deletes a non-default template', async () => {
      await createTemplate({ ...baseConfig, name: 'First', isDefault: true });
      const second = await createTemplate({ ...baseConfig, name: 'Second', isDefault: false });

      await deleteTemplate(second.id);

      expect(await listTemplates()).toHaveLength(1);
    });
  });

  describe('duplicateTemplate', () => {
    it('creates a non-default copy with the same configuration', async () => {
      const original = await createTemplate({ ...baseConfig, name: 'Original', isDefault: true });

      const copy = await duplicateTemplate(original.id);

      expect(copy.id).not.toBe(original.id);
      expect(copy.name).toBe('Original (copy)');
      expect(copy.isDefault).toBe(false);
      expect(copy.table).toEqual(original.table);
      expect(copy.typography).toEqual(original.typography);
    });
  });
});
