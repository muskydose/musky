export interface IndianStateTerritory {
  name: string;
  code: string;
  type: 'State' | 'Union Territory';
  capital: string;
  latitude: number;
  longitude: number;
}

export const INDIAN_STATES_AND_UTS: IndianStateTerritory[] = [
  { name: 'Andhra Pradesh', code: 'AP', type: 'State', capital: 'Amaravati', latitude: 15.9129, longitude: 79.7400 },
  { name: 'Arunachal Pradesh', code: 'AR', type: 'State', capital: 'Itanagar', latitude: 28.2180, longitude: 94.7278 },
  { name: 'Assam', code: 'AS', type: 'State', capital: 'Dispur', latitude: 26.2006, longitude: 92.9376 },
  { name: 'Bihar', code: 'BR', type: 'State', capital: 'Patna', latitude: 25.0961, longitude: 85.3131 },
  { name: 'Chhattisgarh', code: 'CG', type: 'State', capital: 'Raipur', latitude: 21.2787, longitude: 81.8661 },
  { name: 'Goa', code: 'GA', type: 'State', capital: 'Panaji', latitude: 15.2993, longitude: 74.1240 },
  { name: 'Gujarat', code: 'GJ', type: 'State', capital: 'Gandhinagar', latitude: 22.2587, longitude: 71.1924 },
  { name: 'Haryana', code: 'HR', type: 'State', capital: 'Chandigarh', latitude: 29.0588, longitude: 76.0856 },
  { name: 'Himachal Pradesh', code: 'HP', type: 'State', capital: 'Shimla', latitude: 31.1048, longitude: 77.1734 },
  { name: 'Jharkhand', code: 'JH', type: 'State', capital: 'Ranchi', latitude: 23.6102, longitude: 85.2799 },
  { name: 'Karnataka', code: 'KA', type: 'State', capital: 'Bengaluru', latitude: 15.3173, longitude: 75.7139 },
  { name: 'Kerala', code: 'KL', type: 'State', capital: 'Thiruvananthapuram', latitude: 10.8505, longitude: 76.2711 },
  { name: 'Madhya Pradesh', code: 'MP', type: 'State', capital: 'Bhopal', latitude: 22.9734, longitude: 78.6569 },
  { name: 'Maharashtra', code: 'MH', type: 'State', capital: 'Mumbai', latitude: 19.7515, longitude: 75.7139 },
  { name: 'Manipur', code: 'MN', type: 'State', capital: 'Imphal', latitude: 24.6637, longitude: 93.9063 },
  { name: 'Meghalaya', code: 'ML', type: 'State', capital: 'Shillong', latitude: 25.4670, longitude: 91.3662 },
  { name: 'Mizoram', code: 'MZ', type: 'State', capital: 'Aizawl', latitude: 23.1645, longitude: 92.9376 },
  { name: 'Nagaland', code: 'NL', type: 'State', capital: 'Kohima', latitude: 26.1584, longitude: 94.5624 },
  { name: 'Odisha', code: 'OD', type: 'State', capital: 'Bhubaneswar', latitude: 20.9517, longitude: 85.0985 },
  { name: 'Punjab', code: 'PB', type: 'State', capital: 'Chandigarh', latitude: 31.1471, longitude: 75.3412 },
  { name: 'Rajasthan', code: 'RJ', type: 'State', capital: 'Jaipur', latitude: 27.0238, longitude: 74.2179 },
  { name: 'Sikkim', code: 'SK', type: 'State', capital: 'Gangtok', latitude: 27.5330, longitude: 88.5122 },
  { name: 'Tamil Nadu', code: 'TN', type: 'State', capital: 'Chennai', latitude: 11.1271, longitude: 78.6569 },
  { name: 'Telangana', code: 'TG', type: 'State', capital: 'Hyderabad', latitude: 18.1124, longitude: 79.0193 },
  { name: 'Tripura', code: 'TR', type: 'State', capital: 'Agartala', latitude: 23.9408, longitude: 91.9882 },
  { name: 'Uttar Pradesh', code: 'UP', type: 'State', capital: 'Lucknow', latitude: 26.8467, longitude: 80.9462 },
  { name: 'Uttarakhand', code: 'UK', type: 'State', capital: 'Dehradun', latitude: 30.0668, longitude: 79.0193 },
  { name: 'West Bengal', code: 'WB', type: 'State', capital: 'Kolkata', latitude: 22.9868, longitude: 87.8550 },
  { name: 'Andaman & Nicobar Islands', code: 'AN', type: 'Union Territory', capital: 'Port Blair', latitude: 11.7401, longitude: 92.6586 },
  { name: 'Chandigarh', code: 'CH', type: 'Union Territory', capital: 'Chandigarh', latitude: 30.7333, longitude: 76.7794 },
  { name: 'Dadra & Nagar Haveli and Daman & Diu', code: 'DH', type: 'Union Territory', capital: 'Daman', latitude: 20.4283, longitude: 72.8397 },
  { name: 'Delhi', code: 'DL', type: 'Union Territory', capital: 'New Delhi', latitude: 28.7041, longitude: 77.1025 },
  { name: 'Jammu & Kashmir', code: 'JK', type: 'Union Territory', capital: 'Srinagar', latitude: 33.7782, longitude: 76.5762 },
  { name: 'Ladakh', code: 'LA', type: 'Union Territory', capital: 'Leh', latitude: 34.1526, longitude: 77.5771 },
  { name: 'Lakshadweep', code: 'LD', type: 'Union Territory', capital: 'Kavaratti', latitude: 10.5667, longitude: 72.6417 },
  { name: 'Puducherry', code: 'PY', type: 'Union Territory', capital: 'Puducherry', latitude: 11.9416, longitude: 79.8083 },
];

/**
 * Find matching Indian state or UT from input text.
 * ABSOLUTE RULE: NEVER default to Rajasthan if state is missing or unverified.
 * Returns null if not found.
 */
export function normalizeIndianState(input?: string | null): IndianStateTerritory | null {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim().toLowerCase();
  if (!clean || clean === 'unknown' || clean === 'n/a' || clean === 'null') return null;

  for (const st of INDIAN_STATES_AND_UTS) {
    if (st.name.toLowerCase() === clean || st.code.toLowerCase() === clean) {
      return st;
    }
  }

  // Alias checks
  if (clean.includes('delhi') || clean.includes('ncr')) {
    return INDIAN_STATES_AND_UTS.find((s) => s.code === 'DL') || null;
  }
  if (clean.includes('up') || clean.includes('uttar pradesh')) {
    return INDIAN_STATES_AND_UTS.find((s) => s.code === 'UP') || null;
  }
  if (clean.includes('mp') || clean.includes('madhya pradesh')) {
    return INDIAN_STATES_AND_UTS.find((s) => s.code === 'MP') || null;
  }
  if (clean.includes('tn') || clean.includes('tamilnadu')) {
    return INDIAN_STATES_AND_UTS.find((s) => s.code === 'TN') || null;
  }
  if (clean.includes('wb') || clean.includes('bengal')) {
    return INDIAN_STATES_AND_UTS.find((s) => s.code === 'WB') || null;
  }
  if (clean.includes('raj') || clean.includes('rajasthan')) {
    return INDIAN_STATES_AND_UTS.find((s) => s.code === 'RJ') || null;
  }

  // Partial match fallback
  for (const st of INDIAN_STATES_AND_UTS) {
    if (clean.includes(st.name.toLowerCase())) {
      return st;
    }
  }

  return null;
}
