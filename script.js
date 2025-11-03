const urlInput = document.getElementById('urlInput');
const loadBtn = document.getElementById('loadBtn');
const restaurantInput = document.getElementById('restaurantUrlInput');
const loadRestaurantBtn = document.getElementById('loadRestaurantBtn');
const clearBtn = document.getElementById('clearBtn');
const outputContainer = document.getElementById('outputContainer');
const copyBtn = document.getElementById('copyBtn');

const PROXY_BASE = 'https://glovo-proxy.onrender.com/fetch?';
const FALLBACK_IMAGE = 'https://via.placeholder.com/50?text=?';
const ignoredUrls = [
  "https://glovo.dhmedia.io/image/customer-assets-glovo/StoreInfoCard/RatingLight.png",
  "https://glovo.dhmedia.io/image/customer-assets-glovo/StoreInfoCard/PrimeTagIcon.png",
  "https://glovo.dhmedia.io/image/customer-assets-glovo/StoreInfoCard/PromoTagIcon.png",
  "https://glovo.dhmedia.io/image/customer-assets-glovo/product_restriction/Blurredcontent01.png"
];
const fallbackUrls = [
  "https://glovo.dhmedia.io/image/customer-assets-glovo/store/productFallback.svg"
];
const AGE_RESTRICTED_URL = 'https://glovo.dhmedia.io/image/customer-assets-glovo/product_restriction/Blurredcontent04.png';

let allItems = [];
let ageConfirmed = false;

// ==================== FETCH PAGE ====================
async function fetchPage(url) {
  const resp = await fetch(PROXY_BASE + 'url=' + encodeURIComponent(url));
  if (!resp.ok) throw new Error("Proxy fetch failed");
  return await resp.text();
}

// ==================== ITEM EXTRACTION ====================
async function extractItemsFromHTML(html, categoryName = 'General') {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  let items = [];

  // Portugal/Romania items
  const romaniaPortugalItems = doc.querySelectorAll('div.product-row__content');
  if (romaniaPortugalItems.length) {
    romaniaPortugalItems.forEach(row => {
      const name = row.querySelector('[data-test-id="product-row-name__highlighter"]')?.textContent.trim() || 'Unnamed item';
      const description = row.querySelector('[data-test-id="product-row-description__highlighter"]')?.textContent.trim() || '';
      const img = row.querySelector('img.product-row__picture')?.src || 'no image found';
      let priceRaw = row.querySelector('span.pintxo-typography-body2')?.textContent.trim() || '';
      let price = priceRaw.split('(')[0].trim().replace(',', '.');
      items.push({ name, description, url: img, category: categoryName, price });
    });
  }

  // ==================== STORE ITEMS ====================
  for (const itemTile of doc.querySelectorAll('div.ItemTile_itemTile__ob2HL')) {
    const name = itemTile.querySelector('h3.ItemTile_title__aYrXE')?.textContent.trim() || "Unnamed item";
    const description = itemTile.querySelector('p.ItemTile_description__XXXX')?.textContent.trim() || "";
    let url = itemTile.querySelector('img.ItemTile_image__Qr45O')?.src || "no image found";

    // ✅ Updated price extraction (new + old)
    let priceRaw =
      itemTile.querySelector('div.ItemTile_priceContainer__b3Shd span.pintxo-typography-body2')?.textContent.trim() ||
      itemTile.querySelector('span.ItemTile_price__XXXX')?.textContent.trim() ||
      '';
    let price = priceRaw.split('(')[0].trim().replace(',', '.');

    if (url === AGE_RESTRICTED_URL && !ageConfirmed) {
      outputContainer.innerHTML = "Products needing age verification, automatically confirming age…";
      await waitForAgeConfirmation();
    }

    if (fallbackUrls.includes(url)) url = "no image found";
    items.push({ name, description, url, category: categoryName, price });
  }

  // ==================== RESTAURANT ITEMS ====================
  for (const itemRow of doc.querySelectorAll('div.ItemRow_itemRow__k4ndR')) {
    const name = itemRow.querySelector('h2.pintxo-typography-body1')?.textContent.trim() || "Unnamed item";
    const description = itemRow.querySelector('p.ItemRow_description__PfM7O')?.textContent.trim() || "";
    let url = itemRow.querySelector('div.Thumbnail_pintxo-thumbnail__OkiBe img')?.src || "no image found";
    let priceRaw = itemRow.querySelector('span.pintxo-typography-body2')?.textContent.trim() || '';
    let price = priceRaw.split('(')[0].trim().replace(',', '.');

    if (url === AGE_RESTRICTED_URL && !ageConfirmed) {
      outputContainer.innerHTML = "Products needing age verification, automatically confirming age…";
      await waitForAgeConfirmation();
    }

    if (fallbackUrls.includes(url)) url = "no image found";
    items.push({ name, description, url, category: categoryName, price });
  }

  return items;
}

