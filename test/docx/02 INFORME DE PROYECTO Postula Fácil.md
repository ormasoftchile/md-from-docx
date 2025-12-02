![](./02%20INFORME%20DE%20PROYECTO%20Postula%20F%C3%A1cil_images/image-001.png)

INFORME DE PROYECTO

Postula Fácil

Escuela de Ingeniería

09/2021

1.  Identificación del Proyecto

<table><tbody><tr><td><p>N° Proyecto</p></td><td><p>Septiembre – 2021</p><p>&lt;&lt;02: Grupo 1&gt;&gt;</p></td></tr><tr><td><p>Nombre Proyecto</p></td><td><p>Postula Fácil</p></td></tr></tbody></table>

1.  Integrantes del Equipo de Trabajo

<table><tbody><tr><td><p>#</p></td><td><p>RUT</p></td><td><p>APELLIDOS</p></td><td><p>NOMBRES</p></td></tr><tr><td><p>2</p></td><td><p>16.696.056-8</p></td><td><p>Cárdenas</p></td><td><p>Claudio</p></td></tr><tr><td><p>3</p></td><td><p>18.777.919-7</p></td><td><p>Farías</p></td><td><p>Fernanda</p></td></tr><tr><td><p>4</p></td><td><p>11.823.002-7</p></td><td><p>Ormazábal</p></td><td><p>Cristián</p></td></tr></tbody></table>

1.  Historia de cambios

<table><tbody><tr><td><p>Versión</p></td><td><p>Fecha</p></td><td><p>Modificado por</p></td><td><p>Sección, página o texto revisado</p></td></tr><tr><td><p>3</p></td><td><p>14/09/2021</p></td><td><p>Cristián Ormazábal</p></td><td></td></tr></tbody></table>

INDICE

