export function saveToLocalStorage<T>(name: string, data: T): void {
  try {
    const serializedData = JSON.stringify(data);
    window.localStorage.setItem(name, serializedData);
  } catch (error) {
    // Optionally handle serialization/storage errors here
    console.error('Failed to save to localStorage:', error);
  }
}

const isJsonString = (str: string): boolean => {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

export function getAllLocalStorage(): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key) {
      result[key] = window.localStorage.getItem(key) ?? '';
    }
  }
  return result;
}

export function getFromLocalStorage<T>(name: string): T | null {
  try {
    const serializedData = window.localStorage.getItem(name);
    if (serializedData === null) {
      return null;
    }

    if (!isJsonString(serializedData)) {
      return serializedData as unknown as T;
    }

    return JSON.parse(serializedData) as T;
  } catch (error) {
    // Optionally handle deserialization errors here
    console.error('Failed to get from localStorage:', error);
    return null;
  }
}
