'use strict';

// ===== CLO FILE FORMAT DEFINITIONS =====
const CLO_FORMATS = {
  zprj: { name: 'CLO 项目文件', icon: '🧵', color: '#e53e3e', desc: 'CLO 3D 项目主文件，包含服装设计数据、版型、面料配置等完整项目信息', category: 'Project' },
  zpac: { name: '服装数据包', icon: '📦', color: '#dd6b20', desc: 'CLO 服装数据包，包含成衣的完整数据，可导入其他项目使用', category: 'Package' },
  zfab: { name: '面料定义文件', icon: '🧶', color: '#d69e2e', desc: '面料材质定义，包含纹理、物理属性、光泽度、透明度等面料特性', category: 'Material' },
  trm:  { name: '贴图/饰边文件', icon: '🎨', color: '#38a169', desc: '贴图或饰边细节定义，包含图案、颜色、纹理映射等视觉信息', category: 'Texture' },
  btn:  { name: '纽扣文件', icon: '🔘', color: '#3182ce', desc: '纽扣设计文件，包含纽扣的3D模型、材质、尺寸和外观参数', category: 'Hardware' },
  bth:  { name: '纽扣配件文件', icon: '⚙️', color: '#3182ce', desc: '纽扣配件批次文件，用于批量管理同类型纽扣的设计变体', category: 'Hardware' },
  pos:  { name: '位置数据文件', icon: '📍', color: '#805ad5', desc: '服装部件位置坐标数据，记录各裁片、部件在3D空间中的定位信息', category: 'Data' },
  hpos: { name: '热压位置文件', icon: '🔥', color: '#d53f8c', desc: '热压/烫印位置数据文件，记录图案、转印、烫钻等工艺的位置和参数', category: 'Data' },
  mtn:  { name: '动画文件', icon: '🎬', color: '#00b5d8', desc: '服装动画/动作文件，包含走秀动画、人物动作、自然垂坠等动态效果', category: 'Animation' },
  zacs: { name: 'ACES 色谱文件', icon: '🌈', color: '#ed8936', desc: 'ACES 色彩配置文件，包含品牌的专用色卡、色号和色彩管理方案', category: 'Color' },
  zse:  { name: '场景环境文件', icon: '🏞️', color: '#718096', desc: '3D 渲染场景环境文件，包含光照、背景、相机设置、渲染参数等', category: 'Scene' },
};

const CLO_CATEGORY_COLORS = {
  Project: '#e53e3e',
  Package: '#dd6b20',
  Material: '#d69e2e',
  Texture: '#38a169',
  Hardware: '#3182ce',
  Data: '#805ad5',
  Animation: '#00b5d8',
  Color: '#ed8936',
  Scene: '#718096',
};

// ===== CLO FILE UPLOAD & DISPLAY =====
function uploadCloFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const validExts = Object.keys(CLO_FORMATS);
  const ext = file.name.split('.').pop().toLowerCase();
  if (!validExts.includes(ext)) {
    showToast(`不支持的文件格式 "${ext}"，支持的格式：${validExts.join(', ')}`, 'error');
    e.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const buffer = ev.target.result;
      const parsed = parseCloFile(buffer, file.name, file.type);

      if (!parsed) {
        showToast('无法解析此 CLO 文件', 'error');
        return;
      }

      currentCloFile = parsed;
      document.getElementById('cloFileName').textContent = parsed.fileName;
      document.getElementById('cloFileIcon').textContent = parsed.icon;
      document.getElementById('cloFileMeta').textContent = `${parsed.formatName} · ${parsed.sizeFormatted}`;

      // Build meta grid
      const grid = document.getElementById('cloMetaGrid');
      const items = [];
      if (parsed.garmentName) items.push({ label: '名称', value: parsed.garmentName });
      if (parsed.version) items.push({ label: '版本', value: 'v' + parsed.version });
      if (parsed.category) items.push({ label: '类型', value: parsed.category });
      if (parsed.garmentType) items.push({ label: '款式', value: capitalizeFirst(parsed.garmentType) });
      if (parsed.season) items.push({ label: '系列', value: parsed.season });
      if (parsed.brand) items.push({ label: '品牌', value: parsed.brand });
      if (parsed.sizeFormatted) items.push({ label: '大小', value: parsed.sizeFormatted });
      if (parsed.fabricCount > 0) items.push({ label: '面料数', value: parsed.fabricCount });

      grid.innerHTML = items.map(item => `
        <div class="clo-meta-item">
          <span class="clo-meta-label">${item.label}</span>
          <span class="clo-meta-value">${escapeHtml(item.value)}</span>
        </div>
      `).join('');

      document.getElementById('cloFileInfo').style.display = '';
      document.getElementById('cloUploadArea').style.display = 'none';
      showToast(`${parsed.icon} ${parsed.formatName} 已加载`);
    } catch (err) {
      console.error('CLO parse error:', err);
      showToast('文件读取失败', 'error');
    }
  };

  reader.onerror = () => showToast('文件读取失败', 'error');
  reader.readAsArrayBuffer(file);
  e.target.value = '';
}

