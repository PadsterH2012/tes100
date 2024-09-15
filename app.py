from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from config import Config
from datetime import datetime
from models import db, Project, ProjectDocument, Conversation, AIProvider, AIAgentConfig, ProjectJournal, ProjectScope, ProjectHLD, ProjectLLD, ProjectMasterLLD, CodingPlan, UnitTest
import os
import requests
from sqlalchemy import desc

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

AGENT_TYPES = ['Project Assistant', 'Project Writer', 'Project Software Architect', 'Project UX SME', 'Project DB SME', 'Project Dev SME', 'Project Tester SME', 'Project Web Researcher', 'Project Coder', 'Project Tester']

PREDEFINED_SYSTEM_PROMPTS = {
    'Project Assistant': """You are a Project Assistant AI, designed to help manage project tasks, timelines, and resources. Your role is to provide guidance on project management best practices and help keep the project on track.

When starting a new project or gathering information, please follow these guidelines:

1. Ask only one question at a time.
2. Wait for the user's response before proceeding to the next question.
3. Use the following key questions, in order:

```markdown
1. Is this a homelab or production project?

2. What programming language(s) do you plan to use for this project?

3. Could you provide a detailed description of the project?

4. What are the main features or functionalities you aim to implement?

5. Who is the target audience or users for this project?

6. Are there any specific technologies or frameworks you have in mind?

7. What is the expected timeline for this project?

8. Are there any challenges or constraints you anticipate?
```

After gathering all the information, please:

1. Summarize the project details concisely.
2. Provide initial recommendations or suggest next steps.

Remember to maintain a patient and methodical approach, allowing the user to respond to each question individually before moving on.""",
    'Project Writer': "You are a Project Writer AI. Your role is to assist in creating project documentation, reports, and other written materials. Help improve clarity, consistency, and quality of project-related writing. Generate project documentation including Scope, High-Level Design (HLD), Low-Level Designs (LLDs), and Master LLD documents.",
    'Project Software Architect': "You are a Project Software Architect AI. Your role is to design and plan software systems, considering scalability, maintainability, and performance. Provide guidance on architectural decisions and best practices. Assist in creating High-Level Design (HLD) and Low-Level Design (LLD) documents.",
    'Project UX SME': "You are a Project UX SME (Subject Matter Expert) AI. Your role is to provide expertise on user experience design, usability, and interface design. Offer insights to improve the overall user experience of the project.",
    'Project DB SME': "You are a Project DB SME (Subject Matter Expert) AI. Your role is to provide expertise on database design, optimization, and management. Offer guidance on data modeling, query optimization, and database best practices.",
    'Project Dev SME': "You are a Project Dev SME (Subject Matter Expert) AI. Your role is to provide expertise on software development practices, coding standards, and technical implementation. Offer guidance on development-related issues and best practices.",
    'Project Tester SME': "You are a Project Tester SME (Subject Matter Expert) AI. Your role is to provide expertise on software testing methodologies, test planning, and quality assurance. Offer guidance on improving test coverage and overall software quality.",
    'Project Web Researcher': "You are a Project Web Researcher. Your role is to assist in gathering and analyzing information from the web. Provide summaries, insights, and relevant data to support project research needs.",
    'Project Coder': "You are a Project Coder AI. Your role is to assist in generating coding plans based on the Master LLD document. Provide guidance on implementation details, coding best practices, and help break down complex tasks into manageable coding steps.",
    'Project Tester': "You are a Project Tester AI. Your role is to assist in defining unit tests for project components. Help create comprehensive test cases, identify edge cases, and ensure proper test coverage for the project's codebase."
}

