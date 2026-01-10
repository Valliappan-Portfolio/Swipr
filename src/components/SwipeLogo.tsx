export function SwipeLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <div
      className={`${className} rounded-lg overflow-hidden`}
      style={{
        background: 'transparent',
      }}
    >
      <img
        src="/logo.png"
        alt="Swipr Logo"
        className="w-full h-full"
        style={{
          objectFit: 'contain',
          objectPosition: 'center',
          transform: 'scale(1.4)', // Zoom in to crop out white border
        }}
      />
    </div>
  );
}
