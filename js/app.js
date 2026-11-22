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
var weak=store.get('kanji.weak',{});
function weakList(){return Object.keys(weak).filter(function(k){return BY[k];});}
function recordAnswer(k,ok){
  if(!BY[k])return;
  act.answered++;if(ok)act.correct++;markActive();
  if(!ok){weak[k]=2;}
  else if(weak[k]){weak[k]--;if(weak[k]<=0)delete weak[k];}
  store.set('kanji.weak',weak);
}
var learned=store.get('kanji.learned',{});
function isLearned(k){return !!learned[k];}
function setLearned(k,v){if(v){learned[k]=1;markActive();}else delete learned[k];store.set('kanji.learned',learned);if(v)checkBadges();}
function learnedCount(){return Object.keys(learned).filter(function(k){return BY[k];}).length;}

/* ---------- streaks and badges (saved only on this device) ---------- */
var act=Object.assign({days:[],answered:0,correct:0,quizzes:0,perfect:0,reads:{}},store.get('kanji.act',{}));
var earned=store.get('kanji.badges',{});
function saveAct(){store.set('kanji.act',act);}
function p2(n){return n<10?'0'+n:''+n;}
function todayStr(){var d=new Date();return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());}
function dayNum(s){var p=s.split('-');return Math.round(Date.UTC(+p[0],+p[1]-1,+p[2])/864e5);}
function markActive(){var t=todayStr();if(act.days.indexOf(t)<0){act.days.push(t);if(act.days.length>500)act.days=act.days.slice(-500);}saveAct();}
function streakInfo(){
  var set={};act.days.forEach(function(d){set[dayNum(d)]=1;});
  var t=dayNum(todayStr()),n=set[t]?t:t-1,c=0;while(set[n]){c++;n--;}
  var best=0,run=0,prev=null;Object.keys(set).map(Number).sort(function(a,b){return a-b;}).forEach(function(x){run=(prev!==null&&x===prev+1)?run+1:1;if(run>best)best=run;prev=x;});
  return {n:c,today:!!set[t],best:Math.max(best,c)};
}
function readsDone(){return Object.keys(act.reads).filter(function(k){return act.reads[k]>=0;}).length;}
var BADGES=[
 {id:'k1',name:'First kanji',desc:'Mark 1 kanji as learned.',ok:function(){return learnedCount()>=1;}},
 {id:'k10',name:'10 kanji learned',desc:'Mark 10 kanji as learned.',ok:function(){return learnedCount()>=10;}},
 {id:'k50',name:'50 kanji learned',desc:'Mark 50 kanji as learned.',ok:function(){return learnedCount()>=50;}},
 {id:'k100',name:'100 kanji learned',desc:'Mark 100 kanji as learned.',ok:function(){return learnedCount()>=100;}},
 {id:'k200',name:'All 200 kanji',desc:'Mark all 200 kanji as learned.',ok:function(){return learnedCount()>=200;}},
 {id:'s3',name:'3 days in a row',desc:'Practise on 3 days in a row.',ok:function(){return streakInfo().best>=3;}},
 {id:'s7',name:'7 days in a row',desc:'Practise on 7 days in a row.',ok:function(){return streakInfo().best>=7;}},
 {id:'s14',name:'14 days in a row',desc:'Practise on 14 days in a row.',ok:function(){return streakInfo().best>=14;}},
 {id:'q1',name:'First quiz',desc:'Finish a quiz.',ok:function(){return act.quizzes>=1;}},
 {id:'q10',name:'10 quizzes',desc:'Finish 10 quizzes.',ok:function(){return act.quizzes>=10;}},
 {id:'perfect',name:'Perfect score',desc:'Get every question right in a quiz of 5 or more questions.',ok:function(){return act.perfect>=1;}},
 {id:'c100',name:'100 correct answers',desc:'Answer 100 quiz questions correctly.',ok:function(){return act.correct>=100;}},
 {id:'r1',name:'First reading',desc:'Finish the questions on a reading passage.',ok:function(){return readsDone()>=1;}},
 {id:'rall',name:'Reading champion',desc:'Finish every reading passage.',ok:function(){return readsDone()>=window.READINGS.length;}}
];
var toastT=null;
function toast(msg){
  var t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';t.setAttribute('aria-hidden','true');document.body.appendChild(t);}
  t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){t.hidden=true;},7000);say(msg);
}
function checkBadges(){
  var fresh=[];
  BADGES.forEach(function(b){if(!earned[b.id]&&b.ok()){earned[b.id]=todayStr();fresh.push(b.name);}});
  if(fresh.length){store.set('kanji.badges',earned);toast('New badge: '+fresh.join(', ')+'! See My progress.');}
}
function progressPage(){
  var s=streakInfo(),n=learnedCount(),total=K.length,pct=Math.round(n/total*100);
  var msg=s.n===0?'Do a quiz, read a passage or mark a kanji as learned today to start your streak.':(s.today?'You have practised today. Come back tomorrow to keep it going.':'Do something today to keep your streak going.');
  var done=Object.keys(earned).filter(function(k){return BADGES.some(function(b){return b.id===k;});}).length;
  return '<h1>My progress</h1><p>Your streak, your badges and your totals. All of it is saved only on this device. Nothing is sent to anyone.</p>'+
  '<section class="streak-card" aria-labelledby="sh"><h2 id="sh">Streak</h2><p class="streak-big"><span aria-hidden="true">🔥</span> '+s.n+' '+(s.n===1?'day':'days')+' in a row</p><p>'+msg+'</p><p class="muted">Best streak: '+s.best+' '+(s.best===1?'day':'days')+'. Days practised in total: '+act.days.length+'.</p></section>'+
  '<h2>Totals</h2><ul class="stats"><li><strong>'+n+'</strong> of '+total+' kanji marked as learned<div class="meter" role="img" aria-label="'+pct+' percent of kanji learned"><span style="width:'+pct+'%"></span></div></li>'+
  '<li><strong>'+act.quizzes+'</strong> quizzes finished</li><li><strong>'+act.correct+'</strong> questions answered correctly (out of '+act.answered+')</li><li><strong>'+readsDone()+'</strong> of '+window.READINGS.length+' reading passages finished</li></ul>'+
  '<h2>Badges ('+done+' of '+BADGES.length+')</h2><ul class="badges">'+BADGES.map(function(b){var e=earned[b.id];
    return '<li class="badge'+(e?' got':'')+'"><span class="b-ico" aria-hidden="true">'+(e?'★':'🔒')+'</span><strong>'+esc(b.name)+'</strong><span>'+esc(b.desc)+'</span><em>'+(e?'Earned '+esc(e):'Not earned yet')+'</em></li>';}).join('')+'</ul>'+
  '<h2>Start again</h2><p>This clears your streak, badges and totals on this device. Your learned kanji and weak kanji are not changed.</p><p><button class="btn btn-secondary" id="preset" type="button">Reset streak and badges</button></p><p id="pstat" role="status"></p>';
}
function progressInit(){
  checkBadges();
  var b=$('#preset'),armed=false;
  b.addEventListener('click',function(){
    if(!armed){armed=true;b.textContent='Press again to confirm the reset';$('#pstat').textContent='Press the button again to clear your streak and badges.';return;}
    act={days:[],answered:0,correct:0,quizzes:0,perfect:0,reads:{}};earned={};saveAct();store.set('kanji.badges',earned);main.innerHTML=progressPage();progressInit();say('Streak and badges reset.');
  });
}

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
  var rawh=(location.hash||'#/').replace(/^#/,''),qi=rawh.indexOf('?');
  var params=new URLSearchParams(qi>=0?rawh.slice(qi+1):'');
  var h=decodeURIComponent(qi>=0?rawh.slice(0,qi):rawh);
  var parts=h.split('/').filter(Boolean);var page=parts[0]||'home';
  var html='',title='Kanji Practice',init=null;
  if(page==='learn'){html=learnPage();title='Learn';init=learnInit;}
  else if(page==='kanji'&&BY[parts[1]]){var d=BY[parts[1]];html=kanjiPage(d);title=d.k+' '+d.label;init=function(){kanjiInit(d);};}
  else if(page==='sheet'&&BY[parts[1]]){var sd=BY[parts[1]];html=sheetPage(sd);title='Practice sheet '+sd.k;}
  else if(page==='cards'){html=cardsPage();title='Flashcards';init=cardsInit;}
  else if(page==='practice'){html=practiceSetup();title='Practice';init=practiceInit;}
  else if(page==='read'&&parts[1]&&readById(parts[1])){var rp=readById(parts[1]);html=readPage(rp);title=rp.en;init=function(){readInit(rp);};}
  else if(page==='read'){html=readListPage();title='Reading';}
  else if(page==='progress'){html=progressPage();title='My progress';init=progressInit;}
  else if(page==='teacher'){html=teacherPage();title='Teacher tools';init=teacherInit;}
  else if(page==='quiz'){html='<p>Loading quiz…</p>';title='Quiz';init=function(){assignStart(params);};}
  else if(page==='test'){html=testPage(params);title=params.get('key')?'Test answer key':'Printable test';}
  else if(page==='spot'){html=spotPage();title='Spot it';init=spotInit;}
  else if(page==='resources'||page==='print'){html=resourcesPage();title='Resources';init=resourcesInit;page='resources';}
  else if(page==='about'){html=aboutPage();title='About and accessibility';init=function(){var w=$('#install-wrap');if(w&&deferredInstall){w.hidden=false;$('#install-btn').addEventListener('click',function(){deferredInstall.prompt();deferredInstall=null;w.hidden=true;});}};}
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
  return '<section class="hero"><div class="hero-kanji" lang="ja" aria-hidden="true">漢字</div><div><h1>Kanji Practice</h1><p>Learn the 200 prescribed kanji. See how each one is written, hear it, read example words and sentences, then test yourself.</p><p class="progress-line">You have marked '+n+' of '+K.length+' kanji as learned.</p>'+(streakInfo().n>0?'<p class="progress-line"><span aria-hidden="true">🔥</span> '+streakInfo().n+' '+(streakInfo().n===1?'day':'days')+' in a row. <a href="#/progress">See my badges</a></p>':'')+'</div></section>'+
  '<ul class="tiles">'+
  '<li class="tile"><a href="#/learn"><strong>Learn</strong>Open any kanji: readings, stroke order, example words and sentences.</a></li>'+
  '<li class="tile"><a href="#/practice"><strong>Practice</strong>Quizzes on readings, meanings and missing kanji. Marked for you.</a></li>'+
  '<li class="tile"><a href="#/read"><strong>Reading</strong>Short passages with tap-to-show furigana and questions.</a></li>'+
  '<li class="tile"><a href="#/progress"><strong>My progress</strong>Your streak and badges.</a></li>'+
  '<li class="tile"><a href="#/spot"><strong>Spot it</strong>Find the real kanji hidden among look-alikes.</a></li>'+
  '<li class="tile"><a href="#/resources"><strong>Resources</strong>Printable booklet and lesson slides.</a></li></ul>'+
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
  writeSection(d)+'<h2>Example words</h2><ul class="card-list">'+words+'</ul>'+
  '<h2>Example sentences</h2><ol class="card-list nums">'+sents+'</ol>'+
  ext+'<div class="btn-row no-print"><a class="btn btn-primary" href="#/sheet/'+encodeURIComponent(d.k)+'">Printable practice sheet</a><button type="button" class="btn btn-secondary" onclick="window.print()">Print this page</button></div>'+
  '<nav class="pager" aria-label="Previous and next kanji">'+(prev?'<a class="btn btn-secondary" href="#/kanji/'+encodeURIComponent(prev.k)+'" rel="prev">← <span lang="ja">'+prev.k+'</span>&nbsp;'+esc(prev.label)+'</a>':'<span></span>')+(next?'<a class="btn btn-secondary" href="#/kanji/'+encodeURIComponent(next.k)+'" rel="next">'+esc(next.label)+'&nbsp;<span lang="ja">'+next.k+'</span> →</a>':'<span></span>')+'</nav>';
}
function kanjiInit(d){
  writeInit(d);
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

function writeSection(d){
  return '<h2>Practise writing</h2><p>Draw the kanji in the box with your finger, a stylus or a mouse. Then compare it with the correct kanji.</p>'+
  '<div class="write-wrap"><div class="write-col"><div class="write-box" id="wbox"><svg class="write-guide" id="wguide" viewBox="0 0 109 109" aria-hidden="true" hidden>'+d.strokes.map(function(p){return '<path d="'+p+'"></path>';}).join('')+'</svg><canvas id="wcv" role="img" aria-label="Drawing area for writing the kanji '+esc(d.k)+'"></canvas></div>'+
  '<p id="wstat" class="status" role="status">Strokes drawn: 0</p>'+
  '<div class="btn-row"><button type="button" class="btn btn-secondary" id="wundo">Undo last stroke</button><button type="button" class="btn btn-secondary" id="wclear">Clear</button></div>'+
  '<label class="wtrace"><input type="checkbox" id="wtrace"> Show a faint guide to trace</label></div>'+
  '<div class="write-col"><div class="btn-row"><button type="button" class="btn btn-primary" id="wcompare">Compare with the correct kanji</button></div><div id="wresult" aria-live="polite"></div></div></div>'+
  '<p class="hint">Drawing needs a mouse, finger or stylus. If you cannot draw on this device, watch the stroke animation above and write on paper instead.</p>';
}
function writeInit(d){
  var cv=$('#wcv'),ctx=cv.getContext('2d'),strokes=[],cur=null,drawing=false;
  function size(){if(!document.body.contains(cv)){window.removeEventListener('resize',size);return;}var r=$('#wbox').getBoundingClientRect(),dpr=window.devicePixelRatio||1;cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.height*dpr);redraw();}
  function inkColor(){return getComputedStyle(document.documentElement).getPropertyValue('--ink').trim()||'#000';}
  function redraw(){
    ctx.clearRect(0,0,cv.width,cv.height);ctx.lineCap='round';ctx.lineJoin='round';
    ctx.lineWidth=Math.max(4,cv.width/28);ctx.strokeStyle=inkColor();
    strokes.forEach(function(st){ctx.beginPath();st.forEach(function(p,i){var x=p[0]*cv.width,y=p[1]*cv.height;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});if(st.length===1){ctx.lineTo(st[0][0]*cv.width+.1,st[0][1]*cv.height);}ctx.stroke();});
    $('#wstat').textContent='Strokes drawn: '+strokes.length;
  }
  function pt(e){var r=cv.getBoundingClientRect();return [Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))];}
  cv.addEventListener('pointerdown',function(e){e.preventDefault();cv.setPointerCapture(e.pointerId);drawing=true;cur=[pt(e)];strokes.push(cur);redraw();});
  cv.addEventListener('pointermove',function(e){if(!drawing)return;e.preventDefault();cur.push(pt(e));redraw();});
  function end(){drawing=false;cur=null;}
  cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
  $('#wundo').addEventListener('click',function(){strokes.pop();redraw();$('#wresult').innerHTML='';});
  $('#wclear').addEventListener('click',function(){strokes=[];redraw();$('#wresult').innerHTML='';say('Drawing cleared');});
  $('#wtrace').addEventListener('change',function(e){$('#wguide').hidden=!e.target.checked;});
  $('#wcompare').addEventListener('click',function(){
    var n=d.strokes.length,m=strokes.length;
    var msg=m===0?'Draw the kanji first, then compare.':m===n?'You drew '+m+' strokes, which is the right number.':'You drew '+m+' stroke'+(m===1?'':'s')+'. '+d.k+' has '+n+'. Check which stroke is missing or extra.';
    var svg='<svg class="write-model" viewBox="0 0 109 109" role="img" aria-label="Correct kanji '+esc(d.k)+' with numbered strokes"><path class="cross" d="M54.5 0V109M0 54.5H109" style="stroke-width:.6;stroke-dasharray:3 3"></path>'+d.strokes.map(function(p){return '<path d="'+p+'"></path>';}).join('')+d.strokes.map(function(p,i){var a=startOf(p);return '<text x="'+(a[0]-4)+'" y="'+(a[1]-1)+'">'+(i+1)+'</text>';}).join('')+'</svg>';
    $('#wresult').innerHTML='<p class="feedback '+(m===n?'good':'bad')+'">'+esc(msg)+'</p><p>Correct kanji, with stroke order:</p>'+svg+'<p class="hint">Check the shape, the order of the strokes and the direction each stroke goes. Choose <strong>Clear</strong> to try again.</p>';
  });
  window.addEventListener('resize',size);size();
}

