import React from 'react';
import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../lib/supabase';

const Auth: React.FC = () => {
  return (
    <div className="max-w-md w-full mx-auto p-6 bg-white rounded-xl shadow-card">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Welcome Back</h2>
        <p className="text-neutral-600">Sign in to access your stock analysis dashboard</p>
      </div>
      
      <SupabaseAuth
        supabaseClient={supabase}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: '#2563eb',
                brandAccent: '#1d4ed8',
              },
            },
          },
          className: {
            container: 'w-full',
            button: 'w-full px-4 py-2 rounded-lg font-medium transition-colors',
            input: 'w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          },
        }}
        providers={[]}
      />
    </div>
  );
};

export default Auth;