document.addEventListener('DOMContentLoaded', function () {
    const articlesGrid = document.getElementById('articles-grid');
    const searchBar = document.getElementById('search-bar');
    const noResults = document.getElementById('no-results');
    let allArticles = [];

    // Cargar todos los artículos desde el archivo JSON
    fetch('data/articles.json')
        .then(response => response.json())
        .then(data => {
            allArticles = data;
            displayArticles(allArticles);
        });

    // Función para mostrar los artículos en el HTML
    function displayArticles(articles) {
        articlesGrid.innerHTML = ''; // Limpiar la parrilla
        if (articles.length === 0) {
            noResults.style.display = 'block';
        } else {
            noResults.style.display = 'none';
        }

        articles.forEach(article => {
            const articleCard = document.createElement('a');
            articleCard.href = article.url;
            articleCard.className = 'article-card';

            // Formatear la fecha
            const date = new Date(article.date + 'T00:00:00'); // Asumir hora local
            const formattedDate = date.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            articleCard.innerHTML = `
                <img src="${article.image}" 
                    alt="${article.title}" 
                    class="article-image" 
                    loading = "lazy" 
                    width="400"
                    height="200"
                    onerror="this.onerror=null;this.src='https://placehold.co/400x200/cccccc/ffffff?text=Imagen';">

                    <div class="image-overlay">
                    <span class="read-time">📖 ${article.readTime || '5 min'}</span>
                    ${article.tags && article.tags.includes('popular') ? 
                      '<span class="badge-popular">🔥 Popular</span>' : ''}
                    </div>

                <div class="article-content">
                    <p class="article-date">${formattedDate}</p>
                    <h3 class="article-title">${article.title}</h3>
                    <p class="article-summary">${article.summary}</p>
                </div>
            `;
            articlesGrid.appendChild(articleCard);
        });
    }

    // Funcionalidad de la barra de búsqueda
    searchBar.addEventListener('input', function (e) {
        const searchTerm = e.target.value.toLowerCase().trim();

        const filteredArticles = allArticles.filter(article => {
            const titleMatch = article.title.toLowerCase().includes(searchTerm);
            const summaryMatch = article.summary.toLowerCase().includes(searchTerm);
            const tagsMatch = article.tags.some(tag => tag.toLowerCase().includes(searchTerm));
            return titleMatch || summaryMatch || tagsMatch;
        });

        displayArticles(filteredArticles);
    });
});
