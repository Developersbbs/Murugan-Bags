/**
 * CSV Export Utility
 * Provides functions to convert JSON data to CSV format and send as downloadable files
 */

/**
 * Convert JSON array to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} fields - Array of field configurations {label, key, formatter}
 * @returns {string} CSV formatted string
 */
function generateCSV(data, fields) {
    if (!data || data.length === 0) {
        return '';
    }

    // Create header row
    const headers = fields.map(field => field.label || field.key);
    const headerRow = headers.map(escapeCSVValue).join(',');

    // Create data rows
    const dataRows = data.map(item => {
        return fields.map(field => {
            let value = item[field.key];

            // Apply formatter if provided
            if (field.formatter && typeof field.formatter === 'function') {
                value = field.formatter(value, item);
            }

            // Handle null/undefined
            if (value === null || value === undefined) {
                return '';
            }

            // Convert to string and escape
            return escapeCSVValue(String(value));
        }).join(',');
    });

    // Combine header and data rows
    return [headerRow, ...dataRows].join('\n');
}

/**
 * Escape special characters in CSV values
 * @param {string} value - Value to escape
 * @returns {string} Escaped value
 */
function escapeCSVValue(value) {
    if (typeof value !== 'string') {
        value = String(value);
    }

    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
        value = '"' + value.replace(/"/g, '""') + '"';
    }

    return value;
}

/**
 * Send CSV response to client
 * @param {Object} res - Express response object
 * @param {Array} data - Data to convert to CSV
 * @param {Array} fields - Field configurations
 * @param {string} filename - Name of the CSV file (without extension)
 */
function sendCSVResponse(res, data, fields, filename) {
    const csv = generateCSV(data, fields);

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);

    // Send CSV data
    res.send(csv);
}

/**
 * Format currency value
 * @param {number} value - Numeric value
 * @returns {string} Formatted currency string
 */
function formatCurrency(value) {
    if (value === null || value === undefined) return '0.00';
    return Number(value).toFixed(2);
}

/**
 * Format date value
 * @param {Date|string} value - Date value
 * @returns {string} Formatted date string
 */
function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Format date and time value
 * @param {Date|string} value - Date value
 * @returns {string} Formatted date and time string
 */
function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

module.exports = {
    generateCSV,
    escapeCSVValue,
    sendCSVResponse,
    formatCurrency,
    formatDate,
    formatDateTime
};
