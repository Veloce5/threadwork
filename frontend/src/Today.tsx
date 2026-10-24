import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, Check, ChevronRight, Clock3, Leaf, Plus, RefreshCw, Shirt, Shuffle, Sparkles, WashingMachine } from 'lucide-react';
import { api } from './api';
import type { Garment, GarmentStatus, Occasion, PlannedLook, RecommendationPack, Season, Summary, WearAnalyticsData } from './api';

type Page = 'closet' | 'outfits' | 'recommendations' | 'laundry' | 'planner' | 'analytics';
type Props = {
  items: Garment[]; summary: Summary | null; loading: boolean; busy: boolean;
  onChanged: () => Promise<void>; onNotice: (t: string) => void; onError: (t: string) => void;
  onAdd: () => void; onSeed: () => void; onDetail: (g: Garment) => void; go: (page: Page) => void;
};
const OCCASIONS: Occasion[] = ['EVERYDAY', 'WORK', 'FORMAL', 'ACTIVE'];
const SLOTS = ['MORNING', 'AFTERNOON', 'EVENING'];
const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replaceAll('_', ' ');
const localDate = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const seasonNow = (): Season => { const m = new Date().getMonth(); return m < 2 || m === 11 ? 'WINTER' : m < 5 ? 'SPRING' : m < 8 ? 'SUMMER' : 'AUTUMN'; };
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

function Piece({ garment, onClick }: { garment: Garment; onClick: () => void }) {
  return <button className="tw-piece" type="button" onClick={onClick} aria-label={`View ${garment.name}`}>
    <span className="tw-piece-art" style={{ background: garment.color || '#e4e6e1' }}>
      {garment.imageUrl ? <img src={garment.imageUrl} alt="" loading="lazy" /> : <Shirt size={35} strokeWidth={1.1} aria-hidden="true" />}
    </span>
    <span className="tw-piece-name">{garment.name}</span>
    <span className="tw-piece-category">{label(garment.category)}</span>
  </button>;
}

