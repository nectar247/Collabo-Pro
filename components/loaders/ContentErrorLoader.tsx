import React from 'react'

function ContentErrorLoader({text, message}: {text: string, message: string}) {
  return (
    <div className="text-center py-8">
      <p className="text-red-500">{text}: {message}</p>
    </div>
  )
}

export default ContentErrorLoader;