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
                // We're not displaying the document content anymore
            });
    }

    // Tab functionality
    const tabLinks = document.querySelectorAll('#project-tabs ul li a');
    const tabContents = document.querySelectorAll('.tab-content');

    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all tabs and contents
            tabLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            link.classList.add('active');
            const tabId = link.getAttribute('href').substring(1);
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Set the first tab as active by default
    tabLinks[0].classList.add('active');
    tabContents[0].classList.add('active');

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

    function sendMessage() {
        const message = chatInput.value.trim();
        if (message && currentProjectId) {
            // Display user message
            displayMessage({ agent_type: 'user', content: message });
            chatInput.value = '';

            // Send message to AI
            fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ project_id: currentProjectId, message: message }),
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    console.error('Error:', data.error);
                    displayMessage({ agent_type: 'Project Assistant', content: `Error: ${data.error}` });
                } else {
                    displayMessage({ agent_type: 'Project Assistant', content: data.response });
                }
            })
            .catch(error => {
                console.error('Error:', error);
                displayMessage({ agent_type: 'Project Assistant', content: `An error occurred: ${error.message}` });
            });
        }
    }

    sendMessageButton.addEventListener('click', sendMessage);

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    function displayMessage(message) {
        console.log('Displaying message:', message);
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', message.agent_type.toLowerCase());
        messageElement.textContent = message.content;
        chatMessages.appendChild(messageElement);
        console.log('Message added to chat window');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function clearChatMessages() {
        chatMessages.innerHTML = '';
    }

    function selectProject(projectId) {
        currentProjectId = projectId;
        document.getElementById('project-list').style.display = 'none';
        chatInterface.style.display = 'block';
        documentDisplay.style.display = 'block';
        settingsSection.style.display = 'none';
        clearChatMessages();
        loadProjectDocuments(projectId);
        loadChatHistory(projectId);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Fetch and set the project name
        fetch(`/api/projects/${projectId}`)
            .then(response => response.json())
            .then(project => {
                document.getElementById('project-name').textContent = project.name;
                document.getElementById('project-documents-title').textContent = `Project - ${project.name}`;
            });
    }

    // Add this function to load projects and select the last active project
    function loadProjectsAndSelectLast() {
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

                // Select the last project if available
                if (projects.length > 0) {
                    const lastProject = projects[projects.length - 1];
                    selectProject(lastProject.id);
                }
            });
    }

    // Call this function when the page loads
    document.addEventListener('DOMContentLoaded', loadProjectsAndSelectLast);

    loadProjects();
    loadProviders();

    let currentProjectId = null;

    function selectProject(projectId) {
        currentProjectId = projectId;
        document.getElementById('project-list').style.display = 'none';
        chatInterface.style.display = 'block';
        documentDisplay.style.display = 'block';
        settingsSection.style.display = 'none';
        clearChatMessages();
        loadProjectDocuments(projectId);
        loadChatHistory(projectId);

        // Fetch and set the project name
        fetch(`/api/projects/${projectId}`)
            .then(response => response.json())
            .then(project => {
                document.getElementById('project-name').textContent = project.name;
                document.getElementById('project-documents-title').textContent = `Project - ${project.name}`;
            });
    }

    function clearChatMessages() {
        chatMessages.innerHTML = '';
    }

    function loadChatHistory(projectId) {
        fetch(`/api/projects/${projectId}/chat_history`)
            .then(response => response.json())
            .then(history => {
                history.forEach(message => {
                    displayMessage(message);
                });
            })
            .catch(error => {
                console.error('Error loading chat history:', error);
            });
    }

    function loadChatHistory(projectId) {
        console.log(`Loading chat history for project ID: ${projectId}`);
        fetch(`/api/projects/${projectId}/chat_history`)
            .then(response => {
                console.log('Chat history response status:', response.status);
                return response.json();
            })
            .then(history => {
                console.log('Received chat history:', history);
                chatMessages.innerHTML = '';
                history.forEach(message => {
                    displayMessage(message);
                });
                chatMessages.scrollTop = chatMessages.scrollHeight;
            })
            .catch(error => {
                console.error('Error loading chat history:', error);
            });
    }

    navProjects.addEventListener('click', (e) => {
        e.preventDefault();
        currentProjectId = null;
        chatInterface.style.display = 'none';
        documentDisplay.style.display = 'none';
        settingsSection.style.display = 'none';
        document.getElementById('project-list').style.display = 'block';
        document.getElementById('project-name').textContent = '';
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

        fetch('/api/ai_providers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: providerName, api_url: apiUrl }),
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
                    li.textContent = `${provider.name} - ${provider.api_url} - API Key: ${provider.has_api_key ? '######' : 'Not set'}`;
            
                    const buttonContainer = document.createElement('div');
                    buttonContainer.className = 'button-container';

                    const editButton = document.createElement('button');
                    editButton.textContent = 'Edit';
                    editButton.addEventListener('click', () => editProvider(provider.id));
            
                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'Delete';
                    deleteButton.addEventListener('click', () => deleteProvider(provider.id));
            
                    buttonContainer.appendChild(editButton);
                    buttonContainer.appendChild(deleteButton);
                    li.appendChild(buttonContainer);
                    providerList.appendChild(li);

                    const option = document.createElement('option');
                    option.value = provider.id;
                    option.textContent = provider.name;
                    providerSelect.appendChild(option);
                });
            });
    }

    function editProvider(providerId) {
        fetch(`/api/ai_providers/${providerId}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.error || 'Failed to load provider data');
                    });
                }
                return response.json();
            })
            .then(provider => {
                document.getElementById('provider-id').value = provider.id || '';
                document.getElementById('provider-name').value = provider.name || '';
                document.getElementById('api-url').value = provider.api_url || '';
                document.getElementById('api-key').value = provider.api_key || '';
            })
            .catch(error => {
                console.error('Error fetching provider data:', error);
                alert(`Failed to load provider data: ${error.message}`);
            });
    }

    function deleteProvider(providerId) {
        if (confirm('Are you sure you want to delete this provider?')) {
            fetch(`/api/ai_providers/${providerId}`, { method: 'DELETE' })
                .then(() => loadProviders());
        }
    }

    document.getElementById('ai-provider-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const providerId = document.getElementById('provider-id').value;
        const data = {
            name: document.getElementById('provider-name').value,
            api_url: document.getElementById('api-url').value,
            api_key: document.getElementById('api-key').value
        };
    
        const url = providerId ? `/api/ai_providers/${providerId}` : '/api/ai_providers';
    
        fetch(url, {
            method: providerId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(() => {
            loadProviders();
            document.getElementById('ai-provider-form').reset();
            document.getElementById('provider-id').value = '';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to save provider. Please try again.');
        });
    });

    document.getElementById('clear-provider-form').addEventListener('click', () => {
        document.getElementById('ai-provider-form').reset();
        document.getElementById('provider-id').value = '';
    });

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
                    
                    const buttonContainer = document.createElement('div');
                    buttonContainer.className = 'button-container';

                    const editButton = document.createElement('button');
                    editButton.textContent = 'Edit';
                    editButton.addEventListener('click', () => editAgentConfig(config.id));
                    
                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'Delete';
                    deleteButton.addEventListener('click', () => deleteAgentConfig(config.id));
                    
                    buttonContainer.appendChild(editButton);
                    buttonContainer.appendChild(deleteButton);
                    li.appendChild(buttonContainer);
                    agentConfigList.appendChild(li);
                });
            });
    }

    function editAgentConfig(configId) {
        fetch(`/api/ai_agent_configs/${configId}`)
            .then(response => response.json())
            .then(config => {
                document.getElementById('config-id').value = config.id;
                document.getElementById('agent-type').value = config.agent_type;
                document.getElementById('provider-select').value = config.provider_id;
                document.getElementById('model-name').value = config.model_name;
                document.getElementById('system-prompt').value = config.system_prompt;
            });
    }

    function deleteAgentConfig(configId) {
        if (confirm('Are you sure you want to delete this agent configuration?')) {
            fetch(`/api/ai_agent_configs/${configId}`, { method: 'DELETE' })
                .then(() => loadAgentConfigs());
        }
    }

    document.getElementById('clear-form').addEventListener('click', () => {
        document.getElementById('ai-agent-form').reset();
        document.getElementById('config-id').value = '';
    });

    document.getElementById('apply-model-to-all').addEventListener('click', () => {
        const providerId = document.getElementById('provider-select').value;
        const modelName = document.getElementById('model-name').value;
        
        if (!providerId || !modelName) {
            alert('Please select a provider and enter a model name before applying to all agents.');
            return;
        }

        fetch('/api/ai_agent_configs/apply_to_all', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                provider_id: providerId,
                model_name: modelName
            }),
        })
        .then(response => response.json())
        .then(result => {
            alert(result.message);
            loadAgentConfigs();
        })
        .catch(error => {
            console.error('Error updating configurations:', error);
            alert('An error occurred while updating configurations. Please try again.');
        });
    });

    document.getElementById('ai-agent-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            agent_type: document.getElementById('agent-type').value,
            provider_id: document.getElementById('provider-select').value,
            model_name: document.getElementById('model-name').value,
            system_prompt: document.getElementById('system-prompt').value
        };
        
        fetch('/api/ai_agent_configs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(() => {
            loadAgentConfigs();
            document.getElementById('ai-agent-form').reset();
            document.getElementById('config-id').value = '';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to save agent configuration. Please try again.');
        });
    });

    function editAgentConfig(configId) {
        fetch(`/api/ai_agent_configs/${configId}`)
            .then(response => response.json())
            .then(config => {
                document.getElementById('config-id').value = config.id;
                document.getElementById('agent-type').value = config.agent_type;
                document.getElementById('provider-select').value = config.provider_id;
                document.getElementById('model-name').value = config.model_name;
                document.getElementById('system-prompt').value = config.system_prompt;
            });
    }

    // Call loadAgentTypes and loadAgentConfigs when the page loads
    loadAgentTypes();
    loadAgentConfigs();

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
                
                // Add event listener to load predefined system prompt
                agentTypeSelect.addEventListener('change', loadPredefinedSystemPrompt);
            });
    }

    function loadPredefinedSystemPrompt() {
        const agentType = document.getElementById('agent-type').value;
        fetch(`/api/agent_types/${agentType}/system_prompt`)
            .then(response => response.json())
            .then(data => {
                document.getElementById('system-prompt').value = data.system_prompt;
            });
    }

    // Call loadAgentTypes when the page loads
    loadAgentTypes();

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


});
