import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, CalendarDays, Check,
  ChevronDown, CircleHelp, CirclePlus, Clock3,
  Footprints, Heart, LayoutDashboard, Menu, MoreHorizontal,
  PackageCheck, Palette, Plus, Search, Shirt, Sparkles, Tag, Trash2,
  WashingMachine, X, SlidersHorizontal, Layers3, Pencil, RefreshCw, ImagePlus, Calendar
} from 'lucide-react';
import { api } from './api';
import { OutfitStudio } from './OutfitStudio';
import type { Category, Garment, GarmentInput, GarmentStatus, Summary, Season, Occasion } from './api';

type Page = 'dashboard'|'closet'|'outfits'|'laundry'|'analytics'|'planner';
const categories: { value: Category | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All pieces' }, { value: 'TOPS', label: 'Tops' },
  { value: 'BOTTOMS', label: 'Bottoms' }, { value: 'OUTERWEAR', label: 'Outerwear' },
  { value: 'DRESSES', label: 'Dresses' }, { value: 'FOOTWEAR', label: 'Footwear' },
  { value: 'ACCESSORIES', label: 'Accessories' }
];
const statuses: GarmentStatus[] = ['AVAILABLE','WORN','LAUNDRY','DRYING','REPAIR'];
const seasons: Season[] = ['ALL_SEASONS','SPRING','SUMMER','AUTUMN','WINTER'];
const occasions: Occasion[] = ['EVERYDAY','WORK','FORMAL','ACTIVE','OTHER'];
type SortOrder = 'NEWEST'|'NAME'|'PRICE_ASC'|'PRICE_DESC';
const seasonLabel = (s:string) => s==='ALL_SEASONS'?'Year-round':titleCase(s);
const money = (n: number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);
const titleCase = (x: string) => x.toLowerCase().replace(/\b\w/g, c=>c.toUpperCase());
const freshForm = (): GarmentInput => ({ name:'',category:'TOPS',brand:'',color:'#8DA5A0',purchasePrice:0,purchasedOn:'',notes:'',season:'ALL_SEASONS',occasion:'EVERYDAY' });

