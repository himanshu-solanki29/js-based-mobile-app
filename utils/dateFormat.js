/**
 * Format a date string to DD-MMM-YYYY format
 * @param dateString A date string in any valid format (e.g. YYYY-MM-DD)
 * @returns Formatted date string in DD-MMM-YYYY format
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; // Return original if invalid

  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}; 