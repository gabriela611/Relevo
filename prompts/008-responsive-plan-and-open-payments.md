actualiza ese plan y organiza los nuevos archivos que creamos, la division de css y cosas como esas, no olvides seguir esto Política de IA1. Se permite el uso de herramientas de IA
Los participantes pueden usar herramientas de IA (por ejemplo, ChatGPT, Claude, GitHub Copilot, Cursor, Gemini, entre otras) durante todo el hackatón. La IA puede usarse para programar frontend y backend, depurar código, investigar, diseñar o redactar documentación, según lo requiera el proyecto del hackatón.


2. Se requiere divulgar su uso
Cada equipo debe agregar un archivo llamado AI_USAGE.md en la raíz de su repositorio de GitHub. Este archivo debe indicar:


Qué herramienta(s) de IA usaron. Si usaron una versión pagada, indiquen cuántos créditos consumieron.
En qué parte del proyecto se usaron (archivos, funciones o componentes específicos), o bien mencionar que se usaron en todo el proyecto, si no se escribió ningún archivo sin ayuda de IA.
Especificar los archivos en los que se usó mínima o ninguna IA, por ejemplo, el archivo de servicio de Open Payments.
Example: AI_USAGE.md
# AI Usage Disclosure


## Tools Used


* ChatGPT (GPT-4o)


* Claude


## Where and How We Used AI


### 1. Backend – Payment flow (`/src/api/open-payments.ts`)


* Used Claude to scaffold the initial Open Payments flow, creating incoming and outgoing payments, as well as quote creation.


* Reviewed and rewrote error handling ourselves after testing revealed the AI's version didn't handle grants correctly.


### 2. Frontend – Donation platform UI (`/src/components/Donation.tsx`)


* Used Claude to generate all design and frontend pages and components


### 3. Documentation – README setup instructions


* Used ChatGPT to draft the initial README structure.


* Edited by hand to match our actual setup steps and fix inaccurate install commands.


## What We Did Ourselves


* Testing and verification of all AI-suggested code


## Prompt Log


See `/prompts/backend-payments.md` for the full list of prompts used to generate the open payments flow code.

y que sea acorde a la docuemtnacion de open payments para que la conexion backend sea optima
