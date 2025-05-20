"use client";

import { useState } from 'react';
import { Star, MessageSquare, ThumbsUp, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  helpful: number;
  date: string;
}

export default function ReviewSystem() {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([
    {
      id: '1',
      userId: 'user1',
      userName: 'John Doe',
      rating: 5,
      comment: 'Great deal! Saved a lot of money.',
      helpful: 12,
      date: '2024-02-14'
    },
    {
      id: '2',
      userId: 'user2',
      userName: 'Jane Smith',
      rating: 4,
      comment: 'Good discount, easy to redeem.',
      helpful: 8,
      date: '2024-02-13'
    }
  ]);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newReview: Review = {
      id: Date.now().toString(),
      userId: 'currentUser', // This would come from auth
      userName: 'Current User', // This would come from auth
      rating,
      comment,
      helpful: 0,
      date: new Date().toISOString().split('T')[0]
    };

    setReviews([newReview, ...reviews]);
    setRating(0);
    setComment('');
  };

  const handleHelpful = (reviewId: string) => {
    setReviews(reviews.map(review =>
      review.id === reviewId
        ? { ...review, helpful: review.helpful + 1 }
        : review
    ));
  };

  return (
    <div className="space-y-8">
      {/* Review Form */}
      <form onSubmit={handleSubmitReview} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">Your Rating</label>
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
                      : 'text-gray-400'
                  }`}
                />
              </motion.button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">Your Review</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
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
      <div className="space-y-6">
        {reviews.map((review) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{review.userName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < review.rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-400'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-400">{review.date}</span>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-300">
                <Flag className="h-5 w-5" />
              </button>
            </div>

            <p className="text-white mb-4">{review.comment}</p>

            <div className="flex items-center gap-4">
              <button
                onClick={() => handleHelpful(review.id)}
                className="flex items-center gap-2 text-gray-400 hover:text-primary transition-colors"
              >
                <ThumbsUp className="h-5 w-5" />
                <span>{review.helpful}</span>
              </button>
              <button className="flex items-center gap-2 text-gray-400 hover:text-primary transition-colors">
                <MessageSquare className="h-5 w-5" />
                <span>Reply</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}