// ─── Google Sheets configuration ────────────────────────────────────────────
// Replace with your actual Google Spreadsheet ID
// (the long string from the URL: docs.google.com/spreadsheets/d/SHEET_ID/edit)
export const SHEET_ID = import.meta.env.VITE_GSHEET_ID || '1sLj4hEMJYabExJ3KB3FVTdFhliVH9lzHJvG2Ae3lIyw';

// Tab names in your spreadsheet
const NOTIFICATIONS_SHEET = 'Notifications';
const EVENTS_SHEET = 'Events';

// ─── CSV Parser ──────────────────────────────────────────────────────────────
/**
 * Parses a CSV string into an array of objects using the first row as headers.
 * Handles quoted fields (including commas and newlines inside quotes).
 */
export const parseCSV = (csvText) => {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote inside a quoted field
                currentField += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentField.trim());
            currentField = '';
        } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
            if (char === '\r') i++; // skip \n of \r\n
            currentRow.push(currentField.trim());
            rows.push(currentRow);
            currentRow = [];
            currentField = '';
        } else {
            currentField += char;
        }
    }
    // Push last field/row
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
    }

    if (rows.length < 2) return [];

    const headers = rows[0].map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());

    return rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = (row[index] || '').replace(/^"|"$/g, '').trim();
        });
        return obj;
    }).filter(obj => Object.values(obj).some(v => v !== ''));
};

// ─── Shared fetcher ──────────────────────────────────────────────────────────
const fetchSheetCSV = async (sheetName) => {
    if (!SHEET_ID || SHEET_ID === 'YOUR_GOOGLE_SHEET_ID_HERE') {
        return [];
    }
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch sheet: ${sheetName} (HTTP ${response.status})`);
    }
    return parseCSV(await response.text());
};

// ─── Notifications ───────────────────────────────────────────────────────────
/**
 * Fetches notification rows from the "Notifications" sheet tab.
 *
 * Expected columns: title | date (YYYY-MM-DD) | desc
 *
 * Returns: { success: boolean, data: Array<{ title, date, desc }>, message: string }
 */
export const fetchNotifications = async () => {
    try {
        const rows = await fetchSheetCSV(NOTIFICATIONS_SHEET);

        // Sort by date descending (newest first), keep rows with a title
        const notifications = rows
            .filter(row => row.title)
            .sort((a, b) => {
                const da = a.date ? new Date(a.date) : new Date(0);
                const db = b.date ? new Date(b.date) : new Date(0);
                return db - da;
            });

        return { success: true, data: notifications, message: 'Notifications fetched successfully' };
    } catch (error) {
        console.error('Error fetching notifications from Google Sheets:', error);
        return { success: false, data: [], message: error.message || 'Failed to fetch notifications' };
    }
};

// ─── Events ──────────────────────────────────────────────────────────────────
/**
 * Fetches event rows from the "Events" sheet tab.
 *
 * Expected columns: title | date (YYYY-MM-DD) | type (e.g. "Work" or "Personal")
 *
 * Only returns upcoming events (today or in the future).
 * Returns: { success: boolean, data: Array<{ title, date, type }>, message: string }
 */
export const fetchEvents = async () => {
    try {
        const rows = await fetchSheetCSV(EVENTS_SHEET);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filter to upcoming/today events, sort ascending
        const events = rows
            .filter(row => row.title)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        return { success: true, data: events, message: 'Events fetched successfully' };
    } catch (error) {
        console.error('Error fetching events from Google Sheets:', error);
        return { success: false, data: [], message: error.message || 'Failed to fetch events' };
    }
};
