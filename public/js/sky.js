/* Baik · Qibla and prayer times. Shared by the app (/khayr) and the pages /qibla and /prayer-times.
   Needs esc, load, store, toast and LANG: the app defines them, the pages get them from /js/sky-base.js. */
(function(){
 var R=Math.PI/180, KA={la:21.4225,lo:39.8262};
 var CITIES=[
  ['Kuala Lumpur',3.1390,101.6869],['Putrajaya',2.9264,101.6964],['Shah Alam',3.0733,101.5185],
  ['Petaling Jaya',3.1073,101.6067],['Seremban',2.7297,101.9381],['Melaka',2.1896,102.2501],
  ['Johor Bahru',1.4927,103.7414],['Kuantan',3.8077,103.3260],['Kuala Terengganu',5.3302,103.1408],
  ['Kota Bharu',6.1254,102.2381],['Ipoh',4.5975,101.0901],['George Town',5.4141,100.3288],
  ['Alor Setar',6.1248,100.3678],['Kuching',1.5535,110.3593],['Kota Kinabalu',5.9804,116.0735],
  ['Singapore',1.3521,103.8198],['Bandar Seri Begawan',4.9031,114.9398],['Jakarta',-6.2088,106.8456],
  ['Bangkok',13.7563,100.5018],['Dubai',25.2048,55.2708],['Istanbul',41.0082,28.9784],
  ['Cairo',30.0444,31.2357],['London',51.5074,-0.1278],['New York',40.7128,-74.0060],
  ['Sydney',-33.8688,151.2093],['Makkah',21.4225,39.8262]
 ];

 var POS=null, QB=null, DIST=0, HEAD=null, MAG=false, OFF=0;
 var listening=false, hasReading=false, rose=0, sx=0, sy=0, seeded=false, sunTimer=null, watchdog=null;
 var EU=null, AOFF=null, stream=null, raf=null, HFOV=55;

 var $=function(id){return document.getElementById(id);};

 /* ---- 1 · the bearing. Great-circle initial bearing to the Kaaba. ---- */
 function bearing(la,lo){
  var p1=la*R, p2=KA.la*R, dl=(KA.lo-lo)*R;
  var y=Math.sin(dl), x=Math.cos(p1)*Math.tan(p2)-Math.sin(p1)*Math.cos(dl);
  return (Math.atan2(y,x)/R+360)%360;
 }
 function distKm(la,lo){
  var dp=(KA.la-la)*R, dl=(KA.lo-lo)*R;
  var a=Math.sin(dp/2)*Math.sin(dp/2)+Math.cos(la*R)*Math.cos(KA.la*R)*Math.sin(dl/2)*Math.sin(dl/2);
  return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
 }
 /* Solar azimuth, NOAA's short form. Good to a fraction of a degree, and it needs
    no sensor at all — this is the honest reference for true north. */
 function sun(la,lo,d){
  var n=d.getTime()/86400000+2440587.5-2451545.0;
  var L=(280.460+0.9856474*n)%360, g=((357.528+0.9856003*n)%360)*R;
  var lam=(L+1.915*Math.sin(g)+0.020*Math.sin(2*g))*R, eps=(23.439-0.0000004*n)*R;
  var ra=Math.atan2(Math.cos(eps)*Math.sin(lam),Math.cos(lam));
  var dec=Math.asin(Math.sin(eps)*Math.sin(lam));
  var gmst=(18.697374558+24.06570982441908*n)%24;
  var H=((gmst*15+lo)%360)*R-ra, p=la*R;
  var az=(Math.atan2(Math.sin(H),Math.cos(H)*Math.sin(p)-Math.tan(dec)*Math.cos(p))/R+180+360)%360;
  var alt=Math.asin(Math.sin(p)*Math.sin(dec)+Math.cos(p)*Math.cos(dec)*Math.cos(H))/R;
  /* dec and H come out for free and the prayer times need both */
  return {az:az,alt:alt,dec:dec/R,H:((H/R+540)%360)-180};
 }
 function diff(a,b){return ((a-b+540)%360)-180;}

 /* ================= prayer times =================
    Every prayer is the instant the sun reaches a stated altitude, so instead of a
    second solar implementation that could quietly disagree with the first, each
    time is found by bisecting the altitude curve computed above. Altitude climbs
    without interruption from solar midnight to solar noon and falls after it, so
    each half holds at most one crossing: bisection cannot land on the wrong root,
    and when a crossing does not exist — an angle the sun never reaches at that
    latitude in that season — it says so instead of inventing a time. */
 var METHODS={
  jakim:  ['JAKIM · Malaysia',20,18],
  mwl:    ['Muslim World League',18,17],
  egypt:  ['Egyptian General Authority',19.5,17.5],
  karachi:['Karachi · Univ. of Islamic Sciences',18,18],
  makkah: ['Umm al-Qura · Makkah',18.5,null]   /* Isha is Maghrib + 90 minutes */
 };
 var PT={m:'jakim',asr:1}, ptTimer=null;

 /* ---- official JAKIM times ----
    Calculation and JAKIM agree to a minute or two on everything except Subuh, where
    JAKIM sits about ten minutes later: their published Imsak is what a 20° depression
    gives, so their Subuh is not the 20° figure usually quoted for Malaysia. Rather
    than reverse-engineer an angle from one day's table, a Malaysian zone takes the
    official times straight from e-solat and keeps the calculation as the offline
    fallback. Everywhere else in the world, the calculation is the answer. */
 var ZONES=[
  ['JHR01','Pulau Aur dan Pulau Pemanggil'],['JHR02','Johor Bahru, Kota Tinggi, Mersing, Kulai'],
  ['JHR03','Kluang, Pontian'],['JHR04','Batu Pahat, Muar, Segamat, Gemas Johor, Tangkak'],
  ['KDH01','Kota Setar, Kubang Pasu, Pokok Sena'],['KDH02','Kuala Muda, Yan, Pendang'],
  ['KDH03','Padang Terap, Sik'],['KDH04','Baling'],
  ['KDH05','Bandar Baharu, Kulim'],['KDH06','Langkawi'],
  ['KDH07','Puncak Gunung Jerai'],['KTN01','Bachok, Kota Bharu, Machang, Pasir Mas, Pasir Puteh, Tanah Merah, Tumpat, Kuala Krai, Mukim Chiku'],
  ['KTN02','Gua Musang (Galas, Bertam), Jeli, Lojing'],['MLK01','Seluruh Negeri Melaka'],
  ['NGS01','Tampin, Jempol'],['NGS02','Jelebu, Kuala Pilah, Rembau'],
  ['NGS03','Port Dickson, Seremban'],['PHG01','Pulau Tioman'],
  ['PHG02','Kuantan, Pekan, Muadzam Shah'],['PHG03','Jerantut, Temerloh, Maran, Bera, Chenor, Jengka'],
  ['PHG04','Bentong, Lipis, Raub'],['PHG05','Genting Sempah, Janda Baik, Bukit Tinggi'],
  ['PHG06','Cameron Highlands, Genting Highlands, Bukit Fraser'],['PHG07','Rompin (Mukim Rompin, Endau, Pontian)'],
  ['PLS01','Kangar, Padang Besar, Arau'],['PNG01','Seluruh Negeri Pulau Pinang'],
  ['PRK01','Tapah, Slim River, Tanjung Malim'],['PRK02','Kuala Kangsar, Sg. Siput, Ipoh, Batu Gajah, Kampar'],
  ['PRK03','Lenggong, Pengkalan Hulu, Grik'],['PRK04','Temengor, Belum'],
  ['PRK05','Kg Gajah, Teluk Intan, Bagan Datuk, Seri Iskandar, Beruas, Parit, Lumut, Sitiawan, Pulau Pangkor'],['PRK06','Selama, Taiping, Bagan Serai, Parit Buntar'],
  ['PRK07','Bukit Larut'],['SBH01','Sandakan (Timur), Bukit Garam, Semawang, Temanggong, Tambisan, Sukau'],
  ['SBH02','Beluran, Telupid, Pinangah, Terusan, Kuamut, Sandakan (Barat)'],['SBH03','Lahad Datu, Silabukan, Kunak, Sahabat, Semporna, Tungku, Tawau (Timur)'],
  ['SBH04','Bandar Tawau, Balong, Merotai, Kalabakan, Tawau (Barat)'],['SBH05','Kudat, Kota Marudu, Pitas, Pulau Banggi'],
  ['SBH06','Gunung Kinabalu'],['SBH07','Kota Kinabalu, Ranau, Kota Belud, Tuaran, Penampang, Papar, Putatan'],
  ['SBH08','Pensiangan, Keningau, Tambunan, Nabawan, Pedalaman (Atas)'],['SBH09','Beaufort, Kuala Penyu, Sipitang, Tenom, Long Pasia, Membakut, Weston'],
  ['SGR01','Gombak, Petaling, Sepang, Hulu Langat, Hulu Selangor, Shah Alam'],['SGR02','Kuala Selangor, Sabak Bernam'],
  ['SGR03','Klang, Kuala Langat'],['SWK01','Limbang, Lawas, Sundar, Trusan'],
  ['SWK02','Miri, Niah, Bekenu, Sibuti, Marudi'],['SWK03','Pandan, Belaga, Suai, Tatau, Sebauh, Bintulu'],
  ['SWK04','Sibu, Mukah, Dalat, Song, Igan, Oya, Balingian, Kanowit, Kapit'],['SWK05','Sarikei, Matu, Julau, Rajang, Daro, Bintangor, Belawai'],
  ['SWK06','Lubok Antu, Sri Aman, Roban, Debak, Kabong, Lingga, Engkelili, Betong, Spaoh, Pusa, Saratok'],['SWK07','Serian, Simunjan, Samarahan, Sebuyau, Meludam'],
  ['SWK08','Kuching, Bau, Lundu, Sematan'],['SWK09','Zon Khas (Kampung Patarikan)'],
  ['TRG01','Kuala Terengganu, Marang, Kuala Nerus'],['TRG02','Besut, Setiu'],
  ['TRG03','Hulu Terengganu'],['TRG04','Dungun, Kemaman'],
  ['WLY01','Kuala Lumpur, Putrajaya'],['WLY02','Labuan']
 ];
 var ZST={JHR:'Johor',KDH:'Kedah',KTN:'Kelantan',MLK:'Melaka',NGS:'Negeri Sembilan',PHG:'Pahang',
  PLS:'Perlis',PNG:'Pulau Pinang',PRK:'Perak',SBH:'Sabah',SGR:'Selangor',SWK:'Sarawak',
  TRG:'Terengganu',WLY:'Wilayah Persekutuan'};
 /* [english, malay, api key, is a prayer] */
 /* One colour per prayer, taken from the sky at that hour: indigo before dawn, blue at Fajr,
    amber at sunrise, gold through the morning, a high clear blue at noon, warm again through
    the afternoon, rose at Maghrib, night indigo at Isha. It is a mnemonic, not decoration —
    a reader learns the ladder by its colour before they learn the names. Pitched at the same
    saturation as the deck's category hues so the sheet still belongs to the app. */
 var PTCOL={Imsak:'#444A7A',Fajr:'#4A5D96',Sunrise:'#9C5A18',Dhuha:'#836510',
  Dhuhr:'#2E7D8A',Asr:'#9C5227',Maghrib:'#9E4257',Isha:'#343C6B'};
 var OROWS=[['Imsak','Imsak','imsak',0],['Fajr','Subuh','fajr',1],['Sunrise','Syuruk','syuruk',0],
  ['Dhuha','Dhuha','dhuha',0],['Dhuhr','Zohor','dhuhr',1],['Asr','Asar','asr',1],
  ['Maghrib','Maghrib','maghrib',1],['Isha','Isyak','isha',1]];
 var PTZ='', OFFICIAL=null, fetching=false, lastTry=0, failed=false;
 /* the fetch callback redraws, and a redraw asks for a fetch — without a cooldown a
    failure would spin that into a tight retry loop on anyone who happens to be offline */
 function mayFetch(){return !fetching&&Date.now()-lastTry>60000;}

 /* the Malaysian calendar day, whatever the device clock is set to */
 function dayMY(off){
  return new Date(Date.now()+8*3600e3+(off||0)*864e5).toISOString().slice(0,10);
 }
 function todayMY(){return dayMY(0);}
 function mytStamp(hms,ymd){
  var p=ymd.split('-').map(Number), t=hms.split(':').map(Number);
  return Date.UTC(p[0],p[1]-1,p[2],t[0]-8,t[1]||0,t[2]||0);   /* MYT is UTC+8 */
 }
 /* e-solat dates come back as 05-Ogos-2026, so both spellings of the months are mapped */
 var MMON={jan:1,feb:2,mac:3,mar:3,apr:4,mei:5,may:5,jun:6,jul:7,ogo:8,aug:8,
  sep:9,okt:10,oct:10,nov:11,dis:12,dec:12};
 function parseMY(s){
  var p=String(s||'').split('-');
  if(p.length!==3)return '';
  var mon=MMON[p[1].toLowerCase().slice(0,3)];
  if(!mon)return '';
  return p[2]+'-'+(mon<10?'0':'')+mon+'-'+(p[0].length<2?'0'+p[0]:p[0]);
 }
 /* a week at a time: one request covers today, tomorrow's Subuh for the countdown,
    and six more days that keep the sheet right with no connection at all */
 function fetchZone(z,then){
  if(fetching)return;
  fetching=true;lastTry=Date.now();
  fetch('https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=week&zone='+encodeURIComponent(z))
   .then(function(r){return r.json();})
   .then(function(j){
    var list=j&&j.prayerTime;
    if(!list||!list.length)throw new Error('no times');
    var o={zone:z,days:{},hijri:{}};
    list.forEach(function(p,i){
     var ymd=parseMY(p.date)||dayMY(i);
     o.days[ymd]={};o.hijri[ymd]=p.hijri||'';
     OROWS.forEach(function(r){if(p[r[2]])o.days[ymd][r[2]]=mytStamp(p[r[2]],ymd);});
    });
    if(!o.days[todayMY()])throw new Error('nothing for today');
    OFFICIAL=o;store('baik.pt.'+z,o);
   })
   .then(function(){failed=false;},function(){failed=true;})
   .then(function(){fetching=false;if(then)then();});
 }
 function tomorrowFajr(){
  var d=OFFICIAL&&OFFICIAL.days&&OFFICIAL.days[dayMY(1)];
  return d?d.fajr:null;
 }

 function solarNoon(la,lo,day){
  var seed=new Date(day);seed.setHours(12,0,0,0);
  var a=seed.getTime()-6*3600e3, b=seed.getTime()+6*3600e3;   /* hour angle runs -90°..+90° here */
  for(var i=0;i<44;i++){var m=(a+b)/2;if(sun(la,lo,new Date(m)).H<0)a=m;else b=m;}
  return (a+b)/2;
 }
 function cross(la,lo,noon,target,before){
  var a=before?noon-12*3600e3:noon, b=before?noon:noon+12*3600e3;
  var fa=sun(la,lo,new Date(a)).alt-target, fb=sun(la,lo,new Date(b)).alt-target;
  if((fa<0)===(fb<0))return null;      /* the sun never reaches that angle today */
  for(var i=0;i<44;i++){
   var m=(a+b)/2, fm=sun(la,lo,new Date(m)).alt-target;
   if((fm<0)===(fa<0)){a=m;fa=fm;}else{b=m;}
  }
  return (a+b)/2;
 }
 function times(la,lo,day){
  var M=METHODS[PT.m]||METHODS.jakim, noon=solarNoon(la,lo,day);
  var dec=sun(la,lo,new Date(noon)).dec;
  /* Asr is when a shadow has grown by one object-length (two for the Hanafi ruling)
     beyond its shortest, which fixes the sun's altitude for that day and latitude */
  var asrAlt=Math.atan(1/(PT.asr+Math.tan(Math.abs(la-dec)*R)))/R;
  var set=cross(la,lo,noon,-0.833,false);
  return [
   ['Fajr','Subuh',cross(la,lo,noon,-M[1],true),1],
   ['Sunrise','Syuruk',cross(la,lo,noon,-0.833,true),0],
   ['Dhuhr','Zohor',noon,1],
   ['Asr','Asar',cross(la,lo,noon,asrAlt,false),1],
   ['Maghrib','Maghrib',set,1],
   ['Isha','Isyak',M[2]==null?(set==null?null:set+90*60e3):cross(la,lo,noon,-M[2],false),1]
  ];
 }
 function clock(ms){
  return new Date(ms).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
 }
 function hijri(d){
  try{return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',
   {day:'numeric',month:'long',year:'numeric'}).format(d);}catch(e){return '';}
 }
 var HMONTH=['Muharram','Safar','Rabiulawal','Rabiulakhir','Jamadilawal','Jamadilakhir',
  'Rejab','Syaaban','Ramadan','Syawal','Zulkaedah','Zulhijjah'];
 function hijriMY(s){   /* JAKIM hands back 1448-02-21 */
  var p=String(s||'').split('-');
  if(p.length!==3)return '';
  return +p[2]+' '+(HMONTH[+p[1]-1]||p[1])+' '+p[0];
 }
 function zoneName(z){
  for(var i=0;i<ZONES.length;i++)if(ZONES[i][0]===z)return ZONES[i][1];
  return '';
 }
 function ptLoc(){
  $('qptLoc').textContent=PTZ
   ?PTZ+' · '+zoneName(PTZ)
   :(POS?POS.label+' · '+POS.la.toFixed(3)+', '+POS.lo.toFixed(3)
      :(LANG==='bm'?'Pilih zon JAKIM anda, atau tetapkan lokasi.':'Pick your JAKIM zone, or set your location.'));
  /* a zone answers everything, so the position control stops pretending to matter */
  $('qptGeo').parentNode.style.display=PTZ?'none':'';
 }
 /* ---- the countdown ----
    Its own nodes, updated in place once a second. The list around it is rebuilt from
    innerHTML every half minute, and doing that to a running clock would restart the
    ring animation and close any dropdown the reader happened to be holding open. */
 var NEXT=null, tick=null, C=2*Math.PI*32, ROWS=null;
 function pad(n){return (n<10?'0':'')+n;}
 function arc(id,frac){
  $(id).setAttribute('stroke-dasharray',C.toFixed(2));
  $(id).setAttribute('stroke-dashoffset',(C*(1-Math.max(0,Math.min(1,frac)))).toFixed(2));
 }
 function drawCount(){
  var box=$('qtc');
  if(!NEXT||NEXT.ms==null){box.hidden=true;return;}
  box.hidden=false;
  var rem=NEXT.ms-Date.now();
  var bm=LANG==='bm';
  if(rem<=0){                       /* the time has come: roll the whole panel forward */
   box.classList.add('due');
   $('qtcH').textContent=$('qtcM').textContent=$('qtcS').textContent='00';
   arc('qtcAh',0);arc('qtcAm',0);arc('qtcAs',0);
   $('qtcFoot').textContent=bm?'Sudah masuk waktu '+NEXT.bm+'.':'It is time for '+NEXT.en+'.';
   if(rem>-90000)return;             /* leave it saying so for a minute and a half */
   drawTimes();return;
  }
  box.classList.remove('due');
  var t=Math.floor(rem/1000), h=Math.floor(t/3600), m=Math.floor(t/60)%60, s=t%60;
  $('qtcH').textContent=pad(h);$('qtcM').textContent=pad(m);$('qtcS').textContent=pad(s);
  arc('qtcAh',h/24);arc('qtcAm',m/60);arc('qtcAs',s/60);
  $('qtcName').innerHTML=esc(bm?NEXT.bm:NEXT.en)+(NEXT.bm&&NEXT.bm!==NEXT.en?'<em>'+esc(bm?NEXT.en:NEXT.bm)+'</em>':'');
  $('qtcTime').textContent=clock(NEXT.ms)+(NEXT.tomorrow?(bm?' esok':' tomorrow'):'');
  $('qtcFoot').textContent=PTZ?(bm?'Zon '+PTZ+' · waktu rasmi JAKIM':'Zone '+PTZ+' · official JAKIM time')
   :(bm?'Dikira untuk kedudukan anda':'Calculated for your position');
 }
 function zoneSel(){
  var out='<option value="">'+(LANG==='bm'?'Kira dari matahari · di mana-mana':'Calculate from the sun · anywhere')+'</option>', st='';
  ZONES.forEach(function(z){
   var s=ZST[z[0].slice(0,3)]||z[0].slice(0,3);
   if(s!==st){if(st)out+='</optgroup>';out+='<optgroup label="'+esc(s)+'">';st=s;}
   out+='<option value="'+z[0]+'"'+(z[0]===PTZ?' selected':'')+'>'+esc(z[0]+' · '+z[1])+'</option>';
  });
  return '<select id="qtZ" aria-label="Prayer time source">'+out+(st?'</optgroup>':'')+'</select>';
 }
 function drawTimes(){
  var box=$('qibTimes'), now=new Date(), h='', rows=null, official=false, stale=false;

  if(PTZ){
   if(!OFFICIAL||OFFICIAL.zone!==PTZ)OFFICIAL=load('baik.pt.'+PTZ,null);
   var today=OFFICIAL&&OFFICIAL.zone===PTZ&&OFFICIAL.days&&OFFICIAL.days[todayMY()];
   if(today){
    official=true;
    stale=!OFFICIAL.days[dayMY(1)];   /* the week is running out; top it up when we can */
    rows=OROWS.map(function(r){return [r[0],r[1],today[r[2]]==null?null:today[r[2]],r[3]];});
   }
  }
  var bm=LANG==='bm';
  if(!rows){
   if(!POS){
    box.innerHTML=(PTZ?'<div class="qt-note">'+(failed
      ?(bm?'Tidak dapat menghubungi e-solat.gov.my. Ia akan cuba lagi sebentar nanti, atau tetapkan lokasi anda di bawah dan aplikasi akan mengira waktunya sendiri.'
        :'Could not reach e-solat.gov.my. It will try again shortly, or set your location below '
       +'and the app will calculate the times itself.')
      :(bm?'Mengambil waktu rasmi…':'Fetching official times…'))+'</div>':'')
     +'<div class="qt-note">'+(bm
      ?'Waktu solat memerlukan zon JAKIM atau kedudukan anda. Pilih zon di bawah, atau guna butang itu.'
      :'Prayer times need either a JAKIM zone or your position. '
     +'Pick your zone below, or use the button.')+'</div>'+'<div class="qt-sel">'+zoneSel()+'</div>';
    if(PTZ&&mayFetch())fetchZone(PTZ,drawTimes);
    return;
   }
   rows=times(POS.la,POS.lo,now);
  }

  /* the next prayer, which may be tomorrow's Fajr once Isha has passed */
  var next=null,i;
  for(i=0;i<rows.length;i++)
   if(rows[i][3]&&rows[i][2]!=null&&rows[i][2]>now.getTime()){next=rows[i];break;}
  if(!next){
   var tm=official?tomorrowFajr():null;
   if(tm)next={0:'Fajr',1:'Subuh',2:tm,tomorrow:true};
   else if(POS){
    var t2=times(POS.la,POS.lo,new Date(now.getTime()+864e5));
    if(t2[0][2]!=null)next={0:t2[0][0],1:t2[0][1],2:t2[0][2],tomorrow:true};
   }
  }
  NEXT=next?{en:next[0],bm:next[1],ms:next[2],tomorrow:!!next.tomorrow}:null;
  ROWS=rows;
  drawCount();

  h+='<div class="qt-d">'+esc(now.toLocaleDateString(bm?'ms-MY':[],{weekday:'long',day:'numeric',month:'long',year:'numeric'}))
   +' · '+esc(official&&hijriMY(OFFICIAL.hijri[todayMY()])?hijriMY(OFFICIAL.hijri[todayMY()]):hijri(now))+'</div>';
  /* the countdown block above owns "what is next" — no need to say it twice */
  h+=rows.map(function(r){
   var on=next&&!next.tomorrow&&r[0]===next[0];
   var lead=bm?r[1]:r[0], tail=bm?r[0]:r[1];   /* the deck's language leads, the other trails */
   return '<div class="qt-row'+(on?' on':'')+(r[3]?'':' dim')+'" style="--pt:'+(PTCOL[r[0]]||'#6E6E6E')+'">'
    +'<span class="qt-n"><i class="qt-b"></i>'+esc(lead)+(tail===lead?'':'<em>'+esc(tail)+'</em>')+'</span>'
    +'<span class="qt-v">'+(r[2]==null?'—':esc(clock(r[2])))+'</span></div>';
  }).join('');

  h+='<div class="qt-sel">'+zoneSel()+'</div>';
  if(!official)
   h+='<div class="qt-sel"><select id="qtM" aria-label="Calculation method">'
    +Object.keys(METHODS).map(function(k){
      return '<option value="'+k+'"'+(k===PT.m?' selected':'')+'>'+esc(METHODS[k][0])+'</option>';}).join('')
    +'</select><select id="qtA" aria-label="Asr ruling">'
    +'<option value="1"'+(PT.asr===1?' selected':'')+'>'+(bm?'Asar · biasa':'Asr · standard')+'</option>'
    +'<option value="2"'+(PT.asr===2?' selected':'')+'>'+(bm?'Asar · Hanafi':'Asr · Hanafi')+'</option></select></div>';

  h+='<div class="qt-note">'+(official
   ?(bm
     ?'Waktu rasmi JAKIM untuk zon <b>'+esc(PTZ)+'</b>, diambil dari e-solat.gov.my dan disimpan '
      +'untuk kegunaan luar talian: seminggu disimpan pada satu masa, jadi helaian ini tetap berfungsi tanpa sambungan.'
      +(stale?' <b>Minggu yang disimpan hampir habis</b> dan aplikasi belum dapat menyegarkannya.':'')
     :'Official JAKIM times for zone <b>'+esc(PTZ)+'</b>, taken from e-solat.gov.my and kept for '
      +'offline use: a week is kept at a time, so the sheet still works with no connection.'
      +(stale?' <b>The saved week is running out</b> and the app has not been able to refresh it yet.':''))
   :(bm
     ?(PTZ?'<b>Tidak dapat menghubungi e-solat untuk zon '+esc(PTZ)+'</b>, jadi waktu ini dikira sebagai '
       +'sandaran dan Subuh khususnya akan tertera awal. ':'')
      +'Dikira dari matahari untuk kedudukan anda, luar talian. Ia sepakat dengan JAKIM dalam satu dua minit '
      +'pada setiap waktu kecuali Subuh, yang JAKIM terbitkan kira-kira sepuluh minit lewat daripada kiraan. '
      +'Jika anda di Malaysia, pilih zon JAKIM anda di atas dan aplikasi akan guna waktu rasmi. '
      +'Di mana dua sumber berbeza, pihak berkuasa setempat anda yang diikuti. Tarikh Hijrah ialah kiraan '
      +'Umm al-Qura dan rukyah setempat mungkin meletakkan harinya berbeza.'
     :(PTZ?'<b>Could not reach e-solat for zone '+esc(PTZ)+'</b>, so these are calculated as a '
       +'fallback and Subuh in particular will read early. ':'')
      +'Calculated from the sun for your exact position, offline. This agrees with JAKIM to a minute '
      +'or two on every time except Subuh, which JAKIM publishes about ten minutes later than the '
      +'calculation gives. If you are in Malaysia, pick your JAKIM zone above and the app will use '
      +'the official times instead. Where any two sources differ, your local authority is the one to '
      +'follow. The Hijri date is the Umm al-Qura calculation and a local sighting may place the day '
      +'differently.'))
   +' '+(bm
    ?'Halaman web ini tidak dapat membunyikan azan sendiri. Notifikasi azan datang bersama aplikasi natif.'
    :'This web page cannot sound the azan by itself. Azan notifications arrive with the native app.')
   +'</div>';
  box.innerHTML=h;

  if(PTZ&&(!official||stale)&&mayFetch())fetchZone(PTZ,drawTimes);
 }

 /* ---- the dial ---- */
 function ticks(){
  var g=$('qTicks'); if(!g||g.childNodes.length)return;
  var s='';
  for(var a=0;a<360;a+=5){
   var maj=a%45===0, r1=maj?76:81;
   var x1=100+r1*Math.sin(a*R), y1=100-r1*Math.cos(a*R);
   var x2=100+88*Math.sin(a*R), y2=100-88*Math.cos(a*R);
   s+='<line class="qr-tick'+(maj?' maj':'')+'" x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'"/>';
  }
  g.innerHTML=s;
 }
 function draw(){
  var el=$('qRose'), kb=$('qKaaba'); if(!el)return;
  /* unwrap the rotation so 359° to 1° is a nudge, not a full spin */
  var want=HEAD==null?0:-HEAD, q=QB==null?0:QB;
  rose+=diff(want,rose);
  el.setAttribute('transform','rotate('+rose.toFixed(2)+' 100 100)');
  kb.setAttribute('transform','rotate('+q.toFixed(2)+' 100 100)');
  /* the Kaaba stands upright however far the rose has turned */
  $('qKbR').setAttribute('transform','rotate('+(-(rose+q)).toFixed(2)+')');
  kb.style.opacity=QB==null?'.25':'1';

  $('qibDeg').textContent=QB==null?'—':QB.toFixed(1)+'°';
  var turn=$('qibTurn'), bm=LANG==='bm';
  turn.classList.remove('hit');
  if(QB==null){turn.textContent='';}
  else if(HEAD==null){turn.textContent=bm?'Tiada kompas: pegang dail supaya N menghadap utara sebenar.':'No compass: hold the dial so N faces true north.';}
  else{
   var d=diff(QB,HEAD);
   if(Math.abs(d)<=3){turn.textContent=bm?'Menghadap kiblat.':'Facing the qibla.';turn.classList.add('hit');}
   else turn.textContent=bm?'Pusing '+Math.round(Math.abs(d))+'° ke '+(d>0?'kanan':'kiri')+' anda'
    :'Turn '+Math.round(Math.abs(d))+'° to your '+(d>0?'right':'left');
  }
 }
 function meta(extra){
  var p=[], bm=LANG==='bm';
  if(POS)p.push(POS.label+' · '+POS.la.toFixed(3)+', '+POS.lo.toFixed(3));
  if(QB!=null&&DIST>0)p.push(Math.round(DIST).toLocaleString()+(bm?' km ke Makkah':' km to Makkah'));
  if(HEAD!=null)p.push(MAG?(bm?'Kompas membaca utara magnet, belum dibetulkan untuk deklinasi':'Compass reads magnetic north, not corrected for declination')
   :(bm?'Kompas membaca utara sebenar':'Compass reads true north'));
  if(extra)p.push(extra);
  $('qibMeta').innerHTML=p.length?p.map(esc).join('<br>'):(bm?'Tetapkan lokasi anda untuk dapatkan bearing.':'Set your location to get the bearing.');
 }

 /* ---- 2 · the position ---- */
 function setPos(la,lo,label,save){
  POS={la:la,lo:lo,label:label};
  DIST=distKm(la,lo);
  if(DIST<1){QB=null;draw();meta('You are at the Kaaba. There is no direction left to face.');ptLoc();drawTimes();return;}
  QB=bearing(la,lo);
  if(save!==false)store('baik.qibla',POS);
  draw();meta();
  if(!$('qibSun').hidden)drawSun();
  autoZone(la,lo);
  ptLoc();drawTimes();
 }
 /* one geolocation path, two sheets: the caller says where the words go */
 function geoTo(say,done,fail){
  var bm=LANG==='bm';
  function no(m){say(m);if(fail)fail();}
  if(!navigator.geolocation){no(bm?'Pelayar ini tiada geolokasi. Pilih bandar sebagai ganti.':'This browser has no geolocation. Pick a city instead.');return;}
  if(location.protocol==='file:'){no(bm?'Dibuka sebagai fail, jadi pelayar menyekat lokasi. Hidangkan folder melalui http, atau pilih bandar.':'Opened as a file, so the browser blocks location. Serve the folder over http, or pick a city.');return;}
  if(!window.isSecureContext){no(bm?'Lokasi memerlukan halaman selamat (https). Pilih bandar sebagai ganti.':'Location needs a secure (https) page. Pick a city instead.');return;}
  say(bm?'Meminta lokasi dari pelayar anda…':'Asking your browser for a location…');
  navigator.geolocation.getCurrentPosition(function(p){
   setPos(p.coords.latitude,p.coords.longitude,bm?'Lokasi anda':'Your location');
   if(done)done();
  },function(e){
   no(e.code===1
    ?(bm?'Lokasi ditolak. Bandar sudah cukup dekat: bearing dan waktu tidak banyak berubah merentasinya.'
      :'Location refused. A city is close enough: neither the bearing nor the times move much across one.')
    :(bm?'Lokasi tidak dapat diperoleh. Pilih bandar sebagai ganti.':'Could not get a location. Pick a city instead.'));
  },{enableHighAccuracy:true,timeout:12000,maximumAge:600000});
 }
 function geo(){
  geoTo(function(m){meta(m);},function(){
   cityList(false);   /* a real fix arrived, so the fallback stands down */
   toast('Location set. Qibla is '+(QB==null?'—':QB.toFixed(1)+'°')+' from true north.');
  },function(){cityList(true);});
 }
 function fillCities(id,after){
  var sel=$(id);
  sel.innerHTML='<option value="">Or pick a city…</option>'+CITIES.map(function(c,i){
   return '<option value="'+i+'">'+esc(c[0])+'</option>';}).join('');
  sel.addEventListener('change',function(){
   var c=CITIES[+this.value];if(!c)return;
   setPos(c[1],c[2],c[0]);
   if(after)after(c);
  });
 }

 /* ---- 3 · the heading ---- */
 function feed(h){
  h=(h+OFF+720)%360;
  var a=h*R;
  if(!seeded){sx=Math.cos(a);sy=Math.sin(a);seeded=true;}
  else{sx=sx*0.82+Math.cos(a)*0.18;sy=sy*0.82+Math.sin(a)*0.18;}
  HEAD=(Math.atan2(sy,sx)/R+360)%360;
 }
 function onOri(e){
  var h=null, ios=typeof e.webkitCompassHeading==='number'&&!isNaN(e.webkitCompassHeading);
  if(ios)h=e.webkitCompassHeading;                       /* iOS gives true north already */
  else if(e.absolute===true&&typeof e.alpha==='number'){ /* elsewhere: magnetic, and screen-rotation aware */
   var sa=0;try{sa=(screen.orientation&&screen.orientation.angle)||window.orientation||0;}catch(_){}
   h=(360-e.alpha+sa)%360;
  }
  if(h==null)return;
  MAG=!ios;
  /* keep the raw attitude too: the dial only needs a heading, but the camera view
     needs to know where the lens points, which is a different axis of the phone */
  if(typeof e.alpha==='number'&&typeof e.beta==='number'&&typeof e.gamma==='number'){
   EU={a:e.alpha,b:e.beta,g:e.gamma};
   /* iOS does not promise alpha is measured from north, so while the phone is
      near flat — the one pose where webkitCompassHeading is trustworthy — learn
      the constant offset between its alpha frame and true north, and carry it. */
   if(ios&&Math.abs(e.beta)<40){
    var t=att();
    if(t){AOFF=AOFF===null?diff(h,t.top):AOFF+diff(diff(h,t.top),AOFF)*0.25;}
   }
  }
  feed(h);draw();
  if(!hasReading){
   hasReading=true;clearTimeout(watchdog);
   $('qibComp').textContent='Compass on';$('qibComp').disabled=true;
   $('qibCam').hidden=!camOK();
   meta();   /* after the first feed, so the line can name what the compass reads */
  }
 }
 /* ---- attitude: the full rotation, not just a heading ----
    Z-X'-Y'' from the spec, mapping phone axes into east/north/up. The lens looks
    out of the back of the phone, which is device -Z; the top edge is device +Y. */
 function att(){
  if(!EU)return null;
  var a=EU.a*R,b=EU.b*R,g=EU.g*R;
  var cA=Math.cos(a),sA=Math.sin(a),cB=Math.cos(b),sB=Math.sin(b),cG=Math.cos(g),sG=Math.sin(g);
  var zx=cA*sG+cG*sA*sB, zy=sA*sG-cA*cG*sB, zz=cB*cG;   /* device +Z in world */
  var yx=-cB*sA, yy=cA*cB;                              /* device +Y in world */
  var vz=Math.max(-1,Math.min(1,-zz));
  return {
   az:(Math.atan2(-zx,-zy)/R+360)%360,   /* where the lens points */
   alt:Math.asin(vz)/R,                  /* how far above the horizon it looks */
   top:(Math.atan2(yx,yy)/R+360)%360,    /* where the top edge points */
   roll:EU.g
  };
 }
 function camOK(){
  return !!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&window.isSecureContext);
 }
 function attach(){
  if(listening)return;
  listening=true;
  window.addEventListener('deviceorientationabsolute',onOri,true);
  window.addEventListener('deviceorientation',onOri,true);
  watchdog=setTimeout(function(){
   if(!hasReading)meta(LANG==='bm'
    ?'Tiada bacaan kompas diterima. Peranti ini mungkin tiada magnetometer: guna matahari sebagai ganti.'
    :'No compass reading came through. This device likely has no magnetometer: use the sun instead.');
  },2500);
 }
 function detach(){
  if(!listening)return;
  listening=false;clearTimeout(watchdog);
  window.removeEventListener('deviceorientationabsolute',onOri,true);
  window.removeEventListener('deviceorientation',onOri,true);
 }
 function compass(){
  var D=window.DeviceOrientationEvent;
  if(!D){meta('This browser exposes no compass. Use the dial by hand, or the sun.');return;}
  if(typeof D.requestPermission==='function'){
   D.requestPermission().then(function(s){
    if(s==='granted')attach();else meta('Compass permission was refused. The bearing above still holds.');
   }).catch(function(){meta('The compass needs a secure (https) page.');});
  }else attach();
 }

 /* ---- the sun: a true-north reference no magnet can bend ---- */
 function drawSun(){
  var box=$('qibSun');
  if(!POS){box.innerHTML='Set a location first — the sun’s position depends on where you are.';return;}
  var s=sun(POS.la,POS.lo,new Date()), h='';
  if(s.alt<-0.5){
   h='<b>The sun is below the horizon</b> right now, so it cannot point north for you. '
    +'Its bearing is '+s.az.toFixed(0)+'°, which is only useful around sunrise or sunset.';
  }else{
   var t=diff(QB==null?0:QB,s.az);
   h='<b>The sun is at '+s.az.toFixed(0)+'° from true north</b>, '+s.alt.toFixed(0)+'° above the horizon. '
    +'A vertical stick casts its shadow towards '+((s.az+180)%360).toFixed(0)+'°.'
    +(QB==null?'':'<br><br>Face the sun, then turn <b>'+Math.abs(Math.round(t))+'° to your '+(t>0?'right':'left')+'</b>. That is the qibla.')
    +'<br><br>If your compass disagrees with this, the compass is wrong. Nudge it here:';
   h+='<div class="qib-nudge"><button type="button" data-off="-1" aria-label="Nudge left">−</button>'
    +'<span id="qOffV">'+(OFF>0?'+':'')+OFF+'°</span>'
    +'<button type="button" data-off="1" aria-label="Nudge right">+</button>'
    +'<button type="button" data-off="0" style="width:auto;padding:0 8px">reset</button></div>';
  }
  box.innerHTML=h;
 }

 /* ================= the camera view =================
    The lens sees roughly HFOV degrees across the screen, so a target that many
    degrees off-centre sits at the screen edge. A real lens is rectilinear, so the
    mapping is a tangent, not a straight proportion — that is what keeps the marker
    sitting on the right building when you sweep past it. The field of view is an
    assumption, though: no browser will tell us the true one. The marker is
    therefore approximate and the degrees underneath it are not. */
 function arMsg(t){var m=$('qcamMsg');m.hidden=!t;if(t)m.innerHTML=t;}
 /* .hidden is an HTMLElement property — an SVG element ignores it, so set the
    attribute itself and both kinds of node obey the same rule */
 function vis(id,on){var e=$(id);if(on)e.removeAttribute('hidden');else e.setAttribute('hidden','');}
 function bare(){   /* nothing pointed at anything: clear the whole overlay, not half of it */
  ['qcamMk','qcamHz','qcamBeam','qcamKm','qcamL','qcamR'].forEach(function(i){vis(i,false);});
 }
 function arFrame(){
  raf=requestAnimationFrame(arFrame);
  var box=$('qcam'), mk=$('qcamMk'), hz=$('qcamHz'), turn=$('qcamTurn'), sub=$('qcamSub');
  var t=att(), w=box.clientWidth, h=box.clientHeight;
  if(QB==null){arMsg('Set your location first — close this and press <b>Use my location</b>.');bare();return;}
  if(!t){arMsg(LANG==='bm'
   ?'Tiada bacaan kompas. Peranti ini tiada magnetometer, jadi kamera tidak tahu arah hadapnya.'
   :'No compass reading. This device has no magnetometer, so the camera cannot know which way it faces.');bare();return;}
  if(AOFF===null&&MAG===false){arMsg('Hold the phone flat for a moment so it can find north, then raise it again.');bare();return;}
  arMsg('');

  var az=(t.az+(AOFF||0)+OFF+720)%360;
  var d=diff(QB,az);                                  /* + is to your right */
  var hf=HFOV*R/2, vf=Math.atan(Math.tan(hf)*(h/w));  /* vertical follows from the aspect */
  var y=h/2+(Math.tan(t.alt*R)/Math.tan(vf))*(h/2);
  vis('qcamHz',true);hz.style.top=Math.max(-2,Math.min(h+2,y))+'px';

  var out=Math.abs(d)>HFOV/2;
  vis('qcamMk',true);
  mk.classList.toggle('off',out);
  var x=out?(d>0?w-30:30):w/2+(Math.tan(d*R)/Math.tan(hf))*(w/2);
  var my=Math.max(84,Math.min(h-120,y));
  mk.style.transform='translate('+x.toFixed(1)+'px,'+my.toFixed(1)+'px) translate(-50%,-100%)';
  vis('qcamL',out&&d<0);
  vis('qcamR',out&&d>0);
  $('qcamLbl').textContent=QB.toFixed(1)+'°';

  /* the ground path: apex at the marker, spreading to your feet at the bottom of
     the frame. Behind you it would be a lie, so past a quarter turn it goes away. */
  var km=$('qcamKm'), show=Math.abs(d)<=90;
  vis('qcamBeam',show);vis('qcamKm',show);
  if(show){
   var xb=w/2, bw=w*0.17;
   $('qcamBeamP').setAttribute('points',
    (x-4).toFixed(1)+','+my.toFixed(1)+' '+(x+4).toFixed(1)+','+my.toFixed(1)+' '+
    (xb+bw).toFixed(1)+','+h+' '+(xb-bw).toFixed(1)+','+h);
   var t=0.58;
   km.style.transform='translate('+(x+(xb-x)*t).toFixed(1)+'px,'+(my+(h-my)*t).toFixed(1)+'px) translate(-50%,-50%)';
   km.textContent=Math.round(DIST).toLocaleString()+' km';
  }

  turn.classList.toggle('hit',Math.abs(d)<=3);
  turn.textContent=Math.abs(d)<=3?'Facing the qibla.':'Turn '+Math.round(Math.abs(d))+'° to your '+(d>0?'right':'left');
  sub.textContent=(t.alt<-25?'Raise the phone towards the horizon. ':'')
   +'Qibla '+QB.toFixed(1)+'° · lens '+az.toFixed(0)+'°'+(MAG?' · magnetic':'');
 }
 function arOpen(){
  if(!camOK()){toast('The camera needs an https page.');return;}
  var box=$('qcam');
  box.classList.add('on');box.setAttribute('aria-hidden','false');
  $('qcamTurn').textContent='Starting the camera…';
  navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}}).then(function(s){
   stream=s;
   var v=$('qcamV');v.srcObject=s;
   var p=v.play();if(p&&p.catch)p.catch(function(){});
   cancelAnimationFrame(raf);arFrame();
  }).catch(function(e){
   arMsg(e&&e.name==='NotAllowedError'
    ?'Camera permission was refused. The dial behind this still works.'
    :'No camera could be opened here.');
   $('qcamTurn').textContent='';
  });
 }
 function arClose(){
  var box=$('qcam');
  box.classList.remove('on');box.setAttribute('aria-hidden','true');
  cancelAnimationFrame(raf);raf=null;
  if(stream){stream.getTracks().forEach(function(t){t.stop();});stream=null;}  /* let the lens go */
  $('qcamV').srcObject=null;
 }

 /* ---- the prayer times sheet, which stands on its own ---- */
 function ptOpen(){
  applyQlang();
  if(!POS){
   var saved=load('baik.qibla',null);
   if(saved&&typeof saved.la==='number')setPos(saved.la,saved.lo,saved.label||'Saved location',false);
  }
  $('qpt').classList.add('on');document.body.style.overflow='hidden';
  ptLoc();drawTimes();
  clearInterval(tick);tick=setInterval(drawCount,1000);
  clearInterval(ptTimer);
  ptTimer=setInterval(function(){   /* keeps the countdown honest, but never mid-choice */
   var a=document.activeElement;
   if(a&&a.closest&&a.closest('#qibTimes'))return;
   drawTimes();
  },30000);
 }
 function ptClose(){
  $('qpt').classList.remove('on');
  if(!($('spot')&&$('spot').classList.contains('on')))document.body.style.overflow='';
  clearInterval(ptTimer);ptTimer=null;
  clearInterval(tick);tick=null;
 }

 /* ---- open, close, wire ---- */
 function open(){
  ticks();applyQlang();
  $('qib').classList.add('on');
  document.body.style.overflow='hidden';
  if(!POS){
   var saved=load('baik.qibla',null);
   if(saved&&typeof saved.la==='number')setPos(saved.la,saved.lo,saved.label||'Saved location',false);
   else draw();
  }
  $('qibComp').hidden=!('DeviceOrientationEvent' in window);
  $('qibCam').hidden=!camOK();
  cityList(!POS);   /* nothing to go on yet: offer the fallback without being asked */
  compass();   /* the menu click is the user gesture iOS wants; attach() guards repeats */
  autoGeo();   /* ask for the position straight away; the button stays for a refresh */
 }
 /* Locate on open, without waiting for "Use my location". The browser still asks the reader
    the first time. Skipped when the reader chose a city by hand, or has blocked location
    (no point re-asking; the city list is shown instead). */
 function autoGeo(){
  if(!navigator.geolocation||!window.isSecureContext||location.protocol==='file:')return;
  var saved=load('baik.qibla',null);
  if(saved&&saved.label&&saved.label!=='Your location'&&saved.label!=='Lokasi anda'&&saved.label!=='Saved location')return;
  var go=function(){store('baik.ptzman',0);geo();};
  if(navigator.permissions&&navigator.permissions.query){
   navigator.permissions.query({name:'geolocation'}).then(function(s){if(s.state!=='denied')go();else cityList(true);}).catch(go);
  }else go();
 }
 function close(){
  arClose();
  $('qib').classList.remove('on');
  if(!($('spot')&&$('spot').classList.contains('on')))document.body.style.overflow='';
  /* the sensor stops with the sheet — no reason to keep a magnetometer awake */
  detach();clearInterval(sunTimer);sunTimer=null;
  hasReading=false;seeded=false;HEAD=null;
  var cb=$('qibComp');cb.textContent=LANG==='bm'?'Hidupkan kompas':'Turn on compass';cb.disabled=false;
 }

 OFF=+(load('baik.qoff',0)||0);
 var savedPT=load('baik.ptm',null);
 if(savedPT&&METHODS[savedPT.m])PT={m:savedPT.m,asr:savedPT.asr===2?2:1};
 PTZ=load('baik.ptz','')||'';
 if(PTZ&&!ZONES.some(function(z){return z[0]===PTZ;}))PTZ='';

 fillCities('qibCity',function(c){
  toast('Qibla from '+c[0]+' is '+(QB==null?'—':QB.toFixed(1)+'°')+'.');
 });
 function cityList(on){
  $('qibCityWrap').hidden=!on;
  $('qibCityB').setAttribute('aria-expanded',on?'true':'false');
  $('qibCityB').textContent=LANG==='bm'?(on?'Sembunyikan senarai bandar':'Tetapkan lokasi ikut bandar')
   :(on?'Hide the city list':'Set location by city');
 }
 $('qibCityB').addEventListener('click',function(){cityList($('qibCityWrap').hidden);});

 $('qibGeo').addEventListener('click',function(){store('baik.ptzman',0);geo();});
 $('qibComp').addEventListener('click',compass);
 $('qibCam').addEventListener('click',arOpen);
 $('qcamX').addEventListener('click',arClose);
 $('qibSunB').addEventListener('click',function(){
  var box=$('qibSun');
  box.hidden=!box.hidden;
  this.textContent=LANG==='bm'?(box.hidden?'Cari utara dengan matahari':'Sembunyikan matahari')
   :(box.hidden?'Find north by the sun':'Hide the sun');
  clearInterval(sunTimer);sunTimer=null;
  if(!box.hidden){drawSun();sunTimer=setInterval(drawSun,60000);}
 });
 $('qptGeo').addEventListener('click',function(){
  store('baik.ptzman',0);
  geoTo(function(m){$('qptLoc').textContent=m;});
 });
 $('qptX').addEventListener('click',ptClose);
 $('qpt').addEventListener('click',function(e){if(e.target===this)ptClose();});
 if($('qptBtn'))$('qptBtn').addEventListener('click',function(){location.href='/prayer-times';});
 $('qibTimes').addEventListener('change',function(e){
  var m=e.target.closest('#qtM'), a=e.target.closest('#qtA'), z=e.target.closest('#qtZ');
  if(z){PTZ=z.value;OFFICIAL=null;lastTry=0;store('baik.ptz',PTZ);store('baik.ptzman',1);ptLoc();}
  else if(m)PT.m=m.value;
  else if(a)PT.asr=+a.value;
  else return;
  store('baik.ptm',PT);drawTimes();
 });
 $('qibSun').addEventListener('click',function(e){
  var b=e.target.closest('button[data-off]'); if(!b)return;
  var d=+b.getAttribute('data-off');
  OFF=d===0?0:Math.max(-30,Math.min(30,OFF+d));
  store('baik.qoff',OFF);
  seeded=false;                   /* let the filter re-seed on the corrected heading */
  drawSun();draw();
 });
 $('qibX').addEventListener('click',close);
 $('qib').addEventListener('click',function(e){if(e.target===this)close();});
 document.addEventListener('keydown',function(e){
  if(e.key!=='Escape')return;
  if($('qcam').classList.contains('on'))arClose();      /* the camera closes before the sheet */
  else if($('qpt').classList.contains('on'))ptClose();
  else if($('qib').classList.contains('on'))close();
 });
 if($('qibBtn'))$('qibBtn').addEventListener('click',function(){location.href='/qibla';});
 /* ================= P0: surface, language, and the zone guess ================= */
 /* One reference point per JAKIM zone, its main town. Only used to GUESS the nearest
    zone from a location; the guess is named out loud and a manual pick always wins. */
 var ZONELL=[
  ['JHR01',2.45,104.52],['JHR02',1.4927,103.7414],['JHR03',2.0326,103.3169],['JHR04',1.8548,102.9325],
  ['KDH01',6.1248,100.3678],['KDH02',5.6497,100.4877],['KDH03',6.2536,100.6120],['KDH04',5.6779,100.9169],
  ['KDH05',5.3646,100.5615],['KDH06',6.3500,99.8000],['KDH07',5.7900,100.4300],
  ['KTN01',6.1254,102.2381],['KTN02',4.8823,101.9644],['MLK01',2.1896,102.2501],
  ['NGS01',2.4700,102.2300],['NGS02',2.7390,102.2480],['NGS03',2.7297,101.9381],
  ['PHG01',2.7900,104.1700],['PHG02',3.8077,103.3260],['PHG03',3.4506,102.4176],['PHG04',3.7900,101.8570],
  ['PHG05',3.3200,101.8700],['PHG06',4.4700,101.3800],['PHG07',2.7200,103.5000],
  ['PLS01',6.4414,100.1986],['PNG01',5.4141,100.3288],
  ['PRK01',4.1980,101.2600],['PRK02',4.5975,101.0901],['PRK03',5.4300,101.1200],['PRK04',5.4000,101.3500],
  ['PRK05',4.0259,101.0213],['PRK06',4.8500,100.7400],['PRK07',4.8630,100.7990],
  ['SBH01',5.8394,118.1172],['SBH02',5.9060,117.5100],['SBH03',5.0268,118.3270],['SBH04',4.2448,117.8911],
  ['SBH05',6.8837,116.8477],['SBH06',6.0754,116.5581],['SBH07',5.9804,116.0735],['SBH08',5.3378,116.1602],
  ['SBH09',5.3470,115.7450],
  ['SGR01',3.0733,101.5185],['SGR02',3.3400,101.2500],['SGR03',3.0449,101.4456],
  ['SWK01',4.7500,115.0000],['SWK02',4.3995,113.9914],['SWK03',3.1713,113.0419],['SWK04',2.2870,111.8300],
  ['SWK05',2.1264,111.5217],['SWK06',1.2370,111.4620],['SWK07',1.1670,110.5710],['SWK08',1.5535,110.3593],
  ['SWK09',4.8000,115.1000],
  ['TRG01',5.3302,103.1408],['TRG02',5.7333,102.4900],['TRG03',5.0720,103.0150],['TRG04',4.7566,103.4246],
  ['WLY01',3.1390,101.6869],['WLY02',5.2831,115.2308]
 ];
 function autoZone(la,lo){
  if(+load('baik.ptzman',0))return;                /* the reader chose; the guess stands down */
  if(la<0.8||la>7.6||lo<99.3||lo>119.5)return;     /* outside Malaysia the calculation is the answer */
  var best=null,bd=1e9;
  ZONELL.forEach(function(z){
   var dp=(z[1]-la)*R, dl=(z[2]-lo)*R;
   var a=Math.sin(dp/2)*Math.sin(dp/2)+Math.cos(la*R)*Math.cos(z[1]*R)*Math.sin(dl/2)*Math.sin(dl/2);
   var d=6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
   if(d<bd){bd=d;best=z[0];}
  });
  if(!best||best===PTZ)return;
  PTZ=best;OFFICIAL=null;lastTry=0;store('baik.ptz',PTZ);
  toast((LANG==='bm'?'Zon ':'Zone ')+best+' · '+zoneName(best)
   +(LANG==='bm'?' diagak dari lokasi anda. Tukar dalam senarai jika salah.'
     :' guessed from your location. Change it in the list if wrong.'));
 }
 /* ---- the masthead chip: the next prayer, glanceable without opening anything ---- */
 function chipDraw(){
  var c=$('npChip'); if(!c)return;
  if(!NEXT||NEXT.ms==null){c.hidden=true;return;}
  var rem=NEXT.ms-Date.now(), bm=LANG==='bm';
  if(rem<=-95000){drawTimes();return;}             /* rolls NEXT to the prayer after */
  c.hidden=false;
  $('npN').textContent=(bm?NEXT.bm:NEXT.en)+' '+clock(NEXT.ms);
  if(rem<=0){$('npC').textContent=bm?'sekarang':'now';return;}
  var t=Math.floor(rem/1000), hh=Math.floor(t/3600), m=Math.floor(t/60)%60, s=t%60;
  $('npC').textContent=(hh?hh+':':'')+pad(m)+':'+pad(s);
 }
 /* ---- the static sheet chrome, in whichever language the deck speaks ---- */
 function applyQlang(){
  var bm=LANG==='bm';
  function t(id,en,ms){var el=$(id);if(el)el.textContent=bm?ms:en;}
  t('qibK','Qibla','Kiblat');
  t('qibH','The direction of the Kaaba','Arah Kaabah');
  t('qibDegK','degrees from true north','darjah dari utara sebenar');
  t('qibGeo','Use my location','Guna lokasi saya');
  t('qibCam','Camera view','Pandangan kamera');
  t('qptK','Prayer times','Waktu solat');
  t('qptH','Today','Hari ini');
  t('qtcK','Next prayer','Solat seterusnya');
  t('qtcLh','Hours','Jam');t('qtcLm','Minutes','Minit');t('qtcLs','Seconds','Saat');
  t('qptGeo','Use my location','Guna lokasi saya');
  t('qibNote','A phone compass is a magnetometer: metal, speakers, cases and cars pull it off. Turn the phone in a slow figure of eight to settle it, and check it against the sun before you rely on it. The bearing itself is exact, only the compass needle is a guess.',
   'Kompas telefon ialah magnetometer: logam, pembesar suara, sarung dan kereta menariknya lari. Pusingkan telefon dalam bentuk lapan perlahan untuk menstabilkannya, dan semak dengan matahari sebelum bergantung padanya. Bearing itu sendiri tepat, hanya jarum kompas yang meneka.');
  var cb=$('qibComp'); if(cb&&!cb.disabled)cb.textContent=bm?'Hidupkan kompas':'Turn on compass';
  var cs=$('qibCity'); if(cs&&cs.options.length)cs.options[0].textContent=bm?'Atau pilih bandar…':'Or pick a city…';
  var sb=$('qibSunB'), sunOpen=!$('qibSun').hidden;
  if(sb)sb.textContent=bm?(sunOpen?'Sembunyikan matahari':'Cari utara dengan matahari')
   :(sunOpen?'Hide the sun':'Find north by the sun');
  cityList(!$('qibCityWrap').hidden);
 }
 window.qLang=function(){applyQlang();ptLoc();drawTimes();chipDraw();};

 /* boot: restore the saved location, feed the chip, and keep the day fresh */
 if(!POS){
  var sp0=load('baik.qibla',null);
  if(sp0&&typeof sp0.la==='number')setPos(sp0.la,sp0.lo,sp0.label||'Saved location',false);
 }
 applyQlang();
 if(PTZ&&!POS)drawTimes();                          /* a zone alone is enough for the chip */
 setInterval(chipDraw,1000);
 setInterval(function(){                            /* day rollover and week top-up, sheets closed */
  if(!$('qpt').classList.contains('on')&&!$('qib').classList.contains('on'))drawTimes();
 },600000);
 if($('npChip'))$('npChip').addEventListener('click',function(){location.href='/prayer-times';});

 /* The deck needs the clock the sheet already works out: which part of the day it is,
    and whether a prayer has just passed. Returns null until a zone or a position is set,
    and every caller must cope with that. */
 window.baikClock=function(){
  if(!ROWS)return null;
  var now=Date.now(), at={}, last=null;
  ROWS.forEach(function(r){
   if(r[2]==null)return;
   at[String(r[0]).toLowerCase()]=r[2];
   if(r[3]&&r[2]<=now&&(!last||r[2]>last.ms))last={en:r[0],bm:r[1],ms:r[2]};
  });
  var part='night';
  if(at.fajr!=null&&now<at.fajr)part='predawn';
  else if(at.maghrib!=null&&now>=at.maghrib)part='evening';
  else if(at.dhuhr!=null&&now>=at.dhuhr)part='day';
  else if(at.fajr!=null&&now>=at.fajr)part='morning';
  return {part:part,last:last,sinceLast:last?now-last.ms:null,friday:new Date().getDay()===5};
 };
 window.openQibla=open;
 window.openPrayerTimes=ptOpen;
 var STANDALONE=document.body.getAttribute('data-sky');
 if(STANDALONE){
  var home=function(){location.href='/khayr';};
  ['qibX','qptX'].forEach(function(id){var b=$(id);if(b){b.removeEventListener('click',close);b.removeEventListener('click',ptClose);b.addEventListener('click',home);b.setAttribute('aria-label','Back to Baik');}});
  if(STANDALONE==='qibla')open();else ptOpen();
 }
 /* the sky reads the day and the compass from here */
 window.baikSky={rows:function(){return ROWS;},next:function(){return NEXT;},compass:{start:compass,stop:detach,read:function(){return {head:HEAD,qibla:QB,pos:POS};}}};
})();
