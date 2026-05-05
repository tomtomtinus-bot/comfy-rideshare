import { useEffect } from "react";

/**
 * Toont een browser-bevestiging wanneer er onopgeslagen wijzigingen zijn:
 * - bij sluiten/refreshen van het tabblad (beforeunload)
 * - bij klikken op een interne <a> link binnen de pagina
 * - bij browser back/forward (popstate)
 */
export function useUnsavedChanges(dirty: boolean, message = "Je hebt onopgeslagen wijzigingen. Wil je doorgaan zonder opslaan?") {
  useEffect(() => {
    if (!dirty) return;

    // Browser-tab close / refresh
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    // Klikken op interne links onderscheppen (Nav, Footer, e.d.)
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      // Externe target=_blank niet blokkeren
      if (anchor.getAttribute("target") === "_blank") return;
      if (!window.confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("click", onClick, true);

    // Browser back/forward
    const onPopState = () => {
      if (!window.confirm(message)) {
        // duw weer een entry — voorkomt navigatie
        window.history.pushState(null, "", window.location.href);
      }
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [dirty, message]);
}
