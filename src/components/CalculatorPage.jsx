// src/components/CalculatorPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './CalculatorPage.module.css';
import UnitInput from './UnitInput';
import { UNITS, CONSTANTS, FLUID_PROPERTIES } from '../data'; // Import FLUID_PROPERTIES

// --- Helper Functions ---
function convertToBase(value, unit, category) {
    // Converts a value from a given unit to the base SI unit for that category
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

function convertFromBase(value, unit, category) {
    // Converts a value from the base SI unit to a specified unit in that category
     if (isNaN(value) || !unit || !category || !UNITS[category] || !UNITS[category][unit]) {
         return NaN; // Return NaN if inputs are invalid or conversion not possible
     }
     const factor = UNITS[category][unit];
     if (typeof factor === 'function') { // Handle special conversions like temperature
         if (category === 'temperature') { // Specific temp conversions from K
            if (unit === 'K') return value;
            if (unit === 'C') return value - 273.15;
            if (unit === 'F') return (value * 9 / 5) - 459.67;
            return NaN; // Unknown target unit
         }
         // For tempDelta, factor is just a number, so divide
         return Number(value) / factor;
     }
     // Standard multiplier conversion (divide to go from base)
     return Number(value) / factor;
}

// Function to format results clearly, using toPrecision for significant digits
function formatResult(value, precision = 15, resultKey = null) { // <<< Default precision set to 15
    if (value === null || value === undefined) return '-'; // Handle null/undefined
    if (isNaN(value)) return 'Invalid Input'; // Handle NaN
    if (!isFinite(value)) return 'Infinity'; // Handle Infinity
    if (value === 0) return '0'; // Handle zero
    if (resultKey === 'Number of Cells') {
        return Number(value).toFixed(0); // No decimal places for count of cells
    }

    const exponentialString = value.toExponential(precision);
    const cleanedString = exponentialString.replace(/(.+\..*?)?(0+)(e[+-]\d+)/, '$1$3').replace(/\.(e[+-]\d+)/, '$1');
    return cleanedString;
}


// --- Component ---
const CalculatorPage = ({
    calcData,
    currentInputValues,
    currentVariant,
    currentOutputUnits,
    onInputChange,
    onUnitChange,
    onVariantChange,
    onOutputUnitChange,
    showToast,
    onFluidChange,
    inputErrors // <<< Accept error prop
 }) => {
 //   console.log(`CalculatorPage RENDER START: calcId=${calcData?.id}`, { currentInputValues, currentVariant, inputErrors }); // <<< ADDED LOG
  // State for calculated result (local to this component)
  const [result, setResult] = useState(null);
  // State for copy status (local)
  const [copyStatus, setCopyStatus] = useState({});

  // Derive the current set of inputs based on props using useMemo
  const currentInputs = useMemo(() => {
    if (!calcData) return [];
    if (currentVariant && calcData.variants) {
      const variant = calcData.variants.find(v => v.name === currentVariant);
      return variant?.inputs ?? [];
    }
    return calcData.inputs ?? [];
  }, [calcData, currentVariant]);


  // Handlers to call the prop functions passed from App
  const handleInputChange = (id, value) => {
    onInputChange(calcData.id, id, value);
  };

  const handleUnitChange = (id, unit) => {
    onUnitChange(calcData.id, id, unit);
  };

  const handleVariantChange = (e) => {
      onVariantChange(e.target.value);
  }

  const handleOutputUnitChange = (resultKey, unit) => {
    onOutputUnitChange(resultKey, unit);
  }


  // Memoized function to perform the calculation using props
  const calculateResult = useCallback(() => {
  //  console.log(`calculateResult START: calcId=${calcData?.id}`, { inputErrors }); // <<< ADDED LOG
     // --- FIX: Check for validation errors before calculating ---
    // --- FIX: Check for validation errors before calculating ---
    if (inputErrors && Object.values(inputErrors).some(error => error !== null)) {
        if (calcData.output.isObject && calcData.output.keys) {
            const nanResult = {};
            Object.keys(calcData.output.keys).forEach(key => nanResult[key] = NaN);
            return nanResult;
        }
        return NaN;
    }
    // --- END FIX ---

    if (!Array.isArray(currentInputs)) { return NaN; }

    const formula = currentVariant
      ? calcData.variants?.find(v => v.name === currentVariant)?.formula
      : calcData.formula;

    if (!formula) { return null; }

    if (currentInputs.length > 0 && (!currentInputValues || Object.keys(currentInputValues).length === 0)) {
        return null; // Wait if state hasn't propagated yet
    }

    const baseValues = {};
    let hasInvalidInput = false;

    for (const input of currentInputs) {
      const state = currentInputValues?.[input.id];
 //     console.log(`calculateResult: Processing input ${input.id}`, { state }); // <<< ADDED LOG
      if (!state) { hasInvalidInput = true; break; }
      const valueToConvert = state.value === '' && input.defaultVal !== undefined ? input.defaultVal : state.value;
      if (valueToConvert === '') { hasInvalidInput = true; break; }
      const baseValue = convertToBase(valueToConvert, state.unit, input.unit);
      if (isNaN(baseValue)) { hasInvalidInput = true; break; }
      baseValues[input.id] = baseValue;
    }

    if (hasInvalidInput) {
   //     console.log(`calculateResult: Found invalid or missing input for ${calcData?.id}`); // <<< ADDED LOG
        if (calcData.output.isObject && calcData.output.keys) { const nanResult = {}; Object.keys(calcData.output.keys).forEach(key => nanResult[key] = NaN); return nanResult; }
        return NaN;
    }
    if (currentInputs.length === 0 && Object.keys(baseValues).length === 0) {
        try { const resultVal = formula(CONSTANTS); if (typeof resultVal === 'object' && resultVal !== null) return resultVal; return (isNaN(resultVal) || !isFinite(resultVal)) ? NaN : resultVal; }
        catch (error) { console.error("Calc error (no inputs):", error); return calcData.output.isObject ? {} : NaN; }
    }

    try {
      const formulaArgs = { ...baseValues, ...CONSTANTS };
      // console.log(`calculateResult: Calling formula for ${calcData?.id} with args:`, formulaArgs); // <<< ADDED LOG
      const rawResult = formula(formulaArgs);

       if (typeof rawResult === 'object' && rawResult !== null && !Array.isArray(rawResult)) {
           const finalResult = {};
            if(calcData.output.keys) {
                Object.keys(calcData.output.keys).forEach(key => {
                    const value = rawResult[key];
                    finalResult[key] = (value === undefined || value === null || isNaN(value) || !isFinite(value)) ? NaN : Number(value);
                });
            } else {
              //   console.warn(`Output is object but no keys defined for ${calcData.id}`);
                 Object.entries(rawResult).forEach(([key, value]) => {
                     finalResult[key] = isNaN(Number(value)) ? NaN : Number(value);
                 });
            }
          return finalResult;
      }
      if (typeof rawResult === 'number') {
           if (isNaN(rawResult) || !isFinite(rawResult)) { return NaN; }
            return rawResult;
      }
   //   console.error(`calculateResult: Unexpected result type for ${calcData?.id}:`, typeof rawResult, rawResult); // <<< ADDED LOG
      console.error(`Unexpected result type for ${calcData.id}:`, typeof rawResult);
      return calcData.output.isObject ? {} : NaN;
    } catch (error) {
     //   console.error(`calculateResult: Calculation error in ${calcData?.id}:`, error);
      console.error(`Calculation error in ${calcData.id}:`, error);
       if (calcData.output.isObject && calcData.output.keys) { const nanResult = {}; Object.keys(calcData.output.keys).forEach(key => nanResult[key] = NaN); return nanResult; }
        return NaN;
    }
  }, [currentInputValues, currentInputs, calcData, currentVariant, inputErrors]); // <<< Add inputErrors dependency


  // Effect to trigger recalculation when dependencies change
  useEffect(() => {
//    console.log(`CalculatorPage useEffect [calculateResult] START: calcId=${calcData?.id}`);
    setResult(calculateResult());
 //   console.log(`CalculatorPage useEffect [calculateResult] END: calcId=${calcData?.id}`); // <<< ADDED LOG
     setCopyStatus({});
  }, [calculateResult]);


  // Function to copy a result value to clipboard
  const copyToClipboard = (resultKey, valueToCopy) => {
    if (valueToCopy === null || typeof valueToCopy === 'object' || isNaN(valueToCopy) || !isFinite(valueToCopy)) return;

    const currentUnit = currentOutputUnits?.[resultKey];
    const category = calcData.output.isObject ? calcData.output.keys?.[resultKey]?.unit : calcData.output.unit;

    if (!category || !currentUnit) return;

    const displayValue = convertFromBase(valueToCopy, currentUnit, category);
     if (isNaN(displayValue)) return;
    navigator.clipboard.writeText(String(displayValue))
        .then(() => {
            setCopyStatus(prev => ({...prev, [resultKey]: 'Copied!' })); // Update icon state
            showToast("Value copied to clipboard!"); // <<< Call showToast on success
            setTimeout(() => setCopyStatus(prev => ({...prev, [resultKey]: '' })), 1500); // Reset icon state
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
            setCopyStatus(prev => ({...prev, [resultKey]: 'Failed' }));
            showToast("Failed to copy value."); // <<< Optional: Show toast on failure
             setTimeout(() => setCopyStatus(prev => ({...prev, [resultKey]: '' })), 1500);
        });
  };

  const calculatorsWithFluidPresets = [
      'reynoldsNumber',
      'brinkmanNumber',
      'firstCellHeight',
      'prandtlNumber'
  ];
  const shouldShowFluidPresets = calculatorsWithFluidPresets.includes(calcData.id);

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>{calcData.title}</h2>
      <p className={styles.description}>{calcData.description}</p>

      {/* RENDER FLUID PRESET BUTTONS (if applicable) */}
      {shouldShowFluidPresets && (
          <div className={styles.fluidSelector}>
              <h4 className={styles.fluidSelectorLabel}>
                  FLUID PRESETS
              </h4>
              <div className={styles.fluidButtonContainer}>
                  {Object.keys(FLUID_PROPERTIES).map(fluidKey => (
                      <button
                          key={fluidKey}
                          className={styles.fluidButton}
                          onClick={() => onFluidChange(fluidKey)}
                      >
                          Load {fluidKey.charAt(0).toUpperCase() + fluidKey.slice(1)}
                      </button>
                  ))}
              </div>
          </div>
      )}

      {/* Variant Selector */}
      {calcData.variants && calcData.variants.length > 0 && (
          <div className={styles.variantSelector}>
              {calcData.variants.map((variant) => (
                  <label key={variant.name}>
                      <input
                          type="radio"
                          name={`${calcData.id}-variant`}
                          value={variant.name}
                          checked={currentVariant === variant.name}
                          onChange={handleVariantChange}
                      />
                      {variant.name}
                  </label>
              ))}
          </div>
      )}

      {/* Input Grid */}
      <div className={styles.inputGrid}>
        {Array.isArray(currentInputs) && currentInputs.length > 0 ? (
          currentInputs.map((input) => {
            const state = currentInputValues?.[input.id] || { value: '', unit: '' };
            const safeDefaultUnit = (input.unit && UNITS[input.unit] && Object.keys(UNITS[input.unit]).length > 0)
              ? Object.keys(UNITS[input.unit])[0]
              : '';
            return (
              <UnitInput
                key={input.id}
                id={input.id}
                label={input.label}
                unitCategory={input.unit}
                value={state.value}
                onChange={handleInputChange}
                selectedUnit={state.unit || safeDefaultUnit}
                onUnitChange={handleUnitChange}
                defaultVal={input.defaultVal}
                tooltip={input.tooltip}
                errorMessage={inputErrors?.[input.id]} // Pass the error message
              />
            );
          })
        ) : (
           calcData.variants && currentVariant
             ? <p>Inputs for {currentVariant} are not defined.</p>
             : !calcData.inputs && !calcData.variants
               ? null
               : <p>Inputs are not available.</p>
        )}
      </div>

      {/* Result Section */}
      <div className={styles.resultSection}>
        <h3 className={styles.resultTitle}>Results</h3>
        <div className={styles.multiResultContainer}>
             {calcData.output.isObject && typeof result === 'object' && result !== null && calcData.output.keys ? (
                 Object.entries(calcData.output.keys).map(([key, keyData]) => {
                    const value = result[key];
                    const currentUnit = currentOutputUnits?.[key];
                    const unitCategory = keyData.unit;
                    const availableUnits = (unitCategory && UNITS[unitCategory]) ? Object.keys(UNITS[unitCategory]) : [];
                    const showOutputDropdown = availableUnits.length > 1;
                    const shouldDisplayResultUnit = showOutputDropdown || (availableUnits.length === 1 && availableUnits[0] !== '--');
                    const displayValue = currentUnit ? formatResult(convertFromBase(value, currentUnit, unitCategory),15, key) : 'N/A';
                    const currentCopyStatus = copyStatus[key] || '';
                    const isValidNumber = typeof value === 'number' && !isNaN(value) && isFinite(value);

                    return (
                        <div key={key} className={styles.resultItem}>
                            {/* Wrap label and add tooltip icon */}
<div className={styles.resultLabelWrapper}>
    <label className={styles.resultItemLabel}>{keyData.label}</label>
    {keyData.tooltip && (
      <div className={styles.tooltipContainer}> {/* New container */}
        <span className={styles.tooltipIcon}>?</span> {/* Icon styled by CSS */}
        <span className={styles.tooltipText}>{keyData.tooltip}</span> {/* Hidden text */}
      </div>
    )}
</div>
                                {/* Remove title from here */}
                                <div className={styles.resultItemValueBox}>
                                <span className={`${styles.resultItemValue} ${displayValue === 'Invalid Input' ? styles.errorValue : ''}`}>
                                    {displayValue}
                                </span>
                                {(shouldDisplayResultUnit || isValidNumber) && (
                                    <div className={styles.resultItemUnitControls}>
                                        {showOutputDropdown && (
                                            <select
                                                value={currentUnit || ''}
                                                onChange={(e) => handleOutputUnitChange(key, e.target.value)}
                                                className={styles.resultUnitSelect}
                                                aria-label={`${keyData.label} unit`}
                                                disabled={!isValidNumber}
                                            >
                                                {availableUnits.map(unit => (
                                                    <option key={unit} value={unit}>{unit === '--' ? '[-]' : unit}</option>
                                                ))}
                                            </select>
                                        )}
                                        {!showOutputDropdown && availableUnits.length === 1 && availableUnits[0] !== '--' && (
                                            <span className={styles.staticUnitDisplay}>
                                                {availableUnits[0]}
                                            </span>
                                        )}
                                        {isValidNumber && (
                                            <button
                                                className={styles.copyButton}
                                                title={currentCopyStatus || `Copy ${keyData.label}`}
                                                onClick={() => copyToClipboard(key, value)}
                                                disabled={!isValidNumber}
                                            >
                                                {currentCopyStatus === 'Copied!'
                                                ? ( <svg width="20" height="20" viewBox="0 0 24 24"><path d="M20 6L9 17L4 12" stroke="var(--color-result)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> )
                                                : ( <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M8 10C8 9.44772 8.44772 9 9 9H15C15.5523 9 16 9.44772 16 10V16C16 16.5523 15.5523 17 15 17H9C8.44772 17 8 16.5523 8 16V10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 7H19C20.1046 7 21 7.89543 21 9V19C21 20.1046 20.1046 21 19 21H9C7.89543 21 7 20.1046 7 19V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> )}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                 })
             ) : calcData.output.isObject ? (
                   <div className={styles.resultBox}>
                      <span className={`${styles.resultValue} ${styles.errorValue}`}>
                        {result === null ? '-' : 'Calculation Error'}
                     </span>
                  </div>
             ): (
                  <div className={styles.resultBox}>
                    <span className={`${styles.resultValue} ${(isNaN(result) || !isFinite(result)) && result !== null ? styles.errorValue : ''}`}>
                         {formatResult(convertFromBase(result, currentOutputUnits?.['main'], calcData.output.unit))}
                         </span>
                    {(() => {
                        const mainOutputCategory = calcData.output.unit;
                        const mainAvailableUnits = (mainOutputCategory && UNITS[mainOutputCategory]) ? Object.keys(UNITS[mainOutputCategory]) : [];
                        const showMainDropdown = mainAvailableUnits.length > 1;
                        const shouldDisplayMainResultUnit = showMainDropdown || (mainAvailableUnits.length === 1 && mainAvailableUnits[0] !== '--');
                        const mainCurrentUnit = currentOutputUnits?.['main'];
                        const isValidMainResult = typeof result === 'number' && !isNaN(result) && isFinite(result);

                        return (shouldDisplayMainResultUnit || isValidMainResult) && (
                            <div className={styles.resultUnitControls}>
                                {showMainDropdown && (
                                    <select
                                        value={mainCurrentUnit || ''}
                                        onChange={(e) => handleOutputUnitChange('main', e.target.value)}
                                        className={styles.resultUnitSelect}
                                        aria-label="Result unit"
                                        disabled={!isValidMainResult}
                                    >
                                       {mainAvailableUnits.map(unit => ( <option key={unit} value={unit}>{unit === '--' ? '[-]' : unit}</option> ))}
                                    </select>
                                )}
                                 {!showMainDropdown && mainAvailableUnits.length === 1 && mainAvailableUnits[0] !== '--' && (
                                    <span className={styles.staticUnitDisplay}>
                                        {mainAvailableUnits[0]}
                                    </span>
                                )}
                                {isValidMainResult && (
                                    <button
                                        className={styles.copyButton}
                                        title={copyStatus['main'] || "Copy"}
                                        onClick={() => copyToClipboard('main', result)}
                                        disabled={!isValidMainResult}
                                    >
                                        {copyStatus['main'] === 'Copied!' ? ( <svg width="20" height="20" viewBox="0 0 24 24"><path d="M20 6L9 17L4 12" stroke="var(--color-result)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> ) : ( <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M8 10C8 9.44772 8.44772 9 9 9H15C15.5523 9 16 9.44772 16 10V16C16 16.5523 15.5523 17 15 17H9C8.44772 17 8 16.5523 8 16V10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 7H19C20.1046 7 21 7.89543 21 9V19C21 20.1046 20.1046 21 19 21H9C7.89543 21 7 20.1046 7 19V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> )}
                                    </button>
                                )}
                            </div>
                        );
                    })()}
                  </div>
             )}
        </div>
      </div>

      {/* Interpretations Section */}
       {calcData.interpretations && (
           result !== null && (
             (typeof result === 'number' && !isNaN(result) && isFinite(result)) ||
             (typeof result === 'object' && typeof result['Reynolds Number (Re)'] === 'number' && !isNaN(result['Reynolds Number (Re)']) && isFinite(result['Reynolds Number (Re)']))
            )
        ) && (
           <div className={styles.interpretationSection}>
                <h4 className={styles.interpretationTitle}>Interpretation</h4>
                <p className={styles.interpretationText}>
                    {(() => {
                        const reValue = (typeof result === 'object' && result !== null) ? result['Reynolds Number (Re)'] : result;
                        if (typeof reValue !== 'number' || isNaN(reValue)) return 'N/A';
                        return calcData.interpretations.find(interp => reValue < interp.value)?.text ||
                               calcData.interpretations[calcData.interpretations.length - 1]?.text ||
                               'Value out of defined ranges.';
                    })()}
                </p>
           </div>
       )}


      {/* Footnotes Section */}
       {calcData.footnotes && calcData.footnotes.length > 0 && (
           <footer className={styles.footer}>
               <ul className={styles.footnoteList}>
                   {calcData.footnotes.map((note, index) => (
                       <li key={index}>{note}</li>
                   ))}
               </ul>
           </footer>
       )}
    </div>
  );
};

export default CalculatorPage;

