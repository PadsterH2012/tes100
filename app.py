from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from config import Config
from models import db, Project, ProjectDocument, Conversation, AIProvider, AIAgentConfig
import os
import requests

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

AGENT_TYPES = ['Project Software Architect', 'Project UX SME', 'Project DB SME', 'Project Dev SME', 'Project Tester SME', 'Project Web Researcher', 'Project Assistant', 'Project Writer']

PREDEFINED_SYSTEM_PROMPTS = {
    'Project Software Architect': "You are a Project Software Architect AI. Your role is to design and plan software systems, considering scalability, maintainability, and performance. Provide guidance on architectural decisions and best practices.",
    'Project UX SME': "You are a Project UX SME (Subject Matter Expert) AI. Your role is to provide expertise on user experience design, usability, and interface design. Offer insights to improve the overall user experience of the project.",
    'Project DB SME': "You are a Project DB SME (Subject Matter Expert) AI. Your role is to provide expertise on database design, optimization, and management. Offer guidance on data modeling, query optimization, and database best practices.",
    'Project Dev SME': "You are a Project Dev SME (Subject Matter Expert) AI. Your role is to provide expertise on software development practices, coding standards, and technical implementation. Offer guidance on development-related issues and best practices.",
    'Project Tester SME': "You are a Project Tester SME (Subject Matter Expert) AI. Your role is to provide expertise on software testing methodologies, test planning, and quality assurance. Offer guidance on improving test coverage and overall software quality.",
    'Project Web Researcher': "You are a Project Web Researcher. Your role is to assist in gathering and analyzing information from the web. Provide summaries, insights, and relevant data to support project research needs.",
    'Project Assistant': "You are a Project Assistant AI. Your role is to help manage project tasks, timelines, and resources. Provide guidance on project management best practices and help keep the project on track.",
    'Project Writer': "You are a Project Writer AI. Your role is to assist in creating project documentation, reports, and other written materials. Help improve clarity, consistency, and quality of project-related writing."
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
        new_project = Project(name=data['name'])
        db.session.add(new_project)
        db.session.commit()
        return jsonify({"id": new_project.id, "name": new_project.name}), 201
    else:
        projects = Project.query.all()
        return jsonify([{"id": p.id, "name": p.name} for p in projects])

@app.route('/api/projects/<int:project_id>', methods=['GET', 'PUT', 'DELETE'])
def project(project_id):
    project = Project.query.get_or_404(project_id)
    if request.method == 'GET':
        return jsonify({"id": project.id, "name": project.name})
    elif request.method == 'PUT':
        data = request.json
        project.name = data['name']
        db.session.commit()
        return jsonify({"id": project.id, "name": project.name})
    elif request.method == 'DELETE':
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
        return jsonify({"id": provider.id, "name": provider.name, "api_url": provider.api_url}), 200
    else:
        providers = AIProvider.query.all()
        return jsonify([{"id": p.id, "name": p.name, "api_url": p.api_url} for p in providers])

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
            db.session.commit()
            config = existing_config
        else:
            new_config = AIAgentConfig(
                agent_type=data['agent_type'],
                provider_id=data['provider_id'],
                model_name=data['model_name'],
                system_prompt=data.get('system_prompt') or PREDEFINED_SYSTEM_PROMPTS.get(data['agent_type'], "")
            )
            db.session.add(new_config)
            db.session.commit()
            config = new_config

        return jsonify({
            "id": config.id,
            "agent_type": config.agent_type,
            "provider_id": config.provider_id,
            "model_name": config.model_name,
            "system_prompt": config.system_prompt
        }), 200
    else:
        configs = AIAgentConfig.query.all()
        return jsonify([{
            "id": c.id,
            "agent_type": c.agent_type,
            "provider_id": c.provider_id,
            "model_name": c.model_name,
            "system_prompt": c.system_prompt
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
            "system_prompt": config.system_prompt
        })
    elif request.method == 'PUT':
        data = request.json
        if 'agent_type' in data and data['agent_type'] not in AGENT_TYPES:
            return jsonify({"error": "Invalid agent type"}), 400
        config.agent_type = data.get('agent_type', config.agent_type)
        config.provider_id = data.get('provider_id', config.provider_id)
        config.model_name = data.get('model_name', config.model_name)
        config.system_prompt = data.get('system_prompt', config.system_prompt)
        db.session.commit()
        return jsonify({
            "id": config.id,
            "agent_type": config.agent_type,
            "provider_id": config.provider_id,
            "model_name": config.model_name,
            "system_prompt": config.system_prompt
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

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        project_id = data.get('project_id')
        message = data.get('message')
        agent_type = 'Project Assistant'  # Hardcoded for now

        # Get the AI agent configuration
        agent_config = AIAgentConfig.query.filter_by(agent_type=agent_type).first()
        if not agent_config:
            return jsonify({"error": "Agent configuration not found"}), 404

        # Get the AI provider
        provider = db.session.get(AIProvider, agent_config.provider_id)
        if not provider:
            return jsonify({"error": "AI provider not found"}), 404

        # Get the API key from the database
        api_key = provider.api_key
        if not api_key:
            app.logger.error(f"API key for {provider.name} not found in the database")
            return jsonify({"error": f"API key for {provider.name} not configured"}), 500

        # Prepare the chat message
        chat_message = {
            "model": agent_config.model_name,
            "messages": [
                {"role": "system", "content": agent_config.system_prompt},
                {"role": "user", "content": message}
            ]
        }

        # Send request to the AI provider
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        response = requests.post(provider.api_url, json=chat_message, headers=headers, timeout=30)

        response.raise_for_status()  # Raise an exception for non-200 status codes

        ai_response = response.json()['choices'][0]['message']['content']
        
        # Save the conversation
        new_conversation = Conversation(
            project_id=project_id,
            agent_type=agent_type,
            content=f"User: {message}\nAI: {ai_response}"
        )
        db.session.add(new_conversation)
        db.session.commit()

        return jsonify({"response": ai_response})

    except requests.RequestException as e:
        app.logger.error(f"Error communicating with AI provider: {str(e)}")
        return jsonify({"error": "Failed to get response from AI provider"}), 500
    except Exception as e:
        app.logger.error(f"Unexpected error in chat function: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='127.0.0.1', port=int(os.environ.get('PORT', 8000)))
else:
    init_db()
