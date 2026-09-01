const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['text/plain', 'application/pdf', 'text/csv', 'image/png', 'image/jpeg', 'image/webp'];

export async function processAttachment(file: File): Promise<{ text: string; name: string }> {
  if (file.size > MAX_FILE_SIZE) throw new Error("Arquivo muito grande (máx 10MB)");
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Tipo de arquivo não permitido");

  if (file.type === 'text/plain' || file.type === 'text/csv') {
    const text = await file.text();
    return { text: text.slice(0, 5000), name: file.name }; // Limita a 5000 chars
  }

  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = () => {
        resolve({ text: `[Imagem: ${file.name}]`, name: file.name });
      };
      reader.onerror = () => reject(new Error("Erro ao ler imagem"));
      reader.readAsDataURL(file);
    });
  }

  if (file.type === 'application/pdf') {
    return { text: `[PDF: ${file.name} - ${(file.size / 1024).toFixed(0)}KB]`, name: file.name };
  }

  throw new Error("Tipo de arquivo não suportado");
}

export function validateAttachment(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) return "Arquivo muito grande (máx 10MB)";
  if (!ALLOWED_TYPES.includes(file.type)) return "Tipo não permitido (TXT, PDF, CSV, PNG, JPG, WEBP)";
  return null;
}
