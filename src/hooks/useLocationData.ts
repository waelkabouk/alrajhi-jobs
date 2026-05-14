import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";

export interface LocalizedName {
  en: string;
  ar: string;
}

export interface CityData {
  id: string;
  name: LocalizedName;
}

export interface CountryData {
  name: LocalizedName;
  cities: CityData[];
}

export interface CountriesIndex {
  [code: string]: LocalizedName;
}

export function useLocationData(selectedCountryCode?: string | null) {
  const { i18n } = useTranslation();
  const lang = i18n.language === "ar" ? "ar" : "en";

  const [index, setIndex] = useState<CountriesIndex | null>(null);
  const [loadingIndex, setLoadingIndex] = useState(true);

  const [citiesCache, setCitiesCache] = useState<{ [code: string]: CityData[] }>({});
  // Ref mirror of citiesCache so loadCountryCities doesn't re-create on every cache update
  const citiesCacheRef = useRef<{ [code: string]: CityData[] }>({});
  const [loadingCities, setLoadingCities] = useState(false);

  // Load master index once
  useEffect(() => {
    fetch("/data/locations/index.json")
      .then((res) => res.json())
      .then((data) => {
        setIndex(data);
        setLoadingIndex(false);
      })
      .catch((err) => {
        console.error("Failed to load locations index", err);
        setLoadingIndex(false);
      });
  }, []);

  // Stable loader — uses ref so the function identity never changes
  const loadCountryCities = useCallback((countryCode: string) => {
    if (!countryCode || countryCode === "OTHER") return;
    if (citiesCacheRef.current[countryCode]) return; // already loaded

    setLoadingCities(true);
    fetch(`/data/locations/${countryCode}.json`)
      .then((res) => res.json())
      .then((data: CountryData) => {
        citiesCacheRef.current = { ...citiesCacheRef.current, [countryCode]: data.cities };
        setCitiesCache({ ...citiesCacheRef.current });
        setLoadingCities(false);
      })
      .catch((err) => {
        console.error(`Failed to load cities for ${countryCode}`, err);
        setLoadingCities(false);
      });
  }, []); // stable — no external deps

  // Auto-load when selectedCountryCode prop changes
  useEffect(() => {
    if (!selectedCountryCode || selectedCountryCode === "OTHER") {
      if (selectedCountryCode === "OTHER") {
        const entry = { "OTHER": [{ id: "OTHER-CITY", name: { en: "Other", ar: "أخرى" } }] };
        citiesCacheRef.current = { ...citiesCacheRef.current, ...entry };
        setCitiesCache((prev) => ({ ...prev, ...entry }));
      }
      return;
    }
    loadCountryCities(selectedCountryCode);
  }, [selectedCountryCode, loadCountryCities]);

  const getCountries = useCallback(() => {
    if (!index) return [];
    return Object.entries(index)
      .map(([code, nameData]) => ({ code, name: nameData[lang] || nameData.en }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [index, lang]);

  const getCitiesForCountry = useCallback((countryCode: string) => {
    if (!citiesCache[countryCode]) return [];
    return citiesCache[countryCode]
      .map((city) => ({ id: city.id, name: city.name[lang] || city.name.en }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [citiesCache, lang]);

  const getCountryName = useCallback((countryCode: string) => {
    if (!index || !index[countryCode]) return countryCode;
    return index[countryCode][lang] || index[countryCode].en;
  }, [index, lang]);

  const getCityName = useCallback((countryCode: string, cityId: string) => {
    const cached = citiesCacheRef.current[countryCode];
    if (!cached) return cityId;
    const city = cached.find((c) => c.id === cityId);
    return city ? city.name[lang] || city.name.en : cityId;
  }, [lang]);

  return {
    loading: loadingIndex || loadingCities,
    getCountries,
    getCitiesForCountry,
    getCountryName,
    getCityName,
    loadCountryCities,
    indexLoaded: !!index,
  };
}
