document.addEventListener("DOMContentLoaded", () => {
    // 1. Obtener ID desde la URL
    const params = new URLSearchParams(window.location.search);
    const articleId = params.get("id");

    const contentContainer = document.getElementById("article-content");

    if (!articleId) {
        contentContainer.innerHTML = '<p style="text-align:center; padding:50px;">Error: No se proporcionó un ID de artículo.</p>';
        return;
    }

    // 2. Cargar JSON de artículos
    fetch("../data/articles.json")
        .then(response => response.json())
        .then(articles => {
            const article = articles.find(a => a.id === articleId);

            if (!article) {
                document.title = "Artículo no encontrado";
                contentContainer.innerHTML = '<h2 style="text-align:center; margin-top:50px;">Artículo no encontrado 😔</h2>';
                return;
            }

            // 3. Renderizar Header y Contenido
            renderArticleHeader(article);
            
            // Limpiamos y renderizamos bloques
            contentContainer.innerHTML = article.content.map(renderBlock).join("");

            // 4. Renderizar Relacionados
            renderRelated(article, articles);
        })
        .catch(err => {
            console.error("Error cargando artículos:", err);
            contentContainer.innerHTML = '<p style="text-align:center;">Hubo un error al cargar el contenido.</p>';
        });
});

/* =======================
   Renderizador del Header (Metadatos)
   ======================= */
function renderArticleHeader(article) {
    document.title = `${article.title} - Blog Financiero`;
    
    // Asignar textos simples
    const safeSet = (id, text) => {
        const el = document.getElementById(id);
        if(el) el.textContent = text;
    };

    safeSet("article-title", article.title);
    safeSet("article-title-h1", article.title);
    safeSet("article-category", article.category);
    
    // Autor con ícono
    const authorEl = document.getElementById("article-author");
    if(authorEl) authorEl.innerHTML = `<i class="far fa-user"></i> ${article.author}`;

    // Tiempo lectura con ícono
    const readEl = document.getElementById("article-readtime");
    if(readEl) readEl.innerHTML = `<i class="far fa-clock"></i> ${article.readingTime}`;

    // Fecha formateada
    const dateEl = document.getElementById("article-date");
    if (dateEl) {
        const date = new Date(article.date + "T00:00:00");
        const dateStr = date.toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
        dateEl.innerHTML = `<i class="far fa-calendar"></i> ${dateStr}`;
    }

}

/* =======================
   Renderizador de Bloques (Switch Principal)
   ======================= */
function renderBlock(block) {
    switch (block.type) {
        case "header":
            const level = block.data.level || 2;
            return `<h${level} class="blog-header">${block.data.text}</h${level}>`;

        case "paragraph":
            return `<p class="blog-paragraph">${block.data.text}</p>`;

        case "list":
            const tag = block.data.style === 'ordered' ? 'ol' : 'ul';
            const items = block.data.items.map(i => `<li>${i}</li>`).join('');
            return `<${tag} class="blog-list">${items}</${tag}>`;

        /* En js/article.js, dentro de renderBlock */

        case "image":
            // Ajuste de ruta
            const imgSrc = block.data.src.startsWith('assets') ? `../${block.data.src}` : block.data.src;
            const creditHtml = block.data.credit ? `<span class="image-credit">${block.data.credit}</span>` : '';
            const captionHtml = block.data.caption ? `<figcaption>${block.data.caption} ${creditHtml}</figcaption>` : '';
            
            // 👇 NUEVO: Detectar si el JSON trae un tamaño específico
            // Si no trae nada, por defecto será style="" (y el CSS se encargará)
            const styleSize = block.data.width ? `style="width: ${block.data.width}; max-width: 100%;"` : '';

            return `
                <figure class="blog-image-container">
                    <img src="${imgSrc}" alt="${block.data.alt || 'Imagen'}" ${styleSize}>
                    ${captionHtml}
                </figure>`;

        case "table":
            return renderTable(block.data);

        case "highlight":
            return `<div class="blog-highlight">${block.data.text}</div>`;

        case "pros-cons":
            return `
                <div class="pros-cons-grid">
                    <div class="pros-box">
                        <h3><i class="fas fa-check-circle" style="color:#2e7d32"></i> Ventajas</h3>
                        <ul>${block.data.pros.map(i => `<li>${i}</li>`).join("")}</ul>
                    </div>
                    <div class="cons-box">
                        <h3><i class="fas fa-times-circle" style="color:#c62828"></i> Desventajas</h3>
                        <ul>${block.data.cons.map(i => `<li>${i}</li>`).join("")}</ul>
                    </div>
                </div>`;

        case "button":
            return `
                <div class="cta-button-container">
                    <a href="${block.data.url}" class="btn-article ${block.data.style || 'primary'}">${block.data.text}</a>
                </div>`;

        case "references":
            return `
                <div class="blog-references">
                    <h4>${block.data.title || 'Referencias'}</h4>
                    <ul>
                        ${block.data.items.map(ref => `<li><a href="${ref.url}" target="_blank">${ref.text}</a></li>`).join('')}
                    </ul>
                </div>`;

        default:
            console.warn("Tipo de bloque desconocido:", block.type);
            return "";
    }
}

/* =======================
   Helpers (Tablas y Relacionados)
   ======================= */
function renderTable(data) {
    return `
      <div class="table-responsive">
        <table class="blog-table">
          <thead>
            <tr>${data.headers.map(h => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${data.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
}

function renderRelated(currentArticle, allArticles) {
    const container = document.getElementById("related-posts-container");
    if (!container) return;

    // Filtramos artículos de la misma categoría que no sean el actual
    const related = allArticles
        .filter(a => a.category === currentArticle.category && a.id !== currentArticle.id)
        .slice(0, 3);

    if (related.length === 0) return;

    let html = `<h3>También te podría interesar:</h3><div class="articles-grid" style="margin-top:20px;">`;
    
    related.forEach(art => {
        const img = art.coverImage.startsWith('assets') ? `../${art.coverImage}` : art.coverImage;
        html += `
            <a href="article.html?id=${art.id}" class="article-card">
                <img src="${img}" class="article-image" alt="${art.title}">
                <div class="article-content">
                    <p class="article-date" style="font-size:0.8rem; color:#888;">Leer más &raquo;</p>
                    <h3 class="article-title" style="font-size:1rem;">${art.title}</h3>
                </div>
            </a>
        `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
}