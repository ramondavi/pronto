import { BookLoadingIcon } from "@/components/book-loading-icon";

export default function PanelLoading() {
  return <main className="dashboard-main panel-loading" role="status" aria-live="polite" aria-label="Carregando página">
    <BookLoadingIcon />
    <p>Preparando sua página…</p>
  </main>;
}