/* ---------- printable practice sheet ---------- */
function gapRuby(d,s){
  return s.segs.map(function(g){
    if(g[0]==='R'&&g[1].indexOf(d.k)>=0){return g[1]===d.k?['T','（　　）']:['R',g[1].split(d.k).join('（　）'),g[2]];}
    if(g[0]==='T'&&g[1].indexOf(d.k)>=0)return ['T',g[1].split(d.k).join('（　　）')];
    return g;});
}
function sheetBoxes(d,nModel,total){
  var model='<svg viewBox="0 0 109 109" aria-hidden="true">'+d.strokes.map(function(p){return '<path d="'+p+'"></path>';}).join('')+'</svg>';
  var out='';for(var i=0;i<total;i++)out+='<span class="sh-box'+(i<nModel?' has-model':'')+'">'+(i<nModel?model:'')+'</span>';
  return out;
}
function sheetPage(d){
  var n=d.strokes.length,prev=K[d.i-1],next=K[d.i+1];
  var steps=d.strokes.map(function(s,i){
    var g=d.strokes.slice(0,i+1).map(function(p,j){return '<path'+(j===i?' class="now"':'')+' d="'+p+'"></path>';}).join('');
    return '<svg viewBox="0 0 109 109" aria-hidden="true">'+g+'</svg>';}).join('');
  var rows=d.words.slice(0,3).map(function(w){return {w:w.w,e:w.e};}).concat((d.ext||[]).slice(0,2).map(function(w){return {w:w.w,e:w.e,x:true};}));
  var wordRows=rows.map(function(r){return '<tr><td class="sh-w" lang="ja">'+esc(r.w)+(r.x?' <span class="sh-x">extension</span>':'')+'</td><td class="sh-line"></td><td class="sh-line"></td></tr>';}).join('');
  var sents=d.sents.slice(0,3).map(function(s,i){return '<li><span class="sh-s" lang="ja">'+ruby(gapRuby(d,s))+'</span><br><span class="sh-en">'+esc(s.eng)+'</span></li>';}).join('');
  return '<div class="no-print sheet-bar"><p><a href="#/kanji/'+encodeURIComponent(d.k)+'">← Back to the kanji page</a></p>'+
  '<h1>Practice sheet: '+esc(d.label)+'</h1><p>One A4 page, ready to print for homework or class. In the print window, choose <strong>A4</strong> and turn off “Headers and footers”.</p>'+
  '<div class="btn-row"><button type="button" class="btn btn-primary" onclick="window.print()">Print this sheet</button>'+
  (prev?'<a class="btn btn-secondary" href="#/sheet/'+encodeURIComponent(prev.k)+'">← <span lang="ja">'+prev.k+'</span></a>':'')+(next?'<a class="btn btn-secondary" href="#/sheet/'+encodeURIComponent(next.k)+'"><span lang="ja">'+next.k+'</span> →</a>':'')+'</div></div>'+
  '<article class="sheet" aria-label="Practice sheet for '+esc(d.k)+'">'+
  '<div class="sh-top"><div class="sh-kanji" lang="ja">'+d.k+'</div><div class="sh-info"><div class="sh-title">'+esc(d.label)+'</div>'+
  '<div>On’yomi: <b lang="ja">'+esc(d.on||'–')+'</b> &nbsp; Kun’yomi: <b lang="ja">'+esc(d.kun||'–')+'</b></div><div>'+n+' strokes · '+(d.active?'Active Use (read and write)':'Recognition Only (read)')+'</div></div></div>'+
  '<div class="sh-steps" aria-hidden="true">'+steps+'</div>'+
  (d.active?'<h2>1. Write the kanji</h2><div class="sh-boxes">'+sheetBoxes(d,4,20)+'</div>':'<h2>1. Look and trace</h2><div class="sh-boxes">'+sheetBoxes(d,10,10)+'</div>')+
  '<h2>2. Read and write</h2><table class="sh-table"><thead><tr><th scope="col">Word</th><th scope="col">Reading (hiragana)</th><th scope="col">Meaning (English)</th></tr></thead><tbody>'+wordRows+'</tbody></table>'+
  '<h2>3. '+(d.active?'Write the missing kanji':'Read each sentence')+'</h2><ol class="sh-sents">'+sents+'</ol>'+
  '<h2>4. My own sentence</h2><p class="sh-note">Write a sentence in Japanese or English that uses <span lang="ja">'+d.k+'</span> or one of the words above.</p><div class="sh-line big"></div><div class="sh-line big"></div>'+
  '</article>';
}

