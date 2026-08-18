import React, { useState, useEffect } from 'react';
import { estimateRepositoryClient as estimateRepository } from '../db/estimateRepositoryClient';
import { customerRepositoryClient as customerRepository } from '../db/customerRepositoryClient';
import { estimateService } from '../services';
import { useNavigate } from 'react-router-dom';
import './EstimatesPage.css';

const EstimatesListPage: React.FC = () => {
  const [estimates, setEstimates] = useState<Array<any>>([]);
  const [customers, setCustomers] = useState<Array<any>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Load customers for mapping customerId to name
  const loadCustomers = async () => {
    try {
      const data = await customerRepository.findMany();
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
      // Non-critical; we can still show estimates with missing customer names
    }
  };

  // Load estimates from the database
  const loadEstimates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await estimateRepository.findMany();
      // Sort by estimateNumber or year? We'll sort by estimateNumber ascending
      const sorted = [...data].sort((a, b) => a.estimateNumber.localeCompare(b.estimateNumber));
      setEstimates(sorted);
    } catch (err) {
      console.error('Failed to load estimates:', err);
      setError('Failed to load estimates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    loadCustomers();
    loadEstimates();
  }, []);

  const handleNewEstimate = () => {
    navigate('/estimates/new');
  };

  const handleEditEstimate = (id: string) => {
    navigate(`/estimates/${id}/edit`);
  };

  const handleDuplicateEstimate = async (id: string) => {
    if (window.confirm('Are you sure you want to duplicate this estimate?')) {
      try {
        await estimateService.duplicateEstimate(id);
        await loadEstimates();
      } catch (err) {
        console.error('Failed to duplicate estimate:', err);
        alert('Failed to duplicate estimate. Please try again.');
      }
    }
  };

  const handleExportPdf = async (id: string) => {
    setExportingId(id);
    try {
      // Dynamically imported so the PDF rendering engine (react-pdf) is only
      // ever downloaded when the user actually exports, keeping it out of
      // this page's (eagerly-loaded) main bundle.
      const { exportEstimatePdf } = await import('../services/pdfExportService');
      await exportEstimatePdf(id);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert(err instanceof Error ? err.message : 'Failed to export PDF.');
    } finally {
      setExportingId(null);
    }
  };

  const handleDeleteEstimate = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this estimate?')) {
      try {
        await estimateService.deleteEstimate(id);
        await loadEstimates();
      } catch (err) {
        console.error('Failed to delete estimate:', err);
        alert('Failed to delete estimate. Please try again.');
      }
    }
  };

  // Map customerId to name
  const getCustomerName = (customerId: string) => {
    const cust = customers.find(c => c.id === customerId);
    return cust ? cust.name : 'Unknown';
  };

  // Format date string (ISO) to short date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="estimates-page">
      <h1>Estimates</h1>
      {/* Search bar (placeholder for future) */}
      <div className="search-bar">
        <button onClick={handleNewEstimate} className="add-button">
          New Estimate
        </button>
      </div>

      {/* Error message */}
      {error && <div className="error-message">{error}</div>}

      {/* Loading state */}
      {loading && <p>Loading estimates...</p>}

      {/* Estimates table */}
      {!loading && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Estimate #</th>
                <th>Year</th>
                <th>Customer</th>
                <th>Subject</th>
                <th>Site</th>
                <th>Date</th>
                <th>Status</th>
                <th>Tax %</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {estimates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="no-estimates">
                    No estimates found.
                  </td>
                </tr>
              ) : (
                estimates.map((estimate) => (
                  <tr key={estimate.id}>
                    <td>{estimate.estimateNumber}</td>
                    <td>{estimate.year}</td>
                    <td>{getCustomerName(estimate.customerId)}</td>
                    <td>{estimate.subject}</td>
                    <td>{estimate.site}</td>
                    <td>{formatDate(estimate.creationDate)}</td>
                    <td>{estimate.status}</td>
                    <td>{estimate.taxRate}</td>
                    <td>
                      <button
                        onClick={() => handleEditEstimate(estimate.id)}
                        className="actions-button"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDuplicateEstimate(estimate.id)}
                        className="actions-button"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleExportPdf(estimate.id)}
                        className="actions-button"
                        disabled={exportingId === estimate.id}
                      >
                        {exportingId === estimate.id ? 'Exporting…' : 'Export PDF'}
                      </button>
                      <button
                        onClick={() => handleDeleteEstimate(estimate.id)}
                        className="delete-button"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EstimatesListPage;