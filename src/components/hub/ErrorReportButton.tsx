import { Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportLovableError } from "@/lib/lovable-error-reporting";

export function ErrorReportButton({ error, area }: { error: string; area: "chat" | "images" }) {
  const report = () => {
    reportLovableError(new Error(error), { area, user_reported: true });
    const subject = encodeURIComponent("Relatório de problema — Hub de IA Universal");
    const body = encodeURIComponent(
      `Área: ${area}\nErro: ${error}\nPágina: ${window.location.href}\n\nDescreva o que estava fazendo: `,
    );
    window.location.href = `mailto:suporte@hubia.app?subject=${subject}&body=${body}`;
  };

  return (
    <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={report}>
      <Bug className="size-3.5" /> Reportar problema
    </Button>
  );
}
