const LAYOUT_ROWS = [
  { line: "A", start: 1, end: 8 },
  { line: "B", start: 1, end: 6 },
  { line: "C", start: 1, end: 5 },
  { line: "D", start: 1, end: 5 },
  { line: "E", start: 1, end: 5 },
  { line: "F", start: 1, end: 3 },
  { line: "G", start: 1, end: 2 },
];

const ROW_COORDS = {
  A: { top: 3.134, left: 23.619, width: 50.687, count: 8, h: 3.831 },
  B: { top: 16.99, left: 33.236, width: 40.982, count: 6, h: 4.378 },
  C: { top: 26.194, left: 38.878, width: 35.194, count: 5, h: 4.055 },
  D: { top: 39.378, left: 38.878, width: 35.048, count: 5, h: 4.378 },
  E: { top: 48.085, left: 39.784, width: 34.142, count: 5, h: 4.229 },
  F: { top: 58.259, left: 52.529, width: 21.251, count: 3, h: 3.582 },
};

const G_COORDS = {
  G1: { top: 58.284, left: 7.015, width: 4.385, h: 6.667 },
  G2: { top: 64.95, left: 7.015, width: 4.385, h: 6.891 },
};
const LIST_ROW_BREAK = 5;

const DEFAULT_ITEMS = [];
const DEFAULT_INFO = "상세 소개 준비중";

const boothGrid = document.getElementById("boothGrid");
const boothMap = document.getElementById("boothMap");
const searchInput = document.getElementById("searchInput");
const boothModal = document.getElementById("boothModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalPrevImageBtn = document.getElementById("modalPrevImageBtn");
const modalNextImageBtn = document.getElementById("modalNextImageBtn");

const modalCode = document.getElementById("modalCode");
const modalName = document.getElementById("modalName");
const modalInfo = document.getElementById("modalInfo");
const modalCharacters = document.getElementById("modalCharacters");
const modalGallery = document.getElementById("modalGallery");
const modalGalleryImage = document.getElementById("modalGalleryImage");
const modalGalleryCounter = document.getElementById("modalGalleryCounter");
const modalLinks = document.getElementById("modalLinks");

let boothsByCode = new Map();
let allBooths = [];
let currentFilteredCodes = new Set();
let galleryImages = [];
let galleryIndex = 0;

function toCode(line, number) {
  return `${line}${number}`;
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value || "")
    .split(/[|,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBooth(raw) {
  const code = String(raw.code || "").trim().toUpperCase().replace("-", "");
  if (!code) {
    return null;
  }

  const rawImages = normalizeList(raw.images);
  const singleImage = String(raw.image || "").trim();
  const images = [...new Set([singleImage, ...rawImages].filter(Boolean))];
  const character = normalizeList(raw.character || raw.characters);

  return {
    code,
    name: String(raw.name || "미등록 부스"),
    info: String(raw.info || DEFAULT_INFO),
    character,
    images,
    links: {
      twitter: raw.links?.twitter || raw.twitter || "",
      pixiv: raw.links?.pixiv || raw.pixiv || "",
    },
  };
}

function parseCsv(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
  if (lines.length <= 1) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    return {
      code: row.code,
      name: row.name,
      info: row.info,
      character: row.character,
      image: row.image,
      images: row.images,
      twitter: row.twitter,
      pixiv: row.pixiv,
    };
  });
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuote && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuote = !inQuote;
      }
      continue;
    }

    if (char === "," && !inQuote) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

async function loadBoothData() {
  const jsonUrl = `./data/booths.json?v=${Date.now()}`;
  const csvUrl = `./data/booths.csv?v=${Date.now()}`;

  try {
    const jsonResponse = await fetch(jsonUrl);
    if (jsonResponse.ok) {
      const json = await jsonResponse.json();
      if (Array.isArray(json)) {
        return json;
      }
      if (Array.isArray(json.booths)) {
        return json.booths;
      }
    }
  } catch (error) {
    console.warn("JSON 로드 실패:", error);
  }

  try {
    const csvResponse = await fetch(csvUrl);
    if (csvResponse.ok) {
      const csvText = await csvResponse.text();
      return parseCsv(csvText);
    }
  } catch (error) {
    console.warn("CSV 로드 실패:", error);
  }

  return [];
}

function createFallbackBooth(code) {
  return {
    code,
    name: "미등록 부스",
    info: DEFAULT_INFO,
    character: [],
    images: [],
    links: {
      twitter: "",
      pixiv: "",
    },
  };
}

