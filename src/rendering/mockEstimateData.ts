// Realistic mock data for validating the document rendering prototype.
// Deliberately includes several chapters, a large number of line items and a
// handful of very long descriptions so pagination has to kick in — this is
// the scenario the rendering engine must handle correctly, per SPECS.md §16
// ("Rendering tests should generate representative PDFs containing short and
// very long descriptions, many chapters, page breaks and final-page content").

import type { EstimateDocumentData } from './types';
import type { ChapterWithLineItems } from '../domain/calculations';

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
    introduction:
      'El presente presupuesto contempla la reforma integral de la vivienda, incluyendo demoliciones y trabajos previos, renovación completa de las instalaciones eléctrica y de fontanería, y sustitución de revestimientos, pavimentos y carpintería interior. El objetivo es modernizar la vivienda manteniendo la distribución actual, con acabados de calidad y cumpliendo la normativa vigente en cada una de las instalaciones afectadas.',
    templateId: 'template-mock-001',
    finalNoteTitle: 'Condiciones del presupuesto',
    finalNoteContent:
      'Presupuesto válido durante 30 días naturales desde la fecha de emisión. El precio no incluye IVA. Forma de pago: 30% a la aceptación del presupuesto, 40% al inicio de obra y 30% a la finalización.',
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
    content:
      'Presupuesto válido durante 30 días naturales desde la fecha de emisión. El precio no incluye IVA. Forma de pago: 30% a la aceptación del presupuesto, 40% al inicio de obra y 30% a la finalización. Cualquier modificación sobre el alcance descrito se presupuestará de forma independiente.',
  },
  creationLocation: 'Barcelona',
};