function ClothArt({ garment, large=false }: {garment: Pick<Garment,'name'|'category'|'color'>, large?:boolean}) {
  const Icon = garment.category === 'FOOTWEAR' ? Footprints : garment.category === 'ACCESSORIES' ? Tag : garment.category === 'BOTTOMS' ? Layers3 : garment.category === 'DRESSES' ? Heart : Shirt;
  return <div className={'cloth-art '+(large?'large':'')} style={{'--garment-color':garment.color} as CSSProperties}>
    <div className="cloth-orbit circle-one"/><div className="cloth-orbit circle-two"/>
    <div className="art-halo"/>
    <Icon size={large?93:68} strokeWidth={1.05} className="cloth-icon" aria-hidden="true" />
    <span className="art-label">{garment.category === 'OUTERWEAR'?'LAYERED': garment.category === 'FOOTWEAR'?'FOOTWEAR':'THE EDIT'}</span>
  </div>;
}
function Toast({text,onClose}:{text:string,onClose:()=>void}){
  if(!text)return null;
  return <div className="toast" role="status"><span>{text}</span><button onClick={onClose} aria-label="Dismiss"><X size={16}/></button></div>;
}
function Modal({onClose,children}:{onClose:()=>void,children:ReactNode}){
  useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[onClose]);
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="modal" role="dialog" aria-modal="true" aria-label="Garment form">{children}</section></div>;
}
function GarmentForm({initial,save,onClose,busy}:{initial?:Garment,save:(data:GarmentInput,photo:File|null)=>Promise<void>,onClose:()=>void,busy:boolean}){
  const [form,setForm]=useState<GarmentInput>(()=>initial?{
    name:initial.name,category:initial.category,brand:initial.brand,color:initial.color,
    purchasePrice:initial.purchasePrice,purchasedOn:initial.purchasedOn||'',notes:initial.notes,
    season:initial.season||'ALL_SEASONS',occasion:initial.occasion||'EVERYDAY'
  }:freshForm());
  const [photo,setPhoto]=useState<File|null>(null);
  const [photoError,setPhotoError]=useState('');
  const update=<K extends keyof GarmentInput>(key:K,value:GarmentInput[K])=>setForm(f=>({...f,[key]:value}));
  const selectPhoto=(file?:File)=>{
    setPhotoError('');setPhoto(null);
    if(!file)return;
    if(!['image/png','image/jpeg'].includes(file.type)){setPhotoError('Use a PNG or JPEG image.');return;}
    if(file.size>4*1024*1024){setPhotoError('Maximum photo size is 4 MB.');return;}
    setPhoto(file);
  };
  const submit=(e:FormEvent)=>{e.preventDefault();void save({...form,name:form.name.trim(),brand:form.brand.trim(),notes:form.notes.trim(), purchasedOn:form.purchasedOn||null},photo);};
  return <form onSubmit={submit}>
    <header className="modal-header"><div><div className="overline">THE WARDROBE EDIT</div><h2>{initial?'Edit a piece':'Add something new'}</h2><p>Every great wardrobe starts with the details.</p></div><button className="icon-button" type="button" aria-label="Close" onClick={onClose}><X size={20}/></button></header>
    <div className="modal-grid">
      <div className="field full">
        <label htmlFor="photo">Photo of this item</label>
        <label className="photo-drop"><ImagePlus size={22}/><span>{photo?photo.name:initial?.imageUrl?'Replace existing photo':'Choose a PNG or JPEG'}</span><small>Maximum 4 MB · saved locally, not to GitHub</small><input id="photo" type="file" accept="image/png,image/jpeg" onChange={e=>selectPhoto(e.target.files?.[0])}/></label>
        {initial?.imageUrl&&!photo&&<img className="photo-small-preview" src={initial.imageUrl} alt={initial.name}/>}
        {photoError&&<span className="photo-error" role="alert">{photoError}</span>}
      </div>
      <div className="field full"><label htmlFor="name">Item name <b>*</b></label><input autoFocus required id="name" maxLength={100} placeholder="e.g. Cream linen shirt" value={form.name} onChange={e=>update('name',e.target.value)}/></div>
      <div className="field"><label htmlFor="category">Category</label><select id="category" value={form.category} onChange={e=>update('category',e.target.value as Category)}>{categories.filter(x=>x.value!=='ALL').map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></div>
      <div className="field"><label htmlFor="brand">Brand</label><input id="brand" maxLength={60} placeholder="Optional" value={form.brand} onChange={e=>update('brand',e.target.value)}/></div>
      <div className="field"><label htmlFor="price">Purchase price ($)</label><input id="price" type="number" step="0.01" min="0" max="9999999999" required value={form.purchasePrice} onChange={e=>update('purchasePrice',Number(e.target.value))}/></div>
      <div className="field"><label htmlFor="date">Purchased on</label><input id="date" type="date" max={new Date().toISOString().slice(0,10)} value={form.purchasedOn||''} onChange={e=>update('purchasedOn',e.target.value)}/></div>
      <div className="field"><label htmlFor="season">Season</label><select id="season" value={form.season} onChange={e=>update('season',e.target.value as Season)}>{seasons.map(s=><option key={s} value={s}>{seasonLabel(s)}</option>)}</select></div>
      <div className="field"><label htmlFor="occasion">Occasion</label><select id="occasion" value={form.occasion} onChange={e=>update('occasion',e.target.value as Occasion)}>{occasions.map(s=><option key={s} value={s}>{titleCase(s)}</option>)}</select></div>
      <div className="field full color-field"><label htmlFor="color">Primary color</label><div className="color-box"><input id="color" type="color" value={form.color} onChange={e=>update('color',e.target.value)}/><span>{form.color.toUpperCase()}</span><span className="muted small">Click to choose</span></div></div>
      <div className="field full"><label htmlFor="notes">Notes</label><textarea id="notes" rows={3} maxLength={500} placeholder="Material, fit, care notes..." value={form.notes} onChange={e=>update('notes',e.target.value)}/></div>
    </div>
    <footer className="modal-actions"><button className="button-outline" type="button" onClick={onClose}>Cancel</button><button type="submit" disabled={busy||!!photoError||!form.name.trim()} className="button-dark"><Check size={17}/>{busy?'Saving…':initial?'Save changes':'Add to closet'}</button></footer>
  </form>;
}
function GarmentCard({item,onEdit,onDetail,onRemove,onStatus,busy}:{item:Garment,onEdit:()=>void,onDetail:()=>void,onRemove:()=>void,onStatus:(status:GarmentStatus)=>void,busy:boolean}){
  const [showMenu,setShowMenu]=useState(false);
  return <article className="garment-card">
    <button type="button" className="garment-image" aria-label={`View ${item.name} details`} onClick={onDetail}>{item.imageUrl?<img className="garment-photo" src={item.imageUrl} alt={item.name} loading="lazy"/>:<ClothArt garment={item}/>}<span className={'availability '+item.status.toLowerCase()}>{item.status==='AVAILABLE'?'Ready to wear':titleCase(item.status)}</span></button>
    <div className="garment-body"><div className="garment-meta">{titleCase(item.category)} <span>·</span> {item.brand||'Unbranded'}</div>
      <div className="garment-name-row"><h3 title={item.name}>{item.name}</h3><div className="card-menu-wrap"><button aria-label={'Options for '+item.name} onClick={()=>setShowMenu(!showMenu)} className="bare-icon"><MoreHorizontal size={21}/></button>
        {showMenu&&<div className="card-menu"><button onClick={()=>{setShowMenu(false);onDetail()}}><Search size={15}/>View details</button><button onClick={()=>{setShowMenu(false);onEdit()}}><Pencil size={15}/>Edit piece</button><button className="danger" onClick={()=>{setShowMenu(false);onRemove()}}><Trash2 size={15}/>Delete piece</button></div>}</div></div>
      <div className="garment-foot"><span>{money(item.purchasePrice)}</span><label className="visually-hidden" htmlFor={'status-'+item.id}>Status for {item.name}</label><select id={'status-'+item.id} disabled={busy} className="status-select" value={item.status} onChange={e=>onStatus(e.target.value as GarmentStatus)}>{statuses.map(s=><option value={s} key={s}>{titleCase(s)}</option>)}</select></div>
    </div>
  </article>;
}
function GarmentDetails({item,onEdit,onClose,onRemovePhoto,busy}:{item:Garment,onEdit:()=>void,onClose:()=>void,onRemovePhoto:()=>void,busy:boolean}){
  return <div className="garment-detail"><header className="modal-header"><div><div className="overline">YOUR CLOSET / ITEM {item.id}</div><h2>{item.name}</h2><p>{titleCase(item.category)} · {item.brand||'Unbranded'}</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20}/></button></header>
    <div className="detail-hero">{item.imageUrl?<img src={item.imageUrl} alt={item.name}/>:<ClothArt garment={item} large/>}</div>
    <div className="detail-attributes">
      <div><small>Price paid</small><strong>{money(item.purchasePrice)}</strong></div><div><small>Status</small><strong>{titleCase(item.status)}</strong></div>
      <div><small>Season</small><strong>{seasonLabel(item.season||'ALL_SEASONS')}</strong></div><div><small>Occasion</small><strong>{titleCase(item.occasion||'EVERYDAY')}</strong></div>
      <div><small>Recorded wears</small><strong>{item.wearCount}</strong></div><div><small>Purchased</small><strong>{item.purchasedOn||'Not recorded'}</strong></div>
    </div>
    {item.notes&&<div className="detail-notes"><span className="overline">NOTES</span><p>{item.notes}</p></div>}
    <footer className="modal-actions">{item.imageUrl&&<button disabled={busy} className="button-outline" onClick={onRemovePhoto}><Trash2 size={15}/>Remove photo</button>}<button className="button-outline" onClick={onClose}>Close</button><button className="button-dark" onClick={onEdit}><Pencil size={16}/>Edit details</button></footer>
  </div>;
}
const navigation: {key:Page,title:string,icon:typeof Shirt,phase:string}[] = [
  {key:'dashboard',title:'Overview',icon:LayoutDashboard,phase:''},
  {key:'closet',title:'My wardrobe',icon:Shirt,phase:''},
  {key:'outfits',title:'Outfit studio',icon:Palette,phase:''},
  {key:'laundry',title:'Laundry center',icon:WashingMachine,phase:'Soon'},
  {key:'analytics',title:'Wardrobe analytics',icon:BarChart3,phase:'Soon'},
  {key:'planner',title:'Outfit planner',icon:CalendarDays,phase:'Soon'}
];
function App(){
  const [items,setItems]=useState<Garment[]>([]);
  const [summary,setSummary]=useState<Summary|null>(null);
  const [page,setPage]=useState<Page>('dashboard');
  const [category,setCategory]=useState<Category|'ALL'>('ALL');
  const [query,setQuery]=useState('');
  const [statusFilter,setStatusFilter]=useState('ALL');
  const [seasonFilter,setSeasonFilter]=useState<Season|'ALL'>('ALL');
  const [occasionFilter,setOccasionFilter]=useState<Occasion|'ALL'>('ALL');
  const [sort,setSort]=useState<SortOrder>('NEWEST');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [modal,setModal]=useState<Garment|boolean>(false);
  const [detail,setDetail]=useState<Garment|null>(null);
  const [mobileNav,setMobileNav]=useState(false);
  const reload=useCallback(async()=>{
    try{const [newItems,newSummary]=await Promise.all([api.garments(),api.summary()]);setItems(newItems);setSummary(newSummary);setError('');}
    catch(e){setError((e as Error).message)} finally{setLoading(false)}
  },[]);
  useEffect(()=>{void reload()},[reload]);
  const filtered=useMemo(()=>{
    const found=items.filter(i=>
      (category==='ALL'||i.category===category) && (statusFilter==='ALL'||i.status===statusFilter) &&
      (seasonFilter==='ALL'||i.season===seasonFilter||i.season==='ALL_SEASONS') &&
      (occasionFilter==='ALL'||i.occasion===occasionFilter) &&
      (i.name+' '+i.brand+' '+i.category+' '+i.notes).toLowerCase().includes(query.trim().toLowerCase())
    );
    found.sort((a,b)=>sort==='NAME'?a.name.localeCompare(b.name):
      sort==='PRICE_ASC'?a.purchasePrice-b.purchasePrice:
      sort==='PRICE_DESC'?b.purchasePrice-a.purchasePrice:
      new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
    return found;
  },[items,category,statusFilter,seasonFilter,occasionFilter,sort,query]);
  const doSave=async(data:GarmentInput,photo:File|null)=>{
    try{setBusy(true);
      const saved=typeof modal==='object'?await api.update(modal.id,data):await api.create(data);
      if(photo)await api.uploadPhoto(saved.id,photo);
      setModal(false);setNotice(photo?'Piece and photo saved.':'Your wardrobe has been updated.');await reload();
    }catch(e){setError((e as Error).message);await reload()}finally{setBusy(false)}
  };
  const doRemovePhoto=async(item:Garment)=>{
    try{setBusy(true);await api.removePhoto(item.id);setDetail(null);await reload();setNotice('Photo removed.')}
    catch(e){setError((e as Error).message)}finally{setBusy(false)}
  };
  const doSeed=async()=>{
    try{setBusy(true);await api.seed();await reload();setNotice('Eight demo garments added. You can edit or delete them freely.');}
    catch(e){setError((e as Error).message)}finally{setBusy(false)}
  };
  const doRemove=async(item:Garment)=>{
    if(!window.confirm(`Remove "${item.name}" from your wardrobe?`))return;
    try{setBusy(true);await api.remove(item.id);await reload();setNotice('Garment removed.');}
    catch(e){setError((e as Error).message)}finally{setBusy(false)}
  };
  const doStatus=async(item:Garment,status:GarmentStatus)=>{
    try{setBusy(true);await api.status(item.id,status);await reload();setNotice(`${item.name} is now ${titleCase(status)}.`);}
    catch(e){setError((e as Error).message)}finally{setBusy(false)}
  };
  const changePage=(p:Page)=>{setPage(p);setMobileNav(false)};
  const phaseCard=navigation.find(n=>n.key===page)!;
  return <div className="shell">
    <aside className={'sidebar '+(mobileNav?'mobile-open':'')}>
      <div className="logo-row"><div className="logo-mark"><Layers3 size={24} strokeWidth={1.7}/></div><div><div className="logo-text">threadwork<span>.</span></div><small>THE WARDROBE OS</small></div></div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="nav-group" aria-label="Main navigation">{navigation.map(n=>{
        const Icon=n.icon;return <button key={n.key} className={'nav-link '+(page===n.key?'active':'')} onClick={()=>changePage(n.key)}><Icon size={19} strokeWidth={1.8}/><span>{n.title}</span>{n.phase&&<small>{n.phase}</small>}</button>
      })}</nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-note"><Sparkles size={20}/><strong>A closet with intention.</strong><p>Make more of what you already own.</p><div className="sidebar-note-line"/></div>
      <div className="sidebar-footer"><div className="avatar">TW</div><div><strong>My wardrobe</strong><span>Local workspace · Phase 3</span></div><ChevronDown size={15}/></div>
    </aside>
    {mobileNav&&<div className="mobile-shade" onClick={()=>setMobileNav(false)}/>}
    <div className="app-main">
      <header className="topbar"><button className="mobile-menu icon-button" onClick={()=>setMobileNav(true)} aria-label="Open menu"><Menu size={22}/></button><div className="breadcrumb">MY WORKSPACE <span>/</span> <strong>{phaseCard.title.toUpperCase()}</strong></div><div className="top-actions"><span className="version-pill"><span className="pulse-dot"/> OUTFIT STUDIO v0.3</span><button className="icon-button top-help" title="THREADWORK · Phase 3"><CircleHelp size={19}/></button></div></header>
      <main className="main-content">
        {error&&<div className="alert error" role="alert"><span>{error}</span><button onClick={()=>{setError('');void reload()}}><RefreshCw size={15}/> Retry</button></div>}
        {page==='dashboard'&&<>
          <div className="page-heading"><div><div className="overline"><span className="gold-line"/> YOUR WARDROBE, REIMAGINED</div><h1>The everyday edit<span>.</span></h1><p>A more thoughtful way to organize everything you wear.</p></div><button className="button-dark" onClick={()=>setModal(true)}><Plus size={18}/> Add a piece</button></div>
          <section className="feature-banner"><div className="banner-copy"><div className="overline bright">WELCOME TO THREADWORK <ArrowUpRight size={13}/></div><h2>Wear more of<br/><em>what you own.</em></h2><p>One beautifully organized place for your clothing, outfits, and everyday rituals.</p><button onClick={()=>changePage('closet')}>Explore my wardrobe <ArrowRight size={17}/></button></div><div className="banner-illustration" aria-hidden="true"><div className="banner-ring ring-1"/><div className="banner-ring ring-2"/><div className="banner-hanger"><Shirt size={125} strokeWidth={.65}/></div><span className="banner-edition">THE EVERYDAY EDIT · NO. 001</span></div></section>
          <div className="metrics-grid"><div className="metric"><div><span>PIECES IN YOUR CLOSET</span><Shirt size={18}/></div><strong>{summary?.totalItems??'—'}</strong><small>Total collection</small></div><div className="metric"><div><span>READY TO WEAR</span><PackageCheck size={18}/></div><strong>{summary?.availableItems??'—'}</strong><small>Available right now</small></div><div className="metric"><div><span>IN THE LAUNDRY</span><WashingMachine size={18}/></div><strong>{summary?.laundryItems??'—'}</strong><small>Washing or drying</small></div><div className="metric"><div><span>WARDROBE VALUE</span><BarChart3 size={18}/></div><strong className="money-value">{summary?money(summary.wardrobeValue):'—'}</strong><small>Recorded purchase prices</small></div></div>
          <div className="section-top"><div><div className="overline">CURATED FROM YOUR CLOSET</div><h2>Your latest pieces</h2></div><button className="text-link" onClick={()=>changePage('closet')}>View full wardrobe <ArrowUpRight size={17}/></button></div>
          {loading?<div className="loading-tiles">Loading wardrobe…</div>:items.length? <div className="garment-grid dashboard-grid">{items.slice(0,4).map(item=><GarmentCard key={item.id} item={item} onDetail={()=>setDetail(item)} onEdit={()=>setModal(item)} onRemove={()=>void doRemove(item)} onStatus={s=>void doStatus(item,s)} busy={busy}/>)}</div>:<EmptyWardrobe onAdd={()=>setModal(true)} onDemo={()=>void doSeed()} busy={busy}/>}
          <div className="bottom-row"><div className="insight-panel"><div className="panel-icon"><Sparkles size={23}/></div><div><span className="overline">NOW OPEN · OUTFIT STUDIO</span><h3>Outfit creation, without the chaos.</h3><p>Mix pieces you own, save combinations, and build your own personal uniform.</p></div><ArrowUpRight size={21}/></div><div className="quote-panel">“Style is what you make of what you have.”<span>THE THREADWORK PHILOSOPHY</span></div></div>
        </>}
        {page==='closet'&&<>
          <div className="page-heading"><div><div className="overline"><span className="gold-line"/> PERSONAL COLLECTION</div><h1>My wardrobe<span>.</span></h1><p>Every piece, every detail, all in one place.</p></div><button className="button-dark" onClick={()=>setModal(true)}><Plus size={18}/> Add new piece</button></div>
          <div className="collection-bar"><span>{items.length} PIECES IN YOUR COLLECTION</span><span><Clock3 size={14}/> Saved locally and persistently</span></div>
          <div className="filter-bar"><div className="category-tabs">{categories.map(c=><button key={c.value} className={category===c.value?'selected':''} onClick={()=>setCategory(c.value)}>{c.label}</button>)}</div><div className="search-controls">
            <label className="search-input"><Search size={17}/><input aria-label="Search garments" placeholder="Search names, brands, notes..." value={query} onChange={e=>setQuery(e.target.value)}/></label>
            <label className="filter-select"><SlidersHorizontal size={17}/><select aria-label="Filter status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="ALL">Any status</option>{statuses.map(s=><option key={s} value={s}>{titleCase(s)}</option>)}</select></label>
            <label className="filter-select"><Calendar size={17}/><select aria-label="Filter season" value={seasonFilter} onChange={e=>setSeasonFilter(e.target.value as Season|'ALL')}><option value="ALL">All seasons</option>{seasons.filter(s=>s!=='ALL_SEASONS').map(s=><option key={s} value={s}>{seasonLabel(s)}</option>)}</select></label>
            <label className="filter-select"><Tag size={17}/><select aria-label="Filter occasion" value={occasionFilter} onChange={e=>setOccasionFilter(e.target.value as Occasion|'ALL')}><option value="ALL">Any occasion</option>{occasions.map(s=><option key={s} value={s}>{titleCase(s)}</option>)}</select></label>
            <label className="filter-select"><select aria-label="Sort garments" value={sort} onChange={e=>setSort(e.target.value as SortOrder)}><option value="NEWEST">Newest</option><option value="NAME">Name A–Z</option><option value="PRICE_ASC">Price: low first</option><option value="PRICE_DESC">Price: high first</option></select></label>
          </div></div>
          {loading?<div className="loading-tiles">Loading your closet…</div>:filtered.length?<div className="garment-grid closet-grid">{filtered.map(item=><GarmentCard key={item.id} item={item} onDetail={()=>setDetail(item)} onEdit={()=>setModal(item)} onRemove={()=>void doRemove(item)} onStatus={s=>void doStatus(item,s)} busy={busy}/>)}</div>:items.length?<div className="empty-filter"><Search size={30}/><h3>Nothing matches these filters.</h3><p>Try adjusting your search or choosing another category.</p><button className="button-outline" onClick={()=>{setQuery('');setStatusFilter('ALL');setCategory('ALL');setSeasonFilter('ALL');setOccasionFilter('ALL');setSort('NEWEST')}}>Reset filters</button></div>:<EmptyWardrobe onAdd={()=>setModal(true)} onDemo={()=>void doSeed()} busy={busy}/>}
        </>}
        {page==='outfits'&&<OutfitStudio items={items} onChanged={reload} onGoCloset={()=>changePage('closet')}/>}
         {!['dashboard','closet','outfits'].includes(page)&&<div className="coming-content"><div className="overline"><span className="gold-line"/> NEXT IN OUR ROADMAP</div><h1>{phaseCard.title}<span>.</span></h1><p>We have intentionally not presented this as a finished feature. The clothing inventory comes first; this module will be connected to the same real wardrobe records in a later phase.</p><div className="coming-card"><div><phaseCard.icon size={38} strokeWidth={1.4}/></div><h2>Built thoughtfully, not rushed.</h2><p>{page==='outfits'?'Drag and drop real closet pieces into outfits, save sets, and reuse them.':page==='laundry'?'Track status transitions and automatically update available outfits.':page==='analytics'?'Explore cost-per-wear, wear history, and wardrobe usage over time.':'Schedule outfits, identify conflicts, and build efficient travel packing lists.'}</p><button className="button-dark" onClick={()=>changePage('closet')}>Back to my wardrobe <ArrowRight size={17}/></button></div></div>}
      </main>
      <footer className="main-footer"><span>THREADWORK © 2026 · YOUR WARDROBE, INTENTIONALLY</span><span>JAVA 21 / SPRING BOOT / REACT <ArrowDownRight size={15}/></span></footer>
    </div>
    {modal!==false&&<Modal onClose={()=>setModal(false)}><GarmentForm initial={typeof modal==='object'?modal:undefined} save={doSave} busy={busy} onClose={()=>setModal(false)}/></Modal>}
    {detail!==null&&<Modal onClose={()=>setDetail(null)}><GarmentDetails item={detail} busy={busy} onClose={()=>setDetail(null)} onEdit={()=>{setDetail(null);setModal(detail)}} onRemovePhoto={()=>void doRemovePhoto(detail)}/></Modal>}
    <Toast text={notice} onClose={()=>setNotice('')}/>
  </div>;
}
function EmptyWardrobe({onAdd,onDemo,busy}:{onAdd:()=>void,onDemo:()=>void,busy:boolean}){
  return <div className="empty-wardrobe"><div className="empty-art"><Shirt size={57} strokeWidth={1.1}/><span>01 / THE BEGINNING</span></div><h3>A wardrobe worth knowing.</h3><p>Your closet is empty. Add your first item, or load eight clearly labeled sample pieces to explore how THREADWORK works.</p><div className="empty-buttons"><button className="button-dark" onClick={onAdd}><CirclePlus size={17}/> Add a piece</button><button disabled={busy} className="button-outline" onClick={onDemo}>Load demo wardrobe <ArrowRight size={17}/></button></div></div>;
}
export default App;
