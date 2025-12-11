"use client";

import { useState } from 'react';
import { collection, query, where, getDocs, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Trash2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface CleanupStats {
  totalExpired: number;
  processed: number;
  failed: number;
  brandBreakdown: Array<{ brand: string; count: number }>;
}

interface ExpiredDealsCleanupProps {
  onCleanupComplete?: () => void;
}

export default function ExpiredDealsCleanup({ onCleanupComplete }: ExpiredDealsCleanupProps = {}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [stats, setStats] = useState<CleanupStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const analyzeExpiredDeals = async () => {
    setIsAnalyzing(true);
    setError(null);
    setSuccess(null);

    try {
      // Query for expired active deals
      const today = new Date();
      const expiredQuery = query(
        collection(db, 'deals_fresh'),
        where('status', '==', 'active'),
        where('expiresAt', '<', Timestamp.fromDate(today))
      );

      const snapshot = await getDocs(expiredQuery);

      // Count by brand
      const brandCounts = new Map<string, number>();
      snapshot.docs.forEach(doc => {
        const brand = doc.data().brand || 'Unknown';
        brandCounts.set(brand, (brandCounts.get(brand) || 0) + 1);
      });

      const brandBreakdown = Array.from(brandCounts.entries())
        .map(([brand, count]) => ({ brand, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setStats({
        totalExpired: snapshot.size,
        processed: 0,
        failed: 0,
        brandBreakdown
      });

    } catch (err: any) {
      setError(`Failed to analyze: ${err.message}`);
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeCleanup = async () => {
    if (!stats || stats.totalExpired === 0) return;

    setIsCleaning(true);
    setError(null);
    setSuccess(null);

    try {
      const today = new Date();
      const expiredQuery = query(
        collection(db, 'deals_fresh'),
        where('status', '==', 'active'),
        where('expiresAt', '<', Timestamp.fromDate(today))
      );

      const snapshot = await getDocs(expiredQuery);
      const batchSize = 500; // Firestore batch limit
      let processed = 0;
      let failed = 0;

      // Process in batches
      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const currentBatch = snapshot.docs.slice(i, Math.min(i + batchSize, snapshot.docs.length));

        currentBatch.forEach(dealDoc => {
          const dealRef = doc(db, 'deals_fresh', dealDoc.id);
          batch.update(dealRef, {
            status: 'inactive',
            deactivatedAt: Timestamp.now(),
            deactivationReason: 'expired',
            previousStatus: 'active'
          });
        });

        try {
          await batch.commit();
          processed += currentBatch.length;

          // Update progress
          setStats(prev => prev ? { ...prev, processed } : null);
        } catch (err: any) {
          failed += currentBatch.length;
          console.error('Batch error:', err);
        }
      }

      setSuccess(`Successfully deactivated ${processed} expired deals!`);
      setStats(prev => prev ? { ...prev, processed, failed } : null);

      // Call refresh callback if provided
      if (onCleanupComplete) {
        onCleanupComplete();
      }

    } catch (err: any) {
      setError(`Cleanup failed: ${err.message}`);
      console.error('Cleanup error:', err);
    } finally {
      setIsCleaning(false);
    }
  };

  const handleOneClickCleanup = async () => {
    // One-click: analyze then cleanup
    await analyzeExpiredDeals();

    // Check if we need to cleanup after analysis
    const today = new Date();
    const expiredQuery = query(
      collection(db, 'deals_fresh'),
      where('status', '==', 'active'),
      where('expiresAt', '<', Timestamp.fromDate(today))
    );
    const snapshot = await getDocs(expiredQuery);

    if (snapshot.size > 0) {
      // Auto-execute cleanup
      await executeCleanup();
    }
  };

  // Compact button for header
  return (
    <button
      onClick={handleOneClickCleanup}
      disabled={isAnalyzing || isCleaning}
      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title={stats ? `${stats.totalExpired} expired deals found` : 'Clean up expired deals'}
    >
      {isAnalyzing || isCleaning ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {isCleaning ? 'Cleaning...' : 'Analyzing...'}
        </>
      ) : success ? (
        <>
          <CheckCircle className="h-4 w-4" />
          Done!
        </>
      ) : stats && stats.totalExpired > 0 ? (
        <>
          <Trash2 className="h-4 w-4" />
          Clean {stats.totalExpired} Expired
        </>
      ) : (
        <>
          <Trash2 className="h-4 w-4" />
          Clean Expired
        </>
      )}
    </button>
  );
}