/* ---------- practice ---------- */
var TYPES={read:'Read it: choose the reading of a word',meaning:'Match it: choose the English meaning of a word',gap:'Write it: choose the missing kanji in a sentence',kanji:'Kanji meaning: choose the meaning of a kanji',listen:'Listening: hear a word, then choose the kanji or the meaning',ext:'Extension words: read or match harder words from the Stage 6 list',mix:'Mixed: a bit of everything',test:'Test prep: 20 mixed questions, answers shown at the end'};
var lastSetup={type:'read',set:'active',n:10};
var ALLX=[];K.forEach(function(d){(d.ext||[]).forEach(function(w){ALLX.push({w:w.w,r:kana(w.ruby),e:w.e,k:d.k});});});
var ALLW=[];K.forEach(function(d){d.words.forEach(function(w){ALLW.push({w:w.w,r:w.r,e:w.e,k:d.k});});});
function setOptions(sel){
  var o=[['weak','My weak kanji ('+weakList().length+')'],['all','All 200 kanji'],['active','Active Use (150)'],['recog','Recognition Only (50)'],['learned','Kanji I marked as learned']];
  CATS.forEach(function(c){o.push(['cat:'+c.name,c.name+' ('+c.part+')']);});
  return o.map(function(x){return '<option value="'+esc(x[0])+'"'+(sel===x[0]?' selected':'')+'>'+esc(x[1])+'</option>';}).join('');
}
function poolFor(set){
  if(set==='weak')return K.filter(function(d){return weak[d.k];});
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
  '<div><button class="btn btn-primary" type="submit">Start quiz</button></div></form>'+
  '<h2>Review my weak kanji</h2>'+(weakList().length?'<p>You have <strong>'+weakList().length+'</strong> kanji to review. Each one stays on this list until you answer it correctly twice.</p><p><button class="btn btn-secondary" id="weakgo" type="button">Practice my weak kanji</button></p>':'<p class="hint">Kanji you get wrong in a quiz are added here, so you can practise them again until they stick.</p>')+
  '<h2>Flashcards</h2><p><a class="btn btn-secondary" href="#/cards">Open flashcards</a></p><div id="quiz" aria-live="off"></div>';
}
function practiceInit(){
  var wg=$('#weakgo');if(wg)wg.addEventListener('click',function(){lastSetup={type:'mix',set:'weak',n:10};startQuiz();});
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
  if(type==='mix'||type==='test'){var ts=['read','meaning','gap','kanji'];if(d.ext&&d.ext.length)ts.push('ext');type=pick(ts);}
  var q={type:type,d:d},opts,ans;
  if(type==='ext'){var xw=pick(d.ext),xr=Math.random()<.5,w0={w:xw.w,r:kana(xw.ruby),e:xw.e};
    if(xr){ans=w0.r;opts=[ans].concat(distract(ALLX,ans,3,function(x){return x.r;},true));q.prompt='How do you read this word?';q.optHtml=function(o){return '<span class="jp" lang="ja">'+esc(o)+'</span>';};}
    else{ans=w0.e;opts=[ans].concat(distract(ALLX,ans,3,function(x){return x.e;},false));q.prompt='What does this word mean?';q.optHtml=function(o){return esc(o);};}
    q.show='<span lang="ja">'+esc(w0.w)+'</span>';q.explain=w0.w+' is read '+w0.r+' and means “'+w0.e+'”.';
    q.opts=shuffle(opts);q.ans=q.opts.indexOf(ans);q.ansText=ans;return q;}
  if(type==='listen'){
    var lw=pick(d.words),lk=Math.random()<.5,lpool=ALLW.filter(function(x){return x.r!==lw.r;});
    if(lk){ans=lw.w;opts=[ans].concat(distract(lpool,ans,3,function(x){return x.w;},true));q.prompt='Listen to the word. Which one did you hear?';q.optHtml=function(o){return '<span class="jp" lang="ja">'+esc(o)+'</span>';};}
    else{ans=lw.e;opts=[ans].concat(distract(lpool,ans,3,function(x){return x.e;},false));q.prompt='Listen to the word. What does it mean?';q.optHtml=function(o){return esc(o);};}
    q.show=hearBtn(lw.r,'the word');q.small=true;q.explain=lw.w+' is read '+lw.r+' and means “'+lw.e+'”.';
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
function startQuiz(a){
  var pool=poolFor(lastSetup.set);
  if(lastSetup.type==='ext')pool=pool.filter(function(d){return d.ext&&d.ext.length;});
  if(!pool.length){main.innerHTML=practiceSetup(lastSetup.type==='ext'?'No kanji in that set have extension words. Choose a different set.':(lastSetup.set==='weak'?'You have no weak kanji right now. Do a quiz first, and any kanji you miss will be added here.':'You have not marked any kanji as learned yet. Choose a different set, or mark some kanji on their pages.'));practiceInit();return;}
  var isTest=lastSetup.type==='test';var want=isTest?20:lastSetup.n;
  pool=shuffle(pool);var N=want;
  var qs=[];for(var i=0;i<N;i++){qs.push(buildQuestion(lastSetup.type,pool[i%pool.length]));}
  Q={qs:qs,i:0,score:0,miss:[],test:isTest,assign:(a&&a.title!==undefined)?a:null};showQuestion();
}
function showQuestion(){
  var q=Q.qs[Q.i],N=Q.qs.length,pct=Math.round(Q.i/N*100);
  main.innerHTML=(Q.assign&&Q.assign.title?'<p class="muted"><strong>'+esc(Q.assign.title)+'</strong></p>':'')+'<h1 id="qh" tabindex="-1">Question '+(Q.i+1)+' of '+N+'</h1>'+
  '<div class="meter" role="progressbar" aria-label="Quiz progress" aria-valuemin="0" aria-valuemax="'+N+'" aria-valuenow="'+Q.i+'"><span style="width:'+pct+'%"></span></div>'+
  '<form id="qf" class="q-card" novalidate><fieldset class="opts"><legend><span class="q-prompt">'+esc(q.prompt)+'</span><span class="q-show'+(q.small?' small':'')+'">'+q.show+'</span></legend>'+
  q.opts.map(function(o,j){return '<label><input type="radio" name="a" value="'+j+'"> <span>'+q.optHtml(o)+'</span></label>';}).join('')+
  '</fieldset>'+(Q.test?'<p class="hint">Test prep: your answers are shown at the end.</p>':'')+'<div class="btn-row"><button class="btn btn-primary" type="submit" id="qb">'+(Q.test?(Q.i+1>=N?'Finish test':'Next question'):'Check answer')+'</button><a class="btn btn-secondary" href="#/practice" id="qquit">Stop quiz</a></div><div id="fb" role="status" aria-live="polite"></div></form>';
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
    recordAnswer(q.d.k,ok);
    if(Q.test){Q.i++;if(Q.i>=N)showResults();else showQuestion();return;}
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
  var N=Q.qs.length,pct=Math.round(Q.score/N*100),score0=Q.score;
  act.quizzes++;if(pct===100&&N>=5)act.perfect++;markActive();checkBadges();
  var best=store.get('kanji.best',{});var prev=best[lastSetup.type];
  if(!Q.assign&&(prev==null||pct>prev)){best[lastSetup.type]=pct;store.set('kanji.best',best);}
  var msg=Q.test&&pct<60?'Keep going. Go back to the kanji below, then try another test.':pct>=85?'Excellent work!':pct>=60?'Good effort. A little more practice and you will have it.':'Keep going. Review the kanji below and try again.';
  var missed={};Q.miss.forEach(function(m){missed[m.q.d.k]=1;});
  var rows=Q.miss.map(function(m){var q=m.q;return '<tr><td>'+q.show+'</td><td lang="ja">'+esc(m.chosen)+'</td><td lang="ja">'+esc(q.ansText)+'</td></tr>';}).join('');
  main.innerHTML='<h1 id="qh" tabindex="-1">'+(Q.test?'Your test results':'Your results')+'</h1><p class="result-big">'+Q.score+' out of '+N+' ('+pct+'%)</p>'+
  '<div class="meter" role="img" aria-label="'+pct+' percent correct"><span style="width:'+pct+'%"></span></div><p>'+msg+'</p>'+
  (Q.miss.length?'<h2>Questions to review</h2><table><thead><tr><th scope="col">Question</th><th scope="col">Your answer</th><th scope="col">Correct answer</th></tr></thead><tbody>'+rows+'</tbody></table><h2>Go back to these kanji</h2><ul class="tiles" style="grid-template-columns:repeat(auto-fill,minmax(8rem,1fr))">'+Object.keys(missed).map(function(k){return '<li class="tile"><a href="#/kanji/'+encodeURIComponent(k)+'"><strong lang="ja">'+k+'</strong>'+esc(BY[k].label)+'</a></li>';}).join('')+'</ul>':'<p>You got every question right!</p>')+
  (Q.assign?'<h2>Send your result to your teacher</h2><p>This site does not send your score anywhere. Type your name, copy your result, then paste it where your teacher asked (email, class chat or your learning platform).</p><div class="form-grid"><div><label for="rname"><strong>Your name</strong></label><br><input id="rname" type="text" autocomplete="name"></div><div><button class="btn btn-secondary" id="rcopy" type="button">Copy my result</button></div></div><p id="rstat" role="status"></p>':'')+
  '<div class="btn-row"><button class="btn btn-primary" id="again" type="button">Try again</button><a class="btn btn-secondary" href="#/practice">More practice</a></div>';
  $('#qh').focus();say('Quiz finished. You scored '+Q.score+' out of '+N+'.');
  var asg=Q.assign;
  $('#again').addEventListener('click',function(){startQuiz(asg);});
  if(asg){var rc=$('#rcopy');rc.addEventListener('click',function(){
    var nm=$('#rname').value.trim()||'(no name)';
    var txt=nm+' | '+(asg.title||'Kanji quiz')+' | '+score0+' out of '+N+' ('+pct+'%) | '+new Date().toLocaleDateString();
    copyText(txt,$('#rname'),function(ok){$('#rstat').textContent=ok?'Copied: '+txt:'Could not copy automatically. Select and copy this text: '+txt;});});}
}

/* ---------- teacher tools: assignment links, printable test ---------- */
function copyText(txt,el,cb){
  function fallback(){var ta=document.createElement('textarea');ta.value=txt;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();var ok=false;try{ok=document.execCommand('copy');}catch(e){}document.body.removeChild(ta);cb(ok);}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){cb(true);},fallback);}else fallback();
}
function sharedSetOptions(sel){
  var o=[['all','All 200 kanji'],['active','Active Use (150)'],['recog','Recognition Only (50)']];
  CATS.forEach(function(c){o.push(['cat:'+c.name,c.name+' ('+c.part+')']);});
  return o.map(function(x){return '<option value="'+esc(x[0])+'"'+(sel===x[0]?' selected':'')+'>'+esc(x[1])+'</option>';}).join('');
}
function sharedSetOk(s){return s==='all'||s==='active'||s==='recog'||(s&&s.indexOf('cat:')===0&&CATS.some(function(c){return 'cat:'+c.name===s;}));}
function setLabel(s){var f=null;[['all','All 200 kanji'],['active','Active Use kanji'],['recog','Recognition Only kanji']].forEach(function(x){if(x[0]===s)f=x[1];});if(f)return f;return s.indexOf('cat:')===0?s.slice(4):'Selected kanji';}
function assignStart(p){
  var type=p.get('type'),set=p.get('set'),n=parseInt(p.get('n'),10);
  if(!TYPES[type])type='read';
  if(!sharedSetOk(set))set='active';
  if(!(n>=3&&n<=50))n=10;
  lastSetup={type:type,set:set,n:n};
  startQuiz({title:(p.get('title')||'').slice(0,80)});
}
function baseUrl(){return location.href.split('#')[0];}
function teacherPage(){
  return '<h1>Teacher tools</h1><p>Two tools for setting work. Nothing here needs an account, and nothing is stored on a server.</p>'+
  '<h2>1. Assignment link and QR code</h2><p>Choose a quiz. You get a link and a QR code. Students open it and land straight on that quiz, with no menus to get through.</p>'+
  '<form id="tform" class="form-grid" onsubmit="return false">'+
  '<div><label for="at"><strong>Title (shown to students)</strong></label><br><input id="at" type="text" maxlength="80" placeholder="Time kanji reading quiz" value="Kanji quiz"></div>'+
  '<div><label for="atype"><strong>Quiz type</strong></label><br><select id="atype">'+Object.keys(TYPES).map(function(t){return '<option value="'+t+'"'+(t==='read'?' selected':'')+'>'+esc(TYPES[t])+'</option>';}).join('')+'</select></div>'+
  '<div><label for="aset"><strong>Which kanji?</strong></label><br><select id="aset">'+sharedSetOptions('active')+'</select></div>'+
  '<div><label for="an"><strong>Number of questions</strong></label><br><select id="an">'+[5,10,15,20,30].map(function(n){return '<option'+(n===10?' selected':'')+'>'+n+'</option>';}).join('')+'</select></div></form>'+
  '<div id="aout" role="status" aria-live="polite"></div>'+
  '<p class="hint"><strong>About results:</strong> this site has no server, so you cannot see scores. At the end of the quiz, students can type their name and tap <strong>Copy my result</strong>, then paste it to you in email, class chat or your learning platform.</p>'+
  '<h2>2. Printable test with answer key</h2><p>Choose a kanji set and a length. You get an A4 test and a matching answer key, built from the same words and sentences as the site. Changing the version number gives a different set of questions, so you can make Version A and Version B.</p>'+
  '<form id="pform" class="form-grid" onsubmit="return false">'+
  '<div><label for="pt"><strong>Test title</strong></label><br><input id="pt" type="text" maxlength="80" value="Kanji Test"></div>'+
  '<div><label for="pset"><strong>Which kanji?</strong></label><br><select id="pset">'+sharedSetOptions('active')+'</select></div>'+
  '<div><label for="plen"><strong>Length</strong></label><br><select id="plen"><option value="15">Short (15 marks)</option><option value="30" selected>Standard (30 marks)</option><option value="45">Long (45 marks)</option></select></div>'+
  '<div><label for="pv"><strong>Version number</strong></label><br><input id="pv" type="number" min="1" max="999" value="1"></div></form>'+
  '<div class="btn-row"><a class="btn btn-primary" id="ptest" href="#/test">Open the test</a><a class="btn btn-secondary" id="pkey" href="#/test">Open the answer key</a></div>'+
  '<p class="hint">In the print window, choose <strong>A4</strong> and turn off “Headers and footers”. The answer key page has a web address anyone could open, so print it for yourself rather than sharing the link with students.</p>';
}
function teacherInit(){
  var qrObj=null;
  function link(){
    var p=new URLSearchParams();p.set('type',$('#atype').value);p.set('set',$('#aset').value);p.set('n',$('#an').value);var t=$('#at').value.trim();if(t)p.set('title',t);
    return baseUrl()+'#/quiz?'+p.toString();
  }
  function drawQr(cv,url,scale){
    var qr=qrcode(0,'M');qr.addData(url);qr.make();var n=qr.getModuleCount(),m=4;
    cv.width=cv.height=(n+m*2)*scale;var c=cv.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,cv.width,cv.height);c.fillStyle='#000';
    for(var r=0;r<n;r++)for(var col=0;col<n;col++)if(qr.isDark(r,col))c.fillRect((col+m)*scale,(r+m)*scale,scale,scale);
  }
  function renderA(){
    var url=link();qrObj=url;
    $('#aout').innerHTML='<div class="form-grid"><div><label for="alink"><strong>Link for students</strong></label><br><input id="alink" type="text" readonly value="'+esc(url)+'" style="width:100%"></div>'+
    '<div class="btn-row"><button type="button" class="btn btn-primary" id="acopy">Copy link</button><a class="btn btn-secondary" href="'+esc(url)+'" target="_blank" rel="noopener">Try the quiz</a></div><p id="astat" role="status"></p>'+
    '<div><canvas id="qrc" role="img" aria-label="QR code for the assignment link" style="width:220px;max-width:100%;height:auto;image-rendering:pixelated;background:#fff;border:1px solid #888"></canvas></div>'+
    '<div class="btn-row"><button type="button" class="btn btn-secondary" id="qrdl">Download QR code (PNG)</button></div></div>';
    try{drawQr($('#qrc'),url,6);}catch(e){$('#qrc').outerHTML='<p class="feedback bad">That link is too long for a QR code. Shorten the title.</p>';}
    $('#acopy').addEventListener('click',function(){copyText(url,null,function(ok){$('#astat').textContent=ok?'Link copied.':'Could not copy automatically. Select the link above and copy it.';});});
    $('#alink').addEventListener('focus',function(e){e.target.select();});
    $('#qrdl').addEventListener('click',function(){
      var cv=document.createElement('canvas');try{drawQr(cv,url,12);}catch(e){return;}
      cv.toBlob(function(b){var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='kanji-quiz-qr.png';document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(a.href);},1000);});
    });
  }
  function renderP(){
    var p=new URLSearchParams();p.set('set',$('#pset').value);p.set('len',$('#plen').value);p.set('v',String(Math.max(1,parseInt($('#pv').value,10)||1)));var t=$('#pt').value.trim();if(t)p.set('title',t);
    $('#ptest').setAttribute('href','#/test?'+p.toString());p.set('key','1');$('#pkey').setAttribute('href','#/test?'+p.toString());
  }
  $$('#tform input,#tform select').forEach(function(e){e.addEventListener('input',renderA);e.addEventListener('change',renderA);});
  $$('#pform input,#pform select').forEach(function(e){e.addEventListener('input',renderP);e.addEventListener('change',renderP);});
  renderA();renderP();
}
function hashSeed(str){var h=2166136261;for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function testPage(p){
  var set=p.get('set'),len=parseInt(p.get('len'),10),v=Math.max(1,parseInt(p.get('v'),10)||1),key=!!p.get('key'),title=(p.get('title')||'Kanji Test').slice(0,80);
  if(!sharedSetOk(set))set='active';if([15,30,45].indexOf(len)<0)len=30;
  var rnd=mulberry32(hashSeed(set+'|'+len+'|'+v));
  function rp(a){return a[Math.floor(rnd()*a.length)];}
  function rs(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(rnd()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
  var pool=poolFor(set).filter(function(d){return d.words&&d.words.length;});
  var act=pool.filter(function(d){return d.active&&d.sents&&d.sents.length;});
  var nA=Math.round(len*.4),nB=Math.floor(len*.3),nC=Math.round(len*.2),nD=len-nA-nB-nC;
  if(!act.length){nB+=nC;nC=0;}
  var order=rs(pool),oi=0,aord=rs(act),ai=0;
  function nextK(){var d=order[oi%order.length];oi++;return d;}
  function nextA(){var d=aord[ai%aord.length];ai++;return d;}
  var num=0;
  function li(show,ans){num++;return '<li class="t-item"><span class="t-n">'+num+'.</span><span class="t-w" lang="ja">'+show+'</span>'+(key?'<span class="t-ans">'+esc(ans)+'</span>':'<span class="t-line"></span>')+'</li>';}
  var secs=[];
  var a='';for(var i=0;i<nA;i++){var d=nextK(),w=rp(d.words);a+=li(esc(w.w),w.r);}
  secs.push(['A','Write the reading of each word in hiragana.',a,'t-grid']);
  var b='';for(i=0;i<nB;i++){d=nextK();w=rp(d.words);b+=li(esc(w.w),w.e);}
  secs.push(['B','Write the English meaning of each word.',b,'t-grid']);
  if(nC){var c='';for(i=0;i<nC;i++){d=nextA();var s=rp(d.sents);num++;
    c+='<li class="t-sent"><span class="t-n">'+num+'.</span><span class="t-s" lang="ja">'+ruby(gapRuby(d,s))+'</span><span class="t-box'+(key?' on':'')+'" lang="ja">'+(key?esc(d.k):'')+'</span><span class="t-en">'+esc(s.eng)+'</span></li>';}
    secs.push(['C','Write the missing kanji in each sentence.',c,'t-list']);}
  if(nD){var dd='';for(i=0;i<nD;i++){d=nextK();dd+=li(esc(d.k),d.label);}
    secs.push(['D','Write the English meaning of each kanji.',dd,'t-grid']);}
  var body=secs.map(function(x){return '<section class="t-sec"><h2>Part '+x[0]+': '+x[1]+'</h2><ol class="'+x[3]+'">'+x[2]+'</ol></section>';}).join('');
  var q=new URLSearchParams();q.set('set',set);q.set('len',String(len));q.set('v',String(v));q.set('title',title);
  var other='#/test?'+q.toString()+(key?'':'&key=1');
  var empty=!pool.length;
  return '<div class="no-print sheet-bar"><p><a href="#/teacher">← Back to teacher tools</a></p><h1>'+(key?'Answer key':'Printable test')+'</h1>'+
  '<p>One mark per question, '+len+' marks in total. In the print window, choose <strong>A4</strong> and turn off “Headers and footers”.</p>'+
  '<div class="btn-row"><button type="button" class="btn btn-primary" onclick="window.print()">Print '+(key?'the answer key':'this test')+'</button><a class="btn btn-secondary" href="'+esc(other)+'">'+(key?'Show the test':'Show the answer key')+'</a></div></div>'+
  (empty?'<p class="feedback bad">No kanji found for that set.</p>':
  '<article class="sheet test" aria-label="'+(key?'Answer key':'Test')+'"><div class="t-head"><div class="t-title">'+esc(title)+(key?' <span class="t-keytag">ANSWER KEY</span>':'')+'</div><div>'+esc(setLabel(set))+' · Version '+v+' · '+len+' marks</div>'+
  (key?'':'<div class="sh-meta"><span>Name <i></i></span><span>Class <i></i></span><span>Score <i></i>/ '+len+'</span></div>')+'</div>'+body+'</article>');
}

/* ---------- reading passages ---------- */
var LEVELS={1:'Level 1: short and simple',2:'Level 2: a little longer',3:'Level 3: connected sentences',4:'Level 4: longer passages (reasons, invitations, plans)',5:'Level 5: challenge (permission, advice, plain form)'};
function readById(id){var r=null;window.READINGS.forEach(function(x){if(x.id===id)r=x;});return r;}
function parseMk(str){
  var segs=[],re=/\{([^|}]+)\|([^}]+)\}/g,last=0,m;
  while((m=re.exec(str))){if(m.index>last)segs.push(['T',str.slice(last,m.index)]);segs.push(['R',m[1],m[2]]);last=re.lastIndex;}
  if(last<str.length)segs.push(['T',str.slice(last)]);return segs;
}
function passageKanji(r){var seen={},out=[];r.text.join('').replace(/\{([^|}]+)\|/g,'$1').split('').forEach(function(c){if(BY[c]&&!seen[c]){seen[c]=1;out.push(c);}});return out;}
function readListPage(){
  var html='<h1>Reading</h1><p>Short passages that use the prescribed kanji. Tap a kanji word to see how it is read. Then answer the questions to check that you understood.</p>';
  [1,2,3,4,5].forEach(function(l){
    var list=window.READINGS.filter(function(r){return r.level===l;});if(!list.length)return;
    html+='<h2>'+LEVELS[l]+'</h2><ul class="tiles">'+list.map(function(r){var best=act.reads[r.id];
      return '<li class="tile"><a href="#/read/'+r.id+'"><strong lang="ja">'+esc(r.jp)+'</strong>'+esc(r.en)+(best!=null?'<br><span class="muted">✓ Finished: '+best+' of '+r.qs.length+' correct</span>':'')+'</a></li>';}).join('')+'</ul>';
  });
  return html;
}
function readPage(r){
  function seg2(g){return g[0]==='R'?'<button type="button" class="rw" aria-label="'+esc(g[1])+', tap to show the reading" data-b="'+esc(g[1])+'" data-r="'+esc(g[2])+'"><ruby>'+esc(g[1])+'<rp>(</rp><rt>'+esc(g[2])+'</rt><rp>)</rp></ruby></button>':esc(g[1]);}
  function units(segs){var out=[],cur=null;segs.forEach(function(g){if(g[0]==='R'||!cur){cur=[];out.push(cur);}cur.push(g);});return out;}
  var paras=r.text.map(function(t){return '<p class="rp">'+(t.match(/[^。]+。?」?/g)||[t]).map(function(sn){return '<span class="sn">'+(sn.match(/[^、]+、?/g)||[sn]).map(function(ph){return units(parseMk(ph)).map(function(u){return '<span class="u'+(u.reduce(function(n,g){return n+g[1].length;},0)>8?' l':'')+'">'+u.map(seg2).join('')+'</span>';}).join('');}).join('')+'</span>';}).join('')+'</p>';}).join('');
  var kana0=r.text.map(function(t){return kana(parseMk(t));}).join('。').replace(/。。/g,'。');
  var ks=passageKanji(r);
  return '<p><a href="#/read">← All passages</a></p><h1>'+esc(r.en)+' <span class="muted" lang="ja" style="font-size:.7em">'+esc(r.jp)+'</span></h1><p class="muted">'+LEVELS[r.level]+'</p>'+
  '<div class="btn-row"><label class="chip"><input type="checkbox" id="allf"><span>Show all furigana</span></label>'+hearBtn(kana0,'the passage')+'</div>'+
  '<div class="read-text" id="rtext" lang="ja">'+paras+'</div>'+
  '<details class="tr"><summary>Show the English translation</summary>'+r.tr.map(function(t){return '<p>'+esc(t)+'</p>';}).join('')+'</details>'+
  '<h2>Questions</h2><form id="rq" novalidate>'+r.qs.map(function(q,i){return '<fieldset class="opts rqf"><legend><strong>'+(i+1)+'.</strong> '+esc(q.q)+'</legend>'+q.o.map(function(o,j){return '<label><input type="radio" name="q'+i+'" value="'+j+'"> <span>'+esc(o)+'</span></label>';}).join('')+'<p class="rfb" id="rfb'+i+'" role="status"></p></fieldset>';}).join('')+
  '<div class="btn-row"><button class="btn btn-primary" type="submit">Check my answers</button></div><div id="rres" role="status" aria-live="polite" tabindex="-1"></div></form>'+
  '<h2>Kanji in this passage</h2><ul class="chips-row">'+ks.map(function(k){return '<li><a class="btn btn-secondary" href="#/kanji/'+encodeURIComponent(k)+'" aria-label="'+esc(k)+', '+esc(BY[k].label)+'"><span lang="ja">'+k+'</span></a></li>';}).join('')+'</ul>';
}
function readInit(r){
  var box=$('#rtext');
  box.addEventListener('click',function(e){
    var b=e.target.closest('.rw');if(!b)return;var on=b.classList.toggle('on');
    b.setAttribute('aria-label',on?b.getAttribute('data-b')+', read as '+b.getAttribute('data-r')+', tap to hide':b.getAttribute('data-b')+', tap to show the reading');
  });
  $('#allf').addEventListener('change',function(e){box.classList.toggle('all',e.target.checked);});
  $('#rq').addEventListener('submit',function(e){
    e.preventDefault();var score=0,answered=0;
    r.qs.forEach(function(q,i){
      var c=$('input[name="q'+i+'"]:checked'),fb=$('#rfb'+i);
      $$('input[name="q'+i+'"]').forEach(function(x){x.parentNode.classList.remove('right','wrong');});
      if(!c){fb.className='rfb feedback bad';fb.textContent='No answer chosen.';return;}
      answered++;var ok=+c.value===q.a;if(ok)score++;
      c.parentNode.classList.add(ok?'right':'wrong');
      $$('input[name="q'+i+'"]')[q.a].parentNode.classList.add('right');
      fb.className='rfb feedback '+(ok?'good':'bad');fb.textContent=ok?'✓ Correct.':'✗ Not quite. The answer is: '+q.o[q.a]+'.';
    });
    var res=$('#rres');
    if(answered<r.qs.length){res.className='feedback bad';res.textContent='Answer all '+r.qs.length+' questions to finish. You can re-read the passage first.';res.focus();return;}
    res.className='feedback '+(score===r.qs.length?'good':'bad');
    res.textContent='You got '+score+' out of '+r.qs.length+'.'+(score===r.qs.length?' Excellent reading!':' Read the passage again, tap the kanji you were unsure about, then try once more.');
    if(act.reads[r.id]==null||score>act.reads[r.id])act.reads[r.id]=score;markActive();saveAct();checkBadges();res.focus();
  });
}

/* ---------- flashcards ---------- */
var cardSetup={deck:'kanji',set:'active'},C=null;
function cardsPage(msg){
  var decks=[['kanji','Kanji: see the kanji, recall the meaning'],['words','Example words: see the word, recall the reading and meaning'],['ext','Extension words: harder words from the Stage 6 list']];
  return '<h1>Flashcards</h1><p>See the front, say the answer to yourself, then flip the card. Choose <strong>Got it</strong> or <strong>Again</strong>. Cards marked Again come back until you get them.</p>'+
  (msg?'<p class="feedback bad" role="alert">'+esc(msg)+'</p>':'')+
  '<form id="csetup" class="form-grid"><fieldset><legend>Deck</legend>'+decks.map(function(d){return '<label><input type="radio" name="deck" value="'+d[0]+'"'+(cardSetup.deck===d[0]?' checked':'')+'> '+esc(d[1])+'</label>';}).join('')+'</fieldset>'+
  '<div><label for="cs"><strong>Which kanji?</strong></label><br><select id="cs">'+setOptions(cardSetup.set)+'</select></div>'+
  '<div><button class="btn btn-primary" type="submit">Start flashcards</button></div></form><div id="cwrap"></div>';
}
function cardsInit(){
  $('#csetup').addEventListener('submit',function(e){e.preventDefault();cardSetup={deck:$('input[name="deck"]:checked').value,set:$('#cs').value};startCards();});
}
function startCards(){
  var pool=poolFor(cardSetup.set),items=[];
  pool.forEach(function(d){
    if(cardSetup.deck==='kanji')items.push({k:d.k,f:'<span lang="ja">'+esc(d.k)+'</span>',fl:'The kanji '+d.k,b:esc(d.label),sub:'On’yomi: '+esc(d.on||'–')+' · Kun’yomi: '+esc(d.kun||'–'),say:null,big:true});
    else if(cardSetup.deck==='words')d.words.forEach(function(w){items.push({k:d.k,f:'<span lang="ja">'+esc(w.w)+'</span>',fl:w.w,b:esc(w.e),sub:'Reading: '+esc(w.r),say:w.r});});
    else (d.ext||[]).forEach(function(w){items.push({k:d.k,f:'<span lang="ja">'+esc(w.w)+'</span>',fl:w.w,b:esc(w.e),sub:'Reading: '+esc(kana(w.ruby)),say:kana(w.ruby)});});
  });
  if(!items.length){main.innerHTML=cardsPage(cardSetup.set==='weak'?'You have no weak kanji right now.':'No cards in that set. Choose a different one.');cardsInit();return;}
  C={q:shuffle(items),total:items.length,done:0,again:0,flipped:false};showCard();
}
function showCard(){
  var c=C.q[0];
  if(!c){
    main.innerHTML='<h1 id="ch" tabindex="-1">Flashcards finished</h1><p class="result-big">'+C.total+' cards done</p><p>You needed to see '+C.again+' card'+(C.again===1?'':'s')+' again.</p><div class="btn-row"><button class="btn btn-primary" id="cagain" type="button">Go again</button><a class="btn btn-secondary" href="#/cards">Change deck</a></div>';
    $('#ch').focus();say('Flashcards finished.');$('#cagain').addEventListener('click',startCards);return;
  }
  C.flipped=false;
  main.innerHTML='<h1 id="ch" tabindex="-1">Flashcards</h1><p class="status" role="status">Cards left: '+C.q.length+' of '+C.total+'</p>'+
  '<div class="fcard"><div class="fcard-front'+(c.big?' big':'')+'" aria-label="Front of card: '+esc(c.fl)+'">'+c.f+'</div>'+
  '<div class="fcard-back" id="cback" role="status" aria-live="polite" hidden></div></div>'+
  '<div class="btn-row"><button class="btn btn-primary" id="cflip" type="button">Show answer</button>'+
  '<button class="btn btn-secondary" id="cgot" type="button" hidden>✓ Got it</button><button class="btn btn-secondary" id="cagn" type="button" hidden>↺ Again</button>'+
  '<a class="btn btn-secondary" href="#/cards">Stop</a></div>';
  $('#ch').focus();
  $('#cflip').addEventListener('click',function(){
    var b=$('#cback');b.hidden=false;
    b.innerHTML='<span class="fb-main">'+c.b+'</span><span class="fb-sub">'+c.sub+'</span>'+(c.say?'<span class="hear-row">'+hearBtn(c.say,c.fl)+'</span>':'');
    this.hidden=true;$('#cgot').hidden=false;$('#cagn').hidden=false;$('#cgot').focus();
  });
  $('#cgot').addEventListener('click',function(){markActive();C.q.shift();C.done++;showCard();});
  $('#cagn').addEventListener('click',function(){C.q.shift();C.again++;C.q.splice(Math.min(3,C.q.length),0,c);showCard();});
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
function resourcesPage(){
  return '<h1>Resources</h1>'+
  '<h2>Printable booklet</h2><p>The kanji booklet has one page for each of the 200 kanji, with stroke order, writing boxes, example sentences and activities.</p>'+
  '<p><a class="btn btn-primary" href="downloads/Prescribed_Kanji_Booklet.pdf" download>Download the booklet (PDF)</a></p>'+
  '<p class="hint">To print one kanji from this website, open its page and choose “Print this page”.</p>'+
  '<h2>Use offline</h2><p>To use the slides and PDFs with no signal, save them to this device first. This downloads about 25 MB, so do it on Wi-Fi.</p>'+
  '<p><button type="button" class="btn btn-secondary" id="offline-btn">Save slides and PDFs for offline use</button></p><p id="offline-status" class="status" role="status"></p>'+
  '<h2>Teacher answer key</h2><p>Answers to the booklet activities.</p>'+
  '<p><a class="btn btn-secondary" href="downloads/Prescribed_Kanji_Booklet_Answer_Key.pdf" download>Download the answer key (PDF)</a></p>'+
  '<h2 id="slides-h">Lesson slides</h2><p>View the slides here. Use the buttons, or the left and right arrow keys, to move between slides.</p>'+
  '<div class="slideviewer" id="sv2" role="group" aria-labelledby="slides-h" tabindex="0">'+
  '<div class="slide-frame"><img id="slimg" alt="" width="1280" height="720"></div>'+
  '<div class="btn-row slide-ctrl"><button type="button" class="btn btn-secondary" id="sl-prev">← Previous</button>'+
  '<span id="sl-count" class="status" role="status" aria-live="polite"></span>'+
  '<button type="button" class="btn btn-secondary" id="sl-next">Next →</button><a class="btn btn-primary" id="sl-learn" href="#/learn" hidden>Learn this kanji</a>'+
  '<button type="button" class="btn btn-secondary" id="sl-fs" aria-pressed="false">Full screen</button><label for="sl-go" class="slide-go">Go to slide <input id="sl-go" type="number" min="1" value="1"></label></div>'+
  '<p id="sl-alt" class="hint"></p></div>';
}
function offlineInit(){
  var btn=$('#offline-btn'),st=$('#offline-status');
  if(!('serviceWorker' in navigator)||!window.caches){btn.hidden=true;st.textContent='Offline saving is not available in this browser.';return;}
  if(store.get('kanji.offlineSaved',false))st.textContent='Saved on this device. You can use the slides and PDFs with no signal.';
  btn.addEventListener('click',function(){
    if(!navigator.serviceWorker.controller){st.textContent='Not ready yet. Reload the page once, then try again.';return;}
    var urls=['downloads/Prescribed_Kanji_Booklet.pdf','downloads/Prescribed_Kanji_Booklet_Answer_Key.pdf','js/slides.js'];
    for(var n=1;n<=227;n++)urls.push('slides/'+('00'+n).slice(-3)+'.jpg');
    var done=0,fail=0,i=0;btn.disabled=true;
    function next(){
      if(i>=urls.length)return Promise.resolve();
      var u=urls[i++];
      return fetch(u).then(function(r){if(!r.ok)fail++;}).catch(function(){fail++;}).then(function(){done++;if(done%10===0||done===urls.length)st.textContent='Saving… '+done+' of '+urls.length;return next();});
    }
    st.textContent='Saving… 0 of '+urls.length;
    Promise.all([next(),next(),next(),next()]).then(function(){
      btn.disabled=false;
      if(fail){st.textContent='Saved most files, but '+fail+' did not download. Check your connection and try again.';}
      else{store.set('kanji.offlineSaved',true);st.textContent='Saved on this device. You can use the slides and PDFs with no signal.';say('Slides and PDFs saved for offline use.');}
    });
  });
}
function resourcesInit(){
  offlineInit();
  var N=227,i=parseInt((function(){try{return sessionStorage.getItem('kanji.slide');}catch(e){return null;}})(),10)||1,img=$('#slimg'),go=$('#sl-go');
  go.max=N;
  function pad(n){return ('00'+n).slice(-3);}
  function show(n,announce){
    i=Math.max(1,Math.min(N,n));
    img.src='slides/'+pad(i)+'.jpg';
    var alt=(window.SLIDE_ALTS&&window.SLIDE_ALTS[i-1])||'';
    img.alt='Slide '+i+' of '+N+(alt?': '+alt:'');
    $('#sl-alt').textContent=alt;
    $('#sl-count').textContent='Slide '+i+' of '+N;
    $('#sl-prev').disabled=i===1;$('#sl-next').disabled=i===N;go.value=i;
    try{sessionStorage.setItem('kanji.slide',i);}catch(e){}
    var kj=window.SLIDE_KANJI&&window.SLIDE_KANJI[i-1],lb=$('#sl-learn');
    if(kj){lb.hidden=false;lb.href='#/kanji/'+encodeURIComponent(kj);lb.setAttribute('aria-label','Learn the kanji '+kj+' on its own page');lb.innerHTML='Learn <span lang="ja">'+kj+'</span>';}else lb.hidden=true;
    var nx=new Image();if(i<N)nx.src='slides/'+pad(i+1)+'.jpg';
  }
  var sc=document.createElement('script');sc.src='js/slides.js';sc.onload=function(){show(i);};document.head.appendChild(sc);
  show(i);
  $('#sl-prev').addEventListener('click',function(){show(i-1);});
  $('#sl-next').addEventListener('click',function(){show(i+1);});
  go.addEventListener('change',function(){show(parseInt(go.value,10)||1);});
  var box=$('#sv2'),fsb=$('#sl-fs'),fake=false;
  function isFs(){return !!(document.fullscreenElement===box||fake);}
  function sync(){var on=isFs();fsb.textContent=on?'Exit full screen':'Full screen';fsb.setAttribute('aria-pressed',on?'true':'false');box.classList.toggle('is-fs',on);}
  function exitFs(){if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen();fake=false;sync();}
  fsb.addEventListener('click',function(){
    if(isFs()){exitFs();say('Exited full screen');return;}
    if(box.requestFullscreen){box.requestFullscreen().then(function(){sync();}).catch(function(){fake=true;sync();});}
    else{fake=true;sync();}
    box.focus();say('Full screen. Use the arrow keys to change slides. Press Escape to exit.');
  });
  document.addEventListener('fullscreenchange',function(){if(!document.fullscreenElement)fake=false;sync();});
  box.addEventListener('keydown',function(e){if(e.key==='Escape'&&fake){exitFs();}});
  $('#sv2').addEventListener('keydown',function(e){
    if(e.target===go)return;
    if(e.key==='ArrowRight'){e.preventDefault();show(i+1);}
    else if(e.key==='ArrowLeft'){e.preventDefault();show(i-1);}
  });
}
var deferredInstall=null;
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredInstall=e;var w=document.getElementById('install-wrap');if(w)w.hidden=false;});
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
  '<h2>Use it like an app</h2><p>You can add this website to your phone or tablet so it opens like an app. After you have opened it once with internet, the kanji pages, quizzes and flashcards also work with no signal. Slides and PDFs work offline only after you have opened them once.</p>'+
  '<ul><li><strong>iPhone or iPad (Safari):</strong> tap the Share button, then <strong>Add to Home Screen</strong>.</li><li><strong>Android (Chrome):</strong> tap the menu (three dots), then <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li><li><strong>Computer (Chrome or Edge):</strong> choose the install icon at the right of the address bar.</li></ul>'+
  '<p id="install-wrap" hidden><button type="button" class="btn btn-primary" id="install-btn">Install this app</button></p>'+
  '<h2>Privacy</h2><p>This site does not collect or send any information. Your settings, the kanji you mark as learned and your best quiz scores, your streak and your badges are saved only in your own browser on this device.</p>'+
  '<h2>Something not working for you?</h2><p>Tell your Japanese teacher what is hard to use and what would help, and the site can be improved.</p>';
}
route();
})();
