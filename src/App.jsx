// src/App.jsx
import React, { useState, useCallback, useEffect } from 'react';
import styles from './App.module.css';
import { CALCULATORS, FLUID_PROPERTIES, UNITS } from './data'; // Import FLUID_PROPERTIES and UNITS
import CalculatorPage from './components/CalculatorPage';
import Toast from './components/Toast';
import { initializeAllCalculatorStates, initializeInputState, convertToBase } from './utils/stateUtils';

function App() {
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeCalcId, setActiveCalcId] = useState(CALCULATORS[0].id);

  // --- State for ALL calculators ---
  const [allCalculatorStates, setAllCalculatorStates] = useState(() =>
    initializeAllCalculatorStates(CALCULATORS)
  );
  // --- End State ---

  // --- Toast State ---
  const [toastMessage, setToastMessage] = useState('');
  const [isToastVisible, setIsToastVisible] = useState(false);
  // --- End Toast State ---

  // --- State for active calculator errors ---
  const [activeCalculatorErrors, setActiveCalculatorErrors] = useState({});

  const activeCalculator = CALCULATORS.find(c => c.id === activeCalcId);
  // Get the current state slice for the active calculator
  const activeCalculatorState = allCalculatorStates[activeCalcId];

  // --- Handlers ---
  const handleNavClick = (id) => {
    setActiveCalcId(id);
    setMobileNavOpen(false);
  };

  const handleResetAll = () => {
    console.log("Reset All Data clicked - resetting all states");
    setAllCalculatorStates(initializeAllCalculatorStates(CALCULATORS));
    setActiveCalculatorErrors({}); // Also clear errors
  };

  const showToast = useCallback((message) => {
    setToastMessage(message);
    setIsToastVisible(true);
  }, []);

  const handleCloseToast = () => {
      setIsToastVisible(false);
  };

