export const fetchJson = async (id: string) => {
    try {
    // 从本地服务器获取 JSON 文件
    const response = await fetch(`/json/${id}.json`);
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