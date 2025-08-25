'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';

interface TestResult {
  name: string;
  status: 'passed' | 'failed';
  result?: string;
  error?: string;
  timestamp: string;
}

interface TestSummary {
  passed: number;
  failed: number;
  total: number;
}

interface TestResponse {
  success: boolean;
  message: string;
  data: {
    tests: TestResult[];
    summary: TestSummary;
  };
}

export default function TestRoyaltyPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [results, setResults] = useState<TestResponse | null>(null);
  const [cleanupResults, setCleanupResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/test-royalty-system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testType: 'all' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Test execution failed');
      }

      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  const cleanupTestData = async () => {
    setIsCleaning(true);
    setError(null);
    setCleanupResults(null);

    try {
      const response = await fetch('/api/test-royalty-system/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Cleanup failed');
      }

      setCleanupResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsCleaning(false);
    }
  };

  const getStatusColor = (status: 'passed' | 'failed') => {
    return status === 'passed' ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (status: 'passed' | 'failed') => {
    return status === 'passed' ? '✅' : '❌';
  };

  return (
    <div className="min-h-screen bg-background-dark p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-background-card rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-text-primary mb-4">
            🧪 Royalty System Test Suite
          </h1>
          <p className="text-text-secondary mb-6">
            This test suite validates the centralized royalty update system without launching actual tokens.
            It uses the test token: <code className="bg-background-elevated px-2 py-1 rounded">Eme5T2s2HB7B8W4YgLG1eReQpnadEVUnQBRjaKTdBAGS</code>
          </p>
          
          <div className="flex gap-4">
            <Button
              onClick={runTests}
              disabled={isRunning}
              className="bg-primary-mint hover:bg-primary-aqua text-white px-6 py-3 rounded-lg font-semibold"
            >
              {isRunning ? '🔄 Running Tests...' : '🚀 Run All Tests'}
            </Button>
            
            <Button
              onClick={cleanupTestData}
              disabled={isCleaning}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              {isCleaning ? '🧹 Cleaning...' : '🗑️ Cleanup Test Data'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
            <h3 className="text-red-400 font-semibold mb-2">❌ Test Error</h3>
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {cleanupResults && (
          <div className="bg-background-card rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-text-primary mb-4">
              🧹 Cleanup Results
            </h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-text-primary">
                  {cleanupResults.data.summary.tables_cleaned}
                </div>
                <div className="text-text-secondary">Tables Cleaned</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-500">
                  {cleanupResults.data.summary.records_removed}
                </div>
                <div className="text-text-secondary">Records Removed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-500">
                  {cleanupResults.data.summary.errors}
                </div>
                <div className="text-text-secondary">Errors</div>
              </div>
            </div>
            {cleanupResults.data.cleaned.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-text-primary mb-2">Cleaned:</h3>
                <ul className="text-text-secondary text-sm space-y-1">
                  {cleanupResults.data.cleaned.map((item: string, index: number) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}
            {cleanupResults.data.errors.length > 0 && (
              <div>
                <h3 className="font-semibold text-red-400 mb-2">Errors:</h3>
                <ul className="text-red-300 text-sm space-y-1">
                  {cleanupResults.data.errors.map((error: string, index: number) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {results && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-background-card rounded-lg p-6">
              <h2 className="text-2xl font-bold text-text-primary mb-4">
                📊 Test Results Summary
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-text-primary">
                    {results.data.summary.total}
                  </div>
                  <div className="text-text-secondary">Total Tests</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-500">
                    {results.data.summary.passed}
                  </div>
                  <div className="text-text-secondary">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-500">
                    {results.data.summary.failed}
                  </div>
                  <div className="text-text-secondary">Failed</div>
                </div>
              </div>
            </div>

            {/* Test Results */}
            <div className="bg-background-card rounded-lg p-6">
              <h2 className="text-2xl font-bold text-text-primary mb-4">
                📋 Detailed Test Results
              </h2>
              <div className="space-y-4">
                {results.data.tests.map((test, index) => (
                  <div
                    key={index}
                    className="border border-background-elevated rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-text-primary">
                        {getStatusIcon(test.status)} {test.name}
                      </h3>
                      <span className={`font-medium ${getStatusColor(test.status)}`}>
                        {test.status.toUpperCase()}
                      </span>
                    </div>
                    
                    {test.result && (
                      <p className="text-text-secondary text-sm mb-2">
                        {test.result}
                      </p>
                    )}
                    
                    {test.error && (
                      <p className="text-red-400 text-sm mb-2">
                        Error: {test.error}
                      </p>
                    )}
                    
                    <p className="text-text-muted text-xs">
                      {new Date(test.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* What This Tests */}
            <div className="bg-background-card rounded-lg p-6">
              <h2 className="text-2xl font-bold text-text-primary mb-4">
                🔍 What These Tests Validate
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-text-primary mb-2">Database Setup</h3>
                  <ul className="text-text-secondary text-sm space-y-1">
                    <li>• Required tables exist and are accessible</li>
                    <li>• Test token creation and management</li>
                    <li>• Token ownership record creation</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary mb-2">Royalty System</h3>
                  <ul className="text-text-secondary text-sm space-y-1">
                    <li>• Initial royalty share creation</li>
                    <li>• Royalty share modifications</li>
                    <li>• Version management and history</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary mb-2">Data Integrity</h3>
                  <ul className="text-text-secondary text-sm space-y-1">
                    <li>• Fee accrual ledger initialization</li>
                    <li>• Royalty changes history tracking</li>
                    <li>• Token ownership updates</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary mb-2">Validation</h3>
                  <ul className="text-text-secondary text-sm space-y-1">
                    <li>• BPS total validation (must equal 9000)</li>
                    <li>• Error handling for invalid inputs</li>
                    <li>• Proper error responses</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
