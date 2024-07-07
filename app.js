class FileNode {
    constructor(name, isDirectory = false, parent = null) {
        this.name = name;
        this.isDirectory = isDirectory;
        this.children = isDirectory ? [] : null;
        this.content = isDirectory ? null : '';
        this.creationDate = new Date();
        this.modifiedDate = new Date();
        this.parent = parent;
        this.size = 0; // Para archivos, esto representará el tamaño del contenido
    }

    getType() {
        if (this.isDirectory) return 'Carpeta';
        const extension = this.name.split('.').pop().toLowerCase();
        switch (extension) {
            case 'txt': return 'Archivo de texto';
            case 'jpg':
            case 'png':
            case 'gif': return 'Imagen';
            default: return 'Archivo';
        }
    }

    getSize() {
        if (this.isDirectory) {
            return this.children.reduce((total, child) => total + child.getSize(), 0);
        }
        return this.size;
    }
}

class FileSystem {
    constructor() {
        this.root = new FileNode('/', true);
    }

    insert(path, isDirectory = false) {
        const parts = path.split('/').filter(part => part !== '');
        let current = this.root;

        for (let i = 0; i < parts.length; i++) {
            const isLast = i === parts.length - 1;
            const part = parts[i];
            let found = current.children.find(child => child.name === part);

            if (!found) {
                const newNode = new FileNode(part, isLast ? isDirectory : true, current);
                current.children.push(newNode);
                found = newNode;
            }

            if (isLast && !isDirectory && found.isDirectory) {
                throw new Error('Cannot create a file with the same name as an existing directory');
            }

            current = found;
        }
    }

    getDirectory(path) {
        if (path === '/') return this.root;
        const parts = path.split('/').filter(part => part !== '');
        let current = this.root;

        for (const part of parts) {
            const found = current.children.find(child => child.name === part);
            if (!found || !found.isDirectory) {
                return null;
            }
            current = found;
        }

        return current;
    }
}

const fileSystem = new FileSystem();
let currentDirectory = fileSystem.root;
let selectedFile = null;
let copiedFile = null;

function updateFileList() {
    const fileContainer = document.getElementById('file-container');
    fileContainer.innerHTML = '';

    currentDirectory.children.forEach(file => {
        const card = document.createElement('div');
        card.className = 'card file-card';
        card.onclick = () => {
            if (file.isDirectory) {
                currentDirectory = file;
                updateFileList();
            }
        };
        card.oncontextmenu = (e) => {
            e.preventDefault();
            showContextMenu(e, file);
        };
        card.innerHTML = `
            <img src="${file.isDirectory ? 'folder_logo.png' : 'file_logo.png'}" class="card-img-top file-icon" alt="${file.isDirectory ? 'Directory' : 'File'}">
            <div class="card-body p-2">
                <p class="card-text">${file.name}</p>
            </div>
        `;
        fileContainer.appendChild(card);
    });

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

    updateCurrentPath();
}

function updateCurrentPath() {
    const pathElement = document.getElementById('current-path');
    pathElement.textContent = getFullPath(currentDirectory);
}

function getFullPath(node) {
    const path = [];
    let current = node;
    while (current !== null) {
        path.unshift(current.name);
        current = current.parent;
    }
    return path.join('/') || '/';
}

function showContextMenu(e, file) {
    const contextMenu = document.getElementById('context-menu');
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
    selectedFile = file;
}

document.addEventListener('click', () => {
    const contextMenu = document.getElementById('context-menu');
    contextMenu.style.display = 'none';
});



function infoSelected() {
    if (selectedFile) {
        const info = {
            Nombre: selectedFile.name,
            'Fecha de creación': selectedFile.creationDate.toLocaleString(),
            'Última modificación': selectedFile.modifiedDate.toLocaleString(),
            Tamaño: `${selectedFile.getSize()} bytes`,
            'Tipo de archivo': selectedFile.getType()
        };

        let infoString = Object.entries(info)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');

        alert(infoString);
    }
}

function copySelected() {
    if (selectedFile) {
        copiedFile = selectedFile;
        console.log(`Copiado: ${selectedFile.name}`);
    }
}



function renameSelected() {
    if (selectedFile) {
        const newName = prompt(`Renombrar ${selectedFile.name} a:`, selectedFile.name);
        if (newName && newName !== selectedFile.name) {
            console.log(`Renombrando ${selectedFile.name} a ${newName}`);
            selectedFile.name = newName;
            selectedFile.modifiedDate = new Date(); // Actualizamos la fecha de modificación
            updateFileList();
        }
    }
}

function deleteSelected() {
    if (selectedFile) {
        if (confirm(`¿Estás seguro de que quieres eliminar ${selectedFile.name}?`)) {
            console.log(`Eliminando ${selectedFile.name}`);
            const index = currentDirectory.children.indexOf(selectedFile);
            if (index > -1) {
                currentDirectory.children.splice(index, 1);
                updateFileList();
            }
        }
    }
}

function pasteSelected() {
    if (copiedFile) {
        console.log(`Pegando ${copiedFile.name} en ${currentDirectory.name}`);
        const newNode = new FileNode(copiedFile.name, copiedFile.isDirectory, currentDirectory);
        newNode.content = copiedFile.content;
        newNode.size = copiedFile.size;
        newNode.creationDate = new Date(); // Nueva fecha de creación para la copia
        newNode.modifiedDate = new Date(); // Nueva fecha de modificación para la copia
        if (copiedFile.isDirectory) {
            function copyChildren(source, target) {
                source.children.forEach(child => {
                    const newChild = new FileNode(child.name, child.isDirectory, target);
                    newChild.content = child.content;
                    newChild.size = child.size;
                    newChild.creationDate = new Date(); // Nueva fecha de creación para cada elemento copiado
                    newChild.modifiedDate = new Date(); // Nueva fecha de modificación para cada elemento copiado
                    target.children.push(newChild);
                    if (child.isDirectory) {
                        copyChildren(child, newChild);
                    }
                });
            }
            copyChildren(copiedFile, newNode);
        }
        currentDirectory.children.push(newNode);
        updateFileList();
    }
}

function createFile() {
    const fileName = prompt('Ingrese el nombre del archivo:');
    if (fileName) {
        const size = parseInt(prompt('Ingrese el tamaño del archivo en bytes:', '0')) || 0;
        const newFile = new FileNode(fileName, false, currentDirectory);
        newFile.size = size;
        newFile.creationDate = new Date(); // Esto ya está en el constructor, pero lo dejamos por claridad
        newFile.modifiedDate = new Date(); // Esto ya está en el constructor, pero lo dejamos por claridad
        currentDirectory.children.push(newFile);
        updateFileList();
    }
}

function createDirectory() {
    const dirName = prompt('Ingrese el nombre del directorio:');
    if (dirName) {
        const newDir = new FileNode(dirName, true, currentDirectory);
        newDir.creationDate = new Date(); // Esto ya está en el constructor, pero lo dejamos por claridad
        newDir.modifiedDate = new Date(); // Esto ya está en el constructor, pero lo dejamos por claridad
        currentDirectory.children.push(newDir);
        updateFileList();
    }
}

function goBack() {
    if (currentDirectory.parent) {
        currentDirectory = currentDirectory.parent;
        updateFileList();
    }
}

//BUSQUEDA*************
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
//******************** */

// Inicializar con algunos archivos y directorios de ejemplo
fileSystem.insert('/Documentos', true);
fileSystem.insert('/Imágenes', true);
fileSystem.insert('/archivo1.txt');
fileSystem.insert('/archivo2.txt');

updateFileList();