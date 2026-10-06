"use client";
import { useEffect, useRef, useState, useId } from "react";

export function useDiscardGuard(isDirty: () => boolean, busy = false) {
  const current = useRef({ isDirty, busy });
  current.current = { isDirty, busy };
  const [pending, setPending] = useState<(() => void) | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const allowNavigation = useRef(false);
  function requestClose(action: () => void) {
    if (current.current.busy) return;
    if (current.current.isDirty()) setPending(() => action);
    else action();
  }
  useEffect(() => {
    if (!pending) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => {
      dialog.current?.close();
      previous?.focus();
    };
  }, [pending]);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (current.current.isDirty()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const navigate = (event: MouseEvent) => {
      if (
        allowNavigation.current ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = (event.target as Element)?.closest<HTMLAnchorElement>(
        "a[href]",
      );
      if (
        !link ||
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        !current.current.isDirty()
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      requestClose(() => {
        allowNavigation.current = true;
        link.click();
        queueMicrotask(() => {
          allowNavigation.current = false;
        });
      });
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, []);
  const confirmation = pending ? (
    <dialog
      ref={dialog}
      aria-labelledby={title}
      className="discard-dialog"
      onCancel={(event) => {
        event.preventDefault();
        setPending(null);
      }}
    >
      <div className="dialog-head">
        <h2 id={title}>Discard changes?</h2>
      </div>
      <div className="dialog-body">
        <p>Your changes haven't been saved. Keep editing or discard them.</p>
        <div className="form-actions">
          <button autoFocus onClick={() => setPending(null)}>
            Keep editing
          </button>
          <button
            className="primary"
            onClick={() => {
              const action = pending;
              setPending(null);
              action();
            }}
          >
            Discard changes
          </button>
        </div>
      </div>
    </dialog>
  ) : null;
  return { requestClose, confirmation };
}
