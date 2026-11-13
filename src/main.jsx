import React, { useEffect, useId, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider, ensureUserProfile, RequireAdmin, RequireAuth, useAuth } from './auth';
import { readableError, requireSupabase, supabaseConfigured } from './supabase';
import './styles.css';
import './real-product.css';
import './neon-theme.css';
import './friendly-theme.css';

const icons = {
  arrow: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>,
  check: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7" /></svg>,
  phone: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.1 4.5 9 3.8c.7-.3 1.5 0 1.8.7l1.2 2.9c.3.6.1 1.3-.4 1.7l-1.5 1.2a12.3 12.3 0 0 0 3.6 3.6l1.2-1.5c.4-.5 1.1-.7 1.7-.4l2.9 1.2c.7.3 1 1.1.7 1.8l-.7 1.9c-.3.8-1.1 1.3-2 1.2C10.4 17.5 6.5 13.6 5.3 7.1c-.2-.9.3-1.7 1.1-2.1Z" /></svg>,
  mail: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4zM4 7l8 6 8-6" /></svg>,
  lock: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></svg>,
  user: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3"/><path d="M5.5 19a6.5 6.5 0 0 1 13 0" /></svg>,
  plus: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>,
  upload: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M5 14v5h14v-5" /></svg>,
  menu: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
  close: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>,
  shield: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5c0 4.3-2.8 8-7 10-4.2-2-7-5.7-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4" /></svg>,
  warning: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.7 20h18.6L12 3Z"/><path d="M12 9v4m0 3h.01" /></svg>,
  qr: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM15 15h2v2h-2zM19 14h1v4h-1zM14 19h4v1h-4z" /></svg>,
  edit: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 16-.8 3.8L8 19l10.8-10.8-3-3L5 16Z"/><path d="m14.5 6.5 3 3" /></svg>,
  chevron: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>,
  sparkle: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3ZM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></svg>
};

const features = [
  ['No app needed', 'The person helping you simply taps with their phone. The information opens in a browser.', 'phone'],
  ['You stay in control', 'Update your details any time, from anywhere. Changes go live in seconds.', 'edit'],
  ['Private when it matters', 'Choose what is public and what stays behind a private access PIN.', 'lock']
];

const defaultTag = { id: 'tag-aurora', name: 'Aurora’s backpack', profile: 'Aurora Bennett', status: 'Active', updated: 'Today, 9:42 AM', token: 'a7f3k2m9q1', contacts: 2 };

function BrandMark() {
  return <span className="logo-mark" aria-hidden="true"><i></i><i></i><i></i></span>;
}

function BrandName() {
  return <span className="brand-wordmark">Tags<span>R</span>Us</span>;
}

function Logo({ dark = false }) {
  return <Link to="/" className={`logo ${dark ? 'logo-dark' : ''}`} aria-label="TagsRUs home"><BrandMark /><BrandName /></Link>;
}

function Container({ children, className = '' }) { return <div className={`container ${className}`}>{children}</div>; }

function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  return <header className="site-header">
    <Container className="nav-wrap">
      <Logo />
      <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? icons.close : icons.menu}</button>
      <nav className={open ? 'main-nav is-open' : 'main-nav'}>
        <a href="/#how-it-works">How it works</a>
        <a href="/#privacy">Privacy</a>
        <a href="/#faq">FAQ</a>
        <Link className="nav-login" to="/login">Log in</Link>
        <Link className="button button-small" to="/checkout">Get your tag {icons.arrow}</Link>
      </nav>
    </Container>
  </header>;
}

function TagMockup({ mini = false }) {
  return <div className={`tag-scene ${mini ? 'tag-scene-mini' : ''}`} role="img" aria-label="Silver engraved emergency contact tag">
    <div className="tag-shadow"></div>
    <div className="tag-card">
      <div className="tag-hole"></div>
      <div className="tag-chip"><span></span><span></span><span></span><span></span></div>
      <div className="tag-wordmark"><BrandMark /><BrandName /></div>
      <div className="tag-label">EMERGENCY CONTACT</div>
    </div>
    <div className="nfc-rings"><span></span><span></span><span></span></div>
  </div>;
}

function SectionIntro({ eyebrow, title, copy, align = '' }) { return <div className={`section-intro ${align}`}><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{copy && <p className="section-copy">{copy}</p>}</div>; }

function Landing() {
  return <div>
    <Header />
    <main>
      <section className="hero">
        <Container className="hero-grid">
          <div className="hero-copy">
            <div className="eyebrow-pill"><span className="live-dot"></span> The simple emergency contact tag</div>
            <h1>Your loved ones.<br /><em>One tap away.</em></h1>
            <p className="hero-lede">Give first responders, caregivers, and anyone helping your loved one quick access to the information that matters most.</p>
            <div className="hero-actions"><Link className="button" to="/checkout">Get your emergency tag {icons.arrow}</Link><a className="text-link" href="#how-it-works">See how it works <span>↓</span></a></div>
            <div className="hero-trust"><div className="avatar-stack"><span>J</span><span>M</span><span>A</span><span>+</span></div><span>Made for the people you care about</span></div>
          </div>
          <div className="hero-visual"><div className="visual-glow"></div><TagMockup /><div className="floating-note note-top"><span className="note-icon">{icons.phone}</span><span><strong>Help is one tap away</strong><small>No app required</small></span></div><div className="floating-note note-bottom"><span className="note-icon green">{icons.shield}</span><span><strong>You choose what’s shared</strong><small>Private by design</small></span></div></div>
        </Container>
      </section>

      <section className="logo-strip"><Container><span>BUILT FOR EVERYDAY PEACE OF MIND</span><div className="strip-line"></div><span>POWERED BY <strong>Trent’s 3D Prints</strong></span></Container></section>

      <section id="how-it-works" className="steps-section section-pad"><Container><SectionIntro eyebrow="How it works" title="A little tag. A lot of reassurance." copy="Set it up once, then get back to the moments that matter." /><div className="steps-grid">{[['01','Get your tag','Choose a TagsRUs Emergency Contact Tag and make it yours.'],['02','Set up your profile','Add the people and information you want someone to see.'],['03','Tap when it matters','A compatible phone opens your secure profile instantly.']].map(([number,title,copy]) => <div className="step-card" key={number}><span className="step-number">{number}</span><div className="step-icon">{number === '01' ? icons.sparkle : number === '02' ? icons.edit : icons.phone}</div><h3>{title}</h3><p>{copy}</p></div>)}</div></Container></section>

      <section className="feature-section section-pad"><Container className="feature-layout"><div><SectionIntro eyebrow="Designed around real life" title="The right information, right when it’s needed." copy="You decide what a helpful stranger, caregiver, or first responder can see. Nothing more, nothing less." /><div className="feature-list">{features.map(([title,copy,icon]) => <div className="feature-row" key={title}><div className="feature-icon">{icons[icon] || icons.check}</div><div><h3>{title}</h3><p>{copy}</p></div></div>)}</div></div><div className="profile-preview"><div className="preview-top"><span className="preview-status"><i></i> TagsRUs profile</span><span className="preview-lock">{icons.lock}</span></div><div className="preview-person"><div className="person-avatar">AB</div><div><h3>Aurora Bennett</h3><p>Emergency contact profile</p></div></div><div className="preview-divider"></div><div className="preview-label">EMERGENCY CONTACTS</div><div className="preview-contact"><span className="contact-avatar blue">JM</span><div><strong>Jordan Bennett</strong><small>Parent · <a href="tel:+15550142881">(555) 014-2881</a></small></div><span className="contact-action">{icons.phone}</span></div><div className="preview-contact"><span className="contact-avatar peach">KB</span><div><strong>Kelly Brooks</strong><small>Caregiver · <a href="tel:+15550146302">(555) 014-6302</a></small></div><span className="contact-action">{icons.phone}</span></div><div className="preview-private"><span>{icons.lock}</span><div><strong>Additional medical information</strong><small>Protected with a private PIN</small></div><span className="preview-arrow">{icons.arrow}</span></div></div></Container></section>

      <section id="privacy" className="privacy-section section-pad"><Container className="privacy-grid"><div className="privacy-visual"><div className="privacy-orbit orbit-one"></div><div className="privacy-orbit orbit-two"></div><div className="privacy-shield">{icons.shield}</div><span className="orbit-label label-one">Your information</span><span className="orbit-label label-two">Your choices</span><span className="orbit-label label-three">Your circle</span></div><div><SectionIntro eyebrow="Privacy, your way" title="You’re in charge of the details." copy="Every part of your profile is yours to control. Make information public, keep it PIN protected, or leave it blank entirely." /><div className="privacy-points"><p>{icons.check}<span><strong>Public by choice.</strong> Only the fields you mark public are visible without a PIN.</span></p><p>{icons.check}<span><strong>Private stays private.</strong> Protected details are only returned after the right PIN is entered.</span></p><p>{icons.check}<span><strong>Easy to update.</strong> Keep your information current from your dashboard, whenever you need.</span></p></div></div></Container></section>

      <section id="faq" className="faq-section section-pad"><Container><SectionIntro eyebrow="Questions, answered" title="Good to know." /><div className="faq-list"><Faq q="Does the person scanning need an app?" a="No. A compatible smartphone opens your TagsRUs profile in its browser. There is no app or account required for the person helping you." /><Faq q="What information can I add?" a="You can add a name, an optional photo, emergency contacts, and optional medical details. You choose the visibility of each supported field." /><Faq q="Can I deactivate a lost tag?" a="Yes. You can deactivate an individual tag from your dashboard. Its profile immediately becomes unavailable and reveals no identifying information." /><Faq q="Is TagsRUs an emergency response service?" a="No. TagsRUs is an information platform, not an emergency response service or a substitute for professional medical care. In an emergency, call 911." /></div></Container></section>

      <section className="final-cta"><Container><div><p className="eyebrow">A simpler kind of safety net</p><h2>Ready to put peace of mind within reach?</h2><p>Get your Emergency Contact Tag and set up your profile in a few minutes.</p></div><Link className="button button-light" to="/checkout">Get your tag {icons.arrow}</Link></Container></section>
    </main>
    <Footer />
  </div>;
}