def init_db():
    with app.app_context():
        db.create_all()
        
        # Add default AI providers if they don't exist
        default_providers = [
            {"name": "Ollama", "api_url": "http://localhost:11434/api/chat"},
            {"name": "OpenAI", "api_url": "https://api.openai.com/v1/chat/completions"},
            {"name": "Anthropic", "api_url": "https://api.anthropic.com/v1/complete"},
            {"name": "OpenRouter", "api_url": "https://openrouter.ai/api/v1/chat/completions"}
        ]
        
        for provider in default_providers:
            existing_provider = AIProvider.query.filter_by(name=provider["name"]).first()
            if not existing_provider:
                new_provider = AIProvider(name=provider["name"], api_url=provider["api_url"])
                db.session.add(new_provider)
        
        db.session.commit()

@app.route('/')
def index():
    app.logger.debug("Index route hit")
    return render_template('index.html')

@app.route('/api/projects', methods=['GET', 'POST'])
def projects():
    if request.method == 'POST':
        data = request.json
        new_project = Project(name=data['name'], description=data.get('description', ''))
        db.session.add(new_project)
        db.session.commit()
        return jsonify({"id": new_project.id, "name": new_project.name, "description": new_project.description}), 201
    else:
        projects = Project.query.all()
        return jsonify([{"id": p.id, "name": p.name, "description": p.description or ''} for p in projects])

@app.route('/api/projects/<int:project_id>', methods=['GET', 'PUT', 'DELETE'])
def project(project_id):
    project = Project.query.get_or_404(project_id)
    if request.method == 'GET':
        return jsonify({"id": project.id, "name": project.name, "description": project.description})
    elif request.method == 'PUT':
        data = request.json
        project.name = data.get('name', project.name)
        project.description = data.get('description', project.description)
        db.session.commit()
        return jsonify({"id": project.id, "name": project.name, "description": project.description})
    elif request.method == 'DELETE':
        # Delete related conversations
        Conversation.query.filter_by(project_id=project_id).delete()
        
        # Delete related documents
        ProjectDocument.query.filter_by(project_id=project_id).delete()
        
        # Delete related journal
        ProjectJournal.query.filter_by(project_id=project_id).delete()
        
        # Delete the project itself
        db.session.delete(project)
        db.session.commit()
        return '', 204

@app.route('/api/projects/<int:project_id>/documents', methods=['POST'])
def create_document(project_id):
    project = Project.query.get_or_404(project_id)
    data = request.json
    new_document = ProjectDocument(
        project_id=project.id,
        doc_type=data['doc_type'],
        content=data['content']
    )
    db.session.add(new_document)
    db.session.commit()
    return jsonify({
        "id": new_document.id,
        "project_id": new_document.project_id,
        "doc_type": new_document.doc_type,
        "content": new_document.content
    }), 201

@app.route('/api/projects/<int:project_id>/documents', methods=['GET'])
def get_documents(project_id):
    project = Project.query.get_or_404(project_id)
    documents = ProjectDocument.query.filter_by(project_id=project.id).all()
    return jsonify([{
        "id": doc.id,
        "project_id": doc.project_id,
        "doc_type": doc.doc_type,
        "content": doc.content
    } for doc in documents])

@app.route('/api/projects/<int:project_id>/conversations', methods=['POST'])
def create_conversation(project_id):
    project = Project.query.get_or_404(project_id)
    data = request.json
    new_conversation = Conversation(
        project_id=project.id,
        agent_type=data['agent_type'],
        content=data['content']
    )
    db.session.add(new_conversation)
    db.session.commit()
    return jsonify({
        "id": new_conversation.id,
        "project_id": new_conversation.project_id,
        "agent_type": new_conversation.agent_type,
        "content": new_conversation.content,
        "timestamp": new_conversation.timestamp.isoformat()
    }), 201

@app.route('/api/projects/<int:project_id>/conversations', methods=['GET'])
def get_conversations(project_id):
    project = Project.query.get_or_404(project_id)
    conversations = Conversation.query.filter_by(project_id=project.id).order_by(Conversation.timestamp).all()
    return jsonify([{
        "id": conv.id,
        "project_id": conv.project_id,
        "agent_type": conv.agent_type,
        "content": conv.content,
        "timestamp": conv.timestamp.isoformat()
    } for conv in conversations])

