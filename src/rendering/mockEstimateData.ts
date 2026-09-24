// Realistic mock data for validating the document rendering prototype.
// Deliberately includes several chapters, a large number of line items and a
// handful of very long descriptions so pagination has to kick in — this is
// the scenario the rendering engine must handle correctly, per SPECS.md §16
// ("Rendering tests should generate representative PDFs containing short and
// very long descriptions, many chapters, page breaks and final-page content").

import type { EstimateDocumentData } from './types';
import type { ChapterWithLineItems } from '../domain/calculations';

// The introduction and conditions ("standard note") text below are deliberately
// long (multiple paragraphs, roughly two printed pages each at the default
// template's font size) so the template preview exercises the pagination
// rules described in SPECS.md/AGENTS.md: the cover stays a single page, the
// introduction and the conditions/total/signature section each spill across
// as many pages as their content needs, and — for the latter — the total and
// signature simply follow the conditions text in the same flow rather than
// being pushed onto a forced extra page.
const LONG_INTRODUCTION_PARAGRAPHS = [
  'El presente presupuesto contempla la reforma integral de la vivienda situada en Carrer de Mallorca 245, 3º 1ª, de Barcelona, e incluye la totalidad de los trabajos necesarios para modernizar el inmueble manteniendo su distribución actual: demoliciones y trabajos previos, renovación completa de las instalaciones eléctrica y de fontanería, sustitución de revestimientos y pavimentos, y la carpintería interior y los acabados finales. El objetivo del proyecto es entregar una vivienda funcional, energéticamente más eficiente y acorde con los estándares actuales de habitabilidad, sin alterar la superficie útil ni la configuración de estancias existente, salvo en aquellos puntos en los que expresamente se indique lo contrario en la memoria de calidades adjunta.',
  'Los trabajos de demolición y desmontaje previo abarcan la tabiquería interior que deba eliminarse para permitir el paso de las nuevas instalaciones, el picado de revestimientos existentes en las zonas afectadas, la retirada de carpintería interior en mal estado y el desmontaje del mobiliario de cocina actual. Toda la gestión de residuos de construcción y demolición generados se realizará conforme a la normativa vigente, con transporte a planta autorizada y canon de gestión incluido en el precio de la partida correspondiente, de modo que el cliente no deba gestionar directamente ningún trámite relacionado con los escombros generados durante esta fase.',
  'La instalación eléctrica se renovará en su totalidad conforme al Reglamento Electrotécnico de Baja Tensión (REBT) vigente, incluyendo un nuevo cuadro general de mando y protección, la sustitución de todo el cableado interior, la incorporación de mecanismos de gama media-alta en acabado blanco y la actualización de la puesta a tierra general del edificio. Se prevé igualmente la instalación de un sistema de videoportero con monitor interior a color y la preinstalación completa (línea eléctrica y desagüe de condensados) para un futuro sistema de aire acondicionado por conductos, de manera que el cliente pueda incorporar climatización sin necesidad de obra adicional en el futuro.',
  'En cuanto a fontanería y saneamiento, se sustituirá íntegramente la red de distribución de agua fría y caliente sanitaria por tubería multicapa, con llaves de corte independientes por estancia y aislamiento térmico en los tramos de agua caliente conforme al Reglamento de Instalaciones Térmicas en los Edificios (RITE). Se renovará asimismo el tramo visto de bajante de saneamiento en la zona de cocina y baño, y se sustituirá el termo eléctrico existente por uno nuevo de mayor capacidad, mejorando así tanto el confort como la eficiencia energética del sistema de agua caliente sanitaria de la vivienda.',
  'Los trabajos de revestimientos y pavimentos incluyen la colocación de gres porcelánico rectificado de gran formato en las zonas de paso y estancias principales, el alicatado completo del cuarto de baño con cerámica de formato medio, el guarnecido y enlucido de yeso en los paramentos verticales que lo requieran y el posterior acabado con pintura plástica lisa en dos manos. Se incluye igualmente el remate con rodapié cerámico a juego con el pavimento elegido, de forma que el conjunto de acabados presente una imagen homogénea y coherente en toda la vivienda una vez finalizada la obra.',
  'Finalmente, en la fase de carpintería y acabados se sustituirán las puertas de paso interiores por hojas lisas lacadas en blanco con premarco, cerco y tapajuntas a juego, y se incorporará un armario empotrado a medida con puertas correderas lacadas e interior forrado en la zona de dormitorios. La obra concluye con una limpieza final exhaustiva de todas las estancias y la retirada de cualquier material sobrante, dejando la vivienda en condiciones de ser habitada de inmediato por el cliente.',
  'El plazo de ejecución estimado para el conjunto de los trabajos descritos es de aproximadamente ocho a diez semanas naturales desde el inicio de la obra, sujeto a la disponibilidad de materiales y a la ausencia de imprevistos estructurales u ocultos que puedan surgir durante la fase de demolición. Cualquier desviación relevante sobre este plazo será comunicada al cliente con la mayor antelación posible, junto con las causas que la motiven y, en su caso, la incidencia económica que pudiera derivarse de trabajos adicionales no contemplados originalmente en este presupuesto.',
  'Todos los materiales presupuestados corresponden a la gama y calidad descritas en cada partida y podrán sustituirse por otros de características equivalentes o superiores en caso de falta de disponibilidad del fabricante, siempre con conformidad previa del cliente y sin coste adicional cuando el precio de mercado del material alternativo sea igual o inferior al presupuestado. Cualquier cambio de calidad que suponga un incremento de coste será presentado al cliente como una modificación del presupuesto original antes de proceder a su ejecución, de modo que no se realice ningún gasto adicional sin la aprobación expresa del cliente.',
  'La dirección de la obra se coordinará directamente con el cliente a través de visitas semanales de seguimiento, en las que se revisará el estado de ejecución de los trabajos, se resolverán dudas sobre acabados y materiales, y se documentará fotográficamente el avance de las instalaciones antes de su cierre con revestimientos, de forma que quede constancia del recorrido real de las mismas para cualquier intervención futura sobre la vivienda.',
  'Este presupuesto se ha elaborado a partir de la visita técnica realizada en la vivienda y de la documentación gráfica facilitada por el cliente, y refleja el alcance de los trabajos tal y como se ha acordado en dicha visita. Cualquier partida no contemplada expresamente en el desglose que figura a continuación, incluyendo trabajos de albañilería, instalaciones o acabados no descritos, quedará fuera del alcance de este presupuesto y se valorará de forma independiente si el cliente decide incorporarla al proyecto.',
].join('\n\n');