function Faq({ q, a }) { const [open, setOpen] = useState(false); return <div className={`faq-item ${open ? 'open' : ''}`}><button onClick={() => setOpen(!open)}><span>{q}</span>{icons.chevron}</button>{open && <p>{a}</p>}</div>; }

function Footer() { return <footer className="site-footer"><Container><div className="footer-top"><div><Logo dark /><p className="footer-tagline">Your loved ones. One tap away.</p></div><div className="footer-links"><div><span>Explore</span><Link to="/#how-it-works">How it works</Link><Link to="/#privacy">Privacy</Link><Link to="/#faq">FAQ</Link></div><div><span>Account</span><Link to="/login">Log in</Link><Link to="/signup">Sign up</Link><Link to="/dashboard">My tags</Link></div><div><span>Legal</span><Link to="/privacy">Privacy policy</Link><Link to="/terms">Terms of service</Link><a href="mailto:hello@trentenritter.com">Contact</a></div></div></div><div className="footer-bottom"><span>© 2026 Trent’s 3D Prints. TagsRUs is a product brand of Trent’s 3D Prints.</span><span>TagsRUs is not an emergency response service. In an emergency, call 911.</span></div></Container></footer>; }

function AuthShell({ mode = 'login' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const signup = mode === 'signup';
  async function submit(e) {
    e.preventDefault(); setError(''); setMessage(''); setBusy(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email')).trim().toLowerCase();
    const password = String(form.get('password'));
    try {
      if (!supabaseConfigured) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env, then restart the dev server.');
      const client = requireSupabase();
      if (signup) {
        const acceptedAt = new Date().toISOString();
        const { data, error: signUpError } = await client.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/login`, data: { full_name: String(form.get('full_name')).trim(), accepted_at: acceptedAt } },
        });
        if (signUpError) throw signUpError;
        if (data.session) navigate('/dashboard', { replace: true });
        else setMessage('Account created. Check your email for a confirmation link, then log in.');
      } else {
        const { error: signInError } = await client.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        navigate(location.state?.from || '/dashboard', { replace: true });
      }
    } catch (err) { setError(readableError(err)); }
    finally { setBusy(false); }
  }
  return <div className="auth-page"><Header /><Container className="auth-wrap"><div className="auth-card"><div className="auth-card-head"><div className="auth-mark"><BrandMark /></div><p className="eyebrow">{signup ? 'Create your account' : 'Welcome back'}</p><h1>{signup ? 'Your tags, all in one place.' : 'Log in to TagsRUs.'}</h1><p>{signup ? 'Set up your profile and keep the people you love close.' : 'Manage your tags and keep your information up to date.'}</p></div>{error && <div className="form-error" role="alert">{error}</div>}{message && <div className="notice" role="status">{icons.check}<span>{message}</span></div>}<form onSubmit={submit}>{signup && <label>Your name<input name="full_name" type="text" autoComplete="name" placeholder="Alex Morgan" required maxLength="160" /></label>}<label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label><label>Password<div className="input-with-action"><input name="password" type={showPass ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'} placeholder="At least 8 characters" required minLength="8" /><button type="button" onClick={() => setShowPass(!showPass)}>{showPass ? 'Hide' : 'Show'}</button></div></label>{signup && <label className="checkbox-line"><input name="accept" type="checkbox" required /><span>I agree to the <Link to="/terms">Terms of Service</Link> and understand that information marked public is visible to anyone who scans a tag.</span></label>}<button className="button button-full" type="submit" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Log in'} {!busy && icons.arrow}</button></form>{!signup && <Link className="forgot-link" to="/reset-password">Forgot your password?</Link>}<p className="auth-switch">{signup ? 'Already have an account?' : 'New to TagsRUs?'} <Link to={signup ? '/login' : '/signup'}>{signup ? 'Log in' : 'Create an account'}</Link></p></div><div className="auth-side"><TagMockup mini /><p className="eyebrow">Peace of mind, in your pocket</p><h2>Make the important stuff easy to find.</h2><p>TagsRUs gives your people a simple way to help when every second counts.</p></div></Container></div>;
}

function ResetPassword() {
  const location = useLocation(); const recovery = location.search.includes('update=1') || location.hash.includes('type=recovery');
  const [sent, setSent] = useState(false); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const navigate = useNavigate();
  async function submit(e) { e.preventDefault(); setError(''); setBusy(true); try { const client = requireSupabase(); if (recovery) { const { error: updateError } = await client.auth.updateUser({ password }); if (updateError) throw updateError; navigate('/dashboard', { replace: true }); } else { const { error: resetError } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/reset-password?update=1` }); if (resetError) throw resetError; setSent(true); } } catch (err) { setError(readableError(err)); } finally { setBusy(false); } }
  return <div className="auth-page"><Header /><Container className="auth-wrap"><div className="auth-card"><div className="auth-card-head"><div className="auth-mark">{icons.lock}</div><p className="eyebrow">Account recovery</p><h1>{recovery ? 'Choose a new password.' : 'Reset your password.'}</h1><p>{recovery ? 'Set a new password for your TagsRUs account.' : 'Enter your email and we’ll send a secure reset link.'}</p></div>{error && <div className="form-error" role="alert">{error}</div>}{sent ? <div className="notice">{icons.check}<span>Check your inbox for the reset link.</span></div> : <form onSubmit={submit}>{recovery ? <label>New password<input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} minLength="8" required /></label> : <label>Email address<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required /></label>}<button className="button button-full" disabled={busy}>{busy ? 'Please wait…' : recovery ? 'Save new password' : 'Send reset link'} {icons.arrow}</button></form>}<p className="auth-switch"><Link to="/login">← Back to login</Link></p></div><div className="auth-side"><TagMockup mini /><p className="eyebrow">Keep your account secure</p><h2>One less thing to worry about.</h2><p>Your account is the only place to edit the information connected to your tags.</p></div></Container></div>;
}

function Checkout() { const [qty, setQty] = useState(1); const navigate = useNavigate(); return <div className="checkout-page"><Header /><Container className="checkout-wrap"><div className="checkout-intro"><Link className="back-link" to="/">← Back to TagsRUs</Link><p className="eyebrow">The first step to peace of mind</p><h1>Get your Emergency Contact Tag.</h1><p>One simple tap gives the right people access to the information you choose to share.</p></div><div className="checkout-grid"><div className="product-card"><div className="product-image"><TagMockup mini /></div><div className="product-details"><span className="product-kicker">TagsRUs / 01</span><h2>Emergency Contact Tag</h2><p>Durable NFC tag with a secure, personal profile. Attach it to a backpack, mobility aid, keyring, or wherever it will be easy to find.</p><div className="product-points"><span>{icons.check} No app required</span><span>{icons.check} Update anytime</span><span>{icons.check} Privacy controls</span></div></div></div><div className="order-card"><h2>Your order</h2><div className="order-line"><span>Emergency Contact Tag</span><div className="quantity"><button onClick={() => setQty(Math.max(1, qty - 1))}>−</button><span>{qty}</span><button onClick={() => setQty(qty + 1)}>+</button></div></div><div className="order-total"><span>Total</span><strong>Configure price</strong></div><p className="checkout-note">Secure checkout will be connected to your configured payment provider. You’ll create or log in to your TagsRUs account before completing setup.</p><button className="button button-full" onClick={() => navigate('/signup')}>Continue to account {icons.arrow}</button><p className="checkout-legal">By continuing, you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</p></div></div></Container><Footer /></div>; }

