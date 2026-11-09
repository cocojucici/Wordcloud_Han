(function(root){
  'use strict';
  const SOURCES=['Dining','Tech','Film'];
  const STOP=new Set(`a an the this that these those i me my mine we us our ours you your yours he him his she her hers it its they them their theirs myself yourself himself herself itself ourselves themselves who whom whose which what where when why how am is are was were be been being have has had having do does did doing will would shall should can could may might must of in on at by for with about against between into through during before after above below to from up down out off over under and or but nor so yet if then than because as while until although though there here`.split(' '));
  const SKIP=new Set('very really too quite all even ever much more'.split(' '));
  const NEGATORS=new Set(['not','no','never']);
  function toTerms(text){
    const tokens=text.toLowerCase().replace(/[’‘]/g,"'")
      .replace(/can't/g,'can not').replace(/won't/g,'will not')
      .replace(/n't/g,' not').replace(/'re/g,' are').replace(/'ve/g,' have')
      .replace(/'ll/g,' will').replace(/'d/g,' would').replace(/'m/g,' am')
      .replace(/'s/g,' is').match(/[a-z]+/g)||[];
    const terms=new Set();
    for(let i=0;i<tokens.length;i++){
      const term=tokens[i];
      if(NEGATORS.has(term)){
        let j=i+1,skipped=0;
        while(j<tokens.length&&(STOP.has(tokens[j])||SKIP.has(tokens[j]))&&skipped<2){j++;skipped++;}
        if(j<tokens.length&&!STOP.has(tokens[j])&&!SKIP.has(tokens[j])&&tokens[j].length>1&&!NEGATORS.has(tokens[j])){
          terms.add(`${term} ${tokens[j]}`);i=j;continue;
        }
        continue;
      }
      if(term.length>1&&!STOP.has(term))terms.add(term);
    }
    return terms;
  }
  function countTerms(sentences){
    const bySource=Object.fromEntries(SOURCES.map(s=>[s,new Map()]));
    for(const row of sentences){
      for(const term of toTerms(row.text)){
        const map=bySource[row.source];
        if(!map.has(term))map.set(term,{term,source:row.source,praise:0,complaint:0,examples:{}});
        const item=map.get(term),side=row.label?'praise':'complaint';item[side]++;
        if(!item.examples[side])item.examples[side]=row.text;
      }
    }
    for(const source of SOURCES)bySource[source]=[...bySource[source].values()].map(finish);
    return bySource;
  }
  function finish(d){d.count=d.praise+d.complaint;d.share=(d.praise+5)/(d.count+10);d.tone=d.share>=.7?'praise':d.share<=.3?'complaint':'either';return d;}
  const sorted=terms=>[...terms].sort((a,b)=>b.count-a.count||a.term.localeCompare(b.term,'en'));
  function selectTerms(terms){return {kept:sorted(terms.filter(d=>d.count>=7)),leftOut:terms.filter(d=>d.count<7).length};}
  // Exercise 01: deterministic Top-N, with complete boundary-tie statistics.
  function selectTopN(terms,N){
    const ordered=sorted(terms),kept=ordered.slice(0,N);
    const cutoff=ordered.length>=N?ordered[N-1].count:null;
    const tied=cutoff===null?0:ordered.filter(d=>d.count===cutoff).length;
    const cutTies=cutoff===null?0:ordered.slice(N).filter(d=>d.count===cutoff).length;
    return {kept,leftOut:terms.length-kept.length,cutoff,tied,cutTies};
  }
  // Exercise 02: retain a term when any one source reports at least seven sentences.
  function mergeSources(bySource){
    const terms=new Map();
    for(const source of SOURCES)for(const d of bySource[source]){
      if(!terms.has(d.term))terms.set(d.term,{term:d.term,praise:0,complaint:0,bySource:{Dining:0,Tech:0,Film:0},examples:{}});
      const item=terms.get(d.term);item.bySource[source]=d.count;item.praise+=d.praise;item.complaint+=d.complaint;
      Object.assign(item.examples,d.examples);
    }
    return sorted([...terms.values()].filter(d=>Math.max(...Object.values(d.bySource))>=7).map(finish));
  }
  function sourceTarget(term,corners){
    const total=Object.values(term.bySource).reduce((a,b)=>a+b,0);
    return {x:SOURCES.reduce((sum,s)=>sum+corners[s].x*term.bySource[s],0)/total,
      y:SOURCES.reduce((sum,s)=>sum+corners[s].y*term.bySource[s],0)/total};
  }
  root.TextData={SOURCES,toTerms,countTerms,selectTerms,selectTopN,mergeSources,sourceTarget};
  if(typeof module!=='undefined')module.exports=root.TextData;
})(typeof window!=='undefined'?window:globalThis);
