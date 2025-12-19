const funciones = {
    // ========================================================
    // 📦 1. Cargar datos desde un archivo JSON
    // ========================================================
    async obtenerDatosJSON(ruta) {
        try {
            const respuesta = await fetch(ruta);
            if (!respuesta.ok) throw new Error(`Error al cargar ${ruta}`);
            return await respuesta.json();
        } catch (error) {
            console.error("Error al obtener el JSON:", error);
            return [];
        }
    },

    // ========================================================
    // 🧩 2. Validar estructura base del JSON
    // ========================================================
    validarEstructuraBase(data) {
        if (!Array.isArray(data)) {
            console.error("El JSON no contiene un arreglo válido.");
            return false;
        }

        // Validar que cada elemento tenga nombre, tipo y plazos
        const estructuraValida = data.every(
            (item) =>
                typeof item.nombre === "string" &&
                typeof item.tipo === "string" &&
                typeof item.plazos === "object" &&
                item.plazos !== null
        );

        if (!estructuraValida) {
            console.error("El JSON no tiene la estructura esperada.");
            return false;
        }

        console.log("✅ Estructura del JSON válida.");
        return true;
    },

    // ========================================================
    // ⚙️ Cargar configuración global (UDI, inflación, etc.)
    // ========================================================
    async cargarConfiguracion(ruta = "data/configuracion.json") {
        try {
            const respuesta = await fetch(ruta);
            if (!respuesta.ok) throw new Error(`Error al cargar configuración: ${ruta}`);
            const config = await respuesta.json();
            console.log("✅ Configuración cargada:", config);
            return config;
        } catch (error) {
            console.error("❌ Error al cargar configuración global:", error);
            return {};
        }
    },

    // ========================================================
    // 🔍 3. Filtrar datos por tipo (ej. 'SOFIPO', 'Banco', etc.)
    // ========================================================
    filtrarPorTipo(data, tipoFiltro) {
        if (!Array.isArray(data)) {
            console.error("❌ No se puede filtrar: el argumento no es un arreglo.");
            return [];
        }

        const filtrados = data.filter(
            (item) => item.tipo.toUpperCase() === tipoFiltro.toUpperCase()
        );

        console.log(`✅ Filtrados ${filtrados.length} registros de tipo "${tipoFiltro}"`);
        return filtrados;
    },

    // ========================================================
    // ⭐️ 4. NUEVA: Obtener categoría NICAP
    // ========================================================
    obtenerCategoriaNICAP(nicap) {
        // --- Validación ---
        // Si el NICAP no es un número o no está definido, retorna "N/A"
        if (nicap === null || nicap === undefined || isNaN(nicap)) {
            return "N/A";
        }

        // --- Lógica de Categorización ---
        if (nicap >= 131) {
            return "Nivel 1";
        }
        if (nicap >= 100) { // No es necesario el "< 131" porque ya pasó el if anterior
            return "Nivel 2";
        }
        if (nicap >= 56) { // No es necesario el "< 100"
            return "Nivel 3";
        }
        if (nicap < 56) {
            return "Nivel 4";
        }

        return "N/A"; // Fallback por si algo inesperado ocurre
    },

    // ========================================================
    // 🔃 5. LÓGICA DE ORDENAMIENTO (AGREGAR ESTO)
    // ========================================================
    estadoOrden: { columna: null, direccion: 'desc' },

    ordenarDatos(data, columna, modoOrden) {
        // Alternar dirección
        if (this.estadoOrden.columna === columna) {
            this.estadoOrden.direccion = this.estadoOrden.direccion === 'asc' ? 'desc' : 'asc';
        } else {
            this.estadoOrden.columna = columna;
            this.estadoOrden.direccion = (modoOrden === 'bajoMejor') ? 'asc' : 'desc';
        }

        const dir = this.estadoOrden.direccion === 'asc' ? 1 : -1;
        const getVal = (obj, path) => path.split('.').reduce((acc, part) => acc && acc[part], obj);

        return [...data].sort((a, b) => {
            let valA = getVal(a, columna);
            let valB = getVal(b, columna);

            // Manejo de "No Disponible" o nulos (siempre al final)
            if (valA == null || valA === '') return 1;
            if (valB == null || valB === '') return -1;

            // Limpieza numérica
            const clean = v => parseFloat(String(v).replace(/[^0-9.-]+/g, ""));
            const numA = clean(valA);
            const numB = clean(valB);

            if (!isNaN(numA) && !isNaN(numB)) return (numA - numB) * dir;
            return String(valA).localeCompare(String(valB)) * dir;
        });
    },

    // ========================================================
    // 📊 6. RENDERIZAR TABLA (REEMPLAZAR ESTA FUNCIÓN COMPLETA)
    // ========================================================
    datosActuales: [],

    // ========================================================
    // 📊 6. RENDERIZAR TABLA (VERSIÓN ACTUALIZADA CON NOTAS)
    // ========================================================
    renderizarTablaGeneral({
        data, headId, bodyId, 
        mostrarTipo = false, mostrarNICAP = false, mostrarCategoriaNICAP = false, 
        mostrarIMOR = false, mostrarCarteraVig = false, mostrarResultado = false, 
        mostrarRendimientos = true,
        modosColores = {} 
    }) {
        const cuerpo = document.getElementById(bodyId);
        const encabezado = document.getElementById(headId);

        // 1. Guardamos los datos actuales para que el modal sepa qué abrir
        this.datosActuales = data; 

        if (!cuerpo || !encabezado) return;
        cuerpo.innerHTML = "";
        encabezado.innerHTML = "";

        if (!Array.isArray(data) || data.length === 0) {
            cuerpo.innerHTML = "<tr><td colspan='12'>No hay datos disponibles</td></tr>";
            return;
        }

        // --- 2. Encabezados ---
        const filaHead = document.createElement("tr");
        const plazos = Object.keys(data[0].plazos || {});

        const crearTH = (texto, campoJson) => {
            const th = document.createElement("th");
            th.className = "sortable";
            let icono = '<i class="fas fa-sort"></i>';
            if (this.estadoOrden.columna === campoJson) {
                icono = this.estadoOrden.direccion === 'asc' 
                    ? '<i class="fas fa-sort-up active"></i>' 
                    : '<i class="fas fa-sort-down active"></i>';
            }
            th.innerHTML = `${texto} ${icono}`;
            th.onclick = () => {
                const modo = modosColores[texto] || 'altoMejor';
                const datosOrdenados = this.ordenarDatos(data, campoJson, modo);
                this.renderizarTablaGeneral({
                    data: datosOrdenados, headId, bodyId, mostrarTipo, mostrarNICAP,
                    mostrarCategoriaNICAP, mostrarIMOR, mostrarCarteraVig, mostrarResultado,
                    mostrarRendimientos, modosColores
                });
            };
            return th;
        };

        filaHead.appendChild(crearTH("Instrumento", "nombre"));
        if (mostrarTipo) filaHead.appendChild(crearTH("Tipo", "tipo"));
        if (mostrarNICAP) filaHead.appendChild(crearTH("NICAP (%)", "NICAP"));
        if (mostrarCategoriaNICAP) filaHead.appendChild(crearTH("Categoría NICAP", "NICAP"));
        if (mostrarIMOR) filaHead.appendChild(crearTH("IMOR (%)", "IMOR"));
        if (mostrarResultado) filaHead.appendChild(crearTH("Resultado Neto", "resultadoneto"));
        if (mostrarCarteraVig) filaHead.appendChild(crearTH("Cartera Vigente", "cartera_vig"));

        if (mostrarRendimientos) {
            plazos.forEach(plazo => filaHead.appendChild(crearTH(plazo, `plazos.${plazo}`)));
        }

        // 🆕 NUEVA COLUMNA DE NOTAS
        const thNotas = document.createElement("th");
        thNotas.innerHTML = 'Ver más';
        thNotas.style.textAlign = 'center';
        filaHead.appendChild(thNotas);

        encabezado.appendChild(filaHead);

        // --- 3. Filas ---
        data.forEach((item, index) => { // Agregamos 'index'
            const fila = document.createElement("tr");
            
            let nombreHTML = item.sitioweb ? `<a href="${item.sitioweb}" target="_blank">${item.nombre}</a>` : item.nombre;
            let htmlFila = `<td>${nombreHTML}${this.crearIconoNota(item.notas?.nombre)}</td>`;

            if (mostrarTipo) htmlFila += `<td class="tipo-etiqueta tipo-${item.tipo.toLowerCase()}">${item.tipo}</td>`;
            if (mostrarNICAP) htmlFila += `<td data-rate="${item.NICAP ?? ''}">${item.NICAP ? item.NICAP.toFixed(2)+'%' : 'N/A'}${this.crearIconoNota(item.notas?.NICAP)}</td>`;
            if (mostrarCategoriaNICAP) htmlFila += `<td class="categoria-nicap">${this.obtenerCategoriaNICAP(item.NICAP)}</td>`;
            if (mostrarIMOR) htmlFila += `<td data-rate="${item.IMOR ?? ''}">${item.IMOR ? item.IMOR.toFixed(2)+'%' : 'N/A'}${this.crearIconoNota(item.notas?.IMOR)}</td>`;
            if (mostrarResultado) { const r = item.resultadoneto; htmlFila += `<td data-rate="${r ?? ''}">${r ? Math.round(r/1000).toLocaleString('es-MX') : 'N/A'}</td>`; }
            if (mostrarCarteraVig) { const c = item.cartera_vig; htmlFila += `<td data-rate="${c ?? ''}">${c ? Math.round(c/1000).toLocaleString('es-MX') : 'N/A'}</td>`; }

            if (mostrarRendimientos) {
                plazos.forEach(plazo => {
                    const tasa = item.plazos?.[plazo];
                    const mostrar = (tasa !== null && tasa !== undefined && tasa !== '') ? `${tasa}%` : "No Disponible";
                    htmlFila += `<td data-rate="${tasa ?? ''}">${mostrar}${this.crearIconoNota(item.notas?.[plazo])}</td>`;
                });
            }

            // 🆕 CELDA DEL BOTÓN DE NOTAS (ICONO)
            let botonNotas = "";
            if (item.notas && Object.keys(item.notas).length > 0) {
                botonNotas = `
                    <button class="btn-ver-notas" onclick="funciones.abrirModalNotas(${index})" title="Ver todas las condiciones">
                        <i class="fas fa-file-alt"></i>
                    </button>`;
            } else {
                 botonNotas = `<span style="color:#ccc;">-</span>`;
            }
            htmlFila += `<td style="text-align:center;">${botonNotas}</td>`;

            fila.innerHTML = htmlFila;
            cuerpo.appendChild(fila);
        });

        if (Object.keys(modosColores).length > 0) {
            const tablaPadre = document.getElementById(bodyId).closest('table');
            setTimeout(() => { this.aplicarColoresPorNombre(tablaPadre, modosColores); }, 0);
        }
    },

    // ... (Mantén tus funciones intermedias: aplicarColores, cargarComponentes, etc.) ...

    // ========================================================
    // 📝 SISTEMA DE MODAL DE NOTAS (NUEVO)
    // ========================================================
    
    // 1. Crear el HTML del modal solo si no existe
    inicializarModal() {
        if (document.getElementById('modal-notas')) return;
        
        const modalHTML = `
            <div id="modal-notas" class="modal-overlay" onclick="funciones.cerrarModal(event)">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3 id="modal-titulo">Notas Importantes</h3>
                        <button class="btn-cerrar-modal" onclick="funciones.cerrarModal()">×</button>
                    </div>
                    <div id="modal-cuerpo" class="modal-body">
                        </div>
                    <div class="modal-footer">
                        <button class="btn-entendido" onclick="funciones.cerrarModal()">Entendido</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    // 2. Abrir el modal con la información del ítem seleccionado
    abrirModalNotas(index) {
        this.inicializarModal();
        const item = this.datosActuales[index];
        
        if (!item || !item.notas) return;

        const modal = document.getElementById('modal-notas');
        const titulo = document.getElementById('modal-titulo');
        const cuerpo = document.getElementById('modal-cuerpo');

        // Personalizar título
        titulo.innerText = `Condiciones: ${item.nombre}`;

        // Construir lista de notas
        let htmlNotas = '<ul class="lista-notas-modal">';
        for (const [clave, nota] of Object.entries(item.notas)) {
            // Embellecer la etiqueta (ej: "1 mes" -> "PLAZO 1 MES")
            let etiqueta = clave === 'nombre' ? 'Información General' : clave;
            // Capitalizar
            etiqueta = etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1);

            htmlNotas += `
                <li>
                    <span class="nota-etiqueta">${etiqueta}</span>
                    <p class="nota-texto">${nota}</p>
                </li>`;
        }
        htmlNotas += '</ul>';

        cuerpo.innerHTML = htmlNotas;
        modal.classList.add('active');
    },

    // 3. Cerrar el modal
    cerrarModal(e) {
        const modal = document.getElementById('modal-notas');
        if (modal) modal.classList.remove('active');
    },

    // ... (Mantén tu función crearIconoNota al final tal como estaba) ...
    crearIconoNota(notaTexto) {
        if (!notaTexto) return "";
        return `
            <i class="fa-solid fa-circle-exclamation info-icon"
               title="${notaTexto}"
               onclick="alert('${notaTexto.replace(/'/g, "\\'")}')">
            </i>
        `;
    },
    // ========================================================
    // 🎨 10. Aplicar colores (CORREGIDA Y DEFINITIVA)
    // ========================================================
    aplicarColoresPorNombre(tablaSelector, modos = {}) {
        const tabla = (typeof tablaSelector === 'string') 
            ? document.querySelector(tablaSelector) 
            : tablaSelector;

        if (!tabla) return;

        const filas = Array.from(tabla.querySelectorAll("tbody tr"));
        if (filas.length === 0) return;

        const encabezados = Array.from(tabla.querySelectorAll("thead th"));
        const columnas = encabezados.map(th => th.textContent.trim());

        Object.keys(modos).forEach(nombreColumna => {
            // Buscamos la columna (ignorando mayúsculas/minúsculas)
            const index = columnas.findIndex(col => 
                col.toLowerCase().includes(nombreColumna.toLowerCase())
            );

            if (index === -1) return;

            const modo = modos[nombreColumna] || "altoMejor";
            
            // Extraer celdas y valores
            const celdasInfo = filas.map(fila => {
                const celda = fila.children[index];
                if (!celda) return { celda, valor: NaN };
                
                // Limpiar estilos previos
                celda.style.backgroundColor = "";
                celda.style.color = "";
                celda.style.fontWeight = "";

                const valor = parseFloat(celda.getAttribute("data-rate"));
                return { celda, valor };
            });

            // --- LÓGICA DE COLORES ---

            // 1. Modos Comparativos (Max vs Min)
            if (modo === "altoMejor" || modo === "bajoMejor") {
                const valoresValidos = celdasInfo.map(c => c.valor).filter(v => !isNaN(v));
                if (valoresValidos.length < 2) return;

                const max = Math.max(...valoresValidos);
                const min = Math.min(...valoresValidos);

                celdasInfo.forEach(({ celda, valor }) => {
                    if (isNaN(valor)) return;
                    let esVerde = false, esRojo = false;

                    if (modo === "altoMejor") {
                        if (valor === max) esVerde = true;
                        if (valor === min) esRojo = true;
                    } else { // bajoMejor
                        if (valor === min) esVerde = true;
                        if (valor === max) esRojo = true;
                    }
                    
                    this.pintarCelda(celda, esVerde, esRojo);
                });

            } 
            // 2. Modo Absoluto: Resultado Neto
            else if (modo === "positivoMejor") {
                celdasInfo.forEach(({ celda, valor }) => {
                    if (isNaN(valor)) return;
                    // Verde si gana (>0), Rojo si pierde (<0)
                    this.pintarCelda(celda, valor > 0, valor < 0);
                });
            }
            // 3. Modo Absoluto: NICAP (Lógica recuperada)
            else if (modo === "nicap") {
                celdasInfo.forEach(({ celda, valor }) => {
                    if (isNaN(valor)) return;
                    // Verde si es Nivel 1 (>= 131), Rojo si es menor (Nivel 2, 3, 4)
                    this.pintarCelda(celda, valor >= 131, valor < 131);
                });
            }
        });
    },

    // Helper para no repetir código de estilos
    pintarCelda(celda, esVerde, esRojo) {
        if (esVerde) {
            celda.style.backgroundColor = "#2e7d32"; // Verde
            celda.style.color = "white";
            celda.style.fontWeight = "bold";
        } else if (esRojo) {
            celda.style.backgroundColor = "#b71c1c"; // Rojo
            celda.style.color = "white";
            celda.style.fontWeight = "bold";
        }
    },
    // ========================================================
    // 🧱 11. Cargar componentes (PARA PÁGINAS PRINCIPALES) - (CORREGIDA)
    // ========================================================
    async cargarComponentes() {
        // Busca los contenedores que YA EXISTEN en tu HTML
        const headerCont = document.getElementById("header-container");
        const footerCont = document.getElementById("footer-container");

        if (!headerCont || !footerCont) {
            console.warn("No se encontraron los contenedores de header/footer.");
            return;
        }

        try {
            // Rutas relativas a la raíz (index.html, sofipos.html, etc.)
            const headerRes = await fetch("components/header.html");
            const footerRes = await fetch("components/footer.html");

            if (!headerRes.ok) throw new Error("Error al cargar components/header.html");
            if (!footerRes.ok) throw new Error("Error al cargar components/footer.html");

            headerCont.innerHTML = await headerRes.text();
            footerCont.innerHTML = await footerRes.text();

            // 👇 ¡ESTA ES LA LÍNEA QUE FALTABA! 👇
            // Llama a la función para activar la lógica del menú
            if (typeof this.activarMenuMovil === 'function') {
                this.activarMenuMovil();
            }

        } catch (error) {
            console.error("❌ Error al cargar componentes:", error);
            if (headerCont) headerCont.innerHTML = "<p style='color:red; text-align:center;'>Error al cargar el menú.</p>";
            if (footerCont) footerCont.innerHTML = "<p style='color:red; text-align:center;'>Error al cargar el pie de página.</p>";
        }
    },
    // ========================================================
    // 🧱 11.B Cargar componentes (PARA EL BLOG - SUBCARPETA)
    // ========================================================
    async cargarComponentesBlog() {
        const headerCont = document.getElementById("header-container");
        const footerCont = document.getElementById("footer-container");

        try {
            // 1. Usamos "../" para salir de la carpeta blog y buscar los componentes
            const headerRes = await fetch("../components/header.html");
            const footerRes = await fetch("../components/footer.html");

            if (!headerRes.ok) throw new Error("Error al cargar ../components/header.html");
            if (!footerRes.ok) throw new Error("Error al cargar ../components/footer.html");

            let headerHtml = await headerRes.text();
            let footerHtml = await footerRes.text();

            // 2. 🪄 MAGIA: Corregir las rutas dentro del HTML cargado
            // Convertimos 'href="index.html"' en 'href="../index.html"'
            const corregirRutas = (html) => {
                return html
                    .replace(/href="index.html"/g, 'href="../index.html"')
                    .replace(/href="tarjetas.html"/g, 'href="../tarjetas.html"')
                    .replace(/href="sofipos.html"/g, 'href="../sofipos.html"')
                    .replace(/href="calculadoras.html"/g, 'href="../calculadoras.html"')
                    .replace(/href="bancos.html"/g, 'href="../bancos.html"')
                    .replace(/href="blog.html"/g, 'href="../blog.html"')
                    .replace(/href="about.html"/g, 'href="../about.html"')
                    .replace(/src="assets\//g, 'src="../assets/') // Arregla logos e imágenes del footer
                    .replace(/href="style.css"/g, 'href="../style.css"'); // Arregla estilos si están linkeados
            };

            if (headerCont) headerCont.innerHTML = corregirRutas(headerHtml);
            if (footerCont) footerCont.innerHTML = corregirRutas(footerHtml);

            // 3. Reactivamos el menú móvil
            if (typeof this.activarMenuMovil === 'function') {
                this.activarMenuMovil();
            }

        } catch (error) {
            console.error("❌ Error al cargar componentes del blog:", error);
            if (headerCont) headerCont.innerHTML = "<p style='color:red; text-align:center;'>Error al cargar menú.</p>";
        }
    },
    // ========================================================
    // 🪧 12. Crear ícono de nota o advertencia
    // ========================================================
    crearIconoNota(notaTexto) {
        if (!notaTexto) return "";
        return `
            <i class="fa-solid fa-circle-exclamation info-icon"
               title="${notaTexto}"
               onclick="alert('${notaTexto.replace(/'/g, "\\'")}')">
            </i>
        `;
    },

    inicializarTabs() {
      const tabs = document.querySelectorAll(".tab-btn");
      const contents = document.querySelectorAll(".tab-content");

      tabs.forEach(tab => {
        tab.addEventListener("click", () => {
          const target = tab.getAttribute("data-tab");

          // Desactivar todo
          tabs.forEach(t => t.classList.remove("active"));
          contents.forEach(c => c.classList.remove("active"));

          // Activar el seleccionado
          tab.classList.add("active");
          document.getElementById(`tab-${target}`).classList.add("active");
        });
      });
    },


    // ========================================================
    // 🧠 Función modular para aplicar configuración global
    // ========================================================
    async aplicarConfiguracionGlobal() {
      try {
        const config = await this.cargarConfiguracion();

        // 🧮 Calcular monto en MXN del seguro PROSOFIPO
        if (config.valor_udi && config.seguro_prosofipo_udi) {
          const montoSeguroMXN = config.valor_udi * config.seguro_prosofipo_udi;

          // 👇 Insertar en donde uses la clase `.valor-prosofipo`
          document.querySelectorAll(".valor-prosofipo").forEach(el => {
            el.textContent = montoSeguroMXN.toLocaleString("es-MX", {
              style: "currency",
              currency: "MXN",
              maximumFractionDigits: 0
            });
          });
        }

        // 🧮 Calcular monto en MXN del IPAB
        if (config.valor_udi && config.seguro_prosofipo_udi) {
          const montoSeguroMXNIPAB = config.valor_udi * config.seguro_prosofipo_ipab;

          // 👇 Insertar en donde uses la clase `.valor-ipab`
          document.querySelectorAll(".valor-ipab").forEach(el => {
            el.textContent = montoSeguroMXNIPAB.toLocaleString("es-MX", {
              style: "currency",
              currency: "MXN",
              maximumFractionDigits: 0
            });
          });
        }

        // 📅 Insertar fecha de actualización
        if (config.fecha_actualizacion) {
          const fecha = new Date(config.fecha_actualizacion);
          const opciones = { year: "numeric", month: "long", day: "numeric" };
          let fechaFormateada = fecha.toLocaleDateString("es-MX", opciones);

          // Capitalizar la primera letra
          fechaFormateada =
            fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);

          // 👇 Insertar en elemento con ID `fecha-actualizacion`
          const fechaElemento = document.getElementById("fecha-actualizacion");
          if (fechaElemento) {
            fechaElemento.textContent = fechaFormateada;
          }
        }

        // 📅 Insertar fecha de actualización de Indicadores Financieros
        if (config.fecha_actualizacion_indicadores_fin) {
          const fechaIndicadores = config.fecha_actualizacion_indicadores_fin;
          document.querySelectorAll(".fecha-indicadores-fin").forEach(el => {
            el.textContent = fechaIndicadores;
          });
        }

        console.log("✅ Configuración global aplicada correctamente.");
      } catch (error) {
        console.error("❌ Error al aplicar configuración global:", error);
      }
    },

    // ========================================================
    // 🟣 Renderizar tarjetas modulares de SOFIPOs destacadas
    // ========================================================
    async renderizarSofiposDestacadas(ruta = "data/sofipos_detalle.json") {
      try {
        const respuesta = await fetch(ruta);
        if (!respuesta.ok) throw new Error("Error al cargar sofipos_detalle.json");
        const sofipos = await respuesta.json();

        const contenedor = document.getElementById("contenedor-sofipos");
        if (!contenedor) return;

        contenedor.innerHTML = sofipos.map(s => `
          <div class="sofipo-card">
            <div class="sofipo-card-header">
              <div class="sofipo-logo-nombre">
                ${s.logo ? `<img src="${s.logo}" alt="${s.nombre}" class="sofipo-logo">` : ""}
                <h3>${s.nombre}</h3>
              </div>

            </div>
            <p>${s.descripcion}</p>
            <p class="sofipo-respaldo"><strong>Respaldo:</strong> ${s.respaldo}</p>
            <a href="${s.link}" target="_blank" class="btn-sofipo">Abrir cuenta</a>
          </div>
        `).join("");
      } catch (error) {
        console.error("❌ Error al renderizar sofipos destacadas:", error);
      }
    },

    // ========================================================
    // 🟣 Renderizar tarjetas modulares de BANCOS destacados
    // ========================================================
    async renderizarBancosDestacados(ruta = "data/bancos_detalle.json") {
      try {
        const respuesta = await fetch(ruta);
        if (!respuesta.ok) throw new Error("Error al cargar bancos_detalle.json");
        const bancos = await respuesta.json();

        // Apuntamos al nuevo contenedor que crearemos en bancos.html
        const contenedor = document.getElementById("contenedor-bancos");
        if (!contenedor) return;

        // Usamos las MISMAS clases CSS que 'sofipos.html'
        // para que se vean idénticas sin tocar style.css
        contenedor.innerHTML = bancos.map(b => `
          <div class="sofipo-card">
            <div class="sofipo-card-header">
              <div class="sofipo-logo-nombre">
                ${b.logo ? `<img src="${b.logo}" alt="${b.nombre}" class="sofipo-logo">` : ""}
                <h3>${b.nombre}</h3>
              </div>
            </div>
            <p>${b.descripcion}</p>
            <p class="sofipo-respaldo"><strong>Respaldo:</strong> ${b.respaldo}</p>
            <a href="${b.link}" target="_blank" class="btn-sofipo">Abrir cuenta</a>
          </div>
        `).join("");
      } catch (error) {
        console.error("❌ Error al renderizar bancos destacados:", error);
      }
    },

    // ========================================================
    // 📱 MENÚ MÓVIL (VERSIÓN SIMPLIFICADA)
    // ========================================================
    activarMenuMovil() {
        const toggleBtn = document.getElementById("mobile-menu-toggle");
        const nav = document.querySelector(".nav-menu");
        let hoverTimeouts = new Map();

        // Menú hamburguesa
        if (toggleBtn && nav) {
            toggleBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                nav.classList.toggle("active");
                if (nav.classList.contains("active")) {
                    this.cerrarDropdowns();
                }
            });
        }

        // Dropdowns
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            const toggle = dropdown.querySelector('.dropdown-toggle');
            const menu = dropdown.querySelector('.dropdown-menu');
            const icon = toggle?.querySelector('i');

            if (!toggle || !menu) return;

            // Hover para desktop
            if (window.innerWidth > 768) {
                dropdown.addEventListener('mouseenter', () => {
                    clearTimeout(hoverTimeouts.get(dropdown));
                    this.cerrarOtrosDropdowns(menu);
                    this.abrirDropdown(menu, icon);
                });

                dropdown.addEventListener('mouseleave', () => {
                    hoverTimeouts.set(dropdown, setTimeout(() => {
                        this.cerrarDropdown(menu, icon);
                    }, 150));
                });
            }

            // Click para todos los dispositivos
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                clearTimeout(hoverTimeouts.get(dropdown));

                if (menu.classList.contains('active')) {
                    this.cerrarDropdown(menu, icon);
                } else {
                    this.cerrarDropdowns();
                    this.abrirDropdown(menu, icon);

                    // En móvil, abrir menú principal si está cerrado
                    if (window.innerWidth <= 768 && nav && !nav.classList.contains('active')) {
                        nav.classList.add('active');
                    }
                }
            });
        });

        // Cerrar al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown') && !e.target.closest('#mobile-menu-toggle')) {
                this.cerrarDropdowns();
                if (nav) nav.classList.remove('active');
            }
        });

        // Limpiar al cambiar tamaño
        window.addEventListener('resize', () => {
            hoverTimeouts.forEach(timeout => clearTimeout(timeout));
            hoverTimeouts.clear();

            if (window.innerWidth > 768 && nav) {
                nav.classList.remove('active');
            } else {
                this.cerrarDropdowns();
            }
        });
    },

    // ========================================================
    // 🔧 FUNCIONES AUXILIARES SIMPLIFICADAS
    // ========================================================
    abrirDropdown(menu, icon) {
        menu.classList.add('active');
        if (icon) icon.classList.add('rotated');
    },

    cerrarDropdown(menu, icon) {
        menu.classList.remove('active');
        if (icon) icon.classList.remove('rotated');
    },

    cerrarDropdowns() {
        document.querySelectorAll('.dropdown-menu.active, .dropdown-toggle i.rotated').forEach(el => {
            el.classList.remove('active', 'rotated');
        });
    },

    cerrarOtrosDropdowns(menuActual) {
        document.querySelectorAll('.dropdown-menu.active').forEach(menu => {
            if (menu !== menuActual) {
                this.cerrarDropdown(menu, menu.previousElementSibling?.querySelector('i'));
            }
        });
    },

    // ========================================================
    // 💳 MÓDULO DE TARJETAS DE CRÉDITO (NUEVO)
    // ========================================================

    async renderizarTarjetasCredito(contenedorId) {
        const contenedor = document.getElementById(contenedorId);
        if (!contenedor) return;

        const tarjetas = await this.obtenerDatosJSON('data/tarjetas_credito.json');
        if (!tarjetas.length) return;

        // Guardamos referencia global para el filtrado
        window.datosTarjetasGlobal = tarjetas;

        this.pintarTarjetas(tarjetas, contenedor);
        this.generarFiltrosTarjetas(tarjetas);
    },

    pintarTarjetas(tarjetas, contenedor) {
        contenedor.innerHTML = tarjetas.map(t => {
            // 1. Lógica de Garantía
            let badgeGarantia = '';
            if (t.garantia && t.garantia.requiere_garantia) {
                const monto = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(t.garantia.monto_minimo);
                badgeGarantia = `<div class="badge-warning" title="${t.garantia.descripcion}"><i class="fas fa-lock"></i> Garantía: ${monto}</div>`;
            }

            // 2. Lógica de Anualidad
            let textoAnualidad = t.costos.anualidad_titular === 0 ? "Sin Anualidad" : `$${t.costos.anualidad_titular} MXN`;
            if(t.costos.anualidad_titular > 0 && t.costos.condicion_exencion_anualidad.descripcion.includes("Primer año")) {
                textoAnualidad += " (1er año gratis)";
            }

            // 3. Lógica de Recompensas y TOPES (NUEVO)
            let htmlRecompensas = '';

            if (t.recompensas.tipo === "Sin recompensas") {
                htmlRecompensas = `<p class="text-muted"><small>Esta tarjeta no ofrece recompensas directas.</small></p>`;
            } else {
                // Mostrar tasa general
                if (t.recompensas.porcentaje_general) {
                    htmlRecompensas += `<div class="reward-row main"><span>Todo:</span> <strong>${t.recompensas.porcentaje_general}%</strong></div>`;
                }
                // Mostrar reglas específicas
                if (t.recompensas.reglas && t.recompensas.reglas.length > 0) {
                    t.recompensas.reglas.forEach(r => {
                        const valor = isNaN(r.tasa) ? r.tasa : `${r.tasa}%`;
                        htmlRecompensas += `<div class="reward-row"><span>${r.condicion}:</span> <strong>${valor}</strong></div>`;
                    });
                }

                // BLOQUE NUEVO: ALERTA DE TOPE
                if (t.recompensas.tope_recompensa && t.recompensas.tope_recompensa.aplica) {
                    const topeMonto = t.recompensas.tope_recompensa.monto_tope_mensual
                        ? `$${t.recompensas.tope_recompensa.monto_tope_mensual}`
                        : 'Límite aplicado';

                    htmlRecompensas += `
                        <div class="tope-alerta" title="${t.recompensas.tope_recompensa.descripcion}">
                            <i class="fas fa-exclamation-circle"></i> Tope: ${topeMonto}/mes
                        </div>`;
                }
            }

            // 4. Etiquetas
            const htmlEtiquetas = t.etiquetas.map(tag => `<span class="card-tag">${tag}</span>`).join('');

            // 5. Billeteras digitales
            let htmlBilleteras = '';
            // Verificamos si existe el objeto y si TIENE al menos una billetera activa
            const tieneBilleteras = t.billeteras && (t.billeteras.apple_pay || t.billeteras.google_wallet || t.billeteras.samsung_pay);

            if (tieneBilleteras) {
                htmlBilleteras = `
                <div class="wallet-section">
                    <label>Billeteras Digitales</label> <div class="wallet-icons-container">`;
                
                // Apple Pay
                if (t.billeteras.apple_pay) {
                    htmlBilleteras += `
                        <span class="wallet-icon" title="Esta tarjeta acepta Apple Pay">
                            <i class="fa-brands fa-apple"></i>
                        </span>`;
                }
                // Google Wallet
                if (t.billeteras.google_wallet) {
                    htmlBilleteras += `
                        <span class="wallet-icon" title="Esta tarjeta acepta Google Wallet">
                            <i class="fa-brands fa-google-pay"></i>
                        </span>`;
                }
                
                htmlBilleteras += `</div></div>`;
            }

            let htmlIngreso = '';
            if (t.requisitos && t.requisitos.mostrar_ingreso === true) {
                const ingresoFmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(t.requisitos.ingreso_minimo_mensual);
                htmlIngreso = `
                    <div class="income-requirement">
                        <i class="fas fa-money-bill-wave"></i> Ingreso Mínimo: <strong>${ingresoFmt}</strong>
                    </div>`;
            } else {
            }

            return `
            <div class="credit-card-item">
                <div class="card-header-band" style="background-color: ${t.color_hex || '#333'};"></div>

                <div class="cc-content">
                    <div class="cc-top">
                        <div class="cc-img-wrapper">
                             <img src="${t.imagen_url}" alt="${t.nombre}" onerror="this.src='https://placehold.co/180x110/EEE/31343C?text=Tarjeta'">
                        </div>
                        <div class="cc-title">
                            <h3>${t.nombre}</h3>
                            <p class="cc-emisor">${t.emisor}</p>
                            <div class="cc-badges">${badgeGarantia}</div>
                        </div>
                    </div>

                    <div class="cc-grid-info">
                        <div class="cc-info-block">
                            <label>Anualidad</label>
                            <p class="anualidad-price">${textoAnualidad}</p>
                            
                            <small class="text-muted" style="display:block; line-height:1.2; margin-top:4px;">
                                ${t.costos.condicion_exencion_anualidad.descripcion || ''}
                            </small>
                        </div>
                        <div class="cc-info-block">
                            <label>CAT Promedio</label>
                            <p>${t.costos.cat_promedio}%</p>
                        </div>
                    </div>

                    <div class="cc-rewards-section">
                        <label><i class="fas fa-gift"></i> ${t.recompensas.tipo}</label>
                        ${htmlRecompensas}
                    </div>

                    <div class="cc-tags-container">
                        ${htmlEtiquetas}
                    </div>

                    ${htmlIngreso}

                    ${htmlBilleteras}

                    <div class="cc-actions">
                        <a href="${t.link_solicitud}" target="_blank" class="btn-apply">Solicitar</a>
                        <button class="btn-details" onclick="alert('${t.beneficios_clave.join('\\n- ')}')">Ver Beneficios</button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    },

    generarFiltrosTarjetas(tarjetas) {
        const contenedorFiltros = document.getElementById('filtros-container');
        if(!contenedorFiltros) return;

        // Definir filtros predeterminados
        const filtros = [
            { id: 'all', label: 'Todas' },
            { id: 'sin-anualidad', label: 'Sin Anualidad', fn: t => t.costos.anualidad_titular === 0 },
            { id: 'cashback', label: 'Con Cashback', fn: t => t.recompensas.tipo === 'Cashback' },
            { id: 'garantizada', label: 'Garantizadas', fn: t => t.garantia && t.garantia.requiere_garantia },
            { id: 'sin-historial', label: 'Para Iniciar', fn: t => t.etiquetas.includes('Para Iniciar') || t.etiquetas.includes('Garantizada') || t.etiquetas.includes('Sin Historial') },
            { id: 'billeteras', label: 'Apple/Google Pay', fn: t => t.billeteras && (t.billeteras.apple_pay || t.billeteras.google_wallet) }
        ];

        let html = `<div class="filter-pills">`;
        filtros.forEach(f => {
            html += `<button class="filter-btn ${f.id === 'all' ? 'active' : ''}" data-filter="${f.id}">${f.label}</button>`;
        });
        html += `</div>`;

        contenedorFiltros.innerHTML = html;

        // Agregar Event Listeners
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Quitar active a todos
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                // Poner active al actual
                e.target.classList.add('active');

                const filtroId = e.target.getAttribute('data-filter');
                const filtroConfig = filtros.find(f => f.id === filtroId);

                let filtradas = window.datosTarjetasGlobal;

                if (filtroId !== 'all' && filtroConfig.fn) {
                    filtradas = window.datosTarjetasGlobal.filter(filtroConfig.fn);
                }

                this.pintarTarjetas(filtradas, document.getElementById('contenedor-tarjetas'));
            });
        });
    },
    // ========================================================
    // 🎨 MÓDULO: Renderizar Leyenda de Colores (Modular)
    // ========================================================
    renderizarLeyenda(contenedorId, mostrarNotaMillones = false) {
        const contenedor = document.getElementById(contenedorId);
        if (!contenedor) return;

        let html = `
            <div class="leyenda-container">
                <div class="leyenda-extra">
                    ${mostrarNotaMillones ? '<span class="badge-millones">* Cifras en millones de MXN</span>' : ''}
                </div>

                <div class="leyenda-simbolos">
                    <div class="leyenda-item">
                        <span class="dot-leyenda dot-verde"></span>
                        <span>Mejor / Ganancia</span>
                    </div>
                    <div class="leyenda-item">
                        <span class="dot-leyenda dot-rojo"></span>
                        <span>Menor / Pérdida</span>
                    </div>
                </div>
            </div>
        `;
        
        contenedor.innerHTML = html;
    },

};

