(async()=>{
  'use strict';
  const $=s=>document.querySelector(s),NS='http://www.w3.org/2000/svg';
  const {SOURCES,countTerms,selectTerms,selectTopN,mergeSources,sourceTarget}=TextData;
  const bySource=countTerms(SENTENCES),merged=mergeSources(bySource);
  const state={tab:'standard',N:50};
  const colors={praise:'#248879',complaint:'#c66f58',either:'#8b9790'};
  const tabs=['standard','task1','task2'];
  const cache=new Map();
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  await document.fonts.ready;
  function node(tag,attrs,parent,text){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;parent.append(e);return e;}
  function layoutCloud(terms,width,minCount,maxCount,positioned=false){
    const minFont=state.tab==='task1'?11:12,maxFont=64;
    const size=d=>minFont+(Math.sqrt(d.count)-Math.sqrt(minCount))/(Math.sqrt(maxCount)-Math.sqrt(minCount)||1)*(maxFont-minFont);
    let height=positioned?880:Math.max(280,Math.ceil(terms.length*.9));
    for(let retry=0;retry<12;retry++){
      const cell=42,grid=new Map(),placed=[];
      const corners={Dining:{x:width*.22,y:height*.22},Tech:{x:width*.78,y:height*.22},Film:{x:width*.5,y:height*.78}};
      const cells=box=>{const ids=[];for(let y=Math.floor(box.top/cell);y<=Math.floor(box.bottom/cell);y++)for(let x=Math.floor(box.left/cell);x<=Math.floor(box.right/cell);x++)ids.push(`${x},${y}`);return ids;};
      let failed=false;
      for(const d of terms){
        const fontSize=size(d),italic=/^(not|no|never) /.test(d.term);
        ctx.font=`${italic?'italic ':''}500 ${fontSize}px Arial`;
        const w=ctx.measureText(d.term).width+8,h=fontSize*1.2+5;
        const target=positioned?sourceTarget(d,corners):{x:width/2,y:height/2};
        let found=null;
        for(let k=0;k<22000;k++){
          const angle=k*.17,r=angle*1.9;
          const x=target.x+r*Math.cos(angle),y=target.y+r*Math.sin(angle)*.82;
          const box={left:x-w/2,right:x+w/2,top:y-h/2,bottom:y+h/2};
          if(box.left<24||box.right>width-24||box.top<positioned*42+18||box.bottom>height-24)continue;
          const ids=cells(box),neighbors=new Set(ids.flatMap(id=>grid.get(id)||[]));
          if([...neighbors].some(b=>box.left<b.right&&box.right>b.left&&box.top<b.bottom&&box.bottom>b.top))continue;
          found={...d,x,y,fontSize,italic,box,target};for(const id of ids){if(!grid.has(id))grid.set(id,[]);grid.get(id).push(box);}break;
        }
        if(!found){failed=true;break;}placed.push(found);
      }
      if(!failed)return {placed,width,height,corners,unplaced:0};
      height=Math.ceil(height*1.28);
    }
    throw Error('Cloud layout could not fit every word. Reduce Top N and retry.');
  }
  function tooltip(event,d){
    const sourceCounts=d.bySource?'\n'+SOURCES.map(s=>`${s}: ${d.bySource[s]}`).join(' · '):'';
    $('#tooltip').textContent=`${d.term} · ${d.count} sentences\nPraise ${d.praise} / Complaint ${d.complaint}\nSmoothed praise share: ${(100*d.share).toFixed(1)}%${sourceCounts}\n${d.examples.complaint||d.examples.praise||''}`;
    $('#tooltip').hidden=false;$('#tooltip').style.left=Math.max(8,Math.min(innerWidth-340,(event.clientX||80)+14))+'px';$('#tooltip').style.top=Math.max(8,Math.min(innerHeight-220,(event.clientY||100)+12))+'px';
  }
  function drawCloud(source,selection,scale,positioned=false){
    const key=`${state.tab}-${state.N}-${source}`;
    if(!cache.has(key))cache.set(key,layoutCloud(selection.kept,1120,scale.min,scale.max,positioned));
    const layout=cache.get(key),card=document.createElement('article');card.className='cloud-card';
    const header=document.createElement('div');header.className='cloud-header';
    const title=document.createElement('div'),h=document.createElement('h3'),sub=document.createElement('p');h.textContent=positioned?'Three sources, one vocabulary':source;sub.textContent=positioned?'Dining ↖ · Tech ↗ · Film ↓':`${{Dining:'Yelp · Restaurant reviews',Tech:'Amazon · Product reviews',Film:'IMDb · Movie reviews'}[source]} · 1,000 sentences`;title.append(h,sub);
    const total=document.createElement('span');total.className='stats';total.textContent=`${layout.placed.length} terms`;header.append(title,total);card.append(header);
    const svg=node('svg',{viewBox:`0 0 ${layout.width} ${layout.height}`,role:'group','aria-label':`${source} word cloud`},card);
    if(positioned){const c=layout.corners;node('path',{d:`M${c.Dining.x},${c.Dining.y}L${c.Tech.x},${c.Tech.y}L${c.Film.x},${c.Film.y}Z`,class:'triangle-guide'},svg);for(const s of SOURCES){const p=c[s];node('circle',{cx:p.x,cy:p.y,r:3,fill:'#bccfc0'},svg);node('text',{x:p.x,y:s==='Film'?layout.height-16:22,'text-anchor':'middle',class:'source-label'},svg,s.toUpperCase());}}
    for(const d of layout.placed){const word=node('text',{x:d.x,y:d.y,'text-anchor':'middle','dominant-baseline':'central','font-family':'Arial,sans-serif','font-size':d.fontSize,'font-weight':500,'font-style':d.italic?'italic':'normal',fill:colors[d.tone],opacity:d.tone==='either'?.68:1,tabindex:0,class:'cloud-word','data-term':d.term,'aria-label':`${d.term}, ${d.count} sentences`},svg,d.term);word.addEventListener('pointermove',e=>tooltip(e,d));word.addEventListener('focus',e=>tooltip(e,d));word.addEventListener('pointerleave',()=>$('#tooltip').hidden=true);word.addEventListener('blur',()=>$('#tooltip').hidden=true);}
    const note=document.createElement('div');note.className='cloud-note';note.textContent=state.tab==='task1'?`Top ${state.N} · Rank ${state.N}: ${selection.cutoff===null?'not available':selection.cutoff+' sentences'} · ${selection.tied} terms share that count · ${selection.cutTies} boundary ties cut off · ${selection.leftOut} terms left out · ${layout.unplaced} unplaced`:positioned?`${merged.length} terms · Kept if any source has ≥ 7 sentences · ${layout.unplaced} unplaced`:`${selection.kept.length} terms with ≥ 7 sentences · ${selection.leftOut} terms left out · ${layout.unplaced} unplaced`;card.append(note);return card;
  }
  function render(){
    $('#tooltip').hidden=true;$('#topn').hidden=state.tab!=='task1';
    $('#rule-title').textContent=state.tab==='task1'?'Top N, with ties made visible':state.tab==='task2'?'Position now carries meaning':'One cloud per source';
    $('#rule-detail').textContent=state.tab==='task1'?'Sorted by sentence count, then alphabetically. Size domain starts at 1.':state.tab==='task2'?'Count-weighted source positions, followed by deterministic spiral packing.':'Terms reported in at least 7 sentences. One common square-root size scale.';
    $('#status').textContent='Laying out words…';
    const selections=Object.fromEntries(SOURCES.map(s=>[s,state.tab==='task1'?selectTopN(bySource[s],state.N):selectTerms(bySource[s])]));
    const kept=state.tab==='task2'?merged:SOURCES.flatMap(s=>selections[s].kept);
    const scale={min:state.tab==='task1'?1:7,max:Math.max(...kept.map(d=>d.count))};
    $('#clouds').replaceChildren(...(state.tab==='task2'?[drawCloud('Merged',{kept:merged},scale,true)]:['Dining','Film','Tech'].map(s=>drawCloud(s,selections[s],scale))));
    $('#status').textContent=`${kept.length} terms displayed · 0 unplaced · Deterministic layout · Sentence counts, not token counts`;
    document.querySelectorAll('[data-n]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.n)===state.N));
  }
  function navigate(tab,focus=false){state.tab=tab;for(const name of tabs){$('#tab-'+name).setAttribute('aria-selected',name===tab);$('#tab-'+name).tabIndex=name===tab?0:-1;$('#panel-'+name).hidden=name!==tab;}$('#'+tab+'-slot').append($('#workspace'));history.replaceState(null,'','#'+tab);render();if(focus)$('#tab-'+tab).focus();}
  tabs.forEach((tab,i)=>{$('#tab-'+tab).onclick=()=>navigate(tab);$('#tab-'+tab).onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();navigate(tabs[e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3],true);}};});
  document.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{state.N=Number(b.dataset.n);render();});
  try{navigate(tabs.includes(location.hash.slice(1))?location.hash.slice(1):'standard');}catch(e){$('#status').textContent=e.message;console.error(e);}
})();
