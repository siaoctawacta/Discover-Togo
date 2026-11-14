import { CITY_TO_REGION } from '../domain/catalog.js';
import type { Amenity, Cuisine, HotelType, ListingRecord, MenuItem, PlaceCategory } from '../domain/types.js';
import { stableId } from '../lib/util.js';

/**
 * Sample dataset for Togo.
 *  - Places are real landmarks; coordinates are approximate (town-level accuracy)
 *    and opening hours / fees are indicative. Verify before publishing.
 *  - Restaurants and hotels are FICTIONAL sample businesses (names, phones,
 *    prices) used for demo purposes only.
 *  - Photos are generic stock placeholders; replace with licensed photos of
 *    each site uploaded to Cloud Storage.
 */

const img = (id: string, alt?: string) => ({
  url: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`,
  ...(alt ? { alt } : {}),
});

const IMG = {
  beach: ['1507525428034-b723cf961d3e', '1519046904884-53103b34b206', '1473116763249-2faaef81ccda'],
  forest: ['1441974231531-c6227db76b6e', '1511497584788-876760111969', '1470071459604-3b5ec3a7fe05'],
  waterfall: ['1432405972618-c60b0225b8f9', '1470071459604-3b5ec3a7fe05', '1441974231531-c6227db76b6e'],
  mountain: ['1506905925346-21bda4d32df4', '1464822759023-fed622ff2c3b', '1470071459604-3b5ec3a7fe05'],
  lake: ['1501785888041-af3ef285b470', '1439066615861-d1af74d74000', '1507525428034-b723cf961d3e'],
  savanna: ['1516426122078-c23e76319801', '1547471080-7cc2caa01a7e', '1506905925346-21bda4d32df4'],
  city: ['1477959858617-67f85cf4f1df', '1449824913935-59a10b8d2000', '1480714378408-67cf0d13bc1b'],
  culture: ['1528605248644-14dd04022da1', '1477959858617-67f85cf4f1df', '1441974231531-c6227db76b6e'],
  restaurant: ['1517248135467-4c7edcad34c4', '1414235077428-338989a2e8c0', '1555396273-367ea4eb4db5', '1559339352-11d035aa65de'],
  food: ['1504674900247-0877df9cc836', '1512058564366-18510be2db19', '1546069901-ba9599a7e63c'],
  cafe: ['1501339847302-ac426a4a7cbb', '1495474472287-4d71bcdd2085'],
  fastfood: ['1568901346375-23c9450c58cd', '1565299624946-b28f40a0ae38'],
  hotel: ['1566073771259-6a8506099945', '1542314831-068cd1dbfeeb', '1582719478250-c89cae4dc85b'],
  resort: ['1520250497591-112f2f40a3f4', '1571896349842-33c89424de2d', '1551882547-ff40c63fe5fa'],
  lodge: ['1445019980597-93fa8acb246c', '1449158743715-0a90ebb6d2d8', '1441974231531-c6227db76b6e'],
} as const;

const pics = (set: keyof typeof IMG, alt: string) => IMG[set].map((id, i) => img(id, i === 0 ? alt : undefined));

type Base = {
  slug: string;
  name: [string, string];
  description: [string, string];
  city: string;
  lat: number;
  lng: number;
  images: { url: string; alt?: string }[];
  rating: number;
  reviewCount: number;
  views: number;
  tags: string[];
  featured?: boolean;
  sponsored?: boolean;
  address?: string;
  contact?: ListingRecord['contact'];
};

const created = new Date('2026-01-15T09:00:00Z');
const SPONSORED_UNTIL = new Date('2027-12-31T23:59:59Z');

function base(b: Base, kind: ListingRecord['kind']): ListingRecord {
  const region = CITY_TO_REGION[b.city];
  if (!region) throw new Error(`Unknown city ${b.city}`);
  return {
    id: stableId(`listing:${b.slug}`),
    kind,
    slug: b.slug,
    name: { en: b.name[0], fr: b.name[1] },
    description: { en: b.description[0], fr: b.description[1] },
    region,
    city: b.city,
    ...(b.address ? { address: b.address } : {}),
    location: { lat: b.lat, lng: b.lng },
    images: b.images,
    rating: b.rating,
    reviewCount: b.reviewCount,
    tags: b.tags,
    featured: b.featured ?? false,
    sponsoredUntil: b.sponsored ? SPONSORED_UNTIL : null,
    status: 'published',
    views: b.views,
    ...(b.contact ? { contact: b.contact } : {}),
    createdAt: created,
    updatedAt: created,
  };
}

const place = (
  b: Base & { category: PlaceCategory; hours: [string, string]; fee: number | null; feeNote?: string },
): ListingRecord => ({
  ...base(b, 'place'),
  category: b.category,
  openingHours: { en: b.hours[0], fr: b.hours[1] },
  entryFee: b.fee === null ? null : { amount: b.fee, currency: 'XOF', ...(b.feeNote ? { note: b.feeNote } : {}) },
});

const restaurant = (b: Base & { cuisine: Cuisine; priceLevel: 1 | 2 | 3 | 4; menu: [string, number, string?][] }): ListingRecord => ({
  ...base(b, 'restaurant'),
  cuisine: b.cuisine,
  priceLevel: b.priceLevel,
  menu: b.menu.map(([name, price, description]): MenuItem => ({ name, price, currency: 'XOF', ...(description ? { description } : {}) })),
});

const hotel = (b: Base & { hotelType: HotelType; stars: number; amenities: Amenity[]; price: [number, number] }): ListingRecord => ({
  ...base(b, 'hotel'),
  hotelType: b.hotelType,
  stars: b.stars,
  amenities: b.amenities,
  priceRange: { min: b.price[0], max: b.price[1], currency: 'XOF' },
});

const DAILY = (o: string, c: string): [string, string] => [`Daily ${o}–${c}`, `Tous les jours ${o}–${c}`];
const ALWAYS: [string, string] = ['Open 24 hours', 'Ouvert 24h/24'];

export function buildSeedListings(): ListingRecord[] {
  return [
    /* ================================ PLACES ================================ */
    place({
      slug: 'koutammakou-land-of-the-batammariba', category: 'culture', city: 'Kandé', lat: 10.08, lng: 1.17,
      name: ['Koutammakou, Land of the Batammariba', 'Koutammakou, pays des Batammariba'],
      description: [
        'A UNESCO World Heritage cultural landscape where the Batammariba people still build their striking two-storey mud tower-houses (takienta). Hire a local guide in Nadoba to understand the architecture, rituals and daily life of one of West Africa\'s most remarkable living traditions.',
        'Paysage culturel inscrit au patrimoine mondial de l\'UNESCO où les Batammariba construisent encore leurs célèbres maisons-tours en terre (takienta). Engagez un guide local à Nadoba pour découvrir l\'architecture, les rites et la vie quotidienne de cette tradition vivante unique en Afrique de l\'Ouest.',
      ],
      images: pics('culture', 'Traditional earthen tower houses'), rating: 4.9, reviewCount: 214, views: 9800,
      tags: ['UNESCO', 'architecture', 'Tamberma', 'guided tour'], featured: true,
      hours: DAILY('08:00', '17:00'), fee: 3000, feeNote: 'Guide fee extra',
    }),
    place({
      slug: 'lake-togo-togoville', category: 'nature', city: 'Togoville', lat: 6.233, lng: 1.483,
      name: ['Lake Togo & Togoville', 'Lac Togo et Togoville'],
      description: [
        'Cross Lake Togo by traditional pirogue to Togoville, the historic town that gave the country its name. Visit the cathedral, voodoo shrines and the monument to the 1884 treaty, then relax by the lagoon with grilled fish.',
        'Traversez le lac Togo en pirogue traditionnelle jusqu\'à Togoville, la ville historique qui a donné son nom au pays. Visitez la cathédrale, les sanctuaires vodou et le monument du traité de 1884, puis détendez-vous au bord de la lagune autour d\'un poisson grillé.',
      ],
      images: pics('lake', 'Pirogue on Lake Togo'), rating: 4.7, reviewCount: 389, views: 12400,
      tags: ['lagoon', 'pirogue', 'voodoo', 'day trip'], featured: true,
      hours: DAILY('07:00', '18:00'), fee: 2000, feeNote: 'Pirogue crossing per person',
    }),
    place({
      slug: 'mount-agou', category: 'adventure', city: 'Kpalimé', lat: 6.87, lng: 0.75,
      name: ['Mount Agou', 'Mont Agou'],
      description: [
        'At 986 m, Mount Agou is Togo\'s highest peak. Hike through cocoa and coffee plantations and villages to the summit for sweeping views over the plains — on clear days all the way to Lake Volta in Ghana.',
        'Avec ses 986 m, le mont Agou est le point culminant du Togo. Randonnez à travers plantations de cacao et de café et villages jusqu\'au sommet pour une vue panoramique sur les plaines — par temps clair jusqu\'au lac Volta au Ghana.',
      ],
      images: pics('mountain', 'View from Mount Agou'), rating: 4.8, reviewCount: 276, views: 10900,
      tags: ['hiking', 'summit', 'viewpoint', 'plantations'], featured: true,
      hours: DAILY('06:00', '18:00'), fee: 1000, feeNote: 'Village contribution',
    }),
    place({
      slug: 'kpime-waterfall', category: 'nature', city: 'Kpalimé', lat: 6.95, lng: 0.63,
      name: ['Kpimé Waterfall', 'Cascade de Kpimé'],
      description: [
        'A tall ribbon of water dropping down a forested cliff near Kpalimé. Best in the rainy season (June–October); a short walk from the village leads to a natural pool at its base.',
        'Un long ruban d\'eau dévalant une falaise boisée près de Kpalimé. À voir surtout en saison des pluies (juin–octobre) ; une courte marche depuis le village mène à un bassin naturel à son pied.',
      ],
      images: pics('waterfall', 'Kpimé waterfall'), rating: 4.5, reviewCount: 158, views: 6400,
      tags: ['waterfall', 'swimming', 'rainy season'],
      hours: DAILY('08:00', '17:30'), fee: 1500,
    }),
    place({
      slug: 'womé-waterfall'.normalize('NFD').replace(/[̀-ͯ]/g, ''), category: 'nature', city: 'Kpalimé', lat: 6.89, lng: 0.62,
      name: ['Womé Waterfall', 'Cascade de Womé'],
      description: [
        'A lush jungle walk of about 20 minutes descends to the Womé falls, where you can swim beneath the cascade. Local guides explain the medicinal plants along the trail.',
        'Une marche d\'environ 20 minutes dans une végétation luxuriante descend jusqu\'à la cascade de Womé, où l\'on peut se baigner. Les guides locaux présentent les plantes médicinales du sentier.',
      ],
      images: pics('waterfall', 'Womé waterfall in the forest'), rating: 4.6, reviewCount: 131, views: 5900,
      tags: ['waterfall', 'jungle', 'swimming'],
      hours: DAILY('08:00', '17:00'), fee: 1500,
    }),
    place({
      slug: 'mount-klouto-butterfly-forest', category: 'nature', city: 'Kpalimé', lat: 6.95, lng: 0.57,
      name: ['Mount Klouto & Butterfly Forest', 'Mont Klouto et forêt aux papillons'],
      description: [
        'Misty mountain forest famed for its hundreds of butterfly species. Early-morning guided walks reveal butterflies, birds and panoramic views across the Ghana border.',
        'Forêt de montagne brumeuse réputée pour ses centaines d\'espèces de papillons. Les balades guidées tôt le matin révèlent papillons, oiseaux et vues panoramiques jusqu\'à la frontière ghanéenne.',
      ],
      images: pics('forest', 'Misty forest on Mount Klouto'), rating: 4.7, reviewCount: 197, views: 7700,
      tags: ['butterflies', 'birdwatching', 'hiking', 'forest'], featured: true,
      hours: DAILY('06:30', '17:00'), fee: 2000, feeNote: 'Guided walk',
    }),
    place({
      slug: 'akloa-waterfall', category: 'adventure', city: 'Badou', lat: 7.55, lng: 0.61,
      name: ['Akloa Waterfall', 'Cascade d\'Akloa'],
      description: [
        'A rewarding 45-minute climb through rainforest leads to Akloa\'s waterfall, which tumbles over mossy rocks into a cool pool. One of the most beautiful hikes in the Plateaux region.',
        'Une montée de 45 minutes à travers la forêt tropicale mène à la cascade d\'Akloa, qui dévale des rochers moussus dans un bassin frais. L\'une des plus belles randonnées de la région des Plateaux.',
      ],
      images: pics('waterfall', 'Akloa waterfall'), rating: 4.8, reviewCount: 142, views: 5200,
      tags: ['waterfall', 'hiking', 'rainforest'],
      hours: DAILY('07:00', '17:00'), fee: 2000,
    }),
    place({
      slug: 'lome-grand-market', category: 'city', city: 'Lomé', lat: 6.129, lng: 1.222, address: 'Rue du Grand Marché, Lomé',
      name: ['Lomé Grand Market', 'Grand Marché de Lomé'],
      description: [
        'The beating commercial heart of Lomé, famous for its "Nana Benz" — the powerful women traders of wax-print fabric. Wander the stalls for textiles, spices, beads and street food.',
        'Le cœur commercial de Lomé, célèbre pour ses « Nana Benz », puissantes commerçantes de tissus wax. Flânez entre les étals de tissus, épices, perles et cuisine de rue.',
      ],
      images: pics('city', 'Busy market street in Lomé'), rating: 4.4, reviewCount: 512, views: 15800,
      tags: ['market', 'shopping', 'wax fabric', 'Nana Benz'],
      hours: [`Mon–Sat 07:00–18:00`, `Lun–Sam 07:00–18:00`], fee: null,
    }),
    place({
      slug: 'akodessewa-fetish-market', category: 'culture', city: 'Lomé', lat: 6.137, lng: 1.257,
      name: ['Akodessewa Fetish Market', 'Marché des fétiches d\'Akodessewa'],
      description: [
        'One of the largest voodoo markets in the world, selling talismans, herbs and ritual objects. A traditional healer can explain the role of vodun in Togolese spiritual life. Ask before taking photos.',
        'L\'un des plus grands marchés vodou au monde, où l\'on trouve talismans, plantes et objets rituels. Un guérisseur traditionnel explique la place du vodou dans la vie spirituelle togolaise. Demandez avant de photographier.',
      ],
      images: pics('culture', 'Ritual objects at the market'), rating: 4.3, reviewCount: 301, views: 11200,
      tags: ['voodoo', 'vodun', 'market', 'spiritual'],
      hours: DAILY('08:00', '18:00'), fee: 3000, feeNote: 'Includes guide; camera fee extra',
    }),
    place({
      slug: 'independence-monument-lome', category: 'historical', city: 'Lomé', lat: 6.131, lng: 1.218,
      name: ['Independence Monument', 'Monument de l\'Indépendance'],
      description: [
        'Built to commemorate Togo\'s independence on 27 April 1960, this monument stands at the centre of Place de l\'Indépendance, surrounded by the Palais des Congrès and leafy boulevards.',
        'Érigé pour commémorer l\'indépendance du Togo le 27 avril 1960, ce monument se dresse au centre de la place de l\'Indépendance, entouré du Palais des Congrès et de boulevards arborés.',
      ],
      images: pics('city', 'Independence Monument'), rating: 4.2, reviewCount: 188, views: 7300,
      tags: ['monument', 'independence', 'landmark'],
      hours: ALWAYS, fee: null,
    }),
    place({
      slug: 'palais-de-lome', category: 'culture', city: 'Lomé', lat: 6.124, lng: 1.215, address: 'Boulevard du Mono, Lomé',
      name: ['Palais de Lomé', 'Palais de Lomé'],
      description: [
        'The restored colonial-era governor\'s palace is now an art and culture centre with contemporary African exhibitions, set in an 11-hectare park of tropical gardens by the sea.',
        'L\'ancien palais des gouverneurs, restauré, est devenu un centre d\'art et de culture accueillant des expositions d\'art africain contemporain, au cœur d\'un parc tropical de 11 hectares en bord de mer.',
      ],
      images: pics('culture', 'Palace gardens'), rating: 4.7, reviewCount: 265, views: 9100,
      tags: ['museum', 'art', 'gardens', 'colonial architecture'], featured: true,
      hours: ['Tue–Sun 10:00–18:00', 'Mar–Dim 10:00–18:00'], fee: 2000,
    }),
    place({
      slug: 'sacred-heart-cathedral-lome', category: 'historical', city: 'Lomé', lat: 6.127, lng: 1.221,
      name: ['Sacred Heart Cathedral', 'Cathédrale du Sacré-Cœur'],
      description: [
        'A neo-Gothic cathedral completed in 1902 during the German colonial period, one of Lomé\'s most recognisable buildings.',
        'Cathédrale néogothique achevée en 1902 pendant la période coloniale allemande, l\'un des édifices les plus emblématiques de Lomé.',
      ],
      images: pics('city', 'Cathedral façade'), rating: 4.4, reviewCount: 120, views: 4800,
      tags: ['church', 'colonial', 'architecture'],
      hours: DAILY('06:00', '19:00'), fee: null,
    }),
    place({
      slug: 'lome-beach-boulevard', category: 'beach', city: 'Lomé', lat: 6.122, lng: 1.235,
      name: ['Lomé Beachfront', 'Front de mer de Lomé'],
      description: [
        'A long palm-lined beach along Boulevard du Mono, lively at sunset with beach bars, football games and coconut sellers. Currents are strong: swim only where locals indicate it is safe.',
        'Une longue plage bordée de palmiers le long du boulevard du Mono, animée au coucher du soleil avec ses buvettes, matchs de foot et vendeurs de noix de coco. Les courants sont forts : ne vous baignez qu\'aux endroits sûrs.',
      ],
      images: pics('beach', 'Palm-lined beach'), rating: 4.3, reviewCount: 344, views: 13200,
      tags: ['beach', 'sunset', 'palm trees'],
      hours: ALWAYS, fee: null,
    }),
    place({
      slug: 'coco-beach-lome', category: 'beach', city: 'Lomé', lat: 6.163, lng: 1.33,
      name: ['Coco Beach', 'Coco Beach'],
      description: [
        'East of the city centre, Coco Beach offers calmer sand, beach restaurants and loungers — a favourite weekend escape for Lomé families and expats.',
        'À l\'est du centre-ville, Coco Beach offre une plage plus calme, des restaurants et transats — l\'escapade favorite des familles et expatriés le week-end.',
      ],
      images: pics('beach', 'Beach with loungers'), rating: 4.5, reviewCount: 233, views: 8800,
      tags: ['beach', 'relax', 'weekend'], featured: true,
      hours: DAILY('08:00', '20:00'), fee: 1000, feeNote: 'Lounger rental',
    }),
    place({
      slug: 'wood-home-slave-house-agbodrafo', category: 'historical', city: 'Agbodrafo', lat: 6.214, lng: 1.468,
      name: ['Wood Home – House of Slaves', 'Maison des esclaves (Wood Home)'],
      description: [
        'A sobering memorial: this 1830s house hid enslaved people in its cellar after the abolition of the transatlantic slave trade. A guided visit tells their story.',
        'Un lieu de mémoire bouleversant : cette maison des années 1830 cachait des esclaves dans sa cave après l\'abolition de la traite transatlantique. Une visite guidée raconte leur histoire.',
      ],
      images: pics('culture', 'Historic house'), rating: 4.6, reviewCount: 176, views: 6900,
      tags: ['memorial', 'slave trade', 'history'],
      hours: DAILY('08:00', '17:00'), fee: 2000,
    }),
    place({
      slug: 'aneho-colonial-town', category: 'historical', city: 'Aného', lat: 6.228, lng: 1.592,
      name: ['Aného Old Town', 'Vieille ville d\'Aného'],
      description: [
        'Togo\'s first colonial capital, wedged between the lagoon and the ocean. Faded colonial buildings, the Protestant church and the Epe Ekpe festival make it a cultural treasure.',
        'Première capitale coloniale du Togo, nichée entre la lagune et l\'océan. Bâtiments coloniaux défraîchis, temple protestant et fête Epe Ekpe en font un trésor culturel.',
      ],
      images: pics('lake', 'Lagoon at Aného'), rating: 4.3, reviewCount: 98, views: 4100,
      tags: ['colonial', 'lagoon', 'festival'],
      hours: ALWAYS, fee: null,
    }),
    place({
      slug: 'fazao-malfakassa-national-park', category: 'nature', city: 'Sokodé', lat: 8.75, lng: 0.78,
      name: ['Fazao-Malfakassa National Park', 'Parc national Fazao-Malfakassa'],
      description: [
        'Togo\'s largest national park: wooded savanna, cliffs and waterfalls home to antelopes, monkeys and over 200 bird species. Visits by 4x4 with a ranger.',
        'Le plus grand parc national du Togo : savane boisée, falaises et cascades abritant antilopes, singes et plus de 200 espèces d\'oiseaux. Visites en 4x4 avec un écogarde.',
      ],
      images: pics('savanna', 'Wooded savanna'), rating: 4.6, reviewCount: 87, views: 5100,
      tags: ['national park', 'wildlife', 'safari', 'birds'], featured: true,
      hours: DAILY('06:00', '18:00'), fee: 5000, feeNote: 'Ranger fee extra',
    }),
    place({
      slug: 'sokode-old-town-adossa', category: 'culture', city: 'Sokodé', lat: 8.983, lng: 1.133,
      name: ['Sokodé & the Adossa Festival', 'Sokodé et la fête Adossa'],
      description: [
        'Togo\'s second city and heart of Tem culture. Visit during Gadao-Adossa, the famous "festival of knives", or browse the busy central market any time of year.',
        'Deuxième ville du Togo et cœur de la culture tem. Venez pendant Gadao-Adossa, la célèbre « fête des couteaux », ou flânez au grand marché toute l\'année.',
      ],
      images: pics('city', 'Market town'), rating: 4.1, reviewCount: 64, views: 3300,
      tags: ['festival', 'Tem', 'market'],
      hours: ALWAYS, fee: null,
    }),
    place({
      slug: 'aledjo-fault', category: 'adventure', city: 'Bafilo', lat: 9.25, lng: 1.2,
      name: ['Aledjo Fault', 'Faille d\'Aledjo'],
      description: [
        'A dramatic cut through the rock on the national road between Sokodé and Kara, with spectacular views over the Kéran mountains and nearby wildlife reserve.',
        'Une impressionnante entaille dans la roche sur la route nationale entre Sokodé et Kara, avec des vues spectaculaires sur les monts et la réserve voisine.',
      ],
      images: pics('mountain', 'Rock cut road'), rating: 4.4, reviewCount: 72, views: 2900,
      tags: ['road trip', 'viewpoint', 'geology'],
      hours: ALWAYS, fee: null,
    }),
    place({
      slug: 'sarakawa-wildlife-park', category: 'nature', city: 'Kara', lat: 9.63, lng: 1.02,
      name: ['Sarakawa Wildlife Park', 'Parc de Sarakawa'],
      description: [
        'A savanna reserve near Kara where you can spot zebras, buffalo, antelopes and ostriches on a short guided safari — ideal for families.',
        'Une réserve de savane près de Kara où l\'on observe zèbres, buffles, antilopes et autruches lors d\'un court safari guidé — idéal en famille.',
      ],
      images: pics('savanna', 'Wildlife in the savanna'), rating: 4.5, reviewCount: 119, views: 4700,
      tags: ['safari', 'wildlife', 'family'],
      hours: DAILY('07:00', '17:00'), fee: 5000,
    }),
    place({
      slug: 'nok-caves-dapaong', category: 'historical', city: 'Dapaong', lat: 10.93, lng: 0.36,
      name: ['Nok Caves', 'Grottes de Nok'],
      description: [
        'Cliff-side cave dwellings with clay granaries, used as a refuge by the Moba people during 19th-century wars. A steep but short climb rewards you with views over the Savanes.',
        'Habitations troglodytes et greniers en argile à flanc de falaise, refuge des Moba lors des guerres du XIXᵉ siècle. Une montée raide mais courte offre une vue sur les Savanes.',
      ],
      images: pics('mountain', 'Cliffs and caves'), rating: 4.6, reviewCount: 58, views: 2600,
      tags: ['caves', 'granaries', 'hiking', 'Moba'],
      hours: DAILY('07:00', '17:00'), fee: 2000,
    }),
    place({
      slug: 'atakpame-hills', category: 'city', city: 'Atakpamé', lat: 7.53, lng: 1.13,
      name: ['Atakpamé Hill Town', 'Atakpamé, ville des collines'],
      description: [
        'Built across seven hills, Atakpamé is a lively crossroads town with colonial buildings, a bustling market and easy access to waterfalls and Ewe and Ana villages.',
        'Bâtie sur sept collines, Atakpamé est une ville carrefour animée avec bâtiments coloniaux, marché coloré et accès facile aux cascades et villages éwé et ana.',
      ],
      images: pics('city', 'Hill town'), rating: 4.0, reviewCount: 45, views: 2100,
      tags: ['hills', 'market', 'base camp'],
      hours: ALWAYS, fee: null,
    }),

    /* ============================== RESTAURANTS ============================== */
    restaurant({
      slug: 'chez-maman-afi-lome', cuisine: 'local', priceLevel: 1, city: 'Lomé', lat: 6.136, lng: 1.226,
      name: ['Chez Maman Afi', 'Chez Maman Afi'],
      description: [
        'Sample business. A beloved maquis serving generous plates of fufu with peanut soup, akoumé with gboma dessi and grilled tilapia under a shady paillote.',
        'Établissement fictif. Un maquis apprécié servant de généreuses assiettes de foufou sauce arachide, d\'akoumé au gboma dessi et de tilapia grillé sous une paillote ombragée.',
      ],
      images: pics('food', 'Togolese dishes'), rating: 4.7, reviewCount: 312, views: 9400,
      tags: ['fufu', 'maquis', 'authentic'], sponsored: true,
      contact: { phone: '+228 90 00 00 01' },
      menu: [['Fufu & peanut soup', 2500, 'Pounded yam with chicken in peanut sauce'], ['Akoumé & gboma dessi', 2000], ['Grilled tilapia & attiéké', 3500], ['Bissap juice', 500]],
    }),
    restaurant({
      slug: 'le-patio-du-golfe', cuisine: 'continental', priceLevel: 3, city: 'Lomé', lat: 6.125, lng: 1.213,
      name: ['Le Patio du Golfe', 'Le Patio du Golfe'],
      description: [
        'Sample business. Elegant garden terrace with French-inspired cuisine, fresh seafood and an excellent wine list. Popular for business dinners.',
        'Établissement fictif. Élégante terrasse-jardin, cuisine d\'inspiration française, fruits de mer frais et belle carte des vins. Apprécié pour les dîners d\'affaires.',
      ],
      images: pics('restaurant', 'Garden terrace restaurant'), rating: 4.6, reviewCount: 188, views: 7200,
      tags: ['fine dining', 'terrace', 'wine'],
      contact: { phone: '+228 90 00 00 02', website: 'https://example.com/patio-du-golfe' },
      menu: [['Grilled lobster', 18000], ['Beef fillet, pepper sauce', 12000], ['Chocolate fondant', 4500]],
    }),
    restaurant({
      slug: 'la-paillote-de-la-plage', cuisine: 'seafood', priceLevel: 2, city: 'Lomé', lat: 6.16, lng: 1.325,
      name: ['La Paillote de la Plage', 'La Paillote de la Plage'],
      description: [
        'Sample business. Feet-in-the-sand seafood shack near Coco Beach: grilled lobster, prawns and catch of the day with spicy pepper sauce.',
        'Établissement fictif. Paillote les pieds dans le sable près de Coco Beach : langouste grillée, crevettes et poisson du jour, sauce pimentée.',
      ],
      images: pics('restaurant', 'Beach restaurant'), rating: 4.5, reviewCount: 221, views: 6800,
      tags: ['seafood', 'beach', 'sunset'],
      contact: { phone: '+228 90 00 00 03' },
      menu: [['Catch of the day', 5000], ['Garlic prawns', 7000], ['Fried plantain (alloco)', 1000]],
    }),
    restaurant({
      slug: 'saveurs-d-afrique-lome', cuisine: 'african', priceLevel: 2, city: 'Lomé', lat: 6.141, lng: 1.215,
      name: ['Saveurs d\'Afrique', 'Saveurs d\'Afrique'],
      description: [
        'Sample business. A pan-African menu: Senegalese thieboudienne, Ivorian kedjenou, Nigerian jollof and Togolese ablo — with live music on Fridays.',
        'Établissement fictif. Une carte panafricaine : thiéboudienne sénégalais, kédjénou ivoirien, jollof nigérian et ablo togolais — musique live le vendredi.',
      ],
      images: pics('food', 'African dishes'), rating: 4.4, reviewCount: 146, views: 5100,
      tags: ['pan-African', 'live music'],
      contact: { phone: '+228 90 00 00 04' },
      menu: [['Thieboudienne', 4000], ['Kedjenou chicken', 4500], ['Jollof rice', 3000], ['Ablo & fried fish', 3000]],
    }),
    restaurant({
      slug: 'cafe-wax-lome', cuisine: 'cafe', priceLevel: 2, city: 'Lomé', lat: 6.13, lng: 1.218,
      name: ['Café Wax', 'Café Wax'],
      description: [
        'Sample business. Bright café decorated with wax-print fabrics, serving Togolese-grown coffee from Kpalimé, pastries and healthy brunch plates.',
        'Établissement fictif. Café lumineux décoré de pagnes wax, servant du café de Kpalimé, des viennoiseries et des brunchs sains.',
      ],
      images: pics('cafe', 'Coffee and pastries'), rating: 4.3, reviewCount: 97, views: 3900,
      tags: ['coffee', 'brunch', 'wifi'],
      contact: { phone: '+228 90 00 00 05' },
      menu: [['Kpalimé espresso', 1000], ['Brunch plate', 5500], ['Baobab smoothie', 2000]],
    }),
    restaurant({
      slug: 'quick-grill-lome', cuisine: 'fast_food', priceLevel: 1, city: 'Lomé', lat: 6.15, lng: 1.23,
      name: ['Quick Grill Lomé', 'Quick Grill Lomé'],
      description: [
        'Sample business. Burgers, shawarma and chicken wings served fast, open late — the go-to spot after a night out.',
        'Établissement fictif. Burgers, chawarmas et ailes de poulet servis rapidement, ouvert tard — l\'adresse après une soirée.',
      ],
      images: pics('fastfood', 'Burger and fries'), rating: 4.0, reviewCount: 203, views: 6100,
      tags: ['late night', 'takeaway'],
      contact: { phone: '+228 90 00 00 06' },
      menu: [['Classic burger', 3000], ['Chicken shawarma', 2000], ['Fries', 1000]],
    }),
    restaurant({
      slug: 'le-belvedere-kpalime', cuisine: 'local', priceLevel: 2, city: 'Kpalimé', lat: 6.9, lng: 0.63,
      name: ['Le Belvédère', 'Le Belvédère'],
      description: [
        'Sample business. Hillside restaurant with views over the Kpalimé valley, specialising in hearty mountain dishes and fresh fruit juices.',
        'Établissement fictif. Restaurant à flanc de colline avec vue sur la vallée de Kpalimé, spécialités montagnardes et jus de fruits frais.',
      ],
      images: pics('restaurant', 'Restaurant with valley view'), rating: 4.6, reviewCount: 88, views: 3200,
      tags: ['view', 'hiking stop'],
      contact: { phone: '+228 90 00 00 07' },
      menu: [['Peanut chicken stew', 3000], ['Fried yam & pepper', 1500], ['Fresh passion juice', 800]],
    }),
    restaurant({
      slug: 'chez-fofo-kara', cuisine: 'local', priceLevel: 1, city: 'Kara', lat: 9.55, lng: 1.19,
      name: ['Chez Fofo', 'Chez Fofo'],
      description: [
        'Sample business. Kabyè home cooking: pâte with gombo sauce, grilled guinea fowl and tchoukoutou (millet beer).',
        'Établissement fictif. Cuisine familiale kabyè : pâte sauce gombo, pintade grillée et tchoukoutou (bière de mil).',
      ],
      images: pics('food', 'Home-style meal'), rating: 4.5, reviewCount: 76, views: 2500,
      tags: ['Kabyè', 'guinea fowl', 'tchoukoutou'],
      contact: { phone: '+228 90 00 00 08' },
      menu: [['Pâte & gombo sauce', 1500], ['Grilled guinea fowl', 5000], ['Tchoukoutou (calabash)', 300]],
    }),
    restaurant({
      slug: 'le-carrefour-sokode', cuisine: 'african', priceLevel: 1, city: 'Sokodé', lat: 8.98, lng: 1.14,
      name: ['Le Carrefour', 'Le Carrefour'],
      description: [
        'Sample business. Friendly roadside restaurant famous for its riz sauce, brochettes and grilled corn — perfect stop on the north–south highway.',
        'Établissement fictif. Restaurant convivial en bord de route réputé pour son riz sauce, ses brochettes et son maïs grillé — étape idéale sur la nationale.',
      ],
      images: pics('food', 'Rice and sauce'), rating: 4.2, reviewCount: 51, views: 1800,
      tags: ['road trip', 'brochettes'],
      contact: { phone: '+228 90 00 00 09' },
      menu: [['Rice & tomato sauce', 1200], ['Beef brochettes', 1500]],
    }),
    restaurant({
      slug: 'la-lagune-aneho', cuisine: 'seafood', priceLevel: 2, city: 'Aného', lat: 6.23, lng: 1.59,
      name: ['La Lagune', 'La Lagune'],
      description: [
        'Sample business. Waterside terrace on the Aného lagoon serving crab, grilled barracuda and coconut rice.',
        'Établissement fictif. Terrasse au bord de la lagune d\'Aného servant crabe, barracuda grillé et riz au coco.',
      ],
      images: pics('restaurant', 'Lagoon terrace'), rating: 4.4, reviewCount: 64, views: 2200,
      tags: ['lagoon', 'seafood'],
      contact: { phone: '+228 90 00 00 10' },
      menu: [['Crab in sauce', 6000], ['Grilled barracuda', 5000], ['Coconut rice', 1000]],
    }),

    /* ================================= HOTELS ================================= */
    hotel({
      slug: 'hotel-oceane-lome', hotelType: 'hotel', stars: 5, city: 'Lomé', lat: 6.127, lng: 1.226,
      name: ['Hôtel Océane', 'Hôtel Océane'],
      description: [
        'Sample business. A landmark high-rise with ocean-view rooms, infinity pool, spa and three restaurants, minutes from the Grand Market.',
        'Établissement fictif. Une tour emblématique avec chambres vue mer, piscine à débordement, spa et trois restaurants, à quelques minutes du Grand Marché.',
      ],
      images: pics('resort', 'Hotel infinity pool'), rating: 4.7, reviewCount: 534, views: 14100,
      tags: ['luxury', 'business', 'ocean view'], sponsored: true,
      contact: { phone: '+228 90 00 01 01', bookingUrl: 'https://example.com/book/hotel-oceane', website: 'https://example.com/hotel-oceane' },
      amenities: ['wifi', 'pool', 'spa', 'gym', 'restaurant', 'bar', 'air_conditioning', 'airport_shuttle', 'conference_room', 'parking'],
      price: [95000, 250000],
    }),
    hotel({
      slug: 'residence-du-benin-lome', hotelType: 'hotel', stars: 4, city: 'Lomé', lat: 6.14, lng: 1.21,
      name: ['Résidence Bénin Garden', 'Résidence Bénin Garden'],
      description: [
        'Sample business. Calm garden hotel in a residential district with a large pool, reliable Wi-Fi and a good restaurant — popular with NGOs and families.',
        'Établissement fictif. Hôtel-jardin calme dans un quartier résidentiel avec grande piscine, Wi-Fi fiable et bon restaurant — apprécié des ONG et familles.',
      ],
      images: pics('hotel', 'Garden hotel'), rating: 4.4, reviewCount: 211, views: 6900,
      tags: ['garden', 'family', 'quiet'],
      contact: { phone: '+228 90 00 01 02', bookingUrl: 'https://example.com/book/benin-garden' },
      amenities: ['wifi', 'pool', 'restaurant', 'bar', 'air_conditioning', 'parking', 'breakfast'],
      price: [45000, 90000],
    }),
    hotel({
      slug: 'coco-beach-resort', hotelType: 'resort', stars: 4, city: 'Lomé', lat: 6.165, lng: 1.335,
      name: ['Coco Beach Resort', 'Coco Beach Resort'],
      description: [
        'Sample business. Beachfront bungalows under coconut palms with direct beach access, a seafood restaurant and weekend live music.',
        'Établissement fictif. Bungalows en bord de mer sous les cocotiers, accès direct à la plage, restaurant de fruits de mer et musique live le week-end.',
      ],
      images: pics('resort', 'Beach bungalows'), rating: 4.5, reviewCount: 187, views: 8100,
      tags: ['beachfront', 'bungalows', 'romantic'], featured: true,
      contact: { phone: '+228 90 00 01 03', bookingUrl: 'https://example.com/book/coco-beach-resort' },
      amenities: ['wifi', 'pool', 'beach_access', 'restaurant', 'bar', 'air_conditioning', 'breakfast'],
      price: [60000, 140000],
    }),
    hotel({
      slug: 'auberge-le-voyageur-lome', hotelType: 'guesthouse', stars: 2, city: 'Lomé', lat: 6.133, lng: 1.23,
      name: ['Auberge Le Voyageur', 'Auberge Le Voyageur'],
      description: [
        'Sample business. Budget-friendly guest house run by a Togolese family, with a rooftop terrace, shared kitchen and helpful travel tips.',
        'Établissement fictif. Maison d\'hôtes économique tenue par une famille togolaise, avec toit-terrasse, cuisine partagée et bons conseils de voyage.',
      ],
      images: pics('hotel', 'Guest house room'), rating: 4.6, reviewCount: 143, views: 5300,
      tags: ['budget', 'backpackers', 'rooftop'],
      contact: { phone: '+228 90 00 01 04', email: 'hello@example.com' },
      amenities: ['wifi', 'breakfast', 'air_conditioning'],
      price: [12000, 25000],
    }),
    hotel({
      slug: 'lac-togo-lodge', hotelType: 'lodge', stars: 3, city: 'Agbodrafo', lat: 6.22, lng: 1.48,
      name: ['Lake Togo Lodge', 'Lodge du Lac Togo'],
      description: [
        'Sample business. Eco-lodge on the shores of Lake Togo with pirogue excursions to Togoville, kayaks and a restaurant serving lake fish.',
        'Établissement fictif. Écolodge au bord du lac Togo proposant excursions en pirogue vers Togoville, kayaks et restaurant de poissons du lac.',
      ],
      images: pics('lodge', 'Lakeside lodge'), rating: 4.6, reviewCount: 129, views: 5600,
      tags: ['eco-lodge', 'lake', 'kayak'], featured: true,
      contact: { phone: '+228 90 00 01 05', bookingUrl: 'https://example.com/book/lake-togo-lodge' },
      amenities: ['wifi', 'restaurant', 'bar', 'parking', 'breakfast'],
      price: [35000, 65000],
    }),
    hotel({
      slug: 'kpalime-mountain-lodge', hotelType: 'lodge', stars: 3, city: 'Kpalimé', lat: 6.93, lng: 0.6,
      name: ['Kpalimé Mountain Lodge', 'Lodge des Monts de Kpalimé'],
      description: [
        'Sample business. Stone chalets in the cool hills near Mount Klouto, ideal base for hiking, butterfly walks and waterfall trips.',
        'Établissement fictif. Chalets en pierre dans les collines fraîches près du mont Klouto, base idéale pour randonnées, papillons et cascades.',
      ],
      images: pics('lodge', 'Mountain chalet'), rating: 4.7, reviewCount: 96, views: 4300,
      tags: ['hiking base', 'cool climate', 'nature'],
      contact: { phone: '+228 90 00 01 06', bookingUrl: 'https://example.com/book/kpalime-mountain-lodge' },
      amenities: ['wifi', 'restaurant', 'parking', 'breakfast'],
      price: [28000, 55000],
    }),
    hotel({
      slug: 'hotel-les-sept-collines-atakpame', hotelType: 'hotel', stars: 3, city: 'Atakpamé', lat: 7.53, lng: 1.12,
      name: ['Hôtel Les Sept Collines', 'Hôtel Les Sept Collines'],
      description: [
        'Sample business. Comfortable mid-range hotel with a pool and panoramic restaurant overlooking Atakpamé\'s hills.',
        'Établissement fictif. Hôtel confortable de gamme moyenne avec piscine et restaurant panoramique sur les collines d\'Atakpamé.',
      ],
      images: pics('hotel', 'Hotel with pool'), rating: 4.2, reviewCount: 57, views: 2100,
      tags: ['mid-range', 'pool'],
      contact: { phone: '+228 90 00 01 07' },
      amenities: ['wifi', 'pool', 'restaurant', 'air_conditioning', 'parking'],
      price: [25000, 45000],
    }),
    hotel({
      slug: 'hotel-kara-palace', hotelType: 'hotel', stars: 4, city: 'Kara', lat: 9.55, lng: 1.18,
      name: ['Kara Palace Hotel', 'Hôtel Kara Palace'],
      description: [
        'Sample business. The north\'s most comfortable address: large pool, conference rooms and excursions to Koutammakou and Sarakawa.',
        'Établissement fictif. L\'adresse la plus confortable du nord : grande piscine, salles de conférence et excursions vers Koutammakou et Sarakawa.',
      ],
      images: pics('hotel', 'Hotel lobby'), rating: 4.3, reviewCount: 102, views: 3800,
      tags: ['business', 'excursions'],
      contact: { phone: '+228 90 00 01 08', bookingUrl: 'https://example.com/book/kara-palace' },
      amenities: ['wifi', 'pool', 'gym', 'restaurant', 'bar', 'air_conditioning', 'conference_room', 'parking'],
      price: [40000, 85000],
    }),
    hotel({
      slug: 'tamberma-guesthouse-nadoba', hotelType: 'guesthouse', stars: 1, city: 'Kandé', lat: 10.07, lng: 1.16,
      name: ['Takienta Guest House', 'Maison d\'hôtes Takienta'],
      description: [
        'Sample business. Sleep in a restored Batammariba tower-house in Koutammakou — a unique, community-run experience with home-cooked meals.',
        'Établissement fictif. Dormez dans une maison-tour batammariba restaurée à Koutammakou — une expérience unique gérée par la communauté, repas maison inclus.',
      ],
      images: pics('lodge', 'Traditional guest house'), rating: 4.8, reviewCount: 61, views: 2900,
      tags: ['homestay', 'authentic', 'community'],
      contact: { phone: '+228 90 00 01 09' },
      amenities: ['breakfast', 'restaurant'],
      price: [10000, 18000],
    }),
    hotel({
      slug: 'hotel-sahel-dapaong', hotelType: 'hotel', stars: 2, city: 'Dapaong', lat: 10.86, lng: 0.2,
      name: ['Hôtel du Sahel', 'Hôtel du Sahel'],
      description: [
        'Sample business. Simple, clean rooms with air conditioning and a courtyard bar — the best base for exploring the Nok caves and Savanes region.',
        'Établissement fictif. Chambres simples et propres climatisées et bar dans la cour — la meilleure base pour explorer les grottes de Nok et la région des Savanes.',
      ],
      images: pics('hotel', 'Simple hotel room'), rating: 4.0, reviewCount: 39, views: 1500,
      tags: ['budget', 'north'],
      contact: { phone: '+228 90 00 01 10' },
      amenities: ['wifi', 'air_conditioning', 'bar', 'parking'],
      price: [15000, 30000],
    }),
  ];
}
