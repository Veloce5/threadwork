import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Database, FileImage,
  FolderArchive, History, Layers, RefreshCw, ShieldCheck, Shirt, X } from 'lucide-react';
import { api } from './api';
import type { AuditReport } from './api';
import './workspace-health.css';

const cards=[
  {key:'garments',label:'Garments',icon:Shirt},
  {key:'attachedPhotos',label:'Attached photos',icon:FileImage},
  {key:'savedOutfits',label:'Saved outfits',icon:Layers},
  {key:'calendarEntries',label:'Calendar entries',icon:Clock3},
  {key:'wearEvents',label:'Wear logs',icon:History},
  {key:'statusChanges',label:'Status changes',icon:RefreshCw}
] as const;

export function WorkspaceHealth(){
  const [report,setReport]=useState<AuditReport|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const refresh=useCallback(async()=>{
    setLoading(true);
    try{setReport(await api.audit());setError('');}
    catch(e){setError((e as Error).message);}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void refresh()},[refresh]);
  const problems=report?.issues.filter(i=>i.severity==='ERROR')||[];
  const warnings=report?.issues.filter(i=>i.severity==='WARNING')||[];
  return <section className="wh-root">
    <div className="page-heading"><div>
      <div className="overline"><span className="gold-line"/> DATA RELIABILITY · PHASE 8</div>
      <h1>Workspace health<span>.</span></h1>
      <p>Check your wardrobe's records before a demo, an upgrade, or a future database migration.</p>
    </div><button className="wh-refresh" onClick={()=>void refresh()} disabled={loading}>
      <RefreshCw size={15}/>{loading?'Checking…':'Run audit'}</button></div>
    {error&&<div className="wh-error" role="alert"><AlertTriangle size={17}/><span>{error}</span><button aria-label="Dismiss" onClick={()=>setError('')}><X size={16}/></button></div>}
    <div className={'wh-status '+(!report?'neutral':report.passed?'passed':'failed')}>
      {report?.passed?<ShieldCheck size={27}/>:report?<AlertTriangle size={27}/>:<Database size={27}/>}
      <div><h2>{loading?'Checking wardrobe data…':report?.passed?'Core data checks passed':report?'One or more consistency issues found':'Audit not available'}</h2>
        <p>{report?problems.length+' error(s), '+warnings.length+' warning(s) · '+report.database+' database':
          'A read-only audit checks saved garments, photos, outfits, wear counts, and calendar references.'}</p>
      </div>
      {report&&<small>{new Date(report.checkedAt).toLocaleString()}</small>}
    </div>
    {report&&<div className="wh-totals">{cards.map(({key,label,icon:Icon})=><div key={key}>
      <Icon size={20}/><small>{label}</small><strong>{report.totals[key]??0}</strong></div>)}</div>}
    <section className="wh-panel">
      <div className="wh-heading"><div><span className="overline">01 / AUDIT FINDINGS</span><h2>Consistency report</h2></div>
        {report&&<span>{report.issues.length} finding{report.issues.length===1?'':'s'}</span>}</div>
      {report?.issues.length===0?<div className="wh-clear"><CheckCircle2 size={27}/>
        <div><strong>No consistency issues detected</strong><p>Wear counts match logged events. Stored image references and planned outfit records were checked.</p></div></div>:
      report&&<div className="wh-issues">{report.issues.map((issue,i)=><div key={i} className={issue.severity==='ERROR'?'wh-item-error':'wh-item-warning'}>
        <AlertTriangle size={18}/><div><strong>{issue.code.replace(/_/g,' ')}</strong>
          <p>{issue.message}</p></div><span>{issue.severity}</span></div>)}</div>}
      {!report&&<p className="wh-fallback">{loading?'Running checks…':'Could not obtain an audit report.'}</p>}
      <p className="wh-context">An audit verifies internal consistency, not whether outfit suggestions are fashionable or whether your information is backed up. Historical references to deleted garments are warnings rather than errors.</p>
    </section>
    <section className="wh-panel">
      <div className="wh-heading"><div><span className="overline">02 / LOCAL DATA PROTECTION</span><h2>Keep your wardrobe safe</h2></div><FolderArchive size={22}/></div>
      <div className="wh-backup">
        <div><span className="wh-label">BACKUP CHECKPOINT</span><h3>Save your H2 database and clothing photos together.</h3>
          <p>On your Mac, close the Java backend first. From your actual Git repository, run the backup script:</p>
          <code>bash scripts/backup-local.sh</code>
          <p>The script creates a private compressed archive in your local <strong>backups/</strong> directory. Archives and photos are excluded from GitHub.</p>
        </div>
        <div className="wh-backup-caution"><AlertTriangle size={18}/><p>Backups are not automatic. This script is for the default local H2 database only; PostgreSQL/Tiger Data needs a separate database backup. Never upload an archive containing personal clothing photos to a public repository.</p></div>
      </div>
    </section>
    <p className="wh-footnote">Workspace Health runs entirely in the Java backend. No Gemini, Snowflake, or other paid service is connected to this audit. THREADWORK is still a local prototype without user authentication; do not expose its API publicly yet.</p>
  </section>;
}
