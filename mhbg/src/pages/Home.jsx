import { useState } from 'react';
import { Link } from 'react-router-dom';
import Countdown from '../components/Countdown.jsx';
import Reveal from '../components/Reveal.jsx';
import { useSite } from '../lib/SiteContext.jsx';

export default function Home() {
  const { settings } = useSite();
  const [heroFailed, setHeroFailed] = useState(false);
  const hero = settings?.hero_image_url || '/images/hero.jpg';

  return (
    <>
      <section className="hero" id="home">
        <div className="hero-media" aria-hidden="true">
          {!heroFailed && <img src={hero} alt="" onError={() => setHeroFailed(true)} />}
        </div>
        <div className="wrap hero-layout">
          <div className="hero-inner">
            <p className="kicker">We are Marvellously Helped</p>
            <h1>Raising leaders who make global impact</h1>
            <p className="lede">
              A faith-led movement raising people to know their identity, fulfil purpose and make impact — through
              connection, encouragement, testimonies, laughter and shared moments.
            </p>
            <blockquote className="hero-verse">
              "…for we are marvellously helped, and we are becoming stronger"
              <cite>2 Chronicles 26:15b</cite>
            </blockquote>
            <div className="hero-actions">
              <Link to="/testimonies/share" className="btn btn-primary">Share your testimony</Link>
              <Link to="/conference" className="btn btn-outline">This year's conference</Link>
            </div>
          </div>
          <Countdown />
        </div>
      </section>

      <section className="section-dew">
        <div className="wrap">
          <Reveal className="section-head">
            <div>
              <p className="kicker">Who we are</p>
              <h2>A movement, not a moment</h2>
            </div>
          </Reveal>
          <Reveal>
            <p style={{ fontSize: '1.08rem', maxWidth: '70ch' }}>
              We are a Christian, faith-led movement committed to raising people who know their identity in God, take
              responsibility for developing their gifts, pursue purpose with faith and excellence, and use their success
              and influence to create opportunities for others. We complement the work of the local church — we are not
              a replacement for it.
            </p>
            <Link to="/about" className="btn btn-outline-dark">More about the movement</Link>
          </Reveal>
        </div>
      </section>

      <section className="section-green">
        <Reveal className="wrap" style={{ textAlign: 'center' }}>
          <h2>Have something God has done for you?</h2>
          <p style={{ maxWidth: '50ch', margin: '0 auto 1.6rem', color: 'var(--ink)' }}>
            However small or large, your story could be exactly what someone else needs to hear today.
          </p>
          <Link to="/testimonies/share" className="btn btn-outline-dark">Share your testimony</Link>
        </Reveal>
      </section>
    </>
  );
}
