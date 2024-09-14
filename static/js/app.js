document.addEventListener('DOMContentLoaded', () => {
    const projectList = document.getElementById('projects');
    const newProjectButton = document.getElementById('new-project');
    const chatInterface = document.getElementById('chat-interface');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendMessageButton = document.getElementById('send-message');
    const documentDisplay = document.getElementById('document-display');
    const documentContent = document.getElementById('document-content');
    const navProjects = document.getElementById('nav-projects');
    const navSettings = document.getElementById('nav-settings');
    const settingsSection = document.getElementById('settings');
    const aiProviderForm = document.getElementById('ai-provider-form');
    const providerList = document.getElementById('provider-list');
    const aiAgentForm = document.getElementById('ai-agent-form');
    const agentConfigList = document.getElementById('agent-config-list');
    const providerSelect = document.getElementById('provider-select');

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
        if (message && currentProjectId) {
            fetch(`/api/projects/${currentProjectId}/conversations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ agent_type: 'user', content: message }),
            })
            .then(response => response.json())
            .then(conversation => {
                displayMessage(conversation);
                chatInput.value = '';
                // Here you would typically call a function to get the AI's response
                // For now, we'll just log the message
                console.log('User message sent:', message);
            });
        }
    });

    function displayMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', message.agent_type);
        messageElement.textContent = message.content;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    loadProjects();
    loadProviders();

    let currentProjectId = null;

    function selectProject(projectId) {
        currentProjectId = projectId;
        chatInterface.style.display = 'block';
        documentDisplay.style.display = 'block';
        settingsSection.style.display = 'none';
        loadProjectDocuments(projectId);
        loadProjectConversations(projectId);
    }

    navProjects.addEventListener('click', (e) => {
        e.preventDefault();
        chatInterface.style.display = 'none';
        documentDisplay.style.display = 'none';
        settingsSection.style.display = 'none';
        document.getElementById('project-list').style.display = 'block';
    });

    navSettings.addEventListener('click', (e) => {
        e.preventDefault();
        chatInterface.style.display = 'none';
        documentDisplay.style.display = 'none';
        document.getElementById('project-list').style.display = 'none';
        settingsSection.style.display = 'block';
    });

    aiProviderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const providerName = document.getElementById('provider-name').value;
        const apiUrl = document.getElementById('api-url').value;
        const apiKey = document.getElementById('api-key').value;

        fetch('/api/ai_providers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: providerName, api_url: apiUrl, api_key: apiKey }),
        })
        .then(response => response.json())
        .then(() => {
            loadProviders();
            aiProviderForm.reset();
        });
    });

    function loadProviders() {
        fetch('/api/ai_providers')
            .then(response => response.json())
            .then(providers => {
                providerList.innerHTML = '';
                providerSelect.innerHTML = '';
                providers.forEach(provider => {
                    const li = document.createElement('li');
                    li.textContent = `${provider.name} - ${provider.api_url}`;
                    providerList.appendChild(li);

                    const option = document.createElement('option');
                    option.value = provider.id;
                    option.textContent = provider.name;
                    providerSelect.appendChild(option);
                });
            });
    }

    // Call loadProviders when the page loads
    loadProviders();

    function loadAgentConfigs() {
        fetch('/api/ai_agent_configs')
            .then(response => response.json())
            .then(configs => {
                agentConfigList.innerHTML = '';
                configs.forEach(config => {
                    const li = document.createElement('li');
                    li.textContent = `${config.agent_type} - ${config.model_name}`;
                    agentConfigList.appendChild(li);
                });
            });
    }

    function loadAgentTypes() {
        fetch('/api/agent_types')
            .then(response => response.json())
            .then(agentTypes => {
                const agentTypeSelect = document.getElementById('agent-type');
                agentTypeSelect.innerHTML = '';
                agentTypes.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type;
                    option.textContent = type;
                    agentTypeSelect.appendChild(option);
                });
            });
    }

    aiAgentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const agentType = document.getElementById('agent-type').value;
        const providerId = providerSelect.value;
        const modelName = document.getElementById('model-name').value;
        const systemPrompt = document.getElementById('system-prompt').value;

        fetch('/api/ai_agent_configs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                agent_type: agentType,
                provider_id: providerId,
                model_name: modelName,
                system_prompt: systemPrompt
            }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(() => {
            loadAgentConfigs();
            aiAgentForm.reset();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to save agent configuration. Please try again.');
        });
    });

    // Call loadAgentTypes when the page loads
    loadAgentTypes();

    function loadProjectConversations(projectId) {
        fetch(`/api/projects/${projectId}/conversations`)
            .then(response => response.json())
            .then(conversations => {
                chatMessages.innerHTML = '';
                conversations.forEach(displayMessage);
            });
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
