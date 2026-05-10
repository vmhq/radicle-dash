export function Backdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute -top-40 left-1/2 h-[680px] w-[1200px] -translate-x-1/2 bg-mesh opacity-80" />
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(180,244,129,0.45), transparent)",
        }}
      />
    </div>
  );
}
