// Gallery filters e utilities
export type ImageFilter = {
  search?: string | undefined;
  model?: string | undefined;
  dateFrom?: Date | undefined;
  dateTo?: Date | undefined;
};

export function filterImages<
  T extends { id: string; prompt: string; model: string; created_at: string },
>(images: T[], filter: ImageFilter): T[] {
  return images.filter((img) => {
    if (filter.search && !img.prompt.toLowerCase().includes(filter.search.toLowerCase())) {
      return false;
    }
    if (filter.model && img.model !== filter.model) return false;
    if (filter.dateFrom && new Date(img.created_at) < filter.dateFrom) return false;
    if (filter.dateTo && new Date(img.created_at) > filter.dateTo) return false;
    return true;
  });
}

export function groupImagesByDate(
  images: Array<{ id: string; created_at: string }>,
) {
  const grouped: Record<string, typeof images> = {};
  for (const img of images) {
    const date = new Date(img.created_at).toLocaleDateString("pt-BR");
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(img);
  }
  return grouped;
}

export async function downloadImage(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
}

export function getImageFormat(url: string): "png" | "jpg" | "webp" {
  if (url.includes("png")) return "png";
  if (url.includes("webp")) return "webp";
  return "jpg";
}
