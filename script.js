// === Original working store/restaurant 
const urlInput = document.getElementById('urlInput');
const loadBtn = document.getElementById('loadBtn');
const restaurantInput = document.getElementById('restaurantUrlInput');
const loadRestaurantBtn = document.getElementById('loadRestaurantBtn');
const clearBtn = document.getElementById('clearBtn');
const outputContainer = document.getElementById('outputContainer');
const copyBtn = document.getElementById('copyBtn');

const PROXY_BASE = 'https://glovo-proxy.onrender.com/fetch?url=';

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
    const resp = await fetch(PROXY_BASE + encodeURIComponent(url));
    if (!resp.ok) throw new Error("Proxy fetch failed");
    return await resp.text();
}



// ==================== ITEM EXTRACTION ====================
async function extractItemsFromHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    let items = [];

    // === Original extraction logic intact ===
    const romaniaPortugalItems = doc.querySelectorAll('div.product-row__content');
    if (romaniaPortugalItems.length) {
        romaniaPortugalItems.forEach(row => {
            const name = row.querySelector('[data-test-id="product-row-name__highlighter"]')?.textContent.trim() || 'Unnamed item';
            const description = row.querySelector('[data-test-id="product-row-description__highlighter"]')?.textContent.trim() || '';
            const img = row.querySelector('img.product-row__picture')?.src || 'no image found';
            const price = row.querySelector('[data-test-id="product-price-effective"]')?.textContent.trim() || '';
            items.push({ name, description, url: img, price });
        });
    }

    // Legacy store items
    for (const itemTile of doc.querySelectorAll('div.ItemTile_itemTile__ob2HL')) {
        const name = itemTile.querySelector('h3.ItemTile_title__aYrXE')?.textContent.trim() || "Unnamed item";
        const description = itemTile.querySelector('p.ItemTile_description__XXXX')?.textContent.trim() || "";
        let url = itemTile.querySelector('img.ItemTile_image__Qr45O')?.src || "no image found";

        if (url === AGE_RESTRICTED_URL && !ageConfirmed) {
            outputContainer.innerHTML = "Products needing age verification, automatically confirming age…";
            await waitForAgeConfirmation();
        }

        if (fallbackUrls.includes(url)) url = "no image found";
        items.push({ name, description, url });
    }

    // Legacy restaurant items
    for (const itemRow of doc.querySelectorAll('div.ItemRow_itemRow__k4ndR')) {
        const name = itemRow.querySelector('h2.pintxo-typography-body1')?.textContent.trim() || "Unnamed item";
        const description = itemRow.querySelector('p.ItemRow_description__PfM7O')?.textContent.trim() || "";
        let url = itemRow.querySelector('div.Thumbnail_pintxo-thumbnail__OkiBe img')?.src || "no image found";

        if (url === AGE_RESTRICTED_URL && !ageConfirmed) {
            outputContainer.innerHTML = "Products needing age verification, automatically confirming age…";
            await waitForAgeConfirmation();
        }

        if (fallbackUrls.includes(url)) url = "no image found";
        items.push({ name, description, url });
    }

    return items;
}

// ==================== DISPLAY ITEMS ====================
function displayImageItems(items) {
    outputContainer.innerHTML = '<strong>Items & Images:</strong><br><br>';
    items.forEach(item => {
        if (ignoredUrls.includes(item.url)) return;

        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.marginBottom = '8px';
        div.style.userSelect = 'none';

        const img = document.createElement('img');
        img.width = 50;
        img.height = 50;
        img.style.objectFit = 'cover';
        img.style.marginRight = '8px';
        img.src = item.url !== "no image found" ? item.url : FALLBACK_IMAGE;
        img.onerror = () => img.src = FALLBACK_IMAGE;

        const infoDiv = document.createElement('div');
        infoDiv.style.display = 'flex';
        infoDiv.style.flexDirection = 'column';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = item.name;
        nameSpan.style.fontFamily = 'monospace';
        nameSpan.style.fontWeight = 'bold';
        nameSpan.style.marginBottom = '2px';

        const descSpan = document.createElement('span');
        descSpan.textContent = item.description;
        descSpan.style.fontStyle = 'italic';
        descSpan.style.fontFamily = 'monospace';
        descSpan.style.marginBottom = '2px';

        const urlSpan = document.createElement('span');
        urlSpan.textContent = item.url;
        urlSpan.style.fontFamily = 'monospace';
        urlSpan.style.cursor = 'text';
        urlSpan.style.userSelect = 'text';

        infoDiv.appendChild(nameSpan);
        infoDiv.appendChild(descSpan);
        infoDiv.appendChild(urlSpan);

        div.appendChild(img);
        div.appendChild(infoDiv);
        outputContainer.appendChild(div);
    });
}

