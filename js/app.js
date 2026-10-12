const CONFIG = {"basemap":{"attribution":"&copy; OpenStreetMap contributors","url":"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"},"labelFontSize":13.0,"labelPositions":{},"layers":[{"categories":[{"color":"#c8553d","value":"1"},{"color":"#3fa66b","value":"2"},{"color":"#2f6fd0","value":"3"},{"color":"#4a8fb5","value":"4"}],"categoryField":null,"color":"#2563eb","fieldAliases":null,"file":null,"geometryType":"Raster","isBoundary":false,"isFocus":false,"kind":"raster","labeling":null,"layerIndex":1,"maxNativeZoom":14,"minNativeZoom":5,"name":"supervisedwulan","opacity":0.75,"pixelated":true,"pointSize":5,"ranges":null,"rasterBounds":[-7.9146632,110.513805,-7.8911901,110.5549277],"showAttributeTable":false,"tileUrl":"tiles/supervisedwulan/{z}/{x}/{y}.png","visibleFields":null},{"categories":[{"color":"#c8553d","value":"0"},{"color":"#3fa66b","value":"1"},{"color":"#2f6fd0","value":"2"},{"color":"#4a8fb5","value":"3"}],"categoryField":"predicted","color":"#2563eb","fieldAliases":null,"file":"data/jenis_vegetasi.geojson","geometryType":"Polygon","isBoundary":false,"isFocus":true,"labeling":null,"layerIndex":0,"name":"jenis vegetasi","opacity":0.85,"pointSize":5.0,"ranges":null,"showAttributeTable":true,"visibleFields":null}],"maxZoom":18,"minZoom":5,"scaleBarSegments":4,"showFullTable":true,"showLegend":true,"showScaleBar":true};

const map = L.map('map', { zoomControl: false, doubleClickZoom: false, minZoom: CONFIG.minZoom, maxZoom: CONFIG.maxZoom });
L.control.zoom({ position: 'bottomright' }).addTo(map);

const FocusBoundaryControl = L.Control.extend({
  onAdd: function () {
    const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    const button = L.DomUtil.create('a', '', container);
    button.href = '#';
    button.title = 'Fokus ke Boundary Layer';
    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', 'Fokus ke Boundary Layer');
    button.style.fontSize = '18px';
    button.style.lineHeight = '30px';
    button.style.textAlign = 'center';
    button.innerHTML = '&#8982;';
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.on(button, 'click', function (ev) {
      L.DomEvent.preventDefault(ev);
      const boundaryCfg = CONFIG.layers.find(function (l) { return l.isFocus; });
      if (!boundaryCfg) return;
      const gLayer = layerRefs[boundaryCfg.layerIndex];
      if (!gLayer) return;
      const bounds = gLayer.getBounds();
      if (!bounds.isValid()) return;
      const mapEl = map.getContainer();
      mapEl.classList.add('map-flying');
      map.once('moveend', function () { mapEl.classList.remove('map-flying'); });
      if (map.getBoundsZoom(bounds) < CONFIG.minZoom) {
        map.flyTo(bounds.getCenter(), CONFIG.minZoom, { duration: 1.6 });
      } else {
        map.flyToBounds(bounds, { maxZoom: CONFIG.maxZoom, duration: 1.6 });
      }
    });
    return container;
  },
});
new FocusBoundaryControl({ position: 'bottomright' }).addTo(map);

if (CONFIG.showScaleBar !== false) {
  const SB_SWAP_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>';
  const FixedScale = L.Control.Scale.extend({
    onAdd: function (map) {
      const container = L.Control.Scale.prototype.onAdd.call(this, map);
      const btn = L.DomUtil.create('button', 'sb-unit-toggle', container);
      btn.type = 'button';
      btn.title = 'Ganti satuan jarak (km / m)';
      btn.setAttribute('aria-label', 'Ganti satuan jarak (km / m)');
      btn.innerHTML = SB_SWAP_ICON;
      L.DomEvent.disableClickPropagation(btn);
      const self = this;
      let turns = 0;
      L.DomEvent.on(btn, 'click', function (ev) {
        L.DomEvent.preventDefault(ev);
        self._forcedUnit = self._shownUnit === 'km' ? 'm' : 'km';
        turns += 1;
        if (btn.firstElementChild) btn.firstElementChild.style.transform = 'rotate(' + (turns * 180) + 'deg)';
        self._update();
      });
      return container;
    },
    _updateMetric: function (maxMeters) {
      const n = Math.max(2, Math.min(6, Math.round(Number(this.options.segments) || 4)));
      const unit = this._forcedUnit || 'auto';
      const useKm = unit === 'km' || (unit !== 'm' && maxMeters >= 1000);
      this._shownUnit = useKm ? 'km' : 'm';
      const total = useKm ? maxMeters / 1000 : maxMeters;
      const step = total / n;
      const d = step >= 10 ? 0 : step >= 1 ? 1 : Math.min(4, Math.ceil(-Math.log10(step)) + 1);
      let html = '<div class="sb-ticks">';
      for (let i = 0; i <= n; i++) {
        const v = Number((step * i).toFixed(d));
        html += '<span class="sb-tick" style="left:' + (i * 100 / n) + '%">' + v +
          (i === n ? '<span class="sb-unit">' + (useKm ? 'km' : 'm') + '</span>' : '') + '</span>';
      }
      html += '</div>';
      this._mScale.style.width = this.options.maxWidth + 'px';
      this._mScale.innerHTML = html;
    },
  });
  const sbSegs = Math.max(2, Math.min(6, Math.round(Number(CONFIG.scaleBarSegments) || 4)));
  const scaleCtl = new FixedScale({ position: 'bottomleft', metric: true, imperial: false, maxWidth: 150, segments: sbSegs }).addTo(map);
  const sbLine = scaleCtl.getContainer().querySelector('.leaflet-control-scale-line');
  if (sbLine) {
    const sbStops = [];
    for (let i = 0; i < sbSegs; i++) {
      sbStops.push((i % 2 === 0 ? '#ffffff' : '#1e293b') + ' ' + (i * 100 / sbSegs) + '% ' + ((i + 1) * 100 / sbSegs) + '%');
    }
    sbLine.style.setProperty('--sb-bg', 'linear-gradient(90deg, ' + sbStops.join(', ') + ')');
  }
}