const handleInputChange = (calcId, inputId, value) => {
//  console.log(`handleInputChange START: calcId=${calcId}, inputId=${inputId}, value="${value}"`);
    const calcDef = CALCULATORS.find(c => c.id === calcId);
    const currentCalcState = allCalculatorStates[calcId];
    const inputsDef = calcDef?.variants?.find(v => v.name === allCalculatorStates[calcId]?.variant)?.inputs || calcDef?.inputs;
    const inputDef = inputsDef?.find(i => i.id === inputId);
    let errorMsg = null;

    // Only perform validation if inputDef exists
    if (inputDef) {
        const numValue = Number(value); // Convert once

        // Basic check: Is it supposed to be a number but isn't (and isn't empty)?
        if (value !== '' && isNaN(numValue)) {
            // Check if the input *has* a unit category (implies it should be numeric)
            // Or if it has validation rules (also implies numeric)
            if (inputDef.unit || inputDef.validation) {
                 errorMsg = "Must be a number";
            }
        }
        // If it *is* a number (or empty), check explicit validation rules
        else if (!isNaN(numValue) && inputDef.validation) {
            // Check for min (>=)
            if (inputDef.validation.min !== undefined && numValue < inputDef.validation.min) {
                errorMsg = `Value must be >= ${inputDef.validation.min}`;
            }
            // Check for minExclusive (>)
            // Use 'else if' to avoid multiple messages for the same condition (e.g., < 0 fails both min:0 and minExclusive:0)
            else if (inputDef.validation.minExclusive !== undefined && numValue <= inputDef.validation.minExclusive) {
                errorMsg = `Value must be > ${inputDef.validation.minExclusive}`;
            }
            // Add other rules like 'max' here if needed
        }
        // --- Removed the generic negative check here - let calculateResult handle calculation errors ---
    }
   // console.log(`handleInputChange: Setting state for calcId=${calcId}, inputId=${inputId}`);
   let crossValidationError = null;
    if (calcId === 'hydraulicDiameter' && currentCalcState?.variant === 'Annulus') {
        let dOuterVal, dOuterUnit, dInnerVal, dInnerUnit;
        const dOuterState = currentCalcState.inputs['D_outer'];
        const dInnerState = currentCalcState.inputs['D_inner'];

        // Determine which input is being changed and get the peer value
        if (inputId === 'D_outer') {
            dOuterVal = Number(value); // Current input value
            dOuterUnit = dOuterState?.unit; // Unit of current input
            dInnerVal = Number(dInnerState?.value); // Value of other input
           dInnerUnit = dInnerState?.unit; // Unit of other input
        } else if (inputId === 'D_inner') {
            dInnerVal = Number(value); // Current input value
            dInnerUnit = dInnerState?.unit; // Unit of current input
            dOuterVal = Number(dOuterState?.value); // Value of other input
            dOuterUnit = dOuterState?.unit; // Unit of other input
        }

        // Only validate if both values are valid numbers
        if (!isNaN(dOuterVal) && !isNaN(dInnerVal) && dOuterUnit && dInnerUnit) {
            // Convert both values to base units (meters) before comparing
            const dOuterBase = convertToBase(dOuterVal, dOuterUnit, 'length');
            const dInnerBase = convertToBase(dInnerVal, dInnerUnit, 'length');

            if (!isNaN(dOuterBase) && !isNaN(dInnerBase) && dOuterBase <= dInnerBase) {
                crossValidationError = "Outer diameter must be greater than Inner diameter";
            }
        }
    }
    // --- End Cross-field validation ---

    // Prioritize basic error message over cross-validation error if both exist
    const finalErrorMsg = errorMsg !== null ? errorMsg : crossValidationError;

    // --- State Update (remains the same) ---
    setAllCalculatorStates(prev => ({
      ...prev,
      [calcId]: {
        ...prev[calcId],
        inputs: {
          ...prev[calcId].inputs,
          [inputId]: { ...(prev[calcId].inputs?.[inputId] || {}), value }
        }
      }
    }));
// --- MODIFIED Error State Update ---
  if (calcId === activeCalcId) {
      setActiveCalculatorErrors(prevErrors => {
          const newErrors = { ...prevErrors };

          // 1. Set/clear error for the field being changed using finalErrorMsg
          newErrors[inputId] = finalErrorMsg;

          // 2. If it's the Annulus calc, handle the *other* field
          if (calcId === 'hydraulicDiameter' && currentCalcState?.variant === 'Annulus') {
              const otherInputId = inputId === 'D_outer' ? 'D_inner' : 'D_outer';

              // Update the other field only if the current field *doesn't* have a basic error
              // (like "Must be a number"). This prevents overwriting a more specific error
              // on the other field if the cross-validation passes but then fails again.
              // Effectively, show the cross-validation error on both fields, or clear it from both
              // if the condition is met.
              if (errorMsg === null) {
                   newErrors[otherInputId] = crossValidationError;
              }
              // Optional: If the current field HAS a basic error, clear any potential
              // cross-validation error from the *other* field, as the comparison is invalid.
              else {
                  // Check if the other field's current error is the cross-validation one before clearing
                  if (newErrors[otherInputId] === "Outer diameter must be greater than Inner diameter") {
                      newErrors[otherInputId] = null;
                  }
              }
          }
          return newErrors;
      });
  }
};
const handleUnitChange = (calcId, inputId, unit) => {
    // Update the state first to reflect the new unit
    setAllCalculatorStates(prev => ({
        ...prev,
        [calcId]: {
            ...prev[calcId],
            inputs: {
                ...prev[calcId].inputs,
                [inputId]: { ...(prev[calcId].inputs?.[inputId] || {}), unit }
            }
        }
    }));

    // Now, check and clear errors, including cross-field errors
    if (calcId === activeCalcId) {
        setActiveCalculatorErrors(prevErrors => {
            const currentCalcState = allCalculatorStates[calcId]; // Get state *before* update completes visually
            const updatedInputsState = { // Simulate state *after* update for validation check
                ...currentCalcState.inputs,
                [inputId]: { ...(currentCalcState.inputs?.[inputId] || {}), unit }
            };

            const newErrors = { ...prevErrors };
            // Always clear the basic error for the input whose unit changed
            newErrors[inputId] = null;

            // --- ADDED: Re-run cross-field validation check ---
            if (calcId === 'hydraulicDiameter' && currentCalcState?.variant === 'Annulus') {
                const dOuterState = updatedInputsState['D_outer'];
                const dInnerState = updatedInputsState['D_inner'];
                const otherInputId = inputId === 'D_outer' ? 'D_inner' : 'D_outer';

                if (dOuterState && dInnerState) { // Ensure both states exist
                    const dOuterVal = Number(dOuterState.value);
                    const dOuterUnit = dOuterState.unit;
                    const dInnerVal = Number(dInnerState.value);
                    const dInnerUnit = dInnerState.unit;

                    // Only validate if both values are numbers and units are available
                    if (!isNaN(dOuterVal) && !isNaN(dInnerVal) && dOuterUnit && dInnerUnit) {
                        const dOuterBase = convertToBase(dOuterVal, dOuterUnit, 'length');
                        const dInnerBase = convertToBase(dInnerVal, dInnerUnit, 'length');

                        // If the condition is now MET (outer > inner)
                        if (!isNaN(dOuterBase) && !isNaN(dInnerBase) && dOuterBase > dInnerBase) {
                            // Clear the cross-validation error from the *other* field as well
                            if (newErrors[otherInputId] === "Outer diameter must be greater than Inner diameter") {
                                newErrors[otherInputId] = null;
                            }
                        }
                        // Oterhwise, if condition is not met, re-set error just in case (e.g. switching back)
                        else if (!isNaN(dOuterBase) && !isNaN(dInnerBase) && dOuterBase <= dInnerBase) {
                             newErrors[inputId] = "Outer diameter must be greater than Inner diameter";
                             newErrors[otherInputId] = "Outer diameter must be greater than Inner diameter";
                        }
                    }
                }
            }
            // --- End cross-field check ---

            return newErrors;
        });
    }
  };

   const handleVariantChange = (calcId, variantName) => {
     const calcDef = CALCULATORS.find(c => c.id === calcId);
     const variantDef = calcDef?.variants?.find(v => v.name === variantName);
     const newInputsState = variantDef ? initializeInputState(variantDef.inputs ?? []) : {};

     setAllCalculatorStates(prev => ({
      ...prev,
      [calcId]: {
        ...prev[calcId],
        variant: variantName,
        inputs: newInputsState
      }
    }));
     if (calcId === activeCalcId) {
         setActiveCalculatorErrors({});
     }
  };

   const handleOutputUnitChange = (calcId, resultKey, unit) => {
     setAllCalculatorStates(prev => ({
      ...prev,
      [calcId]: {
        ...prev[calcId],
        outputUnits: {
          ...prev[calcId].outputUnits,
          [resultKey]: unit
        }
      }
    }));
  };

  const handleFluidChange = (calcId, fluidName) => {
    const fluidProps = FLUID_PROPERTIES[fluidName];
    if (!fluidProps) return;

    setAllCalculatorStates(prev => {
        const newStates = { ...prev };
        const targetCalcState = newStates[calcId];
        const newInputs = { ...targetCalcState.inputs };
        let hasChanged = false;

        Object.keys(fluidProps).forEach(propKey => {
            if (Object.hasOwnProperty.call(newInputs, propKey)) {
                newInputs[propKey] = {
                    ...newInputs[propKey],
                    value: String(fluidProps[propKey])
                };
                hasChanged = true;
            }
        });

        if (hasChanged) {
            newStates[calcId] = { ...targetCalcState, inputs: newInputs };
        }
        return newStates;
    });

    if (fluidProps && calcId === activeCalcId) {
        setActiveCalculatorErrors(prevErrors => {
            const newErrors = {...prevErrors};
            Object.keys(fluidProps).forEach(propKey => {
                if (newErrors[propKey]) {
                    newErrors[propKey] = null;
                }
            });
            return newErrors;
        });
    }
  };
  // --- End Handlers ---

   // Clear errors when calculator changes
   useEffect(() => {
       setActiveCalculatorErrors({});
   }, [activeCalcId]);

  return (
    <div
      className={`${styles.appContainer} ${isMobileNavOpen ? styles.noScroll : ''}`}
    >
      {/* --- Sidebar --- */}
      <nav
        className={`${styles.sidebar} ${isMobileNavOpen ? styles.mobileNavOpen : ''}`}
      >
        <h1 className={styles.sidebarTitle}>CFD Calculator</h1>
        <ul className={styles.navList}>
          {CALCULATORS.map((calc) => (
            <li
              key={calc.id}
              className={`${styles.navItem} ${calc.id === activeCalcId ? styles.active : ''}`}
              onClick={() => handleNavClick(calc.id)}
            >
              {calc.name}
            </li>
          ))}
        </ul>
        <button className={styles.resetButton} onClick={handleResetAll}>
            Reset All Data
        </button>
      </nav>

      {/* --- Overlay --- */}
      {isMobileNavOpen && ( <div className={styles.overlay} onClick={() => setMobileNavOpen(false)} /> )}

      {/* --- Main Content --- */}
      <main className={styles.mainContent}>
        <button
          className={styles.menuButton}
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
        >
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        {/* --- Pass State and Handlers down to CalculatorPage --- */}
        {activeCalculator && activeCalculatorState ? (
          <CalculatorPage
            key={activeCalcId}
            calcData={activeCalculator}
            currentInputValues={activeCalculatorState.inputs}
            currentVariant={activeCalculatorState.variant}
            currentOutputUnits={activeCalculatorState.outputUnits}
            onInputChange={handleInputChange}
            onUnitChange={handleUnitChange}
            onVariantChange={(variantName) => handleVariantChange(activeCalcId, variantName)}
            onOutputUnitChange={(resultKey, unit) => handleOutputUnitChange(activeCalcId, resultKey, unit)}
            onFluidChange={(fluidName) => handleFluidChange(activeCalcId, fluidName)}
            showToast={showToast}
            inputErrors={activeCalculatorErrors}
          />
        ) : (
          <h2>Calculator not found or state missing.</h2>
        )}
      </main>

      {/* --- Render Toast Component --- */}
      <Toast
          message={toastMessage}
          isVisible={isToastVisible}
          onClose={handleCloseToast}
       />
    </div>
  )
}

export default App;
