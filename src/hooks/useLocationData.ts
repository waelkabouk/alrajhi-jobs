import { useState, useEffect, useCallback } from "react";
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
  const [loadingCities, setLoadingCities] = useState(false);

  // Load master index
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

  // Dynamically load cities for selected country
  useEffect(() => {
    if (!selectedCountryCode || selectedCountryCode === "OTHER") {
      if (selectedCountryCode === "OTHER") {
        setCitiesCache(prev => ({ ...prev, "OTHER": [{ id: "OTHER-CITY", name: { en: "Other", ar: "أخرى" } }] }));
      }
      return;
    }
    loadCountryCities(selectedCountryCode);
  }, [selectedCountryCode]);

  const loadCountryCities = useCallback((countryCode: string) => {
    if (!countryCode || countryCode === "OTHER") return;
    if (citiesCache[countryCode]) return;

    setLoadingCities(true);
    fetch(`/data/locations/${countryCode}.json`)
      .then((res) => res.json())
      .then((data: CountryData) => {
        setCitiesCache(prev => ({
          ...prev,
          [countryCode]: data.cities
        }));
        setLoadingCities(false);
      })
      .catch((err) => {
        console.error(`Failed to load cities for ${countryCode}`, err);
        setLoadingCities(false);
      });
  }, [citiesCache]);

  const getCountries = useCallback(() => {
    if (!index) return [];
    return Object.entries(index).map(([code, nameData]) => ({
      code,
      name: nameData[lang] || nameData.en,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [index, lang]);

  const getCitiesForCountry = useCallback((countryCode: string) => {
    if (!citiesCache[countryCode]) return [];
    return citiesCache[countryCode].map((city) => ({
      id: city.id,
      name: city.name[lang] || city.name.en,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [citiesCache, lang]);

  const getCountryName = useCallback((countryCode: string) => {
    if (!index || !index[countryCode]) return countryCode;
    return index[countryCode][lang] || index[countryCode].en;
  }, [index, lang]);

  const getCityName = useCallback((countryCode: string, cityId: string) => {
    if (!citiesCache[countryCode]) return cityId;
    const city = citiesCache[countryCode].find(c => c.id === cityId);
    if (!city) return cityId;
    return city.name[lang] || city.name.en;
  }, [citiesCache, lang]);

  return {
    loading: loadingIndex || loadingCities,
    getCountries,
    getCitiesForCountry,
    getCountryName,
    getCityName,
    loadCountryCities,
    indexLoaded: !!index
  };
}
