// src/components/UnitInput.jsx
import React from 'react';
import styles from './UnitInput.module.css';
import { UNITS } from '../data';

const UnitInput = ({
  id,
  label,
  unitCategory,
  value,
  onChange,
  selectedUnit,
  onUnitChange,
  defaultVal,
  tooltip,
  errorMessage
}) => {
  const unitOptions = unitCategory && UNITS[unitCategory] ? Object.keys(UNITS[unitCategory]) : [];
  const showDropdown = unitOptions.length > 1;
  const singleUnit = unitOptions.length === 1 ? unitOptions[0] : null;
  // Determine if there's a unit symbol to display at all (exclude '--')
  const shouldDisplayUnit = showDropdown || (singleUnit && singleUnit !== '--');

  const displayValue = value === '' && defaultVal !== undefined ? String(defaultVal) : value;
//  console.log(`UnitInput RENDER: id=${id}, label=${label}, value="${displayValue}", unit=${selectedUnit}, error=${errorMessage}`); // <<< ADDED LOG

  return (
    <div className={styles.inputWrapper}>
 
<div className={styles.labelWrapper}>
   <label htmlFor={id} className={styles.label}>{label}</label>
   {tooltip && (
     <div className={styles.tooltipContainer}> {/* New container */}
       <span className={styles.tooltipIcon}>?</span> {/* Icon styled by CSS */}
       <span className={styles.tooltipText}>{tooltip}</span> {/* Hidden text */}
     </div>
   )}
</div>
      <div className={styles.inputGroup}>
        <input
          id={id}
          type="number"
          step="any"
          // Apply 'inputFullBorder' only if NO unit symbol is displayed
          className={`${styles.input} ${!shouldDisplayUnit ? styles.inputFullBorder : ''}`}
          placeholder="Enter value"
          value={displayValue}
          onChange={(e) => onChange(id, e.target.value)}
        />
        {/* Render dropdown ONLY if more than one unit */}
        {showDropdown && (
          <select
            className={styles.select}
            value={selectedUnit}
            onChange={(e) => onUnitChange(id, e.target.value)}
            aria-label={`${label} unit`}
          >
            {unitOptions.map((unit) => (
              <option key={unit} value={unit} className={styles.selectOption}>
                 {/* Still display [--] in dropdown, but not statically */}
                {unit === '--' ? '[-]' : unit}
              </option>
            ))}
          </select>
        )}
        {/* Render static unit span ONLY if exactly one unit AND it's not '--' */}
        {singleUnit && singleUnit !== '--' && (
             <span className={styles.staticUnit}>
                 {singleUnit} {/* Display the actual unit */}
             </span>
        )}
        {errorMessage && <span className={styles.errorMessage}>{errorMessage}</span>}
      </div>
    </div>
  );
};

export default UnitInput;