export function Today(p: Props) {
  const [occasion, setOccasion] = useState<Occasion>('EVERYDAY');
  const [recommendations, setRecommendations] = useState<RecommendationPack | null>(null);
  const [index, setIndex] = useState(0);
  const [planned, setPlanned] = useState<PlannedLook[]>([]);
  const [activePlan, setActivePlan] = useState<number | null>(null);
  const [suggestInstead, setSuggestInstead] = useState(false);
  const [stats, setStats] = useState<WearAnalyticsData | null>(null);
  const [working, setWorking] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [loadingToday, setLoadingToday] = useState(true);
  const requestId = useRef(0);
  const season = useMemo(seasonNow, []);
  const today = localDate();

  const refresh = useCallback(async () => {
    const request = ++requestId.current;
    setLoadingToday(true);
    try {
      const [r, c, a] = await Promise.all([api.recommendations(occasion, season, false), api.calendar(today, today), api.wearAnalytics()]);
      if (request !== requestId.current) return;
      const sorted = [...c].sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));
      setRecommendations(r);
      setPlanned(sorted);
      setStats(a);
      setActivePlan(previous => sorted.some(x => x.id === previous) ? previous : (sorted[0]?.id ?? null));
      setIndex(0);
    } catch (e) {
      if (request === requestId.current) p.onError((e as Error).message);
    } finally {
      if (request === requestId.current) setLoadingToday(false);
    }
  // onError is a React setter; identity is stable. Refresh explicitly after actions as well.
  }, [occasion, season, today, p.onError]);
  useEffect(() => { void refresh(); return () => { requestId.current++; }; }, [refresh]);

  const act = async (job: () => Promise<unknown>, success: string) => {
    if (working) return;
    setWorking(true);
    try { await job(); await p.onChanged(); await refresh(); p.onNotice(success); }
    catch (e) {
      const message = (e as Error).message;
      try { await p.onChanged(); await refresh(); } catch { /* Preserve the original action error. */ }
      p.onError(message);
    }
    finally { setWorking(false); setBusyAction(''); }
  };

  const plannedLook = planned.find(x => x.id === activePlan) ?? planned[0];
  const usingPlan = !suggestInstead && !!plannedLook;
  const candidate = recommendations?.suggestions[index];
  const shown = usingPlan ? plannedLook.garments : candidate?.garments ?? [];
  const title = usingPlan ? plannedLook.outfitName : candidate?.title ?? 'Your next great outfit';
  const reasons = usingPlan
    ? `Saved for ${label(plannedLook.slot)}. ${plannedLook.usableNow ? 'Every piece is currently ready.' : 'Some pieces need attention.'}`
    : candidate?.reasons.slice(0, 2).join(' · ') ?? 'Set up a complete outfit to see a recommendation.';
  const worn = p.items.filter(x => x.status === 'WORN');
  const laundry = p.items.filter(x => x.status === 'LAUNDRY');
  const drying = p.items.filter(x => x.status === 'DRYING');
  const forgotten = (stats?.items ?? []).filter(x => x.wearCount === 0 && x.status === 'AVAILABLE').slice(0, 4);
  const readyPercent = p.summary?.totalItems ? Math.round(100 * (p.summary.availableItems / p.summary.totalItems)) : 0;
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const logToday = () => {
    if (!window.confirm('Log this outfit as worn today? This creates a permanent wear record and moves ready pieces to Worn.')) return;
    if (usingPlan) {
      void act(() => api.logWear({ wornOn: today, outfitId: plannedLook.outfitId, notes: '' }), 'Wear recorded for today.');
    } else if (candidate) {
      void act(() => api.logWear({ wornOn: today, garmentIds: candidate.garmentIds, notes: 'Selected on Today' }), 'Wear recorded for today.');
    }
  };

  const moveAll = (items: Garment[], to: GarmentStatus, action: string) => {
    if (!items.length || working) return;
    if (!window.confirm(`${action} for all ${items.length} pieces? This will update each garment’s status and history.`)) return;
    void act(async () => {
      setBusyAction(action);
      let completed = 0;
      for (const item of items) {
        try { await api.laundryTransition(item.id, to); completed++; }
        catch (e) { throw new Error(`${completed} of ${items.length} updated. ${item.name}: ${(e as Error).message}. Check Laundry Center before retrying.`); }
      }
    }, `${items.length} ${items.length === 1 ? 'piece' : 'pieces'} updated.`);
  };

  if (!p.loading && p.items.length === 0) return <section className="tw-empty">
    <div className="tw-empty-icon"><Shirt size={36} strokeWidth={1.2} /></div>
    <span className="tw-kicker">YOUR PERSONAL WARDROBE OS</span>
    <h1>A little more intention.<br /><em>A lot less guessing.</em></h1>
    <p>Add the pieces you actually wear to unlock daily outfits, thoughtful planning and a wardrobe that gets better with use.</p>
    <div><button className="button-dark" onClick={p.onAdd}><Plus size={17} />Add your first piece</button>
      <button className="button-outline" disabled={p.busy} onClick={p.onSeed}>Explore with demo pieces <ArrowRight size={16} /></button></div>
  </section>;

  return <div className="tw-today">
    <header className="tw-hello"><div><span className="tw-kicker"><Leaf size={13} /> {dateLabel} · Your daily edit</span>
      <h1>{greeting()}<span className="tw-period">.</span></h1>
      <p>{p.summary ? `${p.summary.availableItems} of ${p.summary.totalItems} pieces ready for whatever today brings.` : 'Getting your wardrobe ready…'}</p></div>
      <button className="button-outline tw-hello-add" type="button" onClick={p.onAdd}><Plus size={17} /> Add a piece</button>
    </header>

    <section className="tw-hero" aria-label="Your daily outfit">
      <div className="tw-hero-top"><span className="tw-hero-eyebrow"><Sparkles size={14} /> THE DAILY EDIT</span>
        <button className="tw-hero-planner" type="button" onClick={() => p.go('planner')}><CalendarDays size={15} /> Open calendar <ArrowRight size={14} /></button>
      </div>
      {planned.length > 0 && <div className="tw-plan-switch" aria-label="Outfit source">
        {planned.map(x => <button key={x.id} className={usingPlan && plannedLook.id === x.id ? 'active' : ''}
          type="button" onClick={() => { setSuggestInstead(false); setActivePlan(x.id); }}>
          <Clock3 size={13} /> {label(x.slot)} {x.usableNow ? '' : '· Needs care'}
        </button>)}
        <button className={suggestInstead ? 'active' : ''} type="button" onClick={() => setSuggestInstead(true)}><Shuffle size={13} /> Explore alternatives</button>
      </div>}
      <div className="tw-hero-layout">
        <div className="tw-hero-copy"><span className="tw-hero-num">01 / YOUR LOOK</span><h2>{loadingToday && !recommendations && !planned.length ? 'Finding your look…' : title}</h2>
          <p className="tw-hero-description">{reasons}</p>
          {!usingPlan && <div className="tw-chips" role="group" aria-label="Choose your occasion">{OCCASIONS.map(o =>
            <button type="button" key={o} aria-pressed={o === occasion} className={o === occasion ? 'on' : ''} onClick={() => setOccasion(o)}>{label(o)}</button>)}</div>}
          {!usingPlan && <p className="tw-disclaimer">Suggestions use your wardrobe labels and current availability — not live weather.</p>}
          {usingPlan && plannedLook.warnings.map(w => <p key={w} className="tw-warn" role="status">{w}</p>)}
          {shown.length > 0 && <div className="tw-actions"><button className="tw-wear-btn" type="button" disabled={working || p.busy || loadingToday || (usingPlan && !plannedLook.usableNow)} onClick={logToday}><Check size={16} />{working ? 'Saving…' : 'Wear this today'}</button>
            {!usingPlan && (recommendations?.suggestions.length ?? 0) > 1 && <button className="tw-next-btn" type="button" disabled={working || loadingToday} onClick={() => setIndex(i => (i + 1) % (recommendations?.suggestions.length ?? 1))}><Shuffle size={15} /> Another option</button>}
            {!usingPlan && <button className="tw-light-link" type="button" onClick={() => p.go('recommendations')}>Fine-tune looks <ChevronRight size={14} /></button>}
          </div>}
        </div>
        <div className="tw-hero-items">
          {shown.length ? <div className="tw-piece-grid">{shown.map(g => <Piece key={g.id} garment={g} onClick={() => p.onDetail(g)} />)}</div>
            : <div className="tw-no-outfit"><Shirt size={32} strokeWidth={1.2} /><strong>No complete ready-to-wear look yet</strong>
              <p>{recommendations?.blockers[0] ?? 'Add a top, bottom and shoes or explore your saved looks.'}</p>
              <button type="button" onClick={() => p.go('closet')}>Explore closet <ArrowRight size={14} /></button></div>}
        </div>
      </div>
    </section>

    <div className="tw-section-head"><div><span className="tw-kicker">A LITTLE WARDROBE MAINTENANCE</span><h2>Beyond today's outfit</h2></div><span>Small habits, better wardrobe.</span></div>
    <div className="tw-cols">
      <section className="tw-card"><header><span className="tw-card-icon"><WashingMachine size={18} /></span><div><span className="tw-card-label">01 / CARE</span><h3>Keep the rotation going</h3></div></header>
        <div className="tw-queue" aria-label="Laundry status queue">
          {([{data:worn,title:'Worn',action:'Send to laundry',to:'LAUNDRY'},
            {data:laundry,title:'In laundry',action:'Start drying',to:'DRYING'},
            {data:drying,title:'Drying',action:'Mark ready',to:'AVAILABLE'}] as const).map(x =>
            <div key={x.title} className="tw-queue-row"><div><b>{x.data.length}</b><span>{x.title}</span></div>
              <button type="button" disabled={!x.data.length || working || p.busy} onClick={() => moveAll(x.data, x.to, x.action)}>{working && busyAction === x.action ? 'Updating…' : x.action} <ArrowRight size={13} /></button></div>)}
        </div><button className="tw-card-link" type="button" onClick={() => p.go('laundry')}>Manage care <ArrowRight size={15} /></button>
      </section>

      <section className="tw-card"><header><span className="tw-card-icon"><Shirt size={18} /></span><div><span className="tw-card-label">02 / REDISCOVER</span><h3>Give these a turn</h3></div></header>
        {forgotten.length ? <div className="tw-forgotten">{forgotten.map(x => { const garment = p.items.find(g => g.id === x.garmentId); return <button type="button" key={x.garmentId} onClick={() => garment && p.onDetail(garment)}>
          <span className="tw-swatch" style={{ background: garment?.color ?? '#9d9d9d' }} /><span>{x.name}</span><small>Not logged yet</small><ChevronRight size={13} /></button>; })}</div>
          : <p className="tw-empty-card">No unworn available pieces in your wear journal. Add something new or explore your wardrobe.</p>}
        <button className="tw-card-link" type="button" onClick={() => p.go('analytics')}>Explore wear analytics <ArrowRight size={15} /></button>
      </section>

      <section className="tw-card"><header><span className="tw-card-icon"><RefreshCw size={18} /></span><div><span className="tw-card-label">03 / YOUR WARDROBE</span><h3>At a glance</h3></div></header>
        <div className="tw-pulse"><div><strong>{p.summary?.totalWears ?? '—'}</strong><span>Recorded garment wears</span></div>
          <div><strong>{p.summary?.savedOutfits ?? '—'}</strong><span>Saved looks</span></div>
          <div><strong>{stats?.neverLoggedPieces ?? '—'}</strong><span>Never logged pieces</span></div></div>
        <div className="tw-ready"><div><span>Ready-to-wear share</span><b>{readyPercent}%</b></div><div className="tw-ready-track" role="progressbar" aria-label="Wardrobe ready-to-wear percentage" aria-valuenow={readyPercent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${readyPercent}%` }} /></div></div>
        <button className="tw-card-link" type="button" onClick={() => p.go('outfits')}>Build a saved outfit <ArrowRight size={15} /></button>
      </section>
    </div>
  </div>;
}
