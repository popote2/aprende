// «Mis euros»: cuentas habladas con una historia que sigue.
// Quién da dinero: [id, nombre, dibujo]  ·  En qué se gasta: [id, precio, texto, dibujo]
// Audios (audio/dn-*.mp3): dn-st-N "Tienes N euros.", dn-da-<id>-N "Y si papá te da N euros...",
// dn-gasta-<id> "Y si te gastas N euros en ...", dn-cuantos, dn-ahora-N, dn-intro, dn-otra.
// Bola del vaivén: la cápsula de plástico con un juguete dentro (no hay emoji, va dibujada)
var VAIVEN = '<svg class=\'m-svg\' viewBox=\'0 0 100 100\'><circle cx=\'50\' cy=\'50\' r=\'44\' fill=\'#d9f1ff\'/><path d=\'M6 50a44 44 0 0 0 88 0z\' fill=\'#e5383b\'/><g transform=\'translate(50 36)\'><path d=\'M0-16l4.7 9.6 10.5 1.5-7.6 7.4 1.8 10.5L0 8l-9.4 5 1.8-10.5-7.6-7.4 10.5-1.5z\' fill=\'#ffd60a\' stroke=\'#c99700\' stroke-width=\'1.5\' stroke-linejoin=\'round\'/><circle cx=\'-3.5\' cy=\'-2\' r=\'1.6\' fill=\'#333\'/><circle cx=\'3.5\' cy=\'-2\' r=\'1.6\' fill=\'#333\'/></g><path d=\'M6 50h88\' stroke=\'#a8262a\' stroke-width=\'5\'/><circle cx=\'50\' cy=\'50\' r=\'44\' fill=\'none\' stroke=\'#5b6b80\' stroke-width=\'3\'/><path d=\'M24 24a34 34 0 0 1 18-10\' stroke=\'#fff\' stroke-width=\'5\' stroke-linecap=\'round\' fill=\'none\' opacity=\'.9\'/><path d=\'M78 66a32 32 0 0 1-10 12\' stroke=\'#fff\' stroke-width=\'4\' stroke-linecap=\'round\' fill=\'none\' opacity=\'.45\'/></svg>';
self.DINERO = {
  personas: [
    ['papa', 'papá', '👨'], ['mama', 'mamá', '👩'], ['abuelo', 'el abuelito', '👴'],
    ['abuela', 'la abuelita', '👵'], ['tio', 'el tito', '🧔'], ['tia', 'la tita', '👩‍🦰']
  ],
  cosas: [
    ['vaiven', 1, 'una bola del vaivén', VAIVEN], ['chupa', 1, 'un chupachups', '🍭'], ['globo', 1, 'un globo', '🎈'],
    ['chuches', 2, 'chuches', '🍬'], ['helado', 2, 'un helado', '🍦'], ['pegatinas', 2, 'pegatinas', '🌟'],
    ['gusanitos', 3, 'gusanitos', '🍿'], ['pelota', 3, 'una pelota', '⚽'], ['cuento', 4, 'un cuento', '📕'],
    ['coche', 4, 'un cochecito', '🚗'], ['peluche', 5, 'un peluche', '🧸']
  ],
  maxDa: 5
};
self.DINERO_NUM = ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte'];
self.CUENTAS_MAX = 20;   // hasta dónde llegan las historias
self.dineroTextos = function () {   // nombre del audio -> frase (también para la voz de respaldo)
  var D = self.DINERO, N = self.DINERO_NUM, t = {};
  function eu(n) { return N[n] + (n === 1 ? ' euro' : ' euros'); }
  for (var n = 1; n <= 10; n++) t['dn-st-' + n] = 'Tienes ' + eu(n) + '.';
  for (n = 0; n <= self.CUENTAS_MAX; n++) t['dn-ahora-' + n] = 'Ahora tienes ' + eu(n) + '.';
  D.personas.forEach(function (p) {
    for (var k = 1; k <= D.maxDa; k++) t['dn-da-' + p[0] + '-' + k] = 'Y si ' + p[1] + ' te da ' + eu(k) + '...';
  });
  D.cosas.forEach(function (c) { t['dn-gasta-' + c[0]] = 'Y si te gastas ' + eu(c[1]) + ' en ' + c[2] + '...'; });
  t['dn-cuantos'] = '¿Cuántos euros tienes?';
  t['dn-intro'] = 'Escucha la historia y cuenta tus euros.';
  t['dn-otra'] = '¡Otra historia!';
  return t;
};

