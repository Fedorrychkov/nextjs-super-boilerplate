/**
 * Truncates a value without rounding
 * @param {number | string} value Value to truncate (with decimal part)
 * @param {number} decimals Number of digits to keep after the decimal point
 * @return {number} Result as a number
 */
export const truncate = (value: string | number, decimals = 2) => {
  const s = value.toString()
  const d = s.split('.')

  if (d[1]) {
    d[1] = d[1].substring(0, decimals)
  }

  return parseFloat(d.join('.'))
}
