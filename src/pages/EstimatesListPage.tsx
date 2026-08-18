import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { estimateRepositoryClient as estimateRepository } from '../db/estimateRepositoryClient';
import { customerRepositoryClient as customerRepository } from '../db/customerRepositoryClient';
import { estimateService } from '../services';
import { useNavigate } from 'react-router-dom';
import './EstimatesPage.css';

const EstimatesListPage: React.FC = () => {
  const { t } = useTranslation();
  const [estimates, setEstimates] = useState<Array<any>>([]);
  const [customers, setCustomers] = useState<Array<any>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
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
      setError(t('estimatesList.errors.loadFailed'));
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
    if (window.confirm(t('estimatesList.confirmDuplicate'))) {
      try {
        await estimateService.duplicateEstimate(id);
        await loadEstimates();
      } catch (err) {
        console.error('Failed to duplicate estimate:', err);
        alert(t('estimatesList.errors.duplicateFailed'));
      }
    }
  };

  const handleDeleteEstimate = async (id: string) => {
    if (window.confirm(t('estimatesList.confirmDelete'))) {
      try {
        await estimateService.deleteEstimate(id);
        await loadEstimates();
      } catch (err) {
        console.error('Failed to delete estimate:', err);
        alert(t('estimatesList.errors.deleteFailed'));
      }
    }
  };

  // Map customerId to name
  const getCustomerName = (customerId: string) => {
    const cust = customers.find(c => c.id === customerId);
    return cust ? cust.name : t('estimatesList.unknownCustomer');
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
      <h1>{t('estimatesList.title')}</h1>
      {/* Search bar (placeholder for future) */}
      <div className="search-bar">
        <button onClick={handleNewEstimate} className="add-button">
          {t('estimatesList.newEstimate')}
        </button>
      </div>

      {/* Error message */}
      {error && <div className="error-message">{error}</div>}

      {/* Loading state */}
      {loading && <p>{t('estimatesList.loading')}</p>}

      {/* Estimates table */}
      {!loading && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('estimatesList.fields.estimateNumber')}</th>
                <th>{t('estimatesList.fields.year')}</th>
                <th>{t('estimatesList.fields.customer')}</th>
                <th>{t('estimatesList.fields.subject')}</th>
                <th>{t('estimatesList.fields.site')}</th>
                <th>{t('estimatesList.fields.date')}</th>
                <th>{t('estimatesList.fields.status')}</th>
                <th>{t('estimatesList.fields.taxRate')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {estimates.length === 0 ? (
                <tr>
                  <td colSpan={9} className="no-estimates">
                    {t('estimatesList.noneFound')}
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
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={() => handleDuplicateEstimate(estimate.id)}
                        className="actions-button"
                      >
                        {t('estimatesList.actions.duplicate')}
                      </button>
                      <button
                        onClick={() => handleDeleteEstimate(estimate.id)}
                        className="delete-button"
                      >
                        {t('common.delete')}
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