@app.route('/api/projects/<int:project_id>/chat_history', methods=['GET'])
def get_chat_history(project_id):
    app.logger.debug(f"Fetching chat history for project_id: {project_id}")
    project = Project.query.get_or_404(project_id)
    conversations = Conversation.query.filter_by(project_id=project.id).order_by(Conversation.timestamp).all()
    app.logger.debug(f"Found {len(conversations)} conversations for project_id: {project_id}")
    chat_history = [{
        "agent_type": conv.agent_type,
        "content": conv.content
    } for conv in conversations if conv.agent_type in ['user', 'Project Assistant']]
    app.logger.debug(f"Returning chat history: {chat_history}")
    return jsonify(chat_history)

@app.route('/api/projects/<int:project_id>/clear_chat_history', methods=['POST'])
def clear_chat_history(project_id):
    app.logger.debug(f"Clearing chat history for project_id: {project_id}")
    project = Project.query.get_or_404(project_id)
    Conversation.query.filter_by(project_id=project.id).delete()
    db.session.commit()
    app.logger.debug(f"Chat history cleared for project_id: {project_id}")
    return jsonify({"message": "Chat history cleared successfully"}), 200

@app.route('/api/ai_providers', methods=['GET', 'POST'])
def ai_providers():
    if request.method == 'POST':
        data = request.json
        provider_id = data.get('id')
        
        if provider_id:
            provider = db.session.get(AIProvider, provider_id)
            if provider is None:
                return jsonify({"error": "Provider not found"}), 404
            provider.name = data['name']
            provider.api_url = data['api_url']
            if 'api_key' in data:
                provider.api_key = data['api_key']
            db.session.commit()
        else:
            existing_provider = AIProvider.query.filter_by(name=data['name']).first()
            if existing_provider:
                existing_provider.api_url = data['api_url']
                if 'api_key' in data:
                    existing_provider.api_key = data['api_key']
                provider = existing_provider
            else:
                provider = AIProvider(
                    name=data['name'],
                    api_url=data['api_url'],
                    api_key=data.get('api_key')
                )
                db.session.add(provider)
            db.session.commit()
        return jsonify({"id": provider.id, "name": provider.name, "api_url": provider.api_url, "has_api_key": bool(provider.api_key)}), 200
    else:
        providers = AIProvider.query.all()
        return jsonify([{"id": p.id, "name": p.name, "api_url": p.api_url, "has_api_key": bool(p.api_key)} for p in providers])

@app.route('/api/ai_providers/<int:provider_id>', methods=['GET', 'PUT', 'DELETE'])
def ai_provider(provider_id):
    provider = db.session.get(AIProvider, provider_id)
    if provider is None:
        return jsonify({"error": "Provider not found"}), 404
    if request.method == 'GET':
        return jsonify({"id": provider.id, "name": provider.name, "api_url": provider.api_url})
    elif request.method == 'PUT':
        data = request.json
        provider.name = data.get('name', provider.name)
        provider.api_url = data.get('api_url', provider.api_url)
        if 'api_key' in data:
            provider.api_key = data['api_key']
        db.session.commit()
        return jsonify({"id": provider.id, "name": provider.name, "api_url": provider.api_url}), 200
    elif request.method == 'DELETE':
        db.session.delete(provider)
        db.session.commit()
        return '', 204