function removeCloFile() {
  currentCloFile = null;
  document.getElementById('cloFileInfo').style.display = 'none';
  document.getElementById('cloUploadArea').style.display = '';
  document.getElementById('cloFileInput').value = '';
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===== CLO FILE DISPLAY IN DETAIL =====
function renderCloDetail(cloData) {
  if (!cloData) return '';

  const metaItems = [];
  if (cloData.formatName) metaItems.push({ label: '格式', value: cloData.formatName });
  if (cloData.category) metaItems.push({ label: '类别', value: cloData.category });
  if (cloData.version) metaItems.push({ label: '版本', value: 'v' + cloData.version });
  if (cloData.garmentType) metaItems.push({ label: '款式', value: capitalizeFirst(cloData.garmentType) });
  if (cloData.season) metaItems.push({ label: '系列', value: cloData.season });
  if (cloData.brand) metaItems.push({ label: '品牌', value: cloData.brand });
  if (cloData.sizeFormatted) metaItems.push({ label: '文件大小', value: cloData.sizeFormatted });
  if (cloData.fabricCount > 0) metaItems.push({ label: '面料数', value: cloData.fabricCount });
  if (cloData.date) metaItems.push({ label: '日期', value: cloData.date });

  const metaHtml = metaItems.length > 0 ? `
    <div class="clo-detail-meta">
      ${metaItems.map(item => `
        <div class="clo-detail-item">
          <span class="clo-detail-label">${item.label}</span>
          <span class="clo-detail-value">${escapeHtml(item.value)}</span>
        </div>
      `).join('')}
    </div>
  ` : '';

  const tagsHtml = cloData.tags && cloData.tags.length > 0 ? `
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
      ${cloData.tags.map(t => `<span class="detail-tag">${escapeHtml(t)}</span>`).join('')}
    </div>
  ` : '';

  const descHtml = cloData.desc ? `
    <div class="clo-detail-desc">${escapeHtml(cloData.desc)}</div>
  ` : '';

  return `
    <div class="clo-detail-header">
      <span class="clo-detail-icon">${cloData.icon}</span>
      <div>
        <div class="clo-detail-name">${escapeHtml(cloData.garmentName || cloData.fileName)}</div>
        <span class="clo-detail-type" style="background:${cloData.color || '#667eea'}">${escapeHtml(cloData.formatName)}</span>
      </div>
    </div>
    ${metaHtml}
    ${tagsHtml}
    ${descHtml}
  `;
}
function parseCloFile(arrayBuffer, fileName, mimeType) {
  const ext = fileName.split('.').pop().toLowerCase();
  const format = CLO_FORMATS[ext];
  if (!format) return null;

  const result = {
    fileName,
    ext,
    formatName: format.name,
    icon: format.icon,
    color: format.color,
    category: format.category,
    desc: format.desc,
    size: arrayBuffer.byteLength,
    sizeFormatted: formatSize(arrayBuffer.byteLength),
    meta: {},
    rawStrings: [],
    preview: null,
    created: null,
    modified: null,
    garmentName: null,
    fabricCount: 0,
    garmentType: null,
    season: null,
    brand: null,
    tags: [],
    version: null,
  };

  // Try to read as text (most CLO files contain readable strings)
  try {
    const uint8 = new Uint8Array(arrayBuffer);
    const text = readUtf8Strings(uint8);
    result.rawStrings = text;

    // Extract metadata patterns
    extractMeta(result, text, ext);
  } catch (e) {
    // Binary file - still show basic info
  }

  // Try to extract preview/thumbnail if exists
  try {
    const uint8 = new Uint8Array(arrayBuffer);
    result.preview = extractThumbnail(uint8, ext);
  } catch (e) {
    // No thumbnail
  }

  return result;
}

function readUtf8Strings(uint8) {
  const chunks = [];
  let current = '';
  let minChunk = 4;

  for (let i = 0; i < uint8.length; i++) {
    const byte = uint8[i];
    if (byte >= 32 && byte <= 126) {
      current += String.fromCharCode(byte);
    } else if (current.length >= minChunk) {
      chunks.push(current);
      current = '';
    } else {
      current = '';
    }
  }
  if (current.length >= minChunk) chunks.push(current);

  // Deduplicate
  return [...new Set(chunks)];
}

function extractMeta(result, textArray, ext) {
  // Common patterns across CLO formats
  const patterns = [
    // Garment/Project name patterns
    { key: 'garmentName', patterns: [/garment[:\s]*(.{2,40})/gi, /project[:\s]*(.{2,40})/gi, /name[:\s]*["']?([\w\u4e00-\u9fa5\s\-_]{2,40})/gi], priority: 1 },
    // Version
    { key: 'version', patterns: [/version[:\s]*([\d.]+)/gi, /clo[\s_-]?v?([\d.]+)/gi], priority: 2 },
    // Brand
    { key: 'brand', patterns: [/brand[:\s]*(.{2,30})/gi, /designer[:\s]*(.{2,30})/gi], priority: 3 },
    // Season
    { key: 'season', patterns: [/season[:\s]*(.{2,20})/gi, /collection[:\s]*(.{2,30})/gi], priority: 3 },
    // Garment type
    { key: 'garmentType', patterns: [/type[:\s]*(jacket|dress|pants|shirt|coat|suit| blouse|top|skirt|vest|sweater|hoodie|jean)/gi], priority: 3 },
    // File count / fabric count
    { key: 'fabricCount', patterns: [/fabric[:\s]*(\d+)/gi, /material[:\s]*(\d+)/gi], priority: 4, parseInt: true },
    // Date patterns
    { key: 'date', patterns: [/(\d{4}[-/]\d{2}[-/]\d{2})/g, /(\d{2}[-/]\d{2}[-/]\d{4})/g], priority: 4 },
    // Units
    { key: 'units', patterns: [/units[:\s]*(cm|mm|inch|in)/gi], priority: 5 },
  ];

  const allText = textArray.join('\n');

  for (const p of patterns) {
    for (const re of p.patterns) {
      const match = re.exec(allText);
      if (match) {
        let val = match[1].trim();
        if (p.parseInt) val = parseInt(val) || val;
        if (result[p.key] === null && val) {
          result[p.key] = val;
          result.meta[p.key] = val;
        }
        break;
      }
    }
  }

  // Extract garment name from filename as fallback
  if (!result.garmentName) {
    const baseName = result.fileName.replace(/\.[^.]+$/, '');
    result.garmentName = baseName;
    result.meta.garmentName = baseName;
  }

  // Try to extract tags from text
  const tagKeywords = ['street', 'casual', 'formal', 'sport', 'luxury', 'minimal', 'vintage', 'modern', 'avant-garde', 'eco', 'sustainable', 'futuristic', 'classic', 'gothic', 'bohemian'];
  const foundTags = tagKeywords.filter(k => allText.toLowerCase().includes(k));
  if (foundTags.length > 0) {
    result.tags = foundTags.map(t => t.charAt(0).toUpperCase() + t.slice(1));
    result.meta.tags = result.tags;
  }
}

function extractThumbnail(uint8, ext) {
  // Most CLO files don't have embedded thumbnails in the raw file
  // But we can return a visual placeholder based on format
  return null;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Current CLO file being edited
let currentCloFile = null;

// ===== STATE =====
let state = {
  profile: null,
  works: [],
  currentFilter: 'all',
  viewMode: 'grid',
  editMode: false,
  editingWorkId: null,
  deleteWorkId: null,
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderAll();
  setupScrollNav();
  setupNavLinks();
});

// ===== STORAGE =====
const STORAGE_KEY = 'portfolio_data_v3';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      state.profile = data.profile || getDefaultProfile();
      state.works = data.works || [];
    } else {
      state.profile = getDefaultProfile();
      state.works = getSampleWorks();
      saveData();
    }
  } catch (e) {
    state.profile = getDefaultProfile();
    state.works = [];
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      profile: state.profile,
      works: state.works,
    }));
  } catch (e) {
    showToast('存储空间不足，建议清理浏览器缓存', 'error');
  }
}

