let nextAction = 'authOnly';
let currentTransport = '';
let currentUser = localStorage.getItem('travelAIUser') || '';
let currentTour = null;
let formData = {};
let extraPreference = '';
let currentRoutePlan = null;

const OPEN_TRIP_MAP_KEY = '5ae2e3f221c38a28845f05b6c65d3a4a715a4493f904859a4a1c132e';

const CITY_ALIASES = {
  'алмата': { display: 'Алматы', query: 'Almaty', country: 'KZ', lat: 43.238949, lon: 76.889709 },
  'алматы': { display: 'Алматы', query: 'Almaty', country: 'KZ', lat: 43.238949, lon: 76.889709 },
  'almaty': { display: 'Алматы', query: 'Almaty', country: 'KZ', lat: 43.238949, lon: 76.889709 },
  'астана': { display: 'Астана', query: 'Astana', country: 'KZ', lat: 51.169392, lon: 71.449074 },
  'нур-султан': { display: 'Астана', query: 'Astana', country: 'KZ', lat: 51.169392, lon: 71.449074 },
  'париж': { display: 'Париж', query: 'Paris', country: 'FR', lat: 48.856614, lon: 2.352222 },
  'paris': { display: 'Париж', query: 'Paris', country: 'FR', lat: 48.856614, lon: 2.352222 },
  'лондон': { display: 'Лондон', query: 'London', country: 'GB', lat: 51.507218, lon: -0.127586 },
  'london': { display: 'Лондон', query: 'London', country: 'GB', lat: 51.507218, lon: -0.127586 },
  'рим': { display: 'Рим', query: 'Rome', country: 'IT', lat: 41.902782, lon: 12.496366 },
  'rome': { display: 'Рим', query: 'Rome', country: 'IT', lat: 41.902782, lon: 12.496366 },
  'istanbul': { display: 'Стамбул', query: 'Istanbul', country: 'TR', lat: 41.008238, lon: 28.978359 },
  'стамбул': { display: 'Стамбул', query: 'Istanbul', country: 'TR', lat: 41.008238, lon: 28.978359 },
  'ташкент': { display: 'Ташкент', query: 'Tashkent', country: 'UZ', lat: 41.299496, lon: 69.240073 },
  'tashkent': { display: 'Ташкент', query: 'Tashkent', country: 'UZ', lat: 41.299496, lon: 69.240073 },
  'бишкек': { display: 'Бишкек', query: 'Bishkek', country: 'KG', lat: 42.874621, lon: 74.569762 },
  'bishkek': { display: 'Бишкек', query: 'Bishkek', country: 'KG', lat: 42.874621, lon: 74.569762 },
  'дубай': { display: 'Дубай', query: 'Dubai', country: 'AE', lat: 25.204849, lon: 55.270783 },
  'dubai': { display: 'Дубай', query: 'Dubai', country: 'AE', lat: 25.204849, lon: 55.270783 }
};

const CURATED_PLACES = {
  'Алматы': [
    { name: 'Парк 28 гвардейцев-панфиловцев', lat: 43.258278, lon: 76.954506 },
    { name: 'Вознесенский собор', lat: 43.258583, lon: 76.953361 },
    { name: 'Зеленый базар', lat: 43.263161, lon: 76.953877 },
    { name: 'Музей Алматы', lat: 43.242822, lon: 76.956389 },
    { name: 'Центральный государственный музей', lat: 43.236926, lon: 76.945522 },
    { name: 'Кок-Тобе', lat: 43.233621, lon: 76.976378 },
    { name: 'Театр оперы и балета имени Абая', lat: 43.247489, lon: 76.943166 },
    { name: 'Арбат Алматы', lat: 43.261979, lon: 76.940964 },
    { name: 'Медеу', lat: 43.157515, lon: 77.058252 }
  ],
  'Стамбул': [
    { name: 'Айя-София', lat: 41.008583, lon: 28.980175 },
    { name: 'Голубая мечеть', lat: 41.005409, lon: 28.976813 },
    { name: 'Дворец Топкапы', lat: 41.01152, lon: 28.983378 },
    { name: 'Гранд-базар', lat: 41.010685, lon: 28.968065 },
    { name: 'Галатская башня', lat: 41.025631, lon: 28.974219 },
    { name: 'Площадь Таксим', lat: 41.036941, lon: 28.986111 },
    { name: 'Долмабахче', lat: 41.039164, lon: 29.000459 },
    { name: 'Египетский базар', lat: 41.016519, lon: 28.970519 },
    { name: 'Набережная Босфора', lat: 41.042214, lon: 29.009444 }
  ],
  'Дубай': [
    { name: 'Бурдж-Халифа', lat: 25.197197, lon: 55.274376 },
    { name: 'Dubai Mall', lat: 25.197525, lon: 55.279619 },
    { name: 'Дубай Марина', lat: 25.080007, lon: 55.140878 },
    { name: 'Пальма Джумейра', lat: 25.112431, lon: 55.13902 },
    { name: 'Рынок золота', lat: 25.271062, lon: 55.296539 },
    { name: 'Dubai Frame', lat: 25.235466, lon: 55.300341 },
    { name: 'Jumeirah Beach', lat: 25.204849, lon: 55.240994 },
    { name: 'Музей будущего', lat: 25.219177, lon: 55.281878 },
    { name: 'Старый Дубай', lat: 25.263333, lon: 55.297222 }
  ]
};