function addBasemap() {
  L.tileLayer(CONFIG.basemap.url, {
    attribution: CONFIG.basemap.attribution,
    minZoom: CONFIG.minZoom,
    maxZoom: CONFIG.maxZoom,
    updateWhenIdle: true,
    keepBuffer: 2,
  }).addTo(map);
}
if (window.requestIdleCallback) {
  window.requestIdleCallback(addBasemap, { timeout: 800 });
} else {
  setTimeout(addBasemap, 150);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Warna final feature: kalau layer punya kategori (categoryField diisi saat
// konfigurasi di GIS2Web Studio), pakai warna per-kategori; kalau tidak,
// pakai warna solid layer. Ini nilai FINAL, tidak ada UI untuk mengubahnya
// di hasil export.
function resolveFeatureColor(layer, feature) {
  if (layer.categoryField && layer.categories && layer.categories.length > 0) {
    const raw = feature && feature.properties ? feature.properties[layer.categoryField] : undefined;
    const valueKey = raw === null || raw === undefined ? 'NULL' : String(raw);
    const match = layer.categories.find((c) => c.value === valueKey);
    return match ? match.color : layer.color;
  }

  if (layer.categoryField && layer.ranges && layer.ranges.length > 0) {
    const raw = feature && feature.properties ? feature.properties[layer.categoryField] : undefined;
    const numericValue = typeof raw === 'number' ? raw : parseFloat(raw);
    if (!Number.isNaN(numericValue)) {
      const match = layer.ranges.find((r) => numericValue >= r.lower && numericValue <= r.upper);
      if (match) return match.color;
    }
    return layer.color;
  }

  return layer.color;
}

function buildFieldsTable(properties, visibleFields, fieldAliases) {
  if (!properties || Object.keys(properties).length === 0) return null;
  const allKeys = Object.keys(properties);
  const fieldsToShow = Array.isArray(visibleFields)
    ? visibleFields.filter((f) => allKeys.includes(f))
    : allKeys;
  if (fieldsToShow.length === 0) return null;

  return fieldsToShow.map((key) => {
    const value = properties[key];
    const alias = fieldAliases && fieldAliases[key];
    return { key, label: alias || key, value: value === null || value === undefined ? '-' : String(value) };
  });
}

// ---- Feature Information card (mode 'card' / 'both') ----
const cardEl = document.getElementById('feature-info-card');
const cardTitleEl = document.getElementById('feature-info-card-title');
const cardSubtitleEl = document.getElementById('feature-info-card-subtitle');
const cardTableEl = document.getElementById('feature-info-card-table');
const cardCloseBtn = document.getElementById('feature-info-card-close');

function showFeatureCard(layerName, rows) {
  cardTitleEl.textContent = 'Feature Information';
  cardSubtitleEl.textContent = layerName;
  cardTableEl.innerHTML = rows
    ? rows.map((r) => `<tr><th>${escapeHtml(r.label)}</th><td>${escapeHtml(r.value)}</td></tr>`).join('')
    : '<tr><td>Tidak ada atribut.</td></tr>';
  cardEl.hidden = false;
}

function hideFeatureCard() {
  cardEl.hidden = true;
}

cardCloseBtn.addEventListener('click', hideFeatureCard);

const layerRefs = {};
const layerGeojsonData = {};
const featureLayerRefs = {};
const layerStyleFns = {};
let boundaryFitted = false;
let activeFeatureKey = null;
const clickCycle = { point: null, matches: [], index: -1 };

// ---- Highlight seleksi: strong (feature diklik) / subtle (feature lain di
// layer yang sama). Sama persis dengan getStrongHighlightStyle/
// getSubtleHighlightStyle di layerStyle.ts pada aplikasi. ----
function getStrongHighlightStyle(base) {
  return Object.assign({}, base, {
    weight: (base.weight || 1.5) + 3,
    color: '#facc15',
    fillOpacity: Math.min((base.fillOpacity || 0.35) + 0.25, 0.85),
  });
}
function getSubtleHighlightStyle(base) {
  return Object.assign({}, base, {
    weight: (base.weight || 1.5) + 1.5,
    fillOpacity: Math.min((base.fillOpacity || 0.35) + 0.1, 0.7),
  });
}

// ---- Prioritas hit-test: Point > Line > Polygon. Sama persis dengan
// geometryPriority() di MapView.tsx. ----
function geometryPriority(geomType) {
  if (geomType === 'Point' || geomType === 'MultiPoint') return 0;
  if (geomType === 'LineString' || geomType === 'MultiLineString') return 1;
  if (geomType === 'Polygon' || geomType === 'MultiPolygon') return 2;
  return 3;
}

const NEAREST_FEATURE_PIXEL_TOLERANCE = 18;

function getVisibleZOrderedFeatureCandidates(latlng) {
  const pt = turf.point([latlng.lng, latlng.lat]);
  const candidates = [];
  const nearestByDistance = [];

  const clickPoint = map.latLngToContainerPoint(latlng);
  const toleranceProbe = L.point(clickPoint.x + NEAREST_FEATURE_PIXEL_TOLERANCE, clickPoint.y);
  const toleranceLatLng = map.containerPointToLatLng(toleranceProbe);
  const toleranceMeters = latlng.distanceTo(toleranceLatLng);

  // CONFIG.layers sudah terurut sesuai layerOrder final (layer atas dulu).
  CONFIG.layers.forEach((layerCfg) => {
    const gLayer = layerRefs[layerCfg.layerIndex];
    if (!gLayer || !map.hasLayer(gLayer)) return;
    const geojsonData = layerGeojsonData[layerCfg.layerIndex];
    if (!geojsonData) return;

    const features = geojsonData.features || [];
    features.forEach((feature, featureIndex) => {
      const geomType = feature.geometry ? feature.geometry.type : undefined;
      const key = layerCfg.layerIndex + ':' + featureIndex;

      if (geomType === 'Point' || geomType === 'MultiPoint') {
        const coordsList = geomType === 'Point' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
        for (const c of coordsList) {
          const d = latlng.distanceTo(L.latLng(c[1], c[0]));
          if (d <= toleranceMeters) {
            const layerInstance = featureLayerRefs[key];
            if (layerInstance) {
              nearestByDistance.push({ layerIndex: layerCfg.layerIndex, featureIndex, layerInstance, geomType, distanceMeters: d });
            }
            break;
          }
        }
        return;
      }

      if (geomType === 'LineString' || geomType === 'MultiLineString') {
        try {
          const lines = geomType === 'MultiLineString'
            ? feature.geometry.coordinates.map((coords) => turf.lineString(coords))
            : [turf.lineString(feature.geometry.coordinates)];
          for (const line of lines) {
            const d = turf.pointToLineDistance(pt, line, { units: 'meters' });
            if (d <= toleranceMeters) {
              const layerInstance = featureLayerRefs[key];
              if (layerInstance) {
                nearestByDistance.push({ layerIndex: layerCfg.layerIndex, featureIndex, layerInstance, geomType, distanceMeters: d });
              }
              break;
            }
          }
        } catch (e) { /* geometry tidak valid, skip */ }
        return;
      }

      if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') return;

      try {
        if (turf.booleanPointInPolygon(pt, feature)) {
          const layerInstance = featureLayerRefs[key];
          if (layerInstance) {
            candidates.push({ layerIndex: layerCfg.layerIndex, featureIndex, layerInstance, geomType, distanceMeters: 0 });
          }
          return;
        }
      } catch (e) { /* geometry tidak valid, coba fallback jarak */ }

      try {
        const boundary = turf.polygonToLine(feature);
        const lineFeatures = boundary.type === 'FeatureCollection' ? boundary.features : [boundary];
        const singleLines = [];
        lineFeatures.forEach((lf) => {
          if (lf.geometry.type === 'LineString') {
            singleLines.push(lf);
          } else if (lf.geometry.type === 'MultiLineString') {
            lf.geometry.coordinates.forEach((coords) => singleLines.push(turf.lineString(coords)));
          }
        });
        for (const line of singleLines) {
          const d = turf.pointToLineDistance(pt, line, { units: 'meters' });
          if (d <= toleranceMeters) {
            const layerInstance = featureLayerRefs[key];
            if (layerInstance) {
              nearestByDistance.push({ layerIndex: layerCfg.layerIndex, featureIndex, layerInstance, geomType, distanceMeters: d });
            }
            break;
          }
        }
      } catch (e) { /* geometry tidak valid untuk fallback juga, skip */ }
    });
  });

  const merged = candidates.concat(nearestByDistance);
  if (merged.length === 0) return [];
  merged.sort((a, b) => {
    const p = geometryPriority(a.geomType) - geometryPriority(b.geomType);
    if (p !== 0) return p;
    return a.distanceMeters - b.distanceMeters;
  });
  return merged;
}

function applyHighlightForActive() {
  Object.keys(featureLayerRefs).forEach((key) => {
    const layerIndexStr = key.split(':')[0];
    const layerIndex = Number(layerIndexStr);
    const layerInstance = featureLayerRefs[key];
    const styleFn = layerStyleFns[layerIndex];
    if (!styleFn || typeof layerInstance.setStyle !== 'function') return;
    const baseStyle = styleFn(layerInstance.feature);

    if (!activeFeatureKey || activeFeatureKey.split(':')[0] !== layerIndexStr) {
      layerInstance.setStyle(baseStyle);
      return;
    }
    if (key === activeFeatureKey) {
      layerInstance.setStyle(getStrongHighlightStyle(baseStyle));
      if (typeof layerInstance.bringToFront === 'function') layerInstance.bringToFront();
    } else {
      layerInstance.setStyle(getSubtleHighlightStyle(baseStyle));
    }
  });
}

function closeAllPopups() {
  Object.keys(featureLayerRefs).forEach((key) => {
    const l = featureLayerRefs[key];
    if (typeof l.closePopup === 'function') l.closePopup();
  });
}

// Fungsi terpusat untuk "memilih" sebuah feature, dipakai baik dari klik
// peta maupun klik row di Attribute Table, supaya highlight/popup/card dan
// sinkronisasi selalu konsisten dari kedua sumber. latlng opsional (row
// Attribute Table tidak selalu punya titik klik di peta).
function selectFeature(layerIndex, featureIndex, latlng) {
  const key = layerIndex + ':' + featureIndex;
  const layerInstance = featureLayerRefs[key];
  if (!layerInstance) return;

  activeFeatureKey = key;
  applyHighlightForActive();
  closeAllPopups();

  const layerConfig = CONFIG.layers.find((l) => l.layerIndex === layerIndex);
  const geojsonData = layerGeojsonData[layerIndex];
  const feature = geojsonData ? geojsonData.features[featureIndex] : null;
  const rows = layerConfig && feature ? buildFieldsTable(feature.properties, layerConfig.visibleFields, layerConfig.fieldAliases) : null;

  showFeatureCard(layerConfig ? layerConfig.name : '', rows);

  syncAttributeTableToActiveFeature();
}

function handleMapClick(e) {
  const candidates = getVisibleZOrderedFeatureCandidates(e.latlng);
  if (candidates.length === 0) return;

  const clickPoint = map.latLngToContainerPoint(e.latlng);
  const sameKeys = clickCycle.matches.length === candidates.length &&
    clickCycle.matches.every((m, i) => m.layerIndex === candidates[i].layerIndex && m.featureIndex === candidates[i].featureIndex);
  const closeToPrev = clickCycle.point ? clickCycle.point.distanceTo(clickPoint) < 15 : false;
  const nextIndex = sameKeys && closeToPrev ? (clickCycle.index + 1) % candidates.length : 0;

  clickCycle.point = clickPoint;
  clickCycle.matches = candidates.map((c) => ({ layerIndex: c.layerIndex, featureIndex: c.featureIndex }));
  clickCycle.index = nextIndex;

  const selected = candidates[nextIndex];
  selectFeature(selected.layerIndex, selected.featureIndex, e.latlng);
}

map.on('click', handleMapClick);

// ---- Smart Hover: feature teratas di bawah kursor (hit-test sama dengan
// klik) diberi highlight ringan. Dinonaktifkan di perangkat sentuh. ----
let hoveredFeatureKey = null;

// Port dari getPreviewHighlightStyle (layerStyle.ts): hover berbeda dari
// highlight seleksi (kuning) supaya terbedakan dari feature yang dipilih.
function getPreviewHighlightStyle(base) {
  return Object.assign({}, base, {
    weight: (base.weight != null ? base.weight : 1.5) + 2,
    color: '#3b82f6',
    dashArray: '4 3',
    fillOpacity: Math.min((base.fillOpacity != null ? base.fillOpacity : 0.35) + 0.1, 0.65),
  });
}

function clearHover() {
  const key = hoveredFeatureKey;
  if (!key) return;
  hoveredFeatureKey = null;
  if (key === activeFeatureKey) return;
  const inst = featureLayerRefs[key];
  if (!inst) return;
  const parts = key.split(':');
  const li = Number(parts[0]);
  const fi = Number(parts[1]);
  const geojsonData = layerGeojsonData[li];
  const feat = geojsonData ? geojsonData.features[fi] : null;
  const gt = feat && feat.geometry ? feat.geometry.type : undefined;
  if ((gt === 'Point' || gt === 'MultiPoint') && typeof inst.setRadius === 'function') {
    const lc = CONFIG.layers.find((l) => l.layerIndex === li);
    inst.setRadius((lc && lc.pointSize) || 5);
  }
  const styleFn = layerStyleFns[li];
  if (!styleFn || typeof inst.setStyle !== 'function') return;
  const base = styleFn(inst.feature);
  const sameLayerAsActive = activeFeatureKey && activeFeatureKey.split(':')[0] === String(li);
  inst.setStyle(sameLayerAsActive ? getSubtleHighlightStyle(base) : base);
}

function applyHover(key) {
  if (key === hoveredFeatureKey) return;
  clearHover();
  if (!key || key === activeFeatureKey) return;
  const inst = featureLayerRefs[key];
  if (!inst) return;
  const parts = key.split(':');
  const li = Number(parts[0]);
  const fi = Number(parts[1]);
  const geojsonData = layerGeojsonData[li];
  const feat = geojsonData ? geojsonData.features[fi] : null;
  const gt = feat && feat.geometry ? feat.geometry.type : undefined;
  if ((gt === 'Point' || gt === 'MultiPoint') && typeof inst.setRadius === 'function') {
    const lc = CONFIG.layers.find((l) => l.layerIndex === li);
    inst.setRadius(((lc && lc.pointSize) || 5) + 4);
  }
  const styleFn = layerStyleFns[li];
  if (styleFn && typeof inst.setStyle === 'function') {
    inst.setStyle(getPreviewHighlightStyle(styleFn(inst.feature)));
  }
  hoveredFeatureKey = key;
}

if (!(window.matchMedia && window.matchMedia('(hover: none)').matches && window.matchMedia('(pointer: coarse)').matches)) {
  let hoverRaf = null;
  map.on('mousemove', (e) => {
    if (hoverRaf !== null) return;
    hoverRaf = window.requestAnimationFrame(() => {
      hoverRaf = null;
      try {
        const top = getVisibleZOrderedFeatureCandidates(e.latlng)[0];
        applyHover(top ? top.layerIndex + ':' + top.featureIndex : null);
      } catch (err) { /* abaikan error hit-test saat hover */ }
    });
  });
  map.on('mouseout', () => {
    if (hoverRaf !== null) { window.cancelAnimationFrame(hoverRaf); hoverRaf = null; }
    clearHover();
  });
}

// Point/MultiPoint selalu tampak di atas Polygon/Buffer (murni z-order).
function bringPointFeaturesToFront() {
  Object.keys(featureLayerRefs).forEach((key) => {
    const parts = key.split(':');
    const layerIndex = Number(parts[0]);
    const featureIndex = Number(parts[1]);
    const geojsonData = layerGeojsonData[layerIndex];
    const feat = geojsonData ? geojsonData.features[featureIndex] : null;
    const geomType = feat && feat.geometry ? feat.geometry.type : undefined;
    if (geomType !== 'Point' && geomType !== 'MultiPoint') return;
    const layerInstance = featureLayerRefs[key];
    if (layerInstance && typeof layerInstance.bringToFront === 'function') {
      layerInstance.bringToFront();
    }
  });
}

// ---- Attribute Table: hanya layer dengan showAttributeTable=true yang
// muncul di dropdown, sesuai konfigurasi yang sudah diatur di GIS2Web
// Studio. Klik row -> selectFeature() (fungsi yang sama dipakai klik peta).
// Saat feature dipilih dari peta, tabel ikut sync (ganti layer dropdown +
// highlight row aktif). ----
const attrPanelEl = document.getElementById('attribute-table-panel');
const attrLayerSelectEl = document.getElementById('attribute-table-layer-select');
const attrCountEl = document.getElementById('attribute-table-count');
const attrToggleBtn = document.getElementById('attribute-table-toggle-btn');
const attrBodyEl = document.getElementById('attribute-table-body');
const attrDataTableEl = document.getElementById('attribute-data-table');

const attributeTableLayers = CONFIG.layers.filter((l) => l.showAttributeTable);
let attrSelectedLayerIndex = attributeTableLayers.length > 0 ? attributeTableLayers[0].layerIndex : null;
let attrCollapsed = true;

function renderAttributeTableOptions() {
  attrLayerSelectEl.innerHTML = '';
  attributeTableLayers.forEach((l) => {
    const opt = document.createElement('option');
    opt.value = String(l.layerIndex);
    opt.textContent = l.name;
    attrLayerSelectEl.appendChild(opt);
  });
  if (attrSelectedLayerIndex !== null) {
    attrLayerSelectEl.value = String(attrSelectedLayerIndex);
  }
  attrLayerSelectEl.style.display = attributeTableLayers.length > 1 ? '' : 'none';
}

function renderAttributeTableRows() {
  if (attrSelectedLayerIndex === null) {
    attrDataTableEl.innerHTML = '';
    attrCountEl.textContent = '';
    return;
  }
  const geojsonData = layerGeojsonData[attrSelectedLayerIndex];
  if (!geojsonData) {
    attrDataTableEl.innerHTML = '<tbody><tr><td>Memuat data...</td></tr></tbody>';
    return;
  }
  const features = geojsonData.features || [];
  const fieldSet = [];
  features.forEach((f) => {
    if (f.properties) {
      Object.keys(f.properties).forEach((k) => {
        if (fieldSet.indexOf(k) === -1) fieldSet.push(k);
      });
    }
  });

  attrCountEl.textContent = features.length + ' fitur';

  if (fieldSet.length === 0) {
    attrDataTableEl.innerHTML = '<tbody><tr><td>Tidak ada data atribut pada layer ini.</td></tr></tbody>';
    return;
  }

  const theadHtml = '<thead><tr>' + fieldSet.map((f) => '<th>' + escapeHtml(f) + '</th>').join('') + '</tr></thead>';
  const tbodyRows = features.map((f, featureIndex) => {
    const isActive = activeFeatureKey === (attrSelectedLayerIndex + ':' + featureIndex);
    const cells = fieldSet.map((field) => {
      const v = f.properties ? f.properties[field] : undefined;
      return '<td>' + escapeHtml(v === null || v === undefined ? '-' : String(v)) + '</td>';
    }).join('');
    return '<tr data-feature-index="' + featureIndex + '" class="' + (isActive ? 'active-row' : '') + '">' + cells + '</tr>';
  }).join('');

  attrDataTableEl.innerHTML = theadHtml + '<tbody>' + tbodyRows + '</tbody>';

  const rows = attrDataTableEl.querySelectorAll('tbody tr');
  rows.forEach((tr) => {
    tr.addEventListener('click', () => {
      const fi = Number(tr.getAttribute('data-feature-index'));
      selectFeature(attrSelectedLayerIndex, fi);
    });
  });
}

function setAttributeTableCollapsed(collapsed) {
  attrCollapsed = collapsed;
  attrBodyEl.hidden = collapsed;
  attrToggleBtn.innerHTML = collapsed ? '&#9650;' : '&#9660;';
}

function openAttributeTablePanel() {
  if (attributeTableLayers.length === 0) return;
  attrPanelEl.hidden = false;
  setAttributeTableCollapsed(false);
  syncAttributeTableToActiveFeature();
  renderAttributeTableRows();
}

function closeAttributeTablePanel() {
  attrPanelEl.hidden = true;
  setAttributeTableCollapsed(true);
}

attrToggleBtn.addEventListener('click', closeAttributeTablePanel);

attrLayerSelectEl.addEventListener('change', (e) => {
  attrSelectedLayerIndex = Number(e.target.value);
  renderAttributeTableRows();
});

function syncAttributeTableToActiveFeature() {
  if (!activeFeatureKey) return;
  const layerIndex = Number(activeFeatureKey.split(':')[0]);
  const isTrackedLayer = attributeTableLayers.some((l) => l.layerIndex === layerIndex);
  if (!isTrackedLayer) return;

  if (attrSelectedLayerIndex !== layerIndex) {
    attrSelectedLayerIndex = layerIndex;
    attrLayerSelectEl.value = String(layerIndex);
  }
  renderAttributeTableRows();
}

if (attributeTableLayers.length > 0 && CONFIG.showFullTable !== false) {
  renderAttributeTableOptions();
  setAttributeTableCollapsed(true);
  document.getElementById('feature-info-card-footer').hidden = false;
  document.getElementById('feature-info-card-full-table-btn').addEventListener('click', openAttributeTablePanel);
}

// ---- Layer visibility toggle: on/off tampil di peta, murni interaksi
// end-user. TIDAK mengubah warna/opacity/order/konfigurasi lain - itu
// semua sudah final dari GIS2Web Studio dan tidak diedit di sini. ----
const layerTogglePanelEl = document.getElementById('layer-toggle-panel');
const layerToggleListEl = document.getElementById('layer-toggle-list');
const layerToggleCollapseBtn = document.getElementById('layer-toggle-collapse-btn');
let layerToggleCollapsed = false;

function setLayerToggleCollapsed(collapsed) {
  layerToggleCollapsed = collapsed;
  layerToggleListEl.hidden = collapsed;
  layerToggleCollapseBtn.innerHTML = collapsed ? '&#9650;' : '&#9660;';
}

layerToggleCollapseBtn.addEventListener('click', () => setLayerToggleCollapsed(!layerToggleCollapsed));

// ---- Legenda: menyatu dengan panel Layer. Warna memakai data yang sama
// dengan peta (categories / ranges), jadi selalu konsisten. ----
function legendKind(layerCfg) {
  const g = String(layerCfg.geometryType || '').toLowerCase();
  if (g.indexOf('point') !== -1) return 'point';
  if (g.indexOf('line') !== -1) return 'line';
  return 'area';
}

function legendFill(color, opacity) {
  const m = /^#?([0-9a-f]{6})$/i.exec(color || '');
  if (!m) return color;
  const n = parseInt(m[1], 16);
  const a = Math.max(0.35, opacity == null ? 0.35 : opacity);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}

function makeLegendSwatch(layerCfg, color) {
  const s = document.createElement('i');
  const kind = layerCfg.isBoundary ? 'boundary' : legendKind(layerCfg);
  s.className = 'legend-swatch legend-swatch--' + kind;
  if (kind === 'boundary') {
    s.style.borderColor = color;
  } else if (kind === 'line') {
    s.style.background = color;
  } else {
    s.style.background = legendFill(color, layerCfg.opacity);
    s.style.borderColor = color;
  }
  return s;
}

function buildLegendEntries(layerCfg) {
  if (layerCfg.isBoundary) return null;
  let entries = null;
  if ((layerCfg.categoryField || layerCfg.kind === 'raster') && layerCfg.categories && layerCfg.categories.length > 0) {
    entries = layerCfg.categories.map((c) => ({ label: c.value === 'NULL' ? '(kosong)' : c.value, color: c.color }));
  } else if (layerCfg.categoryField && layerCfg.ranges && layerCfg.ranges.length > 0) {
    entries = layerCfg.ranges.map((r) => ({ label: r.label, color: r.color }));
  }
  if (!entries) return null;
  const wrap = document.createElement('div');
  wrap.className = 'legend-entries';
  entries.forEach((en) => {
    const row = document.createElement('div');
    row.className = 'legend-entry';
    row.appendChild(makeLegendSwatch(layerCfg, en.color));
    const t = document.createElement('span');
    t.textContent = en.label;
    row.appendChild(t);
    wrap.appendChild(row);
  });
  return wrap;
}

function renderLayerTogglePanel() {
  if (CONFIG.layers.length === 0) return;
  layerTogglePanelEl.hidden = false;
  layerToggleListEl.innerHTML = '';

  CONFIG.layers.forEach((layerCfg) => {
    const gLayer = layerRefs[layerCfg.layerIndex];
    if (!gLayer) return;

    const item = document.createElement('label');
    item.className = 'layer-toggle-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = map.hasLayer(gLayer);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        map.addLayer(gLayer);
      } else {
        map.removeLayer(gLayer);
        // Kalau feature yang sedang aktif ada di layer yang disembunyikan,
        // bersihkan seleksi supaya tidak ada popup/card 'menggantung' untuk
        // feature yang sudah tidak terlihat.
        if (activeFeatureKey && Number(activeFeatureKey.split(':')[0]) === layerCfg.layerIndex) {
          activeFeatureKey = null;
          closeAllPopups();
          hideFeatureCard();
        }
      }
    });

    const label = document.createElement('span');
    label.textContent = layerCfg.name + (layerCfg.isBoundary ? ' (Boundary)' : '');

    item.appendChild(checkbox);
    item.appendChild(label);

    const group = document.createElement('div');
    group.className = 'layer-toggle-group';
    group.appendChild(item);

    if (CONFIG.showLegend !== false) {
      const legendEl = buildLegendEntries(layerCfg);
      if (legendEl) {
        legendEl.hidden = !checkbox.checked;
        checkbox.addEventListener('change', () => { legendEl.hidden = !checkbox.checked; });
        group.appendChild(legendEl);
      } else {
        item.insertBefore(makeLegendSwatch(layerCfg, layerCfg.color), label);
      }
    }
    layerToggleListEl.appendChild(group);
  });
}

