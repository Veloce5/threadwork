import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  CircleHelp, Luggage, Plus, RefreshCw, Shirt, Sparkles, Trash2, X } from 'lucide-react';
import { api } from './api';
import type { Occasion, OutfitRecord, PlanSlot, PlannedLook, PackingResult, Season } from './api';
import './planner.css';

const slots:PlanSlot[]=['MORNING','AFTERNOON','EVENING'];
const occasions:Occasion[]=['EVERYDAY','WORK','FORMAL','ACTIVE','OTHER'];
const seasons:Season[]=['ALL_SEASONS','SPRING','SUMMER','AUTUMN','WINTER'];
const today=()=>{
  const d=new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
};
const addDays=(date:string,offset:number)=>{
  const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+offset);
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
};
const nice=(v:string)=>v==='ALL_SEASONS'?'Any season':v.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
const showDate=(date:string)=>new Date(date+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
const picture=(url:string|null,name:string)=>
  <span className="op-thumb">{url?<img src={url} alt={name} loading="lazy"/>:<Shirt size={22}/>}</span>;
export function OutfitPlanner({onGoOutfits,onGoLaundry}:{
  onGoOutfits:()=>void;onGoLaundry:()=>void;
}){
  const [week,setWeek]=useState(today);
  const [plans,setPlans]=useState<PlannedLook[]>([]);
  const [outfits,setOutfits]=useState<OutfitRecord[]>([]);
  const [planDate,setPlanDate]=useState(today);
  const [slot,setSlot]=useState<PlanSlot>('MORNING');
  const [outfitId,setOutfitId]=useState('');
  const [days,setDays]=useState(3);
  const [activities,setActivities]=useState<Occasion[]>(['EVERYDAY','EVERYDAY','EVERYDAY']);
  const [season,setSeason]=useState<Season>('ALL_SEASONS');
  const [layer,setLayer]=useState(false);
  const [packing,setPacking]=useState<PackingResult|null>(null);
  const [busy,setBusy]=useState(false);
  const [calculating,setCalculating]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const end=addDays(week,13);
  const refresh=useCallback(async()=>{
    try{
      const [calendar,looks]=await Promise.all([api.calendar(week,addDays(week,13)),api.outfits()]);
      setPlans(calendar);setOutfits(looks);setError('');
    }catch(e){setError((e as Error).message);}
    finally{setLoading(false);}
  },[week]);
  useEffect(()=>{void refresh()},[refresh]);
  const daysToShow=useMemo(()=>Array.from({length:14},(_,i)=>addDays(week,i)),[week]);
  const allWarnings=plans.filter(p=>!p.usableNow).length;
  function changeDays(value:number) {
    const next=Math.min(14,Math.max(1,value));setDays(next);
    setActivities(old=>Array.from({length:next},(_,i)=>old[i]||'EVERYDAY'));
    setPacking(null);
  }
  async function assign(){
    if(!outfitId)return;
    try{setBusy(true);setError('');
      const saved=await api.assignOutfit(planDate,slot,Number(outfitId));
      await refresh();
      setNotice(saved.warnings.length?'Outfit scheduled with an availability or reuse caution.':'Outfit saved to your calendar.');
    }catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  }
  async function remove(id:number){
    try{setBusy(true);setError('');await api.deleteAssignment(id);await refresh();setNotice('Calendar assignment removed.');}
    catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  }
  async function optimize(){
    try{setCalculating(true);setError('');setPacking(null);
      const result=await api.packing({occasions:activities,season,requireLayer:layer});
      setPacking(result);
    }catch(e){setError((e as Error).message);}
    finally{setCalculating(false);}
  }
  return <section className="op-root">
    <div className="page-heading">
      <div><div className="overline"><span className="gold-line"/> WARDROBE OPERATIONS · PHASE 7</div>
        <h1>Outfit planner<span>.</span></h1>
        <p>Arrange saved looks across your week, then pack fewer pieces for your next trip.</p>
      </div>
      <span className="op-version"><CalendarDays size={16}/> Calendar + Packing</span>
    </div>
    {error&&<div className="op-message op-error" role="alert"><AlertCircle size={17}/><span>{error}</span><button aria-label="Dismiss" onClick={()=>setError('')}><X size={15}/></button></div>}
    {notice&&<div className="op-message op-success" role="status"><CheckCircle2 size={17}/><span>{notice}</span><button aria-label="Dismiss" onClick={()=>setNotice('')}><X size={15}/></button></div>}
    <div className="op-section-title"><span className="overline">01 / THE OUTFIT CALENDAR</span><h2>Plan your next looks</h2>
      <p>Pick a saved outfit for a morning, afternoon or evening. Shared garments and current laundry status generate alerts.</p></div>
    <div className="op-planning-layout">
      <div className="op-panel">
        <div className="op-panel-title"><h3>Schedule an outfit</h3><span>One saved look per date and time slot</span></div>
        <label className="op-field">Date<input type="date" value={planDate} onChange={e=>setPlanDate(e.target.value)} min={addDays(today(),-365)} max={addDays(today(),730)}/></label>
        <label className="op-field">Time slot<select value={slot} onChange={e=>setSlot(e.target.value as PlanSlot)}>
          {slots.map(s=><option key={s} value={s}>{nice(s)}</option>)}</select></label>
        <label className="op-field">Saved outfit<select value={outfitId} onChange={e=>setOutfitId(e.target.value)}>
          <option value="">Choose a look</option>
          {outfits.map(o=><option value={o.id} key={o.id}>{o.name} · {o.garmentIds.length} pieces</option>)}
        </select></label>
        <button className="op-primary" disabled={!outfitId||busy||!planDate} onClick={()=>void assign()}>
          <Plus size={17}/>{busy?'Saving…':'Add to calendar'}
        </button>
        {outfits.length===0?<p className="op-tip">No saved looks yet. <button onClick={onGoOutfits}>Build an outfit</button> first.</p>:
          <p className="op-tip">Scheduling the same date and slot again replaces that assignment. Your saved outfits remain unchanged.</p>}
        <button className="op-text" onClick={onGoOutfits}>Open Outfit Studio <ChevronRight size={15}/></button>
      </div>
      <div className="op-panel op-calendar">
        <div className="op-calendar-header">
          <div><span className="overline">TWO-WEEK VIEW</span><h3>{showDate(week)} – {showDate(end)}</h3></div>
          <div className="op-calendar-nav"><button onClick={()=>setWeek(w=>addDays(w,-14))} aria-label="Previous 14 days"><ChevronLeft size={17}/></button>
            <button onClick={()=>{setWeek(today());setPlanDate(today())}}>Today</button>
            <button onClick={()=>setWeek(w=>addDays(w,14))} aria-label="Next 14 days"><ChevronRight size={17}/></button>
            <button onClick={()=>void refresh()} aria-label="Refresh calendar"><RefreshCw size={17}/></button></div>
        </div>
        {allWarnings>0&&<div className="op-caution"><AlertCircle size={15}/>{allWarnings} scheduled look{allWarnings===1?' has':'s have'} current availability or reuse warnings. This does not predict whether clothing will be ready on the planned date.</div>}
        {loading?<p className="op-empty">Loading your calendar…</p>:
          <div className="op-days">{daysToShow.map(date=>{
            const assigned=plans.filter(p=>p.date===date);
            return <article key={date} className={'op-day '+(date===today()?'today':'')}>
              <div className="op-day-date"><strong>{showDate(date)}</strong>{date===today()&&<small>Today</small>}</div>
              <div className="op-day-plans">{assigned.length===0?<span className="op-not-planned">Not planned</span>:
                assigned.map(p=><div key={p.id} className={'op-entry '+(!p.usableNow?'caution':'')}>
                  <div className="op-entry-head"><small>{nice(p.slot)}</small>
                    <button disabled={busy} onClick={()=>void remove(p.id)} title="Remove assignment" aria-label={'Remove '+p.outfitName}><Trash2 size={14}/></button></div>
                  <strong>{p.outfitName}</strong>
                  <div className="op-entry-pieces">{p.garments.slice(0,4).map(g=>picture(g.imageUrl,g.name))}</div>
                  {p.warnings.map((w,i)=><p className="op-entry-warning" key={i}><AlertCircle size={13}/>{w}</p>)}
                </div>)}</div>
            </article>})}</div>}
      </div>
    </div>
    <div className="op-section-title op-spaced"><span className="overline">02 / THE TRAVEL CAPSULE</span><h2>Pack smarter, not heavier</h2>
      <p>Choose activities for each trip day. Java searches for a compact set of available garments that can cover them.</p></div>
    <div className="op-planning-layout">
      <div className="op-panel">
        <div className="op-panel-title"><h3>Trip requirements</h3><span>Up to 14 days · one outfit per day</span></div>
        <label className="op-field">Trip length (days)
          <input type="number" min={1} max={14} value={days} onChange={e=>changeDays(Number(e.target.value)||1)}/>
        </label>
        <label className="op-field">Season preference
          <select value={season} onChange={e=>setSeason(e.target.value as Season)}>{seasons.map(s=><option key={s} value={s}>{nice(s)}</option>)}</select>
        </label>
        <label className="op-checkbox"><input type="checkbox" checked={layer} onChange={e=>setLayer(e.target.checked)}/>
          <span>Require a jacket or coat every day</span></label>
        <div className="op-activities"><strong>Planned activities</strong>{activities.map((a,i)=><label key={i}><span>Day {i+1}</span>
          <select value={a} onChange={e=>{setActivities(old=>old.map((v,j)=>j===i?e.target.value as Occasion:v));setPacking(null)}}>
            {occasions.map(o=><option key={o} value={o}>{nice(o)}</option>)}
          </select></label>)}</div>
        <button className="op-primary" disabled={calculating} onClick={()=>void optimize()}>
          <Luggage size={17}/>{calculating?'Optimizing…':'Generate packing list'}
        </button>
        <p className="op-tip">Packing is a reusable-outfit planning aid, not a prediction of what you'll wear or how often clothes will need washing.</p>
      </div>
      <div className="op-panel op-pack-results">
        <div className="op-panel-title"><h3>{packing?'Your packing proposal':'Your travel capsule'}</h3>
          <span>{packing&&!packing.blockers.length?packing.totalItems+' unique garments':'Calculated from your closet'}</span></div>
        {!packing?<div className="op-pack-placeholder"><Luggage size={34}/>
          <h3>Every trip starts with a plan.</h3><p>Set your duration and activities, then generate a compact packing checklist.</p></div>:
        packing.blockers.length?<div className="op-pack-placeholder"><AlertCircle size={30}/>
          <h3>Your wardrobe can't cover every day yet.</h3>
          {packing.blockers.map((w,i)=><p className="op-pack-blocker" key={i}>{w}</p>)}
          <button onClick={onGoLaundry}>Review laundry status</button></div>:
        <div className="op-packed">
          <div className="op-pack-summary"><Luggage size={20}/><span><strong>{packing.totalItems} unique pieces</strong><small>for {packing.days.length} planned days</small></span></div>
          <div className="op-pack-list"><h4>Pack these garments</h4>
            {packing.packedItems.map(g=><div className="op-packed-piece" key={g.id}>{picture(g.imageUrl,g.name)}
              <span><strong>{g.name}</strong><small>{nice(g.category)}</small></span>
              <input type="checkbox" aria-label={'Packed '+g.name} title="Local checklist, not stored"/>
            </div>)}</div>
          <div className="op-day-outfits"><h4>Outfits by day</h4>{packing.days.map(d=><div key={d.day}>
            <strong>Day {d.day} · {nice(d.occasion)}</strong>
            <span>{d.garments.map(g=>g.name).join(' + ')}</span>
          </div>)}</div>
        </div>}
        {packing&&<div className="op-assumptions"><div><CircleHelp size={16}/><strong>What this plan assumes</strong></div>
          {packing.assumptions.map((s,i)=><p key={i}>{s}</p>)}</div>}
      </div>
    </div>
    <p className="op-disclaimer"><Sparkles size={13}/> Calendar entries are persistent. The packing result is a preview and its checkboxes stay local to this page; no clothes are marked worn or washed automatically.</p>
  </section>;
}
