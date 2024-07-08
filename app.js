let fileToMove = null;

class FileNode {
    constructor(name, isDirectory = false, parent = null, content = '') {
        this.name = name;
        this.isDirectory = isDirectory;
        this.children = isDirectory ? [] : null;
        this.content = isDirectory ? null : content;
        this.creationDate = new Date();
        this.modifiedDate = new Date();
        this.parent = parent;
        this.size = isDirectory ? 0 : new TextEncoder().encode(content).length;
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

    setContent(content) {
        if (!this.isDirectory) {
            this.content = content;
            this.size = new TextEncoder().encode(content).length;
            this.modifiedDate = new Date();
            this.updateParentSizes();
        }
    }

    getContent() {
        return this.content;
    }

    updateParentSizes() {
        let parent = this.parent;
        while (parent) {
            parent.size = parent.getSize();
            parent = parent.parent;
        }
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

function moveSelected() {
    if (selectedFile) {
        fileToMove = selectedFile;
        console.log(`Preparado para mover: ${selectedFile.name}`);
    }
}

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
        // Añadir evento de doble clic para archivos de texto
        if (!file.isDirectory && file.name.toLowerCase().endsWith('.txt')) {
            card.ondblclick = () => showFileContent(file);
        }
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

    // Mostrar u ocultar opciones según el tipo de archivo
    const moveOption = contextMenu.querySelector('a[onclick="moveSelected()"]');
    const pasteOption = contextMenu.querySelector('a[onclick="pasteSelected()"]');
    
    moveOption.style.display = 'block';
    pasteOption.style.display = copiedFile || fileToMove ? 'block' : 'none';
}

document.addEventListener('click', () => {
    const contextMenu = document.getElementById('context-menu');
    contextMenu.style.display = 'none';
});

function isNameTaken(name, currentDirectory) {
    return currentDirectory.children.some(child => child.name.toLowerCase() === name.toLowerCase());
}

function infoSelected() {
    if (selectedFile) {
        const info = {
            Nombre: selectedFile.name,
            'Fecha de creación': selectedFile.creationDate.toLocaleString(),
            'Última modificación': selectedFile.modifiedDate.toLocaleString(),
            Tamaño: `${selectedFile.getSize()} bytes`,
            'Tipo de archivo': selectedFile.getType()
        };

        if (!selectedFile.isDirectory) {
            info['Contenido'] = selectedFile.getContent();
        } else {
            info['Elementos'] = selectedFile.children.length;
        }

        let infoString = Object.entries(info)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n');

        alert(infoString);
    }
}

function copySelected() {
    if (selectedFile) {
        function deepCopy(node) {
            const newNode = new FileNode(node.name, node.isDirectory, null, node.content);
            if (node.isDirectory) {
                newNode.children = node.children.map(child => deepCopy(child));
            }
            return newNode;
        }
        copiedFile = deepCopy(selectedFile);
        console.log(`Copiado: ${selectedFile.name}`);
    }
}



function renameSelected() {
    if (selectedFile) {
        let newName = prompt(`Renombrar ${selectedFile.name} a:`, selectedFile.name);
        if (newName && newName !== selectedFile.name) {
            while (isNameTaken(newName, currentDirectory)) {
                newName = prompt(`El nombre "${newName}" ya existe. Por favor, elija otro nombre:`);
                if (!newName) return; // El usuario canceló
            }
            console.log(`Renombrando ${selectedFile.name} a ${newName}`);
            selectedFile.name = newName;
            selectedFile.modifiedDate = new Date();
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
                selectedFile.updateParentSizes();
                updateFileList();
            }
        }
    }
}

function pasteSelected() {
    if (copiedFile || fileToMove) {
        const sourceFile = copiedFile || fileToMove;
        
        function getUniqueName(name, isDirectory) {
            let baseName = name;
            let extension = '';
            if (!isDirectory) {
                const parts = name.split('.');
                if (parts.length > 1) {
                    extension = '.' + parts.pop();
                    baseName = parts.join('.');
                }
            }
            let newName = name;
            let counter = 1;
            while (currentDirectory.children.some(child => child.name === newName)) {
                newName = `${baseName}(${counter})${extension}`;
                counter++;
            }
            return newName;
        }

        const newName = getUniqueName(sourceFile.name, sourceFile.isDirectory);
        
        if (fileToMove) {
            // Mover el archivo
            const index = fileToMove.parent.children.indexOf(fileToMove);
            if (index > -1) {
                fileToMove.parent.children.splice(index, 1);
            }
            fileToMove.parent = currentDirectory;
            fileToMove.name = newName;
            currentDirectory.children.push(fileToMove);
            fileToMove.updateParentSizes();
            fileToMove = null;
        } else {
            // Copiar el archivo
            function deepCopy(node, parent) {
                const newNode = new FileNode(node.name, node.isDirectory, parent, node.content);
                newNode.size = node.size;
                if (node.isDirectory) {
                    node.children.forEach(child => {
                        const copiedChild = deepCopy(child, newNode);
                        newNode.children.push(copiedChild);
                    });
                }
                return newNode;
            }
            
            const newNode = deepCopy(sourceFile, currentDirectory);
            newNode.name = newName;
            currentDirectory.children.push(newNode);
            newNode.updateParentSizes();
        }
        
        updateFileList();
        console.log(`${fileToMove ? 'Movido' : 'Copiado'}: ${sourceFile.name} a ${currentDirectory.name}`);
    }
}

function createFile() {
    let fileName = prompt('Ingrese el nombre del archivo (debe terminar en .txt):');
    if (fileName && fileName.toLowerCase().endsWith('.txt')) {
        while (isNameTaken(fileName, currentDirectory)) {
            fileName = prompt(`El nombre "${fileName}" ya existe. Por favor, elija otro nombre:`);
            if (!fileName) return; // El usuario canceló
        }
        const content = prompt('Ingrese el contenido del archivo:') || '';
        const newFile = new FileNode(fileName, false, currentDirectory, content);
        currentDirectory.children.push(newFile);
        newFile.updateParentSizes();
        updateFileList();
    } else if (fileName) {
        alert('El nombre del archivo debe terminar en .txt');
    }
}

function editFileContent() {
    if (selectedFile && !selectedFile.isDirectory) {
        const newContent = prompt('Editar contenido:', selectedFile.getContent());
        if (newContent !== null) {
            selectedFile.setContent(newContent);
            updateFileList();
        }
    }
}

function createDirectory() {
    let dirName = prompt('Ingrese el nombre del directorio:');
    if (dirName) {
        while (isNameTaken(dirName, currentDirectory)) {
            dirName = prompt(`El nombre "${dirName}" ya existe. Por favor, elija otro nombre:`);
            if (!dirName) return; // El usuario canceló
        }
        const newDir = new FileNode(dirName, true, currentDirectory);
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
        const lowerQuery = query.toLowerCase();
        if (node.name.toLowerCase().includes(lowerQuery)) {
            results.push({ node, path, matchType: 'name' });
        }
        if (!node.isDirectory && node.name.toLowerCase().endsWith('.txt')) {
            if (node.getContent().toLowerCase().includes(lowerQuery)) {
                results.push({ node, path, matchType: 'content' });
            }
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
        const matchType = result.matchType === 'name' ? 'nombre' : 'contenido';
        item.textContent = `${result.path}/${result.node.name} (Coincidencia en ${matchType})`;
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
    
    // Limpia la barra de búsqueda
    const searchBar = document.getElementById('search-bar');
    searchBar.value = '';
    
    // Limpia los resultados de búsqueda
    document.getElementById('search-results').innerHTML = '';
    
    // Actualiza la lista de archivos
    updateFileList();

    if (!node.isDirectory) {
        // Si es un archivo, selecciónalo visualmente
        setTimeout(() => {
            const fileElements = document.querySelectorAll('.file-card');
            fileElements.forEach(elem => {
                if (elem.querySelector('.card-text').textContent === node.name) {
                    elem.classList.add('border-primary');
                    elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Abre automáticamente el archivo si es un .txt
                    if (node.name.toLowerCase().endsWith('.txt')) {
                        showFileContent(node);
                    }
                }
            });
        }, 100); // Pequeño retraso para asegurar que los elementos se han renderizado
    }
}
//******************** */
function downloadFile() {
    if (selectedFile && !selectedFile.isDirectory && selectedFile.name.toLowerCase().endsWith('.txt')) {
        const blob = new Blob([selectedFile.getContent()], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = selectedFile.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } else {
        alert('Solo se pueden descargar archivos de texto (.txt)');
    }
}

function showFileContent(file) {
    if (!file.isDirectory && file.name.toLowerCase().endsWith('.txt')) {
        const modalTitle = document.getElementById('fileContentModalLabel');
        const modalContent = document.getElementById('fileContentPre');
        modalTitle.textContent = file.name;
        modalContent.textContent = file.getContent();
        
        const modal = new bootstrap.Modal(document.getElementById('fileContentModal'));
        modal.show();
    }
}

// Inicializar con algunos archivos y directorios de ejemplo
fileSystem.insert('/Documentos', true);
fileSystem.insert('/Imágenes', true);
fileSystem.root.children.push(new FileNode('archivo1.txt', false, fileSystem.root, 'Contenido del archivo 1'));
fileSystem.root.children.push(new FileNode('archivo2.txt', false, fileSystem.root, 'Contenido del archivo 2'));
updateFileList();