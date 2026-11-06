import { LoadingBookMessages } from "@/components/loading-book-messages";
import { BookLoadingIcon } from "@/components/book-loading-icon";

export default function PublicLoading() {
  return <main className="panel-loading public-loading" role="status" aria-live="polite" aria-label="Carregando página">
    <BookLoadingIcon />
    <LoadingBookMessages />
  </main>;
}
