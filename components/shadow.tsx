import React from 'react';

function ShadowScale() {
  return (
    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/10 to-transparent transition-transform duration-500 group-hover:scale-110" />
  )
}

export default ShadowScale;