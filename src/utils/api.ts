export const fetchFromAPI = async (endpoint: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000${endpoint}`);
      if (!response.ok) {
        throw new Error('Failed to fetch data from API');
      }
      return response.json();
    } catch (error) {
      console.error("API error:", error);
      throw error;
    }
  };