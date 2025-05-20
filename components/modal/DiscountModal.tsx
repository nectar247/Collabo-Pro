/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DiscountModal({ deal, isModalOpen, setIsModalOpen }: any) {
    const router = useRouter();
    const [subscribedEmail, setSubscribedEmail] = useState('');
    const [subsIsChecked, setSubsIsChecked] = useState(false);
    const [formError, setFormError] = useState('');
    
    const [copied, setCopied] = useState(false);

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
        // Clear any previous errors
        setFormError('');
        
        // Validation
        if (!subscribedEmail) {
            setFormError('Please enter your email address');
            return;
        }
        
        if (!subsIsChecked) {
            setFormError('Please agree to the Terms & Conditions');
            return;
        }
        
        // Process the reward
        console.log(deal);
        
        // Open the link
        if (typeof window !== "undefined") {
            window.open(deal.link, "_blank", "noopener,noreferrer");
        } else {
            router.push(deal.link); // Fallback for server-side rendering
        }
        
        // Close the modal after successful submission
        setIsModalOpen(false);
    }

    return (
        isModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-[2] overflow-y-auto max-h-[255px]">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full transition-transform scale-95 animate-fadeIn">
                    {/* Close Button */}
                    <button
                        onClick={() => setIsModalOpen(false)}
                        className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 dark:hover:text-white"
                    >
                        ✖
                    </button>

                    {/* Brand Logo */}
                    <div className="flex justify-center mb-4">
                        {/* <img
                            src={deal.image}
                            alt={deal.title}
                            className="max-w-[200px] max-h-[200px] object-cover rounded-lg"
                        /> */}
                    </div>

                    {/* Promo Details */}
                    <h2 className="text-center text-primary font-bold text-lg">
                        {deal.description}
                    </h2>

                    {['GetReward'].includes(deal.label) ?
                        <>
                            <hr className="my-2 border-gray-300" />
                            <h2 className="text-[14px] text-center text-gray-700" style={{lineHeight:1}}>
                            Sign up to our mailing list so that we can send you updates about new deals. You can unsubscribe at any time
                            </h2>
                            <hr className="my-2 border-gray-300" />
                            <div>
                                <div>
                                    <div className="relative">
                                        <input
                                        type="email"
                                        value={subscribedEmail}
                                        onChange={(e) => setSubscribedEmail(e.target.value)}
                                        className="w-full px-4 py-3 bg-white/5 border dark:border-white/10 rounded-lg text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary pl-10"
                                        placeholder="Enter your email"
                                        required
                                        />
                                        <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                        <button
                                            type="submit"
                                            className="bg-gradient-to-r from-secondary to-secondary-dark text-white py-2 rounded-lg font-medium hover:shadow-lg hover:shadow-primary/50 transition-all duration-300 absolute group right-0 px-4 mt-[5px] mr-[5px]"
                                            onClick={handleReward}
                                        >
                                            Submit
                                        </button>
                                        <label className="text-[14px] flex items-start mt-2 text-gray-700">
                                            <input
                                                type="checkbox"
                                                required
                                                className="mr-2 w-5 h-5"
                                                checked={subsIsChecked}
                                                onChange={(e)=>setSubsIsChecked(e.target.checked)}
                                            />
                                            <p style={{lineHeight:1}}>
                                            Please tick this box to confirm you&#39;ve read and agree to our <Link href="/terms-of-service" target="_blank" className="underline">Terms & Conditions</Link> and <Link href="/privacy-policy" target="_blank" className="underline">Privacy Policy.</Link>
                                            </p>
                                        </label>
                                        
                                        {/* Error message display */}
                                        {formError && (
                                            <p className="text-red-500 text-sm mt-2">{formError}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>:<></>
                    }

                    {/* Discount Code */}
                    {['GetCode'].includes(deal.label) ?
                    <div className="flex items-center justify-between border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 p-3 rounded mt-4">
                        <span className="text-gray-800 dark:text-gray-200 font-mono text-lg">
                            {deal.code}
                        </span>
                        <button
                            onClick={copyToClipboard}
                            className="bg-secondary text-white px-3 py-1 rounded hover:bg-secondary transition"
                        >
                            {copied ? (
                                <span className="flex">
                                    <Check className="h-3 w-3 mr-1 items-center" />
                                    Copied!
                                </span>
                            ) : (
                                <span className="flex">
                                    <Copy className="h-3 w-3 mr-1 items-center" />
                                    Copy Code
                                </span>
                            )}
                        </button>
                    </div>:''}

                    {/* Go to Site Button */}
                    {['GetCode', 'GetDeals'].includes(deal.label) ?
                    <Link
                        href={deal.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center bg-secondary text-white mt-4 px-4 py-2 rounded hover:bg-secondary transition"
                        onClick={(e) => {
                            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                            if (isIOS) { // Open in new tab for iOS devices
                                e.preventDefault();
                                window.open(deal.link, "_blank", "noopener,noreferrer");
                            }
                        }
                    }
                    >
                        {deal.label == 'GetCode'?
                        <>Go to Deal site</>:<>Go to Deal site</>
                            // <>Go to Deal site</>:<>{DealsLabel[deal.label]}</>
                        }
                    </Link>:<></>}
                </div>
            </div>
        )
    );
}