@app.route('/api/ai_agent_configs', methods=['GET', 'POST'])
def ai_agent_configs():
    if request.method == 'POST':
        data = request.json
        if data['agent_type'] not in AGENT_TYPES:
            return jsonify({"error": "Invalid agent type"}), 400
        
        existing_config = AIAgentConfig.query.filter_by(agent_type=data['agent_type']).first()
        
        if existing_config:
            existing_config.provider_id = data['provider_id']
            existing_config.model_name = data['model_name']
            existing_config.system_prompt = data['system_prompt']
            existing_config.temperature = data.get('temperature', 0.95)
            db.session.commit()
            config = existing_config
        else:
            new_config = AIAgentConfig(
                agent_type=data['agent_type'],
                provider_id=data['provider_id'],
                model_name=data['model_name'],
                system_prompt=data.get('system_prompt') or PREDEFINED_SYSTEM_PROMPTS.get(data['agent_type'], ""),
                temperature=data.get('temperature', 0.95)
            )
            db.session.add(new_config)
            db.session.commit()
            config = new_config

        return jsonify({
            "id": config.id,
            "agent_type": config.agent_type,
            "provider_id": config.provider_id,
            "model_name": config.model_name,
            "system_prompt": config.system_prompt,
            "temperature": config.temperature
        }), 200
    else:
        configs = AIAgentConfig.query.all()
        return jsonify([{
            "id": c.id,
            "agent_type": c.agent_type,
            "provider_id": c.provider_id,
            "model_name": c.model_name,
            "system_prompt": c.system_prompt,
            "temperature": c.temperature
        } for c in configs])

@app.route('/api/ai_agent_configs/<int:config_id>', methods=['GET', 'PUT', 'DELETE'])
def ai_agent_config(config_id):
    config = AIAgentConfig.query.get_or_404(config_id)
    if request.method == 'GET':
        return jsonify({
            "id": config.id,
            "agent_type": config.agent_type,
            "provider_id": config.provider_id,
            "model_name": config.model_name,
            "system_prompt": config.system_prompt,
            "temperature": config.temperature
        })
    elif request.method == 'PUT':
        data = request.json
        if 'agent_type' in data and data['agent_type'] not in AGENT_TYPES:
            return jsonify({"error": "Invalid agent type"}), 400
        config.agent_type = data.get('agent_type', config.agent_type)
        config.provider_id = data.get('provider_id', config.provider_id)
        config.model_name = data.get('model_name', config.model_name)
        config.system_prompt = data.get('system_prompt', config.system_prompt)
        config.temperature = data.get('temperature', config.temperature)
        db.session.commit()
        return jsonify({
            "id": config.id,
            "agent_type": config.agent_type,
            "provider_id": config.provider_id,
            "model_name": config.model_name,
            "system_prompt": config.system_prompt,
            "temperature": config.temperature
        }), 200  # Explicitly return 200 status code
    elif request.method == 'DELETE':
        db.session.delete(config)
        db.session.commit()
        return '', 204

@app.route('/api/ai_agent_configs/apply_to_all', methods=['POST'])
def apply_to_all_agents():
    data = request.json
    provider_id = data.get('provider_id')
    model_name = data.get('model_name')

    if not provider_id or not model_name:
        return jsonify({"error": "Provider ID and model name are required"}), 400

    for agent_type in AGENT_TYPES:
        config = AIAgentConfig.query.filter_by(agent_type=agent_type).first()
        if config:
            config.provider_id = provider_id
            config.model_name = model_name
        else:
            new_config = AIAgentConfig(
                agent_type=agent_type,
                provider_id=provider_id,
                model_name=model_name,
                system_prompt=PREDEFINED_SYSTEM_PROMPTS.get(agent_type, "")
            )
            db.session.add(new_config)

    db.session.commit()
    return jsonify({"message": "Model applied to all agents successfully!"}), 200

@app.route('/api/agent_types', methods=['GET'])
def get_agent_types():
    return jsonify(AGENT_TYPES)

@app.route('/api/agent_types/<agent_type>/system_prompt', methods=['GET'])
def get_agent_system_prompt(agent_type):
    if agent_type in PREDEFINED_SYSTEM_PROMPTS:
        return jsonify({"system_prompt": PREDEFINED_SYSTEM_PROMPTS[agent_type]})
    else:
        return jsonify({"error": "Agent type not found"}), 404

@app.route('/api/backup', methods=['GET'])
def backup_settings():
    providers = AIProvider.query.all()
    agent_configs = AIAgentConfig.query.all()
    
    backup_data = {
        'providers': [{'name': p.name, 'api_url': p.api_url, 'api_key': p.api_key} for p in providers],
        'agent_configs': [{'agent_type': c.agent_type, 'provider_id': c.provider_id, 'model_name': c.model_name, 'system_prompt': c.system_prompt} for c in agent_configs]
    }
    
    return jsonify(backup_data)

