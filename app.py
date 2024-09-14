from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from config import Config
from models import db, Project, ProjectDocument, Conversation, AIProvider, AIAgentConfig

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

if __name__ == '__main__':
    init_db()
    app.run(debug=True)
