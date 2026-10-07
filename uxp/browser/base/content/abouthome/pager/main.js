(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  function getJSON(url) {
    return fetch(url).then(function (r) { if (!r.ok) { throw new Error(r.status); } return r.json(); });
  }

  /* ---------- clock ---------- */
  function tick() {
    var n = new Date();
    var h = n.getHours();
    var ap = h < 12 ? 'AM' : 'PM';
    h = h % 12; if (h === 0) { h = 12; }
    var hh = h < 10 ? '0' + h : '' + h;
    var mm = n.getMinutes(); if (mm < 10) { mm = '0' + mm; }
    $('#time').textContent = hh + ':' + mm + ' ' + ap;
    $('#date').textContent = n.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  }
  tick(); setInterval(tick, 10000);

  /* ---------- wallpaper (local nature scenes; add your own file names here) ---------- */
  var WP = ['dawn', 'bluehour', 'forest', 'night'];
  var today = Math.floor(Date.now() / 864e5);
  var wp = store.get('wp', { i: -1, day: 0 });
  if (wp.day !== today) { wp = { i: (wp.i + 1) % WP.length, day: today }; store.set('wp', wp); }
  function applyWp() { document.body.style.backgroundImage = 'url(assets/wallpapers/' + WP[wp.i] + '.svg)'; }
  applyWp();

  /* ---------- search ---------- */
  var eng = $('#engine'), savedEng = store.get('engine', null);
  if (savedEng) { eng.value = savedEng; }
  eng.addEventListener('change', function () { store.set('engine', eng.value); });
  $('#search').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('#q').value.trim();
    if (!v) { return; }
    if (/^https?:\/\//i.test(v)) { location.href = v; }
    else if (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(v)) { location.href = 'https://' + v; }
    else { location.href = eng.value + encodeURIComponent(v); }
  });

  /* ---------- weather (Open-Meteo: free, no key) ---------- */
  var CLOUD = '<path d="M9 22h14a5 5 0 0 0 .6-9.96A7 7 0 0 0 10 11.6 5.2 5.2 0 0 0 9 22z"/>';
  var ICONS = {
    sun: '<circle cx="16" cy="16" r="6"/><path d="M16 3v4M16 25v4M3 16h4M25 16h4M7 7l3 3M22 22l3 3M25 7l-3 3M10 22l-3 3"/>',
    partly: '<circle cx="11" cy="11" r="4"/><path d="M11 3v2M3 11h2M5.5 5.5L7 7M16.5 5.5L15 7"/><path d="M12 27h12a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 13.2 19 4.6 4.6 0 0 0 12 27z"/>',
    cloud: CLOUD,
    fog: '<path d="M5 11h22M3 16h26M7 21h18M10 26h12"/>',
    rain: CLOUD + '<path d="M11 25l-1.5 4M17 25l-1.5 4M23 25l-1.5 4"/>',
    snow: CLOUD + '<path d="M11 26h.01M17 26h.01M23 26h.01M14 29.5h.01M20 29.5h.01" stroke-width="3"/>',
    storm: CLOUD + '<path d="M17 21l-3 5h4l-3 5"/>'
  };
  function icon(k, cls) {
    return '<svg class="wi" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ICONS[k] + '</svg>';
  }
  function wmo(c) {
    if (c === 0) { return ['sun', 'Clear']; }
    if (c <= 2) { return ['partly', 'Partly cloudy']; }
    if (c === 3) { return ['cloud', 'Overcast']; }
    if (c === 45 || c === 48) { return ['fog', 'Fog']; }
    if (c >= 51 && c <= 57) { return ['rain', 'Drizzle']; }
    if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) { return ['rain', 'Rain']; }
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) { return ['snow', 'Snow']; }
    if (c >= 95) { return ['storm', 'Thunderstorm']; }
    return ['cloud', 'Cloudy'];
  }
  var unitF = store.get('f', false);
  $('#unit').innerHTML = unitF ? '&deg;F' : '&deg;C';
  $('#unit').addEventListener('click', function () {
    unitF = !unitF; store.set('f', unitF);
    $('#unit').innerHTML = unitF ? '&deg;F' : '&deg;C';
    loadWeather();
  });
  $('#chg').addEventListener('click', function () {
    var f = $('#cityform'); f.hidden = !f.hidden;
    if (!f.hidden) { $('#city').focus(); }
  });
  $('#cityform').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#city').value.trim(), list = $('#cityres');
    if (!name) { return; }
    list.innerHTML = '';
    getJSON('https://geocoding-api.open-meteo.com/v1/search?count=5&language=en&format=json&name=' + encodeURIComponent(name))
      .then(function (d) {
        var res = d.results || [];
        if (!res.length) { list.innerHTML = '<li>No match found.</li>'; return; }
        res.forEach(function (r) {
          var li = document.createElement('li'), b = document.createElement('button');
          b.type = 'button';
          b.textContent = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
          b.addEventListener('click', function () {
            store.set('loc', { name: r.name, lat: r.latitude, lon: r.longitude });
            $('#cityform').hidden = true; list.innerHTML = ''; $('#city').value = '';
            loadWeather();
          });
          li.appendChild(b); list.appendChild(li);
        });
      })
      .catch(function () { list.innerHTML = '<li>Could not search right now.</li>'; });
  });

  function renderWeather(loc, d, stale) {
    var cur = d.current, w = wmo(cur.weather_code), u = unitF ? '&deg;F' : '&deg;C';
    $('#wx-city').textContent = loc.name;
    var h = '<div class="now">' + icon(w[0]) + '<div class="temp">' + Math.round(cur.temperature_2m) + '&deg;</div>' +
      '<div class="meta">' + w[1] + '<br>Feels like ' + Math.round(cur.apparent_temperature) + '&deg;<br>Wind ' +
      Math.round(cur.wind_speed_10m) + (unitF ? ' mph' : ' km/h') + (stale ? '<br>(offline data)' : '') + '</div></div><div class="fc">';
    for (var i = 0; i < d.daily.time.length; i++) {
      var day = new Date(d.daily.time[i] + 'T12:00:00');
      h += '<div>' + (i === 0 ? 'Today' : day.toLocaleDateString([], { weekday: 'short' })) +
        icon(wmo(d.daily.weather_code[i])[0]) +
        Math.round(d.daily.temperature_2m_max[i]) + '&deg; <small>' + Math.round(d.daily.temperature_2m_min[i]) + '&deg;</small></div>';
    }
    $('#wx-body').innerHTML = h + '</div>';
  }
  function loadWeather() {
    var loc = store.get('loc', null);
    if (!loc) { $('#wx-body').textContent = 'Choose your city to see the weather.'; $('#cityform').hidden = false; return; }
    var key = 'wx:' + loc.lat + ',' + loc.lon + (unitF ? 'F' : 'C'), cached = store.get(key, null);
    if (cached && Date.now() - cached.t < 15 * 60000) { renderWeather(loc, cached.d); return; }
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + loc.lat + '&longitude=' + loc.lon +
      '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min' +
      '&timezone=auto&forecast_days=5&temperature_unit=' + (unitF ? 'fahrenheit' : 'celsius') + '&wind_speed_unit=' + (unitF ? 'mph' : 'kmh');
    getJSON(url).then(function (d) { store.set(key, { t: Date.now(), d: d }); renderWeather(loc, d); })
      .catch(function () {
        if (cached) { renderWeather(loc, cached.d, true); } else { $('#wx-body').textContent = 'Weather is unavailable right now.'; }
      });
  }
  loadWeather();

  /* ---------- open source news (Hacker News search, dev.to as fallback; no keys) ---------- */
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }
  function ago(iso) {
    var m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (m < 60) { return m + ' min ago'; }
    if (m < 1440) { return Math.round(m / 60) + ' h ago'; }
    return Math.round(m / 1440) + ' d ago';
  }
  function renderNews(items) {
    var ul = $('#news-list'); ul.innerHTML = '';
    items.slice(0, 7).forEach(function (it) {
      var li = document.createElement('li'), a = document.createElement('a'), s = document.createElement('small');
      a.href = it.u; a.textContent = it.t; a.rel = 'noopener noreferrer';
      s.textContent = it.s + ' \u00b7 ' + ago(it.d);
      li.appendChild(a); li.appendChild(s); ul.appendChild(li);
    });
  }
  function loadNews() {
    var cached = store.get('news', null);
    if (cached && Date.now() - cached.t < 30 * 60000) { renderNews(cached.items); return; }
    getJSON('https://hn.algolia.com/api/v1/search_by_date?query=open%20source&tags=story&numericFilters=points%3E8&hitsPerPage=10')
      .then(function (d) {
        return d.hits.map(function (h) {
          return { t: h.title, u: h.url || 'https://news.ycombinator.com/item?id=' + h.objectID, d: h.created_at, s: host(h.url) || 'news.ycombinator.com' };
        });
      })
      .catch(function () {
        return getJSON('https://dev.to/api/articles?tag=opensource&per_page=8').then(function (d) {
          return d.map(function (a) { return { t: a.title, u: a.url, d: a.published_at, s: 'dev.to' }; });
        });
      })
      .then(function (items) { store.set('news', { t: Date.now(), items: items }); renderNews(items); })
      .catch(function () {
        if (cached) { renderNews(cached.items); } else { $('#news-list').innerHTML = '<li>News is unavailable right now.</li>'; }
      });
  }
  loadNews();
})();
