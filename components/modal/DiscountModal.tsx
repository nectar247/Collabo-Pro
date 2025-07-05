/* eslint-disable @next/next/no-img-element */
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Check, Copy, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

interface DiscountModalProps {
  deal: any;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
}

export default function DiscountModal({ deal, isModalOpen, setIsModalOpen }: DiscountModalProps) {
  const router = useRouter();
  const [subscribedEmail, setSubscribedEmail] = useState('');
  const [subsIsChecked, setSubsIsChecked] = useState(false);
  const [formError, setFormError] = useState('');
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Ensure we're in the browser before portal
  useEffect(() => { setMounted(true); }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(deal.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleReward = () => {
    setFormError('');
    if (!subscribedEmail) {
      setFormError('Please enter your email address');
      return;
    }
    if (!subsIsChecked) {
      setFormError('Please agree to the Terms & Conditions');
      return;
    }
    if (typeof window !== "undefined") {
      window.open(deal.link, "_blank", "noopener,noreferrer");
    } else {
      router.push(deal.link);
    }
    setIsModalOpen(false);
  };

  if (!isModalOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={() => setIsModalOpen(false)}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 dark:hover:text-white"
        >
          ✖
        </button>

        {/* Promo Details */}
        <h2 className="text-center text-primary font-bold text-lg mb-3">
          {deal.description}
          <hr></hr>
        </h2>
        {/* Reward Form */}
        {deal.label === 'GetReward' && (
          <>
            <hr className="my-2 border-gray-300" />
            <p className="text-[14px] text-center text-gray-700 mb-2">
              Sign up to our mailing list so that we can send you updates about new deals.
              <br />
              You can unsubscribe at any time
            </p>
            <div className="mt-2 mb-4">
              <input
                type="email"
                value={subscribedEmail}
                onChange={(e) => setSubscribedEmail(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Enter your email"
              />
              <button
                onClick={handleReward}
                className="mt-2 w-full bg-gradient-to-r from-secondary to-secondary-dark text-white py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300"
              >
                Submit
              </button>
              <label className="flex items-start mt-2 text-gray-700">
                <input
                  type="checkbox"
                  checked={subsIsChecked}
                  onChange={(e) => setSubsIsChecked(e.target.checked)}
                  className="mr-2 w-5 h-5"
                />
                <span className="text-[14px]">
                  I agree to the <Link href="/terms-of-service" target="_blank" className="underline">Terms & Conditions</Link> and <Link href="/privacy-policy" target="_blank" className="underline">Privacy Policy</Link>.
                </span>
              </label>
              {formError && <p className="text-red-500 text-sm mt-2">{formError}</p>}
            </div>
          </>
        )}

        {/* Get Code Section */}
        {deal.label === 'GetCode' && (
          <div className="flex items-center justify-between border p-3 rounded mb-4">
            <span className="font-mono text-lg">{deal.code}</span>
            <button onClick={copyToClipboard} className="px-3 py-1 rounded bg-secondary text-white hover:bg-secondary-dark transition">
              {copied ? (<><Check className="inline-block w-4 h-4 mr-1"/>Copied</>) : (<><Copy className="inline-block w-4 h-4 mr-1"/>Copy</>)}
            </button>
          </div>
        )}

        {/* Go to Deal Site */}
        {(deal.label === 'GetCode' || deal.label === 'GetDeals') && (
          <a
            href={deal.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center bg-secondary text-white py-2 rounded-lg hover:bg-secondary-dark transition"
          >Go to Deal site</a>
        )}
      </div>
    </div>,
    document.body
  );
}
