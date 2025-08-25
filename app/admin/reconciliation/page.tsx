'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Download, Eye, EyeOff } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AdminNav from '@/components/ui/AdminNav';

interface ReconciliationReport {
  success: boolean;
  has_failures: boolean;
  reports: Array<{
    token_id: string;
    lifetime_total_lamports: number;
    ledger: {
      platform_accrual_lamports: number;
      earners_accrual_lamports: number;
      claimed_from_bags_lamports: number;
      payouts_lamports: number;
      platform_withdrawals_lamports: number;
    };
    views: any;
    invariants: {
      accrual_equals_lifetime: boolean;
      owed_non_negative: boolean;
      treasury_non_negative: boolean;
    };
  }>;
}

const AdminReconciliationPage: React.FC = () => {
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({});

  const fetchReconciliationReport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/reconcile-fees');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reconciliation report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReconciliationReport();
  }, []);

  const formatLamports = (lamports: number) => {
    return `${(lamports / 1e9).toFixed(9)} SOL`;
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  const getOverallStatus = () => {
    if (!report) return null;
    
    if (report.has_failures) {
      return (
        <div className="flex items-center space-x-2 text-red-600">
          <XCircle className="w-6 h-6" />
          <span className="text-lg font-semibold">Reconciliation Failed</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <CheckCircle className="w-6 h-6" />
        <span className="text-lg font-semibold">All Checks Passed</span>
      </div>
    );
  };

  const downloadReport = () => {
    if (!report) return;
    
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reconciliation-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleDetails = (tokenId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [tokenId]: !prev[tokenId]
    }));
  };

  if (loading && !report) {
    return (
      <div className="min-h-screen bg-background-dark">
        <Header currentPath="/admin/reconciliation" />
        <AdminNav />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-mint" />
            <span className="ml-2 text-text-primary">Loading reconciliation report...</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark">
      <Header currentPath="/admin/reconciliation" />
      <AdminNav />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">Fee Reconciliation Dashboard</h1>
              <p className="text-text-secondary">Monitor fee tracking system integrity and invariants</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {getOverallStatus()}
              
              <button
                onClick={fetchReconciliationReport}
                disabled={loading}
                className="flex items-center space-x-2 bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Running...' : 'Run Reconciliation'}</span>
              </button>
              
              {report && (
                <button
                  onClick={downloadReport}
                  className="flex items-center space-x-2 bg-background-elevated text-text-primary px-4 py-2 rounded-lg font-medium hover:bg-background-card transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Report</span>
                </button>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span className="text-red-400 font-medium">Error: {error}</span>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          {report && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-background-card rounded-lg p-4 border border-background-elevated">
                <p className="text-text-secondary text-sm mb-1">Total Tokens</p>
                <p className="text-2xl font-bold text-text-primary">{report.reports.length}</p>
              </div>
              
              <div className="bg-background-card rounded-lg p-4 border border-background-elevated">
                <p className="text-text-secondary text-sm mb-1">Passed Checks</p>
                <p className="text-2xl font-bold text-green-500">
                  {report.reports.reduce((acc, r) => 
                    acc + (r.invariants.accrual_equals_lifetime ? 1 : 0) + 
                    (r.invariants.owed_non_negative ? 1 : 0) + 
                    (r.invariants.treasury_non_negative ? 1 : 0), 0
                  )}
                </p>
              </div>
              
              <div className="bg-background-card rounded-lg p-4 border border-background-elevated">
                <p className="text-text-secondary text-sm mb-1">Failed Checks</p>
                <p className="text-2xl font-bold text-red-500">
                  {report.reports.reduce((acc, r) => 
                    acc + (r.invariants.accrual_equals_lifetime ? 0 : 1) + 
                    (r.invariants.owed_non_negative ? 0 : 1) + 
                    (r.invariants.treasury_non_negative ? 0 : 1), 0
                  )}
                </p>
              </div>
              
              <div className="bg-background-card rounded-lg p-4 border border-background-elevated">
                <p className="text-text-secondary text-sm mb-1">Status</p>
                <div className="flex items-center space-x-2">
                  {report.has_failures ? (
                    <XCircle className="w-6 h-6 text-red-500" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  )}
                  <span className="text-lg font-semibold text-text-primary">
                    {report.has_failures ? 'Failed' : 'Healthy'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Token Reports */}
          {report && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-text-primary mb-4">Token Reconciliation Reports</h2>
              
              {report.reports.map((tokenReport) => {
                const allPassed = tokenReport.invariants.accrual_equals_lifetime && 
                                tokenReport.invariants.owed_non_negative && 
                                tokenReport.invariants.treasury_non_negative;
                
                return (
                  <div key={tokenReport.token_id} className="bg-background-card rounded-lg border border-background-elevated overflow-hidden">
                    {/* Token Header */}
                    <div className="p-4 border-b border-background-elevated">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {allPassed ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          <div>
                            <h3 className="text-lg font-semibold text-text-primary">
                              Token: {tokenReport.token_id.slice(0, 8)}...{tokenReport.token_id.slice(-8)}
                            </h3>
                            <p className="text-text-secondary text-sm">
                              Lifetime Total: {formatLamports(tokenReport.lifetime_total_lamports)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => toggleDetails(tokenReport.token_id)}
                            className="flex items-center space-x-1 text-text-secondary hover:text-text-primary transition-colors"
                          >
                            {showDetails[tokenReport.token_id] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                            <span className="text-sm">
                              {showDetails[tokenReport.token_id] ? 'Hide' : 'Show'} Details
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Invariant Checks */}
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(tokenReport.invariants.accrual_equals_lifetime)}
                          <div>
                            <p className="text-sm font-medium text-text-primary">Accrual = Lifetime</p>
                            <p className="text-xs text-text-secondary">
                              {formatLamports(tokenReport.ledger.platform_accrual_lamports + tokenReport.ledger.earners_accrual_lamports)} = {formatLamports(tokenReport.lifetime_total_lamports)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(tokenReport.invariants.owed_non_negative)}
                          <div>
                            <p className="text-sm font-medium text-text-primary">Owed ≥ 0</p>
                            <p className="text-xs text-text-secondary">All earners have non-negative balances</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(tokenReport.invariants.treasury_non_negative)}
                          <div>
                            <p className="text-sm font-medium text-text-primary">Treasury ≥ 0</p>
                            <p className="text-xs text-text-secondary">
                              {formatLamports(tokenReport.views.treasury_liquid_balance_lamports || 0)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Breakdown */}
                      {showDetails[tokenReport.token_id] && (
                        <div className="mt-4 p-4 bg-background-dark rounded-lg border border-background-elevated">
                          <h4 className="text-sm font-semibold text-text-primary mb-3">Detailed Breakdown</h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="text-xs font-medium text-text-secondary mb-2">Ledger Entries</h5>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-text-secondary">Platform Accrual:</span>
                                  <span className="text-text-primary">{formatLamports(tokenReport.ledger.platform_accrual_lamports)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-text-secondary">Earners Accrual:</span>
                                  <span className="text-text-primary">{formatLamports(tokenReport.ledger.earners_accrual_lamports)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-text-secondary">Claimed from Bags:</span>
                                  <span className="text-text-primary">{formatLamports(tokenReport.ledger.claimed_from_bags_lamports)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-text-secondary">Payouts:</span>
                                  <span className="text-text-primary">{formatLamports(tokenReport.ledger.payouts_lamports)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-text-secondary">Platform Withdrawals:</span>
                                  <span className="text-text-primary">{formatLamports(tokenReport.ledger.platform_withdrawals_lamports)}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h5 className="text-xs font-medium text-text-secondary mb-2">View Computations</h5>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-text-secondary">Lifetime Total:</span>
                                  <span className="text-text-primary">{formatLamports(tokenReport.views.lifetime_total_lamports || 0)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-text-secondary">Platform Earned:</span>
                                  <span className="text-text-primary">{formatLamports(tokenReport.views.platform_earned_lamports || 0)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-text-secondary">Earners Earned:</span>
                                  <span className="text-text-primary">{formatLamports(tokenReport.views.earners_earned_lamports || 0)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-text-secondary">Treasury Balance:</span>
                                  <span className="text-text-primary">{formatLamports(tokenReport.views.treasury_liquid_balance_lamports || 0)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* No Report State */}
          {!report && !loading && (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">No Reconciliation Data</h3>
              <p className="text-text-secondary mb-4">Run a reconciliation to see the current status of your fee tracking system.</p>
              <button
                onClick={fetchReconciliationReport}
                className="bg-gradient-to-r from-primary-mint to-primary-aqua text-background-dark px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Run First Reconciliation
              </button>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default AdminReconciliationPage;
