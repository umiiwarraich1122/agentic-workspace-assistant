import os
import re

# 1. Delete backend/app/api/whatsapp.py
if os.path.exists("backend/app/api/whatsapp.py"):
    os.remove("backend/app/api/whatsapp.py")

# 2. Delete frontend/src/pages/WhatsAppModule.tsx
if os.path.exists("frontend/src/pages/WhatsAppModule.tsx"):
    os.remove("frontend/src/pages/WhatsAppModule.tsx")

# 3. Update backend/app/main.py
with open("backend/app/main.py", "r") as f:
    main_py = f.read()
main_py = main_py.replace(", whatsapp", "")
main_py = main_py.replace("app.include_router(whatsapp.router)\n", "")
with open("backend/app/main.py", "w") as f:
    f.write(main_py)

# 4. Update frontend/src/App.tsx
with open("frontend/src/App.tsx", "r") as f:
    app_tsx = f.read()
app_tsx = re.sub(r"import\s*\{\s*WhatsAppModule\s*\}\s*from\s*'./pages/WhatsAppModule';\n", "", app_tsx)
app_tsx = re.sub(r"\s*<Route path=\"whatsapp\" element=\{<WhatsAppModule />\} />\n", "\n", app_tsx)
with open("frontend/src/App.tsx", "w") as f:
    f.write(app_tsx)

# 5. Update frontend/src/layouts/OSLayout.tsx
with open("frontend/src/layouts/OSLayout.tsx", "r") as f:
    os_layout = f.read()
os_layout = re.sub(r"\s*try\s*\{\s*await\s*fetch\(`\$\{BACKEND_URL\}/api/whatsapp/logout`,\s*\{\s*method:\s*'DELETE'\s*\}\);\s*\}\s*catch\s*\(e\)\s*\{\s*console\.error\('Error logging out of WhatsApp',\s*e\);\s*\}\n", "\n", os_layout)
with open("frontend/src/layouts/OSLayout.tsx", "w") as f:
    f.write(os_layout)

# 6. Update frontend/src/pages/CommandCenter.tsx
with open("frontend/src/pages/CommandCenter.tsx", "r") as f:
    cc = f.read()

cc = re.sub(r"\s*<button\s*onClick=\{\(\) => navigate\('/chat/whatsapp'\)\}.*?WhatsApp\s*</button>", "", cc, flags=re.DOTALL)
with open("frontend/src/pages/CommandCenter.tsx", "w") as f:
    f.write(cc)

# 7. Update docker-compose files (remove evolution services and volumes)
def update_docker_compose(filename):
    if not os.path.exists(filename):
        return
    with open(filename, "r") as f:
        dc = f.read()
    
    # Remove evolution-postgres block
    dc = re.sub(r"\s*# -- Database for Evolution API -------------------------.*?restart: always\n", "\n", dc, flags=re.DOTALL)
    # Remove evolution-api block
    dc = re.sub(r"\s*# -- WhatsApp Gateway \(Evolution API\) -------------------------.*?restart: always\n", "\n", dc, flags=re.DOTALL)
    
    # Remove volumes
    dc = re.sub(r"\s*evolution_instances:\n", "\n", dc)
    dc = re.sub(r"\s*evolution_db_data:\n", "\n", dc)
    
    with open(filename, "w") as f:
        f.write(dc)

update_docker_compose("docker-compose.prod.yml")
update_docker_compose("docker-compose.yml")
