import { createFileRoute } from "@tanstack/react-router";
import { jsonError } from "@/lib/api-auth.server";
import { getGuestState, isValidDeviceId } from "@/lib/guest-limits.server";

export const Route = createFileRoute("/api/guest")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const deviceId = request.headers.get("x-guest-id");
        if (!isValidDeviceId(deviceId)) return jsonError("Identificador de dispositivo inválido.", 400);
        try {
          const state = await getGuestState(deviceId);
          return new Response(JSON.stringify(state), {
            headers: { "Content-Type": "application/json" },
          });
        } catch {
          return jsonError("Não foi possível carregar seu acesso de visitante.", 500);
        }
      },
    },
  },
});
