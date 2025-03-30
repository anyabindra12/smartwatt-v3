
// This utility file is kept for historical reasons but we've switched to using static data
// in the Energy Analysis section rather than loading from CSV files.

/**
 * Loads and parses a CSV file
 * @param filePath Path to the CSV file
 * @returns Promise with array of objects, each representing a CSV row
 */
export const loadCSV = async (filePath: string): Promise<any[]> => {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load CSV: ${response.status}`);
    }
    
    const csvText = await response.text();
    const rows = csvText.split('\n');
    
    // Extract headers from the first row
    const headers = rows[0].split(',');
    
    // Parse each data row into an object
    return rows.slice(1).filter(row => row.trim() !== '').map(row => {
      const values = row.split(',');
      const rowData: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        // Convert to appropriate type
        const value = values[index];
        
        if (value === undefined) {
          rowData[header] = null;
          return;
        }
        
        // Try to convert to number if it looks like one
        if (value === "true" || value === "false") {
          rowData[header] = value === "true";
        } else if (!isNaN(Number(value)) && value !== '') {
          rowData[header] = Number(value);
        } else {
          rowData[header] = value;
        }
      });
      
      return rowData;
    });
  } catch (error) {
    console.error("Error loading CSV:", error);
    return [];
  }
};

// Note: This utility is not currently used as we've switched to static data
// for improved reliability and performance. The CSV files in the public/data
// directory are kept for reference purposes only.