function Dashboard() {
  const { user } = useAuth(); const navigate = useNavigate();
  const [tags, setTags] = useState([]); const [showAdd, setShowAdd] = useState(false); const [code, setCode] = useState('');
  const [notice, setNotice] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  const client = requireSupabase();
  async function loadTags() {
    setLoading(true); setError('');
    try { await ensureUserProfile(user); } catch (profileError) { setError(readableError(profileError)); setLoading(false); return; }
    const { data, error: queryError } = await client.from('tags').select('id,name,status,public_token,updated_at,profile_id,profiles(person_name)').eq('owner_id', user.id).order('created_at', { ascending: false });
    if (queryError) setError(readableError(queryError));
    else setTags((data || []).map(t => ({ ...t, profile: t.profiles?.person_name || 'Profile', status: t.status === 'active' ? 'Active' : 'Deactivated', updated: new Date(t.updated_at).toLocaleDateString() })));
    setLoading(false);
  }
  useEffect(() => { loadTags(); }, [user.id]);
  async function signOut() { await client.auth.signOut(); navigate('/login', { replace: true }); }
  async function toggleTag(tag) {
    setError('');
    const status = tag.status === 'Active' ? 'deactivated' : 'active';
    const { error: updateError } = await client.from('tags').update({ status }).eq('id', tag.id);
    if (updateError) setError(readableError(updateError));
    else { setNotice(status === 'active' ? 'Tag reactivated.' : 'Tag deactivated. Its public profile is no longer available.'); await loadTags(); }
  }
  async function claimTag(e) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    const { data: claimData, error: claimError } = await client.rpc('claim_tagsrus_tag', { p_code: code });
    if (claimError) setError(readableError(claimError));
    else { const claimed = Array.isArray(claimData) ? claimData[0] : claimData; setShowAdd(false); setCode(''); setNotice('Tag connected to your account.'); await loadTags(); if (claimed?.profile_id) navigate(`/dashboard/profiles/${claimed.profile_id}/setup`); }
    setBusy(false);
  }
  return <div className="dashboard-page"><div className="dashboard-nav"><Container><Logo /><div className="dashboard-nav-actions"><span className="user-chip">{(user.user_metadata?.full_name || user.email || 'U').slice(0, 1).toUpperCase()}</span><span className="user-name">{user.user_metadata?.full_name || user.email}</span><AdminLink /><button className="text-link" onClick={signOut}>Sign out</button></div></Container></div><main><Container className="dashboard-main"><div className="dashboard-heading"><div><p className="eyebrow">Your account</p><h1>My tags</h1><p>Manage your tags and the information they share.</p></div><button className="button" onClick={() => setShowAdd(true)}>{icons.plus} Add a tag</button></div>{notice && <div className="notice" role="status">{icons.check}<span>{notice}</span><button onClick={() => setNotice('')}>×</button></div>}{error && <div className="form-error" role="alert">{error}</div>}{loading ? <p>Loading your tags…</p> : <div className="dashboard-grid">{tags.map(tag => <TagRow key={tag.id} tag={tag} onToggle={() => toggleTag(tag)} />)}{!tags.length && <div className="notice">No tags are connected yet. Add the activation code included with your tag.</div>}<button className="add-card" onClick={() => setShowAdd(true)}><span>{icons.plus}</span><strong>Add another tag</strong><small>Connect another TagsRUs product</small></button></div>}<div className="dashboard-callout"><div className="callout-icon">{icons.shield}</div><div><strong>Your information, your control.</strong><p>Only information you mark public is visible without a PIN. You can change your settings any time.</p></div>{tags[0] && <Link to={`/dashboard/profiles/${tags[0].profile_id}`}>Review profile {icons.arrow}</Link>}</div></Container></main>{showAdd && <div className="modal-backdrop" onClick={() => setShowAdd(false)}><form className="modal" onSubmit={claimTag} onClick={e => e.stopPropagation()}><button type="button" className="modal-close" onClick={() => setShowAdd(false)}>{icons.close}</button><div className="modal-icon">{icons.plus}</div><h2>Add a TagsRUs tag</h2><p>Enter the activation code printed on the back of your tag to connect it to your account.</p><label>Tag code<input value={code} onChange={e => setCode(e.target.value.toUpperCase())} required maxLength="64" autoComplete="off" placeholder="e.g. TR-4829-AX" /></label><button className="button button-full" disabled={busy}>{busy ? 'Connecting…' : 'Connect tag'} {icons.arrow}</button></form></div>}</div>;
}

function TagRow({ tag, onToggle }) { return <div className={`tag-row-card ${tag.status !== 'Active' ? 'is-inactive' : ''}`}><div className="tag-row-main"><div className="mini-tag"><span>)))</span></div><div><div className="tag-row-title"><h2>{tag.name}</h2><span className={`status ${tag.status === 'Active' ? 'status-active' : 'status-inactive'}`}><i></i>{tag.status}</span></div><p>{tag.profile} · Updated {tag.updated}</p><a className="profile-url" href={`/t/${tag.public_token}`} target="_blank" rel="noreferrer">{window.location.host}/t/{tag.public_token} ↗</a></div></div><div className="tag-row-actions"><button title="QR code display is not configured yet" disabled>{icons.qr}</button><Link to={`/dashboard/profiles/${tag.profile_id}`} title="Edit profile">{icons.edit}</Link><button className="deactivate-button" onClick={onToggle}>{tag.status === 'Active' ? 'Deactivate' : 'Reactivate'}</button></div></div>; }

function AdminLink() {
  const { user } = useAuth(); const [allowed, setAllowed] = useState(false);
  useEffect(() => { let active = true; requireSupabase().rpc('is_tagsrus_admin').then(({ data }) => { if (active) setAllowed(data === true); }); return () => { active = false; }; }, [user.id]);
  return allowed ? <Link to="/admin/tags">Tag admin</Link> : null;
}

const TAG_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateTagCode() {
  const bytes = new Uint8Array(8); window.crypto.getRandomValues(bytes);
  const body = Array.from(bytes, byte => TAG_CODE_ALPHABET[byte % TAG_CODE_ALPHABET.length]).join('');
  return `TR-${body.slice(0, 4)}-${body.slice(4)}`;
}

