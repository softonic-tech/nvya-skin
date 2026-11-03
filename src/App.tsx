import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowRight, Menu, Minus, Moon, Plus, Search, ShoppingBag, Sun, X } from 'lucide-react';
import { MAX_QUANTITY, encodeCart, formatPrice, products, type Cart, type Product } from './catalog';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const BAG_KEY = 'nyva-bag';

const categories = ['All 20', 'Cleansers', 'Serums', 'Moisturisers', 'Treatments', 'SPF'];
const moreCategories = ['Essence', 'Eye care', 'Masks', 'Facial oils'];
const heroProducts = [
  { image: 'hero-gentle-cleanser', name: 'NYVA Gentle Cleanser' },
  { image: 'hero-hydrating-essence', name: 'NYVA Hydrating Essence' },
  { image: 'hero-vitamin-c-serum', name: 'NYVA Vitamin C Serum' },
  { image: 'hero-barrier-cream', name: 'NYVA Barrier Cream' },
  { image: 'hero-facial-oil', name: 'NYVA Facial Oil' },
];
const visualStyle = (index: number) => ({
  backgroundPosition: `${(index % 4) * 100 / 3}% ${Math.floor(index / 4) * 25}%`,
});
const describe = (p: Product) => `${p.name} from the NYVA SKIN ${p.category.toLowerCase()} collection. Full ingredients, directions and sizes are printed on the pack.`;

type OrderState = null | 'checking' | 'paid' | 'pending';

function loadBag(): Cart {
  try {
    const raw = JSON.parse(localStorage.getItem(BAG_KEY) || '{}') as Cart;
    return Object.fromEntries(Object.entries(raw).filter(([id, qty]) => products.some(p => p.id === id) && qty > 0));
  } catch {
    return {};
  }
}

