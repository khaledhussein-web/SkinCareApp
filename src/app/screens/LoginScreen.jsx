
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent } from '@/app/components/ui/card';
import { useAuth } from '@/app/context/AuthContext';
import { Sparkles, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const loggedInUser = await login(email, password);
      const displayName = String(loggedInUser?.name || 'User').trim();
      toast.success(`Welcome "${displayName}"`);
      navigate(loggedInUser?.role === 'admin' ? '/admin' : '/dashboard');
    } catch (error) {
      toast.error('Invalid email or password');
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
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="p-3 bg-gradient-to-br from-pink-400 to-purple-500 rounded-xl">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl mb-2 text-slate-800">Welcome Back</h1>
          <p className="text-slate-600">Sign in to continue your skincare journey</p>
        </div>

        <Card className="border-none shadow-xl bg-white/90 backdrop-blur">
          <CardContent className="p-6 sm:p-8">
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
              </div>

              <div>
                <Label htmlFor="password" className="text-slate-700">
                  Password
                </Label>
                <div className="relative mt-2">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-slate-300" />
                  <span className="text-slate-600">Remember me</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-purple-600 hover:text-purple-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-full py-6 text-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="text-purple-600 hover:text-purple-700 hover:underline"
                >
                  Create one now
                </Link>
              </p>
            </div>

            <div className="mt-6 pt-6 border-t">
              <p className="text-xs text-slate-500 text-center">
                <strong>Demo Credentials:</strong>
                <br />
                Admin: admin@skincare.com / admin123
                <br />
                User: any@email.com / password123
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { ProgressBar } from '@/app/components/ProgressBar';
import { useSkinCare } from '@/app/context/SkinCareContext';
import { Droplets, Sun, AlertCircle, Sparkles } from 'lucide-react';

const questions = [
  {
    id: 'afterCleansing',
    question: 'How does your skin feel 20 minutes after cleansing?',
    icon: Droplets,
    options: [
      { value: 'tight', label: 'Tight and uncomfortable' },
      { value: 'comfortable', label: 'Comfortable and balanced' },
      { value: 'slightly-oily', label: 'Slightly oily in T-zone' },
      { value: 'very-oily', label: 'Very oily all over' },
    ],
  },
  {
    id: 'middayFeeling',
    question: 'How does your skin feel by midday?',
    icon: Sun,
    options: [
      { value: 'flaky', label: 'Dry and flaky' },
      { value: 'normal', label: 'Still comfortable' },
      { value: 'shiny-tzone', label: 'Shiny in T-zone only' },
      { value: 'shiny-all', label: 'Shiny everywhere' },
    ],
  },
  {
    id: 'productReaction',
    question: 'How does your skin typically react to new products?',
    icon: AlertCircle,
    options: [
      { value: 'sensitive', label: 'Often gets irritated or red' },
      { value: 'rarely', label: 'Rarely has any reaction' },
      { value: 'breakouts', label: 'Sometimes causes breakouts' },
      { value: 'immediate', label: 'Immediate stinging or burning' },
    ],
  },
  {
    id: 'shineLevel',
    question: 'How does your skin look in photos with flash?',
    icon: Sparkles,
    options: [
      { value: 'matte', label: 'Matte and dull' },
      { value: 'natural', label: 'Natural and even' },
      { value: 'slight-shine', label: 'Some shine on forehead and nose' },
      { value: 'very-shiny', label: 'Very shiny and reflective' },
    ],
  },
];

