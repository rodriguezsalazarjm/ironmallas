/**
 * Textos fijos del PDF de cotización. No incluyen vigencias, anticipos, plazos ni garantías:
 * esos datos solo se imprimen cuando Iron Mallas los configura (Mi cuenta → Tarifario).
 */
export const REFERENTIAL_TITLE = "COTIZACIÓN REFERENCIAL";
export const REFERENTIAL_SUBTITLE = "SUJETA A EVALUACIÓN TÉCNICA";
export const DEFINITIVE_TITLE = "COTIZACIÓN DEFINITIVA";
export const DEFINITIVE_SUBTITLE = "EMITIDA TRAS EVALUACIÓN TÉCNICA";

export const REFERENTIAL_NOTE =
  "El valor indicado es aproximado y se calcula con las medidas y antecedentes proporcionados. El presupuesto podrá requerir ajustes tras una evaluación técnica de las condiciones reales de instalación. Cualquier modificación de precio o alcance será informada al cliente para su aprobación antes de ejecutar trabajos adicionales.";

export type TermSection = { title: string; paragraphs: string[]; items?: string[]; after?: string[] };

export const QUOTE_TERMS: TermSection[] = [
  {
    title: "1. Naturaleza del presupuesto",
    paragraphs: [
      "La presente cotización constituye una estimación económica elaborada según las dimensiones, características del servicio y antecedentes proporcionados por el cliente.",
      "El presupuesto podrá quedar sujeto a una revisión técnica presencial o a la comprobación de las condiciones reales del lugar de instalación.",
    ],
  },
  {
    title: "2. Evaluación técnica y condiciones de instalación",
    paragraphs: ["Durante la evaluación o ejecución pueden detectarse condiciones que no resultaban evidentes inicialmente, tales como:"],
    items: [
      "Muros falsos, tabiques livianos o superficies huecas.",
      "Hormigón o materiales de dureza extraordinaria.",
      "Paredes deterioradas, frágiles o con insuficiente resistencia para el anclaje.",
      "Estructuras que requieran refuerzos o materiales especiales.",
      "Obstáculos que impidan una instalación convencional.",
      "Dificultades de acceso, seguridad o fijación.",
      "Diferencias relevantes entre las medidas informadas y las reales.",
    ],
    after: ["Estas circunstancias pueden exigir un procedimiento distinto, materiales adicionales o una modificación del alcance y del precio."],
  },
  {
    title: "3. Modificaciones del presupuesto",
    paragraphs: [
      "Iron Mallas podrá proponer una modificación del presupuesto cuando la evaluación técnica determine que las condiciones reales requieren trabajos, materiales o procedimientos diferentes de los inicialmente considerados.",
      "Cualquier modificación deberá comunicarse al cliente, indicando su justificación y el nuevo valor. El cliente podrá aceptar o rechazar la propuesta modificada.",
      "No se ejecutarán ni cobrarán trabajos adicionales sin la aceptación previa correspondiente. La emisión de una nueva cotización no autoriza por sí sola un incremento unilateral del precio previamente acordado.",
    ],
  },
  {
    title: "4. Viabilidad y seguridad",
    paragraphs: [
      "Toda instalación estará condicionada a la existencia de superficies y estructuras adecuadas para realizar fijaciones seguras.",
      "Si las condiciones técnicas comprometen la seguridad o impiden una correcta instalación, Iron Mallas podrá proponer una solución alternativa o informar la imposibilidad de realizar el trabajo en las condiciones inicialmente previstas.",
      "Si existe un trabajo previamente contratado, cualquier suspensión, modificación o terminación deberá gestionarse conforme al acuerdo alcanzado y a los derechos legales del cliente.",
    ],
  },
  {
    title: "5. Medidas y cantidades",
    paragraphs: [
      "Las dimensiones informadas inicialmente podrán verificarse mediante visita técnica.",
      "Cualquier diferencia que afecte el alcance o valor del trabajo deberá comunicarse antes de su ejecución y quedar reflejada en una cotización actualizada, cuando corresponda.",
    ],
  },
  {
    title: "6. Vigencia y condiciones comerciales",
    paragraphs: ["La vigencia del presupuesto, las formas de pago y los plazos estimados de ejecución serán los indicados expresamente en la cotización."],
  },
  {
    title: "7. Garantías",
    paragraphs: ["Las garantías aplicables serán las informadas por escrito para el servicio contratado y se entenderán sin perjuicio de los derechos irrenunciables establecidos por la legislación chilena."],
  },
  {
    title: "8. Aceptación",
    paragraphs: [
      "La aceptación de la cotización deberá quedar registrada por un medio verificable, como confirmación escrita, correo electrónico o mensaje de WhatsApp.",
      "La recepción del documento no constituye aceptación automática. Cualquier cambio posterior que afecte precio o alcance requerirá el acuerdo correspondiente.",
    ],
  },
];