// «Bichos»: la misma idea, con bichos (mezclados) que llegan y se van.
// [id, singular, plural, femenino, dibujo]
// Palometa: la polilla de la despensa (alas cerradas, gris parduzco, antenas largas). Va dibujada.
var PALOMETA = '<svg class=\'bug-svg\' viewBox=\'0 0 100 100\'><g stroke=\'#5a4a3a\' stroke-width=\'2.2\' stroke-linecap=\'round\' fill=\'none\'><path d=\'M70 47 Q84 30 96 26\'/><path d=\'M70 53 Q86 66 97 70\'/><path d=\'M56 60 L52 74 L46 80\'/><path d=\'M62 60 L64 75 L70 80\'/></g><path d=\'M8 50 Q12 34 30 32 L66 40 Q72 50 66 60 L30 68 Q12 66 8 50Z\' fill=\'#a8998a\' stroke=\'#6b5a48\' stroke-width=\'2.5\' stroke-linejoin=\'round\'/><path d=\'M12 50 L64 50\' stroke=\'#6b5a48\' stroke-width=\'1.8\'/><path d=\'M10 44 Q6 40 5 36 M10 56 Q6 60 5 64\' stroke=\'#c9bdb0\' stroke-width=\'2\' fill=\'none\' stroke-linecap=\'round\'/><g fill=\'#6b5a48\' opacity=\'.75\'><circle cx=\'24\' cy=\'42\' r=\'2.4\'/><circle cx=\'38\' cy=\'45\' r=\'2\'/><circle cx=\'30\' cy=\'57\' r=\'2.6\'/><circle cx=\'46\' cy=\'56\' r=\'1.8\'/><circle cx=\'52\' cy=\'43\' r=\'2.2\'/><circle cx=\'18\' cy=\'52\' r=\'1.6\'/></g><path d=\'M22 38 Q36 36 50 40\' stroke=\'#d8cdc0\' stroke-width=\'2.5\' fill=\'none\' stroke-linecap=\'round\' opacity=\'.8\'/><ellipse cx=\'72\' cy=\'50\' rx=\'9\' ry=\'9\' fill=\'#8c7c6b\' stroke=\'#5a4a3a\' stroke-width=\'2.2\'/><circle cx=\'76\' cy=\'45.5\' r=\'3.4\' fill=\'#222\'/><circle cx=\'76\' cy=\'54.5\' r=\'3.4\' fill=\'#222\'/><circle cx=\'77\' cy=\'44.5\' r=\'1.1\' fill=\'#fff\'/><circle cx=\'77\' cy=\'53.5\' r=\'1.1\' fill=\'#fff\'/></svg>';
// Zapatero: chinche roja con un triángulo y manchas negras. Va dibujado.
var ZAPATERO = '<svg class=\'bug-svg\' viewBox=\'0 0 100 100\'><g stroke=\'#1c1c1c\' stroke-width=\'2.6\' stroke-linecap=\'round\' fill=\'none\'><path d=\'M82 45 Q90 32 98 28\'/><path d=\'M82 55 Q90 68 98 72\'/><path d=\'M60 32 L64 20 L70 15\'/><path d=\'M60 68 L64 80 L70 85\'/><path d=\'M46 31 L44 18 L38 12\'/><path d=\'M46 69 L44 82 L38 88\'/><path d=\'M32 33 L24 22 L16 19\'/><path d=\'M32 67 L24 78 L16 81\'/></g><path d=\'M10 50 Q12 30 40 29 L66 32 Q78 38 78 50 Q78 62 66 68 L40 71 Q12 70 10 50Z\' fill=\'#e2431e\' stroke=\'#1c1c1c\' stroke-width=\'2.6\' stroke-linejoin=\'round\'/><path d=\'M10 50 Q11 40 18 36 L22 50 L18 64 Q11 60 10 50Z\' fill=\'#1c1c1c\'/><path d=\'M66 32 Q78 38 78 50 Q78 62 66 68 Q70 50 66 32Z\' fill=\'#1c1c1c\'/><path d=\'M64 42 L46 50 L64 58Z\' fill=\'#1c1c1c\'/><circle cx=\'34\' cy=\'40\' r=\'6.5\' fill=\'#1c1c1c\'/><circle cx=\'34\' cy=\'60\' r=\'6.5\' fill=\'#1c1c1c\'/><circle cx=\'55\' cy=\'37\' r=\'2.6\' fill=\'#1c1c1c\'/><circle cx=\'55\' cy=\'63\' r=\'2.6\' fill=\'#1c1c1c\'/><path d=\'M22 50 L46 50\' stroke=\'#1c1c1c\' stroke-width=\'1.6\'/><ellipse cx=\'82\' cy=\'50\' rx=\'7\' ry=\'8\' fill=\'#1c1c1c\'/><circle cx=\'85\' cy=\'45.5\' r=\'2.4\' fill=\'#d24a2a\'/><circle cx=\'85\' cy=\'54.5\' r=\'2.4\' fill=\'#d24a2a\'/><path d=\'M28 36 Q40 33 52 35\' stroke=\'#ff8a63\' stroke-width=\'2.4\' fill=\'none\' stroke-linecap=\'round\' opacity=\'.8\'/></svg>';
// Saltamontes y cochinilla: no hay emoji, van dibujados.
var SALTAMONTES = '<svg class=\'bug-svg\' viewBox=\'0 0 100 100\'><g stroke=\'#3d6b1f\' stroke-linecap=\'round\' stroke-linejoin=\'round\' fill=\'none\'><path d=\'M80 44 Q88 26 97 18\' stroke-width=\'2\'/><path d=\'M80 46 Q92 34 99 30\' stroke-width=\'2\'/><path d=\'M66 60 L64 74 L70 80\' stroke-width=\'2.6\'/><path d=\'M58 60 L52 74 L46 78\' stroke-width=\'2.6\'/></g><path d=\'M12 52 Q14 40 30 40 L62 42 Q70 50 62 60 L30 62 Q14 62 12 52Z\' fill=\'#7cc142\' stroke=\'#3d6b1f\' stroke-width=\'2.6\' stroke-linejoin=\'round\'/><path d=\'M8 50 Q24 34 58 42 L54 48 Q24 42 8 50Z\' fill=\'#5fa32e\' stroke=\'#3d6b1f\' stroke-width=\'2.2\' stroke-linejoin=\'round\'/><path d=\'M50 52 L28 30 L10 72\' fill=\'none\' stroke=\'#3d6b1f\' stroke-width=\'7\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/><path d=\'M50 52 L28 30 L10 72\' fill=\'none\' stroke=\'#9ad35c\' stroke-width=\'4\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/><g stroke=\'#3d6b1f\' stroke-width=\'1.4\'><path d=\'M22 46 L22 60\'/><path d=\'M30 46 L30 61\'/><path d=\'M38 46 L38 61\'/></g><path d=\'M60 42 Q74 38 84 46 Q88 54 80 60 Q70 64 62 60 Q66 50 60 42Z\' fill=\'#7cc142\' stroke=\'#3d6b1f\' stroke-width=\'2.6\' stroke-linejoin=\'round\'/><ellipse cx=\'78\' cy=\'48\' rx=\'4\' ry=\'5\' fill=\'#2b2b2b\'/><circle cx=\'79\' cy=\'46.5\' r=\'1.3\' fill=\'#fff\'/><path d=\'M84 55 Q82 58 79 58\' stroke=\'#3d6b1f\' stroke-width=\'1.8\' fill=\'none\' stroke-linecap=\'round\'/></svg>';
var COCHINILLA = '<svg class=\'bug-svg\' viewBox=\'0 0 100 100\'><g stroke=\'#3a3f47\' stroke-width=\'2.2\' stroke-linecap=\'round\' fill=\'none\'><path d=\'M78 44 Q88 34 96 32\'/><path d=\'M78 56 Q88 66 96 68\'/><path d=\'M30 30 L28 22\'/><path d=\'M42 28 L42 20\'/><path d=\'M54 29 L56 21\'/><path d=\'M30 70 L28 78\'/><path d=\'M42 72 L42 80\'/><path d=\'M54 71 L56 79\'/></g><path d=\'M12 50 Q12 28 44 27 Q76 28 80 50 Q76 72 44 73 Q12 72 12 50Z\' fill=\'#8a929e\' stroke=\'#3a3f47\' stroke-width=\'2.6\'/><g stroke=\'#3a3f47\' stroke-width=\'2\' fill=\'none\'><path d=\'M22 32 Q18 50 22 68\'/><path d=\'M30 29 Q25 50 30 71\'/><path d=\'M38 28 Q33 50 38 72\'/><path d=\'M46 27 Q41 50 46 73\'/><path d=\'M54 28 Q49 50 54 72\'/><path d=\'M62 30 Q57 50 62 70\'/><path d=\'M70 34 Q66 50 70 66\'/></g><path d=\'M20 38 Q40 31 64 36\' stroke=\'#c3c9d1\' stroke-width=\'3\' fill=\'none\' stroke-linecap=\'round\' opacity=\'.9\'/><path d=\'M70 36 Q82 42 82 50 Q82 58 70 64 Q74 50 70 36Z\' fill=\'#6b727d\' stroke=\'#3a3f47\' stroke-width=\'2\'/><circle cx=\'77\' cy=\'45\' r=\'2\' fill=\'#1c1c1c\'/><circle cx=\'77\' cy=\'55\' r=\'2\' fill=\'#1c1c1c\'/></svg>';
self.BICHOS = [
  ['escarabajo', 'escarabajo', 'escarabajos', false, '🪲'], ['cucaracha', 'cucaracha', 'cucarachas', true, '🪳'],
  ['palometa', 'palometa', 'palometas', true, PALOMETA], ['mariquita', 'mariquita', 'mariquitas', true, '🐞'],
  ['hormiga', 'hormiga', 'hormigas', true, '🐜'], ['caracol', 'caracol', 'caracoles', false, '🐌'],
  ['grillo', 'grillo', 'grillos', false, '🦗'], ['arana', 'araña', 'arañas', true, '🕷️'],
  ['mariposa', 'mariposa', 'mariposas', true, '🦋'],
  ['zapatero', 'zapatero', 'zapateros', false, ZAPATERO],
  ['mosca', 'mosca', 'moscas', true, '🪰'], ['abeja', 'abeja', 'abejas', true, '🐝'],
  ['saltamontes', 'saltamontes', 'saltamontes', false, SALTAMONTES], ['cochinilla', 'cochinilla', 'cochinillas', true, COCHINILLA]
];
self.bichosTextos = function () {
  var N = self.DINERO_NUM, t = {};
  self.BICHOS.forEach(function (b) {
    var id = 'bi-' + b[0] + '-';
    function cu(n) { return (n === 1 ? (b[3] ? 'una' : 'un') : N[n]) + ' ' + (n === 1 ? b[1] : b[2]); }
    for (var n = 1; n <= 5; n++) {
      t[id + 'st-' + n] = (n === 1 ? 'Hay ' : 'Hay ') + cu(n) + ' en el jardín.';
      t[id + 'lle-' + n] = 'Y si ' + (n === 1 ? 'llega ' : 'llegan ') + cu(n) + ' más...';
      t[id + 'van-' + n] = 'Y si ' + (n === 1 ? 'se va ' : 'se van ') + cu(n) + '...';
    }
  });
  // los bichos se mezclan: la pregunta y la respuesta son de "bichos"
  t['bi-cuantos'] = '¿Cuántos bichos hay?';
  for (var n = 0; n <= self.CUENTAS_MAX; n++) {
    t['bi-ahora-' + n] = n ? 'Ahora hay ' + (n === 1 ? 'un bicho' : N[n] + ' bichos') + '.' : 'Ahora no hay ningún bicho.';
  }
  t['bi-intro'] = 'Escucha la historia y cuenta los bichos.';
  return t;
};