function fullLayoutBooths() {
  const list = [];
  LAYOUT_ROWS.forEach((row) => {
    for (let num = row.start; num <= row.end; num += 1) {
      const code = toCode(row.line, num);
      list.push(boothsByCode.get(code) || createFallbackBooth(code));
    }
  });
  return list;
}

function makeMapSlot(booth, top, left, width, height) {
  const slot = document.createElement("button");
  slot.type = "button";
  slot.className = "map-slot";
  slot.dataset.code = booth.code;
  slot.style.top = `${top}%`;
  slot.style.left = `${left}%`;
  slot.style.width = `${width}%`;
  slot.style.height = `${height}%`;
  slot.innerHTML = `<span>${booth.code}</span>`;
  slot.title = booth.name;

  if (booth.name === "미등록 부스") {
    slot.classList.add("slot-empty");
  }

  if (currentFilteredCodes.size > 0) {
    if (currentFilteredCodes.has(booth.code)) {
      slot.classList.add("slot-match");
    } else {
      slot.classList.add("slot-dim");
    }
  }

  slot.addEventListener("click", () => {
    openModal(booth);
  });

  return slot;
}

function renderMap() {
  boothMap.innerHTML = '<div class="map-reference" aria-hidden="true"></div>';

  Object.entries(ROW_COORDS).forEach(([line, coord]) => {
    for (let idx = 0; idx < coord.count; idx += 1) {
      const number = idx + 1;
      const code = `${line}${number}`;
      const booth = boothsByCode.get(code) || createFallbackBooth(code);
      const gap = coord.width / coord.count;
      const left = coord.left + idx * gap;
      const width = idx === coord.count - 1 ? coord.left + coord.width - left : gap;
      boothMap.append(makeMapSlot(booth, coord.top, left, width, coord.h));
    }
  });

  Object.entries(G_COORDS).forEach(([code, pos]) => {
    const booth = boothsByCode.get(code) || createFallbackBooth(code);
    boothMap.append(makeMapSlot(booth, pos.top, pos.left, pos.width, pos.h));
  });
}

function renderBooths(list) {
  boothGrid.innerHTML = "";

  if (list.length === 0) {
    boothGrid.innerHTML = '<p class="no-result">검색 결과가 없습니다.</p>';
    return;
  }

  const byLine = new Map();
  LAYOUT_ROWS.forEach((row) => byLine.set(row.line, []));

  list.forEach((booth) => {
    const line = booth.code.charAt(0);
    if (!byLine.has(line)) {
      byLine.set(line, []);
    }
    byLine.get(line).push(booth);
  });

  LAYOUT_ROWS.forEach((row) => {
    const booths = byLine.get(row.line) || [];
    if (booths.length === 0) {
      return;
    }

    booths.sort((a, b) => Number(a.code.slice(1)) - Number(b.code.slice(1)));

    const section = document.createElement("section");
    section.className = "line-group";

    const heading = document.createElement("h3");
    heading.className = "line-group-title";
    heading.textContent = `${row.line} 라인`;
    section.append(heading);

    const rows = document.createElement("div");
    rows.className = "line-group-rows";

    for (let i = 0; i < booths.length; i += LIST_ROW_BREAK) {
      const rowList = document.createElement("div");
      rowList.className = "line-row";

      booths.slice(i, i + LIST_ROW_BREAK).forEach((booth) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "line-booth-btn";
        item.innerHTML = `<span class="line-code">${booth.code}</span><span class="line-name">${booth.name}</span>`;
        item.addEventListener("click", () => {
          openModal(booth);
        });
        rowList.append(item);
      });

      rows.append(rowList);
    }

    section.append(rows);
    boothGrid.append(section);
  });
}

function makeLinkButton(platform, href) {
  const label = platform === "twitter" ? "트위터/X" : "픽시브";
  const faviconUrl =
    platform === "twitter"
      ? "https://www.google.com/s2/favicons?sz=64&domain_url=https://x.com"
      : "https://www.google.com/s2/favicons?sz=64&domain_url=https://www.pixiv.net";
  const anchor = document.createElement("a");
  anchor.className = "social-link";
  anchor.href = href;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";

  const icon = document.createElement("img");
  icon.className = "social-icon";
  icon.src = faviconUrl;
  icon.alt = `${label} 아이콘`;
  icon.width = 18;
  icon.height = 18;

  const text = document.createElement("span");
  text.textContent = label;

  anchor.append(icon, text);
  return anchor;
}