function AdminTagCodes() {
  const { user } = useAuth(); const client = requireSupabase();
  const [name, setName] = useState('Emergency Contact Tag'); const [quantity, setQuantity] = useState('1');
  const [codes, setCodes] = useState([]); const [inventory, setInventory] = useState([]); const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  async function loadInventory() {
    setLoading(true); const { data, error: listError } = await client.rpc('admin_list_tag_codes');
    if (listError) setError(readableError(listError)); else setInventory(data || []);
    setLoading(false);
  }
  useEffect(() => { loadInventory(); }, []);
  async function createCodes(e) {
    e.preventDefault(); setBusy(true); setError(''); setNotice(''); setCodes([]);
    const batch = Array.from({ length: Number(quantity) }, () => generateTagCode());
    const payload = batch.map(code => ({ code, name: name.trim() }));
    const { data, error: createError } = await client.rpc('admin_create_tag_codes', { p_codes: payload });
    if (createError) setError(readableError(createError));
    else { setCodes(batch); setNotice(`${data} unique activation code${data === 1 ? '' : 's'} added. Save or download them now; the full codes cannot be retrieved later.`); await loadInventory(); }
    setBusy(false);
  }
  async function copyCode(code) { try { await navigator.clipboard.writeText(code); setNotice(`Copied ${code}.`); } catch { setError('Clipboard access is unavailable. Select and copy the code instead.'); } }
  function downloadCodes() {
    const csv = ['Tag name,Activation code', ...codes.map(code => `"${name.replaceAll('"', '""')}",${code}`)].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'tagsrus-activation-codes.csv'; anchor.click(); URL.revokeObjectURL(url);
  }
  async function signOut() { await client.auth.signOut(); }
  return <div className="dashboard-page"><div className="dashboard-nav"><Container><Logo /><div className="dashboard-nav-actions"><Link to="/dashboard">My tags</Link><span className="user-name">{user.email}</span><button className="text-link" onClick={signOut}>Sign out</button></div></Container></div><main><Container className="dashboard-main"><div className="dashboard-heading"><div><p className="eyebrow">Admin tools</p><h1>Tag inventory</h1><p>Create activation codes for physical TagsRUs products.</p></div></div>{error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="notice" role="status">{icons.check}<span>{notice}</span></div>}<section className="admin-create-card"><h2>Create activation codes</h2><p>Codes are generated securely and only their hashes are stored in Supabase. Save the full codes after creation; they are shown only once.</p><form onSubmit={createCodes}><label>Tag name<input value={name} onChange={e => setName(e.target.value)} required maxLength="120" /></label><label>Number of codes<input type="number" min="1" max="100" value={quantity} onChange={e => setQuantity(e.target.value)} required /></label><button className="button" disabled={busy}>{busy ? 'Adding codes…' : 'Generate and add codes'} {icons.arrow}</button></form></section>{codes.length > 0 && <section className="admin-code-result"><div><h2>New codes</h2><button className="button button-small" onClick={downloadCodes}>Download CSV</button></div><ul>{codes.map(code => <li key={code}><code>{code}</code><button className="text-link" onClick={() => copyCode(code)}>Copy</button></li>)}</ul></section>}<section className="admin-inventory"><div className="admin-section-heading"><div><h2>Code inventory</h2><p>Only the last four characters are retained for identification.</p></div><button className="text-link" onClick={loadInventory}>Refresh</button></div>{loading ? <p>Loading inventory…</p> : inventory.length ? <div className="admin-code-list">{inventory.map((row, index) => <div className="admin-code-row" key={`${row.code_suffix}-${row.created_at}-${index}`}><div><strong>{row.tag_name}</strong><small>••••-{row.code_suffix || '????'} · Added {new Date(row.created_at).toLocaleDateString()}</small></div><span className={`status ${row.claimed ? 'status-active' : 'status-inactive'}`}><i></i>{row.claimed ? `Claimed ${new Date(row.claimed_at).toLocaleDateString()}` : 'Unclaimed'}</span></div>)}</div> : <p>No activation codes have been created yet.</p>}</section></Container></main></div>;
}

function PublicProfile() {
  const { token } = useParams(); const [profile, setProfile] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [pin, setPin] = useState(''); const [pinError, setPinError] = useState(''); const [pinBusy, setPinBusy] = useState(false); const [privateInfo, setPrivateInfo] = useState(null);
  useEffect(() => {
    let active = true;
    requireSupabase().rpc('get_tagsrus_public_profile', { p_token: token }).then(({ data, error: queryError }) => {
      if (!active) return;
      if (queryError) setError(readableError(queryError)); else setProfile(data);
      setLoading(false);
    }).catch(queryError => { if (active) { setError(readableError(queryError)); setLoading(false); } });
    return () => { active = false; };
  }, [token]);
  async function unlockPrivateInfo(e) {
    e.preventDefault(); setPinBusy(true); setPinError('');
    try {
      const { data, error: verifyError } = await requireSupabase().rpc('verify_tagsrus_profile_pin', { p_token: token, p_pin: pin });
      if (verifyError) setPinError(readableError(verifyError)); else setPrivateInfo(data);
    } catch (verifyError) { setPinError(readableError(verifyError)); }
    finally { setPinBusy(false); }
  }
  const personName = profile?.person_name || '';
  const initials = personName.split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase();
  const allPublicFields = profile?.medical_details || [];
  const allPrivateFields = privateInfo?.medical_details || [];
  const publicMedical = allPublicFields.filter(detail => isMedicalField(detail.field_key));
  const publicOther = allPublicFields.filter(detail => !isMedicalField(detail.field_key));
  const privateMedical = allPrivateFields.filter(detail => isMedicalField(detail.field_key));
  const privateOther = allPrivateFields.filter(detail => !isMedicalField(detail.field_key));
  return <div className="public-page"><main className="public-shell">
    <div className="public-brand" aria-label="TagsRUs"><BrandMark /><BrandName /></div>
    {loading ? <div className="inactive-profile"><p>Loading this profile?</p></div> : !profile ? <div className="inactive-profile"><div className="inactive-icon">{icons.shield}</div><h1>This profile is unavailable.</h1><p>{error || 'The tag may be inactive, or its link may be incorrect.'}</p></div> : <>
      <div className="emergency-banner"><span className="warning-symbol">!</span><p><strong>IMPORTANT:</strong> If this is an emergency requiring medical treatment, call 911 immediately before proceeding. Do not delay emergency care to access or review this information.</p></div>
      <section className="public-card">
        <div className="public-person"><div className="public-avatar">{profile.photo_url ? <img src={profile.photo_url} alt="" /> : initials || icons.user}</div><div><span className="public-kicker">Emergency contact profile</span><h1>{personName}</h1>{(profile.gender || profile.age != null) && <p className="public-demographics">{[genderLabel(profile.gender), profile.age != null ? `${profile.age} years old` : ""].filter(Boolean).join(" · ")}</p>}{profile.description && <p>{profile.description}</p>}</div></div>
        <div className="public-section"><div className="public-section-head"><h2>Emergency contacts</h2><span>{icons.phone} {profile.contacts?.length || 0} public</span></div>{profile.contacts?.length ? profile.contacts.map((contact, index) => <PublicContact key={`${contact.contact_name}-${index}`} contact={contact} />) : <p>No public emergency contacts have been added.</p>}</div>
        <div className="public-section public-medical"><div className="public-section-head"><h2>Medical information</h2><span>{icons.shield} Public details</span></div>{publicMedical.length ? publicMedical.map(detail => <MedicalInfoRow key={`public-${detail.field_key}`} detail={detail} />) : <p>No public medical details have been added.</p>}</div>
        {(publicOther.length > 0 || (privateInfo && privateOther.length > 0)) && <div className="public-section"><div className="public-section-head"><h2>Other information</h2></div>{publicOther.map(detail => <MedicalInfoRow key={`public-other-${detail.field_key}`} detail={detail} />)}{privateInfo && privateOther.map(detail => <MedicalInfoRow key={`private-other-${detail.field_key}`} detail={detail} visibility="private" />)}</div>}
        {profile.has_protected_info && <div className="public-section"><div className="public-section-head"><h2>PIN-protected information</h2><span>{icons.lock} Private</span></div>{privateInfo ? <><p>Protected information unlocked.</p>{privateInfo.contacts?.map((contact, index) => <PublicContact key={`private-contact-${index}`} contact={contact} />)}{privateMedical.length > 0 && <div className="private-info-group"><h3>Medical information</h3>{privateMedical.map(detail => <MedicalInfoRow key={`private-medical-${detail.field_key}`} detail={detail} visibility="private" />)}</div>}</> : <><p>Enter the six-digit access PIN provided by the profile owner.</p><form className="pin-form" onSubmit={unlockPrivateInfo}><input aria-label="Six-digit access PIN" inputMode="numeric" autoComplete="one-time-code" maxLength="6" placeholder="6-digit PIN" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} required /><button className="button" disabled={pinBusy}>{pinBusy ? 'Checking?' : 'Unlock'} {icons.arrow}</button>{pinError && <small className="form-error" role="alert">{pinError}</small>}</form></>}</div>}
      </section>
      <p className="public-disclaimer">TagsRUs displays information voluntarily provided by the profile owner. It is not an emergency response service or a substitute for professional medical care. In an emergency, call 911.</p>
    </>}
  </main></div>;
}

