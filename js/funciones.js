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
    // 🌐 9. Renderizar tabla genérica (configurable)
    // ========================================================
    renderizarTablaGeneral({
        data,
        headId,
        bodyId,
        mostrarTipo = false,
        mostrarNICAP = false,
        mostrarIMOR = false
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

        // Obtener plazos dinámicos
        const plazos = Object.keys(data[0].plazos || {});

        // 🧱 Construir encabezado dinámico
        let htmlHead = "<tr><th>Instrumento</th>";
        if (mostrarTipo) htmlHead += "<th>Tipo</th>";
        if (mostrarNICAP) htmlHead += "<th>NICAP (%)</th>";
        if (mostrarIMOR) htmlHead += "<th>IMOR (%)</th>";

        plazos.forEach(plazo => {
            htmlHead += `<th>${plazo}</th>`;
        });
        htmlHead += "</tr>";
        encabezado.innerHTML = htmlHead;

        // 🧩 Generar filas dinámicamente
        data.forEach(item => {
            const fila = document.createElement("tr");
            let htmlFila = `<td>${item.nombre}</td>`;

            if (mostrarTipo) {
                htmlFila += `<td class="tipo-etiqueta tipo-${item.tipo.toLowerCase()}">${item.tipo}</td>`;
            }

            if (mostrarNICAP) {
                const n = item.NICAP;
                htmlFila += `<td data-rate="${n ?? ''}">${n ? n.toFixed(2) + '%' : 'N/A'}</td>`;
            }

            if (mostrarIMOR) {
                const i = item.IMOR;
                htmlFila += `<td data-rate="${i ?? ''}">${i ? i.toFixed(2) + '%' : 'N/A'}</td>`;
            }

            plazos.forEach(plazo => {
                const tasa = item.plazos?.[plazo];
                const mostrar = (tasa !== null && tasa !== undefined && tasa !== '')
                    ? `${tasa}%`
                    : "No Disponible";
                htmlFila += `<td data-rate="${tasa}">${mostrar}</td>`;
            });

            fila.innerHTML = htmlFila;
            cuerpo.appendChild(fila);
        });

        console.log("✅ Tabla renderizada con configuración flexible.");
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


};