const LONG_CONDITIONS_PARAGRAPHS = [
  'El presente presupuesto tiene una validez de 30 días naturales desde su fecha de emisión. Transcurrido dicho plazo sin que el cliente haya manifestado su aceptación expresa, los precios y condiciones aquí recogidos podrán ser revisados por la empresa en función de la evolución del coste de materiales y mano de obra, sin que ello suponga obligación alguna de mantener las condiciones originalmente ofertadas.',
  'Los precios indicados no incluyen el Impuesto sobre el Valor Añadido (IVA), que se aplicará al tipo vigente en el momento de la facturación. Tampoco se incluyen tasas, licencias o permisos municipales que pudieran ser necesarios para la ejecución de los trabajos descritos, salvo que se indique expresamente lo contrario en alguna de las partidas del presupuesto; la gestión de dichos trámites, cuando sea necesaria, correrá por cuenta del cliente salvo acuerdo específico en sentido contrario.',
  'La forma de pago acordada es la siguiente: un 30% del importe total en concepto de aceptación del presupuesto y reserva de inicio de obra, un 40% adicional al comienzo efectivo de los trabajos en la vivienda, y el 30% restante a la finalización y entrega de la obra, previa conformidad del cliente con el resultado final. Los pagos se realizarán mediante transferencia bancaria a la cuenta indicada en la factura correspondiente, dentro de los cinco días hábiles siguientes a la emisión de cada una de ellas.',
  'Cualquier modificación sobre el alcance de los trabajos descritos en este presupuesto, ya sea por decisión del cliente o por la aparición de imprevistos no detectables durante la visita técnica previa (por ejemplo, patologías ocultas en la estructura, instalaciones no conformes o vicios constructivos preexistentes), se presupuestará de forma independiente y por escrito antes de su ejecución, y no se considerará incluida en el precio cerrado del presente documento salvo aceptación expresa de la parte compradora.',
  'La empresa se compromete a ejecutar los trabajos conforme a la normativa técnica de edificación vigente en cada una de las especialidades afectadas (electricidad, fontanería, albañilería y acabados), empleando materiales homologados y mano de obra cualificada. Se garantiza la calidad de la ejecución de los trabajos durante un periodo de doce meses desde la fecha de finalización de la obra, cubriendo defectos de ejecución imputables a la empresa, quedando excluido el desgaste por uso normal y los daños derivados de un mantenimiento inadecuado por parte del cliente.',
  'Quedan expresamente excluidos de esta garantía los daños ocasionados por un uso indebido de las instalaciones, por intervenciones de terceros no autorizados por la empresa sobre los trabajos ejecutados, o por causas de fuerza mayor ajenas al control de ambas partes, incluyendo fenómenos meteorológicos extraordinarios, cortes prolongados de suministro eléctrico o de agua, o cualquier otra circunstancia imprevisible que impida o dificulte de forma significativa la correcta conservación de lo ejecutado.',
  'El cliente se compromete a facilitar el acceso a la vivienda en el horario acordado con la dirección de obra durante todo el periodo de ejecución de los trabajos, así como a retirar previamente al inicio de la obra cualquier objeto personal o mobiliario de las estancias afectadas que no vaya a ser gestionado por la empresa. La empresa no se hace responsable de daños sobre bienes o mobiliario que no hayan sido retirados o debidamente protegidos por el cliente antes del inicio de los trabajos en cada estancia.',
  'En caso de que el cliente decida suspender temporalmente los trabajos por causas ajenas a la empresa, esta se reserva el derecho a facturar los trabajos ya ejecutados y los materiales ya adquiridos o encargados para la obra hasta la fecha de suspensión, así como a repercutir los gastos adicionales que dicha suspensión pudiera ocasionar (almacenaje de materiales, nueva planificación de equipos de trabajo, entre otros), previa comunicación detallada de dichos gastos al cliente.',
  'Cualquier discrepancia o reclamación relativa a la ejecución de los trabajos deberá comunicarse por escrito a la empresa en un plazo máximo de siete días naturales desde su detección, para permitir una valoración conjunta in situ y, en su caso, la subsanación correspondiente dentro de un plazo razonable. Ambas partes se comprometen a intentar resolver de buena fe cualquier desacuerdo antes de recurrir a cualquier otra vía, incluida la reclamación ante los órganos de consumo o judiciales que pudieran corresponder.',
  'La aceptación de este presupuesto, ya sea mediante firma del propio documento o mediante el abono del primer pago acordado, implica la conformidad plena del cliente con el alcance de los trabajos descritos, los precios indicados y la totalidad de las condiciones recogidas en este apartado, quedando ambas partes obligadas a su cumplimiento en los términos aquí establecidos desde el momento de dicha aceptación.',
].join('\n\n');