function PublicContact({ contact }) {
  const initials = contact.contact_name.split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase();
  const phoneDigits = contact.phone.replace(/\D/g, '');
  const email = contact.email?.trim();
  return <div className="public-contact"><div className="public-contact-avatar">{contact.photo_url ? <img src={contact.photo_url} alt="" /> : initials}</div><div className="public-contact-info"><strong>{contact.contact_name}</strong><span>{contact.relationship}</span><div className="public-contact-actions">{contact.phone && <a href={`tel:${phoneDigits}`}>{icons.phone} Call {contact.phone}</a>}{email && <><a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`} target="_blank" rel="noreferrer">{icons.mail} Email</a><a className="email-app-link" href={`mailto:${email}?subject=${encodeURIComponent('TagsRUs emergency contact')}`} target="_blank">Email app</a></>}</div></div></div>;
}

const MEDICAL_FIELD_KEYS = new Set(['allergies', 'conditions', 'medications', 'instructions']);
const MEDICAL_FIELD_OPTIONS = ['allergies', 'conditions', 'medications', 'instructions'];
const OTHER_INFO_FIELD_OPTIONS = ['devices', 'other'];
const GENDER_OPTIONS = [{ value: '', label: 'Prefer not to say' }, { value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }, { value: 'non_binary', label: 'Non-binary' }, { value: 'other', label: 'Other' }];
function isMedicalField(key) { return MEDICAL_FIELD_KEYS.has(key); }
function medicalFieldTitle(key) { return String(key).split('_').map(part => part ? part[0].toUpperCase() + part.slice(1) : '').join(' '); }
function genderLabel(value) { return GENDER_OPTIONS.find(option => option.value === value)?.label || ''; }

function MedicalInfoRow({ detail, visibility = 'public' }) {
  return <div className="medical-row"><div><span className="field-label medical-category-title">{medicalFieldTitle(detail.field_key)}</span><InformationItems field={detail.field_key} value={detail.field_value} /></div><span className={visibility === 'private' ? 'private-badge' : 'public-badge'}>{visibility === 'private' ? <>{icons.lock} Private</> : 'Public'}</span></div>;
}

function InformationItems({ field, value }) {
  const items = String(value || '').split(/[,;\n]+/).map(item => item.trim()).filter(Boolean);
  if (!items.length) return null;
  const fieldIcons = {
    allergies: icons.warning,
    medications: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 4 12 12a4.2 4.2 0 0 1-6 6L2 10a4.2 4.2 0 0 1 6-6Z"/><path d="m7 15 6-6"/></svg>,
    conditions: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.7c0 5.1-8.8 11-8.8 11s-8.8-5.9-8.8-11A4.7 4.7 0 0 1 12 6.3a4.7 4.7 0 0 1 8.8 2.4Z"/></svg>,
    instructions: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4H5v17h14V4h-3M9 3h6v4H9zM8 12h8M8 16h8"/></svg>,
    devices: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="2.5"/><path d="M10 18.5h4"/></svg>,
    other: icons.sparkle
  };
  const itemIcon = fieldIcons[field] || icons.sparkle;
  return <div className={`information-items ${field === 'allergies' ? 'allergy-list' : ''}`} role="list" aria-label={medicalFieldTitle(field)}>{items.map((item, index) => <span className={`information-item ${field === 'allergies' ? 'allergy-item' : ''}`} role="listitem" key={`${item}-${index}`}><span className="information-item-icon">{itemIcon}</span><span>{item}</span></span>)}</div>;
}

function PhotoPicker({ label, value, folder, userId, profileId, onChange }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function upload(e) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    if (!extensions[file.type]) { setError('Choose a JPG, PNG, or WebP image.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Images must be 5 MB or smaller.'); return; }
    setBusy(true); setError('');
    try {
      const client = requireSupabase(); const bucket = client.storage.from('tag-profile-photos');
      const path = `${userId}/${profileId}/${folder}/${crypto.randomUUID()}.${extensions[file.type]}`;
      const { error: uploadError } = await bucket.upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      onChange(bucket.getPublicUrl(path).data.publicUrl);
    } catch (uploadError) { setError(readableError(uploadError)); }
    finally { setBusy(false); }
  }
  return <div className="photo-picker"><div className="photo-picker-preview">{value ? <img src={value} alt="" /> : <span>{icons.user}</span>}</div><div className="photo-picker-control"><label className="photo-upload-button" title={value ? 'Change photo' : `Choose ${label.toLowerCase()}`}><span className="photo-sr-only">{value ? 'Change photo' : `Choose ${label.toLowerCase()}`}</span>{icons.upload}<input aria-label={label} type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={busy} /></label>{busy && <small>Uploading…</small>}{error && <small className="form-error" role="alert">{error}</small>}</div></div>;
}

function Dropdown({ value, options, onChange, label }) {
  const [open, setOpen] = useState(false); const rootRef = useRef(null); const optionRefs = useRef([]); const id = useId().replaceAll(':', '');
  const selected = options.find(option => option.value === value) || options[0];
  useEffect(() => {
    if (!open) return undefined;
    const outsideClick = event => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outsideClick);
    return () => document.removeEventListener('pointerdown', outsideClick);
  }, [open]);
  function moveFocus(index) { const next = Math.max(0, Math.min(options.length - 1, index)); optionRefs.current[next]?.focus(); }
  function handleOptionKey(event, index) {
    if (event.key === 'ArrowDown') { event.preventDefault(); moveFocus((index + 1) % options.length); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); moveFocus((index - 1 + options.length) % options.length); }
    else if (event.key === 'Home') { event.preventDefault(); moveFocus(0); }
    else if (event.key === 'End') { event.preventDefault(); moveFocus(options.length - 1); }
    else if (event.key === 'Escape') { event.preventDefault(); setOpen(false); rootRef.current?.querySelector('.dropdown-trigger')?.focus(); }
  }
  return <div className="styled-dropdown" ref={rootRef}>
    <button type="button" className="dropdown-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={`dropdown-${id}`} onClick={() => setOpen(current => !current)} onKeyDown={event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setTimeout(() => moveFocus(options.findIndex(option => option.value === value)), 0); }
      if (event.key === 'Escape') setOpen(false);
    }}><span>{selected?.label}</span>{icons.chevron}</button>
    {open && <div className="dropdown-menu" id={`dropdown-${id}`} role="listbox" aria-label={label}>{options.map((option, index) => <button key={option.value} ref={element => { optionRefs.current[index] = element; }} type="button" role="option" aria-selected={option.value === value} className={option.value === value ? 'dropdown-option is-selected' : 'dropdown-option'} onKeyDown={event => handleOptionKey(event, index)} onClick={() => { onChange(option.value); setOpen(false); rootRef.current?.querySelector('.dropdown-trigger')?.focus(); }}>{option.label}{option.value === value && <span className="dropdown-check">{icons.check}</span>}</button>)}</div>}
  </div>;
}

function Legal({ type }) { const privacy = type === 'privacy'; return <div className="legal-page"><Header /><Container className="legal-wrap"><p className="eyebrow">TagsRUs</p><h1>{privacy ? 'Privacy policy' : 'Terms of service'}</h1><p className="legal-updated">Last updated November 11, 2026 · Draft for legal review</p><div className="legal-content">{privacy ? <><h2>Our approach</h2><p>TagsRUs is designed to help customers voluntarily share emergency contact and optional medical information through a physical NFC tag. We collect and use information to provide the service, secure accounts, process purchases when configured, and help customers manage their tags.</p><h2>Information you choose to share</h2><p>Information marked Public may be visible to anyone who scans the associated tag. Information marked PIN Protected is intended to remain hidden until a visitor successfully verifies the access PIN. Customers are responsible for choosing appropriate information and protecting their PINs.</p><h2>Security and retention</h2><p>Production deployments should use server-side access controls, encrypted connections, hashed PINs, rate limiting, and a configured database with row-level security. We do not ask customers to provide Social Security numbers, insurance account numbers, or full dates of birth.</p><h2>Questions</h2><p>Contact <a href="mailto:hello@trentenritter.com">hello@trentenritter.com</a> with privacy questions or requests.</p></> : <><h2>Information service, not emergency care</h2><p>TagsRUs provides a digital information platform for displaying information voluntarily submitted by customers. TagsRUs does not independently verify the accuracy, completeness, or current status of information supplied by users. TagsRUs is not an emergency response service, medical provider, or substitute for professional medical care. In an emergency, call 911.</p><h2>Customer responsibility</h2><p>You are responsible for keeping your information accurate and up to date, deciding what to mark Public or PIN Protected, and sharing access PINs only with people you trust. You understand that TagsRUs is not responsible for the accuracy, completeness, or consequences of information you choose to add to your profile.</p><h2>Account and tag access</h2><p>Keep your account credentials and confirmation PIN secure. You may deactivate a lost tag through your account. Public profiles are read-only and do not allow visitors to edit information.</p><h2>Legal review</h2><p>These terms are a product draft and should be reviewed by qualified counsel before production launch.</p></>}</div></Container><Footer /></div>; }

function ProfileEditor() {
  const { id } = useParams(); const { user } = useAuth(); const navigate = useNavigate();
  const [profile, setProfile] = useState(null); const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [gender, setGender] = useState(''); const [age, setAge] = useState(''); const [personPhotoUrl, setPersonPhotoUrl] = useState(''); const [accessPin, setAccessPin] = useState(''); const [hasAccessPin, setHasAccessPin] = useState(false); const [changingPin, setChangingPin] = useState(false);
  const [contacts, setContacts] = useState([]); const [medical, setMedical] = useState([]); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const client = requireSupabase();
  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: p, error: pe }, { data: c, error: ce }, { data: m, error: me }, { data: pinStatus, error: pinStatusError }] = await Promise.all([
        client.from('profiles').select('id,person_name,identifying_description,photo_url,gender,age').eq('id', id).eq('owner_id', user.id).maybeSingle(),
        client.from('emergency_contacts').select('*').eq('profile_id', id).order('sort_order'),
        client.from('medical_details').select('*').eq('profile_id', id).order('created_at'),
        client.rpc('has_tagsrus_access_pin', { p_profile_id: id }),
      ]);
      if (!active) return;
      const loadError = pe || ce || me || pinStatusError;
      if (loadError) { setError(readableError(loadError)); return; }
      if (!p) { setError('Profile not found or you do not have access to it.'); return; }
      setProfile(p); setName(p.person_name); setDescription(p.identifying_description || ''); setGender(p.gender || ''); setAge(p.age == null ? '' : String(p.age)); setPersonPhotoUrl(p.photo_url || ''); setContacts(c || []); setMedical(m || []); setHasAccessPin(Boolean(pinStatus));
    })();
    return () => { active = false; };
  }, [id, user.id]);
  function updateContact(index, key, value) { setContacts(rows => rows.map((row, i) => i === index ? { ...row, [key]: value } : row)); }
  function updateMedical(index, key, value) { setMedical(rows => rows.map((row, i) => i === index ? { ...row, [key]: value } : row)); }
  function updateMedicalField(fieldKey, key, value) { setMedical(rows => rows.map(row => row.field_key === fieldKey ? { ...row, [key]: value } : row)); }
  async function save(e) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      if (accessPin && (hasProtectedDetails || hasAccessPin)) {
        const { error: pinError } = await client.rpc('set_tagsrus_access_pin', { p_profile_id: id, p_pin: accessPin });
        if (pinError) throw pinError;
        setAccessPin('');
        setHasAccessPin(true); setChangingPin(false);
      }
      const { error: profileError } = await client.from('profiles').update({ person_name: name.trim(), identifying_description: description.trim() || null, photo_url: personPhotoUrl || null, gender: gender || null, age: age === '' ? null : Number(age) }).eq('id', id);
      if (profileError) throw profileError;
      const { data: existingContacts, error: contactReadError } = await client.from('emergency_contacts').select('id').eq('profile_id', id);
      if (contactReadError) throw contactReadError;
      const keptContactIds = contacts.filter(c => c.id).map(c => c.id);
      const removedContactIds = (existingContacts || []).map(c => c.id).filter(contactId => !keptContactIds.includes(contactId));
      if (removedContactIds.length) { const { error: deleteError } = await client.from('emergency_contacts').delete().in('id', removedContactIds); if (deleteError) throw deleteError; }
      if (contacts.length) {
        const rows = contacts.map((c, index) => ({ ...(c.id ? { id: c.id } : {}), profile_id: id, contact_name: c.contact_name.trim(), relationship: c.relationship.trim(), phone: c.phone.trim(), email: c.email?.trim() || null, photo_url: c.photo_url || null, visibility: c.visibility, sort_order: index }));
        const { error: saveContactsError } = await client.from('emergency_contacts').upsert(rows);
        if (saveContactsError) throw saveContactsError;
      }
      const { data: existingMedical, error: medicalReadError } = await client.from('medical_details').select('field_key').eq('profile_id', id);
      if (medicalReadError) throw medicalReadError;
      const medicalRows = medical.filter(row => row.field_value.trim()).map(row => ({ profile_id: id, field_key: row.field_key, field_value: row.field_value.trim(), visibility: row.visibility }));
      const keptKeys = medicalRows.map(row => row.field_key); const removedKeys = (existingMedical || []).map(row => row.field_key).filter(key => !keptKeys.includes(key));
      if (removedKeys.length) { const { error: deleteMedicalError } = await client.from('medical_details').delete().eq('profile_id', id).in('field_key', removedKeys); if (deleteMedicalError) throw deleteMedicalError; }
      if (medicalRows.length) { const { error: saveMedicalError } = await client.from('medical_details').upsert(medicalRows, { onConflict: 'profile_id,field_key' }); if (saveMedicalError) throw saveMedicalError; }
      setNotice('Profile changes saved.');
    } catch (err) { setError(readableError(err)); }
    finally { setBusy(false); }
  }
  const hasProtectedDetails = medical.some(row => row.visibility === 'pin_protected' && row.field_value.trim()) || contacts.some(contact => contact.visibility === 'pin_protected' && contact.contact_name.trim());
  const signOut = async () => { await client.auth.signOut(); navigate('/login', { replace: true }); };
  return <div className="dashboard-page"><div className="dashboard-nav"><Container><Logo /><div className="dashboard-nav-actions"><span className="user-chip">{(user.email || 'U').slice(0, 1).toUpperCase()}</span><span className="user-name">{user.email}</span><AdminLink /><button className="text-link" onClick={signOut}>Sign out</button></div></Container></div><main><Container className="editor-main"><Link className="back-link" to="/dashboard">← Back to My tags</Link>{error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="notice" role="status">{icons.check}<span>{notice}</span></div>}{!profile ? !error && <p>Loading profile…</p> : <><div className="editor-heading"><div><p className="eyebrow">Profile settings</p><h1>Edit profile</h1><p>Choose what someone sees when they tap this tag.</p></div></div><form className="editor-layout" onSubmit={save}><div className="editor-form"><section className="form-section"><div className="form-section-heading"><div><h2>Basic information</h2><p>Help someone identify who this tag belongs to.</p></div><span>01</span></div><PhotoPicker label="Person photo" value={personPhotoUrl} folder="person" userId={user.id} profileId={id} onChange={setPersonPhotoUrl} /><label>Person’s name<input value={name} onChange={e => setName(e.target.value)} required maxLength="160" /></label><label>Gender<Dropdown label="Gender" value={gender} options={GENDER_OPTIONS} onChange={setGender} /></label><label>Age<input type="number" min="0" max="125" step="1" value={age} onChange={e => setAge(e.target.value)} /></label><label>Short description<textarea value={description} onChange={e => setDescription(e.target.value)} maxLength="500" /></label></section><section className="form-section"><div className="form-section-heading"><div><h2>Emergency contacts</h2><p>Only the fields you mark public are shown without a PIN.</p></div><span>02</span></div>{contacts.map((c, i) => <div className="contact-edit" key={c.id || i}><PhotoPicker label="Contact photo" value={c.photo_url || ""} folder={`contacts/${c.id || i}`} userId={user.id} profileId={id} onChange={url => updateContact(i, "photo_url", url)} /><label>Name<input value={c.contact_name} onChange={e => updateContact(i, 'contact_name', e.target.value)} required maxLength="160" /></label><label>Relationship<input value={c.relationship} onChange={e => updateContact(i, 'relationship', e.target.value)} required maxLength="100" /></label><label>Phone<input value={c.phone} onChange={e => updateContact(i, 'phone', e.target.value)} required maxLength="40" /></label><label>Email<input type="email" value={c.email || ''} onChange={e => updateContact(i, 'email', e.target.value)} maxLength="320" /></label><label>Visibility<Dropdown label={`Visibility for ${c.contact_name || "contact"}`} value={c.visibility} options={[{ value: "public", label: "Public" }, { value: "pin_protected", label: "PIN protected" }]} onChange={value => updateContact(i, "visibility", value)} /></label><button type="button" className="deactivate-button" onClick={() => setContacts(rows => rows.filter((_, index) => index !== i))}>Remove contact</button></div>)}<button type="button" className="add-contact" onClick={() => setContacts(rows => [...rows, { contact_name: '', relationship: '', phone: '', email: '', photo_url: null, visibility: 'public' }])}>{icons.plus} Add another contact</button></section>{hasProtectedDetails && !hasAccessPin && <section className="form-section"><div className="form-section-heading"><div><h2>Set up a profile PIN</h2><p>Set a six-digit PIN to protect the details you marked PIN protected.</p></div><span>03</span></div><label>Access PIN<input type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" minLength="6" maxLength="6" value={accessPin} onChange={e => setAccessPin(e.target.value.replace(/\D/g, ''))} placeholder="6 digits" required /></label></section>}<section className="form-section"><div className="form-section-heading"><div><h2>Medical information</h2><p>Optional. Select visibility for each detail.</p></div><span>04</span></div>{medical.filter(row => isMedicalField(row.field_key)).map(row => <MedicalFieldEditor key={row.field_key} row={row} onUpdate={updateMedicalField} />)}<MedicalAdd onAdd={row => setMedical(rows => [...rows.filter(m => m.field_key !== row.field_key), row])} fields={MEDICAL_FIELD_OPTIONS} /></section><section className="form-section"><div className="form-section-heading"><div><h2>Other information</h2><p>Add device details or other non-medical information.</p></div><span>05</span></div>{medical.filter(row => !isMedicalField(row.field_key)).map(row => <MedicalFieldEditor key={row.field_key} row={row} onUpdate={updateMedicalField} />)}<MedicalAdd onAdd={row => setMedical(rows => [...rows.filter(m => m.field_key !== row.field_key), row])} fields={OTHER_INFO_FIELD_OPTIONS} /></section><section className="form-section"><label className="checkbox-line"><input type="checkbox" required /><span>I understand that information marked Public will be visible to anyone who scans this tag.</span></label><div className="profile-save-actions"><button className="button" disabled={busy}>{busy ? 'Saving…' : 'Save profile changes'} {icons.arrow}</button>{hasAccessPin && <button type="button" className="pin-change-link" onClick={() => { setChangingPin(open => !open); setAccessPin(''); }}>{changingPin ? 'Cancel PIN change' : 'Change access PIN'}</button>}</div>{changingPin && <label className="change-pin-field">New access PIN<input type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" minLength="6" maxLength="6" value={accessPin} onChange={e => setAccessPin(e.target.value.replace(/\D/g, ''))} placeholder="6 digits" required /></label>}</section></div><div className="editor-preview"><div className="preview-sticky"><div className="editor-preview-head"><span>Account</span><span>{icons.sparkle}</span></div><div className="preview-mini-card"><h3>{name || 'Your profile'}</h3><p>{description || 'Your profile description will appear here.'}</p><div className="preview-mini-line" /><strong>{contacts.length} emergency contacts</strong><div className="preview-mini-private">{icons.lock} Medical information visibility is saved with your profile</div></div></div></div></form></>}</Container></main></div>;
}

const SETUP_STEPS = ['Person', 'Description', 'Photo', 'Contacts', 'Allergies', 'Medications', 'More information'];
const OPTIONAL_PROFILE_FIELDS = ['conditions', 'devices', 'instructions', 'other'];

function TagSetupWizard() {
  const { id } = useParams(); const { user } = useAuth(); const navigate = useNavigate(); const client = requireSupabase();
  const [step, setStep] = useState(0); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [name, setName] = useState(''); const [description, setDescription] = useState('');
  const [gender, setGender] = useState(''); const [age, setAge] = useState(''); const [personPhotoUrl, setPersonPhotoUrl] = useState('');
  const [contacts, setContacts] = useState([]); const [details, setDetails] = useState([]); const [accessPin, setAccessPin] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: profile, error: profileError }, { data: contactRows, error: contactError }, { data: medicalRows, error: medicalError }] = await Promise.all([
        client.from('profiles').select('id,person_name,identifying_description,photo_url,gender,age').eq('id', id).eq('owner_id', user.id).maybeSingle(),
        client.from('emergency_contacts').select('*').eq('profile_id', id).order('sort_order'),
        client.from('medical_details').select('*').eq('profile_id', id).order('created_at'),
      ]);
      if (!active) return;
      const loadError = profileError || contactError || medicalError;
      if (loadError) setError(readableError(loadError));
      else if (!profile) setError('This tag profile could not be found.');
      else {
        setName(profile.person_name || ''); setDescription(profile.identifying_description || '');
        setGender(profile.gender || ''); setAge(profile.age == null ? '' : String(profile.age));
        setPersonPhotoUrl(profile.photo_url || ''); setContacts(contactRows || []); setDetails(medicalRows || []);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [client, id, user.id]);

  function updateContact(index, key, value) { setContacts(rows => rows.map((row, i) => i === index ? { ...row, [key]: value } : row)); }
  function updateDetail(fieldKey, patch) {
    setDetails(rows => rows.some(row => row.field_key === fieldKey)
      ? rows.map(row => row.field_key === fieldKey ? { ...row, ...patch } : row)
      : [...rows, { field_key: fieldKey, field_value: '', visibility: 'pin_protected', ...patch }]);
  }
  function nextStep() {
    setError('');
    if (step === 0 && !name.trim()) { setError('Enter the person’s name to continue.'); return; }
    if (step === 0 && age !== '' && (!Number.isInteger(Number(age)) || Number(age) < 0 || Number(age) > 125)) { setError('Enter an age from 0 to 125.'); return; }
    if (step === 3) {
      const incomplete = contacts.some(contact => [contact.contact_name, contact.relationship, contact.phone].some(Boolean)
        && (!contact.contact_name?.trim() || !contact.relationship?.trim() || !contact.phone?.trim()));
      if (incomplete) { setError('For each contact, add their name, relationship, and phone number, or remove the empty contact.'); return; }
    }
    setStep(current => Math.min(current + 1, SETUP_STEPS.length - 1));
  }
  function previousStep() { setError(''); setStep(current => Math.max(current - 1, 0)); }

  async function finish(e) {
    e.preventDefault(); setError('');
    if (step !== SETUP_STEPS.length - 1) { nextStep(); return; }
    if (!name.trim()) { setStep(0); setError('Enter the person’s name to continue.'); return; }
    const hasPrivateInfo = contacts.some(contact => contact.visibility === 'pin_protected' && contact.contact_name?.trim())
      || details.some(detail => detail.visibility === 'pin_protected' && detail.field_value?.trim());
    if (hasPrivateInfo && !/^\d{6}$/.test(accessPin)) { setError('Set a six-digit PIN to protect the information marked PIN protected.'); return; }
    setBusy(true);
    try {
      if (hasPrivateInfo) {
        const { error: pinError } = await client.rpc('set_tagsrus_access_pin', { p_profile_id: id, p_pin: accessPin });
        if (pinError) throw pinError;
      }
      const { error: profileError } = await client.from('profiles').update({
        person_name: name.trim(), identifying_description: description.trim() || null,
        photo_url: personPhotoUrl || null, gender: gender || null, age: age === '' ? null : Number(age),
      }).eq('id', id);
      if (profileError) throw profileError;

      const { data: existingContacts, error: contactsReadError } = await client.from('emergency_contacts').select('id').eq('profile_id', id);
      if (contactsReadError) throw contactsReadError;
      const keptContactIds = contacts.filter(contact => contact.id).map(contact => contact.id);
      const removedContactIds = (existingContacts || []).map(contact => contact.id).filter(contactId => !keptContactIds.includes(contactId));
      if (removedContactIds.length) {
        const { error: deleteError } = await client.from('emergency_contacts').delete().in('id', removedContactIds);
        if (deleteError) throw deleteError;
      }
      const contactRows = contacts.filter(contact => contact.contact_name?.trim()).map((contact, index) => ({
        ...(contact.id ? { id: contact.id } : {}), profile_id: id, contact_name: contact.contact_name.trim(),
        relationship: contact.relationship.trim(), phone: contact.phone.trim(), email: contact.email?.trim() || null,
        photo_url: contact.photo_url || null, visibility: contact.visibility || 'public', sort_order: index,
      }));
      if (contactRows.length) {
        const { error: contactsSaveError } = await client.from('emergency_contacts').upsert(contactRows);
        if (contactsSaveError) throw contactsSaveError;
      }

      const medicalRows = details.filter(detail => detail.field_value?.trim()).map(detail => ({
        profile_id: id, field_key: detail.field_key, field_value: detail.field_value.trim(), visibility: detail.visibility || 'pin_protected',
      }));
      const keptKeys = medicalRows.map(row => row.field_key);
      const { data: existingDetails, error: detailsReadError } = await client.from('medical_details').select('field_key').eq('profile_id', id);
      if (detailsReadError) throw detailsReadError;
      const removedKeys = (existingDetails || []).map(row => row.field_key).filter(key => !keptKeys.includes(key));
      if (removedKeys.length) {
        const { error: deleteError } = await client.from('medical_details').delete().eq('profile_id', id).in('field_key', removedKeys);
        if (deleteError) throw deleteError;
      }
      if (medicalRows.length) {
        const { error: detailsSaveError } = await client.from('medical_details').upsert(medicalRows, { onConflict: 'profile_id,field_key' });
        if (detailsSaveError) throw detailsSaveError;
      }
      navigate('/dashboard', { replace: true });
    } catch (saveError) { setError(readableError(saveError)); }
    finally { setBusy(false); }
  }

  const hasPrivateInfo = contacts.some(contact => contact.visibility === 'pin_protected' && contact.contact_name?.trim())
    || details.some(detail => detail.visibility === 'pin_protected' && detail.field_value?.trim());
  const renderMedicalField = (fieldKey, title, prompt) => {
    const row = details.find(detail => detail.field_key === fieldKey) || { field_value: '', visibility: 'pin_protected' };
    return <div className="setup-detail-field" key={fieldKey}><label>{title}<textarea value={row.field_value} onChange={e => updateDetail(fieldKey, { field_value: e.target.value })} maxLength="2000" placeholder={prompt} /></label><label>Visibility<Dropdown label={`Visibility for ${title}`} value={row.visibility} options={[{ value: 'public', label: 'Public' }, { value: 'pin_protected', label: 'PIN protected' }]} onChange={value => updateDetail(fieldKey, { visibility: value })} /></label></div>;
  };

  return <div className="dashboard-page"><div className="dashboard-nav"><Container><Logo /><div className="dashboard-nav-actions"><span>Tag setup</span></div></Container></div><main><Container className="setup-main">
    {loading ? <p>Loading your tag setup…</p> : error && !name && step === 0 ? <div className="form-error" role="alert">{error}</div> : <>
      <div className="setup-progress"><span>Step {step + 1} of {SETUP_STEPS.length}</span><div><i style={{ width: `${((step + 1) / SETUP_STEPS.length) * 100}%` }} /></div></div>
      <form className="setup-card" onSubmit={finish}>
        {step === 0 && <><p className="eyebrow">Let’s get started</p><h1>Who is this tag for?</h1><p>Start with the person’s name. Gender and age are optional.</p><label>Person’s name<input autoFocus value={name} onChange={e => setName(e.target.value)} required maxLength="160" placeholder="Full name" /></label><label>Gender<Dropdown label="Gender" value={gender} options={GENDER_OPTIONS} onChange={setGender} /></label><label>Age<input type="number" min="0" max="125" step="1" value={age} onChange={e => setAge(e.target.value)} placeholder="Age in years (optional)" /></label></>}
        {step === 1 && <><p className="eyebrow">A little context</p><h1>Add a description</h1><p>Share a short detail that could help someone recognize or support them.</p><label>Description<textarea autoFocus value={description} onChange={e => setDescription(e.target.value)} maxLength="500" placeholder="For example: speaks English and Spanish, uses a wheelchair, or may need extra time to respond." /></label></>}
        {step === 2 && <><p className="eyebrow">Make the profile familiar</p><h1>Add a photo</h1><p>A clear photo can help someone quickly confirm they found the right profile.</p><PhotoPicker label="Person photo" value={personPhotoUrl} folder="person" userId={user.id} profileId={id} onChange={setPersonPhotoUrl} /></>}
        {step === 3 && <><p className="eyebrow">People to call</p><h1>Add emergency contacts</h1><p>Add the people someone should reach. You can add more than one, or continue without adding a contact.</p>{contacts.map((contact, index) => <div className="setup-contact" key={contact.id || index}><div className="setup-contact-heading"><strong>Contact {index + 1}</strong><button type="button" className="deactivate-button" onClick={() => setContacts(rows => rows.filter((_, i) => i !== index))}>Remove</button></div><PhotoPicker label="Contact photo" value={contact.photo_url || ''} folder={`contacts/${contact.id || index}`} userId={user.id} profileId={id} onChange={url => updateContact(index, 'photo_url', url)} /><label>Name<input value={contact.contact_name || ''} onChange={e => updateContact(index, 'contact_name', e.target.value)} maxLength="160" /></label><label>Relationship<input value={contact.relationship || ''} onChange={e => updateContact(index, 'relationship', e.target.value)} maxLength="100" /></label><label>Phone<input value={contact.phone || ''} onChange={e => updateContact(index, 'phone', e.target.value)} maxLength="40" /></label><label>Email<input type="email" value={contact.email || ''} onChange={e => updateContact(index, 'email', e.target.value)} maxLength="320" /></label><label>Visibility<Dropdown label={`Visibility for ${contact.contact_name || `contact ${index + 1}`}`} value={contact.visibility || 'public'} options={[{ value: 'public', label: 'Public' }, { value: 'pin_protected', label: 'PIN protected' }]} onChange={value => updateContact(index, 'visibility', value)} /></label></div>)}<button className="add-contact" type="button" onClick={() => setContacts(rows => [...rows, { contact_name: '', relationship: '', phone: '', email: '', photo_url: null, visibility: 'public' }])}>{icons.plus} Add an emergency contact</button></>}
        {step === 4 && <><p className="eyebrow">Medical information</p><h1>Any allergies?</h1><p>Add each allergy separated by a comma or on a new line. Leave blank if there are none.</p>{renderMedicalField('allergies', 'Allergies', 'For example: peanuts, penicillin')}</>}
        {step === 5 && <><p className="eyebrow">Medical information</p><h1>Any medications?</h1><p>List medications someone should know about. Include a dose or schedule if helpful.</p>{renderMedicalField('medications', 'Medications', 'For example: medication name, dose, and schedule')}</>}
        {step === 6 && <><p className="eyebrow">Optional details</p><h1>Anything else to add?</h1><p>Add any other information that may help. You can always update it later.</p>{OPTIONAL_PROFILE_FIELDS.map(field => renderMedicalField(field, medicalFieldTitle(field), `Add ${medicalFieldTitle(field).toLowerCase()} (optional)`))}{hasPrivateInfo && <div className="setup-pin"><h2>Protect private details</h2><p>Set a six-digit PIN to protect any details or contacts marked PIN protected.</p><label>Access PIN<input type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" minLength="6" maxLength="6" value={accessPin} onChange={e => setAccessPin(e.target.value.replace(/\D/g, ''))} required placeholder="6 digits" /></label></div>}</>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="setup-actions">{step > 0 && <button type="button" className="setup-back" onClick={previousStep} disabled={busy}>Back</button>}{step < SETUP_STEPS.length - 1 ? <button type="button" className="button" onClick={nextStep}>Next {icons.arrow}</button> : <button className="button" disabled={busy}>{busy ? 'Saving profile…' : 'Finish setup'} {icons.arrow}</button>}</div>
      </form>
    </>}
  </Container></main></div>;
}

function MedicalFieldEditor({ row, onUpdate }) {
  return <div className="medical-edit-row" key={row.field_key}><div><strong className="medical-category-title">{medicalFieldTitle(row.field_key)}</strong><textarea aria-label={row.field_key} value={row.field_value} onChange={e => onUpdate(row.field_key, 'field_value', e.target.value)} maxLength="2000" /><InformationItems field={row.field_key} value={row.field_value} /></div><Dropdown label={`Visibility for ${medicalFieldTitle(row.field_key)}`} value={row.visibility} options={[{ value: 'public', label: 'Public' }, { value: 'pin_protected', label: 'PIN protected' }]} onChange={value => onUpdate(row.field_key, 'visibility', value)} /></div>;
}

function MedicalAdd({ onAdd, fields = MEDICAL_FIELD_OPTIONS }) {
  const [field, setField] = useState(fields[0]);
  const options = fields.map(key => ({ value: key, label: medicalFieldTitle(key) }));
  return <div className="medical-add"><Dropdown label="Information type" value={field} options={options} onChange={setField} /><button type="button" className="add-contact" onClick={() => onAdd({ field_key: field, field_value: '', visibility: 'pin_protected' })}>{icons.plus} Add detail</button></div>;
}

function App() { return <Routes><Route path="/" element={<Landing />} /><Route path="/login" element={<AuthShell />} /><Route path="/signup" element={<AuthShell mode="signup" />} /><Route path="/reset-password" element={<ResetPassword />} /><Route path="/checkout" element={<Checkout />} /><Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} /><Route path="/dashboard/profiles/:id/setup" element={<RequireAuth><TagSetupWizard /></RequireAuth>} /><Route path="/dashboard/profiles/:id" element={<RequireAuth><ProfileEditor /></RequireAuth>} /><Route path="/admin/tags" element={<RequireAuth><RequireAdmin><AdminTagCodes /></RequireAdmin></RequireAuth>} /><Route path="/t/:token" element={<PublicProfile />} /><Route path="/privacy" element={<Legal type="privacy" />} /><Route path="/terms" element={<Legal type="terms" />} /><Route path="*" element={<NotFound />} /></Routes>; }
function NotFound() { return <div className="not-found"><Header /><Container><div className="not-found-card"><span className="not-found-number">404</span><h1>That page wandered off.</h1><p>Let’s get you back to something useful.</p><Link className="button" to="/">Back home {icons.arrow}</Link></div></Container></div>; }

createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></React.StrictMode>);