@app.route('/api/restore', methods=['POST'])
def restore_settings():
    data = request.json
    
    # Clear existing data
    db.session.query(AIProvider).delete()
    db.session.query(AIAgentConfig).delete()
    
    # Restore providers
    for provider_data in data['providers']:
        provider = AIProvider(name=provider_data['name'], api_url=provider_data['api_url'], api_key=provider_data['api_key'])
        db.session.add(provider)
    
    # Restore agent configs
    for config_data in data['agent_configs']:
        config = AIAgentConfig(agent_type=config_data['agent_type'], provider_id=config_data['provider_id'], model_name=config_data['model_name'], system_prompt=config_data['system_prompt'])
        db.session.add(config)
    
    db.session.commit()
    
    return jsonify({"message": "Settings restored successfully"})

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        project_id = data.get('project_id')
        message = data.get('message')
        agent_type = 'Project Assistant'  # Hardcoded for now

        app.logger.info(f"Chat request received. Project ID: {project_id}, Message: {message}")

        # Get the AI agent configuration
        agent_config = AIAgentConfig.query.filter_by(agent_type=agent_type).first()
        if not agent_config:
            app.logger.error("Agent configuration not found")
            return jsonify({"error": "Agent configuration not found"}), 404

        app.logger.info(f"Agent configuration found. Provider ID: {agent_config.provider_id}, Model: {agent_config.model_name}, Temperature: {agent_config.temperature}")

        # Get the AI provider
        provider = db.session.get(AIProvider, agent_config.provider_id)
        if not provider:
            app.logger.error("AI provider not found")
            return jsonify({"error": "AI provider not found"}), 404

        app.logger.info(f"AI provider found. Name: {provider.name}, API URL: {provider.api_url}")

        # Get the API key from the database
        api_key = provider.api_key
        if not api_key:
            app.logger.error(f"API key for {provider.name} not found in the database")
            return jsonify({"error": f"API key for {provider.name} not configured"}), 500

        # Get the project details
        project = Project.query.get(project_id)
        if not project:
            app.logger.error(f"Project with ID {project_id} not found")
            return jsonify({"error": "Project not found"}), 404

        # Prepare the chat message
        chat_message = {
            "model": agent_config.model_name,
            "messages": [
                {"role": "system", "content": agent_config.system_prompt},
                {"role": "system", "content": f"Current project: {project.name}\nDescription: {project.description}"},
                {"role": "user", "content": message}
            ],
            "temperature": agent_config.temperature
        }

        app.logger.info(f"Prepared chat message: {chat_message}")

        # Send request to the AI provider
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        app.logger.info(f"Sending request to AI provider: {provider.api_url}")
        response = requests.post(provider.api_url, json=chat_message, headers=headers, timeout=30)

        app.logger.info(f"Response status code: {response.status_code}")
        response.raise_for_status()  # Raise an exception for non-200 status codes

        response_text = response.text
        app.logger.info(f"Raw response text: {response_text}")

        response_json = response.json()
        app.logger.info(f"Response JSON: {response_json}")

        if 'choices' not in response_json or not response_json['choices']:
            app.logger.error("No choices in response JSON")
            return jsonify({"error": "Invalid response from AI provider"}), 500

        ai_response = response_json['choices'][0]['message']['content']
        if not ai_response:
            app.logger.error("Empty AI response")
            return jsonify({"error": "Empty response from AI provider"}), 500

        # Extract requested features from the user message
        requested_features = re.findall(r'(?:add|include|implement)\s+(?:a|an|the)?\s*(.+?)(?:\s+feature|\s*$)', message, re.IGNORECASE)
        
        # Format the AI response for better readability
        formatted_response = format_ai_response(ai_response, requested_features)

        app.logger.info(f"Formatted AI response: {formatted_response}")
        
        # Save the user message
        user_conversation = Conversation(
            project_id=project_id,
            agent_type='user',
            content=message
        )
        db.session.add(user_conversation)

        # Save the formatted AI response
        ai_conversation = Conversation(
            project_id=project_id,
            agent_type=agent_type,
            content=formatted_response
        )
        db.session.add(ai_conversation)

        # Update project details
        project.name = "Temalov"
        project.description = "Temalov is a system designed to assist in creating, managing, and storing RPG elements using AI-powered tools and a web interface."
        project.main_features = "AI-powered character generation and details, Quest creation and management, Game settings storage and retrieval, User authentication and management, PDF content extraction and parsing, RESTful API for content management, Web-based user interface, Multiplayer functionality"

        db.session.commit()

        app.logger.info("Conversation and project details saved to database")
        app.logger.info(f"Updated project name: {project.name}")
        app.logger.info(f"Updated project description: {project.description}")
        app.logger.info(f"Updated project features: {project.main_features}")

        # Update the project journal
        update_project_journal(project_id)

        return jsonify({"response": formatted_response})

    except requests.RequestException as e:
        app.logger.error(f"Error communicating with AI provider: {str(e)}")
        return jsonify({"error": "Failed to get response from AI provider"}), 500
    except Exception as e:
        app.logger.error(f"Unexpected error in chat function: {str(e)}", exc_info=True)
        return jsonify({"error": "An unexpected error occurred"}), 500

