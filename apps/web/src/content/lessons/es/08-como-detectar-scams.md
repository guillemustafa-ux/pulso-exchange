# Cómo detectar scams en cripto

El ecosistema cripto atrae estafas por una razón simple: las transacciones son irreversibles y, con non-custodia, no hay ninguna entidad central que pueda revertir un robo o congelar una cuenta. Eso significa que la prevención — reconocer el patrón antes de actuar — es la única defensa real. La mayoría de los scams no rompen ninguna tecnología: explotan la urgencia, la confianza o el desconocimiento de quien los recibe.

Un patrón específico y muy activo en 2025-2026, apuntado directamente a desarrolladores, es el del **"demo project" o "test task"**: un supuesto cliente te contacta primero (en Upwork, LinkedIn, Telegram o cualquier plataforma freelance) con un mensaje genérico, y te pide que descargues un repositorio (Google Drive, GitHub, ZIP) para "auditarlo", "revisarlo" o "darle un presupuesto" — típicamente algo con pinta de contrato Solidity o proyecto Web3. El robo no ocurre al leer el código: ocurre al **ejecutarlo**. El malware vive en scripts `preinstall`/`postinstall` del `package.json` que corren solos con `npm install`, en código ofuscado dentro de archivos aparentemente inocentes (`hardhat.config.js`, un archivo de utilidades, un test), o directamente en `node_modules` ya troyanizado. Apenas corrés el proyecto o instalás dependencias, el malware vacía wallets conectadas, roba seed phrases guardadas, claves SSH y sesiones del navegador. Es la campaña conocida como **"Contagious Interview"**, atribuida a grupos como Lazarus, y sigue activa: cualquier developer que se presente como especialista en crypto/Web3/Solidity es un blanco directo. La defensa es simple y categórica: un auditor legítimo solo necesita **leer el código fuente como texto** (pegado, en un repo público de solo lectura, o la dirección del contrato verificado en un explorer) — nunca hace falta descargar ni ejecutar nada. Si insisten en que corras el proyecto localmente, es un scam confirmado.

Otros patrones siguen siendo moneda corriente: el **phishing** con sitios clonados idénticos a wallets o exchanges reales (revisar siempre la URL exacta, nunca hacer clic en links de emails o mensajes no solicitados); los **fake airdrops** que piden conectar tu wallet y firmar una transacción para "reclamar" tokens gratis — esa firma en realidad autoriza el vaciado de tus fondos; el **pig butchering** (estafa romántica/de inversión de largo aliento, donde alguien construye una relación de semanas o meses antes de convencerte de invertir en una plataforma falsa que después desaparece con el dinero); y los **rug pulls** ya vistos en la lección de riesgos DeFi. La impersonación de soporte técnico en Discord/Telegram (perfiles falsos que responden primero en un chat de ayuda ofreciendo "asistencia" por DM) es otro clásico que sigue funcionando porque explota la urgencia de quien ya tiene un problema.

Un checklist corto de banderas rojas: contacto no solicitado con una oferta demasiado buena; presión para actuar rápido ("solo por hoy", "se cierra en minutos"); pedido de tu seed phrase o clave privada bajo cualquier excusa; pedido de descargar y ejecutar algo antes de cualquier acuerdo formal; links que no coinciden exactamente con el dominio oficial; y promesas de rendimiento garantizado (nada en cripto, ni en staking ni en DeFi, es "garantizado"). Ante la duda, la regla más simple es también la más efectiva: si algo te pide actuar ya, descargar algo o compartir una clave, pará y verificá por un canal alternativo antes de continuar.

<!-- quiz -->
```json
[
  {
    "question": "En el scam del 'demo project' dirigido a developers, ¿en qué momento ocurre el robo?",
    "options": [
      "Al leer el código fuente en el editor sin ejecutarlo",
      "Al descargar y ejecutar el proyecto (ej. correr `npm install`), donde vive el malware oculto",
      "Al aceptar el trabajo en la plataforma freelance",
      "Al responder el primer mensaje del 'cliente'"
    ],
    "correctIndex": 1,
    "explanation": "El malware se activa al instalar dependencias o correr el proyecto, no por leer el código como texto."
  },
  {
    "question": "¿Cuál es la forma segura de auditar o revisar un contrato cuando alguien te contacta pidiendo eso?",
    "options": [
      "Descargar el ZIP y abrirlo directamente en VS Code",
      "Correr `npm install` primero para ver si funciona",
      "Pedir el código como texto plano, un repo público de solo lectura, o la dirección verificada en un explorer — sin ejecutar nada",
      "Aceptar y resolverlo lo más rápido posible para no perder el cliente"
    ],
    "correctIndex": 2,
    "explanation": "Leer el código sin ejecutarlo (texto, repo de solo lectura o explorer) es la única forma de revisar sin exponerse al malware."
  },
  {
    "question": "¿Por qué un 'fake airdrop' que pide conectar tu wallet y firmar una transacción es peligroso?",
    "options": [
      "Porque cobra una comisión visible antes de firmar",
      "Porque esa firma puede autorizar en realidad el vaciado de tus fondos, no la recepción de tokens gratis",
      "Porque requiere tener la wallet actualizada",
      "Porque solo funciona en testnets"
    ],
    "correctIndex": 1,
    "explanation": "La firma que parece 'reclamar' tokens gratis suele ser en realidad una aprobación que le da acceso al atacante sobre tus fondos."
  },
  {
    "question": "¿Cuál de estas es una bandera roja común a la mayoría de los scams cripto?",
    "options": [
      "Que el proyecto tenga su código verificado en un explorer",
      "La presión para actuar rápido combinada con pedidos de compartir una clave o ejecutar algo antes de cualquier acuerdo formal",
      "Que el rendimiento ofrecido sea similar al promedio del mercado",
      "Que te pidan leer un contrato como texto plano"
    ],
    "correctIndex": 1,
    "explanation": "La urgencia artificial junto con pedidos de claves o ejecución de archivos es el patrón común detrás de la mayoría de las estafas."
  }
]
```
