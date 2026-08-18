import React, { useEffect, useState } from 'react';
import { generateEstimatePdfBlob } from '../services/pdfService';
import { templateService } from '../services/templateService';
import { mockEstimateDocumentData } from '../rendering/mockEstimateData';
import type { Template } from '../domain/models';

// Prototype-only page to visually validate PDF pagination/rendering
// (SPECS.md §17 Phase 3) using mock estimate data. This is NOT the template
// editor — it exists to sanity-check that the rendering engine correctly
// applies a saved template configuration to the same estimate data (i.e.
// templates change presentation only, never the data itself).
const DocumentPrototypePage: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const defaultTemplate = await templateService.getDefaultTemplate();
        const data = await templateService.listTemplates();
        setTemplates(data);
        setSelectedTemplateId(defaultTemplate.id);
      } catch (err) {
        console.error('Failed to load templates:', err);
        setError('Failed to load templates. See console for details.');
      } finally {
        setLoadingTemplates(false);
      }
    };
    loadTemplates();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const template = templates.find((t) => t.id === selectedTemplateId);
      const blob = await generateEstimatePdfBlob(mockEstimateDocumentData, template);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `estimate-${mockEstimateDocumentData.estimate.estimateNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setError('Failed to generate PDF. See console for details.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <h1>Document Rendering Prototype</h1>
      <p>
        Generates a sample estimate PDF from mock data to validate pagination, repeated
        header/footer, page numbers and the final total/signature section. Pick a saved
        template below to confirm the same estimate data renders differently under a
        different presentation.
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <label>
          Template:{' '}
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            disabled={loadingTemplates || templates.length === 0}
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
                {template.isDefault ? ' (default)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button onClick={handleGenerate} disabled={generating || loadingTemplates}>
        {generating ? 'Generating…' : 'Download sample PDF'}
      </button>
      {error ? <p style={{ color: 'red' }}>{error}</p> : null}
    </div>
  );
};

export default DocumentPrototypePage;
