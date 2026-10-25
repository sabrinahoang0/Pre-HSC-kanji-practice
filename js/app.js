(function(){
'use strict';
var DATA=window.KANJI_DATA,K=DATA.kanji,CATS=DATA.cats,BY={};
K.forEach(function(d,i){BY[d.k]=d;d.i=i;});
var main=document.getElementById('main'),live=document.getElementById('live');
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function $(s,r){return (r||document).querySelector(s);}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
function say(m){live.textContent='';setTimeout(function(){live.textContent=m;},60);}
var store={get:function(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v;}catch(e){return d;}},set:function(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
function pick(a){return a[Math.floor(Math.random()*a.length)];}

/* ---------- settings ---------- */
var DEF={theme:'auto',size:100,font:'standard',spacing:'normal',furi:'show',furisize:'normal',motion:'auto',speed:'normal'};
var S=Object.assign({},DEF,store.get('kanji.settings',{}));
function applySettings(){
  var h=document.documentElement;
  ['theme','font','spacing','furi','furisize','motion'].forEach(function(k){h.setAttribute('data-'+k,S[k]);});
  h.style.setProperty('--text-scale',S.size/100);
  store.set('kanji.settings',S);
}
function reduceMotion(){return S.motion==='reduce'||(S.motion==='auto'&&window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);}
var dlg=document.getElementById('settings');
function syncDialog(){
  ['theme','font','spacing','furi','furisize','motion','speed'].forEach(function(k){
    $$('input[name="'+k+'"]',dlg).forEach(function(r){r.checked=(r.value===S[k]);});
  });
  $('#set-size').value=S.size;$('#size-out').textContent=S.size+'%';
}
document.getElementById('open-settings').addEventListener('click',function(){syncDialog();if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','');});
dlg.addEventListener('change',function(e){
  var t=e.target;
  if(t.name&&t.type==='radio'){S[t.name]=t.value;applySettings();}
  if(t.id==='set-size'){S.size=+t.value;$('#size-out').textContent=S.size+'%';applySettings();}
});
dlg.addEventListener('input',function(e){if(e.target.id==='set-size'){S.size=+e.target.value;$('#size-out').textContent=S.size+'%';applySettings();}});
document.getElementById('reset-settings').addEventListener('click',function(){S=Object.assign({},DEF);applySettings();syncDialog();say('Settings reset to defaults');});
dlg.addEventListener('click',function(e){if(e.target===dlg&&dlg.close)dlg.close();});
applySettings();

/* ---------- progress ---------- */
var learned=store.get('kanji.learned',{});
function isLearned(k){return !!learned[k];}
function setLearned(k,v){if(v)learned[k]=1;else delete learned[k];store.set('kanji.learned',learned);}
function learnedCount(){return Object.keys(learned).filter(function(k){return BY[k];}).length;}

/* ---------- text helpers ---------- */
function ruby(segs){return segs.map(function(s){return s[0]==='R'?'<ruby>'+esc(s[1])+'<rp aria-hidden="true">(</rp><rt aria-hidden="true">'+esc(s[2])+'</rt><rp aria-hidden="true">)</rp></ruby>':esc(s[1]);}).join('');}
function plain(segs){return segs.map(function(s){return s[1];}).join('');}
function kana(segs){return segs.map(function(s){return s[0]==='R'?s[2]:s[1];}).join('');}

/* ---------- audio ---------- */
var voices=[];
function loadVoices(){if('speechSynthesis' in window)voices=speechSynthesis.getVoices().filter(function(v){return /^ja/i.test(v.lang);});}
if('speechSynthesis' in window){loadVoices();speechSynthesis.onvoiceschanged=loadVoices;}
function speak(text,slow){
  if(!('speechSynthesis' in window)){say('Read-aloud is not available in this browser.');return;}
  loadVoices();speechSynthesis.cancel();
  var u=new SpeechSynthesisUtterance(text);u.lang='ja-JP';
  if(voices.length)u.voice=voices[0];else say('No Japanese voice was found on this device, so the sound may not be right. Ask your teacher for help adding one.');
  u.rate=(slow||S.speed==='slow')?0.5:0.9;speechSynthesis.speak(u);
}
document.addEventListener('click',function(e){var b=e.target.closest('[data-say]');if(b){speak(b.getAttribute('data-say'),b.hasAttribute('data-slow'));}});
function hearBtn(text,label){return '<span class="hear"><button type="button" class="btn btn-secondary" data-say="'+esc(text)+'" aria-label="Hear '+esc(label)+' read aloud"><span aria-hidden="true">🔊</span> Hear</button> <button type="button" class="btn btn-secondary" data-say="'+esc(text)+'" data-slow="1" aria-label="Hear '+esc(label)+' read aloud slowly"><span aria-hidden="true">🐢</span> Slow</button></span>';}

/* ---------- router ---------- */
var first=true,strokeTimer=null;
function route(){
  if(strokeTimer){clearInterval(strokeTimer);strokeTimer=null;}
  var h=decodeURIComponent(location.hash||'#/').replace(/^#/,'');
  var parts=h.split('/').filter(Boolean);var page=parts[0]||'home';
  var html='',title='Kanji Practice',init=null;
  if(page==='learn'){html=learnPage();title='Learn';init=learnInit;}
  else if(page==='kanji'&&BY[parts[1]]){var d=BY[parts[1]];html=kanjiPage(d);title=d.k+' '+d.label;init=function(){kanjiInit(d);};}
  else if(page==='practice'){html=practiceSetup();title='Practice';init=practiceInit;}
  else if(page==='spot'){html=spotPage();title='Spot it';init=spotInit;}
  else if(page==='print'){html=printPage();title='Print';}
  else if(page==='about'){html=aboutPage();title='About and accessibility';}
  else{html=homePage();page='home';}
  main.innerHTML=html;
  document.title=(page==='home'?'Kanji Practice':title+' | Kanji Practice');
  $$('[data-nav]').forEach(function(a){if(a.getAttribute('data-nav')===(page==='kanji'?'learn':page))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(init)init();
  if(!first){var h1=$('h1',main);if(h1){h1.setAttribute('tabindex','-1');h1.focus({preventScroll:true});}window.scrollTo(0,0);}
  first=false;
}
window.addEventListener('hashchange',route);

/* ---------- home ---------- */
function homePage(){
  var n=learnedCount();
  return '<section class="hero"><div class="hero-kanji" lang="ja" aria-hidden="true">漢字</div><div><h1>Kanji Practice</h1><p>Learn the 200 prescribed kanji. See how each one is written, hear it, read example words and sentences, then test yourself.</p><p class="progress-line">You have marked '+n+' of '+K.length+' kanji as learned.</p></div></section>'+
  '<ul class="tiles">'+
  '<li class="tile"><a href="#/learn"><strong>Learn</strong>Open any kanji: readings, stroke order, example words and sentences.</a></li>'+
  '<li class="tile"><a href="#/practice"><strong>Practice</strong>Quizzes on readings, meanings and missing kanji. Marked for you.</a></li>'+
  '<li class="tile"><a href="#/spot"><strong>Spot it</strong>Find the real kanji hidden among look-alikes.</a></li>'+
  '<li class="tile"><a href="#/print"><strong>Print</strong>Download the printable booklet.</a></li></ul>'+
  '<p>Use <strong>Display and sound settings</strong> at the top of every page to change colours, text size, font, spacing, furigana, movement and read-aloud speed.</p>';
}

/* ---------- learn ---------- */
var learnFilter='all',learnQuery='';
function learnPage(){
  return '<h1>Learn the kanji</h1><p>Choose a kanji to open its page.</p>'+
  '<div class="filters"><fieldset class="chips"><legend>Show</legend>'+
  [['all','All 200'],['active','Active Use (150)'],['recog','Recognition Only (50)'],['learned','Marked as learned']].map(function(o){return '<label class="chip"><input type="radio" name="lf" value="'+o[0]+'"'+(learnFilter===o[0]?' checked':'')+'><span>'+o[1]+'</span></label>';}).join('')+
  '</fieldset><div class="search"><label for="lq">Search by kanji or English meaning</label><input id="lq" type="search" value="'+esc(learnQuery)+'" autocomplete="off"></div></div>'+
  '<p id="lcount" class="status" role="status"></p><div id="lgrid"></div>';
}
function learnRender(){
  var q=learnQuery.trim().toLowerCase(),shown=0,html='';
  CATS.forEach(function(c){
    var items=c.kanji.map(function(k){return BY[k];}).filter(function(d){
      if(learnFilter==='active'&&!d.active)return false;
      if(learnFilter==='recog'&&d.active)return false;
      if(learnFilter==='learned'&&!isLearned(d.k))return false;
      if(q&&d.k.indexOf(q)<0&&d.label.toLowerCase().indexOf(q)<0)return false;
      return true;});
    if(!items.length)return;shown+=items.length;
    html+='<section aria-labelledby="c'+esc(c.name.replace(/\W+/g,''))+'"><h2 id="c'+esc(c.name.replace(/\W+/g,''))+'">'+esc(c.name)+' <span class="cat-note">('+esc(c.part)+', '+items.length+')</span></h2><ul class="kgrid">'+
    items.map(function(d){return '<li><a class="kcard" href="#/kanji/'+encodeURIComponent(d.k)+'" aria-label="'+esc(d.k)+', '+esc(d.label)+(isLearned(d.k)?', marked as learned':'')+'"><span class="kk" lang="ja" aria-hidden="true">'+d.k+'</span><span class="km" aria-hidden="true">'+esc(d.label)+'</span>'+(isLearned(d.k)?'<span class="tick" aria-hidden="true">✓</span>':'')+'</a></li>';}).join('')+'</ul></section>';
  });
  $('#lgrid').innerHTML=html||'<p>No kanji match. Try a different search or filter.</p>';
  $('#lcount').textContent='Showing '+shown+' kanji.';
}
function learnInit(){
  $$('input[name="lf"]').forEach(function(r){r.addEventListener('change',function(){learnFilter=r.value;learnRender();});});
  $('#lq').addEventListener('input',function(e){learnQuery=e.target.value;learnRender();});
  learnRender();
}

/* ---------- kanji page ---------- */
function startOf(d){var m=/M\s*(-?[\d.]+)[ ,]\s*(-?[\d.]+)/.exec(d);return m?[+m[1],+m[2]]:[10,10];}
function kanjiPage(d){
  var n=d.strokes.length,prev=K[d.i-1],next=K[d.i+1];
  var paths=d.strokes.map(function(s,i){return '<path class="draw" id="sp'+i+'" d="'+s+'" pathLength="1" style="display:none"></path>';}).join('');
  var guide=d.strokes.map(function(s){return '<path class="guide" d="'+s+'"></path>';}).join('');
  var steps=d.strokes.map(function(s,i){
    var g=d.strokes.slice(0,i+1).map(function(p,j){return '<path'+(j===i?' class="now"':'')+' d="'+p+'"></path>';}).join('');
    return '<li><svg viewBox="0 0 109 109" role="img" aria-label="Step '+(i+1)+' of '+n+'">'+g+'</svg></li>';}).join('');
  var rd='<dl class="readings"><dt>On’yomi <span class="muted">(sound)</span></dt><dd lang="ja">'+esc(d.on||'–')+'</dd><dt>Kun’yomi <span class="muted">(meaning)</span></dt><dd lang="ja">'+esc(d.kun||'–')+'</dd></dl>';
  var words=d.words.map(function(w){return '<li><span class="jp" lang="ja">'+ruby(w.ruby)+'</span><span class="sr-only">, reading '+esc(w.r)+'</span><span class="en">'+esc(w.e)+'</span>'+hearBtn(w.r,w.w+', '+w.e)+'</li>';}).join('');
  var sents=d.sents.map(function(s){return '<li><span class="grow"><span class="sent" lang="ja">'+ruby(s.segs)+'</span><br><span class="en">'+esc(s.eng)+'</span></span>'+hearBtn(kana(s.segs),'sentence '+(d.sents.indexOf(s)+1))+'</li>';}).join('');
  var ext='<h2>Extension words</h2>';
  if(d.ext&&d.ext.length){ext+='<p class="hint">More words that use this kanji, from the Stage 6 vocabulary list. These go beyond the example words above.</p><ul class="card-list">'+d.ext.map(function(w){return '<li><span class="jp" lang="ja">'+ruby(w.ruby)+'</span><span class="sr-only">, reading '+esc(kana(w.ruby))+'</span><span class="en">'+esc(w.e)+'</span>'+hearBtn(kana(w.ruby),w.w+', '+w.e)+'</li>';}).join('')+'</ul>';}
  else ext+='<p class="hint">There are no extra words for this kanji in the Stage 6 vocabulary list. The example words above are the ones to learn.</p>';
  return '<p><a href="#/learn">← All kanji</a></p>'+
  '<div class="kpage-top"><div class="kanji-display" lang="ja" role="img" aria-label="The kanji '+esc(d.k)+'">'+d.k+'</div><div>'+
  '<h1>'+esc(d.label)+'<span class="sr-only"> (the kanji '+esc(d.k)+')</span></h1>'+
  '<p><span class="tag">'+(d.active?'Active Use: read and write':'Recognition Only: read')+'</span> <span class="tag">'+esc(d.cat)+'</span></p>'+rd+
  '<label><input type="checkbox" id="learned"'+(isLearned(d.k)?' checked':'')+'> I know this kanji</label></div></div>'+
  '<h2>Stroke order</h2><p>This kanji has '+n+' strokes. Red is the stroke being drawn.</p>'+
  '<div class="stroke-wrap"><svg class="stroke-svg" id="sv" viewBox="0 0 109 109" role="img" aria-label="Stroke order drawing of '+esc(d.k)+', '+n+' strokes"><path class="cross" d="M54.5 0V109M0 54.5H109" style="stroke-width:.6;stroke-dasharray:3 3"></path>'+guide+paths+'<g id="nums"></g></svg>'+
  '<div class="stroke-ctrl"><p id="stroke-status" class="status" role="status">Stroke 0 of '+n+'</p><div class="btn-row">'+
  '<button type="button" class="btn btn-primary" id="s-play">Play animation</button>'+
  '<button type="button" class="btn btn-secondary" id="s-prev">Previous stroke</button>'+
  '<button type="button" class="btn btn-secondary" id="s-next">Next stroke</button>'+
  '<button type="button" class="btn btn-secondary" id="s-all">Show all strokes</button>'+
  '<button type="button" class="btn btn-secondary" id="s-reset">Start again</button></div><p id="s-note" class="hint"></p></div></div>'+
  '<details><summary>Every step as a picture ('+n+' steps)</summary><ol class="steps" aria-label="Stroke order steps">'+steps+'</ol></details>'+
  '<fieldset class="speedbar"><legend>Read-aloud speed</legend><label class="chip"><input type="radio" name="spd" value="normal"'+(S.speed!=='slow'?' checked':'')+'><span>Normal</span></label><label class="chip"><input type="radio" name="spd" value="slow"'+(S.speed==='slow'?' checked':'')+'><span>🐢 Slow</span></label></fieldset>'+
  '<h2>Example words</h2><ul class="card-list">'+words+'</ul>'+
  '<h2>Example sentences</h2><ol class="card-list nums">'+sents+'</ol>'+
  ext+'<div class="btn-row no-print"><button type="button" class="btn btn-secondary" onclick="window.print()">Print this page</button></div>'+
  '<nav class="pager" aria-label="Previous and next kanji">'+(prev?'<a class="btn btn-secondary" href="#/kanji/'+encodeURIComponent(prev.k)+'" rel="prev">← <span lang="ja">'+prev.k+'</span>&nbsp;'+esc(prev.label)+'</a>':'<span></span>')+(next?'<a class="btn btn-secondary" href="#/kanji/'+encodeURIComponent(next.k)+'" rel="next">'+esc(next.label)+'&nbsp;<span lang="ja">'+next.k+'</span> →</a>':'<span></span>')+'</nav>';
}
function kanjiInit(d){
  $$('input[name="spd"]').forEach(function(r){r.addEventListener('change',function(){S.speed=r.value;applySettings();say('Read-aloud speed: '+r.value);});});
  var n=d.strokes.length,cur=0,playing=false;
  var st=$('#stroke-status'),play=$('#s-play'),note=$('#s-note');
  var rm=reduceMotion();
  if(rm){play.hidden=true;note.textContent='Animation is off. Use Next stroke and Previous stroke to step through the drawing.';}
  $('#learned').addEventListener('change',function(e){setLearned(d.k,e.target.checked);say(e.target.checked?d.k+' marked as learned.':d.k+' unmarked.');});
  function draw(animate){
    var nums='';
    for(var i=0;i<n;i++){
      var p=document.getElementById('sp'+i);
      if(i<cur){p.style.display='';p.setAttribute('class','draw '+(i===cur-1?'now':'done'));
        var s=startOf(d.strokes[i]);nums+='<text x="'+(s[0]-4)+'" y="'+(s[1]-1)+'">'+(i+1)+'</text>';}
      else p.style.display='none';
    }
    $('#nums').innerHTML=nums;
    if(cur>0&&animate&&!reduceMotion()){
      var c=document.getElementById('sp'+(cur-1));
      c.style.transition='none';c.style.strokeDashoffset='1';void c.getBoundingClientRect();
      c.style.transition='stroke-dashoffset .9s ease';c.style.strokeDashoffset='0';
    }else if(cur>0){var c2=document.getElementById('sp'+(cur-1));c2.style.transition='none';c2.style.strokeDashoffset='0';}
    st.textContent='Stroke '+cur+' of '+n;
    $('#s-prev').disabled=cur===0;$('#s-next').disabled=cur===n;
  }
  function stop(){playing=false;clearInterval(strokeTimer);strokeTimer=null;play.textContent='Play animation';}
  play.addEventListener('click',function(){
    if(playing){stop();return;}
    if(cur>=n)cur=0;playing=true;play.textContent='Pause animation';
    cur=Math.max(cur,0);
    strokeTimer=setInterval(function(){if(cur>=n){stop();return;}cur++;draw(true);if(cur>=n)stop();},1100);
    cur++;draw(true);
  });
  $('#s-next').addEventListener('click',function(){stop();if(cur<n){cur++;draw(true);}});
  $('#s-prev').addEventListener('click',function(){stop();if(cur>0){cur--;draw(false);}});
  $('#s-all').addEventListener('click',function(){stop();cur=n;draw(false);});
  $('#s-reset').addEventListener('click',function(){stop();cur=0;draw(false);});
  draw(false);
  if(rm){cur=n;draw(false);}
}

/* ---------- practice ---------- */
var TYPES={read:'Read it: choose the reading of a word',meaning:'Match it: choose the English meaning of a word',gap:'Write it: choose the missing kanji in a sentence',kanji:'Kanji meaning: choose the meaning of a kanji',ext:'Extension words: read or match harder words from the Stage 6 list'};
var lastSetup={type:'read',set:'active',n:10};
var ALLX=[];K.forEach(function(d){(d.ext||[]).forEach(function(w){ALLX.push({w:w.w,r:kana(w.ruby),e:w.e,k:d.k});});});
var ALLW=[];K.forEach(function(d){d.words.forEach(function(w){ALLW.push({w:w.w,r:w.r,e:w.e,k:d.k});});});
function setOptions(sel){
  var o=[['all','All 200 kanji'],['active','Active Use (150)'],['recog','Recognition Only (50)'],['learned','Kanji I marked as learned']];
  CATS.forEach(function(c){o.push(['cat:'+c.name,c.name+' ('+c.part+')']);});
  return o.map(function(x){return '<option value="'+esc(x[0])+'"'+(sel===x[0]?' selected':'')+'>'+esc(x[1])+'</option>';}).join('');
}
function poolFor(set){
  if(set==='all')return K.slice();
  if(set==='active')return K.filter(function(d){return d.active;});
  if(set==='recog')return K.filter(function(d){return !d.active;});
  if(set==='learned')return K.filter(function(d){return isLearned(d.k);});
  if(set.indexOf('cat:')===0){var n=set.slice(4);return K.filter(function(d){return d.cat===n;});}
  return K.slice();
}
function practiceSetup(msg){
  var best=store.get('kanji.best',{});
  return '<h1>Practice</h1><p>Choose a quiz. Every question has four choices. There is no timer, so take your time. You can check each answer as you go.</p>'+
  (msg?'<p class="feedback bad" role="alert">'+esc(msg)+'</p>':'')+
  '<form id="setup" class="form-grid"><fieldset><legend>Quiz type</legend>'+
  Object.keys(TYPES).map(function(t){return '<label><input type="radio" name="qt" value="'+t+'"'+(lastSetup.type===t?' checked':'')+'> '+esc(TYPES[t])+(best[t]!=null?' <span class="muted">(best: '+best[t]+'%)</span>':'')+'</label>';}).join('')+'</fieldset>'+
  '<div><label for="qs"><strong>Which kanji?</strong></label><br><select id="qs">'+setOptions(lastSetup.set)+'</select></div>'+
  '<div><label for="qn"><strong>Number of questions</strong></label><br><select id="qn">'+[5,10,20].map(function(n){return '<option'+(lastSetup.n===n?' selected':'')+'>'+n+'</option>';}).join('')+'</select></div>'+
  '<div><button class="btn btn-primary" type="submit">Start quiz</button></div></form><div id="quiz" aria-live="off"></div>';
}
function practiceInit(){
  $('#setup').addEventListener('submit',function(e){
    e.preventDefault();
    lastSetup={type:$('input[name="qt"]:checked').value,set:$('#qs').value,n:+$('#qn').value};
    startQuiz();
  });
}
function distract(list,correct,count,keyFn,sim){
  var seen={};seen[correct]=1;var out=[];
  var pool=shuffle(list);
  if(sim){pool.sort(function(a,b){return Math.abs(keyFn(a).length-correct.length)-Math.abs(keyFn(b).length-correct.length);});pool=pool.slice(0,Math.max(count*6,12));pool=shuffle(pool);}
  for(var i=0;i<pool.length&&out.length<count;i++){var v=keyFn(pool[i]);if(!seen[v]){seen[v]=1;out.push(v);}}
  return out;
}
function buildQuestion(type,d){
  var q={type:type,d:d},opts,ans;
  if(type==='ext'){var xw=pick(d.ext),xr=Math.random()<.5,w0={w:xw.w,r:kana(xw.ruby),e:xw.e};
    if(xr){ans=w0.r;opts=[ans].concat(distract(ALLX,ans,3,function(x){return x.r;},true));q.prompt='How do you read this word?';q.optHtml=function(o){return '<span class="jp" lang="ja">'+esc(o)+'</span>';};}
    else{ans=w0.e;opts=[ans].concat(distract(ALLX,ans,3,function(x){return x.e;},false));q.prompt='What does this word mean?';q.optHtml=function(o){return esc(o);};}
    q.show='<span lang="ja">'+esc(w0.w)+'</span>';q.explain=w0.w+' is read '+w0.r+' and means “'+w0.e+'”.';
    q.opts=shuffle(opts);q.ans=q.opts.indexOf(ans);q.ansText=ans;return q;}
  if(type==='read'||type==='meaning'){
    var w=pick(d.words);q.w=w;
    if(type==='read'){ans=w.r;opts=[ans].concat(distract(ALLW,ans,3,function(x){return x.r;},true));
      q.prompt='How do you read this word?';q.show='<span lang="ja">'+esc(w.w)+'</span>';q.optHtml=function(o){return '<span class="jp" lang="ja">'+esc(o)+'</span>';};
      q.explain=w.w+' is read '+w.r+' and means “'+w.e+'”.';}
    else{ans=w.e;opts=[ans].concat(distract(ALLW,ans,3,function(x){return x.e;},false));
      q.prompt='What does this word mean?';q.show='<span lang="ja">'+esc(w.w)+'</span>';q.optHtml=function(o){return esc(o);};
      q.explain=w.w+' ('+w.r+') means “'+w.e+'”.';}
  }else if(type==='gap'){
    var s=pick(d.sents);ans=d.k;
    var segs=s.segs.map(function(g){
      if(g[0]==='R'&&g[1].indexOf(d.k)>=0){return g[1]===d.k?['T','（　　）']:['R',g[1].split(d.k).join('（　）'),g[2]];}
      if(g[0]==='T'&&g[1].indexOf(d.k)>=0)return ['T',g[1].split(d.k).join('（　　）')];
      return g;});
    var like=d.like.slice(0,3);opts=[ans].concat(like);
    q.prompt='Which kanji is missing from the brackets?';q.show='<span lang="ja">'+ruby(segs)+'</span><br><span class="muted" style="font-size:1rem;letter-spacing:0">'+esc(s.eng)+'</span>';q.small=true;
    q.optHtml=function(o){return '<span class="jp" lang="ja">'+esc(o)+'</span>';};
    q.explain='The missing kanji is '+d.k+'. '+plain(s.segs)+' means “'+s.eng+'”.';
  }else{
    ans=d.label;opts=[ans].concat(distract(K,ans,3,function(x){return x.label;},false));
    q.prompt='What does this kanji mean?';q.show='<span lang="ja">'+esc(d.k)+'</span>';q.optHtml=function(o){return esc(o);};
    q.explain=d.k+' means “'+d.label+'”.';
  }
  q.opts=shuffle(opts);q.ans=q.opts.indexOf(ans);q.ansText=ans;
  return q;
}
var Q=null;
function startQuiz(){
  var pool=poolFor(lastSetup.set);
  if(lastSetup.type==='ext')pool=pool.filter(function(d){return d.ext&&d.ext.length;});
  if(!pool.length){main.innerHTML=practiceSetup(lastSetup.type==='ext'?'No kanji in that set have extension words. Choose a different set.':'You have not marked any kanji as learned yet. Choose a different set, or mark some kanji on their pages.');practiceInit();return;}
  pool=shuffle(pool);var N=Math.min(lastSetup.n,Math.max(pool.length,lastSetup.n));
  var qs=[];for(var i=0;i<N;i++){qs.push(buildQuestion(lastSetup.type,pool[i%pool.length]));}
  Q={qs:qs,i:0,score:0,miss:[]};showQuestion();
}
function showQuestion(){
  var q=Q.qs[Q.i],N=Q.qs.length,pct=Math.round(Q.i/N*100);
  main.innerHTML='<h1 id="qh" tabindex="-1">Question '+(Q.i+1)+' of '+N+'</h1>'+
  '<div class="meter" role="progressbar" aria-label="Quiz progress" aria-valuemin="0" aria-valuemax="'+N+'" aria-valuenow="'+Q.i+'"><span style="width:'+pct+'%"></span></div>'+
  '<form id="qf" class="q-card" novalidate><fieldset class="opts"><legend><span class="q-prompt">'+esc(q.prompt)+'</span><span class="q-show'+(q.small?' small':'')+'">'+q.show+'</span></legend>'+
  q.opts.map(function(o,j){return '<label><input type="radio" name="a" value="'+j+'"> <span>'+q.optHtml(o)+'</span></label>';}).join('')+
  '</fieldset><div class="btn-row"><button class="btn btn-primary" type="submit" id="qb">Check answer</button><a class="btn btn-secondary" href="#/practice" id="qquit">Stop quiz</a></div><div id="fb" role="status" aria-live="polite"></div></form>';
  $('#qh').focus();
  var done=false;
  $('#qquit').addEventListener('click',function(){Q=null;});
  $('#qf').addEventListener('submit',function(e){
    e.preventDefault();
    if(done){Q.i++;if(Q.i>=N)showResults();else showQuestion();return;}
    var c=$('input[name="a"]:checked');
    if(!c){$('#fb').className='feedback bad';$('#fb').textContent='Please choose an answer first.';return;}
    var j=+c.value,ok=j===q.ans;done=true;
    if(ok)Q.score++;else Q.miss.push({q:q,chosen:q.opts[j]});
    $$('.opts label').forEach(function(l,k){var inp=$('input',l);inp.disabled=true;
      if(k===q.ans){l.classList.add('right');l.insertAdjacentHTML('beforeend',' <strong>✓ correct answer</strong>');}
      else if(k===j){l.classList.add('wrong');l.insertAdjacentHTML('beforeend',' <strong>✗ your answer</strong>');}});
    var fb=$('#fb');fb.className='feedback '+(ok?'good':'bad');
    fb.textContent=(ok?'Correct! ':'Not quite. ')+q.explain;
    $('#qb').textContent=Q.i+1>=N?'See my results':'Next question';$('#qb').focus();
  });
}
function plainOpt(q,o){return o;}
function showResults(){
  var N=Q.qs.length,pct=Math.round(Q.score/N*100);
  var best=store.get('kanji.best',{});var prev=best[lastSetup.type];
  if(prev==null||pct>prev){best[lastSetup.type]=pct;store.set('kanji.best',best);}
  var msg=pct>=85?'Excellent work!':pct>=60?'Good effort. A little more practice and you will have it.':'Keep going. Review the kanji below and try again.';
  var missed={};Q.miss.forEach(function(m){missed[m.q.d.k]=1;});
  var rows=Q.miss.map(function(m){var q=m.q;return '<tr><td>'+q.show+'</td><td lang="ja">'+esc(m.chosen)+'</td><td lang="ja">'+esc(q.ansText)+'</td></tr>';}).join('');
  main.innerHTML='<h1 id="qh" tabindex="-1">Your results</h1><p class="result-big">'+Q.score+' out of '+N+' ('+pct+'%)</p>'+
  '<div class="meter" role="img" aria-label="'+pct+' percent correct"><span style="width:'+pct+'%"></span></div><p>'+msg+'</p>'+
  (Q.miss.length?'<h2>Questions to review</h2><table><thead><tr><th scope="col">Question</th><th scope="col">Your answer</th><th scope="col">Correct answer</th></tr></thead><tbody>'+rows+'</tbody></table><h2>Go back to these kanji</h2><ul class="tiles" style="grid-template-columns:repeat(auto-fill,minmax(8rem,1fr))">'+Object.keys(missed).map(function(k){return '<li class="tile"><a href="#/kanji/'+encodeURIComponent(k)+'"><strong lang="ja">'+k+'</strong>'+esc(BY[k].label)+'</a></li>';}).join('')+'</ul>':'<p>You got every question right!</p>')+
  '<div class="btn-row"><button class="btn btn-primary" id="again" type="button">Try again</button><a class="btn btn-secondary" href="#/practice">Change quiz</a></div>';
  $('#qh').focus();say('Quiz finished. You scored '+Q.score+' out of '+N+'.');
  $('#again').addEventListener('click',startQuiz);
}

/* ---------- spot it ---------- */
var spotSet='all',R=null;
function spotPage(){
  return '<h1>Spot it</h1><p>Find the kanji hidden among look-alikes. Select every copy of the target kanji, then choose <strong>Check</strong>.</p>'+
  '<p class="hint">This game is mostly visual. If you use a screen reader, the quizzes in Practice are a better choice.</p>'+
  '<div class="form-grid"><div><label for="ss"><strong>Which kanji?</strong></label><br><select id="ss">'+setOptions(spotSet)+'</select></div></div>'+
  '<div class="btn-row"><button class="btn btn-secondary" id="newround" type="button">New round</button></div><div id="round"></div>';
}
function spotInit(){
  $('#ss').addEventListener('change',function(e){spotSet=e.target.value;newRound();});
  $('#newround').addEventListener('click',newRound);
  newRound();
}
function newRound(){
  var pool=poolFor(spotSet);
  if(!pool.length){$('#round').innerHTML='<p class="feedback bad">You have not marked any kanji as learned yet. Choose a different set.</p>';return;}
  var d=pick(pool),cnt=4+Math.floor(Math.random()*4),cells=[];
  for(var i=0;i<24;i++){var c;if(Math.random()<.8)c=pick(d.like);else{do{c=pick(K).k;}while(c===d.k);}cells.push(c);}
  var idx=shuffle(cells.map(function(_,i){return i;})).slice(0,cnt);idx.forEach(function(i){cells[i]=d.k;});
  R={d:d,cells:cells,sel:{},checked:false,count:cnt};renderRound();
  say('New round. Find '+cnt+' hidden copies of the target kanji.');
}
function renderRound(){
  var d=R.d;
  $('#round').innerHTML='<p>Target kanji: <span class="spot-target" lang="ja" role="img" aria-label="'+esc(d.k)+', meaning '+esc(d.label)+'">'+d.k+'</span> <span class="muted">('+esc(d.label)+')</span></p>'+
  '<p id="selcount" class="status" role="status">Selected: 0</p>'+
  '<div class="spot-grid" role="group" aria-label="Choose every copy of '+esc(d.k)+'">'+R.cells.map(function(c,i){return '<button type="button" class="spot-cell" data-i="'+i+'" aria-pressed="false" lang="ja" aria-label="Square '+(i+1)+': '+esc(c)+'">'+c+'</button>';}).join('')+'</div>'+
  '<div class="btn-row"><button class="btn btn-primary" id="spotcheck" type="button">Check</button></div><div id="spotfb" role="status" aria-live="polite"></div>';
  $$('.spot-cell').forEach(function(b){b.addEventListener('click',function(){
    if(R.checked)return;var i=b.getAttribute('data-i');
    if(R.sel[i]){delete R.sel[i];b.setAttribute('aria-pressed','false');}else{R.sel[i]=1;b.setAttribute('aria-pressed','true');}
    $('#selcount').textContent='Selected: '+Object.keys(R.sel).length;});});
  $('#spotcheck').addEventListener('click',function(){
    if(R.checked){newRound();return;}
    R.checked=true;var hit=0,wrong=0,miss=0;
    $$('.spot-cell').forEach(function(b){var i=b.getAttribute('data-i'),isT=R.cells[i]===d.k,s=!!R.sel[i];
      if(isT&&s){hit++;b.classList.add('right');b.insertAdjacentHTML('beforeend','<span class="mark" aria-hidden="true">✓</span>');b.setAttribute('aria-label',b.getAttribute('aria-label')+', found');}
      else if(isT){miss++;b.classList.add('wrong');b.insertAdjacentHTML('beforeend','<span class="mark" aria-hidden="true">!</span>');b.setAttribute('aria-label',b.getAttribute('aria-label')+', missed');}
      else if(s){wrong++;b.classList.add('wrong');b.insertAdjacentHTML('beforeend','<span class="mark" aria-hidden="true">✗</span>');b.setAttribute('aria-label',b.getAttribute('aria-label')+', selected by mistake');}
      b.disabled=true;});
    var m='You found '+hit+' of '+R.count+'.'+(wrong?' You selected '+wrong+' that '+(wrong===1?'was':'were')+' not '+d.k+'.':'')+(miss?' ✓ means found, ! means missed, ✗ means a wrong choice.':' Great job!');
    var fb=$('#spotfb');fb.className='feedback '+(hit===R.count&&!wrong?'good':'bad');fb.textContent=m;
    $('#spotcheck').textContent='Next round';$('#spotcheck').focus();
  });
}

/* ---------- print / about ---------- */
function printPage(){
  return '<h1>Print</h1><p>Download the printable kanji booklet. It has one page for each of the 200 kanji, with stroke order, writing boxes, example sentences and activities.</p>'+
  '<p><a class="btn btn-primary" href="downloads/Prescribed_Kanji_Booklet.pdf" download>Download the booklet (PDF)</a></p>'+
  '<p class="hint">To print a single kanji from this website, open its page and choose “Print this page”.</p>';
}
function aboutPage(){
  return '<h1>About and accessibility</h1>'+
  '<p>This website is designed for students learning Japanese. It is designed so every student can use it.</p>'+
  '<h2>Accessibility features</h2><ul>'+
  '<li><strong>Keyboard:</strong> everything can be used with the Tab, Shift+Tab, Enter, Space and arrow keys. A “Skip to main content” link appears when you press Tab.</li>'+
  '<li><strong>Screen readers:</strong> the pages use headings and landmarks. Pictures have text descriptions. Quiz results and game results are announced.</li>'+
  '<li><strong>Display settings:</strong> light, dark and high-contrast colours; text size up to 200%; an easy-read font and a dyslexia-friendly font; wider line and letter spacing.</li>'+
  '<li><strong>Furigana:</strong> turn the small hiragana above kanji on or off, and make it larger.</li>'+
  '<li><strong>Sound:</strong> every example word and sentence can be read aloud in Japanese, slowly or at normal speed. This uses a voice on your own device.</li>'+
  '<li><strong>Movement:</strong> the stroke-order animation can be turned off. Every step is also shown as still pictures.</li>'+
  '<li><strong>No pressure:</strong> there are no timers and no accounts.</li></ul>'+
  '<h2>Privacy</h2><p>This site does not collect or send any information. Your settings, the kanji you mark as learned and your best quiz scores are saved only in your own browser on this device.</p>'+
  '<h2>Something not working for you?</h2><p>Tell your Japanese teacher what is hard to use and what would help, and the site can be improved.</p>';
}
route();
})();
