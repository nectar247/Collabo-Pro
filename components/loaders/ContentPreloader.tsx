import React from 'react'

function ContentPreloader({text}: {text: string}) {
  return (
    <div className="text-center py-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tertiary mx-auto"></div>
      <p className="text-white mt-4">{text}</p>
    </div>
  )
}

export default ContentPreloader;