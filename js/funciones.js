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


    renderizarTablaGeneral({
        data,
        headId,
        bodyId,
        mostrarTipo = false,
        mostrarNICAP = false,
        mostrarIMOR = false,
        mostrarCarteraVig = false,
        mostrarResultado = false,
        mostrarRendimientos = true
    }) {
        const cuerpo = document.getElementById(bodyId);
        const encabezado = document.getElementById(headId);

        if (!cuerpo || !encabezado) {
            console.error("❌ No se encontró el elemento tbody o thead.");
            return;
        }

        cuerpo.innerHTML = "";
        encabezado.innerHTML = "";

        if (!Array.isArray(data) || data.length === 0) {
            cuerpo.innerHTML = "<tr><td colspan='10'>No hay datos disponibles</td></tr>";
            return;
        }

        const plazos = Object.keys(data[0].plazos || {});
        let htmlHead = "<tr><th>Instrumento</th>";
        if (mostrarTipo) htmlHead += "<th>Tipo</th>";
        if (mostrarNICAP) htmlHead += "<th>NICAP (%)</th>";
        if (mostrarIMOR) htmlHead += "<th>IMOR (%)</th>";
        if (mostrarResultado) htmlHead += "<th>Resultado Neto (millones MXN)</th>";
        if (mostrarCarteraVig) htmlHead += "<th>Cartera Vigente (millones MXN)</th>";

        // ✅ Solo agregamos las columnas de rendimientos si está activado
        if (mostrarRendimientos) {
            plazos.forEach(plazo => {
            htmlHead += `<th>${plazo}</th>`;
            });
        }
        htmlHead += "</tr>";
        encabezado.innerHTML = htmlHead;

        // 🧩 Filas dinámicas
        data.forEach(item => {
            const fila = document.createElement("tr");
            // Celda del nombre del instrumento con enlace opcional
            let nombreHTML = item.nombre;
            if (item.sitioweb) {
                nombreHTML = `<a href="${item.sitioweb}" target="_blank" rel="noopener noreferrer">${item.nombre}</a>`;
            }
            let htmlFila = `<td>${nombreHTML}${funciones.crearIconoNota(item.notas?.nombre)}</td>`;

            if (mostrarTipo) {
                htmlFila += `<td class="tipo-etiqueta tipo-${item.tipo.toLowerCase()}">${item.tipo}</td>`;
            }

            if (mostrarNICAP) {
                const n = item.NICAP;
                htmlFila += `<td data-rate="${n ?? ''}">${n ? n.toFixed(2) + '%' : 'N/A'}${funciones.crearIconoNota(item.notas?.NICAP)}</td>`;
            }

            if (mostrarIMOR) {
                const i = item.IMOR;
                htmlFila += `<td data-rate="${i ?? ''}">${i ? i.toFixed(2) + '%' : 'N/A'}${funciones.crearIconoNota(item.notas?.IMOR)}</td>`;
            }

            if (mostrarResultado) {
                const r = item.resultadoneto;
                const notaResultado = item.notas?.resultadoneto;

                // Convertir a miles y redondear
                const rMiles = r ? Math.round(r / 1000) : null;

                htmlFila += `
                    <td data-rate="${r ?? ''}">
                        ${rMiles ? rMiles.toLocaleString('es-MX') : 'N/A'}
                        ${funciones.crearIconoNota(notaResultado)}
                    </td>`;
            }

            if (mostrarCarteraVig) {
                const c = item.cartera_vig;
                const notaCarteraVig = item.notas?.cartera_vig;

                // Convertir a miles y redondear
                const cMiles = c ? Math.round(c / 1000) : null;

                htmlFila += `
                    <td data-rate="${c ?? ''}">
                        ${cMiles ? cMiles.toLocaleString('es-MX') : 'N/A'}
                        ${funciones.crearIconoNota(notaCarteraVig)}
                    </td>`;
            }

            // ✅ Solo mostrar rendimientos si está activado
            if (mostrarRendimientos) {
              plazos.forEach(plazo => {
                const tasa = item.plazos?.[plazo];
                const mostrar = (tasa !== null && tasa !== undefined && tasa !== '')
                  ? `${tasa}%`
                  : "No Disponible";
                const notaPlazo = item.notas?.[plazo];
                htmlFila += `
                  <td data-rate="${tasa}">
                    ${mostrar}
                    ${funciones.crearIconoNota(notaPlazo)}
                  </td>`;
              });
            }

            fila.innerHTML = htmlFila;
            cuerpo.appendChild(fila);
        });

        console.log("✅ Tabla renderizada con notas personalizadas.");
    },

    // ========================================================
    // 🎨 10. Aplicar colores SOLO a columnas definidas en 'modos'
    // ========================================================
    aplicarColoresPorNombre(tablaSelector, modos = {}) {
        const tabla = document.querySelector(tablaSelector);
        if (!tabla) {
            console.error(`❌ No se encontró la tabla con selector ${tablaSelector}`);
            return;
        }

        const filas = Array.from(tabla.querySelectorAll("tbody tr"));
        if (filas.length === 0) return;

        const encabezados = Array.from(tabla.querySelectorAll("thead th"));
        const columnas = encabezados.map(th => th.textContent.trim());

        // ✅ Solo procesar columnas que estén en 'modos'
        Object.keys(modos).forEach(nombreColumna => {
            const index = columnas.findIndex(
                col => col.toLowerCase() === nombreColumna.toLowerCase()
            );

            if (index === -1) {
                console.warn(`⚠️ No se encontró la columna "${nombreColumna}" en la tabla.`);
                return;
            }

            const modo = modos[nombreColumna] || "altoMejor";

            // Tomar todos los valores de esa columna
            const tasas = filas.map(fila => {
                const celda = fila.children[index];
                const valor = parseFloat(celda.getAttribute("data-rate"));
                return { celda, valor };
            });

            const valoresValidos = tasas.map(t => t.valor).filter(v => !isNaN(v));
            if (valoresValidos.length < 2) return;

            const max = Math.max(...valoresValidos);
            const min = Math.min(...valoresValidos);

            // Aplicar colores según modo
            tasas.forEach(({ celda, valor }) => {
                if (isNaN(valor)) return;

                celda.style.backgroundColor = "";
                celda.style.color = "";
                celda.style.fontWeight = "";

                const esMejor =
                    (modo === "altoMejor" && valor === max) ||
                    (modo === "bajoMejor" && valor === min);
                const esPeor =
                    (modo === "altoMejor" && valor === min) ||
                    (modo === "bajoMejor" && valor === max);

                if (esMejor) {
                    celda.style.backgroundColor = "#2e7d32"; // verde
                    celda.style.color = "white";
                    celda.style.fontWeight = "bold";
                } else if (esPeor) {
                    celda.style.backgroundColor = "#b71c1c"; // rojo
                    celda.style.color = "white";
                    celda.style.fontWeight = "bold";
                }
            });
        });

        console.log("🎨 Colores aplicados solo a las columnas definidas en 'modos'.");
    },
    // ========================================================
    // 🧱 11. Cargar componentes comunes (header y footer)
    // ========================================================
    cargarComponentes() {
        const headerContainer = document.createElement("div");
        const footerContainer = document.createElement("div");

        headerContainer.id = "header-container";
        footerContainer.id = "footer-container";

        // Insertar header antes del body content
        document.body.prepend(headerContainer);
        document.body.appendChild(footerContainer);

        // Cargar header
        fetch("components/header.html")
            .then(res => res.text())
            .then(html => {
                headerContainer.innerHTML = html;
            })
            .catch(err => console.error("Error cargando header:", err));

        // Cargar footer
        fetch("components/footer.html")
            .then(res => res.text())
            .then(html => {
                footerContainer.innerHTML = html;
            })
            .catch(err => console.error("Error cargando footer:", err));
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


};

