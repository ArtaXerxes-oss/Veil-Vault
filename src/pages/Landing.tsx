import { Link } from "../App";

export function Landing() {
  return (
    <div className="landing">
      <section className="landing-hero" aria-label="VEIL Vault">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">Private time-locked assets · Midnight</p>
          <p className="landing-brand">VEIL</p>
          <h1 className="landing-headline">
            Private value, unlocked on your schedule.
          </h1>
          <p className="landing-lede">
            Time-locked vaults on Midnight — balances stay shielded, rules are
            enforced by Compact circuits, and only you decide when they open.
          </p>
          <div className="landing-cta">
            <Link href="#/app" className="primary-button landing-cta-primary">
              Open app <span>↗</span>
            </Link>
            <Link href="#/deploy" className="secondary-button">
              Deploy contract
            </Link>
          </div>
          <p className="landing-disclaimer">
            DUST-FREE · ZERO-GAS FLOWS VIA THE 1AM WALLET · SELF-CUSTODY
          </p>
        </div>
        <div className="landing-hero-visual" aria-hidden="true">
          <img src="/veil-hero.png" alt="" className="landing-hero-image" />
          <div className="landing-hero-sheen" />
          <div className="hero-stat-card hero-stat-card--1">
            <span className="hero-stat-label">Latest lock</span>
            <span className="hero-stat-value">+4.2k NIGHT</span>
            <span className="hero-stat-dot" />
          </div>
          <div className="hero-stat-card hero-stat-card--2">
            <span className="hero-stat-label">Balance visibility</span>
            <span className="hero-stat-value">Shielded</span>
            <span className="hero-stat-dot" />
          </div>
        </div>
      </section>

      <section className="trust-bar" aria-label="Trusted on">
        <div className="trust-bar-inner">
          <span>Midnight network</span>
          <i className="trust-sep" />
          <span>Compact circuits</span>
          <i className="trust-sep" />
          <span>1AM wallet</span>
          <i className="trust-sep" />
          <span>Zero gas</span>
          <i className="trust-sep" />
          <span>Self-custody</span>
        </div>
      </section>

      <section className="landing-stats" aria-label="Key facts">
        <div className="landing-stats-inner">
          <div className="stat-block">
            <strong>100%</strong>
            <span>of release rules enforced on-chain</span>
          </div>
          <i className="stat-divider" />
          <div className="stat-block">
            <strong>0</strong>
            <span>gas paid by users via 1AM dust sponsorship</span>
          </div>
          <i className="stat-divider" />
          <div className="stat-block">
            <strong>ZK</strong>
            <span>proved privacy — balances are never public</span>
          </div>
          <i className="stat-divider" />
          <div className="stat-block">
            <strong>2</strong>
            <span>release modes — strict lock or early exit</span>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--split">
        <div className="landing-section-copy">
          <p className="landing-eyebrow">Why VEIL</p>
          <h2>Built for quiet certainty.</h2>
          <p>
            VEIL turns future intentions into verifiable contracts. You pick
            the condition, the amount, and the moment — then walk away knowing
            the network will hold the line.
          </p>
          <div className="landing-cta">
            <Link href="#/create" className="secondary-button">
              Create a vault <span>↗</span>
            </Link>
          </div>
        </div>
        <div className="landing-section-features">
          <article className="feature-card">
            <span className="feature-icon">◈</span>
            <div>
              <h3>Private by default</h3>
              <p>
                Shielded balances and witness data stay hidden until your
                conditions are met.
              </p>
            </div>
          </article>
          <article className="feature-card">
            <span className="feature-icon">⌁</span>
            <div>
              <h3>Programmable release</h3>
              <p>
                Strict release for discipline, or early exit with a transparent
                penalty paid to treasury.
              </p>
            </div>
          </article>
          <article className="feature-card">
            <span className="feature-icon">◉</span>
            <div>
              <h3>Zero-gas flows</h3>
              <p>
                The 1AM wallet sponsors dust fees — deploy, lock, and withdraw
                without a fee screen.
              </p>
            </div>
          </article>
          <article className="feature-card">
            <span className="feature-icon">▤</span>
            <div>
              <h3>Audit-ready</h3>
              <p>
                Every action settles on-chain with a verifiable trail you can
                follow in history.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="landing-flow-section">
        <header className="landing-flow-header">
          <p className="landing-eyebrow">How it works</p>
          <h2>From empty wallet to timed release in three moves.</h2>
        </header>
        <div className="landing-flow">
          <article className="landing-flow-item">
            <span>01</span>
            <h3>Connect</h3>
            <p>Install 1AM or Lace on preprod and approve the connection once.</p>
          </article>
          <article className="landing-flow-item">
            <span>02</span>
            <h3>Deploy</h3>
            <p>Publish the Compact vault contract and initialize the treasury.</p>
          </article>
          <article className="landing-flow-item">
            <span>03</span>
            <h3>Lock</h3>
            <p>Choose an amount, a release time, and a strict or penalty mode.</p>
          </article>
          <article className="landing-flow-item">
            <span>04</span>
            <h3>Release</h3>
            <p>Withdraw when the clock clears — or exit early and pay the penalty.</p>
          </article>
        </div>
      </section>

      <section className="landing-callout">
        <div className="landing-callout-inner">
          <div className="landing-callout-text">
            <p className="landing-eyebrow">The Midnight difference</p>
            <h2>Privacy that settles, not just promises.</h2>
            <p>
              VEIL runs on Midnight's Compact proving system, so your vault
              terms are checked and enforced without ever exposing who holds
              what or when they unlock.
            </p>
          </div>
          <div className="landing-callout-pills">
            <div className="callout-pill">
              <span className="callout-pill-dot" />
              <div>
                <strong>Proofs verify, balances never reveal</strong>
                <span>ZK circuits check the rules while keeping amounts shielded.</span>
              </div>
            </div>
            <div className="callout-pill">
              <span className="callout-pill-dot" />
              <div>
                <strong>Funds stay yours</strong>
                <span>Self-custody throughout — no intermediary ever holds the assets.</span>
              </div>
            </div>
            <div className="callout-pill">
              <span className="callout-pill-dot" />
              <div>
                <strong>Time-locks by design</strong>
                <span>Enforced release conditions, encoded not promised.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-bottom-cta">
        <h2>Lock it once. Release on your terms.</h2>
        <p>
          Deploy the vault, link your Midnight wallet, and set a future that
          holds on your behalf.
        </p>
        <div className="landing-cta landing-cta--centered">
          <Link href="#/app" className="primary-button landing-cta-primary">
            Open app <span>↗</span>
          </Link>
          <Link href="#/deploy" className="secondary-button">
            Deploy contract
          </Link>
        </div>
      </section>
    </div>
  );
}