const COUNTRY_NAMES = {
  KZ: 'Казахстан',
  TR: 'Турция',
  AE: 'ОАЭ',
  FR: 'Франция',
  GB: 'Великобритания',
  IT: 'Италия',
  UZ: 'Узбекистан',
  KG: 'Кыргызстан'
};

const CITY_GUIDES = {
  'Алматы': {
    places: CURATED_PLACES['Алматы'],
    food: [
      'Navat - казахская кухня и уютный ужин',
      'Qaimaq - современная местная кухня',
      'Зеленый базар - перекус, фрукты и сладости',
      'Coffeedelia - завтраки и кофе',
      'Daredzhani - семейный ресторан в центре'
    ],
    hotels: [
      'Resident Hotel Almaty - комфортный вариант 3★',
      'Апартаменты возле Арбата - удобно для прогулок',
      'Отель рядом с метро Абая - хороший баланс цены и локации',
      'Гостевой дом у Кок-Тобе - спокойный район',
      'Бюджетный хостел в центре - для короткой поездки'
    ],
    activities: [
      'Подняться на Кок-Тобе вечером',
      'Съездить на Медеу и в горы',
      'Погулять по Арбату и старому центру',
      'Попробовать баурсаки и местный чай',
      'Сделать фото у Вознесенского собора'
    ]
  },
  'Стамбул': {
    places: CURATED_PLACES['Стамбул'],
    food: [
      'Завтрак с симитом и турецким чаем',
      'Рыбный сэндвич у Галатского моста',
      'Ресторан с кебабом в районе Султанахмет',
      'Турецкие сладости на Египетском базаре',
      'Кафе с видом на Босфор'
    ],
    hotels: [
      'Отель 3★ в Султанахмете - удобно для первого визита',
      'Апартаменты возле Таксима - активный вечерний район',
      'Бутик-отель рядом с Галатской башней',
      'Бюджетный отель у метро/трамвая',
      'Отель в Каракёе - рядом с набережной'
    ],
    activities: [
      'Прогулка на пароме по Босфору',
      'Закат у Галатской башни',
      'Шопинг на Гранд-базаре',
      'Маршрут по мечетям и дворцам',
      'Вечерняя прогулка по Истикляль'
    ]
  },
  'Дубай': {
    places: CURATED_PLACES['Дубай'],
    food: [
      'Завтрак в Dubai Mall перед прогулкой',
      'Арабская кухня в районе Al Fahidi',
      'Ресторан у Dubai Marina',
      'Фудкорт для экономного обеда',
      'Десерты и кофе возле Jumeirah Beach'
    ],
    hotels: [
      'Отель 4★ рядом с метро - удобно для перемещений',
      'Апартаменты в Dubai Marina',
      'Бюджетный отель в Deira',
      'Отель возле Business Bay',
      'Семейные апартаменты рядом с пляжем'
    ],
    activities: [
      'Подняться на смотровую Burj Khalifa',
      'Вечернее шоу фонтанов',
      'Прогулка по Dubai Marina',
      'Пляжный отдых на Jumeirah Beach',
      'Поездка в старый Дубай и рынки'
    ]
  },
  'Париж': {
    places: [
      { name: 'Эйфелева башня', lat: 48.85837, lon: 2.294481 },
      { name: 'Лувр', lat: 48.860611, lon: 2.337644 },
      { name: 'Собор Парижской Богоматери', lat: 48.853, lon: 2.3499 },
      { name: 'Монмартр', lat: 48.886705, lon: 2.343104 },
      { name: 'Триумфальная арка', lat: 48.873792, lon: 2.295028 },
      { name: 'Елисейские поля', lat: 48.869798, lon: 2.30776 },
      { name: 'Люксембургский сад', lat: 48.846222, lon: 2.33716 },
      { name: 'Музей Орсе', lat: 48.86, lon: 2.3266 },
      { name: 'Сена и набережные', lat: 48.858844, lon: 2.347059 }
    ],
    food: [
      'Круассаны и кофе в утренней пекарне',
      'Французское бистро возле Латинского квартала',
      'Сырная тарелка и десерт в кафе',
      'Street food у Сены',
      'Ужин в районе Монмартра'
    ],
    hotels: [
      'Отель 3★ у метро - лучший баланс цены',
      'Апартаменты в Латинском квартале',
      'Бутик-отель возле Монмартра',
      'Бюджетный отель рядом с вокзалом',
      'Семейные апартаменты недалеко от центра'
    ],
    activities: [
      'Прогулка по набережной Сены',
      'Фото у Эйфелевой башни',
      'Музейный день в Лувре или Орсе',
      'Вечер на Монмартре',
      'Круиз по Сене'
    ]
  },
  'Астана': {
    places: [
      { name: 'Байтерек', lat: 51.1283, lon: 71.4305 },
      { name: 'Хан Шатыр', lat: 51.1322, lon: 71.4036 },
      { name: 'Мечеть Хазрет Султан', lat: 51.1267, lon: 71.4697 },
      { name: 'Национальный музей Казахстана', lat: 51.1193, lon: 71.4702 },
      { name: 'Набережная реки Есиль', lat: 51.1536, lon: 71.4266 },
      { name: 'Дворец мира и согласия', lat: 51.1234, lon: 71.4639 },
      { name: 'Ботанический сад', lat: 51.1055, lon: 71.4027 },
      { name: 'Astana Opera', lat: 51.1281, lon: 71.4171 },
      { name: 'Mega Silk Way', lat: 51.0893, lon: 71.4071 }
    ],
    food: [
      'Казахская кухня в центре',
      'Кофейня у Байтерека',
      'Ресторан рядом с набережной',
      'Фудкорт в Хан Шатыре',
      'Ужин с видом на левый берег'
    ],
    hotels: [
      'Отель 3★ на левом берегу',
      'Апартаменты возле Байтерека',
      'Бюджетный отель у правого берега',
      'Отель рядом с Expo',
      'Семейные апартаменты возле ТРЦ'
    ],
    activities: [
      'Подняться на Байтерек',
      'Прогулка по набережной Есиля',
      'Посетить Национальный музей',
      'Вечерняя прогулка по левому берегу',
      'Шопинг и отдых в Хан Шатыре'
    ]
  },
  'Лондон': {
    places: [
      { name: 'Биг-Бен и Вестминстер', lat: 51.500729, lon: -0.124625 },
      { name: 'Букингемский дворец', lat: 51.501364, lon: -0.14189 },
      { name: 'Тауэрский мост', lat: 51.505456, lon: -0.075356 },
      { name: 'Британский музей', lat: 51.519413, lon: -0.126957 },
      { name: 'Лондонский глаз', lat: 51.503324, lon: -0.119543 },
      { name: 'Ковент-Гарден', lat: 51.511732, lon: -0.12327 },
      { name: 'Гайд-парк', lat: 51.507268, lon: -0.16573 },
      { name: 'Трафальгарская площадь', lat: 51.50809, lon: -0.12859 },
      { name: 'Камден-маркет', lat: 51.5413, lon: -0.1464 }
    ],
    food: ['Английский завтрак в центре', 'Fish and chips возле Темзы', 'Кофейня в Сохо', 'Street food на Camden Market', 'Ужин в пабе с местной кухней'],
    hotels: ['Отель 3★ у метро', 'Апартаменты в South Kensington', 'Бюджетный отель возле Paddington', 'Бутик-отель в Soho', 'Семейный вариант рядом с Hyde Park'],
    activities: ['Прогулка вдоль Темзы', 'Музейный день в British Museum', 'Фото у Tower Bridge', 'Шопинг на Oxford Street', 'Вечерний театр в West End']
  },
  'Рим': {
    places: [
      { name: 'Колизей', lat: 41.89021, lon: 12.492231 },
      { name: 'Римский форум', lat: 41.892462, lon: 12.485325 },
      { name: 'Фонтан Треви', lat: 41.900932, lon: 12.483313 },
      { name: 'Пантеон', lat: 41.898611, lon: 12.476872 },
      { name: 'Площадь Навона', lat: 41.899163, lon: 12.473074 },
      { name: 'Ватикан', lat: 41.902916, lon: 12.453389 },
      { name: 'Испанская лестница', lat: 41.90599, lon: 12.48278 },
      { name: 'Трастевере', lat: 41.8898, lon: 12.4709 },
      { name: 'Вилла Боргезе', lat: 41.9142, lon: 12.4922 }
    ],
    food: ['Паста карбонара в траттории', 'Пицца al taglio для перекуса', 'Джелато возле фонтана Треви', 'Кофе и корнетто утром', 'Ужин в Трастевере'],
    hotels: ['Отель 3★ рядом с Termini', 'Апартаменты у Пантеона', 'Бутик-отель в Монти', 'Бюджетный вариант у метро', 'Семейные апартаменты в центре'],
    activities: ['Прогулка по античному Риму', 'Фото у Колизея', 'Вечер в Трастевере', 'Музеи Ватикана', 'Гастрономический маршрут']
  },
  'Ташкент': {
    places: [
      { name: 'Площадь Амира Темура', lat: 41.311081, lon: 69.279737 },
      { name: 'Комплекс Хаст-Имам', lat: 41.337095, lon: 69.240856 },
      { name: 'Чорсу базар', lat: 41.326534, lon: 69.235261 },
      { name: 'Ташкентская телебашня', lat: 41.345571, lon: 69.284599 },
      { name: 'Музей истории Узбекистана', lat: 41.3115, lon: 69.2684 },
      { name: 'Парк Навруз', lat: 41.3291, lon: 69.2793 },
      { name: 'Метро Ташкента', lat: 41.312336, lon: 69.278708 },
      { name: 'Broadway Tashkent', lat: 41.3119, lon: 69.2747 },
      { name: 'Minor Mosque', lat: 41.335296, lon: 69.282821 }
    ],
    food: ['Плов в центре', 'Самса и чай на базаре', 'Ресторан узбекской кухни', 'Кофейня возле Broadway', 'Ужин с местными блюдами'],
    hotels: ['Отель 3★ в центре', 'Апартаменты возле метро', 'Бюджетный отель у Chorsu', 'Комфортный отель рядом с Amir Temur Square', 'Гостевой дом в спокойном районе'],
    activities: ['Прогулка по Broadway', 'Посещение Chorsu Bazaar', 'Фото в метро Ташкента', 'Вечер у Minor Mosque', 'Маршрут по историческим местам']
  },
  'Бишкек': {
    places: [
      { name: 'Площадь Ала-Тоо', lat: 42.876354, lon: 74.603611 },
      { name: 'Ошский базар', lat: 42.874458, lon: 74.569825 },
      { name: 'Парк Панфилова', lat: 42.8787, lon: 74.5996 },
      { name: 'Дубовый парк', lat: 42.8789, lon: 74.6062 },
      { name: 'Кыргызский национальный музей', lat: 42.8772, lon: 74.6037 },
      { name: 'Филармония', lat: 42.8768, lon: 74.5846 },
      { name: 'Victory Square', lat: 42.8813, lon: 74.6132 },
      { name: 'Ala Archa маршрут', lat: 42.6358, lon: 74.4773 },
      { name: 'Центральная мечеть', lat: 42.8668, lon: 74.6221 }
    ],
    food: ['Лагман и манты в местном кафе', 'Кофейня в центре', 'Перекус на Ошском базаре', 'Ресторан кыргызской кухни', 'Ужин возле площади Ала-Тоо'],
    hotels: ['Отель 3★ в центре', 'Апартаменты возле площади Ала-Тоо', 'Бюджетный гостевой дом', 'Отель рядом с парками', 'Семейные апартаменты'],
    activities: ['Прогулка по площади Ала-Тоо', 'Поездка в Ала-Арчу', 'Фото в Дубовом парке', 'Гастромаршрут по базару', 'Вечерняя прогулка по центру']
  }
};