const LONG_DESCRIPTION_DEMOLITION =
  'Demolición manual y mecánica de tabiquería interior existente de ladrillo hueco doble, incluyendo el picado de revestimientos de yeso y alicatado cerámico en ambas caras hasta dejar el soporte visto, retirada de cercos de puertas y sus hojas, desmontaje de instalaciones eléctricas y de fontanería vistas que queden afectadas por la demolición, carga manual de escombros sobre contenedor situado en vía pública o dentro de la propiedad según acceso disponible, y transporte a vertedero o planta de reciclaje autorizada con canon de gestión de residuos de construcción y demolición incluido, cumpliendo la normativa vigente de gestión de RCD.';

const LONG_DESCRIPTION_ELECTRICAL =
  'Suministro e instalación de nueva instalación eléctrica interior en vivienda conforme al Reglamento Electrotécnico de Baja Tensión (REBT), incluyendo cuadro general de mando y protección con interruptor general automático, interruptores diferenciales y magnetotérmicos por circuito, tubo corrugado empotrado en rozas de pared y techo, cableado de cobre con aislamiento libre de halógenos, mecanismos de la serie Simon 270 o equivalente en acabado blanco, cajas de registro y derivación, puesta a tierra general del edificio conectada a pica y conductor de protección, y boletín eléctrico de la instalación emitido por instalador autorizado, previa comprobación y pruebas de funcionamiento de todos los circuitos.';

