(function () {
  'use strict';

  // ---------- Ajustes ----------
  var ROUND_MS = 20000;      // tiempo por operación (20 s)
  var LOCK_MS = 500;         // bloqueo anti doble pulsación
  var NEXT_OK_MS = 1800;     // pausa tras acierto
  var NEXT_FAIL_MS = 3000;   // pausa tras fallo / tiempo agotado
  var STORAGE_KEY = 'sumas.aciertos';
  // Ajustes del rincón de padres (se guardan en este dispositivo)
  var SETTINGS_KEY = 'sumas.ajustes';
  var settings = { timer: 20, maxNum: 10, letters: null, hiddenModes: [], myVoice: true, dictLevel: 0 };
  try {
    var savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (savedSettings) Object.keys(settings).forEach(function (k) {
      if (savedSettings[k] !== undefined) settings[k] = savedSettings[k];
    });
  } catch (e) {}
  function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {} }

  // Lo que más falla: { math: { '3 + 4': [aciertos, fallos] }, syl: {...}, word: {...} }
  var STATS_KEY = 'sumas.fallos';
  var stats = { math: {}, syl: {}, word: {}, build: {}, trace: {}, write: {}, miss: {} };
  try {
    var savedStats = JSON.parse(localStorage.getItem(STATS_KEY));
    if (savedStats) ['math', 'syl', 'word', 'build', 'trace', 'write', 'miss'].forEach(function (k) { if (savedStats[k]) stats[k] = savedStats[k]; });
  } catch (e) {}
  function record(cat, key, ok) {
    var e = stats[cat][key] || (stats[cat][key] = [0, 0]);
    e[ok ? 0 : 1]++;
    try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (err) {}
  }

  var WORDS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];

  // ---------- Elementos ----------
  var elA = document.getElementById('a');
  var elB = document.getElementById('b');
  var elMsg = document.getElementById('msg');
  var elScore = document.getElementById('score');
  var elScoreBox = elScore.parentNode;
  var elTimer = document.getElementById('timerFill');
  var elStart = document.getElementById('start');
  var elOp = document.getElementById('op');
  var elHome = document.getElementById('home');
  var elHome2 = document.getElementById('home2');
  var elGame = document.getElementById('game');
  var elReader = document.getElementById('reader');
  var elPic = document.getElementById('pic');
  var elPicEmoji = document.getElementById('picEmoji');
  var elSyls = document.getElementById('syls');
  var elNextWord = document.getElementById('nextWord');
  var elHome3 = document.getElementById('home3');
  var elSylScreen = document.getElementById('sylScreen');
  var elLetterC = document.getElementById('letterC');
  var elLetterV = document.getElementById('letterV');
  var elBigSyl = document.getElementById('bigSyl');
  var elExamples = document.getElementById('examples');
  var elSum = document.querySelector('.sum');
  var elHelpBtn = document.getElementById('helpBtn');
  var elHelp = document.getElementById('helpPanel');
  var elHelpOp = document.getElementById('helpOp');
  var elDots = document.getElementById('dots');
  var modeButtons = Array.prototype.slice.call(document.querySelectorAll('.mode'));
  var buttons = Array.prototype.slice.call(document.querySelectorAll('#options .opt'));

  // ---------- Estado ----------
  var state = 'idle';        // idle | playing | feedback
  var mode = 'sum';          // sum | sub | read | syl | sylq | wordq | build | trace
  var current = null;        // { a, b, result }
  var lockUntil = 0;
  var roundTimer = null;
  var nextTimer = null;
  var score = loadScore();
  var elScore2 = document.getElementById('score2');
  var elScore3 = document.getElementById('score3');
  var elScore4 = document.getElementById('score4');
  elScore.textContent = elScore2.textContent = elScore3.textContent = elScore4.textContent = score;

  // Todas las operaciones posibles, para elegir de forma uniforme
  //  sumas:  a + b con resultado 0-10
  //  restas: a − b con a de 0 a 10 y b <= a (resultado 0-10, nunca negativo)
  var PAIRS = { sum: [], sub: [] };
  for (var i = 0; i <= 10; i++) {
    for (var j = 0; i + j <= 10; j++) PAIRS.sum.push([i, j]);
    for (var k2 = 0; k2 <= i; k2++) PAIRS.sub.push([i, k2]);
  }

  // ---------- Utilidades ----------
  function randInt(max) { return Math.floor(Math.random() * max); }

  function shuffle(arr) {
    for (var k = arr.length - 1; k > 0; k--) {
      var r = randInt(k + 1);
      var t = arr[k]; arr[k] = arr[r]; arr[r] = t;
    }
    return arr;
  }

  function loadScore() {
    try { return parseInt(localStorage.getItem(STORAGE_KEY), 10) || 0; } catch (e) { return 0; }
  }

  // ---------- Premios: una pegatina nueva cada 10 estrellas, en álbumes (premios.js) ----------
  // Al llenar un álbum empieza el siguiente. A veces la pegatina sale dorada.
  var STARS_PER_STICKER = 10;
  var GOLD_CHANCE = 0.2;              // más o menos 1 de cada 5
  var ALBUMES = [], STICKERS = [];    // STICKERS: todas seguidas { e, clip, album }
  (window.ALBUMES || []).forEach(function (a, ai) {
    var al = { name: a[0], icon: a[1], start: STICKERS.length, n: a[2].length };
    a[2].forEach(function (st) { STICKERS.push({ e: st[0], clip: window.premioClip(st[1]), album: ai }); });
    ALBUMES.push(al);
  });
  var PRIZE_KEY = 'sumas.premios';
  var prizes = null;                  // { got: pegatinas ganadas, stars: estrellas hacia la siguiente, gold: [índices] }
  try { prizes = JSON.parse(localStorage.getItem(PRIZE_KEY)); } catch (e) {}
  if (!prizes || typeof prizes.got !== 'number') {
    // antes solo había el álbum de animales: se respeta lo que ya tenía
    var firstN = ALBUMES.length ? ALBUMES[0].n : 0;
    var gotOld = Math.min(Math.floor(score / STARS_PER_STICKER), firstN);
    prizes = { got: gotOld, stars: gotOld >= firstN ? 0 : score % STARS_PER_STICKER, gold: [] };
    savePrizes();
  }
  if (!prizes.gold) prizes.gold = [];
  // Dibujo de una pegatina: emoji o imagen propia (premios/*.svg)
  function stickerArt(e) {
    if (!/\.svg$/.test(e)) return document.createTextNode(e);
    var img = document.createElement('img');
    img.className = 'st-img';
    img.src = e;
    img.alt = '';
    img.draggable = false;
    img.style.width = img.style.height = '1.15em';   // tamaño de un emoji, aunque falte el CSS
    return img;
  }
  function savePrizes() { try { localStorage.setItem(PRIZE_KEY, JSON.stringify(prizes)); } catch (e) {} }
  function stickersOwned() { return Math.min(prizes.got, STICKERS.length); }
  function albumDone(ai) { return prizes.got >= ALBUMES[ai].start + ALBUMES[ai].n; }
  function currentAlbum() {   // el primero que no está completo (o el último)
    for (var i = 0; i < ALBUMES.length; i++) if (!albumDone(i)) return i;
    return ALBUMES.length - 1;
  }

  // Un acierto más: el contador es el mismo en todos los juegos.
  // Devuelve la pegatina nueva si con esta estrella se gana una.
  function addPoint() {
    score++;
    saveScore();
    var prize = null;
    if (prizes.got < STICKERS.length && ++prizes.stars >= STARS_PER_STICKER) {
      prizes.stars = 0;
      var k = prizes.got++;
      var gold = Math.random() < GOLD_CHANCE;
      if (gold) prizes.gold.push(k);
      var st = STICKERS[k], al = ALBUMES[st.album];
      prize = { e: st.e, clip: st.clip, gold: gold, done: k === al.start + al.n - 1 ? st.album : -1 };
    }
    savePrizes();
    updateAlbumDots();
    [elScore, elScore2, elScore3, elScore4].forEach(function (el) {
      el.textContent = score;
      var box = el.parentNode;
      box.classList.remove('bump');
      void box.offsetWidth;
      box.classList.add('bump');
    });
    return prize;
  }

  function saveScore() {
    try { localStorage.setItem(STORAGE_KEY, String(score)); } catch (e) { /* sin almacenamiento */ }
  }

  // ---------- Sonido: grabaciones reales (si existen) o voz sintética ----------
  // Si en la carpeta audio/ hay grabaciones, se usan; si falta alguna, esa frase
  // se dice con la voz del sistema. Ver audio/LEEME.txt.
  var CLIPS = { 'muy-bien': '¡Muy bien Inés!', 'uy': '¡Casi!' };
  CLIPS['quedan'] = 'Quedan...';
  CLIPS['son'] = 'Son...';
  // Leer: una grabación por palabra y por sílaba (ver palabras.js)
  var PALABRAS = window.PALABRAS || [];
  PALABRAS.forEach(function (p) {
    var sils = p[0].split('-');
    CLIPS[window.palabraClip(p[0])] = sils.join('').toLowerCase();
    sils.forEach(function (s, i) { CLIPS[window.silabaClip(sils, i)] = s.toLowerCase(); });
  });
  // Sílabas: "La eme con la a, ma." + "Como en..." + palabra de ejemplo + letras sueltas
  var SILABAS = window.SILABAS || [];
  var LETRAS = { a: 'a', e: 'e', i: 'i', o: 'o', u: 'u', m: 'eme', p: 'pe', l: 'ele', s: 'ese',
                 t: 'te', n: 'ene', d: 'de', b: 'be', c: 'ce', f: 'efe', g: 'ge', r: 'erre',
                 v: 'uve', j: 'jota', 'ñ': 'eñe', z: 'zeta', ll: 'elle', ch: 'che', y: 'i griega',
                 h: 'hache' };
  (window.MAS_PALABRAS || []).concat(window.PALABRAS_LARGAS || []).forEach(function (p) {
    CLIPS[window.palabraClip(p[0])] = p[0].replace(/-/g, '').toLowerCase();
  });
  CLIPS['como-en'] = 'Como en...';
  CLIPS['y'] = 'y';
  CLIPS['premio'] = '¡Un premio para ti!';
  SILABAS.forEach(function (x) {
    var syl = x[0].toLowerCase(), ls = window.letrasDe(syl);
    CLIPS[window.silabaClip([x[0]], 0)] = 'La ' + (LETRAS[ls[0]] || ls[0]) + ' con la ' + ls[1] + ', ' + syl + '.';
    x[1].forEach(function (ex) { CLIPS[window.palabraClip(ex[0])] = ex[0].replace(/-/g, '').toLowerCase(); });
    ls.forEach(function (l) { CLIPS[window.letraClip(l)] = 'La ' + (LETRAS[l] || l) + '.'; });
    if (ls[0] !== 'h') CLIPS['q-' + window.clipNorm(syl)] = syl + '.';   // juego: solo la sílaba
  });
  for (var n = 0; n <= 10; n++) {
    CLIPS['era-' + n] = 'Era el ' + WORDS[n] + '.';
    CLIPS['si-a-' + n] = 'Si a ' + WORDS[n] + ',';       // ayuda de restas
    CLIPS['quito-' + n] = 'le quito ' + WORDS[n] + ',';
    CLIPS['pongo-' + n] = 'le pongo ' + WORDS[n] + ',';     // ayuda de sumas
  }

  // En iOS el AudioContext debe crearse dentro de un toque del usuario, así que
  // aquí solo se descargan los archivos; se decodifican al pulsar + o −.
  var AC = window.AudioContext || window.webkitAudioContext;
  var audioCtx = null;
  var raw = {};              // nombre -> ArrayBuffer descargado
  var buffers = {};          // nombre -> AudioBuffer ya decodificado
  var available = {};        // nombre -> true si existe el archivo
  var currentSource = null;
  var htmlAudio = null;      // reproductor de respaldo (<audio>), desbloqueado en el toque
  var playToken = 0;         // invalida secuencias anteriores
  // Grabaciones de los padres ("Tu voz", ahora desactivado: necesita https://).
  // Si myRaw/myUrl tienen algo, se usa en lugar de las de audio/
  var myRaw = {}, myBuf = {}, myUrl = {};
  function useMine(item) { return item.mine || settings.myVoice !== false; }

  function clipUrl(name) { return 'audio/' + name + '.mp3'; }

  function loadClips() {
    if (!window.fetch) return;
    Object.keys(CLIPS).forEach(function (name) {
      fetch(clipUrl(name))
        .then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); })
        .then(function (data) { raw[name] = data; available[name] = true; decodeClip(name); })
        .catch(function () { /* no hay grabación: se usará la voz sintética */ });
    });
  }

  function decodeClip(name) {
    if (!audioCtx || !raw[name] || buffers[name]) return;
    var data = raw[name].slice(0);   // decodeAudioData "consume" el buffer
    try {
      var p = audioCtx.decodeAudioData(data,
        function (buf) { buffers[name] = buf; },
        function () { /* no se pudo decodificar: se usará el respaldo */ });
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  // Quita el silencio del principio y del final y sube un poco el volumen si se grabó flojo
  function trimBuffer(buf) {
    try {
      var d = buf.getChannelData(0), n = d.length, max = 0, k;
      for (k = 0; k < n; k++) { var v = Math.abs(d[k]); if (v > max) max = v; }
      if (!max) return buf;
      var th = max * 0.04, a = 0, b = n - 1;
      while (a < n && Math.abs(d[a]) < th) a++;
      while (b > a && Math.abs(d[b]) < th) b--;
      var sr = buf.sampleRate;
      a = Math.max(0, a - Math.round(sr * 0.08));
      b = Math.min(n, b + Math.round(sr * 0.15));
      var gain = Math.min(4, 0.9 / max);
      var out = audioCtx.createBuffer(buf.numberOfChannels, b - a, sr);
      for (var c = 0; c < buf.numberOfChannels; c++) {
        var src = buf.getChannelData(c), dst = out.getChannelData(c);
        for (k = 0; k < b - a; k++) dst[k] = src[a + k] * gain;
      }
      return out;
    } catch (e) { return buf; }
  }
  function decodeMine(name) {
    if (!audioCtx || !myRaw[name] || myBuf[name]) return;
    var raw0 = myRaw[name];
    try {
      var p = audioCtx.decodeAudioData(raw0.slice(0),
        function (buf) { if (myRaw[name] === raw0) myBuf[name] = trimBuffer(buf); },
        function () { /* se usará el reproductor <audio> */ });
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  function resumeCtx() {
    if (audioCtx && audioCtx.state !== 'running') {   // 'suspended' o 'interrupted' (iOS)
      try { var p = audioCtx.resume(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
    }
  }

  // Voz sintética: se elige la más natural disponible
  var synth = ('speechSynthesis' in window) ? window.speechSynthesis : null;
  var voice = null;

  function voiceScore(v) {
    var s = 0, name = v.name || '';
    if (/^es[-_]ES$/i.test(v.lang)) s += 4; else if (/^es/i.test(v.lang)) s += 2; else return -1;
    if (/natural|neural|premium|enhanced|mejorad|online/i.test(name)) s += 6;
    if (/google/i.test(name)) s += 4;
    if (/m[oó]nica|paulina|marisol|elvira|helena|laura|dalia|lucia|luc[ií]a/i.test(name)) s += 2;
    if (v.localService === false) s += 1;
    // voces de baja calidad o "de broma"
    if (/compact|espeak|eloquence|eddy|flo|grandma|grandpa|abuel|reed|rocko|sandy|shelley/i.test(name)) s -= 6;
    return s;
  }

  function pickVoice() {
    if (!synth) return;
    try {
      var best = null, bestScore = -1;
      (synth.getVoices() || []).forEach(function (v) {
        var sc = voiceScore(v);
        if (sc > bestScore) { best = v; bestScore = sc; }
      });
      voice = best;
    } catch (e) { voice = null; }
  }

  if (synth) {
    pickVoice();
    try { synth.addEventListener('voiceschanged', pickVoice); } catch (e) { synth.onvoiceschanged = pickVoice; }
  }

  function speak(text, pitch, rate, volume, done) {
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') { if (done) done(); return; }
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'es-ES';
      if (voice) u.voice = voice;
      u.pitch = pitch || 1;
      u.rate = rate || 1;
      if (volume !== undefined) u.volume = volume;
      if (done) { u.onend = done; u.onerror = done; }
      synth.speak(u);
    } catch (e) { if (done) done(); }
  }

  function stopSound() {
    playToken++;
    if (currentSource) { try { currentSource.stop(); } catch (e) {} currentSource = null; }
    if (htmlAudio) { try { htmlAudio.onended = htmlAudio.onerror = null; htmlAudio.pause(); } catch (e) {} }
    if (synth) { try { synth.cancel(); } catch (e) {} }
  }

  // Reproduce una lista de frases seguidas: [{ clip, pitch, rate }]
  // Orden de preferencia: Web Audio -> <audio> -> voz sintética
  function play(list, onDone) {
    stopSound();
    resumeCtx();
    var token = playToken;
    var i = 0;
    (function next() {
      if (token !== playToken) return;
      if (i >= list.length) { if (onDone) onDone(); return; }
      var item = list[i++];
      if (item.onStart) item.onStart();
      var buf = (useMine(item) && myBuf[item.clip]) || buffers[item.clip];
      var mineUrl = useMine(item) && myUrl[item.clip];
      if (mineUrl && !myBuf[item.clip]) buf = null;   // aún sin decodificar: mejor <audio> con tu voz

      if (buf && audioCtx && audioCtx.state === 'running') {
        try {
          var src = audioCtx.createBufferSource();
          src.buffer = buf;
          src.connect(audioCtx.destination);
          src.onended = next;
          currentSource = src;
          src.start(0);
          return;
        } catch (e) { /* probamos el siguiente método */ }
      }

      if (htmlAudio && (mineUrl || available[item.clip])) {
        var done = false;
        var go = function () { if (!done) { done = true; next(); } };
        var fallback = function () {
          if (done) return; done = true;
          speak(CLIPS[item.clip], item.pitch, item.rate, undefined, next);
        };
        try {
          htmlAudio.onended = go;
          htmlAudio.onerror = fallback;
          htmlAudio.src = mineUrl || clipUrl(item.clip);
          htmlAudio.muted = false;
          var p = htmlAudio.play();
          if (p && p.catch) p.catch(fallback);
          return;
        } catch (e) { /* probamos la voz sintética */ }
      }

      speak(CLIPS[item.clip], item.pitch, item.rate, undefined, next);
    })();
  }

  // Debe llamarse dentro de un toque del usuario (requisito de iOS/Safari y Chrome)
  function unlockSound() {
    // iOS 17+: que suene aunque el dispositivo esté en modo silencio
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}

    if (!audioCtx && AC) { try { audioCtx = new AC(); } catch (e) { audioCtx = null; } }
    if (audioCtx) {
      resumeCtx();
      try {   // sonido vacío: termina de "despertar" el audio en iOS
        var s = audioCtx.createBufferSource();
        s.buffer = audioCtx.createBuffer(1, 1, 22050);
        s.connect(audioCtx.destination);
        s.start(0);
      } catch (e) {}
      Object.keys(raw).forEach(decodeClip);
      Object.keys(myRaw).forEach(decodeMine);
    }

    // Reproductor <audio> de respaldo, desbloqueado con este mismo toque
    if (!htmlAudio && typeof Audio !== 'undefined') {
      try {
        htmlAudio = new Audio();
        htmlAudio.setAttribute('playsinline', '');
        htmlAudio.preload = 'auto';
        htmlAudio.muted = true;
        htmlAudio.src = clipUrl('uy');
        var p = htmlAudio.play();
        if (p && p.then) p.then(function () { htmlAudio.pause(); }, function () {});
      } catch (e) { htmlAudio = null; }
    }

    pickVoice();
    speak(' ', 1, 1, 0);
  }

  loadClips();

  // ---------- Temporizador visual ----------
  function startBar() {
    elTimer.classList.remove('run', 'paused');
    void elTimer.offsetWidth;            // reinicia la animación
    elTimer.style.animationDuration = ROUND_MS + 'ms';
    elTimer.style.setProperty('--round', ROUND_MS + 'ms');
    elTimer.classList.add('run');
  }

  function pauseBar() { elTimer.classList.add('paused'); }

  // ---------- Ayuda: círculos que se juntan (sumas) o se quitan (restas) ----------
  var helpTimers = [];
  var helpToken = 0;
  var helpUsed = false;

  function clearHelp() {
    helpToken++;
    helpTimers.forEach(clearTimeout);
    helpTimers = [];
  }

  function resetHelp() {
    clearHelp();
    helpUsed = false;
    elSum.classList.remove('helping');
    elHelp.hidden = true;
    elDots.innerHTML = '';
  }

  function later(ms, fn) {
    var tok = helpToken;
    helpTimers.push(setTimeout(function () { if (tok === helpToken) fn(); }, ms));
  }

  // Dice una frase y sigue cuando ha terminado Y han pasado al menos minMs
  function sayThen(clip, minMs, cb) {
    var tok = helpToken, t0 = Date.now(), fired = false;
    function go() {
      if (fired || tok !== helpToken) return;
      fired = true;
      later(Math.max(0, minMs - (Date.now() - t0)) + 250, cb);
    }
    play([{ clip: clip, pitch: 1, rate: 0.9 }], go);
    later(Math.max(minMs, 4000), go);   // por si el audio no avisa al terminar
  }

  function startHelp() {
    if ((mode !== 'sub' && mode !== 'sum') || state !== 'playing' || helpUsed) return;
    helpUsed = true;
    clearTimeout(roundTimer);            // con ayuda no hay prisa: se para el tiempo
    pauseBar();
    elHelpBtn.hidden = true;
    clearHelp();

    var a = current.a, b = current.b, isSum = mode === 'sum';
    elHelpOp.innerHTML = '<span class="ha">' + a + '</span> ' + (isSum ? '+' : '−') +
                         ' <span class="hb">' + b + '</span>';
    elDots.innerHTML = '';
    elDots.style.setProperty('--cols', Math.max(1, Math.min(isSum ? a + b : a, 5)));
    var dots = [];
    function addDot(cls, delay) {
      var d = document.createElement('span');
      d.className = 'dot' + (cls ? ' ' + cls : '');
      d.style.animationDelay = delay + 'ms';
      elDots.appendChild(d);
      dots.push(d);
      return d;
    }
    for (var k = 0; k < a; k++) addDot('', k * 90);
    elSum.classList.add('helping');
    elHelp.hidden = false;

    if (isSum) {
      // 1) "Si a dos," aparecen los azules  2) "le pongo tres," llegan los rojos uno a uno
      // 3) saltan todos y "Son..." (Inés los cuenta y contesta)
      sayThen('si-a-' + a, a * 90 + 400, function () {
        for (var q = 0; q < b; q++) later(300 + q * 450, function () { addDot('add', 0); });
        sayThen('pongo-' + b, 300 + b * 450 + 200, function () {
          dots.forEach(function (dot, k) {
            dot.style.animationDelay = (k * 120) + 'ms';
            dot.classList.add('stay');
          });
          play([{ clip: 'son', pitch: 1, rate: 0.9 }]);
        });
      });
      return;
    }

    // 1) "Si a cinco," mientras aparecen los círculos
    sayThen('si-a-' + a, a * 90 + 400, function () {
      // 2) "le quito tres," y se van quitando uno a uno (desde el final)
      for (var q = 0; q < b; q++) {
        (function (dot, q) {
          later(300 + q * 450, function () {
            dot.style.animationDelay = '0ms';
            dot.classList.add('gone');
          });
        })(dots[a - 1 - q], q);
      }
      sayThen('quito-' + b, 300 + b * 450 + 200, function () {
        // 3) los que quedan saltan y "Quedan..." (Inés los cuenta y contesta)
        dots.slice(0, a - b).forEach(function (dot, k) {
          dot.style.animationDelay = (k * 120) + 'ms';
          dot.classList.add('stay');
        });
        play([{ clip: 'quedan', pitch: 1, rate: 0.9 }]);
      });
    });
  }

  // ---------- Rondas ----------
  // 4 opciones: la correcta y 3 cercanas (±1, ±2; ±3 solo si hace falta en 0, 1, 9, 10)
  var N_OPTIONS = 4;
  function makeOptions(result) {
    function near(d) {
      return [result - d, result + d].filter(function (n) { return n >= 0 && n <= 10; });
    }
    var wrong = shuffle(near(1).concat(near(2)));
    if (wrong.length < N_OPTIONS - 1) wrong = wrong.concat(shuffle(near(3)));
    return shuffle([result].concat(wrong.slice(0, N_OPTIONS - 1)));
  }

  function newRound() {
    clearTimeout(roundTimer);
    clearTimeout(nextTimer);

    // solo operaciones con números hasta el máximo elegido (5 o 10)
    var list = PAIRS[mode].filter(function (p) {
      return (mode === 'sum' ? p[0] + p[1] : p[0]) <= settings.maxNum;
    });
    var pair;
    do { pair = list[randInt(list.length)]; }
    while (current && list.length > 1 && pair[0] === current.a && pair[1] === current.b);

    var result = mode === 'sum' ? pair[0] + pair[1] : pair[0] - pair[1];
    current = { a: pair[0], b: pair[1], result: result };
    var opts = makeOptions(current.result);

    elA.textContent = current.a;
    elB.textContent = current.b;
    elOp.textContent = mode === 'sum' ? '+' : '−';
    elOp.setAttribute('aria-label', mode === 'sum' ? 'más' : 'menos');
    elMsg.hidden = true;
    resetHelp();
    elHelpBtn.hidden = false;
    buttons.forEach(function (btn, idx) {
      btn.className = 'opt';
      btn.textContent = opts[idx];
      btn.dataset.value = opts[idx];
      btn.setAttribute('aria-label', WORDS[opts[idx]]);
    });

    state = 'playing';
    lockUntil = Date.now() + LOCK_MS;
    ROUND_MS = settings.timer * 1000;
    elTimer.parentNode.style.visibility = ROUND_MS ? '' : 'hidden';   // "sin tiempo": no hay barra
    if (ROUND_MS) {
      startBar();
      roundTimer = setTimeout(function () { finish(null, null); }, ROUND_MS);
    }
  }

  function finish(value, pressed) {
    if (state !== 'playing') return;
    state = 'feedback';
    clearTimeout(roundTimer);
    pauseBar();
    clearHelp();                // los círculos se quedan a la vista, pero se para la animación
    elHelpBtn.hidden = true;
    lockUntil = Date.now() + LOCK_MS;

    var ok = value === current.result;
    record('math', current.a + (mode === 'sum' ? ' + ' : ' − ') + current.b, ok);

    buttons.forEach(function (btn) {
      var v = Number(btn.dataset.value);
      if (v === current.result) btn.classList.add('correct');
      else if (btn === pressed) btn.classList.add('wrong');
      else btn.classList.add('dim');
    });

    elMsg.className = 'msg' + (ok ? '' : ' almost');
    elMsg.textContent = ok ? '¡Muy bien Inés!' : '¡Casi!';
    elMsg.hidden = false;

    var prize = null;
    if (ok) {
      prize = addPoint();
      play([{ clip: 'muy-bien', pitch: 1.1, rate: 1 }]);
    } else {
      play([
        { clip: 'uy', pitch: 1.1, rate: 0.95 },
        { clip: 'era-' + current.result, pitch: 1, rate: 0.95 }
      ]);
    }

    if (prize) nextTimer = setTimeout(function () { showReward(prize, newRound); }, NEXT_OK_MS);
    else nextTimer = setTimeout(newRound, ok ? NEXT_OK_MS : NEXT_FAIL_MS);
  }

  // ---------- Eventos ----------
  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (state !== 'playing' || Date.now() < lockUntil) return;
      finish(Number(btn.dataset.value), btn);
    });
  });

  // Inicio: elegir sumas, restas o leer
  modeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      mode = btn.dataset.mode;
      current = null;
      elStart.hidden = true;
      elStart.style.display = 'none';   // por si el navegador tuviera un CSS antiguo
      unlockSound();
      elGame.hidden = elReader.hidden = elSylScreen.hidden = elQuiz.hidden = elTrace.hidden = true;
      if (mode === 'sylq' || mode === 'wordq' || mode === 'build') {
        startQuiz(mode);
      } else if (mode === 'trace' || mode === 'tword' || mode === 'tmiss') {
        startTrace(mode);
      } else if (mode === 'read') {
        elReader.hidden = false;
        showWord();
      } else if (mode === 'syl') {
        elSylScreen.hidden = false;
        if (!sylAllowed(sylIndex)) stepSyl(1); else showSyl();
      } else {
        if (mode !== 'sub') mode = 'sum';
        elGame.hidden = false;
        newRound();
      }
    });
  });

  elHelpBtn.addEventListener('click', startHelp);

  // Casita: volver a la pantalla de elegir
  function goHome() {
    clearTimeout(roundTimer);
    clearTimeout(nextTimer);
    stopSound();
    pauseBar();
    resetHelp();
    elHelpBtn.hidden = true;
    state = 'idle';
    elReader.hidden = true;
    elSylScreen.hidden = true;
    clearSylTimers();
    stopQuiz();
    stopTrace();
    elAlbum.hidden = true;
    elParents.hidden = true;
    applyModes();
    elGame.hidden = false;
    elStart.style.display = '';
    elStart.hidden = false;
  }
  elHome.addEventListener('click', goHome);
  elHome2.addEventListener('click', goHome);
  elHome3.addEventListener('click', goHome);
  document.getElementById('home4').addEventListener('click', goHome);
  document.getElementById('home5').addEventListener('click', goHome);

  // ---------- Leer: palabras por sílabas ----------
  var deck = [];
  var word = null;            // { sils: [...], emoji, clip }
  var nextSyl = 0;            // sílaba que toca si se leen en orden

  function showWord() {
    stopSound();
    if (!PALABRAS.length) return;
    if (!deck.length) {
      deck = shuffle(PALABRAS.slice());
      if (word && deck.length > 1 && deck[0][0] === word.text) deck.push(deck.shift());
    }
    var p = deck.shift();
    word = { text: p[0], sils: p[0].split('-'), emoji: p[1], clip: window.palabraClip(p[0]) };
    nextSyl = 0;

    elPicEmoji.textContent = word.emoji;
    elPic.classList.remove('cheer', 'revealed');   // el dibujo empieza oculto: sin pistas
    elSyls.innerHTML = '';
    elSyls.style.setProperty('--n', word.sils.length);
    word.sils.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'syl';
      b.textContent = noTildes(s);          // en pantalla sin tildes; el audio sí las respeta
      b.setAttribute('aria-label', s.toLowerCase());
      b.addEventListener('click', function () { tapSyl(i, b); });
      elSyls.appendChild(b);
    });
  }

  function noTildes(s) {
    return s.replace(/[ÁÉÍÓÚ]/g, function (c) { return 'AEIOU'.charAt('ÁÉÍÓÚ'.indexOf(c)); });
  }

  function bounce(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function sayWord() {
    bounce(elPic, 'cheer');
    Array.prototype.forEach.call(elSyls.children, function (b, k) {
      b.style.animationDelay = (k * 80) + 'ms';
      bounce(b, 'lit');
    });
    play([{ clip: word.clip, pitch: 1, rate: 0.9 }]);
  }

  function tapSyl(i, btn) {
    btn.style.animationDelay = '0ms';
    bounce(btn, 'lit');
    var clip = window.silabaClip(word.sils, i);

    // Si se han tocado todas en orden, al final se dice la palabra entera
    nextSyl = (i === nextSyl) ? nextSyl + 1 : (i === 0 ? 1 : 0);
    if (nextSyl === word.sils.length) {
      nextSyl = 0;
      var w = word;
      play([{ clip: clip, pitch: 1, rate: 0.9 }], function () {
        setTimeout(function () { if (word === w) sayWord(); }, 250);
      });
    } else {
      play([{ clip: clip, pitch: 1, rate: 0.9 }]);
    }
  }

  // Altavoz: dice la palabra y entonces se muestra el dibujo
  elPic.addEventListener('click', function () {
    if (!word) return;
    nextSyl = 0;
    elPic.classList.add('revealed');
    sayWord();
  });
  elNextWord.addEventListener('click', showWord);

  // ---------- Sílabas: la M con la A, MA, como en MANO ----------
  var SYL_KEY = 'sumas.silaba';
  var sylIndex = 0;
  try { sylIndex = parseInt(localStorage.getItem(SYL_KEY), 10) || 0; } catch (e) {}

  function sylItem() { return SILABAS[sylIndex]; }

  // "La eme con la a, ma. Como en... mano y mamá" (cada dibujo salta cuando se nombra)
  function explainSyl() {
    var x = sylItem(), btns = elExamples.children;
    bounce(elBigSyl, 'lit');
    var list = [
      { clip: window.silabaClip([x[0]], 0), pitch: 1, rate: 0.9 },
      { clip: 'como-en', pitch: 1, rate: 0.9 }
    ];
    x[1].forEach(function (ex, k) {
      if (k > 0) list.push({ clip: 'y', pitch: 1, rate: 0.9 });
      list.push({ clip: window.palabraClip(ex[0]), pitch: 1, rate: 0.9,
                  onStart: function () { if (btns[k]) bounce(btns[k], 'lit'); } });
    });
    play(list);
  }

  // temporizador sencillo que se cancela al cambiar de sílaba o salir
  var sylTimers = [];
  function later2(ms, fn) { sylTimers.push(setTimeout(fn, ms)); }
  function clearSylTimers() { sylTimers.forEach(clearTimeout); sylTimers = []; }

  function showSyl() {
    if (!SILABAS.length) return;
    sylIndex = ((sylIndex % SILABAS.length) + SILABAS.length) % SILABAS.length;
    try { localStorage.setItem(SYL_KEY, String(sylIndex)); } catch (e) {}
    clearSylTimers();
    stopSound();

    var x = sylItem(), syl = x[0], ls = window.letrasDe(syl);
    elLetterC.textContent = ls[0];
    elLetterV.textContent = ls[1];
    elLetterC.setAttribute('aria-label', 'la ' + (LETRAS[ls[0].toLowerCase()] || ''));
    elLetterV.setAttribute('aria-label', 'la ' + ls[1].toLowerCase());
    elBigSyl.textContent = syl;

    // palabras de ejemplo, con la sílaba resaltada; se pueden tocar para oírlas
    elExamples.innerHTML = '';
    x[1].forEach(function (ex) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'example';
      btn.setAttribute('aria-label', ex[0].replace(/-/g, '').toLowerCase());
      var em = document.createElement('span');
      em.className = 'ex-emoji';
      em.textContent = ex[1];
      var word = document.createElement('span');
      word.className = 'ex-word';
      var marked = false;
      ex[0].split('-').forEach(function (part) {
        var txt = noTildes(part);
        if (!marked && txt.indexOf(syl) === 0) {
          var hl = document.createElement('span');
          hl.className = 'hl';
          hl.textContent = syl;
          word.appendChild(hl);
          txt = txt.slice(syl.length);
          marked = true;
        }
        if (txt) word.appendChild(document.createTextNode(txt));
      });
      btn.appendChild(em);
      btn.appendChild(word);
      btn.addEventListener('click', function () {
        clearSylTimers();
        bounce(btn, 'lit');
        play([{ clip: window.palabraClip(ex[0]), pitch: 1, rate: 0.9 }]);
      });
      elExamples.appendChild(btn);
    });

    elSylScreen.classList.remove('revealed');   // sin pistas hasta tocar la sílaba
  }

  elLetterC.addEventListener('click', function () {
    bounce(elLetterC, 'lit');
    play([{ clip: window.letraClip(window.letrasDe(sylItem()[0])[0]), pitch: 1, rate: 0.9 }]);
  });
  elLetterV.addEventListener('click', function () {
    bounce(elLetterV, 'lit');
    play([{ clip: window.letraClip(window.letrasDe(sylItem()[0])[1]), pitch: 1, rate: 0.9 }]);
  });
  // Al tocar la sílaba: suena la explicación y aparecen las letras y el ejemplo
  elBigSyl.addEventListener('click', function () {
    clearSylTimers();
    elSylScreen.classList.add('revealed');
    explainSyl();
  });
  // Con letras elegidas en el rincón de padres, se saltan las demás
  function sylAllowed(i) {
    if (!settings.letters || !settings.letters.length) return true;
    var x = SILABAS[((i % SILABAS.length) + SILABAS.length) % SILABAS.length];
    return settings.letters.indexOf(window.letrasDe(x[0])[0]) >= 0;
  }
  function stepSyl(d) {
    for (var k = 0; k < SILABAS.length; k++) {
      sylIndex += d;
      if (sylAllowed(sylIndex)) break;
    }
    showSyl();
  }
  document.getElementById('nextSyl').addEventListener('click', function () { stepSyl(1); });
  document.getElementById('prevSyl').addEventListener('click', function () { stepSyl(-1); });


  // ---------- Juegos: busca la sílaba que se oye y busca la palabra del dibujo ----------
  var elQuiz = document.getElementById('quiz');
  var elQuizEar = document.getElementById('quizEar');
  var elQuizPic = document.getElementById('quizPic');
  var elQuizMsg = document.getElementById('quizMsg');
  var elQuizAsk = document.getElementById('quizAsk');
  var elBuildSlots = document.getElementById('buildSlots');

  // El altavoz y el dibujo se ajustan al hueco real que queda entre la barra y los botones
  function fitQuiz() {
    if (elQuiz.hidden) return;
    var h = elQuizAsk.clientHeight, w = elQuizAsk.clientWidth;
    if (!w) return;
    var ear = Math.round(Math.max(50, Math.min(h * 0.78, w * 0.6, 300)));
    elQuizEar.style.width = elQuizEar.style.height = ear + 'px';
    if (quizMode === 'build') {
      // arriba el dibujo, abajo los huecos para las sílabas
      elQuizPic.style.fontSize = Math.round(Math.max(36, Math.min(h * 0.46, w * 0.5))) + 'px';
      var ns = quizItem ? quizItem.answer.sils.length : 2;
      elBuildSlots.style.fontSize = Math.round(Math.max(24, Math.min(h * 0.3, w * (ns > 3 ? 0.1 : ns > 2 ? 0.13 : 0.17)))) + 'px';
    } else {
      elQuizPic.style.fontSize = Math.round(Math.max(40, Math.min(h * 0.72, w * 0.6))) + 'px';
    }
  }
  // Reduce la letra de cada botón hasta que la palabra cabe entera
  function fitButtons() {
    quizButtons.forEach(function (btn) {
      if (btn.hidden) return;
      btn.style.fontSize = '';
      var fs = parseFloat(window.getComputedStyle(btn).fontSize) || 40;
      for (var k = 0; k < 30 && btn.scrollWidth > btn.clientWidth + 1 && fs > 12; k++) {
        fs *= 0.92;
        btn.style.fontSize = fs + 'px';
      }
    });
  }
  window.addEventListener('resize', function () { fitQuiz(); fitButtons(); });
  window.addEventListener('orientationchange', function () { setTimeout(function () { fitQuiz(); fitButtons(); }, 300); });
  var quizButtons = Array.prototype.slice.call(document.querySelectorAll('#quizOpts .opt'));
  var QUIZ_LEVEL_KEY = 'sumas.nivelSilabas';
  var QUIZ_PER_LEVEL = 10;          // aciertos para pasar a la siguiente letra
  var quizMode = null;              // sylq | wordq | build
  var quizState = 'idle';           // idle | playing | feedback
  var quizItem = null;
  var quizLast = null;
  var quizLock = 0;
  var quizTimers = [];
  function quizLater(ms, fn) { quizTimers.push(setTimeout(fn, ms)); }
  function stopQuiz() {
    quizTimers.forEach(clearTimeout); quizTimers = [];
    quizState = 'idle';
    elQuiz.hidden = true;
  }
  function pick(arr) { return arr[randInt(arr.length)]; }

  // Sílabas agrupadas por consonante, en el orden de palabras.js (sin la H, que no suena)
  var SYL_GROUPS = [];
  SILABAS.forEach(function (x) {
    var c = window.letrasDe(x[0])[0];
    if (c === 'H') return;
    var g = SYL_GROUPS[SYL_GROUPS.length - 1];
    if (!g || g.c !== c) SYL_GROUPS.push(g = { c: c, sils: [] });
    g.sils.push(x[0]);
  });
  // Cómo suena: BA y VA, YA y LLA, GE y JE suenan igual; nunca salen juntas
  function soundOf(syl) {
    return syl.toLowerCase().replace(/^v/, 'b').replace(/^ll/, 'y').replace(/^g([ei])/, 'j$1');
  }
  var quizLevel = { groups: 3, hits: 0 };   // empieza con M, P y L
  try {
    var saved = JSON.parse(localStorage.getItem(QUIZ_LEVEL_KEY));
    if (saved && saved.groups) quizLevel = saved;
  } catch (e) {}
  function saveLevel() { try { localStorage.setItem(QUIZ_LEVEL_KEY, JSON.stringify(quizLevel)); } catch (e) {} }

  // Letras elegidas en el rincón de padres (o null = automático)
  function chosenGroups() {
    if (!settings.letters || !settings.letters.length) return null;
    var g = SYL_GROUPS.filter(function (x) { return settings.letters.indexOf(x.c) >= 0; });
    return g.length ? g : null;
  }

  function sylRound() {
    var groups = chosenGroups();
    var auto = !groups;
    if (auto) groups = SYL_GROUPS.slice(0, Math.min(Math.max(quizLevel.groups, 1), SYL_GROUPS.length));
    var n = groups.length;
    var pool = [];
    groups.forEach(function (g) { pool = pool.concat(g.sils); });
    // en automático, la mitad de las veces sale una sílaba de la última letra aprendida
    var target;
    do {
      target = (auto && n > 1 && Math.random() < 0.5) ? pick(groups[n - 1].sils) : pick(pool);
    } while (target === quizLast && pool.length > 1);
    var used = [soundOf(target)];
    var opts = [target];
    function tryAdd(list) {
      list = shuffle(list.slice());
      for (var k = 0; k < list.length; k++) {
        if (used.indexOf(soundOf(list[k])) < 0) { opts.push(list[k]); used.push(soundOf(list[k])); return; }
      }
    }
    var c = window.letrasDe(target)[0], v = window.letrasDe(target)[1];
    tryAdd(pool.filter(function (x) { return window.letrasDe(x)[0] === c; }));   // misma letra: MA / MO
    tryAdd(pool.filter(function (x) { return window.letrasDe(x)[1] === v; }));   // misma vocal: MA / PA
    for (var t = 0; t < 4 && opts.length < 4; t++) tryAdd(pool);
    return { answer: target, options: shuffle(opts), clip: 'q-' + window.clipNorm(target) };
  }

  // Palabras para el juego del dibujo: las de leer y las de los ejemplos de sílabas
  var QUIZ_WORDS = [];
  (function () {
    var seen = {};
    function add(w, emoji) {
      var text = noTildes(w.replace(/-/g, ''));
      if (seen[text] || text.length > 8 || w.split('-').length > 3) return;
      seen[text] = true;
      QUIZ_WORDS.push({ text: text, sils: noTildes(w).split('-'), emoji: emoji, clip: window.palabraClip(w) });
    }
    (window.PALABRAS || []).forEach(function (p) { add(p[0], p[1]); });
    SILABAS.forEach(function (x) { x[1].forEach(function (ex) { add(ex[0], ex[1]); }); });
  })();

  function wordRound() {
    var target;
    do { target = pick(QUIZ_WORDS); } while (target === quizLast && QUIZ_WORDS.length > 1);
    var others = QUIZ_WORDS.filter(function (w) { return w !== target && w.emoji !== target.emoji; });
    var opts = [target];
    function tryAdd(list) {
      list = shuffle(list.filter(function (w) { return opts.indexOf(w) < 0; }));
      if (list.length) opts.push(list[0]);
    }
    // palabras parecidas, para que haya que leerlas: CASA / CAMA / CAJA
    tryAdd(others.filter(function (w) { return w.sils[0] === target.sils[0]; }));
    tryAdd(others.filter(function (w) {
      return w.sils[w.sils.length - 1] === target.sils[target.sils.length - 1] || w.text.charAt(0) === target.text.charAt(0);
    }));
    while (opts.length < 4 && opts.length <= others.length) tryAdd(others);
    return { answer: target, options: shuffle(opts), clip: target.clip };
  }

  // Forma palabras: palabras de 3 y 4 sílabas cortas (PA-LO-MA, MA-RI-PO-SA, CA-NO-A...)
  var BUILD_WORDS = [];
  (function () {
    var seen = {};
    function add(w, emoji) {
      var sils = noTildes(w).split('-'), text = sils.join('');
      if (seen[text] || sils.length < 3 || sils.length > 4) return;
      if (!sils.every(function (s) { return s.length <= 2; })) return;
      seen[text] = true;
      BUILD_WORDS.push({ text: text, sils: sils, emoji: emoji, clip: window.palabraClip(w) });
    }
    (window.PALABRAS || []).forEach(function (p) { add(p[0], p[1]); });
    SILABAS.forEach(function (x) { x[1].forEach(function (ex) { add(ex[0], ex[1]); }); });
    (window.PALABRAS_LARGAS || []).forEach(function (p) { add(p[0], p[1]); });
  })();
  var BUILD_POOL = [];   // sílabas para despistar (solo las que tienen su audio)
  SYL_GROUPS.forEach(function (g) { g.sils.forEach(function (s) { if (s.length === 2) BUILD_POOL.push(s); }); });

  function buildRound() {
    var target;
    do { target = pick(BUILD_WORDS); } while (target === quizLast && BUILD_WORDS.length > 1);
    var sounds = target.sils.map(soundOf);
    // nunca una que suene igual que una de las buenas (VA / BA)
    var cand = BUILD_POOL.filter(function (s) { return sounds.indexOf(soundOf(s)) < 0; });
    var similar = cand.filter(function (s) {
      return target.sils.some(function (t) { return t.charAt(0) === s.charAt(0) || t.charAt(1) === s.charAt(1); });
    });
    var extra = [], nExtra = Math.max(0, 4 - target.sils.length);   // siempre 4 botones grandes
    [shuffle(similar), shuffle(cand)].forEach(function (list) {
      for (var k = 0; k < list.length && extra.length < nExtra; k++) {
        if (extra.indexOf(list[k]) < 0) { extra.push(list[k]); break; }
      }
    });
    for (var k = 0; k < cand.length && extra.length < nExtra; k++) if (extra.indexOf(cand[k]) < 0) extra.push(cand[k]);
    return { answer: target, options: shuffle(target.sils.concat(extra)), step: 0, misses: 0, clip: target.clip };
  }

  // Sonido de la sílaba al colocarla (la R suave y la H no tienen grabación sola)
  function buildSylClip(w, i) {
    if (window.silabaClip(w.sils, i).indexOf('-suave') > 0) return null;
    var c = 'q-' + window.clipNorm(w.sils[i]);
    return CLIPS[c] ? c : null;
  }

  function sayBuildWord() {
    bounce(elQuizPic, 'cheer');
    play([{ clip: quizItem.answer.clip, pitch: 1, rate: 0.9 }]);
  }

  function buildTap(btn) {
    if (quizState !== 'playing' || Date.now() < quizLock || btn.classList.contains('used')) return;
    quizLock = Date.now() + 250;
    var item = quizItem, w = item.answer;
    if (btn.quizValue !== w.sils[item.step]) {
      item.misses++;
      bounce(btn, 'nope');
      play([{ clip: 'uy', pitch: 1.1, rate: 1 }]);
      if (item.misses >= 2) {          // ayuda: brilla la que toca
        var need = w.sils[item.step];
        quizButtons.some(function (b) {
          if (!b.hidden && !b.classList.contains('used') && b.quizValue === need) { b.classList.add('hint'); return true; }
        });
      }
      return;
    }
    btn.classList.remove('hint');
    btn.classList.add('used');
    var slot = elBuildSlots.children[item.step];
    slot.textContent = w.sils[item.step];
    slot.classList.add('filled');
    bounce(slot, 'lit');
    var clip = buildSylClip(w, item.step);
    item.step++;
    if (item.step < w.sils.length) {
      if (clip) play([{ clip: clip, pitch: 1, rate: 0.9 }]);
      return;
    }
    // palabra completa
    quizState = 'feedback';
    record('build', w.text, item.misses === 0);
    quizButtons.forEach(function (b) { b.classList.remove('hint'); if (!b.classList.contains('used')) b.classList.add('dim'); });
    elBuildSlots.classList.add('done');
    elQuizMsg.className = 'msg';
    elQuizMsg.textContent = '¡Muy bien Inés!';
    elQuizMsg.hidden = false;
    var prize = addPoint();
    var done = false;
    function next() {
      if (done || quizState !== 'feedback') return;
      done = true;
      if (prize) showReward(prize, quizRound); else quizRound();
    }
    var list = [{ clip: w.clip, pitch: 1, rate: 0.9, onStart: function () { bounce(elQuizPic, 'cheer'); } },
                { clip: 'muy-bien', pitch: 1.1, rate: 1 }];
    if (clip) list.unshift({ clip: clip, pitch: 1, rate: 0.9 });
    play(list, function () { quizLater(700, next); });
    quizLater(7000, next);
  }

  function startQuiz(m) {
    quizMode = m;
    quizLast = null;
    elQuiz.hidden = false;
    elQuiz.classList.toggle('words', m === 'wordq');
    elQuiz.classList.toggle('build', m === 'build');
    quizRound();
  }

  function quizRound() {
    quizTimers.forEach(clearTimeout); quizTimers = [];
    stopSound();
    quizItem = quizMode === 'sylq' ? sylRound() : quizMode === 'build' ? buildRound() : wordRound();
    quizLast = quizItem.answer;
    elQuizMsg.hidden = true;
    elQuizEar.hidden = quizMode !== 'sylq';
    elQuizPic.hidden = quizMode === 'sylq';
    elBuildSlots.hidden = quizMode !== 'build';
    if (quizMode === 'build') {
      elBuildSlots.className = 'build-slots';
      elBuildSlots.innerHTML = '';
      quizItem.answer.sils.forEach(function () {
        var sp = document.createElement('span');
        sp.className = 'bslot';
        elBuildSlots.appendChild(sp);
      });
    }
    if (quizMode !== 'sylq') {
      elQuizPic.textContent = quizItem.answer.emoji;
      bounce(elQuizPic, 'cheer');
    }
    quizButtons.forEach(function (btn, k) {
      var o = quizItem.options[k];
      btn.className = 'opt';
      btn.hidden = !o;
      if (!o) return;
      var text = quizMode === 'wordq' ? o.text : o;
      btn.textContent = '';
      if (quizMode === 'wordq') {
        // separada en sílabas, cada una con su arco debajo: CA‿SA
        o.sils.forEach(function (sy) {
          var sp = document.createElement('span');
          sp.className = 'qsyl';
          sp.textContent = sy;
          btn.appendChild(sp);
        });
        btn.setAttribute('aria-label', text);
      } else {
        btn.textContent = text;
        btn.removeAttribute('aria-label');
      }
      btn.style.setProperty('--len', Math.max(text.length + (quizMode === 'wordq' ? (o.sils.length - 1) * 0.4 : 0), 3));
      btn.quizValue = o;
    });
    quizState = 'playing';
    quizLock = Date.now() + LOCK_MS;
    fitQuiz();
    fitButtons();
    if (quizMode === 'sylq') askSyl();
    if (quizMode === 'build' || quizMode === 'wordq') sayBuildWord();   // dice la palabra del dibujo
  }

  function askSyl() {
    bounce(elQuizEar, 'lit');
    play([{ clip: quizItem.clip, pitch: 1, rate: 0.9 }]);
  }

  function quizAnswer(btn) {
    if (quizState !== 'playing' || Date.now() < quizLock) return;
    quizState = 'feedback';
    quizLock = Date.now() + LOCK_MS;
    var ok = btn.quizValue === quizItem.answer;
    if (quizMode === 'sylq') record('syl', quizItem.answer, ok);
    else record('word', quizItem.answer.text, ok);
    quizButtons.forEach(function (b) {
      if (b.quizValue === quizItem.answer) b.classList.add('correct');
      else if (b === btn) b.classList.add('wrong');
      else b.classList.add('dim');
    });
    elQuizMsg.className = 'msg' + (ok ? '' : ' almost');
    elQuizMsg.textContent = ok ? '¡Muy bien Inés!' : '¡Casi!';
    elQuizMsg.hidden = false;

    var list;
    if (quizMode === 'sylq') {
      // al fallar se explica la buena: "La eme con la a, ma."
      list = ok ? [{ clip: 'muy-bien', pitch: 1.1, rate: 1 }]
                : [{ clip: 'uy', pitch: 1.1, rate: 0.95 },
                   { clip: window.silabaClip([quizItem.answer], 0), pitch: 1, rate: 0.9 }];
      if (ok && !chosenGroups() && ++quizLevel.hits >= QUIZ_PER_LEVEL && quizLevel.groups < SYL_GROUPS.length) {
        quizLevel.groups++;      // una letra nueva
        quizLevel.hits = 0;
      }
      saveLevel();
    } else {
      list = [{ clip: ok ? 'muy-bien' : 'uy', pitch: 1.1, rate: 1 },
              { clip: quizItem.answer.clip, pitch: 1, rate: 0.9 }];
    }
    var prize = ok ? addPoint() : null;
    // siguiente cuando acabe el audio (o, si algo falla, a los pocos segundos)
    var done = false;
    function next() {
      if (done || quizState !== 'feedback') return;
      done = true;
      if (prize) showReward(prize, quizRound); else quizRound();
    }
    play(list, function () { quizLater(ok ? 500 : 900, next); });
    quizLater(ok ? 4000 : 6000, next);
  }

  quizButtons.forEach(function (btn) {
    btn.addEventListener('click', function () { if (quizMode === 'build') buildTap(btn); else quizAnswer(btn); });
  });
  elQuizPic.addEventListener('click', function () {
    if (quizState === 'playing' && (quizMode === 'build' || quizMode === 'wordq')) sayBuildWord();
  });
  elQuizEar.addEventListener('click', function () {
    if (quizState === 'playing') askSyl();
  });

  document.addEventListener('visibilitychange', function () {
    if (quizState === 'idle' || rewardOpen) return;
    if (document.hidden) {
      quizTimers.forEach(clearTimeout); quizTimers = [];
      stopSound();
      quizState = 'feedback';
    } else {
      resumeCtx();
      quizRound();
    }
  });


  // ---------- Traza letras: repasar la letra con el dedo ----------
  // Cada letra son trazos en una caja de 100x100 (y hacia abajo), en el orden en que se escriben.
  function arc(cx, cy, rx, ry, a0, a1) {
    var pts = [], n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / 6));
    for (var k = 0; k <= n; k++) {
      var a = (a0 + (a1 - a0) * k / n) * Math.PI / 180;
      pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
    }
    return pts;
  }
  function path() {   // une puntos sueltos y arcos en un solo trazo
    var out = [];
    Array.prototype.forEach.call(arguments, function (p) {
      if (typeof p[0] === 'number') out.push(p); else out = out.concat(p);
    });
    return out;
  }
  var tilde = [];
  for (var tk = 0; tk <= 20; tk++) tilde.push([30 + 40 * tk / 20, 13 - 5 * Math.sin(2 * Math.PI * tk / 20)]);
  var P_BOWL = path([28, 10], [52, 10], arc(52, 30, 22, 20, -90, 90), [28, 50]);
  var LETTER_STROKES = {
    A: [[[50, 10], [18, 90]], [[50, 10], [82, 90]], [[31, 62], [69, 62]]],
    E: [[[28, 10], [28, 90]], [[28, 10], [74, 10]], [[28, 50], [66, 50]], [[28, 90], [74, 90]]],
    I: [[[50, 10], [50, 90]]],
    O: [arc(50, 50, 32, 40, -90, -450)],
    U: [path([22, 10], arc(50, 58, 28, 32, 180, 0), [78, 10])],
    M: [[[18, 10], [18, 90]], [[18, 10], [50, 62], [82, 10], [82, 90]]],
    P: [[[28, 10], [28, 90]], P_BOWL],
    L: [[[30, 10], [30, 90], [74, 90]]],
    S: [path(arc(50, 30, 24, 20, -30, -270), arc(50, 70, 24, 20, -90, 150))],
    T: [[[18, 10], [82, 10]], [[50, 10], [50, 90]]],
    N: [[[22, 10], [22, 90]], [[22, 10], [78, 90], [78, 10]]],
    D: [[[28, 10], [28, 90]], path([28, 10], [42, 10], arc(42, 50, 36, 40, -90, 90), [28, 90])],
    B: [[[28, 10], [28, 90]], path([28, 10], [50, 10], arc(50, 29, 20, 19, -90, 90), [28, 48]),
        path([28, 48], [54, 48], arc(54, 69, 22, 21, -90, 90), [28, 90])],
    C: [arc(54, 50, 34, 40, -40, -320)],
    F: [[[28, 10], [28, 90]], [[28, 10], [74, 10]], [[28, 50], [64, 50]]],
    G: [path(arc(52, 50, 34, 40, -40, -360), [60, 50])],
    R: [[[28, 10], [28, 90]], P_BOWL, [[46, 50], [78, 90]]],
    V: [[[18, 10], [50, 90], [82, 10]]],
    J: [[[36, 10], [82, 10]], path([66, 10], arc(44, 64, 22, 26, 0, 170))],   // con raya, como la letra de arriba
    Z: [[[20, 10], [80, 10], [20, 90], [80, 90]]],
    'Ñ': [[[22, 24], [22, 92]], [[22, 24], [78, 92], [78, 24]], tilde],
    Y: [[[18, 10], [50, 50]], [[82, 10], [50, 50], [50, 90]]],
    H: [[[22, 10], [22, 90]], [[78, 10], [78, 90]], [[22, 50], [78, 50]]]
  };
  var VOWELS = ['A', 'E', 'I', 'O', 'U'];
  var TRACE_ORDER = VOWELS.concat(['M', 'P', 'L', 'S', 'T', 'N', 'D', 'B', 'C', 'F', 'G', 'R', 'V', 'J', 'Z', 'Ñ', 'Y', 'H']);
  // puntos cada 2 unidades, para seguir el dedo
  function densify(pts) {
    var out = [pts[0]];
    for (var k = 1; k < pts.length; k++) {
      var a = pts[k - 1], b = pts[k], d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(d / 2));
      for (var s = 1; s <= n; s++) out.push([a[0] + (b[0] - a[0]) * s / n, a[1] + (b[1] - a[1]) * s / n]);
    }
    return out;
  }
  Object.keys(LETTER_STROKES).forEach(function (l) { LETTER_STROKES[l] = LETTER_STROKES[l].map(densify); });
  // Otras formas de escribir la misma letra que también valen al escribir sin guía
  var LETTER_VARIANTS = {
    J: [[path([66, 10], arc(44, 64, 22, 26, 0, 170))]],                    // J sin raya
    I: [[[[50, 10], [50, 90]], [[34, 10], [66, 10]], [[34, 90], [66, 90]]]]   // I con rayas arriba y abajo
  };
  Object.keys(LETTER_VARIANTS).forEach(function (l) {
    LETTER_VARIANTS[l] = LETTER_VARIANTS[l].map(function (v) { return v.map(densify); });
  });

  var TRACE_KEY = 'sumas.trazo';
  var TRACE_TOL = 11;                 // cuánto puede separarse del camino y seguir contando como bien
  var STROKE_COLORS = ['#1e6fe0', '#e63946', '#8338c9', '#e07b00'];
  var elTrace = document.getElementById('trace');
  var elTraceArea = document.getElementById('traceArea');
  var elTraceCanvas = document.getElementById('traceCanvas');
  var elTraceMsg = document.getElementById('traceMsg');
  var elTraceFace = document.getElementById('traceFace');
  var tctx = elTraceCanvas.getContext ? elTraceCanvas.getContext('2d') : null;
  var traceIndex = 0;
  try { traceIndex = parseInt(localStorage.getItem(TRACE_KEY), 10) || 0; } catch (e) {}
  var tr = null;                      // { letter, strokes, s, inks, ink, bad, fails, state }
  var traceBox = { x: 0, y: 0, k: 1 };
  var traceTimers = [];
  var traceRaf = 0;
  var faceTimer = null;
  var demo = null;                    // { t0 } animación del dedo-guía
  var tracking = false;
  var lastTouch = 0;
  var tmode = 'trace';                // trace (letras) | tword (escribe palabras) | tmiss (la letra que falta)
  var wItem = null;                   // palabra de tword / tmiss: { text, letters, emoji, clip, pos, fails }
  var elTraceTarget = document.getElementById('traceTarget');
  var elTraceClear = document.getElementById('traceClear');
  var elPrevTrace = document.getElementById('prevTrace');
  // Dictado: nivel 1 copia (ve la palabra), 2 dictado de 2 sílabas, 3 dictado de 3 sílabas.
  // En automático sube tras 4 palabras seguidas sin ayuda y baja tras 3 seguidas con ayuda.
  var DICT_KEY = 'sumas.dictado';
  var dict = { lvl: 1, good: 0, bad: 0 };
  try {
    var dictSaved = JSON.parse(localStorage.getItem(DICT_KEY));
    if (dictSaved && dictSaved.lvl >= 1 && dictSaved.lvl <= 3) dict = dictSaved;
  } catch (e) {}
  function saveDict() { try { localStorage.setItem(DICT_KEY, JSON.stringify(dict)); } catch (e) {} }
  function dictLevel() { return settings.dictLevel || dict.lvl; }
  var DICT_NAMES = { 1: 'copia (ve la palabra escrita)', 2: 'dictado de palabras de 2 sílabas', 3: 'dictado de palabras de 3 sílabas' };
  var FREE_WAIT_MS = 1800;            // sin tocar este tiempo: se corrige la letra escrita a mano

  function traceLetters() {
    if (!settings.letters || !settings.letters.length) return TRACE_ORDER;
    return TRACE_ORDER.filter(function (l) { return VOWELS.indexOf(l) >= 0 || settings.letters.indexOf(l) >= 0; });
  }
  function traceLater(ms, fn) { traceTimers.push(setTimeout(fn, ms)); }
  function stopTrace() {
    traceTimers.forEach(clearTimeout); traceTimers = [];
    if (tr) clearTimeout(tr.judgeTimer);
    wItem = null;
    if (traceRaf) cancelAnimationFrame(traceRaf);
    traceRaf = 0;
    tracking = false;
    tr = null;
    elTraceFace.hidden = true;
    elTrace.hidden = true;
  }

  function fitTrace() {
    if (elTrace.hidden || !tctx) return;
    var w = elTraceArea.clientWidth, h = elTraceArea.clientHeight;
    if (!w || !h) return;
    var dpr = window.devicePixelRatio || 1;
    elTraceCanvas.width = Math.round(w * dpr);
    elTraceCanvas.height = Math.round(h * dpr);
    elTraceCanvas.style.width = w + 'px';
    elTraceCanvas.style.height = h + 'px';
    var size = Math.min(w, h) * 0.92;
    traceBox = { x: (w - size) / 2, y: (h - size) / 2, k: size / 100, dpr: dpr };
  }
  window.addEventListener('resize', fitTrace);
  window.addEventListener('orientationchange', function () { setTimeout(fitTrace, 300); });

  function letterClip(l) { return window.letraClip(l); }

  // Carita: contenta si el trazo está bien, triste si no
  function showFace(ok, stay) {
    clearTimeout(faceTimer);
    elTraceFace.textContent = ok ? (stay ? '😄' : '😊') : '😟';
    elTraceFace.className = 'trace-face ' + (ok ? 'good' : 'bad');
    elTraceFace.hidden = false;
    bounce(elTraceFace, 'show');
    if (!stay) faceTimer = setTimeout(function () { elTraceFace.hidden = true; }, 1300);
  }

  // Palabras que empiezan por cada letra (la Ñ, que no empieza casi ninguna: que la lleven)
  var TRACE_WORDS = {};
  (function () {
    var all = [], seen = {};
    function add(w, emoji) {
      var text = w.replace(/-/g, '');
      if (seen[text]) return;
      seen[text] = true;
      all.push({ text: text, emoji: emoji, clip: window.palabraClip(w) });
    }
    (window.PALABRAS || []).forEach(function (p) { add(p[0], p[1]); });
    SILABAS.forEach(function (x) { x[1].forEach(function (ex) { add(ex[0], ex[1]); }); });
    (window.MAS_PALABRAS || []).forEach(function (p) { add(p[0], p[1]); });
    TRACE_ORDER.forEach(function (l) {
      TRACE_WORDS[l] = all.filter(function (w) {
        var t = noTildes(w.text);
        if (w.text.length > 9) return false;
        if (l === 'Ñ') return t.indexOf('Ñ') >= 0;
        if ((l === 'C' && /^CH/.test(t)) || (l === 'L' && /^LL/.test(t))) return false;
        return t.charAt(0) === l;
      });
    });
  })();
  var elTraceWords = document.getElementById('traceWords');

  function showTraceWords(letter) {
    var list = shuffle(TRACE_WORDS[letter].slice()), pickd = [];
    list.forEach(function (w) {
      if (pickd.length < 2 && !pickd.some(function (o) { return o.emoji === w.emoji; })) pickd.push(w);
    });
    elTraceWords.innerHTML = '';
    pickd.forEach(function (w) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'example';
      btn.setAttribute('aria-label', w.text.toLowerCase());
      var em = document.createElement('span');
      em.className = 'ex-emoji';
      em.textContent = w.emoji;
      var word = document.createElement('span');
      word.className = 'ex-word';
      var t = noTildes(w.text), at = t.indexOf(letter);   // la letra, resaltada
      word.appendChild(document.createTextNode(t.slice(0, at)));
      var hl = document.createElement('span');
      hl.className = 'hl';
      hl.textContent = letter;
      word.appendChild(hl);
      word.appendChild(document.createTextNode(t.slice(at + 1)));
      btn.appendChild(em);
      btn.appendChild(word);
      btn.addEventListener('click', function () {
        if (!tr || tr.state !== 'playing') return;
        bounce(btn, 'lit');
        play([{ clip: w.clip, pitch: 1, rate: 0.9 }]);
      });
      btn.traceWord = w;
      elTraceWords.appendChild(btn);
    });
    if (tr) tr.words = pickd;
  }

  // Prepara el lienzo para una letra. free: sin guía (se escribe a mano y se corrige al final)
  function newLetter(letter, free) {
    if (tr) clearTimeout(tr.judgeTimer);
    tr = { letter: letter, strokes: LETTER_STROKES[letter], s: 0, inks: [], ink: null, bad: null, fails: 0,
           state: 'playing', free: !!free, hint: false, judgeTimer: null };
    tracking = false;
    demo = null;
    elTraceMsg.hidden = true;
    clearTimeout(faceTimer);
    elTraceFace.hidden = true;
    elTraceClear.hidden = !free;
    fitTrace();
  }

  function showTrace(d) {
    if (tmode !== 'trace') { nextWriteRound(); return; }
    var list = traceLetters();
    traceTimers.forEach(clearTimeout); traceTimers = [];
    traceIndex = ((traceIndex + (d || 0)) % list.length + list.length) % list.length;
    try { localStorage.setItem(TRACE_KEY, String(traceIndex)); } catch (e) {}
    var letter = list[traceIndex];
    newLetter(letter, false);
    showTraceWords(letter);
    play([{ clip: letterClip(letter), pitch: 1, rate: 0.9 }]);
    startDemo(400);
  }

  // ---- Escribe palabras (letra a letra, con guía) y La letra que falta (sin guía) ----
  var WRITE_WORDS = [];
  (function () {
    var seen = {};
    function add(w, emoji) {
      var text = noTildes(w.replace(/-/g, ''));
      if (seen[text] || !/^[A-ZÑ]+$/.test(text)) return;
      seen[text] = true;
      WRITE_WORDS.push({ text: text, emoji: emoji, clip: window.palabraClip(w), sils: noTildes(w).split('-'), nsyl: w.split('-').length });
    }
    (window.PALABRAS || []).forEach(function (p) { add(p[0], p[1]); });
    SILABAS.forEach(function (x) { x[1].forEach(function (ex) { add(ex[0], ex[1]); }); });
    (window.MAS_PALABRAS || []).forEach(function (p) { add(p[0], p[1]); });
    (window.PALABRAS_LARGAS || []).forEach(function (p) { add(p[0], p[1]); });
  })();
  function canWrite(text) {
    for (var k = 0; k < text.length; k++) if (!LETTER_STROKES[text.charAt(k)]) return false;
    return true;
  }
  // Dictado: solo palabras que se escriben como suenan (sin B/V, H, LL/Y, RR, R al principio,
  // G/J y C/Z delante de E/I, ni GU), para que el fallo sea de oído y no de ortografía
  function dictSafe(t) {
    if (/[BVHYKQWX]/.test(t) || /LL|RR|CH|GU/.test(t) || t.charAt(0) === 'R') return false;
    if (/[CGJZ][EI]/.test(t)) return false;
    return canWrite(t);
  }
  function writeItem() {
    var lvl = dictLevel(), list;
    if (lvl === 1) {
      if (Math.random() < 0.35) {   // copia: a veces una sílaba suelta
        var syls = BUILD_POOL.filter(function (x) { return canWrite(x) && x.charAt(0) !== 'H' && CLIPS['q-' + window.clipNorm(x)]; });
        var syl = pick(syls);
        if (syl && (!wItem || wItem.text !== syl)) return { text: syl, emoji: '', clip: 'q-' + window.clipNorm(syl), sils: [syl] };
      }
      list = WRITE_WORDS.filter(function (w) { return w.nsyl === 2 && w.text.length >= 3 && w.text.length <= 4 && canWrite(w.text); });
    } else if (lvl === 2) {
      list = WRITE_WORDS.filter(function (w) { return w.nsyl === 2 && w.text.length <= 5 && dictSafe(w.text); });
    } else {
      list = WRITE_WORDS.filter(function (w) { return w.nsyl === 3 && w.text.length <= 7 && dictSafe(w.text); });
    }
    if (!list.length) list = WRITE_WORDS.filter(function (w) { return w.text.length <= 4 && canWrite(w.text); });
    var w;
    do { w = pick(list); } while (list.length > 1 && wItem && w.text === wItem.text);
    return w;
  }
  // Sílaba en la que está la letra pos, y si esa letra es la primera de su sílaba
  function sylAt(w, pos) {
    for (var i = 0, n = 0; i < w.sils.length; i++) { n += w.sils[i].length; if (pos < n) return i; }
    return w.sils.length - 1;
  }
  function sylStarts(w, pos) {
    for (var i = 0, n = 0; i < w.sils.length; i++) { if (n === pos) return true; n += w.sils[i].length; }
    return false;
  }
  // Sonido de la sílaba que está escribiendo ("ga..."); si no hay grabación, null
  function dictSylClip(w, pos) {
    if (w.sils.length < 2) return w.clip;
    return buildSylClip(w, sylAt(w, pos));
  }

  // La letra que falta: solo se quitan letras que se oyen sin dudas
  // (nunca B/V, H, Y, J ni G/C delante de E/I, ni una letra de LL, CH, RR, QU, GU)
  function missingPositions(t) {
    var out = [];
    for (var k = 0; k < t.length; k++) {
      var c = t.charAt(k), nx = t.charAt(k + 1), pv = t.charAt(k - 1);
      if (!LETTER_STROKES[c] || /[BVHYJ]/.test(c)) continue;
      if ((c === 'C' || c === 'G') && /[EI]/.test(nx)) continue;
      if ((c === 'L' && (nx === 'L' || pv === 'L')) || (c === 'R' && (nx === 'R' || pv === 'R'))) continue;
      if (c === 'C' && nx === 'H') continue;
      if (c === 'U' && /[QG]/.test(pv)) continue;
      out.push(k);
    }
    return out;
  }
  function missItem() {
    var list = WRITE_WORDS.filter(function (w) { return w.text.length >= 3 && w.text.length <= 7 && missingPositions(w.text).length; });
    var w;
    do { w = pick(list); } while (wItem && w.text === wItem.text && list.length > 1);
    var ps = missingPositions(w.text);
    var pos = ps[0] === 0 && Math.random() < 0.6 ? 0 : pick(ps);   // muchas veces, la primera
    return { text: w.text, emoji: w.emoji, clip: w.clip, pos: pos };
  }

  function renderTarget() {
    elTraceTarget.innerHTML = '';
    var ear = document.createElement('button');
    ear.type = 'button';
    ear.className = 'tt-pic';
    ear.setAttribute('aria-label', 'Escuchar otra vez');
    ear.textContent = wItem.emoji || '👂';
    ear.addEventListener('click', function () {
      bounce(ear, 'lit');
      var list = [{ clip: wItem.clip, pitch: 1, rate: 0.9 }];
      if (tmode === 'tword' && wItem.pos < wItem.text.length && wItem.sils.length > 1) {
        var sc = dictSylClip(wItem, wItem.pos);
        if (sc) list.push({ clip: sc, pitch: 1, rate: 0.85 });
      }
      play(list);
    });
    elTraceTarget.appendChild(ear);
    var word = document.createElement('div');
    word.className = 'tt-word';
    word.style.setProperty('--n', wItem.text.length);
    for (var k = 0; k < wItem.text.length; k++) {
      var sl = document.createElement('span');
      sl.className = 'tslot';
      sl.textContent = wItem.text.charAt(k);
      if (tmode === 'tmiss' && k === wItem.pos) { sl.className = 'tslot miss'; sl.textContent = '?'; }
      if (tmode === 'tword') {
        sl.className = 'tslot' + (k < wItem.pos ? ' done' : k === wItem.pos ? ' cur' : '') +
          (k > 0 && sylStarts(wItem, k) ? ' gap' : '');
        if (!wItem.copy && k >= wItem.pos) sl.textContent = '\u00a0';   // dictado: no se ve
      }
      word.appendChild(sl);
    }
    elTraceTarget.appendChild(word);
  }

  function nextWriteRound() {
    traceTimers.forEach(clearTimeout); traceTimers = [];
    if (tmode === 'tword') {
      var it = writeItem();
      wItem = { text: it.text, emoji: it.emoji, clip: it.clip, sils: it.sils, pos: 0, fails: 0, hinted: false,
                copy: dictLevel() === 1 };
      renderTarget();
      newLetter(wItem.text.charAt(0), true);
      var first = [{ clip: wItem.clip, pitch: 1, rate: 0.9 }];
      var sc = wItem.sils.length > 1 ? dictSylClip(wItem, 0) : null;
      if (sc) first.push({ clip: sc, pitch: 1, rate: 0.85 });
      if (wItem.copy) first.push({ clip: letterClip(wItem.text.charAt(0)), pitch: 1, rate: 0.9 });
      play(first);
    } else {
      var m = missItem();
      wItem = { text: m.text, emoji: m.emoji, clip: m.clip, pos: m.pos, fails: 0 };
      renderTarget();
      newLetter(wItem.text.charAt(wItem.pos), true);
      play([{ clip: wItem.clip, pitch: 1, rate: 0.9 }]);
    }
  }

  // Termina una letra bien hecha; según el juego, sigue con la palabra o pasa a otra
  function letterDone() {
    tr.state = 'feedback';
    demo = null;
    elTraceClear.hidden = true;
    if (tmode === 'tword' && tr.hint) wItem.hinted = true;
    if (tmode === 'tword' && wItem.pos < wItem.text.length - 1) {
      // Todo lo que suena es de la letra que toca ahora (no de la que acaba de escribir):
      // si empieza otra sílaba, cómo suena ("to..."); en copia, además, el nombre de la letra.
      var said = [];
      wItem.pos++;
      showFace(true);
      renderTarget();
      bounce(elTraceTarget.querySelectorAll('.tslot')[wItem.pos - 1], 'lit');
      if (sylStarts(wItem, wItem.pos)) {
        var sc = dictSylClip(wItem, wItem.pos);
        if (sc) said.push({ clip: sc, pitch: 1, rate: 0.85 });
      }
      if (wItem.copy) said.push({ clip: letterClip(wItem.text.charAt(wItem.pos)), pitch: 1, rate: 0.9 });
      if (said.length) play(said);
      var nextL = wItem.text.charAt(wItem.pos), item = wItem;
      traceLater(700, function () {
        if (wItem !== item) return;
        newLetter(nextL, true);
      });
      return;
    }
    var ok1 = tr.fails === 0;
    if (tmode === 'trace') record('trace', tr.letter, ok1);
    else if (tmode === 'tword') {
      record('write', wItem.text, wItem.fails === 0);
      if (!wItem.hinted) { dict.good++; dict.bad = 0; } else { dict.bad++; dict.good = 0; }
      if (dict.good >= 4 && dict.lvl < 3) { dict.lvl++; dict.good = 0; }
      if (dict.bad >= 3 && dict.lvl > 1) { dict.lvl--; dict.bad = 0; }
      saveDict();
      wItem.pos = wItem.text.length;
    } else record('miss', wItem.text, wItem.fails === 0);
    if (tmode !== 'trace') {
      renderTarget();
      var slots = elTraceTarget.querySelectorAll('.tslot');
      if (tmode === 'tmiss') {
        var sl = slots[wItem.pos];
        sl.className = 'tslot done';
        sl.textContent = wItem.text.charAt(wItem.pos);
        bounce(sl, 'lit');
      }
    }
    showFace(true, true);
    elTraceMsg.className = 'msg';
    elTraceMsg.textContent = '¡Muy bien Inés!';
    elTraceMsg.hidden = false;
    var prize = tmode === 'trace' ? null : addPoint();   // trazar con guía es muy fácil: no da estrellas
    var done = false, item = tr;
    function next() {
      if (done || tr !== item) return;
      done = true;
      if (prize) showReward(prize, function () { if (!elTrace.hidden) showTrace(1); });
      else showTrace(1);
    }
    var list = [{ clip: 'muy-bien', pitch: 1.1, rate: 1 }];
    if (tmode === 'trace') {
      // "¡Muy bien Inés! La eme, como en... mano, y moto"
      list.push({ clip: letterClip(item.letter), pitch: 1, rate: 0.9 });
      var chips = Array.prototype.slice.call(elTraceWords.children);
      if (chips.length) list.push({ clip: 'como-en', pitch: 1, rate: 0.95 });
      chips.forEach(function (btn, k) {
        if (k > 0) list.push({ clip: 'y', pitch: 1, rate: 0.95 });
        list.push({ clip: btn.traceWord.clip, pitch: 1, rate: 0.9, onStart: function () { bounce(btn, 'lit'); } });
      });
    } else {
      list.push({ clip: wItem.clip, pitch: 1, rate: 0.9, onStart: function () { bounce(elTraceTarget, 'cheer'); } });
    }
    play(list, function () { traceLater(900, next); });
    traceLater(12000, next);
  }

  function startDemo(delay) {
    demo = { t0: Date.now() + (delay || 0) };
    lastTouch = Date.now();
  }

  function startTrace(m) {
    tmode = m || 'trace';
    wItem = null;
    elTrace.hidden = false;
    elTrace.classList.toggle('writing', tmode !== 'trace');
    elTraceWords.hidden = tmode !== 'trace';
    elTraceTarget.hidden = tmode === 'trace';
    elPrevTrace.hidden = tmode !== 'trace';
    elScore4.parentNode.hidden = tmode === 'trace';   // trazar no da estrellas: sin contador
    var list = traceLetters();
    if (traceIndex >= list.length) traceIndex = 0;
    elTraceWords.innerHTML = '';
    showTrace(0);
    if (!traceRaf) traceRaf = requestAnimationFrame(drawTrace);
  }

  function toBox(pt) { return [traceBox.x + pt[0] * traceBox.k, traceBox.y + pt[1] * traceBox.k]; }

  function strokeLine(pts, upto, width, color) {
    if (!pts || upto < 1) return;
    tctx.beginPath();
    var a = toBox(pts[0]);
    tctx.moveTo(a[0], a[1]);
    for (var k = 1; k <= upto && k < pts.length; k++) { var b = toBox(pts[k]); tctx.lineTo(b[0], b[1]); }
    tctx.lineWidth = width * traceBox.k;
    tctx.strokeStyle = color;
    tctx.stroke();
  }
  function dot(pt, r, fill, ring) {
    var c = toBox(pt);
    tctx.beginPath();
    tctx.arc(c[0], c[1], r * traceBox.k, 0, Math.PI * 2);
    tctx.fillStyle = fill;
    tctx.fill();
    if (ring) { tctx.lineWidth = 1.6 * traceBox.k; tctx.strokeStyle = ring; tctx.stroke(); }
  }
  function arrowHead(pts) {   // flecha que indica hacia dónde ir desde el punto verde
    var j = Math.min(10, pts.length - 1), h = Math.min(j + 3, pts.length - 1);
    if (h <= 0) return;
    var a = toBox(pts[j]), b = toBox(pts[h]);
    var ang = Math.atan2(b[1] - a[1], b[0] - a[0]), s = 5 * traceBox.k;
    tctx.beginPath();
    tctx.moveTo(a[0] + Math.cos(ang) * s, a[1] + Math.sin(ang) * s);
    tctx.lineTo(a[0] + Math.cos(ang + 2.5) * s, a[1] + Math.sin(ang + 2.5) * s);
    tctx.lineTo(a[0] + Math.cos(ang - 2.5) * s, a[1] + Math.sin(ang - 2.5) * s);
    tctx.closePath();
    tctx.fillStyle = 'rgba(43, 178, 76, .85)';
    tctx.fill();
  }

  function drawTrace() {
    traceRaf = 0;
    if (elTrace.hidden || !tr || !tctx) return;
    traceRaf = requestAnimationFrame(drawTrace);
    var dpr = traceBox.dpr || 1, now = Date.now();
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tctx.clearRect(0, 0, elTraceCanvas.width, elTraceCanvas.height);
    tctx.lineCap = 'round';
    tctx.lineJoin = 'round';
    var S = tr.strokes;
    if (tr.free) {
      // pauta, como en el cuaderno: línea de arriba y de abajo
      [10, 90].forEach(function (y) { strokeLine([[-4, y], [104, y]], 1, 0.8, '#d9c58f'); });
      if (tctx.setLineDash) {
        tctx.setLineDash([2 * traceBox.k, 3 * traceBox.k]);
        strokeLine([[-4, 50], [104, 50]], 1, 0.6, '#e6d6a8');
        tctx.setLineDash([]);
      }
    }
    // guía: la letra en gris claro con una línea de puntos por el centro (sin guía si se escribe a mano)
    if (!tr.free || tr.hint) S.forEach(function (pts) { strokeLine(pts, pts.length - 1, 17, tr.free ? 'rgba(236, 220, 176, .8)' : '#ecdcb0'); });
    if ((!tr.free || tr.hint) && tctx.setLineDash) {
      tctx.setLineDash([2 * traceBox.k, 3 * traceBox.k]);
      S.forEach(function (pts) { strokeLine(pts, pts.length - 1, 1.2, '#c9a24a'); });
      tctx.setLineDash([]);
    }
    // lo que ha dibujado bien, con su color
    tr.inks.forEach(function (ink) { strokeLine(ink.pts, ink.pts.length - 1, 9, ink.color); });
    // el trazo mal hecho se borra poco a poco
    if (tr.bad) {
      var f = 1 - (now - tr.bad.t0) / 900;
      if (f <= 0) tr.bad = null;
      else {
        tctx.globalAlpha = f;
        (tr.bad.list || [tr.bad.pts]).forEach(function (pts) { strokeLine(pts, pts.length - 1, 9, '#9aa6b2'); });
        tctx.globalAlpha = 1;
      }
    }
    if (tr.state !== 'playing') return;
    if (tr.free) {
      if (tr.ink) strokeLine(tr.ink, tr.ink.length - 1, 9, STROKE_COLORS[tr.inks.length % STROKE_COLORS.length]);
      return;
    }
    var cur = S[tr.s];
    if (!tracking) {
      // si lleva un rato sin tocar, se vuelve a enseñar el camino
      if (!demo && now - lastTouch > 6000) startDemo(0);
      if (demo && now >= demo.t0) {
        var t = (now - demo.t0) / (cur.length * 22);
        if (t >= 1.25) demo = null;
        else {
          var gi = Math.min(cur.length - 1, Math.round(Math.min(t, 1) * (cur.length - 1)));
          strokeLine(cur, gi, 5, 'rgba(255, 194, 26, .7)');
          dot(cur[gi], 5, 'rgba(255, 194, 26, .95)');
        }
      }
      arrowHead(cur);
      dot(cur[0], 6.5 * (1 + 0.12 * Math.sin(now / 180)), '#2bb24c', '#fff');
    }
    // lo que está dibujando ahora (por donde quiera, también fuera)
    if (tr.ink) strokeLine(tr.ink, tr.ink.length - 1, 9, STROKE_COLORS[tr.s % STROKE_COLORS.length]);
  }

  function tracePoint(e) {
    var r = elTraceCanvas.getBoundingClientRect();
    return [(e.clientX - r.left - traceBox.x) / traceBox.k, (e.clientY - r.top - traceBox.y) / traceBox.k];
  }
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  function minDist(p, pts) {
    var m = Infinity;
    for (var k = 0; k < pts.length; k++) { var d = dist(p, pts[k]); if (d < m) m = d; }
    return m;
  }
  function inkLength(pts) {
    var l = 0;
    for (var k = 1; k < pts.length; k++) l += dist(pts[k - 1], pts[k]);
    return l;
  }

  // ¿Se parece el trazo al de la letra? Casi todo cerca del camino, el camino entero
  // recorrido, y empezando y acabando donde toca
  function judgeStroke(ink, path) {
    var near = 0, covered = 0, k;
    for (k = 0; k < ink.length; k++) if (minDist(ink[k], path) <= TRACE_TOL) near++;
    for (k = 0; k < path.length; k++) if (minDist(path[k], ink) <= TRACE_TOL) covered++;
    return near / ink.length >= 0.8 && covered / path.length >= 0.85 &&
      dist(ink[0], path[0]) <= TRACE_TOL * 1.6 && dist(ink[ink.length - 1], path[path.length - 1]) <= TRACE_TOL * 1.6;
  }

  // Letra escrita a mano (sin guía): se compara con todas las letras, sin importar dónde ni de qué
  // tamaño la haya escrito. Está bien si se parece a la buena y no se parece más a otra (E / F, P / R...)
  var TPL = {};
  Object.keys(LETTER_STROKES).forEach(function (l) {
    TPL[l] = [LETTER_STROKES[l]].concat(LETTER_VARIANTS[l] || []).map(function (st) { return [].concat.apply([], st); });
  });
  function bbox(a) {
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    a.forEach(function (p) { b[0] = Math.min(b[0], p[0]); b[1] = Math.min(b[1], p[1]); b[2] = Math.max(b[2], p[0]); b[3] = Math.max(b[3], p[1]); });
    return b;
  }
  function shapeScore(ink, tpl) {   // distancia media en las dos direcciones (menos = más parecida)
    var bi = bbox(ink), bt = bbox(tpl);
    var hi = bi[3] - bi[1], wi = bi[2] - bi[0], ht = bt[3] - bt[1], wt = bt[2] - bt[0];
    var sc = hi >= wi * 0.5 ? ht / Math.max(hi, 1) : wt / Math.max(wi, 1);
    var cxi = (bi[0] + bi[2]) / 2, cyi = (bi[1] + bi[3]) / 2, cxt = (bt[0] + bt[2]) / 2, cyt = (bt[1] + bt[3]) / 2;
    var n = ink.map(function (p) { return [(p[0] - cxi) * sc + cxt, (p[1] - cyi) * sc + cyt]; });
    var a = 0, b = 0, k;
    for (k = 0; k < n.length; k++) a += minDist(n[k], tpl);
    for (k = 0; k < tpl.length; k++) b += minDist(tpl[k], n);
    return a / n.length + b / tpl.length;
  }
  // Margen al escribir sin guía: parecido máximo y cuánto más parecida a su letra que a otra
  var FREE_MAX = 16, FREE_RATIO = 1.4;
  function judgeFree() {
    var pts = [];
    tr.inks.forEach(function (ink) { pts = pts.concat(ink.pts); });
    if (pts.length < 4) return false;
    var bi = bbox(pts);
    if (Math.max(bi[3] - bi[1], bi[2] - bi[0]) < 12) return false;   // un garabato muy pequeño
    if (pts.length > 160) {   // menos puntos, mismo dibujo (más rápido)
      var step = pts.length / 160, red = [];
      for (var k = 0; k < 160; k++) red.push(pts[Math.floor(k * step)]);
      pts = red;
    }
    function score(l) { return Math.min.apply(null, TPL[l].map(function (t) { return shapeScore(pts, t); })); }
    var own = score(tr.letter), best = Infinity;
    Object.keys(TPL).forEach(function (l) { if (l !== tr.letter) best = Math.min(best, score(l)); });
    return own <= FREE_MAX && own <= best * FREE_RATIO;
  }
  function freeCheck() {
    if (!tr || tr.state !== 'playing' || !tr.free || !tr.inks.length) return;
    if (judgeFree()) { letterDone(); return; }
    tr.fails++;
    wItem.fails++;
    tr.bad = { list: tr.inks.map(function (i) { return i.pts; }), t0: Date.now() };
    tr.inks = [];
    showFace(false);
    // a la segunda, se enseña la letra y se dice su nombre
    var list = [{ clip: 'uy', pitch: 1.1, rate: 1 }];
    if (tr.fails >= 2) { tr.hint = true; list.push({ clip: letterClip(tr.letter), pitch: 1, rate: 0.9 }); }
    else {
      // dictado: se repite la sílaba que está escribiendo; si no, la palabra
      var again = tmode === 'tword' ? dictSylClip(wItem, wItem.pos) : null;
      list.push({ clip: again || wItem.clip, pitch: 1, rate: 0.9 });
    }
    play(list);
  }

  function strokeEnd() {
    var ink = tr.ink;
    tr.ink = null;
    if (tr.free) {
      if (ink && inkLength(ink) >= 3) tr.inks.push({ pts: ink, color: STROKE_COLORS[tr.inks.length % STROKE_COLORS.length] });
      clearTimeout(tr.judgeTimer);
      if (tr.inks.length) tr.judgeTimer = setTimeout(freeCheck, FREE_WAIT_MS);
      return;
    }
    if (!ink || inkLength(ink) < 6) { if (!demo) startDemo(0); return; }   // solo un toque
    if (!judgeStroke(ink, tr.strokes[tr.s])) {
      tr.fails++;
      tr.bad = { pts: ink, t0: Date.now() };
      showFace(false);
      play([{ clip: 'uy', pitch: 1.1, rate: 1 }]);
      startDemo(1000);
      return;
    }
    tr.inks.push({ pts: ink, color: STROKE_COLORS[tr.s % STROKE_COLORS.length] });
    tr.s++;
    if (tr.s < tr.strokes.length) { showFace(true); startDemo(700); return; }
    letterDone();
  }

  function addInk(e) {
    var q = tracePoint(e), ink = tr.ink;
    if (!ink.length || dist(q, ink[ink.length - 1]) > 0.8) ink.push(q);
  }
  function onTraceDown(e) {
    if (!tr || tr.state !== 'playing') return;
    e.preventDefault();
    lastTouch = Date.now();
    tracking = true;
    demo = null;
    clearTimeout(tr.judgeTimer);
    tr.ink = [tracePoint(e)];
    try { elTraceCanvas.setPointerCapture(e.pointerId); } catch (err) {}
  }
  function onTraceMove(e) {
    if (!tracking || !tr || !tr.ink) return;
    e.preventDefault();
    lastTouch = Date.now();
    // con el dedo rápido llegan pocos puntos: se usan también los intermedios
    var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
    if (evs && evs.length) evs.forEach(addInk); else addInk(e);
  }
  function onTraceUp() {
    if (!tracking) return;
    tracking = false;
    lastTouch = Date.now();
    if (tr && tr.state === 'playing') strokeEnd();
  }
  elTraceCanvas.addEventListener('pointerdown', onTraceDown);
  elTraceCanvas.addEventListener('pointermove', onTraceMove);
  elTraceCanvas.addEventListener('pointerup', onTraceUp);
  elTraceCanvas.addEventListener('pointercancel', onTraceUp);
  // Safari: que no haga zoom, ni la lupa, ni se mueva la página al arrastrar
  elTraceCanvas.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
  elTraceCanvas.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });

  document.getElementById('nextTrace').addEventListener('click', function () { showTrace(1); });
  elTraceClear.addEventListener('click', function () {   // borrar lo escrito
    if (!tr || tr.state !== 'playing') return;
    clearTimeout(tr.judgeTimer);
    if (tr.inks.length) tr.bad = { list: tr.inks.map(function (i) { return i.pts; }), t0: Date.now() };
    tr.inks = [];
  });
  document.getElementById('prevTrace').addEventListener('click', function () { showTrace(-1); });
  document.getElementById('home6').addEventListener('click', goHome);

  document.addEventListener('visibilitychange', function () {
    if (elTrace.hidden || rewardOpen) return;
    if (document.hidden) { stopSound(); traceTimers.forEach(clearTimeout); traceTimers = []; }
    else if (tr && tr.state === 'feedback') showTrace(1);
  });

  // ---------- Premio nuevo y álbum ----------
  var elReward = document.getElementById('reward');
  var elRewardSticker = document.getElementById('rewardSticker');
  var elRewardOk = document.getElementById('rewardOk');
  var elConfetti = document.getElementById('confetti');
  var elAlbum = document.getElementById('album');
  var elAlbumGrid = document.getElementById('albumGrid');
  var elAlbumNext = document.getElementById('albumNext');
  var elAlbumDots = document.getElementById('albumDots');
  var rewardOpen = false;
  var rewardDone = null;
  var CONFETTI_COLORS = ['#1e6fe0', '#e5383b', '#ffc21a', '#1f9d45', '#8338c9', '#e0449a', '#12a1a8'];
  var GOLD_COLORS = ['#ffc21a', '#ffd95e', '#e0a100', '#fff1b8', '#f5b700'];
  var elAlbumShelf = document.getElementById('albumShelf');
  var elAlbumTitle = document.getElementById('albumTitle');

  function rewardScreen(emoji, cls, clips, onClose) {
    rewardOpen = true;
    rewardDone = onClose;
    elReward.className = 'reward' + (cls ? ' ' + cls : '');
    elRewardSticker.innerHTML = '';
    elRewardSticker.appendChild(stickerArt(emoji));
    elConfetti.innerHTML = '';
    var colors = cls ? GOLD_COLORS : CONFETTI_COLORS;
    for (var k = 0; k < 60; k++) {
      var c = document.createElement('i');
      c.style.left = (Math.random() * 100) + '%';
      c.style.background = colors[k % colors.length];
      c.style.animationDelay = (Math.random() * 1.2).toFixed(2) + 's';
      c.style.animationDuration = (2.2 + Math.random() * 1.8).toFixed(2) + 's';
      if (k % 3 === 0) c.style.borderRadius = '50%';
      elConfetti.appendChild(c);
    }
    elRewardOk.hidden = true;
    elReward.hidden = false;
    bounce(elRewardSticker, 'show');
    play(clips.map(function (c) { return { clip: c, pitch: 1, rate: c.indexOf('w-') === 0 ? 0.9 : 1 }; }));
    setTimeout(function () { elRewardOk.hidden = false; }, 1500);   // para no cerrarlo sin querer
  }
  // Pegatina nueva (dorada a veces); si completa un álbum, después sale la copa
  function showReward(sticker, onClose) {
    var then = onClose;
    if (sticker.done >= 0) then = function () {
      var more = sticker.done < ALBUMES.length - 1;
      rewardScreen('🏆', 'trophy', more ? ['album-completo', 'album-nuevo'] : ['album-completo'], onClose);
    };
    rewardScreen(sticker.e, sticker.gold ? 'gold' : '', [sticker.gold ? 'premio-oro' : 'premio', sticker.clip], then);
  }
  elRewardSticker.addEventListener('click', function () {
    bounce(elRewardSticker, 'show');
  });
  elRewardOk.addEventListener('click', function () {
    if (!rewardOpen) return;
    rewardOpen = false;
    elReward.hidden = true;
    elConfetti.innerHTML = '';
    stopSound();
    var fn = rewardDone;
    rewardDone = null;
    if (fn) fn();
  });

  // Puntitos que faltan para el próximo premio (en el botón del regalo y en el álbum)
  function dotsHtml(el) {
    el.innerHTML = '';
    var full = stickersOwned() >= STICKERS.length;
    el.hidden = full;
    if (full) return;
    var have = prizes.stars;
    for (var k = 0; k < STARS_PER_STICKER; k++) {
      var d = document.createElement('i');
      if (k < have) d.className = 'on';
      el.appendChild(d);
    }
  }
  function updateAlbumDots() {
    dotsHtml(elAlbumDots);
    dotsHtml(elAlbumNext);
  }

  // Álbum: arriba la estantería con todos los álbumes (🏆 los completos, 🔒 los que faltan)
  function showAlbum(ai) {
    var owned = stickersOwned(), cur = currentAlbum();
    if (ai === undefined || ai > cur) ai = cur;
    updateAlbumDots();
    elAlbumShelf.innerHTML = '';
    ALBUMES.forEach(function (a, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'shelf-btn' + (i === ai ? ' on' : '') + (albumDone(i) ? ' done' : '') + (i > cur ? ' locked' : '');
      b.setAttribute('aria-label', a.name);
      var e = document.createElement('span');
      e.textContent = i > cur ? '🔒' : a.icon;
      b.appendChild(e);
      if (i > cur) b.disabled = true;
      else b.addEventListener('click', function () { showAlbum(i); });
      elAlbumShelf.appendChild(b);
    });
    elAlbumGrid.innerHTML = '';
    var al = ALBUMES[ai];
    if (!al) return;
    // título: «Fantasía 12 / 21» (o con la copa si está completo)
    var have = Math.max(0, Math.min(owned - al.start, al.n));
    elAlbumTitle.innerHTML = '';
    elAlbumTitle.appendChild(document.createTextNode(al.icon + ' ' + al.name + ' '));
    var cnt = document.createElement('span');
    cnt.className = 'album-count';
    cnt.textContent = have >= al.n ? '🏆' : have + ' / ' + al.n;
    elAlbumTitle.appendChild(cnt);
    for (var k = 0; k < al.n; k++) (function (gi) {
      var st = STICKERS[gi];
      var b = document.createElement('button');
      b.type = 'button';
      var mine = gi < owned;
      b.className = 'sticker' + (mine ? '' : ' locked') + (mine && prizes.gold.indexOf(gi) >= 0 ? ' gold' : '');
      var e = document.createElement('span');
      e.appendChild(stickerArt(st.e));
      b.appendChild(e);
      if (mine) {
        b.addEventListener('click', function () {
          bounce(b, 'hop');
          play([{ clip: st.clip, pitch: 1, rate: 0.9 }]);
        });
      } else {
        b.disabled = true;
        b.setAttribute('aria-label', 'Premio sin conseguir');
      }
      elAlbumGrid.appendChild(b);
    })(al.start + k);
    elAlbumGrid.scrollTop = 0;
    elAlbum.hidden = false;
  }

  function openAlbum() {
    unlockSound();
    elStart.hidden = true;
    elStart.style.display = 'none';
    elGame.hidden = elReader.hidden = elSylScreen.hidden = elQuiz.hidden = true;
    showAlbum();
  }
  updateAlbumDots();


  // ---------- Rincón de padres ----------
  var elParents = document.getElementById('parents');
  var elAlbumBtn = document.getElementById('albumBtn');
  // [modo, nombre, explicación, grupo]
  var MODE_NAMES = [['sum', '➕ Sumas', '', 'Números'], ['sub', '➖ Restas', '', 'Números'],
                    ['syl', 'MA Sílabas', 'ver y oír cada sílaba', 'Letras'],
                    ['sylq', '👂 Escucha y busca', 'oye una sílaba y la busca', 'Letras'],
                    ['read', 'CA SA Leer palabras', 'palabras por sílabas', 'Letras'],
                    ['wordq', '🐱 Mira y lee', 've un dibujo y busca su palabra', 'Letras'],
                    ['build', '🧩 Forma palabras', 'ordena las sílabas', 'Letras'],
                    ['trace', '☝️ Traza letras', 'repasa letras con el dedo', 'Letras'],
                    ['tword', '✏️ Dictado', 'escribe lo que oye, letra a letra', 'Letras'],
                    ['tmiss', '❓ Letra que falta', 'escribe la letra sin ayuda', 'Letras']];
  var ALL_LETTERS = [];
  SILABAS.forEach(function (x) {
    var c = window.letrasDe(x[0])[0];
    if (ALL_LETTERS.indexOf(c) < 0) ALL_LETTERS.push(c);
  });

  function applyModes() {
    var sizes = {};
    modeButtons.forEach(function (b) {
      b.hidden = settings.hiddenModes.indexOf(b.dataset.mode) >= 0;
      b.classList.remove('span-last');
    });
    // si un grupo se queda sin modos, se oculta su recuadro; si no, sus columnas
    // se ajustan a los que quedan para que no haya huecos
    Array.prototype.forEach.call(document.querySelectorAll('.mode-group'), function (g) {
      var vis = g.querySelectorAll('.mode:not([hidden])'), n = vis.length;
      g.hidden = !n;
      var letters = g.classList.contains('group-letters');
      var cols = letters ? (n <= 3 ? n : n === 4 ? 2 : n <= 6 ? 3 : 4) : 1;
      g.style.setProperty('--cols', cols);
      g.style.setProperty('--cols-p', Math.max(1, Math.min(n, 2)));
      if (n > 1 && n % 2) vis[n - 1].classList.add('span-last');   // la que queda sola, centrada (vertical)
      sizes[letters ? 'l' : 'n'] = { n: n, cols: cols };
    });
    // tamaño de las tarjetas según cuántas filas y columnas hay
    var L = sizes.l || { n: 0, cols: 0 }, N = sizes.n || { n: 0, cols: 0 };
    var lcols = L.cols + (N.n ? 1 : 0);
    var lrows = Math.max(L.n ? Math.ceil(L.n / L.cols) : 0, N.n);
    var prows = (N.n ? 1 : 0) + Math.ceil(L.n / 2);
    var elModes = document.querySelector('.modes');
    elModes.style.setProperty('--lcols', Math.max(lcols, 1));
    elModes.style.setProperty('--lrows', Math.max(lrows, 1));
    elModes.style.setProperty('--prows', Math.max(prows, 1));
  }
  applyModes();

  // Toque corto en el regalo: álbum. Mantenerlo 3 segundos: rincón de padres.
  // Se gestiona a mano (sin "click") porque Safari cancela las pulsaciones largas en los botones.
  var holdTimer = null;
  var holdFired = false;
  var holdActive = false;
  var holdX = 0, holdY = 0;
  function holdStart(x, y) {
    clearTimeout(holdTimer);
    holdActive = true;
    holdFired = false;
    holdX = x; holdY = y;
    elAlbumBtn.classList.add('holding');
    holdTimer = setTimeout(function () {
      holdFired = true;
      holdActive = false;
      elAlbumBtn.classList.remove('holding');
      openParents();
    }, 3000);
  }
  function holdCancel() {
    clearTimeout(holdTimer);
    holdActive = false;
    elAlbumBtn.classList.remove('holding');
  }
  function holdEnd() {
    var wasTap = holdActive && !holdFired;
    holdCancel();
    if (wasTap) openAlbum();
  }
  function holdMove(x, y) {
    if (holdActive && (Math.abs(x - holdX) > 20 || Math.abs(y - holdY) > 20)) holdCancel();
  }
  // Dedos (iPhone, iPad, Android)
  elAlbumBtn.addEventListener('touchstart', function (e) {
    e.preventDefault();               // evita que Safari lo convierta en selección o menú
    var t = e.changedTouches[0];
    holdStart(t.clientX, t.clientY);
  }, { passive: false });
  elAlbumBtn.addEventListener('touchmove', function (e) {
    var t = e.changedTouches[0];
    holdMove(t.clientX, t.clientY);
  }, { passive: true });
  elAlbumBtn.addEventListener('touchend', function (e) { e.preventDefault(); holdEnd(); }, { passive: false });
  elAlbumBtn.addEventListener('touchcancel', holdCancel);
  // Ratón (ordenador)
  elAlbumBtn.addEventListener('mousedown', function (e) { if (e.button === 0) holdStart(e.clientX, e.clientY); });
  elAlbumBtn.addEventListener('mousemove', function (e) { holdMove(e.clientX, e.clientY); });
  elAlbumBtn.addEventListener('mouseup', holdEnd);
  elAlbumBtn.addEventListener('mouseleave', holdCancel);
  // Teclado (Intro / espacio): abre el álbum
  elAlbumBtn.addEventListener('click', function (e) { if (e.detail === 0) openAlbum(); });
  elAlbumBtn.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  function openParents() {
    stopSound();
    elStart.hidden = true;
    elStart.style.display = 'none';
    elGame.hidden = elReader.hidden = elSylScreen.hidden = elQuiz.hidden = elAlbum.hidden = true;
    stopTrace();
    renderParents();
    elParents.hidden = false;
    elParents.scrollTop = 0;
  }
  document.getElementById('parentsBack').addEventListener('click', goHome);

  function mk(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  // Botones de "elegir uno" (tiempo, números hasta)
  function segmented(el, options, value, onPick) {
    el.innerHTML = '';
    options.forEach(function (o) {
      var b = mk('button', 'p-opt' + (o[0] === value ? ' on' : ''), o[1]);
      b.type = 'button';
      b.addEventListener('click', function () { onPick(o[0]); renderParents(); });
      el.appendChild(b);
    });
  }

  function renderParents() {
    // Juegos activados
    var elModes = document.getElementById('pModes');
    elModes.innerHTML = '';
    var lastGroup = null;
    MODE_NAMES.forEach(function (m) {
      if (m[3] !== lastGroup) { lastGroup = m[3]; elModes.appendChild(mk('h3', '', m[3])); }
      var lab = mk('label', 'p-switch');
      var cb = mk('input');
      cb.type = 'checkbox';
      cb.setAttribute('role', 'switch');
      cb.checked = settings.hiddenModes.indexOf(m[0]) < 0;
      cb.addEventListener('change', function () {
        var hidden = settings.hiddenModes.filter(function (x) { return x !== m[0]; });
        if (!cb.checked) hidden.push(m[0]);
        if (hidden.length >= MODE_NAMES.length) { cb.checked = true; return; }   // al menos uno
        settings.hiddenModes = hidden;
        saveSettings();
        applyModes();
      });
      var txt = mk('span', 'p-switch-text');
      txt.appendChild(mk('b', '', m[1]));
      if (m[2]) txt.appendChild(mk('small', '', m[2]));
      lab.appendChild(txt);
      lab.appendChild(cb);
      lab.appendChild(mk('span', 'p-switch-ui'));
      elModes.appendChild(lab);
    });

    // Dictado
    segmented(document.getElementById('pDict'),
      [[0, 'Automático'], [1, 'Copia'], [2, '2 sílabas'], [3, '3 sílabas']], settings.dictLevel || 0,
      function (v) { settings.dictLevel = v; saveSettings(); });
    document.getElementById('pDictNote').textContent = settings.dictLevel
      ? 'Nivel fijo: ' + DICT_NAMES[settings.dictLevel] + '.'
      : 'Ahora está en: ' + DICT_NAMES[dict.lvl] + '. Sube tras 4 palabras seguidas sin ayuda y baja si necesita ayuda 3 veces seguidas.';

    // Sumas y restas
    segmented(document.getElementById('pTimer'),
      [[10, '10 s'], [20, '20 s'], [30, '30 s'], [0, 'Sin tiempo']], settings.timer,
      function (v) { settings.timer = v; saveSettings(); });
    segmented(document.getElementById('pMax'),
      [[5, '5'], [10, '10']], settings.maxNum,
      function (v) { settings.maxNum = v; saveSettings(); });

    // Letras
    var auto = !settings.letters || !settings.letters.length;
    var elAuto = document.getElementById('pAuto');
    elAuto.checked = auto;
    elAuto.onchange = function () {
      if (elAuto.checked) settings.letters = null;
      else {   // empieza con las letras que ya tiene en automático
        settings.letters = SYL_GROUPS.slice(0, Math.max(quizLevel.groups, 1)).map(function (g) { return g.c; });
      }
      saveSettings();
      renderParents();
    };
    var have = SYL_GROUPS.slice(0, Math.min(quizLevel.groups, SYL_GROUPS.length)).map(function (g) { return g.c; });
    document.getElementById('pLevel').textContent = auto
      ? 'Ahora practica: ' + have.join(', ') +
        (quizLevel.groups < SYL_GROUPS.length
          ? '. Le faltan ' + (QUIZ_PER_LEVEL - quizLevel.hits) + ' aciertos para la siguiente letra.'
          : '. Ya tiene todas las letras.')
      : 'Toca las letras para elegir cuáles salen.';
    var elLetters = document.getElementById('pLetters');
    elLetters.innerHTML = '';
    elLetters.classList.toggle('off', auto);
    ALL_LETTERS.forEach(function (c) {
      var on = auto ? have.indexOf(c) >= 0 : settings.letters.indexOf(c) >= 0;
      var b = mk('button', 'p-chip' + (on ? ' on' : ''), c);
      b.type = 'button';
      b.disabled = auto;
      b.addEventListener('click', function () {
        var l = settings.letters.slice();
        var i = l.indexOf(c);
        if (i >= 0) { if (l.length === 1) return; l.splice(i, 1); }   // al menos una
        else l.push(c);
        settings.letters = ALL_LETTERS.filter(function (x) { return l.indexOf(x) >= 0; });
        saveSettings();
        renderParents();
      });
      elLetters.appendChild(b);
    });
    var noteH = settings.letters && settings.letters.length === 1 && settings.letters[0] === 'H';
    if (noteH) document.getElementById('pLevel').textContent =
      'La H no suena, así que en «Busca la sílaba» se usará el modo automático.';

    // Premios: todos los álbumes, con lo que tiene y lo que le falta
    var elPA = document.getElementById('pAlbums');
    elPA.innerHTML = '';
    var nGold = prizes.gold.filter(function (k) { return k < prizes.got; }).length;
    document.getElementById('pPrizeNote').textContent =
      'Tiene ' + stickersOwned() + ' de ' + STICKERS.length + ' pegatinas' +
      (nGold ? ' (' + nGold + (nGold === 1 ? ' dorada)' : ' doradas)') : '') +
      (stickersOwned() < STICKERS.length
        ? '. Le faltan ' + (STARS_PER_STICKER - prizes.stars) + ' estrellas para la siguiente.'
        : '. ¡Lo tiene todo!') + ' Toca una pegatina para oír su nombre.';
    ALBUMES.forEach(function (al) {
      var have = Math.max(0, Math.min(stickersOwned() - al.start, al.n));
      elPA.appendChild(mk('h3', '', al.icon + ' ' + al.name + ' · ' + (have >= al.n ? 'completo 🏆' : have + ' / ' + al.n)));
      var grid = mk('div', 'p-stickers');
      for (var k = 0; k < al.n; k++) (function (gi) {
        var st = STICKERS[gi], mine = gi < prizes.got;
        var b = mk('button', 'p-sticker' + (mine ? '' : ' missing') + (mine && prizes.gold.indexOf(gi) >= 0 ? ' gold' : ''));
        b.type = 'button';
        b.appendChild(stickerArt(st.e));
        b.addEventListener('click', function () { play([{ clip: st.clip, pitch: 1, rate: 0.9 }]); });
        grid.appendChild(b);
      })(al.start + k);
      elPA.appendChild(grid);
    });

    // Lo que más falla
    var elStats = document.getElementById('pStats');
    elStats.innerHTML = '';
    var any = false;
    [['math', 'Sumas y restas'], ['syl', 'Sílabas'], ['word', 'Palabras'], ['build', 'Formar palabras'], ['trace', 'Trazar letras'], ['write', 'Dictado'], ['miss', 'La letra que falta']].forEach(function (c) {
      var rows = Object.keys(stats[c[0]]).map(function (k) { return [k, stats[c[0]][k][0], stats[c[0]][k][1]]; })
        .filter(function (r) { return r[2] > 0; })
        .sort(function (a, b) { return (b[2] - a[2]) || (b[2] / (b[1] + b[2]) - a[2] / (a[1] + a[2])); })
        .slice(0, 8);
      if (!rows.length) return;
      any = true;
      elStats.appendChild(mk('h3', '', c[1]));
      var ul = mk('ul', 'p-fails');
      rows.forEach(function (r) {
        var li = mk('li');
        li.appendChild(mk('b', '', r[0]));
        li.appendChild(mk('span', '', 'falla ' + r[2] + ' de ' + (r[1] + r[2])));
        ul.appendChild(li);
      });
      elStats.appendChild(ul);
    });
    if (!any) elStats.appendChild(mk('p', 'p-note', 'Todavía no hay fallos apuntados.'));
  }

  // Botones de borrar: hay que tocarlos dos veces
  Array.prototype.forEach.call(document.querySelectorAll('[data-reset]'), function (b) {
    var label = b.textContent, armed = null;
    b.addEventListener('click', function () {
      if (!armed) {
        b.textContent = '¿Seguro? Toca otra vez';
        b.classList.add('armed');
        armed = setTimeout(function () { armed = null; b.textContent = label; b.classList.remove('armed'); }, 3000);
        return;
      }
      clearTimeout(armed); armed = null;
      b.classList.remove('armed');
      var what = b.dataset.reset;
      if (what === 'stats') {
        stats = { math: {}, syl: {}, word: {}, build: {}, trace: {}, write: {}, miss: {} };
        try { localStorage.removeItem(STATS_KEY); } catch (e) {}
      } else if (what === 'stars') {
        score = 0;
        saveScore();
        prizes = { got: 0, stars: 0, gold: [] };
        savePrizes();
        elScore.textContent = elScore2.textContent = elScore3.textContent = elScore4.textContent = score;
        updateAlbumDots();
      } else if (what === 'dict') {
        dict = { lvl: 1, good: 0, bad: 0 };
        saveDict();
      } else if (what === 'level') {
        quizLevel = { groups: 3, hits: 0 };
        saveLevel();
      }
      b.textContent = 'Hecho ✓';
      setTimeout(function () { b.textContent = label; }, 1500);
      renderParents();
    });
  });

  // Si la app pasa a segundo plano, se detiene; al volver, empieza una suma nueva
  document.addEventListener('visibilitychange', function () {
    if (state === 'idle' || rewardOpen) return;
    if (document.hidden) {
      clearTimeout(roundTimer);
      clearTimeout(nextTimer);
      pauseBar();
      clearHelp();
      stopSound();
      state = 'feedback';
    } else {
      resumeCtx();
      newRound();
    }
  });
})();
