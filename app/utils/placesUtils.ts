import { Platform } from 'react-native';
import { GOOGLE_PLACES_API_KEY } from '../config/keys';

// Types for places responses
export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

export interface GroceryStore {
  id: string;
  name: string;
  address: string;
  distance?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

interface PlaceResult {
  id: string;
  displayName?: {
    text: string;
  };
  formattedAddress: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

const googleApiUrl = 'https://places.googleapis.com/v1';

const headers = {
  'Content-Type': 'application/json',
  'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
  'X-Goog-FieldMask': '*'
};

export const searchPlaces = async (input: string): Promise<PlacePrediction[]> => {
  try {
    console.log('Making Places API request for:', input);
    
    const response = await fetch(`${googleApiUrl}/places:searchText`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        textQuery: `${input} city`,
        locationBias: {
          rectangle: {
            low: { latitude: 25.82, longitude: -124.39 }, // Southwest US
            high: { latitude: 49.38, longitude: -66.95 }  // Northeast US
          }
        },
        languageCode: 'en'
      })
    });
    
    const data = await response.json();
    
    // Log the complete response for debugging
    console.log('Raw API Response:', {
      status: response.status,
      ok: response.ok,
      data: JSON.stringify(data, null, 2)
    });
    
    if (!response.ok) {
      console.error('Places API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: data.error,
        keyLength: GOOGLE_PLACES_API_KEY.length,
        keyStartsWith: GOOGLE_PLACES_API_KEY.substring(0, 3) + '...',
      });
      return [];
    }
    
    if (!data.places || !Array.isArray(data.places)) {
      console.error('Invalid response format:', {
        hasPlaces: !!data.places,
        isArray: Array.isArray(data.places),
        responseKeys: Object.keys(data)
      });
      return [];
    }
    
    return data.places.map((place: any) => ({
      place_id: place.id,
      description: place.formattedAddress,
      structured_formatting: {
        main_text: place.displayName?.text || place.formattedAddress,
        secondary_text: place.formattedAddress,
      },
    }));
    
  } catch (error) {
    console.error('Error in searchPlaces:', error);
    return [];
  }
};

export const getNearbyGroceryStores = async (
  latitude: number,
  longitude: number,
  radius: number = 5000 // Default 5km radius
): Promise<GroceryStore[]> => {
  try {
    const response = await fetch(`${googleApiUrl}/places:searchNearby`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        locationRestriction: {
          circle: {
            center: {
              latitude,
              longitude
            },
            radius: radius.toString()
          }
        },
        includedTypes: ["supermarket", "grocery_store"],
        maxResultCount: 20,
        languageCode: "en"
      })
    });
    
    const data = await response.json();
    console.log('Raw Nearby Search Response:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.places) {
      // Filter out places that don't match our criteria for grocery stores
      const filteredPlaces = (data.places as PlaceResult[]).filter((place) => {
        const name = place.displayName?.text?.toLowerCase() || '';
        // List of major grocery store chains
        const majorChains = [
          'safeway',
          'kroger',
          'whole foods',
          'trader joe',
          'albertsons',
          'fred meyer',
          'walmart',
          'target',
          'costco',
          'sam\'s club',
          'publix',
          'aldi',
          'food lion',
          'giant eagle',
          'stop & shop',
          'meijer',
          'harris teeter',
          'ralph',
          'vons',
          'jewel-osco',
          'wegmans',
          'sprouts',
          'save mart',
          'food 4 less',
          'winco',
          'market basket',
          'qfc',
          'h-e-b',
          'smiths',
          'food lion',
          'piggly wiggly',
          'ingles'
        ];
        
        // Less restrictive filtering:
        // 1. Include if it's a major chain
        // 2. Include if it has 'supermarket', 'grocery', or 'foods' in the name
        // 3. Exclude convenience stores, mini marts, and small markets
        return majorChains.some(chain => name.includes(chain)) || 
               (name.includes('supermarket') || 
                name.includes('grocery') || 
                name.includes('foods')) && 
               !name.includes('mini') && 
               !name.includes('convenience') && 
               !name.includes('quick');
      });

      console.log('Filtered places:', filteredPlaces.map(p => p.displayName?.text));

      // Sort by distance
      const sortedPlaces = filteredPlaces.sort((a: PlaceResult, b: PlaceResult) => {
        const distanceA = calculateDistance(
          latitude,
          longitude,
          a.location?.latitude || 0,
          a.location?.longitude || 0
        );
        const distanceB = calculateDistance(
          latitude,
          longitude,
          b.location?.latitude || 0,
          b.location?.longitude || 0
        );
        return parseFloat(distanceA) - parseFloat(distanceB);
      });

      return sortedPlaces.map((place) => ({
        id: place.id,
        name: place.displayName?.text || place.formattedAddress,
        address: place.formattedAddress,
        location: {
          lat: place.location?.latitude || 0,
          lng: place.location?.longitude || 0
        },
        distance: calculateDistance(
          latitude,
          longitude,
          place.location?.latitude || 0,
          place.location?.longitude || 0
        ),
      }));
    }
    
    console.error('Nearby Stores Error:', {
      status: response.status,
      statusText: response.statusText,
      error: data.error
    });
    
    return [];
  } catch (error) {
    console.error('Error in getNearbyGroceryStores:', error);
    return [];
  }
};

export const getPlaceDetails = async (placeId: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    const response = await fetch(`${googleApiUrl}/places/${placeId}`, {
      method: 'GET',
      headers
    });
    
    const data = await response.json();
    
    if (response.ok && data.location) {
      return {
        lat: data.location.latitude,
        lng: data.location.longitude
      };
    }
    
    console.error('Place Details Error:', {
      status: response.status,
      statusText: response.statusText,
      error: data.error
    });
    
    return null;
  } catch (error) {
    console.error('Error in getPlaceDetails:', error);
    return null;
  }
};

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km

  // Convert to miles for US users
  const miles = distance * 0.621371;
  
  if (miles < 0.1) {
    return `${Math.round(miles * 5280)} ft`; // Convert to feet if less than 0.1 miles
  }
  return `${miles.toFixed(1)} mi`;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
} 