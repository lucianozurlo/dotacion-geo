export interface Localidad {
  pais: string;
  paisCode: 'ARG' | 'URY' | 'CHL' | 'PRY';
  region: string;
  subdivision: string;
  localidad: string;
  lat: number;
  lon: number;
  /** peso relativo de dotación */
  peso: number;
  /** radio de dispersión en grados para el jitter urbano */
  radio: number;
}

/**
 * Centroides urbanos publicos. NUNCA representan domicilios:
 * los puntos se dispersan con jitter controlado alrededor del centroide.
 */
export const LOCALIDADES: Localidad[] = [
  // ---------------- ARGENTINA ----------------
  { pais: 'Argentina', paisCode: 'ARG', region: 'AMBA', subdivision: 'Ciudad Autónoma de Buenos Aires', localidad: 'CABA - Microcentro', lat: -34.6037, lon: -58.3816, peso: 240, radio: 0.035 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'AMBA', subdivision: 'Ciudad Autónoma de Buenos Aires', localidad: 'CABA - Barracas', lat: -34.6455, lon: -58.3785, peso: 90, radio: 0.02 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'AMBA', subdivision: 'Ciudad Autónoma de Buenos Aires', localidad: 'CABA - Saavedra', lat: -34.5545, lon: -58.4874, peso: 60, radio: 0.02 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'AMBA', subdivision: 'Buenos Aires', localidad: 'Vicente López', lat: -34.5266, lon: -58.4795, peso: 70, radio: 0.025 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'AMBA', subdivision: 'Buenos Aires', localidad: 'San Isidro', lat: -34.4708, lon: -58.5122, peso: 50, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'AMBA', subdivision: 'Buenos Aires', localidad: 'San Martín', lat: -34.5726, lon: -58.5372, peso: 55, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'AMBA', subdivision: 'Buenos Aires', localidad: 'Morón', lat: -34.6534, lon: -58.6198, peso: 45, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'AMBA', subdivision: 'Buenos Aires', localidad: 'Quilmes', lat: -34.7203, lon: -58.2543, peso: 45, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'AMBA', subdivision: 'Buenos Aires', localidad: 'La Matanza', lat: -34.7206, lon: -58.5411, peso: 55, radio: 0.045 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'AMBA', subdivision: 'Buenos Aires', localidad: 'Lomas de Zamora', lat: -34.7601, lon: -58.4004, peso: 35, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'AMBA', subdivision: 'Buenos Aires', localidad: 'Tigre', lat: -34.4264, lon: -58.5796, peso: 25, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Buenos Aires Interior', subdivision: 'Buenos Aires', localidad: 'La Plata', lat: -34.9215, lon: -57.9545, peso: 60, radio: 0.04 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Buenos Aires Interior', subdivision: 'Buenos Aires', localidad: 'Mar del Plata', lat: -38.0055, lon: -57.5426, peso: 55, radio: 0.04 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Buenos Aires Interior', subdivision: 'Buenos Aires', localidad: 'Bahía Blanca', lat: -38.7183, lon: -62.2663, peso: 30, radio: 0.035 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Buenos Aires Interior', subdivision: 'Buenos Aires', localidad: 'Tandil', lat: -37.3217, lon: -59.1332, peso: 14, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Buenos Aires Interior', subdivision: 'Buenos Aires', localidad: 'Junín', lat: -34.5836, lon: -60.9436, peso: 12, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Buenos Aires Interior', subdivision: 'Buenos Aires', localidad: 'Pergamino', lat: -33.8951, lon: -60.5734, peso: 10, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Buenos Aires Interior', subdivision: 'Buenos Aires', localidad: 'San Pedro', lat: -33.6795, lon: -59.6636, peso: 8, radio: 0.025 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Centro', subdivision: 'Córdoba', localidad: 'Córdoba Capital', lat: -31.4201, lon: -64.1888, peso: 110, radio: 0.05 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Centro', subdivision: 'Córdoba', localidad: 'Río Cuarto', lat: -33.1301, lon: -64.3499, peso: 18, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Centro', subdivision: 'Córdoba', localidad: 'Villa María', lat: -32.4103, lon: -63.2402, peso: 10, radio: 0.025 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Litoral', subdivision: 'Santa Fe', localidad: 'Rosario', lat: -32.9468, lon: -60.6393, peso: 95, radio: 0.045 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Litoral', subdivision: 'Santa Fe', localidad: 'Santa Fe Capital', lat: -31.6333, lon: -60.7, peso: 40, radio: 0.035 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Litoral', subdivision: 'Santa Fe', localidad: 'Rafaela', lat: -31.2503, lon: -61.4867, peso: 10, radio: 0.025 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Litoral', subdivision: 'Entre Ríos', localidad: 'Paraná', lat: -31.7333, lon: -60.5333, peso: 24, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Litoral', subdivision: 'Entre Ríos', localidad: 'Concordia', lat: -31.3929, lon: -58.0209, peso: 12, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'NEA', subdivision: 'Chaco', localidad: 'Resistencia', lat: -27.4606, lon: -58.9839, peso: 26, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'NEA', subdivision: 'Corrientes', localidad: 'Corrientes Capital', lat: -27.4692, lon: -58.8306, peso: 24, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'NEA', subdivision: 'Misiones', localidad: 'Posadas', lat: -27.3671, lon: -55.8961, peso: 22, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'NEA', subdivision: 'Formosa', localidad: 'Formosa', lat: -26.1775, lon: -58.1781, peso: 12, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'NOA', subdivision: 'Tucumán', localidad: 'San Miguel de Tucumán', lat: -26.8083, lon: -65.2176, peso: 42, radio: 0.035 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'NOA', subdivision: 'Salta', localidad: 'Salta Capital', lat: -24.7821, lon: -65.4232, peso: 34, radio: 0.035 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'NOA', subdivision: 'Jujuy', localidad: 'San Salvador de Jujuy', lat: -24.1858, lon: -65.2995, peso: 16, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'NOA', subdivision: 'Santiago del Estero', localidad: 'Santiago del Estero', lat: -27.7951, lon: -64.2615, peso: 16, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'NOA', subdivision: 'Catamarca', localidad: 'San Fernando del Valle', lat: -28.4696, lon: -65.7852, peso: 9, radio: 0.025 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'NOA', subdivision: 'La Rioja', localidad: 'La Rioja', lat: -29.4131, lon: -66.8558, peso: 9, radio: 0.025 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Cuyo', subdivision: 'Mendoza', localidad: 'Mendoza Capital', lat: -32.8895, lon: -68.8458, peso: 48, radio: 0.04 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Cuyo', subdivision: 'San Juan', localidad: 'San Juan', lat: -31.5375, lon: -68.5364, peso: 18, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Cuyo', subdivision: 'San Luis', localidad: 'San Luis', lat: -33.3017, lon: -66.3378, peso: 12, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Patagonia', subdivision: 'Río Negro', localidad: 'General Roca', lat: -39.0333, lon: -67.5833, peso: 14, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Patagonia', subdivision: 'Río Negro', localidad: 'San Carlos de Bariloche', lat: -41.1335, lon: -71.3103, peso: 12, radio: 0.035 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Patagonia', subdivision: 'Neuquén', localidad: 'Neuquén Capital', lat: -38.9516, lon: -68.0591, peso: 26, radio: 0.035 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Patagonia', subdivision: 'Chubut', localidad: 'Comodoro Rivadavia', lat: -45.8641, lon: -67.4966, peso: 16, radio: 0.035 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Patagonia', subdivision: 'Chubut', localidad: 'Trelew', lat: -43.2489, lon: -65.3051, peso: 10, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Patagonia', subdivision: 'Santa Cruz', localidad: 'Río Gallegos', lat: -51.6226, lon: -69.2181, peso: 8, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Patagonia', subdivision: 'Tierra del Fuego', localidad: 'Ushuaia', lat: -54.8019, lon: -68.303, peso: 6, radio: 0.03 },
  { pais: 'Argentina', paisCode: 'ARG', region: 'Patagonia', subdivision: 'La Pampa', localidad: 'Santa Rosa', lat: -36.6167, lon: -64.2833, peso: 10, radio: 0.03 },

  // ---------------- URUGUAY ----------------
  { pais: 'Uruguay', paisCode: 'URY', region: 'Sur', subdivision: 'Montevideo', localidad: 'Montevideo', lat: -34.9011, lon: -56.1645, peso: 60, radio: 0.04 },
  { pais: 'Uruguay', paisCode: 'URY', region: 'Sur', subdivision: 'Canelones', localidad: 'Ciudad de la Costa', lat: -34.8167, lon: -55.95, peso: 14, radio: 0.03 },
  { pais: 'Uruguay', paisCode: 'URY', region: 'Este', subdivision: 'Maldonado', localidad: 'Maldonado', lat: -34.9086, lon: -54.9584, peso: 10, radio: 0.03 },
  { pais: 'Uruguay', paisCode: 'URY', region: 'Litoral', subdivision: 'Paysandú', localidad: 'Paysandú', lat: -32.3214, lon: -58.0756, peso: 6, radio: 0.025 },
  { pais: 'Uruguay', paisCode: 'URY', region: 'Litoral', subdivision: 'Salto', localidad: 'Salto', lat: -31.3833, lon: -57.9667, peso: 6, radio: 0.025 },

  // ---------------- CHILE ----------------
  { pais: 'Chile', paisCode: 'CHL', region: 'Metropolitana', subdivision: 'Región Metropolitana', localidad: 'Santiago', lat: -33.4489, lon: -70.6693, peso: 55, radio: 0.04 },
  { pais: 'Chile', paisCode: 'CHL', region: 'Valparaíso', subdivision: 'Valparaíso', localidad: 'Valparaíso', lat: -33.0472, lon: -71.6127, peso: 14, radio: 0.03 },
  { pais: 'Chile', paisCode: 'CHL', region: 'Biobío', subdivision: 'Biobío', localidad: 'Concepción', lat: -36.827, lon: -73.0503, peso: 10, radio: 0.03 },
  { pais: 'Chile', paisCode: 'CHL', region: 'Antofagasta', subdivision: 'Antofagasta', localidad: 'Antofagasta', lat: -23.6509, lon: -70.3975, peso: 7, radio: 0.03 },
  { pais: 'Chile', paisCode: 'CHL', region: 'Los Lagos', subdivision: 'Los Lagos', localidad: 'Puerto Montt', lat: -41.4693, lon: -72.9424, peso: 5, radio: 0.03 },

  // ---------------- PARAGUAY ----------------
  { pais: 'Paraguay', paisCode: 'PRY', region: 'Central', subdivision: 'Asunción', localidad: 'Asunción', lat: -25.2637, lon: -57.5759, peso: 120, radio: 0.035 },
  { pais: 'Paraguay', paisCode: 'PRY', region: 'Central', subdivision: 'Central', localidad: 'Ciudad del Este', lat: -25.5163, lon: -54.6156, peso: 40, radio: 0.03 },
  { pais: 'Paraguay', paisCode: 'PRY', region: 'Central', subdivision: 'Central', localidad: 'San Lorenzo', lat: -25.3397, lon: -57.5089, peso: 34, radio: 0.03 },
  { pais: 'Paraguay', paisCode: 'PRY', region: 'Central', subdivision: 'Central', localidad: 'Luque', lat: -25.2667, lon: -57.4833, peso: 24, radio: 0.03 },
  { pais: 'Paraguay', paisCode: 'PRY', region: 'Itapúa', subdivision: 'Itapúa', localidad: 'Encarnación', lat: -27.3306, lon: -55.8667, peso: 18, radio: 0.03 },
  { pais: 'Paraguay', paisCode: 'PRY', region: 'Alto Paraná', subdivision: 'Alto Paraná', localidad: 'Hernandarias', lat: -25.4056, lon: -54.6383, peso: 10, radio: 0.025 },
];

export const PAISES = ['Argentina', 'Uruguay', 'Chile', 'Paraguay'] as const;
export type PaisNombre = (typeof PAISES)[number];

/** Encuadre inicial: Argentina predominante, con UY/CL/PY visibles. */
export const INITIAL_BOUNDS: [[number, number], [number, number]] = [
  [-76.5, -56.5],
  [-52.0, -20.5],
];

const byLocalidad = new Map(LOCALIDADES.map((l) => [l.localidad.toLowerCase(), l]));
const bySubdivision = new Map<string, Localidad>();
for (const l of LOCALIDADES) {
  if (!bySubdivision.has(l.subdivision.toLowerCase())) bySubdivision.set(l.subdivision.toLowerCase(), l);
}

export function lookupLocalidad(name: string): Localidad | undefined {
  if (!name) return undefined;
  return byLocalidad.get(name.trim().toLowerCase());
}

export function lookupSubdivision(name: string): Localidad | undefined {
  if (!name) return undefined;
  return bySubdivision.get(name.trim().toLowerCase());
}

/**
 * Tabla configurable sociedad/estructura -> zona. Fallback #2 de la importación.
 * Editable sin tocar el resto del código.
 */
export const SOCIEDAD_ZONA: Record<string, string> = {
  'telecom argentina sa (a001)': 'CABA - Microcentro',
  'telecom argentina sa': 'CABA - Microcentro',
  'nucleo s.a.e. (p001)': 'Asunción',
  'nucleo sae': 'Asunción',
  'personal paraguay': 'Asunción',
  'tma': 'CABA - Barracas',
  'telecom uruguay': 'Montevideo',
  'telecom chile': 'Santiago',
};

export function lookupSociedadZona(sociedad: string): Localidad | undefined {
  const z = SOCIEDAD_ZONA[(sociedad || '').trim().toLowerCase()];
  return z ? lookupLocalidad(z) : undefined;
}
