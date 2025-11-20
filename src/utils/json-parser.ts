export const fetchJson = async (id: string) => {
    try {
    const response = await fetch(`https://file.hkcrc.live/${id}.json`);
    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      console.error('Error fetching JSON:', response.statusText);
      return null;
    }
  } catch (error) {
    console.error('Error fetching JSON:', error);
    return null;
  }
}