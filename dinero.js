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
self.DINERO_NUM = ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
self.dineroTextos = function () {   // nombre del audio -> frase (también para la voz de respaldo)
  var D = self.DINERO, N = self.DINERO_NUM, t = {};
  function eu(n) { return N[n] + (n === 1 ? ' euro' : ' euros'); }
  for (var n = 1; n <= 10; n++) t['dn-st-' + n] = 'Tienes ' + eu(n) + '.';
  for (n = 0; n <= 10; n++) t['dn-ahora-' + n] = 'Ahora tienes ' + eu(n) + '.';
  D.personas.forEach(function (p) {
    for (var k = 1; k <= D.maxDa; k++) t['dn-da-' + p[0] + '-' + k] = 'Y si ' + p[1] + ' te da ' + eu(k) + '...';
  });
  D.cosas.forEach(function (c) { t['dn-gasta-' + c[0]] = 'Y si te gastas ' + eu(c[1]) + ' en ' + c[2] + '...'; });
  t['dn-cuantos'] = '¿Cuántos euros tienes?';
  t['dn-intro'] = 'Escucha la historia y cuenta tus euros.';
  t['dn-otra'] = '¡Otra historia!';
  return t;
};

// «Bichos»: la misma idea, con bichos que llegan y se van.
// [id, singular, plural, femenino, dibujo]
// Palometa: la polilla de la despensa (alas cerradas, gris parduzco, antenas largas). Va dibujada.
var PALOMETA = '<svg class=\'bug-svg\' viewBox=\'0 0 100 100\'><g stroke=\'#5a4a3a\' stroke-width=\'2.2\' stroke-linecap=\'round\' fill=\'none\'><path d=\'M70 47 Q84 30 96 26\'/><path d=\'M70 53 Q86 66 97 70\'/><path d=\'M56 60 L52 74 L46 80\'/><path d=\'M62 60 L64 75 L70 80\'/></g><path d=\'M8 50 Q12 34 30 32 L66 40 Q72 50 66 60 L30 68 Q12 66 8 50Z\' fill=\'#a8998a\' stroke=\'#6b5a48\' stroke-width=\'2.5\' stroke-linejoin=\'round\'/><path d=\'M12 50 L64 50\' stroke=\'#6b5a48\' stroke-width=\'1.8\'/><path d=\'M10 44 Q6 40 5 36 M10 56 Q6 60 5 64\' stroke=\'#c9bdb0\' stroke-width=\'2\' fill=\'none\' stroke-linecap=\'round\'/><g fill=\'#6b5a48\' opacity=\'.75\'><circle cx=\'24\' cy=\'42\' r=\'2.4\'/><circle cx=\'38\' cy=\'45\' r=\'2\'/><circle cx=\'30\' cy=\'57\' r=\'2.6\'/><circle cx=\'46\' cy=\'56\' r=\'1.8\'/><circle cx=\'52\' cy=\'43\' r=\'2.2\'/><circle cx=\'18\' cy=\'52\' r=\'1.6\'/></g><path d=\'M22 38 Q36 36 50 40\' stroke=\'#d8cdc0\' stroke-width=\'2.5\' fill=\'none\' stroke-linecap=\'round\' opacity=\'.8\'/><ellipse cx=\'72\' cy=\'50\' rx=\'9\' ry=\'9\' fill=\'#8c7c6b\' stroke=\'#5a4a3a\' stroke-width=\'2.2\'/><circle cx=\'76\' cy=\'45.5\' r=\'3.4\' fill=\'#222\'/><circle cx=\'76\' cy=\'54.5\' r=\'3.4\' fill=\'#222\'/><circle cx=\'77\' cy=\'44.5\' r=\'1.1\' fill=\'#fff\'/><circle cx=\'77\' cy=\'53.5\' r=\'1.1\' fill=\'#fff\'/></svg>';
self.BICHOS = [
  ['escarabajo', 'escarabajo', 'escarabajos', false, '🪲'], ['cucaracha', 'cucaracha', 'cucarachas', true, '🪳'],
  ['palometa', 'palometa', 'palometas', true, PALOMETA], ['mariquita', 'mariquita', 'mariquitas', true, '🐞'],
  ['hormiga', 'hormiga', 'hormigas', true, '🐜'], ['caracol', 'caracol', 'caracoles', false, '🐌'],
  ['grillo', 'grillo', 'grillos', false, '🦗'], ['arana', 'araña', 'arañas', true, '🕷️']
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
    t[id + 'cuantos'] = (b[3] ? '¿Cuántas ' : '¿Cuántos ') + b[2] + ' hay?';
    for (n = 0; n <= 10; n++) {
      t[id + 'ahora-' + n] = n ? 'Ahora hay ' + cu(n) + '.' : 'Ahora no hay ' + (b[3] ? 'ninguna ' : 'ningún ') + b[1] + '.';
    }
  });
  t['bi-intro'] = 'Escucha la historia y cuenta los bichos.';
  return t;
};
