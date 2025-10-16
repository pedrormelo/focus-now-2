// src/types/ionic-fix.d.ts
// ---------------------------------------------------------------------
// Corrige conflito de tipos entre Ionic 8 e TypeScript >=5.8
// (autocorrect duplicado em IonInput e IonSearchbar)
// ---------------------------------------------------------------------

declare global {
    interface HTMLIonInputElement extends HTMLElement { }
    interface HTMLIonSearchbarElement extends HTMLElement { }
}

export { };
