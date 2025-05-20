"use client";

import { motion } from "framer-motion";

export default function Maintenance() {

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-bgPrimary dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-black">
      <div className="w-full max-w-4xl mx-auto text-center">
        {/* 404 Animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.5,
            type: "spring",
            stiffness: 100
          }}
          className="mb-8"
        >
          <h1 className="text-[40px] font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-dark leading-none">
            Quick Maintenance
          </h1>
        </motion.div>

        {/* Error Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-primary dark:text-white mb-4">Back Shortly</h2>
          <p className="text-gray-400 max-w-lg mx-auto">
            We are running a quick maintenance and will be back shortly
          </p>
        </motion.div>

      </div>
    </main>
  );
}