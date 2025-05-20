import React from 'react'

function ErrorLoader({text, message}: {text: string, message: string}) {
  return (
    <div className="min-h-screen bg-gradient-to-br flex items-center justify-center bg-bgPrimary dark:from-gray-900 dark:via-gray-800 dark:to-black">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-secondary mb-4">{text}</h1>
            <p className="text-black">{message}</p>
        </div>
    </div>
  )
}

export default ErrorLoader;