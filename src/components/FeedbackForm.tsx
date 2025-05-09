import React, { useState } from 'react';
import { MessageSquare, Star, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FeedbackFormProps {
  onClose: () => void;
}

export function FeedbackForm({ onClose }: FeedbackFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await fetch('/.netlify/functions/submit-feedback', {
        method: 'POST',
        body: JSON.stringify({ rating, feedback }),
      });
      setIsSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gray-900 rounded-xl p-6 max-w-md w-full relative overflow-hidden"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="h-6 w-6 text-teal-400" />
          <h2 className="text-2xl font-bold text-white">Share Your Feedback</h2>
        </div>

        <AnimatePresence mode="wait">
          {isSubmitted ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-8"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-500/20 text-teal-400 mb-4">
                <Send className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Thank You!</h3>
              <p className="text-white/70">Your feedback helps us improve.</p>
            </motion.div>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  How would you rate your experience?
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className={`flex-1 p-3 rounded-lg transition ${
                        rating >= value
                          ? 'bg-teal-500/20 text-teal-400'
                          : 'bg-white/10 text-white/40 hover:bg-white/20'
                      }`}
                    >
                      <Star className="h-5 w-5 mx-auto" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Your feedback
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us what you think..."
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:border-white/40 transition"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={!rating || !feedback || isSubmitting}
                className={`w-full px-6 py-3 rounded-lg font-semibold transition ${
                  !rating || !feedback || isSubmitting
                    ? 'bg-white/20 text-white/50 cursor-not-allowed'
                    : 'bg-teal-500 text-white hover:bg-teal-400'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span>Submitting...</span>
                  </div>
                ) : (
                  'Submit Feedback'
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}