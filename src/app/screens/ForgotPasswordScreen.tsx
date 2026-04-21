import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent } from '@/app/components/ui/card';
import { useAuth } from '@/app/context/AuthContext';
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const ForgotPasswordScreen: React.FC = () => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await forgotPassword(email);
      setEmailSent(true);
      toast.success('Password reset link sent to your email');
    } catch (error) {
      toast.error('Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl mb-2 text-slate-800">Forgot Password?</h1>
          <p className="text-slate-600">
            {emailSent
              ? 'Check your email for reset instructions'
              : "No worries, we'll send you reset instructions"}
          </p>
        </div>

        <Card className="border-none shadow-xl bg-white/90 backdrop-blur">
          <CardContent className="p-6 sm:p-8">
            {emailSent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl mb-2 text-slate-800">Email Sent!</h3>
                <p className="text-slate-600 mb-6">
                  We've sent password reset instructions to:
                  <br />
                  <strong className="text-slate-800">{email}</strong>
                </p>
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Click the link in the email to reset your password. The link will expire in 1
                    hour.
                  </p>
                  <Button
                    onClick={() => setEmailSent(false)}
                    variant="outline"
                    className="w-full rounded-full"
                  >
                    Didn't receive the email? Try again
                  </Button>
                  <Link to="/login">
                    <Button variant="ghost" className="w-full rounded-full">
                      Return to login
                    </Button>
                  </Link>
                </div>

                {/* Demo Reset Link */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-900 mb-2">
                    <strong>Demo Reset Link:</strong>
                  </p>
                  <Link
                    to="/reset-password?token=demo-reset-token"
                    className="text-sm text-purple-600 hover:underline break-all"
                  >
                    /reset-password?token=demo-reset-token
                  </Link>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="email" className="text-slate-700">
                    Email Address
                  </Label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-sm text-slate-500 mt-2">
                    Enter the email address associated with your account
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-full py-6 text-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="text-sm text-slate-600 hover:text-slate-800 hover:underline"
                  >
                    Remember your password? Sign in
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
