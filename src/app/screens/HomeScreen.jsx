
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { WeatherCard } from '@/app/components/WeatherCard';
import { Sparkles, Camera, MessageCircle, Shield, Zap, Heart } from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const features = [
    {
      icon: Camera,
      title: 'AI Skin Analysis',
      description: 'Upload a photo and get instant analysis of your skin type and conditions',
    },
    {
      icon: MessageCircle,
      title: 'Personal Consultant',
      description: 'Chat with our AI assistant for personalized skincare advice and product recommendations',
    },
    {
      icon: Zap,
      title: 'Quick Assessment',
      description: 'Complete a simple questionnaire to help us understand your skin better',
    },
    {
      icon: Shield,
      title: 'Privacy First',
      description: 'Your photos are processed securely and never stored on our servers',
    },
  ];

  const steps = [
    { number: '01', title: 'Take Quiz', description: 'Answer simple questions about your skin' },
    { number: '02', title: 'Upload Photo', description: 'Take a clear photo of your face' },
    { number: '03', title: 'Get Analysis', description: 'Receive detailed skin analysis results' },
    { number: '04', title: 'Chat & Learn', description: 'Get personalized recommendations' },
    { number: '05', title: 'Progress Tracking', description: 'Compare photos and monitor skin changes over time' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-full mb-6">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-600">AI-Powered Skincare</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl mb-6 text-slate-800 leading-tight">
                Discover Your Perfect{' '}
                <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                  Skincare Routine
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed">
                Get personalized skin analysis and expert recommendations powered by artificial
                intelligence. Start your journey to healthier, glowing skin today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  asChild
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-full px-8 py-6 text-lg shadow-lg"
                >
                  <Link to="/dashboard">Start Free Analysis</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full px-8 py-6 text-lg border-2"
                >
                  <Link to="/contact">Learn More</Link>
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-purple-500 rounded-3xl blur-3xl opacity-20" />
                <div className="relative">
                  <WeatherCard />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl mb-4 text-slate-800">
              Why Choose Glorielle?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Advanced technology meets personalized care for your unique skin needs
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-none shadow-md hover:shadow-xl transition-shadow h-full bg-white/90 backdrop-blur">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-purple-600" />
                      </div>
                      <h3 className="text-xl mb-2 text-slate-800">{feature.title}</h3>
                      <p className="text-slate-600">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl mb-4 text-slate-800">
              How It Works
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Get personalized skincare recommendations in five simple steps
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="relative mb-6">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-3xl text-white shadow-lg">
                    {step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-10 left-[60%] w-full h-0.5 bg-gradient-to-r from-purple-300 to-transparent" />
                  )}
                </div>
                <h3 className="text-xl mb-2 text-slate-800">{step.title}</h3>
                <p className="text-slate-600">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <Card className="border-none shadow-2xl bg-gradient-to-br from-pink-500 to-purple-600 text-white overflow-hidden">
            <CardContent className="p-12 text-center relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50" />
              <div className="relative">
                <Heart className="w-16 h-16 mx-auto mb-6" />
                <h2 className="text-3xl sm:text-4xl mb-4">
                  Ready to Transform Your Skin?
                </h2>
                <p className="text-xl mb-8 text-white/90">
                  Join thousands of users who have discovered their perfect skincare routine
                </p>
                <Button
                  asChild
                  className="bg-white text-purple-600 hover:bg-slate-100 rounded-full px-12 py-6 text-lg shadow-xl"
                >
                  <Link to="/dashboard">Get Started Now</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-white/50 border-t">
        <div className="max-w-7xl mx-auto text-center text-slate-600">
          <p className="text-sm">
            &copy; 2026 Glorielle. For educational purposes only. Consult a dermatologist for medical advice.
          </p>
        </div>
      </footer>
    </div>
  );
};

