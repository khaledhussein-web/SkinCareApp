import React, { useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { CheckCircle2, MessageSquareHeart, Send, Star } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { submitFeedback } from "@/app/services/skincareApi";

const FEEDBACK_CATEGORIES = [
  "General",
  "Design & UI",
  "AI Analysis",
  "Performance",
  "Bugs",
  "Feature Request",
];

export const FeedbackScreen: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    category: "General",
    rating: 5,
    highlights: "",
    notes: "",
    suggestions: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "rating" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await submitFeedback({
        name: formData.name,
        email: formData.email,
        category: formData.category,
        rating: formData.rating,
        highlights: formData.highlights,
        notes: formData.notes,
        suggestions: formData.suggestions,
      });
      setIsSubmitted(true);
      toast.success("Thank you! Your feedback has been submitted.");
      setFormData({
        name: user?.name || "",
        email: user?.email || "",
        category: "General",
        rating: 5,
        highlights: "",
        notes: "",
        suggestions: "",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 py-8 sm:py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="border-none shadow-xl bg-white/90 backdrop-blur">
            <CardContent className="p-8 sm:p-10 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 flex items-center justify-center">
                <MessageSquareHeart className="w-8 h-8 text-indigo-600" />
              </div>
              <h1 className="text-3xl text-slate-900 mb-3">Admin Feedback View</h1>
              <p className="text-slate-600 mb-6">
                Admin accounts do not submit feedback forms. Review client feedback in the admin dashboard support tab.
              </p>
              <Button asChild className="rounded-full">
                <Link to="/admin">Open Admin Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 py-8 sm:py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-10"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-400 to-orange-500 mx-auto mb-4 flex items-center justify-center">
            <MessageSquareHeart className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl text-slate-900 mb-3">Share Your Feedback</h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Tell us what worked well, what needs improvement, and what features you want next.
            Your notes help us improve this skincare app for everyone.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <Card className="border-none shadow-xl bg-white/90 backdrop-blur">
            <CardContent className="p-6 sm:p-8">
              {isSubmitted ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl text-slate-800 mb-2">Feedback Received</h2>
                  <p className="text-slate-600 mb-5">We appreciate your ideas and will use them to improve the app.</p>
                  <Button variant="outline" onClick={() => setIsSubmitted(false)}>
                    Send Another Feedback
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
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
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category" className="text-slate-700">
                        Feedback Category
                      </Label>
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="mt-2 w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-300"
                      >
                        {FEEDBACK_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="rating" className="text-slate-700">
                        Overall Rating (1-5)
                      </Label>
                      <div className="mt-2 flex items-center gap-3">
                        <Input
                          id="rating"
                          name="rating"
                          type="number"
                          min={1}
                          max={5}
                          value={formData.rating}
                          onChange={handleChange}
                          required
                        />
                        <div className="inline-flex items-center text-amber-500">
                          {Array.from({ length: formData.rating || 0 }).map((_, index) => (
                            <Star key={index} className="w-4 h-4 fill-current" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="highlights" className="text-slate-700">
                      What worked well for you? (optional)
                    </Label>
                    <Textarea
                      id="highlights"
                      name="highlights"
                      rows={3}
                      value={formData.highlights}
                      onChange={handleChange}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-slate-700">
                      Feedback and notes
                    </Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      rows={4}
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="Tell us what you noticed, what felt confusing, or what can be better."
                      required
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="suggestions" className="text-slate-700">
                      Suggested improvements
                    </Label>
                    <Textarea
                      id="suggestions"
                      name="suggestions"
                      rows={4}
                      value={formData.suggestions}
                      onChange={handleChange}
                      placeholder="Share features or changes you want us to add next."
                      required
                      className="mt-2"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white rounded-full py-6 text-lg"
                  >
                    {isSubmitting ? (
                      "Submitting..."
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Submit Feedback
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
