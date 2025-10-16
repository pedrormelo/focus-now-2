// Esse arquivo força que os elementos Ionic não disputem propriedades conflitantes
declare global {
    interface HTMLIonInputElement {
        // Opções: extender HTMLElement simples para evitar conflito
    }
    interface HTMLIonSearchbarElement {
        // idem
    }
}

export { };
