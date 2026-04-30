// ==========================
// 🔧 ДОБАВКИ (ВВЕРХ ФАЙЛА)
// ==========================

function cleanName(name){
  return name
    .replace(/[^\w\s\-']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateFood(city){
  return [
    `Популярное кафе в ${city}`,
    `Ресторан местной кухни в ${city}`,
    `Street food в центре ${city}`
  ];
}

function generateHotels(city){
  return [
    `Отель 3★ в центре ${city}`,
    `Апартаменты в ${city}`,
    `Бюджетный отель в ${city}`
  ];
}

// ==========================
// 🌍 API (УЛУЧШЕННЫЙ)
// ==========================

async function getPlaces(city){
  const apiKey = "5ae2e3f221c38a28845f05b6c65d3a4a715a4493f904859a4a1c132e";

  const geo = await fetch(`https://api.opentripmap.com/0.1/en/places/geoname?name=${city}&apikey=${apiKey}`);
  const geoData = await geo.json();

  const res = await fetch(
    `https://api.opentripmap.com/0.1/en/places/radius?radius=5000&lon=${geoData.lon}&lat=${geoData.lat}&limit=40&rate=3&apikey=${apiKey}`
  );

  const data = await res.json();

  return data.features
    .filter(p =>
      p.properties.name &&
      p.properties.name.length > 4 &&
      !p.properties.name.toLowerCase().includes('kazakhstan') &&
      !p.properties.name.toLowerCase().includes('unknown')
    )
    .slice(0,9)
    .map(p => ({
      name: cleanName(p.properties.name),
      lat: p.geometry.coordinates[1],
      lon: p.geometry.coordinates[0]
    }));
}

// ==========================
// 🚀 renderRoute (УЛУЧШЕННЫЙ)
// ==========================

async function renderRoute(){
  const places = await getPlaces(formData.toCity);

  if(!places.length){
    alert("Ошибка загрузки мест");
    showScreen('params');
    return;
  }

  const route = buildRoute(places);

  const days = [
    route.slice(0,3),
    route.slice(3,6),
    route.slice(6,9)
  ];

  document.getElementById('resultTitle').textContent =
    `Маршрут: ${formData.toCity}`;

  document.getElementById('resultSummary').textContent =
    aiText(formData.toCity);

  document.getElementById('resultPills').innerHTML = `
    <span class="pill">${formData.transport}</span>
    <span class="pill">${formData.people} чел</span>
    <span class="pill">$${formData.budget}</span>
  `;

  const times=['Утро','День','Вечер'];

  document.getElementById('daysContainer').innerHTML = days.map((day,i)=>`
    <div class="timeline-day">
      <strong>День ${i+1}</strong><br>
      ${day.map((p,index)=>`${times[index]}: ${p.name}`).join('<br>')}
    </div>
  `).join('');

  fillList('placesList', route.map(p=>p.name));

  // 🔥 УМНЫЕ СПИСКИ
  fillList('foodList', generateFood(formData.toCity));
  fillList('hotelList', generateHotels(formData.toCity));

  fillList('activitiesList', [
    'Прогулки',
    'Фотолокации',
    'Отдых'
  ]);

  // 🔥 ФИКС КАРТЫ (главный баг)
  const mapFrame = document.getElementById("routeMapFrame");
  if (mapFrame) {
    mapFrame.src = `https://maps.google.com/maps?q=${encodeURIComponent(formData.toCity)}&hl=ru&z=13&output=embed`;
  }

  showScreen('result');
}