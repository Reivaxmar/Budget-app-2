import { templateRepositoryClient } from '../db/templateRepositoryClient';
import { defaultDocumentTemplate } from '../rendering/templateConfig';
import type { Template, TemplateConfig } from '../domain/models';

const BUILT_IN_TEMPLATE_NAME = 'Standard';

/**
 * Lists all saved templates.
 */
export async function listTemplates(): Promise<Template[]> {
  return templateRepositoryClient.findMany();
}

/**
 * Retrieves a template by id.
 */
export async function getTemplate(id: string): Promise<Template | null> {
  return templateRepositoryClient.findById(id);
}

/**
 * Creates a new template. If it's the first template ever created, or is
 * explicitly marked as default, any previously-default template is
 * demoted first so at most one template stays default (SPECS.md §9).
 */
export async function createTemplate(
  data: Omit<Template, 'id'>
): Promise<Template> {
  const existing = await templateRepositoryClient.findMany();
  const shouldBeDefault = data.isDefault || existing.length === 0;

  if (shouldBeDefault) {
    await demoteCurrentDefault(existing);
  }

  return templateRepositoryClient.create({ ...data, isDefault: shouldBeDefault });
}

/**
 * Updates a template's configuration/name in place. Setting `isDefault: true`
 * demotes the previous default; setting `isDefault: false` on the current
 * default is rejected — use `setDefaultTemplate` on another template instead,
 * so there is always exactly one default once at least one template exists.
 */
export async function updateTemplate(
  id: string,
  data: Partial<Omit<Template, 'id'>>
): Promise<Template> {
  if (data.isDefault === false) {
    const current = await templateRepositoryClient.findById(id);
    if (current?.isDefault) {
      throw new Error(
        'Cannot unset the default template directly — set another template as default instead.'
      );
    }
  }

  if (data.isDefault) {
    const existing = await templateRepositoryClient.findMany();
    await demoteCurrentDefault(existing, id);
  }

  return templateRepositoryClient.update(id, data);
}

/**
 * Marks a template as the default, demoting whichever template previously
 * held that role.
 */
export async function setDefaultTemplate(id: string): Promise<Template> {
  const existing = await templateRepositoryClient.findMany();
  await demoteCurrentDefault(existing, id);
  return templateRepositoryClient.update(id, { isDefault: true });
}

/**
 * Deletes a template. The default template cannot be deleted while other
 * templates exist — set a different default first. The last remaining
 * template cannot be deleted at all, so there is always something to render
 * estimates with.
 */
export async function deleteTemplate(id: string): Promise<void> {
  const existing = await templateRepositoryClient.findMany();
  const target = existing.find((template) => template.id === id);
  if (!target) {
    return;
  }

  if (existing.length === 1) {
    throw new Error('Cannot delete the only remaining template.');
  }

  if (target.isDefault) {
    throw new Error(
      'Cannot delete the default template — set another template as default first.'
    );
  }

  await templateRepositoryClient.delete(id);
}

/**
 * Creates a copy of a template (not marked default) so users can tweak a
 * variant without losing the original.
 */
export async function duplicateTemplate(id: string): Promise<Template> {
  const original = await templateRepositoryClient.findById(id);
  if (!original) {
    throw new Error(`Template ${id} not found`);
  }

  const { id: _originalId, name, isDefault: _isDefault, ...config } = original;
  return templateRepositoryClient.create({
    ...(config as TemplateConfig),
    name: `${name} (copy)`,
    isDefault: false,
  });
}

/**
 * Returns the current default template, seeding a built-in "Standard"
 * template on first use so there is always something to render with.
 */
export async function getDefaultTemplate(): Promise<Template> {
  const templates = await templateRepositoryClient.findMany();
  const existingDefault = templates.find((template) => template.isDefault);
  if (existingDefault) {
    return existingDefault;
  }

  if (templates.length > 0) {
    return setDefaultTemplate(templates[0].id);
  }

  return templateRepositoryClient.create({
    ...defaultDocumentTemplate,
    name: BUILT_IN_TEMPLATE_NAME,
    isDefault: true,
  });
}

async function demoteCurrentDefault(templates: Template[], exceptId?: string): Promise<void> {
  const currentDefault = templates.find((template) => template.isDefault && template.id !== exceptId);
  if (currentDefault) {
    await templateRepositoryClient.update(currentDefault.id, { isDefault: false });
  }
}

export const templateService = {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  setDefaultTemplate,
  deleteTemplate,
  duplicateTemplate,
  getDefaultTemplate,
};