// Meniru filter QGIS "$area = maximum($area, group_by:=...)": hanya 1
// feature per grup (yang luasnya paling besar) yang diberi label. Kalau
// layer tidak punya groupByField, semua feature yang bernilai dianggap
// berhak (labeling QGIS type="simple" tampil di semua feature).
function computeLabeledFeatureIndexes(layer, geojson) {
  const result = new Set();
  if (!layer.labeling) return result;

  const groupByField = layer.labeling.groupByField;
  if (!groupByField) {
    geojson.features.forEach((_, idx) => result.add(idx));
    return result;
  }

  const largestByGroup = {};
  geojson.features.forEach((feature, idx) => {
    const rawGroupValue = feature.properties ? feature.properties[groupByField] : undefined;
    const groupKey = rawGroupValue === null || rawGroupValue === undefined ? 'NULL' : String(rawGroupValue);

    let featureArea = 0;
    try {
      featureArea = turf.area(feature);
    } catch (e) {
      featureArea = 0;
    }

    const current = largestByGroup[groupKey];
    if (!current || featureArea > current.area) {
      largestByGroup[groupKey] = { index: idx, area: featureArea };
    }
  });

  Object.values(largestByGroup).forEach(({ index }) => result.add(index));
  return result;
}

function loadRasterLayer(layer) {
  if (!map.getPane('rasterPane')) { map.createPane('rasterPane').style.zIndex = '250'; }
  const rb = layer.rasterBounds;
  const bounds = L.latLngBounds([rb[0], rb[1]], [rb[2], rb[3]]);
  const tl = L.tileLayer(layer.tileUrl, {
    pane: 'rasterPane',
    bounds: bounds,
    minNativeZoom: layer.minNativeZoom,
    maxNativeZoom: layer.maxNativeZoom,
    minZoom: CONFIG.minZoom,
    maxZoom: CONFIG.maxZoom,
    opacity: layer.opacity == null ? 1 : layer.opacity,
    className: layer.pixelated ? 'raster-pixelated' : '',
  }).addTo(map);
  layerRefs[layer.layerIndex] = tl;
  if (layer.isFocus) {
    map.fitBounds(bounds);
    boundaryFitted = true;
  } else if (!boundaryFitted) {
    map.fitBounds(bounds);
  }
  return Promise.resolve();
}

