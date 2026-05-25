export default function MallHeader() {
  return (
    <header className="mall-header">
      <p className="mall-location">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
        </svg>
        Chipichape Cali
      </p>
      <div className="mall-brand">
        <h1 className="mall-logo" aria-label="snap n' win">
          <span className="mall-logo__snap">snap </span>
          <span className="mall-logo__n">n&apos;</span>
          <span className="mall-logo__bolt" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"
                fill="#ff8c1a"
                stroke="#ff8c1a"
                strokeWidth="0.5"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="mall-logo__win"> win</span>
        </h1>
        <p className="mall-tagline">
          <span className="mall-tagline__live">live </span>
          <span className="mall-tagline__exp">experience</span>
        </p>
      </div>
    </header>
  )
}
