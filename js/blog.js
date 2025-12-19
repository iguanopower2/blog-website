document.addEventListener('DOMContentLoaded', function () {

  // 1️⃣ Referencias a elementos de la página
  const articlesGrid = document.getElementById('articles-grid');
  const searchBar = document.getElementById('search-bar');
  const noResults = document.getElementById('no-results');
  let allArticles = [];

  // 2️⃣ Cargar JSON de artículos
  fetch('data/articles.json')
    .then(response => response.json())
    .then(data => {
      allArticles = data;
      displayArticles(allArticles);
    });

  // 3️⃣ Función para mostrar artículos en el grid
  function displayArticles(articles) {
    articlesGrid.innerHTML = '';

    if (articles.length === 0) {
      noResults.style.display = 'block';
    } else {
      noResults.style.display = 'none';
    }

    articles.forEach(article => {

      const articleCard = document.createElement('a');
      articleCard.href = `blog/article.html?id=${article.id}`; 
      // Genera la URL dinámicamente

      articleCard.className = 'article-card';

      const date = new Date(article.date + 'T00:00:00');
      const formattedDate = date.toLocaleDateString('es-MX', {
        year: 'numeric', month: 'long', day: 'numeric'
      });

      articleCard.innerHTML = `
        <img src="${article.coverImage}" alt="${article.title}" class="article-image">
        <div class="article-content">
          <p class="article-date">${formattedDate}</p>
          <h3 class="article-title">${article.title}</h3>
          <p class="article-summary">${article.readingTime} • ${article.tags.join(", ")}</p>
        </div>
      `;
      articlesGrid.appendChild(articleCard);
    });
  }

  // 4️⃣ Búsqueda por título, resumen o tags
  searchBar.addEventListener('input', function (e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    const filteredArticles = allArticles.filter(article => {
      const titleMatch = article.title.toLowerCase().includes(searchTerm);
      const summaryMatch = article.summary?.toLowerCase().includes(searchTerm) ?? false;
      const tagsMatch = article.tags.some(tag => tag.toLowerCase().includes(searchTerm));
      return titleMatch || summaryMatch || tagsMatch;
    });
    displayArticles(filteredArticles);
  });
});