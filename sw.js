/* Kanji Practice service worker: lets the site open with no signal.
   Core files are saved on the first visit. Slides, PDFs and other files are saved the first time they are opened.
   When online, the newest version is always fetched first. */
var CACHE='kanji-practice-v1';
var CORE=['./','index.html','css/style.css','js/data.js','js/app.js','js/qrcode.js','js/slides.js','manifest.webmanifest',
 'icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png',
 'fonts/atkinson-hyperlegible-latin-400-normal.woff2','fonts/atkinson-hyperlegible-latin-700-normal.woff2',
 'fonts/opendyslexic-latin-400-normal.woff2','fonts/opendyslexic-latin-700-normal.woff2'];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return Promise.all(CORE.map(function(u){return c.add(u).catch(function(){});}));}).then(function(){return self.skipWaiting();}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));
});
self.addEventListener('fetch',function(e){
  var r=e.request;
  if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith(
    fetch(r).then(function(res){
      if(res&&res.ok){var copy=res.clone();caches.open(CACHE).then(function(c){c.put(r,copy);});}
      return res;
    }).catch(function(){
      return caches.match(r,{ignoreSearch:true}).then(function(m){return m||(r.mode==='navigate'?caches.match('index.html'):Response.error());});
    })
  );
});