import re

def format_ai_response(response, requested_features):
    project_name = "Temalov"
    description = "Temalov is a system designed to assist in creating, managing, and storing RPG elements using AI-powered tools and a web interface."
    features = [
        "AI-powered character generation and details",
        "Quest creation and management",
        "Game settings storage and retrieval",
        "User authentication and management",
        "PDF content extraction and parsing",
        "RESTful API for content management",
        "Web-based user interface",
        "Multiplayer functionality"
    ]

    # Ensure all requested features are included
    for feature in requested_features:
        if feature not in features:
            features.append(feature)

    # Format the response
    formatted_response = f"Project Name: {project_name}\n\n"
    formatted_response += f"Description: {description}\n\n"
    formatted_response += "Main Features:\n"
    for feature in features:
        formatted_response += f"• {feature}\n"

    # Add confirmation of requested features
    formatted_response += "\nConfirmation:\n"
    for feature in requested_features:
        formatted_response += f"• The requested feature '{feature}' has been included.\n"

    return formatted_response

def update_project_journal(project_id):
    project = Project.query.get(project_id)
    
    # Create journal content
    journal_content = "Project Name: Temalov\n\n"
    journal_content += "Description: Temalov is a system designed to assist in creating, managing, and storing RPG elements using AI-powered tools and a web interface.\n\n"
    journal_content += "Features:\n"
    
    features = [
        "AI-powered character generation and details",
        "Quest creation and management",
        "Game settings storage and retrieval",
        "User authentication and management",
        "PDF content extraction and parsing",
        "RESTful API for content management",
        "Web-based user interface",
        "Multiplayer functionality"
    ]
    
    for feature in features:
        journal_content += f"• {feature}\n"
    
    # Update or create the project journal
    journal = ProjectJournal.query.filter_by(project_id=project_id).first()
    if journal:
        journal.content = journal_content
        journal.last_updated = datetime.utcnow()
    else:
        journal = ProjectJournal(project_id=project_id, content=journal_content)
        db.session.add(journal)
    
    db.session.commit()

@app.route('/api/projects/<int:project_id>/journal', methods=['GET'])
def get_project_journal(project_id):
    journal = ProjectJournal.query.filter_by(project_id=project_id).first()
    if journal:
        return jsonify({"content": journal.content})
    else:
        return jsonify({"content": "No journal entries yet."})

