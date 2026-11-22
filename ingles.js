// Inglés («Listen and touch»): temas, de más fácil a más difícil.
// [nombre del tema, tipo de dibujo, [[inglés, español, dibujo], ...]]
// Tipo: 'color' (el dibujo es el color), 'num' (la cifra) o 'emoji'.
// Audios: audio/en-<inglés>.mp3 (voz inglesa) y audio/es-<español>.mp3 ("es gato.").
self.INGLES = [
  ['Colores', 'color', [
    ['red', 'rojo', '#e5383b'], ['blue', 'azul', '#1e6fe0'], ['green', 'verde', '#1f9d45'],
    ['yellow', 'amarillo', '#ffd60a'], ['pink', 'rosa', '#ff7eb6'], ['orange', 'naranja', '#ff8c1a'],
    ['purple', 'morado', '#8338c9'], ['brown', 'marrón', '#8b5a2b'], ['black', 'negro', '#222222'],
    ['white', 'blanco', '#ffffff'], ['grey', 'gris', '#9aa0a6']
  ]],
  ['Animales', 'emoji', [
    ['cat', 'gato', '🐱'], ['dog', 'perro', '🐶'], ['duck', 'pato', '🦆'], ['frog', 'rana', '🐸'],
    ['rabbit', 'conejo', '🐰'], ['lion', 'león', '🦁'], ['monkey', 'mono', '🐒'], ['cow', 'vaca', '🐄'],
    ['mouse', 'ratón', '🐭'], ['pig', 'cerdo', '🐷'], ['horse', 'caballo', '🐴'], ['fish', 'pez', '🐟'],
    ['bird', 'pájaro', '🐦'], ['elephant', 'elefante', '🐘'], ['bear', 'oso', '🐻'], ['sheep', 'oveja', '🐑']
  ]],
  ['Números', 'num', [
    ['one', 'uno', '1'], ['two', 'dos', '2'], ['three', 'tres', '3'], ['four', 'cuatro', '4'],
    ['five', 'cinco', '5'], ['six', 'seis', '6'], ['seven', 'siete', '7'], ['eight', 'ocho', '8'],
    ['nine', 'nueve', '9'], ['ten', 'diez', '10']
  ]],
  ['Comida y juguetes', 'emoji', [
    ['apple', 'manzana', '🍎'], ['banana', 'plátano', '🍌'], ['strawberry', 'fresa', '🍓'], ['grapes', 'uvas', '🍇'],
    ['cake', 'tarta', '🎂'], ['ice cream', 'helado', '🍦'], ['bread', 'pan', '🍞'], ['cheese', 'queso', '🧀'],
    ['egg', 'huevo', '🥚'], ['ball', 'pelota', '⚽'], ['car', 'coche', '🚗'], ['train', 'tren', '🚆'],
    ['plane', 'avión', '✈️'], ['teddy bear', 'osito', '🧸'], ['balloon', 'globo', '🎈'], ['boat', 'barco', '🚢']
  ]]
];

self.inglesClip = function (en) { return 'en-' + en.replace(/ /g, '-'); };
// "es gato." en español (mismas reglas que premioClip: sin tildes, ñ -> ny)
self.esClip = function (es) { return self.premioClip(es).replace(/^w-/, 'es-'); };

// «Touch your nose!»: partes del cuerpo. [inglés, español con artículo, plural, nivel]
// Audios: bt-<parte> ("Touch your nose!"), bn-<parte> ("nose."), be-<parte> ("es la nariz.").
self.CUERPO = [
  ['nose', 'la nariz', false, 1], ['eyes', 'los ojos', true, 1], ['mouth', 'la boca', false, 1],
  ['hands', 'las manos', true, 1], ['feet', 'los pies', true, 1], ['tummy', 'la tripa', false, 1],
  ['hair', 'el pelo', false, 2], ['ears', 'las orejas', true, 2], ['arms', 'los brazos', true, 2],
  ['legs', 'las piernas', true, 2]
];
