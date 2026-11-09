import { getSessionUser } from "@/lib/session";
import { getNotionImageForUser, readNotionImage } from "@/lib/images";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("Non autorisé", { status: 401 });

  const imageId = Number((await params).id);
  if (!Number.isFinite(imageId)) return new Response("Requête invalide", { status: 400 });

  const image = getNotionImageForUser(user.id, imageId);
  if (!image) return new Response("Introuvable", { status: 404 });

  try {
    const buffer = readNotionImage(image.storage_path);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "content-type": image.mime,
        "cache-control": "private, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Image indisponible", { status: 404 });
  }
}