function getDefaultProfile() {
  return {
    name: 'Mix',
    bio: '时尚设计师 · 服装创意人',
    avatar: '',
    year: '2024',
    socials: [],
  };
}

function getSampleWorks() {
  return [
    {
      id: uid(),
      title: 'GAMEWEAR 2024 春季系列',
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
      cloFile: null,
      category: 'GAMEWEAR',
      year: '2024',
      desc: '融合游戏文化与街头时尚的全新服装系列，探索虚拟与现实的边界。',
      tags: ['游戏', '街头', '运动'],
      link: '',
    },
    {
      id: uid(),
      title: 'EVERYWEAR 极简主义',
      image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80',
      cloFile: null,
      category: 'EVERYWEAR',
      year: '2024',
      desc: '为日常生活设计的极简服装系列，注重面料质感与穿着舒适度。',
      tags: ['极简', '日常', '面料'],
      link: '',
    },
    {
      id: uid(),
      title: '赛博朋克主题配饰',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80',
      cloFile: null,
      category: '配饰',
      year: '2023',
      desc: '未来感配饰设计系列，运用金属与霓虹元素打造赛博朋克美学。',
      tags: ['赛博朋克', '配饰', '金属'],
      link: '',
    },
    {
      id: uid(),
      title: 'Urban Explorer 系列',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80',
      cloFile: null,
      category: 'GAMEWEAR',
      year: '2023',
      desc: '专为城市探索者设计的机能服装，兼顾时尚与实用性。',
      tags: ['机能', '城市', '户外'],
      link: '',
    },
    {
      id: uid(),
      title: 'CLO 时装外套设计项目',
      image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80',
      cloFile: {
        fileName: 'Jacket_Design_2024_SS.zprj',
        ext: 'zprj', formatName: 'CLO 项目文件', icon: '🧵', color: '#e53e3e', category: 'Project',
        desc: 'CLO 3D 项目主文件，包含服装设计数据、版型、面料配置等完整项目信息',
        size: 4523000, sizeFormatted: '4.31 MB',
        garmentName: 'SS2024 Jacket Collection',
        version: '7.0', garmentType: 'jacket',
        season: 'Spring/Summer 2024', brand: 'Mix Studio',
        fabricCount: 12, meta: {},
        rawStrings: [], preview: null, created: null, modified: null, tags: ['Street', 'Casual'],
      },
      category: 'GAMEWEAR',
      year: '2024',
      desc: '2024春夏外套系列，结合运动剪裁与城市休闲风格。采用3D虚拟试穿技术优化版型。',
      tags: ['外套', '3D设计', '春夏'],
      link: '',
    },
    {
      id: uid(),
      title: '数码迷彩面料开发',
      image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&q=80',
      cloFile: {
        fileName: 'Camo_Fabric_Digital.zfab',
        ext: 'zfab', formatName: '面料定义文件', icon: '🧶', color: '#d69e2e', category: 'Material',
        desc: '面料材质定义，包含纹理、物理属性、光泽度、透明度等面料特性',
        size: 854000, sizeFormatted: '834 KB',
        garmentName: 'Digital Camouflage Fabric',
        version: '2.1', garmentType: null,
        season: null, brand: 'Mix Studio',
        fabricCount: 1, meta: {},
        rawStrings: [], preview: null, created: null, modified: null, tags: ['Eco', 'Sustainable'],
      },
      category: 'EVERYWEAR',
      year: '2024',
      desc: '自主研发的数码迷彩面料，结合可持续生产理念，适用于各类户外及日常服装。',
      tags: ['面料', '数码', '可持续'],
      link: '',
    },
  ];
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function deriveCategories(works) {
  const cats = new Set(works.map(w => w.category).filter(Boolean));
  return Array.from(cats);
}

// ===== RENDER =====
function renderAll() {
  renderProfile();
  renderStats();
  renderSocials();
  renderCategories();
  renderWorks();
  renderEmptyState();
}

function renderProfile() {
  const p = state.profile;
  document.getElementById('profileName').textContent = p.name || 'Mix';
  document.getElementById('profileBio').textContent = p.bio || '';
  document.getElementById('statYear').textContent = p.year || '2024';
  const avatarImg = document.getElementById('avatarImg');
  const avatarFallback = document.getElementById('avatarFallback');
  if (p.avatar) {
    avatarImg.src = p.avatar;
    avatarImg.style.display = '';
    avatarFallback.style.display = 'none';
  } else {
    avatarImg.style.display = 'none';
    avatarFallback.style.display = 'flex';
    avatarFallback.textContent = (p.name || 'M').charAt(0).toUpperCase();
  }
}

function renderStats() {
  const works = state.works;
  const cats = deriveCategories(works);
  document.getElementById('statProjects').textContent = works.length;
  document.getElementById('statCollections').textContent = cats.length;
}

function renderSocials() {
  const el = document.getElementById('socialLinks');
  if (!state.profile.socials || state.profile.socials.length === 0) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = state.profile.socials.map(s => {
    const name = escapeHtml(s.name || s);
    const url = escapeHtml(s.url || '#');
    return `<a href="${url}" target="_blank" rel="noopener" class="social-link">${name}</a>`;
  }).join('');
}

function renderCategories() {
  const cats = deriveCategories(state.works);
  const tabs = document.getElementById('filterTabs');
  tabs.querySelectorAll('[data-cat]:not([data-cat="all"])').forEach(el => el.remove());
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-tab' + (state.currentFilter === cat ? ' active' : '');
    btn.dataset.cat = cat;
    btn.textContent = cat;
    btn.onclick = () => filterWorks(cat);
    tabs.appendChild(btn);
  });
}

