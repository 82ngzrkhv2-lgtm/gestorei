import { ImageResponse } from 'next/og'

export const size = {
  width: 512,
  height: 512,
}

export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#080d17',
        }}
      >
        <div style={{ display: 'flex', width: '80%', height: '80%', position: 'relative' }}>
          {/* Back Layer - Light Silver */}
          <div
            style={{
              position: 'absolute',
              top: '14%',
              left: '14%',
              width: '56%',
              height: '56%',
              borderRadius: '14%',
              background: '#C4C5C8',
            }}
          />
          
          {/* Middle Layer - Dark Gray */}
          <div
            style={{
              position: 'absolute',
              top: '25%',
              left: '25%',
              width: '56%',
              height: '56%',
              borderRadius: '14%',
              background: '#4F5257',
              boxShadow: '-4px 4px 12px rgba(0,0,0,0.5)',
            }}
          />
          
          {/* Front Layer - Near Black */}
          <div
            style={{
              position: 'absolute',
              top: '36%',
              left: '36%',
              width: '56%',
              height: '56%',
              borderRadius: '14%',
              background: '#1C1C1F',
              boxShadow: '-6px 6px 16px rgba(0,0,0,0.6)',
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
