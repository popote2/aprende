// «Mis euros»: cuentas habladas con una historia que sigue.
// Quién da dinero: [id, nombre, dibujo]  ·  En qué se gasta: [id, precio, texto, dibujo]
// Audios (audio/dn-*.mp3): dn-st-N "Tienes N euros.", dn-da-<id>-N "Y si papá te da N euros...",
// dn-gasta-<id> "Y si te gastas N euros en ...", dn-cuantos, dn-ahora-N, dn-intro, dn-otra.
self.DINERO = {
  personas: [
    ['papa', 'papá', '👨'], ['mama', 'mamá', '👩'], ['abuelo', 'el abuelito', '👴'],
    ['abuela', 'la abuelita', '👵'], ['tio', 'el tío', '🧔'], ['tia', 'la tía', '👩‍🦰']
  ],
  cosas: [
    ['vaiven', 1, 'una bola del vaivén', '🔮'], ['chupa', 1, 'un chupachups', '🍭'], ['globo', 1, 'un globo', '🎈'],
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
