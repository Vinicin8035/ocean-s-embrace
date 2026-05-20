import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const Game = lazy(() => import("@/components/Game"));

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "À Deriva — Sobrevivência Oceânica" },
      { name: "description", content: "Protótipo 3D de sobrevivência oceânica. Construa, colete e sobreviva em um mar procedural." },
    ],
  }),
});

function Index() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-background font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Carregando o oceano...
        </div>
      }
    >
      <Game />
    </Suspense>
  );
}