// ==================== BUTTON LOGIC ====================

// --- Store ---
loadBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) return alert("Please paste a Glovo store URL first.");

    outputContainer.innerHTML = "Fetching store page…";

    try {
        const html = await fetchPage(url);
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Attempt to extract categories for legacy stores
        const categories = [];
        doc.querySelectorAll('div[data-testid^="list-item-"]').forEach(wrapper => {
            const name = wrapper.querySelector('p.pintxo-typography-body2, p.pintxo-typography-body2-emphasis')?.textContent.trim();
            const dataTestId = wrapper.getAttribute('data-testid');
            const catUrl = dataTestId ? url.split('?')[0] + '?content=' + encodeURIComponent(dataTestId) : url;
            if (name) categories.push({ name, url: catUrl });
        });

        allItems = [];

        if (categories.length) {
            for (const cat of categories) {
                outputContainer.innerHTML = `Fetching images from category: ${cat.name}…`;
                try {
                    const catHtml = await fetchPage(cat.url);
                    const catItems = await extractItemsFromHTML(catHtml);
                    if (catItems) allItems.push(...catItems);
                } catch (err) { console.error(err); }
            }
        } else {
            allItems = await extractItemsFromHTML(html);
        }

        if (!allItems.length) outputContainer.innerHTML = "No items found.";
        else displayImageItems(allItems);

    } catch (err) {
        outputContainer.innerHTML = "Error: " + err.message;
        console.error(err);
    }
});

// --- Restaurant ---
loadRestaurantBtn.addEventListener('click', async () => {
    const url = restaurantInput.value.trim();
    if (!url) return alert("Please paste a Glovo restaurant URL first.");
    const cleanUrl = url.split('?')[0];

    outputContainer.innerHTML = "Fetching restaurant page…";

    try {
        const html = await fetchPage(cleanUrl);
        allItems = await extractItemsFromHTML(html);

        if (!allItems.length) outputContainer.innerHTML = "No items found.";
        else displayImageItems(allItems);

    } catch (err) {
        outputContainer.innerHTML = "Error: " + err.message;
        console.error(err);
    }
});

// --- Clear ---
clearBtn.addEventListener('click', () => {
    urlInput.value = '';
    restaurantInput.value = '';
    dishHtmlInput.value = '';
    outputContainer.innerHTML = '';
    dishImagesContainer.innerHTML = '';
    allItems = [];
    ageConfirmed = false;
});

// --- Copy URLs (Store/Restaurant) ---
copyBtn.addEventListener('click', () => {
    if (!allItems.length) return;
    const urls = allItems.map(i => i.url);
    navigator.clipboard.writeText(urls.join('\n')).then(() => alert("Copied to clipboard!"));
});

// ==================== THIRD INPUT LOGIC (Independent, ignore SVGs) ====================
const dishHtmlInput = document.getElementById('dishHtmlInput');
const dishImagesContainer = document.getElementById('dishImagesContainer');
const extractDishImagesBtn = document.getElementById('extractDishImagesBtn');

extractDishImagesBtn.addEventListener('click', () => {
    const bodyHTML = dishHtmlInput.value.trim();
    if (!bodyHTML) return alert("Please paste the body HTML first.");

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = bodyHTML;

    const imgElements = tempDiv.querySelectorAll('img');
    const imgUrls = Array.from(imgElements)
        .map(img => img.src)
        .filter(src => src && !ignoredUrls.includes(src) && !src.toLowerCase().endsWith('.svg')); // ignore SVGs

    dishImagesContainer.innerHTML = '<strong>Extracted Dish Images (no SVGs):</strong><br><br>';
    if (!imgUrls.length) {
        dishImagesContainer.textContent = 'No images found.';
        return;
    }

    imgUrls.forEach(url => {
        const entry = document.createElement('div');
        entry.classList.add('url-entry');

        const img = document.createElement('img');
        img.src = url;
        img.onerror = () => img.src = FALLBACK_IMAGE;

        const span = document.createElement('span');
        span.textContent = url;

        entry.appendChild(img);
        entry.appendChild(span);
        dishImagesContainer.appendChild(entry);
    });
});



// ==================== DARK/LIGHT MODE TOGGLE ====================
const themeToggle = document.getElementById('themeToggle');
const themeLabel = document.getElementById('themeLabel');

// Initialize theme from localStorage
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