const tourInfo = {
  'Стамбул': {
    days: '5 дней',
    price: '$950',
    hotel: 'Отель 3★ рядом с историческим центром',
    transport: 'Самолет + общественный транспорт',
    food: 'Местные кафе, рынки и рестораны турецкой кухни',
    route: ['Султанахмет', 'Айя-София', 'Гранд-базар', 'Галатская башня', 'Босфор']
  },
  'Алматы': {
    days: '3 дня',
    price: '$400',
    hotel: 'Апартаменты или отель 3★ в центре',
    transport: 'Поезд/самолет + такси по городу',
    food: 'Кафе в центре, национальная кухня, кофейни',
    route: ['Парк 28 панфиловцев', 'Вознесенский собор', 'Кок-Тобе', 'Медеу', 'Зеленый базар']
  },
  'Дубай': {
    days: '4 дня',
    price: '$1450',
    hotel: 'Отель 4★ рядом с метро',
    transport: 'Самолет + метро/такси',
    food: 'Фудкорты, рестораны у моря, арабская кухня',
    route: ['Бурдж-Халифа', 'Dubai Mall', 'Марина', 'Пальма Джумейра', 'Старый Дубай']
  }
};

document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  const today = new Date().toISOString().split('T')[0];
  const end = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  document.getElementById('dateStart').value = today;
  document.getElementById('dateEnd').value = end;
});

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function cleanName(name) {
  return String(name)
    .replace(/[^\p{L}\p{N}\s\-'.]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isReadablePlaceName(name) {
  const text = cleanName(name);
  if (text.length < 4) return false;

  // Оставляем русские/английские названия и убираем случайные локализации,
  // которые OpenTripMap иногда возвращает для Казахстана и соседних регионов.
  return /^[A-Za-zА-Яа-яЁё0-9\s\-'.]+$/.test(text);
}

function normalizeCity(city) {
  const raw = String(city || '').trim();
  const key = raw.toLowerCase();
  return CITY_ALIASES[key] || {
    display: raw,
    query: raw,
    country: '',
    lat: null,
    lon: null
  };
}

function getGuide(city) {
  return CITY_GUIDES[city] || null;
}

function uniqueItems(items, limit = 5) {
  const seen = new Set();
  return items
    .filter(Boolean)
    .map((item) => String(item).trim())
    .filter((item) => {
      const key = item.toLowerCase();
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function updateAuthUI() {
  const loginBtn = document.getElementById('loginTopBtn');
  const userBox = document.getElementById('userBox');
  const userNameBadge = document.getElementById('userNameBadge');

  if (currentUser) {
    loginBtn.classList.add('hidden');
    userBox.classList.remove('hidden');
    userNameBadge.textContent = currentUser;
  } else {
    loginBtn.classList.remove('hidden');
    userBox.classList.add('hidden');
  }
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goHome() {
  showScreen('home');
}

function openAuth() {
  nextAction = 'authOnly';
  showScreen('auth');
}

function logout() {
  currentUser = '';
  localStorage.removeItem('travelAIUser');
  updateAuthUI();
  goHome();
}

function ensureAuth(action) {
  if (currentUser) {
    nextAction = action;
    return true;
  }

  nextAction = action;
  showScreen('auth');
  return false;
}

function startPlanner() {
  if (!ensureAuth('planner')) return;
  showScreen('transport');
}

function startTours() {
  if (!ensureAuth('tours')) return;
  showScreen('tours');
}

function handleAuth() {
  const name = document.getElementById('name').value.trim() || 'Пользователь';
  currentUser = name;
  localStorage.setItem('travelAIUser', currentUser);
  updateAuthUI();

  if (nextAction === 'planner') showScreen('transport');
  else if (nextAction === 'tours') showScreen('tours');
  else showScreen('home');
}

function selectTransport(el) {
  document.querySelectorAll('.transport-card').forEach((card) => card.classList.remove('selected'));
  el.classList.add('selected');
  currentTransport = el.dataset.value;
}

function continueToParams() {
  if (!currentTransport) {
    alert('Выберите транспорт');
    return;
  }

  document.getElementById('transportView').value = currentTransport;
  showScreen('params');
}

function addInterest(value) {
  const input = document.getElementById('interests');
  const items = input.value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!items.some((item) => item.toLowerCase() === value.toLowerCase())) {
    items.push(value);
  }

  input.value = items.join(', ');
}

function generateRoute() {
  const fromCity = document.getElementById('fromCity').value.trim();
  const toCityInput = document.getElementById('toCity').value.trim();
  const people = document.getElementById('people').value.trim();
  const dateStart = document.getElementById('dateStart').value;
  const dateEnd = document.getElementById('dateEnd').value;
  const budget = document.getElementById('budget').value.trim();
  const interests = document.getElementById('interests').value.trim();

  if (!fromCity || !toCityInput || !people || !dateStart || !dateEnd || !budget || !interests) {
    alert('Заполни все поля');
    return;
  }

  if (Number(people) < 1) {
    alert('Количество людей должно быть не меньше 1');
    return;
  }

  if (new Date(dateEnd) < new Date(dateStart)) {
    alert('Дата окончания не может быть раньше даты начала');
    return;
  }

  const city = normalizeCity(toCityInput);
  formData = {
    fromCity,
    toCity: city.display,
    toCityQuery: city.query,
    toCityCountry: city.country,
    fallbackLat: city.lat,
    fallbackLon: city.lon,
    people,
    dateStart,
    dateEnd,
    budget,
    interests,
    transport: currentTransport
  };

  showScreen('loading');
  setTimeout(renderRoute, 700);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function fallbackPointForCity(cityName) {
  const source = String(cityName || 'Алматы');
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) % 100000;
  }

  return {
    lat: 43.238949 + ((hash % 80) - 40) / 1000,
    lon: 76.889709 + (((hash / 80) % 80) - 40) / 1000
  };
}

async function getCityPoint(city) {
  const nominatimQuery = [city.toCityQuery || city.toCity, COUNTRY_NAMES[city.toCityCountry]]
    .filter(Boolean)
    .join(', ');

  try {
    const params = new URLSearchParams({
      q: nominatimQuery,
      format: 'json',
      limit: '1',
      'accept-language': 'ru'
    });
    const results = await fetchJson(`https://nominatim.openstreetmap.org/search?${params}`);
    const first = Array.isArray(results) && results[0];
    const lat = Number(first && first.lat);
    const lon = Number(first && first.lon);

    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return { lat, lon };
    }
  } catch (error) {
    console.warn('Nominatim geocoding failed:', error);
  }

  const params = new URLSearchParams({
    name: city.toCityQuery || city.toCity,
    apikey: OPEN_TRIP_MAP_KEY
  });

  if (city.toCityCountry) {
    params.set('country', city.toCityCountry);
  }

  try {
    const geoData = await fetchJson(`https://api.opentripmap.com/0.1/en/places/geoname?${params}`);
    if (Number.isFinite(geoData.lat) && Number.isFinite(geoData.lon)) {
      return { lat: geoData.lat, lon: geoData.lon };
    }
  } catch (error) {
    console.warn('OpenTripMap geoname failed:', error);
  }

  if (Number.isFinite(city.fallbackLat) && Number.isFinite(city.fallbackLon)) {
    return { lat: city.fallbackLat, lon: city.fallbackLon };
  }

  return fallbackPointForCity(city.toCity);
}

async function getPlaces(city) {
  const point = await getCityPoint(city);
  const guide = getGuide(city.toCity);
  if (guide && guide.places) {
    return guide.places;
  }

  const params = new URLSearchParams({
    radius: '8000',
    lon: point.lon,
    lat: point.lat,
    limit: '50',
    rate: '2',
    format: 'geojson',
    apikey: OPEN_TRIP_MAP_KEY
  });

  let data = { features: [] };
  try {
    data = await fetchJson(`https://api.opentripmap.com/0.1/en/places/radius?${params}`);
  } catch (error) {
    console.warn('OpenTripMap places failed:', error);
  }
  const seen = new Set();

  const places = (data.features || [])
    .map((place) => ({
      name: cleanName(place.properties && place.properties.name),
      lat: place.geometry && place.geometry.coordinates && place.geometry.coordinates[1],
      lon: place.geometry && place.geometry.coordinates && place.geometry.coordinates[0]
    }))
    .filter((place) => {
      const key = place.name.toLowerCase();
      const valid = isReadablePlaceName(place.name)
        && Number.isFinite(place.lat)
        && Number.isFinite(place.lon)
        && !key.includes('unknown')
        && !key.includes('без названия')
        && !seen.has(key);

      if (valid) seen.add(key);
      return valid;
    })
    .slice(0, 9);

  if (places.length >= 6) return places;

  const fallbackPlaces = buildFallbackPlaces(city.toCity, point);
  const combinedSeen = new Set();
  return [...places, ...fallbackPlaces]
    .filter((place) => {
      const key = place.name.toLowerCase();
      if (combinedSeen.has(key)) return false;
      combinedSeen.add(key);
      return true;
    })
    .slice(0, 9);
}

function buildFallbackPlaces(city, point) {
  return [
    { name: `Центр города ${city}`, ...point },
    { name: `Главная площадь ${city}`, lat: point.lat + 0.008, lon: point.lon + 0.008 },
    { name: `Исторический центр ${city}`, lat: point.lat - 0.008, lon: point.lon - 0.006 },
    { name: `Популярная прогулочная улица ${city}`, lat: point.lat + 0.012, lon: point.lon - 0.005 },
    { name: `Городской парк ${city}`, lat: point.lat - 0.012, lon: point.lon + 0.007 },
    { name: `Смотровая точка ${city}`, lat: point.lat + 0.016, lon: point.lon + 0.004 },
    { name: `Музейный район ${city}`, lat: point.lat - 0.006, lon: point.lon - 0.014 },
    { name: `Кафе и рестораны ${city}`, lat: point.lat + 0.004, lon: point.lon - 0.011 },
    { name: `Вечерняя прогулка ${city}`, lat: point.lat - 0.014, lon: point.lon + 0.002 }
  ];
}

function distance(a, b) {
  return Math.sqrt((a.lat - b.lat) ** 2 + (a.lon - b.lon) ** 2);
}

function buildRoute(points) {
  if (!points.length) return [];

  const route = [points[0]];
  let remaining = points.slice(1);

  while (remaining.length) {
    const last = route[route.length - 1];
    const nearest = remaining.reduce((prev, point) => (
      distance(last, point) < distance(last, prev) ? point : prev
    ));

    route.push(nearest);
    remaining = remaining.filter((point) => point !== nearest);
  }

  return route;
}

function aiText(city) {
  return `Путешествие в ${city} построено с учетом логистики и интересов.
День 1 - знакомство с городом и спокойная прогулка.
День 2 - основные достопримечательности, еда и фото-точки.
День 3 - отдых, локальные места и свободное время.`;
}

function generateFood(city) {
  const guide = getGuide(city);
  if (guide && guide.food) return guide.food;

  return uniqueItems([
    `Популярное кафе в центре ${city}`,
    `Ресторан местной кухни в ${city}`,
    `Street food и быстрый перекус в ${city}`,
    `Кофейня для завтрака в ${city}`,
    `Ужин в районе главной прогулочной улицы ${city}`
  ]);
}

function generateHotels(city) {
  const guide = getGuide(city);
  if (guide && guide.hotels) return guide.hotels;

  return uniqueItems([
    `Отель 3★ в центре ${city}`,
    `Апартаменты рядом с главными местами ${city}`,
    `Бюджетный отель возле транспорта`,
    `Семейные апартаменты с кухней`,
    `Гостевой дом в спокойном районе`
  ]);
}

function generateActivities(city, interests) {
  const guide = getGuide(city);
  const base = guide && guide.activities ? guide.activities : [
    `Пешая прогулка по центру ${city}`,
    `Фото-маршрут по главным точкам`,
    `Посещение музея или культурного места`,
    `Вечерняя прогулка и ужин`,
    `Свободное время для покупок и отдыха`
  ];

  const interestItems = String(interests || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `Добавить в маршрут: ${item}`);

  return uniqueItems([...base, ...interestItems], 7);
}

function estimateTripBudget(formData) {
  const people = Number(formData.people) || 1;
  const budget = Number(formData.budget) || 0;
  const perPerson = budget ? Math.round(budget / people) : 0;

  if (!budget) return 'Бюджет не указан';
  return `Ориентир: ${budget.toLocaleString('ru-RU')} ₸ на поездку, около ${perPerson.toLocaleString('ru-RU')} ₸ на человека`;
}

function getTripDays(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(diff, 1);
}

function formatDateRu(date) {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function buildOverview(plan) {
  const daysCount = getTripDays(plan.formData.dateStart, plan.formData.dateEnd);
  return [
    { label: 'Даты', value: `${formatDateRu(plan.formData.dateStart)} - ${formatDateRu(plan.formData.dateEnd)}` },
    { label: 'Длительность', value: `${daysCount} дн.` },
    { label: 'Люди', value: `${plan.formData.people} чел.` },
    { label: 'Транспорт', value: plan.formData.transport },
    { label: 'Стиль', value: plan.formData.interests },
    { label: 'Бюджет', value: `${Number(plan.formData.budget).toLocaleString('ru-RU')} ₸` }
  ];
}

function renderOverview(plan) {
  const overview = document.getElementById('tripOverview');
  if (!overview) return;

  overview.innerHTML = buildOverview(plan).map((item) => `
    <div>
      <span>${escapeHTML(item.label)}</span>
      <strong>${escapeHTML(item.value)}</strong>
    </div>
  `).join('');
}

function routeToText(plan = currentRoutePlan) {
  if (!plan) return 'Маршрут пока не создан.';

  const lines = [
    `TreapEasy - маршрут: ${plan.formData.fromCity} -> ${plan.formData.toCity}`,
    `Даты: ${formatDateRu(plan.formData.dateStart)} - ${formatDateRu(plan.formData.dateEnd)}`,
    `Транспорт: ${plan.formData.transport}`,
    `Люди: ${plan.formData.people}`,
    `Бюджет: ${Number(plan.formData.budget).toLocaleString('ru-RU')} ₸`,
    `Интересы: ${plan.formData.interests}`,
    '',
    'Маршрут по дням:'
  ];

  plan.days.forEach((day, index) => {
    lines.push(`День ${index + 1}`);
    day.forEach((place, placeIndex) => {
      const times = ['Утро', 'День', 'Вечер'];
      lines.push(`- ${times[placeIndex] || 'Место'}: ${place.name}`);
    });
  });

  lines.push('', 'Питание:');
  plan.food.forEach((item) => lines.push(`- ${item}`));
  lines.push('', 'Жилье:');
  plan.hotels.forEach((item) => lines.push(`- ${item}`));
  lines.push('', 'Активности:');
  plan.activities.forEach((item) => lines.push(`- ${item}`));

  return lines.join('\n');
}

async function renderRoute() {
  try {
    const places = await getPlaces(formData);
    const route = buildRoute(places);
    const days = [route.slice(0, 3), route.slice(3, 6), route.slice(6, 9)].filter((day) => day.length);
    const times = ['Утро', 'День', 'Вечер'];
    const food = generateFood(formData.toCity);
    const hotels = generateHotels(formData.toCity);
    const activities = generateActivities(formData.toCity, formData.interests);

    currentRoutePlan = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      formData: { ...formData },
      route,
      days,
      food,
      hotels,
      activities
    };

    document.getElementById('resultTitle').textContent = `Маршрут: ${formData.toCity}`;
    document.getElementById('resultSummary').textContent =
      `${aiText(formData.toCity)}\n${estimateTripBudget(formData)}`;
    document.getElementById('resultPills').innerHTML = `
      <span class="pill">${escapeHTML(formData.transport)}</span>
      <span class="pill">${escapeHTML(formData.people)} чел</span>
      <span class="pill">${escapeHTML(Number(formData.budget).toLocaleString('ru-RU'))} ₸</span>
    `;

    document.getElementById('daysContainer').innerHTML = days.map((day, index) => `
      <div class="timeline-day">
        <strong>День ${index + 1}</strong>
        ${day.map((place, timeIndex) => `
          <div class="timeline-item">
            <span>${times[timeIndex] || 'Место'}</span>
            <b>${escapeHTML(place.name)}</b>
          </div>
        `).join('')}
      </div>
    `).join('');

    renderOverview(currentRoutePlan);
    fillList('placesList', route.map((place) => place.name));
    fillList('foodList', food);
    fillList('hotelList', hotels);
    fillList('activitiesList', activities);
    updateMap(route, formData.toCity);
    showScreen('result');
  } catch (error) {
    console.error(error);
    alert('Не удалось загрузить места для этого города. Проверьте название города и интернет.');
    showScreen('params');
  }
}

function updateMap(route, city) {
  const mapFrame = document.getElementById('routeMapFrame');
  if (!mapFrame) return;

  const firstPoint = route[0];
  if (firstPoint && Number.isFinite(firstPoint.lat) && Number.isFinite(firstPoint.lon)) {
    const url = `https://maps.google.com/maps?q=${firstPoint.lat},${firstPoint.lon}&hl=ru&z=13`;
    mapFrame.src = `${url}&output=embed`;
    mapFrame.title = `Карта маршрута: ${city}`;
    updateExternalMapLink(url);
    return;
  }

  const url = `https://maps.google.com/maps?q=${encodeURIComponent(city)}&hl=ru&z=13`;
  mapFrame.src = `${url}&output=embed`;
  mapFrame.title = `Карта маршрута: ${city}`;
  updateExternalMapLink(url);
}

function updateExternalMapLink(url) {
  const link = document.getElementById('mapExternalLink');
  if (link) link.href = url;
}

function fillList(id, arr) {
  document.getElementById(id).innerHTML = arr
    .filter(Boolean)
    .map((item) => `<li>${escapeHTML(item)}</li>`)
    .join('');
}

function rejectRoute() {
  showScreen('preferences');
}

function regenerateWithPrefs() {
  extraPreference = document.getElementById('morePrefs').value.trim();
  if (extraPreference) {
    formData.interests = `${formData.interests}, ${extraPreference}`;
  }

  showScreen('loading');
  setTimeout(renderRoute, 700);
}

function acceptRoute() {
  renderFinalSummary();
  showScreen('final');
}

function saveRoute() {
  const message = document.getElementById('finalMsg') || document.getElementById('purchasedMsg');

  if (!currentRoutePlan) {
    if (message) message.textContent = 'Сначала создайте маршрут';
    return;
  }

  const routes = getSavedRoutes();
  const savedRoute = {
    ...currentRoutePlan,
    id: Date.now(),
    savedAt: new Date().toISOString()
  };

  routes.unshift(savedRoute);
  localStorage.setItem('travelAIRoutes', JSON.stringify(routes.slice(0, 12)));
  if (message) message.textContent = 'Маршрут сохранен';
}

async function shareRoute() {
  const message = document.getElementById('finalMsg') || document.getElementById('purchasedMsg');
  const text = routeToText();

  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      if (message) message.textContent = 'План скопирован в буфер обмена';
      return;
    }
  } catch (error) {
    console.warn(error);
  }

  if (message) message.textContent = 'План готов для копирования';
}

function downloadRoute() {
  if (!currentRoutePlan) return;

  const blob = new Blob([routeToText()], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const city = currentRoutePlan.formData.toCity.replace(/\s+/g, '-').toLowerCase();
  link.href = url;
  link.download = `treapeasy-${city}-route.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  const message = document.getElementById('finalMsg');
  if (message) message.textContent = 'Файл маршрута скачан';
}

function printRoute() {
  window.print();
}

function renderFinalSummary() {
  const target = document.getElementById('finalSummary');
  if (!target || !currentRoutePlan) return;

  target.innerHTML = `
    <div><span>Направление</span><strong>${escapeHTML(currentRoutePlan.formData.fromCity)} -> ${escapeHTML(currentRoutePlan.formData.toCity)}</strong></div>
    <div><span>Даты</span><strong>${formatDateRu(currentRoutePlan.formData.dateStart)} - ${formatDateRu(currentRoutePlan.formData.dateEnd)}</strong></div>
    <div><span>Бюджет</span><strong>${Number(currentRoutePlan.formData.budget).toLocaleString('ru-RU')} ₸</strong></div>
    <div><span>Первый день</span><strong>${escapeHTML(currentRoutePlan.days[0].map((place) => place.name).join(', '))}</strong></div>
  `;
}

function getSavedRoutes() {
  try {
    return JSON.parse(localStorage.getItem('travelAIRoutes') || '[]');
  } catch (error) {
    return [];
  }
}

function deleteSavedRoute(id) {
  if (!confirm('Удалить этот маршрут? Действие нельзя отменить.')) return;

  const routes = getSavedRoutes().filter((item) => Number(item.id) !== Number(id));
  localStorage.setItem('travelAIRoutes', JSON.stringify(routes));

  showSavedRoutes();
}

function showSavedRoutes() {
  const routes = getSavedRoutes();
  const list = document.getElementById('savedRoutesList');

  if (!list) return;

  if (!routes.length) {
    list.innerHTML = `
      <div class="empty-state">
        <h3>Пока пусто</h3>
        <p>Создайте маршрут и нажмите “Сохранить”, чтобы он появился здесь.</p>
        <button class="btn" onclick="startPlanner()">Создать маршрут</button>
      </div>
    `;
  } else {
    list.innerHTML = routes.map((route) => `
      <div class="saved-card">
        <span>${formatDateRu(route.savedAt || route.createdAt)}</span>
        <h3>${escapeHTML(route.formData.toCity)}</h3>
        <p>${escapeHTML(route.formData.fromCity)} -> ${escapeHTML(route.formData.toCity)}</p>
        <p>${escapeHTML(route.formData.transport)} · ${escapeHTML(route.formData.people)} чел · ${Number(route.formData.budget).toLocaleString('ru-RU')} ₸</p>
        <div class="row">
          <button class="btn small" onclick="restoreSavedRoute(${Number(route.id)})">Открыть</button>
          <button class="btn small red" onclick="deleteSavedRoute(${Number(route.id)})">Удалить</button>
        </div>
      </div>
    `).join('');
  }

  showScreen('savedRoutes');
}

function restoreSavedRoute(id) {
  const route = getSavedRoutes().find((item) => Number(item.id) === Number(id));
  if (!route) return;

  currentRoutePlan = route;
  formData = { ...route.formData };
  updateMap(route.route || [], route.formData.toCity);
  document.getElementById('resultTitle').textContent = `Маршрут: ${route.formData.toCity}`;
  document.getElementById('resultSummary').textContent = `${aiText(route.formData.toCity)}\n${estimateTripBudget(route.formData)}`;
  document.getElementById('resultPills').innerHTML = `
    <span class="pill">${escapeHTML(route.formData.transport)}</span>
    <span class="pill">${escapeHTML(route.formData.people)} чел</span>
    <span class="pill">${escapeHTML(Number(route.formData.budget).toLocaleString('ru-RU'))} ₸</span>
  `;

  const times = ['Утро', 'День', 'Вечер'];
  document.getElementById('daysContainer').innerHTML = route.days.map((day, index) => `
    <div class="timeline-day">
      <strong>День ${index + 1}</strong>
      ${day.map((place, timeIndex) => `
        <div class="timeline-item">
          <span>${times[timeIndex] || 'Место'}</span>
          <b>${escapeHTML(place.name)}</b>
        </div>
      `).join('')}
    </div>
  `).join('');

  renderOverview(route);
  fillList('placesList', (route.route || []).map((place) => place.name));
  fillList('foodList', route.food || []);
  fillList('hotelList', route.hotels || []);
  fillList('activitiesList', route.activities || []);
  showScreen('result');
}

function openTour(city, days, price) {
  const normalized = normalizeCity(city).display;
  const guide = getGuide(normalized);
  currentTour = tourInfo[city] || {
    days,
    price,
    hotel: guide && guide.hotels ? guide.hotels[0] : `Отель в ${city}`,
    transport: 'Удобный транспорт',
    food: guide && guide.food ? guide.food[0] : `Кафе и рестораны в ${city}`,
    route: guide && guide.places ? guide.places.map((place) => place.name).slice(0, 5) : [`Центр города ${city}`, `Главная достопримечательность ${city}`]
  };

  document.getElementById('tourTitle').textContent = `${city}: ${currentTour.days || days}, ${currentTour.price || price}`;
  document.getElementById('tourHotel').textContent = currentTour.hotel;
  document.getElementById('tourTransport').textContent = currentTour.transport;
  document.getElementById('tourFood').textContent = currentTour.food;
  showScreen('tourInfo');
}

function buyFullRoute() {
  showScreen('purchase');
}

function unlockFullRoute() {
  if (!currentTour) return showScreen('tours');

  document.getElementById('purchasedSummary').textContent = `${currentTour.days}, стоимость ${currentTour.price}.`;
  fillList('purchasedList', currentTour.route);
  showScreen('purchasedRoute');
}
