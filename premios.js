// Álbumes de premios: [nombre, dibujo de la portada, [[pegatina, nombre], ...]].
// La pegatina es un emoji o un dibujo propio (premios/*.svg).
// Se completan en orden: al llenar uno empieza el siguiente. Cada nombre tiene
// su audio en audio/w-<nombre>.mp3 (espacios -> guiones, sin tildes, ñ -> ny).
self.ALBUMES = [
  ['Animales', '🐾', [
    ['🐱', 'gato'], ['🐶', 'perro'], ['🦆', 'pato'], ['🐸', 'rana'], ['🐰', 'conejo'],
    ['🦁', 'león'], ['🐒', 'mono'], ['🐄', 'vaca'], ['🐭', 'ratón'], ['🐯', 'tigre'],
    ['🦒', 'jirafa'], ['🦓', 'cebra'], ['🐴', 'caballo'], ['🦊', 'zorro'], ['🐺', 'lobo'],
    ['🦜', 'loro'], ['🦉', 'búho'], ['🐥', 'pollo'], ['🕊️', 'paloma'], ['🦢', 'cisne'],
    ['🐢', 'tortuga'], ['🐙', 'pulpo'], ['🐬', 'delfín'], ['🐋', 'ballena'], ['🦭', 'foca'],
    ['🐂', 'toro'], ['🦃', 'pavo'], ['🦙', 'llama'], ['🐎', 'yegua'], ['🦏', 'rinoceronte'],
    ['🦇', 'murciélago'], ['🐛', 'gusano'], ['🐜', 'hormiga'], ['🕷️', 'araña'], ['🦕', 'dinosaurio']
  ]],
  ['Fantasía', '🦄', [
    ['🦄', 'unicornio'], ['🐉', 'dragón'], ['🧚', 'hada'], ['🧜‍♀️', 'sirena'], ['🧙', 'mago'],
    ['👸', 'princesa'], ['🤴', 'príncipe'], ['🏰', 'castillo'], ['👑', 'corona'], ['🪄', 'varita mágica'],
    ['🌈', 'arcoíris'], ['⭐', 'estrella'], ['🌙', 'luna'], ['👻', 'fantasma'], ['🤖', 'robot'],
    ['👽', 'extraterrestre'], ['🧞', 'genio'], ['🧝', 'elfo'], ['🔮', 'bola mágica'], ['🦸', 'superhéroe'],
    ['🪐', 'planeta']
  ]],
  ['Dinosaurios', '🦖', [
    ['🦖', 'tiranosaurio'], ['premios/triceratops.svg', 'triceratops'], ['premios/estegosaurio.svg', 'estegosaurio'],
    ['premios/braquiosaurio.svg', 'braquiosaurio'], ['premios/pterodactilo.svg', 'pterodáctilo'],
    ['premios/velocirraptor.svg', 'velocirraptor'], ['premios/anquilosaurio.svg', 'anquilosaurio'],
    ['premios/espinosaurio.svg', 'espinosaurio'], ['premios/parasaurolofo.svg', 'parasaurolofo'],
    ['premios/plesiosaurio.svg', 'plesiosaurio'], ['premios/bebe.svg', 'dinosaurio bebé'],
    ['🥚', 'huevo de dinosaurio'], ['premios/huella.svg', 'huella de dinosaurio'], ['🦴', 'hueso'],
    ['🌋', 'volcán'], ['☄️', 'meteorito'], ['🦣', 'mamut']
  ]],
  ['Frutas y comida', '🍓', [
    ['🍎', 'manzana'], ['🍐', 'pera'], ['🍌', 'plátano'], ['🍇', 'uvas'], ['🍓', 'fresa'],
    ['🍉', 'sandía'], ['🍊', 'naranja'], ['🍋', 'limón'], ['🍍', 'piña'], ['🍒', 'cerezas'],
    ['🍑', 'melocotón'], ['🥝', 'kiwi'], ['🥥', 'coco'], ['🥑', 'aguacate'], ['🍅', 'tomate'],
    ['🥕', 'zanahoria'], ['🌽', 'maíz'], ['🍞', 'pan'], ['🧀', 'queso'], ['🥚', 'huevo'],
    ['🍕', 'pizza'], ['🍔', 'hamburguesa'], ['🍟', 'patatas fritas'], ['🍦', 'helado'], ['🎂', 'tarta'],
    ['🍪', 'galleta'], ['🍫', 'chocolate'], ['🍭', 'piruleta'], ['🍿', 'palomitas'], ['🧁', 'magdalena']
  ]],
  ['Vehículos', '🚗', [
    ['🚗', 'coche'], ['🚌', 'autobús'], ['🚚', 'camión'], ['🏍️', 'moto'], ['🚲', 'bicicleta'],
    ['🚆', 'tren'], ['✈️', 'avión'], ['🚁', 'helicóptero'], ['🚢', 'barco'], ['⛵', 'velero'],
    ['🚀', 'cohete'], ['🚜', 'tractor'], ['🚑', 'ambulancia'], ['🚒', 'camión de bomberos'], ['🚓', 'coche de policía'],
    ['🚕', 'taxi'], ['🛴', 'patinete'], ['🛶', 'canoa'], ['🛹', 'monopatín'], ['🚋', 'tranvía'],
    ['🛸', 'platillo volante'], ['🪂', 'paracaídas'], ['🏎️', 'coche de carreras'], ['🚐', 'furgoneta']
  ]],
  ['Juguetes y música', '🧸', [
    ['⚽', 'pelota'], ['🏀', 'baloncesto'], ['🧸', 'osito'], ['🪁', 'cometa'], ['🎈', 'globo'],
    ['🎁', 'regalo'], ['🪀', 'yoyó'], ['🎲', 'dado'], ['🧩', 'puzle'], ['🪆', 'muñeca rusa'],
    ['🥁', 'tambor'], ['🎸', 'guitarra'], ['🎺', 'trompeta'], ['🎹', 'piano'], ['🎻', 'violín'],
    ['🎨', 'pinturas'], ['📷', 'cámara'], ['🎾', 'tenis'], ['🎳', 'bolos'], ['🎯', 'diana'],
    ['🛼', 'patines']
  ]],
  ['Más animales', '🐼', [
    ['🐟', 'pez'], ['🐠', 'pez tropical'], ['🐡', 'pez globo'], ['🦈', 'tiburón'], ['🦀', 'cangrejo'],
    ['🦐', 'gamba'], ['🦞', 'langosta'], ['🦑', 'calamar'], ['🐚', 'caracola'], ['🦦', 'nutria'],
    ['🐧', 'pingüino'], ['🐊', 'cocodrilo'], ['🦩', 'flamenco'], ['🐨', 'koala'], ['🐼', 'panda'],
    ['🐻', 'oso'], ['🐘', 'elefante'], ['🦘', 'canguro'], ['🦔', 'erizo'], ['🐿️', 'ardilla'],
    ['🦋', 'mariposa'], ['🐝', 'abeja'], ['🐞', 'mariquita'], ['🐌', 'caracol'], ['🐓', 'gallo'],
    ['🐷', 'cerdo'], ['🐑', 'oveja'], ['🐐', 'cabra'], ['🐹', 'hámster'], ['🦥', 'perezoso']
  ]]
];

// Audio del nombre de una pegatina: 'camión de bomberos' -> 'w-camion-de-bomberos'
self.premioClip = function (name) {
  return 'w-' + name.toLowerCase().replace(/ñ/g, 'ny').normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/ /g, '-');
};