const LONG_DESCRIPTION_PLUMBING =
  'Renovación completa de la instalación de fontanería de la vivienda con tubería multicapa para agua fría y caliente sanitaria, incluyendo llaves de corte general y por estancia, distribución en instalación empotrada bajo pavimento y en rozas de pared debidamente protegidas con corrugado, conexión a los aparatos sanitarios existentes y de nueva instalación, aislamiento térmico de las conducciones de agua caliente conforme al RITE, pruebas de estanqueidad y presión de la red completa antes de su cierre, y limpieza y desinfección de la instalación previa a la puesta en servicio.';

const LONG_DESCRIPTION_FLOORING =
  'Suministro y colocación de pavimento de gres porcelánico rectificado de 60x60 cm, formato gran lama, acabado mate antideslizante clase C2, recibido con mortero cola de altas prestaciones sobre solera de mortero de cemento previamente nivelada y fratasada, incluyendo cortes, ingletes en encuentros con paramentos verticales, rejuntado con mortero de junta fina de color a elegir por la dirección facultativa, limpieza final de restos de mortero y protección de la superficie acabada hasta la entrega de la obra.';

interface LineItemDraft {
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

function buildLineItem(chapterId: string, order: number, overrides: LineItemDraft) {
  const amount = Math.round(overrides.quantity * overrides.unitPrice * 100) / 100;
  return {
    id: `${chapterId}-item-${order}`,
    chapterId,
    code: overrides.code,
    description: overrides.description,
    unit: overrides.unit,
    quantity: overrides.quantity,
    unitPrice: overrides.unitPrice,
    amount,
    order,
  };
}

function buildChapter(
  id: string,
  order: number,
  title: string,
  items: LineItemDraft[]
): ChapterWithLineItems {
  return {
    id,
    estimateId: 'estimate-mock-001',
    title,
    order,
    lineItems: items.map((item, index) => buildLineItem(id, index, item)),
  };
}

const chapters: ChapterWithLineItems[] = [
  buildChapter('chapter-1', 0, 'Demoliciones y trabajos previos', [
    {
      code: 'DEM-001',
      description: LONG_DESCRIPTION_DEMOLITION,
      unit: 'm²',
      quantity: 42,
      unitPrice: 18.5,
    },
    {
      code: 'DEM-002',
      description: 'Desmontaje de carpintería interior existente, incluida retirada de tapajuntas.',
      unit: 'ud',
      quantity: 6,
      unitPrice: 22,
    },
    {
      code: 'DEM-003',
      description: 'Retirada de mobiliario de cocina existente y desconexión de electrodomésticos.',
      unit: 'ud',
      quantity: 1,
      unitPrice: 180,
    },
    {
      code: 'DEM-004',
      description: 'Protección de pavimentos y elementos existentes durante la ejecución de la obra.',
      unit: 'm²',
      quantity: 85,
      unitPrice: 3.2,
    },
  ]),
  buildChapter('chapter-2', 1, 'Instalación eléctrica', [
    {
      code: 'ELE-001',
      description: LONG_DESCRIPTION_ELECTRICAL,
      unit: 'ud',
      quantity: 1,
      unitPrice: 3450,
    },
    {
      code: 'ELE-002',
      description: 'Punto de luz sencillo con mecanismo e instalación completa.',
      unit: 'ud',
      quantity: 14,
      unitPrice: 65,
    },
    {
      code: 'ELE-003',
      description: 'Base de enchufe schuko 16A con mecanismo e instalación completa.',
      unit: 'ud',
      quantity: 22,
      unitPrice: 48,
    },
    {
      code: 'ELE-004',
      description: 'Instalación de videoportero con monitor interior a color.',
      unit: 'ud',
      quantity: 1,
      unitPrice: 210,
    },
    {
      code: 'ELE-005',
      description: 'Preinstalación de aire acondicionado por conductos (línea eléctrica y desagüe).',
      unit: 'ud',
      quantity: 1,
      unitPrice: 390,
    },
  ]),
  buildChapter('chapter-3', 2, 'Fontanería y saneamiento', [
    {
      code: 'FON-001',
      description: LONG_DESCRIPTION_PLUMBING,
      unit: 'ud',
      quantity: 1,
      unitPrice: 2680,
    },
    {
      code: 'FON-002',
      description: 'Sustitución de bajante de saneamiento en tramo visto de cocina y baño.',
      unit: 'm',
      quantity: 8,
      unitPrice: 32,
    },
    {
      code: 'FON-003',
      description: 'Suministro e instalación de termo eléctrico de 100 litros.',
      unit: 'ud',
      quantity: 1,
      unitPrice: 340,
    },
  ]),
  buildChapter('chapter-4', 3, 'Revestimientos y pavimentos', [
    {
      code: 'REV-001',
      description: LONG_DESCRIPTION_FLOORING,
      unit: 'm²',
      quantity: 78,
      unitPrice: 39.9,
    },
    {
      code: 'REV-002',
      description: 'Alicatado de baño con azulejo cerámico 30x60 cm incluyendo rejuntado.',
      unit: 'm²',
      quantity: 24,
      unitPrice: 34.5,
    },
    {
      code: 'REV-003',
      description: 'Guarnecido y enlucido de yeso en paramentos verticales.',
      unit: 'm²',
      quantity: 96,
      unitPrice: 11.2,
    },
    {
      code: 'REV-004',
      description: 'Pintura plástica lisa dos manos sobre paramentos previamente preparados.',
      unit: 'm²',
      quantity: 210,
      unitPrice: 6.8,
    },
    {
      code: 'REV-005',
      description: 'Suministro y colocación de rodapié cerámico a juego con el pavimento.',
      unit: 'm',
      quantity: 46,
      unitPrice: 8.4,
    },
  ]),
  buildChapter('chapter-5', 4, 'Carpintería y acabados finales', [
    {
      code: 'CAR-001',
      description: 'Puerta de paso lisa lacada en blanco con premarco, cerco y tapajuntas incluidos.',
      unit: 'ud',
      quantity: 6,
      unitPrice: 245,
    },
    {
      code: 'CAR-002',
      description: 'Armario empotrado a medida con puertas correderas lacadas y interior forrado.',
      unit: 'ud',
      quantity: 2,
      unitPrice: 890,
    },
    {
      code: 'CAR-003',
      description: 'Limpieza final de obra y retirada de todos los materiales sobrantes.',
      unit: 'ud',
      quantity: 1,
      unitPrice: 320,
    },
  ]),
];

export const mockEstimateDocumentData: EstimateDocumentData = {
  estimate: {
    id: 'estimate-mock-001',
    estimateNumber: '123-26',
    year: 2026,
    customerId: 'customer-mock-001',
    subject: 'Reforma integral de vivienda',
    site: 'Carrer de Mallorca 245, 3º 1ª, 08036 Barcelona',
    creationDate: '2026-08-15',
    status: 'draft',
    taxRate: 21,
    introduction: LONG_INTRODUCTION_PARAGRAPHS,
    templateId: 'template-mock-001',
    finalNoteTitle: 'Condiciones del presupuesto',
    finalNoteContent: LONG_CONDITIONS_PARAGRAPHS,
    templateOverrides: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  customer: {
    id: 'customer-mock-001',
    name: 'Marta Puig Soler',
    address: 'Carrer de Mallorca 245, 3º 1ª, 08036 Barcelona',
    phone: '+34 93 555 12 34',
    email: 'marta.puig@example.com',
    taxId: '38456789K',
    notes: '',
  },
  chapters,
  company: {
    id: 'company-mock-001',
    name: 'Reformas Ortiz S.L.',
    address: 'Avinguda Diagonal 512, local 2',
    postalCode: '08006 Barcelona',
    phone: '+34 93 200 44 11',
    email: 'info@reformasortiz.example',
    taxId: 'B12345678',
    slogan: 'Construimos confianza, reforma a reforma',
  },
  standardNote: {
    id: 'standard-text-001',
    key: 'estimate-final-note',
    title: 'Condiciones del presupuesto',
    content: LONG_CONDITIONS_PARAGRAPHS,
  },
  creationLocation: 'Barcelona',
};
