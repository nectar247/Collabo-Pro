"use client";

import { useState } from 'react';
import { Star, MessageSquare, ThumbsUp, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReviews } from '@/lib/firebase/hooks';
import { sanitizeInput } from '@/lib/utils/sanitize';
import Preloader from '../loaders/preloader';
import ErrorLoader from '../loaders/ErrorLoader';

export default function ReviewSystem({ itemId }: { itemId: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);
  const { reviews, loading, error, addReview, markHelpful, reportReview } = useReviews(itemId);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const sanitizedComment = sanitizeInput(comment);
    if (!rating || !sanitizedComment) return;

    try {
      await addReview({
        rating,
        comment: sanitizedComment,
      });
      
      setRating(0);
      setComment('');
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };


  if (loading) {
    return <Preloader text="Loading reviews..." />;
  }

  if (error) {
    return <ErrorLoader text="Error Loading Reviews" message={error.message} />;
  }

  return (
    <div className="space-y-8">
      {/* Review Form */}
      <form onSubmit={handleSubmitReview} className="space-y-4 bg-gray-800/100 p-5 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-white dark:text-white mb-2">Your Rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onHoverStart={() => setHoveredStar(star)}
                onHoverEnd={() => setHoveredStar(0)}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                className="focus:outline-none"
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= (hoveredStar || rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-400 dark:text-gray-600'
                  }`}
                />
              </motion.button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white dark:text-white mb-2">Your Review</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
            rows={4}
            placeholder="Share your experience..."
            required
          />
        </div>

        <button
          type="submit"
          disabled={!rating || !comment}
          className="px-6 py-3 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white rounded-xl transition-colors"
        >
          Submit Review
        </button>
      </form>

      {/* Reviews List */}
      {reviews && reviews.length ?
      <div className="space-y-6 bg-gray-800/100 p-5 rounded-lg">
        {reviews.map((review) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{review.userName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < review.rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-400 dark:text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{new Date((review.date as any).seconds * 1000).toLocaleDateString()}</span>
                </div>
              </div>
              {/* <button 
                onClick={() => reportReview(review.id)}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <Flag className="h-5 w-5" />
              </button> */}
            </div>

            <p className="text-gray-900 dark:text-white mb-4">{review.comment}</p>

            <div className="flex items-center gap-4">
              <button
                onClick={() => markHelpful(review.id)}
                className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-primary transition-colors"
              >
                <ThumbsUp className="h-5 w-5" />
                <span>{review.helpful}</span>
              </button>
              {/* <button className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-primary transition-colors">
                <MessageSquare className="h-5 w-5" />
                <span>Reply</span>
              </button> */}
            </div>
          </motion.div>
        ))}
      </div> : ''}
    </div>
  );
}