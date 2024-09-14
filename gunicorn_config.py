# Gunicorn configuration file
import multiprocessing
import os

# Server socket
bind = "127.0.0.1:8000"  # Changed to localhost for security
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = 'sync'
worker_connections = 1000
timeout = 30
keepalive = 2

# Security
user = os.environ.get("GUNICORN_USER", None)
group = os.environ.get("GUNICORN_GROUP", None)
umask = 0o007
limit_request_fields = 32768
limit_request_field_size = 0
limit_request_line = 8190

# Server mechanics
daemon = False
pidfile = "gunicorn.pid"
worker_tmp_dir = "/dev/shm"
tmp_upload_dir = None

# Logging
errorlog = "error.log"
loglevel = 'info'
accesslog = "access.log"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Process naming
proc_name = "ai_project_manager"

# Server hooks
def on_starting(server):
    pass

def on_reload(server):
    pass

def on_exit(server):
    pass
