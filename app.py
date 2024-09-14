from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from config import Config
from models import db, Project, ProjectDocument, Conversation, AIProvider, AIAgentConfig
import os
from cryptography.fernet import Fernet

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

def init_db():
    with app.app_context():
        db.create_all()

@app.route('/')
def index():
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
        fernet = Fernet(app.config['ENCRYPTION_KEY'])
        encrypted_api_key = fernet.encrypt(data['api_key'].encode())
        new_provider = AIProvider(
            name=data['name'],
            api_url=data['api_url'],
            api_key_encrypted=encrypted_api_key
        )
        db.session.add(new_provider)
        db.session.commit()
        return jsonify({"id": new_provider.id, "name": new_provider.name, "api_url": new_provider.api_url}), 201
    else:
        providers = AIProvider.query.all()
        return jsonify([{"id": p.id, "name": p.name, "api_url": p.api_url} for p in providers])

@app.route('/api/ai_agent_configs', methods=['GET', 'POST'])
def ai_agent_configs():
    if request.method == 'POST':
        data = request.json
        new_config = AIAgentConfig(
            agent_type=data['agent_type'],
            provider_id=data['provider_id'],
            model_name=data['model_name'],
            system_prompt=data['system_prompt']
        )
        db.session.add(new_config)
        db.session.commit()
        return jsonify({
            "id": new_config.id,
            "agent_type": new_config.agent_type,
            "provider_id": new_config.provider_id,
            "model_name": new_config.model_name,
            "system_prompt": new_config.system_prompt
        }), 201
    else:
        configs = AIAgentConfig.query.all()
        return jsonify([{
            "id": c.id,
            "agent_type": c.agent_type,
            "provider_id": c.provider_id,
            "model_name": c.model_name,
            "system_prompt": c.system_prompt
        } for c in configs])

if __name__ == '__main__':
    init_db()
    app.run(debug=False, host='127.0.0.1', port=int(os.environ.get('PORT', 8000)))
else:
    init_db()
