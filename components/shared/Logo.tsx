import React from 'react'

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
}

export default function Logo({ size = 32, ...props }: LogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <filter id="layer-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="-2" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
        </filter>
        <filter id="layer-shadow-strong" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="-3" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
        </filter>
      </defs>
      
      {/* Back Layer - Light Silver */}
      <rect x="14" y="14" width="56" height="56" rx="14" fill="#C4C5C8" />
      
      {/* Middle Layer - Dark Gray */}
      <rect x="25" y="25" width="56" height="56" rx="14" fill="#4F5257" filter="url(#layer-shadow)" />
      
      {/* Front Layer - Near Black */}
      <rect x="36" y="36" width="56" height="56" rx="14" fill="#1C1C1F" filter="url(#layer-shadow-strong)" />
    </svg>
  )
}
