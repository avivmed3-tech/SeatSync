1: 
2:     const { useState, useEffect, useCallback, useRef, createContext, useContext, useMemo } = React;
3: 
4:     // ============================================
5:     // Responsive Hook
6:     // ============================================
7:     function useIsMobile(breakpoint = 640) {
8:       const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);
9:       useEffect(() => {
10:         const handler = () => setIsMobile(window.innerWidth < breakpoint);
11:         window.addEventListener('resize', handler);
12:         return () => window.removeEventListener('resize', handler);
13:       }, [breakpoint]);
14:       return isMobile;
15:     }
16: 
17:     function useIsLandscape() {
18:       const [isLandscape, setIsLandscape] = useState(
19:         window.innerWidth > window.innerHeight && window.innerHeight <= 500
20:       );
21:       useEffect(() => {
22:         const handler = () => setIsLandscape(window.innerWidth > window.innerHeight && window.innerHeight <= 500);
23:         window.addEventListener('resize', handler);
24:         return () => window.removeEventListener('resize', handler);
25:       }, []);
26:       return isLandscape;
27:     }
28: 
29:     // ============================================
30:     // Icons Helper
31:     // ============================================
32:     function Icon({ name, size = 20, strokeWidth = 1.8, className = '', ...props }) {
33:       const ref = useRef(null);
34:       useEffect(() => {
35:         if (ref.current && lucide[name]) {
36:           ref.current.innerHTML = '';
37:           const svg = lucide.createElement(lucide[name]);
38:           svg.setAttribute('width', size);
39:           svg.setAttribute('height', size);
40:           svg.setAttribute('stroke-width', strokeWidth);
41:           if (className) svg.setAttribute('class', className);
42:           ref.current.appendChild(svg);
43:         }
44:       }, [name, size, strokeWidth, className]);
45:       return <span ref={ref} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} {...props} />;
46:     }
47: 
48:     // ============================================
49:     // Theme Context
50:     // ============================================
51:     const ThemeContext = createContext();
52: 
53:     function ThemeProvider({ children }) {
54:       const [theme, setTheme] = useState(() => {
55:         const saved = localStorage.getItem('seatsync-theme');
56:         if (saved) return saved;
57:         return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
58:       });
59: 
60:       useEffect(() => {
61:         document.documentElement.setAttribute('data-theme', theme);
62:         localStorage.setItem('seatsync-theme', theme);
63:         document.querySelector('meta[name="theme-color"]').setAttribute(
64:           'content', theme === 'dark' ? '#0A0E1A' : '#FAFAF8'
65:         );
66:       }, [theme]);
67: 
68:       const toggleTheme = useCallback(() => {
69:         setTheme(prev => prev === 'light' ? 'dark' : 'light');
70:       }, []);
71: 
72:       return (
73:         <ThemeContext.Provider value={{ theme, toggleTheme }}>
74:           {children}
75:         </ThemeContext.Provider>
76:       );
77:     }
78: 
79:     // ============================================
80:     // Supabase Context
81:     // ============================================
82:     const SupabaseContext = createContext();
83: 
84:     // ── Default Supabase config ──
85:     const DEFAULT_SUPABASE_URL = 'https://xryfxjtvqdeijijgiwmb.supabase.co';
86:     const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyeWZ4anR2cWRlaWppamdpd21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MTEzOTQsImV4cCI6MjA5MTA4NzM5NH0.iE1kabdHvYR3wi5GMMXqhkYx6iphU5MbBHKdFXxGN1E';
87: 
88:     function SupabaseProvider({ children }) {
89:       const [config, setConfig] = useState(() => {
90:         const saved = localStorage.getItem('seatsync-supabase');
91:         if (saved) {
92:           try {
93:             const parsed = JSON.parse(saved);
94:             // Fix old incorrect URL if stored
95:             if (parsed.url && !parsed.url.includes('xryfxjtvqdeijijgiwmb')) {
96:               const fixed = { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY };
97:               localStorage.setItem('seatsync-supabase', JSON.stringify(fixed));
98:               return fixed;
99:             }
100:             return parsed;
101:           } catch (e) { /* fall through */ }
102:         }
103:         // Auto-configure with default credentials
104:         const defaultConfig = { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY };
105:         localStorage.setItem('seatsync-supabase', JSON.stringify(defaultConfig));
106:         return defaultConfig;
107:       });
108:       const [client, setClient] = useState(null);
109:       const [user, setUser] = useState(null);
110:       const [loading, setLoading] = useState(true);
111: 
112:       useEffect(() => {
113:         if (config?.url && config?.anonKey) {
114:           const sb = supabase.createClient(config.url, config.anonKey);
115:           setClient(sb);
116: 
117:           // Timeout — if no response in 8s, stop loading and show error
118:           const timeout = setTimeout(() => {
119:             setLoading(false);
120:           }, 8000);
121: 
122:           // Handle magic link / password reset tokens in the URL.
123:           // Supabase v2 puts tokens in the URL hash (#access_token=...) or
124:           // as query params (?token_hash=...&type=...). getSession() picks
125:           // these up automatically when the client is created, so just call it.
126:           sb.auth.getSession().then(({ data: { session } }) => {
127:             clearTimeout(timeout);
128:             setUser(session?.user ?? null);
129:             setLoading(false);
130: 
131:             // Clean the token from the URL so it isn't bookmarked / shared
132:             if (window.location.hash.includes('access_token') ||
133:                 window.location.search.includes('token_hash')) {
134:               window.history.replaceState(
135:                 null, '', window.location.pathname
136:               );
137:             }
138:           }).catch(() => {
139:             clearTimeout(timeout);
140:             setLoading(false);
141:           });
142: 
143:           const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
144:             setUser(session?.user ?? null);
145:             // After password recovery link is clicked, redirect to settings
146:             if (event === 'PASSWORD_RECOVERY') {
147:               setUser(session?.user ?? null);
148:             }
149:           });
150: 
151:           return () => { subscription.unsubscribe(); clearTimeout(timeout); };
152:         } else {
153:           setLoading(false);
154:         }
155:       }, [config]);
156: 
157:       const saveConfig = useCallback((url, anonKey) => {
158:         const cfg = { url, anonKey };
159:         localStorage.setItem('seatsync-supabase', JSON.stringify(cfg));
160:         setConfig(cfg);
161:       }, []);
162: 
163:       const signIn = useCallback(async (email, password) => {
164:         if (!client) throw new Error('Supabase not configured');
165:         const { data, error } = await client.auth.signInWithPassword({ email, password });
166:         if (error) throw error;
167:         return data;
168:       }, [client]);
169: 
170:       const signUp = useCallback(async (email, password, fullName) => {
171:         if (!client) throw new Error('Supabase not configured');
172:         const { data, error } = await client.auth.signUp({
173:           email,
174:           password,
175:           options: { data: { full_name: fullName } }
176:         });
177:         if (error) throw error;
178:         return data;
179:       }, [client]);
180: 
181:       const signOut = useCallback(async () => {
182:         if (!client) return;
183:         await client.auth.signOut();
184:         localStorage.removeItem('seatsync-selected-event');
185:         setUser(null);
186:       }, [client]);
187: 
188:       return (
189:         <SupabaseContext.Provider value={{
190:           client, user, loading, config,
191:           saveConfig, signIn, signUp, signOut,
192:           isConfigured: !!config
193:         }}>
194:           {children}
195:         </SupabaseContext.Provider>
196:       );
197:     }
198: 
199:     // ============================================
200:     // Toast System
201:     // ============================================
202:     const ToastContext = createContext();
203: 
204:     function ToastProvider({ children }) {
205:       const [toasts, setToasts] = useState([]);
206: 
207:       const addToast = useCallback((message, type = 'info') => {
208:         const id = Date.now();
209:         setToasts(prev => [...prev, { id, message, type }]);
210:         setTimeout(() => {
211:           setToasts(prev => prev.filter(t => t.id !== id));
212:         }, 3500);
213:       }, []);
214: 
215:       return (
216:         <ToastContext.Provider value={{ addToast }}>
217:           {children}
218:           <div className="toast-container">
219:             {toasts.map(t => (
220:               <div key={t.id} className="toast">
221:                 <Icon name={t.type === 'success' ? 'Check' : t.type === 'error' ? 'AlertCircle' : 'Info'} size={18} />
222:                 {t.message}
223:               </div>
224:             ))}
225:           </div>
226:         </ToastContext.Provider>
227:       );
228:     }
229: 
230:     // ============================================
231:     // Router
232:     // ============================================
233:     const ROUTES = {
234:       DASHBOARD: 'dashboard',
235:       GUESTS: 'guests',
236:       MESSAGES: 'messages',
237:       SEATING: 'seating',
238:       EXPENSES: 'expenses',
239:       GIFTS: 'gifts',
240:       SETTINGS: 'settings',
241:       EVENTS: 'events',
242:     };
243: 
244:     // ============================================
245:     // Plan System
246:     // ============================================
247:     const PLAN_LIMITS = {
248:       free:       { guests: 50,  tables: 5,  messageRounds: 1,  rsvpLink: false, events: 1,  label: 'Free' },
249:       pro:        { guests: 200, tables: 25, messageRounds: 999, rsvpLink: true,  events: 1,  label: 'Pro' },
250:       enterprise: { guests: 600, tables: 60, messageRounds: 999, rsvpLink: true,  events: 5,  label: 'Enterprise' },
251:     };
252: 
253:     const PlanContext = createContext();
254: 
255:     // ── Lemon Squeezy Checkout URLs ──
256:     // Replace these with your actual Lemon Squeezy checkout links after creating products.
257:     // Create products at https://app.lemonsqueezy.com → Store → Products
258:     // Each product should be a one-time payment (not subscription).
259:     // After creating, copy the checkout URL and paste here.
260:     const CHECKOUT_URLS = {
261:       pro:        'https://seatsync.lemonsqueezy.com/checkout/buy/a438564e-0ee4-40c7-a31e-cc87af63879a',
262:       enterprise: 'https://seatsync.lemonsqueezy.com/checkout/buy/aa7bd029-6fb7-4fde-a1d9-696254d28aef',
263:     };
264: 
265:     function PlanProvider({ children }) {
266:       const { client, user } = useContext(SupabaseContext);
267:       const [plan, setPlan] = useState('free');
268:       const [loadingPlan, setLoadingPlan] = useState(true);
269:       const [showUpgradeModal, setShowUpgradeModal] = useState(false);
270: 
271:       // Fetch plan from DB
272:       const refreshPlan = useCallback(async () => {
273:         if (!client || !user) return;
274:         try {
275:           const { data } = await client.from('profiles').select('plan, plan_expires_at').eq('id', user.id).single();
276:           setPlan(data?.plan || 'free');
277:         } catch {}
278:       }, [client, user]);
279: 
280:       useEffect(() => {
281:         if (!client || !user) { setLoadingPlan(false); return; }
282:         client.from('profiles').select('plan, plan_expires_at').eq('id', user.id).single()
283:           .then(({ data }) => {
284:             setPlan(data?.plan || 'free');
285:             setLoadingPlan(false);
286:           })
287:           .catch(() => setLoadingPlan(false));
288:       }, [client, user]);
289: 
290:       // Listen for plan changes via URL callback (after Lemon Squeezy checkout)
291:       useEffect(() => {
292:         const params = new URLSearchParams(window.location.search);
293:         if (params.get('payment') === 'success') {
294:           // Remove query param
295:           window.history.replaceState({}, '', window.location.pathname);
296:           // Poll for plan update (webhook may take a few seconds)
297:           let attempts = 0;
298:           const poll = setInterval(async () => {
299:             attempts++;
300:             await refreshPlan();
301:             if (attempts >= 10) clearInterval(poll);
302:           }, 2000);
303:           return () => clearInterval(poll);
304:         }
305:       }, [refreshPlan]);
306: 
307:       // Listen for real-time plan changes
308:       useEffect(() => {
309:         if (!client || !user) return;
310:         const channel = client.channel('plan-changes')
311:           .on('postgres_changes', {
312:             event: 'UPDATE', schema: 'public', table: 'profiles',
313:             filter: `id=eq.${user.id}`
314:           }, (payload) => {
315:             if (payload.new?.plan) setPlan(payload.new.plan);
316:           })
317:           .subscribe();
318:         return () => { client.removeChannel(channel); };
319:       }, [client, user]);
320: 
321:       const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
322:       const isPro = plan === 'pro' || plan === 'enterprise';
323: 
324:       const canAdd = useCallback((resource, currentCount) => {
325:         return currentCount < limits[resource];
326:       }, [limits]);
327: 
328:       // Open Lemon Squeezy checkout with user info pre-filled
329:       const openCheckout = useCallback((targetPlan = 'pro') => {
330:         const baseUrl = CHECKOUT_URLS[targetPlan];
331:         if (!baseUrl || baseUrl.includes('YOUR_')) {
332:           // Fallback: show instructions if checkout URLs not configured yet
333:           setShowUpgradeModal(true);
334:           return;
335:         }
336:         const params = new URLSearchParams();
337:         if (user?.email) params.set('checkout[email]', user.email);
338:         if (user?.id) params.set('checkout[custom][user_id]', user.id);
339:         // Redirect back after payment
340:         params.set('checkout[custom][redirect_url]', window.location.origin + window.location.pathname + '?payment=success');
341:         window.open(`${baseUrl}?${params.toString()}`, '_blank');
342:       }, [user]);
343: 
344:       return (
345:         <PlanContext.Provider value={{ plan, limits, isPro, canAdd, loadingPlan, openCheckout, showUpgradeModal, setShowUpgradeModal, refreshPlan }}>
346:           {children}
347:         </PlanContext.Provider>
348:       );
349:     }
350: 
351:     // ============================================
352:     // PWA Install Context — shared between banner + settings
353:     // ============================================
354:     const PWAInstallContext = createContext();
355: 
356:     function PWAInstallProvider({ children }) {
357:       const [deferredPrompt, setDeferredPrompt] = useState(null);
358:       const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
359:       const [isStandalone, setIsStandalone] = useState(
360:         window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
361:       );
362: 
363:       useEffect(() => {
364:         if (isStandalone) return;
365:         const handler = (e) => {
366:           e.preventDefault();
367:           setDeferredPrompt(e);
368:         };
369:         window.addEventListener('beforeinstallprompt', handler);
370:         // Listen for successful install
371:         window.addEventListener('appinstalled', () => {
372:           setIsStandalone(true);
373:           setDeferredPrompt(null);
374:         });
375:         return () => window.removeEventListener('beforeinstallprompt', handler);
376:       }, []);
377: 
378:       const triggerInstall = useCallback(async () => {
379:         if (deferredPrompt) {
380:           deferredPrompt.prompt();
381:           const { outcome } = await deferredPrompt.userChoice;
382:           if (outcome === 'accepted') {
383:             setDeferredPrompt(null);
384:             setIsStandalone(true);
385:           }
386:           return outcome;
387:         }
388:         return null;
389:       }, [deferredPrompt]);
390: 
391:       return (
392:         <PWAInstallContext.Provider value={{ deferredPrompt, triggerInstall, isIOS, isStandalone }}>
393:           {children}
394:         </PWAInstallContext.Provider>
395:       );
396:     }
397: 
398:     // Pro Badge inline component
399:     function ProBadge({ style = {} }) {
400:       return (
401:         <span style={{
402:           display: 'inline-flex', alignItems: 'center', gap: 3,
403:           background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))',
404:           color: '#1A1A1A', fontSize: 10, fontWeight: 800,
405:           padding: '2px 7px', borderRadius: 20, letterSpacing: 0.3,
406:           textTransform: 'uppercase', lineHeight: 1.4, flexShrink: 0,
407:           ...style
408:         }}>
409:           ✦ Pro
410:         </span>
411:       );
412:     }
413: 
414:     // Upsell Modal — shown when hitting a limit
415:     function UpsellModal({ feature, onClose }) {
416:       const { openCheckout } = useContext(PlanContext);
417:       const featureText = {
418:         guests:       { title: 'הגעתם ל-50 מוזמנים', sub: 'תוכנית Free מוגבלת ל-50 מוזמנים', detail: 'שדרגו ל-Pro ל-200 מוזמנים ויכולות מלאות', icon: '👥' },
419:         tables:       { title: 'הגעתם ל-5 שולחנות',  sub: 'תוכנית Free מוגבלת ל-5 שולחנות',  detail: 'שדרגו ל-Pro ל-25 שולחנות ומפת הושבה מלאה', icon: '🪑' },
420:         messageRounds:{ title: 'סבב הודעות נוסף',    sub: 'תוכנית Free מאפשרת סבב אחד בלבד', detail: 'שדרגו ל-Pro לסבבי הודעות בלתי מוגבלים', icon: '💬' },
421:         rsvpLink:     { title: 'קישור RSVP אישי',    sub: 'פיצ\'ר Pro בלבד',                 detail: 'שדרגו ל-Pro לשליחת קישורי RSVP אישיים לכל אורח', icon: '🔗' },
422:       }[feature] || { title: 'פיצ\'ר Pro', sub: 'זמין בתוכנית Pro', detail: 'שדרגו לגישה מלאה', icon: '🚀' };
423: 
424:       return (
425:         <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
426:           <div className="modal-content animate-scale-in" style={{ maxWidth: 400, textAlign: 'center', padding: 0, overflow: 'hidden' }}>
427:             {/* Hero gradient header */}
428:             <div style={{
429:               background: 'linear-gradient(135deg, #D4A808 0%, #8A6D05 100%)',
430:               padding: '32px 24px 24px', color: 'white'
431:             }}>
432:               <div style={{ fontSize: 48, marginBottom: 8 }}>{featureText.icon}</div>
433:               <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{featureText.title}</div>
434:               <div style={{ fontSize: 14, opacity: 0.9 }}>{featureText.sub}</div>
435:             </div>
436: 
437:             <div style={{ padding: '20px 24px 24px' }}>
438:               <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.7 }}>{featureText.detail}</div>
439: 
440:               {/* What you get */}
441:               <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20, textAlign: 'right' }}>
442:                 <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>מה כלול ב-Pro</div>
443:                 {[
444:                   { icon: '✅', text: 'עד 200 מוזמנים' },
445:                   { icon: '✅', text: 'עד 25 שולחנות' },
446:                   { icon: '✅', text: 'סבבי הודעות ללא הגבלה' },
447:                   { icon: '✅', text: 'קישורי RSVP אישיים' },
448:                   { icon: '✅', text: 'הודעות אוטומטיות' },
449:                   { icon: '✅', text: 'ייצוא PDF + אקסל' },
450:                 ].map((item, i) => (
451:                   <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13 }}>
452:                     <span>{item.icon}</span>
453:                     <span>{item.text}</span>
454:                   </div>
455:                 ))}
456:               </div>
457: 
458:               {/* Price options */}
459:               <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
460:                 <div style={{ flex: 1, border: '2px solid var(--gold-400)', borderRadius: 'var(--radius-md)', padding: '12px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-secondary)' }}
461:                   onClick={() => { openCheckout('pro'); onClose(); }}>
462:                   <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold-600)', marginBottom: 4 }}>PRO</div>
463:                   <div style={{ fontSize: 24, fontWeight: 900 }}>99₪</div>
464:                   <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>אירוע 1 · 200 מוזמנים</div>
465:                 </div>
466:                 <div style={{ flex: 1, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '12px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-secondary)' }}
467:                   onClick={() => { openCheckout('enterprise'); onClose(); }}>
468:                   <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 4 }}>ENTERPRISE</div>
469:                   <div style={{ fontSize: 24, fontWeight: 900 }}>249₪</div>
470:                   <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>5 אירועים · 600 מוזמנים</div>
471:                 </div>
472:               </div>
473: 
474:               <div style={{ display: 'flex', gap: 10 }}>
475:                 <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>אחר כך</button>
476:                 <button className="btn btn-primary" style={{ flex: 2, fontSize: 15, padding: '12px 20px' }}
477:                   onClick={() => { openCheckout('pro'); onClose(); }}>
478:                   <Icon name="Zap" size={16} />שדרגו עכשיו
479:                 </button>
480:               </div>
481: 
482:               <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-tertiary)' }}>
483:                 💳 תשלום מאובטח · ללא מנוי · ללא חיוב חוזר
484:               </div>
485:             </div>
486:           </div>
487:         </div>
488:       );
489:     }
490: 
491:     // ============================================
492:     // Supabase Config Modal
493:     // ============================================
494:     function ConfigModal({ onSave }) {
495:       const [url, setUrl] = useState('');
496:       const [key, setKey] = useState('');
497:       const [testing, setTesting] = useState(false);
498:       const [error, setError] = useState('');
499:       const [showKey, setShowKey] = useState(false);
500: 
501:       const validate = () => {
502:         const cleanUrl = url.trim().replace(/\/$/, '');
503:         const cleanKey = key.trim();
504: 
505:         if (!cleanUrl) return 'נא להזין Project URL';
506:         if (!cleanUrl.startsWith('https://')) return 'ה-URL חייב להתחיל ב-https://';
507:         if (!cleanUrl.includes('.supabase.co')) return 'ה-URL נראה שגוי — צריך להיות https://xxxxx.supabase.co';
508:         if (cleanUrl.includes('/rest/') || cleanUrl.includes('/auth/') || cleanUrl.includes('/realtime/'))
509:           return 'הזן רק את כתובת הבסיס: https://xxxxx.supabase.co (בלי /rest/v1 וכו\')';
510:         if (!cleanKey) return 'נא להזין את ה-Anon Key';
511:         if (!cleanKey.startsWith('eyJ')) return 'ה-Anon Key חייב להתחיל ב-eyJ';
512:         if (cleanKey.length < 100) return 'ה-Anon Key נראה קצר מדי — ודא שהעתקת את המפתח המלא';
513:         return null;
514:       };
515: 
516:       const handleSave = async () => {
517:         setError('');
518:         const validationError = validate();
519:         if (validationError) { setError(validationError); return; }
520: 
521:         const cleanUrl = url.trim().replace(/\/$/, '');
522:         const cleanKey = key.trim();
523: 
524:         setTesting(true);
525:         try {
526:           // Test the connection with a real request
527:           const testClient = supabase.createClient(cleanUrl, cleanKey);
528:           const result = await Promise.race([
529:             testClient.auth.getSession(),
530:             new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 7000))
531:           ]);
532: 
533:           if (result && result.error && result.error.message !== 'Auth session missing!') {
534:             setError('שגיאת חיבור: ' + result.error.message);
535:             setTesting(false);
536:             return;
537:           }
538: 
539:           // Success
540:           onSave(cleanUrl, cleanKey);
541:         } catch (e) {
542:           if (e.message === 'timeout') {
543:             setError('תם הזמן — לא ניתן להתחבר לשרת. ודא שה-URL נכון ושה-Data API פעיל ב-Supabase.');
544:           } else {
545:             setError('שגיאה: ' + (e.message || 'בדוק את הפרטים ונסה שוב'));
546:           }
547:           setTesting(false);
548:         }
549:       };
550: 
551:       return (
552:         <div className="modal-overlay">
553:           <div className="modal-content animate-scale-in">
554:             <div style={{ textAlign: 'center', marginBottom: 20 }}>
555:               <div className="hero-logo" style={{ width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px' }}>
556:                 <Icon name="Database" size={28} />
557:               </div>
558:               <div className="modal-title">חיבור ל-Supabase</div>
559:               <div className="modal-subtitle">הזינו את פרטי הפרויקט שלכם כדי להתחיל</div>
560:             </div>
561: 
562:             {/* URL field */}
563:             <div className="input-group">
564:               <label className="input-label">Project URL</label>
565:               <input
566:                 className="input-field"
567:                 type="url"
568:                 placeholder="https://xxxxx.supabase.co"
569:                 value={url}
570:                 onChange={e => { setUrl(e.target.value); setError(''); }}
571:                 dir="ltr"
572:                 style={{ textAlign: 'left' }}
573:                 disabled={testing}
574:               />
575:               <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
576:                 מ-Supabase → Settings → API → Project URL (רק עד .supabase.co)
577:               </div>
578:             </div>
579: 
580:             {/* Anon Key field */}
581:             <div className="input-group">
582:               <label className="input-label">Anon Key (public)</label>
583:               <div style={{ position: 'relative' }}>
584:                 <input
585:                   className="input-field"
586:                   type={showKey ? 'text' : 'password'}
587:                   placeholder="eyJ..."
588:                   value={key}
589:                   onChange={e => { setKey(e.target.value); setError(''); }}
590:                   dir="ltr"
591:                   style={{ textAlign: 'left', paddingLeft: 44 }}
592:                   disabled={testing}
593:                 />
594:                 <button
595:                   onClick={() => setShowKey(s => !s)}
596:                   style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0 }}
597:                   type="button"
598:                 >
599:                   <Icon name={showKey ? 'EyeOff' : 'Eye'} size={16} />
600:                 </button>
601:               </div>
602:               <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
603:                 מ-Supabase → Settings → API → anon public (המפתח הארוך שמתחיל ב-eyJ)
604:               </div>
605:             </div>
606: 
607:             {/* Error message */}
608:             {error && (
609:               <div style={{
610:                 background: 'rgba(239,68,68,0.08)',
611:                 border: '1px solid rgba(239,68,68,0.25)',
612:                 borderRadius: 10,
613:                 padding: '12px 14px',
614:                 marginBottom: 16,
615:                 fontSize: 13,
616:                 color: 'var(--red-500)',
617:                 display: 'flex',
618:                 gap: 8,
619:                 alignItems: 'flex-start',
620:               }}>
621:                 <Icon name="AlertCircle" size={16} style={{ flexShrink: 0, marginTop: 1 }} />
622:                 <span>{error}</span>
623:               </div>
624:             )}
625: 
626:             {/* Info */}
627:             <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
628:               <Icon name="Shield" size={14} />
629:               <span>המפתח נשמר רק בדפדפן שלך (localStorage). אנו משתמשים ב-anon key בלבד.</span>
630:             </div>
631: 
632:             <button
633:               className="btn btn-primary"
634:               style={{ width: '100%' }}
635:               onClick={handleSave}
636:               disabled={testing}
637:             >
638:               {testing ? (
639:                 <><Icon name="Loader" size={18} style={{ animation: 'spin 1s linear infinite' }} />בודק חיבור...</>
640:               ) : (
641:                 <><Icon name="Link" size={18} />התחבר</>
642:               )}
643:             </button>
644:           </div>
645:         </div>
646:       );
647:     }
648: 
649:     // ============================================
650:     // Auth Page
651:     // ============================================
652:     function AuthPage() {
653:       const { signIn, signUp, client } = useContext(SupabaseContext);
654:       const { addToast } = useContext(ToastContext);
655:       const [mode, setMode] = useState('login'); // login | register | forgot | magic
656:       const [email, setEmail] = useState('');
657:       const [password, setPassword] = useState('');
658:       const [fullName, setFullName] = useState('');
659:       const [loading, setLoading] = useState(false);
660:       const [showPassword, setShowPassword] = useState(false);
661:       const [sentReset, setSentReset] = useState(false);
662:       const [sentMagic, setSentMagic] = useState(false);
663: 
664:       const handleSubmit = async () => {
665:         if (!email) { addToast('נא להזין אימייל', 'error'); return; }
666:         setLoading(true);
667:         try {
668:           if (mode === 'login') {
669:             if (!password) { addToast('נא להזין סיסמה', 'error'); setLoading(false); return; }
670:             await signIn(email, password);
671:             addToast('ברוכים הבאים! 🎉', 'success');
672:           } else if (mode === 'register') {
673:             if (!password) { addToast('נא להזין סיסמה', 'error'); setLoading(false); return; }
674:             if (password.length < 6) { addToast('סיסמה חייבת להכיל לפחות 6 תווים', 'error'); setLoading(false); return; }
675:             if (!fullName.trim()) { addToast('נא להזין שם מלא', 'error'); setLoading(false); return; }
676:             const { data } = await signUp(email, password, fullName);
677:             if (data?.user?.identities?.length === 0) {
678:               addToast('אימייל כבר רשום — נסו להתחבר', 'error');
679:             } else {
680:               addToast('נרשמת בהצלחה! 🎉 בדקו את המייל לאימות', 'success');
681:             }
682:           } else if (mode === 'forgot') {
683:             const { error } = await client.auth.resetPasswordForEmail(email, {
684:               redirectTo: window.location.href.split('?')[0].split('#')[0]
685:             });
686:             if (error) throw error;
687:             setSentReset(true);
688:             addToast('נשלח מייל לאיפוס סיסמה 📧', 'success');
689:           } else if (mode === 'magic') {
690:             const { error } = await client.auth.signInWithOtp({
691:               email,
692:               options: {
693:                 emailRedirectTo: window.location.href.split('?')[0].split('#')[0]
694:               }
695:             });
696:             if (error) throw error;
697:             setSentMagic(true);
698:             addToast('נשלח לינק התחברות למייל 📧', 'success');
699:           }
700:         } catch (err) {
701:           const msg = err.message || 'שגיאה';
702:           if (msg.includes('Invalid login')) addToast('אימייל או סיסמה שגויים', 'error');
703:           else if (msg.includes('Email not confirmed')) addToast('נא לאשר את המייל תחילה — בדקו את תיבת הדואר', 'error');
704:           else addToast(msg, 'error');
705:         }
706:         setLoading(false);
707:       };
708: 
709:       const handleKeyDown = (e) => {
710:         if (e.key === 'Enter') handleSubmit();
711:       };
712: 
713:       // Success screens
714:       if (sentReset) return (
715:         <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
716:           <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
717:             <div className="hero-logo" style={{ width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px' }}>
718:               <Icon name="Mail" size={36} />
719:             </div>
720:             <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>בדקו את המייל</div>
721:             <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
722:               שלחנו לינק לאיפוס סיסמה ל-<br/><strong style={{ direction: 'ltr', display: 'inline-block' }}>{email}</strong>
723:             </div>
724:             <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => { setSentReset(false); setMode('login'); }}>
725:               <Icon name="ArrowRight" size={18} />חזרה להתחברות
726:             </button>
727:           </div>
728:         </div>
729:       );
730: 
731:       if (sentMagic) return (
732:         <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
733:           <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
734:             <div className="hero-logo" style={{ width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px' }}>
735:               <Icon name="Sparkles" size={36} />
736:             </div>
737:             <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>לינק קסם נשלח!</div>
738:             <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
739:               שלחנו לינק התחברות ל-<br/><strong style={{ direction: 'ltr', display: 'inline-block' }}>{email}</strong>
740:               <br/>לחצו על הלינק כדי להיכנס — בלי סיסמה!
741:             </div>
742:             <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => { setSentMagic(false); setMode('login'); }}>
743:               <Icon name="ArrowRight" size={18} />חזרה להתחברות
744:             </button>
745:           </div>
746:         </div>
747:       );
748: 
749:       return (
750:         <div style={{
751:           minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
752:           background: 'linear-gradient(135deg, #131313 0%, #1c1b1b 40%, #2a2318 100%)',
753:           position: 'relative', overflow: 'hidden',
754:         }}>
755:           {/* Warm ambient glow */}
756:           <div style={{
757:             position: 'absolute', top: '-30%', right: '-20%', width: '60%', height: '60%',
758:             background: 'radial-gradient(ellipse, rgba(245,197,24,0.06) 0%, transparent 70%)',
759:             pointerEvents: 'none',
760:           }} />
761:           <div style={{
762:             position: 'absolute', bottom: '-20%', left: '-10%', width: '50%', height: '50%',
763:             background: 'radial-gradient(ellipse, rgba(212,168,8,0.04) 0%, transparent 70%)',
764:             pointerEvents: 'none',
765:           }} />
766:           <div style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>
767:             <div className="hero-section animate-slide-up" style={{ color: '#F0ECE3' }}>
768:               <div className="hero-logo">
769:                 <Icon name="Armchair" size={36} />
770:               </div>
771:               <div className="hero-title" style={{ color: '#F5C518' }}>SeatSync</div>
772:               <div className="hero-text" style={{ color: '#9C9689', letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: 11, fontWeight: 500 }}>Elevating Guest Experiences</div>
773:             </div>
774: 
775:             <div className="card animate-slide-up stagger-2" style={{ marginTop: 10, background: 'rgba(28,27,27,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)' }}>
776:               {(mode === 'login' || mode === 'register') && (
777:                 <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
778:                   <button
779:                     onClick={() => setMode('login')}
780:                     style={{
781:                       flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)',
782:                       fontSize: 14, fontWeight: 600,
783:                       background: mode === 'login' ? 'var(--bg-secondary)' : 'transparent',
784:                       color: mode === 'login' ? 'var(--text-primary)' : 'var(--text-tertiary)',
785:                       boxShadow: mode === 'login' ? 'var(--shadow-sm)' : 'none',
786:                       transition: 'all var(--duration-fast) var(--ease-out)'
787:                     }}
788:                   >
789:                     התחברות
790:                   </button>
791:                   <button
792:                     onClick={() => setMode('register')}
793:                     style={{
794:                       flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)',
795:                       fontSize: 14, fontWeight: 600,
796:                       background: mode === 'register' ? 'var(--bg-secondary)' : 'transparent',
797:                       color: mode === 'register' ? 'var(--text-primary)' : 'var(--text-tertiary)',
798:                       boxShadow: mode === 'register' ? 'var(--shadow-sm)' : 'none',
799:                       transition: 'all var(--duration-fast) var(--ease-out)'
800:                     }}
801:                   >
802:                     הרשמה
803:                   </button>
804:                 </div>
805:               )}
806: 
807:               {mode === 'forgot' && (
808:                 <div style={{ marginBottom: 20 }}>
809:                   <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 13, marginBottom: 8 }} onClick={() => setMode('login')}>
810:                     <Icon name="ArrowRight" size={16} />חזרה
811:                   </button>
812:                   <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>שכחתי סיסמה</div>
813:                   <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>נשלח לינק לאיפוס למייל שלכם</div>
814:                 </div>
815:               )}
816: 
817:               {mode === 'magic' && (
818:                 <div style={{ marginBottom: 20 }}>
819:                   <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 13, marginBottom: 8 }} onClick={() => setMode('login')}>
820:                     <Icon name="ArrowRight" size={16} />חזרה
821:                   </button>
822:                   <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>התחברות עם לינק</div>
823:                   <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>נשלח לינק התחברות למייל — בלי סיסמה</div>
824:                 </div>
825:               )}
826: 
827:               {mode === 'register' && (
828:                 <div className="input-group">
829:                   <label className="input-label">שם מלא</label>
830:                   <input className="input-field" placeholder="ישראל ישראלי" value={fullName} onChange={e => setFullName(e.target.value)} onKeyDown={handleKeyDown} />
831:                 </div>
832:               )}
833: 
834:               <div className="input-group">
835:                 <label className="input-label">אימייל</label>
836:                 <input className="input-field" type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" style={{ textAlign: 'left' }} onKeyDown={handleKeyDown} autoFocus />
837:               </div>
838: 
839:               {(mode === 'login' || mode === 'register') && (
840:                 <div className="input-group">
841:                   <label className="input-label">סיסמה</label>
842:                   <div style={{ position: 'relative' }}>
843:                     <input className="input-field" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} dir="ltr" style={{ textAlign: 'left', paddingLeft: 44 }} onKeyDown={handleKeyDown} />
844:                     <button
845:                       onClick={() => setShowPassword(s => !s)}
846:                       style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0 }}
847:                       type="button"
848:                     >
849:                       <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={16} />
850:                     </button>
851:                   </div>
852:                   {mode === 'register' && (
853:                     <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>לפחות 6 תווים</div>
854:                   )}
855:                 </div>
856:               )}
857: 
858:               <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={handleSubmit} disabled={loading}>
859:                 {loading ? (
860:                   <><Icon name="Loader" size={18} style={{ animation: 'spin 1s linear infinite' }} />{'רגע...'}</>
861:                 ) : mode === 'login' ? (
862:                   <><Icon name="LogIn" size={18} />{'התחברות'}</>
863:                 ) : mode === 'register' ? (
864:                   <><Icon name="UserPlus" size={18} />{'הרשמה'}</>
865:                 ) : mode === 'forgot' ? (
866:                   <><Icon name="Send" size={18} />{'שלח לינק איפוס'}</>
867:                 ) : (
868:                   <><Icon name="Sparkles" size={18} />{'שלח לינק התחברות'}</>
869:                 )}
870:               </button>
871: 
872:               {/* Google OAuth — available on both login and register */}
873:               {(mode === 'login' || mode === 'register') && (
874:                 <div style={{ marginTop: 12 }}>
875:                   <div style={{ position: 'relative', textAlign: 'center', margin: '4px 0 12px' }}>
876:                     <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'var(--border-default)' }} />
877:                     <span style={{ position: 'relative', background: 'var(--bg-secondary)', padding: '0 12px', fontSize: 12, color: 'var(--text-tertiary)' }}>או</span>
878:                   </div>
879:                   <button
880:                     className="btn btn-secondary"
881:                     style={{ width: '100%', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
882:                     onClick={async () => {
883:                       try {
884:                         setLoading(true);
885:                         const { error } = await client.auth.signInWithOAuth({
886:                           provider: 'google',
887:                           options: {
888:                             redirectTo: window.location.href.split('?')[0].split('#')[0]
889:                           }
890:                         });
891:                         if (error) throw error;
892:                       } catch (err) {
893:                         addToast(err.message || 'שגיאה בהתחברות עם Google', 'error');
894:                         setLoading(false);
895:                       }
896:                     }}
897:                   >
898:                     <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
899:                     {mode === 'register' ? 'הרשמה עם Google' : 'התחברות עם Google'}
900:                   </button>
901:                 </div>
902:               )}
903: 
904:               {/* Secondary actions — login only */}
905:               {mode === 'login' && (
906:                 <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
907:                   <button className="btn btn-ghost" style={{ width: '100%', fontSize: 13 }} onClick={() => setMode('forgot')}>
908:                     <Icon name="Key" size={15} />שכחתי סיסמה
909:                   </button>
910:                   <button className="btn btn-ghost" style={{ width: '100%', fontSize: 13 }} onClick={() => setMode('magic')}>
911:                     <Icon name="Sparkles" size={15} />התחברות עם לינק (בלי סיסמה)
912:                   </button>
913:                 </div>
914:               )}
915:             </div>
916:           </div>
917:         </div>
918:       );
919:     }
920: 
921:     // ============================================
922:     // Dashboard Page
923:     // ============================================
924:     // ============================================
925:     // Phase 3 — Dashboard: SVG Donut Chart
926:     // ============================================
927:     function DonutChart({ data, size = 120 }) {
928:       const total = data.reduce((s, d) => s + d.value, 0);
929:       if (total === 0) return (
930:         <svg width={size} height={size} viewBox="0 0 120 120">
931:           <circle cx="60" cy="60" r="48" fill="none" stroke="var(--bg-tertiary)" strokeWidth="18" />
932:           <text x="60" y="65" textAnchor="middle" fontSize="14" fill="var(--text-tertiary)" fontFamily="Heebo">0</text>
933:         </svg>
934:       );
935:       const r = 48; const cx = 60; const cy = 60;
936:       const circumference = 2 * Math.PI * r;
937:       let offset = 0;
938:       const slices = data.map(d => {
939:         const pct = d.value / total;
940:         const dash = pct * circumference;
941:         const slice = { ...d, dash, gap: circumference - dash, offset, pct };
942:         offset += dash;
943:         return slice;
944:       });
945:       return (
946:         <svg width={size} height={size} viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
947:           {slices.map((s, i) => s.value > 0 && (
948:             <circle key={i} cx={cx} cy={cy} r={r} fill="none"
949:               stroke={s.color} strokeWidth="18"
950:               strokeDasharray={`${s.dash} ${s.gap}`}
951:               strokeDashoffset={-s.offset}
952:               style={{ transition: 'stroke-dasharray 0.6s ease' }}
953:             />
954:           ))}
955:           <text x="60" y="65" textAnchor="middle" fontSize="18" fontWeight="800"
956:             fill="var(--text-primary)" fontFamily="Heebo" style={{ transform: 'rotate(90deg)', transformOrigin: '60px 60px' }}>
957:             {total}
958:           </text>
959:         </svg>
960:       );
961:     }
962: 
963:     function DashboardPage({ event, onGoToGuests }) {
964:       const { client } = useContext(SupabaseContext);
965:       const [guests, setGuests] = useState([]);
966:       const [rounds, setRounds] = useState([]);
967:       const [loading, setLoading] = useState(true);
968:       const [recentActivity, setRecentActivity] = useState([]);
969: 
970:       useEffect(() => {
971:         if (!client || !event?.id) return;
972:         setLoading(true);
973:         Promise.all([
974:           client.from('guests').select('*').eq('event_id', event.id).order('updated_at', { ascending: false }),
975:           client.from('message_rounds').select('*').eq('event_id', event.id).order('sent_at', { ascending: false }),
976:         ]).then(([{ data: g }, { data: r }]) => {
977:           setGuests(g || []);
978:           setRounds(r || []);
979:           // Build recent activity from recently updated guests
980:           const recent = (g || [])
981:             .filter(guest => guest.status !== 'pending')
982:             .slice(0, 8)
983:             .map(guest => ({
984:               id: guest.id,
985:               name: guest.name,
986:               status: guest.status,
987:               time: guest.updated_at,
988:             }));
989:           setRecentActivity(recent);
990:           setLoading(false);
991:         });
992:       }, [client, event?.id]);
993: 
994:       // Realtime subscription
995:       useEffect(() => {
996:         if (!client || !event?.id) return;
997:         const channel = client
998:           .channel('dashboard-guests-' + event.id)
999:           .on('postgres_changes', { event: '*', schema: 'public', table: 'guests', filter: `event_id=eq.${event.id}` },
1000:             (payload) => {
1001:               if (payload.eventType === 'UPDATE') {
1002:                 setGuests(prev => prev.map(g => g.id === payload.new.id ? payload.new : g));
1003:               } else if (payload.eventType === 'INSERT') {
1004:                 setGuests(prev => [payload.new, ...prev]);
1005:               } else if (payload.eventType === 'DELETE') {
1006:                 setGuests(prev => prev.filter(g => g.id !== payload.old.id));
1007:               }
1008:             })
1009:           .subscribe();
1010:         return () => { client.removeChannel(channel); };
1011:       }, [client, event?.id]);
1012: 
1013:       if (!event) {
1014:         return (
1015:           <div className="empty-state animate-slide-up">
1016:             <div className="empty-state-icon"><Icon name="CalendarHeart" size={36} /></div>
1017:             <div className="empty-state-title">בחרו אירוע</div>
1018:             <div className="empty-state-text">בחרו אירוע מהרשימה כדי לראות את הדשבורד</div>
1019:           </div>
1020:         );
1021:       }
1022: 
1023:       const stats = useMemo(() => {
1024:         const total = guests.length;
1025:         const confirmed = guests.filter(g => g.status === 'confirmed').length;
1026:         const pending = guests.filter(g => g.status === 'pending').length;
1027:         const declined = guests.filter(g => g.status === 'declined').length;
1028:         const maybe = guests.filter(g => g.status === 'maybe').length;
1029:         const totalGuests = guests.reduce((sum, g) => sum + (g.confirmed_guests || 0), 0);
1030:         const responseRate = total > 0 ? Math.round(((total - pending) / total) * 100) : 0;
1031:         return { total, confirmed, pending, declined, maybe, totalGuests, responseRate };
1032:       }, [guests]);
1033: 
1034:       // Group stats for bar chart
1035:       const groupStats = useMemo(() => {
1036:         const map = {};
1037:         guests.forEach(g => {
1038:           const grp = g.group_name || 'כללי';
1039:           if (!map[grp]) map[grp] = { total: 0, confirmed: 0 };
1040:           map[grp].total++;
1041:           if (g.status === 'confirmed') map[grp].confirmed += (g.confirmed_guests || 0);
1042:         });
1043:         return Object.entries(map)
1044:           .map(([name, v]) => ({ name, ...v }))
1045:           .sort((a, b) => b.total - a.total)
1046:           .slice(0, 6);
1047:       }, [guests]);
1048: 
1049:       const maxGroupTotal = Math.max(...groupStats.map(g => g.total), 1);
1050: 
1051:       const donutData = [
1052:         { label: 'מגיעים',    value: stats.confirmed, color: '#10B981' },
1053:         { label: 'אולי',      value: stats.maybe,     color: '#F59E0B' },
1054:         { label: 'לא מגיע',  value: stats.declined,  color: '#EF4444' },
1055:         { label: 'ממתין',    value: stats.pending,    color: '#60A5FA' },
1056:       ];
1057: 
1058:       const formatTime = (ts) => {
1059:         if (!ts) return '';
1060:         const d = new Date(ts);
1061:         const now = new Date();
1062:         const diff = Math.round((now - d) / 60000);
1063:         if (diff < 1) return 'עכשיו';
1064:         if (diff < 60) return `לפני ${diff} דק'`;
1065:         if (diff < 1440) return `לפני ${Math.round(diff/60)} שע'`;
1066:         return d.toLocaleDateString('he-IL');
1067:       };
1068: 
1069:       const activityConfig = {
1070:         confirmed: { color: 'rgba(16,185,129,0.15)', icon: 'CheckCircle2', iconColor: '#10B981', text: 'אישר/ה הגעה' },
1071:         declined:  { color: 'rgba(239,68,68,0.12)',  icon: 'XCircle',      iconColor: '#EF4444', text: 'לא מגיע/ה' },
1072:         maybe:     { color: 'rgba(245,158,11,0.12)', icon: 'HelpCircle',   iconColor: '#F59E0B', text: 'אולי מגיע/ה' },
1073:         pending:   { color: 'rgba(96,165,250,0.12)', icon: 'Clock',        iconColor: '#60A5FA', text: 'ממתין/ה' },
1074:       };
1075: 
1076:       if (loading) return (
1077:         <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
1078:           <div className="kpi-grid">
1079:             {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
1080:           </div>
1081:           {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 180 }} />)}
1082:         </div>
1083:       );
1084: 
1085:       return (
1086:         <div className="animate-slide-up">
1087:           {/* Header */}
1088:           <div className="page-header">
1089:             <div className="page-title">{event.name}</div>
1090:             <div className="page-subtitle">
1091:               {event.event_date && `📅 ${new Date(event.event_date).toLocaleDateString('he-IL')}`}
1092:               {event.venue_name && ` · 📍 ${event.venue_name}`}
1093:               {rounds.length > 0 && ` · ${rounds.length} סבבי הודעות`}
1094:             </div>
1095:           </div>
1096: 
1097:           {/* KPI Cards */}
1098:           <div className="kpi-grid">
1099:             <div className="kpi-card gold animate-scale-in stagger-1">
1100:               <div className="kpi-value">{stats.total}</div>
1101:               <div className="kpi-label">סה״כ מוזמנים</div>
1102:             </div>
1103:             <div className="kpi-card green animate-scale-in stagger-2">
1104:               <div className="kpi-value">{stats.totalGuests}</div>
1105:               <div className="kpi-label">נפשות מגיעות</div>
1106:             </div>
1107:             <div className="kpi-card blue animate-scale-in stagger-3">
1108:               <div className="kpi-value">{stats.pending}</div>
1109:               <div className="kpi-label">ממתינים לתגובה</div>
1110:             </div>
1111:             <div className="kpi-card red animate-scale-in stagger-4">
1112:               <div className="kpi-value">{stats.declined}</div>
1113:               <div className="kpi-label">לא מגיעים</div>
1114:             </div>
1115:           </div>
1116: 
1117:           {stats.total === 0 ? (
1118:             <div className="empty-state" style={{ padding: '40px 20px' }}>
1119:               <div className="empty-state-icon"><Icon name="UserPlus" size={36} /></div>
1120:               <div className="empty-state-title">אין מוזמנים עדיין</div>
1121:               <div className="empty-state-text">הוסיפו מוזמנים כדי לראות סטטיסטיקות בזמן אמת</div>
1122:               <button className="btn btn-primary" onClick={onGoToGuests}>
1123:                 <Icon name="Plus" size={18} />הוספת מוזמנים
1124:               </button>
1125:             </div>
1126:           ) : (
1127:             <>
1128:               {/* Response rate bar */}
1129:               <div className="card animate-slide-up stagger-2" style={{ marginBottom: 16 }}>
1130:                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
1131:                   <div className="card-title" style={{ marginBottom: 0 }}>שיעור תגובות</div>
1132:                   <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--accent)', letterSpacing: -1 }}>{stats.responseRate}%</div>
1133:                 </div>
1134:                 <div style={{ height: 10, background: 'var(--bg-tertiary)', borderRadius: 5, overflow: 'hidden' }}>
1135:                   <div style={{ height: '100%', width: `${stats.responseRate}%`, background: 'linear-gradient(90deg, var(--gold-400), var(--emerald-500))', borderRadius: 5, transition: 'width 1s var(--ease-out)' }} />
1136:                 </div>
1137:                 <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 13, flexWrap: 'wrap' }}>
1138:                   {donutData.map(d => (
1139:                     <span key={d.label} style={{ color: d.color, display: 'flex', alignItems: 'center', gap: 5 }}>
1140:                       <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
1141:                       {d.label}: <strong>{d.value}</strong>
1142:                     </span>
1143:                   ))}
1144:                 </div>
1145:               </div>
1146: 
1147:               <div className="dashboard-grid">
1148:                 {/* Donut chart */}
1149:                 <div className="chart-card animate-scale-in stagger-3">
1150:                   <div className="chart-title">פילוח סטטוסים</div>
1151:                   <div className="donut-wrap">
1152:                     <DonutChart data={donutData} size={130} />
1153:                     <div className="donut-legend">
1154:                       {donutData.map(d => (
1155:                         <div key={d.label} className="donut-legend-item">
1156:                           <span className="donut-legend-dot" style={{ background: d.color }} />
1157:                           <span className="donut-legend-label">{d.label}</span>
1158:                           <span className="donut-legend-value" style={{ color: d.color }}>{d.value}</span>
1159:                           <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
1160:                             {stats.total > 0 ? Math.round(d.value/stats.total*100) : 0}%
1161:                           </span>
1162:                         </div>
1163:                       ))}
1164:                     </div>
1165:                   </div>
1166:                 </div>
1167: 
1168:                 {/* Bar chart by group */}
1169:                 {groupStats.length > 0 && (
1170:                   <div className="chart-card animate-scale-in stagger-4">
1171:                     <div className="chart-title">מגיעים לפי קבוצה</div>
1172:                     <div className="bar-chart">
1173:                       {groupStats.map(g => (
1174:                         <div key={g.name} className="bar-row">
1175:                           <div className="bar-label">{g.name}</div>
1176:                           <div className="bar-track">
1177:                             <div
1178:                               className="bar-fill"
1179:                               style={{
1180:                                 width: `${Math.round(g.total / maxGroupTotal * 100)}%`,
1181:                                 background: `linear-gradient(90deg, var(--gold-500), var(--gold-400))`,
1182:                                 minWidth: g.total > 0 ? 28 : 0,
1183:                               }}
1184:                             >
1185:                               {g.total >= 3 && g.total}
1186:                             </div>
1187:                           </div>
1188:                           <div className="bar-count">{g.total}</div>
1189:                         </div>
1190:                       ))}
1191:                     </div>
1192:                   </div>
1193:                 )}
1194: 
1195:                 {/* Recent activity */}
1196:                 {recentActivity.length > 0 && (
1197:                   <div className="chart-card dashboard-span2 animate-slide-up stagger-5">
1198:                     <div className="chart-title">
1199:                       פעילות אחרונה
1200:                       <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 400 }}>מתעדכן בזמן אמת</span>
1201:                     </div>
1202:                     <div className="activity-list">
1203:                       {recentActivity.map(a => {
1204:                         const cfg = activityConfig[a.status] || activityConfig.pending;
1205:                         return (
1206:                           <div key={a.id} className="activity-item">
1207:                             <div className="activity-icon" style={{ background: cfg.color }}>
1208:                               <Icon name={cfg.icon} size={14} style={{ color: cfg.iconColor }} />
1209:                             </div>
1210:                             <div className="activity-text">
1211:                               <div className="activity-name">{a.name}</div>
1212:                               <div className="activity-time">{cfg.text}</div>
1213:                             </div>
1214:                             <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{formatTime(a.time)}</div>
1215:                           </div>
1216:                         );
1217:                       })}
1218:                     </div>
1219:                   </div>
1220:                 )}
1221: 
1222:                 {/* Message rounds summary */}
1223:                 {rounds.length > 0 && (
1224:                   <div className="chart-card animate-slide-up stagger-5">
1225:                     <div className="chart-title">סבבי הודעות</div>
1226:                     <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
1227:                       {rounds.slice(0, 3).map(r => (
1228:                         <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
1229:                           <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: 'var(--accent)', flexShrink: 0 }}>
1230:                             {r.round_number}
1231:                           </div>
1232:                           <div style={{ flex: 1 }}>
1233:                             <div style={{ fontSize: 13, fontWeight: 600 }}>סבב {r.round_number}</div>
1234:                             <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{new Date(r.sent_at).toLocaleDateString('he-IL')}</div>
1235:                           </div>
1236:                           <div style={{ textAlign: 'center' }}>
1237:                             <div style={{ fontSize: 16, fontWeight: 800, color: '#25D366' }}>{r.total_sent || 0}</div>
1238:                             <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>נשלחו</div>
1239:                           </div>
1240:                         </div>
1241:                       ))}
1242:                     </div>
1243:                   </div>
1244:                 )}
1245:               </div>
1246:             </>
1247:           )}
1248:         </div>
1249:       );
1250:     }
1251:     // ============================================
1252:     // Validation helpers
1253:     // ============================================
1254:     const VALIDATION = {
1255:       sanitize: (v) => String(v || '').trim().replace(/<[^>]*>/g, ''),
1256:       phone: (v) => {
1257:         const clean = String(v || '').replace(/[\s\-()]/g, '');
1258:         return /^(\+972|0)(5[0-9]|7[0-9])\d{7}$/.test(clean) || /^\+?[0-9]{7,15}$/.test(clean);
1259:       },
1260:       normalizePhone: (v) => String(v || '').replace(/[\s\-()]/g, ''),
1261:     };
1262: 
1263:     // Group colors palette
1264:     const GROUP_COLORS = {
1265:       'כללי': '#94A3B8',
1266:       'משפחה': '#F472B6',
1267:       'חברים': '#60A5FA',
1268:       'עבודה': '#34D399',
1269:       'צד חתן': '#818CF8',
1270:       'צד כלה': '#FB923C',
1271:       'VIP': '#F5C518',
1272:     };
1273: 
1274:     function getGroupColor(group) {
1275:       return GROUP_COLORS[group] || '#94A3B8';
1276:     }
1277: 
1278:     const STATUS_CONFIG = {
1279:       pending:   { label: 'ממתין', color: 'var(--blue-500)',    bg: 'rgba(59,130,246,0.1)',   icon: 'Clock' },
1280:       confirmed: { label: 'מגיע',  color: 'var(--emerald-500)', bg: 'rgba(16,185,129,0.1)',  icon: 'CheckCircle2' },
1281:       declined:  { label: 'לא מגיע', color: 'var(--red-500)',   bg: 'rgba(239,68,68,0.1)',   icon: 'XCircle' },
1282:       maybe:     { label: 'אולי',  color: 'var(--amber-500)',   bg: 'rgba(245,158,11,0.1)',  icon: 'HelpCircle' },
1283:     };
1284: 
1285:     function StatusBadge({ status, onClick, small }) {
1286:       const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
1287:       return (
1288:         <span
1289:           className="status-btn"
1290:           onClick={onClick}
1291:           style={{
1292:             background: cfg.bg,
1293:             color: cfg.color,
1294:             cursor: onClick ? 'pointer' : 'default',
1295:             fontSize: small ? '11px' : '12px',
1296:             padding: small ? '2px 8px' : '4px 10px',
1297:           }}
1298:         >
1299:           <Icon name={cfg.icon} size={small ? 11 : 13} />
1300:           {cfg.label}
1301:         </span>
1302:       );
1303:     }
1304: 
1305:     // ============================================
1306:     // Add/Edit Guest Modal
1307:     // ============================================
1308:     function GuestModal({ guest, eventId, existingPhones, onSave, onClose }) {
1309:       const isEdit = !!guest;
1310:       const [form, setForm] = useState({
1311:         name: guest?.name || '',
1312:         phone: guest?.phone || '',
1313:         email: guest?.email || '',
1314:         group_name: guest?.group_name || 'כללי',
1315:         expected_guests: guest?.expected_guests || 1,
1316:         status: guest?.status || 'pending',
1317:         confirmed_guests: guest?.confirmed_guests || 0,
1318:         dietary_notes: guest?.dietary_notes || '',
1319:         notes: guest?.notes || '',
1320:       });
1321:       const [errors, setErrors] = useState({});
1322:       const [phoneDupWarn, setPhoneDupWarn] = useState(false);
1323: 
1324:       const groups = ['כללי', 'משפחה', 'חברים', 'עבודה', 'צד חתן', 'צד כלה', 'VIP'];
1325:       const statuses = ['pending', 'confirmed', 'declined', 'maybe'];
1326: 
1327:       const validate = () => {
1328:         const errs = {};
1329:         const name = VALIDATION.sanitize(form.name);
1330:         if (!name) errs.name = 'שם חובה';
1331:         else if (name.length > 100) errs.name = 'שם ארוך מדי';
1332: 
1333:         if (form.phone) {
1334:           if (!VALIDATION.phone(form.phone)) errs.phone = 'מספר טלפון לא תקין';
1335:         }
1336:         if (form.expected_guests < 1 || form.expected_guests > 20) errs.expected_guests = '1–20 מוזמנים';
1337:         return errs;
1338:       };
1339: 
1340:       const handlePhoneChange = (v) => {
1341:         setForm(f => ({ ...f, phone: v }));
1342:         const normalized = VALIDATION.normalizePhone(v);
1343:         const isDup = existingPhones.some(p =>
1344:           p.phone === normalized && p.id !== (guest?.id || '')
1345:         );
1346:         setPhoneDupWarn(isDup && !!normalized);
1347:       };
1348: 
1349:       const handleSubmit = () => {
1350:         const errs = validate();
1351:         setErrors(errs);
1352:         if (Object.keys(errs).length > 0) return;
1353:         onSave({
1354:           ...form,
1355:           name: VALIDATION.sanitize(form.name),
1356:           phone: VALIDATION.normalizePhone(form.phone),
1357:           email: VALIDATION.sanitize(form.email),
1358:           group_name: VALIDATION.sanitize(form.group_name),
1359:           dietary_notes: VALIDATION.sanitize(form.dietary_notes),
1360:           notes: VALIDATION.sanitize(form.notes),
1361:           expected_guests: parseInt(form.expected_guests) || 1,
1362:           confirmed_guests: parseInt(form.confirmed_guests) || 0,
1363:         });
1364:       };
1365: 
1366:       return (
1367:         <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
1368:           <div className="modal-content animate-scale-in" style={{ maxWidth: 460 }}>
1369:             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
1370:               <div className="modal-title">{isEdit ? 'עריכת אורח' : 'הוספת אורח'}</div>
1371:               <button className="icon-btn" onClick={onClose}><Icon name="X" size={20} /></button>
1372:             </div>
1373: 
1374:             <div className="modal-scroll">
1375:               {/* Name */}
1376:               <div className="input-group">
1377:                 <label className="input-label">שם מלא *</label>
1378:                 <input
1379:                   className="input-field"
1380:                   placeholder="ישראל ישראלי"
1381:                   value={form.name}
1382:                   onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
1383:                   style={errors.name ? { borderColor: 'var(--red-500)' } : {}}
1384:                   maxLength={100}
1385:                   autoFocus
1386:                 />
1387:                 {errors.name && <div style={{ color: 'var(--red-500)', fontSize: 12, marginTop: 4 }}>{errors.name}</div>}
1388:               </div>
1389: 
1390:               {/* Phone + Email */}
1391:               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
1392:                 <div className="input-group">
1393:                   <label className="input-label">טלפון</label>
1394:                   <input
1395:                     className="input-field"
1396:                     placeholder="050-0000000"
1397:                     value={form.phone}
1398:                     onChange={e => handlePhoneChange(e.target.value)}
1399:                     dir="ltr"
1400:                     style={{ textAlign: 'right', ...(errors.phone ? { borderColor: 'var(--red-500)' } : {}) }}
1401:                     maxLength={20}
1402:                   />
1403:                   {errors.phone && <div style={{ color: 'var(--red-500)', fontSize: 12, marginTop: 4 }}>{errors.phone}</div>}
1404:                   {phoneDupWarn && <div style={{ color: 'var(--amber-500)', fontSize: 12, marginTop: 4 }}>⚠️ מספר כפול</div>}
1405:                 </div>
1406:                 <div className="input-group">
1407:                   <label className="input-label">אימייל</label>
1408:                   <input
1409:                     className="input-field"
1410:                     type="email"
1411:                     placeholder="email@example.com"
1412:                     value={form.email}
1413:                     onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
1414:                     dir="ltr"
1415:                     style={{ textAlign: 'right' }}
1416:                     maxLength={200}
1417:                   />
1418:                 </div>
1419:               </div>
1420: 
1421:               {/* Group + Expected */}
1422:               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
1423:                 <div className="input-group">
1424:                   <label className="input-label">קבוצה</label>
1425:                   <select
1426:                     className="input-field"
1427:                     value={form.group_name}
1428:                     onChange={e => setForm(f => ({ ...f, group_name: e.target.value }))}
1429:                   >
1430:                     {groups.map(g => <option key={g} value={g}>{g}</option>)}
1431:                   </select>
1432:                 </div>
1433:                 <div className="input-group">
1434:                   <label className="input-label">מוזמנים צפויים</label>
1435:                   <input
1436:                     className="input-field"
1437:                     type="number"
1438:                     min="1"
1439:                     max="20"
1440:                     value={form.expected_guests}
1441:                     onChange={e => setForm(f => ({ ...f, expected_guests: e.target.value }))}
1442:                     style={errors.expected_guests ? { borderColor: 'var(--red-500)' } : {}}
1443:                   />
1444:                   {errors.expected_guests && <div style={{ color: 'var(--red-500)', fontSize: 12, marginTop: 4 }}>{errors.expected_guests}</div>}
1445:                 </div>
1446:               </div>
1447: 
1448:               {/* Status + Confirmed (only in edit) */}
1449:               {isEdit && (
1450:                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
1451:                   <div className="input-group">
1452:                     <label className="input-label">סטטוס</label>
1453:                     <select
1454:                       className="input-field"
1455:                       value={form.status}
1456:                       onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
1457:                     >
1458:                       {statuses.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
1459:                     </select>
1460:                   </div>
1461:                   <div className="input-group">
1462:                     <label className="input-label">אישרו הגעה</label>
1463:                     <input
1464:                       className="input-field"
1465:                       type="number"
1466:                       min="0"
1467:                       max="20"
1468:                       value={form.confirmed_guests}
1469:                       onChange={e => setForm(f => ({ ...f, confirmed_guests: e.target.value }))}
1470:                     />
1471:                   </div>
1472:                 </div>
1473:               )}
1474: 
1475:               {/* Dietary + Notes */}
1476:               <div className="input-group">
1477:                 <label className="input-label">הערות תזונה</label>
1478:                 <input
1479:                   className="input-field"
1480:                   placeholder="צמחוני, ללא גלוטן, אלרגיה לאגוזים..."
1481:                   value={form.dietary_notes}
1482:                   onChange={e => setForm(f => ({ ...f, dietary_notes: e.target.value }))}
1483:                   maxLength={200}
1484:                 />
1485:               </div>
1486: 
1487:               <div className="input-group" style={{ marginBottom: 0 }}>
1488:                 <label className="input-label">הערות</label>
1489:                 <textarea
1490:                   className="input-field"
1491:                   placeholder="הערות נוספות..."
1492:                   value={form.notes}
1493:                   onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
1494:                   rows={2}
1495:                   style={{ resize: 'none' }}
1496:                   maxLength={500}
1497:                 />
1498:               </div>
1499:             </div>
1500: 
1501:             <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
1502:               <button className="btn btn-ghost" onClick={onClose}>ביטול</button>
1503:               <button className="btn btn-primary" onClick={handleSubmit}>
1504:                 <Icon name={isEdit ? 'Save' : 'UserPlus'} size={18} />
1505:                 {isEdit ? 'שמור שינויים' : 'הוסף אורח'}
1506:               </button>
1507:             </div>
1508:           </div>
1509:         </div>
1510:       );
1511:     }
1512: 
1513:     // ============================================
1514:     // Delete Confirm Modal
1515:     // ============================================
1516:     function DeleteConfirmModal({ count, onConfirm, onClose }) {
1517:       return (
1518:         <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
1519:           <div className="modal-content animate-scale-in" style={{ maxWidth: 380 }}>
1520:             <div className="confirm-dialog">
1521:               <div className="confirm-dialog-icon">
1522:                 <Icon name="Trash2" size={24} style={{ color: 'var(--red-500)' }} />
1523:               </div>
1524:               <div className="confirm-dialog-title">מחיקת {count > 1 ? `${count} אורחים` : 'אורח'}</div>
1525:               <div className="confirm-dialog-text">
1526:                 פעולה זו אינה ניתנת לביטול. האורח{count > 1 ? 'ים' : ''} יימחק{count > 1 ? 'ו' : ''} לצמיתות.
1527:               </div>
1528:               <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
1529:                 <button className="btn btn-ghost" onClick={onClose}>ביטול</button>
1530:                 <button className="btn btn-danger" onClick={onConfirm} style={{ padding: '10px 24px' }}>
1531:                   <Icon name="Trash2" size={18} />
1532:                   מחק
1533:                 </button>
1534:               </div>
1535:             </div>
1536:           </div>
1537:         </div>
1538:       );
1539:     }
1540: 
1541:     // ============================================
1542:     // Excel Import Modal
1543:     // ============================================
1544:     function ImportModal({ eventId, existingGuests, onImport, onClose }) {
1545:       const [step, setStep] = useState('upload'); // upload | preview | importing
1546:       const [rawRows, setRawRows] = useState([]);
1547:       const [mapping, setMapping] = useState({ name: '', phone: '', group_name: '', expected_guests: '' });
1548:       const [headers, setHeaders] = useState([]);
1549:       const [duplicates, setDuplicates] = useState(new Set());
1550:       const [fileName, setFileName] = useState('');
1551:       const [importing, setImporting] = useState(false);
1552:       const [summary, setSummary] = useState(null);
1553:       const fileRef = useRef(null);
1554: 
1555:       const AUTO_MAP = {
1556:         name: ['שם', 'name', 'full_name', 'שם מלא', 'שם פרטי'],
1557:         phone: ['טלפון', 'phone', 'נייד', 'mobile', 'cell', 'מספר'],
1558:         group_name: ['קבוצה', 'group', 'צד', 'side', 'חלק'],
1559:         expected_guests: ['מספר מוזמנים', 'כמות', 'מוזמנים', 'guests', 'expected', 'כמה'],
1560:       };
1561: 
1562:       const handleFile = (file) => {
1563:         if (!file) return;
1564:         setFileName(file.name);
1565:         const reader = new FileReader();
1566:         reader.onload = (e) => {
1567:           const data = new Uint8Array(e.target.result);
1568:           const wb = XLSX.read(data, { type: 'array' });
1569:           const ws = wb.Sheets[wb.SheetNames[0]];
1570:           const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
1571:           if (rows.length < 2) return;
1572: 
1573:           const hdrs = rows[0].map(h => String(h).trim());
1574:           setHeaders(hdrs);
1575:           setRawRows(rows.slice(1).filter(r => r.some(c => c !== '')));
1576: 
1577:           // Auto-map columns
1578:           const newMap = { name: '', phone: '', group_name: '', expected_guests: '' };
1579:           hdrs.forEach((h, i) => {
1580:             Object.entries(AUTO_MAP).forEach(([field, keywords]) => {
1581:               if (!newMap[field] && keywords.some(k => h.toLowerCase().includes(k.toLowerCase()))) {
1582:                 newMap[field] = String(i);
1583:               }
1584:             });
1585:           });
1586:           setMapping(newMap);
1587:           setStep('preview');
1588:         };
1589:         reader.readAsArrayBuffer(file);
1590:       };
1591: 
1592:       const getMapped = (row, field) => {
1593:         const idx = parseInt(mapping[field]);
1594:         return isNaN(idx) ? '' : String(row[idx] || '').trim();
1595:       };
1596: 
1597:       const previewRows = useMemo(() => {
1598:         const existingPhones = new Set(existingGuests.map(g => VALIDATION.normalizePhone(g.phone)));
1599:         const dups = new Set();
1600:         const rows = rawRows.slice(0, 50).map((row, i) => {
1601:           const phone = VALIDATION.normalizePhone(getMapped(row, 'phone'));
1602:           const isDup = phone && existingPhones.has(phone);
1603:           if (isDup) dups.add(i);
1604:           return { row, isDup };
1605:         });
1606:         setDuplicates(dups);
1607:         return rows;
1608:       }, [rawRows, mapping, existingGuests]);
1609: 
1610:       const handleImport = async () => {
1611:         setImporting(true);
1612:         const existingPhones = new Set(existingGuests.map(g => VALIDATION.normalizePhone(g.phone)));
1613:         let imported = 0, skipped = 0, errors = 0;
1614: 
1615:         const toInsert = rawRows
1616:           .map(row => {
1617:             const name = VALIDATION.sanitize(getMapped(row, 'name'));
1618:             if (!name) return null;
1619:             const phone = VALIDATION.normalizePhone(getMapped(row, 'phone'));
1620:             if (phone && existingPhones.has(phone)) { skipped++; return null; }
1621:             const eg = parseInt(getMapped(row, 'expected_guests')) || 1;
1622:             return {
1623:               name,
1624:               phone: phone || null,
1625:               group_name: VALIDATION.sanitize(getMapped(row, 'group_name')) || 'כללי',
1626:               expected_guests: Math.max(1, Math.min(20, eg)),
1627:               status: 'pending',
1628:               event_id: eventId,
1629:             };
1630:           })
1631:           .filter(Boolean);
1632: 
1633:         setSummary({ imported: toInsert.length, skipped, errors });
1634:         onImport(toInsert);
1635:         setStep('done');
1636:         setImporting(false);
1637:       };
1638: 
1639:       if (step === 'done') {
1640:         return (
1641:           <div className="modal-overlay">
1642:             <div className="modal-content animate-scale-in" style={{ maxWidth: 360 }}>
1643:               <div className="confirm-dialog">
1644:                 <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-xl)', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
1645:                   <Icon name="CheckCircle2" size={28} style={{ color: 'var(--emerald-500)' }} />
1646:                 </div>
1647:                 <div className="confirm-dialog-title">ייבוא הושלם!</div>
1648:                 {summary && (
1649:                   <div style={{ display: 'flex', gap: 20, justifyContent: 'center', margin: '12px 0 20px' }}>
1650:                     <div style={{ textAlign: 'center' }}>
1651:                       <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--emerald-500)' }}>{summary.imported}</div>
1652:                       <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>יובאו</div>
1653:                     </div>
1654:                     {summary.skipped > 0 && (
1655:                       <div style={{ textAlign: 'center' }}>
1656:                         <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber-500)' }}>{summary.skipped}</div>
1657:                         <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>דולגו (כפולים)</div>
1658:                       </div>
1659:                     )}
1660:                   </div>
1661:                 )}
1662:                 <button className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>סיום</button>
1663:               </div>
1664:             </div>
1665:           </div>
1666:         );
1667:       }
1668: 
1669:       return (
1670:         <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
1671:           <div className="modal-content animate-scale-in" style={{ maxWidth: 560, width: '95vw' }}>
1672:             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
1673:               <div className="modal-title">ייבוא מאקסל</div>
1674:               <button className="icon-btn" onClick={onClose}><Icon name="X" size={20} /></button>
1675:             </div>
1676: 
1677:             {step === 'upload' && (
1678:               <div>
1679:                 <div
1680:                   className="upload-zone"
1681:                   onClick={() => fileRef.current?.click()}
1682:                   onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
1683:                   onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
1684:                   onDrop={e => {
1685:                     e.preventDefault();
1686:                     e.currentTarget.classList.remove('drag-over');
1687:                     handleFile(e.dataTransfer.files[0]);
1688:                   }}
1689:                 >
1690:                   <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={e => handleFile(e.target.files[0])} />
1691:                   <Icon name="FileSpreadsheet" size={36} style={{ color: 'var(--accent)', marginBottom: 12 }} />
1692:                   <div style={{ fontWeight: 600, marginBottom: 6 }}>גררו קובץ לכאן או לחצו לבחירה</div>
1693:                   <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Excel (XLSX, XLS) או CSV</div>
1694:                 </div>
1695:                 <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-secondary)' }}>
1696:                   <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>פורמט מומלץ:</div>
1697:                   <div>עמודות: שם | טלפון | קבוצה | מספר מוזמנים</div>
1698:                   <div style={{ marginTop: 4 }}>השורה הראשונה = כותרות</div>
1699:                 </div>
1700:               </div>
1701:             )}
1702: 
1703:             {step === 'preview' && (
1704:               <div>
1705:                 <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
1706:                   <Icon name="FileText" size={14} style={{ display: 'inline', marginLeft: 4 }} />
1707:                   {fileName} — {rawRows.length} שורות
1708:                 </div>
1709: 
1710:                 {/* Column mapping */}
1711:                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
1712:                   {[
1713:                     { field: 'name', label: 'עמודת שם *' },
1714:                     { field: 'phone', label: 'עמודת טלפון' },
1715:                     { field: 'group_name', label: 'עמודת קבוצה' },
1716:                     { field: 'expected_guests', label: 'עמודת כמות' },
1717:                   ].map(({ field, label }) => (
1718:                     <div key={field}>
1719:                       <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
1720:                       <select
1721:                         className="filter-select"
1722:                         style={{ width: '100%' }}
1723:                         value={mapping[field]}
1724:                         onChange={e => setMapping(m => ({ ...m, [field]: e.target.value }))}
1725:                       >
1726:                         <option value="">-- לא ממופה --</option>
1727:                         {headers.map((h, i) => <option key={i} value={String(i)}>{h}</option>)}
1728:                       </select>
1729:                     </div>
1730:                   ))}
1731:                 </div>
1732: 
1733:                 {/* Preview table */}
1734:                 <div className="import-preview">
1735:                   <table>
1736:                     <thead>
1737:                       <tr>
1738:                         <th>שם</th>
1739:                         <th>טלפון</th>
1740:                         <th>קבוצה</th>
1741:                         <th>כמות</th>
1742:                         <th>סטטוס</th>
1743:                       </tr>
1744:                     </thead>
1745:                     <tbody>
1746:                       {previewRows.map(({ row, isDup }, i) => (
1747:                         <tr key={i} className={isDup ? 'duplicate-row' : ''}>
1748:                           <td>{getMapped(row, 'name') || '—'}</td>
1749:                           <td>{getMapped(row, 'phone') || '—'}</td>
1750:                           <td>{getMapped(row, 'group_name') || 'כללי'}</td>
1751:                           <td>{getMapped(row, 'expected_guests') || '1'}</td>
1752:                           <td style={{ whiteSpace: 'nowrap' }}>
1753:                             {isDup ? <span style={{ color: 'var(--amber-500)', fontSize: 12 }}>⚠️ כפול</span> : <span style={{ color: 'var(--emerald-500)', fontSize: 12 }}>✓ חדש</span>}
1754:                           </td>
1755:                         </tr>
1756:                       ))}
1757:                     </tbody>
1758:                   </table>
1759:                 </div>
1760:                 {rawRows.length > 50 && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6, textAlign: 'center' }}>מוצגות 50 שורות ראשונות מתוך {rawRows.length}</div>}
1761: 
1762:                 {duplicates.size > 0 && (
1763:                   <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--amber-500)' }}>
1764:                     {duplicates.size} שורות עם מספר טלפון קיים — יידולגו בייבוא
1765:                   </div>
1766:                 )}
1767: 
1768:                 <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
1769:                   <button className="btn btn-ghost" onClick={() => setStep('upload')}>חזרה</button>
1770:                   <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
1771:                     <Icon name="Download" size={18} />
1772:                     ייבא {rawRows.length - duplicates.size} אורחים
1773:                   </button>
1774:                 </div>
1775:               </div>
1776:             )}
1777:           </div>
1778:         </div>
1779:       );
1780:     }
1781: 
1782:     // ============================================
1783:     // Status Quick-Change Popover
1784:     // ============================================
1785:     function StatusPopover({ guest, onUpdate, onClose }) {
1786:       const statuses = ['pending', 'confirmed', 'declined', 'maybe'];
1787:       return (
1788:         <div style={{
1789:           position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center'
1790:         }} onClick={onClose}>
1791:           <div
1792:             className="card animate-scale-in"
1793:             style={{ padding: 12, minWidth: 180, boxShadow: 'var(--shadow-xl)' }}
1794:             onClick={e => e.stopPropagation()}
1795:           >
1796:             <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, padding: '0 4px' }}>
1797:               שנה סטטוס — {guest.name}
1798:             </div>
1799:             {statuses.map(s => (
1800:               <button
1801:                 key={s}
1802:                 style={{
1803:                   display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px',
1804:                   borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 500,
1805:                   color: guest.status === s ? STATUS_CONFIG[s].color : 'var(--text-primary)',
1806:                   background: guest.status === s ? STATUS_CONFIG[s].bg : 'transparent',
1807:                   transition: 'all 0.15s',
1808:                 }}
1809:                 onClick={() => { onUpdate(guest, s); onClose(); }}
1810:                 onMouseEnter={e => { if (guest.status !== s) e.currentTarget.style.background = 'var(--bg-hover)'; }}
1811:                 onMouseLeave={e => { if (guest.status !== s) e.currentTarget.style.background = 'transparent'; }}
1812:               >
1813:                 <Icon name={STATUS_CONFIG[s].icon} size={16} />
1814:                 {STATUS_CONFIG[s].label}
1815:                 {guest.status === s && <Icon name="Check" size={14} style={{ marginRight: 'auto' }} />}
1816:               </button>
1817:             ))}
1818: 
1819:             {/* Confirmed guests count */}
1820:             {guest.status === 'confirmed' && (
1821:               <div style={{ marginTop: 10, padding: '8px 10px', borderTop: '1px solid var(--border-light)' }}>
1822:                 <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>כמה מגיעים?</div>
1823:                 <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
1824:                   <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => onUpdate(guest, guest.status, Math.max(0, (guest.confirmed_guests || 0) - 1))}>
1825:                     <Icon name="Minus" size={14} />
1826:                   </button>
1827:                   <span style={{ fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{guest.confirmed_guests || 0}</span>
1828:                   <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => onUpdate(guest, guest.status, Math.min(20, (guest.confirmed_guests || 0) + 1))}>
1829:                     <Icon name="Plus" size={14} />
1830:                   </button>
1831:                 </div>
1832:               </div>
1833:             )}
1834:           </div>
1835:         </div>
1836:       );
1837:     }
1838: 
1839:     // ============================================
1840:     // Guests Page — Full Implementation
1841:     // ============================================
1842:     function GuestsPage({ event }) {
1843:       const { client } = useContext(SupabaseContext);
1844:       const { addToast } = useContext(ToastContext);
1845:       const { limits, isPro } = useContext(PlanContext);
1846:       const isMobile = useIsMobile();
1847: 
1848:       // State
1849:       const [guests, setGuests] = useState([]);
1850:       const [loading, setLoading] = useState(true);
1851:       const [search, setSearch] = useState('');
1852:       const [filterStatus, setFilterStatus] = useState('all');
1853:       const [filterGroup, setFilterGroup] = useState('all');
1854:       const [sortBy, setSortBy] = useState('created_at');
1855:       const [sortDir, setSortDir] = useState('desc');
1856:       const [selected, setSelected] = useState(new Set());
1857:       const [page, setPage] = useState(1);
1858:       const PAGE_SIZE = 20;
1859:       const [upsellFeature, setUpsellFeature] = useState(null); // plan upsell modal
1860: 
1861:       // Modals
1862:       const [showAdd, setShowAdd] = useState(false);
1863:       const [editGuest, setEditGuest] = useState(null);
1864:       const [deleteTarget, setDeleteTarget] = useState(null); // guest or 'bulk'
1865:       const [showImport, setShowImport] = useState(false);
1866:       const [statusPopover, setStatusPopover] = useState(null);
1867:       const [bulkGroupTarget, setBulkGroupTarget] = useState('');
1868:       const [showBulkGroup, setShowBulkGroup] = useState(false);
1869:       const [showContactsPaste, setShowContactsPaste] = useState(false);
1870:       const [contactsPasteText, setContactsPasteText] = useState('');
1871: 
1872:       const searchDebounceRef = useRef(null);
1873:       const [searchInput, setSearchInput] = useState('');
1874: 
1875:       // Debounced search
1876:       const handleSearchChange = (v) => {
1877:         setSearchInput(v);
1878:         clearTimeout(searchDebounceRef.current);
1879:         searchDebounceRef.current = setTimeout(() => {
1880:           setSearch(v);
1881:           setPage(1);
1882:         }, 300);
1883:       };
1884: 
1885:       // Fetch guests
1886:       useEffect(() => {
1887:         if (!event?.id) return;
1888:         fetchGuests();
1889:       }, [client, event?.id]);
1890: 
1891:       // Keyboard shortcut: N → add guest (triggered from App)
1892:       useEffect(() => {
1893:         const handler = () => setShowAdd(true);
1894:         window.addEventListener('seatsync:add-guest', handler);
1895:         return () => window.removeEventListener('seatsync:add-guest', handler);
1896:       }, []);
1897: 
1898:       const fetchGuests = async () => {
1899:         if (!client || !event?.id) return;
1900:         setLoading(true);
1901:         const { data, error } = await client
1902:           .from('guests')
1903:           .select('*')
1904:           .eq('event_id', event.id)
1905:           .order('created_at', { ascending: false });
1906:         if (error) addToast('שגיאה בטעינת מוזמנים', 'error');
1907:         else setGuests(data || []);
1908:         setLoading(false);
1909:       };
1910: 
1911:       // Filter + sort
1912:       const filtered = useMemo(() => {
1913:         let list = [...guests];
1914: 
1915:         // Search
1916:         if (search.trim()) {
1917:           const q = search.toLowerCase();
1918:           list = list.filter(g =>
1919:             g.name?.toLowerCase().includes(q) ||
1920:             g.phone?.includes(q) ||
1921:             g.group_name?.toLowerCase().includes(q)
1922:           );
1923:         }
1924: 
1925:         // Status filter
1926:         if (filterStatus !== 'all') list = list.filter(g => g.status === filterStatus);
1927: 
1928:         // Group filter
1929:         if (filterGroup !== 'all') list = list.filter(g => g.group_name === filterGroup);
1930: 
1931:         // Sort
1932:         list.sort((a, b) => {
1933:           let va = a[sortBy], vb = b[sortBy];
1934:           if (typeof va === 'string') va = va.toLowerCase();
1935:           if (typeof vb === 'string') vb = vb.toLowerCase();
1936:           if (va < vb) return sortDir === 'asc' ? -1 : 1;
1937:           if (va > vb) return sortDir === 'asc' ? 1 : -1;
1938:           return 0;
1939:         });
1940: 
1941:         return list;
1942:       }, [guests, search, filterStatus, filterGroup, sortBy, sortDir]);
1943: 
1944:       const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
1945:       const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
1946: 
1947:       // Stats
1948:       const stats = useMemo(() => {
1949:         const total = guests.length;
1950:         const confirmed = guests.filter(g => g.status === 'confirmed').length;
1951:         const pending = guests.filter(g => g.status === 'pending').length;
1952:         const declined = guests.filter(g => g.status === 'declined').length;
1953:         const maybe = guests.filter(g => g.status === 'maybe').length;
1954:         const totalGuests = guests.reduce((sum, g) => sum + (g.confirmed_guests || 0), 0);
1955:         return { total, confirmed, pending, declined, maybe, totalGuests };
1956:       }, [guests]);
1957: 
1958:       // Unique groups
1959:       const groups = useMemo(() => {
1960:         const gs = [...new Set(guests.map(g => g.group_name).filter(Boolean))];
1961:         return gs.sort();
1962:       }, [guests]);
1963: 
1964:       // Existing phones for dup detection
1965:       const existingPhones = useMemo(() =>
1966:         guests.map(g => ({ id: g.id, phone: VALIDATION.normalizePhone(g.phone) }))
1967:       , [guests]);
1968: 
1969:       if (!event) return <NeedEventState />;
1970: 
1971:       // Sort handler
1972:       const handleSort = (col) => {
1973:         if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
1974:         else { setSortBy(col); setSortDir('asc'); }
1975:         setPage(1);
1976:       };
1977: 
1978:       // Selection
1979:       const toggleSelect = (id) => {
1980:         setSelected(s => {
1981:           const n = new Set(s);
1982:           n.has(id) ? n.delete(id) : n.add(id);
1983:           return n;
1984:         });
1985:       };
1986: 
1987:       const toggleSelectAll = () => {
1988:         if (selected.size === paginated.length) setSelected(new Set());
1989:         else setSelected(new Set(paginated.map(g => g.id)));
1990:       };
1991: 
1992:       // Add guest
1993:       // Generate secure RSVP token
1994:       const generateToken = () => {
1995:         const bytes = crypto.getRandomValues(new Uint8Array(24));
1996:         return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
1997:       };
1998: 
1999:       // Import from phone contacts (Contact Picker API)
2000:       const importFromContacts = async () => {
2001:         // Try Contact Picker API first (Chrome Android)
2002:         if ('contacts' in navigator && 'ContactsManager' in window) {
2003:           try {
2004:             const contacts = await navigator.contacts.select(
2005:               ['name', 'tel'],
2006:               { multiple: true }
2007:             );
2008:             if (!contacts || contacts.length === 0) return;
2009:             processImportedContacts(contacts.map(c => ({
2010:               name: (c.name && c.name[0]) || '',
2011:               phone: (c.tel && c.tel[0]) || '',
2012:             })));
2013:           } catch (err) {
2014:             if (err.name !== 'AbortError') {
2015:               addToast('שגיאה בייבוא אנשי קשר', 'error');
2016:             }
2017:           }
2018:         } else {
2019:           // Fallback: show paste dialog
2020:           setShowContactsPaste(true);
2021:         }
2022:       };
2023: 
2024:       const processImportedContacts = (rawContacts) => {
2025:         const spotsLeft = limits.guests - guests.length;
2026:         if (spotsLeft <= 0) {
2027:           addToast(`הגעתם למגבלת ${limits.guests} מוזמנים. שדרגו כדי להוסיף עוד.`, 'error');
2028:           setUpsellFeature('guests');
2029:           return;
2030:         }
2031: 
2032:         const toImport = rawContacts.slice(0, spotsLeft);
2033:         const existingPhones = new Set(guests.map(g => g.phone?.replace(/[\s\-()]/g, '')).filter(Boolean));
2034: 
2035:         const newGuests = [];
2036:         let skipped = 0;
2037:         for (const c of toImport) {
2038:           let name = (c.name || '').trim();
2039:           let phone = (c.phone || '').replace(/[\s\-()]/g, '');
2040:           if (!name && !phone) { skipped++; continue; }
2041:           if (phone.startsWith('+972')) phone = '0' + phone.slice(4);
2042:           if (existingPhones.has(phone)) { skipped++; continue; }
2043:           existingPhones.add(phone);
2044:           newGuests.push({
2045:             event_id: event.id,
2046:             name,
2047:             phone,
2048:             group_name: 'כללי',
2049:             expected_guests: 1,
2050:             rsvp_token: generateToken(),
2051:           });
2052:         }
2053: 
2054:         if (newGuests.length === 0) {
2055:           addToast(skipped > 0 ? `${skipped} אנשי קשר כבר קיימים ברשימה` : 'לא נמצאו אנשי קשר להוספה', 'error');
2056:           return;
2057:         }
2058: 
2059:         (async () => {
2060:           const { data, error } = await client.from('guests').insert(newGuests).select();
2061:           if (error) { addToast('שגיאה בייבוא: ' + error.message, 'error'); return; }
2062:           setGuests(prev => [...(data || []), ...prev]);
2063:           const msg = `${data?.length || 0} אנשי קשר יובאו בהצלחה ✓` + (skipped > 0 ? ` (${skipped} דולגו — כפילויות)` : '');
2064:           addToast(msg, 'success');
2065:           setShowContactsPaste(false);
2066:           setContactsPasteText('');
2067: 
2068:           if (rawContacts.length > spotsLeft) {
2069:             addToast(`רק ${spotsLeft} מתוך ${rawContacts.length} יובאו — מגבלת תוכנית`, 'error');
2070:           }
2071:         })();
2072:       };
2073: 
2074:       const handleContactsPaste = () => {
2075:         if (!contactsPasteText.trim()) return;
2076:         // Parse pasted text: each line is "name, phone" or "name\tphone" or just "name phone"
2077:         const lines = contactsPasteText.split('\n').filter(l => l.trim());
2078:         const contacts = lines.map(line => {
2079:           // Try tab, comma, or multiple spaces as separator
2080:           let parts = line.includes('\t') ? line.split('\t') : line.includes(',') ? line.split(',') : line.split(/\s{2,}/);
2081:           if (parts.length === 1) {
2082:             // Try to extract phone from the end
2083:             const phoneMatch = line.match(/(0[0-9]{9,10}|\\+972[0-9]{9,10})\s*$/);
2084:             if (phoneMatch) {
2085:               return { name: line.replace(phoneMatch[0], '').trim(), phone: phoneMatch[0].trim() };
2086:             }
2087:             return { name: line.trim(), phone: '' };
2088:           }
2089:           // Find which part looks like a phone
2090:           const phonePart = parts.find(p => /^[\d\+\-\s()]{7,}$/.test(p.trim()));
2091:           const namePart = parts.find(p => p !== phonePart) || parts[0];
2092:           return { name: (namePart || '').trim(), phone: (phonePart || '').trim() };
2093:         });
2094:         processImportedContacts(contacts);
2095:       };
2096: 
2097:       const handleAdd = async (form) => {
2098:         // Plan limit check
2099:         if (guests.length >= limits.guests) {
2100:           addToast(`תוכנית ${limits.label} מאפשרת עד ${limits.guests} מוזמנים. שדרגו לתוכנית גבוהה יותר.`, 'error');
2101:           setUpsellFeature('guests');
2102:           return;
2103:         }
2104:         const { data, error } = await client.from('guests').insert({
2105:           ...form,
2106:           event_id: event.id,
2107:           rsvp_token: generateToken(),
2108:         }).select().single();
2109: 
2110:         if (error) addToast('שגיאה בהוספת אורח: ' + error.message, 'error');
2111:         else {
2112:           setGuests(prev => [data, ...prev]);
2113:           setShowAdd(false);
2114:           addToast(`${form.name} נוסף בהצלחה ✓`, 'success');
2115:         }
2116:       };
2117: 
2118:       // Edit guest
2119:       const handleEdit = async (form) => {
2120:         const { data, error } = await client.from('guests').update(form).eq('id', editGuest.id).select().single();
2121:         if (error) addToast('שגיאה בעדכון אורח', 'error');
2122:         else {
2123:           setGuests(prev => prev.map(g => g.id === editGuest.id ? data : g));
2124:           setEditGuest(null);
2125:           addToast('עודכן בהצלחה ✓', 'success');
2126:         }
2127:       };
2128: 
2129:       // Delete
2130:       const handleDelete = async () => {
2131:         if (deleteTarget === 'bulk') {
2132:           const ids = [...selected];
2133:           const { error } = await client.from('guests').delete().in('id', ids);
2134:           if (error) addToast('שגיאה במחיקה', 'error');
2135:           else {
2136:             setGuests(prev => prev.filter(g => !ids.includes(g.id)));
2137:             setSelected(new Set());
2138:             setDeleteTarget(null);
2139:             addToast(`${ids.length} אורחים נמחקו`, 'success');
2140:           }
2141:         } else {
2142:           const { error } = await client.from('guests').delete().eq('id', deleteTarget.id);
2143:           if (error) addToast('שגיאה במחיקה', 'error');
2144:           else {
2145:             setGuests(prev => prev.filter(g => g.id !== deleteTarget.id));
2146:             setDeleteTarget(null);
2147:             addToast('האורח נמחק', 'success');
2148:           }
2149:         }
2150:       };
2151: 
2152:       // Status quick update
2153:       const handleStatusUpdate = async (guest, newStatus, newCount) => {
2154:         const update = { status: newStatus };
2155:         if (newCount !== undefined) update.confirmed_guests = newCount;
2156:         if (newStatus === 'declined') update.confirmed_guests = 0;
2157: 
2158:         const { data, error } = await client.from('guests').update(update).eq('id', guest.id).select().single();
2159:         if (!error) setGuests(prev => prev.map(g => g.id === guest.id ? data : g));
2160:       };
2161: 
2162:       // Bulk status
2163:       const handleBulkStatus = async (newStatus) => {
2164:         const ids = [...selected];
2165:         const { error } = await client.from('guests').update({ status: newStatus }).in('id', ids);
2166:         if (!error) {
2167:           setGuests(prev => prev.map(g => ids.includes(g.id) ? { ...g, status: newStatus } : g));
2168:           addToast(`סטטוס עודכן ל-${STATUS_CONFIG[newStatus].label} (${ids.length})`, 'success');
2169:           setSelected(new Set());
2170:         }
2171:       };
2172: 
2173:       // Bulk group
2174:       const handleBulkGroup = async () => {
2175:         if (!bulkGroupTarget) return;
2176:         const ids = [...selected];
2177:         const { error } = await client.from('guests').update({ group_name: bulkGroupTarget }).in('id', ids);
2178:         if (!error) {
2179:           setGuests(prev => prev.map(g => ids.includes(g.id) ? { ...g, group_name: bulkGroupTarget } : g));
2180:           addToast(`קבוצה עודכנה (${ids.length})`, 'success');
2181:           setSelected(new Set());
2182:           setShowBulkGroup(false);
2183:         }
2184:       };
2185: 
2186:       // Import guests in bulk
2187:       const handleImportBulk = async (rows) => {
2188:         if (!rows.length) return;
2189:         const rowsWithTokens = rows.map(row => ({
2190:           ...row,
2191:           rsvp_token: generateToken(),
2192:         }));
2193:         const { data, error } = await client.from('guests').insert(rowsWithTokens).select();
2194:         if (error) addToast('שגיאה בייבוא: ' + error.message, 'error');
2195:         else {
2196:           setGuests(prev => [...(data || []), ...prev]);
2197:           addToast(`${data?.length || 0} אורחים יובאו בהצלחה ✓`, 'success');
2198:         }
2199:       };
2200: 
2201:       // Export to Excel
2202:       const handleExport = () => {
2203:         const rows = filtered.map(g => ({
2204:           'שם': g.name,
2205:           'טלפון': g.phone || '',
2206:           'אימייל': g.email || '',
2207:           'קבוצה': g.group_name || '',
2208:           'סטטוס': STATUS_CONFIG[g.status]?.label || g.status,
2209:           'מוזמנים צפויים': g.expected_guests || 1,
2210:           'אישרו הגעה': g.confirmed_guests || 0,
2211:           'הערות תזונה': g.dietary_notes || '',
2212:           'הערות': g.notes || '',
2213:         }));
2214:         const ws = XLSX.utils.json_to_sheet(rows);
2215:         const wb = XLSX.utils.book_new();
2216:         XLSX.utils.book_append_sheet(wb, ws, 'מוזמנים');
2217:         XLSX.writeFile(wb, `מוזמנים_${event.name}_${new Date().toLocaleDateString('he-IL').replace(/\//g, '-')}.xlsx`);
2218:         addToast('הקובץ הורד בהצלחה ✓', 'success');
2219:       };
2220: 
2221:       const SortIcon = ({ col }) => {
2222:         if (sortBy !== col) return <Icon name="ArrowUpDown" size={12} style={{ opacity: 0.4, marginRight: 4 }} />;
2223:         return <Icon name={sortDir === 'asc' ? 'ArrowUp' : 'ArrowDown'} size={12} style={{ color: 'var(--accent)', marginRight: 4 }} />;
2224:       };
2225: 
2226:       return (
2227:         <div className="animate-slide-up">
2228:           {/* Header */}
2229:           <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
2230:             <div>
2231:               <div className="page-title">מוזמנים</div>
2232:               <div className="page-subtitle">{stats.total} מוזמנים · {stats.totalGuests} אישרו הגעה</div>
2233:             </div>
2234:             <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
2235:               <button className="btn btn-secondary" onClick={handleExport} title="ייצוא לאקסל" style={{ padding: '8px 10px', fontSize: 12 }}>
2236:                 <Icon name="Download" size={16} />
2237:                 ייצוא
2238:               </button>
2239:               <button className="btn btn-secondary" onClick={() => setShowImport(true)} title="ייבוא מאקסל" style={{ padding: '8px 10px', fontSize: 12 }}>
2240:                 <Icon name="Upload" size={16} />
2241:                 ייבוא
2242:               </button>
2243:               <button className="btn btn-secondary" onClick={importFromContacts} title="ייבוא מאנשי קשר" style={{ padding: '8px 10px', fontSize: 12 }}>
2244:                 <Icon name="BookUser" size={16} />
2245:                 אנשי קשר
2246:               </button>
2247:               <button
2248:                 className="btn btn-primary"
2249:                 onClick={() => {
2250:                   if (guests.length >= limits.guests) { setUpsellFeature('guests'); return; }
2251:                   setShowAdd(true);
2252:                 }}
2253:                 title={guests.length >= limits.guests ? `מגבלת ${limits.guests} מוזמנים (Free)` : 'הוספת אורח'}
2254:                 style={{ padding: '8px 10px', fontSize: 12 }}
2255:               >
2256:                 <Icon name="UserPlus" size={16} />
2257:                 הוספה
2258:                 {!isPro && guests.length >= limits.guests * 0.9 && <ProBadge style={{ marginRight: 4 }} />}
2259:               </button>
2260:             </div>
2261:           </div>
2262: 
2263:           {/* Plan limit bar */}
2264:           {!isPro && (
2265:             (() => {
2266:               const pct = Math.round((guests.length / limits.guests) * 100);
2267:               if (pct < 70) return null;
2268:               const danger = pct >= 100;
2269:               return (
2270:                 <div className={`plan-limit-bar ${danger ? 'danger' : ''}`}>
2271:                   <Icon name={danger ? 'AlertCircle' : 'Info'} size={16} style={{ color: danger ? 'var(--red-500)' : 'var(--gold-600)', flexShrink: 0 }} />
2272:                   <span style={{ flex: 1 }}>
2273:                     {danger ? `הגעתם למגבלה — ${guests.length}/${limits.guests} מוזמנים (Free)` : `${guests.length}/${limits.guests} מוזמנים — מתקרבים למגבלת Free`}
2274:                   </span>
2275:                   <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setUpsellFeature('guests')}>
2276:                     <Icon name="Zap" size={13} />שדרוג
2277:                   </button>
2278:                 </div>
2279:               );
2280:             })()
2281:           )}
2282: 
2283:           {/* Stats row */}
2284:           {stats.total > 0 && (
2285:             <div className="guests-stats-row animate-fade-in">
2286:               {[
2287:                 { value: stats.total, label: 'סה״כ', color: 'var(--text-primary)' },
2288:                 { value: stats.confirmed, label: 'מגיעים', color: 'var(--emerald-500)' },
2289:                 { value: stats.pending, label: 'ממתינים', color: 'var(--blue-500)' },
2290:                 { value: stats.maybe, label: 'אולי', color: 'var(--amber-500)' },
2291:                 { value: stats.declined, label: 'לא מגיעים', color: 'var(--red-500)' },
2292:                 { value: stats.totalGuests, label: 'נפשות בסה״כ', color: 'var(--accent)' },
2293:               ].map(s => (
2294:                 <div key={s.label} className="guests-stat">
2295:                   <div className="guests-stat-value" style={{ color: s.color }}>{s.value}</div>
2296:                   <div className="guests-stat-label">{s.label}</div>
2297:                 </div>
2298:               ))}
2299:             </div>
2300:           )}
2301: 
2302:           {/* Search + Filter */}
2303:           <div className="search-filter-bar">
2304:             <div className="search-wrapper" style={{ flex: 2 }}>
2305:               <span className="search-icon"><Icon name="Search" size={16} /></span>
2306:               <input
2307:                 className="search-input"
2308:                 placeholder="חיפוש לפי שם, טלפון, קבוצה..."
2309:                 value={searchInput}
2310:                 onChange={e => handleSearchChange(e.target.value)}
2311:               />
2312:             </div>
2313:             <select className="filter-select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
2314:               <option value="all">כל הסטטוסים</option>
2315:               <option value="pending">ממתין</option>
2316:               <option value="confirmed">מגיע</option>
2317:               <option value="declined">לא מגיע</option>
2318:               <option value="maybe">אולי</option>
2319:             </select>
2320:             {groups.length > 0 && (
2321:               <select className="filter-select" value={filterGroup} onChange={e => { setFilterGroup(e.target.value); setPage(1); }}>
2322:                 <option value="all">כל הקבוצות</option>
2323:                 {groups.map(g => <option key={g} value={g}>{g}</option>)}
2324:               </select>
2325:             )}
2326:           </div>
2327: 
2328:           {/* Bulk Actions Bar */}
2329:           {selected.size > 0 && (
2330:             <div className="bulk-bar">
2331:               <span className="bulk-bar-count">{selected.size} נבחרו</span>
2332:               <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
2333:                 {['confirmed', 'pending', 'declined', 'maybe'].map(s => (
2334:                   <button
2335:                     key={s}
2336:                     className="btn btn-secondary"
2337:                     style={{ padding: '6px 12px', fontSize: 12 }}
2338:                     onClick={() => handleBulkStatus(s)}
2339:                   >
2340:                     <Icon name={STATUS_CONFIG[s].icon} size={14} />
2341:                     {STATUS_CONFIG[s].label}
2342:                   </button>
2343:                 ))}
2344:                 {showBulkGroup ? (
2345:                   <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
2346:                     <select className="filter-select" style={{ fontSize: 12, padding: '6px 10px' }} value={bulkGroupTarget} onChange={e => setBulkGroupTarget(e.target.value)}>
2347:                       <option value="">בחר קבוצה</option>
2348:                       {['כללי','משפחה','חברים','עבודה','צד חתן','צד כלה','VIP'].map(g => <option key={g} value={g}>{g}</option>)}
2349:                     </select>
2350:                     <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={handleBulkGroup}>אשר</button>
2351:                     <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowBulkGroup(false)}>×</button>
2352:                   </div>
2353:                 ) : (
2354:                   <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setShowBulkGroup(true)}>
2355:                     <Icon name="Tag" size={14} />קבוצה
2356:                   </button>
2357:                 )}
2358:                 <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setDeleteTarget('bulk')}>
2359:                   <Icon name="Trash2" size={14} />מחק
2360:                 </button>
2361:               </div>
2362:               <button className="icon-btn" style={{ flexShrink: 0 }} onClick={() => setSelected(new Set())}><Icon name="X" size={16} /></button>
2363:             </div>
2364:           )}
2365: 
2366:           {/* Content */}
2367:           {loading ? (
2368:             <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
2369:               {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 60 }} />)}
2370:             </div>
2371:           ) : filtered.length === 0 ? (
2372:             <div className="empty-state">
2373:               <div className="empty-state-icon"><Icon name="Users" size={36} /></div>
2374:               <div className="empty-state-title">
2375:                 {guests.length === 0 ? 'רשימת המוזמנים ריקה' : 'לא נמצאו תוצאות'}
2376:               </div>
2377:               <div className="empty-state-text">
2378:                 {guests.length === 0
2379:                   ? 'הוסיפו אורחים ידנית או ייבאו מקובץ אקסל'
2380:                   : 'נסו לשנות את מסנני החיפוש'}
2381:               </div>
2382:               {guests.length === 0 && (
2383:                 <div style={{ display: 'flex', gap: 10 }}>
2384:                   <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
2385:                     <Icon name="UserPlus" size={18} />הוספה ידנית
2386:                   </button>
2387:                   <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
2388:                     <Icon name="FileSpreadsheet" size={18} />ייבוא מאקסל
2389:                   </button>
2390:                 </div>
2391:               )}
2392:             </div>
2393:           ) : (
2394:             <>
2395:               {/* Desktop Table */}
2396:               <div className="guests-table-wrapper" style={{ display: isMobile ? 'none' : 'block' }}>
2397:                 <table className="guests-table">
2398:                   <thead>
2399:                     <tr>
2400:                       <th style={{ width: 40 }}>
2401:                         <div
2402:                           className={`checkbox-custom ${selected.size === paginated.length && paginated.length > 0 ? 'checked' : ''}`}
2403:                           onClick={toggleSelectAll}
2404:                         >
2405:                           {selected.size === paginated.length && paginated.length > 0 && <Icon name="Check" size={12} style={{ color: 'var(--accent-text)' }} />}
2406:                         </div>
2407:                       </th>
2408:                       <th className={`sort-active-${sortBy === 'name'}`} onClick={() => handleSort('name')}>
2409:                         <span style={{ display: 'inline-flex', alignItems: 'center' }}><SortIcon col="name" />שם</span>
2410:                       </th>
2411:                       <th className="hide-mobile" onClick={() => handleSort('phone')}>
2412:                         <span style={{ display: 'inline-flex', alignItems: 'center' }}><SortIcon col="phone" />טלפון</span>
2413:                       </th>
2414:                       <th onClick={() => handleSort('group_name')}>
2415:                         <span style={{ display: 'inline-flex', alignItems: 'center' }}><SortIcon col="group_name" />קבוצה</span>
2416:                       </th>
2417:                       <th onClick={() => handleSort('status')}>
2418:                         <span style={{ display: 'inline-flex', alignItems: 'center' }}><SortIcon col="status" />סטטוס</span>
2419:                       </th>
2420:                       <th className="hide-mobile" onClick={() => handleSort('expected_guests')}>
2421:                         <span style={{ display: 'inline-flex', alignItems: 'center' }}><SortIcon col="expected_guests" />צפויים</span>
2422:                       </th>
2423:                       <th className="hide-mobile">מגיעים</th>
2424:                       <th style={{ width: 80 }}>פעולות</th>
2425:                     </tr>
2426:                   </thead>
2427:                   <tbody>
2428:                     {paginated.map(guest => (
2429:                       <tr key={guest.id} className={selected.has(guest.id) ? 'selected' : ''}>
2430:                         <td>
2431:                           <div
2432:                             className={`checkbox-custom ${selected.has(guest.id) ? 'checked' : ''}`}
2433:                             onClick={() => toggleSelect(guest.id)}
2434:                           >
2435:                             {selected.has(guest.id) && <Icon name="Check" size={12} style={{ color: 'var(--accent-text)' }} />}
2436:                           </div>
2437:                         </td>
2438:                         <td>
2439:                           <div className="guest-name-cell">{guest.name}</div>
2440:                           {guest.dietary_notes && (
2441:                             <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>🌿 {guest.dietary_notes}</div>
2442:                           )}
2443:                         </td>
2444:                         <td className="hide-mobile guest-phone-cell">{guest.phone || '—'}</td>
2445:                         <td>
2446:                           <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
2447:                             <span className="group-dot" style={{ background: getGroupColor(guest.group_name) }} />
2448:                             {guest.group_name || 'כללי'}
2449:                           </div>
2450:                         </td>
2451:                         <td>
2452:                           <StatusBadge
2453:                             status={guest.status}
2454:                             onClick={() => setStatusPopover(guest)}
2455:                           />
2456:                         </td>
2457:                         <td className="hide-mobile" style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>{guest.expected_guests || 1}</td>
2458:                         <td className="hide-mobile" style={{ textAlign: 'center', fontWeight: 600 }}>
2459:                           {guest.status === 'confirmed' ? (
2460:                             <span style={{ color: 'var(--emerald-500)' }}>{guest.confirmed_guests || 0}</span>
2461:                           ) : '—'}
2462:                         </td>
2463:                         <td>
2464:                           <div style={{ display: 'flex', gap: 2 }}>
2465:                             <button
2466:                               className="icon-btn"
2467:                               style={{ width: 30, height: 30 }}
2468:                               onClick={() => setEditGuest(guest)}
2469:                               title="עריכה"
2470:                             >
2471:                               <Icon name="Pencil" size={15} />
2472:                             </button>
2473:                             <button
2474:                               className="icon-btn"
2475:                               style={{ width: 30, height: 30, color: 'var(--red-400)' }}
2476:                               onClick={() => setDeleteTarget(guest)}
2477:                               title="מחיקה"
2478:                             >
2479:                               <Icon name="Trash2" size={15} />
2480:                             </button>
2481:                           </div>
2482:                         </td>
2483:                       </tr>
2484:                     ))}
2485:                   </tbody>
2486:                 </table>
2487:               </div>
2488: 
2489:               {/* Mobile Card View */}
2490:               <div style={{ display: isMobile ? 'flex' : 'none', flexDirection: 'column', gap: 10 }}>
2491:                 {paginated.map(guest => (
2492:                   <div
2493:                     key={guest.id}
2494:                     className={`guest-card-mobile ${selected.has(guest.id) ? 'selected' : ''}`}
2495:                     onClick={() => toggleSelect(guest.id)}
2496:                   >
2497:                     <div
2498:                       className={`checkbox-custom ${selected.has(guest.id) ? 'checked' : ''}`}
2499:                       style={{ marginTop: 2 }}
2500:                     >
2501:                       {selected.has(guest.id) && <Icon name="Check" size={12} style={{ color: 'var(--accent-text)' }} />}
2502:                     </div>
2503:                     <div className="guest-card-info">
2504:                       <div className="guest-card-name">{guest.name}</div>
2505:                       <div className="guest-card-meta">
2506:                         {guest.phone && <span>{guest.phone}</span>}
2507:                         <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
2508:                           <span className="group-dot" style={{ background: getGroupColor(guest.group_name) }} />
2509:                           {guest.group_name}
2510:                         </span>
2511:                         {guest.dietary_notes && <span>🌿</span>}
2512:                       </div>
2513:                     </div>
2514:                     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
2515:                       <StatusBadge status={guest.status} small onClick={e => { e.stopPropagation(); setStatusPopover(guest); }} />
2516:                       <div style={{ display: 'flex', gap: 2 }}>
2517:                         <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={e => { e.stopPropagation(); setEditGuest(guest); }}>
2518:                           <Icon name="Pencil" size={14} />
2519:                         </button>
2520:                         <button className="icon-btn" style={{ width: 28, height: 28, color: 'var(--red-400)' }} onClick={e => { e.stopPropagation(); setDeleteTarget(guest); }}>
2521:                           <Icon name="Trash2" size={14} />
2522:                         </button>
2523:                       </div>
2524:                     </div>
2525:                   </div>
2526:                 ))}
2527:               </div>
2528: 
2529:               {/* Pagination */}
2530:               {totalPages > 1 && (
2531:                 <div className="pagination">
2532:                   <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
2533:                     <Icon name="ChevronRight" size={16} />
2534:                   </button>
2535:                   {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
2536:                     let p;
2537:                     if (totalPages <= 5) p = i + 1;
2538:                     else if (page <= 3) p = i + 1;
2539:                     else if (page >= totalPages - 2) p = totalPages - 4 + i;
2540:                     else p = page - 2 + i;
2541:                     return (
2542:                       <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>
2543:                         {p}
2544:                       </button>
2545:                     );
2546:                   })}
2547:                   <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
2548:                     <Icon name="ChevronLeft" size={16} />
2549:                   </button>
2550:                   <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginRight: 8 }}>
2551:                     {filtered.length} תוצאות
2552:                   </span>
2553:                 </div>
2554:               )}
2555:             </>
2556:           )}
2557: 
2558:           {/* Modals */}
2559:           {showAdd && (
2560:             <GuestModal
2561:               eventId={event.id}
2562:               existingPhones={existingPhones}
2563:               onSave={handleAdd}
2564:               onClose={() => setShowAdd(false)}
2565:             />
2566:           )}
2567: 
2568:           {editGuest && (
2569:             <GuestModal
2570:               guest={editGuest}
2571:               eventId={event.id}
2572:               existingPhones={existingPhones}
2573:               onSave={handleEdit}
2574:               onClose={() => setEditGuest(null)}
2575:             />
2576:           )}
2577: 
2578:           {deleteTarget && (
2579:             <DeleteConfirmModal
2580:               count={deleteTarget === 'bulk' ? selected.size : 1}
2581:               onConfirm={handleDelete}
2582:               onClose={() => setDeleteTarget(null)}
2583:             />
2584:           )}
2585: 
2586:           {showImport && (
2587:             <ImportModal
2588:               eventId={event.id}
2589:               existingGuests={guests}
2590:               onImport={handleImportBulk}
2591:               onClose={() => setShowImport(false)}
2592:             />
2593:           )}
2594: 
2595:           {statusPopover && (
2596:             <StatusPopover
2597:               guest={statusPopover}
2598:               onUpdate={handleStatusUpdate}
2599:               onClose={() => setStatusPopover(null)}
2600:             />
2601:           )}
2602: 
2603:           {upsellFeature && <UpsellModal feature={upsellFeature} onClose={() => setUpsellFeature(null)} />}
2604: 
2605:           {/* Contacts paste modal (fallback when Contact Picker API unavailable) */}
2606:           {showContactsPaste && (
2607:             <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowContactsPaste(false)}>
2608:               <div className="modal-content animate-scale-in" style={{ maxWidth: 480 }}>
2609:                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
2610:                   <div className="modal-title">ייבוא מאנשי קשר</div>
2611:                   <button className="icon-btn" onClick={() => { setShowContactsPaste(false); setContactsPasteText(''); }}><Icon name="X" size={20} /></button>
2612:                 </div>
2613:                 <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.7 }}>
2614:                   הדפדפן שלכם לא תומך בבחירה ישירה מאנשי קשר.
2615:                   <br/>
2616:                   <strong>במקום — הדביקו רשימה כאן:</strong> כל שורה = איש קשר אחד.
2617:                   <br/>
2618:                   <span style={{ fontSize: 12 }}>פורמט: <code style={{ background: 'var(--bg-tertiary)', padding: '1px 4px', borderRadius: 3 }}>שם, טלפון</code> או <code style={{ background: 'var(--bg-tertiary)', padding: '1px 4px', borderRadius: 3 }}>שם  טלפון</code></span>
2619:                 </div>
2620:                 <textarea
2621:                   className="input-field"
2622:                   style={{ width: '100%', height: 160, fontSize: 13, fontFamily: 'Heebo, sans-serif', resize: 'vertical', direction: 'rtl' }}
2623:                   placeholder={`דוד כהן, 0501234567\nשרה לוי, 0521234567\nמשה ישראלי  0541234567`}
2624:                   value={contactsPasteText}
2625:                   onChange={e => setContactsPasteText(e.target.value)}
2626:                   autoFocus
2627:                 />
2628:                 <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6, marginBottom: 16 }}>
2629:                   💡 טיפ: אפשר להעתיק ישירות מאפליקציית אנשי הקשר, מאקסל, או מכל רשימה
2630:                 </div>
2631:                 <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
2632:                   <button className="btn btn-ghost" onClick={() => { setShowContactsPaste(false); setContactsPasteText(''); }}>ביטול</button>
2633:                   <button className="btn btn-primary" onClick={handleContactsPaste} disabled={!contactsPasteText.trim()}>
2634:                     <Icon name="UserPlus" size={18} />
2635:                     ייבוא {contactsPasteText.trim() ? `(${contactsPasteText.split('\n').filter(l => l.trim()).length})` : ''}
2636:                   </button>
2637:                 </div>
2638:               </div>
2639:             </div>
2640:           )}
2641:         </div>
2642:       );
2643:     }
2644: 
2645:     // ============================================
2646:     // Messages Page (Placeholder)
2647:     // ============================================
2648:     // ============================================
2649:     // Phase 2 — Messages Page
2650:     // ============================================
2651: 
2652:     // Default message templates — invitation image is sent separately, NOT as a link in the message
2653:     const DEFAULT_TEMPLATES = {
2654:       wedding: 'שלום {שם}! 🎉\nאנחנו שמחים להזמין אותך לחתונה שלנו!\n\n📅 {תאריך}\n📍 {מקום}\n\nלאישור הגעה:\n{לינק_rsvp}\n\nבברכה ♥',
2655:       bar_mitzvah: 'שלום {שם}! ✡️\nנשמח לחגוג איתך את שמחתנו!\n\n📅 {תאריך}\n📍 {מקום}\n\nלאישור הגעה:\n{לינק_rsvp}',
2656:       brit_mila: 'שלום {שם}! 👶\nבשעה טובה! נשמח לראותכם בברית!\n\n📅 {תאריך}\n📍 {מקום}\n\nלאישור הגעה:\n{לינק_rsvp}\n\nמזל טוב! 🎉',
2657:       brit_bat: 'שלום {שם}! 👶\nבשעה טובה! נשמח לראותכם בבריתה!\n\n📅 {תאריך}\n📍 {מקום}\n\nלאישור הגעה:\n{לינק_rsvp}\n\nמזל טוב! 🎉',
2658:       corporate: 'שלום {שם},\nהנך מוזמן/ת לאירוע:\n\n📅 {תאריך}\n📍 {מקום}\n\nלאישור הגעה:\n{לינק_rsvp}\n\nבברכה',
2659:       reminder: 'היי {שם} 👋\nרק רצינו לוודא — קיבלת את ההזמנה שלנו?\n\n📅 {תאריך} | 📍 {מקום}\n\nנשמח שתעדכן:\n{לינק_rsvp}\n\nתודה! ♥',
2660:       reminder_table: 'היי {שם} 👋\nתזכורת — האירוע שלנו מתקרב!\n\n📅 {תאריך}\n📍 {מקום}\n🪑 שולחן: {שולחן}\n\nנתראה שם! 🎉',
2661:       thank_you: 'היי {שם} 💕\nתודה ענקית שחגגתם איתנו!\nהיה מדהים לראות אתכם. מקווים שנהניתם! 🎊\n\nבאהבה ♥',
2662:     };
2663: 
2664:     function buildMessage(template, guest, event, tablesData) {
2665:       const tableName = (() => {
2666:         if (!guest.table_id || !tablesData) return '';
2667:         const t = tablesData.find(t => t.id === guest.table_id);
2668:         return t ? t.name : '';
2669:       })();
2670: 
2671:       let msg = template
2672:         .replace(/\{שם\}/g, guest.name || '')
2673:         .replace(/\{תאריך\}/g, event.event_date ? new Date(event.event_date).toLocaleDateString('he-IL') : '')
2674:         .replace(/\{מקום\}/g, event.venue_name || '')
2675:         .replace(/\{לינק_rsvp\}/g, guest.rsvp_token ? `https://avivmed3-tech.github.io/SeatSync/rsvp.html?token=${guest.rsvp_token}` : 'לינק יישלח בנפרד')
2676:         .replace(/\{שם_אירוע\}/g, event.name || '')
2677:         .replace(/\{שולחן\}/g, tableName || 'טרם הוקצה');
2678: 
2679:       // Clean up any leftover {לינק_הזמנה} from old templates
2680:       msg = msg.replace(/\{לינק_הזמנה\}\n\n/g, '');
2681:       msg = msg.replace(/\n\n\{לינק_הזמנה\}/g, '');
2682:       msg = msg.replace(/\{לינק_הזמנה\}/g, '');
2683: 
2684:       return msg.trim();
2685:     }
2686: 
2687:     // Share invitation image + message text together via Web Share API
2688:     // On mobile: opens share sheet with image file + text (user picks WhatsApp → sends both)
2689:     // On desktop: falls back to wa.me link (text only) since Web Share with files is not supported
2690:     async function shareInvitationWithMessage(imageUrl, messageText) {
2691:       try {
2692:         // Get cached image file
2693:         const file = await getInvitationFile(imageUrl);
2694: 
2695:         // Try Web Share API with file + text together
2696:         if (navigator.canShare && navigator.canShare({ files: [file] })) {
2697:           await navigator.share({
2698:             files: [file],
2699:             text: messageText,
2700:           });
2701:           return 'shared';
2702:         }
2703: 
2704:         return 'unsupported';
2705:       } catch (err) {
2706:         if (err.name === 'AbortError') return 'cancelled';
2707:         console.error('Share failed:', err);
2708:         return 'error';
2709:       }
2710:     }
2711: 
2712:     // Share image only (no text) — for cases where user wants separate messages
2713:     async function shareImageOnly(imageUrl) {
2714:       try {
2715:         const file = await getInvitationFile(imageUrl);
2716:         if (navigator.canShare && navigator.canShare({ files: [file] })) {
2717:           await navigator.share({ files: [file] });
2718:           return 'shared';
2719:         }
2720:         // Fallback: download
2721:         const url = URL.createObjectURL(file);
2722:         const a = document.createElement('a');
2723:         a.href = url;
2724:         a.download = file.name;
2725:         document.body.appendChild(a);
2726:         a.click();
2727:         document.body.removeChild(a);
2728:         URL.revokeObjectURL(url);
2729:         return 'downloaded';
2730:       } catch (err) {
2731:         if (err.name === 'AbortError') return 'cancelled';
2732:         return 'error';
2733:       }
2734:     }
2735: 
2736:     // Cache the invitation blob so we don't re-fetch for every guest
2737:     let _invitationCache = { url: null, file: null };
2738:     async function getInvitationFile(imageUrl) {
2739:       if (_invitationCache.url === imageUrl && _invitationCache.file) {
2740:         return _invitationCache.file;
2741:       }
2742:       const response = await fetch(imageUrl);
2743:       const blob = await response.blob();
2744:       const ext = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
2745:       const mimeType = blob.type || `image/${ext === 'png' ? 'png' : 'jpeg'}`;
2746:       const file = new File([blob], `invitation.${ext}`, { type: mimeType });
2747:       _invitationCache = { url: imageUrl, file };
2748:       return file;
2749:     }
2750: 
2751:     // Check if Web Share with files is supported
2752:     function canShareFiles() {
2753:       if (!navigator.canShare) return false;
2754:       try {
2755:         const testFile = new File(['test'], 'test.png', { type: 'image/png' });
2756:         return navigator.canShare({ files: [testFile] });
2757:       } catch { return false; }
2758:     }
2759: 
2760:     function buildWALink(phone, message) {
2761:       const raw = String(phone || '').replace(/[^0-9+]/g, '');
2762:       let intl = raw;
2763:       if (raw.startsWith('0')) intl = '+972' + raw.slice(1);
2764:       else if (!raw.startsWith('+')) intl = '+972' + raw;
2765:       return `https://wa.me/${intl.replace('+','')}?text=${encodeURIComponent(message)}`;
2766:     }
2767: 
2768:     // ============================================
2769:     // Bulk WhatsApp Sender — Auto-opens links with delay
2770:     // ============================================
2771:     function BulkWhatsAppSender({ recipients, buildLink, onSent, onAllDone }) {
2772:       const [sending, setSending] = useState(false);
2773:       const [currentIdx, setCurrentIdx] = useState(0);
2774:       const [paused, setPaused] = useState(false);
2775:       const [delay, setDelay] = useState(3); // seconds between sends
2776:       const [openedAll, setOpenedAll] = useState(false);
2777:       const timerRef = useRef(null);
2778:       const pausedRef = useRef(false);
2779:       const isMobile = useIsMobile();
2780: 
2781:       useEffect(() => { pausedRef.current = paused; }, [paused]);
2782: 
2783:       // ── Open ALL tabs at once (Desktop only) ──────────────────────────────
2784:       const openAllTabs = () => {
2785:         if (recipients.length === 0) return;
2786: 
2787:         // Modern browsers block multiple window.open unless triggered by user
2788:         // We open them in rapid succession — most browsers allow ~5-10 before blocking
2789:         // For larger lists we batch with a tiny delay
2790:         const BATCH = 8; // open 8 at a time to avoid popup blockers
2791:         let opened = 0;
2792: 
2793:         const openBatch = (startIdx) => {
2794:           const end = Math.min(startIdx + BATCH, recipients.length);
2795:           for (let i = startIdx; i < end; i++) {
2796:             const link = buildLink(recipients[i]);
2797:             window.open(link, `_whatsapp_${recipients[i].id}`);
2798:             onSent(recipients[i].id);
2799:             opened++;
2800:           }
2801:           if (end < recipients.length) {
2802:             // Small pause between batches so browser doesn't block
2803:             setTimeout(() => openBatch(end), 800);
2804:           } else {
2805:             setOpenedAll(true);
2806:             onAllDone();
2807:           }
2808:         };
2809: 
2810:         openBatch(0);
2811:       };
2812:       // ──────────────────────────────────────────────────────────────────────
2813: 
2814:       const startBulkSend = async () => {
2815:         setSending(true);
2816:         setCurrentIdx(0);
2817:         setPaused(false);
2818: 
2819:         for (let i = 0; i < recipients.length; i++) {
2820:           if (pausedRef.current) {
2821:             setCurrentIdx(i);
2822:             return;
2823:           }
2824: 
2825:           setCurrentIdx(i);
2826:           const guest = recipients[i];
2827:           const link = buildLink(guest);
2828:           window.open(link, '_blank');
2829:           onSent(guest.id);
2830: 
2831:           if (i < recipients.length - 1) {
2832:             await new Promise(resolve => {
2833:               timerRef.current = setTimeout(resolve, delay * 1000);
2834:             });
2835:           }
2836:         }
2837: 
2838:         setSending(false);
2839:         onAllDone();
2840:       };
2841: 
2842:       const stopSending = () => {
2843:         setPaused(true);
2844:         pausedRef.current = true;
2845:         if (timerRef.current) clearTimeout(timerRef.current);
2846:         setSending(false);
2847:       };
2848: 
2849:       const resumeSending = async () => {
2850:         setPaused(false);
2851:         pausedRef.current = false;
2852:         setSending(true);
2853: 
2854:         for (let i = currentIdx; i < recipients.length; i++) {
2855:           if (pausedRef.current) {
2856:             setCurrentIdx(i);
2857:             return;
2858:           }
2859: 
2860:           setCurrentIdx(i);
2861:           const guest = recipients[i];
2862:           const link = buildLink(guest);
2863:           window.open(link, '_blank');
2864:           onSent(guest.id);
2865: 
2866:           if (i < recipients.length - 1) {
2867:             await new Promise(resolve => {
2868:               timerRef.current = setTimeout(resolve, delay * 1000);
2869:             });
2870:           }
2871:         }
2872: 
2873:         setSending(false);
2874:         onAllDone();
2875:       };
2876: 
2877:       return (
2878:         <div style={{ background: 'linear-gradient(135deg, rgba(37,211,102,0.08), rgba(37,211,102,0.02))', border: '1.5px solid rgba(37,211,102,0.25)', borderRadius: 'var(--radius-md)', padding: 16 }}>
2879: 
2880:           {/* Desktop: Open all tabs button */}
2881:           {!isMobile && !sending && recipients.length > 0 && (
2882:             <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-sm)' }}>
2883:               <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
2884:                 <div style={{ flex: 1 }}>
2885:                   <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--blue-500)', marginBottom: 2 }}>
2886:                     🖥️ מצב Desktop — פתח הכל בטאבים
2887:                   </div>
2888:                   <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
2889:                     פותח {recipients.length} טאבים במקביל עם WhatsApp Web. לחצו שלח בכל טאב ← סגרו ← הבא.
2890:                     {recipients.length > 8 && ` (נפתח ב-${Math.ceil(recipients.length / 8)} סבבים של 8 בגלל הגנות הדפדפן)`}
2891:                   </div>
2892:                 </div>
2893:                 <button
2894:                   className="btn"
2895:                   style={{ background: 'var(--blue-500)', color: 'white', padding: '9px 18px', fontSize: 13, boxShadow: '0 2px 8px rgba(59,130,246,0.3)', flexShrink: 0 }}
2896:                   onClick={openAllTabs}
2897:                   title={`פתח את כל ${recipients.length} הטאבים`}
2898:                 >
2899:                   <Icon name="ExternalLink" size={16} />
2900:                   פתח {recipients.length} טאבים
2901:                 </button>
2902:               </div>
2903:               {openedAll && (
2904:                 <div style={{ marginTop: 8, fontSize: 12, color: 'var(--emerald-500)', fontWeight: 600 }}>
2905:                   ✓ כל הטאבים נפתחו — שלחו את ההודעה בכל אחד
2906:                 </div>
2907:               )}
2908:             </div>
2909:           )}
2910: 
2911:           {/* Sequential auto-send (works on mobile too) */}
2912:           <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
2913:             {!sending ? (
2914:               <>
2915:                 <button
2916:                   className="btn"
2917:                   style={{ background: '#25D366', color: 'white', padding: '10px 20px', boxShadow: '0 2px 8px rgba(37,211,102,0.3)' }}
2918:                   onClick={paused ? resumeSending : startBulkSend}
2919:                 >
2920:                   <Icon name={paused ? 'Play' : 'Zap'} size={18} />
2921:                   {paused
2922:                     ? `המשך (${recipients.length - currentIdx} נותרו)`
2923:                     : `שלח ${isMobile ? 'אחד-אחד' : 'ברצף'} (${recipients.length})`}
2924:                 </button>
2925:                 <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
2926:                   <span>השהייה:</span>
2927:                   <select
2928:                     className="filter-select"
2929:                     style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
2930:                     value={delay}
2931:                     onChange={e => setDelay(parseInt(e.target.value))}
2932:                   >
2933:                     <option value="2">2 שניות</option>
2934:                     <option value="3">3 שניות</option>
2935:                     <option value="5">5 שניות</option>
2936:                     <option value="8">8 שניות</option>
2937:                   </select>
2938:                 </div>
2939:               </>
2940:             ) : (
2941:               <>
2942:                 <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
2943:                   <Icon name="Loader" size={20} style={{ color: '#25D366', animation: 'spin 1s linear infinite' }} />
2944:                   <div>
2945:                     <div style={{ fontWeight: 700, fontSize: 14, color: '#128C7E' }}>שולח {currentIdx + 1} מתוך {recipients.length}...</div>
2946:                     <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{recipients[currentIdx]?.name}</div>
2947:                   </div>
2948:                 </div>
2949:                 <button className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }} onClick={stopSending}>
2950:                   <Icon name="Pause" size={16} />עצור
2951:                 </button>
2952:               </>
2953:             )}
2954:           </div>
2955:           <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
2956:             {isMobile
2957:               ? '📱 כל לחיצה פותחת WhatsApp עם ההודעה מוכנה — לחצו שלח וחזרו לאפליקציה'
2958:               : '🖥️ Desktop: השתמשו ב"פתח הכל בטאבים" לשליחה מהירה בו-זמנית דרך WhatsApp Web'}
2959:           </div>
2960:         </div>
2961:       );
2962:     }
2963: 
2964:     // ============================================
2965:     // Image Share Step — shares image + RSVP text together via Web Share API
2966:     // On mobile: one tap → share sheet → WhatsApp → image + text sent together
2967:     // On desktop: falls back to wa.me text link (no image) since Web Share files not supported
2968:     // ============================================
2969:     function ImageShareStep({ invitationUrl, recipients, sentSet, sentCount, onMarkSent, onMarkAllSent, addToast, event, tables, template }) {
2970:       const [sharing, setSharing] = useState(false);
2971:       const [sharingGuest, setSharingGuest] = useState(null);
2972:       const [imageReady, setImageReady] = useState(false);
2973:       const [shareSupported, setShareSupported] = useState(false);
2974:       const isMobile = useIsMobile();
2975: 
2976:       useEffect(() => {
2977:         setShareSupported(canShareFiles());
2978:         getInvitationFile(invitationUrl).then(() => setImageReady(true)).catch(() => setImageReady(false));
2979:       }, [invitationUrl]);
2980: 
2981:       const handleShare = async (guest) => {
2982:         setSharing(true);
2983:         setSharingGuest(guest.id);
2984:         const msg = buildMessage(template, guest, event, tables);
2985: 
2986:         if (shareSupported) {
2987:           // Mobile: share image + text together via Web Share
2988:           // Limitation: Web Share API cannot pre-select a contact — user must pick manually
2989:           // Optimization: we include the phone-specific wa.me link in the share text
2990:           // so after sharing the image, the user can tap the link to open the conversation
2991:           const result = await shareInvitationWithMessage(invitationUrl, msg);
2992:           if (result === 'shared') {
2993:             onMarkSent(guest.id);
2994:             addToast(`נשלח ל-${guest.name} ✓`, 'success');
2995:           } else if (result === 'cancelled') {
2996:             // User cancelled — offer direct wa.me fallback with text only
2997:             if (guest.phone) {
2998:               const waLink = buildWALink(guest.phone, msg);
2999:               window.open(waLink, '_blank');
3000:               setTimeout(() => {
3001:                 onMarkSent(guest.id);
3002:                 addToast(`טקסט נשלח ל-${guest.name} (בלי תמונה)`, 'info');
3003:               }, 1500);
3004:             }
3005:           } else {
3006:             addToast('שגיאה בשיתוף — נסו שוב', 'error');
3007:           }
3008:         } else {
3009:           // Desktop: open wa.me with text, image can't be sent programmatically
3010:           const waLink = buildWALink(guest.phone, msg);
3011:           window.open(waLink, '_blank');
3012:           setTimeout(() => onMarkSent(guest.id), 1500);
3013:         }
3014:         setSharing(false);
3015:         setSharingGuest(null);
3016:       };
3017: 
3018:       // Download image for desktop users to attach manually
3019:       const handleDownloadImage = async () => {
3020:         const result = await shareImageOnly(invitationUrl);
3021:         if (result === 'downloaded') addToast('התמונה הורדה — צרפו אותה ב-WhatsApp Web', 'info');
3022:         else if (result === 'shared') addToast('הזמנה שותפה ✓', 'success');
3023:       };
3024: 
3025:       const progress = recipients.length > 0 ? Math.round((sentCount / recipients.length) * 100) : 0;
3026: 
3027:       return (
3028:         <div>
3029:           {/* Progress */}
3030:           <div className="round-summary-card">
3031:             <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
3032:               <img src={invitationUrl} alt="הזמנה" style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid var(--border-default)' }} />
3033:               <div>
3034:                 <div style={{ fontWeight: 700, fontSize: 14 }}>שליחת הזמנה + הודעה</div>
3035:                 <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
3036:                   {shareSupported ? 'תמונה + טקסט נשלחים ביחד בהודעה אחת' : 'טקסט נשלח דרך WhatsApp Web'}
3037:                 </div>
3038:               </div>
3039:             </div>
3040:             <div className="round-stat">
3041:               <div className="round-stat-value" style={{ color: '#25D366' }}>{sentCount}</div>
3042:               <div className="round-stat-label">נשלחו</div>
3043:             </div>
3044:             <div style={{ flex: 1, minWidth: 100 }}>
3045:               <div className="send-progress"><div className="send-progress-bar" style={{ width: `${progress}%` }} /></div>
3046:               <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>{progress}%</div>
3047:             </div>
3048:             <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={onMarkAllSent}>סמן הכל</button>
3049:           </div>
3050: 
3051:           {/* Instructions */}
3052:           <div style={{ marginBottom: 12, padding: '10px 14px', background: shareSupported ? 'rgba(37,211,102,0.08)' : 'rgba(59,130,246,0.08)', border: `1px solid ${shareSupported ? 'rgba(37,211,102,0.2)' : 'rgba(59,130,246,0.2)'}`, borderRadius: 'var(--radius-sm)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
3053:             <span style={{ fontSize: 18, lineHeight: 1 }}>{shareSupported ? '📱' : '🖥️'}</span>
3054:             <div>
3055:               {shareSupported
3056:                 ? <>לחצו <strong>"שלח"</strong> — ייפתח חלון שיתוף עם <strong>התמונה + ההודעה ביחד</strong>. בחרו WhatsApp → בחרו את איש הקשר → שלחו. אחרי השליחה חזרו לכאן לאורח הבא.</>
3057:                 : <>בדסקטופ — לחצו <strong>"הורד הזמנה"</strong> פעם אחת, ואז <strong>"שלח"</strong> לכל אורח לפתיחת WhatsApp Web עם ההודעה. צרפו את התמונה ידנית.</>
3058:               }
3059:             </div>
3060:           </div>
3061: 
3062:           {/* Desktop: download image button */}
3063:           {!shareSupported && (
3064:             <div style={{ marginBottom: 14, display: 'flex', gap: 10 }}>
3065:               <button className="btn btn-secondary" onClick={handleDownloadImage} disabled={!imageReady}>
3066:                 <Icon name="Download" size={18} />הורד תמונת הזמנה (פעם אחת)
3067:               </button>
3068:               <BulkWhatsAppSender
3069:                 recipients={recipients.filter(g => !sentSet.has(g.id) && g.phone)}
3070:                 buildLink={(guest) => buildWALink(guest.phone, buildMessage(template, guest, event, tables))}
3071:                 onSent={(guestId) => onMarkSent(guestId)}
3072:                 onAllDone={() => addToast('כל ההודעות נפתחו! ✓', 'success')}
3073:               />
3074:             </div>
3075:           )}
3076: 
3077:           {/* Recipient list */}
3078:           <div className="recipient-list">
3079:             {recipients.map((guest, idx) => {
3080:               const isSent = sentSet.has(guest.id);
3081:               const isCurrentlySharing = sharingGuest === guest.id;
3082:               return (
3083:                 <div key={guest.id} className={`recipient-row ${isSent ? 'sent-row' : ''}`}>
3084:                   <div style={{ fontSize: 12, color: 'var(--text-tertiary)', minWidth: 24, textAlign: 'center', fontWeight: 700 }}>{idx + 1}</div>
3085:                   <div style={{ flex: 1, minWidth: 0 }}>
3086:                     <div style={{ fontWeight: 600, fontSize: 14 }}>{guest.name}</div>
3087:                     <div style={{ fontSize: 12, color: 'var(--text-secondary)', direction: 'ltr', textAlign: 'right' }}>{guest.phone || '—'}</div>
3088:                   </div>
3089:                   <StatusBadge status={guest.status} small />
3090:                   {isSent ? (
3091:                     <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--emerald-500)', fontSize: 13, fontWeight: 600 }}><Icon name="CheckCircle2" size={16} />נשלח</div>
3092:                   ) : (
3093:                     <div style={{ display: 'flex', gap: 6 }}>
3094:                       <button
3095:                         className="wa-link-btn"
3096:                         onClick={() => handleShare(guest)}
3097:                         disabled={sharing || !imageReady || (!guest.phone && !shareSupported)}
3098:                         style={{ opacity: (sharing && !isCurrentlySharing) ? 0.5 : 1 }}
3099:                       >
3100:                         {isCurrentlySharing
3101:                           ? <><Icon name="Loader" size={14} style={{ animation: 'spin 1s linear infinite' }} /> שולח...</>
3102:                           : <>{shareSupported ? '🖼️💬' : '💬'} שלח</>}
3103:                       </button>
3104:                       <button className="icon-btn" style={{ width: 32, height: 32, color: 'var(--emerald-500)' }} title="סמן כנשלח" onClick={() => onMarkSent(guest.id)}>
3105:                         <Icon name="Check" size={16} />
3106:                       </button>
3107:                     </div>
3108:                   )}
3109:                 </div>
3110:               );
3111:             })}
3112:           </div>
3113:         </div>
3114:       );
3115:     }
3116: 
3117:     function MessagesPage({ event }) {
3118:       const { client } = useContext(SupabaseContext);
3119:       const { addToast } = useContext(ToastContext);
3120:       const { limits, isPro } = useContext(PlanContext);
3121: 
3122:       const [guests, setGuests] = useState([]);
3123:       const [rounds, setRounds] = useState([]);
3124:       const [tables, setTables] = useState([]);
3125:       const [activeRound, setActiveRound] = useState(null);
3126:       const [loadingGuests, setLoadingGuests] = useState(true);
3127:       const [upsellFeature, setUpsellFeature] = useState(null);
3128: 
3129:       // Compose state
3130:       const [template, setTemplate] = useState('');
3131:       const [channel, setChannel] = useState('whatsapp');
3132:       const [recipientFilter, setRecipientFilter] = useState('all');
3133:       const [sentSet, setSentSet] = useState(() => {
3134:         // Restore sentSet from sessionStorage (survives app backgrounding on mobile)
3135:         try {
3136:           const saved = sessionStorage.getItem(`seatsync-sent-${event?.id}`);
3137:           if (saved) return new Set(JSON.parse(saved));
3138:         } catch {}
3139:         return new Set();
3140:       });
3141:       const [saving, setSaving] = useState(false);
3142:       const [selectedAction, setSelectedAction] = useState(null);
3143:       // Send mode: 'text_only' | 'image_then_text'
3144:       const [sendMode, setSendMode] = useState('text_only');
3145: 
3146:       // Persist sentSet to sessionStorage whenever it changes
3147:       useEffect(() => {
3148:         if (event?.id && sentSet.size > 0) {
3149:           try { sessionStorage.setItem(`seatsync-sent-${event.id}`, JSON.stringify([...sentSet])); } catch {}
3150:         }
3151:       }, [sentSet, event?.id]);
3152: 
3153:       // Restore view state from sessionStorage (so returning from WhatsApp keeps the send screen)
3154:       const [view, setView] = useState(() => {
3155:         try {
3156:           const savedView = sessionStorage.getItem(`seatsync-msg-view-${event?.id}`);
3157:           if (savedView === 'send' || savedView === 'compose') return savedView;
3158:         } catch {}
3159:         return 'actions';
3160:       });
3161: 
3162:       // Persist view to sessionStorage
3163:       useEffect(() => {
3164:         if (event?.id) {
3165:           try { sessionStorage.setItem(`seatsync-msg-view-${event.id}`, view); } catch {}
3166:         }
3167:       }, [view, event?.id]);
3168: 
3169:       const templateRef = useRef(null);
3170:       const invitationUrl = event?.settings?.invitation_url || '';
3171: 
3172:       // Restore template from session if available
3173:       useEffect(() => {
3174:         if (event?.id && !template) {
3175:           try {
3176:             const saved = sessionStorage.getItem(`seatsync-msg-tpl-${event.id}`);
3177:             if (saved) setTemplate(saved);
3178:           } catch {}
3179:         }
3180:       }, [event?.id]);
3181: 
3182:       // Persist template
3183:       useEffect(() => {
3184:         if (event?.id && template) {
3185:           try { sessionStorage.setItem(`seatsync-msg-tpl-${event.id}`, template); } catch {}
3186:         }
3187:       }, [template, event?.id]);
3188: 
3189:       useEffect(() => {
3190:         if (!client || !event?.id) return;
3191:         client.from('guests').select('id,name,phone,status,confirmed_guests,group_name,rsvp_token,table_id')
3192:           .eq('event_id', event.id)
3193:           .then(({ data }) => { setGuests(data || []); setLoadingGuests(false); });
3194:         client.from('message_rounds').select('*')
3195:           .eq('event_id', event.id)
3196:           .order('round_number', { ascending: false })
3197:           .then(({ data }) => { setRounds(data || []); });
3198:         client.from('tables').select('id,name')
3199:           .eq('event_id', event.id)
3200:           .then(({ data }) => { setTables(data || []); });
3201:         // Auto-set send mode based on invitation
3202:         if (event?.settings?.invitation_url) {
3203:           setSendMode('image_then_text');
3204:         }
3205:       }, [client, event?.id]);
3206: 
3207:       const recipients = useMemo(() => {
3208:         if (recipientFilter === 'all') return guests.filter(g => g.phone || g.rsvp_token);
3209:         return guests.filter(g => {
3210:           if (!g.phone && !g.rsvp_token) return false;
3211:           return g.status === recipientFilter;
3212:         });
3213:       }, [guests, recipientFilter]);
3214: 
3215:       if (!event) return <NeedEventState />;
3216: 
3217:       const insertVariable = (v) => {
3218:         const el = templateRef.current;
3219:         if (!el) return;
3220:         const start = el.selectionStart;
3221:         const end = el.selectionEnd;
3222:         const newVal = template.slice(0, start) + v + template.slice(end);
3223:         setTemplate(newVal);
3224:         setTimeout(() => { el.focus(); el.setSelectionRange(start + v.length, start + v.length); }, 10);
3225:       };
3226: 
3227:       const previewMessage = (guest) => buildMessage(template, guest, event, tables);
3228: 
3229:       const saveRound = async () => {
3230:         if (!template.trim()) return;
3231:         setSaving(true);
3232:         const roundNum = (rounds[0]?.round_number || 0) + 1;
3233:         // DB CHECK constraint allows: all, pending, maybe, declined, custom
3234:         // Map 'confirmed' to 'custom' for storage (we track real filter in local state)
3235:         const dbFilter = recipientFilter === 'confirmed' ? 'custom' : recipientFilter;
3236:         const { data, error } = await client.from('message_rounds').insert({
3237:           event_id: event.id,
3238:           round_number: roundNum,
3239:           message_template: template,
3240:           channel,
3241:           target_filter: dbFilter,
3242:           total_sent: 0,
3243:         }).select().single();
3244:         if (!error && data) {
3245:           setRounds(prev => [data, ...prev]);
3246:           setActiveRound(data);
3247:           setView('send');
3248:           setSentSet(new Set());
3249:           addToast(`סבב ${roundNum} נשמר ✓`, 'success');
3250:         } else {
3251:           console.error('saveRound error:', error);
3252:           addToast('שגיאה בשמירת הסבב: ' + (error?.message || 'שגיאה לא ידועה'), 'error');
3253:         }
3254:         setSaving(false);
3255:       };
3256: 
3257:       const markSent = async (guestId) => {
3258:         setSentSet(s => new Set([...s, guestId]));
3259:         if (activeRound) {
3260:           await client.from('message_rounds')
3261:             .update({ total_sent: (activeRound.total_sent || 0) + 1 })
3262:             .eq('id', activeRound.id);
3263:         }
3264:         await client.from('messages').insert({
3265:           event_id: event.id,
3266:           guest_id: guestId,
3267:           round_id: activeRound?.id || null,
3268:           channel,
3269:           message_text: template,
3270:           status: 'sent',
3271:         }).select();
3272:       };
3273: 
3274:       const markAllSent = () => {
3275:         setSentSet(new Set(recipients.map(g => g.id)));
3276:         addToast(`סומנו ${recipients.length} הודעות כנשלחו ✓`, 'success');
3277:       };
3278: 
3279:       const sentCount = recipients.filter(g => sentSet.has(g.id)).length;
3280:       const sendProgress = recipients.length > 0 ? Math.round((sentCount / recipients.length) * 100) : 0;
3281: 
3282:       const VARIABLES = ['{שם}', '{תאריך}', '{מקום}', '{לינק_rsvp}', '{שם_אירוע}', '{שולחן}'];
3283:       const FILTER_OPTIONS = [
3284:         { key: 'all',      label: 'כולם',       count: guests.filter(g => g.phone || g.rsvp_token).length },
3285:         { key: 'pending',  label: 'ממתינים',    count: guests.filter(g => g.status === 'pending').length },
3286:         { key: 'maybe',    label: 'אולי',        count: guests.filter(g => g.status === 'maybe').length },
3287:         { key: 'declined', label: 'לא מגיעים',  count: guests.filter(g => g.status === 'declined').length },
3288:         { key: 'confirmed',label: 'מגיעים',     count: guests.filter(g => g.status === 'confirmed').length },
3289:       ];
3290: 
3291:       const handleQuickAction = (action) => {
3292:         setSelectedAction(action);
3293:         setSentSet(new Set());
3294:         switch (action) {
3295:           case 'invite':
3296:             setTemplate(DEFAULT_TEMPLATES[event.event_type] || DEFAULT_TEMPLATES.wedding);
3297:             setRecipientFilter('all');
3298:             setSendMode(invitationUrl ? 'image_then_text' : 'text_only');
3299:             break;
3300:           case 'reminder':
3301:             setTemplate(DEFAULT_TEMPLATES.reminder);
3302:             setRecipientFilter('pending');
3303:             setSendMode('text_only');
3304:             break;
3305:           case 'reminder_table':
3306:             setTemplate(DEFAULT_TEMPLATES.reminder_table);
3307:             setRecipientFilter('confirmed');
3308:             setSendMode('text_only');
3309:             break;
3310:           case 'thank_you':
3311:             setTemplate(DEFAULT_TEMPLATES.thank_you);
3312:             setRecipientFilter('confirmed');
3313:             setSendMode('text_only');
3314:             break;
3315:           case 'custom':
3316:             setTemplate('');
3317:             setRecipientFilter('all');
3318:             setSendMode('text_only');
3319:             break;
3320:         }
3321:         setChannel('whatsapp');
3322:         setView('compose');
3323:       };
3324: 
3325:       const QUICK_ACTIONS = [
3326:         { key: 'invite', icon: '🎉', label: 'שלח הזמנות', sub: invitationUrl ? 'תמונה + הודעה' : 'לכל המוזמנים', bg: 'rgba(37,211,102,0.1)' },
3327:         { key: 'reminder', icon: '🔔', label: 'תזכורת', sub: 'למי שלא אישר', bg: 'rgba(59,130,246,0.1)' },
3328:         { key: 'reminder_table', icon: '🪑', label: 'תזכורת+שולחן', sub: 'למגיעים עם שולחן', bg: 'rgba(245,158,11,0.1)' },
3329:         { key: 'thank_you', icon: '💕', label: 'תודה', sub: 'לכל מי שהגיע', bg: 'rgba(244,114,182,0.1)' },
3330:       ];
3331: 
3332:       return (
3333:         <div className="animate-slide-up">
3334:           <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
3335:             <div>
3336:               <div className="page-title">הודעות</div>
3337:               <div className="page-subtitle">שליחת הזמנות, תזכורות ותודות</div>
3338:             </div>
3339:             <div className="view-mode-tabs">
3340:               {[
3341:                 { v: 'actions', icon: 'Zap', label: 'פעולות' },
3342:                 { v: 'compose', icon: 'PenLine', label: 'עריכה' },
3343:                 { v: 'send', icon: 'Send', label: 'שליחה' },
3344:                 { v: 'history', icon: 'History', label: 'היסטוריה' },
3345:               ].map(m => (
3346:                 <button key={m.v} className={`view-mode-btn ${view === m.v ? 'active' : ''}`} onClick={() => setView(m.v)}>
3347:                   <Icon name={m.icon} size={14} />{m.label}
3348:                 </button>
3349:               ))}
3350:             </div>
3351:           </div>
3352: 
3353:           {/* ── QUICK ACTIONS VIEW ── */}
3354:           {view === 'actions' && (
3355:             <div>
3356:               <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>מה תרצו לשלוח?</div>
3357:               <div className="quick-actions-grid">
3358:                 {QUICK_ACTIONS.map(a => (
3359:                   <div key={a.key} className="quick-action-card" onClick={() => handleQuickAction(a.key)}>
3360:                     <div className="quick-action-icon" style={{ background: a.bg }}>{a.icon}</div>
3361:                     <div className="quick-action-label">{a.label}</div>
3362:                     <div className="quick-action-sub">{a.sub}</div>
3363:                   </div>
3364:                 ))}
3365:               </div>
3366: 
3367:               <div className="card" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }} onClick={() => handleQuickAction('custom')}>
3368:                 <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
3369:                   <Icon name="PenLine" size={20} style={{ color: 'var(--accent)' }} />
3370:                 </div>
3371:                 <div style={{ flex: 1 }}>
3372:                   <div style={{ fontWeight: 700, fontSize: 14 }}>הודעה מותאמת אישית</div>
3373:                   <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>כתבו תבנית חופשית ובחרו נמענים</div>
3374:                 </div>
3375:                 <Icon name="ChevronLeft" size={18} style={{ color: 'var(--text-tertiary)' }} />
3376:               </div>
3377: 
3378:               {rounds.length > 0 && (
3379:                 <div style={{ marginTop: 20 }}>
3380:                   <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>סבבים קודמים</div>
3381:                   <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
3382:                     {rounds.slice(0, 3).map(r => (
3383:                       <div key={r.id} className="card" style={{ padding: 14 }}>
3384:                         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
3385:                           <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
3386:                             <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: 'var(--accent)' }}>{r.round_number}</div>
3387:                             <div>
3388:                               <div style={{ fontWeight: 600, fontSize: 13 }}>סבב {r.round_number}</div>
3389:                               <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{new Date(r.sent_at).toLocaleDateString('he-IL')} · {r.total_sent || 0} נשלחו</div>
3390:                             </div>
3391:                           </div>
3392:                           <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => { setActiveRound(r); setTemplate(r.message_template); setChannel(r.channel || 'whatsapp'); setRecipientFilter(r.target_filter || 'all'); setView('send'); setSentSet(new Set()); }}>
3393:                             <Icon name="RotateCw" size={14} />שלח שוב
3394:                           </button>
3395:                         </div>
3396:                       </div>
3397:                     ))}
3398:                     {rounds.length > 3 && <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => setView('history')}>הצג הכל →</button>}
3399:                   </div>
3400:                 </div>
3401:               )}
3402:             </div>
3403:           )}
3404: 
3405:           {/* Round tabs — compose/send views */}
3406:           {(view === 'compose' || view === 'send') && (
3407:             <div className="round-tabs">
3408:               <button className={`round-tab ${activeRound === null ? 'active' : ''}`} onClick={() => { if (!isPro && rounds.length >= limits.messageRounds) { setUpsellFeature('messageRounds'); return; } setActiveRound(null); setView('compose'); }}>
3409:                 <Icon name="Plus" size={14} />סבב חדש
3410:                 {!isPro && rounds.length >= limits.messageRounds && <ProBadge style={{ marginRight: 4 }} />}
3411:               </button>
3412:               {rounds.map(r => (
3413:                 <button key={r.id} className={`round-tab ${activeRound?.id === r.id ? 'active' : ''}`} onClick={() => { setActiveRound(r); setView('send'); setTemplate(r.message_template); setChannel(r.channel || 'whatsapp'); setRecipientFilter(r.target_filter || 'all'); setSentSet(new Set()); }}>
3414:                   <Icon name="MessageSquare" size={13} />סבב {r.round_number} <span style={{ fontSize: 11, opacity: 0.8 }}>({r.total_sent || 0})</span>
3415:                 </button>
3416:               ))}
3417:             </div>
3418:           )}
3419: 
3420:           {(view === 'compose' || view === 'send') && !isPro && rounds.length >= limits.messageRounds && activeRound !== null && (
3421:             <div className="plan-limit-bar">
3422:               <Icon name="Info" size={16} style={{ color: 'var(--gold-600)', flexShrink: 0 }} />
3423:               <span style={{ flex: 1 }}>תוכנית Free מאפשרת סבב הודעות אחד בלבד</span>
3424:               <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setUpsellFeature('messageRounds')}><Icon name="Zap" size={13} />שדרוג</button>
3425:             </div>
3426:           )}
3427: 
3428:           {/* ── COMPOSE VIEW ── */}
3429:           {view === 'compose' && (
3430:             <div style={{ display: 'grid', gap: 16 }}>
3431:               {selectedAction && (
3432:                 <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
3433:                   <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => { setView('actions'); setSelectedAction(null); }}>
3434:                     <Icon name="ArrowRight" size={16} />חזרה
3435:                   </button>
3436:                   <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
3437:                     {selectedAction === 'invite' && '🎉 שליחת הזמנות'}
3438:                     {selectedAction === 'reminder' && '🔔 שליחת תזכורת'}
3439:                     {selectedAction === 'reminder_table' && '🪑 תזכורת + שולחן'}
3440:                     {selectedAction === 'thank_you' && '💕 הודעת תודה'}
3441:                     {selectedAction === 'custom' && '✏️ הודעה מותאמת'}
3442:                   </span>
3443:                 </div>
3444:               )}
3445: 
3446:               {/* Send mode — image first? */}
3447:               {invitationUrl && (
3448:                 <div className="card">
3449:                   <div className="card-title" style={{ marginBottom: 12 }}>מצב שליחה</div>
3450:                   <div className="send-mode-grid">
3451:                     <div className={`send-mode-btn ${sendMode === 'image_then_text' ? 'active' : ''}`} onClick={() => setSendMode('image_then_text')}>
3452:                       <span style={{ fontSize: 20 }}>🖼️ → 💬</span>
3453:                       <span style={{ fontWeight: 700 }}>קודם הזמנה, אח"כ הודעה</span>
3454:                       <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400 }}>שלחו תמונת ההזמנה + אח"כ הודעה עם לינק RSVP</span>
3455:                     </div>
3456:                     <div className={`send-mode-btn ${sendMode === 'text_only' ? 'active' : ''}`} onClick={() => setSendMode('text_only')}>
3457:                       <span style={{ fontSize: 20 }}>💬</span>
3458:                       <span style={{ fontWeight: 700 }}>הודעה בלבד</span>
3459:                       <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400 }}>ההזמנה תוצג בדף ה-RSVP</span>
3460:                     </div>
3461:                   </div>
3462:                 </div>
3463:               )}
3464: 
3465:               {/* Channel */}
3466:               <div className="card">
3467:                 <div className="card-title" style={{ marginBottom: 12 }}>ערוץ שליחה</div>
3468:                 <div style={{ display: 'flex', gap: 10 }}>
3469:                   <button className={`channel-btn ${channel === 'whatsapp' ? 'active-wa' : ''}`} onClick={() => setChannel('whatsapp')}>
3470:                     <span style={{ fontSize: 22 }}>💬</span><span>WhatsApp</span><span style={{ fontSize: 11, opacity: 0.7 }}>חינמי</span>
3471:                   </button>
3472:                   <button className={`channel-btn ${channel === 'rsvp' ? 'active-rsvp' : ''}`} onClick={() => { if (!isPro) { setUpsellFeature('rsvpLink'); return; } setChannel('rsvp'); }} style={!isPro ? { opacity: 0.7 } : {}}>
3473:                     <Icon name="Link" size={20} /><span>RSVP Link</span>{isPro ? <span style={{ fontSize: 11, opacity: 0.7 }}>ללא הודעה</span> : <ProBadge />}
3474:                   </button>
3475:                 </div>
3476:               </div>
3477: 
3478:               {/* Recipient filter */}
3479:               <div className="card">
3480:                 <div className="card-title" style={{ marginBottom: 12 }}>נמענים</div>
3481:                 <div className="filter-chips">
3482:                   {FILTER_OPTIONS.map(f => (
3483:                     <button key={f.key} className={`filter-chip ${recipientFilter === f.key ? 'active' : ''}`} onClick={() => setRecipientFilter(f.key)}>{f.label} ({f.count})</button>
3484:                   ))}
3485:                 </div>
3486:                 <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
3487:                   <Icon name="Users" size={14} style={{ display: 'inline', marginLeft: 4 }} />{recipients.length} נמענים נבחרו
3488:                 </div>
3489:               </div>
3490: 
3491:               {/* Template */}
3492:               <div className="card">
3493:                 <div className="card-title" style={{ marginBottom: 12 }}>תבנית הודעה</div>
3494:                 <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
3495:                   {[
3496:                     { key: 'wedding', label: '💒 חתונה' },
3497:                     { key: 'brit_mila', label: '👶 ברית' },
3498:                     { key: 'reminder', label: '🔔 תזכורת' },
3499:                     { key: 'reminder_table', label: '🪑 תזכורת+שולחן' },
3500:                     { key: 'thank_you', label: '💕 תודה' },
3501:                     { key: 'corporate', label: '🏢 עסקי' },
3502:                   ].map(t => (
3503:                     <button key={t.key} className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setTemplate(DEFAULT_TEMPLATES[t.key])}>{t.label}</button>
3504:                   ))}
3505:                 </div>
3506:                 <textarea ref={templateRef} className="template-textarea" value={template} onChange={e => setTemplate(e.target.value)} placeholder="כתבו את תבנית ההודעה כאן..." />
3507:                 <div className="variable-chips">
3508:                   <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 4 }}>הוסף משתנה:</span>
3509:                   {VARIABLES.map(v => (
3510:                     <button key={v} className="variable-chip" onClick={() => insertVariable(v)}>{v}</button>
3511:                   ))}
3512:                 </div>
3513:               </div>
3514: 
3515:               {/* Preview */}
3516:               {template && guests.length > 0 && (
3517:                 <div className="card">
3518:                   <div className="card-title" style={{ marginBottom: 12 }}>תצוגה מקדימה</div>
3519:                   {sendMode === 'image_then_text' && invitationUrl && (
3520:                     <div style={{ marginBottom: 12, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
3521:                       <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>שלב 1 — תמונת ההזמנה:</div>
3522:                       <img src={invitationUrl} alt="הזמנה" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', objectFit: 'contain' }} />
3523:                       <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>↓ שלב 2 — ההודעה:</div>
3524:                     </div>
3525:                   )}
3526:                   <div className="message-preview-box">
3527:                     <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>הודעה לדוגמה עבור: {guests[0]?.name}</div>
3528:                     <div className="message-bubble">{previewMessage(guests[0])}</div>
3529:                     <div className="message-bubble-time">עכשיו ✓✓</div>
3530:                   </div>
3531:                 </div>
3532:               )}
3533: 
3534:               <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
3535:                 <button className="btn btn-ghost" onClick={() => setTemplate('')}>נקה</button>
3536:                 <button className="btn btn-primary" onClick={saveRound} disabled={saving || !template.trim()}>
3537:                   <Icon name="ArrowLeft" size={18} />{saving ? 'שומר...' : `המשך לשליחה (${recipients.length})`}
3538:                 </button>
3539:               </div>
3540:             </div>
3541:           )}
3542: 
3543:           {/* ── SEND VIEW ── */}
3544:           {view === 'send' && (
3545:             <div>
3546:               {/* When invitation image exists and sendMode is image_then_text: use ImageShareStep */}
3547:               {sendMode === 'image_then_text' && invitationUrl && (
3548:                 <ImageShareStep
3549:                   invitationUrl={invitationUrl}
3550:                   recipients={recipients}
3551:                   sentSet={sentSet}
3552:                   sentCount={sentCount}
3553:                   onMarkSent={markSent}
3554:                   onMarkAllSent={markAllSent}
3555:                   addToast={addToast}
3556:                   event={event}
3557:                   tables={tables}
3558:                   template={template}
3559:                 />
3560:               )}
3561: 
3562:               {/* Text-only mode — regular wa.me flow */}
3563:               {(sendMode === 'text_only' || !invitationUrl) && (
3564:                 <div>
3565:                   {/* Sticky progress header */}
3566:                   <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-primary)', paddingBottom: 8 }}>
3567:                     <div className="round-summary-card" style={{ marginBottom: 8 }}>
3568:                       <div className="round-stat">
3569:                         <div className="round-stat-value" style={{ color: 'var(--accent)' }}>{recipients.length}</div>
3570:                         <div className="round-stat-label">נמענים</div>
3571:                       </div>
3572:                       <div className="round-stat">
3573:                         <div className="round-stat-value" style={{ color: '#25D366' }}>{sentCount}</div>
3574:                         <div className="round-stat-label">נשלחו</div>
3575:                       </div>
3576:                       <div className="round-stat">
3577:                         <div className="round-stat-value" style={{ color: 'var(--text-secondary)' }}>{recipients.length - sentCount}</div>
3578:                         <div className="round-stat-label">נותרו</div>
3579:                       </div>
3580:                       <div style={{ flex: 1, minWidth: 120 }}>
3581:                         <div className="send-progress"><div className="send-progress-bar" style={{ width: `${sendProgress}%` }} /></div>
3582:                         <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>{sendProgress}% הושלם</div>
3583:                       </div>
3584:                     </div>
3585:                     <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
3586:                       <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={markAllSent}>סמן הכל כנשלח</button>
3587:                       {sentCount > 0 && (
3588:                         <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => { setSentSet(new Set()); if (event?.id) try { sessionStorage.removeItem(`seatsync-sent-${event.id}`); } catch {} addToast('התקדמות אופסה', 'success'); }}>
3589:                           <Icon name="RotateCcw" size={14} /> אפס התקדמות
3590:                         </button>
3591:                       )}
3592:                     </div>
3593:                     {sendProgress === 100 && (
3594:                       <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 10 }}>
3595:                         <Icon name="PartyPopper" size={20} style={{ color: 'var(--emerald-500)' }} />
3596:                         <div style={{ flex: 1 }}>
3597:                           <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--emerald-500)' }}>כל ההודעות נשלחו! 🎉</div>
3598:                           <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>נשלחו {sentCount} הודעות בסבב הזה</div>
3599:                         </div>
3600:                         <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => { setView('actions'); if (event?.id) try { sessionStorage.removeItem(`seatsync-sent-${event.id}`); sessionStorage.removeItem(`seatsync-msg-view-${event.id}`); } catch {} }}>
3601:                           סיים
3602:                         </button>
3603:                       </div>
3604:                     )}
3605:                   </div>
3606: 
3607:                   {channel === 'whatsapp' && (
3608:                     <div style={{ padding: '10px 14px', background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: '#128C7E', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
3609:                       <span style={{ fontSize: 18, lineHeight: 1 }}>💡</span>
3610:                       <div>לחצו על <strong>"שלח"</strong> ליד כל אורח — WhatsApp ייפתח עם ההודעה מוכנה. אחרי השליחה חזרו לכאן — ההתקדמות נשמרת.</div>
3611:                     </div>
3612:                   )}
3613: 
3614:                   {channel === 'whatsapp' && recipients.length > 0 && sentCount < recipients.length && (
3615:                     <div style={{ marginBottom: 14 }}>
3616:                       <BulkWhatsAppSender
3617:                         recipients={recipients.filter(g => !sentSet.has(g.id) && g.phone)}
3618:                         buildLink={(guest) => buildWALink(guest.phone, previewMessage(guest))}
3619:                         onSent={(guestId) => markSent(guestId)}
3620:                         onAllDone={() => addToast('כל ההודעות נפתחו ב-WhatsApp! ✓', 'success')}
3621:                       />
3622:                     </div>
3623:                   )}
3624: 
3625:                   <div className="filter-chips" style={{ marginBottom: 12 }}>
3626:                     {FILTER_OPTIONS.map(f => (
3627:                       <button key={f.key} className={`filter-chip ${recipientFilter === f.key ? 'active' : ''}`} onClick={() => setRecipientFilter(f.key)}>{f.label} ({f.count})</button>
3628:                     ))}
3629:                   </div>
3630: 
3631:                   {loadingGuests ? (
3632:                     <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 56 }} />)}</div>
3633:                   ) : recipients.length === 0 ? (
3634:                     <div className="empty-state" style={{ padding: 40 }}>
3635:                       <div className="empty-state-icon"><Icon name="UserX" size={32} /></div>
3636:                       <div className="empty-state-title">אין נמענים</div>
3637:                       <div className="empty-state-text">שנו את הפילטר או הוסיפו מוזמנים עם מספר טלפון</div>
3638:                     </div>
3639:                   ) : (
3640:                     <div className="recipient-list">
3641:                       {/* Sort: unsent first, then sent */}
3642:                       {[...recipients].sort((a, b) => {
3643:                         const aSent = sentSet.has(a.id) ? 1 : 0;
3644:                         const bSent = sentSet.has(b.id) ? 1 : 0;
3645:                         return aSent - bSent;
3646:                       }).map((guest, idx) => {
3647:                         const isSent = sentSet.has(guest.id);
3648:                         const msg = previewMessage(guest);
3649:                         const waLink = buildWALink(guest.phone, msg);
3650:                         return (
3651:                           <div key={guest.id} className={`recipient-row ${isSent ? 'sent-row' : ''}`}>
3652:                             <div style={{ fontSize: 12, color: isSent ? 'var(--emerald-500)' : 'var(--text-tertiary)', minWidth: 24, textAlign: 'center', fontWeight: 700 }}>{isSent ? '✓' : idx + 1}</div>
3653:                             <div style={{ flex: 1, minWidth: 0 }}>
3654:                               <div style={{ fontWeight: 600, fontSize: 14 }}>{guest.name}</div>
3655:                               <div style={{ fontSize: 12, color: 'var(--text-secondary)', direction: 'ltr', textAlign: 'right' }}>{guest.phone || '—'}</div>
3656:                             </div>
3657:                             <StatusBadge status={guest.status} small />
3658:                             {isSent ? (
3659:                               <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--emerald-500)', fontSize: 13, fontWeight: 600 }}><Icon name="CheckCircle2" size={16} />נשלח</div>
3660:                             ) : (
3661:                               <div style={{ display: 'flex', gap: 6 }}>
3662:                                 {channel === 'whatsapp' && guest.phone && (
3663:                                   <a href={waLink} target="_blank" rel="noopener noreferrer" className="wa-link-btn" onClick={() => setTimeout(() => markSent(guest.id), 1500)}>💬 שלח</a>
3664:                                 )}
3665:                                 {channel === 'rsvp' && guest.rsvp_token && (
3666:                                   <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => { navigator.clipboard?.writeText(`https://avivmed3-tech.github.io/SeatSync/rsvp.html?token=${guest.rsvp_token}`); markSent(guest.id); addToast('לינק הועתק ✓', 'success'); }}>
3667:                                     <Icon name="Copy" size={14} />העתק לינק
3668:                                   </button>
3669:                                 )}
3670:                                 <button className="icon-btn" style={{ width: 32, height: 32, color: 'var(--emerald-500)' }} title="סמן כנשלח" onClick={() => markSent(guest.id)}><Icon name="Check" size={16} /></button>
3671:                               </div>
3672:                             )}
3673:                           </div>
3674:                         );
3675:                       })}
3676:                     </div>
3677:                   )}
3678:                 </div>
3679:               )}
3680: 
3681:             </div>
3682:           )}
3683: 
3684:           {/* ── HISTORY VIEW ── */}
3685:           {view === 'history' && (
3686:             <div>
3687:               {rounds.length === 0 ? (
3688:                 <div className="empty-state" style={{ padding: 40 }}>
3689:                   <div className="empty-state-icon"><Icon name="History" size={32} /></div>
3690:                   <div className="empty-state-title">אין היסטוריה</div>
3691:                   <div className="empty-state-text">לאחר שתשלחו סבב הודעות, הוא יופיע כאן</div>
3692:                 </div>
3693:               ) : (
3694:                 <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
3695:                   {rounds.map(r => (
3696:                     <div key={r.id} className="card">
3697:                       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
3698:                         <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
3699:                           <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--accent)' }}>
3700:                             {r.round_number}
3701:                           </div>
3702:                           <div>
3703:                             <div style={{ fontWeight: 700 }}>סבב {r.round_number}</div>
3704:                             <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
3705:                               {new Date(r.sent_at).toLocaleDateString('he-IL')} · {r.channel === 'whatsapp' ? '💬 WhatsApp' : '🔗 RSVP Link'}
3706:                             </div>
3707:                           </div>
3708:                         </div>
3709:                         <button
3710:                           className="btn btn-secondary"
3711:                           style={{ fontSize: 12, padding: '6px 12px' }}
3712:                           onClick={() => { setActiveRound(r); setTemplate(r.message_template); setChannel(r.channel || 'whatsapp'); setRecipientFilter(r.target_filter || 'all'); setView('send'); }}
3713:                         >
3714:                           <Icon name="RotateCw" size={14} />
3715:                           שלח שוב
3716:                         </button>
3717:                       </div>
3718:                       <div style={{ display: 'flex', gap: 20 }}>
3719:                         <div className="round-stat">
3720:                           <div className="round-stat-value" style={{ color: 'var(--accent)' }}>{r.total_sent || 0}</div>
3721:                           <div className="round-stat-label">נשלחו</div>
3722:                         </div>
3723:                         <div className="round-stat">
3724:                           <div className="round-stat-value" style={{ color: 'var(--blue-500)' }}>{({ all: guests.length, pending: guests.filter(g => g.status === 'pending').length, maybe: guests.filter(g => g.status === 'maybe').length, declined: guests.filter(g => g.status === 'declined').length, confirmed: guests.filter(g => g.status === 'confirmed').length })[r.target_filter] || '—'}</div>
3725:                           <div className="round-stat-label">קהל יעד</div>
3726:                         </div>
3727:                       </div>
3728:                       <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-line', maxHeight: 100, overflow: 'hidden', position: 'relative' }}>
3729:                         {r.message_template}
3730:                       </div>
3731:                     </div>
3732:                   ))}
3733:                 </div>
3734:               )}
3735:             </div>
3736:           )}
3737: 
3738:           {upsellFeature && <UpsellModal feature={upsellFeature} onClose={() => setUpsellFeature(null)} />}
3739:         </div>
3740:       );
3741:     }
3742: 
3743:     // ============================================
3744:     // Phase 4 — Table SVG Shapes
3745:     // ============================================
3746:     function TableShape({ type, seats, size = 54 }) {
3747:       if (type === 'round') {
3748:         return (
3749:           <svg width={size} height={size} viewBox="0 0 54 54">
3750:             <circle cx="27" cy="27" r="22" fill="#C4A46B" stroke="#8B7355" strokeWidth="2"/>
3751:             <text x="27" y="31" textAnchor="middle" fontSize="10" fill="white" fontWeight="700" fontFamily="Heebo">{seats}p</text>
3752:           </svg>
3753:         );
3754:       }
3755:       if (type === 'rectangle') {
3756:         return (
3757:           <svg width={size * 1.6} height={size * 0.7} viewBox={`0 0 ${size*1.6} ${size*0.7}`}>
3758:             <rect x="2" y="2" width={size*1.6-4} height={size*0.7-4} rx="6" fill="#C4A46B" stroke="#8B7355" strokeWidth="2"/>
3759:             <text x={size*0.8} y={size*0.37} textAnchor="middle" fontSize="10" fill="white" fontWeight="700" fontFamily="Heebo">{seats}p</text>
3760:           </svg>
3761:         );
3762:       }
3763:       // square
3764:       return (
3765:         <svg width={size} height={size} viewBox="0 0 54 54">
3766:           <rect x="3" y="3" width="48" height="48" rx="6" fill="#C4A46B" stroke="#8B7355" strokeWidth="2"/>
3767:           <text x="27" y="31" textAnchor="middle" fontSize="10" fill="white" fontWeight="700" fontFamily="Heebo">{seats}p</text>
3768:         </svg>
3769:       );
3770:     }
3771: 
3772:     // Floor plan SVG table node (draggable on canvas)
3773:     function FloorTable({ table, guests, onDragTable, onTouchTable, selected, onClick, locked }) {
3774:       const tGuests = guests.filter(g => g.table_id === table.id);
3775:       const occupied = tGuests.reduce((s,g) => s + (g.confirmed_guests || 1), 0);
3776:       const isFull = occupied >= table.seats;
3777:       const isRect = table.table_type === 'rectangle';
3778:       const isSq = table.table_type === 'square';
3779:       const w = isRect ? 120 : 80;
3780:       const h = isRect ? 52 : 80;
3781:       const color = isFull ? '#EF4444' : occupied > 0 ? '#10B981' : '#94A3B8';
3782:       const rotation = table.rotation || 0;
3783: 
3784:       // Theme-aware colors
3785:       const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
3786:       const tableFill = isDark ? '#B8963A' : '#C4A46B';
3787:       const tableStroke = isDark ? '#8B7355' : '#8B7355';
3788:       const outerFill = selected ? (isDark ? '#3D3520' : '#FFF8E1') : (isDark ? '#2a2a2a' : '#FAFAFA');
3789:       const outerStroke = selected ? '#F5C518' : (isDark ? 'rgba(255,255,255,0.12)' : '#CBD5E1');
3790:       const emptyChair = isDark ? '#3a3a3a' : '#E2E8F0';
3791:       const chairStroke = isDark ? 'rgba(255,255,255,0.15)' : 'white';
3792: 
3793:       // Generate chair positions for rectangle tables
3794:       const getRectChairs = () => {
3795:         const chairs = [];
3796:         const maxSeats = Math.min(table.seats, 16);
3797:         const longSide = Math.ceil(maxSeats / 2);
3798:         const halfW = w / 2 + 14;
3799:         const halfH = h / 2;
3800:         // Top side
3801:         for (let i = 0; i < longSide; i++) {
3802:           const xPos = -w/2 + (w / (longSide + 1)) * (i + 1);
3803:           chairs.push({ x: xPos, y: -halfH - 12 });
3804:         }
3805:         // Bottom side
3806:         const bottomCount = maxSeats - longSide;
3807:         for (let i = 0; i < bottomCount; i++) {
3808:           const xPos = -w/2 + (w / (bottomCount + 1)) * (i + 1);
3809:           chairs.push({ x: xPos, y: halfH + 12 });
3810:         }
3811:         return chairs;
3812:       };
3813: 
3814:       // Generate chair positions for square tables
3815:       const getSquareChairs = () => {
3816:         const chairs = [];
3817:         const maxSeats = Math.min(table.seats, 16);
3818:         const perSide = Math.ceil(maxSeats / 4);
3819:         const half = 40 + 14;
3820:         const sides = [
3821:           { axis: 'x', fixed: 'y', fixedVal: -half, range: [-36, 36] },  // top
3822:           { axis: 'x', fixed: 'y', fixedVal: half, range: [-36, 36] },   // bottom
3823:           { axis: 'y', fixed: 'x', fixedVal: -half, range: [-36, 36] },  // left
3824:           { axis: 'y', fixed: 'x', fixedVal: half, range: [-36, 36] },   // right
3825:         ];
3826:         let placed = 0;
3827:         for (let s = 0; s < 4 && placed < maxSeats; s++) {
3828:           const side = sides[s];
3829:           const count = Math.min(perSide, maxSeats - placed);
3830:           for (let i = 0; i < count; i++) {
3831:             const pos = side.range[0] + ((side.range[1] - side.range[0]) / (count + 1)) * (i + 1);
3832:             if (side.axis === 'x') {
3833:               chairs.push({ x: pos, y: side.fixedVal });
3834:             } else {
3835:               chairs.push({ x: side.fixedVal, y: pos });
3836:             }
3837:             placed++;
3838:           }
3839:         }
3840:         return chairs;
3841:       };
3842: 
3843:       const tableScale = table.scale || 1;
3844: 
3845:       return (
3846:         <g
3847:           transform={`translate(${table.position_x || 80}, ${table.position_y || 80}) rotate(${rotation}) scale(${tableScale})`}
3848:           style={{ cursor: locked ? 'default' : 'grab', userSelect: 'none' }}
3849:           onMouseDown={e => { if (locked) return; e.stopPropagation(); onDragTable(table, e); }}
3850:           onTouchStart={e => { if (locked || !onTouchTable) return; e.stopPropagation(); onTouchTable(table, e); }}
3851:           onClick={() => onClick(table)}
3852:         >
3853:           {/* Drop shadow */}
3854:           {selected && <circle r="48" fill="none" stroke="#F5C518" strokeWidth="1" opacity="0.3" strokeDasharray="4 3" style={{ display: table.table_type === 'round' ? 'block' : 'none' }} />}
3855:           {table.table_type === 'round' ? (
3856:             <>
3857:               <circle r="38" fill={outerFill} stroke={outerStroke} strokeWidth={selected ? 2.5 : 1.5}/>
3858:               <circle r="26" fill={tableFill} stroke={tableStroke} strokeWidth="2"/>
3859:               <text y="2" textAnchor="middle" fontSize="9" fill="white" fontWeight="700" fontFamily="Heebo">{table.name}</text>
3860:               <text y="13" textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.8)" fontFamily="Heebo">{occupied}/{table.seats}</text>
3861:               {Array.from({ length: Math.min(table.seats, 12) }).map((_, i) => {
3862:                 const angle = (i / Math.min(table.seats, 12)) * Math.PI * 2 - Math.PI/2;
3863:                 const cr = 34;
3864:                 const cx2 = Math.cos(angle) * cr; const cy2 = Math.sin(angle) * cr;
3865:                 const g = tGuests[i];
3866:                 return <circle key={i} cx={cx2} cy={cy2} r="6" fill={g ? getGroupColor(g.group_name) : emptyChair} stroke={chairStroke} strokeWidth="1.2"/>;
3867:               })}
3868:             </>
3869:           ) : isRect ? (
3870:             <>
3871:               {selected && <rect x={-w/2-12} y={-h/2-22} width={w+24} height={h+44} rx="14" fill="none" stroke="#F5C518" strokeWidth="1" opacity="0.3" strokeDasharray="4 3"/>}
3872:               <rect x={-w/2-8} y={-h/2-8} width={w+16} height={h+16} rx="10" fill={outerFill} stroke={outerStroke} strokeWidth={selected ? 2.5 : 1.5}/>
3873:               <rect x={-w/2} y={-h/2} width={w} height={h} rx="6" fill={tableFill} stroke={tableStroke} strokeWidth="2"/>
3874:               <text y="2" textAnchor="middle" fontSize="9" fill="white" fontWeight="700" fontFamily="Heebo">{table.name}</text>
3875:               <text y="13" textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.8)" fontFamily="Heebo">{occupied}/{table.seats}</text>
3876:               {getRectChairs().map((chair, i) => {
3877:                 const g = tGuests[i];
3878:                 return <circle key={i} cx={chair.x} cy={chair.y} r="6" fill={g ? getGroupColor(g.group_name) : emptyChair} stroke={chairStroke} strokeWidth="1.2"/>;
3879:               })}
3880:             </>
3881:           ) : (
3882:             <>
3883:               {selected && <rect x={-48-6} y={-48-6} width={108} height={108} rx="14" fill="none" stroke="#F5C518" strokeWidth="1" opacity="0.3" strokeDasharray="4 3"/>}
3884:               <rect x={-48} y={-48} width="96" height="96" rx="10" fill={outerFill} stroke={outerStroke} strokeWidth={selected ? 2.5 : 1.5}/>
3885:               <rect x={-36} y={-36} width="72" height="72" rx="6" fill={tableFill} stroke={tableStroke} strokeWidth="2"/>
3886:               <text y="2" textAnchor="middle" fontSize="9" fill="white" fontWeight="700" fontFamily="Heebo">{table.name}</text>
3887:               <text y="13" textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.8)" fontFamily="Heebo">{occupied}/{table.seats}</text>
3888:               {getSquareChairs().map((chair, i) => {
3889:                 const g = tGuests[i];
3890:                 return <circle key={i} cx={chair.x} cy={chair.y} r="6" fill={g ? getGroupColor(g.group_name) : emptyChair} stroke={chairStroke} strokeWidth="1.2"/>;
3891:               })}
3892:             </>
3893:           )}
3894:           {/* Status dot */}
3895:           <circle cx={30} cy={-30} r="8" fill={color} stroke={isDark ? '#2a2a2a' : 'white'} strokeWidth="1.5" style={{ display: occupied > 0 ? 'block' : 'none' }}/>
3896:           {/* Per-table lock indicator */}
3897:           {locked && !selected && (
3898:             <g transform="translate(-30, -30)">
3899:               <circle r="7" fill={isDark ? '#444' : '#F1F5F9'} stroke={isDark ? '#666' : '#94A3B8'} strokeWidth="1"/>
3900:               <text textAnchor="middle" y="3.5" fontSize="8" fill={isDark ? '#aaa' : '#64748B'}>🔒</text>
3901:             </g>
3902:           )}
3903:         </g>
3904:       );
3905:     }
3906: 
3907:     // Add/Edit Table Modal
3908:     function TableModal({ table, onSave, onClose, eventId }) {
3909:       const isEdit = !!table;
3910:       const [form, setForm] = useState({
3911:         name: table?.name || '',
3912:         table_type: table?.table_type || 'round',
3913:         seats: table?.seats || 10,
3914:       });
3915:       const [bulkMode, setBulkMode] = useState(false);
3916:       const [bulkCount, setBulkCount] = useState(5);
3917:       const [bulkSeats, setBulkSeats] = useState(10);
3918: 
3919:       const handleSave = () => {
3920:         if (!form.name.trim() && !bulkMode) return;
3921:         if (bulkMode) {
3922:           const tables = Array.from({ length: bulkCount }, (_, i) => ({
3923:             event_id: eventId,
3924:             name: `שולחן ${i + 1}`,
3925:             table_type: form.table_type,
3926:             seats: parseInt(bulkSeats) || 10,
3927:             position_x: Math.min(1350, 150 + (i % 5) * 220),
3928:             position_y: Math.min(850, 150 + Math.floor(i / 5) * 220),
3929:           }));
3930:           onSave(tables, true);
3931:         } else {
3932:           onSave({ ...form, seats: parseInt(form.seats) || 10, event_id: eventId });
3933:         }
3934:       };
3935: 
3936:       return (
3937:         <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
3938:           <div className="modal-content animate-scale-in" style={{ maxWidth: 420 }}>
3939:             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
3940:               <div className="modal-title">{isEdit ? 'עריכת שולחן' : 'הוספת שולחן'}</div>
3941:               <button className="icon-btn" onClick={onClose}><Icon name="X" size={20} /></button>
3942:             </div>
3943: 
3944:             {!isEdit && (
3945:               <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
3946:                 {[{ v: false, l: 'שולחן בודד' }, { v: true, l: 'יצירה בבאלק' }].map(opt => (
3947:                   <button key={String(opt.v)} onClick={() => setBulkMode(opt.v)} style={{ flex:1, padding: '7px 0', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, background: bulkMode === opt.v ? 'var(--bg-secondary)' : 'transparent', color: bulkMode === opt.v ? 'var(--text-primary)' : 'var(--text-tertiary)', boxShadow: bulkMode === opt.v ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s' }}>
3948:                     {opt.l}
3949:                   </button>
3950:                 ))}
3951:               </div>
3952:             )}
3953: 
3954:             {/* Table type */}
3955:             <div style={{ marginBottom: 16 }}>
3956:               <div className="input-label" style={{ marginBottom: 8 }}>סוג שולחן</div>
3957:               <div className="table-type-grid">
3958:                 {[
3959:                   { type: 'round', label: 'עגול', icon: '⭕' },
3960:                   { type: 'rectangle', label: 'אבירים', icon: '▬' },
3961:                   { type: 'square', label: 'ריבועי', icon: '⬛' },
3962:                 ].map(t => (
3963:                   <button key={t.type} className={`table-type-btn ${form.table_type === t.type ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, table_type: t.type }))}>
3964:                     <span style={{ fontSize: 22 }}>{t.icon}</span>
3965:                     {t.label}
3966:                   </button>
3967:                 ))}
3968:               </div>
3969:             </div>
3970: 
3971:             {bulkMode ? (
3972:               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
3973:                 <div className="input-group">
3974:                   <label className="input-label">כמות שולחנות</label>
3975:                   <input className="input-field" type="number" min="1" max="50" value={bulkCount} onChange={e => setBulkCount(e.target.value)} />
3976:                 </div>
3977:                 <div className="input-group">
3978:                   <label className="input-label">מקומות לשולחן</label>
3979:                   <input className="input-field" type="number" min="2" max="30" value={bulkSeats} onChange={e => setBulkSeats(e.target.value)} />
3980:                 </div>
3981:               </div>
3982:             ) : (
3983:               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
3984:                 <div className="input-group">
3985:                   <label className="input-label">שם השולחן</label>
3986:                   <input className="input-field" placeholder='שולחן 1 / VIP' value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
3987:                 </div>
3988:                 <div className="input-group">
3989:                   <label className="input-label">מספר מקומות</label>
3990:                   <input className="input-field" type="number" min="2" max="30" value={form.seats} onChange={e => setForm(f => ({ ...f, seats: e.target.value }))} />
3991:                 </div>
3992:               </div>
3993:             )}
3994: 
3995:             <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
3996:               <button className="btn btn-ghost" onClick={onClose}>ביטול</button>
3997:               <button className="btn btn-primary" onClick={handleSave}>
3998:                 <Icon name="Check" size={18} />
3999:                 {bulkMode ? `צור ${bulkCount} שולחנות` : isEdit ? 'שמור' : 'הוסף שולחן'}
4000:               </button>
4001:             </div>
4002:           </div>
4003:         </div>
4004:       );
4005:     }
4006: 
4007:     // ============================================
4008:     // Phase 4 — Seating Page Full
4009:     // ============================================
4010:     function SeatingPage({ event }) {
4011:       const { client } = useContext(SupabaseContext);
4012:       const { addToast } = useContext(ToastContext);
4013:       const { limits, isPro } = useContext(PlanContext);
4014:       const isMobile = useIsMobile();
4015:       const isLandscape = useIsLandscape();
4016: 
4017:       const [tables, setTables] = useState([]);
4018:       const [guests, setGuests] = useState([]);
4019:       const [loading, setLoading] = useState(true);
4020:       const [viewMode, setViewMode] = useState('list'); // list | dnd | floor
4021:       const [showAddTable, setShowAddTable] = useState(false);
4022:       const [editTable, setEditTable] = useState(null);
4023:       const [deleteTableTarget, setDeleteTableTarget] = useState(null);
4024:       const [selectedFloorTable, setSelectedFloorTable] = useState(null);
4025:       const [draggingGuest, setDraggingGuest] = useState(null);
4026:       const [upsellFeature, setUpsellFeature] = useState(null);
4027:       const [showFullscreenFloor, setShowFullscreenFloor] = useState(false);
4028:       const [tablesLocked, setTablesLocked] = useState(() => {
4029:         try { return localStorage.getItem('seatsync_tables_locked_' + event?.id) === 'true'; } catch { return false; }
4030:       });
4031:       const tablesLockedRef = useRef(tablesLocked);
4032:       useEffect(() => {
4033:         tablesLockedRef.current = tablesLocked;
4034:         try { localStorage.setItem('seatsync_tables_locked_' + event?.id, tablesLocked); } catch {}
4035:       }, [tablesLocked]);
4036: 
4037:       // Per-table lock: set of locked table IDs
4038:       const [lockedTableIds, setLockedTableIds] = useState(() => {
4039:         try {
4040:           const saved = localStorage.getItem('seatsync_locked_tables_' + event?.id);
4041:           return saved ? new Set(JSON.parse(saved)) : new Set();
4042:         } catch { return new Set(); }
4043:       });
4044:       useEffect(() => {
4045:         try { localStorage.setItem('seatsync_locked_tables_' + event?.id, JSON.stringify([...lockedTableIds])); } catch {}
4046:       }, [lockedTableIds]);
4047: 
4048:       const toggleTableLock = (tableId) => {
4049:         setLockedTableIds(prev => {
4050:           const next = new Set(prev);
4051:           if (next.has(tableId)) next.delete(tableId);
4052:           else next.add(tableId);
4053:           return next;
4054:         });
4055:       };
4056: 
4057:       const isTableLocked = (tableId) => tablesLocked || lockedTableIds.has(tableId);
4058: 
4059:       // Change table scale
4060:       const changeTableScale = async (tableId, delta) => {
4061:         const table = tables.find(t => t.id === tableId);
4062:         if (!table) return;
4063:         const currentScale = table.scale || 1;
4064:         const newScale = Math.max(0.5, Math.min(2.0, parseFloat((currentScale + delta).toFixed(2))));
4065:         setTables(prev => prev.map(t => t.id === tableId ? { ...t, scale: newScale } : t));
4066:         if (selectedFloorTable?.id === tableId) setSelectedFloorTable(prev => ({ ...prev, scale: newScale }));
4067:         try {
4068:           const scaleKey = 'seatsync_table_scales_' + event.id;
4069:           const stored = JSON.parse(localStorage.getItem(scaleKey) || '{}');
4070:           stored[tableId] = newScale;
4071:           localStorage.setItem(scaleKey, JSON.stringify(stored));
4072:         } catch {}
4073:         const { error } = await client.from('tables').update({ scale: newScale }).eq('id', tableId);
4074:         if (error) {
4075:           console.warn('Failed to persist table scale to DB, relying on localStorage:', error.message);
4076:         }
4077:       };
4078: 
4079:       // Floor plan sketch opacity & visibility — persist to localStorage
4080:       const [sketchVisible, setSketchVisible] = useState(() => {
4081:         try { const v = localStorage.getItem('seatsync_sketch_visible_' + event?.id); return v === null ? true : v === 'true'; } catch { return true; }
4082:       });
4083:       const [sketchOpacity, setSketchOpacity] = useState(() => {
4084:         try { const v = parseFloat(localStorage.getItem('seatsync_sketch_opacity_' + event?.id)); return (v >= 0 && v <= 1) ? v : 0.3; } catch { return 0.3; }
4085:       });
4086:       useEffect(() => {
4087:         try { localStorage.setItem('seatsync_sketch_visible_' + event?.id, sketchVisible); } catch {}
4088:       }, [sketchVisible]);
4089:       useEffect(() => {
4090:         try { localStorage.setItem('seatsync_sketch_opacity_' + event?.id, sketchOpacity); } catch {}
4091:       }, [sketchOpacity]);
4092: 
4093:       // Floor plan state — restore saved pan/zoom from localStorage
4094:       const zoomChangeCount = useRef(0);
4095:       const panChangeCount = useRef(0);
4096:       const [zoom, setZoom] = useState(() => {
4097:         try { const z = parseFloat(localStorage.getItem('seatsync_zoom_' + event?.id)); return (z > 0 && z <= 3) ? z : 1; } catch { return 1; }
4098:       });
4099:       const [pan, setPan] = useState(() => {
4100:         try { const p = JSON.parse(localStorage.getItem('seatsync_pan_' + event?.id)); return (p && typeof p.x === 'number') ? p : { x: 0, y: 0 }; } catch { return { x: 0, y: 0 }; }
4101:       });
4102:       const [isPanning, setIsPanning] = useState(false);
4103:       const panStart = useRef(null);
4104:       const svgRef = useRef(null);
4105:       // Track whether initial auto-fit has happened (only auto-fit once per mount if not locked)
4106:       const didAutoFit = useRef(false);
4107: 
4108:       // Persist zoom/pan to localStorage — skip first fire (initial value from useState)
4109:       useEffect(() => {
4110:         if (zoomChangeCount.current++ === 0) return;
4111:         try { localStorage.setItem('seatsync_zoom_' + event?.id, zoom); } catch {}
4112:       }, [zoom]);
4113:       useEffect(() => {
4114:         if (panChangeCount.current++ === 0) return;
4115:         try { localStorage.setItem('seatsync_pan_' + event?.id, JSON.stringify(pan)); } catch {}
4116:       }, [pan]);
4117: 
4118:       // Canvas dimensions — user-configurable, saved in event.settings
4119:       const DEFAULT_W = 1400;
4120:       const DEFAULT_H = 900;
4121:       const [canvasW, setCanvasW] = useState(event?.settings?.canvas_w || DEFAULT_W);
4122:       const [canvasH, setCanvasH] = useState(event?.settings?.canvas_h || DEFAULT_H);
4123:       const canvasBounds = { w: canvasW, h: canvasH };
4124:       const TABLE_MARGIN = 50;
4125:       const GRID_SIZE = 20;
4126: 
4127:       // Canvas lock — prevents panning when enabled
4128:       const [canvasLocked, setCanvasLocked] = useState(() => {
4129:         try { return localStorage.getItem('seatsync_canvas_locked_' + event?.id) === 'true'; } catch { return false; }
4130:       });
4131:       useEffect(() => {
4132:         try { localStorage.setItem('seatsync_canvas_locked_' + event?.id, canvasLocked); } catch {}
4133:       }, [canvasLocked]);
4134: 
4135:       // Show canvas size editor
4136:       const [showCanvasSize, setShowCanvasSize] = useState(false);
4137:       const [canvasSizeForm, setCanvasSizeForm] = useState({ w: canvasW, h: canvasH });
4138: 
4139:       const saveCanvasSize = async () => {
4140:         const w = Math.max(400, Math.min(3000, parseInt(canvasSizeForm.w) || DEFAULT_W));
4141:         const h = Math.max(300, Math.min(2000, parseInt(canvasSizeForm.h) || DEFAULT_H));
4142:         setCanvasW(w);
4143:         setCanvasH(h);
4144:         setShowCanvasSize(false);
4145:         // Persist to event settings
4146:         const settings = { ...(event.settings || {}), canvas_w: w, canvas_h: h };
4147:         await client.from('events').update({ settings }).eq('id', event.id);
4148:         addToast(`גודל אולם עודכן: ${w}×${h}`, 'success');
4149:         // Re-clamp any tables that are now out of bounds
4150:         const outOfBounds = tables.filter(t => (t.position_x || 0) > w - TABLE_MARGIN || (t.position_y || 0) > h - TABLE_MARGIN);
4151:         for (const t of outOfBounds) {
4152:           const clamped = { x: Math.min(t.position_x, w - TABLE_MARGIN), y: Math.min(t.position_y, h - TABLE_MARGIN) };
4153:           await client.from('tables').update({ position_x: clamped.x, position_y: clamped.y }).eq('id', t.id);
4154:           setTables(prev => prev.map(tb => tb.id === t.id ? { ...tb, position_x: clamped.x, position_y: clamped.y } : tb));
4155:         }
4156:       };
4157: 
4158:       // Snap-to-grid state
4159:       const [snapToGrid, setSnapToGrid] = useState(false);
4160: 
4161:       // Search in DnD sidebar
4162:       const [sidebarSearch, setSidebarSearch] = useState('');
4163: 
4164:       // Clamp table position within canvas bounds
4165:       const clampPosition = (x, y) => ({
4166:         x: Math.max(TABLE_MARGIN, Math.min(canvasW - TABLE_MARGIN, x)),
4167:         y: Math.max(TABLE_MARGIN, Math.min(canvasH - TABLE_MARGIN, y)),
4168:       });
4169: 
4170:       // Snap position to grid
4171:       const snapPosition = (x, y) => {
4172:         if (!snapToGrid) return { x, y };
4173:         return {
4174:           x: Math.round(x / GRID_SIZE) * GRID_SIZE,
4175:           y: Math.round(y / GRID_SIZE) * GRID_SIZE,
4176:         };
4177:       };
4178: 
4179:       // Auto-layout tables in a nice grid
4180:       const autoLayoutTables = async () => {
4181:         if (tables.length === 0) return;
4182:         const cols = Math.ceil(Math.sqrt(tables.length * (canvasW / canvasH)));
4183:         const rows = Math.ceil(tables.length / cols);
4184:         const cellW = (canvasW - TABLE_MARGIN * 2) / cols;
4185:         const cellH = (canvasH - TABLE_MARGIN * 2) / rows;
4186:         const spacing = Math.min(cellW, cellH);
4187:         const startX = TABLE_MARGIN + spacing / 2;
4188:         const startY = TABLE_MARGIN + spacing / 2;
4189: 
4190:         const updates = tables.map((t, i) => {
4191:           const col = i % cols;
4192:           const row = Math.floor(i / cols);
4193:           const pos = clampPosition(startX + col * spacing, startY + row * spacing);
4194:           return { id: t.id, position_x: pos.x, position_y: pos.y };
4195:         });
4196: 
4197:         // Update all locally first for instant feedback
4198:         setTables(prev => prev.map(t => {
4199:           const u = updates.find(u => u.id === t.id);
4200:           return u ? { ...t, position_x: u.position_x, position_y: u.position_y } : t;
4201:         }));
4202: 
4203:         // Then persist
4204:         for (const u of updates) {
4205:           await client.from('tables').update({ position_x: u.position_x, position_y: u.position_y }).eq('id', u.id);
4206:         }
4207:         addToast('שולחנות סודרו אוטומטית ✓', 'success');
4208:       };
4209: 
4210:       // Auto-fit zoom when entering floor view or fullscreen — only on first load if no saved view
4211:       useEffect(() => {
4212:         if (!(viewMode === 'floor' || showFullscreenFloor)) return;
4213:         if (!svgRef.current || didAutoFit.current) return;
4214:         // If canvas is locked or user already has saved zoom, skip auto-fit
4215:         if (canvasLocked) { didAutoFit.current = true; return; }
4216:         const hasSavedZoom = (() => { try { return localStorage.getItem('seatsync_zoom_' + event?.id) !== null; } catch { return false; } })();
4217:         if (hasSavedZoom) { didAutoFit.current = true; return; }
4218:         const wrapEl = svgRef.current.parentElement;
4219:         if (!wrapEl || tables.length === 0) return;
4220:         // Small delay to let DOM settle for fullscreen
4221:         setTimeout(() => {
4222:           if (didAutoFit.current) return;
4223:           const wrapW = wrapEl.clientWidth;
4224:           const wrapH = wrapEl.clientHeight;
4225:           if (wrapW > 0 && wrapH > 0) {
4226:             const fitZoom = Math.min(wrapW / canvasBounds.w, wrapH / canvasBounds.h, 1.5);
4227:             setZoom(Math.max(0.15, fitZoom * 0.9));
4228:             setPan({ x: 0, y: 0 });
4229:             didAutoFit.current = true;
4230:           }
4231:         }, 50);
4232:       }, [viewMode, showFullscreenFloor, tables.length]);
4233: 
4234:       // Table drag on floor plan
4235:       const tableDragRef = useRef(null);
4236: 
4237:       useEffect(() => {
4238:         if (!event?.id) return;
4239:         fetchAll();
4240:       }, [client, event?.id]);
4241: 
4242:       if (!event) return <NeedEventState />;
4243: 
4244:       const fetchAll = async () => {
4245:         if (!client || !event?.id) return;
4246:         setLoading(true);
4247:         const [{ data: t }, { data: g }] = await Promise.all([
4248:           client.from('tables').select('*').eq('event_id', event.id).order('sort_order'),
4249:           client.from('guests').select('id,name,group_name,status,confirmed_guests,table_id,seat_index').eq('event_id', event.id),
4250:         ]);
4251:         const scaleKey = 'seatsync_table_scales_' + event.id;
4252:         let storedScales = {};
4253:         try { storedScales = JSON.parse(localStorage.getItem(scaleKey) || '{}'); } catch {}
4254:         setTables((t || []).map(tbl => {
4255:           // Prefer localStorage scale when present — covers DB update failures and offline edits.
4256:           const local = storedScales[tbl.id];
4257:           const dbScale = tbl.scale;
4258:           const scale = (typeof local === 'number' && local > 0) ? local
4259:                       : (typeof dbScale === 'number' && dbScale > 0) ? dbScale
4260:                       : 1;
4261:           return { ...tbl, scale };
4262:         }));
4263:         setGuests(g || []);
4264:         setLoading(false);
4265:       };
4266: 
4267:       // Stats
4268:       const unassigned = guests.filter(g => !g.table_id && (g.status !== 'declined'));
4269:       const assignedCount = guests.filter(g => g.table_id).length;
4270:       const totalSeats = tables.reduce((s, t) => s + t.seats, 0);
4271: 
4272:       // Group unassigned by group
4273:       const unassignedByGroup = useMemo(() => {
4274:         const map = {};
4275:         unassigned.forEach(g => {
4276:           const grp = g.group_name || 'כללי';
4277:           if (!map[grp]) map[grp] = [];
4278:           map[grp].push(g);
4279:         });
4280:         return map;
4281:       }, [unassigned]);
4282: 
4283:       // Add table(s)
4284:       const handleAddTable = async (formOrArray, isBulk) => {
4285:         // Plan limit check
4286:         const newCount = isBulk ? formOrArray.length : 1;
4287:         if (tables.length + newCount > limits.tables) {
4288:           addToast(`תוכנית ${limits.label} מאפשרת עד ${limits.tables} שולחנות. שדרגו לתוכנית גבוהה יותר.`, 'error');
4289:           setUpsellFeature('tables');
4290:           return;
4291:         }
4292:         if (isBulk) {
4293:           const { data, error } = await client.from('tables').insert(formOrArray).select();
4294:           if (!error) { setTables(prev => [...prev, ...(data || [])]); addToast(`${data?.length} שולחנות נוצרו ✓`, 'success'); }
4295:         } else {
4296:           const { data, error } = await client.from('tables').insert({
4297:             ...formOrArray,
4298:             event_id: event.id,
4299:             position_x: Math.min(canvasW - TABLE_MARGIN, TABLE_MARGIN + 100 + (tables.length % 5) * 200),
4300:             position_y: Math.min(canvasH - TABLE_MARGIN, TABLE_MARGIN + 100 + Math.floor(tables.length / 5) * 200),
4301:           }).select().single();
4302:           if (!error) { setTables(prev => [...prev, data]); addToast(`${data.name} נוסף ✓`, 'success'); }
4303:         }
4304:         setShowAddTable(false);
4305:       };
4306: 
4307:       // Edit table
4308:       const handleEditTable = async (form) => {
4309:         const { data, error } = await client.from('tables').update(form).eq('id', editTable.id).select().single();
4310:         if (!error) { setTables(prev => prev.map(t => t.id === editTable.id ? data : t)); setEditTable(null); addToast('עודכן ✓', 'success'); }
4311:       };
4312: 
4313:       // Delete table — show confirmation first (Bug fix 2.2)
4314:       const confirmDeleteTable = (tableId) => {
4315:         const table = tables.find(t => t.id === tableId);
4316:         setDeleteTableTarget(table || { id: tableId });
4317:       };
4318: 
4319:       const handleDeleteTable = async () => {
4320:         if (!deleteTableTarget) return;
4321:         const tableId = deleteTableTarget.id;
4322:         await client.from('guests').update({ table_id: null, seat_index: null }).eq('table_id', tableId);
4323:         await client.from('tables').delete().eq('id', tableId);
4324:         setTables(prev => prev.filter(t => t.id !== tableId));
4325:         setGuests(prev => prev.map(g => g.table_id === tableId ? { ...g, table_id: null } : g));
4326:         addToast('שולחן נמחק', 'success');
4327:         if (selectedFloorTable?.id === tableId) setSelectedFloorTable(null);
4328:         setDeleteTableTarget(null);
4329:       };
4330: 
4331:       // Assign guest to table
4332:       const assignGuest = async (guestId, tableId) => {
4333:         if (tableId) {
4334:           const tableGuests = guests.filter(g => g.table_id === tableId);
4335:           const table = tables.find(t => t.id === tableId);
4336:           const occupied = tableGuests.reduce((s,g) => s + (g.confirmed_guests || 1), 0);
4337:           if (occupied >= (table?.seats || 0)) { addToast('השולחן מלא!', 'error'); return; }
4338:         }
4339:         const { error } = await client.from('guests').update({ table_id: tableId || null, seat_index: null }).eq('id', guestId);
4340:         if (!error) {
4341:           setGuests(prev => prev.map(g => g.id === guestId ? { ...g, table_id: tableId || null } : g));
4342:         }
4343:       };
4344: 
4345:       // DnD handlers (mouse - desktop)
4346:       const handleDragStart = (e, guest) => {
4347:         e.dataTransfer.setData('guestId', guest.id);
4348:         setDraggingGuest(guest.id);
4349:       };
4350: 
4351:       const handleDrop = (e, tableId) => {
4352:         e.preventDefault();
4353:         const guestId = e.dataTransfer.getData('guestId');
4354:         if (guestId) assignGuest(guestId, tableId);
4355:         setDraggingGuest(null);
4356:       };
4357: 
4358:       const handleDropUnassigned = (e) => {
4359:         e.preventDefault();
4360:         const guestId = e.dataTransfer.getData('guestId');
4361:         if (guestId) assignGuest(guestId, null);
4362:         setDraggingGuest(null);
4363:       };
4364: 
4365:       // ─── Touch DnD (mobile — iPhone/Android) ───────────────────────────────
4366:       const touchDragRef = useRef(null);   // { guestId, guestName, ghostEl }
4367: 
4368:       const handleTouchStart = (e, guest) => {
4369:         // Only handle single-finger drags
4370:         if (e.touches.length !== 1) return;
4371:         const touch = e.touches[0];
4372: 
4373:         // Create ghost element that follows the finger
4374:         const ghost = document.createElement('div');
4375:         ghost.id = 'touch-drag-ghost';
4376:         ghost.textContent = guest.name;
4377:         Object.assign(ghost.style, {
4378:           position: 'fixed',
4379:           zIndex: 9999,
4380:           pointerEvents: 'none',
4381:           background: 'var(--gold-400)',
4382:           color: '#1A1A1A',
4383:           padding: '8px 14px',
4384:           borderRadius: '20px',
4385:           fontSize: '13px',
4386:           fontWeight: '700',
4387:           fontFamily: 'Heebo, sans-serif',
4388:           boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
4389:           opacity: '0.95',
4390:           transform: 'translate(-50%, -50%)',
4391:           left: touch.clientX + 'px',
4392:           top: touch.clientY + 'px',
4393:           transition: 'none',
4394:           whiteSpace: 'nowrap',
4395:         });
4396:         document.body.appendChild(ghost);
4397: 
4398:         touchDragRef.current = { guestId: guest.id, ghostEl: ghost };
4399:         setDraggingGuest(guest.id);
4400:       };
4401: 
4402:       const handleTouchMove = (e) => {
4403:         if (!touchDragRef.current) return;
4404:         e.preventDefault(); // prevent page scroll while dragging
4405:         const touch = e.touches[0];
4406:         const ghost = touchDragRef.current.ghostEl;
4407:         if (ghost) {
4408:           ghost.style.left = touch.clientX + 'px';
4409:           ghost.style.top = touch.clientY + 'px';
4410:         }
4411:         // Highlight the drop target under the finger
4412:         ghost.style.display = 'none';
4413:         const el = document.elementFromPoint(touch.clientX, touch.clientY);
4414:         ghost.style.display = '';
4415:         const dropCard = el?.closest('[data-table-id]');
4416:         // Remove previous highlights
4417:         document.querySelectorAll('.table-drop-card.touch-over').forEach(n => n.classList.remove('touch-over'));
4418:         document.querySelectorAll('.seating-sidebar.touch-over').forEach(n => n.classList.remove('touch-over'));
4419:         if (dropCard) {
4420:           dropCard.classList.add('touch-over');
4421:         } else if (el?.closest('.seating-sidebar')) {
4422:           el.closest('.seating-sidebar').classList.add('touch-over');
4423:         }
4424:       };
4425: 
4426:       const handleTouchEnd = (e) => {
4427:         if (!touchDragRef.current) return;
4428:         const touch = e.changedTouches[0];
4429:         const { guestId, ghostEl } = touchDragRef.current;
4430: 
4431:         // Hide ghost FIRST so elementFromPoint can see what's underneath
4432:         if (ghostEl) ghostEl.style.display = 'none';
4433: 
4434:         // Remove highlights
4435:         document.querySelectorAll('.table-drop-card.touch-over').forEach(n => n.classList.remove('touch-over'));
4436:         document.querySelectorAll('.seating-sidebar.touch-over').forEach(n => n.classList.remove('touch-over'));
4437: 
4438:         // Find drop target (ghost is hidden, so this works correctly)
4439:         const el = document.elementFromPoint(touch.clientX, touch.clientY);
4440:         const dropCard = el?.closest('[data-table-id]');
4441:         if (dropCard) {
4442:           const tableId = dropCard.dataset.tableId;
4443:           assignGuest(guestId, tableId);
4444:         } else if (el?.closest('.seating-sidebar')) {
4445:           assignGuest(guestId, null);
4446:         }
4447: 
4448:         // Remove ghost from DOM
4449:         if (ghostEl && ghostEl.parentNode) ghostEl.parentNode.removeChild(ghostEl);
4450: 
4451:         touchDragRef.current = null;
4452:         setDraggingGuest(null);
4453:       };
4454:       // ───────────────────────────────────────────────────────────────────────
4455: 
4456:       // Floor plan: drag tables (mouse)
4457:       const handleTableMouseDown = (table, e) => {
4458:         if (viewMode !== 'floor') return;
4459:         if (isTableLocked(table.id)) return;
4460:         e.preventDefault();
4461:         const startX = e.clientX;
4462:         const startY = e.clientY;
4463:         const startPosX = table.position_x || 100;
4464:         const startPosY = table.position_y || 100;
4465:         // Use object to track final position (avoids stale closure)
4466:         const finalPos = { x: startPosX, y: startPosY };
4467: 
4468:         const onMove = (me) => {
4469:           const dx = (me.clientX - startX) / zoom;
4470:           const dy = (me.clientY - startY) / zoom;
4471:           let pos = clampPosition(startPosX + dx, startPosY + dy);
4472:           pos = snapPosition(pos.x, pos.y);
4473:           finalPos.x = pos.x;
4474:           finalPos.y = pos.y;
4475:           setTables(prev => prev.map(t => t.id === table.id
4476:             ? { ...t, position_x: pos.x, position_y: pos.y }
4477:             : t
4478:           ));
4479:         };
4480: 
4481:         const onUp = async () => {
4482:           document.removeEventListener('mousemove', onMove);
4483:           document.removeEventListener('mouseup', onUp);
4484:           await client.from('tables').update({ position_x: finalPos.x, position_y: finalPos.y }).eq('id', table.id);
4485:         };
4486: 
4487:         document.addEventListener('mousemove', onMove);
4488:         document.addEventListener('mouseup', onUp);
4489:       };
4490: 
4491:       // Floor plan: drag tables (touch — mobile)
4492:       const handleTableTouchStart = (table, e) => {
4493:         if (viewMode !== 'floor') return;
4494:         if (isTableLocked(table.id)) return;
4495:         if (e.touches.length !== 1) return;
4496:         e.stopPropagation();
4497:         const touch = e.touches[0];
4498:         const startX = touch.clientX;
4499:         const startY = touch.clientY;
4500:         const startPosX = table.position_x || 100;
4501:         const startPosY = table.position_y || 100;
4502:         const finalPos = { x: startPosX, y: startPosY };
4503: 
4504:         const onMove = (me) => {
4505:           if (me.touches.length !== 1) return;
4506:           me.preventDefault();
4507:           const t = me.touches[0];
4508:           const dx = (t.clientX - startX) / zoom;
4509:           const dy = (t.clientY - startY) / zoom;
4510:           let pos = clampPosition(startPosX + dx, startPosY + dy);
4511:           pos = snapPosition(pos.x, pos.y);
4512:           finalPos.x = pos.x;
4513:           finalPos.y = pos.y;
4514:           setTables(prev => prev.map(tb => tb.id === table.id
4515:             ? { ...tb, position_x: pos.x, position_y: pos.y }
4516:             : tb
4517:           ));
4518:         };
4519: 
4520:         const onEnd = async () => {
4521:           svgRef.current?.removeEventListener('touchmove', onMove);
4522:           svgRef.current?.removeEventListener('touchend', onEnd);
4523:           await client.from('tables').update({ position_x: finalPos.x, position_y: finalPos.y }).eq('id', table.id);
4524:         };
4525: 
4526:         svgRef.current?.addEventListener('touchmove', onMove, { passive: false });
4527:         svgRef.current?.addEventListener('touchend', onEnd);
4528:       };
4529: 
4530:       // Export seating list to PDF
4531:       const exportPDF = async () => {
4532:         try {
4533:           const { jsPDF } = window.jspdf;
4534:           const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
4535: 
4536:           // Hebrew font support via built-in — use LTR layout with English fallback for font
4537:           // Title
4538:           doc.setFontSize(20);
4539:           doc.setFont('helvetica', 'bold');
4540:           const eventName = event?.name || 'SeatSync';
4541:           doc.text(eventName, 105, 20, { align: 'center' });
4542: 
4543:           if (event?.event_date) {
4544:             doc.setFontSize(11);
4545:             doc.setFont('helvetica', 'normal');
4546:             doc.text(new Date(event.event_date).toLocaleDateString('he-IL'), 105, 28, { align: 'center' });
4547:           }
4548: 
4549:           doc.setFontSize(10);
4550:           doc.text(`Generated: ${new Date().toLocaleDateString('he-IL')}`, 105, 34, { align: 'center' });
4551: 
4552:           // Horizontal line
4553:           doc.setDrawColor(212, 168, 8);
4554:           doc.setLineWidth(0.8);
4555:           doc.line(15, 38, 195, 38);
4556: 
4557:           let y = 46;
4558:           const pageH = 285;
4559: 
4560:           // For each table, list guests
4561:           tables.forEach((table, ti) => {
4562:             const tGuests = guests.filter(g => g.table_id === table.id);
4563:             const occupied = tGuests.reduce((s, g) => s + (g.confirmed_guests || 1), 0);
4564: 
4565:             // Page break if needed
4566:             if (y > pageH - 30) {
4567:               doc.addPage();
4568:               y = 20;
4569:             }
4570: 
4571:             // Table header
4572:             doc.setFillColor(212, 168, 8);
4573:             doc.setTextColor(255, 255, 255);
4574:             doc.roundedRect(15, y, 180, 8, 2, 2, 'F');
4575:             doc.setFontSize(10);
4576:             doc.setFont('helvetica', 'bold');
4577:             doc.text(`Table ${ti + 1}: ${table.name}  (${occupied}/${table.seats})`, 105, y + 5.5, { align: 'center' });
4578:             doc.setTextColor(0, 0, 0);
4579:             y += 11;
4580: 
4581:             if (tGuests.length === 0) {
4582:               doc.setFont('helvetica', 'italic');
4583:               doc.setFontSize(9);
4584:               doc.setTextColor(140, 140, 140);
4585:               doc.text('Empty table', 20, y + 4);
4586:               doc.setTextColor(0, 0, 0);
4587:               y += 9;
4588:             } else {
4589:               // Guest rows in 2 columns
4590:               const col1x = 20, col2x = 110;
4591:               tGuests.forEach((g, gi) => {
4592:                 if (y > pageH - 10) { doc.addPage(); y = 20; }
4593:                 const isCol2 = gi % 2 === 1;
4594:                 const x = isCol2 ? col2x : col1x;
4595:                 if (!isCol2 || gi === tGuests.length - 1) {
4596:                   // Alternating row bg
4597:                   if (Math.floor(gi / 2) % 2 === 0) {
4598:                     doc.setFillColor(250, 249, 245);
4599:                     doc.rect(15, y - 1, 180, 7, 'F');
4600:                   }
4601:                 }
4602:                 doc.setFont('helvetica', 'normal');
4603:                 doc.setFontSize(9);
4604:                 const guestLabel = `${g.name}  (${g.group_name || ''})  x${g.confirmed_guests || 1}`;
4605:                 doc.text(guestLabel, x, y + 4);
4606:                 if (isCol2 || gi === tGuests.length - 1) y += 7;
4607:               });
4608:             }
4609:             y += 4;
4610:           });
4611: 
4612:           // Summary at end
4613:           if (y > pageH - 20) { doc.addPage(); y = 20; }
4614:           doc.setDrawColor(212, 168, 8);
4615:           doc.line(15, y, 195, y);
4616:           y += 6;
4617:           doc.setFont('helvetica', 'bold');
4618:           doc.setFontSize(10);
4619:           const totalSeated = guests.filter(g => g.table_id).length;
4620:           doc.text(`Total: ${totalSeated} / ${guests.length} guests seated  |  ${tables.length} tables`, 105, y, { align: 'center' });
4621: 
4622:           doc.save(`seatsync-seating-${(event?.name || 'event').replace(/\s+/g,'-')}.pdf`);
4623:           addToast('PDF ייוצא בהצלחה ✓', 'success');
4624:         } catch (err) {
4625:           console.error('PDF export error:', err);
4626:           addToast('שגיאה בייצוא PDF — נסו שוב', 'error');
4627:         }
4628:       };
4629: 
4630:       // Export floor plan SVG as PDF
4631:       const exportFloorPlanPDF = async () => {
4632:         const svgEl = svgRef.current;
4633:         if (!svgEl) { addToast('פתחו את מפת הושבה תחילה', 'error'); return; }
4634:         try {
4635:           addToast('מייצא מפה...', 'info');
4636:           const canvas = await window.html2canvas(svgEl.closest('.floorplan-wrap') || svgEl.parentElement, {
4637:             scale: 2,
4638:             backgroundColor: '#FAFAF8',
4639:             logging: false,
4640:           });
4641:           const imgData = canvas.toDataURL('image/png');
4642:           const { jsPDF } = window.jspdf;
4643:           const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
4644:           doc.setFontSize(14);
4645:           doc.setFont('helvetica', 'bold');
4646:           doc.text(event?.name || 'Floor Plan', 148.5, 12, { align: 'center' });
4647:           doc.addImage(imgData, 'PNG', 10, 18, 277, 180);
4648:           doc.save(`seatsync-floorplan-${(event?.name || 'event').replace(/\s+/g,'-')}.pdf`);
4649:           addToast('מפת הושבה יוצאה ✓', 'success');
4650:         } catch (err) {
4651:           console.error('Floor plan PDF error:', err);
4652:           addToast('שגיאה בייצוא מפה', 'error');
4653:         }
4654:       };
4655:       const exportSeating = () => {
4656:         const rows = guests.map(g => {
4657:           const table = tables.find(t => t.id === g.table_id);
4658:           return {
4659:             'שם': g.name,
4660:             'קבוצה': g.group_name || '',
4661:             'סטטוס': STATUS_CONFIG[g.status]?.label || g.status,
4662:             'שולחן': table?.name || 'לא מושב',
4663:             'מגיעים': g.confirmed_guests || 0,
4664:           };
4665:         });
4666:         const ws = XLSX.utils.json_to_sheet(rows);
4667:         const wb = XLSX.utils.book_new();
4668:         XLSX.utils.book_append_sheet(wb, ws, 'הושבה');
4669:         XLSX.writeFile(wb, `הושבה_${event.name}.xlsx`);
4670:         addToast('ייצוא הושלם ✓', 'success');
4671:       };
4672: 
4673:       if (loading) return (
4674:         <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
4675:           {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
4676:         </div>
4677:       );
4678: 
4679:       return (
4680:         <div className="animate-slide-up">
4681:           {/* Header */}
4682:           <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
4683:             <div>
4684:               <div className="page-title">סידורי הושבה</div>
4685:               <div className="page-subtitle">
4686:                 {tables.length} שולחנות · {totalSeats} מקומות · {assignedCount}/{guests.filter(g=>g.status!=='declined').length} מושבים
4687:               </div>
4688:             </div>
4689:             <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
4690:               <button className="btn btn-secondary" style={{ padding: '10px 14px' }} onClick={exportSeating} title="ייצוא לאקסל">
4691:                 <Icon name="FileSpreadsheet" size={18} />
4692:                 <span className="hide-mobile">אקסל</span>
4693:               </button>
4694:               <button className="btn btn-secondary" style={{ padding: '10px 14px' }} onClick={exportPDF} title="ייצוא רשימת הושבה PDF">
4695:                 <Icon name="FileText" size={18} />
4696:                 <span className="hide-mobile">PDF</span>
4697:               </button>
4698:               {viewMode === 'floor' && (
4699:                 <button className="btn btn-secondary" style={{ padding: '10px 14px' }} onClick={exportFloorPlanPDF} title="ייצוא מפת הושבה PDF">
4700:                   <Icon name="Map" size={18} />
4701:                   <span className="hide-mobile">מפה</span>
4702:                 </button>
4703:               )}
4704:               <button className="btn btn-primary" onClick={() => {
4705:                 if (tables.length >= limits.tables) { setUpsellFeature('tables'); return; }
4706:                 setShowAddTable(true);
4707:               }}>
4708:                 <Icon name="Plus" size={18} />
4709:                 <span className="hide-mobile">שולחן חדש</span>
4710:                 {!isPro && tables.length >= limits.tables && <ProBadge style={{ marginRight: 4 }} />}
4711:               </button>
4712:             </div>
4713:           </div>
4714: 
4715:           {/* Tables plan limit bar */}
4716:           {!isPro && tables.length >= Math.floor(limits.tables * 0.8) && (
4717:             <div className={`plan-limit-bar ${tables.length >= limits.tables ? 'danger' : ''}`}>
4718:               <Icon name={tables.length >= limits.tables ? 'AlertCircle' : 'Info'} size={16} style={{ color: tables.length >= limits.tables ? 'var(--red-500)' : 'var(--gold-600)', flexShrink: 0 }} />
4719:               <span style={{ flex: 1 }}>
4720:                 {tables.length >= limits.tables
4721:                   ? `הגעתם למגבלה — ${tables.length}/${limits.tables} שולחנות (Free)`
4722:                   : `${tables.length}/${limits.tables} שולחנות — מתקרבים למגבלת Free`}
4723:               </span>
4724:               <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setUpsellFeature('tables')}>
4725:                 <Icon name="Zap" size={13} />שדרוג
4726:               </button>
4727:             </div>
4728:           )}
4729: 
4730:           {/* Stats strip */}
4731:           {tables.length > 0 && (
4732:             <div className="guests-stats-row" style={{ marginBottom: 16 }}>
4733:               {[
4734:                 { value: tables.length, label: 'שולחנות', color: 'var(--accent)' },
4735:                 { value: totalSeats, label: 'מקומות כולל', color: 'var(--text-primary)' },
4736:                 { value: assignedCount, label: 'מושבים', color: 'var(--emerald-500)' },
4737:                 { value: unassigned.length, label: 'לא מושבים', color: 'var(--amber-500)' },
4738:               ].map(s => (
4739:                 <div key={s.label} className="guests-stat">
4740:                   <div className="guests-stat-value" style={{ color: s.color }}>{s.value}</div>
4741:                   <div className="guests-stat-label">{s.label}</div>
4742:                 </div>
4743:               ))}
4744:             </div>
4745:           )}
4746: 
4747:           {tables.length === 0 ? (
4748:             <div className="empty-state">
4749:               <div className="empty-state-icon"><Icon name="Armchair" size={36} /></div>
4750:               <div className="empty-state-title">אין שולחנות עדיין</div>
4751:               <div className="empty-state-text">הוסיפו שולחן בודד או צרו כמה שולחנות בבת אחת</div>
4752:               <button className="btn btn-primary" onClick={() => {
4753:                 if (tables.length >= limits.tables) { setUpsellFeature('tables'); return; }
4754:                 setShowAddTable(true);
4755:               }}>
4756:                 <Icon name="Plus" size={18} />הוספת שולחן
4757:               </button>
4758:             </div>
4759:           ) : (
4760:             <>
4761:               {/* View mode toggle */}
4762:               <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
4763:                 <div className="view-mode-tabs">
4764:                   {[
4765:                     { v: 'list', icon: 'List', label: 'רשימה' },
4766:                     { v: 'dnd', icon: 'Move', label: 'גרירה' },
4767:                     { v: 'floor', icon: 'LayoutDashboard', label: 'מפת אולם' },
4768:                   ].map(m => (
4769:                     <button key={m.v} className={`view-mode-btn ${viewMode === m.v ? 'active' : ''}`} onClick={() => {
4770:                       if (m.v === 'floor' && isMobile) {
4771:                         setShowFullscreenFloor(true);
4772:                       } else {
4773:                         setViewMode(m.v);
4774:                       }
4775:                     }}>
4776:                       <Icon name={m.icon} size={14} />
4777:                       {m.label}
4778:                       {m.v === 'floor' && isMobile && <Icon name="Expand" size={12} style={{ marginRight: 2 }} />}
4779:                     </button>
4780:                   ))}
4781:                 </div>
4782:                 {viewMode === 'floor' && !isMobile && (
4783:                   <div style={{ display: 'flex', gap: 4, marginRight: 'auto', flexWrap: 'wrap' }}>
4784:                     <button
4785:                       className="btn btn-secondary"
4786:                       style={{ padding: '6px 10px', background: tablesLocked ? 'var(--accent-light)' : undefined, borderColor: tablesLocked ? 'var(--accent)' : undefined, color: tablesLocked ? 'var(--accent)' : undefined }}
4787:                       onClick={() => setTablesLocked(l => !l)}
4788:                       title={tablesLocked ? 'שחרר נעילת שולחנות' : 'נעל מיקום שולחנות'}
4789:                     >
4790:                       <Icon name={tablesLocked ? 'Lock' : 'Unlock'} size={16} />
4791:                     </button>
4792:                     <button
4793:                       className="btn btn-secondary"
4794:                       style={{ padding: '6px 10px', background: snapToGrid ? 'var(--accent-light)' : undefined, borderColor: snapToGrid ? 'var(--accent)' : undefined, color: snapToGrid ? 'var(--accent)' : undefined }}
4795:                       onClick={() => setSnapToGrid(s => !s)}
4796:                       title={snapToGrid ? 'בטל הצמדה לרשת' : 'הצמד לרשת'}
4797:                     >
4798:                       <Icon name="Grid3x3" size={16} />
4799:                     </button>
4800:                     <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={autoLayoutTables} title="סדר שולחנות אוטומטית">
4801:                       <Icon name="LayoutGrid" size={16} />
4802:                     </button>
4803:                     <button
4804:                       className="btn btn-secondary"
4805:                       style={{ padding: '6px 10px', background: canvasLocked ? 'rgba(59,130,246,0.1)' : undefined, borderColor: canvasLocked ? 'var(--blue-400)' : undefined, color: canvasLocked ? 'var(--blue-500)' : undefined }}
4806:                       onClick={() => { setCanvasLocked(l => !l) }}
4807:                       title={canvasLocked ? 'שחרר נעילת מפה — אפשר גלילה' : 'קבע מפה — מנע גלילה'}
4808:                     >
4809:                       <Icon name={canvasLocked ? 'Pin' : 'PinOff'} size={16} />
4810:                     </button>
4811:                     <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => { setCanvasSizeForm({ w: canvasW, h: canvasH }); setShowCanvasSize(true); }} title="גודל אולם">
4812:                       <Icon name="Ruler" size={16} />
4813:                     </button>
4814:                     <div style={{ width: 1, background: 'var(--border-default)', margin: '0 2px' }} />
4815:                     <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => setZoom(z => Math.min(2, z + 0.2))}>
4816:                       <Icon name="ZoomIn" size={16} />
4817:                     </button>
4818:                     <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => setZoom(z => Math.max(0.3, z - 0.2))}>
4819:                       <Icon name="ZoomOut" size={16} />
4820:                     </button>
4821:                     <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => {
4822:                       const wrapEl = svgRef.current?.parentElement;
4823:                       if (wrapEl) {
4824:                         const fitZoom = Math.min(wrapEl.clientWidth / canvasBounds.w, wrapEl.clientHeight / canvasBounds.h, 1.5);
4825:                         setZoom(Math.max(0.15, fitZoom * 0.9));
4826:                         setPan({ x: 0, y: 0 });
4827:                       }
4828:                     }}>
4829:                       <Icon name="Maximize2" size={16} />
4830:                     </button>
4831:                     <span style={{ fontSize: 11, color: 'var(--text-tertiary)', alignSelf: 'center', marginRight: 4 }}>{Math.round(zoom * 100)}%</span>
4832:                   </div>
4833:                 )}
4834:               </div>
4835: 
4836:               {/* ── LIST VIEW ── */}
4837:               {viewMode === 'list' && (
4838:                 <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
4839:                   {tables.map(table => {
4840:                     const tGuests = guests.filter(g => g.table_id === table.id);
4841:                     const occupied = tGuests.reduce((s,g) => s + (g.confirmed_guests || 1), 0);
4842:                     const isFull = occupied >= table.seats;
4843:                     return (
4844:                       <div key={table.id} className="card">
4845:                         <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: tGuests.length > 0 ? 12 : 0 }}>
4846:                           <TableShape type={table.table_type} seats={table.seats} size={48} />
4847:                           <div style={{ flex: 1 }}>
4848:                             <div style={{ fontWeight: 700, fontSize: 16 }}>{table.name}</div>
4849:                             <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
4850:                               {occupied}/{table.seats} מקומות ·
4851:                               <span style={{ color: isFull ? 'var(--red-500)' : 'var(--emerald-500)', fontWeight: 600 }}>
4852:                                 {isFull ? ' מלא' : ` נותרו ${table.seats - occupied}`}
4853:                               </span>
4854:                             </div>
4855:                           </div>
4856:                           <div style={{ display: 'flex', gap: 4 }}>
4857:                             <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setEditTable(table)}>
4858:                               <Icon name="Pencil" size={15} />
4859:                             </button>
4860:                             <button className="icon-btn" style={{ width: 32, height: 32, color: 'var(--red-400)' }} onClick={() => confirmDeleteTable(table.id)}>
4861:                               <Icon name="Trash2" size={15} />
4862:                             </button>
4863:                           </div>
4864:                         </div>
4865:                         {tGuests.length > 0 && (
4866:                           <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
4867:                             {tGuests.map(g => (
4868:                               <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 500 }}>
4869:                                 <span style={{ width: 7, height: 7, borderRadius: '50%', background: getGroupColor(g.group_name), display: 'inline-block' }}/>
4870:                                 {g.name}
4871:                                 <button style={{ opacity: 0.5, cursor: 'pointer', fontSize: 14, marginRight: 2, display: 'flex', alignItems: 'center' }} onClick={() => assignGuest(g.id, null)}>×</button>
4872:                               </div>
4873:                             ))}
4874:                           </div>
4875:                         )}
4876:                         {/* Quick assign dropdown */}
4877:                         <div style={{ marginTop: 10 }}>
4878:                           <select
4879:                             className="filter-select"
4880:                             style={{ width: '100%', fontSize: 13 }}
4881:                             value=""
4882:                             disabled={isFull}
4883:                             onChange={e => { if (e.target.value) assignGuest(e.target.value, table.id); e.target.value = ''; }}
4884:                           >
4885:                             <option value="">{isFull ? 'שולחן מלא' : '+ הוסף אורח לשולחן...'}</option>
4886:                             {unassigned.filter(g => g.status !== 'declined').map(g => (
4887:                               <option key={g.id} value={g.id}>{g.name} ({g.group_name})</option>
4888:                             ))}
4889:                           </select>
4890:                         </div>
4891:                       </div>
4892:                     );
4893:                   })}
4894:                 </div>
4895:               )}
4896: 
4897:               {/* ── DRAG & DROP VIEW ── */}
4898:               {viewMode === 'dnd' && (
4899:                 <div className="seating-layout">
4900:                   {/* Sidebar — unassigned */}
4901:                   <div
4902:                     className="seating-sidebar"
4903:                     onDragOver={e => e.preventDefault()}
4904:                     onDrop={handleDropUnassigned}
4905:                   >
4906:                     <div className="sidebar-title">
4907:                       <span>לא מושבים</span>
4908:                       <span style={{ background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 'var(--radius-full)', padding: '1px 8px', fontSize: 12 }}>{unassigned.length}</span>
4909:                     </div>
4910:                     {unassigned.length > 5 && (
4911:                       <div style={{ position: 'relative', marginBottom: 10 }}>
4912:                         <Icon name="Search" size={14} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
4913:                         <input
4914:                           className="input-field"
4915:                           style={{ fontSize: 12, padding: '6px 30px 6px 10px', background: 'var(--bg-tertiary)' }}
4916:                           placeholder="חיפוש אורח..."
4917:                           value={sidebarSearch}
4918:                           onChange={e => setSidebarSearch(e.target.value)}
4919:                         />
4920:                         {sidebarSearch && (
4921:                           <button style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', display: 'flex', opacity: 0.5 }} onClick={() => setSidebarSearch('')}>
4922:                             <Icon name="X" size={12} />
4923:                           </button>
4924:                         )}
4925:                       </div>
4926:                     )}
4927:                     {unassigned.length === 0 ? (
4928:                       <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: 20 }}>
4929:                         🎉 כל האורחים מושבים!
4930:                       </div>
4931:                     ) : (() => {
4932:                       const searchLower = sidebarSearch.toLowerCase().trim();
4933:                       const filteredByGroup = {};
4934:                       Object.entries(unassignedByGroup).forEach(([group, groupGuests]) => {
4935:                         const filtered = searchLower ? groupGuests.filter(g => g.name.toLowerCase().includes(searchLower) || (g.group_name || '').toLowerCase().includes(searchLower)) : groupGuests;
4936:                         if (filtered.length > 0) filteredByGroup[group] = filtered;
4937:                       });
4938:                       const totalFiltered = Object.values(filteredByGroup).reduce((s, arr) => s + arr.length, 0);
4939:                       if (searchLower && totalFiltered === 0) {
4940:                         return <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: 16 }}>אין תוצאות עבור "{sidebarSearch}"</div>;
4941:                       }
4942:                       return Object.entries(filteredByGroup).map(([group, groupGuests]) => (
4943:                         <div key={group}>
4944:                           <div className="sidebar-group-label">
4945:                             <span style={{ width: 6, height: 6, borderRadius: '50%', background: getGroupColor(group), display: 'inline-block', marginLeft: 5 }}/>
4946:                             {group} ({groupGuests.length})
4947:                           </div>
4948:                           {groupGuests.map(g => (
4949:                             <div
4950:                               key={g.id}
4951:                               className={`draggable-guest ${draggingGuest === g.id ? 'dragging' : ''}`}
4952:                               draggable
4953:                               onDragStart={e => handleDragStart(e, g)}
4954:                               onDragEnd={() => setDraggingGuest(null)}
4955:                               onTouchStart={e => handleTouchStart(e, g)}
4956:                               onTouchMove={handleTouchMove}
4957:                               onTouchEnd={handleTouchEnd}
4958:                               style={{ touchAction: 'none' }}
4959:                             >
4960:                               <Icon name="GripVertical" size={14} style={{ color: 'var(--text-tertiary)' }} />
4961:                               {g.name}
4962:                               <span className="guest-count-chip">{g.confirmed_guests || 1}</span>
4963:                             </div>
4964:                           ))}
4965:                         </div>
4966:                       ));
4967:                     })()}
4968:                   </div>
4969: 
4970:                   {/* Tables drop area */}
4971:                   <div className="tables-area">
4972:                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
4973:                       {tables.map(table => {
4974:                         const tGuests = guests.filter(g => g.table_id === table.id);
4975:                         const occupied = tGuests.reduce((s,g) => s + (g.confirmed_guests || 1), 0);
4976:                         const isFull = occupied >= table.seats;
4977:                         return (
4978:                           <div
4979:                             key={table.id}
4980:                             data-table-id={table.id}
4981:                             className={`table-drop-card ${isFull ? 'is-full' : ''}`}
4982:                             onDragOver={e => { if (!isFull) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); } }}
4983:                             onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
4984:                             onDrop={e => { e.currentTarget.classList.remove('drag-over'); handleDrop(e, table.id); }}
4985:                           >
4986:                             <div className="table-header-row">
4987:                               <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
4988:                                 <TableShape type={table.table_type} seats={table.seats} size={36} />
4989:                                 <span className="table-name-label">{table.name}</span>
4990:                               </div>
4991:                               <span className={`seat-counter ${isFull ? 'full' : occupied > 0 ? 'ok' : ''}`}>{occupied}/{table.seats}</span>
4992:                             </div>
4993:                             <div className="assigned-guests-list">
4994:                               {tGuests.map(g => (
4995:                                 <div
4996:                                   key={g.id}
4997:                                   className="assigned-guest-chip"
4998:                                   draggable
4999:                                   onDragStart={e => handleDragStart(e, g)}
5000:                                   onDragEnd={() => setDraggingGuest(null)}
5001:                                   onTouchStart={e => handleTouchStart(e, g)}
5002:                                   onTouchMove={handleTouchMove}
5003:                                   onTouchEnd={handleTouchEnd}
5004:                                   style={{ touchAction: 'none' }}
5005:                                 >
5006:                                   <span style={{ width: 7, height: 7, borderRadius: '50%', background: getGroupColor(g.group_name) }} />
5007:                                   <span style={{ flex: 1, fontSize: 12 }}>{g.name}</span>
5008:                                   <button style={{ opacity: 0.5, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center' }} onClick={() => assignGuest(g.id, null)}>×</button>
5009:                                 </div>
5010:                               ))}
5011:                               {!isFull && <div className="drop-hint">{tGuests.length === 0 ? 'גרור אורחים לכאן' : '+ גרור עוד'}</div>}
5012:                             </div>
5013:                           </div>
5014:                         );
5015:                       })}
5016:                     </div>
5017:                   </div>
5018:                 </div>
5019:               )}
5020: 
5021:               {/* ── FLOOR PLAN VIEW ── */}
5022:               {viewMode === 'floor' && (
5023:                 <>
5024:                 <div className="floorplan-wrap" style={{ height: isLandscape ? 'calc(100vh - 90px)' : isMobile ? 'calc(100vh - 260px)' : 560, minHeight: 300 }}>
5025:                   <div className="floorplan-controls">
5026:                     <div className="floorplan-btn" onClick={() => setZoom(z => Math.min(2.5, z + 0.15))}><Icon name="Plus" size={14}/></div>
5027:                     <div className="floorplan-btn" onClick={() => setZoom(z => Math.max(0.2, z - 0.15))}><Icon name="Minus" size={14}/></div>
5028:                     <div className="floorplan-btn" onClick={() => {
5029:                       const wrapEl = svgRef.current?.parentElement;
5030:                       if (wrapEl) {
5031:                         const wrapW = wrapEl.clientWidth;
5032:                         const wrapH = wrapEl.clientHeight;
5033:                         const fitZoom = Math.min(wrapW / canvasBounds.w, wrapH / canvasBounds.h, 1.5);
5034:                         setZoom(Math.max(0.15, fitZoom * 0.9));
5035:                         setPan({ x: 0, y: 0 });
5036:                       }
5037:                     }} title="התאם למסך"><Icon name="Maximize2" size={14}/></div>
5038:                     <div className="floorplan-btn" onClick={() => { setZoom(1); setPan({x:0,y:0}); }} title="איפוס"><Icon name="Crosshair" size={14}/></div>
5039:                     <div style={{ height: 1, background: 'var(--border-default)', margin: '2px 0' }} />
5040:                     <div className="floorplan-btn" onClick={autoLayoutTables} title="סידור אוטומטי"><Icon name="LayoutGrid" size={14}/></div>
5041:                     <div className="floorplan-btn" onClick={() => setSnapToGrid(s => !s)} title={snapToGrid ? 'בטל הצמדה' : 'הצמד לרשת'} style={{ background: snapToGrid ? 'var(--accent-light)' : undefined, color: snapToGrid ? 'var(--accent)' : undefined }}><Icon name="Grid3x3" size={14}/></div>
5042:                     <div className="floorplan-btn" onClick={() => { setCanvasLocked(l => !l) }} title={canvasLocked ? 'שחרר מפה' : 'קבע מפה'} style={{ background: canvasLocked ? 'rgba(59,130,246,0.15)' : undefined, color: canvasLocked ? 'var(--blue-500)' : undefined }}><Icon name={canvasLocked ? 'Pin' : 'PinOff'} size={14}/></div>
5043:                     {event?.settings?.floorplan_url && (
5044:                       <>
5045:                         <div style={{ height: 1, background: 'var(--border-default)', margin: '2px 0' }} />
5046:                         <div className="floorplan-btn" onClick={() => setSketchVisible(v => !v)} title={sketchVisible ? 'הסתר סקיצה' : 'הצג סקיצה'} style={{ background: sketchVisible ? 'var(--accent-light)' : undefined, color: sketchVisible ? 'var(--accent)' : undefined }}><Icon name="Image" size={14}/></div>
5047:                         {sketchVisible && (
5048:                           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 2px' }}>
5049:                             <input
5050:                               type="range"
5051:                               min="0.05"
5052:                               max="0.8"
5053:                               step="0.05"
5054:                               value={sketchOpacity}
5055:                               onChange={e => setSketchOpacity(parseFloat(e.target.value))}
5056:                               style={{ width: 28, height: 60, WebkitAppearance: 'slider-vertical', writingMode: 'vertical-lr', direction: 'rtl', cursor: 'pointer' }}
5057:                               title={`שקיפות: ${Math.round(sketchOpacity * 100)}%`}
5058:                             />
5059:                             <span style={{ fontSize: 8, color: 'var(--text-tertiary)' }}>{Math.round(sketchOpacity * 100)}%</span>
5060:                           </div>
5061:                         )}
5062:                       </>
5063:                     )}
5064:                   </div>
5065:                   {/* Zoom indicator */}
5066:                   <div style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 5, fontSize: 10, color: 'var(--text-tertiary)', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border-light)' }}>
5067:                     {Math.round(zoom * 100)}%
5068:                   </div>
5069:                   {isMobile && (
5070:                     <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 5, display: 'flex', gap: 4 }}>
5071:                       <button
5072:                         className="floorplan-btn"
5073:                         style={{ width: 'auto', padding: '4px 10px', fontSize: 11, fontWeight: 600, fontFamily: 'Heebo', gap: 4, display: 'flex', alignItems: 'center' }}
5074:                         onClick={() => setTablesLocked(l => !l)}
5075:                       >
5076:                         <Icon name={tablesLocked ? 'Lock' : 'Unlock'} size={13}/>
5077:                         {tablesLocked ? 'נעול' : 'נעל'}
5078:                       </button>
5079:                     </div>
5080:                   )}
5081:                   <svg
5082:                     ref={svgRef}
5083:                     width="100%"
5084:                     height="100%"
5085:                     style={{ background: event?.settings?.floorplan_url ? 'transparent' : undefined, touchAction: 'none' }}
5086:                     onWheel={e => {
5087:                       e.preventDefault();
5088:                       const delta = e.deltaY > 0 ? -0.08 : 0.08;
5089:                       setZoom(z => Math.max(0.2, Math.min(2.5, z + delta)));
5090:                     }}
5091:                     onMouseDown={e => {
5092:                       if (canvasLocked) return;
5093:                       if (e.target === svgRef.current || e.target.tagName === 'svg' || e.target.tagName === 'image' || e.target.tagName === 'rect' || e.target.tagName === 'line') {
5094:                         setIsPanning(true);
5095:                         panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
5096:                       }
5097:                     }}
5098:                     onMouseMove={e => {
5099:                       if (isPanning && panStart.current) {
5100:                         setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
5101:                       }
5102:                     }}
5103:                     onMouseUp={() => setIsPanning(false)}
5104:                     onMouseLeave={() => setIsPanning(false)}
5105:                     onTouchStart={e => {
5106:                       if (e.touches.length === 2) {
5107:                         const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
5108:                         panStart.current = { pinchDist: d, startZoom: zoom };
5109:                         setIsPanning(false);
5110:                       } else if (e.touches.length === 1 && !canvasLocked) {
5111:                         const t = e.touches[0];
5112:                         if (e.target === svgRef.current || e.target.tagName === 'svg' || e.target.tagName === 'image' || e.target.tagName === 'rect') {
5113:                           setIsPanning(true);
5114:                           panStart.current = { x: t.clientX - pan.x, y: t.clientY - pan.y };
5115:                         }
5116:                       }
5117:                     }}
5118:                     onTouchMove={e => {
5119:                       if (e.touches.length === 2 && panStart.current?.pinchDist) {
5120:                         e.preventDefault();
5121:                         const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
5122:                         const scale = d / panStart.current.pinchDist;
5123:                         setZoom(Math.max(0.2, Math.min(2.5, panStart.current.startZoom * scale)));
5124:                       } else if (isPanning && panStart.current && e.touches.length === 1) {
5125:                         e.preventDefault();
5126:                         const t = e.touches[0];
5127:                         setPan({ x: t.clientX - panStart.current.x, y: t.clientY - panStart.current.y });
5128:                       }
5129:                     }}
5130:                     onTouchEnd={() => { setIsPanning(false); if (panStart.current?.pinchDist) panStart.current = null; }}
5131:                   >
5132:                     <defs>
5133:                       <pattern id="grid-dots" width="40" height="40" patternUnits="userSpaceOnUse">
5134:                         <circle cx="20" cy="20" r="1" fill="var(--border-default)" opacity="0.5"/>
5135:                       </pattern>
5136:                     </defs>
5137:                     <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
5138:                       {/* Canvas background with dot grid */}
5139:                       <rect x="0" y="0" width={canvasBounds.w} height={canvasBounds.h} fill="url(#grid-dots)" rx="12" />
5140:                       <rect x="0" y="0" width={canvasBounds.w} height={canvasBounds.h} fill="none" stroke="var(--border-default)" strokeWidth="1.5" rx="12" opacity="0.5" />
5141:                       {/* Floor plan background image */}
5142:                       {event?.settings?.floorplan_url && sketchVisible && (
5143:                         <image
5144:                           href={event.settings.floorplan_url}
5145:                           x="0" y="0"
5146:                           width={canvasBounds.w} height={canvasBounds.h}
5147:                           preserveAspectRatio="xMidYMid meet"
5148:                           opacity={sketchOpacity}
5149:                           style={{ pointerEvents: 'none' }}
5150:                         />
5151:                       )}
5152:                       {tables.map(table => (
5153:                         <FloorTable
5154:                           key={table.id}
5155:                           table={table}
5156:                           guests={guests}
5157:                           selected={selectedFloorTable?.id === table.id}
5158:                           locked={isTableLocked(table.id)}
5159:                           onDragTable={handleTableMouseDown}
5160:                           onTouchTable={handleTableTouchStart}
5161:                           onClick={t => setSelectedFloorTable(selectedFloorTable?.id === t.id ? null : t)}
5162:                         />
5163:                       ))}
5164:                     </g>
5165:                   </svg>
5166:                 </div>
5167: 
5168:                   {/* Selected table panel — rendered OUTSIDE floorplan-wrap to avoid overflow:hidden clipping */}
5169:                   {selectedFloorTable && (() => {
5170:                     const tGuests = guests.filter(g => g.table_id === selectedFloorTable.id);
5171: 
5172:                     // On mobile: bottom sheet inside floorplan
5173:                     if (isMobile) {
5174:                       return (
5175:                         <div style={{
5176:                           position: 'relative',
5177:                           background: 'var(--bg-elevated)',
5178:                           borderTop: '1px solid var(--border-default)',
5179:                           borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
5180:                           padding: '14px 16px',
5181:                           marginTop: -1,
5182:                           boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
5183:                           animation: 'slideUp 0.2s ease both',
5184:                         }}>
5185:                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
5186:                             <div>
5187:                               <span style={{ fontWeight: 700, fontSize: 15 }}>{selectedFloorTable.name}</span>
5188:                               <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 8 }}>
5189:                                 {tGuests.reduce((s,g)=>s+(g.confirmed_guests||1),0)}/{selectedFloorTable.seats} מקומות
5190:                               </span>
5191:                             </div>
5192:                             <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => setSelectedFloorTable(null)}><Icon name="X" size={16}/></button>
5193:                           </div>
5194:                           {tGuests.length > 0 && (
5195:                             <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10, maxHeight: 50, overflowY: 'auto' }}>
5196:                               {tGuests.map(g => (
5197:                                 <span key={g.id} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, padding:'2px 8px', background:'var(--bg-tertiary)', borderRadius:20 }}>
5198:                                   <span style={{ width:5, height:5, borderRadius:'50%', background:getGroupColor(g.group_name) }}/>
5199:                                   {g.name}
5200:                                 </span>
5201:                               ))}
5202:                             </div>
5203:                           )}
5204:                           <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, padding:'4px 0' }}>
5205:                             <span style={{ fontSize:12, color:'var(--text-secondary)', whiteSpace:'nowrap' }}>גודל:</span>
5206:                             <button className="btn btn-secondary" style={{ width:30, height:28, padding:0, fontSize:14 }} onClick={() => changeTableScale(selectedFloorTable.id, -0.1)}>−</button>
5207:                             <span style={{ fontSize:12, fontWeight:600, minWidth:36, textAlign:'center' }}>{Math.round((selectedFloorTable.scale || 1) * 100)}%</span>
5208:                             <button className="btn btn-secondary" style={{ width:30, height:28, padding:0, fontSize:14 }} onClick={() => changeTableScale(selectedFloorTable.id, 0.1)}>+</button>
5209:                             {(selectedFloorTable.scale || 1) !== 1 && (
5210:                               <button className="btn btn-ghost" style={{ padding:'2px 6px', fontSize:11 }} onClick={() => changeTableScale(selectedFloorTable.id, 1 - (selectedFloorTable.scale || 1))}>איפוס</button>
5211:                             )}
5212:                           </div>
5213:                           <div style={{ display:'flex', gap:8 }}>
5214:                             <button className="btn btn-secondary" style={{ flex:1, padding:'8px 0', fontSize:13, background: lockedTableIds.has(selectedFloorTable.id) ? 'var(--accent-light)' : undefined, borderColor: lockedTableIds.has(selectedFloorTable.id) ? 'var(--accent)' : undefined, color: lockedTableIds.has(selectedFloorTable.id) ? 'var(--accent)' : undefined }} onClick={() => toggleTableLock(selectedFloorTable.id)}>
5215:                               <Icon name={lockedTableIds.has(selectedFloorTable.id) ? 'Lock' : 'Unlock'} size={14}/>{lockedTableIds.has(selectedFloorTable.id) ? 'נעול' : 'נעל'}
5216:                             </button>
5217:                             <button className="btn btn-secondary" style={{ flex:1, padding:'8px 0', fontSize:13 }} onClick={async ()=>{
5218:                               const newRot = ((selectedFloorTable.rotation || 0) + 45) % 360;
5219:                               await client.from('tables').update({ rotation: newRot }).eq('id', selectedFloorTable.id);
5220:                               setTables(prev => prev.map(t => t.id === selectedFloorTable.id ? { ...t, rotation: newRot } : t));
5221:                               setSelectedFloorTable(prev => ({ ...prev, rotation: newRot }));
5222:                             }}>
5223:                               <Icon name="RotateCw" size={14}/>סובב
5224:                             </button>
5225:                             <button className="btn btn-secondary" style={{ flex:1, padding:'8px 0', fontSize:13 }} onClick={()=>{setEditTable(selectedFloorTable); setSelectedFloorTable(null);}}>
5226:                               <Icon name="Pencil" size={14}/>ערוך
5227:                             </button>
5228:                             <button className="btn btn-danger" style={{ flex:1, padding:'8px 0', fontSize:13 }} onClick={()=>{ confirmDeleteTable(selectedFloorTable.id); setSelectedFloorTable(null); }}>
5229:                               <Icon name="Trash2" size={14}/>מחק
5230:                             </button>
5231:                           </div>
5232:                         </div>
5233:                       );
5234:                     }
5235: 
5236:                     // Desktop: floating panel near table — use fixed position relative to viewport
5237:                     const wrapEl = svgRef.current?.parentElement;
5238:                     const wrapBR = wrapEl?.getBoundingClientRect() || { left: 0, top: 0, width: 800, height: 560 };
5239:                     const tx = (selectedFloorTable.position_x || 80) * zoom + pan.x + wrapBR.left;
5240:                     const ty = (selectedFloorTable.position_y || 80) * zoom + pan.y + wrapBR.top;
5241:                     const panelW = 230;
5242:                     const panelH = 220;
5243:                     const vpW = window.innerWidth;
5244:                     const vpH = window.innerHeight;
5245:                     // Try left of table, fallback right, fallback center
5246:                     let left = tx - panelW - 15;
5247:                     if (left < 8) left = tx + 70;
5248:                     if (left + panelW > vpW - 8) left = Math.max(8, vpW - panelW - 16);
5249:                     let top = ty - panelH / 2 + 20;
5250:                     if (top < wrapBR.top) top = wrapBR.top + 8;
5251:                     if (top + panelH > vpH - 8) top = Math.max(8, vpH - panelH - 8);
5252: 
5253:                     return (
5254:                       <div style={{
5255:                         position: 'fixed',
5256:                         left, top,
5257:                         width: panelW,
5258:                         background: 'var(--bg-elevated)',
5259:                         border: '1px solid var(--border-default)',
5260:                         borderRadius: 'var(--radius-md)',
5261:                         padding: 12,
5262:                         boxShadow: 'var(--shadow-lg)',
5263:                         animation: 'scaleIn 0.15s ease both',
5264:                         zIndex: 10,
5265:                       }}>
5266:                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
5267:                           <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedFloorTable.name}</div>
5268:                           <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => setSelectedFloorTable(null)}><Icon name="X" size={14}/></button>
5269:                         </div>
5270:                         <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
5271:                           {tGuests.reduce((s,g)=>s+(g.confirmed_guests||1),0)}/{selectedFloorTable.seats} מקומות
5272:                         </div>
5273:                         {tGuests.length > 0 && (
5274:                           <div style={{ marginBottom: 8, maxHeight: 60, overflowY: 'auto' }}>
5275:                             {tGuests.map(g => (
5276:                               <div key={g.id} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, padding:'2px 0' }}>
5277:                                 <span style={{ width:6, height:6, borderRadius:'50%', background:getGroupColor(g.group_name), flexShrink:0 }}/>
5278:                                 {g.name}
5279:                               </div>
5280:                             ))}
5281:                           </div>
5282:                         )}
5283:                         <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6, padding:'2px 0' }}>
5284:                           <span style={{ fontSize:11, color:'var(--text-secondary)' }}>גודל:</span>
5285:                           <button className="btn btn-secondary" style={{ width:24, height:22, padding:0, fontSize:13 }} onClick={() => changeTableScale(selectedFloorTable.id, -0.1)}>−</button>
5286:                           <span style={{ fontSize:11, fontWeight:600, minWidth:30, textAlign:'center' }}>{Math.round((selectedFloorTable.scale || 1) * 100)}%</span>
5287:                           <button className="btn btn-secondary" style={{ width:24, height:22, padding:0, fontSize:13 }} onClick={() => changeTableScale(selectedFloorTable.id, 0.1)}>+</button>
5288:                           {(selectedFloorTable.scale || 1) !== 1 && (
5289:                             <button className="btn btn-ghost" style={{ padding:'1px 5px', fontSize:10 }} onClick={() => changeTableScale(selectedFloorTable.id, 1 - (selectedFloorTable.scale || 1))}>איפוס</button>
5290:                           )}
5291:                         </div>
5292:                         <div style={{ display:'flex', gap:6 }}>
5293:                           <button className="btn btn-secondary" style={{ flex:1, padding:'6px 0', fontSize:12, background: lockedTableIds.has(selectedFloorTable.id) ? 'var(--accent-light)' : undefined, borderColor: lockedTableIds.has(selectedFloorTable.id) ? 'var(--accent)' : undefined, color: lockedTableIds.has(selectedFloorTable.id) ? 'var(--accent)' : undefined }} onClick={() => toggleTableLock(selectedFloorTable.id)}>
5294:                             <Icon name={lockedTableIds.has(selectedFloorTable.id) ? 'Lock' : 'Unlock'} size={13}/>{lockedTableIds.has(selectedFloorTable.id) ? 'נעול' : 'נעל'}
5295:                           </button>
5296:                           <button className="btn btn-secondary" style={{ flex:1, padding:'6px 0', fontSize:12 }} onClick={async ()=>{
5297:                             const newRot = ((selectedFloorTable.rotation || 0) + 45) % 360;
5298:                             await client.from('tables').update({ rotation: newRot }).eq('id', selectedFloorTable.id);
5299:                             setTables(prev => prev.map(t => t.id === selectedFloorTable.id ? { ...t, rotation: newRot } : t));
5300:                             setSelectedFloorTable(prev => ({ ...prev, rotation: newRot }));
5301:                           }}>
5302:                             <Icon name="RotateCw" size={13}/>סובב
5303:                           </button>
5304:                           <button className="btn btn-secondary" style={{ flex:1, padding:'6px 0', fontSize:12 }} onClick={()=>{setEditTable(selectedFloorTable); setSelectedFloorTable(null);}}>
5305:                             <Icon name="Pencil" size={13}/>ערוך
5306:                           </button>
5307:                           <button className="btn btn-danger" style={{ flex:1, padding:'6px 0', fontSize:12 }} onClick={()=>{ confirmDeleteTable(selectedFloorTable.id); setSelectedFloorTable(null); }}>
5308:                             <Icon name="Trash2" size={13}/>מחק
5309:                           </button>
5310:                         </div>
5311:                       </div>
5312:                     );
5313:                   })()}
5314:               </>
5315:               )}
5316:             </>
5317:           )}
5318: 
5319:           {/* Modals */}
5320:           {showAddTable && (
5321:             <TableModal eventId={event.id} onSave={handleAddTable} onClose={() => setShowAddTable(false)} />
5322:           )}
5323:           {editTable && (
5324:             <TableModal table={editTable} eventId={event.id} onSave={handleEditTable} onClose={() => setEditTable(null)} />
5325:           )}
5326: 
5327:           {/* Bug fix 2.2: Delete table confirmation dialog */}
5328:           {deleteTableTarget && (
5329:             <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteTableTarget(null)}>
5330:               <div className="modal-content animate-scale-in" style={{ maxWidth: 360 }}>
5331:                 <div className="confirm-dialog">
5332:                   <div className="confirm-dialog-icon">
5333:                     <Icon name="Trash2" size={24} style={{ color: 'var(--red-500)' }} />
5334:                   </div>
5335:                   <div className="confirm-dialog-title">מחיקת שולחן</div>
5336:                   <div className="confirm-dialog-text">
5337:                     למחוק את "{deleteTableTarget.name}"? האורחים המושבים בו יחזרו לרשימת הלא-מושבים.
5338:                   </div>
5339:                   <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
5340:                     <button className="btn btn-ghost" onClick={() => setDeleteTableTarget(null)}>ביטול</button>
5341:                     <button className="btn btn-danger" onClick={handleDeleteTable} style={{ padding: '10px 24px' }}>
5342:                       <Icon name="Trash2" size={18} />מחק שולחן
5343:                     </button>
5344:                   </div>
5345:                 </div>
5346:               </div>
5347:             </div>
5348:           )}
5349: 
5350:           {upsellFeature && <UpsellModal feature={upsellFeature} onClose={() => setUpsellFeature(null)} />}
5351: 
5352:           {/* Canvas size editor modal */}
5353:           {showCanvasSize && (
5354:             <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCanvasSize(false)}>
5355:               <div className="modal-content animate-scale-in" style={{ maxWidth: 380 }}>
5356:                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
5357:                   <div className="modal-title">גודל איזור ההושבה</div>
5358:                   <button className="icon-btn" onClick={() => setShowCanvasSize(false)}><Icon name="X" size={20} /></button>
5359:                 </div>
5360:                 <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
5361:                   הגדירו את גודל המפה לפי מידות האולם. ניתן להשתמש ביחידות יחסיות או לבחור תבנית מוכנה.
5362:                 </div>
5363:                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
5364:                   <div className="input-group">
5365:                     <label className="input-label">רוחב</label>
5366:                     <input className="input-field" type="number" min="400" max="3000" step="50" value={canvasSizeForm.w} onChange={e => setCanvasSizeForm(f => ({ ...f, w: e.target.value }))} />
5367:                   </div>
5368:                   <div className="input-group">
5369:                     <label className="input-label">אורך</label>
5370:                     <input className="input-field" type="number" min="300" max="2000" step="50" value={canvasSizeForm.h} onChange={e => setCanvasSizeForm(f => ({ ...f, h: e.target.value }))} />
5371:                   </div>
5372:                 </div>
5373:                 <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
5374:                   {[
5375:                     { label: 'קטן', w: 800, h: 600 },
5376:                     { label: 'בינוני', w: 1200, h: 800 },
5377:                     { label: 'גדול', w: 1600, h: 1000 },
5378:                     { label: 'ענק', w: 2200, h: 1400 },
5379:                   ].map(preset => (
5380:                     <button key={preset.label} className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => setCanvasSizeForm({ w: preset.w, h: preset.h })}>
5381:                       {preset.label} ({preset.w}×{preset.h})
5382:                     </button>
5383:                   ))}
5384:                 </div>
5385:                 <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
5386:                   <button className="btn btn-ghost" onClick={() => setShowCanvasSize(false)}>ביטול</button>
5387:                   <button className="btn btn-primary" onClick={saveCanvasSize}>
5388:                     <Icon name="Check" size={18} />שמור
5389:                   </button>
5390:                 </div>
5391:               </div>
5392:             </div>
5393:           )}
5394: 
5395:           {/* ── FULLSCREEN FLOOR PLAN (Mobile) ── */}
5396:           {showFullscreenFloor && (
5397:             <div style={{
5398:               position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
5399:               background: 'var(--bg-primary)',
5400:               display: 'flex', flexDirection: 'column',
5401:               animation: 'fadeIn 0.2s ease both',
5402:             }}>
5403:               {/* Toolbar */}
5404:               <div style={{
5405:                 display: 'flex', alignItems: 'center', justifyContent: 'space-between',
5406:                 padding: '8px 12px', borderBottom: '1px solid var(--border-default)',
5407:                 background: 'var(--bg-elevated)', flexShrink: 0,
5408:               }}>
5409:                 <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => { setShowFullscreenFloor(false); setSelectedFloorTable(null); }}>
5410:                   <Icon name="X" size={18} />סגור
5411:                 </button>
5412:                 <div style={{ fontWeight: 700, fontSize: 14 }}>מפת אולם</div>
5413:                 <div style={{ display: 'flex', gap: 4 }}>
5414:                   <button
5415:                     className="btn btn-secondary"
5416:                     style={{ padding: '6px 8px', background: tablesLocked ? 'var(--accent-light)' : undefined, borderColor: tablesLocked ? 'var(--accent)' : undefined, color: tablesLocked ? 'var(--accent)' : undefined }}
5417:                     onClick={() => setTablesLocked(l => !l)}
5418:                   >
5419:                     <Icon name={tablesLocked ? 'Lock' : 'Unlock'} size={15} />
5420:                   </button>
5421:                   <button className="btn btn-secondary" style={{ padding: '6px 8px' }} onClick={autoLayoutTables} title="סידור אוטומטי">
5422:                     <Icon name="LayoutGrid" size={15} />
5423:                   </button>
5424:                   <button
5425:                     className="btn btn-secondary"
5426:                     style={{ padding: '6px 8px', background: canvasLocked ? 'rgba(59,130,246,0.1)' : undefined, borderColor: canvasLocked ? 'var(--blue-400)' : undefined, color: canvasLocked ? 'var(--blue-500)' : undefined }}
5427:                     onClick={() => { setCanvasLocked(l => !l) }}
5428:                     title={canvasLocked ? 'שחרר מפה' : 'קבע מפה'}
5429:                   >
5430:                     <Icon name={canvasLocked ? 'Pin' : 'PinOff'} size={15} />
5431:                   </button>
5432:                   <button className="btn btn-secondary" style={{ padding: '6px 8px' }} onClick={() => {
5433:                     if (!svgRef.current) return;
5434:                     const wrapEl = svgRef.current.parentElement;
5435:                     if (wrapEl) {
5436:                       const fitZoom = Math.min(wrapEl.clientWidth / canvasBounds.w, wrapEl.clientHeight / canvasBounds.h, 1.5);
5437:                       setZoom(Math.max(0.15, fitZoom * 0.9));
5438:                       setPan({ x: 0, y: 0 });
5439:                     }
5440:                   }}>
5441:                     <Icon name="Maximize2" size={15} />
5442:                   </button>
5443:                   <button className="btn btn-secondary" style={{ padding: '6px 8px' }} onClick={() => setZoom(z => Math.min(2.5, z + 0.15))}>
5444:                     <Icon name="ZoomIn" size={15} />
5445:                   </button>
5446:                   <button className="btn btn-secondary" style={{ padding: '6px 8px' }} onClick={() => setZoom(z => Math.max(0.15, z - 0.15))}>
5447:                     <Icon name="ZoomOut" size={15} />
5448:                   </button>
5449:                   {event?.settings?.floorplan_url && (
5450:                     <button
5451:                       className="btn btn-secondary"
5452:                       style={{ padding: '6px 8px', background: sketchVisible ? 'var(--accent-light)' : undefined, borderColor: sketchVisible ? 'var(--accent)' : undefined, color: sketchVisible ? 'var(--accent)' : undefined }}
5453:                       onClick={() => setSketchVisible(v => !v)}
5454:                       title={sketchVisible ? 'הסתר סקיצה' : 'הצג סקיצה'}
5455:                     >
5456:                       <Icon name="Image" size={15} />
5457:                     </button>
5458:                   )}
5459:                 </div>
5460:               </div>
5461: 
5462:               {/* SVG Canvas */}
5463:               <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
5464:                 <svg
5465:                   ref={svgRef}
5466:                   width="100%"
5467:                   height="100%"
5468:                   style={{ touchAction: 'none', background: 'var(--bg-secondary)' }}
5469:                   onTouchStart={e => {
5470:                     if (e.touches.length === 2) {
5471:                       const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
5472:                       panStart.current = { pinchDist: d, startZoom: zoom };
5473:                       setIsPanning(false);
5474:                     } else if (e.touches.length === 1 && !canvasLocked) {
5475:                       const t = e.touches[0];
5476:                       if (e.target === svgRef.current || e.target.tagName === 'svg' || e.target.tagName === 'image' || e.target.tagName === 'rect') {
5477:                         setIsPanning(true);
5478:                         panStart.current = { x: t.clientX - pan.x, y: t.clientY - pan.y };
5479:                       }
5480:                     }
5481:                   }}
5482:                   onTouchMove={e => {
5483:                     if (e.touches.length === 2 && panStart.current?.pinchDist) {
5484:                       e.preventDefault();
5485:                       const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
5486:                       const scale = d / panStart.current.pinchDist;
5487:                       setZoom(Math.max(0.15, Math.min(2.5, panStart.current.startZoom * scale)));
5488:                     } else if (isPanning && panStart.current && e.touches.length === 1) {
5489:                       e.preventDefault();
5490:                       const t = e.touches[0];
5491:                       setPan({ x: t.clientX - panStart.current.x, y: t.clientY - panStart.current.y });
5492:                     }
5493:                   }}
5494:                   onTouchEnd={() => { setIsPanning(false); if (panStart.current?.pinchDist) panStart.current = null; }}
5495:                   onMouseDown={e => {
5496:                     if (canvasLocked) return;
5497:                     if (e.target === svgRef.current || e.target.tagName === 'svg' || e.target.tagName === 'image') {
5498:                       setIsPanning(true);
5499:                       panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
5500:                     }
5501:                   }}
5502:                   onMouseMove={e => {
5503:                     if (isPanning && panStart.current) {
5504:                       setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
5505:                     }
5506:                   }}
5507:                   onMouseUp={() => setIsPanning(false)}
5508:                   onMouseLeave={() => setIsPanning(false)}
5509:                 >
5510:                   <defs>
5511:                     <pattern id="grid-dots-fs" width="40" height="40" patternUnits="userSpaceOnUse">
5512:                       <circle cx="20" cy="20" r="1" fill="var(--border-default)" opacity="0.5"/>
5513:                     </pattern>
5514:                   </defs>
5515:                   <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
5516:                     <rect x="0" y="0" width={canvasBounds.w} height={canvasBounds.h} fill="url(#grid-dots-fs)" rx="12" />
5517:                     <rect x="0" y="0" width={canvasBounds.w} height={canvasBounds.h} fill="none" stroke="var(--border-default)" strokeWidth="1.5" rx="12" opacity="0.5" />
5518:                     {event?.settings?.floorplan_url && sketchVisible && (
5519:                       <image
5520:                         href={event.settings.floorplan_url}
5521:                         x="0" y="0"
5522:                         width={canvasBounds.w} height={canvasBounds.h}
5523:                         preserveAspectRatio="xMidYMid meet"
5524:                         opacity={sketchOpacity}
5525:                         style={{ pointerEvents: 'none' }}
5526:                       />
5527:                     )}
5528:                     {tables.map(table => (
5529:                       <FloorTable
5530:                         key={table.id}
5531:                         table={table}
5532:                         guests={guests}
5533:                         selected={selectedFloorTable?.id === table.id}
5534:                         locked={isTableLocked(table.id)}
5535:                         onDragTable={handleTableMouseDown}
5536:                         onTouchTable={handleTableTouchStart}
5537:                         onClick={t => setSelectedFloorTable(selectedFloorTable?.id === t.id ? null : t)}
5538:                       />
5539:                     ))}
5540:                   </g>
5541:                 </svg>
5542: 
5543:                 {/* Sketch opacity slider (fullscreen) */}
5544:                 {event?.settings?.floorplan_url && sketchVisible && (
5545:                   <div style={{
5546:                     position: 'absolute', bottom: 12, right: 12, zIndex: 5,
5547:                     background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
5548:                     borderRadius: 'var(--radius-sm)', padding: '6px 10px',
5549:                     display: 'flex', alignItems: 'center', gap: 8, fontSize: 11,
5550:                     boxShadow: 'var(--shadow-sm)',
5551:                   }}>
5552:                     <Icon name="Image" size={12} style={{ color: 'var(--text-tertiary)' }} />
5553:                     <input
5554:                       type="range" min="0.05" max="0.8" step="0.05"
5555:                       value={sketchOpacity}
5556:                       onChange={e => setSketchOpacity(parseFloat(e.target.value))}
5557:                       style={{ width: 60, cursor: 'pointer', accentColor: 'var(--accent)' }}
5558:                     />
5559:                     <span style={{ color: 'var(--text-tertiary)', minWidth: 28 }}>{Math.round(sketchOpacity * 100)}%</span>
5560:                   </div>
5561:                 )}
5562: 
5563:                 {/* Selected table — bottom sheet */}
5564:                 {selectedFloorTable && (() => {
5565:                   const tGuests = guests.filter(g => g.table_id === selectedFloorTable.id);
5566:                   return (
5567:                     <div style={{
5568:                       position: 'absolute',
5569:                       bottom: 0, left: 0, right: 0,
5570:                       background: 'var(--bg-elevated)',
5571:                       borderTop: '1px solid var(--border-default)',
5572:                       borderRadius: '16px 16px 0 0',
5573:                       padding: '14px 16px',
5574:                       boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
5575:                       zIndex: 10,
5576:                       animation: 'slideUp 0.2s ease both',
5577:                     }}>
5578:                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
5579:                         <div>
5580:                           <span style={{ fontWeight: 700, fontSize: 15 }}>{selectedFloorTable.name}</span>
5581:                           <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 8 }}>
5582:                             {tGuests.reduce((s,g)=>s+(g.confirmed_guests||1),0)}/{selectedFloorTable.seats} מקומות
5583:                           </span>
5584:                         </div>
5585:                         <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => setSelectedFloorTable(null)}><Icon name="X" size={16}/></button>
5586:                       </div>
5587:                       {tGuests.length > 0 && (
5588:                         <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10, maxHeight: 50, overflowY: 'auto' }}>
5589:                           {tGuests.map(g => (
5590:                             <span key={g.id} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, padding:'2px 8px', background:'var(--bg-tertiary)', borderRadius:20 }}>
5591:                               <span style={{ width:5, height:5, borderRadius:'50%', background:getGroupColor(g.group_name) }}/>
5592:                               {g.name}
5593:                             </span>
5594:                           ))}
5595:                         </div>
5596:                       )}
5597:                       <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, padding:'4px 0' }}>
5598:                         <span style={{ fontSize:12, color:'var(--text-secondary)', whiteSpace:'nowrap' }}>גודל:</span>
5599:                         <button className="btn btn-secondary" style={{ width:30, height:28, padding:0, fontSize:14 }} onClick={() => changeTableScale(selectedFloorTable.id, -0.1)}>−</button>
5600:                         <span style={{ fontSize:12, fontWeight:600, minWidth:36, textAlign:'center' }}>{Math.round((selectedFloorTable.scale || 1) * 100)}%</span>
5601:                         <button className="btn btn-secondary" style={{ width:30, height:28, padding:0, fontSize:14 }} onClick={() => changeTableScale(selectedFloorTable.id, 0.1)}>+</button>
5602:                         {(selectedFloorTable.scale || 1) !== 1 && (
5603:                           <button className="btn btn-ghost" style={{ padding:'2px 6px', fontSize:11 }} onClick={() => changeTableScale(selectedFloorTable.id, 1 - (selectedFloorTable.scale || 1))}>איפוס</button>
5604:                         )}
5605:                       </div>
5606:                       <div style={{ display:'flex', gap:8 }}>
5607:                         <button className="btn btn-secondary" style={{ flex:1, padding:'8px 0', fontSize:13, background: lockedTableIds.has(selectedFloorTable.id) ? 'var(--accent-light)' : undefined, borderColor: lockedTableIds.has(selectedFloorTable.id) ? 'var(--accent)' : undefined, color: lockedTableIds.has(selectedFloorTable.id) ? 'var(--accent)' : undefined }} onClick={() => toggleTableLock(selectedFloorTable.id)}>
5608:                           <Icon name={lockedTableIds.has(selectedFloorTable.id) ? 'Lock' : 'Unlock'} size={14}/>{lockedTableIds.has(selectedFloorTable.id) ? 'נעול' : 'נעל'}
5609:                         </button>
5610:                         <button className="btn btn-secondary" style={{ flex:1, padding:'8px 0', fontSize:13 }} onClick={async ()=>{
5611:                           const newRot = ((selectedFloorTable.rotation || 0) + 45) % 360;
5612:                           await client.from('tables').update({ rotation: newRot }).eq('id', selectedFloorTable.id);
5613:                           setTables(prev => prev.map(t => t.id === selectedFloorTable.id ? { ...t, rotation: newRot } : t));
5614:                           setSelectedFloorTable(prev => ({ ...prev, rotation: newRot }));
5615:                         }}>
5616:                           <Icon name="RotateCw" size={14}/>סובב
5617:                         </button>
5618:                         <button className="btn btn-secondary" style={{ flex:1, padding:'8px 0', fontSize:13 }} onClick={()=>{setEditTable(selectedFloorTable); setSelectedFloorTable(null); setShowFullscreenFloor(false);}}>
5619:                           <Icon name="Pencil" size={14}/>ערוך
5620:                         </button>
5621:                         <button className="btn btn-danger" style={{ flex:1, padding:'8px 0', fontSize:13 }} onClick={()=>{ confirmDeleteTable(selectedFloorTable.id); setSelectedFloorTable(null); }}>
5622:                           <Icon name="Trash2" size={14}/>מחק
5623:                         </button>
5624:                       </div>
5625:                     </div>
5626:                   );
5627:                 })()}
5628:               </div>
5629: 
5630:               {/* Stats bar */}
5631:               <div style={{
5632:                 display: 'flex', justifyContent: 'space-around', padding: '8px 12px',
5633:                 borderTop: '1px solid var(--border-default)', background: 'var(--bg-elevated)',
5634:                 fontSize: 12, flexShrink: 0,
5635:               }}>
5636:                 <span><strong>{tables.length}</strong> שולחנות</span>
5637:                 <span><strong>{totalSeats}</strong> מקומות</span>
5638:                 <span style={{ color: 'var(--emerald-500)' }}><strong>{assignedCount}</strong> מושבים</span>
5639:                 <span style={{ color: 'var(--amber-500)' }}><strong>{unassigned.length}</strong> חסרים</span>
5640:               </div>
5641:             </div>
5642:           )}
5643:         </div>
5644:       );
5645:     }
5646: 
5647:     // ============================================
5648:     // Events List Page
5649:     // ============================================
5650:     function EventsPage({ onSelectEvent, selectedEventId, onClearSelectedEvent }) {
5651:       const { client } = useContext(SupabaseContext);
5652:       const { addToast } = useContext(ToastContext);
5653:       const { plan, limits, canAdd, openCheckout, setShowUpgradeModal } = useContext(PlanContext);
5654:       const [events, setEvents] = useState([]);
5655:       const [eventStats, setEventStats] = useState({});
5656:       const [loading, setLoading] = useState(true);
5657:       const [showCreate, setShowCreate] = useState(false);
5658:       const [deleteEventTarget, setDeleteEventTarget] = useState(null);
5659:       const [newEvent, setNewEvent] = useState({ name: '', event_type: 'wedding', event_date: '', venue_name: '' });
5660: 
5661:       useEffect(() => {
5662:         fetchEvents();
5663:       }, [client]);
5664: 
5665:       const fetchEvents = async () => {
5666:         if (!client) return;
5667:         setLoading(true);
5668:         const { data, error } = await client.from('events').select('*').order('created_at', { ascending: false });
5669:         if (error) {
5670:           addToast('שגיאה בטעינת אירועים', 'error');
5671:         } else {
5672:           setEvents(data || []);
5673:           // Fetch guest stats for each event
5674:           if (data && data.length > 0) {
5675:             const { data: guests } = await client.from('guests')
5676:               .select('event_id, status, confirmed_guests')
5677:               .in('event_id', data.map(e => e.id));
5678:             if (guests) {
5679:               const stats = {};
5680:               guests.forEach(g => {
5681:                 if (!stats[g.event_id]) stats[g.event_id] = { total: 0, confirmed: 0, totalGuests: 0 };
5682:                 stats[g.event_id].total++;
5683:                 if (g.status === 'confirmed') {
5684:                   stats[g.event_id].confirmed++;
5685:                   stats[g.event_id].totalGuests += (g.confirmed_guests || 0);
5686:                 }
5687:               });
5688:               setEventStats(stats);
5689:             }
5690:           }
5691:         }
5692:         setLoading(false);
5693:       };
5694: 
5695:       const deleteEvent = async () => {
5696:         if (!deleteEventTarget) return;
5697:         const { error } = await client.from('events').delete().eq('id', deleteEventTarget.id);
5698:         if (error) {
5699:           addToast('שגיאה במחיקת אירוע: ' + error.message, 'error');
5700:         } else {
5701:           setEvents(prev => prev.filter(e => e.id !== deleteEventTarget.id));
5702:           if (selectedEventId === deleteEventTarget.id) {
5703:             localStorage.removeItem('seatsync-selected-event');
5704:             // Bug fix 2.1: clear parent state so TopBar + pages reset
5705:             if (onClearSelectedEvent) onClearSelectedEvent();
5706:           }
5707:           addToast('האירוע נמחק', 'success');
5708:         }
5709:         setDeleteEventTarget(null);
5710:       };
5711: 
5712:       const createEvent = async () => {
5713:         if (!newEvent.name.trim()) return;
5714:         // Plan limit check
5715:         if (!canAdd('events', events.length)) {
5716:           addToast(`תוכנית ${limits.label} מאפשרת עד ${limits.events} אירועים. שדרגו לתוכנית גבוהה יותר.`, 'error');
5717:           setShowUpgradeModal(true);
5718:           return;
5719:         }
5720:         const { data: { user } } = await client.auth.getUser();
5721:         if (!user) { addToast('שגיאה: לא מחובר', 'error'); return; }
5722: 
5723:         // Ensure profile exists (handles case where DB trigger didn't fire)
5724:         const { data: existingProfile } = await client.from('profiles').select('id').eq('id', user.id).single();
5725:         if (!existingProfile) {
5726:           const { error: profileErr } = await client.from('profiles').insert({
5727:             id: user.id,
5728:             full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
5729:             phone: user.user_metadata?.phone || '',
5730:           });
5731:           if (profileErr && !profileErr.message?.includes('duplicate')) {
5732:             addToast('שגיאה ביצירת פרופיל: ' + profileErr.message, 'error');
5733:             return;
5734:           }
5735:         }
5736: 
5737:         const { data, error } = await client.from('events').insert({
5738:           name: newEvent.name.trim(),
5739:           event_type: newEvent.event_type,
5740:           event_date: newEvent.event_date || null,
5741:           venue_name: newEvent.venue_name || null,
5742:           user_id: user.id,
5743:         }).select().single();
5744: 
5745:         if (error) {
5746:           addToast('שגיאה ביצירת אירוע: ' + error.message, 'error');
5747:         } else {
5748:           setEvents(prev => [data, ...prev]);
5749:           setShowCreate(false);
5750:           setNewEvent({ name: '', event_type: 'wedding', event_date: '', venue_name: '' });
5751:           onSelectEvent(data);
5752:           addToast('האירוע נוצר בהצלחה! 🎉', 'success');
5753:         }
5754:       };
5755: 
5756:       const eventTypeLabels = {
5757:         wedding: '💒 חתונה',
5758:         bar_mitzvah: '✡️ בר מצווה',
5759:         bat_mitzvah: '✡️ בת מצווה',
5760:         brit_mila: '👶 ברית',
5761:         brit_bat: '👶 בריתה',
5762:         corporate: '🏢 עסקי',
5763:         birthday: '🎂 יום הולדת',
5764:         other: '🎉 אחר',
5765:       };
5766: 
5767:       return (
5768:         <div className="animate-slide-up">
5769:           <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
5770:             <div>
5771:               <div className="page-title">האירועים שלי</div>
5772:               <div className="page-subtitle">{events.length} אירועים</div>
5773:             </div>
5774:             <button className="btn btn-primary" onClick={() => {
5775:               if (!canAdd('events', events.length)) {
5776:                 addToast(`תוכנית ${limits.label} מאפשרת עד ${limits.events} אירועים. שדרגו כדי להוסיף עוד.`, 'error');
5777:                 setShowUpgradeModal(true);
5778:                 return;
5779:               }
5780:               setShowCreate(true);
5781:             }}>
5782:               <Icon name="Plus" size={18} />
5783:               אירוע חדש
5784:             </button>
5785:           </div>
5786: 
5787:           {/* Plan limits indicator */}
5788:           {events.length > 0 && (
5789:             <div style={{ marginBottom: 12, padding: '8px 14px', borderRadius: 'var(--radius-sm)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: events.length >= limits.events ? 'rgba(239,68,68,0.08)' : 'var(--bg-secondary)', border: events.length >= limits.events ? '1px solid rgba(239,68,68,0.2)' : '1px solid var(--border-default)' }}>
5790:               <span style={{ color: events.length >= limits.events ? 'var(--red-500)' : 'var(--text-secondary)' }}>
5791:                 {events.length}/{limits.events} אירועים · תוכנית {limits.label}
5792:               </span>
5793:               {events.length >= limits.events && (
5794:                 <button className="btn" style={{ padding: '4px 12px', fontSize: 11, background: 'var(--gold-400)', color: 'white', borderRadius: 'var(--radius-sm)' }} onClick={() => setShowUpgradeModal(true)}>
5795:                   <Icon name="Zap" size={12} /> שדרג
5796:                 </button>
5797:               )}
5798:             </div>
5799:           )}
5800: 
5801:           {showCreate && (
5802:             <div className="card animate-scale-in" style={{ marginBottom: 20 }}>
5803:               <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>אירוע חדש</div>
5804:               <div className="input-group">
5805:                 <label className="input-label">שם האירוע</label>
5806:                 <input className="input-field" placeholder='למשל: "החתונה של דני ומיכל"' value={newEvent.name} onChange={e => setNewEvent({...newEvent, name: e.target.value})} />
5807:               </div>
5808:               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
5809:                 <div className="input-group">
5810:                   <label className="input-label">סוג אירוע</label>
5811:                   <select className="input-field" value={newEvent.event_type} onChange={e => setNewEvent({...newEvent, event_type: e.target.value})}>
5812:                     <option value="wedding">חתונה</option>
5813:                     <option value="bar_mitzvah">בר מצווה</option>
5814:                     <option value="bat_mitzvah">בת מצווה</option>
5815:                     <option value="brit_mila">ברית</option>
5816:                     <option value="brit_bat">בריתה</option>
5817:                     <option value="corporate">אירוע עסקי</option>
5818:                     <option value="birthday">יום הולדת</option>
5819:                     <option value="other">אחר</option>
5820:                   </select>
5821:                 </div>
5822:                 <div className="input-group">
5823:                   <label className="input-label">תאריך</label>
5824:                   <input className="input-field" type="date" value={newEvent.event_date} onChange={e => setNewEvent({...newEvent, event_date: e.target.value})} dir="ltr" />
5825:                 </div>
5826:               </div>
5827:               <div className="input-group">
5828:                 <label className="input-label">מיקום</label>
5829:                 <input className="input-field" placeholder="שם האולם / כתובת" value={newEvent.venue_name} onChange={e => setNewEvent({...newEvent, venue_name: e.target.value})} />
5830:               </div>
5831:               <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
5832:                 <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>ביטול</button>
5833:                 <button className="btn btn-primary" onClick={createEvent}>
5834:                   <Icon name="Check" size={18} />
5835:                   צור אירוע
5836:                 </button>
5837:               </div>
5838:             </div>
5839:           )}
5840: 
5841:           {loading ? (
5842:             <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
5843:               {[1,2,3].map(i => (
5844:                 <div key={i} className="skeleton" style={{ height: 120 }} />
5845:               ))}
5846:             </div>
5847:           ) : events.length === 0 ? (
5848:             <div className="empty-state">
5849:               <div className="empty-state-icon"><Icon name="CalendarHeart" size={36} /></div>
5850:               <div className="empty-state-title">אין אירועים עדיין</div>
5851:               <div className="empty-state-text">צרו את האירוע הראשון שלכם ותתחילו לנהל מוזמנים</div>
5852:               <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
5853:                 <Icon name="Plus" size={18} />
5854:                 אירוע חדש
5855:               </button>
5856:             </div>
5857:           ) : (
5858:             <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
5859:               {events.map((ev, idx) => {
5860:                 const stats = eventStats[ev.id] || { total: 0, confirmed: 0, totalGuests: 0 };
5861:                 return (
5862:                 <div
5863:                   key={ev.id}
5864:                   className={`event-card animate-slide-up stagger-${Math.min(idx + 1, 5)}`}
5865:                   onClick={() => onSelectEvent(ev)}
5866:                   style={{ borderColor: selectedEventId === ev.id ? 'var(--gold-400)' : undefined }}
5867:                 >
5868:                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
5869:                     <div className="event-card-name">{ev.name}</div>
5870:                     <button
5871:                       className="icon-btn"
5872:                       style={{ width: 30, height: 30, color: 'var(--red-400)', flexShrink: 0 }}
5873:                       onClick={e => { e.stopPropagation(); setDeleteEventTarget(ev); }}
5874:                       title="מחק אירוע"
5875:                     >
5876:                       <Icon name="Trash2" size={15} />
5877:                     </button>
5878:                   </div>
5879:                   <div className="event-card-meta">
5880:                     <span className="event-card-meta-item">
5881:                       <Icon name="Tag" size={14} />
5882:                       {eventTypeLabels[ev.event_type] || ev.event_type}
5883:                     </span>
5884:                     {ev.event_date && (
5885:                       <span className="event-card-meta-item">
5886:                         <Icon name="Calendar" size={14} />
5887:                         {new Date(ev.event_date).toLocaleDateString('he-IL')}
5888:                       </span>
5889:                     )}
5890:                     {ev.venue_name && (
5891:                       <span className="event-card-meta-item">
5892:                         <Icon name="MapPin" size={14} />
5893:                         {ev.venue_name}
5894:                       </span>
5895:                     )}
5896:                   </div>
5897:                   {stats.total > 0 && (
5898:                     <div className="event-card-stats">
5899:                       <div className="event-card-stat">
5900:                         <div className="event-card-stat-value">{stats.total}</div>
5901:                         <div className="event-card-stat-label">מוזמנים</div>
5902:                       </div>
5903:                       <div className="event-card-stat">
5904:                         <div className="event-card-stat-value" style={{ color: 'var(--emerald-500)' }}>{stats.confirmed}</div>
5905:                         <div className="event-card-stat-label">אישרו</div>
5906:                       </div>
5907:                       <div className="event-card-stat">
5908:                         <div className="event-card-stat-value" style={{ color: 'var(--gold-500)' }}>{stats.totalGuests}</div>
5909:                         <div className="event-card-stat-label">נפשות</div>
5910:                       </div>
5911:                     </div>
5912:                   )}
5913:                 </div>
5914:                 );
5915:               })}
5916:             </div>
5917:           )}
5918: 
5919:           {/* Delete Event Confirmation */}
5920:           {deleteEventTarget && (
5921:             <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteEventTarget(null)}>
5922:               <div className="modal-content animate-scale-in" style={{ maxWidth: 380 }}>
5923:                 <div className="confirm-dialog">
5924:                   <div className="confirm-dialog-icon">
5925:                     <Icon name="Trash2" size={24} style={{ color: 'var(--red-500)' }} />
5926:                   </div>
5927:                   <div className="confirm-dialog-title">מחיקת אירוע</div>
5928:                   <div className="confirm-dialog-text">
5929:                     למחוק את "{deleteEventTarget.name}"? כל המוזמנים, השולחנות וההודעות הקשורים לאירוע יימחקו לצמיתות.
5930:                   </div>
5931:                   <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
5932:                     <button className="btn btn-ghost" onClick={() => setDeleteEventTarget(null)}>ביטול</button>
5933:                     <button className="btn btn-danger" onClick={deleteEvent} style={{ padding: '10px 24px' }}>
5934:                       <Icon name="Trash2" size={18} />מחק לצמיתות
5935:                     </button>
5936:                   </div>
5937:                 </div>
5938:               </div>
5939:             </div>
5940:           )}
5941:         </div>
5942:       );
5943:     }
5944: 
5945:     // ============================================
5946:     // Need Event State (shared)
5947:     // ============================================
5948:     function NeedEventState() {
5949:       return (
5950:         <div className="empty-state animate-slide-up">
5951:           <div className="empty-state-icon"><Icon name="CalendarHeart" size={36} /></div>
5952:           <div className="empty-state-title">בחרו אירוע</div>
5953:           <div className="empty-state-text">עברו ללשונית "אירועים" כדי לבחור או ליצור אירוע</div>
5954:         </div>
5955:       );
5956:     }
5957: 
5958:     // ============================================
5959:     // Top Bar
5960:     // ============================================
5961:     function TopBar({ event, onSettings, currentRoute, onNavigate }) {
5962:       const { theme, toggleTheme } = useContext(ThemeContext);
5963:       const { user } = useContext(SupabaseContext);
5964: 
5965:       const ROUTE_LABELS = {
5966:         events: 'אירועים', dashboard: 'דשבורד', guests: 'מוזמנים',
5967:         messages: 'הודעות', seating: 'הושבה', expenses: 'הוצאות',
5968:         gifts: 'מתנות', settings: 'הגדרות',
5969:       };
5970: 
5971:       return (
5972:         <div className="top-bar">
5973:           <div className="top-bar-logo">
5974:             <div className="top-bar-logo-icon">
5975:               <img src="Icon-192.png" alt="SeatSync" width="34" height="34" style={{ borderRadius: 9 }} />
5976:             </div>
5977:             {/* Desktop breadcrumbs */}
5978:             <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
5979:               <span
5980:                 className="top-bar-logo-text"
5981:                 style={{ cursor: event ? 'pointer' : 'default' }}
5982:                 onClick={() => event && onNavigate && onNavigate(ROUTES.EVENTS)}
5983:                 title={event ? 'חזרה לאירועים' : ''}
5984:               >
5985:                 SeatSync
5986:               </span>
5987:               {event && (
5988:                 <>
5989:                   <span style={{ color: 'var(--text-tertiary)', fontSize: 14, margin: '0 2px' }}>›</span>
5990:                   <span style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
5991:                     {event.name}
5992:                   </span>
5993:                   {currentRoute && currentRoute !== ROUTES.EVENTS && currentRoute !== ROUTES.DASHBOARD && (
5994:                     <>
5995:                       <span style={{ color: 'var(--text-tertiary)', fontSize: 14, margin: '0 2px' }}>›</span>
5996:                       <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
5997:                         {ROUTE_LABELS[currentRoute] || currentRoute}
5998:                       </span>
5999:                     </>
6000:                   )}
6001:                 </>
6002:               )}
6003:             </div>
6004:           </div>
6005:           <div className="top-bar-actions">
6006:             <button className="icon-btn" onClick={toggleTheme} aria-label="החלפת מצב תצוגה" title={theme === 'dark' ? 'מצב יום' : 'מצב לילה'}>
6007:               <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={20} />
6008:             </button>
6009:             {user && onSettings && (
6010:               <button className="icon-btn" onClick={onSettings} title="הגדרות (S)">
6011:                 <Icon name="Settings" size={20} />
6012:               </button>
6013:             )}
6014:           </div>
6015:         </div>
6016:       );
6017:     }
6018: 
6019:     // ============================================
6020:     // Bottom Navigation
6021:     // ============================================
6022:     function BottomNav({ currentRoute, onNavigate, items: propItems }) {
6023:       const items = propItems || [
6024:         { id: ROUTES.EVENTS,    icon: 'CalendarDays',    label: 'אירועים' },
6025:         { id: ROUTES.DASHBOARD, icon: 'LayoutDashboard', label: 'דשבורד' },
6026:         { id: ROUTES.GUESTS,    icon: 'Users',           label: 'מוזמנים' },
6027:         { id: ROUTES.MESSAGES,  icon: 'Send',            label: 'הודעות' },
6028:         { id: ROUTES.SEATING,   icon: 'Armchair',        label: 'הושבה' },
6029:         { id: ROUTES.EXPENSES,  icon: 'Receipt',         label: 'הוצאות' },
6030:         { id: ROUTES.GIFTS,     icon: 'Gift',            label: 'מתנות' },
6031:         { id: ROUTES.SETTINGS,  icon: 'Settings',        label: 'הגדרות' },
6032:       ];
6033: 
6034:       return (
6035:         <nav className="bottom-nav">
6036:           {items.map(item => (
6037:             <button
6038:               key={item.id}
6039:               className={`bottom-nav-item ${currentRoute === item.id ? 'active' : ''}`}
6040:               onClick={() => onNavigate(item.id)}
6041:               aria-label={item.label}
6042:             >
6043:               <Icon name={item.icon} size={22} />
6044:               <span>{item.label}</span>
6045:             </button>
6046:           ))}
6047:         </nav>
6048:       );
6049:     }
6050: 
6051:     // ============================================
6052:     // Expenses Page
6053:     // ============================================
6054:     const BUILT_IN_EXPENSES = [
6055:       { category: 'venue_per_plate', name: 'מחיר למנה באולם', icon: 'UtensilsCrossed', color: '#10B981', bg: 'rgba(16,185,129,0.1)', is_per_person: true },
6056:       { category: 'dj',             name: 'DJ / מוזיקה',      icon: 'Music',           color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', is_per_person: false },
6057:       { category: 'rabbi',          name: 'רב / עורך טקס',   icon: 'BookOpen',        color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', is_per_person: false },
6058:       { category: 'photographer',   name: 'צלם',              icon: 'Camera',          color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', is_per_person: false },
6059:       { category: 'videographer',   name: 'צלם וידאו',        icon: 'Video',           color: '#EF4444', bg: 'rgba(239,68,68,0.1)', is_per_person: false },
6060:       { category: 'flowers',        name: 'פרחים / עיצוב',   icon: 'Flower2',         color: '#EC4899', bg: 'rgba(236,72,153,0.1)', is_per_person: false },
6061:       { category: 'makeup_hair',    name: 'איפור ושיער',      icon: 'Sparkles',        color: '#F97316', bg: 'rgba(249,115,22,0.1)', is_per_person: false },
6062:       { category: 'dress',          name: 'שמלת כלה',         icon: 'Star',            color: '#A855F7', bg: 'rgba(168,85,247,0.1)', is_per_person: false },
6063:       { category: 'suit',           name: 'חליפת חתן',        icon: 'Briefcase',       color: '#6366F1', bg: 'rgba(99,102,241,0.1)', is_per_person: false },
6064:       { category: 'rings',          name: 'טבעות',            icon: 'Circle',          color: '#D4A808', bg: 'rgba(212,168,8,0.1)', is_per_person: false },
6065:       { category: 'cake',           name: 'עוגת חתונה',       icon: 'Cake',            color: '#F43F5E', bg: 'rgba(244,63,94,0.1)', is_per_person: false },
6066:       { category: 'invitations',    name: 'הזמנות',           icon: 'Mail',            color: '#0EA5E9', bg: 'rgba(14,165,233,0.1)', is_per_person: false },
6067:       { category: 'transportation', name: 'תחבורה / הסעות',  icon: 'Bus',             color: '#64748B', bg: 'rgba(100,116,139,0.1)', is_per_person: false },
6068:       { category: 'venue_rental',   name: 'שכירת אולם',       icon: 'Building2',       color: '#059669', bg: 'rgba(5,150,105,0.1)', is_per_person: false },
6069:       { category: 'lighting',       name: 'תאורה / סאונד',   icon: 'Lightbulb',       color: '#FBBF24', bg: 'rgba(251,191,36,0.1)', is_per_person: false },
6070:       { category: 'wedding_planner',name: 'מנהל אירוע',       icon: 'ClipboardList',   color: '#14B8A6', bg: 'rgba(20,184,166,0.1)', is_per_person: false },
6071:     ];
6072: 
6073:     const EXPENSES_MIGRATION_SQL = `CREATE TABLE IF NOT EXISTS expenses (
6074:   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
6075:   event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
6076:   category TEXT NOT NULL DEFAULT 'custom',
6077:   name TEXT NOT NULL,
6078:   amount DECIMAL(10,2) NOT NULL DEFAULT 0,
6079:   is_per_person BOOLEAN DEFAULT false,
6080:   notes TEXT,
6081:   created_at TIMESTAMPTZ DEFAULT now(),
6082:   updated_at TIMESTAMPTZ DEFAULT now()
6083: );
6084: CREATE INDEX IF NOT EXISTS idx_expenses_event ON expenses(event_id);
6085: ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
6086: DROP POLICY IF EXISTS "Users can manage expenses of own events" ON expenses;
6087: CREATE POLICY "Users can manage expenses of own events"
6088:   ON expenses FOR ALL USING (
6089:     event_id IN (SELECT id FROM events WHERE user_id = auth.uid())
6090:   ) WITH CHECK (
6091:     event_id IN (SELECT id FROM events WHERE user_id = auth.uid())
6092:   );
6093: NOTIFY pgrst, 'reload schema';`;
6094: 
6095:     const GIFTS_MIGRATION_SQL = `CREATE TABLE IF NOT EXISTS gifts (
6096:   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
6097:   event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
6098:   guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
6099:   guest_name TEXT NOT NULL DEFAULT '',
6100:   amount DECIMAL(10,2) NOT NULL DEFAULT 0,
6101:   notes TEXT,
6102:   created_at TIMESTAMPTZ DEFAULT now(),
6103:   updated_at TIMESTAMPTZ DEFAULT now()
6104: );
6105: CREATE INDEX IF NOT EXISTS idx_gifts_event ON gifts(event_id);
6106: CREATE INDEX IF NOT EXISTS idx_gifts_guest ON gifts(guest_id);
6107: ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
6108: DROP POLICY IF EXISTS "Users can manage gifts of own events" ON gifts;
6109: CREATE POLICY "Users can manage gifts of own events"
6110:   ON gifts FOR ALL USING (
6111:     event_id IN (SELECT id FROM events WHERE user_id = auth.uid())
6112:   ) WITH CHECK (
6113:     event_id IN (SELECT id FROM events WHERE user_id = auth.uid())
6114:   );
6115: NOTIFY pgrst, 'reload schema';`;
6116: 
6117:     const isMissingTableError = (err) => {
6118:       if (!err) return false;
6119:       if (err.code === 'PGRST205' || err.code === '42P01') return true;
6120:       const msg = (err.message || '').toLowerCase();
6121:       return msg.includes('schema cache') || msg.includes("could not find the table");
6122:     };
6123: 
6124:     function ExpensesPage({ event }) {
6125:       const { client } = useContext(SupabaseContext);
6126:       const { addToast } = useContext(ToastContext);
6127:       const [expenses, setExpenses] = useState([]);
6128:       const [guests, setGuests] = useState([]);
6129:       const [loading, setLoading] = useState(true);
6130:       const [saving, setSaving] = useState(false);
6131:       const [tableMissing, setTableMissing] = useState(false);
6132:       const [sqlCopied, setSqlCopied] = useState(false);
6133:       const [localAmounts, setLocalAmounts] = useState({});
6134:       const [showAddCustom, setShowAddCustom] = useState(false);
6135:       const [customName, setCustomName] = useState('');
6136:       const [customAmount, setCustomAmount] = useState('');
6137:       const [customPerPerson, setCustomPerPerson] = useState(false);
6138: 
6139:       useEffect(() => {
6140:         if (!event?.id) return;
6141:         fetchData();
6142:       }, [client, event?.id]);
6143: 
6144:       const fetchData = async () => {
6145:         if (!client || !event?.id) return;
6146:         setLoading(true);
6147:         const [{ data: exp, error: expError }, { data: g, error: gError }] = await Promise.all([
6148:           client.from('expenses').select('*').eq('event_id', event.id).order('created_at'),
6149:           client.from('guests').select('id,confirmed_guests,status').eq('event_id', event.id),
6150:         ]);
6151:         if (isMissingTableError(expError)) {
6152:           setTableMissing(true);
6153:         } else {
6154:           setTableMissing(false);
6155:           if (expError) addToast('שגיאה בטעינת הוצאות: ' + expError.message, 'error');
6156:         }
6157:         if (gError) addToast('שגיאה בטעינת אורחים: ' + gError.message, 'error');
6158:         setExpenses(exp || []);
6159:         setGuests(g || []);
6160:         const amounts = {};
6161:         (exp || []).forEach(e => { amounts[e.category] = e.amount; });
6162:         setLocalAmounts(amounts);
6163:         setLoading(false);
6164:       };
6165: 
6166:       const copyMigrationSql = async () => {
6167:         try {
6168:           await navigator.clipboard.writeText(EXPENSES_MIGRATION_SQL);
6169:           setSqlCopied(true);
6170:           addToast('ה־SQL הועתק ✓', 'success');
6171:           setTimeout(() => setSqlCopied(false), 2000);
6172:         } catch {
6173:           addToast('לא ניתן להעתיק אוטומטית — סמנו והעתיקו ידנית', 'error');
6174:         }
6175:       };
6176: 
6177:       const totalGuests = useMemo(() =>
6178:         guests.filter(g => g.status === 'confirmed').reduce((s, g) => s + (g.confirmed_guests || 0), 0),
6179:       [guests]);
6180: 
6181:       const saveExpense = async (category, name, amount, isPerPerson) => {
6182:         if (!client || !event?.id) return false;
6183:         if (tableMissing) return false;
6184:         setSaving(true);
6185:         const existing = expenses.find(e => e.category === category);
6186:         const val = parseFloat(amount) || 0;
6187:         let ok = false;
6188:         if (existing) {
6189:           const { error } = await client.from('expenses').update({ amount: val }).eq('id', existing.id);
6190:           if (error) {
6191:             if (isMissingTableError(error)) setTableMissing(true);
6192:             else addToast('שגיאה בשמירת הוצאה: ' + error.message, 'error');
6193:           } else {
6194:             setExpenses(prev => prev.map(e => e.category === category ? { ...e, amount: val } : e));
6195:             ok = true;
6196:           }
6197:         } else if (val > 0) {
6198:           const { data, error } = await client.from('expenses').insert({
6199:             event_id: event.id, category, name, amount: val, is_per_person: isPerPerson
6200:           }).select().single();
6201:           if (error) {
6202:             if (isMissingTableError(error)) setTableMissing(true);
6203:             else addToast('שגיאה בשמירת הוצאה: ' + error.message, 'error');
6204:           } else if (data) {
6205:             setExpenses(prev => [...prev, data]);
6206:             ok = true;
6207:           }
6208:         } else {
6209:           ok = true;
6210:         }
6211:         setSaving(false);
6212:         return ok;
6213:       };
6214: 
6215:       const deleteExpense = async (category) => {
6216:         if (!client || !event?.id) return;
6217:         if (tableMissing) return;
6218:         const existing = expenses.find(e => e.category === category);
6219:         if (!existing) return;
6220:         const { error } = await client.from('expenses').delete().eq('id', existing.id);
6221:         if (error) {
6222:           if (isMissingTableError(error)) setTableMissing(true);
6223:           else addToast('שגיאה במחיקת הוצאה: ' + error.message, 'error');
6224:           return;
6225:         }
6226:         setExpenses(prev => prev.filter(e => e.category !== category));
6227:         setLocalAmounts(prev => { const n = { ...prev }; delete n[category]; return n; });
6228:         addToast('ההוצאה נמחקה', 'success');
6229:       };
6230: 
6231:       const handleAmountBlur = (category, name, isPerPerson) => {
6232:         const val = localAmounts[category] || '0';
6233:         saveExpense(category, name, val, isPerPerson);
6234:       };
6235: 
6236:       const addCustomExpense = async () => {
6237:         if (!customName.trim()) { addToast('הזינו שם להוצאה', 'error'); return; }
6238:         if (tableMissing) return;
6239:         const cat = 'custom_' + Date.now();
6240:         const ok = await saveExpense(cat, customName.trim(), customAmount || '0', customPerPerson);
6241:         if (!ok) return;
6242:         await fetchData();
6243:         setCustomName(''); setCustomAmount(''); setCustomPerPerson(false); setShowAddCustom(false);
6244:         addToast('הוצאה נוספה ✓', 'success');
6245:       };
6246: 
6247:       const totalFixed = useMemo(() => expenses
6248:         .filter(e => !e.is_per_person)
6249:         .reduce((s, e) => s + parseFloat(e.amount || 0), 0), [expenses]);
6250: 
6251:       const totalPerPerson = useMemo(() => expenses
6252:         .filter(e => e.is_per_person)
6253:         .reduce((s, e) => s + parseFloat(e.amount || 0), 0), [expenses]);
6254: 
6255:       const totalEvent = totalFixed + totalPerPerson * (totalGuests || 0);
6256:       const costPerHead = totalGuests > 0 ? totalEvent / totalGuests : 0;
6257: 
6258:       const exportExpensesExcel = () => {
6259:         const rows = [];
6260:         BUILT_IN_EXPENSES.forEach(b => {
6261:           const exp = expenses.find(e => e.category === b.category);
6262:           const amt = parseFloat(exp?.amount || 0);
6263:           if (amt > 0) rows.push({
6264:             'קטגוריה': b.name,
6265:             'סכום (₪)': amt,
6266:             'לפי נפש': b.is_per_person ? 'כן' : 'לא',
6267:             'סה"כ (₪)': b.is_per_person ? amt * totalGuests : amt,
6268:           });
6269:         });
6270:         expenses.filter(e => e.category.startsWith('custom_')).forEach(e => {
6271:           rows.push({
6272:             'קטגוריה': e.name,
6273:             'סכום (₪)': parseFloat(e.amount || 0),
6274:             'לפי נפש': e.is_per_person ? 'כן' : 'לא',
6275:             'סה"כ (₪)': e.is_per_person ? parseFloat(e.amount || 0) * totalGuests : parseFloat(e.amount || 0),
6276:           });
6277:         });
6278:         rows.push({});
6279:         rows.push({ 'קטגוריה': 'סה"כ הוצאות', 'סכום (₪)': '', 'לפי נפש': '', 'סה"כ (₪)': totalEvent });
6280:         rows.push({ 'קטגוריה': 'עלות לנפש', 'סכום (₪)': '', 'לפי נפש': '', 'סה"כ (₪)': Math.round(costPerHead) });
6281: 
6282:         const ws = XLSX.utils.json_to_sheet(rows);
6283:         ws['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 14 }];
6284:         const wb = XLSX.utils.book_new();
6285:         XLSX.utils.book_append_sheet(wb, ws, 'הוצאות');
6286:         XLSX.writeFile(wb, `הוצאות_${event.name}_${new Date().toLocaleDateString('he-IL').replace(/\./g,'-')}.xlsx`);
6287:         addToast('ייצוא אקסל הושלם ✓', 'success');
6288:       };
6289: 
6290:       const exportExpensesPDF = async () => {
6291:         try {
6292:           addToast('מייצא PDF...', 'info');
6293:           const { jsPDF } = window.jspdf;
6294:           const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
6295:           const gold = [212, 168, 8];
6296:           const dark = [26, 26, 26];
6297: 
6298:           doc.setFillColor(...gold);
6299:           doc.rect(0, 0, 210, 38, 'F');
6300:           doc.setTextColor(255, 255, 255);
6301:           doc.setFont('helvetica', 'bold');
6302:           doc.setFontSize(22);
6303:           doc.text('Event Expenses', 105, 16, { align: 'center' });
6304:           doc.setFontSize(12);
6305:           doc.setFont('helvetica', 'normal');
6306:           doc.text(event?.name || '', 105, 25, { align: 'center' });
6307:           doc.setFontSize(10);
6308:           doc.text(new Date().toLocaleDateString('he-IL'), 105, 33, { align: 'center' });
6309: 
6310:           let y = 50;
6311:           const cols = [15, 95, 130, 165];
6312:           doc.setFillColor(240, 237, 230);
6313:           doc.rect(10, y - 5, 190, 10, 'F');
6314:           doc.setTextColor(...dark);
6315:           doc.setFont('helvetica', 'bold');
6316:           doc.setFontSize(10);
6317:           doc.text('Category', cols[0], y);
6318:           doc.text('Amount', cols[1], y);
6319:           doc.text('Per Person', cols[2], y);
6320:           doc.text('Total', cols[3], y);
6321:           y += 8;
6322: 
6323:           let rowIdx = 0;
6324:           const allExpenses = [
6325:             ...BUILT_IN_EXPENSES.filter(b => {
6326:               const e = expenses.find(ex => ex.category === b.category);
6327:               return e && parseFloat(e.amount || 0) > 0;
6328:             }).map(b => {
6329:               const e = expenses.find(ex => ex.category === b.category);
6330:               return { name: b.name, amount: parseFloat(e.amount || 0), is_per_person: b.is_per_person };
6331:             }),
6332:             ...expenses.filter(e => e.category.startsWith('custom_')).map(e => ({
6333:               name: e.name, amount: parseFloat(e.amount || 0), is_per_person: e.is_per_person
6334:             }))
6335:           ];
6336: 
6337:           allExpenses.forEach(item => {
6338:             if (y > 270) { doc.addPage(); y = 20; }
6339:             if (rowIdx % 2 === 0) {
6340:               doc.setFillColor(250, 249, 245);
6341:               doc.rect(10, y - 5, 190, 9, 'F');
6342:             }
6343:             doc.setTextColor(...dark);
6344:             doc.setFont('helvetica', 'normal');
6345:             doc.setFontSize(9);
6346:             const total = item.is_per_person ? item.amount * totalGuests : item.amount;
6347:             doc.text(item.name, cols[0], y);
6348:             doc.text(`${item.amount.toLocaleString()} ILS`, cols[1], y);
6349:             doc.text(item.is_per_person ? 'Yes' : 'No', cols[2], y);
6350:             doc.text(`${total.toLocaleString()} ILS`, cols[3], y);
6351:             y += 9; rowIdx++;
6352:           });
6353: 
6354:           y += 4;
6355:           doc.setDrawColor(...gold);
6356:           doc.setLineWidth(0.8);
6357:           doc.line(10, y, 200, y);
6358:           y += 8;
6359:           doc.setFillColor(...gold);
6360:           doc.rect(10, y - 5, 190, 26, 'F');
6361:           doc.setTextColor(255, 255, 255);
6362:           doc.setFont('helvetica', 'bold');
6363:           doc.setFontSize(11);
6364:           doc.text('Total Event Cost:', cols[0], y + 2);
6365:           doc.text(`${Math.round(totalEvent).toLocaleString()} ILS`, cols[3], y + 2);
6366:           doc.setFontSize(10);
6367:           doc.text(`Cost per guest (${totalGuests} guests):`, cols[0], y + 11);
6368:           doc.text(`${Math.round(costPerHead).toLocaleString()} ILS`, cols[3], y + 11);
6369: 
6370:           doc.save(`expenses-${(event?.name || 'event').replace(/\s+/g, '-')}.pdf`);
6371:           addToast('PDF יוצא בהצלחה ✓', 'success');
6372:         } catch (err) {
6373:           console.error(err);
6374:           addToast('שגיאה בייצוא PDF', 'error');
6375:         }
6376:       };
6377: 
6378:       if (!event) return (
6379:         <div className="empty-state animate-slide-up">
6380:           <div className="empty-state-icon"><Icon name="Receipt" size={36} /></div>
6381:           <div className="empty-state-title">בחרו אירוע</div>
6382:           <div className="empty-state-text">בחרו אירוע כדי לנהל הוצאות</div>
6383:         </div>
6384:       );
6385: 
6386:       if (loading) return (
6387:         <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
6388:           {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 68 }} />)}
6389:         </div>
6390:       );
6391: 
6392:       const customExpenses = expenses.filter(e => e.category.startsWith('custom_'));
6393: 
6394:       return (
6395:         <div className="animate-slide-up">
6396:           <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
6397:             <div>
6398:               <div className="page-title">ניהול הוצאות</div>
6399:               <div className="page-subtitle">הזינו את עלויות האירוע וקבלו חישוב מלא לנפש</div>
6400:             </div>
6401:             <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
6402:               <button className="btn btn-secondary" style={{ padding: '10px 14px' }} onClick={exportExpensesExcel} disabled={tableMissing}>
6403:                 <Icon name="FileSpreadsheet" size={18} /><span className="hide-mobile">אקסל</span>
6404:               </button>
6405:               <button className="btn btn-secondary" style={{ padding: '10px 14px' }} onClick={exportExpensesPDF} disabled={tableMissing}>
6406:                 <Icon name="FileText" size={18} /><span className="hide-mobile">PDF</span>
6407:               </button>
6408:             </div>
6409:           </div>
6410: 
6411:           {tableMissing && (
6412:             <div className="card animate-scale-in" style={{ marginBottom: 16, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.06)' }}>
6413:               <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
6414:                 <Icon name="AlertTriangle" size={22} style={{ color: 'var(--red-500, #ef4444)' }} />
6415:                 <div style={{ fontSize: 16, fontWeight: 800 }}>טבלת ההוצאות חסרה במסד הנתונים</div>
6416:               </div>
6417:               <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 12 }}>
6418:                 שמירת ההוצאות נכשלה כי הטבלה <code>public.expenses</code> עדיין לא נוצרה ב־Supabase.
6419:                 כדי לתקן, העתיקו את קטע ה־SQL שלמטה והריצו אותו ב־<b>Supabase → SQL Editor</b>, ואז לחצו "נסה שוב".
6420:               </div>
6421:               <pre style={{
6422:                 background: 'rgba(0,0,0,0.35)', color: '#e5e7eb', padding: 12, borderRadius: 8,
6423:                 fontSize: 12, direction: 'ltr', textAlign: 'left', overflowX: 'auto', maxHeight: 220, margin: 0
6424:               }}>{EXPENSES_MIGRATION_SQL}</pre>
6425:               <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
6426:                 <button className="btn btn-primary" style={{ padding: '8px 14px' }} onClick={copyMigrationSql}>
6427:                   <Icon name={sqlCopied ? 'Check' : 'Copy'} size={16} />{sqlCopied ? 'הועתק' : 'העתק SQL'}
6428:                 </button>
6429:                 <button className="btn btn-secondary" style={{ padding: '8px 14px' }} onClick={fetchData}>
6430:                   <Icon name="RefreshCw" size={16} />נסה שוב
6431:                 </button>
6432:               </div>
6433:             </div>
6434:           )}
6435: 
6436:           {/* Summary banner */}
6437:           <div className="expense-summary-card animate-scale-in stagger-1">
6438:             <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-600)', marginBottom: 16, textAlign: 'center', letterSpacing: 0.5 }}>סיכום הוצאות</div>
6439:             <div className="expense-summary-grid">
6440:               <div className="expense-summary-item">
6441:                 <div className="expense-summary-value" style={{ color: 'var(--gold-600)' }}>₪{Math.round(totalEvent).toLocaleString()}</div>
6442:                 <div className="expense-summary-label">סה"כ עלות האירוע</div>
6443:               </div>
6444:               <div className="expense-summary-item">
6445:                 <div className="expense-summary-value" style={{ color: 'var(--emerald-500)' }}>₪{Math.round(costPerHead).toLocaleString()}</div>
6446:                 <div className="expense-summary-label">עלות לנפש</div>
6447:               </div>
6448:               <div className="expense-summary-item">
6449:                 <div className="expense-summary-value" style={{ color: 'var(--blue-500)' }}>{totalGuests}</div>
6450:                 <div className="expense-summary-label">אורחים מאושרים</div>
6451:               </div>
6452:               <div className="expense-summary-item">
6453:                 <div className="expense-summary-value" style={{ color: 'var(--text-secondary)' }}>₪{Math.round(totalFixed).toLocaleString()}</div>
6454:                 <div className="expense-summary-label">הוצאות קבועות</div>
6455:               </div>
6456:             </div>
6457:             {totalGuests === 0 && (
6458:               <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--amber-500)', marginTop: 12 }}>
6459:                 ⚠ טרם אושרו אורחים — העלות לנפש תחושב אוטומטית עם אישורי הגעה
6460:               </div>
6461:             )}
6462:           </div>
6463: 
6464:           {/* Built-in categories */}
6465:           <div className="card animate-slide-up stagger-2" style={{ marginBottom: 16 }}>
6466:             <div className="card-title" style={{ marginBottom: 4 }}>קטגוריות מובנות</div>
6467:             <div className="card-subtitle" style={{ marginBottom: 16 }}>הזינו 0 להוצאות שאינן רלוונטיות, שמרו אוטומטי בעת יציאה מהשדה</div>
6468:             <div className="expense-categories">
6469:               {BUILT_IN_EXPENSES.map(b => {
6470:                 const saved = expenses.find(e => e.category === b.category);
6471:                 const val = localAmounts[b.category] !== undefined ? localAmounts[b.category] : (saved?.amount || '');
6472:                 return (
6473:                   <div key={b.category} className="expense-item">
6474:                     <div className="expense-item-icon" style={{ background: b.bg }}>
6475:                       <Icon name={b.icon} size={20} style={{ color: b.color }} />
6476:                     </div>
6477:                     <div className="expense-item-info">
6478:                       <div className="expense-item-name">{b.name}</div>
6479:                       <div className="expense-item-tag">
6480:                         {b.is_per_person ? `לפי נפש · ${totalGuests} אורחים = ₪${Math.round((parseFloat(val)||0)*totalGuests).toLocaleString()}` : 'תשלום קבוע'}
6481:                       </div>
6482:                     </div>
6483:                     <input
6484:                       type="number"
6485:                       min="0"
6486:                       className="expense-item-input"
6487:                       placeholder="₪0"
6488:                       value={val}
6489:                       onChange={e => setLocalAmounts(prev => ({ ...prev, [b.category]: e.target.value }))}
6490:                       onBlur={() => handleAmountBlur(b.category, b.name, b.is_per_person)}
6491:                     />
6492:                   </div>
6493:                 );
6494:               })}
6495:             </div>
6496:           </div>
6497: 
6498:           {/* Custom expenses */}
6499:           <div className="card animate-slide-up stagger-3" style={{ marginBottom: 16 }}>
6500:             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
6501:               <div>
6502:                 <div className="card-title">הוצאות מותאמות אישית</div>
6503:                 <div className="card-subtitle">{customExpenses.length} הוצאות נוספות</div>
6504:               </div>
6505:               <button className="btn btn-primary" style={{ padding: '8px 14px' }} onClick={() => setShowAddCustom(true)}>
6506:                 <Icon name="Plus" size={16} />הוסף
6507:               </button>
6508:             </div>
6509:             {customExpenses.length === 0 ? (
6510:               <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>
6511:                 אין הוצאות מותאמות עדיין
6512:               </div>
6513:             ) : (
6514:               <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
6515:                 {customExpenses.map(exp => (
6516:                   <div key={exp.id} className="expense-item">
6517:                     <div className="expense-item-icon" style={{ background: 'rgba(100,116,139,0.1)' }}>
6518:                       <Icon name="Tag" size={20} style={{ color: 'var(--slate-500)' }} />
6519:                     </div>
6520:                     <div className="expense-item-info">
6521:                       <div className="expense-item-name">{exp.name}</div>
6522:                       <div className="expense-item-tag">
6523:                         {exp.is_per_person ? `לפי נפש · ₪${Math.round(parseFloat(exp.amount||0)*totalGuests).toLocaleString()} סה"כ` : 'תשלום קבוע'}
6524:                       </div>
6525:                     </div>
6526:                     <input
6527:                       type="number"
6528:                       min="0"
6529:                       className="expense-item-input"
6530:                       value={localAmounts[exp.category] !== undefined ? localAmounts[exp.category] : exp.amount}
6531:                       onChange={e => setLocalAmounts(prev => ({ ...prev, [exp.category]: e.target.value }))}
6532:                       onBlur={() => handleAmountBlur(exp.category, exp.name, exp.is_per_person)}
6533:                     />
6534:                     <button className="btn btn-ghost" style={{ padding: 6, color: 'var(--red-500)' }} onClick={() => deleteExpense(exp.category)}>
6535:                       <Icon name="Trash2" size={16} />
6536:                     </button>
6537:                   </div>
6538:                 ))}
6539:               </div>
6540:             )}
6541:           </div>
6542: 
6543:           {/* Add custom modal */}
6544:           {showAddCustom && (
6545:             <div className="modal-overlay" onClick={() => setShowAddCustom(false)}>
6546:               <div className="modal-content" onClick={e => e.stopPropagation()}>
6547:                 <div className="modal-title">הוספת הוצאה מותאמת</div>
6548:                 <div className="modal-subtitle">הגדירו הוצאה ייחודית לאירוע שלכם</div>
6549:                 <div className="input-group">
6550:                   <label className="input-label">שם ההוצאה</label>
6551:                   <input className="input-field" placeholder="לדוגמה: נופש לאחר החתונה" value={customName} onChange={e => setCustomName(e.target.value)} />
6552:                 </div>
6553:                 <div className="input-group">
6554:                   <label className="input-label">סכום (₪)</label>
6555:                   <input className="input-field" type="number" min="0" placeholder="0" value={customAmount} onChange={e => setCustomAmount(e.target.value)} />
6556:                 </div>
6557:                 <div className="input-group" style={{ marginBottom: 20 }}>
6558:                   <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
6559:                     <input type="checkbox" checked={customPerPerson} onChange={e => setCustomPerPerson(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
6560:                     <span>חישוב לפי מספר אורחים (לנפש)</span>
6561:                   </label>
6562:                 </div>
6563:                 <div style={{ display: 'flex', gap: 10 }}>
6564:                   <button className="btn btn-primary" style={{ flex: 1 }} onClick={addCustomExpense}>הוסף הוצאה</button>
6565:                   <button className="btn btn-secondary" onClick={() => setShowAddCustom(false)}>ביטול</button>
6566:                 </div>
6567:               </div>
6568:             </div>
6569:           )}
6570:         </div>
6571:       );
6572:     }
6573: 
6574:     // ============================================
6575:     // Gifts Page
6576:     // ============================================
6577:     function GiftsPage({ event }) {
6578:       const { client } = useContext(SupabaseContext);
6579:       const { addToast } = useContext(ToastContext);
6580:       const [guests, setGuests] = useState([]);
6581:       const [gifts, setGifts] = useState([]);
6582:       const [expenses, setExpenses] = useState([]);
6583:       const [loading, setLoading] = useState(true);
6584:       const [tableMissing, setTableMissing] = useState(false);
6585:       const [sqlCopied, setSqlCopied] = useState(false);
6586:       const [localGifts, setLocalGifts] = useState({});
6587:       const [search, setSearch] = useState('');
6588:       const [filterGroup, setFilterGroup] = useState('all');
6589: 
6590:       useEffect(() => {
6591:         if (!event?.id) return;
6592:         fetchData();
6593:       }, [client, event?.id]);
6594: 
6595:       const fetchData = async () => {
6596:         if (!client || !event?.id) return;
6597:         setLoading(true);
6598:         const [{ data: g, error: gError }, { data: gi, error: giError }, { data: exp, error: expError }] = await Promise.all([
6599:           client.from('guests').select('*').eq('event_id', event.id).neq('status', 'declined').order('name'),
6600:           client.from('gifts').select('*').eq('event_id', event.id),
6601:           client.from('expenses').select('amount,is_per_person').eq('event_id', event.id),
6602:         ]);
6603:         if (gError) addToast('שגיאה בטעינת אורחים: ' + gError.message, 'error');
6604:         if (isMissingTableError(giError)) {
6605:           setTableMissing(true);
6606:         } else {
6607:           setTableMissing(false);
6608:           if (giError) addToast('שגיאה בטעינת מתנות: ' + giError.message, 'error');
6609:         }
6610:         if (expError && !isMissingTableError(expError)) {
6611:           addToast('שגיאה בטעינת הוצאות: ' + expError.message, 'error');
6612:         }
6613:         setGuests(g || []);
6614:         setGifts(gi || []);
6615:         setExpenses(exp || []);
6616:         const amounts = {};
6617:         (gi || []).forEach(gift => { if (gift.guest_id) amounts[gift.guest_id] = gift.amount; });
6618:         setLocalGifts(amounts);
6619:         setLoading(false);
6620:       };
6621: 
6622:       const copyMigrationSql = async () => {
6623:         try {
6624:           await navigator.clipboard.writeText(GIFTS_MIGRATION_SQL);
6625:           setSqlCopied(true);
6626:           addToast('ה־SQL הועתק ✓', 'success');
6627:           setTimeout(() => setSqlCopied(false), 2000);
6628:         } catch {
6629:           addToast('לא ניתן להעתיק אוטומטית — סמנו והעתיקו ידנית', 'error');
6630:         }
6631:       };
6632: 
6633:       const totalGuests = useMemo(() =>
6634:         guests.filter(g => g.status === 'confirmed').reduce((s, g) => s + (g.confirmed_guests || 0), 0),
6635:       [guests]);
6636: 
6637:       const totalExpenses = useMemo(() => {
6638:         const tg = totalGuests || 0;
6639:         return expenses.reduce((s, e) => s + (e.is_per_person ? parseFloat(e.amount||0) * tg : parseFloat(e.amount||0)), 0);
6640:       }, [expenses, totalGuests]);
6641: 
6642:       const totalGifts = useMemo(() =>
6643:         Object.values(localGifts).reduce((s, v) => s + (parseFloat(v) || 0), 0),
6644:       [localGifts]);
6645: 
6646:       const saveGift = async (guest, amount) => {
6647:         if (!client || !event?.id) return;
6648:         if (tableMissing) return;
6649:         const val = parseFloat(amount) || 0;
6650:         const existing = gifts.find(gi => gi.guest_id === guest.id);
6651:         if (existing) {
6652:           const { error } = await client.from('gifts').update({ amount: val }).eq('id', existing.id);
6653:           if (error) {
6654:             if (isMissingTableError(error)) setTableMissing(true);
6655:             else addToast('שגיאה בשמירת מתנה: ' + error.message, 'error');
6656:           } else {
6657:             setGifts(prev => prev.map(gi => gi.guest_id === guest.id ? { ...gi, amount: val } : gi));
6658:           }
6659:         } else {
6660:           const { data, error } = await client.from('gifts').insert({
6661:             event_id: event.id, guest_id: guest.id, guest_name: guest.name, amount: val
6662:           }).select().single();
6663:           if (error) {
6664:             if (isMissingTableError(error)) setTableMissing(true);
6665:             else addToast('שגיאה בשמירת מתנה: ' + error.message, 'error');
6666:           } else if (data) {
6667:             setGifts(prev => [...prev, data]);
6668:           }
6669:         }
6670:       };
6671: 
6672:       const groups = useMemo(() => [...new Set(guests.map(g => g.group_name || 'כללי'))].sort(), [guests]);
6673: 
6674:       const filtered = useMemo(() => {
6675:         let list = [...guests];
6676:         if (search.trim()) {
6677:           const q = search.toLowerCase();
6678:           list = list.filter(g => g.name?.toLowerCase().includes(q) || g.group_name?.toLowerCase().includes(q));
6679:         }
6680:         if (filterGroup !== 'all') list = list.filter(g => (g.group_name || 'כללי') === filterGroup);
6681:         return list;
6682:       }, [guests, search, filterGroup]);
6683: 
6684:       const profit = totalGifts - totalExpenses;
6685:       const isProfitable = profit >= 0;
6686: 
6687:       const exportGiftsExcel = () => {
6688:         const rows = guests.map(g => ({
6689:           'שם': g.name,
6690:           'קבוצה': g.group_name || 'כללי',
6691:           'סטטוס': g.status === 'confirmed' ? 'מגיע' : g.status === 'maybe' ? 'אולי' : 'ממתין',
6692:           'אורחים מגיעים': g.confirmed_guests || 0,
6693:           'מתנה (₪)': parseFloat(localGifts[g.id] || 0),
6694:         }));
6695:         rows.push({});
6696:         rows.push({ 'שם': 'סה"כ מתנות', 'מתנה (₪)': Math.round(totalGifts) });
6697:         rows.push({ 'שם': 'סה"כ הוצאות', 'מתנה (₪)': Math.round(totalExpenses) });
6698:         rows.push({ 'שם': isProfitable ? 'רווח' : 'גירעון', 'מתנה (₪)': Math.round(Math.abs(profit)) });
6699: 
6700:         const ws = XLSX.utils.json_to_sheet(rows);
6701:         ws['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 14 }];
6702:         const wb = XLSX.utils.book_new();
6703:         XLSX.utils.book_append_sheet(wb, ws, 'מתנות');
6704:         XLSX.writeFile(wb, `מתנות_${event.name}_${new Date().toLocaleDateString('he-IL').replace(/\./g,'-')}.xlsx`);
6705:         addToast('ייצוא אקסל הושלם ✓', 'success');
6706:       };
6707: 
6708:       const exportGiftsPDF = async () => {
6709:         try {
6710:           addToast('מייצא PDF...', 'info');
6711:           const { jsPDF } = window.jspdf;
6712:           const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
6713:           const gold = [212, 168, 8];
6714:           const green = [16, 185, 129];
6715:           const red = [239, 68, 68];
6716:           const dark = [26, 26, 26];
6717:           const profitColor = isProfitable ? green : red;
6718: 
6719:           doc.setFillColor(...gold);
6720:           doc.rect(0, 0, 210, 38, 'F');
6721:           doc.setTextColor(255, 255, 255);
6722:           doc.setFont('helvetica', 'bold');
6723:           doc.setFontSize(22);
6724:           doc.text('Gift Tracking', 105, 16, { align: 'center' });
6725:           doc.setFontSize(12);
6726:           doc.setFont('helvetica', 'normal');
6727:           doc.text(event?.name || '', 105, 25, { align: 'center' });
6728:           doc.setFontSize(10);
6729:           doc.text(new Date().toLocaleDateString('he-IL'), 105, 33, { align: 'center' });
6730: 
6731:           let y = 50;
6732:           doc.setFillColor(...profitColor);
6733:           doc.rect(10, y - 5, 190, 28, 'F');
6734:           doc.setTextColor(255, 255, 255);
6735:           doc.setFont('helvetica', 'bold');
6736:           doc.setFontSize(14);
6737:           doc.text(isProfitable ? 'Profitable Event' : 'Event Deficit', 105, y + 4, { align: 'center' });
6738:           doc.setFontSize(11);
6739:           doc.text(`${isProfitable ? '+' : '-'}${Math.round(Math.abs(profit)).toLocaleString()} ILS`, 105, y + 13, { align: 'center' });
6740:           y += 36;
6741: 
6742:           const summaryItems = [
6743:             ['Total Gifts', `${Math.round(totalGifts).toLocaleString()} ILS`],
6744:             ['Total Expenses', `${Math.round(totalExpenses).toLocaleString()} ILS`],
6745:             [`${isProfitable ? 'Profit' : 'Deficit'}`, `${Math.round(Math.abs(profit)).toLocaleString()} ILS`],
6746:           ];
6747:           summaryItems.forEach(([label, val], i) => {
6748:             doc.setFillColor(i % 2 === 0 ? 250 : 244, i % 2 === 0 ? 249 : 243, i % 2 === 0 ? 245 : 236);
6749:             doc.rect(10, y - 5, 190, 10, 'F');
6750:             doc.setTextColor(...dark);
6751:             doc.setFont('helvetica', 'normal');
6752:             doc.setFontSize(10);
6753:             doc.text(label, 15, y + 1);
6754:             doc.setFont('helvetica', 'bold');
6755:             doc.text(val, 195, y + 1, { align: 'right' });
6756:             y += 10;
6757:           });
6758: 
6759:           y += 8;
6760:           doc.setFillColor(240, 237, 230);
6761:           doc.rect(10, y - 5, 190, 10, 'F');
6762:           doc.setTextColor(...dark);
6763:           doc.setFont('helvetica', 'bold');
6764:           doc.setFontSize(9);
6765:           doc.text('Guest Name', 15, y);
6766:           doc.text('Group', 75, y);
6767:           doc.text('Guests', 125, y);
6768:           doc.text('Gift Amount', 165, y);
6769:           y += 8;
6770: 
6771:           let rowIdx = 0;
6772:           guests.forEach(g => {
6773:             if (y > 270) { doc.addPage(); y = 20; }
6774:             const amt = parseFloat(localGifts[g.id] || 0);
6775:             if (rowIdx % 2 === 0) {
6776:               doc.setFillColor(250, 249, 245);
6777:               doc.rect(10, y - 5, 190, 9, 'F');
6778:             }
6779:             doc.setTextColor(...dark);
6780:             doc.setFont('helvetica', 'normal');
6781:             doc.setFontSize(9);
6782:             doc.text(g.name || '', 15, y);
6783:             doc.text(g.group_name || 'General', 75, y);
6784:             doc.text(String(g.confirmed_guests || 0), 130, y);
6785:             if (amt > 0) {
6786:               doc.setTextColor(...green);
6787:               doc.setFont('helvetica', 'bold');
6788:             }
6789:             doc.text(amt > 0 ? `${amt.toLocaleString()} ILS` : '-', 195, y, { align: 'right' });
6790:             doc.setTextColor(...dark);
6791:             doc.setFont('helvetica', 'normal');
6792:             y += 9; rowIdx++;
6793:           });
6794: 
6795:           doc.save(`gifts-${(event?.name || 'event').replace(/\s+/g, '-')}.pdf`);
6796:           addToast('PDF יוצא בהצלחה ✓', 'success');
6797:         } catch (err) {
6798:           console.error(err);
6799:           addToast('שגיאה בייצוא PDF', 'error');
6800:         }
6801:       };
6802: 
6803:       if (!event) return (
6804:         <div className="empty-state animate-slide-up">
6805:           <div className="empty-state-icon"><Icon name="Gift" size={36} /></div>
6806:           <div className="empty-state-title">בחרו אירוע</div>
6807:           <div className="empty-state-text">בחרו אירוע כדי לעקוב אחר מתנות</div>
6808:         </div>
6809:       );
6810: 
6811:       if (loading) return (
6812:         <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
6813:           {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 60 }} />)}
6814:         </div>
6815:       );
6816: 
6817:       return (
6818:         <div className="animate-slide-up">
6819:           <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
6820:             <div>
6821:               <div className="page-title">מעקב מתנות</div>
6822:               <div className="page-subtitle">הזינו כמה כל אורח נתן ובדקו אם האירוע היה רווחי</div>
6823:             </div>
6824:             <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
6825:               <button className="btn btn-secondary" style={{ padding: '10px 14px' }} onClick={exportGiftsExcel} disabled={tableMissing}>
6826:                 <Icon name="FileSpreadsheet" size={18} /><span className="hide-mobile">אקסל</span>
6827:               </button>
6828:               <button className="btn btn-secondary" style={{ padding: '10px 14px' }} onClick={exportGiftsPDF} disabled={tableMissing}>
6829:                 <Icon name="FileText" size={18} /><span className="hide-mobile">PDF</span>
6830:               </button>
6831:             </div>
6832:           </div>
6833: 
6834:           {tableMissing && (
6835:             <div className="card animate-scale-in" style={{ marginBottom: 16, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.06)' }}>
6836:               <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
6837:                 <Icon name="AlertTriangle" size={22} style={{ color: 'var(--red-500, #ef4444)' }} />
6838:                 <div style={{ fontSize: 16, fontWeight: 800 }}>טבלת המתנות חסרה במסד הנתונים</div>
6839:               </div>
6840:               <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 12 }}>
6841:                 שמירת המתנות נכשלה כי הטבלה <code>public.gifts</code> עדיין לא נוצרה ב־Supabase.
6842:                 כדי לתקן, העתיקו את קטע ה־SQL שלמטה והריצו אותו ב־<b>Supabase → SQL Editor</b>, ואז לחצו "נסה שוב".
6843:               </div>
6844:               <pre style={{
6845:                 background: 'rgba(0,0,0,0.35)', color: '#e5e7eb', padding: 12, borderRadius: 8,
6846:                 fontSize: 12, direction: 'ltr', textAlign: 'left', overflowX: 'auto', maxHeight: 220, margin: 0
6847:               }}>{GIFTS_MIGRATION_SQL}</pre>
6848:               <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
6849:                 <button className="btn btn-primary" style={{ padding: '8px 14px' }} onClick={copyMigrationSql}>
6850:                   <Icon name={sqlCopied ? 'Check' : 'Copy'} size={16} />{sqlCopied ? 'הועתק' : 'העתק SQL'}
6851:                 </button>
6852:                 <button className="btn btn-secondary" style={{ padding: '8px 14px' }} onClick={fetchData}>
6853:                   <Icon name="RefreshCw" size={16} />נסה שוב
6854:                 </button>
6855:               </div>
6856:             </div>
6857:           )}
6858: 
6859:           {/* Profit/Loss banner */}
6860:           <div className={`profit-banner ${totalGifts === 0 && totalExpenses === 0 ? 'neutral' : isProfitable ? 'positive' : 'negative'} animate-scale-in stagger-1`}>
6861:             <div className="profit-value" style={{ color: totalGifts === 0 && totalExpenses === 0 ? 'var(--blue-500)' : isProfitable ? 'var(--emerald-500)' : 'var(--red-500)' }}>
6862:               {totalGifts === 0 && totalExpenses === 0 ? '—' : `${isProfitable ? '+' : '-'}₪${Math.round(Math.abs(profit)).toLocaleString()}`}
6863:             </div>
6864:             <div className="profit-label">
6865:               {totalGifts === 0 && totalExpenses === 0 ? 'הזינו נתוני הוצאות ומתנות לחישוב' : isProfitable ? 'האירוע היה רווחי 🎉' : 'האירוע היה בגירעון'}
6866:             </div>
6867:           </div>
6868: 
6869:           {/* KPI row */}
6870:           <div className="kpi-grid" style={{ marginBottom: 16 }}>
6871:             <div className="kpi-card green animate-scale-in stagger-2">
6872:               <div className="kpi-value">₪{Math.round(totalGifts).toLocaleString()}</div>
6873:               <div className="kpi-label">סה"כ מתנות</div>
6874:             </div>
6875:             <div className="kpi-card red animate-scale-in stagger-3">
6876:               <div className="kpi-value">₪{Math.round(totalExpenses).toLocaleString()}</div>
6877:               <div className="kpi-label">סה"כ הוצאות</div>
6878:             </div>
6879:             <div className="kpi-card blue animate-scale-in stagger-4">
6880:               <div className="kpi-value">{guests.filter(g => (localGifts[g.id] || 0) > 0).length}</div>
6881:               <div className="kpi-label">נתנו מתנה</div>
6882:             </div>
6883:             <div className="kpi-card gold animate-scale-in stagger-5">
6884:               <div className="kpi-value">
6885:                 {guests.filter(g => (localGifts[g.id] || 0) > 0).length > 0
6886:                   ? `₪${Math.round(totalGifts / guests.filter(g => (localGifts[g.id]||0)>0).length).toLocaleString()}`
6887:                   : '—'}
6888:               </div>
6889:               <div className="kpi-label">ממוצע מתנה</div>
6890:             </div>
6891:           </div>
6892: 
6893:           {/* Search + filter */}
6894:           <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
6895:             <input
6896:               className="input-field"
6897:               style={{ flex: 1, minWidth: 160, padding: '9px 14px' }}
6898:               placeholder="חיפוש אורח..."
6899:               value={search}
6900:               onChange={e => setSearch(e.target.value)}
6901:             />
6902:             <select className="input-field" style={{ width: 150, padding: '9px 14px' }} value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
6903:               <option value="all">כל הקבוצות</option>
6904:               {groups.map(g => <option key={g} value={g}>{g}</option>)}
6905:             </select>
6906:           </div>
6907: 
6908:           {/* Guest list */}
6909:           {guests.length === 0 ? (
6910:             <div className="empty-state">
6911:               <div className="empty-state-icon"><Icon name="Users" size={36} /></div>
6912:               <div className="empty-state-title">אין אורחים</div>
6913:               <div className="empty-state-text">הוסיפו אורחים בעמוד המוזמנים</div>
6914:             </div>
6915:           ) : (
6916:             <div className="card animate-slide-up stagger-3">
6917:               <div className="card-title" style={{ marginBottom: 12 }}>מתנות לפי אורח ({filtered.length})</div>
6918:               <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
6919:                 {filtered.map(g => (
6920:                   <div key={g.id} className="gift-row">
6921:                     <div style={{
6922:                       width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
6923:                       background: g.status === 'confirmed' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
6924:                       display: 'flex', alignItems: 'center', justifyContent: 'center'
6925:                     }}>
6926:                       <Icon name={g.status === 'confirmed' ? 'CheckCircle2' : 'Clock'} size={16}
6927:                         style={{ color: g.status === 'confirmed' ? 'var(--emerald-500)' : 'var(--blue-500)' }} />
6928:                     </div>
6929:                     <div className="gift-row-info">
6930:                       <div className="gift-row-name">{g.name}</div>
6931:                       <div className="gift-row-group">{g.group_name || 'כללי'} · {g.confirmed_guests || 0} נפשות</div>
6932:                     </div>
6933:                     <input
6934:                       type="number"
6935:                       min="0"
6936:                       className="gift-amount-input"
6937:                       placeholder="₪0"
6938:                       value={localGifts[g.id] !== undefined ? localGifts[g.id] : (gifts.find(gi => gi.guest_id === g.id)?.amount || '')}
6939:                       onChange={e => setLocalGifts(prev => ({ ...prev, [g.id]: e.target.value }))}
6940:                       onBlur={e => saveGift(g, e.target.value)}
6941:                     />
6942:                   </div>
6943:                 ))}
6944:               </div>
6945:             </div>
6946:           )}
6947:         </div>
6948:       );
6949:     }
6950: 
6951:     // ============================================
6952:     // Phase 6 — Error Boundary
6953:     // ============================================
6954:     class ErrorBoundary extends React.Component {
6955:       constructor(props) { super(props); this.state = { hasError: false, error: null }; }
6956:       static getDerivedStateFromError(error) { return { hasError: true, error }; }
6957:       componentDidCatch(error, info) { console.error('SeatSync error:', error, info); }
6958:       render() {
6959:         if (this.state.hasError) {
6960:           return (
6961:             <div className="error-boundary animate-fade-in">
6962:               <div className="error-boundary-icon">😵</div>
6963:               <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>משהו השתבש</div>
6964:               <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, maxWidth: 300, lineHeight: 1.6 }}>
6965:                 {this.state.error?.message || 'שגיאה בלתי צפויה. אנא רעננו את הדף.'}
6966:               </div>
6967:               <button className="btn btn-primary" onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}>
6968:                 <Icon name="RefreshCw" size={18} />רענן דף
6969:               </button>
6970:             </div>
6971:           );
6972:         }
6973:         return this.props.children;
6974:       }
6975:     }
6976: 
6977:     // ============================================
6978:     // Phase 6 — Offline Banner
6979:     // ============================================
6980:     function OfflineBanner() {
6981:       const [isOnline, setIsOnline] = useState(navigator.onLine);
6982:       useEffect(() => {
6983:         const on = () => setIsOnline(true);
6984:         const off = () => setIsOnline(false);
6985:         window.addEventListener('online', on);
6986:         window.addEventListener('offline', off);
6987:         return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
6988:       }, []);
6989:       if (isOnline) return null;
6990:       return (
6991:         <div className="offline-banner">
6992:           📡 אין חיבור לאינטרנט — נתונים עשויים להיות לא מעודכנים
6993:         </div>
6994:       );
6995:     }
6996: 
6997:     // ============================================
6998:     // PWA Install Row — for Settings page
6999:     // ============================================
7000:     function PWAInstallRow() {
7001:       const { deferredPrompt, triggerInstall, isIOS, isStandalone } = useContext(PWAInstallContext);
7002:       const [showGuide, setShowGuide] = useState(false);
7003: 
7004:       if (isStandalone) {
7005:         return (
7006:           <div className="settings-row">
7007:             <div className="settings-row-icon" style={{ color: 'var(--emerald-500)' }}><Icon name="Smartphone" size={18} /></div>
7008:             <div style={{ flex: 1 }}>
7009:               <div className="settings-row-label">האפליקציה מותקנת</div>
7010:               <div className="settings-row-sub">אתם משתמשים בגרסה המותקנת — מעולה!</div>
7011:             </div>
7012:             <Icon name="CheckCircle" size={18} style={{ color: 'var(--emerald-500)' }} />
7013:           </div>
7014:         );
7015:       }
7016: 
7017:       const handleClick = async () => {
7018:         if (deferredPrompt) {
7019:           await triggerInstall();
7020:         } else {
7021:           setShowGuide(true);
7022:         }
7023:       };
7024: 
7025:       return (
7026:         <>
7027:           <div className="settings-row" onClick={handleClick} style={{ cursor: 'pointer' }}>
7028:             <div className="settings-row-icon" style={{ color: 'var(--accent)' }}><Icon name="Download" size={18} /></div>
7029:             <div style={{ flex: 1 }}>
7030:               <div className="settings-row-label">התקנת האפליקציה</div>
7031:               <div className="settings-row-sub">
7032:                 {deferredPrompt ? 'התקינו ישירות למסך הבית' : isIOS ? 'הוסיפו למסך הבית דרך Safari' : 'הוסיפו למסך הבית'}
7033:               </div>
7034:             </div>
7035:             <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={e => { e.stopPropagation(); handleClick(); }}>
7036:               <Icon name="Download" size={14} />התקן
7037:             </button>
7038:           </div>
7039: 
7040:           {showGuide && (
7041:             <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowGuide(false)}>
7042:               <div className="modal-content animate-scale-in" style={{ maxWidth: 380, textAlign: 'center' }}>
7043:                 <div style={{ fontSize: 48, marginBottom: 12 }}>📱</div>
7044:                 <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>התקנת SeatSync</div>
7045:                 {isIOS ? (
7046:                   <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 2, marginBottom: 20, textAlign: 'right' }}>
7047:                     <div><strong>1.</strong> פתחו את האתר ב-<strong>Safari</strong> (לא Chrome)</div>
7048:                     <div><strong>2.</strong> לחצו על כפתור <strong>השיתוף</strong> ⬆️ בתחתית המסך</div>
7049:                     <div><strong>3.</strong> גללו ולחצו <strong>"הוסף למסך הבית"</strong></div>
7050:                     <div><strong>4.</strong> לחצו <strong>"הוסף"</strong> בפינה הימנית העליונה</div>
7051:                   </div>
7052:                 ) : (
7053:                   <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 2, marginBottom: 20, textAlign: 'right' }}>
7054:                     <div><strong>1.</strong> לחצו על <strong>⋮</strong> (3 נקודות) בפינה הימנית העליונה של Chrome</div>
7055:                     <div><strong>2.</strong> בחרו <strong>"התקן אפליקציה"</strong> או <strong>"הוסף למסך הבית"</strong></div>
7056:                     <div><strong>3.</strong> אשרו את ההתקנה</div>
7057:                     <div style={{ marginTop: 8, padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', fontSize: 12 }}>
7058:                       💡 <strong>טיפ:</strong> אם לא רואים את האפשרות, נסו לרענן את הדף ולחכות כמה שניות
7059:                     </div>
7060:                   </div>
7061:                 )}
7062:                 <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowGuide(false)}>
7063:                   הבנתי!
7064:                 </button>
7065:               </div>
7066:             </div>
7067:           )}
7068:         </>
7069:       );
7070:     }
7071: 
7072:     // ============================================
7073:     // PWA Install Banner
7074:     // ============================================
7075:     function PWAInstallBanner() {
7076:       const { deferredPrompt, triggerInstall, isIOS, isStandalone } = useContext(PWAInstallContext);
7077:       const [show, setShow] = useState(false);
7078:       const [showIOSGuide, setShowIOSGuide] = useState(false);
7079: 
7080:       useEffect(() => {
7081:         if (isStandalone) return;
7082:         // Show banner after a short delay
7083:         const timer = setTimeout(() => setShow(true), 3000);
7084:         return () => clearTimeout(timer);
7085:       }, [isStandalone]);
7086: 
7087:       const handleInstall = async () => {
7088:         if (deferredPrompt) {
7089:           const outcome = await triggerInstall();
7090:           if (outcome === 'accepted') setShow(false);
7091:         } else {
7092:           // iOS or Android without prompt — show manual guide
7093:           setShowIOSGuide(true);
7094:         }
7095:       };
7096: 
7097:       const handleDismiss = () => {
7098:         setShow(false);
7099:         sessionStorage.setItem('seatsync-pwa-dismissed', '1');
7100:       };
7101: 
7102:       // Check if dismissed this session
7103:       if (sessionStorage.getItem('seatsync-pwa-dismissed') === '1') return null;
7104:       if (!show || isStandalone) return null;
7105: 
7106:       return (
7107:         <>
7108:           <div className="pwa-install-banner" role="dialog" aria-label="התקנת האפליקציה">
7109:             <div className="pwa-install-icon">
7110:               <svg width="24" height="24" viewBox="0 0 34 34" fill="none">
7111:                 <ellipse cx="17" cy="14" rx="9" ry="5.5" fill="rgba(255,255,255,0.25)" stroke="white" strokeWidth="1.5"/>
7112:                 <rect x="15.5" y="18.5" width="3" height="5" rx="1.5" fill="white" opacity="0.9"/>
7113:                 <circle cx="10" cy="21.5" r="2.5" fill="white" opacity="0.9"/>
7114:                 <circle cx="24" cy="21.5" r="2.5" fill="white" opacity="0.9"/>
7115:                 <path d="M13.5 14 L16 16.5 L21 11.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
7116:               </svg>
7117:             </div>
7118:             <div className="pwa-install-text">
7119:               <div className="pwa-install-title">התקינו את SeatSync</div>
7120:               <div className="pwa-install-sub">גישה מהירה ישר מהמסך הראשי</div>
7121:             </div>
7122:             <div className="pwa-install-actions">
7123:               <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={handleDismiss}>
7124:                 לא עכשיו
7125:               </button>
7126:               <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={handleInstall}>
7127:                 <Icon name="Download" size={15} />
7128:                 התקן
7129:               </button>
7130:             </div>
7131:           </div>
7132: 
7133:           {/* Manual install guide modal */}
7134:           {showIOSGuide && (
7135:             <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowIOSGuide(false)}>
7136:               <div className="modal-content animate-scale-in" style={{ maxWidth: 360, textAlign: 'center' }}>
7137:                 <div style={{ fontSize: 48, marginBottom: 12 }}>📱</div>
7138:                 <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>התקנה ידנית</div>
7139:                 {isIOS ? (
7140:                   <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 20 }}>
7141:                     <div>1. לחצו על כפתור <strong>השיתוף</strong> (⬆️) בתחתית Safari</div>
7142:                     <div>2. גללו ולחצו <strong>"הוסף למסך הבית"</strong></div>
7143:                     <div>3. לחצו <strong>"הוסף"</strong></div>
7144:                   </div>
7145:                 ) : (
7146:                   <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 20 }}>
7147:                     <div>1. לחצו על <strong>⋮ תפריט</strong> (3 נקודות) בפינה העליונה</div>
7148:                     <div>2. בחרו <strong>"התקן אפליקציה"</strong> או <strong>"הוסף למסך הבית"</strong></div>
7149:                     <div>3. אשרו את ההתקנה</div>
7150:                   </div>
7151:                 )}
7152:                 <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { setShowIOSGuide(false); handleDismiss(); }}>
7153:                   הבנתי!
7154:                 </button>
7155:               </div>
7156:             </div>
7157:           )}
7158:         </>
7159:       );
7160:     }
7161: 
7162:     // ============================================
7163:     // Phase 6 — Onboarding
7164:     // ============================================
7165:     const ONBOARDING_STEPS = [
7166:       { icon: '🎉', title: 'ברוכים הבאים ל-SeatSync!', text: 'מערכת ניהול האירועים החכמה שלך. בכמה צעדים פשוטים תוכלו לנהל מוזמנים, לשלוח הזמנות ולסדר הושבה.' },
7167:       { icon: '👥', title: 'הוסיפו מוזמנים', text: 'הוסיפו אורחים ידנית או ייבאו מאקסל. לכל אורח יש לינק RSVP אישי שמאפשר לו לאשר הגעה ישירות.' },
7168:       { icon: '💬', title: 'שלחו הזמנות', text: 'צרו תבנית הודעה עם משתנים כמו {שם} ו-{תאריך}, ושלחו ל-WhatsApp בלחיצה אחת לכל אורח.' },
7169:       { icon: '🪑', title: 'סדרו הושבה', text: 'גררו אורחים לשולחנות, או סדרו את האולם ויזואלית במפת הושבה. הכל נשמר אוטומטית.' },
7170:     ];
7171: 
7172:     function OnboardingModal({ onDone }) {
7173:       const [step, setStep] = useState(0);
7174:       const current = ONBOARDING_STEPS[step];
7175:       const isLast = step === ONBOARDING_STEPS.length - 1;
7176: 
7177:       return (
7178:         <div className="onboarding-overlay">
7179:           <div className="onboarding-card">
7180:             <div className="onboarding-step-dots">
7181:               {ONBOARDING_STEPS.map((_, i) => (
7182:                 <div key={i} className={`onboarding-dot ${i === step ? 'active' : ''}`} onClick={() => setStep(i)} style={{ cursor: 'pointer' }} />
7183:               ))}
7184:             </div>
7185:             <div className="onboarding-icon-wrap">{current.icon}</div>
7186:             <div className="onboarding-title">{current.title}</div>
7187:             <div className="onboarding-text">{current.text}</div>
7188:             <div style={{ display: 'flex', gap: 10 }}>
7189:               {step > 0 && (
7190:                 <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(s => s - 1)}>
7191:                   <Icon name="ChevronRight" size={18} />הקודם
7192:                 </button>
7193:               )}
7194:               <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => isLast ? onDone() : setStep(s => s + 1)}>
7195:                 {isLast ? (
7196:                   <><Icon name="Check" size={18} />בואו נתחיל!</>
7197:                 ) : (
7198:                   <>הבא<Icon name="ChevronLeft" size={18} /></>
7199:                 )}
7200:               </button>
7201:             </div>
7202:             <button className="btn btn-ghost" style={{ width: '100%', marginTop: 8, fontSize: 13 }} onClick={onDone}>
7203:               דלג
7204:             </button>
7205:           </div>
7206:         </div>
7207:       );
7208:     }
7209: 
7210:     // ============================================
7211:     // App Legal Footer — used in SettingsPage
7212:     function AppLegalFooter() {
7213:       const [showTerms, setShowTerms] = useState(false);
7214:       return (
7215:         <>
7216:           <div style={{ textAlign: 'center', padding: '20px 0 8px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
7217:             <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 13 }}>
7218:               <a href="#" onClick={e => { e.preventDefault(); setShowTerms(true); }} style={{ color: 'var(--text-secondary)', textDecoration: 'underline', cursor: 'pointer' }}>תנאי שימוש ופרטיות</a>
7219:               <a href="mailto:avivmed3@gmail.com" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>צרו קשר</a>
7220:             </div>
7221:             <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>✉️ avivmed3@gmail.com</div>
7222:           </div>
7223:           {showTerms && (
7224:             <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowTerms(false)}>
7225:               <div className="modal-content animate-scale-in" style={{ maxWidth: 600, maxHeight: '80vh', overflowY: 'auto' }}>
7226:                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, position: 'sticky', top: 0, background: 'var(--bg-elevated)', paddingBottom: 8 }}>
7227:                   <div className="modal-title">תנאי שימוש ומדיניות פרטיות</div>
7228:                   <button className="icon-btn" onClick={() => setShowTerms(false)}><Icon name="X" size={20} /></button>
7229:                 </div>
7230:                 <div style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--text-secondary)' }}>
7231:                   <p style={{ marginBottom: 14 }}><strong style={{ color: 'var(--text-primary)' }}>1. כללי</strong><br/>
7232:                   ברוכים הבאים ל-SeatSync (להלן: "השירות"). השימוש בשירות מהווה הסכמה לתנאים אלו. השירות מופעל על ידי אביב ("המפעיל"). ליצירת קשר: avivmed3@gmail.com.</p>
7233: 
7234:                   <p style={{ marginBottom: 14 }}><strong style={{ color: 'var(--text-primary)' }}>2. השירות</strong><br/>
7235:                   SeatSync מספק כלי ניהול אישורי הגעה וסידורי הושבה לאירועים. השירות כולל ניהול מוזמנים, שליחת הודעות, מעקב אישורים וסידורי הושבה ויזואליים.</p>
7236: 
7237:                   <p style={{ marginBottom: 14 }}><strong style={{ color: 'var(--text-primary)' }}>3. הרשמה וחשבון</strong><br/>
7238:                   השימוש בשירות מותנה ביצירת חשבון עם כתובת אימייל תקינה. המשתמש אחראי לשמירת פרטי הגישה שלו ולכל פעולה שמתבצעת תחת חשבונו.</p>
7239: 
7240:                   <p style={{ marginBottom: 14 }}><strong style={{ color: 'var(--text-primary)' }}>4. פרטיות ומידע אישי</strong><br/>
7241:                   המידע שנאסף כולל: שם, אימייל, מספרי טלפון של מוזמנים, ונתוני אירוע. המידע מאוחסן בשרתי Supabase מאובטחים. איננו מוכרים או משתפים מידע אישי עם צדדים שלישיים. המשתמש רשאי לייצא את כל הנתונים שלו בכל עת ולמחוק את חשבונו.</p>
7242: 
7243:                   <p style={{ marginBottom: 14 }}><strong style={{ color: 'var(--text-primary)' }}>5. שימוש הוגן</strong><br/>
7244:                   אין להשתמש בשירות למטרות בלתי חוקיות, שליחת ספאם, או באופן שפוגע בשירות או במשתמשים אחרים. המפעיל רשאי להשעות חשבונות המפרים תנאים אלו.</p>
7245: 
7246:                   <p style={{ marginBottom: 14 }}><strong style={{ color: 'var(--text-primary)' }}>6. תוכניות ומחירים</strong><br/>
7247:                   השירות מציע תוכניות Free, Pro ו-Enterprise. המחירים עשויים להשתנות בהתראה מוקדמת. תוכנית Free ניתנת ללא הגבלת זמן.</p>
7248: 
7249:                   <p style={{ marginBottom: 14 }}><strong style={{ color: 'var(--text-primary)' }}>7. הגבלת אחריות</strong><br/>
7250:                   השירות ניתן "כפי שהוא" (AS IS). המפעיל אינו אחראי לנזקים ישירים או עקיפים הנובעים מהשימוש בשירות, לרבות אובדן נתונים.</p>
7251: 
7252:                   <p style={{ marginBottom: 14 }}><strong style={{ color: 'var(--text-primary)' }}>8. שינויים בתנאים</strong><br/>
7253:                   המפעיל רשאי לעדכן תנאים אלו מעת לעת. המשך השימוש לאחר עדכון מהווה הסכמה לתנאים המעודכנים.</p>
7254: 
7255:                   <p style={{ color: 'var(--text-tertiary)', marginTop: 16 }}>עדכון אחרון: אפריל 2026</p>
7256:                 </div>
7257:               </div>
7258:             </div>
7259:           )}
7260:         </>
7261:       );
7262:     }
7263: 
7264:     // ============================================
7265:     // Invitation Designer Component
7266:     // ============================================
7267:     const INVITATION_TEMPLATES = [
7268:       { id: '1', name: 'קלאסי מסורתי (תמונה)', bg: 'url("./images/template_classic.png") center/cover', color: '#1A1A1A', font: 'Playfair Display, serif', padding: '50px 40px', borderOuter: 'none', borderInner: 'none', textShadow: 'none', isDark: false, lines: true, letterSpacing: '2px', noGradientBg: true },
7269:       { id: '2', name: 'עלי מים בוטניים (תמונה)', bg: 'url("./images/template_botanical.png") center/cover', color: '#2B3A28', font: 'Playfair Display, serif', padding: '60px 40px', borderOuter: 'none', borderInner: 'none', textShadow: 'none', isDark: false, frostBottom: true, noGradientBg: true },
7270:       { id: '3', name: 'ציפור בצבעי מים (תמונה)', bg: 'url("./images/template_bluebird.png") center/cover', color: '#28465C', font: 'Heebo, sans-serif', padding: '50px', borderOuter: 'none', borderInner: 'none', textShadow: 'none', isDark: false, frostBottom: true, noGradientBg: true },
7271:       { id: '4', name: 'צלליות אדמה (תמונה)', bg: 'url("./images/template_shadow.png") center/cover', color: '#3A332B', font: 'Playfair Display, serif', padding: '50px', borderOuter: 'none', borderInner: 'none', textShadow: 'none', isDark: false, blocky: true, noGradientBg: true },
7272:       { id: '5', name: 'קשת בוהו חמה (תמונה)', bg: 'url("./images/template_boho_arch.png") center/cover', color: '#5C4033', font: 'Playfair Display, serif', padding: '50px', borderOuter: 'none', borderInner: 'none', textShadow: 'none', isDark: false, noGradientBg: true },
7273:       { id: '6', name: 'ורוד עתיק (תמונה)', bg: 'url("./images/template_dusty_rose.png") center/cover', color: '#6B4C4C', font: 'Playfair Display, serif', padding: '50px', borderOuter: 'none', borderInner: 'none', textShadow: 'none', isDark: false, blocky: true, noGradientBg: true },
7274:       { id: '7', name: 'פרחים אפלים (תמונה)', bg: 'url("./images/template_dark_floral.png") center/cover', color: '#F4ECE4', font: 'Playfair Display, serif', padding: '50px', borderOuter: 'none', borderInner: 'none', textShadow: '0 0 10px rgba(0,0,0,0.8)', isDark: true, noGradientBg: true },
7275:       { id: '8', name: 'שיש גאומטרי (תמונה)', bg: 'url("./images/template_gold_geo.png") center/cover', color: '#8A6D05', font: 'Playfair Display, serif', padding: '50px', borderOuter: 'none', borderInner: 'none', textShadow: 'none', isDark: false, noGradientBg: true },
7276:       { id: '9', name: 'קלאסי זהב', bg: 'var(--gold-50)', color: '#8A6D05', font: 'Playfair Display, serif', padding: '40px', borderOuter: 'none', borderInner: '2px solid #D4A808', textShadow: 'none', isDark: false },
7277:       { id: '10', name: 'שחור יוקרתי', bg: '#131313', color: '#F5C518', font: 'Heebo, sans-serif', padding: '40px', borderOuter: '1px solid #333', borderInner: '1px solid #F5C518', textShadow: '0 0 8px rgba(245,197,24,0.3)', isDark: true },
7278:       { id: '11', name: 'רומנטיקה ורדים', bg: 'linear-gradient(to bottom, #FFF4F6, #FCE3E8)', color: '#6B4C4C', font: 'Playfair Display, serif', padding: '40px', borderOuter: 'none', borderInner: '5px double #E0CACA', textShadow: 'none', isDark: false, decoTop: '🌸' },
7279:       { id: '12', name: 'כפרי בוהו', bg: '#F4ECE4', color: '#5C4033', font: 'Playfair Display, serif', padding: '40px', borderOuter: '1px solid #A47D5C', borderInner: '1px dashed #A47D5C', textShadow: 'none', isDark: false, decoTop: '🌾' },
7280:       { id: '13', name: 'מינימליזם בוטיק', bg: '#FDFCF8', color: '#333333', font: 'Playfair Display, serif', padding: '50px', borderOuter: 'none', borderInner: 'none', textShadow: 'none', isDark: false, blocky: true, lines: true },
7281:       { id: '14', name: 'קלאסי מודרני', bg: '#FFFFFF', color: '#111111', font: 'Heebo, sans-serif', padding: '40px', borderOuter: '3px solid #EBEBEB', borderInner: '1px solid #EBEBEB', textShadow: 'none', isDark: false }
7282:     ];
7283: 
7284:     function InvitationDesigner({ event, onClose, onSave }) {
7285:       const [templateId, setTemplateId] = useState('1');
7286:       const [mainTitle, setMainTitle] = useState(() => {
7287:         const evType = event?.event_type;
7288:         if (evType === 'brit_mila') return "It's a BOY";
7289:         if (evType === 'bat_mitzvah') return "It's a GIRL";
7290:         if (evType === 'bar_mitzvah') return "13";
7291:         return event?.name ? event.name.replace(/חתונה של /,'') : 'האירוע שלנו';
7292:       });
7293:       const [subtitle, setSubtitle] = useState(() => {
7294:         const evType = event?.event_type;
7295:         if (evType === 'bar_mitzvah') return 'שמחים להזמינכם לשמחת בר המצווה של בננו';
7296:         if (evType === 'bat_mitzvah') return 'שמחים להזמינכם לשמחת בת המצווה של בתנו';
7297:         if (evType === 'brit_mila') return 'בשעה טובה אנו נרגשים להזמינכם לחגוג את הולדת בננו';
7298:         return 'נרגשים להזמינכם לשמוח איתנו';
7299:       });
7300:       const [groomParents, setGroomParents] = useState('');
7301:       const [brideParents, setBrideParents] = useState('');
7302:       const [receptionTime, setReceptionTime] = useState('19:30');
7303:       const [chuppahTime, setChuppahTime] = useState('20:30');
7304:       const [aliyaTorah, setAliyaTorah] = useState('');
7305:       const [sandak, setSandak] = useState('');
7306:       const [showRsvpText, setShowRsvpText] = useState(true);
7307:       const [generating, setGenerating] = useState(false);
7308:       const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
7309:       const previewRef = useRef(null);
7310: 
7311:       useEffect(() => {
7312:         const handleResize = () => setIsMobile(window.innerWidth < 768);
7313:         window.addEventListener('resize', handleResize);
7314:         return () => window.removeEventListener('resize', handleResize);
7315:       }, []);
7316: 
7317:       const tpl = INVITATION_TEMPLATES.find(t => t.id === templateId);
7318:       const evType = event?.event_type || 'wedding';
7319: 
7320:       const handleGenerate = async () => {
7321:         setGenerating(true);
7322:         try {
7323:           const originalScale = previewRef.current.style.transform;
7324:           previewRef.current.style.transform = 'none'; // reset scale for perfect generation
7325:           const canvas = await html2canvas(previewRef.current, { scale: 3, useCORS: true, backgroundColor: tpl.bg.includes('url') || tpl.bg.includes('gradient') ? null : tpl.bg });
7326:           previewRef.current.style.transform = originalScale; // restore scale
7327:           canvas.toBlob(blob => {
7328:             if (!blob) throw new Error("Canvas to blob failed");
7329:             const file = new File([blob], `invitation-${Date.now()}.png`, { type: 'image/png' });
7330:             onSave(file);
7331:             onClose();
7332:           }, 'image/png', 0.95);
7333:         } catch(err) {
7334:           console.error(err);
7335:           alert('שגיאה ביצירת התמונה');
7336:           setGenerating(false);
7337:         }
7338:       };
7339: 
7340:       const dateStr = event?.event_date ? new Date(event.event_date).toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\./g, '.') : 'תאריך האירוע';
7341:       const timeStr = event?.event_time ? event.event_time.slice(0,5) : 'שעה';
7342: 
7343:       const previewScale = isMobile ? Math.min(1, (window.innerWidth - 60) / 380) : 1;
7344: 
7345:       return (
7346:         <div className="modal-overlay" style={{ zIndex: 1000, overflowY: 'auto' }}>
7347:           <div className="modal-content animate-scale-in" style={{ maxWidth: 900, width: '95%', display: 'flex', flexDirection: 'column', minHeight: isMobile ? '100%' : 'auto', maxHeight: '95vh', padding: 0, overflow: 'hidden', marginTop: isMobile ? '20px' : '0' }}>
7348:             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
7349:               <div className="modal-title" style={{ fontSize: 18 }}>עיצוב הזמנה באפליקציה</div>
7350:               <button className="icon-btn" onClick={onClose}><Icon name="X" size={20} /></button>
7351:             </div>
7352:             
7353:             <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: isMobile ? 'column' : 'row' }}>
7354:               {/* Controls Sidebar */}
7355:               <div style={{ flex: 1, padding: '16px 24px', overflowY: 'auto', borderLeft: isMobile ? 'none' : '1px solid var(--border-default)' }}>
7356:                 <label className="input-label">בחר עיצוב</label>
7357:                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
7358:                   {INVITATION_TEMPLATES.map(t => (
7359:                     <div 
7360:                       key={t.id} 
7361:                       onClick={() => setTemplateId(t.id)}
7362:                       style={{ 
7363:                         padding: '10px', 
7364:                         borderRadius: '8px', 
7365:                         border: templateId === t.id ? '2px solid var(--accent)' : '1px solid var(--border-default)',
7366:                         background: t.bg.includes('gradient') ? t.bg : t.bg,
7367:                         color: t.color,
7368:                         cursor: 'pointer',
7369:                         textAlign: 'center',
7370:                         fontSize: 13,
7371:                         fontWeight: templateId === t.id ? 700 : 400,
7372:                         fontFamily: t.font
7373:                       }}
7374:                     >
7375:                       {t.name}
7376:                     </div>
7377:                   ))}
7378:                 </div>
7379: 
7380:                 <div className="input-group">
7381:                   <label className="input-label">כותרת ראשית (שם / גיל)</label>
7382:                   <input className="input-field" value={mainTitle} onChange={e => setMainTitle(e.target.value)} />
7383:                 </div>
7384: 
7385:                 <div className="input-group">
7386:                   <label className="input-label">כיתוב אישי (פתיח)</label>
7387:                   <input className="input-field" value={subtitle} onChange={e => setSubtitle(e.target.value)} />
7388:                 </div>
7389: 
7390:                 {/* Dynamic fields based on event type */}
7391:                 {evType === 'wedding' ? (
7392:                   <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
7393:                     <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
7394:                       <label className="input-label">הורי החתן</label>
7395:                       <input className="input-field" value={groomParents} onChange={e => setGroomParents(e.target.value)} placeholder="ישראל וישראלה לוי" />
7396:                     </div>
7397:                     <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
7398:                       <label className="input-label">הורי הכלה</label>
7399:                       <input className="input-field" value={brideParents} onChange={e => setBrideParents(e.target.value)} placeholder="משה ושרית כהן" />
7400:                     </div>
7401:                   </div>
7402:                 ) : (
7403:                   <div className="input-group" style={{ marginBottom: 15 }}>
7404:                     <label className="input-label">שמות המארחים / ההורים (מוצג למטה)</label>
7405:                     <input className="input-field" value={groomParents} onChange={e => setGroomParents(e.target.value)} placeholder="ישראל וישראלה לוי" />
7406:                   </div>
7407:                 )}
7408:                 
7409:                 {evType === 'wedding' && (
7410:                   <div style={{ display: 'flex', gap: 10 }}>
7411:                     <div className="input-group" style={{ flex: 1 }}>
7412:                       <label className="input-label">קבלת פנים</label>
7413:                       <input className="input-field" type="time" dir="ltr" value={receptionTime} onChange={e => setReceptionTime(e.target.value)} />
7414:                     </div>
7415:                     <div className="input-group" style={{ flex: 1 }}>
7416:                       <label className="input-label">חופה וקידושין</label>
7417:                       <input className="input-field" type="time" dir="ltr" value={chuppahTime} onChange={e => setChuppahTime(e.target.value)} />
7418:                     </div>
7419:                   </div>
7420:                 )}
7421: 
7422:                 {evType === 'brit_mila' && (
7423:                   <div className="input-group">
7424:                     <label className="input-label">סנדק (אופציונלי)</label>
7425:                     <input className="input-field" value={sandak} onChange={e => setSandak(e.target.value)} />
7426:                   </div>
7427:                 )}
7428: 
7429:                 {(evType === 'bar_mitzvah' || evType === 'bat_mitzvah') && (
7430:                   <div className="input-group">
7431:                     <label className="input-label">פרטי עליה לתורה (אופציונלי)</label>
7432:                     <textarea className="input-field" value={aliyaTorah} onChange={e => setAliyaTorah(e.target.value)} rows="3" placeholder="יום חמישי, בית כנסת הגדול..." />
7433:                   </div>
7434:                 )}
7435: 
7436:                 <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: -5 }}>
7437:                   <input type="checkbox" checked={showRsvpText} onChange={e => setShowRsvpText(e.target.checked)} id="rsvpCb" style={{ cursor: 'pointer', width: 16, height: 16 }} />
7438:                   <label htmlFor="rsvpCb" style={{ fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>הצג משפט "נא לאשר הגעה..." בתחתית</label>
7439:                 </div>
7440: 
7441:               </div>
7442: 
7443:               {/* Live Preview Area */}
7444:               <div style={{ flex: '1.2', background: 'var(--bg-tertiary)', padding: isMobile ? '20px 0' : 24, display: 'flex', justifyContent: 'center', alignItems: isMobile ? 'flex-start' : 'center', overflowY: 'auto' }}>
7445:                 <div 
7446:                   style={{
7447:                     transform: `scale(${previewScale})`,
7448:                     transformOrigin: 'top center',
7449:                     width: '380px',
7450:                     height: '530px'
7451:                   }}
7452:                 >
7453:                   <div 
7454:                     ref={previewRef}
7455:                     style={{
7456:                       width: '380px',
7457:                       minHeight: '530px',
7458:                     background: tpl.bg,
7459:                     border: tpl.borderOuter,
7460:                     padding: tpl.padding,
7461:                     display: 'flex',
7462:                     flexDirection: 'column',
7463:                     alignItems: 'center',
7464:                     justifyContent: 'center',
7465:                     textAlign: 'center',
7466:                     color: tpl.color,
7467:                     fontFamily: tpl.font,
7468:                     textShadow: tpl.textShadow,
7469:                     position: 'relative',
7470:                     boxSizing: 'border-box'
7471:                   }}
7472:                 >
7473:                   <div style={{ position: 'absolute', inset: 16, border: tpl.borderInner, borderRadius: tpl.circleWrap ? '50%' : '0', pointerEvents: 'none' }} />
7474:                   {tpl.bg.includes('unsplash') && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', pointerEvents: 'none' }} />}
7475:                   
7476:                   <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
7477:                     {tpl.decoTop && <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.9 }}>{tpl.decoTop}</div>}
7478:                     
7479:                     <div style={{ fontSize: tpl.blocky ? 15 : 17, marginBottom: 20, fontWeight: 500, letterSpacing: tpl.blocky ? '1px' : '0' }}>{subtitle}</div>
7480:                     
7481:                     <div style={{ fontSize: tpl.blocky ? 32 : 42, fontWeight: tpl.lines ? 400 : 700, marginBottom: 20, letterSpacing: tpl.letterSpacing || '0', textTransform: 'uppercase' }}>
7482:                       {mainTitle}
7483:                     </div>
7484: 
7485:                     {tpl.lines && <div style={{ width: '80%', height: '1px', background: tpl.color, opacity: 0.3, marginBottom: 20 }} />}
7486: 
7487:                     <div style={{ fontSize: tpl.blocky ? 18 : 20, marginBottom: 8, letterSpacing: tpl.blocky ? '2px' : '0', fontWeight: tpl.blocky ? 600 : 400 }}>{dateStr}</div>
7488:                     
7489:                     <div style={{ fontSize: 16, marginBottom: 24, fontWeight: 500 }}>
7490:                       {event?.venue_name || 'אולם מרהיב'} {event?.venue_address && `| ${event.venue_address}`}
7491:                     </div>
7492: 
7493:                     <div style={tpl.frostBottom ? { background: 'rgba(255,255,255,0.7)', padding: '20px', borderRadius: '16px', backdropFilter: 'blur(3px)', width: '110%', marginLeft: '-5%', marginRight: '-5%', display: 'flex', flexDirection: 'column', alignItems: 'center' } : { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
7494:                       {evType === 'wedding' ? (
7495:                         <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, fontSize: 15, marginBottom: 30, width: '100%' }}>
7496:                           {receptionTime && <div>קבלת פנים<br/><strong>{receptionTime}</strong></div>}
7497:                           {(receptionTime && chuppahTime) && <div style={{ width: '1px', height: '30px', background: tpl.color, opacity: 0.4 }} />}
7498:                           {chuppahTime && <div>חופה וקידושין<br/><strong>{chuppahTime}</strong></div>}
7499:                         </div>
7500:                       ) : (
7501:                         <div style={{ fontSize: 16, marginBottom: 30 }}>בשעה <strong>{timeStr}</strong></div>
7502:                       )}
7503: 
7504:                       {sandak && (
7505:                         <div style={{ fontSize: 14, marginBottom: 30 }}>סנדק: <strong>{sandak}</strong></div>
7506:                       )}
7507: 
7508:                       {aliyaTorah && (
7509:                         <div style={{ fontSize: 13, marginBottom: 30, whiteSpace: 'pre-line' }}>{aliyaTorah}</div>
7510:                       )}
7511: 
7512:                       {/* Parents side by side */}
7513:                       {(groomParents || brideParents) && (
7514:                         <div style={{ display: 'flex', width: '100%', justifyContent: 'center', gap: evType === 'wedding' ? 60 : 20, fontSize: 14, marginBottom: 20 }}>
7515:                           {groomParents && (
7516:                             <div style={{ textAlign: 'center' }}>
7517:                               {evType === 'wedding' && <div style={{ fontWeight: 700, marginBottom: 4, opacity: 0.8, fontSize: 12 }}>הורי החתן</div>}
7518:                               <div style={{ whiteSpace: 'pre-line', lineHeight: 1.4 }}>{groomParents}</div>
7519:                             </div>
7520:                           )}
7521:                           {brideParents && evType === 'wedding' && (
7522:                             <div style={{ textAlign: 'center' }}>
7523:                               <div style={{ fontWeight: 700, marginBottom: 4, opacity: 0.8, fontSize: 12 }}>הורי הכלה</div>
7524:                               <div style={{ whiteSpace: 'pre-line', lineHeight: 1.4 }}>{brideParents}</div>
7525:                             </div>
7526:                           )}
7527:                         </div>
7528:                       )}
7529: 
7530:                       <div style={{ fontSize: 18, marginTop: 10, fontWeight: 600 }}>נשמח לראותכם</div>
7531: 
7532:                       {showRsvpText && (
7533:                         <div style={{ fontSize: 12, opacity: 0.7, marginTop: 16, letterSpacing: '0.5px' }}>
7534:                           נא לאשר הגעה בקישור המצורף
7535:                         </div>
7536:                       )}
7537:                     </div>
7538:                   </div>
7539:                 </div>
7540:               </div>
7541:             </div>
7542: 
7543:             <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-default)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
7544:               <button className="btn btn-ghost" onClick={onClose} disabled={generating}>ביטול</button>
7545:               <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
7546:                 {generating ? <><Icon name="Loader" size={18} style={{ animation: 'spin 1s linear infinite' }} />מייצר...</> : <><Icon name="Check" size={18} />שמור והשתמש</>}
7547:               </button>
7548:             </div>
7549:           </div>
7550:         </div>
7551:       );
7552:     }
7553: 
7554:     // Phase 6 — Settings Page
7555:     // ============================================
7556:     function SettingsPage({ event, onEventUpdate }) {
7557:       const { client } = useContext(SupabaseContext);
7558:       const { addToast } = useContext(ToastContext);
7559:       const { signOut } = useContext(SupabaseContext);
7560:       const { theme, toggleTheme } = useContext(ThemeContext);
7561:       const { saveConfig } = useContext(SupabaseContext);
7562:       const { plan, limits, isPro, openCheckout, setShowUpgradeModal } = useContext(PlanContext);
7563: 
7564:       const [eventForm, setEventForm] = useState({
7565:         name: event?.name || '',
7566:         event_type: event?.event_type || 'wedding',
7567:         event_date: event?.event_date || '',
7568:         event_time: event?.event_time || '',
7569:         venue_name: event?.venue_name || '',
7570:         venue_address: event?.venue_address || '',
7571:         rsvp_enabled: event?.rsvp_enabled ?? false,
7572:         rsvp_deadline: event?.rsvp_deadline || '',
7573:         message_template: event?.message_template || '',
7574:         auto_reminder_enabled: event?.settings?.auto_reminder_enabled ?? false,
7575:         auto_thank_you_enabled: event?.settings?.auto_thank_you_enabled ?? false,
7576:         reminder_days_before: event?.settings?.reminder_days_before ?? 3,
7577:       });
7578:       const [saving, setSaving] = useState(false);
7579:       const [showDesigner, setShowDesigner] = useState(false);
7580: 
7581:       // Invitation upload
7582:       const [invitationUrl, setInvitationUrl] = useState(event?.settings?.invitation_url || '');
7583:       const [uploadingInv, setUploadingInv] = useState(false);
7584:       const invFileRef = useRef(null);
7585: 
7586:       // Floor plan upload
7587:       const [floorplanUrl, setFloorplanUrl] = useState(event?.settings?.floorplan_url || '');
7588:       const [uploadingFloor, setUploadingFloor] = useState(false);
7589:       const floorFileRef = useRef(null);
7590: 
7591:       const clearSupabase = () => {
7592:         if (!confirm('אפס חיבור Supabase? ייעשה שימוש בהגדרות ברירת המחדל.')) return;
7593:         const defaultConfig = { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY };
7594:         localStorage.setItem('seatsync-supabase', JSON.stringify(defaultConfig));
7595:         window.location.reload();
7596:       };
7597: 
7598:       // If no event selected — show ONLY system settings (logout, theme, plan)
7599:       if (!event) return (
7600:         <div className="animate-slide-up">
7601:           <div className="page-header">
7602:             <div className="page-title">הגדרות</div>
7603:             <div className="page-subtitle">הגדרות מערכת — בחרו אירוע לעריכת הגדרות אירוע</div>
7604:           </div>
7605: 
7606:           {/* No event notice */}
7607:           <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, padding: 16 }}>
7608:             <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
7609:               <Icon name="CalendarHeart" size={20} style={{ color: 'var(--accent)' }} />
7610:             </div>
7611:             <div style={{ flex: 1 }}>
7612:               <div style={{ fontWeight: 700, fontSize: 14 }}>אין אירוע פעיל</div>
7613:               <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>עברו ללשונית "אירועים" לבחירה או יצירת אירוע כדי לערוך את הגדרותיו</div>
7614:             </div>
7615:           </div>
7616: 
7617:           {/* System settings — always visible */}
7618:           <div className="settings-section">
7619:             <div className="settings-section-title">הגדרות מערכת</div>
7620:             <PWAInstallRow />
7621:             <div className="settings-row" onClick={toggleTheme} style={{ cursor: 'pointer' }}>
7622:               <div className="settings-row-icon"><Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={18} /></div>
7623:               <div style={{ flex: 1 }}>
7624:                 <div className="settings-row-label">מצב תצוגה</div>
7625:                 <div className="settings-row-sub">{theme === 'dark' ? 'מצב לילה פעיל' : 'מצב יום פעיל'}</div>
7626:               </div>
7627:               <Icon name="ChevronLeft" size={16} style={{ color: 'var(--text-tertiary)' }} />
7628:             </div>
7629:             <div className="settings-row" onClick={clearSupabase} style={{ cursor: 'pointer' }}>
7630:               <div className="settings-row-icon" style={{ color: 'var(--red-500)' }}><Icon name="Database" size={18} /></div>
7631:               <div style={{ flex: 1 }}>
7632:                 <div className="settings-row-label">איפוס חיבור Supabase</div>
7633:                 <div className="settings-row-sub">יאפס את הגדרות החיבור</div>
7634:               </div>
7635:               <Icon name="ChevronLeft" size={16} style={{ color: 'var(--text-tertiary)' }} />
7636:             </div>
7637:             <div className="settings-row" onClick={signOut} style={{ cursor: 'pointer' }}>
7638:               <div className="settings-row-icon" style={{ color: 'var(--red-500)' }}><Icon name="LogOut" size={18} /></div>
7639:               <div style={{ flex: 1 }}>
7640:                 <div className="settings-row-label" style={{ color: 'var(--red-500)' }}>התנתקות</div>
7641:               </div>
7642:               <Icon name="ChevronLeft" size={16} style={{ color: 'var(--text-tertiary)' }} />
7643:             </div>
7644:           </div>
7645: 
7646:           {/* Plan */}
7647:           <div className="settings-section" style={{ marginBottom: 16 }}>
7648:             <div className="settings-section-title">תוכנית</div>
7649:             <div style={{ padding: '16px 20px' }}>
7650:               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
7651:                 <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
7652:                   <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,var(--gold-400),var(--gold-600))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
7653:                     <Icon name="Zap" size={20} style={{ color: 'white' }} />
7654:                   </div>
7655:                   <div>
7656:                     <div style={{ fontWeight: 700, fontSize: 16 }}>תוכנית {PLAN_LIMITS[plan]?.label || 'Free'}</div>
7657:                     <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{plan === 'enterprise' ? 'גישה מלאה לכל הפיצ\'רים' : plan === 'pro' ? 'אירוע אחד · עד 200 מוזמנים' : 'גרסת ניסיון חינמית'}</div>
7658:                   </div>
7659:                 </div>
7660:                 {plan !== 'enterprise' && (
7661:                   <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}
7662:                     onClick={() => plan === 'free' ? setShowUpgradeModal(true) : openCheckout('enterprise')}>
7663:                     <Icon name="Zap" size={15} />{plan === 'free' ? 'שדרג' : 'Enterprise'}
7664:                   </button>
7665:                 )}
7666:               </div>
7667:             </div>
7668:           </div>
7669: 
7670:           <AppLegalFooter />
7671:         </div>
7672:       );
7673: 
7674:       const saveEvent = async () => {
7675:         if (!client || !event?.id) return;
7676:         setSaving(true);
7677:         const settings = {
7678:           ...(event.settings || {}),
7679:           invitation_url: invitationUrl,
7680:           floorplan_url: floorplanUrl,
7681:           auto_reminder_enabled: eventForm.auto_reminder_enabled,
7682:           auto_thank_you_enabled: eventForm.auto_thank_you_enabled,
7683:           reminder_days_before: eventForm.reminder_days_before || 3,
7684:         };
7685:         const { data, error } = await client.from('events').update({
7686:           name: eventForm.name,
7687:           event_type: eventForm.event_type,
7688:           event_date: eventForm.event_date || null,
7689:           event_time: eventForm.event_time || null,
7690:           venue_name: eventForm.venue_name || null,
7691:           venue_address: eventForm.venue_address || null,
7692:           rsvp_enabled: eventForm.rsvp_enabled,
7693:           rsvp_deadline: eventForm.rsvp_deadline || null,
7694:           message_template: eventForm.message_template || null,
7695:           settings,
7696:         }).eq('id', event.id).select().single();
7697: 
7698:         if (error) addToast('שגיאה בשמירה: ' + error.message, 'error');
7699:         else { onEventUpdate(data); addToast('הגדרות נשמרו ✓', 'success'); }
7700:         setSaving(false);
7701:       };
7702: 
7703:       // Ctrl+S shortcut to save settings
7704:       useEffect(() => {
7705:         const handler = () => saveEvent();
7706:         window.addEventListener('seatsync:save-settings', handler);
7707:         return () => window.removeEventListener('seatsync:save-settings', handler);
7708:       }, [eventForm, invitationUrl, floorplanUrl]);
7709: 
7710:       // Upload file to Supabase Storage
7711:       const uploadFile = async (file, bucket, folder) => {
7712:         const ext = file.name.split('.').pop();
7713:         const fileName = `${event.id}/${folder}_${Date.now()}.${ext}`;
7714:         // Ensure bucket exists — ignore error if already exists
7715:         await client.storage.createBucket(bucket, { public: true }).catch(() => {});
7716:         const { data, error } = await client.storage.from(bucket).upload(fileName, file, {
7717:           cacheControl: '3600',
7718:           upsert: true,
7719:         });
7720:         if (error) throw error;
7721:         const { data: { publicUrl } } = client.storage.from(bucket).getPublicUrl(fileName);
7722:         return publicUrl;
7723:       };
7724: 
7725:       const handleInvitationUpload = async (file) => {
7726:         if (!file) return;
7727:         const valid = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
7728:         if (!valid.includes(file.type)) { addToast('פורמט לא נתמך — JPG, PNG, WebP או PDF בלבד', 'error'); return; }
7729:         if (file.size > 10 * 1024 * 1024) { addToast('הקובץ גדול מדי — עד 10MB', 'error'); return; }
7730:         setUploadingInv(true);
7731:         try {
7732:           const url = await uploadFile(file, 'invitations', 'invitation');
7733:           setInvitationUrl(url);
7734:           // Save immediately
7735:           const settings = { ...(event.settings || {}), invitation_url: url, floorplan_url: floorplanUrl };
7736:           await client.from('events').update({ settings }).eq('id', event.id);
7737:           addToast('ההזמנה הועלתה בהצלחה ✓', 'success');
7738:         } catch (err) {
7739:           addToast('שגיאה בהעלאה: ' + (err.message || 'נסה שוב'), 'error');
7740:         }
7741:         setUploadingInv(false);
7742:       };
7743: 
7744:       const handleFloorplanUpload = async (file) => {
7745:         if (!file) return;
7746:         const valid = ['image/jpeg', 'image/png', 'image/webp'];
7747:         if (!valid.includes(file.type)) { addToast('פורמט לא נתמך — JPG, PNG או WebP בלבד', 'error'); return; }
7748:         if (file.size > 10 * 1024 * 1024) { addToast('הקובץ גדול מדי — עד 10MB', 'error'); return; }
7749:         setUploadingFloor(true);
7750:         try {
7751:           const url = await uploadFile(file, 'floorplans', 'floorplan');
7752:           setFloorplanUrl(url);
7753:           const settings = { ...(event.settings || {}), invitation_url: invitationUrl, floorplan_url: url };
7754:           const { data, error } = await client.from('events').update({ settings }).eq('id', event.id).select().single();
7755:           if (data) onEventUpdate(data);
7756:           addToast('סקיצת האולם הועלתה ✓', 'success');
7757:         } catch (err) {
7758:           addToast('שגיאה בהעלאה: ' + (err.message || 'נסה שוב'), 'error');
7759:         }
7760:         setUploadingFloor(false);
7761:       };
7762: 
7763:       const copyRsvpBase = () => {
7764:         const base = `${window.location.origin}/rsvp.html`;
7765:         navigator.clipboard?.writeText(base);
7766:         addToast('בסיס לינק ה-RSVP הועתק ✓', 'success');
7767:       };
7768: 
7769:       const EVENT_TYPES = [
7770:         { value: 'wedding', label: '💒 חתונה' },
7771:         { value: 'bar_mitzvah', label: '✡️ בר מצווה' },
7772:         { value: 'bat_mitzvah', label: '✡️ בת מצווה' },
7773:         { value: 'brit_mila', label: '👶 ברית' },
7774:         { value: 'brit_bat', label: '👶 בריתה' },
7775:         { value: 'corporate', label: '🏢 אירוע עסקי' },
7776:         { value: 'birthday', label: '🎂 יום הולדת' },
7777:         { value: 'other', label: '🎉 אחר' },
7778:       ];
7779: 
7780:       return (
7781:         <div className="animate-slide-up">
7782:           <div className="page-header">
7783:             <div className="page-title">הגדרות</div>
7784:             <div className="page-subtitle">הגדרות האירוע ומערכת</div>
7785:           </div>
7786: 
7787:           {/* Event settings */}
7788:           <div className="settings-section">
7789:             <div className="settings-section-title">פרטי האירוע</div>
7790:             <div style={{ padding: '16px 20px' }}>
7791:               <div className="input-group">
7792:                 <label className="input-label">שם האירוע</label>
7793:                 <input className="input-field" value={eventForm.name} onChange={e => setEventForm(f => ({ ...f, name: e.target.value }))} />
7794:               </div>
7795:               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
7796:                 <div className="input-group">
7797:                   <label className="input-label">סוג אירוע</label>
7798:                   <select className="input-field" value={eventForm.event_type} onChange={e => setEventForm(f => ({ ...f, event_type: e.target.value }))}>
7799:                     {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
7800:                   </select>
7801:                 </div>
7802:                 <div className="input-group">
7803:                   <label className="input-label">תאריך</label>
7804:                   <input className="input-field" type="date" dir="ltr" value={eventForm.event_date} onChange={e => setEventForm(f => ({ ...f, event_date: e.target.value }))} />
7805:                 </div>
7806:                 <div className="input-group">
7807:                   <label className="input-label">שעה</label>
7808:                   <input className="input-field" type="time" dir="ltr" value={eventForm.event_time} onChange={e => setEventForm(f => ({ ...f, event_time: e.target.value }))} />
7809:                 </div>
7810:                 <div className="input-group">
7811:                   <label className="input-label">שם האולם</label>
7812:                   <input className="input-field" value={eventForm.venue_name} onChange={e => setEventForm(f => ({ ...f, venue_name: e.target.value }))} />
7813:                 </div>
7814:               </div>
7815:               <div className="input-group">
7816:                 <label className="input-label">כתובת</label>
7817:                 <input className="input-field" value={eventForm.venue_address} onChange={e => setEventForm(f => ({ ...f, venue_address: e.target.value }))} />
7818:               </div>
7819:               <button className="btn btn-primary" onClick={saveEvent} disabled={saving} style={{ marginTop: 4 }}>
7820:                 <Icon name={saving ? 'Loader' : 'Save'} size={18} />
7821:                 {saving ? 'שומר...' : 'שמור שינויים'}
7822:               </button>
7823:             </div>
7824:           </div>
7825: 
7826:           {/* RSVP Settings */}
7827:           <div className="settings-section">
7828:             <div className="settings-section-title">הגדרות RSVP</div>
7829:             <div className="settings-row">
7830:               <div className="settings-row-icon"><Icon name="Link" size={18} /></div>
7831:               <div style={{ flex: 1 }}>
7832:                 <div className="settings-row-label">RSVP פעיל</div>
7833:                 <div className="settings-row-sub">אורחים יוכלו לאשר הגעה דרך לינק אישי</div>
7834:               </div>
7835:               <label className="toggle-switch">
7836:                 <input type="checkbox" checked={eventForm.rsvp_enabled} onChange={e => setEventForm(f => ({ ...f, rsvp_enabled: e.target.checked }))} />
7837:                 <span className="toggle-track" />
7838:               </label>
7839:             </div>
7840:             {eventForm.rsvp_enabled && (
7841:               <>
7842:                 <div className="settings-row">
7843:                   <div className="settings-row-icon"><Icon name="Calendar" size={18} /></div>
7844:                   <div style={{ flex: 1 }}>
7845:                     <div className="settings-row-label">מועד אחרון לאישור</div>
7846:                     <input
7847:                       type="date"
7848:                       className="input-field"
7849:                       style={{ marginTop: 6, maxWidth: 200 }}
7850:                       dir="ltr"
7851:                       value={eventForm.rsvp_deadline}
7852:                       onChange={e => setEventForm(f => ({ ...f, rsvp_deadline: e.target.value }))}
7853:                     />
7854:                   </div>
7855:                 </div>
7856:                 <div className="settings-row">
7857:                   <div className="settings-row-icon"><Icon name="ExternalLink" size={18} /></div>
7858:                   <div style={{ flex: 1 }}>
7859:                     <div className="settings-row-label">בסיס לינק RSVP</div>
7860:                     <div className="settings-row-sub" style={{ direction: 'ltr', textAlign: 'right', fontSize: 11 }}>
7861:                       {window.location.origin}/rsvp.html?token=...
7862:                     </div>
7863:                   </div>
7864:                   <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={copyRsvpBase}>
7865:                     <Icon name="Copy" size={14} />העתק
7866:                   </button>
7867:                 </div>
7868:                 <div style={{ padding: '12px 20px' }}>
7869:                   <button className="btn btn-primary" onClick={saveEvent} style={{ width: '100%' }}>
7870:                     <Icon name="Save" size={18} />שמור הגדרות RSVP
7871:                   </button>
7872:                 </div>
7873:               </>
7874:             )}
7875:           </div>
7876: 
7877:           {/* Auto-messaging CRON settings */}
7878:           <div className="settings-section">
7879:             <div className="settings-section-title">הודעות אוטומטיות</div>
7880:             <div style={{ padding: '0 0 8px' }}>
7881:               {!isPro && (
7882:                 <div style={{ margin: '12px 20px', padding: '10px 14px', background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
7883:                   <Icon name="Zap" size={14} style={{ color: 'var(--gold-600)', flexShrink: 0 }} />
7884:                   <span>פיצ'ר Pro — שדרגו לשליחת הודעות אוטומטיות</span>
7885:                   <ProBadge />
7886:                 </div>
7887:               )}
7888: 
7889:               {/* Auto reminder */}
7890:               <div className="settings-row">
7891:                 <div className="settings-row-icon"><Icon name="Bell" size={18} /></div>
7892:                 <div style={{ flex: 1 }}>
7893:                   <div className="settings-row-label">תזכורת אוטומטית לפני האירוע</div>
7894:                   <div className="settings-row-sub">שולחת WhatsApp לכל מי שלא אישר/ה</div>
7895:                 </div>
7896:                 <label className="toggle-switch">
7897:                   <input
7898:                     type="checkbox"
7899:                     checked={eventForm.auto_reminder_enabled ?? false}
7900:                     onChange={e => setEventForm(f => ({ ...f, auto_reminder_enabled: e.target.checked }))}
7901:                     disabled={!isPro}
7902:                   />
7903:                   <span className="toggle-track" />
7904:                 </label>
7905:               </div>
7906: 
7907:               {eventForm.auto_reminder_enabled && isPro && (
7908:                 <div style={{ padding: '8px 20px 12px' }}>
7909:                   <label className="input-label">שלח תזכורת כמה ימים לפני האירוע?</label>
7910:                   <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
7911:                     <input
7912:                       className="input-field"
7913:                       type="number"
7914:                       min="1" max="30"
7915:                       value={eventForm.reminder_days_before ?? 3}
7916:                       onChange={e => setEventForm(f => ({ ...f, reminder_days_before: parseInt(e.target.value) || 3 }))}
7917:                       style={{ width: 80 }}
7918:                       dir="ltr"
7919:                     />
7920:                     <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>ימים לפני האירוע</span>
7921:                   </div>
7922:                 </div>
7923:               )}
7924: 
7925:               {/* Auto thank-you */}
7926:               <div className="settings-row">
7927:                 <div className="settings-row-icon"><Icon name="Heart" size={18} /></div>
7928:                 <div style={{ flex: 1 }}>
7929:                   <div className="settings-row-label">הודעת תודה אחרי האירוע</div>
7930:                   <div className="settings-row-sub">שולחת תודה ליום אחרי לכל המגיעים</div>
7931:                 </div>
7932:                 <label className="toggle-switch">
7933:                   <input
7934:                     type="checkbox"
7935:                     checked={eventForm.auto_thank_you_enabled ?? false}
7936:                     onChange={e => setEventForm(f => ({ ...f, auto_thank_you_enabled: e.target.checked }))}
7937:                     disabled={!isPro}
7938:                   />
7939:                   <span className="toggle-track" />
7940:                 </label>
7941:               </div>
7942: 
7943:               {(eventForm.auto_reminder_enabled || eventForm.auto_thank_you_enabled) && isPro && (
7944:                 <div style={{ padding: '4px 20px 12px' }}>
7945:                   <button className="btn btn-primary" onClick={saveEvent} disabled={saving} style={{ width: '100%' }}>
7946:                     <Icon name={saving ? 'Loader' : 'Save'} size={18} />
7947:                     {saving ? 'שומר...' : 'שמור הגדרות הודעות'}
7948:                   </button>
7949:                 </div>
7950:               )}
7951:             </div>
7952:           </div>
7953: 
7954:           {/* App settings */}
7955:           <div className="settings-section">
7956:             <div className="settings-section-title">הזמנה מעוצבת</div>
7957:             <div style={{ padding: '16px 20px' }}>
7958:               <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
7959:                 העלו את ההזמנה המעוצבת שלכם. היא תוצג בדף ה-RSVP ותישלח כלינק עם ההודעה.
7960:               </div>
7961:               {invitationUrl ? (
7962:                 <div style={{ position: 'relative', marginBottom: 12 }}>
7963:                   {invitationUrl.endsWith('.pdf') ? (
7964:                     <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
7965:                       <Icon name="FileText" size={24} style={{ color: 'var(--accent)' }} />
7966:                       <div style={{ flex: 1 }}>
7967:                         <div style={{ fontWeight: 600, fontSize: 14 }}>הזמנה (PDF)</div>
7968:                         <a href={invitationUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'underline' }}>
7969:                           פתח קובץ
7970:                         </a>
7971:                       </div>
7972:                     </div>
7973:                   ) : (
7974:                     <img src={invitationUrl} alt="הזמנה" style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }} />
7975:                   )}
7976:                   <button
7977:                     className="icon-btn"
7978:                     style={{ position: 'absolute', top: 6, left: 6, width: 28, height: 28, background: 'rgba(0,0,0,0.6)', borderRadius: 'var(--radius-full)', color: 'white' }}
7979:                     onClick={() => { setInvitationUrl(''); }}
7980:                     title="הסר הזמנה"
7981:                   >
7982:                     <Icon name="X" size={14} />
7983:                   </button>
7984:                 </div>
7985:               ) : (
7986:                 <div
7987:                   className="upload-zone"
7988:                   onClick={() => invFileRef.current?.click()}
7989:                   style={{ padding: 24 }}
7990:                 >
7991:                   <input ref={invFileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => handleInvitationUpload(e.target.files[0])} />
7992:                   {uploadingInv ? (
7993:                     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
7994:                       <Icon name="Loader" size={28} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
7995:                       <div style={{ fontSize: 14 }}>מעלה...</div>
7996:                     </div>
7997:                   ) : (
7998:                     <>
7999:                       <Icon name="ImagePlus" size={32} style={{ color: 'var(--accent)', marginBottom: 8 }} />
8000:                       <div style={{ fontWeight: 600, marginBottom: 4 }}>העלו הזמנה מעוצבת</div>
8001:                       <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>JPG, PNG, WebP או PDF — עד 10MB</div>
8002:                     </>
8003:                   )}
8004:                 </div>
8005:               )}
8006: 
8007:               <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
8008:                 <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
8009:                 <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>או</div>
8010:                 <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }} />
8011:               </div>
8012:               <button
8013:                 className="btn btn-secondary"
8014:                 style={{ width: '100%', marginTop: 12, padding: '12px', border: '1px dashed var(--border-focus)', background: 'var(--bg-tertiary)' }}
8015:                 onClick={() => setShowDesigner(true)}
8016:               >
8017:                 <Icon name="Palette" size={18} style={{ color: 'var(--accent)' }} />
8018:                 <span style={{ fontWeight: 600 }}>עיצוב הזמנה באפליקציה</span>
8019:               </button>
8020: 
8021:               {showDesigner && (
8022:                 <InvitationDesigner 
8023:                   event={event} 
8024:                   onClose={() => setShowDesigner(false)} 
8025:                   onSave={(file) => {
8026:                     handleInvitationUpload(file);
8027:                   }} 
8028:                 />
8029:               )}
8030:             </div>
8031:           </div>
8032: 
8033:           {/* Floor Plan Upload */}
8034:           <div className="settings-section">
8035:             <div className="settings-section-title">סקיצת אולם</div>
8036:             <div style={{ padding: '16px 20px' }}>
8037:               <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
8038:                 העלו תוכנית/סקיצה של האולם. היא תוצג כרקע במפת ההושבה כדי לסדר שולחנות במיקום המדויק.
8039:               </div>
8040:               {floorplanUrl ? (
8041:                 <div style={{ position: 'relative', marginBottom: 12 }}>
8042:                   <img src={floorplanUrl} alt="סקיצת אולם" style={{ width: '100%', maxHeight: 250, objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'white' }} />
8043:                   <button
8044:                     className="icon-btn"
8045:                     style={{ position: 'absolute', top: 6, left: 6, width: 28, height: 28, background: 'rgba(0,0,0,0.6)', borderRadius: 'var(--radius-full)', color: 'white' }}
8046:                     onClick={async () => { 
8047:                       setFloorplanUrl(''); 
8048:                       const settings = { ...(event.settings || {}), invitation_url: invitationUrl, floorplan_url: '' };
8049:                       const { data } = await client.from('events').update({ settings }).eq('id', event.id).select().single();
8050:                       if (data) onEventUpdate(data);
8051:                       addToast('הסקיצה הוסרה', 'success');
8052:                     }}
8053:                     title="הסר סקיצה"
8054:                   >
8055:                     <Icon name="X" size={14} />
8056:                   </button>
8057:                 </div>
8058:               ) : (
8059:                 <div
8060:                   className="upload-zone"
8061:                   onClick={() => floorFileRef.current?.click()}
8062:                   style={{ padding: 24 }}
8063:                 >
8064:                   <input ref={floorFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFloorplanUpload(e.target.files[0])} />
8065:                   {uploadingFloor ? (
8066:                     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
8067:                       <Icon name="Loader" size={28} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
8068:                       <div style={{ fontSize: 14 }}>מעלה...</div>
8069:                     </div>
8070:                   ) : (
8071:                     <>
8072:                       <Icon name="Map" size={32} style={{ color: 'var(--accent)', marginBottom: 8 }} />
8073:                       <div style={{ fontWeight: 600, marginBottom: 4 }}>העלו סקיצת אולם</div>
8074:                       <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>JPG, PNG או WebP — עד 10MB</div>
8075:                     </>
8076:                   )}
8077:                 </div>
8078:               )}
8079:             </div>
8080:           </div>
8081: 
8082:           {/* App settings (system) */}
8083:           <div className="settings-section">
8084:             <div className="settings-section-title">הגדרות מערכת</div>
8085:             <PWAInstallRow />
8086:             <div className="settings-row" onClick={toggleTheme} style={{ cursor: 'pointer' }}>
8087:               <div className="settings-row-icon"><Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={18} /></div>
8088:               <div style={{ flex: 1 }}>
8089:                 <div className="settings-row-label">מצב תצוגה</div>
8090:                 <div className="settings-row-sub">{theme === 'dark' ? 'מצב לילה פעיל' : 'מצב יום פעיל'}</div>
8091:               </div>
8092:               <Icon name="ChevronLeft" size={16} style={{ color: 'var(--text-tertiary)' }} />
8093:             </div>
8094:             <div className="settings-row" onClick={clearSupabase} style={{ cursor: 'pointer' }}>
8095:               <div className="settings-row-icon" style={{ color: 'var(--red-500)' }}><Icon name="Database" size={18} /></div>
8096:               <div style={{ flex: 1 }}>
8097:                 <div className="settings-row-label">איפוס חיבור Supabase</div>
8098:                 <div className="settings-row-sub">יאפס את הגדרות החיבור</div>
8099:               </div>
8100:               <Icon name="ChevronLeft" size={16} style={{ color: 'var(--text-tertiary)' }} />
8101:             </div>
8102:             <div className="settings-row" onClick={signOut} style={{ cursor: 'pointer' }}>
8103:               <div className="settings-row-icon" style={{ color: 'var(--red-500)' }}><Icon name="LogOut" size={18} /></div>
8104:               <div style={{ flex: 1 }}>
8105:                 <div className="settings-row-label" style={{ color: 'var(--red-500)' }}>התנתקות</div>
8106:               </div>
8107:               <Icon name="ChevronLeft" size={16} style={{ color: 'var(--text-tertiary)' }} />
8108:             </div>
8109:           </div>
8110: 
8111:           {/* Plan Status */}
8112:           <div className="settings-section" style={{ marginBottom: 16 }}>
8113:             <div className="settings-section-title">תוכנית</div>
8114:             <div style={{ padding: '16px 20px' }}>
8115:               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
8116:                 <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
8117:                   <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,var(--gold-400),var(--gold-600))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
8118:                     <Icon name="Zap" size={20} style={{ color: 'white' }} />
8119:                   </div>
8120:                   <div>
8121:                     <div style={{ fontWeight: 700, fontSize: 16 }}>תוכנית {PLAN_LIMITS[plan]?.label || 'Free'}</div>
8122:                     <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{plan === 'enterprise' ? 'גישה מלאה לכל הפיצ\'רים' : plan === 'pro' ? 'אירוע אחד · עד 200 מוזמנים' : 'גרסת ניסיון חינמית'}</div>
8123:                   </div>
8124:                 </div>
8125:                 {plan !== 'enterprise' && (
8126:                   <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}
8127:                     onClick={() => plan === 'free' ? setShowUpgradeModal(true) : openCheckout('enterprise')}>
8128:                     <Icon name="Zap" size={15} />{plan === 'free' ? 'שדרוג' : 'שדרוג ל-Enterprise'}
8129:                   </button>
8130:                 )}
8131:               </div>
8132:               {/* Usage bars */}
8133:               {[
8134:                 { label: 'אירועים', max: limits.events, icon: 'CalendarDays' },
8135:                 { label: 'מוזמנים', max: limits.guests, icon: 'Users' },
8136:                 { label: 'שולחנות', max: limits.tables, icon: 'Armchair' },
8137:                 { label: 'סבבי הודעות', max: limits.messageRounds === 999 ? '∞' : limits.messageRounds, icon: 'Send' },
8138:               ].map(item => (
8139:                 <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, fontSize: 13 }}>
8140:                   <Icon name={item.icon} size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
8141:                   <span style={{ color: 'var(--text-secondary)', width: 110 }}>{item.label}</span>
8142:                   <span style={{ fontWeight: 600, color: isPro ? 'var(--emerald-500)' : 'var(--text-primary)' }}>
8143:                     {typeof item.max === 'number' ? `עד ${item.max}` : item.max}
8144:                   </span>
8145:                 </div>
8146:               ))}
8147:             </div>
8148:           </div>
8149: 
8150:           {/* Version */}
8151:           <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
8152:             SeatSync v2.2.0 🚀
8153:           </div>
8154: 
8155:           <AppLegalFooter />
8156:         </div>
8157:       );
8158:     }
8159: 
8160:     // ============================================
8161:     // Password Update Page (after reset-password link)
8162:     // ============================================
8163:     function PasswordUpdatePage({ onDone }) {
8164:       const { client } = useContext(SupabaseContext);
8165:       const { addToast } = useContext(ToastContext);
8166:       const [password, setPassword] = useState('');
8167:       const [confirm, setConfirm] = useState('');
8168:       const [loading, setLoading] = useState(false);
8169:       const [done, setDone] = useState(false);
8170: 
8171:       const handleUpdate = async () => {
8172:         if (password.length < 6) { addToast('סיסמה חייבת להכיל לפחות 6 תווים', 'error'); return; }
8173:         if (password !== confirm) { addToast('הסיסמאות אינן תואמות', 'error'); return; }
8174:         setLoading(true);
8175:         const { error } = await client.auth.updateUser({ password });
8176:         if (error) {
8177:           addToast('שגיאה בעדכון סיסמה: ' + error.message, 'error');
8178:         } else {
8179:           setDone(true);
8180:           addToast('הסיסמה עודכנה בהצלחה ✓', 'success');
8181:           setTimeout(onDone, 1500);
8182:         }
8183:         setLoading(false);
8184:       };
8185: 
8186:       if (done) return (
8187:         <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
8188:           <div style={{ fontSize: 48 }}>✅</div>
8189:           <div style={{ fontSize: 20, fontWeight: 800 }}>הסיסמה עודכנה!</div>
8190:           <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>מועבר לאפליקציה...</div>
8191:         </div>
8192:       );
8193: 
8194:       return (
8195:         <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
8196:           <div style={{ width: '100%', maxWidth: 380 }}>
8197:             <div style={{ textAlign: 'center', marginBottom: 28 }}>
8198:               <div className="hero-logo" style={{ width: 64, height: 64, borderRadius: 16, margin: '0 auto 16px', animation: 'none' }}>
8199:                 <Icon name="KeyRound" size={30} />
8200:               </div>
8201:               <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>עדכון סיסמה</div>
8202:               <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>הזינו סיסמה חדשה לחשבון שלכם</div>
8203:             </div>
8204:             <div className="card">
8205:               <div className="input-group">
8206:                 <label className="input-label">סיסמה חדשה</label>
8207:                 <input className="input-field" type="password" placeholder="לפחות 6 תווים" value={password} onChange={e => setPassword(e.target.value)} dir="ltr" style={{ textAlign: 'left' }} autoFocus />
8208:               </div>
8209:               <div className="input-group">
8210:                 <label className="input-label">אימות סיסמה</label>
8211:                 <input className="input-field" type="password" placeholder="הזינו שוב" value={confirm} onChange={e => setConfirm(e.target.value)} dir="ltr" style={{ textAlign: 'left' }} onKeyDown={e => e.key === 'Enter' && handleUpdate()} />
8212:               </div>
8213:               <button className="btn btn-primary" style={{ width: '100%', marginTop: 4 }} onClick={handleUpdate} disabled={loading}>
8214:                 {loading ? <><Icon name="Loader" size={18} style={{ animation: 'spin 1s linear infinite' }} />מעדכן...</> : <><Icon name="Check" size={18} />עדכן סיסמה</>}
8215:               </button>
8216:             </div>
8217:           </div>
8218:         </div>
8219:       );
8220:     }
8221: 
8222:     // ============================================
8223:     // Payment Success Banner — shown after returning from checkout
8224:     // ============================================
8225:     function PaymentSuccessBanner() {
8226:       const [show, setShow] = useState(false);
8227:       const [planName, setPlanName] = useState('Pro');
8228:       const { plan, isPro } = useContext(PlanContext);
8229:       const { addToast } = useContext(ToastContext);
8230: 
8231:       useEffect(() => {
8232:         const params = new URLSearchParams(window.location.search);
8233:         if (params.get('payment') === 'success') {
8234:           setShow(true);
8235:         }
8236:       }, []);
8237: 
8238:       useEffect(() => {
8239:         if (show && isPro) {
8240:           setPlanName(PLAN_LIMITS[plan]?.label || 'Pro');
8241:           addToast('התוכנית שודרגה בהצלחה! 🎉', 'success');
8242:         }
8243:       }, [show, isPro, plan]);
8244: 
8245:       if (!show) return null;
8246: 
8247:       return (
8248:         <div style={{
8249:           background: 'linear-gradient(135deg, #D4A808 0%, #8A6D05 100%)',
8250:           color: 'white', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12,
8251:           position: 'relative', zIndex: 50
8252:         }}>
8253:           <div style={{ fontSize: 28 }}>{isPro ? '🎉' : '⏳'}</div>
8254:           <div style={{ flex: 1 }}>
8255:             <div style={{ fontWeight: 800, fontSize: 15 }}>
8256:               {isPro ? `ברוכים הבאים ל-${planName}!` : 'התשלום התקבל — מפעיל...'}
8257:             </div>
8258:             <div style={{ fontSize: 12, opacity: 0.9 }}>
8259:               {isPro ? 'כל הפיצ\'רים פתוחים. ניהול מושלם מתחיל עכשיו!' : 'ההפעלה תתבצע תוך מספר שניות'}
8260:             </div>
8261:           </div>
8262:           <button onClick={() => setShow(false)} style={{
8263:             background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
8264:             width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
8265:             color: 'white', cursor: 'pointer', flexShrink: 0
8266:           }}>
8267:             <Icon name="X" size={16} />
8268:           </button>
8269:         </div>
8270:       );
8271:     }
8272: 
8273:     // ============================================
8274:     // Full-page Upgrade Modal — accessible from anywhere
8275:     // ============================================
8276:     function UpgradeModal({ onClose }) {
8277:       const { plan, openCheckout } = useContext(PlanContext);
8278:       const [selectedPlan, setSelectedPlan] = useState(plan === 'pro' ? 'enterprise' : 'pro');
8279: 
8280:       // If already enterprise, nothing to upgrade
8281:       if (plan === 'enterprise') {
8282:         return (
8283:           <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
8284:             <div className="modal-content animate-scale-in" style={{ maxWidth: 380, padding: 24, textAlign: 'center' }}>
8285:               <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
8286:               <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8 }}>תוכנית Enterprise פעילה</div>
8287:               <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>יש לכם גישה מלאה לכל הפיצ'רים!</div>
8288:               <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>מעולה!</button>
8289:             </div>
8290:           </div>
8291:         );
8292:       }
8293: 
8294:       const isProSelected = selectedPlan === 'pro';
8295:       const isEntSelected = selectedPlan === 'enterprise';
8296: 
8297:       return (
8298:         <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
8299:           <div className="modal-content animate-scale-in" style={{ maxWidth: 440, padding: 0, overflow: 'hidden' }}>
8300:             <div style={{
8301:               background: 'linear-gradient(135deg, #D4A808 0%, #8A6D05 100%)',
8302:               padding: '28px 24px', color: 'white', textAlign: 'center'
8303:             }}>
8304:               <div style={{ fontSize: 36, marginBottom: 4 }}>✦</div>
8305:               <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
8306:                 {plan === 'pro' ? 'שדרגו ל-Enterprise' : 'בחרו תוכנית'}
8307:               </div>
8308:               <div style={{ fontSize: 14, opacity: 0.9 }}>תשלום חד פעמי לאירוע. ללא מנוי. ללא חיוב חוזר.</div>
8309:             </div>
8310: 
8311:             <div style={{ padding: '24px' }}>
8312:               {/* Show Pro option only for Free users */}
8313:               {plan === 'free' && (
8314:                 <div
8315:                   onClick={() => setSelectedPlan('pro')}
8316:                   style={{
8317:                     border: isProSelected ? '2px solid var(--gold-400)' : '1px solid var(--border-default)',
8318:                     borderRadius: 'var(--radius-lg)',
8319:                     padding: '20px', marginBottom: 16, position: 'relative',
8320:                     background: isProSelected ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
8321:                     cursor: 'pointer',
8322:                     transition: 'all 0.2s ease',
8323:                     opacity: isProSelected ? 1 : 0.75,
8324:                   }}
8325:                 >
8326:                   {isProSelected && (
8327:                     <div style={{
8328:                       position: 'absolute', top: -10, right: 16,
8329:                       background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))',
8330:                       color: '#1A1A1A', fontSize: 11, fontWeight: 800, padding: '2px 10px',
8331:                       borderRadius: 20, letterSpacing: 0.5
8332:                     }}>הכי פופולרי</div>
8333:                   )}
8334:                   <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
8335:                     <div style={{
8336:                       width: 20, height: 20, borderRadius: '50%',
8337:                       border: isProSelected ? '6px solid var(--gold-400)' : '2px solid var(--border-default)',
8338:                       transition: 'all 0.2s ease', flexShrink: 0,
8339:                     }} />
8340:                     <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
8341:                       <span style={{ fontSize: 32, fontWeight: 900 }}>99₪</span>
8342:                       <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>לאירוע</span>
8343:                     </div>
8344:                   </div>
8345:                   {[
8346:                     'אירוע אחד', 'עד 200 מוזמנים', 'עד 25 שולחנות', 'סבבי הודעות ללא הגבלה',
8347:                     'קישורי RSVP אישיים', 'הודעות אוטומטיות', 'ייצוא PDF + אקסל',
8348:                   ].map((f, i) => (
8349:                     <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 13 }}>
8350:                       <span style={{ color: 'var(--emerald-500)' }}>✓</span><span>{f}</span>
8351:                     </div>
8352:                   ))}
8353:                 </div>
8354:               )}
8355: 
8356:               {/* Enterprise option */}
8357:               <div
8358:                 onClick={() => setSelectedPlan('enterprise')}
8359:                 style={{
8360:                   border: isEntSelected ? '2px solid var(--gold-400)' : '1px solid var(--border-default)',
8361:                   borderRadius: 'var(--radius-lg)',
8362:                   padding: '20px',
8363:                   background: isEntSelected ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
8364:                   position: 'relative',
8365:                   cursor: 'pointer',
8366:                   transition: 'all 0.2s ease',
8367:                   opacity: isEntSelected ? 1 : 0.75,
8368:                 }}
8369:               >
8370:                 {isEntSelected && plan === 'free' && (
8371:                   <div style={{
8372:                     position: 'absolute', top: -10, right: 16,
8373:                     background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))',
8374:                     color: '#1A1A1A', fontSize: 11, fontWeight: 800, padding: '2px 10px',
8375:                     borderRadius: 20, letterSpacing: 0.5
8376:                   }}>הכי משתלם</div>
8377:                 )}
8378:                 {plan === 'pro' && (
8379:                   <div style={{
8380:                     position: 'absolute', top: -10, right: 16,
8381:                     background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))',
8382:                     color: '#1A1A1A', fontSize: 11, fontWeight: 800, padding: '2px 10px',
8383:                     borderRadius: 20, letterSpacing: 0.5
8384:                   }}>שדרוג מומלץ</div>
8385:                 )}
8386:                 <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
8387:                   {plan === 'free' && (
8388:                     <div style={{
8389:                       width: 20, height: 20, borderRadius: '50%',
8390:                       border: isEntSelected ? '6px solid var(--gold-400)' : '2px solid var(--border-default)',
8391:                       transition: 'all 0.2s ease', flexShrink: 0,
8392:                     }} />
8393:                   )}
8394:                   <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
8395:                     <span style={{ fontSize: 32, fontWeight: 900 }}>249₪</span>
8396:                     <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>לאירוע</span>
8397:                   </div>
8398:                 </div>
8399:                 {[
8400:                   'עד 5 אירועים', 'עד 600 מוזמנים לאירוע', 'עד 60 שולחנות', 'כל פיצ\'רי Pro', 'תמיכה עדיפותית',
8401:                 ].map((f, i) => (
8402:                   <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 13 }}>
8403:                     <span style={{ color: 'var(--emerald-500)' }}>✓</span><span>{f}</span>
8404:                   </div>
8405:                 ))}
8406:               </div>
8407: 
8408:               {/* Unified purchase button */}
8409:               <button className="btn btn-primary"
8410:                 style={{ width: '100%', marginTop: 20, padding: '14px 0', fontSize: 16 }}
8411:                 onClick={() => { openCheckout(selectedPlan); onClose(); }}>
8412:                 <Icon name="Zap" size={18} />
8413:                 {selectedPlan === 'pro' ? 'שדרגו ל-Pro — 99₪' : 'שדרגו ל-Enterprise — 249₪'}
8414:               </button>
8415: 
8416:               {/* Current plan indicator */}
8417:               {plan !== 'free' && (
8418:                 <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--text-secondary)', padding: '6px 0', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
8419:                   ✓ התוכנית הנוכחית שלכם: <strong>{plan === 'pro' ? 'Pro' : 'Enterprise'}</strong>
8420:                 </div>
8421:               )}
8422: 
8423:               <button className="btn btn-ghost" style={{ width: '100%', marginTop: 12 }} onClick={onClose}>אחר כך</button>
8424:               <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>
8425:                 💳 תשלום מאובטח דרך Lemon Squeezy · ללא חיוב חוזר
8426:               </div>
8427:             </div>
8428:           </div>
8429:         </div>
8430:       );
8431:     }
8432: 
8433:     // ============================================
8434:     // Phase 6 — Updated App with all features
8435:     // ============================================
8436:     function App() {
8437:       const { isConfigured, saveConfig, user, loading, client } = useContext(SupabaseContext);
8438:       const [currentRoute, setCurrentRoute] = useState(ROUTES.EVENTS);
8439:       const [selectedEvent, setSelectedEvent] = useState(null);
8440:       const [showOnboarding, setShowOnboarding] = useState(false);
8441:       const [passwordRecovery, setPasswordRecovery] = useState(false);
8442: 
8443:       // Persist current route so returning from WhatsApp keeps the same screen
8444:       useEffect(() => {
8445:         try { sessionStorage.setItem('seatsync-current-route', currentRoute); } catch {}
8446:       }, [currentRoute]);
8447: 
8448:       // Detect PASSWORD_RECOVERY event to show password update screen
8449:       useEffect(() => {
8450:         if (!client) return;
8451:         const { data: { subscription } } = client.auth.onAuthStateChange((event) => {
8452:           if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
8453:           if (event === 'USER_UPDATED')      setPasswordRecovery(false);
8454:         });
8455:         return () => subscription.unsubscribe();
8456:       }, [client]);
8457: 
8458:       // Restore selected event from localStorage
8459:       useEffect(() => {
8460:         const savedEventId = localStorage.getItem('seatsync-selected-event');
8461:         if (savedEventId && isConfigured && user && client) {
8462:           client.from('events').select('*').eq('id', savedEventId).eq('user_id', user.id).single()
8463:             .then(({ data }) => {
8464:               if (data) {
8465:                 setSelectedEvent(data);
8466:                 // Restore last route (e.g. messages send screen) instead of always going to dashboard
8467:                 const savedRoute = sessionStorage.getItem('seatsync-current-route');
8468:                 setCurrentRoute(savedRoute && Object.values(ROUTES).includes(savedRoute) ? savedRoute : ROUTES.DASHBOARD);
8469:               } else {
8470:                 // Event doesn't belong to this user or was deleted — clean up
8471:                 localStorage.removeItem('seatsync-selected-event');
8472:               }
8473:             });
8474:         }
8475:       }, [isConfigured, user, client]);
8476: 
8477:       // Check if first time
8478:       useEffect(() => {
8479:         const seen = localStorage.getItem('seatsync-onboarding-done');
8480:         if (!seen) setShowOnboarding(true);
8481:       }, []);
8482: 
8483:       const doneOnboarding = () => {
8484:         localStorage.setItem('seatsync-onboarding-done', '1');
8485:         setShowOnboarding(false);
8486:       };
8487: 
8488:       const handleSelectEvent = (event) => {
8489:         setSelectedEvent(event);
8490:         localStorage.setItem('seatsync-selected-event', event.id);
8491:         setCurrentRoute(ROUTES.DASHBOARD);
8492:       };
8493: 
8494:       const handleEventUpdate = (updatedEvent) => {
8495:         setSelectedEvent(updatedEvent);
8496:       };
8497: 
8498:       // Bug fix 2.1: clear selected event when deleted
8499:       const handleClearSelectedEvent = () => {
8500:         setSelectedEvent(null);
8501:         setCurrentRoute(ROUTES.EVENTS);
8502:       };
8503: 
8504:       // Keyboard shortcuts (desktop)
8505:       useEffect(() => {
8506:         const handler = (e) => {
8507:           const tag = document.activeElement?.tagName;
8508:           if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
8509:           if (!user) return;
8510: 
8511:           switch(e.key) {
8512:             case 'Escape': break;
8513:             case 'n': case 'N':
8514:               if (currentRoute === ROUTES.GUESTS) {
8515:                 window.dispatchEvent(new CustomEvent('seatsync:add-guest'));
8516:               }
8517:               break;
8518:             case '1': setCurrentRoute(ROUTES.EVENTS); break;
8519:             case '2': if (selectedEvent) setCurrentRoute(ROUTES.DASHBOARD); break;
8520:             case '3': if (selectedEvent) setCurrentRoute(ROUTES.GUESTS); break;
8521:             case '4': if (selectedEvent) setCurrentRoute(ROUTES.MESSAGES); break;
8522:             case '5': if (selectedEvent) setCurrentRoute(ROUTES.SEATING); break;
8523:             case '6': if (selectedEvent) setCurrentRoute(ROUTES.EXPENSES); break;
8524:             case '7': if (selectedEvent) setCurrentRoute(ROUTES.GIFTS); break;
8525:             case 's': case 'S':
8526:               if (e.ctrlKey || e.metaKey) {
8527:                 e.preventDefault();
8528:                 window.dispatchEvent(new CustomEvent('seatsync:save-settings'));
8529:               }
8530:               break;
8531:             default: break;
8532:           }
8533:         };
8534:         window.addEventListener('keydown', handler);
8535: 
8536:         // Navigate to settings from anywhere (e.g. invitation upload warning)
8537:         const goSettings = () => setCurrentRoute(ROUTES.SETTINGS);
8538:         window.addEventListener('seatsync:go-settings', goSettings);
8539: 
8540:         return () => {
8541:           window.removeEventListener('keydown', handler);
8542:           window.removeEventListener('seatsync:go-settings', goSettings);
8543:         };
8544:       }, [user, currentRoute, selectedEvent]);
8545: 
8546:       // Dismiss static HTML splash — wait at least 2.5s so animations complete
8547:       const splashMinTime = useRef(Date.now());
8548:       useEffect(() => {
8549:         if (!loading) {
8550:           const elapsed = Date.now() - splashMinTime.current;
8551:           const delay = Math.max(0, 2500 - elapsed);
8552:           const timer = setTimeout(() => window.__dismissSplash?.(), delay);
8553:           return () => clearTimeout(timer);
8554:         }
8555:       }, [loading]);
8556: 
8557:       if (!isConfigured) return <ConfigModal onSave={saveConfig} />;
8558: 
8559:       if (loading) return null; // Static HTML splash is already visible
8560: 
8561:       if (!user) return <AuthPage />;
8562: 
8563:       // Password reset link clicked → show update password screen
8564:       if (passwordRecovery) return <PasswordUpdatePage onDone={() => setPasswordRecovery(false)} />;
8565: 
8566:       const NAV_ITEMS = [
8567:         { id: ROUTES.EVENTS,    icon: 'CalendarDays',    label: 'אירועים' },
8568:         { id: ROUTES.DASHBOARD, icon: 'LayoutDashboard', label: 'דשבורד' },
8569:         { id: ROUTES.GUESTS,    icon: 'Users',           label: 'מוזמנים' },
8570:         { id: ROUTES.MESSAGES,  icon: 'Send',            label: 'הודעות' },
8571:         { id: ROUTES.SEATING,   icon: 'Armchair',        label: 'הושבה' },
8572:         { id: ROUTES.EXPENSES,  icon: 'Receipt',         label: 'הוצאות' },
8573:         { id: ROUTES.GIFTS,     icon: 'Gift',            label: 'מתנות' },
8574:         { id: ROUTES.SETTINGS,  icon: 'Settings',        label: 'הגדרות' },
8575:       ];
8576: 
8577:       const renderPage = () => {
8578:         switch (currentRoute) {
8579:           case ROUTES.EVENTS:
8580:             return <EventsPage onSelectEvent={handleSelectEvent} selectedEventId={selectedEvent?.id} onClearSelectedEvent={handleClearSelectedEvent} />;
8581:           case ROUTES.DASHBOARD:
8582:             return <DashboardPage event={selectedEvent} onGoToGuests={() => setCurrentRoute(ROUTES.GUESTS)} />;
8583:           case ROUTES.GUESTS:
8584:             return <GuestsPage event={selectedEvent} />;
8585:           case ROUTES.MESSAGES:
8586:             return <MessagesPage event={selectedEvent} />;
8587:           case ROUTES.SEATING:
8588:             return <SeatingPage event={selectedEvent} />;
8589:           case ROUTES.EXPENSES:
8590:             return <ExpensesPage event={selectedEvent} />;
8591:           case ROUTES.GIFTS:
8592:             return <GiftsPage event={selectedEvent} />;
8593:           case ROUTES.SETTINGS:
8594:             return <SettingsPage event={selectedEvent} onEventUpdate={handleEventUpdate} />;
8595:           default:
8596:             return <DashboardPage event={selectedEvent} />;
8597:         }
8598:       };
8599: 
8600:       const { showUpgradeModal, setShowUpgradeModal } = useContext(PlanContext);
8601: 
8602:       return (
8603:         <ErrorBoundary>
8604:           <OfflineBanner />
8605:           <PaymentSuccessBanner />
8606:           <PWAInstallBanner />
8607:           {showOnboarding && user && <OnboardingModal onDone={doneOnboarding} />}
8608:           {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}
8609:           <TopBar event={selectedEvent} onSettings={() => setCurrentRoute(ROUTES.SETTINGS)} currentRoute={currentRoute} onNavigate={setCurrentRoute} />
8610:           <main className="main-content">
8611:             <ErrorBoundary key={currentRoute}>
8612:               {renderPage()}
8613:             </ErrorBoundary>
8614:           </main>
8615:           <BottomNav currentRoute={currentRoute} onNavigate={setCurrentRoute} items={NAV_ITEMS} />
8616:         </ErrorBoundary>
8617:       );
8618:     }
8619: 
8620:     // ============================================
8621:     // Root Render
8622:     // ============================================
8623:     function Root() {
8624:       return (
8625:         <ThemeProvider>
8626:           <PWAInstallProvider>
8627:             <SupabaseProvider>
8628:               <PlanProvider>
8629:                 <ToastProvider>
8630:                   <App />
8631:                 </ToastProvider>
8632:               </PlanProvider>
8633:             </SupabaseProvider>
8634:           </PWAInstallProvider>
8635:         </ThemeProvider>
8636:       );
8637:     }
8638: 
8639:     // Hide static splash screen
8640:     window.__dismissSplash = function() {
8641:       document.documentElement.classList.add('app-ready');
8642:       var el = document.getElementById('static-splash');
8643:       if (el) {
8644:         el.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-out';
8645:         el.style.transform = 'translateY(-100%)';
8646:         el.style.opacity = '0';
8647:         setTimeout(function(){ el.remove(); }, 500);
8648:       }
8649:     };
8650: 
8651:     ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
8652:   