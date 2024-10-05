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
                    const projectBox = createProjectBox(project);
                    projectList.appendChild(projectBox);
                });
            });
    }

    function createProjectBox(project) {
        const box = document.createElement('div');
        box.className = 'project-box';
        box.style.width = '175%'; // Increase width by 75%

        // Fetch project journal to get the current name and description
        fetch(`/api/projects/${project.id}/journal`)
            .then(response => response.json())
            .then(data => {
                const journalContent = data.content;
                const nameMatch = journalContent.match(/Project Name:\s*(.+)/);
                const descriptionMatch = journalContent.match(/Description:\s*([\s\S]+?)(?=\n\n|\n*$)/);

                const currentName = nameMatch ? nameMatch[1] : project.name;
                const currentDescription = descriptionMatch ? descriptionMatch[1].trim() : (project.description || 'No description available.');

                box.innerHTML = `
                    <h3>${currentName}</h3>
                    <p style="font-size: 0.9em;">${currentDescription}</p>
                    <div class="button-group">
                        <button class="edit-project">Edit</button>
                        <button class="delete-project">Delete</button>
                        <button class="continue-project">Continue</button>
                    </div>
                `;

                box.querySelector('.edit-project').addEventListener('click', () => editProject(project.id));
                box.querySelector('.delete-project').addEventListener('click', () => deleteProject(project.id));
                box.querySelector('.continue-project').addEventListener('click', () => continueProject(project.id));
            })
            .catch(error => {
                console.error('Error fetching project journal:', error);
                // Fallback to original project data if journal fetch fails
                box.innerHTML = `
                    <h3>${project.name}</h3>
                    <p style="font-size: 0.9em;">${project.description || 'No description available.'}</p>
                    <div class="button-group">
                        <button class="edit-project">Edit</button>
                        <button class="delete-project">Delete</button>
                        <button class="continue-project">Continue</button>
                    </div>
                `;

                box.querySelector('.edit-project').addEventListener('click', () => editProject(project.id));
                box.querySelector('.delete-project').addEventListener('click', () => deleteProject(project.id));
                box.querySelector('.continue-project').addEventListener('click', () => continueProject(project.id));
            });

        return box;
    }

    function editProject(projectId) {
        fetch(`/api/projects/${projectId}`)
            .then(response => response.json())
            .then(project => {
                const newName = prompt('Enter new project name:', project.name);
                const newDescription = prompt('Enter new project description:', project.description);
                
                if (newName !== null && newDescription !== null) {
                    fetch(`/api/projects/${projectId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ name: newName, description: newDescription }),
                    })
                    .then(response => response.json())
                    .then(() => loadProjects())
                    .catch(error => console.error('Error updating project:', error));
                }
            })
            .catch(error => console.error('Error fetching project details:', error));
    }

    function deleteProject(projectId) {
        if (confirm('Are you sure you want to delete this project?')) {
            fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
                .then(() => loadProjects());
        }
    }

    function continueProject(projectId) {
        currentProjectId = projectId;
        document.getElementById('project-list').style.display = 'none';
        chatInterface.style.display = 'block';
        documentDisplay.style.display = 'block';
        clearChatMessages();
        loadProjectDocuments(projectId);
        loadChatHistory(projectId);

        // Fetch and set the project name
        fetch(`/api/projects/${projectId}`)
            .then(response => response.json())
            .then(project => {
                document.getElementById('project-name').textContent = `Chat with AI - ${project.name}`;
                document.getElementById('project-documents-title').textContent = `Project - ${project.name}`;
            });
    }

    function clearProjectChatHistory(projectId) {
        fetch(`/api/projects/${projectId}/clear_chat_history`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            console.log(data.message);
            clearChatMessages();
        })
        .catch(error => console.error('Error clearing chat history:', error));
    }

    function loadProjectDocuments(projectId) {
        // Load and display the project journal
        fetch(`/api/projects/${projectId}/journal`)
            .then(response => response.json())
            .then(data => {
                const journalTab = document.getElementById('tab1');
                journalTab.innerHTML = `<h3>Project Journal</h3><pre>${data.content}</pre>`;
            });

        // Load and display the project scope
        fetch(`/api/projects/${projectId}/scope`)
            .then(response => response.json())
            .then(data => {
                const scopeTab = document.getElementById('tab2');
                scopeTab.innerHTML = `<h3>Project Scope</h3><pre>${data.content}</pre>`;
            });

        // Load and display the project HLD
        fetch(`/api/projects/${projectId}/hld`)
            .then(response => response.json())
            .then(data => {
                const hldTab = document.getElementById('tab3');
                hldTab.innerHTML = `<h3>High-Level Design (HLD)</h3><pre>${data.content}</pre>`;
            });

        // Load and display the project LLDs
        fetch(`/api/projects/${projectId}/lld`)
            .then(response => response.json())
            .then(data => {
                const lldTab = document.getElementById('tab4');
                lldTab.innerHTML = `<h3>Low-Level Designs (LLDs)</h3>`;
                data.forEach(lld => {
                    lldTab.innerHTML += `<h4>${lld.component_name}</h4><pre>${lld.content}</pre>`;
                });
            });

        // Load and display the project Master LLD
        fetch(`/api/projects/${projectId}/master-lld`)
            .then(response => response.json())
            .then(data => {
                const masterLldTab = document.getElementById('tab5');
                masterLldTab.innerHTML = `<h3>Master LLD</h3><pre>${data.content}</pre>`;
            });

        // Load and display the coding plan
        fetch(`/api/projects/${projectId}/coding-plan`)
            .then(response => response.json())
            .then(data => {
                const codingPlanTab = document.getElementById('tab6');
                codingPlanTab.innerHTML = `<h3>Coding Plan</h3><pre>${data.content}</pre>`;
            });

        // Load and display the unit tests
        fetch(`/api/projects/${projectId}/unit-tests`)
            .then(response => response.json())
            .then(data => {
                const unitTestsTab = document.getElementById('tab7');
                unitTestsTab.innerHTML = `<h3>Unit Tests</h3>`;
                data.forEach(test => {
                    unitTestsTab.innerHTML += `<h4>${test.component_name}</h4><pre>${test.content}</pre>`;
                });
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
            const projectDescription = prompt('Enter project description (optional):');
            fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: projectName, description: projectDescription }),
            })
            .then(response => response.json())
            .then(project => {
                loadProjects();
                clearProjectChatHistory(project.id);
            });
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
                    // Update the journal content
                    updateJournalContent(data.journal_content);
                }
                // Scroll to bottom after displaying the message
                scrollChatToBottom();
            })
            .catch(error => {
                console.error('Error:', error);
                displayMessage({ agent_type: 'Project Assistant', content: `An error occurred: ${error.message}` });
                // Scroll to bottom even if there's an error
                scrollChatToBottom();
            });
        }
    }

    function updateJournalContent(content) {
        const journalTab = document.getElementById('tab1');
        journalTab.innerHTML = `<h3>Project Journal</h3><pre>${content}</pre>`;
    }

    function scrollChatToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
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
        console.log('Current chat messages:', chatMessages.innerHTML);
        console.log('Number of messages in chat window:', chatMessages.children.length);
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
        debugChatHistory(projectId); // Add this line to debug

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
                // Clear the chat messages container before adding new messages
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

    function displayMessage(message) {
        console.log('Displaying message:', message);
        const messageElement = document.createElement('div');
        const agentClass = message.agent_type.toLowerCase() === 'user' ? 'user' : 'project-assistant';
        messageElement.classList.add('message', agentClass);

        const headerElement = document.createElement('div');
        headerElement.classList.add('message-header');
        headerElement.textContent = message.agent_type;
        messageElement.appendChild(headerElement);

        const contentElement = document.createElement('div');
        contentElement.classList.add('message-content');
    
        // Format the content
        const formattedContent = formatMessageContent(message.content);
        contentElement.innerHTML = formattedContent;
    
        messageElement.appendChild(contentElement);

        const timestampElement = document.createElement('div');
        timestampElement.classList.add('message-timestamp');
        timestampElement.textContent = new Date().toLocaleTimeString();
        messageElement.appendChild(timestampElement);

        chatMessages.appendChild(messageElement);
        console.log('Message added to chat window');
        console.log('Current chat messages:', chatMessages.innerHTML);
        console.log('Number of messages in chat window:', chatMessages.children.length);
        scrollChatToBottom();
    }

    function formatMessageContent(content) {
        // Convert line breaks to <br> tags
        content = content.replace(/\n/g, '<br>');
    
        // Convert bullet points (lines starting with '-' or '*') to HTML list items
        content = content.replace(/(?:^|\n)[-*]\s*(.+)/g, (match, p1) => `<li>${p1}</li>`);
        content = content.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
        // Wrap paragraphs (separated by double line breaks) in <p> tags
        content = content.replace(/(.+?)(\n\n|$)/g, '<p>$1</p>');
    
        // Remove empty paragraphs
        content = content.replace(/<p><\/p>/g, '');
    
        return content;
    }

    // Add this function to debug the chat history
    function debugChatHistory(projectId) {
        fetch(`/api/projects/${projectId}/chat_history`)
            .then(response => response.json())
            .then(history => {
                console.log('Full chat history:', JSON.stringify(history, null, 2));
            })
            .catch(error => {
                console.error('Error fetching chat history for debugging:', error);
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
                document.getElementById('temperature').value = config.temperature;
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
        const temperature = parseFloat(document.getElementById('temperature').value);

        fetch('/api/ai_agent_configs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                agent_type: agentType,
                provider_id: providerId,
                model_name: modelName,
                system_prompt: systemPrompt,
                temperature: temperature
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

    // Backup settings
    document.getElementById('backup-settings').addEventListener('click', () => {
        fetch('/api/backup')
            .then(response => response.json())
            .then(data => {
                const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'ai_project_manager_backup.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Failed to backup settings. Please try again.');
            });
    });

    // Restore settings
    document.getElementById('restore-settings').addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.onchange = (event) => {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                const contents = e.target.result;
                fetch('/api/restore', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: contents,
                })
                .then(response => response.json())
                .then(data => {
                    alert(data.message);
                    loadProviders();
                    loadAgentConfigs();
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Failed to restore settings. Please try again.');
                });
            };
            reader.readAsText(file);
        };
        fileInput.click();
    });

    // Call loadAgentTypes when the page loads
    loadAgentTypes();

});
