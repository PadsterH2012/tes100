document.addEventListener('DOMContentLoaded', () => {
    const projectList = document.getElementById('projects');
    const newProjectButton = document.getElementById('new-project');
    const chatInterface = document.getElementById('chat-interface');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendMessageButton = document.getElementById('send-message');
    const documentDisplay = document.getElementById('document-display');
    const documentContent = document.getElementById('document-content');

    function loadProjects() {
        fetch('/api/projects')
            .then(response => response.json())
            .then(projects => {
                projectList.innerHTML = '';
                projects.forEach(project => {
                    const li = document.createElement('li');
                    li.textContent = project.name;
                    li.addEventListener('click', () => selectProject(project.id));
                    projectList.appendChild(li);
                });
            });
    }

    function selectProject(projectId) {
        chatInterface.style.display = 'block';
        documentDisplay.style.display = 'block';
        // Load project details, chat history, and documents
        loadProjectDocuments(projectId);
    }

    function loadProjectDocuments(projectId) {
        fetch(`/api/projects/${projectId}/documents`)
            .then(response => response.json())
            .then(documents => {
                documentContent.innerHTML = '';
                documents.forEach(doc => {
                    const docElement = document.createElement('div');
                    docElement.innerHTML = `
                        <h3>${doc.doc_type}</h3>
                        <p>${doc.content}</p>
                    `;
                    documentContent.appendChild(docElement);
                });
            });
    }

    newProjectButton.addEventListener('click', () => {
        const projectName = prompt('Enter project name:');
        if (projectName) {
            fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: projectName }),
            })
            .then(response => response.json())
            .then(() => loadProjects());
        }
    });

    sendMessageButton.addEventListener('click', () => {
        const message = chatInput.value.trim();
        if (message) {
            // Send message to AI and handle response
            chatInput.value = '';
        }
    });

    loadProjects();

    let currentProjectId = null;

    function selectProject(projectId) {
        currentProjectId = projectId;
        chatInterface.style.display = 'block';
        documentDisplay.style.display = 'block';
        loadProjectDocuments(projectId);
    }

    const newDocumentForm = document.getElementById('new-document-form');
    newDocumentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const docType = document.getElementById('doc-type').value;
        const docContent = document.getElementById('doc-content').value;

        if (currentProjectId && docType && docContent) {
            fetch(`/api/projects/${currentProjectId}/documents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ doc_type: docType, content: docContent }),
            })
            .then(response => response.json())
            .then(() => {
                loadProjectDocuments(currentProjectId);
                document.getElementById('doc-content').value = '';
            });
        }
    });
});
