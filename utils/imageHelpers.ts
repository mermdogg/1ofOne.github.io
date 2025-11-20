
export const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const { base64, mimeType } = dataUrlToParts(result);
      resolve({ base64, mimeType });
    };
    reader.onerror = (error) => reject(error);
  });
};

export const dataUrlToParts = (dataUrl: string): { base64: string; mimeType: string } => {
    const [header, data] = dataUrl.split(',');
    if (!header || !data) {
        throw new Error('Invalid data URL');
    }
    const mimeType = header.split(':')[1].split(';')[0];
    return { base64: data, mimeType };
}
