// Añade esta función para realizar la búsqueda
function searchFiles(query) {
    const results = [];
    function searchInNode(node, path) {
        if (node.name.toLowerCase().includes(query.toLowerCase())) {
            results.push({ node, path });
        }
        if (node.isDirectory) {
            node.children.forEach(child => {
                searchInNode(child, path + '/' + node.name);
            });
        }
    }
    searchInNode(fileSystem.root, '');
    return results;
}

// Añade esta función para mostrar los resultados de la búsqueda
function displaySearchResults(results) {
    const searchResults = document.getElementById('search-results');
    searchResults.innerHTML = '';
    results.forEach(result => {
        const item = document.createElement('a');
        item.href = '#';
        item.className = 'list-group-item list-group-item-action';
        item.textContent = result.path + '/' + result.node.name;
        item.onclick = (e) => {
            e.preventDefault();
            navigateToFile(result.node, result.path);
        };
        searchResults.appendChild(item);
    });
}

// Añade esta función para navegar hasta el archivo o carpeta
function navigateToFile(node, path) {
    const parts = path.split('/').filter(part => part !== '');
    currentDirectory = fileSystem.root;
    parts.forEach(part => {
        currentDirectory = currentDirectory.children.find(child => child.name === part);
    });
    updateFileList();
    if (!node.isDirectory) {
        // Si es un archivo, selecciónalo visualmente
        const fileElements = document.querySelectorAll('.file-card');
        fileElements.forEach(elem => {
            if (elem.querySelector('.card-text').textContent === node.name) {
                elem.classList.add('border-primary');
                elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }
}

// Modifica la función updateFileList para incluir la inicialización de la búsqueda
function updateFileList() {
    // ... (código existente)

    // Inicializa la funcionalidad de búsqueda
    const searchBar = document.getElementById('search-bar');
    searchBar.oninput = () => {
        const query = searchBar.value;
        if (query.length > 0) {
            const results = searchFiles(query);
            displaySearchResults(results);
        } else {
            document.getElementById('search-results').innerHTML = '';
        }
    };
}