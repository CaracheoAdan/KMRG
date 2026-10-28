/**
 * Diccionario Oficial del Juego del Ahorcado KMRG
 * Incluye palabras clásicas, vocabulario técnico de Ingeniería en Sistemas (Javier),
 * conceptos clave de Administración y Gestión (Karlita), ciencia y cultura general.
 */

export interface HangmanWordItem {
  word: string;
  hint: string;
  category: string;
}

export const HANGMAN_DICTIONARY: HangmanWordItem[] = [
  {
    "word": "MATRIX",
    "hint": "Ciencia ficción con Neo y las pastillas roja y azul",
    "category": "Cine"
  },
  {
    "word": "TITANIC",
    "hint": "Famoso barco transatlántico y un iceberg",
    "category": "Cine"
  },
  {
    "word": "AVATAR",
    "hint": "Seres de piel azul en el planeta Pandora",
    "category": "Cine"
  },
  {
    "word": "BATMAN",
    "hint": "El caballero de la noche protegiendo Gotham",
    "category": "Cine"
  },
  {
    "word": "SHREK",
    "hint": "Ogro verde carismático que vive en un pantano",
    "category": "Cine"
  },
  {
    "word": "INCEPTION",
    "hint": "Ladrones que se infiltran dentro de los sueños",
    "category": "Cine"
  },
  {
    "word": "SPIDERMAN",
    "hint": "Héroe con traje arácnido que trepa paredes",
    "category": "Cine"
  },
  {
    "word": "GLADIADOR",
    "hint": "Guerrero romano en busca de honor y venganza",
    "category": "Cine"
  },
  {
    "word": "STARWARS",
    "hint": "Guerra galáctica con sables de luz y caballeros Jedi",
    "category": "Cine"
  },
  {
    "word": "JURASSIC",
    "hint": "Parque con dinosaurios clonados que se escapan",
    "category": "Cine"
  },
  {
    "word": "ELEFANTE",
    "hint": "Mamífero terrestre gigante con colmillos y trompa",
    "category": "Animales"
  },
  {
    "word": "JIRAFA",
    "hint": "El animal más alto del mundo con cuello largo",
    "category": "Animales"
  },
  {
    "word": "DELFIN",
    "hint": "Mamífero marino muy sociable e inteligente",
    "category": "Animales"
  },
  {
    "word": "CANGURO",
    "hint": "Salta velozmente y lleva a su cría en una bolsa",
    "category": "Animales"
  },
  {
    "word": "PINGUINO",
    "hint": "Ave que no vuela pero nada en aguas congeladas",
    "category": "Animales"
  },
  {
    "word": "LEOPARDO",
    "hint": "Felino salvaje muy veloz con manchas oscuras",
    "category": "Animales"
  },
  {
    "word": "MARIPOSA",
    "hint": "Insecto con alas coloridas tras salir del capullo",
    "category": "Animales"
  },
  {
    "word": "VOLCAN",
    "hint": "Montaña con cráter que expulsa lava y humo",
    "category": "Naturaleza"
  },
  {
    "word": "ARCOIRIS",
    "hint": "Banda de colores que surge cuando llueve con sol",
    "category": "Naturaleza"
  },
  {
    "word": "JAPON",
    "hint": "País del sol naciente, sushi y templos",
    "category": "Geografía"
  },
  {
    "word": "ITALIA",
    "hint": "País con forma de bota, cuna de la pizza y el Coliseo",
    "category": "Geografía"
  },
  {
    "word": "FRANCIA",
    "hint": "País de la Torre Eiffel y los croissants",
    "category": "Geografía"
  },
  {
    "word": "CANADA",
    "hint": "País norteño con hoja de arce en su bandera",
    "category": "Geografía"
  },
  {
    "word": "BRASIL",
    "hint": "País más grande de Sudamérica famoso por su carnaval",
    "category": "Geografía"
  },
  {
    "word": "EGIPTO",
    "hint": "Tierra de pirámides milenarias y el río Nilo",
    "category": "Geografía"
  },
  {
    "word": "PIZZA",
    "hint": "Masa horneada con salsa de tomate y queso derretido",
    "category": "Comida"
  },
  {
    "word": "HAMBURGUESA",
    "hint": "Carne en pan con queso, lechuga y papas fritas",
    "category": "Comida"
  },
  {
    "word": "CHOCOLATE",
    "hint": "Dulce delicioso elaborado a partir del cacao",
    "category": "Comida"
  },
  {
    "word": "ESPAGUETI",
    "hint": "Pasta larga italiana con salsa boloñesa",
    "category": "Comida"
  },
  {
    "word": "SUSHI",
    "hint": "Rollo japonés de arroz con pescado fresco o aguacate",
    "category": "Comida"
  },
  {
    "word": "HELADO",
    "hint": "Postre cremoso servido muy frío en cono o copa",
    "category": "Comida"
  },
  {
    "word": "TACOS",
    "hint": "Tortilla con carne asada, cilantro y cebolla",
    "category": "Comida"
  },
  {
    "word": "GUITARRA",
    "hint": "Instrumento musical de seis cuerdas y caja sonora",
    "category": "Objetos"
  },
  {
    "word": "TELESCOPIO",
    "hint": "Instrumento óptico para ver planetas y estrellas",
    "category": "Tecnología"
  },
  {
    "word": "COMPUTADORA",
    "hint": "Máquina electrónica para procesar datos y navegar",
    "category": "Tecnología"
  },
  {
    "word": "AUDIFONOS",
    "hint": "Dispositivo para escuchar música en privado",
    "category": "Objetos"
  },
  {
    "word": "BICICLETA",
    "hint": "Vehículo de dos ruedas impulsado por pedales",
    "category": "Objetos"
  },
  {
    "word": "COHETE",
    "hint": "Vehículo que viaja a gran velocidad al espacio exterior",
    "category": "Tecnología"
  },
  {
    "word": "ASTRONAUTA",
    "hint": "Persona entrenada para viajar al espacio exterior",
    "category": "Ciencia"
  },
  {
    "word": "GALAXIA",
    "hint": "Enorme sistema de miles de millones de estrellas",
    "category": "Espacio"
  },
  {
    "word": "DINOSAURIO",
    "hint": "Reptiles colosales que dominaron la Tierra",
    "category": "Historia"
  },
  {
    "word": "POKEMON",
    "hint": "Criaturas de bolsillo con entrenadores y batallas",
    "category": "Videojuegos"
  },
  {
    "word": "MINECRAFT",
    "hint": "Juego de construcción y supervivencia con cubos",
    "category": "Videojuegos"
  },
  {
    "word": "TETRIS",
    "hint": "Clásico juego de acomodar piezas geométricas que caen",
    "category": "Videojuegos"
  },
  {
    "word": "AJEDREZ",
    "hint": "Juego de estrategia con tablero de 64 casillas",
    "category": "Juegos"
  },
  {
    "word": "ALGORITMO",
    "hint": "Secuencia finita y ordenada de pasos para resolver un problema computacional",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "POLIMORFISMO",
    "hint": "Pilar de POO donde objetos de diferentes clases responden al mismo mensaje",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "CRIPTOGRAFIA",
    "hint": "Técnica matemática para cifrar datos y garantizar comunicaciones confidenciales",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "MICROSERVICIOS",
    "hint": "Arquitectura que estructura un software como colección de servicios autónomos",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "RECURSIVIDAD",
    "hint": "Método algorítmico donde una función se invoca a sí misma para resolver un subproblema",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "CONCURRENCIA",
    "hint": "Capacidad de un sistema de gestionar y ejecutar múltiples tareas en paralelo",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "FIREWALL",
    "hint": "Barrera de seguridad de red que filtra y bloquea tráfico no autorizado",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "KUBERNETES",
    "hint": "Plataforma líder para automatizar el despliegue y orquestación de contenedores",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "HEURISTICA",
    "hint": "Regla o método práctico para hallar soluciones aproximadas a problemas complejos",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "ESCALABILIDAD",
    "hint": "Habilidad de un sistema para soportar una carga de tráfico y usuarios creciente",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "BACKEND",
    "hint": "Capa lógica y de procesamiento en el servidor que no ve el usuario final",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "FRONTEND",
    "hint": "Capa de interfaz visual interactiva que el usuario manipula directamente",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "ASINCRONO",
    "hint": "Patrón de ejecución no bloqueante que gestiona respuestas diferidas o promesas",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "COMPILADOR",
    "hint": "Programa que traduce código de alto nivel a código binario ejecutable por la máquina",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "REPOSITORIO",
    "hint": "Espacio centralizado donde se aloja, versiona y controla el código fuente (ej. Git)",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "NORMALIZACION",
    "hint": "Técnica en bases de datos relacionales para evitar redundancia e inconsistencias",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "INDEXACION",
    "hint": "Estructura interna tipo B-Tree para acelerar la búsqueda de registros en una BD",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "SERIALIZACION",
    "hint": "Conversión de un objeto en memoria a un flujo de datos transmisible (como JSON)",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "DEVOPS",
    "hint": "Cultura y prácticas que integran desarrollo ágil y operaciones de infraestructura",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "LATENCIA",
    "hint": "Tiempo de retardo en milisegundos que tarda un paquete de datos en viajar por la red",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "AUTENTICACION",
    "hint": "Mecanismo para verificar la identidad legítima de un usuario mediante credenciales",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "CONTAINER",
    "hint": "Paquete de software ligero que incluye código y todas sus dependencias (ej. Docker)",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "IDEMPOTENCIA",
    "hint": "Propiedad donde ejecutar una petición varias veces da exactamente el mismo resultado",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "PERSISTENCIA",
    "hint": "Capacidad de los datos de conservarse almacenados tras apagar la aplicación",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "DEPENDENCIAS",
    "hint": "Bibliotecas o paquetes externos requeridos por un proyecto de software para funcionar",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "INYECCION",
    "hint": "Vulnerabilidad grave donde se introduce código malicioso en una consulta (SQLi)",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "BANDWIDTH",
    "hint": "Ancho de banda o volumen máximo de datos transferibles por segundo en una conexión",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "FRAMEWORK",
    "hint": "Estructura estandarizada con utilidades prefabricadas para acelerar el desarrollo",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "PROMETHEUS",
    "hint": "Sistema de código abierto líder para recolección de métricas y alertas en servidores",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "TRANSMISION",
    "hint": "Envío continuo de señales y paquetes de datos a través de un medio físico o inalámbrico",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "METADATOS",
    "hint": "Información estructurada que describe las características y contexto de otros datos",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "PROTOCOLO",
    "hint": "Conjunto formal de reglas que determina la comunicación entre nodos de una red",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "ABSTRACCION",
    "hint": "Principio de ocultar detalles técnicos complejos para exponer solo lo esencial",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "SOCKETS",
    "hint": "Puntos finales que permiten comunicación bidireccional y continua en tiempo real",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "VIRTUALIZACION",
    "hint": "Tecnología para crear versiones virtuales de hardware, servidores o almacenamiento",
    "category": "Ingeniería en Sistemas"
  },
  {
    "word": "ORGANIGRAMA",
    "hint": "Representación gráfica de la jerarquía, departamentos y puestos de una empresa",
    "category": "Administración y Gestión"
  },
  {
    "word": "BENCHMARKING",
    "hint": "Comparación sistemática de procesos y métricas contra las empresas líderes del sector",
    "category": "Administración y Gestión"
  },
  {
    "word": "LIQUIDEZ",
    "hint": "Facilidad y velocidad con la que los activos de una empresa se transforman en dinero líquido",
    "category": "Administración y Gestión"
  },
  {
    "word": "AMORTIZACION",
    "hint": "Distribución periódica del valor de una deuda o del costo intangible de una inversión",
    "category": "Administración y Gestión"
  },
  {
    "word": "DEPRECIACION",
    "hint": "Disminución periódica del valor contable de los activos fijos por su uso y desgaste",
    "category": "Administración y Gestión"
  },
  {
    "word": "SINERGIA",
    "hint": "Fenómeno donde el impacto combinado del equipo supera la suma de sus esfuerzos aislados",
    "category": "Administración y Gestión"
  },
  {
    "word": "RENTABILIDAD",
    "hint": "Capacidad de un negocio de generar ganancias netas en proporción al capital invertido",
    "category": "Administración y Gestión"
  },
  {
    "word": "PLANIFICACION",
    "hint": "Etapa del proceso administrativo donde se definen metas, estrategias y asignación de recursos",
    "category": "Administración y Gestión"
  },
  {
    "word": "PRESUPUESTO",
    "hint": "Estimación cuantitativa y formal de los ingresos y gastos para un período futuro",
    "category": "Administración y Gestión"
  },
  {
    "word": "AUDITORIA",
    "hint": "Examen crítico, metódico e independiente de los estados financieros y operaciones",
    "category": "Administración y Gestión"
  },
  {
    "word": "LOGISTICA",
    "hint": "Planificación y control del flujo de materias primas, inventario y productos terminados",
    "category": "Administración y Gestión"
  },
  {
    "word": "OUTSOURCING",
    "hint": "Contratación externa de servicios o procesos para optimizar costos y concentrarse en el core",
    "category": "Administración y Gestión"
  },
  {
    "word": "DIVIDENDOS",
    "hint": "Porción de las utilidades de una empresa que se distribuye periódicamente entre socios",
    "category": "Administración y Gestión"
  },
  {
    "word": "PATRIMONIO",
    "hint": "Conjunto de bienes, derechos y obligaciones que pertenecen a una entidad económica",
    "category": "Administración y Gestión"
  },
  {
    "word": "EFICIENCIA",
    "hint": "Capacidad de alcanzar los objetivos planteados con el menor consumo de recursos posible",
    "category": "Administración y Gestión"
  },
  {
    "word": "SUSTENTABILIDAD",
    "hint": "Capacidad de un modelo corporativo de prosperar cuidando el medio ambiente y la sociedad",
    "category": "Administración y Gestión"
  },
  {
    "word": "LIDERAZGO",
    "hint": "Habilidad de inspirar, guiar e influir en las personas para alcanzar un propósito compartido",
    "category": "Administración y Gestión"
  },
  {
    "word": "COMPETITIVIDAD",
    "hint": "Capacidad de una empresa de ofrecer productos superiores y ganar participación de mercado",
    "category": "Administración y Gestión"
  },
  {
    "word": "NEGOCIACION",
    "hint": "Proceso de comunicación entre dos o más partes que buscan un acuerdo de beneficio mutuo",
    "category": "Administración y Gestión"
  },
  {
    "word": "INVENTARIO",
    "hint": "Registro detallado y clasificado de las existencias de mercancía listas para comercializar",
    "category": "Administración y Gestión"
  },
  {
    "word": "SOLVENCIA",
    "hint": "Capacidad financiera de una empresa para cumplir puntualmente con todas sus deudas",
    "category": "Administración y Gestión"
  },
  {
    "word": "GOBERNANZA",
    "hint": "Marco de principios, políticas y controles bajo los cuales opera la dirección corporativa",
    "category": "Administración y Gestión"
  },
  {
    "word": "RETENCION",
    "hint": "Estrategias de gestión del talento humano para fidelizar y retener a los mejores colaboradores",
    "category": "Administración y Gestión"
  },
  {
    "word": "INCENTIVO",
    "hint": "Estímulo económico o moral otorgado para motivar la productividad y el alto desempeño",
    "category": "Administración y Gestión"
  },
  {
    "word": "INFLACION",
    "hint": "Aumento continuo y generalizado en los precios que deteriora el poder adquisitivo",
    "category": "Administración y Gestión"
  },
  {
    "word": "CONSENSO",
    "hint": "Decisión adoptada por común acuerdo y sin objeciones fundamentales entre los directivos",
    "category": "Administración y Gestión"
  },
  {
    "word": "DELEGACION",
    "hint": "Acto de otorgar autoridad a colaboradores para tomar decisiones y ejecutar proyectos",
    "category": "Administración y Gestión"
  },
  {
    "word": "EMPRENDIMIENTO",
    "hint": "Iniciativa de desarrollar una oportunidad de negocio innovadora asumiendo riesgos",
    "category": "Administración y Gestión"
  },
  {
    "word": "PROVEEDORES",
    "hint": "Empresas o personas clave que abastecen insumos necesarios para la cadena de valor",
    "category": "Administración y Gestión"
  },
  {
    "word": "CAPITALISMO",
    "hint": "Sistema económico fundamentado en la propiedad privada y la libre competencia del mercado",
    "category": "Administración y Gestión"
  },
  {
    "word": "ARANCEL",
    "hint": "Tarifa o impuesto aduanero aplicado a mercancías importadas o exportadas",
    "category": "Administración y Gestión"
  },
  {
    "word": "ACCIONISTAS",
    "hint": "Titulares legítimos de acciones que conforman el capital social de una corporación",
    "category": "Administración y Gestión"
  },
  {
    "word": "BALANCETE",
    "hint": "Documento contable que comprueba la igualdad de débitos y créditos del libro mayor",
    "category": "Administración y Gestión"
  },
  {
    "word": "DIAGNOSTICO",
    "hint": "Evaluación analítica y objetiva de las fortalezas y debilidades de una organización (FODA)",
    "category": "Administración y Gestión"
  },
  {
    "word": "FACTURACION",
    "hint": "Registro mercantil y formal del monto total de ingresos por ventas en un ejercicio",
    "category": "Administración y Gestión"
  },
  {
    "word": "SERENDIPIA",
    "hint": "Descubrimiento o hallazgo afortunado e inesperado que ocurre de casualidad",
    "category": "Cultura y Vocabulario"
  },
  {
    "word": "RESILIENCIA",
    "hint": "Capacidad de sobreponerse a situaciones traumáticas y salir fortalecido de ellas",
    "category": "Cultura y Vocabulario"
  },
  {
    "word": "INEFABLE",
    "hint": "Aquello tan asombroso, sublime o conmovedor que no se puede describir con palabras",
    "category": "Cultura y Vocabulario"
  },
  {
    "word": "EFIMERO",
    "hint": "Aquello que dura un periodo de tiempo muy breve, fugaz y pasajero",
    "category": "Cultura y Vocabulario"
  },
  {
    "word": "METAMORFOSIS",
    "hint": "Cambio o transformación radical en la forma, estructura o naturaleza de algo",
    "category": "Cultura y Vocabulario"
  },
  {
    "word": "ENTROPIA",
    "hint": "Magnitud física que mide el grado de desorden e irreversibilidad de un sistema",
    "category": "Ciencia y Cultura"
  },
  {
    "word": "FOTOSINTESIS",
    "hint": "Proceso biológico donde las plantas convierten energía solar y CO2 en oxígeno y glucosa",
    "category": "Ciencia y Cultura"
  },
  {
    "word": "PALEONTOLOGIA",
    "hint": "Ciencia que estudia los seres prehistóricos que habitaron la Tierra mediante fósiles",
    "category": "Ciencia y Cultura"
  },
  {
    "word": "ASTRONOMIA",
    "hint": "Ciencia que estudia los astros, nebulosas, planetas y la evolución del universo",
    "category": "Ciencia y Cultura"
  },
  {
    "word": "PARADIGMA",
    "hint": "Modelo, teoría o sistema de ideas que sirve como patrón indiscutible en una época",
    "category": "Cultura y Vocabulario"
  },
  {
    "word": "CONSTELACION",
    "hint": "Agrupación aparente de estrellas en el cielo nocturno que dibuja figuras mitológicas",
    "category": "Ciencia y Cultura"
  },
  {
    "word": "ECOSISTEMA",
    "hint": "Comunidad biológica de seres vivos interconectados dinámicamente con su medio físico",
    "category": "Ciencia y Cultura"
  },
  {
    "word": "FILOSOFIA",
    "hint": "Conjunto de reflexiones sobre las causas primeras y fines supremos del ser y la vida",
    "category": "Cultura y Vocabulario"
  },
  {
    "word": "COMPLICIDAD",
    "hint": "Entendimiento íntimo y afectuoso entre dos personas que se comprenden sin palabras",
    "category": "Romance y Pareja"
  },
  {
    "word": "ATMOSFERA",
    "hint": "Capa protectora de gases que envuelve a un planeta y hace viable la vida",
    "category": "Ciencia y Cultura"
  },
  {
    "word": "VANGUARDIA",
    "hint": "Punto más avanzado de innovación que anticipa y define el futuro del arte o la ciencia",
    "category": "Cultura y Vocabulario"
  },
  {
    "word": "SINFONIA",
    "hint": "Composición musical clásica y compleja escrita para ser tocada por una orquesta",
    "category": "Arte y Cultura"
  },
  {
    "word": "LABERINTO",
    "hint": "Espacio intrincado de calles o senderos donde es muy difícil encontrar la salida",
    "category": "Cultura y Vocabulario"
  },
  {
    "word": "CALEIDOSCOPIO",
    "hint": "Instrumento óptico tubular que genera patrones simétricos multicolores al girar",
    "category": "Arte y Cultura"
  },
  {
    "word": "PERSEVERANCIA",
    "hint": "Constancia inquebrantable y dedicación para culminar una meta pese a las dificultades",
    "category": "Cultura y Vocabulario"
  },
  {
    "word": "COMPROMISO",
    "hint": "Decisión voluntaria, leal y madura de caminar juntos y cuidarse incondicionalmente",
    "category": "Romance y Pareja"
  },
  {
    "word": "EMPATIA",
    "hint": "Habilidad emocional y cognitiva de sintonizar y comprender los sentimientos del otro",
    "category": "Romance y Pareja"
  },
  {
    "word": "ARQUITECTURA",
    "hint": "Arte y técnica de proyectar y edificar estructuras habitables y estéticamente armónicas",
    "category": "Arte y Cultura"
  },
  {
    "word": "EUPHORIA",
    "hint": "Estado de ánimo exultante de júbilo, entusiasmo desbordante y optimismo pleno",
    "category": "Cultura y Vocabulario"
  },
  {
    "word": "EQUILIBRIO",
    "hint": "Estado de estabilidad y armonía donde fuerzas opuestas se compensan perfectamente",
    "category": "Cultura y Vocabulario"
  },
  {
    "word": "CONVERGENCIA",
    "hint": "Punto de encuentro donde diferentes caminos, visiones o ideas se unen en uno solo",
    "category": "Cultura y Vocabulario"
  },
  {
    "word": "NOSTALGIA",
    "hint": "Sentimiento dulce y melancólico de anhelo por momentos entrañables ya vividos",
    "category": "Romance y Pareja"
  },
  {
    "word": "SIMBIOSIS",
    "hint": "Asociación biológica íntima y benéfica entre dos organismos que se complementan",
    "category": "Ciencia y Cultura"
  },
  {
    "word": "CREATIVIDAD",
    "hint": "Capacidad de generar ideas ingeniosas y novedosas para resolver desafíos cotidianos",
    "category": "Cultura y Vocabulario"
  },
  {
    "word": "EPITOME",
    "hint": "Ejemplo representativo supremo que resume a la perfección las mejores virtudes de algo",
    "category": "Cultura y Vocabulario"
  }
];