function renderWorks() {
  const grid = document.getElementById('worksGrid');
  const filtered = getFilteredWorks();
  grid.innerHTML = filtered.map(work => {
    const tags = (work.tags || []).map(t => `<span class="work-tag">${escapeHtml(t)}</span>`).join('');
    const hasClo = work.cloFile && work.cloFile.fileName;
    const cloBadge = hasClo
      ? `<span class="work-badge-clo" style="background:${work.cloFile.color || '#667eea'}">${work.cloFile.icon} ${work.cloFile.ext.toUpperCase()}</span>`
      : '';
    const imageHtml = work.image
      ? `<img class="work-thumb-img" src="${escapeHtml(work.image)}" alt="${escapeHtml(work.title)}" loading="lazy" />`
      : `<div class="work-thumb-placeholder">🎨</div>`;

    return `
      <article class="work-card" data-id="${work.id}" onclick="openDetail('${work.id}')">
        <button class="edit-btn" onclick="event.stopPropagation(); editWork('${work.id}')" title="编辑">✏️</button>
        <button class="delete-btn" onclick="event.stopPropagation(); promptDelete('${work.id}')" title="删除">🗑️</button>
        <div class="work-thumb">${imageHtml}${cloBadge ? `<div class="work-clo-badge">${cloBadge}</div>` : ''}</div>
        <div class="work-info">
          <span class="work-cat">${escapeHtml(work.category || '未分类')}</span>
          <h3 class="work-title">${escapeHtml(work.title)}</h3>
          ${work.year ? `<div class="work-year">${escapeHtml(work.year)}</div>` : ''}
          ${tags ? `<div class="work-tags">${tags}</div>` : ''}
        </div>
      </article>
    `;
  }).join('');
}