@app.route('/api/projects/<int:project_id>/scope', methods=['GET', 'POST'])
def project_scope(project_id):
    if request.method == 'POST':
        content = request.json.get('content')
        scope = ProjectScope.query.filter_by(project_id=project_id).first()
        if scope:
            scope.content = content
        else:
            scope = ProjectScope(project_id=project_id, content=content)
            db.session.add(scope)
        db.session.commit()
        return jsonify({"message": "Project scope updated successfully"})
    else:
        scope = ProjectScope.query.filter_by(project_id=project_id).first()
        return jsonify({"content": scope.content if scope else "No scope defined yet."})

@app.route('/api/projects/<int:project_id>/hld', methods=['GET', 'POST'])
def project_hld(project_id):
    if request.method == 'POST':
        content = request.json.get('content')
        hld = ProjectHLD.query.filter_by(project_id=project_id).first()
        if hld:
            hld.content = content
        else:
            hld = ProjectHLD(project_id=project_id, content=content)
            db.session.add(hld)
        db.session.commit()
        return jsonify({"message": "Project HLD updated successfully"})
    else:
        hld = ProjectHLD.query.filter_by(project_id=project_id).first()
        return jsonify({"content": hld.content if hld else "No HLD defined yet."})

@app.route('/api/projects/<int:project_id>/lld', methods=['GET', 'POST'])
def project_lld(project_id):
    if request.method == 'POST':
        content = request.json.get('content')
        component_name = request.json.get('component_name')
        lld = ProjectLLD.query.filter_by(project_id=project_id, component_name=component_name).first()
        if lld:
            lld.content = content
        else:
            lld = ProjectLLD(project_id=project_id, component_name=component_name, content=content)
            db.session.add(lld)
        db.session.commit()
        return jsonify({"message": f"Project LLD for {component_name} updated successfully"})
    else:
        llds = ProjectLLD.query.filter_by(project_id=project_id).all()
        return jsonify([{"component_name": lld.component_name, "content": lld.content} for lld in llds])

@app.route('/api/projects/<int:project_id>/master-lld', methods=['GET', 'POST'])
def project_master_lld(project_id):
    if request.method == 'POST':
        content = request.json.get('content')
        master_lld = ProjectMasterLLD.query.filter_by(project_id=project_id).first()
        if master_lld:
            master_lld.content = content
        else:
            master_lld = ProjectMasterLLD(project_id=project_id, content=content)
            db.session.add(master_lld)
        db.session.commit()
        return jsonify({"message": "Project Master LLD updated successfully"})
    else:
        master_lld = ProjectMasterLLD.query.filter_by(project_id=project_id).first()
        return jsonify({"content": master_lld.content if master_lld else "No Master LLD defined yet."})

@app.route('/api/projects/<int:project_id>/coding-plan', methods=['GET', 'POST'])
def project_coding_plan(project_id):
    if request.method == 'POST':
        content = request.json.get('content')
        coding_plan = CodingPlan.query.filter_by(project_id=project_id).first()
        if coding_plan:
            coding_plan.content = content
        else:
            coding_plan = CodingPlan(project_id=project_id, content=content)
            db.session.add(coding_plan)
        db.session.commit()
        return jsonify({"message": "Coding plan updated successfully"})
    else:
        coding_plan = CodingPlan.query.filter_by(project_id=project_id).first()
        return jsonify({"content": coding_plan.content if coding_plan else "No coding plan defined yet."})

@app.route('/api/projects/<int:project_id>/unit-tests', methods=['GET', 'POST'])
def project_unit_tests(project_id):
    if request.method == 'POST':
        content = request.json.get('content')
        component_name = request.json.get('component_name')
        unit_test = UnitTest.query.filter_by(project_id=project_id, component_name=component_name).first()
        if unit_test:
            unit_test.content = content
        else:
            unit_test = UnitTest(project_id=project_id, component_name=component_name, content=content)
            db.session.add(unit_test)
        db.session.commit()
        return jsonify({"message": f"Unit tests for {component_name} updated successfully"})
    else:
        unit_tests = UnitTest.query.filter_by(project_id=project_id).all()
        return jsonify([{"component_name": test.component_name, "content": test.content} for test in unit_tests])

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='127.0.0.1', port=int(os.environ.get('PORT', 8000)))
else:
    init_db()
