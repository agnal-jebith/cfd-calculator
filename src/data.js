// src/data.js

/* --- UNIT CONVERSIONS --- */
// Base unit for all calculations is SI
export const UNITS = {
  length: {
    m: 1.0,
    mm: 1e-3,
    in: 0.0254,
    ft: 0.3048,
  },
  area: {
    'm²': 1.0,       
    'mm²': 1e-6,     
    'in²': 6.4516e-4, 
    'ft²': 0.09290304,
  },
  volume: {
    'm³': 1.0,        
    'mm³': 1e-9,      
    'in³': 1.6387064e-5, 
    'ft³': 0.028316846592,
  },
  pressure: {
    Pa: 1.0,
    kPa: 1e3,
    psi: 6894.75729316836,
    bar: 1e5,
    atm: 1.01325e5,
  },
  temperature: {
    K: (K) => K, // Base unit
    C: (C) => C + 273.15,
    F: (F) => (F + 459.67) * (5 / 9),
  },
  tempDelta: { // For temperature differences (Tw - Tb)
    K: 1.0,
    C: 1.0,
    F: 5 / 9,
  },
  density: {
    'kg/m³': 1.0,  
    'g/cm³': 1e3, 
  },
  dynamicViscosity: {
    'kg/m·s': 1.0, 
    cP: 1e-3,
  },
  kinematicViscosity: {
    'm²/s': 1.0,     
    cSt: 1e-6,
  },
  flowRate: {
    'US gal/min': 6.30901964e-5,
    'm³/s': 1.0,      
    lpm: 1.66666666666667e-5,
    cfm: 4.719474432e-4,
  },
  // Only SI units for these categories
  velocity: {
    'm/s': 1.0,
  },
  force: {
    N: 1.0,
  },
  specificHeat: {
    'J/kg·K': 1.0,
  },
  thermalConductivity: {
    'W/m·K': 1.0,
  },
  molarMass: {
    'kg/mol': 1.0,
  },
  time: {
    s: 1.0,
  },
  generic: { // For dimensionless numbers
    '--': 1.0, // Represents dimensionless
  },
};
/* --- CONSTANTS & PROPERTIES --- */
export const CONSTANTS = {
  g: 9.80665, // Standard earth gravity, m/s^2
  P_sea: 1.01325e5, // Standard atmospheric pressure, Pa
  T_sea: 288.15, // Standard sea level temperature, K
  kB: 1.380649e-23, // Boltzman constant, J/K
  R: 8.31446261815324 , // Gas constant, J/K·mol
  rho_water_ref: 999.975, // Reference water density for Cv, kg/m^3
};

export const FLUID_PROPERTIES = {
  air: {
    d: 3.64e-10,
    rho: 1.225,
    mu: 1.7894e-5,
    gamma: 1.4,
    m: 0.02801348,
    Cp: 1006.43,
    K: 0.0242,
  },
  water: {
    rho: 999.102621467,
    mu: 1.13756755925e-3,
    Ks: 2.147020787517e9,
    Cp: 4188.46062263,
    K: 0.588801733892,
  },
};

