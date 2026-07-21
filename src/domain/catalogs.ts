/** Todos los nombres son ficticios y no corresponden a personas reales. */
export const NOMBRES_M = [
  'AGUSTIN', 'BRUNO', 'CIRO', 'DAMIAN', 'ELIAS', 'FACUNDO', 'GASTON', 'HERNAN',
  'IGNACIO', 'JOAQUIN', 'KEVIN', 'LEANDRO', 'MATIAS', 'NAHUEL', 'OSVALDO',
  'PATRICIO', 'RAMIRO', 'SANTIAGO', 'TOMAS', 'ULISES', 'VALENTIN', 'WALTER',
  'EZEQUIEL', 'FEDERICO', 'GONZALO', 'JULIAN', 'LUCIANO', 'MARTIN', 'NICOLAS',
];

export const NOMBRES_F = [
  'AGOSTINA', 'BELEN', 'CAMILA', 'DELFINA', 'ELENA', 'FLORENCIA', 'GABRIELA',
  'HELENA', 'IARA', 'JAZMIN', 'KARINA', 'LUCIA', 'MICAELA', 'NOELIA', 'ORIANA',
  'PAULA', 'ROMINA', 'SOFIA', 'TAMARA', 'VALERIA', 'WANDA', 'XIMENA', 'YAMILA',
  'ZOE', 'ANTONELLA', 'BRENDA', 'CANDELA', 'DAIANA', 'EMILIA', 'JULIETA',
];

export const NOMBRES_X = ['ALEX', 'ARIEL', 'CRUZ', 'IVAN', 'MILAN', 'REN', 'YAEL'];

export const APELLIDOS = [
  'ACOSTA', 'BENITEZ', 'CABRERA', 'DIAZ', 'ESCOBAR', 'FIGUEROA', 'GIMENEZ',
  'HERRERA', 'IBARRA', 'JUAREZ', 'KRAUSE', 'LEDESMA', 'MALDONADO', 'NAVARRO',
  'OJEDA', 'PAZ', 'QUIROGA', 'RIVERO', 'SOSA', 'TEVEZ', 'URRUTIA', 'VILLALBA',
  'ZALAZAR', 'ARANDA', 'BUSTOS', 'CORIA', 'DUARTE', 'ESQUIVEL', 'FRANCO',
  'GAUNA', 'HEREDIA', 'IRALA', 'LAGOS', 'MOLINA', 'NUÑEZ', 'ORTIZ', 'PERALTA',
  'RAMALLO', 'SAAVEDRA', 'TOLEDO', 'VEGA', 'ZARATE', 'ALTAMIRANO', 'BARRIOS',
];

export const GENEROS = ['Hombre', 'Mujer', 'No binario'] as const;
export const GENERO_PESOS = [58, 40, 2];

export const FAMILIAS_FUNCION = [
  'COLABORADOR', 'ESPECIALISTA', 'JEFATURA', 'GERENCIA', 'DIRECCION', 'SOPORTE',
];
export const FAMILIA_PESOS = [58, 20, 10, 6, 1, 5];

export const GRUPOS_PERSONAL = [
  'CONTRIBUIDOR INDIVIDUAL', 'MANDO MEDIO', 'CONDUCCION', 'TECNICO OPERATIVO',
];
export const GRUPO_PESOS = [62, 18, 5, 15];

export const AREAS_ACTIVIDAD = [
  'Convenios (13)', 'Redes y Operaciones (04)', 'Atención al Cliente (07)',
  'Comercial y Ventas (02)', 'Tecnología e IT (05)', 'Capital Humano (11)',
  'Finanzas y Administración (09)', 'Legales y Regulatorio (12)',
  'Marketing y Producto (03)', 'Logística y Supply (10)',
];

export const ESPECIALIDADES: Record<string, string[]> = {
  'Convenios (13)': ['Seguimiento de Obras (13-39)', 'Instalaciones (13-12)', 'Mantenimiento Planta (13-05)'],
  'Redes y Operaciones (04)': ['Core Móvil (04-01)', 'Acceso HFC (04-07)', 'Fibra Óptica (04-11)', 'NOC (04-22)'],
  'Atención al Cliente (07)': ['Contact Center (07-03)', 'Backoffice Postventa (07-08)', 'Retención (07-14)'],
  'Comercial y Ventas (02)': ['Canal Presencial (02-04)', 'Ventas B2B (02-09)', 'Canal Digital (02-16)'],
  'Tecnología e IT (05)': ['Desarrollo (05-02)', 'Infraestructura Cloud (05-08)', 'Ciberseguridad (05-15)', 'Datos e IA (05-21)'],
  'Capital Humano (11)': ['Cultura y EX (11-04)', 'Comunicación Interna (11-06)', 'Compensaciones (11-10)', 'Desarrollo Organizacional (11-13)'],
  'Finanzas y Administración (09)': ['Planeamiento (09-02)', 'Contabilidad (09-05)', 'Tesorería (09-11)'],
  'Legales y Regulatorio (12)': ['Regulatorio (12-03)', 'Contratos (12-07)'],
  'Marketing y Producto (03)': ['Producto Móvil (03-05)', 'Brand (03-09)', 'Pricing (03-12)'],
  'Logística y Supply (10)': ['Compras (10-02)', 'Almacenes (10-06)', 'Flota (10-09)'],
};

export const TITULOS_PUESTO = [
  'Oficial Superior', 'Analista Senior', 'Analista Semi Senior', 'Analista Junior',
  'Técnico Especializado', 'Especialista', 'Jefe de Sección', 'Gerente de Área',
  'Coordinador', 'Referente Técnico', 'Supervisor Operativo', 'Consultor Interno',
];

export interface SociedadCat {
  sociedad: string;
  pais: string;
  empresa: 'Personal' | 'TMA' | 'Personal Paraguay';
  peso: number;
}

export const SOCIEDADES: SociedadCat[] = [
  { sociedad: 'Telecom Argentina SA (A001)', pais: 'ARG/01-Argentina', empresa: 'Personal', peso: 88 },
  { sociedad: 'Telecom Argentina Servicios SA (A014)', pais: 'ARG/01-Argentina', empresa: 'Personal', peso: 6 },
  { sociedad: 'Telecom Uruguay SA (U001)', pais: 'URY/03-Uruguay', empresa: 'Personal', peso: 3 },
  { sociedad: 'Telecom Chile SpA (C001)', pais: 'CHL/04-Chile', empresa: 'Personal', peso: 3 },
  { sociedad: 'TMA Servicios SA (T001)', pais: 'ARG/01-Argentina', empresa: 'TMA', peso: 90 },
  { sociedad: 'TMA Operaciones SRL (T004)', pais: 'ARG/01-Argentina', empresa: 'TMA', peso: 7 },
  { sociedad: 'TMA Uruguay SA (U008)', pais: 'URY/03-Uruguay', empresa: 'TMA', peso: 3 },
  { sociedad: 'Núcleo SAE (P001)', pais: 'PRY/02-Paraguay', empresa: 'Personal Paraguay', peso: 100 },
];

export const PAIS_CODE_FROM_LABEL: Record<string, 'ARG' | 'URY' | 'CHL' | 'PRY'> = {
  'ARG/01-Argentina': 'ARG',
  'PRY/02-Paraguay': 'PRY',
  'URY/03-Uruguay': 'URY',
  'CHL/04-Chile': 'CHL',
};

export const UNIDADES_ORG_SUFIJOS = ['', ' 1', ' 2', ' 3', ' NORTE', ' SUR', ' CENTRO'];
