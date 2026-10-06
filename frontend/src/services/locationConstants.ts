/**
 * Verified Indian Travel Destinations and Major Locations
 * All coordinates are real, verified geographic coordinates.
 * No fake or random coordinates.
 */

export interface CuratedLocation {
  id: string;
  name: string;
  area: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  category: 'landmark' | 'city' | 'beach' | 'heritage' | 'transit';
}

export const POPULAR_TRAVEL_LOCATIONS: CuratedLocation[] = [
  // Mumbai
  {
    id: 'mum_gateway',
    name: 'Gateway of India',
    area: 'Apollo Bunder, Colaba',
    city: 'Mumbai',
    state: 'Maharashtra',
    latitude: 18.9220,
    longitude: 72.8347,
    category: 'landmark',
  },
  {
    id: 'mum_marine',
    name: 'Marine Drive & Chowpatty',
    area: 'Marine Lines, Nariman Point',
    city: 'Mumbai',
    state: 'Maharashtra',
    latitude: 18.9432,
    longitude: 72.8230,
    category: 'landmark',
  },
  {
    id: 'mum_cst',
    name: 'Chhatrapati Shivaji Maharaj Terminus (CSMT)',
    area: 'Fort Area',
    city: 'Mumbai',
    state: 'Maharashtra',
    latitude: 18.9398,
    longitude: 72.8355,
    category: 'heritage',
  },
  {
    id: 'mum_juhu',
    name: 'Juhu Beach',
    area: 'Juhu, Vile Parle',
    city: 'Mumbai',
    state: 'Maharashtra',
    latitude: 19.0988,
    longitude: 72.8264,
    category: 'beach',
  },
  {
    id: 'mum_bandra',
    name: 'Bandra Bandstand & Fort',
    area: 'Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    latitude: 19.0434,
    longitude: 72.8193,
    category: 'landmark',
  },

  // Delhi NCR
  {
    id: 'del_cp',
    name: 'Connaught Place (Rajiv Chowk)',
    area: 'Central Delhi',
    city: 'New Delhi',
    state: 'Delhi',
    latitude: 28.6315,
    longitude: 77.2167,
    category: 'landmark',
  },
  {
    id: 'del_indiagate',
    name: 'India Gate & Kartavya Path',
    area: 'Central Delhi',
    city: 'New Delhi',
    state: 'Delhi',
    latitude: 28.6129,
    longitude: 77.2295,
    category: 'landmark',
  },
  {
    id: 'del_redfort',
    name: 'Red Fort (Lal Qila)',
    area: 'Chandni Chowk',
    city: 'Delhi',
    state: 'Delhi',
    latitude: 28.6562,
    longitude: 77.2410,
    category: 'heritage',
  },
  {
    id: 'del_qutub',
    name: 'Qutub Minar Complex',
    area: 'Mehrauli',
    city: 'New Delhi',
    state: 'Delhi',
    latitude: 28.5244,
    longitude: 77.1855,
    category: 'heritage',
  },

  // Jaipur, Rajasthan
  {
    id: 'jai_hawamahal',
    name: 'Hawa Mahal & City Palace',
    area: 'Badi Choupad',
    city: 'Jaipur',
    state: 'Rajasthan',
    latitude: 26.9239,
    longitude: 75.8267,
    category: 'heritage',
  },
  {
    id: 'jai_amber',
    name: 'Amber Palace & Fort',
    area: 'Amer',
    city: 'Jaipur',
    state: 'Rajasthan',
    latitude: 26.9855,
    longitude: 75.8513,
    category: 'heritage',
  },

  // Goa
  {
    id: 'goa_calangute',
    name: 'Calangute Beach & Baga Road',
    area: 'North Goa',
    city: 'Calangute',
    state: 'Goa',
    latitude: 15.5439,
    longitude: 73.7553,
    category: 'beach',
  },
  {
    id: 'goa_panaji',
    name: 'Panaji Promenade & Miramar',
    area: 'Tiswadi',
    city: 'Panaji',
    state: 'Goa',
    latitude: 15.4909,
    longitude: 73.8278,
    category: 'landmark',
  },

  // Agra
  {
    id: 'agr_tajmahal',
    name: 'Taj Mahal Complex',
    area: 'Tajganj',
    city: 'Agra',
    state: 'Uttar Pradesh',
    latitude: 27.1751,
    longitude: 78.0421,
    category: 'heritage',
  },

  // Bengaluru
  {
    id: 'blr_mgroad',
    name: 'MG Road & Brigade Road',
    area: 'Central Business District',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.9756,
    longitude: 77.6066,
    category: 'city',
  },
  {
    id: 'blr_cubbon',
    name: 'Cubbon Park & Vidhana Soudha',
    area: 'Sampangi Rama Nagara',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.9797,
    longitude: 77.5907,
    category: 'landmark',
  },

  // Varanasi
  {
    id: 'vns_ghats',
    name: 'Dashashwamedh Ghat & Kashi Temple',
    area: 'Ghats Corridor',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    latitude: 25.3076,
    longitude: 83.0107,
    category: 'heritage',
  },

  // Kolkata
  {
    id: 'ccu_victoria',
    name: 'Victoria Memorial & Maidan',
    area: 'Park Street Area',
    city: 'Kolkata',
    state: 'West Bengal',
    latitude: 22.5448,
    longitude: 88.3426,
    category: 'landmark',
  },

  // Hyderabad
  {
    id: 'hyd_charminar',
    name: 'Charminar & Laad Bazaar',
    area: 'Old City',
    city: 'Hyderabad',
    state: 'Telangana',
    latitude: 17.3616,
    longitude: 78.4747,
    category: 'heritage',
  },

  // Kerala
  {
    id: 'cok_fortkochi',
    name: 'Fort Kochi & Chinese Fishing Nets',
    area: 'Kochi Coastal',
    city: 'Kochi',
    state: 'Kerala',
    latitude: 9.9658,
    longitude: 76.2421,
    category: 'heritage',
  },
  {
    id: 'munnar',
    name: 'Munnar Town & Tea Gardens',
    area: 'Idukki District',
    city: 'Munnar',
    state: 'Kerala',
    latitude: 10.0889,
    longitude: 77.0595,
    category: 'landmark',
  },

  // Himachal / Hills
  {
    id: 'sml_mallroad',
    name: 'The Ridge & Mall Road',
    area: 'City Center',
    city: 'Shimla',
    state: 'Himachal Pradesh',
    latitude: 31.1048,
    longitude: 77.1734,
    category: 'landmark',
  },
  {
    id: 'mnl_mallroad',
    name: 'Manali Mall Road & Old Manali',
    area: 'Kullu Valley',
    city: 'Manali',
    state: 'Himachal Pradesh',
    latitude: 32.2396,
    longitude: 77.1887,
    category: 'landmark',
  },

  // Amritsar
  {
    id: 'asr_goldentemple',
    name: 'Harmandir Sahib (Golden Temple)',
    area: 'Heritage Street',
    city: 'Amritsar',
    state: 'Punjab',
    latitude: 31.6200,
    longitude: 74.8765,
    category: 'heritage',
  },

  // Udaipur
  {
    id: 'udr_citypalace',
    name: 'City Palace & Lake Pichola',
    area: 'Old City',
    city: 'Udaipur',
    state: 'Rajasthan',
    latitude: 24.5764,
    longitude: 73.6835,
    category: 'heritage',
  },
];