// ==================== DISPLAY ITEMS ====================
function displayImageItems(items) {
  outputContainer.innerHTML = '';

  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.gap = '10px';
  container.style.width = '100%';

  const catCol = document.createElement('div');
  const nameCol = document.createElement('div');
  const urlCol = document.createElement('div');
  const descCol = document.createElement('div');
  const priceCol = document.createElement('div');

  [catCol, nameCol, urlCol, descCol, priceCol].forEach(col => {
    col.style.flex = '1';
    col.style.display = 'flex';
    col.style.flexDirection = 'column';
    col.style.gap = '4px';
    col.style.overflowWrap = 'break-word';
  });

  // Group items by category
  const grouped = {};
  items.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  // Populate columns
  for (const [category, catItems] of Object.entries(grouped)) {
    catItems.forEach((item, index) => {
      const cSpan = document.createElement('span');
      cSpan.textContent = index === 0 ? category : '';
      cSpan.style.fontFamily = 'monospace';
      catCol.appendChild(cSpan);

      const nameSpan = document.createElement('span');
      nameSpan.textContent = item.name || '';
      nameSpan.style.fontFamily = 'monospace';
      nameCol.appendChild(nameSpan);

      const urlSpan = document.createElement('span');
      urlSpan.textContent = item.url || '';
      urlSpan.style.fontFamily = 'monospace';
      urlSpan.style.userSelect = 'text';
      urlCol.appendChild(urlSpan);

      const descSpan = document.createElement('span');
      descSpan.textContent = item.description || '';
      descSpan.style.fontFamily = 'monospace';
      descSpan.style.fontStyle = item.description ? 'italic' : 'normal';
      descCol.appendChild(descSpan);

      const priceSpan = document.createElement('span');
      priceSpan.textContent = item.price || '';
      priceSpan.style.fontFamily = 'monospace';
      priceCol.appendChild(priceSpan);
    });
  }

  const addHeaderWithCopy = (col, text, colItems) => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.justifyContent = 'space-between';
    wrapper.style.alignItems = 'center';
    wrapper.style.marginBottom = '6px';

    const label = document.createElement('div');
    label.textContent = text;
    label.style.fontWeight = 'bold';
    label.style.textAlign = 'center';
    label.style.marginBottom = '8px';
    label.style.fontFamily = 'Inter, sans-serif';

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.style.padding = '4px 8px';
    copyBtn.style.fontSize = '12px';
    copyBtn.style.borderRadius = '8px';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(colItems.join('\n')).then(() => alert(`${text} copied!`));
    });

    wrapper.appendChild(label);
    wrapper.appendChild(copyBtn);
    col.prepend(wrapper);
  };

  addHeaderWithCopy(catCol, 'Category', Object.keys(grouped));
  addHeaderWithCopy(nameCol, 'Names', items.map(i => i.name || ''));
  addHeaderWithCopy(urlCol, 'URLs', items.map(i => i.url || ''));
  addHeaderWithCopy(descCol, 'Descriptions', items.map(i => i.description || ''));
  addHeaderWithCopy(priceCol, 'Price', items.map(i => i.price || ''));

  container.appendChild(catCol);
  container.appendChild(nameCol);
  container.appendChild(urlCol);
  container.appendChild(descCol);
  container.appendChild(priceCol);
  outputContainer.appendChild(container);
}

// ==================== BUTTON LOGIC ====================

// Store
loadBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  if (!url) return alert("Please paste a Glovo store URL first.");
  outputContainer.innerHTML = "Fetching store page…";

  try {
    const html = await fetchPage(url);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const categories = [];

    doc.querySelectorAll('div[data-testid^="list-item-"]').forEach(wrapper => {
      const name = wrapper.querySelector('p.pintxo-typography-body2,p.pintxo-typography-body2-emphasis')?.textContent.trim();
      const dataTestId = wrapper.getAttribute('data-testid');
      const catUrl = dataTestId ? url.split('?')[0] + '?content=' + encodeURIComponent(dataTestId) : url;
      if (name) categories.push({ name, url: catUrl });
    });

    allItems = [];

    if (categories.length) {
      for (const cat of categories) {
        const catHtml = await fetchPage(cat.url);
        const catItems = await extractItemsFromHTML(catHtml, cat.name);
        if (catItems) allItems.push(...catItems);
      }
    } else {
      allItems = await extractItemsFromHTML(html);
    }

    if (allItems.length) displayImageItems(allItems);
    else outputContainer.textContent = "No items found.";

  } catch (err) {
    outputContainer.innerHTML = "Error: " + err.message;
    console.error(err);
  }
});

// Restaurant
loadRestaurantBtn.addEventListener('click', async () => {
  const url = restaurantInput.value.trim();
  if (!url) return alert("Please paste a Glovo restaurant URL first.");
  const cleanUrl = url.split('?')[0];

  outputContainer.innerHTML = "Fetching restaurant page…";

  try {
    const html = await fetchPage(cleanUrl);
    allItems = await extractItemsFromHTML(html);
    if (allItems.length) displayImageItems(allItems);
    else outputContainer.textContent = "No items found.";
  } catch (err) {
    outputContainer.innerHTML = "Error: " + err.message;
    console.error(err);
  }
});

// Clear
clearBtn.addEventListener('click', () => {
  urlInput.value = '';
  restaurantInput.value = '';
  outputContainer.innerHTML = '';
  allItems = [];
  ageConfirmed = false;
});

// Copy button (redundant)
copyBtn.addEventListener('click', () => {
  alert('Each column now has its own Copy button 😊 Use those instead!');
});

// ==================== DARK/LIGHT MODE TOGGLE ====================
const themeToggle = document.getElementById('themeToggle');
const themeLabel = document.getElementById('themeLabel');

if (localStorage.getItem('theme') === 'light') {
  document.body.classList.add('light-mode');
  themeToggle.checked = true;
  themeLabel.textContent = 'Light Mode';
} else {
  themeLabel.textContent = 'Dark Mode';
}

themeToggle.addEventListener('change', () => {
  if (themeToggle.checked) {
    document.body.classList.add('light-mode');
    themeLabel.textContent = 'Light Mode';
    localStorage.setItem('theme', 'light');
  } else {
    document.body.classList.remove('light-mode');
    themeLabel.textContent = 'Dark Mode';
    localStorage.setItem('theme', 'dark');
  }
});