function openModal(booth) {
  modalCode.textContent = booth.code;
  modalName.textContent = booth.name;
  modalInfo.textContent = booth.info;

  modalCharacters.innerHTML = "";
  if (booth.character.length > 0) {
    booth.character.forEach((name) => {
      const chip = document.createElement("span");
      chip.className = "character-chip";
      chip.textContent = name;
      modalCharacters.append(chip);
    });
  }

  galleryImages = booth.images;
  galleryIndex = 0;
  if (galleryImages.length > 0) {
    modalGallery.hidden = false;
    modalGallery.style.display = "grid";
    modalGallery.classList.toggle("single-image", galleryImages.length === 1);
    modalGalleryCounter.hidden = galleryImages.length <= 1;
    modalGalleryCounter.style.display = galleryImages.length <= 1 ? "none" : "block";
    renderGallery();
  } else {
    modalGallery.hidden = true;
    modalGallery.style.display = "none";
    modalGallery.classList.remove("single-image");
    modalGalleryCounter.hidden = true;
    modalGalleryCounter.style.display = "none";
    modalPrevImageBtn.hidden = true;
    modalNextImageBtn.hidden = true;
    modalPrevImageBtn.style.display = "none";
    modalNextImageBtn.style.display = "none";
  }

  modalLinks.innerHTML = "";
  if (booth.links.twitter) {
    modalLinks.append(makeLinkButton("twitter", booth.links.twitter));
  }
  if (booth.links.pixiv) {
    modalLinks.append(makeLinkButton("pixiv", booth.links.pixiv));
  }

  if (!booth.links.twitter && !booth.links.pixiv) {
    const p = document.createElement("p");
    p.className = "modal-no-links";
    p.textContent = "SNS 링크 미등록";
    modalLinks.append(p);
  }

  boothModal.showModal();
}

function renderGallery() {
  if (galleryImages.length === 0) {
    return;
  }
  modalGalleryImage.src = galleryImages[galleryIndex];
  modalGalleryImage.alt = `${modalCode.textContent} ${modalName.textContent} 인포 이미지 ${galleryIndex + 1}`;
  modalGalleryCounter.textContent = `${galleryIndex + 1} / ${galleryImages.length}`;
  const usePager = galleryImages.length > 1;
  modalPrevImageBtn.hidden = !usePager;
  modalNextImageBtn.hidden = !usePager;
  modalPrevImageBtn.style.display = usePager ? "inline-flex" : "none";
  modalNextImageBtn.style.display = usePager ? "inline-flex" : "none";
  modalPrevImageBtn.disabled = !usePager || galleryIndex === 0;
  modalNextImageBtn.disabled = !usePager || galleryIndex === galleryImages.length - 1;
}

function closeModal() {
  boothModal.close();
}

function filterBooths(keyword) {
  const normalized = keyword.trim().toLowerCase();
  currentFilteredCodes = new Set();

  if (!normalized) {
    renderBooths(allBooths);
    renderMap();
    return;
  }

  const filtered = allBooths.filter((booth) => {
    const flatText = [
      booth.code,
      booth.name,
      booth.info,
      ...booth.character,
      booth.links.twitter,
      booth.links.pixiv,
    ]
      .join(" ")
      .toLowerCase();
    const matched = flatText.includes(normalized);
    if (matched) {
      currentFilteredCodes.add(booth.code);
    }
    return matched;
  });

  renderBooths(filtered);
  renderMap();
}

async function init() {
  const loaded = await loadBoothData();
  const normalized = loaded.map(normalizeBooth).filter(Boolean);

  boothsByCode = new Map(normalized.map((booth) => [booth.code, booth]));
  allBooths = fullLayoutBooths();

  renderBooths(allBooths);
  renderMap();
}

closeModalBtn.addEventListener("click", closeModal);
modalPrevImageBtn.addEventListener("click", () => {
  if (galleryIndex > 0) {
    galleryIndex -= 1;
    renderGallery();
  }
});
modalNextImageBtn.addEventListener("click", () => {
  if (galleryIndex < galleryImages.length - 1) {
    galleryIndex += 1;
    renderGallery();
  }
});
boothModal.addEventListener("click", (event) => {
  const rect = boothModal.getBoundingClientRect();
  const clickedOutside =
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom;

  if (clickedOutside) {
    closeModal();
  }
});

searchInput.addEventListener("input", (event) => {
  filterBooths(event.target.value);
});

init();
