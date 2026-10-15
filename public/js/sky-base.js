/* The few app helpers sky.js needs, for the standalone /qibla and /prayer-times pages. */
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];});}
function store(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function load(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}}
var LANG=load('baik.lang','en');
var _tq=[],_tbusy=false;
function toast(msg){_tq.push(msg);if(_tq.length>3)_tq=_tq.slice(-3);if(!_tbusy)_tnext();}
function _tnext(){var t=document.getElementById('toast');if(!t)return;
 if(!_tq.length){_tbusy=false;t.classList.remove('on');return;}
 _tbusy=true;t.textContent=_tq.shift();t.classList.add('on');setTimeout(function(){t.classList.remove('on');setTimeout(_tnext,260);},2600);}
/* signed out: to the sign-in page and back here (the same rule as the app) */
(function(){
 var root=document.documentElement;
 function show(){root.classList.remove('authwait');}
 if(!/^https?:$/.test(location.protocol)){show();return;}
 var local=/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
 function toLogin(){location.replace('/login?next='+encodeURIComponent(location.pathname+location.search));}
 var late=setTimeout(function(){local?show():toLogin();},8000);
 fetch('/api/auth/me',{cache:'no-store',credentials:'same-origin'}).then(function(r){
  clearTimeout(late);
  if(r.status===404&&local){show();return;}
  if(!r.ok){toLogin();return;}
  return r.json().then(function(d){if(d&&d.user)show();else toLogin();});
 }).catch(function(){clearTimeout(late);local?show():toLogin();});
})();