function renderEmptyState() {
  const empty = document.getElementById('emptyState');
  const grid = document.getElementById('worksGrid');
  const filtered = getFilteredWorks();
  if (filtered.length === 0) {
    empty.style.display = 'flex';
    grid.style.display = 'none';
  } else {
    empty.style.display = 'none';
    grid.style.display = '';
  }
}

function getFilteredWorks() {
  if (state.currentFilter === 'all') return [...state.works];
  return state.works.filter(w => w.category === state.currentFilter);
}

// ===== FILTER =====
function filterWorks(cat) {
  state.currentFilter = cat;
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === cat);
  });
  renderWorks();
  renderEmptyState();
}

// ===== VIEW TOGGLE =====
function setView(mode) {
  state.viewMode = mode;
  const grid = document.getElementById('worksGrid');
  grid.classList.toggle('list-view', mode === 'list');
  document.getElementById('gridViewBtn').classList.toggle('active', mode === 'grid');
  document.getElementById('listViewBtn').classList.toggle('active', mode === 'list');
}

// ===== EDIT MODE =====
function toggleEditMode() {
  state.editMode = !state.editMode;
  document.body.classList.toggle('edit-mode', state.editMode);
  document.getElementById('editModeBtn').textContent = state.editMode ? '退出编辑' : '管理作品';
  document.getElementById('editModeBtn').classList.toggle('btn-primary', state.editMode);
  document.getElementById('editModeBtn').classList.toggle('btn-outline', !state.editMode);
  document.getElementById('editToolbar').style.display = state.editMode ? '' : 'none';
  if (!state.editMode) {
    state.editingWorkId = null;
    state.deleteWorkId = null;
  }
}