/* --- CALCULATOR DEFINITIONS --- */
export const CALCULATORS = [
  {
    id: 'hydraulicDiameter',
    name: 'Hydraulic Diameter',
    title: 'Hydraulic Diameter',
    description: 'The hydraulic diameter is used to represent the equivalent diameter of fluid flow in tubes and channels that have non circular shape.',
    variants: [
      {
        name: 'Annulus',
        inputs: [
          { id: 'D_outer', label: 'Outer Diameter', unit: 'length', validation: {minExclusive: 0}, defaultVal: 1.0 },
          { id: 'D_inner', label: 'Inner Diameter', unit: 'length', validation: {minExclusive: 0}, defaultVal: 0.5 },
        ],
        formula: ({ D_outer, D_inner }) => 
            {
                if (D_outer <= D_inner) {
                    return NaN;
                }
                return D_outer - D_inner;
            },
        },
      {
        name: 'Rectangular Duct',
        inputs: [
          { id: 'width', label: 'Width of the duct', unit: 'length', validation: {minExclusive: 0},defaultVal: 1.0 },
          { id: 'height', label: 'Height of the duct', unit: 'length', validation: {minExclusive: 0}, defaultVal: 0.5 },
        ],
        formula: ({ width, height }) => (2 * width * height) / (width + height),
      },
      {
        name: 'Others',
        inputs: [
          { id: 'area', label: 'Cross sectional area', unit: 'area', validation: {minExclusive: 0}, defaultVal: 1.0 },
          { id: 'perimeter', label: 'Wetted perimeter', unit: 'length', validation: {minExclusive: 0}, defaultVal: 4.0 },
        ],
        formula: ({ area, perimeter }) => (4 * area) / perimeter,
      },
    ],
    output: { unit: 'length' },
    footnotes: ['For fluid flow in a square duct, the length of the side is the hydraulic diameter.'],
  },
  {
    id: 'knudsenNumber',
    name: 'Knudsen Number',
    title: 'Knudsen Number (Kn)',
    description: 'The Knudsen number helps decide whether to use statistical or continuum mechanics to model fluid flow in a specific situation.',
    inputs: [
      { id: 'T', label: 'Temperature', unit: 'temperature', defaultVal: CONSTANTS.T_sea },
      { id: 'd', label: 'Kinetic diameter', unit: 'length', defaultVal: FLUID_PROPERTIES.air.d, validation: {minExclusive: 0} },
      { id: 'P', label: 'Static pressure', unit: 'pressure', defaultVal: CONSTANTS.P_sea, validation: {minExclusive: 0} },
      { id: 'L', label: 'Characteristic length', unit: 'length', defaultVal: 1.0, validation: {minExclusive: 0} },
    ],
    formula: ({ T, d, P, L }) => (CONSTANTS.kB * T) / (Math.sqrt(2) * Math.PI * d ** 2 * P * L),
    output: { unit: 'generic' },
    interpretations: [
      { value: 0.01, text: 'Continuum Flow (Kn < 0.01)' },
      { value: 0.1, text: 'Slip Flow (0.01 < Kn < 0.1)' },
      { value: 10, text: 'Transitional Flow (0.1 < Kn < 10)' },
      { value: Infinity, text: 'Free Molecular Flow (Kn > 10)' },
    ],
  },
  {
    id: 'reynoldsNumber',
    name: 'Reynolds Number',
    title: 'Reynolds Number (Re)',
    description: 'The Reynolds number is used to characterise the fluids flow regime.',
    inputs: [
      { id: 'rho', label: 'Fluid density', unit: 'density', defaultVal: FLUID_PROPERTIES.air.rho, validation:{minExclusive: 0} },
      { id: 'u', label: 'Freestream velocity', unit: 'velocity', validation: {minExclusive: 0}, defaultVal: 1.0 },
      { id: 'L', label: 'Characteristic length', unit: 'length', validation: {minExclusive: 0}, defaultVal: 1.0 },
      { id: 'mu', label: 'Dynamic viscosity', unit: 'dynamicViscosity', defaultVal: FLUID_PROPERTIES.air.mu, validation:{minExclusive: 0} },
    ],
formula: ({ rho, u, L, mu }) => {
      // Ensure inputs are valid numbers and mu/rho are not zero for division
      if (isNaN(rho) || isNaN(u) || isNaN(L) || isNaN(mu) || mu === 0 || rho === 0) {
        return {
             'Reynolds Number (Re)': NaN,
             'Kinematic Viscosity (ν)': NaN,
             'Entrance Length (Le)': NaN
            }; // Return NaN for all if inputs invalid
      }

      const Re = (rho * u * L) / mu;
      const nu = mu / rho; // Kinematic Viscosity

      let Le; // Hydrodynamic Entrance Length
      if (Re < 2000) { // Laminar
        Le = 0.06 * Re * L; //
      } else { // Transitional & Turbulent (Re >= 2000)
        Le = 4.4 * Math.pow(Re, 1/6) * L; //
      }

      // Return results as an object
      return {
        'Reynolds Number (Re)': Re,
        'Kinematic Viscosity (ν)': nu,
        'Entrance Length (Le)': Le,
      };
    },
    // Specify the output is an object and define units/categories for each key
    output: {
        isObject: true, // Indicates multiple results in an object
        // Define details for each key in the returned object
        keys: {
            'Reynolds Number (Re)': { unit: 'generic', label: 'Reynolds Number (Re)' },
            'Kinematic Viscosity (ν)': { unit: 'kinematicViscosity', label: 'Kinematic Viscosity' },
            'Entrance Length (Le)': { unit: 'length', label: 'Hydrodynamic Entrance Length ', tooltip: 'Length for flow to become fully developed in a pipe'}
        }
    },
 
    interpretations: [
      { value: 2000, text: 'For flow in a pipe: Flow Regime is Laminar (Re < 2000)' },
      { value: 4000, text: 'For flow in a pipe: Flow Regime is Transitional (2000 < Re < 4000)' },
      { value: Infinity, text: 'For flow in a pipe: Flow Regime is Turbulent (Re > 4000)' },
    ],
  },
  {
    id: 'machNumber',
    name: 'Mach Number',
    title: 'Mach Number (M)',
    description: 'Ratio of flow/object velocity to the speed of sound in the flow medium.',
variants: [
    {
        name: 'Gas',
        inputs: [
            {id: 'V', label: 'Flow/Object velocity', unit: 'velocity', validation: {minExclusive: 0}, defaultVal: 1.0 },
            {id: 'gamma', label: 'Specific heat ratio (γ)', unit: 'generic', defaultVal: FLUID_PROPERTIES.air.gamma, validation: {minExclusive: 0} },
            {id: 'T', label: 'Temperature', unit: 'temperature', defaultVal: CONSTANTS.T_sea },
            {id: 'm', label: 'Molar mass', unit: 'molarMass', defaultVal: FLUID_PROPERTIES.air.m, validation: {minExclusive: 0} },
        ],
        formula: ({ V, gamma, T, m }) => {
            if (isNaN(V) || isNaN(gamma) || isNaN(T) || isNaN(m) || gamma <= 0 || CONSTANTS.R <= 0 || !CONSTANTS.R) {
              return { 'Mach Number (M)': NaN, 'Speed of Sound': NaN };
          }
            //Speed of sound formula for gas: a = sqrt(γ * R * T / m)
            const a = Math.sqrt(gamma * (CONSTANTS.R / m) * T);
    if (a === 0 || isNaN(a)) {
              return { 'Mach Number (M)': NaN, 'Speed of Sound': a };
        }
        const M = V / a;
        return { 'Mach Number (M)': M, 'Speed of Sound': a };
      },
    },
    {
     name: 'Liquid',
        inputs: [
            {id: 'V', label: 'Flow/Object velocity', unit: 'velocity', validation: {minExclusive: 0}, defaultVal: 1.0 },
            {id: 'Ks', label: 'Isentropic Bulk Modulus', unit: 'pressure', defaultVal: FLUID_PROPERTIES.water.Ks, validation: {minExclusive: 0} },
            {id: 'rho', label: 'Density (ρ)', unit: 'density', defaultVal: FLUID_PROPERTIES.water.rho, validation:{minExclusive: 0} },
            ],
        formula: ({ V, Ks, rho }) => {
            if (isNaN(V) || isNaN(Ks) || isNaN(rho) || Ks <= 0 || rho <= 0) {
              return { 'Mach Number (M)': NaN, 'Speed of Sound': NaN };
            }
            //Speed of sound formula for liquid: a = sqrt(Ks / ρ)
            const a = Math.sqrt(Ks / rho);
            if (a === 0 || isNaN(a)) {
              return { 'Mach Number (M)': NaN, 'Speed of Sound': a
                          };
            }
            const M = V / a;
            return { 'Mach Number (M)': M, 'Speed of Sound': a }; 
        },
    },
],

    output: { 
      isObject: true,
      keys: { 
      'Mach Number (M)': { unit: 'generic', label: 'Mach Number (M)' },
      'Speed of Sound': { unit: 'velocity', label: 'Speed of Sound' }
    }},
    interpretations: [
      { value: 0.3, text: 'Incompressible Flow (M < 0.3)' },
      { value: 1, text: 'Compressible Subsonic Flow (M < 1)' },
      { value: 5, text: 'Supersonic Flow (1 < M < 5)' },
      { value: Infinity, text: 'Hypersonic Flow (M > 5)' },
    ],

  },
  {
    id: 'rayleighNumber',
    name: 'Rayleigh Number',
    title: 'Rayleigh Number (Ra)',
    description: 'In a natural convection flow, Rayleigh number predicts whether the flow will be turbulent or not.',
    inputs: [
      { id: 'rho', label: 'Gas density', unit: 'density', defaultVal: FLUID_PROPERTIES.air.rho, validation: {minExclusive: 0} },
      { id: 'L', label: 'Characteristic length', unit: 'length', validation: {minExclusive: 0}, defaultVal: 1.0 },
      { id: 'Cp', label: 'Gas Specific heat capacity (Cp)', tooltip: 'Specific heat capcity of gas at constant Pressure', unit: 'specificHeat', defaultVal: FLUID_PROPERTIES.air.Cp, validation: {minExclusive: 0} },
      { id: 'Tw', label: 'Wall temperature ', unit: 'temperature', tooltip: 'Hotter Temperature', defaultVal: CONSTANTS.T_sea + 10 },
      { id: 'Tinf', label: 'Bulk fluid temperature', unit: 'temperature', tooltip: 'Colder Temperature', defaultVal: CONSTANTS.T_sea },
      { id: 'mu', label: 'Gas dynamic viscosity', unit: 'dynamicViscosity', defaultVal: FLUID_PROPERTIES.air.mu, validation: {minExclusive: 0} },
      { id: 'K', label: 'Gas thermal conductivity', unit: 'thermalConductivity', defaultVal: FLUID_PROPERTIES.air.K, validation: {minExclusive: 0} },
    ],
    // Ra = 2 * ρ^2 * L^3 * g * Cp * (Tw – T∞) / (µ * K * (Tw + T∞))
    formula: ({ rho, L, Cp, Tw, Tinf, mu, K }) =>
      (2 * rho ** 2 * L ** 3 * CONSTANTS.g * Cp * (Tw - Tinf)) / (mu * K * (Tw + Tinf)),
    output: { unit: 'generic' },
    footnotes: ['Above Rayliegh number calculation is based on ideal gas assumption.'],
  },
  {
    id: 'brinkmanNumber',
    name: 'Brinkman Number',
    title: 'Brinkman Number (Br)',
    description: 'Helps determine if the viscous dissipation effects are significant in a flow',
    inputs: [
      { id: 'mu', label: 'Dynamic viscosity', unit: 'dynamicViscosity', validation: {minExclusive: 0}, defaultVal: FLUID_PROPERTIES.air.mu },
      { id: 'u', label: 'Freestream velocity', unit: 'velocity', validation: {minExclusive: 0}, defaultVal: 1.0 },
      { id: 'K', label: 'Thermal conductivity', unit: 'thermalConductivity', validation: {minExclusive: 0}, defaultVal: FLUID_PROPERTIES.air.K },
      { id: 'Tw', label: 'Wall temperature (hot)', unit: 'temperature', tooltip: 'Hotter Temperature', defaultVal: CONSTANTS.T_sea + 10 },
      { id: 'Tinf', label: 'Bulk fluid temperature', unit: 'temperature', tooltip: 'Colder Temperature', defaultVal: CONSTANTS.T_sea },
    ],
    formula: ({ mu, u, K, Tw, Tinf }) => (mu * u ** 2) / (K * (Tw - Tinf)),
    output: { unit: 'generic' },
    footnotes: ['When Br ≥ 1, viscous dissipation is significant.'],
  },
  {
    id: 'timeStepSize',
    name: 'Time Step Size',
    title: 'Time Step Size',
    description: 'Estimate the time step size for a 3D simulation, for a given Courant and Acoustic Courant numbers.',
inputs: [
      { id: 'C', label: 'Courant/Acoustic Courant number', unit: 'generic', defaultVal: 1.0, validation: {minExclusive: 0} },
  //    { id: 'Ca', label: 'Acoustic Courant number (Ca)', unit: 'generic', defaultVal: 1.0, validation: {minExclusive: 0} },
      { id: 'Vol', label: 'Fluid domain volume', unit: 'volume', validation: {minExclusive: 0}, defaultVal: 1.0 },
      { id: 'N', label: 'Number of fluid mesh cells', unit: 'generic', validation: {minExclusive:0}, defaultVal: 10000.0 },
      { id: 'u', label: 'Flow velocity', unit: 'velocity', validation: {minExclusive: 0}, defaultVal: 1.0 },
      { id: 'a', label: 'Speed of sound', unit: 'velocity', defaultVal: 0, tooltip:'Required only for time step size calculation for Acoustic Courant number' },
    ],
// Calculate both results in the formula
    formula: ({ C, Vol, N, u, a }) => {
       // Basic validation
       if (isNaN(C) || isNaN(Vol) || isNaN(N) || isNaN(u) || isNaN(a) || N <= 0 || u === 0 || (u + a) === 0) {
            return {
                'Δt (Courant)': NaN,
                'Δt (Acoustic)': NaN,
            };
       }

      const meanCellSize = Math.pow(Vol / N, 1/3); // (Vol / N)^(1/3)

      const dt_Courant = (C * meanCellSize) / u; 
      const dt_Acoustic = (C * meanCellSize) / (u + a); 

      return {
        'Δt (Courant)': dt_Courant,
        'Δt (Acoustic)': dt_Acoustic,
      };
    },
    
output: {
        isObject: true,
        keys: {
            'Δt (Courant)': { unit: 'time', label: 'Time step size (Courant Number)' }, // Unit is time (seconds) but 'generic' used for number display
            'Δt (Acoustic)': { unit: 'time', label: 'Time step size (Acoustic Courant Number)'} // Unit is time (seconds)
        },
    },
    footnotes: [
      'Assumed fluid mesh cells as cubes for the calculation.',
      'Speed of sound can be calculated from the mach number calculation tab.',
    ],
  },
  {
    id: 'dragCoefficient',
    name: 'Drag Coefficient',
    title: 'Drag Coefficient (Cd)',
    description: 'Drag Coefficient Quantifies the drag of an object in the fluid.',
    inputs: [
      { id: 'Fd', label: 'Drag force', unit: 'force', validation: {minExclusive: 0}, defaultVal: 2000.0 },
      { id: 'rho', label: 'Fluid density', unit: 'density', validation: {minExclusive: 0}, defaultVal: FLUID_PROPERTIES.air.rho },
      { id: 'u', label: 'Velocity of object', unit: 'velocity', validation: {minExclusive: 0}, defaultVal: 100.0 },
      { id: 'A', label: 'Reference area', unit: 'area', validation: {minExclusive: 0}, defaultVal: 1.0 },
    ],
    formula: ({ Fd, rho, u, A }) => (2 * Fd) / (rho * u ** 2 * A),
    output: { unit: 'generic' },
  },
  {
    id: 'flowCoefficient',
    name: 'Flow Coefficient',
    title: 'Flow Coefficient (Cv)',
    description: 'Cv is an relative measure of a device\'s efficiency to allow liquid flow.',
    inputs: [
      { id: 'Q', label: 'Flow rate', unit: 'flowRate', validation: {minExclusive: 0}, defaultVal: 1 },
      { id: 'rho', label: 'Fluid density', unit: 'density', validation: {minExclusive: 0}, defaultVal: FLUID_PROPERTIES.water.rho },
      { id: 'P1', label: 'Upstream pressure', unit: 'pressure', defaultVal: 2e5 },
      { id: 'P2', label: 'Downstream pressure', unit: 'pressure', defaultVal: CONSTANTS.P_sea },
    ],
    formula: ({ Q, rho, P1, P2 }) => {
      const Q_gpm = Q / UNITS.flowRate['US gal/min'];
      const dP_psi = (P1 - P2) / UNITS.pressure.psi;
      if (dP_psi <= 0) return 0;
      const SG = rho / CONSTANTS.rho_water_ref;
      return Q_gpm * Math.sqrt(SG / dP_psi);
    },
    output: { unit: 'generic' },
  },
  {
    id: 'firstCellHeight',
    name: 'First Cell Height (Y+)',
    title: 'First Cell Height',
    description: 'For turbulent flows, Estimate the first cell height from a wall for the desired wall y+.',
    inputs: [
      { id: 'yPlus', label: 'Desired wall y+', unit: 'generic', defaultVal: 1.0, validation: {minExclusive: 0} },
      { id: 'L', label: 'Characteristic length', unit: 'length', validation: {minExclusive: 0}, defaultVal: 1.0 },
      { id: 'rho', label: 'Fluid density', unit: 'density', validation: {minExclusive: 0}, defaultVal: FLUID_PROPERTIES.air.rho  },
      { id: 'u', label: 'Freestream velocity', unit: 'velocity', validation: {minExclusive: 0}, defaultVal: 1.0 },
      { id: 'mu', label: 'Dynamic viscosity', unit: 'dynamicViscosity', validation: {minExclusive: 0}, defaultVal: FLUID_PROPERTIES.air.mu },
      { id: 'growthRate', label: 'Growth ratio', unit: 'generic', defaultVal: 1.3, validation: {min:1}, tooltip: 'Growth ratio input is only necessary to calculate number of cells' },
    ],
    formula: ({ yPlus, L, rho, u, mu, growthRate }) => {
      const Re = (rho * u * L) / mu;
      const thickness = 0.37 * L / (Re ** (1/5));
      console.log('Re:', Re, 'Thickness:', thickness);
      
      // Use Math.log10 for 'log'
      const logReTerm = 2 * Math.log10(Re) - 0.65;
      const firstCellHeight = (2**1.5) * yPlus * L * (logReTerm**1.15) / Re;

      let numCells;
      if (growthRate === 1) {
        numCells = Math.ceil(thickness / firstCellHeight);
      } else {
        const logArg = 1 - (thickness * (1 - growthRate) / firstCellHeight);
        if (logArg <= 0) {
          numCells = 'Error: Invalid growth rate';
        } else {
          numCells = Math.ceil(Math.log(logArg) / Math.log(growthRate));
        }
      }
      // const numCellsResult = typeof CalculatednumCells === 'number' ? Math.ceil(CalculatednumCells) : CalculatednumCells;
      return {
        'Reynolds Number': Re,
        'Boundary Layer Thickness': thickness,
        'First Cell Height': firstCellHeight,
        'Number of Cells': numCells,
      };
    },
    output: {
        isObject: true,
      keys: {
        'First Cell Height': { unit: 'length', label: 'First Cell Height' },
        'Boundary Layer Thickness': { unit: 'length', label: 'Boundary Layer Thickness' },
        'Number of Cells': { unit: 'generic', label: 'Number of Cells in the Boundary Layer' },
      }
    },
  },
  {
    id: 'prandtlNumber',
    name: 'Prandtl Number',
    title: 'Prandtl Number (Pr)',
    description: 'Prandtl number Gives the relative thickness between momentum and thermal boundary layers.',
    inputs: [
      { id: 'Cp', label: 'Specific heat capacity (Cp)', tooltip: 'Specific heat capacity at constant Pressure', unit: 'specificHeat', validation: {minExclusive: 0 }, defaultVal: FLUID_PROPERTIES.air.Cp },
      { id: 'mu', label: 'Dynamic viscosity', unit: 'dynamicViscosity', validation: {minExclusive: 0}, defaultVal: FLUID_PROPERTIES.air.mu },
      { id: 'K', label: 'Thermal conductivity', unit: 'thermalConductivity', validation: {minExclusive: 0}, defaultVal: FLUID_PROPERTIES.air.K },
    ],
    formula: ({ Cp, mu, K }) => (Cp * mu) / K,
    output: { unit: 'generic' },
    interpretations: [
      { value: 1, text: 'Thermal boundary layer is thicker than momentum boundary layer (Pr < 1)' },
      { value: 1.00001, text: 'Thermal and momentum boundary layer have same thickness (Pr = 1)' }, // Use 1.00001 to handle float comparison
      { value: Infinity, text: 'Thermal boundary layer is thinner than momentum boundary layer (Pr > 1)' },
    ],
  },
];