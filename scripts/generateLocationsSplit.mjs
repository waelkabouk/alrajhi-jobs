import fs from 'fs';
import path from 'path';
import { Country, State } from 'country-state-city';

const SAUDI_PROVINCES_AR = {
  "Riyadh Province": "منطقة الرياض",
  "Makkah Province": "منطقة مكة المكرمة",
  "Al Madinah Province": "منطقة المدينة المنورة",
  "Eastern Province": "المنطقة الشرقية",
  "Al-Qassim Province": "منطقة القصيم",
  "Aseer Province": "منطقة عسير",
  "Tabuk Province": "منطقة تبوك",
  "Hail Province": "منطقة حائل",
  "Northern Borders Province": "منطقة الحدود الشمالية",
  "Jazan Province": "منطقة جازان",
  "Najran Province": "منطقة نجران",
  "Al Bahah Province": "منطقة الباحة",
  "Al Jawf Province": "منطقة الجوف"
};

const COMMON_ARABIC_PROVINCES = {
  "SA": SAUDI_PROVINCES_AR
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchGoogleTranslate(texts) {
  try {
    const q = encodeURIComponent(texts.join('\n'));
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=' + q;
    const res = await fetch(url);
    const data = await res.json();
    
    // Google returns an array of chunks: [[["كاليفورنيا\n", "California\n", null, null, 1]], ...]
    const translatedText = data[0].map(item => item[0]).join('');
    return translatedText.split('\n').map(s => s.trim());
  } catch (err) {
    console.error("Translate API error:", err.message);
    return [];
  }
}

async function chunkAndTranslate(statesList, countryCode) {
  // Translate 40 titles per request
  const chunkSize = 40;
  let translatedStates = [];

  for (let i = 0; i < statesList.length; i += chunkSize) {
    const chunk = statesList.slice(i, i + chunkSize);
    
    const chunkWithOverrides = chunk.map(stateObj => {
      const stateName = stateObj.name;
      if (COMMON_ARABIC_PROVINCES[countryCode] && COMMON_ARABIC_PROVINCES[countryCode][stateName]) {
        return { stateName, stateCode: stateObj.isoCode, ar: COMMON_ARABIC_PROVINCES[countryCode][stateName], needsApi: false };
      }
      return { stateName, stateCode: stateObj.isoCode, ar: "", needsApi: true };
    });

    const toTranslate = chunkWithOverrides.filter(s => s.needsApi).map(s => s.stateName);
    let apiTranslations = [];

    if (toTranslate.length > 0) {
      apiTranslations = await fetchGoogleTranslate(toTranslate);
    }

    // Merge back
    let translationIndex = 0;
    for (const item of chunkWithOverrides) {
      if (item.needsApi) {
        // Fallback to English if translation failed
        item.ar = apiTranslations[translationIndex] || item.stateName;
        translationIndex++;
      }
      translatedStates.push({
        id: `${countryCode}-${item.stateCode}`,
        name: {
          en: item.stateName,
          ar: item.ar
        }
      });
    }

    if (toTranslate.length > 0) {
      // 1-second delay
      await delay(1000); 
    }
  }

  return translatedStates;
}

async function generate() {
  const outputDir = path.resolve('public/data/locations');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("Fetching countries and provinces data...");
  const countries = Country.getAllCountries();
  
  const regionNamesInArabic = new Intl.DisplayNames(['ar'], { type: 'region' });
  const regionNamesInEnglish = new Intl.DisplayNames(['en'], { type: 'region' });

  const indexDb = {};

  for (const country of countries) {
    const code = country.isoCode;
    if (!code) continue;

    let arName, enName;
    try {
      arName = regionNamesInArabic.of(code);
      enName = regionNamesInEnglish.of(code) || country.name;
    } catch (e) {
      arName = country.name;
      enName = country.name;
    }

    // Populate index
    indexDb[code] = { en: enName, ar: arName };

    const filePath = path.join(outputDir, `${code}.json`);
    
    // Skip if already generated (allows resuming)
    if (fs.existsSync(filePath)) {
      console.log(`Skipping ${code} (${enName}), already exists.`);
      continue;
    }

    const states = State.getStatesOfCountry(code);
    
    // If no states exist, we add a fallback "Other/Unknown"
    if (!states || states.length === 0) {
       const fallbackData = {
         name: { en: enName, ar: arName },
         cities: [{ id: `${code}-OTHER`, name: { en: "Other", ar: "أخرى" } }]
       };
       fs.writeFileSync(filePath, JSON.stringify(fallbackData));
       console.log(`Saved ${code} (No provinces, added fallback)`);
       continue;
    }

    console.log(`Translating provinces for ${code} (${enName}) - ${states.length} provinces...`);
    const translatedStates = await chunkAndTranslate(states, code);

    // Save country-specific file (we keep the internal JSON key as 'cities' to avoid breaking frontend hooks)
    const countryData = {
      name: { en: enName, ar: arName },
      cities: translatedStates
    };

    fs.writeFileSync(filePath, JSON.stringify(countryData));
  }

  // Add OTHER fallback to index
  indexDb['OTHER'] = { en: "Other", ar: "أخرى" };
  const otherPath = path.join(outputDir, 'OTHER.json');
  if (!fs.existsSync(otherPath)) {
    fs.writeFileSync(otherPath, JSON.stringify({
      name: { en: "Other", ar: "أخرى" },
      cities: [{ id: "OTHER-CITY", name: { en: "Other", ar: "أخرى" } }]
    }));
  }

  // Write index.json
  fs.writeFileSync(path.join(outputDir, 'index.json'), JSON.stringify(indexDb));
  console.log("Finished generating all locations!");
}

generate().catch(console.error);
