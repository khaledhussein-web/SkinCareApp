import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Card, CardContent } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Mail, MessageSquare, MapPin, Phone, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const ContactScreen: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setIsSubmitted(true);
    toast.success('Message sent successfully!');

    // Reset form after 3 seconds
    setTimeout(() => {
      setFormData({ name: '', email: '', subject: '', message: '' });
      setIsSubmitted(false);
    }, 3000);
  };

  const contactInfo = [
    {
      icon: Mail,
      title: 'Email',
      content: 'support@skincareai.com',
      link: 'mailto:support@skincareai.com',
    },
    {
      icon: Phone,
      title: 'Phone',
      content: '+1 (555) 123-4567',
      link: 'tel:+15551234567',
    },
    {
      icon: MapPin,
      title: 'Address',
      content: '123 Beauty Lane, San Francisco, CA 94102',
      link: null,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-8 sm:py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl mb-4 text-slate-800">Get in Touch</h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
            Have questions about our skincare analysis? We're here to help!
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-none shadow-lg bg-white/90 backdrop-blur">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-pink-100 to-purple-100">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-2xl text-slate-800">Send us a Message</h2>
                </div>

                {isSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-2xl mb-2 text-slate-800">Message Sent!</h3>
                    <p className="text-slate-600">
                      We'll get back to you as soon as possible.
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="name" className="text-slate-700">
                        Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="Your full name"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-slate-700">
                        Email
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="your@email.com"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="subject" className="text-slate-700">
                        Subject
                      </Label>
                      <Input
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        placeholder="What's this about?"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="message" className="text-slate-700">
                        Message
                      </Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        placeholder="Tell us more..."
                        rows={6}
                        className="mt-2"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-full py-6 text-lg"
                    >
                      {isSubmitting ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                          />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            <Card className="border-none shadow-lg bg-white/90 backdrop-blur">
              <CardContent className="p-6 sm:p-8">
                <h2 className="text-2xl mb-6 text-slate-800">Contact Information</h2>
                <div className="space-y-6">
                  {contactInfo.map((info, index) => {
                    const Icon = info.icon;
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                        className="flex items-start gap-4"
                      >
                        <div className="p-3 rounded-lg bg-gradient-to-br from-pink-100 to-purple-100 flex-shrink-0">
                          <Icon className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-sm text-slate-600 mb-1">{info.title}</h3>
                          {info.link ? (
                            <a
                              href={info.link}
                              className="text-slate-800 hover:text-purple-600 transition-colors"
                            >
                              {info.content}
                            </a>
                          ) : (
                            <p className="text-slate-800">{info.content}</p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-pink-500 to-purple-600 text-white">
              <CardContent className="p-6 sm:p-8">
                <h3 className="text-xl mb-3">Need Immediate Help?</h3>
                <p className="text-white/90 mb-4">
                  Check out our FAQ section or chat with our AI assistant for instant answers to
                  common questions.
                </p>
                <Button
                  asChild
                  className="bg-white text-purple-600 hover:bg-slate-100 rounded-full w-full"
                >
                  <a href="/dashboard">Go to Dashboard</a>
                </Button>
              </CardContent>
            </Card>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="p-6 bg-blue-50 rounded-xl border border-blue-100"
            >
              <p className="text-sm text-blue-900">
                <strong>Business Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM (PST)
                <br />
                We typically respond within 24 hours.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