// ===== WORK MODAL =====
function openAddWork() {
  state.editingWorkId = null;
  document.getElementById('workModalTitle').textContent = '添加作品';
  document.getElementById('workTitle').value = '';
  document.getElementById('workImage').value = '';
  document.getElementById('workCategory').value = '';
  document.getElementById('workYear').value = new Date().getFullYear().toString();
  document.getElementById('workDesc').value = '';
  document.getElementById('workTags').value = '';
  document.getElementById('workLink').value = '';
  document.getElementById('imagePreviewWrap').style.display = 'none';
  currentCloFile = null;
  document.getElementById('cloFileInfo').style.display = 'none';
  document.getElementById('cloUploadArea').style.display = '';
  document.getElementById('cloFileInput').value = '';
  refreshCategoryList();
  document.getElementById('workModal').style.display = '';
  document.getElementById('workTitle').focus();
}

function editWork(id) {
  const work = state.works.find(w => w.id === id);
  if (!work) return;
  state.editingWorkId = id;
  document.getElementById('workModalTitle').textContent = '编辑作品';
  document.getElementById('workTitle').value = work.title || '';
  document.getElementById('workImage').value = work.image || '';
  document.getElementById('workCategory').value = work.category || '';
  document.getElementById('workYear').value = work.year || '';
  document.getElementById('workDesc').value = work.desc || '';
  document.getElementById('workTags').value = (work.tags || []).join(', ');
  document.getElementById('workLink').value = work.link || '';
  previewImage();
  refreshCategoryList();

  // Load CLO file info
  if (work.cloFile) {
    currentCloFile = work.cloFile;
    document.getElementById('cloFileName').textContent = work.cloFile.fileName;
    document.getElementById('cloFileIcon').textContent = work.cloFile.icon;
    document.getElementById('cloFileMeta').textContent = `${work.cloFile.formatName} · ${work.cloFile.sizeFormatted}`;
    const grid = document.getElementById('cloMetaGrid');
    const items = [];
    if (work.cloFile.garmentName) items.push({ label: '名称', value: work.cloFile.garmentName });
    if (work.cloFile.version) items.push({ label: '版本', value: 'v' + work.cloFile.version });
    if (work.cloFile.category) items.push({ label: '类别', value: work.cloFile.category });
    if (work.cloFile.season) items.push({ label: '系列', value: work.cloFile.season });
    if (work.cloFile.sizeFormatted) items.push({ label: '大小', value: work.cloFile.sizeFormatted });
    grid.innerHTML = items.map(item => `
      <div class="clo-meta-item">
        <span class="clo-meta-label">${item.label}</span>
        <span class="clo-meta-value">${escapeHtml(item.value)}</span>
      </div>
    `).join('');
    document.getElementById('cloFileInfo').style.display = '';
    document.getElementById('cloUploadArea').style.display = 'none';
  } else {
    removeCloFile();
  }
  document.getElementById('workModal').style.display = '';
}

function closeWorkModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('workModal').style.display = 'none';
  state.editingWorkId = null;
}

function saveWork() {
  const title = document.getElementById('workTitle').value.trim();
  if (!title) { showToast('请输入作品名称', 'error'); return; }
  const category = document.getElementById('workCategory').value.trim() || '未分类';
  const year = document.getElementById('workYear').value.trim();
  const desc = document.getElementById('workDesc').value.trim();
  const image = document.getElementById('workImage').value.trim();
  const cloFile = currentCloFile;
  const tags = document.getElementById('workTags').value.split(',').map(t => t.trim()).filter(Boolean);
  const link = document.getElementById('workLink').value.trim();

  if (state.editingWorkId) {
    const idx = state.works.findIndex(w => w.id === state.editingWorkId);
    if (idx !== -1) {
      state.works[idx] = { ...state.works[idx], title, image, cloFile, category, year, desc, tags, link };
    }
    showToast('作品已更新', 'success');
  } else {
    state.works.unshift({ id: uid(), title, image, cloFile, category, year, desc, tags, link });
    showToast('作品已添加', 'success');
  }
  currentCloFile = null;
  removeCloFile();
  saveData();
  renderAll();
  closeWorkModal();
}

function refreshCategoryList() {
  const cats = deriveCategories(state.works);
  const datalist = document.getElementById('catList');
  datalist.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">`).join('');
}

// ===== DELETE =====
function promptDelete(id) {
  const work = state.works.find(w => w.id === id);
  if (!work) return;
  state.deleteWorkId = id;
  document.getElementById('deleteWorkTitle').textContent = work.title;
  document.getElementById('deleteConfirm').style.display = '';
}

function closeDeleteConfirm(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('deleteConfirm').style.display = 'none';
  state.deleteWorkId = null;
}

function confirmDelete() {
  if (!state.deleteWorkId) return;
  state.works = state.works.filter(w => w.id !== state.deleteWorkId);
  const cats = deriveCategories(state.works);
  if (state.currentFilter !== 'all' && !cats.includes(state.currentFilter)) {
    state.currentFilter = 'all';
  }
  saveData();
  renderAll();
  closeDeleteConfirm();
  showToast('作品已删除', 'success');
}

// ===== DETAIL MODAL =====
function openDetail(id) {
  if (state.editMode) return;
  const work = state.works.find(w => w.id === id);
  if (!work) return;

  const body = document.getElementById('detailBody');
  const tags = (work.tags || []).map(t => `<span class="detail-tag">${escapeHtml(t)}</span>`).join('');
  const hasClo = work.cloFile && work.cloFile.fileName;
  const imgHtml = work.image
    ? `<div class="detail-img-wrap"><img class="detail-img" src="${escapeHtml(work.image)}" alt="${escapeHtml(work.title)}" /></div>`
    : `<div class="detail-placeholder">${hasClo ? work.cloFile.icon : '🎨'}</div>`;
  const linkHtml = work.link
    ? `<a href="${escapeHtml(work.link)}" target="_blank" rel="noopener" class="btn btn-outline">🔗 查看原链接</a>`
    : '';

  body.innerHTML = `
    ${imgHtml}
    <div class="detail-content">
      <span class="detail-cat">${escapeHtml(work.category || '未分类')}</span>
      <h2 class="detail-title">${escapeHtml(work.title)}</h2>
      ${work.year ? `<div class="detail-meta">${escapeHtml(work.year)}</div>` : ''}
      ${work.desc ? `<p class="detail-desc">${escapeHtml(work.desc)}</p>` : ''}
      ${tags ? `<div class="detail-tags">${tags}</div>` : ''}
      <div class="detail-actions">
        ${linkHtml}
        <button class="btn btn-ghost" onclick="editWork('${work.id}'); closeDetailModal();">✏️ 编辑</button>
      </div>
    </div>
  `;

  // Show CLO file panel
  const cloPanel = document.getElementById('cloDetailPanel');
  if (hasClo) {
    cloPanel.innerHTML = renderCloDetail(work.cloFile);
    cloPanel.style.display = '';
  } else {
    cloPanel.style.display = 'none';
  }

  document.getElementById('detailModal').style.display = '';
}

function closeDetailModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('detailModal').style.display = 'none';
  document.getElementById('cloDetailPanel').style.display = 'none';
}

// ===== PROFILE EDITOR =====
function openProfileEditor() {
  const p = state.profile;
  document.getElementById('editName').value = p.name || '';
  document.getElementById('editBio').value = p.bio || '';
  document.getElementById('editAvatar').value = p.avatar || '';
  document.getElementById('editYear').value = p.year || new Date().getFullYear().toString();
  document.getElementById('editSocial').value = (p.socials || []).map(s => `${s.name || ''},${s.url || ''}`).join('\n');
  document.getElementById('profileModal').style.display = '';
}

function closeProfileModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('profileModal').style.display = 'none';
}

function saveProfile() {
  const name = document.getElementById('editName').value.trim() || 'Mix';
  const bio = document.getElementById('editBio').value.trim();
  const avatar = document.getElementById('editAvatar').value.trim();
  const year = document.getElementById('editYear').value.trim();
  const socialRaw = document.getElementById('editSocial').value.trim();
  const socials = socialRaw
    ? socialRaw.split('\n').map(line => {
        const parts = line.split(',');
        return { name: parts[0]?.trim() || '', url: parts[1]?.trim() || '' };
      }).filter(s => s.name)
    : [];
  state.profile = { name, bio, avatar, year, socials };
  saveData();
  renderAll();
  closeProfileModal();
  showToast('个人信息已更新', 'success');
}

function editAvatar() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      state.profile.avatar = ev.target.result;
      saveData();
      renderProfile();
      showToast('头像已更新', 'success');
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

// ===== IMAGE UPLOAD =====
function uploadLocalImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('请选择图片文件', 'error'); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('workImage').value = ev.target.result;
    previewImage();
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function uploadAvatarImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { document.getElementById('editAvatar').value = ev.target.result; };
  reader.readAsDataURL(file);
}

function previewImage() {
  const url = document.getElementById('workImage').value.trim();
  const wrap = document.getElementById('imagePreviewWrap');
  const img = document.getElementById('imagePreview');
  if (url) {
    img.src = url;
    img.onerror = () => { img.src = ''; wrap.style.display = 'none'; };
    img.onload = () => { wrap.style.display = ''; };
  } else {
    wrap.style.display = 'none';
  }
}

// ===== MOBILE MENU =====
function toggleMenu() {
  document.getElementById('mobileMenu').classList.toggle('open');
}

// ===== NAV =====
function setupScrollNav() {
  window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 10);
  });
}

function setupNavLinks() {
  document.querySelectorAll('.nav-link[data-section]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const section = link.dataset.section;
      if (section === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.getElementById('mobileMenu').classList.remove('open');
    });
  });
}

// ===== TOAST =====
let toastTimer;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 2800);
}

// ===== INLINE EDIT =====
function editField(fieldId) {
  if (!state.editMode) return;
  const el = document.getElementById(fieldId);
  const current = el.textContent;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = current;
  input.className = 'inline-edit-input';
  input.style.cssText = 'font:inherit;padding:2px 8px;border:1.5px solid var(--accent);border-radius:4px;outline:none;width:100%;max-width:300px;';
  el.replaceWith(input);
  input.focus();
  input.select();
  const commit = () => {
    const val = input.value.trim() || current;
    if (fieldId === 'profileName') state.profile.name = val;
    if (fieldId === 'profileBio') state.profile.bio = val;
    saveData();
    renderAll();
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { input.replaceWith(el); }
  });
}

// ===== UTILS =====
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ===== KEYBOARD =====
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeWorkModal();
    closeDetailModal();
    closeProfileModal();
    closeDeleteConfirm();
  }
});
