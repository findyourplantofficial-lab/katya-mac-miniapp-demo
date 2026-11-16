/* Катя о душевном · Mini App v2
   Static, privacy-first, no telemetry, no sending of personal notes.
   All prompts are invitations to self-reflection, never a psychological diagnosis. */
'use strict';

(function () {
  const APP_VERSION = '2.1.0';
  const ROOT = document.getElementById('app');
  const BACK = document.getElementById('top-back');
  const RAIL = document.getElementById('progress-rail');
  const BAR = document.getElementById('progress-bar');
  const TOAST = document.getElementById('toast');
  let tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  let telegramInitialized = false;

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

  // Four core steps: observe -> feel -> connect with life -> find support.
  // Optional deeper steps never replace the closing question.
  const questions = [
    {
      id: 0, title: 'Что ты видишь на карте?',
      body: 'Какие 2–3 детали первыми привлекли твоё внимание?',
      hint: 'Заметь цвет, предмет, свет или движение. Пока не нужно искать значение.',
      placeholder: 'Я замечаю…'
    },
    {
      id: 1, title: 'Какие чувства возникают?',
      body: 'Посмотри на выбранные детали. Что ты чувствуешь?',
      hint: 'Можно назвать всего одно чувство. А можно ничего не записывать.',
      placeholder: 'Когда я смотрю, мне…'
    },
    {
      id: 2, title: 'Что это напоминает тебе?',
      body: 'Есть ли у этого образа связь с твоей жизнью сейчас?',
      hint: 'Вспомни ситуацию, настроение или желание. Связи может и не быть.',
      placeholder: 'Мне вспоминается…'
    },
    {
      id: 3, title: 'Что здесь может поддержать?',
      body: 'Что в образе помогло бы тебе? Или что хочется добавить?',
      hint: 'Это может быть свет, пространство, человек или что-то совсем небольшое.',
      placeholder: 'Для меня опорой могло бы стать…'
    },
    {
      id: 4, title: 'Что замечаешь теперь?',
      body: 'Посмотри на карту ещё раз. Появилась ли новая деталь?',
      hint: 'Может, карта выглядит по-прежнему. Это тоже нормально.',
      placeholder: 'Теперь я вижу…'
    },
    {
      id: 5, title: 'Что сделало бы образ легче?',
      body: 'Представь одно небольшое изменение на картинке.',
      hint: 'Можно мысленно добавить свет, движение, тепло или пространство.',
      placeholder: 'Стало бы легче, если бы…'
    },
    {
      id: 6, title: 'Что хочется изменить?',
      body: 'Если бы ты могла дополнить карту, что бы появилось?',
      hint: 'Здесь нет правильного рисунка и не нужно ничего объяснять.',
      placeholder: 'Я бы добавила…'
    },
    {
      id: 7, title: 'Что можно взять в свой день?',
      body: 'Есть ли в этой картинке что-то, что хочется вспомнить позже?',
      hint: 'Не обязательно действовать сразу. Достаточно заметить свою мысль.',
      placeholder: 'Мне хочется сохранить…'
    }
  ];
  const initialSteps = [0, 1, 2, 3];
  const deeperSteps = [4, 5, 6, 7];

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
  let cardRevision = 0;
  let cardRenderTimer = null;

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
    cardRevision++;
    clearTimeout(cardRenderTimer);
    if (state.imageUrl) { URL.revokeObjectURL(state.imageUrl); state.imageUrl=null; }
    state.imageBlob=null;
  }

  function scheduleCardRender() {
    clearTimeout(cardRenderTimer);
    cardRenderTimer=setTimeout(() => {
      if(state.screen==='result' && !state.imageBlob){
        generateCard().catch(error => console.warn('Preview card generation failed', error));
      }
    },180);
  }

  function updateNavigation() {
    const show=state.history.length>0;
    BACK.classList.toggle('hidden',!show);
    RAIL.classList.toggle('hidden',state.screen==='intro' || state.screen==='intention');
    let progress=0;
    if(state.screen==='deck') progress=10;
    if(state.screen==='reveal') progress=22;
    if(state.screen==='question') progress=27 + 52*(state.index+1)/state.steps.length;
    if(state.screen==='closing') progress=94;
    if(state.screen==='depth') progress=80;
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
    if(document.getElementById('save-image-overlay')){closeSavePreview();return;}
    if(document.getElementById('card-zoom-overlay')){closeCardOverlay();return;}
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
      case 'closing': renderClosing();break;
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
      '<p class="lead">Несколько минут, чтобы посмотреть на образ, заметить чувства и найти свою мысль. Без правильных ответов.</p></div>'+
      fan()+
      '<div class="intro-bottom"><div class="action-stack">'+act('Начать практику','start','primary','arrow')+
      '</div><span class="small-copy">5–7 минут · В своём темпе · Можно пропускать</span></div>'+
    '</div>');
  }

  function renderIntention() {
    setHtml('<div class="choice-head"><p class="eyebrow"><span class="dash"></span>НАЧНЁМ С ТЕБЯ</p>'+
      '<h2>Что сейчас <em>тебе ближе?</em></h2>'+
      '<p class="lead">Выбери, что ближе сегодня. Дальше будет одна общая практика с теми же картами и вопросами.</p></div>'+
      '<div class="choice-stack">'+topics.map((t,i)=>'<button class="intention" type="button" data-action="topic" data-value="'+t.id+'">'+
        '<span class="number">0'+(i+1)+'</span><span class="copy"><strong>'+esc(t.title)+'</strong><small>'+esc(t.hint)+'</small></span><span class="arrow">↗</span></button>').join('')+
      '</div><p class="quiet-note">Это не тест. Темы помогают настроиться, а не определяют значение карты.</p>');
  }

  function renderDeck() {
    const current=topics.find(t=>t.id===state.topic);
    setHtml('<div class="selection-scene"><p class="eyebrow"><span class="dash"></span>ШАГ 1 · ОБРАЗ</p>'+
      '<h2>Какая карта <em>тебя зовёт?</em></h2>'+
      '<p class="lead">Тема «'+esc(current.title)+'». Для любой темы доступны все три карты — выбери ту, что откликается.</p>'+
      '<div class="deck" role="group" aria-label="Выбор карты">'+cards.map(c=>'<button type="button" class="deck-card" data-action="card" data-value="'+c.id+'" aria-label="Выбрать карту '+esc(c.title)+'"><img src="'+c.image+'" alt="'+esc(c.title)+'"></button>').join('')+
      '</div><div class="deck-labels">'+cards.map(c=>'<span>'+esc(c.title)+'</span>').join('')+'</div>'+
      '<p class="hint-line">У карты нет единственного правильного толкования.</p></div>');
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
      '<div class="practice-meta"><span class="eyebrow" style="margin:0"><span class="dash"></span>ПРАКТИКА С КАРТОЙ</span><span class="badge">'+(state.index+1)+' / '+state.steps.length+'</span></div>'+
      '<div class="prompt-head">'+
      '<button type="button" class="card-zoom" data-action="view-card" aria-label="Увеличить выбранную карту">'+
      '<img src="'+chosen().image+'" alt="'+esc(chosen().title)+'"><span aria-hidden="true" class="card-zoom-symbol">⤢</span></button>'+
      '<h2>'+esc(q.title)+'</h2><p class="prompt-body">'+esc(q.body)+'</p></div>'+
      '<div class="journal-block"><label class="journal-label" for="reflection">Запиши, если хочется <span>необязательно</span></label>'+
      '<textarea id="reflection" data-note="'+qId+'" maxlength="280" placeholder="'+esc(q.placeholder)+'">'+esc(value)+'</textarea>'+
      '<p class="journal-note">Записи не передаются боту и исчезают при закрытии или обновлении страницы.</p></div>'+
      (state.hintOpen?'<div class="hint-area">'+esc(q.hint)+'</div>':'')+
      '<div class="question-bottom"><div class="action-stack">'+act(last?'Продолжить':'Дальше','next','primary','arrow')+
      '<button type="button" class="text-button" data-action="hint">'+(state.hintOpen?'Скрыть подсказку':'Нужна подсказка?')+'</button></div></div></div>');
  }

  function closeCardOverlay() {
    const overlay=document.getElementById('card-zoom-overlay');
    if(overlay)overlay.remove();
    const trigger=ROOT.querySelector('[data-action="view-card"]');
    if(trigger)trigger.focus({preventScroll:true});
  }

  function showCardOverlay() {
    if(document.getElementById('card-zoom-overlay'))return;
    const overlay=document.createElement('div');
    overlay.className='card-zoom-overlay';
    overlay.id='card-zoom-overlay';
    overlay.innerHTML='<section class="card-zoom-dialog" role="dialog" aria-modal="true" aria-label="Рассмотреть карту">'+
      '<button type="button" class="card-zoom-close" aria-label="Закрыть увеличенную карту">×</button>'+
      '<img src="'+chosen().image+'" alt="'+esc(chosen().title)+'"><p>'+esc(chosen().title)+'</p></section>';
    overlay.addEventListener('click',event=>{
      if(event.target===overlay || event.target.closest('.card-zoom-close'))closeCardOverlay();
    });
    document.body.appendChild(overlay);
    overlay.querySelector('.card-zoom-close').focus({preventScroll:true});
  }

  function renderDepth() {
    setHtml('<div class="depth-scene scene">'+
      '<p class="eyebrow"><span class="dash"></span>ОСНОВНАЯ ЧАСТЬ ПРОЙДЕНА</p>'+
      '<h2>Можно <em>завершить.</em><br>А можно — глубже.</h2>'+
      '<p class="lead">Ты рассмотрела карту, чувства и то, что может поддержать. Можно перейти к итогу или выбрать ещё четыре вопроса (около 3–4 минут).</p>'+
      fan()+
      '<div class="action-stack">'+act('Перейти к итогу','finish','primary','arrow')+
      act('Ещё 4 вопроса','deeper','secondary','spark')+'</div>'+
      '<p class="quiet-note">В обоих случаях будет короткое завершение.</p></div>');
  }

  function renderClosing() {
    setHtml('<div class="closing-scene scene">'+
      '<p class="eyebrow"><span class="dash"></span>ЗАВЕРШЕНИЕ</p>'+
      '<h2>С какой мыслью <em>ты уходишь?</em></h2>'+
      '<p class="lead">Какая опора или одна небольшая мысль остаётся после встречи с картой? Можно просто подумать об этом.</p>'+
      '<div class="closing-card"><img src="'+chosen().image+'" alt="'+esc(chosen().title)+'"></div>'+
      '<div class="journal-block"><label class="journal-label" for="personal-phrase">Моя мысль <span>необязательно</span></label>'+
      '<textarea maxlength="110" id="personal-phrase" rows="2" placeholder="Сегодня я хочу запомнить…">'+esc(state.phrase)+'</textarea>'+
      '<p class="journal-note">Если не писать, на итоговой карточке будет нейтральная фраза. Текст мы не сохраняем.</p></div>'+
      '<div class="action-stack closing-bottom">'+act('Забрать итог практики','complete','primary','arrow')+'</div>'+
      '</div>');
  }

  function renderResult() {
    const label=state.phrase.trim() || 'Я могу быть к себе бережнее.';
    setHtml('<div class="result-scene scene"><p class="eyebrow"><span class="dash"></span>ИТОГ ПРАКТИКИ</p>'+
      '<h2>Твоя мысль <em>остаётся с тобой.</em></h2>'+
      '<p class="lead" style="margin:0 0 18px">Это личная карточка с твоей мыслью. Её можно сохранить на телефон или просто завершить практику.</p>'+
      '<div class="personal-card"><img src="'+chosen().wallpaper+'" alt="Карта для телефона">'+
      '<div class="overlay"><small>МОЯ МЫСЛЬ</small><strong id="live-phrase">'+esc(label)+'</strong></div></div>'+
      '<p class="result-gift-label">Твоя карточка для телефона · Катя о душевном</p>'+
      '<div class="result-input"><label for="personal-phrase">Если хочешь, измени фразу</label>'+
      '<textarea maxlength="110" id="personal-phrase" rows="2" placeholder="Сегодня я хочу запомнить…">'+esc(state.phrase)+'</textarea>'+
      '<small>Мы не сохраняем ответы и не отправляем их боту. Они исчезнут при закрытии страницы.</small></div>'+
      '<div class="action-stack">'+act('Сохранить итог','download','primary','download')+
      act('Посмотреть изображение','preview-image','secondary','eye')+
      '<p class="save-explanation">На iPhone: «Поделиться» → «Сохранить изображение».</p>'+
      '<p class="result-signoff">С теплом, Катя о душевном 🌿</p></div>'+
      '</div>');
    scheduleCardRender();
  }

  async function generateCard() {
    if (state.imageBlob) return state.imageBlob;
    const revision=cardRevision;
    const asset=chosen().wallpaper;
    const phrase=(state.phrase.trim()||'Я могу быть к себе бережнее.').slice(0,110);
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
    const txt=phrase;
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
    ctx.fillText('М О Я   М Ы С Л Ь',540,y+78);
    ctx.font='500 64px Georgia, serif';
    lines.forEach((line,i)=>ctx.fillText(line,540,y+188+(i-(lines.length-1)/2)*87));
    const blob=await new Promise((res,rej)=>canvas.toBlob(x=>x?res(x):rej(new Error('Canvas export failed')),'image/jpeg',.94));
    if(revision!==cardRevision)return generateCard(); // The phrase changed during canvas export.
    if(state.imageBlob)return state.imageBlob;
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

  // The image and personal phrase stay inside the device's WebView.
  // iOS Photo Library writes require a system/user action; there is no silent save.
  const iosClient=() => /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  const mobileClient=() => iosClient() || /Android/i.test(navigator.userAgent);

  function browserDownload() {
    if(!state.imageUrl)return;
    const a=document.createElement('a');
    a.href=state.imageUrl;
    a.download='moya-opora-katya.jpg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Файл подготовлен. Проверь папку «Загрузки».');
  }

  function closeSavePreview() {
    const existing=document.getElementById('save-image-overlay');
    if(existing)existing.remove();
    const btn=ROOT.querySelector('[data-action="download"]');
    if(btn)btn.focus({preventScroll:true});
  }

  function showSavePreview() {
    if(!state.imageUrl) {
      showToast('Не удалось открыть открытку. Попробуй ещё раз.');
      return;
    }
    if(document.getElementById('save-image-overlay'))return;
    const overlay=document.createElement('div');
    overlay.id='save-image-overlay';
    overlay.className='save-image-overlay';
    overlay.innerHTML=
      '<section class="save-image-dialog" role="dialog" aria-modal="true" aria-labelledby="save-image-title">'+
      '<button type="button" class="save-image-close" data-save-action="close" aria-label="Закрыть">×</button>'+
      '<p class="eyebrow">ТВОЯ ЛИЧНАЯ КАРТОЧКА</p>'+
      '<h2 id="save-image-title">Сохрани её <em>в «Фото».</em></h2>'+
      '<p class="save-image-guide">Нажми и удерживай изображение → «Сохранить изображение». '+
      'Если такого пункта нет, нажми «Поделиться» и в системном меню выбери «Сохранить изображение».</p>'+
      '<img class="save-image-photo" src="'+state.imageUrl+'" draggable="false" alt="Твоя готовая персональная карта, которую можно сохранить в Фото">'+
      '<div class="save-image-actions">'+
      '<button type="button" class="primary" data-save-action="system">Поделиться с телефоном</button>'+
      '<button type="button" class="secondary" data-save-action="file">Скачать JPG-файл</button>'+
      '<button type="button" class="text-button" data-save-action="close">Вернуться к практике</button>'+
      '</div><p class="save-image-note">Изображение создаётся в браузере. '+
      'Мы не получаем и не сохраняем твою фразу.</p></section>';
    overlay.addEventListener('click',event=>{
      if(event.target===overlay){closeSavePreview();return;}
      const btn=event.target.closest('[data-save-action]');
      if(!btn)return;
      const action=btn.dataset.saveAction;
      if(action==='close')closeSavePreview();
      else if(action==='file')browserDownload();
      else if(action==='system'&&!nativeFileShare(state.imageBlob))
        showToast('Системное меню недоступно. Удерживай изображение, чтобы сохранить его.');
    });
    document.body.appendChild(overlay);
    overlay.querySelector('[data-save-action="close"]').focus({preventScroll:true});
  }

  // Call navigator.share directly inside the user's tap handler whenever
  // the JPEG is already ready. WebKit may discard gesture activation after
  // awaiting an image decode or canvas export.
  function nativeFileShare(blob) {
    if(!blob || typeof navigator.share!=='function' ||
       typeof navigator.canShare!=='function')return false;
    try {
      const file=new File([blob],'moya-opora-katya.jpg',{type:'image/jpeg'});
      if(!navigator.canShare({files:[file]}))return false;
      const operation=navigator.share({files:[file],title:'Моя опора — Катя о душевном'});
      Promise.resolve(operation).then(
        ()=>showToast('Если выбрала «Сохранить изображение», проверь приложение «Фото».'),
        error=>{
          if(error && error.name==='AbortError')return;
          console.warn('Native file share failed',error);
          showSavePreview();
        }
      );
      return true;
    }catch(error){
      console.warn('Native file share unavailable',error);
      return false;
    }
  }

  function downloadCard() {
    if(state.imageBlob){
      if(mobileClient() || (tg && tg.initData)){
        if(!nativeFileShare(state.imageBlob))showSavePreview();
      }else{
        browserDownload();
      }
      return;
    }
    // Slow first load: render locally, then show a persistent tappable
    // preview rather than losing the user gesture in an async native share.
    generateCard().then(()=>{
      if(mobileClient() || (tg && tg.initData))showSavePreview();
      else browserDownload();
    }).catch(error=>{
      console.error('Image creation failed',error);
      showToast('Не удалось создать изображение. Попробуй ещё раз.');
    });
  }

  function shareCard() {
    if(state.imageBlob){
      if(!nativeFileShare(state.imageBlob))showSavePreview();
      return;
    }
    generateCard().then(showSavePreview).catch(error=>{
      console.error('Image preview failed',error);
      showToast('Не удалось открыть изображение. Попробуй ещё раз.');
    });
  }

  function previewCard() {
    if(state.imageBlob){showSavePreview();return;}
    generateCard().then(showSavePreview).catch(error=>{
      console.error('Image preview failed',error);
      showToast('Не удалось открыть открытку. Попробуй ещё раз.');
    });
  }

  function handle(action,value) {
    haptic();
    if(action==='start'){go('intention');return;}
    if(action==='topic'){
      if(!topics.some(x=>x.id===value))return;
      state.topic=value;state.card=null;state.steps=[...initialSteps];state.index=0;
      state.notes={};state.phrase='';invalidateImage();go('deck');return;
    }
    if(action==='card'){
      const card=Number(value);
      if(!cards.some(x=>x.id===card))return;
      if(state.card!==card){state.notes={};state.phrase='';invalidateImage();}
      state.card=card;go('reveal');return;
    }
    if(action==='begin'){state.index=0;go('question');return;}
    if(action==='hint'){state.hintOpen=!state.hintOpen;renderQuestion();return;}
    if(action==='view-card'){showCardOverlay();return;}
    if(action==='back'){back();return;}
    if(action==='next'){
      if(state.index<state.steps.length-1){
        state.history.push({screen:'question',index:state.index,steps:[...state.steps]});
        state.index++;state.hintOpen=false;render();
      }else if(state.steps.length===initialSteps.length)go('depth');
      else go('closing');
      return;
    }
    if(action==='deeper'){
      state.steps=[...initialSteps,...deeperSteps];
      state.index=initialSteps.length;
      go('question');
      return;
    }
    if(action==='finish'){go('closing');return;}
    if(action==='complete'){go('result');return;}
    if(action==='download'){downloadCard();return;}
    if(action==='share'){shareCard();return;}
    if(action==='preview-image'){previewCard();return;}
  }

  function updatePhrase(el) {
    state.phrase=el.value.slice(0,110);
    invalidateImage();
    const text=document.getElementById('live-phrase');
    if(text)text.textContent=state.phrase.trim()||'Я могу быть к себе бережнее.'
    scheduleCardRender();
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
  window.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      if(document.getElementById('save-image-overlay')){
        e.preventDefault();closeSavePreview();
      }else if(document.getElementById('card-zoom-overlay')){e.preventDefault();closeCardOverlay();}
      else if(state.history.length){e.preventDefault();back();}
    }
  });
  function initializeTelegram() {
    if (telegramInitialized) return;
    const instance = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
    if (!instance) return;
    tg = instance;
    telegramInitialized = true;
    try {
      tg.ready();
      tg.expand();
      if(typeof tg.setHeaderColor==='function')tg.setHeaderColor('#f6f2eb');
      if(typeof tg.setBackgroundColor==='function')tg.setBackgroundColor('#f6f2eb');
      if(tg.BackButton)tg.BackButton.onClick(back);
    } catch(e){console.warn('Telegram UI not initialized',e);}
  }
  const telegramSdkScript = document.getElementById('telegram-sdk');
  if(telegramSdkScript) telegramSdkScript.addEventListener('load',initializeTelegram,{once:true});
  initializeTelegram();

  window.__KATYA_DEMO__={
    version:APP_VERSION,
    state:()=>({screen:state.screen,topic:state.topic,card:state.card,steps:[...state.steps],index:state.index,
                noteCount:Object.values(state.notes).filter(x=>x.trim()).length,imageReady:!!state.imageBlob}),
    reset:()=>{state.screen='intro';state.history=[];state.topic=null;state.card=null;state.steps=[...initialSteps];state.index=0;state.notes={};state.phrase='';invalidateImage();closeCardOverlay();render();}
  };
  render();
})();
