const messages = ["Preparando sua página…", "Folheando as próximas páginas…", "Organizando a estante…", "Abrindo o próximo capítulo…", "Entre uma página e outra…"];

export function LoadingBookMessages() {
  return <><p className="loading-book-messages" aria-hidden="true">{messages.map((message) => <span className="loading-book-messages__phrase" key={message}>{message}</span>)}</p><span className="sr-only">Preparando sua página…</span></>;
}
