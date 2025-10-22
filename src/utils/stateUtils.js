// src/utils/stateUtils.js
import { UNITS } from '../data';

// --- MOVED FROM CalculatorPage.jsx ---
// Converts a value from a given unit to the base SI unit for that category
export const convertToBase = (value, unit, category) => {
    if (value === null || value === undefined || value === '' || !unit || !category || !UNITS[category] || !UNITS[category][unit]) {
        return NaN; // Return Not a Number for invalid inputs
    }
    const factor = UNITS[category][unit];
    const numValue = Number(value);
    if (isNaN(numValue)) return NaN; // Ensure input is a number

    if (typeof factor === 'function') { // Handle special conversions like temperature
        if (category === 'temperature') return factor(numValue); // Specific temp conversion (e.g., F to K)
        return numValue * factor; // For tempDelta, factor is just a multiplier
    }
    return numValue * factor; // Standard multiplier conversion
}
// --- END MOVED FUNCTION ---

// Initializes the input state for a single calculator definition
export const initializeInputState = (inputs) => {
  const state = {};
  if (!Array.isArray(inputs)) {
    console.error("initializeInputState received invalid inputs:", inputs);
    return state;
  }
  inputs.forEach(input => {
    if (input && input.id && input.unit && UNITS[input.unit] && Object.keys(UNITS[input.unit]).length > 0) {
      const defaultUnit = Object.keys(UNITS[input.unit])[0];
      state[input.id] = {
        value: input.defaultVal !== undefined ? String(input.defaultVal) : '',
        unit: defaultUnit
      };
    } else {
      console.warn(`Skipping initialization for invalid input definition:`, input);
    }
  });
  return state;
};

// Initializes the output units state for a single calculator definition
export const initializeOutputUnits = (outputDef) => {
    const unitsState = {};
    if (!outputDef) return unitsState; // Handle missing output definition

    if (outputDef.isObject && outputDef.keys) {
        Object.entries(outputDef.keys).forEach(([key, keyData]) => {
            const category = keyData.unit;
            if (category && UNITS[category] && Object.keys(UNITS[category]).length > 0) {
                unitsState[key] = Object.keys(UNITS[category])[0];
            } else {
                 unitsState[key] = '';
            }
        });
    } else if (!outputDef.isObject) {
        const category = outputDef.unit;
         if (category && UNITS[category] && Object.keys(UNITS[category]).length > 0) {
            unitsState['main'] = Object.keys(UNITS[category])[0];
        } else {
             unitsState['main'] = '';
        }
    }
    return unitsState;
};

// Initializes the entire state structure for all calculators
export const initializeAllCalculatorStates = (calculators) => {
    const initialState = {};
    calculators.forEach(calc => {
        const initialVariantName = calc.variants?.[0]?.name ?? null;
        const inputsForInit = initialVariantName
            ? calc.variants.find(v => v.name === initialVariantName)?.inputs
            : calc.inputs;

        initialState[calc.id] = {
            variant: initialVariantName,
            inputs: initializeInputState(inputsForInit ?? []),
            outputUnits: initializeOutputUnits(calc.output)
        };
    });
    return initialState;
};