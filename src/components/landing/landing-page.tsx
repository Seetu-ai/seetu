'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

export function LandingPage() {
  const router = useRouter();
  const [urlInput, setUrlInput] = useState('');
  const [sliderPos, setSliderPos] = useState(50);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDownRef = useRef(false);

  useEffect(() => {
    // Cursor logic (desktop only)
    const cursorDot = document.querySelector('.cursor-dot') as HTMLElement;
    const cursorCircle = document.querySelector('.cursor-circle') as HTMLElement;
    const heroVisual = document.querySelector('.glass-panel') as HTMLElement;
    const interactables = document.querySelectorAll('.interactable');

    if (window.innerWidth > 1024 && cursorDot && cursorCircle) {
      const handleMouseMove = (e: MouseEvent) => {
        cursorDot.style.left = e.clientX + 'px';
        cursorDot.style.top = e.clientY + 'px';
        setTimeout(() => {
          cursorCircle.style.left = e.clientX + 'px';
          cursorCircle.style.top = e.clientY + 'px';
        }, 50);

        // Parallax
        if (heroVisual) {
          const x = (window.innerWidth / 2 - e.clientX) / 40;
          const y = (window.innerHeight / 2 - e.clientY) / 40;
          heroVisual.style.transform = `rotateY(${-5 + x}deg) rotateX(${2 - y}deg)`;
        }
      };

      document.addEventListener('mousemove', handleMouseMove);

      interactables.forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
      });

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, []);

  // Slider logic
  const updateSlider = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let widthPercent = (x / rect.width) * 100;
    if (widthPercent < 0) widthPercent = 0;
    if (widthPercent > 100) widthPercent = 100;
    setSliderPos(widthPercent);
  };

  const handleMouseDown = () => { isDownRef.current = true; };
  const handleMouseUp = () => { isDownRef.current = false; };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDownRef.current) updateSlider(e.clientX);
  };
  const handleClick = (e: React.MouseEvent) => updateSlider(e.clientX);
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDownRef.current) updateSlider(e.touches[0].clientX);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, []);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
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
          --bg: #FFFFFF;
          --surface: #FAFAFA;
          --text-main: #1A1A1A;
          --text-muted: #666;
          --border-light: #E5E5E5;
          --terracotta: #C65D3B;
          --accent: var(--terracotta);
          --accent-glow: rgba(198, 93, 59, 0.4);
          --data-blue: #2D7FF9;
          --success-green: #27AE60;
          --error-red: #C0392B;
          --font-display: 'Syne', sans-serif;
          --font-body: 'Inter', sans-serif;
        }

        .landing-page * { margin: 0; padding: 0; box-sizing: border-box; }
        .landing-page { background-color: var(--bg); color: var(--text-main); font-family: var(--font-body); overflow-x: hidden; font-size: 16px; line-height: 1.5; }

        .noise-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          pointer-events: none; z-index: 900; opacity: 0.03;
          background: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJnoiPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjY1IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI2cpIiBvcGFjaXR5PSIwLjUiLz48L3N2Zz4=');
        }

        .cursor-dot { width: 8px; height: 8px; background: var(--text-main); position: fixed; top: 0; left: 0; transform: translate(-50%, -50%); border-radius: 50%; z-index: 9999; pointer-events: none; }
        .cursor-circle { width: 40px; height: 40px; border: 1px solid rgba(0,0,0,0.2); position: fixed; top: 0; left: 0; transform: translate(-50%, -50%); border-radius: 50%; z-index: 9999; pointer-events: none; transition: width 0.3s, height 0.3s, background 0.3s; }
        body.hovering .cursor-circle { width: 60px; height: 60px; background: rgba(198, 93, 59, 0.1); border-color: var(--accent); }

        .landing-page h1, .landing-page h2, .landing-page h3, .landing-page h4 { font-family: var(--font-display); font-weight: 800; line-height: 1.05; letter-spacing: -0.02em; }
        .hero-title { font-size: clamp(3rem, 5vw, 4.5rem); text-transform: uppercase; margin-bottom: 1.2rem; color: var(--text-main); position: relative; }
        .section-title { font-size: clamp(2rem, 3.5vw, 3.5rem); margin-bottom: 1rem; text-align: center; }
        .highlight { color: var(--accent); display: inline-block; position: relative; }

        .container { max-width: 1250px; margin: 0 auto; padding: 0 2rem; }
        .landing-page section { padding: 6rem 0; position: relative; }

        .landing-header { position: fixed; top: 0; width: 100%; z-index: 100; padding: 1rem 0; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border-light); }
        .nav-flex { display: flex; justify-content: space-between; align-items: center; }
        .logo { font-family: var(--font-display); font-weight: 800; font-size: 1.4rem; color: var(--text-main); display: flex; align-items: center; gap: 8px; text-decoration: none; }
        .logo img { height: 28px; width: auto; margin-right: 4px; }

        .hero-section { min-height: 100vh; display: flex; align-items: center; padding-top: 6rem; position: relative; overflow: hidden; }
        .hero-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 4rem; align-items: center; width: 100%; }

        .ar-wrapper { position: relative; height: 550px; width: 100%; perspective: 1000px; }
        .glass-panel { position: absolute; inset: 0; border-radius: 24px; background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(10px); border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 20px 50px rgba(0,0,0,0.1); transform: rotateY(-5deg) rotateX(2deg); transition: transform 0.1s ease-out; overflow: hidden; }
        .main-visual { width: 100%; height: 100%; background-image: url('https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=800'); background-size: cover; background-position: center; }
        .scan-line { position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: var(--accent); box-shadow: 0 0 15px var(--accent); animation: scan 3s infinite ease-in-out; z-index: 5; }
        @keyframes scan { 0% { top: 0; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }

        .node-card { position: absolute; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(12px); padding: 10px 16px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 10px 20px rgba(0,0,0,0.1); font-size: 0.8rem; display: flex; align-items: center; gap: 10px; animation: float 6s infinite ease-in-out; z-index: 10; }
        .node-icon { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; }
        .n-1 { top: 15%; left: -20px; animation-delay: 0s; } .n-1 .node-icon { background: var(--accent); }
        .n-2 { top: 45%; right: -30px; animation-delay: 2s; } .n-2 .node-icon { background: var(--data-blue); }
        .n-3 { bottom: 15%; left: 20px; animation-delay: 1s; } .n-3 .node-icon { background: var(--text-main); }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }

        .onboard-bar { background: white; border: 1px solid var(--border-light); border-radius: 12px; padding: 8px; display: flex; gap: 10px; margin-top: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); max-width: 460px; transition: all 0.3s; }
        .onboard-bar:focus-within { border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-glow); }
        .url-input { flex: 1; border: none; outline: none; padding-left: 10px; font-size: 1rem; color: var(--text-main); background: transparent; }
        .btn-start { background: var(--text-main); color: white; font-weight: 600; font-size: 0.95rem; padding: 12px 24px; border-radius: 8px; border: none; cursor: pointer; transition: all 0.3s; white-space: nowrap; animation: pulse-shadow 3s infinite; }
        .btn-start:hover { background: var(--accent); }
        @keyframes pulse-shadow { 0% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.2); } 70% { box-shadow: 0 0 0 10px rgba(0, 0, 0, 0); } 100% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); } }

        .manifesto-section { background: #0A0A0A; color: white; padding: 8rem 0; overflow: hidden; }
        .manifesto-grid { display: grid; grid-template-columns: 1fr 2px 1fr; gap: 4rem; align-items: center; margin-bottom: 5rem; }
        .divider-line { width: 2px; height: 100%; min-height: 300px; background: linear-gradient(to bottom, transparent, var(--error-red), var(--accent), transparent); opacity: 0.8; }

        .prob-side { position: relative; color: #888; filter: blur(0.5px); }
        .prob-header { font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 2rem; color: var(--error-red); }
        .prob-list { list-style: none; padding: 0; position: relative; z-index: 2; }
        .prob-item { display: flex; gap: 20px; margin-bottom: 2rem; font-size: 1.1rem; align-items: flex-start; }
        .prob-icon { color: var(--error-red); font-size: 1.2rem; margin-top: 4px; }
        .strike { text-decoration: line-through; color: #555; }

        .sol-side { position: relative; }
        .sol-side::before { content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80%; height: 80%; background: radial-gradient(circle, rgba(198, 93, 59, 0.25) 0%, rgba(198, 93, 59, 0) 70%); filter: blur(60px); z-index: 0; pointer-events: none; }
        .sol-header { font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 2rem; color: var(--accent); position: relative; z-index: 1; }
        .sol-list { list-style: none; padding: 0; position: relative; z-index: 1; }
        .sol-item { display: flex; gap: 20px; margin-bottom: 2rem; font-size: 1.25rem; color: white; align-items: flex-start; }
        .sol-icon { color: var(--success-green); font-size: 1.2rem; margin-top: 4px; }
        .strong-text { font-weight: 700; color: var(--accent); }

        .slider-container { position: relative; width: 100%; height: 550px; overflow: hidden; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); cursor: col-resize; box-shadow: 0 30px 60px rgba(0,0,0,0.5); }
        .img-layer { position: absolute; top: 0; left: 0; height: 100%; background-size: cover; background-position: center; background-repeat: no-repeat; }
        .img-before { width: 100%; background-image: url('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80&grayscale'); filter: grayscale(100%) contrast(0.8) brightness(0.7); }
        .img-wrapper { position: absolute; top: 0; left: 0; height: 100%; overflow: hidden; border-right: 2px solid white; z-index: 2; }
        .img-inner { position: absolute; top: 0; left: 0; height: 100%; background-image: url('https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=800'); background-size: cover; background-position: center; background-repeat: no-repeat; }
        .slider-handle { position: absolute; top: 50%; transform: translate(-50%, -50%); width: 48px; height: 48px; background: white; border-radius: 50%; z-index: 10; display: flex; align-items: center; justify-content: center; box-shadow: 0 5px 20px rgba(0,0,0,0.3); pointer-events: none; }
        .slider-label { position: absolute; top: 30px; padding: 8px 16px; border-radius: 50px; font-size: 0.8rem; font-weight: 800; z-index: 5; text-transform: uppercase; }
        .label-before { right: 30px; background: rgba(50,50,50,0.8); color: #AAA; }
        .label-after { left: 30px; background: var(--accent); color: white; }

        .bento-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 3rem; }
        .bento-card { background: var(--surface); border: 1px solid var(--border-light); border-radius: 16px; padding: 30px; position: relative; overflow: hidden; transition: all 0.3s ease; }
        .bento-card:hover { transform: translateY(-5px); border-color: var(--accent); }
        .bento-icon { font-size: 1.5rem; margin-bottom: 1rem; color: var(--accent); }
        .bento-wide { grid-column: span 2; }
        .bento-dark { background: var(--text-main); color: white; }
        .bento-dark .text-muted { color: #AAA; }

        .learn-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 3rem; }
        .step-card { background: white; padding: 30px; border: 1px solid var(--border-light); border-radius: 12px; transition: all 0.3s; position: relative; overflow: hidden; }
        .step-card:hover { transform: translateY(-5px); border-color: var(--accent); box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
        .step-icon { width: 60px; height: 60px; background: #FAFAFA; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; font-size: 1.2rem; color: var(--accent); transition: transform 0.3s; }
        .step-card:hover .step-icon { transform: scale(1.1); background: var(--accent); color: white; }

        .logo-strip { display: flex; gap: 40px; opacity: 0.4; filter: grayscale(100%); margin-top: 3rem; align-items: center; }
        .logo-placeholder { font-weight: 800; font-size: 1.2rem; font-family: var(--font-display); letter-spacing: -1px; }

        .login-btn { font-size: 0.9rem; font-weight: 600; color: var(--text-main); padding: 8px 16px; border: 1px solid var(--border-light); border-radius: 4px; text-decoration: none; background: white; transition: all 0.2s; }
        .login-btn:hover { border-color: var(--accent); color: var(--accent); }

        @media (max-width: 1024px) {
          .hero-grid, .manifesto-grid, .bento-grid, .learn-grid { grid-template-columns: 1fr; }
          .hero-section { padding-top: 8rem; }
          .ar-wrapper { height: 400px; margin-top: 3rem; }
          .slider-container { height: 350px; }
          .bento-wide { grid-column: span 1; }
          .divider-line { width: 100%; height: 2px; min-height: 2px; margin: 2rem 0; background: linear-gradient(to right, transparent, var(--error-red), var(--accent), transparent); }
          .cursor-dot, .cursor-circle { display: none; }
        }
      `}</style>

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Syne:wght@600;700;800&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

      <div className="landing-page">
        <div className="cursor-dot"></div>
        <div className="cursor-circle"></div>
        <div className="noise-overlay"></div>

        <header className="landing-header">
          <div className="container nav-flex">
            <Link href="/" className="logo interactable"><img src="/logo.png" alt="Seetu" style={{ height: '28px', width: 'auto' }} /> SEETU AI.</Link>
            <Link href="/login" className="login-btn interactable">Connexion</Link>
          </div>
        </header>

        <main>
          <section className="hero-section">
            <div className="container hero-grid">
              <div style={{ zIndex: 2 }}>
                <h1 className="hero-title">
                  L&apos;IA QUI CONNAÎT<br />
                  <span className="highlight">VOTRE MARQUE</span>.
                </h1>
                <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '500px' }}>
                  Fini les stéréotypes. <strong>Seetu</strong> croise vos données à la réalité locale pour créer des campagnes qui convertissent.
                </p>
                <form className="onboard-bar interactable" onSubmit={handleAnalyze}>
                  <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '10px', color: '#aaa' }}>
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                  </div>
                  <input type="text" className="url-input" placeholder="www.votremarque.com" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
                  <button type="submit" className="btn-start">Analyser mon ADN</button>
                </form>
                <div className="logo-strip">
                  <span className="logo-placeholder">BANTU</span>
                  <span className="logo-placeholder">SAGA</span>
                  <span className="logo-placeholder">KADIA.</span>
                  <span className="logo-placeholder">NIIT</span>
                </div>
              </div>
              <div className="ar-wrapper" id="heroVisual">
                <div className="glass-panel">
                  <div className="main-visual"></div>
                  <div className="scan-line"></div>
                  <div className="node-card n-1"><div className="node-icon"><i className="fa-solid fa-location-dot"></i></div><div><div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 700 }}>LIEU</div><div style={{ fontWeight: 700 }}>Plateau, Dakar</div></div></div>
                  <div className="node-card n-2"><div className="node-icon"><i className="fa-solid fa-fingerprint"></i></div><div><div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 700 }}>TON</div><div style={{ fontWeight: 700 }}>&quot;Sagnse&quot;</div></div></div>
                  <div className="node-card n-3"><div className="node-icon"><i className="fa-solid fa-shirt"></i></div><div><div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 700 }}>PRODUIT</div><div style={{ fontWeight: 700 }}>Bazin Riche</div></div></div>
                </div>
              </div>
            </div>
          </section>

          <section className="manifesto-section">
            <div className="container">
              <div className="manifesto-grid">
                <div className="prob-side">
                  <h3 className="prob-header">LE PROBLÈME</h3>
                  <ul className="prob-list">
                    <li className="prob-item"><i className="fa-solid fa-triangle-exclamation prob-icon"></i><span>Midjourney vous donne des <br /><span className="strike">&quot;Africains génériques&quot;</span></span></li>
                    <li className="prob-item"><i className="fa-solid fa-triangle-exclamation prob-icon"></i><span>ChatGPT écrit comme <br /><span className="strike">un expatrié</span></span></li>
                    <li className="prob-item"><i className="fa-solid fa-triangle-exclamation prob-icon"></i><span>Vos clients scrollent <br /><span className="strike">sans s&apos;arrêter</span></span></li>
                  </ul>
                </div>
                <div className="divider-line"></div>
                <div className="sol-side">
                  <h3 className="sol-header">LA SOLUTION SEETU</h3>
                  <ul className="sol-list">
                    <li className="sol-item"><i className="fa-solid fa-check-circle sol-icon"></i><span>Des visages, des lieux, des tons <br /><span className="strong-text">qui sonnent vrais</span></span></li>
                    <li className="sol-item"><i className="fa-solid fa-check-circle sol-icon"></i><span>Du Wolof qui claque, <br /><span className="strong-text">du Français qui vend</span></span></li>
                    <li className="sol-item"><i className="fa-solid fa-check-circle sol-icon"></i><span>Du contenu qui <br /><span className="strong-text">arrête le pouce</span></span></li>
                  </ul>
                </div>
              </div>

              <div style={{ marginTop: '4rem', position: 'relative', zIndex: 5 }}>
                <h4 style={{ textAlign: 'center', color: 'white', marginBottom: '1rem', fontFamily: 'var(--font-display)', opacity: 0.8 }}>L&apos;ÉCART EST VISIBLE</h4>
                <div
                  ref={sliderRef}
                  className="slider-container interactable"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onClick={handleClick}
                  onTouchStart={handleMouseDown}
                  onTouchMove={handleTouchMove}
                >
                  <div className="img-layer img-before"></div>
                  <div className="img-wrapper" style={{ width: `${sliderPos}%` }}>
                    <div className="img-inner" style={{ width: sliderRef.current?.offsetWidth || '100%' }}></div>
                  </div>
                  <div className="slider-label label-before">IA GÉNÉRIQUE</div>
                  <div className="slider-label label-after">SEETU ENGINE</div>
                  <div className="slider-handle" style={{ left: `${sliderPos}%` }}><i className="fa-solid fa-arrows-left-right"></i></div>
                </div>
              </div>
            </div>
          </section>

          <section style={{ background: 'var(--bg)' }}>
            <div className="container">
              <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto', marginBottom: '3rem' }}>
                <h2 className="section-title">Comment ça marche.</h2>
                <p style={{ color: 'var(--text-muted)' }}>De l&apos;URL à la campagne virale.</p>
              </div>
              <div className="learn-grid">
                <div className="step-card interactable">
                  <div className="step-icon"><i className="fa-solid fa-link"></i></div>
                  <h3>1. Connectez</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Entrez votre URL ou connectez Instagram. Seetu scanne votre style.</p>
                </div>
                <div className="step-card interactable">
                  <div className="step-icon"><i className="fa-solid fa-dna"></i></div>
                  <h3>2. ADN de Marque</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>L&apos;IA construit votre profil : ton, couleurs, mannequins.</p>
                </div>
                <div className="step-card interactable">
                  <div className="step-icon"><i className="fa-solid fa-rocket"></i></div>
                  <h3>3. Générez</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Créez du contenu qui vend, parfaitement aligné avec votre marque.</p>
                </div>
              </div>
            </div>
          </section>

          <section style={{ background: 'var(--surface)', borderTop: '1px solid var(--border-light)' }}>
            <div className="container">
              <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h2 className="section-title">Tout ce qu&apos;il vous faut.</h2>
              </div>
              <div className="bento-grid">
                <div className="bento-card bento-wide bento-dark interactable">
                  <div className="bento-icon" style={{ color: 'white' }}><i className="fa-solid fa-chart-line"></i></div>
                  <h3>Intelligence Data</h3>
                  <p className="text-muted" style={{ color: '#CCC' }}>Seetu ne devine pas. Il sait ce qui convertit pour votre audience spécifique.</p>
                </div>
                <div className="bento-card interactable">
                  <div className="bento-icon"><i className="fa-solid fa-camera"></i></div>
                  <h3>Studio Photo IA</h3>
                  <p className="text-muted">Contextes locaux : Corniche, Plateau, Almadies.</p>
                </div>
                <div className="bento-card interactable">
                  <div className="bento-icon"><i className="fa-solid fa-pen-nib"></i></div>
                  <h3>Copywriting Local</h3>
                  <p className="text-muted">Légendes et descriptions avec votre ton et vos langues.</p>
                </div>
                <div className="bento-card interactable">
                  <div className="bento-icon"><i className="fa-solid fa-video"></i></div>
                  <h3>Génération Vidéo</h3>
                  <p className="text-muted">Transformez vos images statiques en Reels dynamiques.</p>
                </div>
                <div className="bento-card interactable">
                  <div className="bento-icon"><i className="fa-solid fa-shield-halved"></i></div>
                  <h3>Gardien de Marque</h3>
                  <p className="text-muted">Cohérence garantie. Jamais hors-sujet.</p>
                </div>
              </div>
            </div>
          </section>

          <section style={{ textAlign: 'center', borderTop: '1px solid var(--border-light)', padding: '6rem 0' }}>
            <div className="container">
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Fait par nous. Pour nous.</p>
              <h2 style={{ fontSize: '3rem', marginBottom: '2rem', color: 'var(--accent)' }}>UN POINT SEETU.</h2>
              <Link href="/signup">
                <button className="btn-start interactable" style={{ padding: '1rem 3rem', fontSize: '1rem' }}>Créer mon compte gratuit</button>
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
