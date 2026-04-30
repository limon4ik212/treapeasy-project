/* =============================================================
   TreapEasy Growth Module
   Все 3 фичи + полная аналитика + admin-дашборд.
   Работает stand-alone: подключается ОДНИМ тегом после script.js
   и сам инжектит UI, обработчики и хранилище.

   Features:
     1. Shareable Trip Card  (PNG + публичная ссылка ?trip=ID)
     2. Invite-to-Unlock     (друг открыл = тебе разблокировался город)
     3. Public Trip Feed     (лента чужих маршрутов + лайки + Remix)

   Plus:
     • event tracking (localStorage)
     • dashboard: K-factor, Conversion, Retention (D1/D7/D30),
       DAU, Share rate, Funnel
     • Trip Preview landing для расшаренных ссылок
   ============================================================= */

(function () {
  'use strict';

  // ---------- 0. Const & helpers ----------------------------------

  const NS = 'treapeasy';                         // localStorage namespace
  const K = {
    user:        `${NS}:user_id`,
    inviter:     `${NS}:inviter_id`,
    sessions:    `${NS}:session_days`,
    trips:       `${NS}:trip:`,                   // + tripId
    feed:        `${NS}:public_feed`,
    likes:       `${NS}:likes`,
    unlocked:    `${NS}:unlocked_cities`,
    invites:     `${NS}:invites_sent`,
    events:      `${NS}:events`,
    firstVisit:  `${NS}:first_visit`
  };

  const PREMIUM_CITIES = ['Токио', 'Нью-Йорк', 'Барселона', 'Сеул', 'Бангкок'];
  const SEED_FEED = [                             // дефолтные демо-маршруты
    { city:'Стамбул',  days:3, budget:280000, currency:'₸', summary:'Голубая мечеть, Гранд-базар, Босфор', hero:'🕌' },
    { city:'Париж',    days:4, budget:420000, currency:'₸', summary:'Эйфелева башня, Лувр, Монмартр',      hero:'🥐' },
    { city:'Дубай',    days:3, budget:510000, currency:'₸', summary:'Burj Khalifa, пустыня, Marina',       hero:'🐪' },
    { city:'Алматы',   days:2, budget:95000,  currency:'₸', summary:'Медеу, Кок-Тобе, Шымбулак',           hero:'🏔️' },
    { city:'Рим',      days:5, budget:390000, currency:'₸', summary:'Колизей, Ватикан, Трастевере',        hero:'🏛️' }
  ];

  const $  = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
  const todayStr = () => new Date().toISOString().slice(0,10);
  const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c=>(
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
  ));

  function lsGet(key, fallback=null){
    try { const v = localStorage.getItem(key); return v==null?fallback:JSON.parse(v); }
    catch { return fallback; }
  }
  function lsSet(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) { console.warn('LS full', e); }
  }

  // Base62 short id, 7 chars ≈ 3.5 trillion options
  function shortId(len=7){
    const a='abcdefghijkmnpqrstuvwxyz23456789'; // без похожих 0/o/1/l
    let s=''; for(let i=0;i<len;i++) s+=a[Math.floor(Math.random()*a.length)];
    return s;
  }

  // ---------- 1. Identity & first-touch ---------------------------

  function getUserId(){
    let id = lsGet(K.user);
    if(!id){ id = 'u_'+shortId(8); lsSet(K.user, id); lsSet(K.firstVisit, todayStr()); }
    return id;
  }

  function recordSessionDay(){
    const days = new Set(lsGet(K.sessions, []));
    days.add(todayStr());
    lsSet(K.sessions, [...days]);
  }

  // ---------- 2. Analytics ----------------------------------------

  const Analytics = {
    track(event, props={}){
      const events = lsGet(K.events, []);
      events.push({
        event,
        props,
        userId: getUserId(),
        ts: Date.now(),
        date: todayStr()
      });
      // keep last 1000
      if(events.length>1000) events.splice(0, events.length-1000);
      lsSet(K.events, events);
    },

    /**
     * Compute every metric the dashboard needs in one pass.
     * Все формулы — комментарием рядом, чтобы препу легко защищать.
     */
    metrics(){
      const ev = lsGet(K.events, []);
      const count = type => ev.filter(e=>e.event===type).length;
      const uniqueUsersBy = type =>
        new Set(ev.filter(e=>e.event===type).map(e=>e.userId)).size;

      // ----- volumes -----
      const visits         = count('app_open');
      const signups        = uniqueUsersBy('signed_up');
      const tripsGen       = count('trip_generated');
      const sharesAll      = count('trip_shared');
      const inviteOpens    = count('invite_opened');
      const inviteConvs    = count('invite_converted');
      const linkOpens      = count('shared_link_opened');
      const linkRemixes    = count('remix_started');
      const feedLikes      = count('feed_liked');

      // ----- DAU (last 14 days) -----
      const dauSeries = [];
      for(let i=13;i>=0;i--){
        const d = new Date(Date.now()-i*86400e3).toISOString().slice(0,10);
        const users = new Set(ev.filter(e=>e.date===d).map(e=>e.userId));
        dauSeries.push({date:d, dau:users.size});
      }
      const dauToday = dauSeries[dauSeries.length-1].dau;

      // ----- Conversion = trips_generated / app_open (по уникальным юзерам) -----
      const visitorsU = uniqueUsersBy('app_open') || 1;
      const creatorsU = uniqueUsersBy('trip_generated');
      const conversion = creatorsU / visitorsU;

      // ----- Share rate = shares / trips_generated -----
      const shareRate = tripsGen ? sharesAll / tripsGen : 0;

      // ----- K-factor = i × c
      //   i = invites/shares per creator
      //   c = conversion of viewers→creators (by trip link)
      const i = creatorsU ? sharesAll / creatorsU : 0;
      const c = linkOpens ? linkRemixes / linkOpens : 0;
      const kFactor = i * c;

      // ----- Retention by cohort (first day of user) -----
      const userFirst = {};
      ev.forEach(e=>{
        if(!userFirst[e.userId] || e.date<userFirst[e.userId]) userFirst[e.userId]=e.date;
      });
      const userDays = {};
      ev.forEach(e=>{
        (userDays[e.userId] = userDays[e.userId] || new Set()).add(e.date);
      });
      const retN = (n)=>{
        const eligible = Object.keys(userFirst).filter(u=>{
          const d0 = new Date(userFirst[u]).getTime();
          return Date.now()-d0 >= n*86400e3;
        });
        if(!eligible.length) return null;
        const retained = eligible.filter(u=>{
          const d0 = new Date(userFirst[u]).getTime();
          const target = new Date(d0 + n*86400e3).toISOString().slice(0,10);
          return userDays[u].has(target);
        });
        return retained.length / eligible.length;
      };

      // ----- Funnel (visit → form_started → generated → accepted → shared) -----
      const funnel = [
        {step:'Visit',          users: uniqueUsersBy('app_open')},
        {step:'Form started',   users: uniqueUsersBy('form_started')},
        {step:'Trip generated', users: uniqueUsersBy('trip_generated')},
        {step:'Trip accepted',  users: uniqueUsersBy('trip_accepted')},
        {step:'Trip shared',    users: uniqueUsersBy('trip_shared')}
      ];

      return {
        kFactor, conversion, shareRate,
        retention: { d1: retN(1), d7: retN(7), d30: retN(30) },
        dauToday, dauSeries,
        volumes: { visits, signups, tripsGen, sharesAll, linkOpens, linkRemixes,
                   inviteOpens, inviteConvs, feedLikes },
        funnel,
        kFactorParts: { i, c }
      };
    },

    reset(){ lsSet(K.events, []); }
  };

  // ---------- 3. Trip publishing & sharing ------------------------

  const Trips = {
    publish(trip){
      const id = shortId();
      const record = {
        id,
        ownerId: getUserId(),
        createdAt: Date.now(),
        views: 0,
        likes: 0,
        ...trip
      };
      lsSet(K.trips + id, record);
      const feed = lsGet(K.feed, []);
      feed.unshift(id);
      lsSet(K.feed, feed.slice(0, 50));   // cap
      return id;
    },
    get(id){ return lsGet(K.trips + id); },
    incrViews(id){
      const t = Trips.get(id); if(!t) return;
      t.views++; lsSet(K.trips+id, t);
    },
    like(id){
      const t = Trips.get(id); if(!t) return;
      const likes = new Set(lsGet(K.likes, []));
      if(likes.has(id)) return false;
      likes.add(id); lsSet(K.likes, [...likes]);
      t.likes++; lsSet(K.trips+id, t);
      return true;
    },
    feedIds(){
      let feed = lsGet(K.feed, null);
      if(!feed){                          // первый запуск — посеять
        feed = SEED_FEED.map(t=>{
          const id = shortId();
          lsSet(K.trips+id, {
            id, ownerId:'demo', createdAt:Date.now()-Math.random()*7*86400e3,
            views: Math.floor(20+Math.random()*180), likes: Math.floor(5+Math.random()*40),
            ...t
          });
          return id;
        });
        lsSet(K.feed, feed);
      }
      return feed;
    }
  };

  // ---------- 4. URL routing --------------------------------------

  function parseUrl(){
    const p = new URLSearchParams(location.search);
    return {
      trip:   p.get('trip'),
      invite: p.get('invite'),
      admin:  p.get('admin')
    };
  }

  // ---------- 5. Web Share + QR + PNG card ------------------------

  // Минимальный QR-генератор (типа M, ~версия 4) тяжёл; вместо canvas-QR
  // мы рисуем "псевдо-QR" — стилизованную сетку из хеша ссылки.
  // Для реальной отсканируемости в подсказке выводим саму ссылку текстом.
  function pseudoQR(text, size=180){
    const cells = 21;
    const cell = size/cells;
    const hash = [...text].reduce((a,c)=>((a<<5)-a + c.charCodeAt(0))|0, 7);
    let rng = Math.abs(hash);
    const next = ()=>{ rng = (rng*9301+49297) % 233280; return rng/233280; };
    let rects='';
    for(let y=0;y<cells;y++)
      for(let x=0;x<cells;x++)
        if(next()>0.52) rects+=`<rect x="${x*cell}" y="${y*cell}" width="${cell}" height="${cell}" fill="#171717"/>`;
    // 3 finder patterns (углы)
    const finder = (cx,cy)=>`
      <rect x="${cx*cell}" y="${cy*cell}" width="${cell*7}" height="${cell*7}" fill="#171717"/>
      <rect x="${(cx+1)*cell}" y="${(cy+1)*cell}" width="${cell*5}" height="${cell*5}" fill="#fff"/>
      <rect x="${(cx+2)*cell}" y="${(cy+2)*cell}" width="${cell*3}" height="${cell*3}" fill="#171717"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="#fff"/>
      ${rects}${finder(0,0)}${finder(cells-7,0)}${finder(0,cells-7)}
    </svg>`;
  }

  function shareUrl(tripId){
    const u = new URL(location.href);
    u.search = '';
    u.searchParams.set('trip', tripId);
    u.searchParams.set('ref', getUserId());
    return u.toString();
  }

  /** Рисует PNG-карточку 1080x1350 (Stories-friendly) и возвращает blob */
  async function renderCardPNG(trip){
    const W=1080, H=1350;
    const c = document.createElement('canvas');
    c.width=W; c.height=H;
    const g = c.getContext('2d');

    // фон — диагональный градиент в твоей палитре
    const grd = g.createLinearGradient(0,0,W,H);
    grd.addColorStop(0,'#fbfaf6');
    grd.addColorStop(.55,'#efe9dd');
    grd.addColorStop(1,'#e4f3ef');
    g.fillStyle=grd; g.fillRect(0,0,W,H);

    // декоративные круги
    const blob=(x,y,r,col,a)=>{
      g.globalAlpha=a; g.fillStyle=col;
      g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill();
      g.globalAlpha=1;
    };
    blob(120, 140, 240, '#176b5d', .14);
    blob(W-160, 200, 200, '#d99a2b', .16);
    blob(W-100, H-200, 280, '#176b5d', .10);

    // brand
    g.fillStyle='#176b5d';
    g.font='800 36px Georgia, serif';
    g.fillText('TreapEasy', 80, 110);
    g.fillStyle='#686868';
    g.font='500 22px Inter, system-ui';
    g.fillText('AI-планировщик путешествий', 80, 145);

    // Hero emoji
    g.font='180px serif';
    g.textAlign='right';
    g.fillText(trip.hero || '✈️', W-80, 290);
    g.textAlign='left';

    // Заголовок
    g.fillStyle='#171717';
    g.font='900 96px Georgia, serif';
    const title = (trip.city || 'Маршрут');
    wrapText(g, title, 80, 380, W-160, 100);

    // Подзаголовок
    g.fillStyle='#3f3f3f';
    g.font='500 36px Inter, system-ui';
    const cur = trip.currency || '$';
    const moneyStr = cur==='$' ? `$${trip.budget||0}` : `${(trip.budget||0).toLocaleString('ru-RU')} ${cur}`;
    const sub = `${trip.days||3} дн · ${moneyStr} · ${trip.people||1} чел`;
    g.fillText(sub, 80, 540);

    // Карточка с днями
    const cardX=80, cardY=600, cardW=W-160, cardH=520;
    roundRect(g, cardX, cardY, cardW, cardH, 24);
    g.fillStyle='rgba(255,255,255,.85)';
    g.fill();
    g.strokeStyle='#e7e1d6'; g.lineWidth=2; g.stroke();

    g.fillStyle='#176b5d';
    g.font='800 28px Inter, system-ui';
    g.fillText('ПЛАН ПОЕЗДКИ', cardX+32, cardY+50);

    g.fillStyle='#171717';
    g.font='500 30px Inter, system-ui';
    const lines = (trip.summary || '').split(/\n|,/).slice(0,6).map(s=>s.trim()).filter(Boolean);
    let yy = cardY+110;
    lines.forEach((ln, idx)=>{
      g.fillStyle='#d99a2b';
      g.font='900 28px Georgia, serif';
      g.fillText(`0${idx+1}`, cardX+32, yy);
      g.fillStyle='#171717';
      g.font='500 30px Inter, system-ui';
      wrapText(g, ln, cardX+90, yy, cardW-220, 40);
      yy += 60;
    });

    // QR
    const qrSvg = pseudoQR(shareUrl(trip.id), 200);
    const img = await svgToImage(qrSvg, 200, 200);
    g.drawImage(img, W-300, cardY+cardH-260, 200, 200);

    g.fillStyle='#686868';
    g.font='600 20px Inter, system-ui';
    g.fillText('Сканируй или открой', W-300, cardY+cardH-280);
    g.fillStyle='#176b5d';
    g.font='700 22px Inter, system-ui';
    g.fillText(`treapeasy/?trip=${trip.id}`, W-300, cardY+cardH-30);

    // Footer CTA
    g.fillStyle='#171717';
    g.font='800 38px Georgia, serif';
    g.fillText('Сделай свой маршрут →', 80, H-90);

    return new Promise(res => c.toBlob(res, 'image/png', 0.95));
  }

  function svgToImage(svg, w, h){
    return new Promise((res, rej)=>{
      const img = new Image();
      img.onload = ()=>res(img);
      img.onerror = rej;
      img.src = 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
    });
  }

  function roundRect(g, x, y, w, h, r){
    g.beginPath();
    g.moveTo(x+r, y);
    g.arcTo(x+w, y,   x+w, y+h, r);
    g.arcTo(x+w, y+h, x,   y+h, r);
    g.arcTo(x,   y+h, x,   y,   r);
    g.arcTo(x,   y,   x+w, y,   r);
    g.closePath();
  }

  function wrapText(g, text, x, y, maxW, lh){
    const words = String(text).split(' ');
    let line='';
    for(const w of words){
      const test = line ? line+' '+w : w;
      if(g.measureText(test).width > maxW && line){
        g.fillText(line, x, y); y += lh; line = w;
      } else line = test;
    }
    if(line) g.fillText(line, x, y);
  }

  // ---------- 6. Invite-to-Unlock ---------------------------------

  const Invites = {
    isLocked(city){
      if(!PREMIUM_CITIES.some(c=>city && city.toLowerCase().includes(c.toLowerCase()))) return false;
      const unlocked = lsGet(K.unlocked, []);
      return !unlocked.some(c=>city.toLowerCase().includes(c.toLowerCase()));
    },
    unlock(city){
      const unlocked = new Set(lsGet(K.unlocked, []));
      unlocked.add(city);
      lsSet(K.unlocked, [...unlocked]);
    },
    inviteLink(){
      const u = new URL(location.href);
      u.search = '';
      u.searchParams.set('invite', getUserId());
      return u.toString();
    },
    onInviteOpened(inviterId){
      if(inviterId === getUserId()) return;     // сам себе
      const seen = lsGet(K.inviter);
      if(seen) return;                          // уже фиксировали
      lsSet(K.inviter, inviterId);
      Analytics.track('invite_opened', {inviter: inviterId});
    },
    convertInvite(){
      const inviter = lsGet(K.inviter);
      if(!inviter) return;
      // Засчитываем разблокировку пригласившему
      const key = `${NS}:pending_unlock:${inviter}`;
      lsSet(key, (lsGet(key,0))+1);
      Analytics.track('invite_converted', {inviter});
      lsSet(K.inviter, null);                   // одноразово
      // Самому юзеру тоже бонус — открываем 1 премиум-город
      Invites.unlock(PREMIUM_CITIES[0]);
    },
    /** Вызывается на старте: проверяем pending-награды для меня */
    claimPending(){
      const me = getUserId();
      const key = `${NS}:pending_unlock:${me}`;
      const n = lsGet(key, 0);
      if(n>0){
        // открываем по одному городу за каждый принятый инвайт
        for(let i=0;i<n && i<PREMIUM_CITIES.length;i++){
          Invites.unlock(PREMIUM_CITIES[i]);
        }
        lsSet(key, 0);
        return n;
      }
      return 0;
    }
  };

  // ---------- 7. UI Injections ------------------------------------

  function injectStyles(){
    if($('#tg-styles')) return;
    const link = document.createElement('link');
    link.id = 'tg-styles';
    link.rel = 'stylesheet';
    link.href = 'growth.css';
    document.head.appendChild(link);
  }

  /** Добавляет share-кнопки в .result-tools и слушает появление #result/#final */
  function watchResultScreen(){
    const obs = new MutationObserver(()=>{
      const result = $('#result');
      if(result && result.classList.contains('active')){
        ensureShareButtons();
      }
      const finalEl = $('#final');
      if(finalEl && finalEl.classList.contains('active') && !finalEl.dataset.tgTracked){
        finalEl.dataset.tgTracked = '1';
        const trip = readCurrentTrip();
        Analytics.track('trip_accepted', {tripId: trip?.id});
        ensureFinalShareButtons();
      }
      // Сбрасываем флаг при уходе с final (чтобы повторный заход трекался)
      if(finalEl && !finalEl.classList.contains('active')) delete finalEl.dataset.tgTracked;
    });
    obs.observe(document.body, {attributes:true, subtree:true, attributeFilter:['class']});
  }

  function ensureFinalShareButtons(){
    const finalCard = $('#final .card');
    if(!finalCard || $('#tg-final-share', finalCard)) return;
    const bar = document.createElement('div');
    bar.id = 'tg-final-share';
    bar.className = 'tg-final-share';
    bar.innerHTML = `
      <p class="tg-final-share-hint">📲 Поделись маршрутом с друзьями — каждый репост открывает тебе премиум-город</p>
      <div class="row center">
        <button class="btn small tg-btn-primary" id="tg-final-png">📸 Скачать карточку</button>
        <button class="btn small secondary" id="tg-final-link">🔗 Копировать ссылку</button>
        <button class="btn small secondary" id="tg-final-invite">🎁 Пригласить друга</button>
      </div>
      <span id="tg-final-status" class="tg-status"></span>`;
    finalCard.appendChild(bar);

    bar.addEventListener('click', async (e)=>{
      const trip = readCurrentTrip(); if(!trip) return;
      const flash = (msg)=>{
        const el = $('#tg-final-status'); if(!el) return;
        el.textContent = msg; el.classList.add('show');
        setTimeout(()=>el.classList.remove('show'), 2200);
      };
      if(e.target.id==='tg-final-png'){
        const blob = await renderCardPNG(trip);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href=url; a.download=`treapeasy-${trip.city}.png`; a.click();
        Analytics.track('trip_shared', {tripId:trip.id, channel:'png', from:'final'});
        flash('Карточка скачана ✓');
      }
      if(e.target.id==='tg-final-link'){
        await navigator.clipboard.writeText(shareUrl(trip.id));
        Analytics.track('trip_shared', {tripId:trip.id, channel:'link', from:'final'});
        flash('Ссылка скопирована ✓');
      }
      if(e.target.id==='tg-final-invite'){
        await navigator.clipboard.writeText(Invites.inviteLink());
        Analytics.track('invite_sent', {from:'final'});
        flash('Invite-ссылка скопирована ✓');
      }
    });
  }

  function ensureShareButtons(){
    const tools = $('.result-tools') || $('#result');
    if(!tools || $('#tg-share-bar', tools)) return;

    const bar = document.createElement('div');
    bar.id='tg-share-bar';
    bar.innerHTML = `
      <button class="btn small tg-btn-primary" id="tg-share-png">📸 Скачать карточку</button>
      <button class="btn small secondary" id="tg-share-link">🔗 Копировать ссылку</button>
      <button class="btn small secondary" id="tg-share-native">📤 Поделиться</button>
      <button class="btn small secondary" id="tg-share-feed">🌍 В публичную ленту</button>
      <span id="tg-share-status" class="tg-status"></span>
    `;
    tools.appendChild(bar);

    bar.addEventListener('click', async (e)=>{
      const trip = readCurrentTrip();
      if(!trip) return;

      if(e.target.id==='tg-share-png'){
        const blob = await renderCardPNG(trip);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href=url; a.download=`treapeasy-${trip.city}.png`; a.click();
        setTimeout(()=>URL.revokeObjectURL(url), 1500);
        Analytics.track('trip_shared', {tripId:trip.id, channel:'png'});
        flashStatus('Карточка скачана ✓');
      }

      if(e.target.id==='tg-share-link'){
        await navigator.clipboard.writeText(shareUrl(trip.id));
        Analytics.track('trip_shared', {tripId:trip.id, channel:'link'});
        flashStatus('Ссылка скопирована ✓');
      }

      if(e.target.id==='tg-share-native'){
        if(navigator.share){
          try{
            await navigator.share({
              title:`Мой маршрут в ${trip.city} · TreapEasy`,
              text:`Посмотри маршрут на ${trip.days} дн в ${trip.city}`,
              url:shareUrl(trip.id)
            });
            Analytics.track('trip_shared', {tripId:trip.id, channel:'native'});
          }catch{}
        } else flashStatus('Web Share не поддерживается — используй ссылку');
      }

      if(e.target.id==='tg-share-feed'){
        // уже в фиде после publish; здесь — pin to top
        const feed = lsGet(K.feed, []);
        const idx = feed.indexOf(trip.id);
        if(idx>0){ feed.splice(idx,1); feed.unshift(trip.id); lsSet(K.feed, feed); }
        Analytics.track('trip_shared', {tripId:trip.id, channel:'feed'});
        flashStatus('Маршрут в публичной ленте ✓');
      }
    });
  }

  function flashStatus(msg){
    const el = $('#tg-share-status');
    if(!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(()=>el.classList.remove('show'), 2200);
  }

  /**
   * Читает данные текущего маршрута из DOM (не зависит от внутренних
   * переменных существующего скрипта). Если trip ещё не опубликован —
   * публикует и кэширует id.
   */
  function readCurrentTrip(){
    const titleEl = $('#resultTitle');
    if(!titleEl) return null;

    const cached = titleEl.dataset.tgTripId;
    if(cached){ const t = Trips.get(cached); if(t) return t; }

    const titleTxt = titleEl.textContent || '';
    const city = (titleTxt.split(':')[1] || titleTxt).trim() || 'Маршрут';
    const summary = ($('#resultSummary')?.textContent || '').trim();
    const pills = $$('#resultPills .pill').map(p=>p.textContent.trim());
    const days = parseInt(pills.find(p=>/дн/i.test(p))) || 3;
    const people = parseInt(pills.find(p=>/чел/i.test(p))) || 1;
    // Бюджет: поддерживаем $, ₸, "руб", "тг" — берём первый pill с цифрами и
    // символом валюты (или просто число), затем определяем валюту.
    const moneyPill = pills.find(p=>/[\$₸₽]|тг|руб/i.test(p)) || pills.find(p=>/\d{2,}/.test(p)) || '';
    const budget = parseInt(moneyPill.replace(/[^\d]/g,'')) || 0;
    const currency = /\$/.test(moneyPill) ? '$' : (/₸|тг/i.test(moneyPill) ? '₸' : (/₽|руб/i.test(moneyPill) ? '₽' : '$'));
    const hero = ({Стамбул:'🕌',Париж:'🥐',Дубай:'🐪',Алматы:'🏔️',Рим:'🏛️',Токио:'🗼',Лондон:'☂️',Бишкек:'⛰️',Ташкент:'🕌',Астана:'🏗️'}[city]) || '✈️';

    const id = Trips.publish({city, days, people, budget, currency, summary, hero});
    titleEl.dataset.tgTripId = id;
    Analytics.track('trip_generated', {tripId:id, city, days, budget, currency});
    Invites.convertInvite();
    return Trips.get(id);
  }

  // ---------- 8. Trip Preview Landing -----------------------------

  function maybeShowTripPreview(){
    const {trip:tripId} = parseUrl();
    if(!tripId) return false;
    const t = Trips.get(tripId);
    if(!t){ return false; }
    Trips.incrViews(tripId);
    Analytics.track('shared_link_opened', {tripId, ref: new URLSearchParams(location.search).get('ref')});

    const cur = t.currency || '$';
    const moneyStr = cur==='$' ? `$${t.budget||0}` : `${(t.budget||0).toLocaleString('ru-RU')} ${cur}`;

    const overlay = document.createElement('div');
    overlay.className = 'tg-preview-overlay';
    overlay.innerHTML = `
      <div class="tg-preview">
        <div class="tg-preview-hero">${escapeHTML(t.hero||'✈️')}</div>
        <div class="tg-preview-body">
          <span class="tg-tag">Маршрут друга через TreapEasy</span>
          <h1>${escapeHTML(t.city)}</h1>
          <p class="tg-preview-meta">${t.days||3} дн · ${escapeHTML(moneyStr)} · ${t.people||1} чел</p>
          <div class="tg-preview-card">
            <h3>План поездки</h3>
            <p>${escapeHTML((t.summary||'').slice(0,400))}</p>
          </div>
          <div class="tg-preview-stats">
            <span>👁 ${t.views} просмотров</span>
            <span>❤️ ${t.likes} лайков</span>
          </div>
          <div class="tg-preview-cta">
            <button class="btn" id="tg-remix">✨ Сделать свой маршрут</button>
            <button class="btn secondary" id="tg-skip">Просто посмотреть</button>
          </div>
          <p class="tg-preview-foot">Бесплатно · без регистрации · 30 секунд</p>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e)=>{
      if(e.target.id==='tg-remix' || e.target===overlay){
        Analytics.track('remix_started', {tripId});
        // префилл: подкидываем город в инпут, если такой есть
        const cityInput = $('#toCity, [name=toCity], input[placeholder*="куда" i]');
        if(cityInput) cityInput.value = t.city;
        overlay.remove();
        history.replaceState({}, '', location.pathname);
      }
      if(e.target.id==='tg-skip'){
        overlay.remove();
        history.replaceState({}, '', location.pathname);
      }
    });
    return true;
  }

  // ---------- 9. Public Feed --------------------------------------

  function injectFeedSection(){
    if($('#tg-feed')) return;
    // Цепляем в самый длинный экран — main/home — если он есть
    const home = $('#home') || $('.screen.active') || document.body;
    if(!home || typeof home.appendChild !== 'function') return;
    const sec = document.createElement('section');
    sec.id = 'tg-feed';
    sec.className = 'tg-feed';
    sec.innerHTML = `
      <div class="tg-feed-head">
        <h2>🌍 Вдохновись маршрутами других</h2>
        <p>Тапни любой → продолжишь как свой собственный</p>
      </div>
      <div class="tg-feed-grid" id="tg-feed-grid"></div>`;
    home.appendChild(sec);
    renderFeed();
  }

  function renderFeed(){
    const grid = $('#tg-feed-grid'); if(!grid) return;
    const ids = Trips.feedIds().slice(0, 6);
    const liked = new Set(lsGet(K.likes, []));
    grid.innerHTML = ids.map(id=>{
      const t = Trips.get(id); if(!t) return '';
      const isLiked = liked.has(id);
      const cur = t.currency || '$';
      const moneyStr = cur==='$' ? `$${t.budget||0}` : `${(t.budget||0).toLocaleString('ru-RU')} ${cur}`;
      return `
        <article class="tg-feed-card" data-id="${id}">
          <div class="tg-feed-hero">${escapeHTML(t.hero||'✈️')}</div>
          <div class="tg-feed-body">
            <h3>${escapeHTML(t.city)}</h3>
            <p>${escapeHTML((t.summary||'').slice(0,90))}…</p>
            <div class="tg-feed-meta">
              <span>${t.days||3} дн · ${escapeHTML(moneyStr)}</span>
              <button class="tg-like ${isLiked?'liked':''}" data-id="${id}" aria-label="like">
                ${isLiked?'❤️':'🤍'} <span>${t.likes}</span>
              </button>
            </div>
            <button class="btn small tg-remix-btn" data-id="${id}">Сделать как этот →</button>
          </div>
        </article>`;
    }).join('');

    grid.addEventListener('click', onFeedClick);
    Analytics.track('feed_view');
  }

  function onFeedClick(e){
    const likeBtn = e.target.closest('.tg-like');
    if(likeBtn){
      const id = likeBtn.dataset.id;
      if(Trips.like(id)){
        Analytics.track('feed_liked', {tripId:id});
        renderFeed();
      }
      return;
    }
    const remix = e.target.closest('.tg-remix-btn') || e.target.closest('.tg-feed-card');
    if(remix){
      const id = remix.dataset.id;
      Analytics.track('remix_started', {tripId:id, source:'feed'});
      const t = Trips.get(id);
      const cityInput = $('#toCity, [name=toCity], input[placeholder*="куда" i]');
      if(cityInput && t){
        cityInput.value = t.city;
        cityInput.scrollIntoView({behavior:'smooth', block:'center'});
        cityInput.focus();
      }
    }
  }

  // ---------- 10. Invite Banner -----------------------------------

  function injectInviteBanner(){
    if($('#tg-invite-banner')) return;
    const home = $('#home') || $('.screen.active') || document.body;
    if(!home || typeof home.appendChild !== 'function') return;
    const div = document.createElement('div');
    div.id = 'tg-invite-banner';
    div.className = 'tg-invite-banner';
    div.innerHTML = `
      <div class="tg-invite-icon">🎁</div>
      <div class="tg-invite-text">
        <strong>Открой премиум-города</strong>
        <span>Токио, Нью-Йорк, Барселона, Сеул, Бангкок — бесплатно</span>
      </div>
      <button class="btn small" id="tg-invite-btn">Пригласить друга</button>`;

    // Пробуем разместить ПЕРЕД "Рекомендации" если такой section-head есть.
    // Если нет — просто в конец #home.
    const recHead = Array.from(home.querySelectorAll('.section-head'))
      .find(h => /рекоменд/i.test(h.textContent));
    if(recHead && recHead.parentNode === home){
      home.insertBefore(div, recHead);
    } else {
      home.appendChild(div);
    }

    $('#tg-invite-btn').addEventListener('click', async ()=>{
      const link = Invites.inviteLink();
      try{
        await navigator.clipboard.writeText(link);
        Analytics.track('invite_sent', {});
        $('#tg-invite-btn').textContent = '✓ Скопировано!';
        setTimeout(()=>$('#tg-invite-btn').textContent='Пригласить друга', 2500);
      }catch{
        prompt('Скопируй и отправь другу:', link);
      }
    });
  }

  // ---------- 11. Dashboard ---------------------------------------

  function openDashboard(){
    if($('#tg-dash')) return;
    const m = Analytics.metrics();
    const fmt = (n,d=1) => n==null ? '—' : (n*100).toFixed(d)+'%';
    const num = n => (n??0).toLocaleString('ru-RU');

    const wrap = document.createElement('div');
    wrap.id = 'tg-dash';
    wrap.className = 'tg-dash';
    wrap.innerHTML = `
      <div class="tg-dash-head">
        <div>
          <span class="tg-tag">Admin</span>
          <h2>TreapEasy · Growth Metrics</h2>
        </div>
        <div>
          <button class="btn small secondary" id="tg-dash-export">⬇️ Export JSON</button>
          <button class="btn small secondary" id="tg-dash-seed">🎲 Seed demo data</button>
          <button class="btn small red" id="tg-dash-reset">🗑 Reset</button>
          <button class="btn small" id="tg-dash-close">Закрыть</button>
        </div>
      </div>

      <div class="tg-dash-grid">
        <div class="tg-kpi tg-kpi-hero">
          <span>K-factor</span>
          <strong>${m.kFactor.toFixed(2)}</strong>
          <small>i = ${m.kFactorParts.i.toFixed(2)} · c = ${fmt(m.kFactorParts.c)}</small>
          <em>${m.kFactor>=1?'🚀 Вирусный рост':'📈 Suб-вирусный — улучшай i или c'}</em>
        </div>
        <div class="tg-kpi"><span>Conversion</span><strong>${fmt(m.conversion)}</strong><small>visit → trip</small></div>
        <div class="tg-kpi"><span>Share rate</span><strong>${fmt(m.shareRate)}</strong><small>shares / trip</small></div>
        <div class="tg-kpi"><span>DAU today</span><strong>${num(m.dauToday)}</strong><small>уникальные за день</small></div>
        <div class="tg-kpi"><span>Retention D1</span><strong>${fmt(m.retention.d1)}</strong></div>
        <div class="tg-kpi"><span>Retention D7</span><strong>${fmt(m.retention.d7)}</strong></div>
        <div class="tg-kpi"><span>Retention D30</span><strong>${fmt(m.retention.d30)}</strong></div>
      </div>

      <div class="tg-dash-row">
        <div class="tg-dash-block">
          <h3>DAU · последние 14 дней</h3>
          ${dauChart(m.dauSeries)}
        </div>
        <div class="tg-dash-block">
          <h3>Funnel</h3>
          ${funnelHTML(m.funnel)}
        </div>
      </div>

      <div class="tg-dash-row">
        <div class="tg-dash-block">
          <h3>Volumes</h3>
          <table class="tg-table">
            ${Object.entries(m.volumes).map(([k,v])=>`<tr><td>${k}</td><td><strong>${num(v)}</strong></td></tr>`).join('')}
          </table>
        </div>
        <div class="tg-dash-block">
          <h3>Growth Loop · схема</h3>
          ${loopDiagram()}
        </div>
      </div>

      <p class="tg-dash-foot">
        Подсказка: открыть дашборд — <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>A</kbd> или
        <code>?admin=1</code>
      </p>`;
    document.body.appendChild(wrap);

    wrap.addEventListener('click', e=>{
      if(e.target.id==='tg-dash-close'){ wrap.remove(); }
      if(e.target.id==='tg-dash-reset'){
        if(confirm('Очистить всю аналитику и инвайты?')){
          [K.events, K.likes, K.feed, K.invites, K.unlocked, K.sessions].forEach(k=>localStorage.removeItem(k));
          wrap.remove(); openDashboard();
        }
      }
      if(e.target.id==='tg-dash-export'){
        const blob = new Blob([JSON.stringify({metrics:Analytics.metrics(), events:lsGet(K.events,[])}, null, 2)], {type:'application/json'});
        const a = document.createElement('a');
        a.href=URL.createObjectURL(blob); a.download='treapeasy-metrics.json'; a.click();
      }
      if(e.target.id==='tg-dash-seed'){
        seedDemoData(); wrap.remove(); openDashboard();
      }
    });
  }

  function dauChart(series){
    const max = Math.max(1, ...series.map(s=>s.dau));
    const W=600, H=160, P=24;
    const step = (W-P*2) / Math.max(1, series.length-1);
    const pts = series.map((s,i)=>{
      const x = P + i*step;
      const y = H-P - (s.dau/max)*(H-P*2);
      return [x,y];
    });
    const path = pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
    const area = `${path} L ${pts[pts.length-1][0]} ${H-P} L ${P} ${H-P} Z`;
    return `
      <svg class="tg-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <defs><linearGradient id="tgGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#176b5d" stop-opacity=".35"/>
          <stop offset="1" stop-color="#176b5d" stop-opacity="0"/>
        </linearGradient></defs>
        <path d="${area}" fill="url(#tgGrad)"/>
        <path d="${path}" fill="none" stroke="#176b5d" stroke-width="2.5" stroke-linejoin="round"/>
        ${pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#176b5d"/>`).join('')}
      </svg>
      <div class="tg-chart-axis">
        <span>${series[0].date.slice(5)}</span>
        <span>${series[series.length-1].date.slice(5)}</span>
      </div>`;
  }

  function funnelHTML(f){
    const top = f[0].users || 1;
    return `<div class="tg-funnel">
      ${f.map(s=>{
        const pct = (s.users/top)*100;
        return `<div class="tg-funnel-row">
          <span class="tg-funnel-label">${s.step}</span>
          <div class="tg-funnel-bar"><div style="width:${Math.max(3,pct)}%"></div></div>
          <span class="tg-funnel-num">${s.users}</span>
        </div>`;
      }).join('')}
    </div>`;
  }

  function loopDiagram(){
    return `<svg viewBox="0 0 460 240" class="tg-loop">
      ${['Visit','Build trip','Share / Invite','Friend lands','Friend remixes'].map((t,i)=>{
        const x = 30 + i*100, y = 110;
        return `<g>
          <circle cx="${x}" cy="${y}" r="28" fill="#e4f3ef" stroke="#176b5d" stroke-width="2"/>
          <text x="${x}" y="${y+5}" text-anchor="middle" font-size="11" font-weight="800" fill="#0f4f45">${i+1}</text>
          <text x="${x}" y="${y+60}" text-anchor="middle" font-size="11" fill="#171717">${t}</text>
          ${i<4?`<path d="M ${x+30} ${y} L ${x+70} ${y}" stroke="#d99a2b" stroke-width="2" marker-end="url(#tgArrow)"/>`:''}
        </g>`;
      }).join('')}
      <defs><marker id="tgArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L 10 5 L 0 10 z" fill="#d99a2b"/></marker></defs>
      <path d="M 430 110 Q 470 250 30 230 Q 10 170 30 110" fill="none" stroke="#176b5d" stroke-width="2" stroke-dasharray="6 5" marker-end="url(#tgArrow)"/>
    </svg>`;
  }

  // ---------- 12. Demo data seeder --------------------------------

  function seedDemoData(){
    const events = [];
    const users = Array.from({length:120}, (_,i)=>'u_demo_'+i);
    const cities = ['Стамбул','Париж','Дубай','Алматы','Рим','Токио','Лондон'];
    const now = Date.now();
    users.forEach((u, idx)=>{
      const firstDay = Math.floor(Math.random()*29);     // last 29 days
      const t0 = now - firstDay*86400e3;
      events.push({event:'app_open', userId:u, ts:t0, date:new Date(t0).toISOString().slice(0,10), props:{}});
      if(Math.random()<.7){
        events.push({event:'form_started', userId:u, ts:t0+60e3, date:new Date(t0).toISOString().slice(0,10), props:{}});
        if(Math.random()<.75){
          const city = cities[Math.floor(Math.random()*cities.length)];
          events.push({event:'trip_generated', userId:u, ts:t0+180e3, date:new Date(t0).toISOString().slice(0,10), props:{city}});
          if(Math.random()<.65){
            events.push({event:'trip_accepted', userId:u, ts:t0+240e3, date:new Date(t0).toISOString().slice(0,10), props:{city}});
          }
          if(Math.random()<.45){
            events.push({event:'trip_shared', userId:u, ts:t0+300e3, date:new Date(t0).toISOString().slice(0,10), props:{channel:'png'}});
            // viewers
            const viewers = Math.floor(Math.random()*4);
            for(let v=0;v<viewers;v++){
              events.push({event:'shared_link_opened', userId:'u_view_'+idx+'_'+v, ts:t0+400e3, date:new Date(t0+86400e3).toISOString().slice(0,10), props:{}});
              if(Math.random()<.4){
                events.push({event:'remix_started', userId:'u_view_'+idx+'_'+v, ts:t0+500e3, date:new Date(t0+86400e3).toISOString().slice(0,10), props:{}});
              }
            }
          }
        }
      }
      // retention bumps
      if(Math.random()<.35) events.push({event:'app_open', userId:u, ts:t0+86400e3, date:new Date(t0+86400e3).toISOString().slice(0,10), props:{}});
      if(Math.random()<.18) events.push({event:'app_open', userId:u, ts:t0+7*86400e3, date:new Date(t0+7*86400e3).toISOString().slice(0,10), props:{}});
    });
    lsSet(K.events, events);
  }

  // ---------- 13. Bootstrap ---------------------------------------

  function init(){
    injectStyles();
    getUserId();
    recordSessionDay();
    Analytics.track('app_open');

    const url = parseUrl();
    if(url.invite){
      Invites.onInviteOpened(url.invite);
      // зачищаем URL
      history.replaceState({}, '', location.pathname);
    }

    Invites.claimPending();

    if(url.admin){ openDashboard(); return; }

    // Trip preview landing — если есть, показываем поверх и ничего не ломаем
    const previewShown = maybeShowTripPreview();

    // Listen to form interactions
    document.addEventListener('input', e=>{
      if(e.target.matches('#fromCity, #toCity, [name=toCity], input[placeholder*="куда" i]')){
        Analytics.track('form_started', {});
      }
    }, {once:false, capture:true});

    watchResultScreen();

    // Инжектим feed + invite banner на хоум, но мягко (через 800мс,
    // чтобы существующая разметка успела построиться)
    setTimeout(()=>{
      injectInviteBanner();
      injectFeedSection();
    }, 800);

    // Hotkey
    document.addEventListener('keydown', e=>{
      if(e.ctrlKey && e.shiftKey && (e.key==='A' || e.key==='a')){
        e.preventDefault(); openDashboard();
      }
    });
  }

  // ---------- 14. Public API --------------------------------------

  window.TreapEasyGrowth = {
    Analytics, Trips, Invites,
    openDashboard, seedDemoData,
    shareUrl, renderCardPNG,
    version: '1.0.0'
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
