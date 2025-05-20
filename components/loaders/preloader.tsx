import React from 'react'

function Preloader({text}: {text: string}) {
  return (
    <div className="min-h-screen bg-gradient-to-br flex items-center justify-center bg-bgPrimary dark:from-gray-900 dark:via-gray-800 dark:to-black">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-black mt-4">{text}</p>
        </div>
    </div>
  )
}

export default Preloader;