[INTRODUCCIÓN](#introducción)

[CONTEXTO](#contexto)

[PROBLEMAS DEL CLIENTE (PC)](#problemas-del-cliente-pc)

[VISTA PRELIMINAR DE LA SOLUCIÓN](#vista-preliminar-de-la-solución)

[NECESIDADES DEL CLIENTE (NC)](#necesidades-del-cliente-nc)

[VISIÓN DE LA SOLUCIÓN](#visión-de-la-solución)

[Posicionamiento](#posicionamiento)

[Grupos de interés](#grupos-de-interés)

[Entorno](#entorno)

[REQUISITOS DE LA SOLUCIÓN (RF)](#requisitos-de-la-solución-rf)

[ESTADO DEL ARTE DE LA SOLUCIÓN](#estado-del-arte-de-la-solución)

[INVESTIGACIÓN BIBLIOGRÁFICA](#investigación-bibliográfica)

[HIPÓTESIS DE LA SOLUCIÓN](#hipótesis-de-la-solución)

# INTRODUCCIÓN

El presente informe intenta representar un desarrollo del enfoque de Especificación de Requisitos basados en Problemas aplicado a la iniciativa Postula fácil, abordado en el Informe 01. Se realiza un detalle del contexto además de profundizar en la problemática de los apoderados, que nos permitirá generar de forma clara las necesidades de estos, así poder dar a luz requisitos funcionales consistentes tanto con la problemática y con las necesidades de los potenciales usuarios.

Por último, en este informe y como consecuencia de los puntos tratados es que se plantea una hipótesis para el desarrollo del proyecto “Postula Fácil” que es consistente a la vez con los requisitos funcionales.

# CONTEXTO

Los colegios privados de Chile desarrollan procesos de postulación anualmente, estos procesos no son estandarizados ni cuentan con mecanismos modernos para ordenar las expresiones de interés de los aspirantes, y en casos extremos, se generan largas filas fuera de los establecimientos, con una degradación de la percepción general del público respecto del orden y procesos que son desarrollador por los establecimientos. Haciendo uso de un mejor ordenamiento de los procesos y digitalizando las etapas de los mismos se puede mejorar este aspecto sin afectar ningún otro proceso educativo.

Dependencia causal entre problemas, necesidades y requisitos:

![Diagrama Descripción generada automáticamente](./02%20INFORME%20DE%20PROYECTO%20Postula%20F%C3%A1cil_images/image-002.png)

Ilustración 1 - dependencia causal

Como se aprecia en la Ilustración 1, se dispone un esquema de tres capas, donde la superior sirve para identificar los problemas del cliente, la intermedia las necesidades del cliente, y la inferior para identificar los requisitos funcionales que mapean estas necesidades.

El diagrama especifica la traza desde las necesidades hacia los problemas y desde los requisitos funcionales hacia las necesidades.

En la siguiente sección para cada necesidad se presentará la traza con su respectivo problema. Y en la sección de requisitos funcionales se presentará la traza con su necesidad respectiva.

# PROBLEMAS DEL CLIENTE (PC)

A continuación, podemos observar los principales problemas que tienen los actuales postulantes al colegio y que al mismo tiempo son nuestros potenciales clientes junto con el colegio.

Es relevante además que la gran problemática pasa por el estado emocional de los postulantes al estar sometidos a un proceso inconsistente con el contexto social, económico y cultural de los futuros apoderados.

-   PC1. Toma de hora presencial sin control de los no show, con fila presencial. Si no se soluciona, produce aglomeraciones y pérdida de imagen.
-   PC2. Dificultad para publicitar el llamado a postular. No disponer de un canal para hacer el llamado a postular digital hace que sea ineficaz y costoso. Si se dispusiera, sería potente y sencillo.
-   PC3. Feedback inadecuado. No existe un canal eficiente para informar resultado. Si se tuviera un mecanismo desatendido, se podría informar al instante de manera digital a los aspirantes.
-   PC4. Ineficiencia en el proceso de postulación al no contar con identificación previa del usuario.

# VISTA PRELIMINAR DE LA SOLUCIÓN

A continuación, podemos observar la arquitectura del más alto nivel del sistema propuesto.

![](./02%20INFORME%20DE%20PROYECTO%20Postula%20F%C3%A1cil_images/image-003.png)

Ilustración 2 – vista preliminar de la solución

La ilustración 2 de arquitectura general identifica los componentes y participantes del proceso digital en su conjunto:

**Administrativo**: actor que representa al usuario del colegio que habilitará la agenda, ingresará los resultados y los datos para publicar el llamado a postular.

**Postulante**: actor que representa al postulante interesado en ingresar al colegio y que es usuario de la agenda para pedir hora y receptor del resultado de la postulación.

**App colegios**: componente de software en la nube que permite a los colegios incorporar la solución de publicitar el llamado, agendar citas de postulantes y comunicar los resultados de la postulación.

**App postulantes**: componente de software en la nube que permite a los postulantes pedir hora y luego recibir el resultado de la postulación.

**Base de datos**: repositorio de información en la nube que habilita los flujos de información de las app de colegio y de postulantes.

# NECESIDADES DEL CLIENTE (NC)

NC1. El colegio necesita un software para que los interesados puedan postular.  
App para los colegios que habilita los procesos de publicidad del llamado, creación de agenda para postular. Mapea al PC1.

NC2. El colegio necesita una herramienta de agendamiento para coordinar entrevista con los aspirantes que elimine el hacer fila. Mapea al PC2.

NC3. El colegio necesita una función para comunicar desatenidamente el resultado de las postulaciones. Mapea al PC3.

NC4. El colegio requiere un sistema que no pida crear cuentas de usuario y que aproveche los sistemas de login ya existentes (gmail, rrss, etc). Mapea con PC4.

# VISIÓN DE LA SOLUCIÓN

La visión de la solución es establecer una intermediación entre colegios y postulantes que facilite y habilite la digitalización de los extremos del proceso en el agendamiento y en la comunicación de los resultados. A continuación se describe el posicionamiento, los grupos de interés y el entorno del problema.

## Posicionamiento

La app de postulaciones permite a los colegios hacer postulaciones eficientes y pulcras.

La app de postulaciones establece un canal de comunicación efectiva de los colegios particulares con sus aspirantes.

## Grupos de interés

Director administrativo, director académico, aspirantes y postulantes.

## Entorno

Los funcionarios utilizan internet de alta velocidad. En el caso de los aspirantes, es toda una gama de distintas calidades de conectividad.

![](./02%20INFORME%20DE%20PROYECTO%20Postula%20F%C3%A1cil_images/image-004.png)

Ilustración 3 - vista de arquitectura de la solución

# REQUISITOS DE LA SOLUCIÓN (RF)

A continuación, se puede observar los primeros requisitos funcionales de consistentes con las necesidades del cliente. Cabe destacar que en ningún caso estos requisitos son definitivos, si no, solo los primeros, ya que pueden modificarse dependiendo de la necesidad del usuario.

RF1. El sistema de admisión permitirá al apoderado acceder con métodos de identificación ya conocidos. Mapea con NC1.

RF2. El sistema de admisión permitirá crear una cuenta de postulante con cuenta google. Mapea con NC1.

RF3. El sistema permitirá registrar a cada apoderado los pupilos que necesite. Mapea con NC1.

RF4. El sistema permitirá que los usuarios elijan horario disponible dependiendo de la oferta de la institución para los distintos momentos del proceso de admisión. Mapea con NC2.

RF5. El sistema permitirá que los postulantes puedan anular citas con 24h de anticipación. Mapea con NC2.

RF6. El sistema permitirá verificar autenticidad de los usuarios. Mapea con NC1.

RF7. El sistema permitirá iniciar sesión con cuenta gmail, o rrss. Mapea con NC4.

RF8. Se implementará notificación de resultados por canales de push, voz y SMS. Mapea con NC3.

Además consistente con la definición del problema inicial, se requerirá definir requisitos relacionados con cómo enviar notificaciones a los aspirantes por canal a definir, ya sea mensajería, whatsapp, notificaciones push, correo, canal de voz, etc.

# ESTADO DEL ARTE DE LA SOLUCIÓN

En los siguientes puntos se trata acerca de mirar el estado de la investigación y del tratamiento del problema en cuestión, es decir, la postulación a un colegio privado y la inexistencia de un sistema eficiente para el proceso.

8.1. **Antecedentes de la investigación**

En la última década ha estado en la palestra pública todo lo que tiene que ver con educación, así se conoce ahora de forma general la estructura de nuestro sistema educativo. Es por ello, que sabemos que existen tres tipos de escuelas: 1. Las públicas, 2. Las privadas financiadas por el estado y 3. Las privadas con financiamiento privado. Éstas últimas representan alrededor del 7% de la matrícula nacional (MINEDUC,2019).

Las escuelas que reciben financiamiento estatal están reguladas por la superintendencia de educación, y tienen procesos de admisión regulados por el Sistema único de Admisión. En cambio, las escuelas privadas, pueden tener criterios de admisión distintos. Por ejemplo, pueden seleccionar a sus estudiantes.

Lo anterior tiene como consecuencia que cada establecimiento privado genera condiciones y requisitos de admisión distintos, teniendo procesos de admisión distintos para cada colegio.

1.  Sistemas para la admisión escolar

El Sistema de Admisión Escolar es una sistema web [www.sistemadeadmisionescolar.cl](http://www.sistemadeadmisionescolar.cl/), que aplica criterios de admisión homogéneos para todo los colegios y escuelas con financiamiento público:

![](./02%20INFORME%20DE%20PROYECTO%20Postula%20F%C3%A1cil_images/image-005.png)

En cambio, en el mundo privado, existen colegios con alta demanda, lo que ha llevado a mantener los procesos de admisión sin cambios, es decir, la institución no se ha visto forzada a cambiar o implementar sistemas de admisión acordes a las disponibilidad de herramientas digitales.

1.  DEMRE

Por otro lado, existe un sistema único de admisión para las universidades que se suscriban a este sistema nacional.

Es una plataforma que cumple todas las etapas, desde la inscripción hasta la notificación de resultados. Al igual que el sistema de admisión escolar es para un conjunto de instituciones que comparten los procesos de admisión.

# INVESTIGACIÓN BIBLIOGRÁFICA

\- Biblioteca del congreso nacional, 2009. Ley general de educación.

\- Sierra Bravo, R. (2003). Técnicas de investigación social. Teoría y ejercicios (14.ª ed.). Madrid: Thomson.

\- MINEDUC, 2019. Estadísticas de la educación. Santiago.

# HIPÓTESIS DE LA SOLUCIÓN

El sistema permitirá eliminar en un 100% las filas en la postulación a colegios privados.

El tiempo destinado a desarrollar las entrevistas de postulación se podrá reducir a la mitad.

Reducir a la mitad las llamadas telefónicas para consultar el resultado de la postulación por parte de los aspirantes a los respectivos establecimientos.