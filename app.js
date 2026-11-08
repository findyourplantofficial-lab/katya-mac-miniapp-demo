/* Катя о душевном · Mini App v2
   Static, privacy-first, no telemetry, no sending of personal notes.
   All prompts are invitations to self-reflection, never a psychological diagnosis. */
'use strict';

(function () {
  const APP_VERSION = '2.0.1';
  const ROOT = document.getElementById('app');
  const BACK = document.getElementById('top-back');
  const RAIL = document.getElementById('progress-rail');
  const BAR = document.getElementById('progress-bar');
  const TOAST = document.getElementById('toast');
  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

  const cards = [
    { id: 1, title: 'Росток среди камней', image: 'assets/card_1.jpg', wallpaper: 'assets/wallpaper_1.jpg' },
    { id: 2, title: 'Женщина у окна', image: 'assets/card_2.jpg', wallpaper: 'assets/wallpaper_2.jpg' },
    { id: 3, title: 'Творческая мастерская', image: 'assets/card_3.jpg', wallpaper: 'assets/wallpaper_3.jpg' }
  ];

  const topics = [
    { id: 'much', title: 'Когда всего слишком много', hint: 'Дела, заботы и ответственность не заканчиваются.' },
    { id: 'support', title: 'Когда хочется поддержки', hint: 'Хочется, чтобы кто-то позаботился и о тебе.' },
    { id: 'quiet', title: 'Когда трудно выдохнуть', hint: 'Даже наедине с собой мысли не останавливаются.' }
  ];

  // The 7 approved questions from the brief, slightly shortened for mobile screens.
  const questions = [
    {
      id: 0, title: 'Что ты видишь на карте?',
      body: 'Назови для себя 2–3 детали. Пока не нужно искать в них какой-то смысл.',
      hint: 'На какой детали взгляд задержался дольше? Это может быть цвет, предмет или свет.',
      placeholder: 'Например: тёплый свет, окно, чашка…'
    },
    {
      id: 1, title: 'Какие чувства откликаются?',
      body: 'Посмотри на одну из деталей. Если хочется — попробуй назвать своё ощущение одним словом.',
      hint: 'Спокойнее, тревожнее, любопытно? Может, ничего особенного. Это тоже нормально.',
      placeholder: 'Я замечаю…'
    },
    {
      id: 2, title: 'Что тебе вспомнилось?',
      body: 'Один момент из последних дней. Где ты была, что происходило?',
      hint: 'Если картинка ничего не напоминает, вспомни обычный момент, когда ты заметила усталость.',
      placeholder: 'Я вспомнила…'
    },
    {
      id: 3, title: 'Что забрало больше всего сил?',
      body: 'Попробуй назвать одну вещь, не всё сразу. Даже небольшой ответ подойдёт.',
      hint: 'Это могло быть само дело, необходимость всё помнить, принимать решения или следить за другими.',
      placeholder: 'Больше всего сил ушло на…'
    },
    {
      id: 4, title: 'Что сделало бы момент легче?',
      body: 'Представь одну конкретную вещь, которая могла бы измениться.',
      hint: 'Если бы можно было снять с себя одну часть нагрузки — какую?',
      placeholder: 'Было бы легче, если бы…'
    },
    {
      id: 5, title: 'Что бы ты изменила в картине?',
      body: 'Вернись к выбранному образу. Что хочется добавить, убрать или передвинуть?',
      hint: 'Пусть это будет маленькая перемена. Может, такая же поддержка нужна тебе и в жизни?',
      placeholder: 'Я бы добавила…'
    },
    {
      id: 6, title: 'Какой маленький шаг возможен?',
      body: 'Что из этого ты можешь попробовать сегодня — в самой небольшой форме?',
      hint: 'Можно отложить телефон на минуту, попросить о помощи или просто дать себе паузу.',
      placeholder: 'Я попробую…'
    }
  ];

  const initialSteps = [0, 3, 6];
  const deeperSteps = [1, 2, 4, 5];

  const state = {
    screen: 'intro',
    history: [],
    topic: null,
    card: null,
    steps: [...initialSteps],
    index: 0,
    notes: {},
    phrase: '',
    hintOpen: false,
    fromQuestion: 0,
    imageBlob: null,
    imageUrl: null
  };
  let toastTimer = null;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const chosen = () => cards[state.card - 1] || cards[0];
  const icon = (name) => {
    const common = 'viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
    const paths = {
      arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
      spark:'<path d="m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3Z"/><path d="m19 18 .7 2.3L22 21l-2.3.7L19 24l-.7-2.3L16 21l2.3-.7L19 18Z"/>',
      download:'<path d="M12 3v12m-4-4 4 4 4-4"/><path d="M5 18v3h14v-3"/>',
      eye:'<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
      heart:'<path d="M20.8 9.3c0 4.5-8.8 10.6-8.8 10.6S3.2 13.8 3.2 9.3C3.2 3.6 9 3.4 12 6.9c3-3.5 8.8-3.3 8.8 2.4Z"/>',
      clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2c0-3 3-5 6-5s6 2 6 5v2"/><path d="M17 5c3 0 4 2 4 4s-1 3-3 3m-1 2c2.2.3 4 1.8 4 4v2"/>',
      pin:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
      edit:'<path d="m4 20 4.5-.6L20 8a3 3 0 0 0-4-4L4.5 15.5 4 20Z"/>'
    };
    return '<svg '+common+'>'+paths[name]+'</svg>';
  };

  const act = (text, action, cls='primary', ico='') =>
    '<button class="'+cls+'" type="button" data-action="'+action+'">'+text+(ico?icon(ico):'')+'</button>';

  function haptic() {
    try { if(tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light'); } catch {}
  }

  function showToast(text) {
    clearTimeout(toastTimer);
    TOAST.textContent=text;
    TOAST.classList.remove('hidden');
    toastTimer=setTimeout(()=>TOAST.classList.add('hidden'),3600);
  }

  function invalidateImage() {
    if (state.imageUrl) { URL.revokeObjectURL(state.imageUrl); state.imageUrl=null; }
    state.imageBlob=null;
  }

  function updateNavigation() {
    const show=state.history.length>0;
    BACK.classList.toggle('hidden',!show);
    RAIL.classList.toggle('hidden',state.screen==='intro' || state.screen==='intention');
    let progress=0;
    if(state.screen==='deck') progress=10;
    if(state.screen==='reveal') progress=22;
    if(state.screen==='question') progress=27 + 52*(state.index+1)/state.steps.length;
    if(state.screen==='view-card') progress=27 + 52*(state.index+1)/state.steps.length;
    if(state.screen==='depth') progress=78;
    if(state.screen==='result') progress=100;
    BAR.style.width=progress+'%';
    try {
      if (tg && tg.BackButton) show ? tg.BackButton.show() : tg.BackButton.hide();
    } catch {}
  }

  function go(screen, save=true) {
    if(save) state.history.push({screen:state.screen,index:state.index,steps:[...state.steps]});
    state.screen=screen;
    state.hintOpen=false;
    render();
  }

  function back() {
    if(!state.history.length)return;
    const last=state.history.pop();
    state.screen=last.screen;
    state.index=last.index;
    state.steps=[...last.steps];
    state.hintOpen=false;
    haptic();
    render();
  }

  function render() {
    updateNavigation();
    switch(state.screen) {
      case 'intro': renderIntro();break;
      case 'intention': renderIntention();break;
      case 'deck': renderDeck();break;
      case 'reveal': renderReveal();break;
      case 'question': renderQuestion();break;
      case 'view-card': renderCardPreview();break;
      case 'depth': renderDepth();break;
      case 'result': renderResult();break;
      default: renderIntro();
    }
  }

  function setHtml(html) {
    ROOT.innerHTML='<div class="scene">'+html+'</div>';
    window.scrollTo({top:0,behavior:'instant'});
  }

  function fan() {
    return '<div class="intro-art" aria-hidden="true"><div class="orbit"></div>'+
      '<div class="paper-fan one"><img src="'+cards[0].image+'" alt=""></div>'+
      '<div class="paper-fan three"><img src="'+cards[2].image+'" alt=""></div>'+
      '<div class="paper-fan two"><img src="'+cards[1].image+'" alt=""></div>'+
      '<span class="floating-star">✳</span><span class="floating-star alt">✧</span></div>';
  }

  function renderIntro() {
    setHtml('<div class="intro-scene scene">'+
      '<p class="eyebrow"><span class="dash"></span>ПРАКТИКА С МЕТАФОРИЧЕСКИМИ КАРТАМИ</p>'+
      '<div class="hero-title"><h1>Когда<br>всё <em>на тебе.</em></h1>'+
      '<p class="lead">Маленькая пауза среди большого дня. Три образа, несколько бережных вопросов — и одна мысль, которую можно забрать с собой.</p></div>'+
      fan()+
      '<div class="intro-bottom"><div class="action-stack">'+act('Побыть немного с собой','start','primary','arrow')+
      '</div><span class="small-copy">5–10 минут · В своём темпе · Можно пропускать</span></div>'+
    '</div>');
  }

  function renderIntention() {
    setHtml('<div class="choice-head"><p class="eyebrow"><span class="dash"></span>НАЧНЁМ С ТЕБЯ</p>'+
      '<h2>Что сейчас <em>тебе ближе?</em></h2>'+
      '<p class="lead">Ничего не нужно объяснять. Просто выбери мысль, которая откликается сегодня.</p></div>'+
      '<div class="choice-stack">'+topics.map((t,i)=>'<button class="intention" type="button" data-action="topic" data-value="'+t.id+'">'+
        '<span class="number">0'+(i+1)+'</span><span class="copy"><strong>'+esc(t.title)+'</strong><small>'+esc(t.hint)+'</small></span><span class="arrow">↗</span></button>').join('')+
      '</div><p class="quiet-note">Это не тест и не оценка состояния. Здесь нет неправильного выбора.</p>');
  }

  function renderDeck() {
    const current=topics.find(t=>t.id===state.topic);
    setHtml('<div class="selection-scene"><p class="eyebrow"><span class="dash"></span>ШАГ 1 · ОБРАЗ</p>'+
      '<h2>Какая карта <em>тебя зовёт?</em></h2>'+
      '<p class="lead">Не нужно угадывать значение. Поймай взглядом ту картинку, на которой хочется задержаться.</p>'+
      '<div class="deck" role="group" aria-label="Выбор карты">'+cards.map(c=>'<button type="button" class="deck-card" data-action="card" data-value="'+c.id+'" aria-label="Выбрать карту '+esc(c.title)+'"><img src="'+c.image+'" alt="'+esc(c.title)+'"></button>').join('')+
      '</div><div class="deck-labels">'+cards.map(c=>'<span>'+esc(c.title)+'</span>').join('')+'</div>'+
      '<p class="hint-line">Выбери интуитивно — у каждой карты свой образ, а смысл будет твоим.</p></div>');
  }

  function renderReveal() {
    setHtml('<div class="reveal-scene scene">'+
      '<p class="eyebrow"><span class="dash"></span>ТВОЯ КАРТА</p>'+
      '<div class="reveal-card"><div class="inner"><img src="'+chosen().image+'" alt="'+esc(chosen().title)+'"></div></div>'+
      '<h2>'+esc(chosen().title)+'</h2>'+
      '<p class="lead">Не спеши. Присмотрись к деталям. Здесь никто не скажет, что эта карта «значит» — важен только твой взгляд.</p>'+
      '<div class="action-stack">'+act('Продолжить практику','begin','primary','arrow')+'</div>'+
      '</div>');
  }

  function renderQuestion() {
    const qId=state.steps[state.index];
    const q=questions[qId];
    const last=state.index===state.steps.length-1;
    const value=state.notes[qId]||'';
    setHtml('<div class="practice-scene scene">'+
      '<div class="practice-meta"><span class="eyebrow" style="margin:0"><span class="dash"></span>НАЕДИНЕ С СОБОЙ</span><span class="badge">'+(state.index+1)+' / '+state.steps.length+'</span></div>'+
      '<div><img class="practice-card-preview" src="'+chosen().image+'" alt="Твоя карта '+esc(chosen().title)+'">'+
      '<h2>'+esc(q.title)+'</h2><p class="prompt-body">'+esc(q.body)+'</p></div>'+
      '<div class="journal-block"><label class="journal-label" for="reflection"><span>Если хочется — запиши мысль</span><span>необязательно</span></label>'+
      '<textarea id="reflection" data-note="'+qId+'" maxlength="280" placeholder="'+esc(q.placeholder)+'">'+esc(value)+'</textarea>'+
      '<div class="journal-note">Эти слова остаются только на экране. Мы их никуда не отправляем.</div></div>'+
      (state.hintOpen?'<div class="hint-area">'+esc(q.hint)+'</div>':'')+
      '<div class="question-bottom"><div class="action-stack">'+act(last?'Продолжить':'Следующий вопрос','next','primary','arrow')+
      '<button type="button" class="text-button" data-action="hint">'+(state.hintOpen?'Скрыть подсказку':'Нужна маленькая подсказка?')+'</button>'+
      '<button type="button" class="text-button" data-action="view-card">Посмотреть карту ещё раз</button></div></div></div>');
  }

  function renderCardPreview() {
    setHtml('<div class="image-view scene"><p class="eyebrow"><span class="dash"></span>ПОСМОТРИ ЕЩЁ РАЗ</p>'+
      '<h2>'+esc(chosen().title)+'</h2>'+
      '<img src="'+chosen().image+'" class="under-image" alt="'+esc(chosen().title)+'">'+
      '<p class="lead">Может, сейчас ты замечаешь что-то другое. А может, всё то же самое. И так, и так можно.</p>'+
      '<div class="action-stack">'+act('Вернуться к вопросу','back','primary','arrow')+'</div></div>');
  }

  function renderDepth() {
    setHtml('<div class="depth-scene scene">'+
      '<p class="eyebrow"><span class="dash"></span>ТЫ УЖЕ СДЕЛАЛА ПАУЗУ</p>'+
      '<h2>Можно здесь <em>остановиться.</em><br>А можно — глубже.</h2>'+
      '<p class="lead">Ты прошла три вопроса. Если хочется, впереди ещё четыре — чтобы немного внимательнее присмотреться к себе.</p>'+
      fan()+
      '<div class="action-stack">'+act('Хочу ещё четыре вопроса','deeper','primary','arrow')+
      act('Забрать свою открытку','finish','secondary','spark')+'</div>'+
      '<p class="quiet-note">Любой вариант — хороший. Ты ничего не должна этой практике.</p></div>');
  }

  function renderResult() {
    const label=state.phrase.trim() || 'Сегодня я могу опереться на…';
    setHtml('<div class="result-scene scene"><p class="eyebrow"><span class="dash"></span>ТВОЯ ОПОРА</p>'+
      '<h2>Что хочется <em>забрать с собой?</em></h2>'+
      '<p class="lead" style="margin:0 0 18px">Одна фраза, которая будет напоминать тебе о самом важном. Напиши свою — или оставь начало мысли.</p>'+
      '<div class="personal-card"><img src="'+chosen().wallpaper+'" alt="Карта для телефона">'+
      '<div class="overlay"><small>МОЯ ОПОРА</small><strong id="live-phrase">'+esc(label)+'</strong></div></div>'+
      '<p class="result-gift-label">Твоя карта для экрана телефона · Катя о душевном</p>'+
      '<div class="result-input"><label for="personal-phrase">Моя фраза на сегодня</label>'+
      '<textarea maxlength="110" id="personal-phrase" rows="2" placeholder="Сегодня я могу опереться на…">'+esc(state.phrase)+'</textarea>'+
      '<small>Только ты видишь эту фразу. Она не отправляется ни Кате, ни боту.</small></div>'+
      '<div class="action-stack">'+act('Сохранить открытку','download','primary','download')+
      act('Поделиться / открыть изображение','share','secondary','spark')+
      '<p class="result-signoff">С теплом, Катя о душевном 🌿</p></div>'+
      '</div>');
  }

  async function generateCard() {
    if (state.imageBlob) return state.imageBlob;
    const asset=chosen().wallpaper;
    const image=new Image();
    image.decoding='async';
    image.src=asset;
    await image.decode();
    const canvas=document.createElement('canvas');
    canvas.width=1080;
    canvas.height=1920;
    const ctx=canvas.getContext('2d');
    if(!ctx) throw new Error('Canvas is not supported');
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const txt=(state.phrase.trim()||'Сегодня я могу опереться на…').slice(0,110);
    const maxWidth=840;
    const lines=wrapText(ctx,txt,maxWidth);
    const y=1260,h=410;
    ctx.fillStyle='rgba(33,43,35,.74)';
    roundRect(ctx,104,y,872,h,34);
    ctx.fill();
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillStyle='#f5efdf';
    ctx.font='700 24px Manrope, Arial, sans-serif';
    ctx.fillText('М О Я   О П О Р А',540,y+78);
    ctx.font='500 64px Georgia, serif';
    lines.forEach((line,i)=>ctx.fillText(line,540,y+188+(i-(lines.length-1)/2)*87));
    const blob=await new Promise((res,rej)=>canvas.toBlob(x=>x?res(x):rej(new Error('Canvas export failed')),'image/jpeg',.94));
    state.imageBlob=blob;
    state.imageUrl=URL.createObjectURL(blob);
    return blob;
  }

  function wrapText(ctx,text,maxWidth) {
    ctx.font='500 64px Georgia, serif';
    const parts=text.split(/\s+/).filter(Boolean);
    const result=[];
    let row='';
    for(const word of parts) {
      const candidate=row?row+' '+word:word;
      if(ctx.measureText(candidate).width<=maxWidth) {
        row=candidate;
      } else {
        if(row)result.push(row);
        if(ctx.measureText(word).width<=maxWidth) row=word;
        else {
          let small='';
          for(const c of word){
            if(ctx.measureText(small+c).width>maxWidth){if(small)result.push(small);small=c;}
            else small+=c;
          }
          row=small;
        }
      }
    }
    if(row)result.push(row);
    if(result.length>4) {result.length=4;result[3]=result[3].slice(0,17)+'…';}
    return result;
  }

  function roundRect(ctx,x,y,w,h,r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
  }

  async function downloadCard() {
    try {
      await generateCard();
      const a=document.createElement('a');
      a.href=state.imageUrl;
      a.download='Моя-опора-Катя-о-душевном.jpg';
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('Открытка готова. Если файл не сохранился, нажми «Открыть изображение».');
    }catch(error) {
      console.error('Image creation failed',error);
      showToast('Не удалось создать изображение. Попробуй открыть практику в браузере.');
    }
  }

  async function shareCard() {
    try {
      const blob=await generateCard();
      const file=new File([blob],'moya-opora.jpg',{type:'image/jpeg'});
      if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
        await navigator.share({files:[file],title:'Моя опора — Катя о душевном'});
      } else if(state.imageUrl){
        const win=window.open(state.imageUrl,'_blank');
        if(!win) showToast('Если изображение не открылось, попробуй кнопку сохранения.');
      }
    } catch(e){
      if(e.name!=='AbortError'){console.error('Cannot share',e);showToast('Поделиться не получилось. Попробуй сохранить открытку.');}
    }
  }

  function handle(action,value) {
    haptic();
    if(action==='start'){go('intention');return}
    if(action==='topic'){
      if(!topics.some(x=>x.id===value))return;
      state.topic=value;go('deck');return;
    }
    if(action==='card'){
      const card=Number(value);
      if(!cards.some(x=>x.id===card))return;
      state.card=card;go('reveal');return;
    }
    if(action==='begin'){state.index=0;go('question');return}
    if(action==='hint'){state.hintOpen=!state.hintOpen;renderQuestion();return}
    if(action==='view-card'){go('view-card');return}
    if(action==='back'){back();return}
    if(action==='next'){
      if(state.index<state.steps.length-1) {
        state.history.push({screen:'question',index:state.index,steps:[...state.steps]});
        state.index++;state.hintOpen=false;render();
      } else if(state.steps.length===3){go('depth')}
      else go('result');
      return;
    }
    if(action==='deeper'){
      state.steps=[...initialSteps,...deeperSteps];
      state.index=3;
      go('question');
      return;
    }
    if(action==='finish'){go('result');return}
    if(action==='download'){downloadCard();return}
    if(action==='share'){shareCard();return}
  }

  function updatePhrase(el) {
    state.phrase=el.value.slice(0,110);
    invalidateImage();
    const text=document.getElementById('live-phrase');
    if(text)text.textContent=state.phrase.trim()||'Сегодня я могу опереться на…';
  }

  ROOT.addEventListener('click',event=>{
    const b=event.target.closest('[data-action]');
    if(!b)return;
    handle(b.dataset.action,b.dataset.value||'');
  });

  ROOT.addEventListener('input',event=>{
    const target=event.target;
    if(target.id==='personal-phrase')updatePhrase(target);
    if(target.dataset && target.dataset.note!==undefined) {
      const n=Number(target.dataset.note);
      if(Number.isInteger(n)&&n>=0&&n<questions.length)state.notes[n]=target.value.slice(0,280);
    }
  });

  BACK.addEventListener('click',back);
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.history.length){e.preventDefault();back();}});
  if(tg) {
    try {
      tg.ready();
      tg.expand();
      if(typeof tg.setHeaderColor==='function')tg.setHeaderColor('#f6f2eb');
      if(typeof tg.setBackgroundColor==='function')tg.setBackgroundColor('#f6f2eb');
      if(tg.BackButton)tg.BackButton.onClick(back);
    } catch(e){console.warn('Telegram UI not initialized',e);}
  }

  window.__KATYA_DEMO__={
    version:APP_VERSION,
    state:()=>({screen:state.screen,topic:state.topic,card:state.card,steps:[...state.steps],index:state.index,
                noteCount:Object.values(state.notes).filter(x=>x.trim()).length}),
    reset:()=>{state.screen='intro';state.history=[];state.topic=null;state.card=null;state.steps=[...initialSteps];state.index=0;state.notes={};state.phrase='';invalidateImage();render();}
  };
  render();
})();