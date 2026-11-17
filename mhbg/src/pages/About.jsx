import { useState } from 'react';
import Reveal from '../components/Reveal.jsx';
import { useSite } from '../lib/SiteContext.jsx';

const pillars = [
  ['I', 'Identity', 'Know who you are.'],
  ['II', 'Purpose', 'Understand why you are here.'],
  ['III', 'Capacity', 'Develop what God has placed within you.'],
  ['IV', 'Impact', 'Use it to change lives.'],
];

const values = [
  ['Faith', 'We believe in God, His Word and His ability to marvellously help us.'],
  ['Integrity', 'We do what is right and remain aligned with our values, even when it is difficult.'],
  ['Excellence', 'We develop our gifts, build capacity and give our best to what God has entrusted to us.'],
  ['Love', 'We lead with compassion, generosity and a genuine desire to see others thrive.'],
  ['Identity', 'We live from an understanding of who we are and whose we are.'],
  ['Impact', 'We use our gifts, opportunities and influence to make a meaningful difference beyond ourselves.'],
];

const BIO = [
  'Modupe Bakare is a purpose-driven leader and mentor passionate about helping people discover their God-given identity, fulfil their purpose, and make a lasting impact.',
  'With over 22 years of professional experience across the technology and consumer goods industries, she has built an international career spanning Nigeria, the Netherlands, and the United Kingdom, holding leadership roles at global organisations including Heineken and Google.',
  'Modupe holds a BSc in Chemistry from the University of Ibadan and an Executive MBA from Imperial College Business School, London. She is also a Fellow of the Association of Chartered Certified Accountants (FCCA).',
  "Beyond her professional accomplishments lies a powerful testimony of God's faithfulness. At ten, she survived a serious car accident that left her immobile for almost a year. She subsequently overcame significant academic setbacks, survived a gunshot injury early in her career, and navigated the painful journey of losing a loved one.",
  "Through these experiences, she has learnt that God's help does not guarantee a life without challenges, but His grace can restore, redirect, sustain, and enable us to thrive despite them.",
  'This conviction gave birth to Marvellously Helped by God (MHBG), a faith-led initiative dedicated to raising leaders who make global impact. As Lead Facilitator, Modupe seeks to inspire and equip young adults through testimonies, mentorship, purposeful gatherings, and practical empowerment.',
  "At the heart of her work is a simple desire: to show the love and share the hope she has enjoyed through God's faithfulness, so that others may experience His help and flourish in their own journeys.",
];

export default function About() {
  const { settings } = useSite();
  const [photoFailed, setPhotoFailed] = useState(false);
  const photo = settings?.founder_photo_url || '/images/founder.jpg';

  return (
    <>
      <section className="section-white" id="about">
        <Reveal className="wrap" style={{ maxWidth: 800 }}>
          <p className="kicker">About us</p>
          <h2>Why we gather</h2>
          <p>
            Every testimony here is memory, and memory builds faith for what's next. Marvellously Helped by God exists
            to give those stories a home — a space for connection, encouragement, updates, testimonies, laughter and
            shared moments as we celebrate God's faithfulness together.
          </p>
          <p style={{ color: 'var(--ink-soft)' }}>
            We believe God's help is not an end in itself. We are helped to become strong, and we become strong so that
            we can strengthen others.
          </p>
        </Reveal>
      </section>

      <section className="section-dew">
        <div className="wrap">
          <Reveal>
            <p className="kicker">Vision &amp; mission</p>
            <h2>What we're working toward</h2>
          </Reveal>
          <Reveal className="grid grid-2">
            <div className="value-card">
              <p className="kicker" style={{ color: 'var(--green-deep)' }}>Vision</p>
              <h3>Raising leaders who make global impact.</h3>
              <p style={{ color: 'var(--ink-soft)', fontSize: '.9rem' }}>Psalm 2:8</p>
            </div>
            <div className="value-card" style={{ background: 'var(--root)', borderColor: '#2c4430' }}>
              <p className="kicker" style={{ color: 'var(--dawn)' }}>Mission</p>
              <p style={{ color: 'var(--dew)', margin: 0 }}>
                To equip people to discover who they are in God, develop their potential, fulfil their purpose and use
                their influence to transform lives and communities.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section-white">
        <div className="wrap">
          <Reveal>
            <p className="kicker">How the movement works</p>
            <h2>Four pillars, walked in order</h2>
          </Reveal>
          <Reveal className="pillar-row">
            {pillars.map(([num, title, text]) => (
              <div className="pillar" key={title}>
                <span className="num">{num}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section-dew">
        <div className="wrap">
          <Reveal>
            <p className="kicker">Core values</p>
            <h2>Six values we live by</h2>
          </Reveal>
          <Reveal className="value-list">
            {values.map(([title, text]) => (
              <div className="value-item" key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="section-white">
        <div className="wrap">
          <Reveal>
            <p className="kicker">Lead facilitator</p>
            <h2>Modupe Bakare</h2>
          </Reveal>
          <Reveal className="founder-block">
            <div className="founder-photo">
              {photoFailed ? (
                <span>Photo coming soon</span>
              ) : (
                <img
                  src={photo}
                  alt="Modupe Bakare speaking at an MHBG conference, in front of the God-Given Identity screen"
                  onError={() => setPhotoFailed(true)}
                />
              )}
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--green-deep)', marginBottom: '.8rem' }}>
                Lead Facilitator, Marvellously Helped by God (MHBG)
              </p>
              <blockquote className="hero-verse" style={{ color: 'var(--ink)', borderColor: 'var(--green)', fontSize: '1.3rem' }}>
                "I am a girl who has been marvellously helped by God, and I believe that what God has done in my life, He
                desires to multiply in the lives of others."
              </blockquote>
            </div>
          </Reveal>
          <Reveal style={{ maxWidth: '76ch', marginTop: '2rem' }}>
            {BIO.map((p, i) => (
              <p key={i} style={{ fontSize: '1.05rem', color: 'var(--ink-soft)' }}>{p}</p>
            ))}
          </Reveal>
          <p style={{ fontFamily: 'var(--font-script)', fontStyle: 'italic', fontSize: '1.3rem', color: 'var(--green-deep)', marginTop: '1.5rem' }}>
            We are Marvellously Helped by God, and we are getting stronger. — 2 Chronicles 26:15b
          </p>
        </div>
      </section>
    </>
  );
}