function loadLayer(layer) {
  if (layer.kind === 'raster') return loadRasterLayer(layer);
  return fetch(layer.file)
    .then((res) => res.json())
    .then((geojson) => {
      layerGeojsonData[layer.layerIndex] = geojson;

      const classified = !layer.isBoundary && !!layer.categoryField &&
        ((layer.categories && layer.categories.length > 0) || (layer.ranges && layer.ranges.length > 0));
      const styleFn = (feature) => classified ? ({
        color: '#1f2937',
        weight: 0.8,
        fillColor: resolveFeatureColor(layer, feature),
        fillOpacity: layer.opacity,
      }) : ({
        color: resolveFeatureColor(layer, feature),
        weight: layer.isBoundary ? 2 : 1.5,
        fillOpacity: layer.isBoundary ? 0 : layer.opacity,
      });
      layerStyleFns[layer.layerIndex] = styleFn;

      const labeledFeatureIndexes = computeLabeledFeatureIndexes(layer, geojson);

      const gLayer = L.geoJSON(geojson, {
        style: styleFn,
        pointToLayer: (feature, latlng) =>
          L.circleMarker(latlng, {
            radius: layer.pointSize || 5,
            color: resolveFeatureColor(layer, feature),
            fillOpacity: layer.opacity,
          }),
        onEachFeature: (feature, layerInstance) => {
          const featureIndex = geojson.features.indexOf(feature);
          const properties = feature.properties || null;


          if (!layer.isBoundary && featureIndex !== -1) {
            featureLayerRefs[layer.layerIndex + ':' + featureIndex] = layerInstance;
          }

          if (layer.labeling && featureIndex !== -1 && labeledFeatureIndexes.has(featureIndex)) {
            const labelValue = properties ? properties[layer.labeling.field] : undefined;
            const labelText = labelValue === null || labelValue === undefined ? '' : String(labelValue);
            if (labelText) {
              layerInstance.bindTooltip(escapeHtml(labelText), {
                permanent: true,
                direction: 'center',
                className: 'layer-feature-label',
              });
              layerInstance.once('tooltipopen', (e) => {
                const savedPos = CONFIG.labelPositions && CONFIG.labelPositions[layer.layerIndex + ':' + featureIndex];
                if (savedPos) e.tooltip.setLatLng(L.latLng(savedPos[0], savedPos[1]));
                const tooltipEl = e.tooltip.getElement();
                if (tooltipEl) {
                  tooltipEl.style.fontSize = (CONFIG.labelFontSize || 13) + 'px';
                }
              });
            }
          }
        },
      }).addTo(map);

      layerRefs[layer.layerIndex] = gLayer;

      if (layer.isFocus) {
        map.fitBounds(gLayer.getBounds());
        boundaryFitted = true;
      } else if (!boundaryFitted) {
        map.fitBounds(gLayer.getBounds());
      }
    })
    .catch((err) => console.error('Gagal memuat layer:', layer.file, err));
}

Promise.all(CONFIG.layers.map(loadLayer)).then(() => {
  // Urutan stacking final: CONFIG.layers[0] adalah layer paling atas (sesuai
  // urutan yang sudah diatur user di GIS2Web Studio / layerOrder). Sama
  // seperti applyStackingOrder di aplikasi: reverse dulu, lalu bringToFront
  // satu-satu, supaya elemen pertama di array yang menang paling atas.
  [...CONFIG.layers].reverse().forEach((layer) => {
    const gLayer = layerRefs[layer.layerIndex];
    if (gLayer && typeof gLayer.bringToFront === 'function') {
      gLayer.bringToFront();
    }
  });
  bringPointFeaturesToFront();
  if (attributeTableLayers.length > 0) {
    renderAttributeTableRows();
  }
  renderLayerTogglePanel();
});
