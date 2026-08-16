import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';

const LoginPage = () => {
  const { user, signInAnonymously, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignInAnonymously = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInAnonymously();
      navigate('/');
    } catch (err) {
      setError('Failed to sign in anonymously. Please try again.');
      console.error('Error signing in anonymously:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err) {
      setError('Failed to sign in with Google. Please try again.');
      console.error('Error signing in with Google:', err);
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    // If user is already logged in, redirect to home
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-arcade-yellow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-arcade-ink text-arcade-yellow flex items-center justify-center font-display text-[28px] border-2 border-arcade-ink shadow-brutal">
              💀
            </div>
          </div>
          <h2 className="text-center font-display text-[32px] tracking-brutal text-arcade-ink">
            Welcome to PRISM
          </h2>
          <p className="mt-2 text-center text-sm font-semibold text-arcade-ink/60">
            Experience transparent news analysis
          </p>
        </div>
        <div className="bg-white border-2 border-arcade-ink shadow-brutal p-8">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleSignInAnonymously}
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 bg-arcade-ink text-arcade-yellow font-bold text-sm border-2 border-arcade-ink shadow-brutal hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Continue as Free User'}
              </button>
              <button
                type="button"
                onClick={handleSignInWithGoogle}
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 bg-white text-arcade-ink font-bold text-sm border-2 border-arcade-ink shadow-brutal hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign in with Google'}
              </button>
            </div>
            <p className="text-center text-sm font-semibold text-arcade-ink/60">
              By continuing, you agree to our{' '}
              <a href="#" className="text-arcade-pink hover:underline font-bold">Terms of Service</a>{' '}
              and{' '}
              <a href="#" className="text-arcade-pink hover:underline font-bold">Privacy Policy</a>.
            </p>
          </form>
        </div>
        {error && (
          <div className="bg-white border-2 border-red-500 shadow-brutal text-red-600 p-4" role="alert">
            <p className="font-bold">⚠️ {error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
