import type { Amenity, Cuisine, HotelType, L10n, Lang, PlaceCategory, RegionId } from './types.js';

/** Togo's five administrative regions with their main tourist towns. */
export const REGIONS: { id: RegionId; name: L10n; cities: string[] }[] = [
  {
    id: 'maritime',
    name: { en: 'Maritime', fr: 'Maritime' },
    cities: ['Lomé', 'Aného', 'Togoville', 'Agbodrafo', 'Tsévié'],
  },
  {
    id: 'plateaux',
    name: { en: 'Plateaux', fr: 'Plateaux' },
    cities: ['Kpalimé', 'Atakpamé', 'Badou', 'Notsé'],
  },
  { id: 'centrale', name: { en: 'Central', fr: 'Centrale' }, cities: ['Sokodé', 'Tchamba', 'Sotouboua', 'Blitta'] },
  { id: 'kara', name: { en: 'Kara', fr: 'Kara' }, cities: ['Kara', 'Kandé', 'Niamtougou', 'Bassar', 'Bafilo'] },
  { id: 'savanes', name: { en: 'Savanes', fr: 'Savanes' }, cities: ['Dapaong', 'Mango'] },
];

export const CITY_TO_REGION: Record<string, RegionId> = Object.fromEntries(
  REGIONS.flatMap((r) => r.cities.map((c) => [c, r.id])),
);

export const CATEGORY_LABELS: Record<PlaceCategory, L10n> = {
  nature: { en: 'Nature', fr: 'Nature' },
  culture: { en: 'Culture', fr: 'Culture' },
  historical: { en: 'Historical', fr: 'Histoire' },
  beach: { en: 'Beach', fr: 'Plage' },
  city: { en: 'City', fr: 'Ville' },
  adventure: { en: 'Adventure', fr: 'Aventure' },
};

export const CUISINE_LABELS: Record<Cuisine, L10n> = {
  local: { en: 'Togolese', fr: 'Togolaise' },
  african: { en: 'African', fr: 'Africaine' },
  continental: { en: 'Continental', fr: 'Continentale' },
  fast_food: { en: 'Fast food', fr: 'Restauration rapide' },
  seafood: { en: 'Seafood', fr: 'Fruits de mer' },
  cafe: { en: 'Café', fr: 'Café' },
};

export const HOTEL_TYPE_LABELS: Record<HotelType, L10n> = {
  hotel: { en: 'Hotel', fr: 'Hôtel' },
  lodge: { en: 'Lodge', fr: 'Lodge' },
  guesthouse: { en: 'Guest house', fr: "Maison d'hôtes" },
  resort: { en: 'Resort', fr: 'Complexe hôtelier' },
};

export const AMENITY_LABELS: Record<Amenity, L10n> = {
  wifi: { en: 'Wi-Fi', fr: 'Wi-Fi' },
  pool: { en: 'Swimming pool', fr: 'Piscine' },
  parking: { en: 'Parking', fr: 'Parking' },
  restaurant: { en: 'Restaurant', fr: 'Restaurant' },
  bar: { en: 'Bar', fr: 'Bar' },
  air_conditioning: { en: 'Air conditioning', fr: 'Climatisation' },
  gym: { en: 'Gym', fr: 'Salle de sport' },
  spa: { en: 'Spa', fr: 'Spa' },
  airport_shuttle: { en: 'Airport shuttle', fr: 'Navette aéroport' },
  beach_access: { en: 'Beach access', fr: 'Accès plage' },
  breakfast: { en: 'Breakfast included', fr: 'Petit-déjeuner inclus' },
  conference_room: { en: 'Conference room', fr: 'Salle de conférence' },
};

export const pick = (l: L10n | undefined, lang: Lang): string => (l ? l[lang] || l.en : '');

export const labelList = <K extends string>(labels: Record<K, L10n>, lang: Lang) =>
  (Object.keys(labels) as K[]).map((id) => ({ id, label: labels[id][lang] }));
