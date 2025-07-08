import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ConnectionTestProps {
  onClose: () => void;
}

export function ConnectionTest({ onClose }: ConnectionTestProps) {
  const [tests, setTests] = useState({
    connection: { status: 'pending', message: 'Testing connection...' },
    auth: { status: 'pending', message: 'Testing authentication...' },
    database: { status: 'pending', message: 'Testing database access...' },
    tables: { status: 'pending', message: 'Checking required tables...' }
  });

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    // Test 1: Basic connection
    try {
      const { data, error } = await supabase.auth.getSession();
      setTests(prev => ({
        ...prev,
        connection: { 
          status: 'success', 
          message: 'Connection successful' 
        }
      }));
    } catch (error) {
      setTests(prev => ({
        ...prev,
        connection: { 
          status: 'error', 
          message: `Connection failed: ${error.message}` 
        }
      }));
      return;
    }

    // Test 2: Auth service
    try {
      const { data, error } = await supabase.auth.getUser();
      setTests(prev => ({
        ...prev,
        auth: { 
          status: 'success', 
          message: 'Auth service working' 
        }
      }));
    } catch (error) {
      setTests(prev => ({
        ...prev,
        auth: { 
          status: 'error', 
          message: `Auth error: ${error.message}` 
        }
      }));
    }

    // Test 3: Database access
    try {
      const { data, error } = await supabase
        .from('anonymous_preferences')
        .select('count')
        .limit(1);
      
      setTests(prev => ({
        ...prev,
        database: { 
          status: 'success', 
          message: 'Database accessible' 
        }
      }));
    } catch (error) {
      setTests(prev => ({
        ...prev,
        database: { 
          status: 'error', 
          message: `Database error: ${error.message}` 
        }
      }));
    }

    // Test 4: Required tables
    try {
      const tables = ['anonymous_preferences', 'anonymous_actions', 'profiles'];
      const tableChecks = await Promise.all(
        tables.map(async (table) => {
          try {
            const { data, error } = await supabase
              .from(table)
              .select('*')
              .limit(1);
            return { table, exists: !error };
          } catch {
            return { table, exists: false };
          }
        })
      );

      const missingTables = tableChecks.filter(check => !check.exists);
      
      if (missingTables.length === 0) {
        setTests(prev => ({
          ...prev,
          tables: { 
            status: 'success', 
            message: 'All required tables exist' 
          }
        }));
      } else {
        setTests(prev => ({
          ...prev,
          tables: { 
            status: 'warning', 
            message: `Missing tables: ${missingTables.map(t => t.table).join(', ')}` 
          }
        }));
      }
    } catch (error) {
      setTests(prev => ({
        ...prev,
        tables: { 
          status: 'error', 
          message: `Table check failed: ${error.message}` 
        }
      }));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-400" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-400" />;
      default:
        return <Loader className="h-5 w-5 text-blue-400 animate-spin" />;
    }
  };

  const allTestsPassed = Object.values(tests).every(test => test.status === 'success');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-white mb-6">Supabase Connection Test</h2>
        
        <div className="space-y-4">
          {Object.entries(tests).map(([key, test]) => (
            <div key={key} className="flex items-center gap-3">
              {getStatusIcon(test.status)}
              <div>
                <p className="text-white font-medium capitalize">{key}</p>
                <p className="text-white/60 text-sm">{test.message}</p>
              </div>
            </div>
          ))}
        </div>

        {allTestsPassed && (
          <div className="mt-6 p-3 rounded-lg bg-green-500/20 border border-green-500/30">
            <p className="text-green-300 text-sm">
              ✅ All tests passed! Your Supabase is properly configured.
            </p>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={runTests}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
          >
            Retest
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}