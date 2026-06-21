export function LogoVOAZ({ size = 36, white = false }) {
  const stroke = white ? '#ffffff' : '#2e2e2e'
  const fill   = white ? '#ffffff' : '#2e2e2e'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="4" y="4" width="92" height="92" rx="2" stroke={stroke} strokeWidth="7"/>
      <text
        x="18" y="48"
        fontFamily="Inter, sans-serif"
        fontWeight="800"
        fontSize="36"
        fill={fill}
        letterSpacing="2"
      >V O</text>
      <text
        x="18" y="86"
        fontFamily="Inter, sans-serif"
        fontWeight="800"
        fontSize="36"
        fill={fill}
        letterSpacing="2"
      >A Z</text>
    </svg>
  )
}
