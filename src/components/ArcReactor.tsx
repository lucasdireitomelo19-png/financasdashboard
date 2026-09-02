export function ArcReactor({ size = 28 }: { size?: number }) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }} aria-hidden="true">
      <span
        className="absolute inset-0 animate-spin-slow rounded-full border-2 border-transparent"
        style={{ borderTopColor: 'var(--color-accent)', borderRightColor: 'var(--color-accent)' }}
      />
      <span
        className="absolute inset-[3px] animate-spin-reverse rounded-full border border-transparent"
        style={{ borderBottomColor: 'var(--color-accent-2)', borderLeftColor: 'var(--color-accent-2)' }}
      />
      <span
        className="absolute inset-[7px] rounded-full"
        style={{
          background: 'radial-gradient(circle, #fff 0%, var(--color-accent) 45%, transparent 75%)',
          boxShadow: '0 0 10px 2px color-mix(in srgb, var(--color-accent) 85%, transparent)',
        }}
      />
    </span>
  )
}
