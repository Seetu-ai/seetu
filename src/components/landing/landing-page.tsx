'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export function LandingPage() {
  const router = useRouter();
  const [urlInput, setUrlInput] = useState('');

  useEffect(() => {
    // Reveal animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).style.opacity = '1';
          (entry.target as HTMLElement).style.transform = 'translateY(0)';
        }
      });
    });

    document.querySelectorAll('.reveal-text, .step-card, .fly-node').forEach(el => {
      (el as HTMLElement).style.opacity = '0';
      (el as HTMLElement).style.transform = 'translateY(20px)';
      (el as HTMLElement).style.transition = 'all 0.6s ease';
      observer.observe(el);
    });

    // Hero Animation
    const title = document.querySelector('.hero-title') as HTMLElement;
    const visual = document.querySelector('.ar-wrapper') as HTMLElement;
    if (title) {
      title.style.opacity = '0';
      title.style.transform = 'translateY(20px)';
      title.style.transition = 'all 0.8s ease-out';
    }
    if (visual) {
      visual.style.opacity = '0';
      visual.style.transform = 'translateX(20px)';
      visual.style.transition = 'all 0.8s ease-out 0.2s';
    }
    setTimeout(() => {
      if (title) {
        title.style.opacity = '1';
        title.style.transform = 'translateY(0)';
      }
      if (visual) {
        visual.style.opacity = '1';
        visual.style.transform = 'translateX(0)';
      }
    }, 100);

    return () => observer.disconnect();
  }, []);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    // Redirect to signup with the URL as a param
    if (urlInput) {
      router.push(`/signup?url=${encodeURIComponent(urlInput)}`);
    } else {
      router.push('/signup');
    }
  };

  return (
    <>
      <style jsx global>{`
        :root {
          --bg: #FDFBF7;
          --surface: #FFFFFF;
          --text-main: #1A1A1A;
          --text-muted: #5A5A55;
          --border-light: #EBE5D5;
          --terracotta: #C65D3B;
          --accent: var(--terracotta);
          --accent-glow: rgba(198, 93, 59, 0.15);
          --data-blue: #2D7FF9;
          --success-green: #27AE60;
          --font-display: 'Syne', sans-serif;
          --font-body: 'Inter', sans-serif;
          --ease: cubic-bezier(0.23, 1, 0.32, 1);
          --shadow-card: 0 30px 60px -12px rgba(0,0,0,0.08);
        }

        .landing-page * { margin: 0; padding: 0; box-sizing: border-box; }

        .landing-page {
          background-color: var(--bg);
          color: var(--text-main);
          font-family: var(--font-body);
          overflow-x: hidden;
          font-size: 16px;
          line-height: 1.5;
          min-height: 100vh;
        }

        .afro-pattern {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background-image:
            linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          z-index: -1;
          mask-image: radial-gradient(circle at center, black 40%, transparent 90%);
        }

        .landing-page h1, .landing-page h2, .landing-page h3 {
          font-family: var(--font-display);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }

        .hero-title {
          font-size: clamp(2.5rem, 4vw, 3.8rem);
          text-transform: uppercase;
          margin-bottom: 1.2rem;
          color: var(--text-main);
          position: relative;
          max-width: 600px;
        }

        .section-title {
          font-size: clamp(1.8rem, 3vw, 2.8rem);
          margin-bottom: 1rem;
          text-align: center;
        }

        .highlight {
          color: var(--accent);
          display: inline-block;
          position: relative;
        }
        .highlight::after {
          content: ''; position: absolute; bottom: 3px; left: 0; width: 100%; height: 0.15em;
          background: var(--accent); opacity: 0.15; transform: skewX(-10deg);
        }

        .container { max-width: 1250px; margin: 0 auto; padding: 0 2rem; }
        .landing-page section { padding: 5rem 0; position: relative; }

        .landing-header {
          position: fixed; top: 0; width: 100%; z-index: 100;
          padding: 1rem 0;
          background: rgba(253, 251, 247, 0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-light);
        }
        .nav-flex { display: flex; justify-content: space-between; align-items: center; }
        .logo { font-family: var(--font-display); font-weight: 800; font-size: 1.4rem; color: var(--text-main); display: flex; align-items: center; gap: 8px; text-decoration: none; }
        .logo span { color: var(--accent); font-size: 1.6rem; line-height: 0; padding-bottom: 5px; }

        .hero-section { min-height: 90vh; display: flex; align-items: center; padding-top: 5rem; position: relative; }
        .hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center; width: 100%; }

        .ar-wrapper {
          position: relative; height: 500px; width: 100%;
          perspective: 2000px;
          display: flex; justify-content: center; align-items: center;
        }

        .main-visual {
          position: absolute; width: 300px; height: 100%; border-radius: 20px;
          background-image: url('https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=800');
          background-size: cover; background-position: center;
          box-shadow: var(--shadow-card);
          transform: rotateY(-10deg) rotateX(5deg);
          transition: transform 0.5s ease-out;
          z-index: 1;
          filter: brightness(0.95);
        }
        .ar-wrapper:hover .main-visual { transform: rotateY(-5deg) rotateX(2deg); }

        .intel-overlay {
          position: absolute; width: 300px; height: 100%; z-index: 2; pointer-events: none;
          transform: rotateY(-10deg) rotateX(5deg) translateZ(30px);
        }

        .node-card {
          position: absolute; background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px); padding: 10px 14px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.5);
          box-shadow: 0 8px 16px rgba(0,0,0,0.1);
          font-size: 0.75rem; display: flex; align-items: center; gap: 8px;
          animation: float 6s infinite ease-in-out;
          opacity: 0; animation-fill-mode: forwards; white-space: nowrap;
        }
        .node-icon {
          width: 24px; height: 24px; border-radius: 5px;
          display: flex; align-items: center; justify-content: center; color: white;
        }

        .n-1 { top: 15%; left: -60px; animation-delay: 0.5s; }
        .n-1 .node-icon { background: var(--accent); }
        .n-2 { top: 45%; right: -50px; animation-delay: 1s; }
        .n-2 .node-icon { background: var(--data-blue); }
        .n-3 { bottom: 20%; left: -20px; animation-delay: 1.5s; }
        .n-3 .node-icon { background: var(--text-main); }

        @keyframes float {
          0% { opacity: 0; transform: translateY(10px); }
          10% { opacity: 1; transform: translateY(0); }
          50% { transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .onboard-bar {
          background: white; border: 1px solid var(--border-light); border-radius: 10px;
          padding: 6px; display: flex; gap: 8px; margin-top: 25px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.04);
          max-width: 440px;
          transition: border-color 0.3s, box-shadow 0.3s;
        }
        .onboard-bar:focus-within { border-color: var(--accent); box-shadow: 0 8px 30px var(--accent-glow); }

        .url-input {
          flex: 1; border: none; outline: none; padding-left: 10px; font-size: 0.95rem; color: var(--text-main);
          background: transparent;
        }

        .btn-start {
          background: var(--text-main); color: white; font-weight: 600; font-size: 0.9rem;
          padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer;
          transition: all 0.2s; white-space: nowrap;
        }
        .btn-start:hover { background: var(--accent); }

        .system-status { display: flex; gap: 15px; margin-top: 15px; font-size: 0.75rem; color: var(--text-muted); font-weight: 500; opacity: 0.8; }
        .status-dot { width: 6px; height: 6px; background: var(--success-green); border-radius: 50%; display: inline-block; margin-right: 5px; }

        .learn-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 3rem; position: relative; }
        .learn-line {
          position: absolute; top: 35px; left: 10%; width: 80%; height: 2px;
          background: repeating-linear-gradient(to right, var(--border-light) 0, var(--border-light) 8px, transparent 8px, transparent 16px);
          z-index: -1;
        }
        .step-card {
          background: var(--surface); padding: 25px; border: 1px solid var(--border-light);
          border-radius: 8px; text-align: center; transition: transform 0.3s;
        }
        .step-card:hover { transform: translateY(-5px); border-color: var(--accent); }
        .step-icon {
          width: 70px; height: 70px; background: var(--bg); border: 1px solid var(--border-light);
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          margin: 0 auto 15px auto; font-size: 1.4rem; color: var(--accent);
          position: relative; z-index: 2;
        }

        .comp-container {
          display: grid; grid-template-columns: 1fr 1fr; border-radius: 12px; overflow: hidden;
          box-shadow: var(--shadow-card); margin-top: 3rem; border: 1px solid var(--border-light);
        }
        .comp-panel { padding: 40px; min-height: 400px; position: relative; display: flex; flex-direction: column; justify-content: space-between; }
        .comp-bad { background: #F0F0F0; color: #888; }
        .comp-good {
          background: var(--text-main); color: white;
          background-image: url('https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800');
          background-size: cover; position: relative;
        }
        .comp-good::before { content:''; position: absolute; inset:0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); }
        .comp-content { position: relative; z-index: 2; }

        .flywheel-wrapper {
          position: relative; max-width: 800px; margin: 3rem auto 0;
          display: flex; align-items: center; justify-content: space-between;
        }
        .fly-node {
          text-align: center; width: 180px; padding: 15px;
          background: white; border: 1px solid var(--border-light); border-radius: 8px;
          position: relative; z-index: 2;
        }
        .fly-arrow { flex: 1; height: 1px; background: var(--border-light); position: relative; }
        .fly-icon { font-size: 1.2rem; color: var(--accent); margin-bottom: 8px; }

        .login-btn {
          font-size: 0.85rem; font-weight: 600; color: var(--text-main);
          padding: 8px 16px; border: 1px solid var(--border-light); border-radius: 4px;
          text-decoration: none; background: white;
          transition: all 0.2s;
        }
        .login-btn:hover { border-color: var(--accent); color: var(--accent); }

        @media (max-width: 1024px) {
          .hero-grid { grid-template-columns: 1fr; gap: 4rem; }
          .ar-wrapper { height: 400px; margin-top: 2rem; }
          .hero-section { align-items: start; padding-top: 8rem; }
          .hero-title { font-size: 2.5rem; max-width: 100%; }
          .learn-grid, .comp-container { grid-template-columns: 1fr; }
          .learn-line { display: none; }
          .flywheel-wrapper { flex-direction: column; gap: 30px; }
          .fly-arrow { width: 1px; height: 30px; flex: none; }
        }
      `}</style>

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Syne:wght@600;700;800&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

      <div className="landing-page">
        <div className="afro-pattern"></div>

        <header className="landing-header">
          <div className="container nav-flex">
            <Link href="/" className="logo"><span>&#10022;</span> SEETU AI.</Link>
            <Link href="/login" className="login-btn">Connexion</Link>
          </div>
        </header>

        <main>
          <section className="hero-section">
            <div className="container hero-grid">
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '1.5rem', background: 'white', padding: '4px 10px', borderRadius: '50px', border: '1px solid var(--border-light)', fontSize: '0.75rem', color: '#666', fontWeight: 500 }}>
                  <span style={{ width: '6px', height: '6px', background: 'var(--accent)', borderRadius: '50%' }}></span>
                  Déjà 200+ marques connectées
                </div>

                <h1 className="hero-title">
                  L&apos;IA QUI CONNAÎT<br />
                  <span className="highlight">VOS CODES</span>.
                </h1>

                <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '0.5rem', maxWidth: '480px', lineHeight: 1.5 }}>
                  Fini les stéréotypes. <strong>Seetu</strong> connecte vos données de vente à la réalité locale pour créer des campagnes qui convertissent.
                </p>

                <div style={{ position: 'relative', zIndex: 10 }}>
                  <form className="onboard-bar" onSubmit={handleAnalyze}>
                    <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '10px', color: '#aaa' }}>
                      <i className="fa-solid fa-link"></i>
                    </div>
                    <input
                      type="text"
                      className="url-input"
                      placeholder="URL de votre marque..."
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                    />
                    <button type="submit" className="btn-start">
                      Analyser mon ADN
                    </button>
                  </form>

                  <div className="system-status">
                    <span><span className="status-dot"></span>Instagram Sync</span>
                    <span><span className="status-dot"></span>Tendances Locales</span>
                    <span><span className="status-dot"></span>Modèle Wolof/Fr</span>
                  </div>
                </div>
              </div>

              <div className="ar-wrapper">
                <div className="main-visual"></div>
                <div className="intel-overlay">
                  <div className="node-card n-1">
                    <div className="node-icon"><i className="fa-solid fa-location-dot"></i></div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 700 }}>LIEU</div>
                      <div style={{ fontWeight: 700 }}>Plateau, Dakar</div>
                    </div>
                  </div>
                  <div className="node-card n-2">
                    <div className="node-icon"><i className="fa-solid fa-chart-pie"></i></div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 700 }}>TON</div>
                      <div style={{ fontWeight: 700 }}>&quot;Sagnse&quot; (Luxe)</div>
                    </div>
                  </div>
                  <div className="node-card n-3">
                    <div className="node-icon"><i className="fa-solid fa-arrow-trend-up"></i></div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 700 }}>IMPACT</div>
                      <div style={{ fontWeight: 700 }}>+24% CTR Estimé</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section style={{ background: 'white', borderTop: '1px solid var(--border-light)' }}>
            <div className="container">
              <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
                <h2 className="section-title">Comment Seetu <span className="highlight">apprend</span>.</h2>
                <p style={{ color: 'var(--text-muted)' }}>Pas de configuration complexe. L&apos;IA observe et s&apos;adapte.</p>
              </div>

              <div className="learn-grid reveal-text">
                <div className="learn-line"></div>

                <div className="step-card">
                  <div className="step-icon"><i className="fa-brands fa-instagram"></i></div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>1. Connexion</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Seetu scanne votre Instagram et Shopify pour décoder votre esthétique unique.
                  </p>
                </div>
                <div className="step-card">
                  <div className="step-icon"><i className="fa-solid fa-fingerprint"></i></div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>2. ADN de Marque</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    L&apos;IA génère votre &quot;Brand Book&quot; digital : palette, ton de voix, et mannequins préférés.
                  </p>
                </div>
                <div className="step-card">
                  <div className="step-icon"><i className="fa-solid fa-wand-magic-sparkles"></i></div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>3. Création à l&apos;Échelle</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Générez des campagnes complètes en une phrase. Cohérence garantie à 100%.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="container">
              <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h2 className="section-title">L&apos;écart est visible.</h2>
                <p style={{ color: 'var(--text-muted)' }}>Vos clients savent faire la différence.</p>
              </div>

              <div className="comp-container reveal-text">
                <div className="comp-panel comp-bad">
                  <span style={{ background: '#ddd', padding: '5px 10px', fontWeight: 700, fontSize: '0.75rem', position: 'absolute', top: '30px', left: '30px' }}>IA STANDARD</span>
                  <div style={{ textAlign: 'center', marginTop: 'auto', marginBottom: 'auto', opacity: 0.6 }}>
                    <i className="fa-solid fa-image" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}></i>
                    <h3 style={{ fontSize: '1.25rem' }}>&quot;African Fashion&quot;</h3>
                    <p style={{ fontSize: '0.9rem' }}>Stéréotypes & Lumière Artificielle</p>
                  </div>
                </div>
                <div className="comp-panel comp-good">
                  <span style={{ background: 'var(--accent)', color: 'white', padding: '5px 10px', fontWeight: 700, fontSize: '0.75rem', position: 'absolute', top: '30px', left: '30px', zIndex: 3 }}>SEETU ENGINE</span>
                  <div className="comp-content" style={{ marginTop: 'auto' }}>
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '5px' }}>Authenticité Totale</h3>
                    <p style={{ opacity: 0.9, fontSize: '0.95rem' }}>&quot;Collection Tabaski au Plateau&quot;</p>
                    <div style={{ marginTop: '15px', fontSize: '0.85rem' }}>
                      <i className="fa-solid fa-check" style={{ color: 'var(--accent)', marginRight: '5px' }}></i> Tissus réels<br />
                      <i className="fa-solid fa-check" style={{ color: 'var(--accent)', marginRight: '5px' }}></i> Lieux reconnus
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section style={{ background: 'white', borderTop: '1px solid var(--border-light)' }}>
            <div className="container">
              <div style={{ textAlign: 'center' }}>
                <h2 className="section-title">Plus vous l&apos;utilisez,<br />plus il devient intelligent.</h2>
              </div>

              <div className="flywheel-wrapper reveal-text">
                <div className="fly-node">
                  <div className="fly-icon"><i className="fa-solid fa-database"></i></div>
                  <h4 style={{ marginBottom: '5px', fontSize: '1rem' }}>Vos Données</h4>
                  <p style={{ fontSize: '0.8rem', color: '#666' }}>Ventes & Engagement</p>
                </div>
                <div className="fly-arrow"></div>
                <div className="fly-node">
                  <div className="fly-icon"><i className="fa-solid fa-brain"></i></div>
                  <h4 style={{ marginBottom: '5px', fontSize: '1rem' }}>Analyse Seetu</h4>
                  <p style={{ fontSize: '0.8rem', color: '#666' }}>Compréhension</p>
                </div>
                <div className="fly-arrow"></div>
                <div className="fly-node">
                  <div className="fly-icon"><i className="fa-solid fa-layer-group"></i></div>
                  <h4 style={{ marginBottom: '5px', fontSize: '1rem' }}>Contenu Sur-Mesure</h4>
                  <p style={{ fontSize: '0.8rem', color: '#666' }}>Images & Textes</p>
                </div>
                <div className="fly-arrow"></div>
                <div className="fly-node">
                  <div className="fly-icon"><i className="fa-solid fa-arrow-trend-up"></i></div>
                  <h4 style={{ marginBottom: '5px', fontSize: '1rem' }}>Performance</h4>
                  <p style={{ fontSize: '0.8rem', color: '#666' }}>Conversion</p>
                </div>
              </div>
            </div>
          </section>

          <section style={{ textAlign: 'center', paddingBottom: '6rem' }}>
            <div className="container">
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '1.5rem', color: 'var(--text-main)' }}>
                UN POINT <span className="highlight">SEETU</span>.
              </h2>
              <Link href="/signup">
                <button className="btn-start" style={{ padding: '12px 30px', fontSize: '1rem' }}>
                  Créer mon compte gratuit
                </button>
              </Link>
            </div>
          </section>
        </main>

        <footer style={{ borderTop: '1px solid var(--border-light)', padding: '2rem 0', background: 'white' }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>&copy; 2024 Seetu.ai - Tous droits réservés</p>
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
              <Link href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Conditions</Link>
              <Link href="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Confidentialité</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
