import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../lib/supabase';

export function Auth() {
  if (!supabase) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-8 text-center">
          Welcome to What2WatchNxt
        </h1>
        <SupabaseAuth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#8B5CF6',
                  brandAccent: '#7C3AED',
                }
              }
            },
            style: {
              button: {
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '16px',
              },
              input: {
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '16px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'white',
              },
              label: {
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '14px',
              },
              anchor: {
                color: '#8B5CF6',
              }
            }
          }}
          providers={[]}
        />
      </div>
    </div>
  );
}