export default function App() {
  const reduced = useReducedMotion();
  const [dark, setDark] = useState(false);
  const [category, setCategory] = useState('All 20');
  const [bag, setBag] = useState<Cart>(loadBag);
  const [bagOpen, setBagOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderState>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem('nyva-theme');
    setDark(stored ? stored === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
    const onScroll = () => setScrolled(window.scrollY > 28);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('nyva-theme', dark ? 'dark' : 'light'); }, [dark]);
  useEffect(() => { localStorage.setItem(BAG_KEY, JSON.stringify(bag)); }, [bag]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (params.get('checkout') === 'cancelled') {
      window.history.replaceState(null, '', window.location.pathname);
      setPayError('Payment was cancelled. Your bag is still here when you\u2019re ready.');
      setBagOpen(true);
      return;
    }
    if (params.get('order') !== 'success' || !sessionId) return;
    window.history.replaceState(null, '', window.location.pathname);
    setBag({});
    setOrder('checking');
    fetch(`${API_URL}/session?session_id=${encodeURIComponent(sessionId)}`)
      .then(res => (res.ok ? res.json() : { paid: false }))
      .then((data: { paid?: boolean }) => setOrder(data.paid ? 'paid' : 'pending'))
      .catch(() => setOrder('pending'));
  }, []);
  useEffect(() => {
    const locked = bagOpen || menuOpen || searchOpen || !!selected || !!info || !!order;
    document.body.style.overflow = locked ? 'hidden' : '';
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setBagOpen(false); setMenuOpen(false); setSearchOpen(false); setSelected(null); setInfo(null); setOrder(null); } };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [bagOpen, menuOpen, searchOpen, selected, info, order]);
  const visible = useMemo(() => products.filter(p => (category === 'All 20' || p.category === (category === 'SPF' ? 'Sun care' : category)) && p.name.toLowerCase().includes(query.toLowerCase())), [category, query]);
  const bagLines = products.filter(p => bag[p.id]).map(p => ({ product: p, quantity: bag[p.id] }));
  const bagCount = bagLines.reduce((n, l) => n + l.quantity, 0);
  const subtotal = bagLines.reduce((n, l) => n + l.product.price * l.quantity, 0);
  const setQty = (id: string, qty: number) => setBag(v => { const next = { ...v }; if (qty <= 0) delete next[id]; else next[id] = Math.min(MAX_QUANTITY, qty); return next; });
  const add = (p: Product) => { setQty(p.id, (bag[p.id] ?? 0) + 1); setSelected(null); setBagOpen(true); };
  const checkout = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const res = await fetch(`${API_URL}/checkout`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: encodeCart(bag) }) });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout.');
      window.location.assign(data.url);
    } catch (err) {
      setPayError(err instanceof Error && err.message !== 'Failed to fetch' ? err.message : 'Could not start checkout. Please try again.');
      setPaying(false);
    }
  };
  return <>
    <a className="ny-skip" href="#collection">Skip to collection</a>
    <header className={`ny-header ${scrolled ? 'is-scrolled' : ''}`}>
      <a className="ny-logo ny-logo-image" href="#top" aria-label="NYVA SKIN home"><span className="ny-logo-frame"><img src="/images/nyva-floral-logo.png" alt="" /></span></a>
      <nav aria-label="Main navigation" className="ny-nav"><a href="#collection">Shop</a><a href="#ritual">Ritual</a><a href="#about">About</a></nav>
      <div className="ny-header-tools"><button aria-label="Search products" onClick={() => setSearchOpen(true)}><Search size={20}/></button><button aria-label={`Shopping bag, ${bagCount} items`} className="ny-bag-icon" onClick={() => setBagOpen(true)}><ShoppingBag size={20}/>{bagCount > 0 && <span>{bagCount}</span>}</button><button aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`} onClick={() => setDark(v => !v)}>{dark ? <Sun size={20}/> : <Moon size={20}/>}</button><button className="ny-menu-trigger" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu size={23}/></button></div>
    </header>
    <main id="top">
      <section className="ny-hero" aria-labelledby="ny-hero-heading">
        <div className="ny-hero-photo" aria-hidden="true"/>
        <div className="ny-hero-copy"><motion.p className="ny-kicker" initial={reduced ? false : {opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.2,duration:.7}}>THE NYVA RITUAL</motion.p><h1 id="ny-hero-heading"><motion.span initial={reduced ? false : {opacity:0,y:35}} animate={{opacity:1,y:0}} transition={{delay:.25,duration:.85}}>SKIN, IN ITS</motion.span><motion.span initial={reduced ? false : {opacity:0,y:35}} animate={{opacity:1,y:0}} transition={{delay:.38,duration:.85}}>ELEMENT.</motion.span></h1><motion.p initial={reduced ? false : {opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:.75,duration:.7}}>Twenty essentials. One personal ritual.</motion.p><motion.div className="ny-hero-actions" initial={reduced ? false : {opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:.9,duration:.7}}><a className="ny-primary" href="#collection">Explore Collection <ArrowRight size={18}/></a><a className="ny-underlink" href="#about">Our Philosophy <ArrowRight size={17}/></a></motion.div></div>
        <div className="ny-hero-products" aria-label="Featured NYVA SKIN products">{heroProducts.map((p,i) => <motion.img key={p.name} className={`ny-hero-bottle bottle-${i}`} src={`/images/${p.image}.webp`} alt={p.name} initial={reduced ? false : {opacity:0,y:55,scale:.93}} animate={{opacity:1,y:0,scale:1}} transition={{delay:.45+i*.12,duration:.9}}/>)}</div>
        <div className="ny-hero-foot"><span>01 / THE COLLECTION</span><a href="#collection">SCROLL TO EXPLORE <ArrowDown size={16}/></a></div>
        <svg className="ny-hero-curve" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 53 C180 65 287 55 430 45 C620 24 723 43 860 48 C1080 55 1220 18 1440 33 L1440 80 L0 80 Z" /></svg>
      </section>
      <section className="ny-catalog" id="collection" aria-labelledby="ny-catalog-heading"><div className="ny-catalog-head"><div><p className="ny-kicker">THE COLLECTION</p><h2 id="ny-catalog-heading">YOUR DAILY RITUAL.</h2></div><span>20 ESSENTIALS / NYVA SKIN</span></div><p className="ny-catalog-note">Find your place in the ritual. Secure checkout by Stripe.</p><div className="ny-filters" aria-label="Filter products by category">{categories.map(c => <button key={c} aria-pressed={category===c} className={category===c ? 'active' : ''} onClick={() => {setCategory(c); setQuery('');}}>{c}</button>)}<select aria-label="More product categories" value={moreCategories.includes(category) ? category : ''} onChange={e => {setCategory(e.target.value);setQuery('');}}><option value="" disabled>MORE</option>{moreCategories.map(c=><option key={c} value={c}>{c.toUpperCase()}</option>)}</select></div><div className="ny-products" aria-live="polite">{visible.map((p) => {const i=products.indexOf(p); return <article className="ny-product" key={p.id}><button className="ny-product-visual" onClick={() => setSelected(p)} aria-label={`View ${p.name}`}><span className="ny-product-index">{String(i+1).padStart(2,'0')}</span><span className="ny-product-packshot" role="img" aria-label={`NYVA SKIN packaging for ${p.name}`} style={visualStyle(i)}/><span className="ny-product-view">VIEW PRODUCT <ArrowRight size={16}/></span></button><p className="ny-product-category">{p.category}</p><h3>{p.name}</h3><p className="ny-price">{formatPrice(p.price)}</p><button className="ny-add" onClick={() => add(p)}>Add to bag <Plus size={16}/></button></article>;})}</div>{visible.length===0 && <p className="ny-empty">No products found. Try another search.</p>}</section>
      <section className="ny-story" id="ritual" aria-labelledby="ny-story-heading"><div className="ny-story-image"><img src="/images/nyva-ritual-portrait.webp" alt="Editorial portrait celebrating a personal skincare ritual" loading="lazy"/></div><div className="ny-story-copy" id="about"><p className="ny-kicker">THE NYVA PHILOSOPHY</p><h2 id="ny-story-heading">A RITUAL<br/>THAT FEELS<br/>LIKE <em>YOURS.</em></h2><p>A little time for your skin.<br/>A moment to make your own.</p><a className="ny-primary" href="#collection">Discover Your Ritual <ArrowRight size={18}/></a></div></section>
    </main>
    <footer className="ny-footer"><div className="ny-footer-main"><div className="ny-footer-brand"><a href="#top" className="ny-logo ny-footer-logo" aria-label="NYVA SKIN home"><span className="ny-footer-logo-frame"><img src="/images/nyva-floral-logo.png" alt=""/></span></a><p>YOUR SKIN. YOUR RITUAL.</p></div><div className="ny-footer-col"><h2>EXPLORE</h2><a href="#collection">Shop</a><a href="#ritual">Ritual</a><a href="#about">About</a></div><div className="ny-footer-col"><h2>HELP</h2>{['Contact','Shipping','Returns','Privacy','Terms'].map(x=><button onClick={()=>setInfo(x)} key={x}>{x}</button>)}</div><div className="ny-footer-col"><h2>FOLLOW</h2>{['Instagram','Pinterest','TikTok'].map(x=><button onClick={()=>setInfo(x)} key={x}>{x}</button>)}</div></div><div className="ny-footer-bottom"><span>© {new Date().getFullYear()} NYVA SKIN. All rights reserved.</span><a href="#top">BACK TO TOP ↑</a></div></footer>
    {menuOpen && <div className="ny-modal-backdrop" onClick={()=>setMenuOpen(false)}><div className="ny-mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" onClick={e=>e.stopPropagation()}><button className="ny-close" aria-label="Close menu" onClick={()=>setMenuOpen(false)}><X/></button><div className="ny-menu-brand"><img src="/images/nyva-floral-logo.png" alt="NYVA floral logo"/></div><nav><a onClick={()=>setMenuOpen(false)} href="#collection">Shop</a><a onClick={()=>setMenuOpen(false)} href="#ritual">Ritual</a><a onClick={()=>setMenuOpen(false)} href="#about">About</a></nav><button onClick={()=>{setMenuOpen(false);setSearchOpen(true);}}>Search collection <Search size={18}/></button><button onClick={()=>{setMenuOpen(false);setBagOpen(true);}}>Your bag ({bagCount}) <ShoppingBag size={18}/></button></div></div>}
    {searchOpen && <div className="ny-modal-backdrop" onClick={()=>setSearchOpen(false)}><div className="ny-panel" role="dialog" aria-modal="true" aria-label="Search the collection" onClick={e=>e.stopPropagation()}><button className="ny-close" aria-label="Close search" onClick={()=>setSearchOpen(false)}><X/></button><p className="ny-kicker">THE COLLECTION</p><h2>Find your ritual.</h2><input autoFocus aria-label="Search products" placeholder="Search products…" value={query} onChange={e=>setQuery(e.target.value)}/><div className="ny-search-list">{products.filter(p=>p.name.toLowerCase().includes(query.toLowerCase())).slice(0,8).map(p=><button key={p.id} onClick={()=>{setSearchOpen(false);setSelected(p);}}>{p.name}<ArrowRight size={16}/></button>)}</div></div></div>}
    {bagOpen && <div className="ny-modal-backdrop" onClick={()=>setBagOpen(false)}><div className="ny-panel ny-bag-panel" role="dialog" aria-modal="true" aria-label="Shopping bag" onClick={e=>e.stopPropagation()}><button className="ny-close" aria-label="Close bag" onClick={()=>setBagOpen(false)}><X/></button><p className="ny-kicker">NYVA SKIN</p><h2>Your ritual bag.</h2>{bagLines.length ? <>{bagLines.map(({product: p, quantity})=><div className="ny-bag-row" key={p.id}><span className="ny-bag-name">{p.name}<small>{formatPrice(p.price * quantity)}</small></span><span className="ny-qty"><button aria-label={`Decrease ${p.name}`} onClick={()=>setQty(p.id, quantity-1)}><Minus size={15}/></button><span aria-live="polite">{quantity}</span><button aria-label={`Increase ${p.name}`} disabled={quantity>=MAX_QUANTITY} onClick={()=>setQty(p.id, quantity+1)}><Plus size={15}/></button><button aria-label={`Remove ${p.name}`} onClick={()=>setQty(p.id, 0)}><X size={17}/></button></span></div>)}<div className="ny-bag-total"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div><p className="ny-bag-note">Shipping is calculated at checkout. Payments are processed securely by Stripe.</p>{payError && <p className="ny-bag-error" role="alert">{payError}</p>}<button className="ny-primary" onClick={checkout} disabled={!API_URL || paying}>{paying ? 'Redirecting to Stripe\u2026' : <>Checkout <ArrowRight size={17}/></>}</button></> : <><p>Your bag is waiting for your essentials.</p><button className="ny-primary" onClick={()=>{setBagOpen(false);document.getElementById('collection')?.scrollIntoView({behavior:'smooth'});}}>Explore Collection <ArrowRight size={17}/></button></>}</div></div>}
    {selected && <div className="ny-modal-backdrop" onClick={()=>setSelected(null)}><div className="ny-panel ny-detail-panel" role="dialog" aria-modal="true" aria-label={selected.name} onClick={e=>e.stopPropagation()}><button className="ny-close" aria-label="Close product" onClick={()=>setSelected(null)}><X/></button><div className="ny-detail-packshot" role="img" aria-label={`NYVA SKIN packaging for ${selected.name}`} style={visualStyle(products.indexOf(selected))}/><div><p className="ny-kicker">{selected.category}</p><h2>{selected.name}</h2><p className="ny-price">{formatPrice(selected.price)}</p><p>{describe(selected)}</p><button className="ny-primary" onClick={()=>add(selected)}>Add to bag <Plus size={18}/></button></div></div></div>}
    {info && <div className="ny-modal-backdrop" onClick={()=>setInfo(null)}><div className="ny-panel" role="dialog" aria-modal="true" aria-label={info} onClick={e=>e.stopPropagation()}><button className="ny-close" aria-label="Close information" onClick={()=>setInfo(null)}><X/></button><p className="ny-kicker">NYVA SKIN</p><h2>{info}</h2><p>{info==='Privacy' ? 'This site stores your theme preference and bag on your device. Payments are processed securely by Stripe; NYVA SKIN never sees your card details.' : 'Official details will be added here when available.'}</p></div></div>}
    {order && <div className="ny-modal-backdrop" onClick={()=>setOrder(null)}><div className="ny-panel" role="dialog" aria-modal="true" aria-label="Order confirmation" onClick={e=>e.stopPropagation()}><button className="ny-close" aria-label="Close" onClick={()=>setOrder(null)}><X/></button><p className="ny-kicker">NYVA SKIN</p><h2>{order==='paid' ? 'Thank you.' : order==='checking' ? 'One moment…' : 'Order received.'}</h2><p>{order==='paid' ? 'Your payment was successful. A receipt is on its way to your email, and we\u2019ll let you know when your order ships.' : order==='checking' ? 'Confirming your payment.' : 'We\u2019re confirming your payment. You\u2019ll receive an email from Stripe once it completes.'}</p><button className="ny-primary" onClick={()=>setOrder(null)}>Continue shopping <ArrowRight size={17}/></button></div></div>}
  </>;
}
