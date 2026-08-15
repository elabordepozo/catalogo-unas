import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import subprocess, threading, os, shutil, json, urllib.request, urllib.error
from pathlib import Path

# ──────────────────────────────────────────────────────────────
#  CONFIGURACIÓN POR DEFECTO
# ──────────────────────────────────────────────────────────────
DEFAULT_PROJECT  = r"C:\Users\Eduardo Laborde\Desktop\CATALOGO UÑAS"
DEFAULT_USER     = "elabordepozo"
DEFAULT_REPO     = "catalogo-unas"
DEFAULT_DESC     = "Catálogo de uñas - React + Vite"


# ──────────────────────────────────────────────────────────────
#  HELPERS GITHUB API  (solo stdlib, sin requests)
# ──────────────────────────────────────────────────────────────
def gh_api(method, endpoint, token, data=None):
    url  = f"https://api.github.com{endpoint}"
    body = json.dumps(data).encode() if data else None
    req  = urllib.request.Request(url, data=body, method=method)
    req.add_header("Authorization",        f"token {token}")
    req.add_header("Accept",               "application/vnd.github+json")
    req.add_header("Content-Type",         "application/json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    try:
        with urllib.request.urlopen(req) as r:
            body = r.read()
            return r.status, json.loads(body) if body.strip() else {}
    except urllib.error.HTTPError as e:
        body = e.read()
        return e.code, json.loads(body) if body.strip() else {}


# ──────────────────────────────────────────────────────────────
#  APP PRINCIPAL
#  CORRECCIÓN Python 3.13: No heredar de tk.Tk directamente.
#  Se recibe 'root' como parámetro para evitar recursión infinita.
# ──────────────────────────────────────────────────────────────
class DeployApp:
    def __init__(self, root):
        self.root = root
        self.root.title("🚀 GitHub Pages Deployer  |  CATALOGO UÑAS")
        self.root.geometry("760x700")
        self.root.resizable(True, True)
        self.root.configure(bg="#0f172a")
        self._build_ui()

    # ─── UI ───────────────────────────────────────────────────
    def _build_ui(self):
        BG, BG2, FG = "#0f172a", "#1e293b", "#e2e8f0"
        ACC, BTN    = "#06b6d4", "#0e7490"
        P = dict(padx=12, pady=5)

        style = ttk.Style(self.root)
        style.theme_use("clam")
        style.configure("TLabel",       background=BG,  foreground=FG,  font=("Segoe UI", 10))
        style.configure("TEntry",       fieldbackground=BG2, foreground=FG, insertcolor=FG)
        style.configure("TCheckbutton", background=BG,  foreground=FG,  font=("Segoe UI", 10))
        style.configure("H.TLabel",     background=BG,  foreground=ACC, font=("Segoe UI", 10, "bold"))
        style.configure("Dep.TButton",  background=BTN, foreground="white",
                        font=("Segoe UI", 11, "bold"), padding=8)
        style.map("Dep.TButton", background=[("active", ACC)])

        # Título
        tk.Label(self.root, text="GitHub Pages Deployer", bg=BG,
                 fg=ACC, font=("Segoe UI", 16, "bold")).pack(pady=(14, 0))
        tk.Label(self.root, text="Crea el repositorio y publica tu sitio Next.js automáticamente",
                 bg=BG, fg="#94a3b8", font=("Segoe UI", 9)).pack(pady=(2, 10))

        frm = tk.Frame(self.root, bg=BG)
        frm.pack(fill="x", padx=20)
        frm.columnconfigure(1, weight=1)

        # ── Sección 1: Proyecto
        ttk.Label(frm, text="── PROYECTO ──────────────────────────",
                  style="H.TLabel").grid(row=0, column=0, columnspan=3, sticky="w", pady=(8,2))

        ttk.Label(frm, text="📁 Carpeta:").grid(row=1, column=0, sticky="w", **P)
        self.v_path = tk.StringVar(value=DEFAULT_PROJECT)
        ttk.Entry(frm, textvariable=self.v_path, width=50).grid(row=1, column=1, sticky="ew", **P)
        tk.Button(frm, text="…", bg=BG2, fg=FG, relief="flat", cursor="hand2",
                  command=self._browse).grid(row=1, column=2, padx=4)

        # ── Sección 2: GitHub
        ttk.Label(frm, text="── GITHUB ──────────────────────────────",
                  style="H.TLabel").grid(row=2, column=0, columnspan=3, sticky="w", pady=(12,2))

        ttk.Label(frm, text="👤 Usuario GitHub:").grid(row=3, column=0, sticky="w", **P)
        self.v_user = tk.StringVar(value=DEFAULT_USER)
        ttk.Entry(frm, textvariable=self.v_user, width=50).grid(row=3, column=1, sticky="ew", **P)

        ttk.Label(frm, text="📦 Nombre del repo:").grid(row=4, column=0, sticky="w", **P)
        self.v_repo = tk.StringVar(value=DEFAULT_REPO)
        ttk.Entry(frm, textvariable=self.v_repo, width=50).grid(row=4, column=1, sticky="ew", **P)

        ttk.Label(frm, text="📝 Descripción:").grid(row=5, column=0, sticky="w", **P)
        self.v_desc = tk.StringVar(value=DEFAULT_DESC)
        ttk.Entry(frm, textvariable=self.v_desc, width=50).grid(row=5, column=1, sticky="ew", **P)

        ttk.Label(frm, text="🔑 Token GitHub:").grid(row=6, column=0, sticky="w", **P)
        self.v_token = tk.StringVar()
        self.e_token = ttk.Entry(frm, textvariable=self.v_token, width=50, show="•")
        self.e_token.grid(row=6, column=1, sticky="ew", **P)
        self.v_show = tk.BooleanVar()
        ttk.Checkbutton(frm, text="Ver", variable=self.v_show,
                        command=lambda: self.e_token.config(
                            show="" if self.v_show.get() else "•")
                        ).grid(row=6, column=2, padx=4)

        # ── Sección 3: Opciones
        ttk.Label(frm, text="── OPCIONES ────────────────────────────",
                  style="H.TLabel").grid(row=7, column=0, columnspan=3, sticky="w", pady=(12,2))

        ttk.Label(frm, text="💬 Commit:").grid(row=8, column=0, sticky="w", **P)
        self.v_msg = tk.StringVar(value="deploy: primera versión")
        ttk.Entry(frm, textvariable=self.v_msg, width=50).grid(row=8, column=1, sticky="ew", **P)

        self.v_create = tk.BooleanVar(value=True)
        ttk.Checkbutton(frm, text="✅ Crear repositorio en GitHub (si no existe)",
                        variable=self.v_create).grid(row=9, column=1, sticky="w", padx=12, pady=2)

        self.v_private = tk.BooleanVar(value=False)
        ttk.Checkbutton(frm, text="🔒 Privado  (GitHub Pages gratis requiere público)",
                        variable=self.v_private).grid(row=10, column=1, sticky="w", padx=12, pady=2)

        self.v_pages = tk.BooleanVar(value=True)
        ttk.Checkbutton(frm, text="🌐 Activar GitHub Pages automáticamente",
                        variable=self.v_pages).grid(row=11, column=1, sticky="w", padx=12, pady=2)

        # Botón deploy
        btn_f = tk.Frame(self.root, bg=BG)
        btn_f.pack(pady=10)
        self.btn = ttk.Button(btn_f, text="  🚀  CREAR REPO Y HACER DEPLOY  ",
                              style="Dep.TButton", command=self._start)
        self.btn.pack(side="left", padx=8)
        ttk.Button(btn_f, text="🗑 Limpiar", command=self._clear).pack(side="left", padx=8)

        # Progreso
        self.bar = ttk.Progressbar(self.root, mode="indeterminate", length=720)
        self.bar.pack(padx=20, pady=(0,4))

        # Log
        ttk.Label(self.root, text="📋 Log:", style="H.TLabel").pack(anchor="w", padx=20)
        self.log = scrolledtext.ScrolledText(
            self.root, height=13, bg="#020617", fg="#a3e635",
            font=("Consolas", 9), relief="flat", bd=0)
        self.log.pack(fill="both", expand=True, padx=20, pady=(0,14))
        self.log.tag_config("ok",   foreground="#86efac")
        self.log.tag_config("err",  foreground="#f87171")
        self.log.tag_config("info", foreground="#7dd3fc")
        self.log.tag_config("warn", foreground="#fde047")
        self.log.tag_config("head", foreground="#c084fc", font=("Consolas", 9, "bold"))

    # ─── Helpers UI ───────────────────────────────────────────
    def _browse(self):
        d = filedialog.askdirectory(initialdir=self.v_path.get())
        if d: self.v_path.set(d)

    def _clear(self):
        self.log.delete("1.0", "end")

    def _w(self, msg, tag=""):
        self.log.insert("end", msg + "\n", tag)
        self.log.see("end")
        self.root.update_idletasks()

    # ─── Validar y lanzar hilo ────────────────────────────────
    def _start(self):
        errs = []
        if not os.path.isdir(self.v_path.get().strip()):
            errs.append("• La carpeta del proyecto no existe.")
        if not self.v_user.get().strip():
            errs.append("• Ingresa tu usuario de GitHub.")
        if not self.v_repo.get().strip():
            errs.append("• Ingresa el nombre del repositorio.")
        if not self.v_token.get().strip():
            errs.append("• Ingresa tu token de GitHub.")
        if errs:
            messagebox.showerror("Faltan datos", "\n".join(errs))
            return
        self.btn.config(state="disabled")
        self.bar.start(10)
        threading.Thread(target=self._task, daemon=True).start()

    # ─── Tarea principal ──────────────────────────────────────
    def _task(self):
        path  = self.v_path.get().strip()
        user  = self.v_user.get().strip()
        repo  = self.v_repo.get().strip()
        token = self.v_token.get().strip()
        desc  = self.v_desc.get().strip()
        msg   = self.v_msg.get().strip() or "deploy: update"
        full  = f"{user}/{repo}"

        try:
            # ── PASO 1: Verificar token ────────────────────────
            self._seccion("PASO 1 — Verificando token de GitHub")
            status, data = gh_api("GET", "/user", token)
            if status != 200:
                raise Exception(f"Token inválido o sin permisos (HTTP {status})")
            self._w(f"✔ Token válido. Usuario autenticado: {data['login']}", "ok")

            # ── PASO 2: Crear repositorio ──────────────────────
            self._seccion("PASO 2 — Repositorio en GitHub")
            if self.v_create.get():
                s, _ = gh_api("GET", f"/repos/{full}", token)
                if s == 200:
                    self._w(f"ℹ '{full}' ya existe. Se usará el repositorio existente.", "warn")
                else:
                    self._w(f"📦 Creando repositorio '{repo}'...", "info")
                    s2, d2 = gh_api("POST", "/user/repos", token, {
                        "name":        repo,
                        "description": desc,
                        "private":     self.v_private.get(),
                        "auto_init":   False
                    })
                    if s2 not in (200, 201):
                        raise Exception(f"No se pudo crear el repo: {d2.get('message', s2)}")
                    self._w(f"✔ Repositorio creado: https://github.com/{full}", "ok")
            else:
                self._w("⏭ Omitiendo creación de repositorio.", "info")

            # ── PASO 3: Detectar tipo de proyecto ──────────────
            self._seccion("PASO 3 — Detectando tipo de proyecto")
            project_type, out_dir = self._detect_project(path, repo)

            # ── PASO 4: Build ──────────────────────────────────
            self._seccion(f"PASO 4 — Build del proyecto ({project_type})")
            if not os.path.isdir(os.path.join(path, "node_modules")):
                self._w("📦 node_modules no encontrado. Ejecutando npm install...", "info")
                self._run(["npm", "install"], cwd=path)

            self._w("🔨 Ejecutando npm run build...", "info")
            self._run(["npm", "run", "build"], cwd=path)

            if not os.path.isdir(out_dir):
                raise FileNotFoundError(
                    f"No se encontró la carpeta '{os.path.basename(out_dir)}/'.\n"
                    f"Verifica que el build generó archivos correctamente.")
            self._w(f"✔ Build completado. Carpeta '{os.path.basename(out_dir)}/' generada.", "ok")

            # ── PASO 5: Push a gh-pages ────────────────────────
            self._seccion("PASO 5 — Publicando en rama gh-pages")
            self._push_gh_pages(path, out_dir, full, token, msg)

            # ── PASO 6: Activar GitHub Pages ───────────────────
            if self.v_pages.get():
                self._seccion("PASO 6 — Activando GitHub Pages")
                self._enable_pages(full, token)

            # ── RESULTADO FINAL ────────────────────────────────
            url = f"https://{user}.github.io/{repo}/"
            self._w("\n╔══════════════════════════════════════════════╗", "ok")
            self._w("║           ✅  DEPLOY EXITOSO                 ║", "ok")
            self._w(f"║  🌐  {url:<40}║", "ok")
            self._w("║  ⏱  Espera ~2 min para que GitHub lo active ║", "ok")
            self._w("╚══════════════════════════════════════════════╝", "ok")

        except Exception as e:
            self._w(f"\n❌ ERROR: {e}", "err")
            self._w("Revisa el log y corrige el problema antes de reintentar.", "warn")
        finally:
            self.root.after(0, lambda: (self.bar.stop(), self.btn.config(state="normal")))

    # ─── Cabecera de sección en log ───────────────────────────
    def _seccion(self, titulo):
        self._w(f"\n┌─────────────────────────────────────────────", "head")
        self._w(f"│  {titulo}", "head")
        self._w(f"└─────────────────────────────────────────────", "head")

    # ─── Detectar tipo de proyecto y carpeta de salida ────────
    def _detect_project(self, path, repo):
        """Detecta si es Vite o Next.js y devuelve (tipo, ruta_out_dir)."""
        import re

        # ── Vite ──────────────────────────────────────────────
        for name in ("vite.config.js", "vite.config.ts", "vite.config.mjs"):
            if os.path.exists(os.path.join(path, name)):
                self._w(f"✔ Proyecto Vite detectado ({name}).", "ok")
                content = open(os.path.join(path, name), encoding="utf-8").read()
                if "base" not in content:
                    self._w(f"⚠ Falta la opción  base  en {name}", "warn")
                    self._w(f"  Agrega esto en {name}:\n"
                            f"    base: '/{repo}/',\n", "warn")
                else:
                    self._w(f"✔ {name} tiene la opción 'base' configurada.", "ok")
                out_dir = os.path.join(path, "dist")
                m = re.search(r"outDir\s*[=:]\s*['\"]([^'\"]+)['\"]", content)
                if m:
                    out_dir = os.path.join(path, m.group(1))
                    self._w(f"  outDir personalizado: {m.group(1)}/", "info")
                else:
                    self._w(f"  Carpeta de salida: dist/", "info")
                return "Vite", out_dir

        # ── Next.js ───────────────────────────────────────────
        for name in ("next.config.js", "next.config.mjs", "next.config.ts"):
            cfg = os.path.join(path, name)
            if not os.path.exists(cfg):
                continue
            self._w(f"✔ Proyecto Next.js detectado ({name}).", "ok")
            content = open(cfg, encoding="utf-8").read()
            ok = True
            if "output" not in content:
                self._w(f"⚠ Falta  output: 'export'  en {name}", "warn")
                ok = False
            if "basePath" not in content:
                self._w(f"⚠ Falta  basePath: '/{repo}'  en {name}", "warn")
                ok = False
            if ok:
                self._w(f"✔ {name} parece correctamente configurado.", "ok")
            else:
                self._w(f"\n  Agrega esto en {name}:\n"
                        f"    output: 'export',\n"
                        f"    basePath: '/{repo}',\n"
                        f"    images: {{ unoptimized: true }},\n", "warn")
            return "Next.js", os.path.join(path, "out")

        # ── Desconocido ───────────────────────────────────────
        self._w("⚠ No se detectó vite.config ni next.config. Asumiendo salida en dist/.", "warn")
        return "Desconocido", os.path.join(path, "dist")

    # ─── Ejecutar comando ─────────────────────────────────────
    def _run(self, cmd, cwd):
        self._w(f"  $ {' '.join(cmd)}", "info")
        proc = subprocess.Popen(
            cmd, cwd=cwd,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, encoding="utf-8", errors="replace",
            shell=(os.name == "nt")
        )
        for line in proc.stdout:
            line = line.rstrip()
            if not line:
                continue
            tag = "err" if any(w in line.lower()
                               for w in ("error", "failed", "err!")) else ""
            self._w(f"  {line}", tag)
        proc.wait()
        if proc.returncode != 0:
            raise RuntimeError(f"El comando falló con código {proc.returncode}")

    # ─── Push out/ a rama gh-pages ────────────────────────────
    def _push_gh_pages(self, project_path, out_dir, full_repo, token, commit_msg):
        import tempfile
        remote = f"https://oauth2:{token}@github.com/{full_repo}.git"
        tmp    = tempfile.mkdtemp(prefix="ghpages_")
        try:
            self._w(f"  📂 Directorio temporal: {tmp}", "info")

            # Clonar rama gh-pages o crear nueva
            try:
                self._run(["git", "clone", "--branch", "gh-pages",
                           "--single-branch", "--depth", "1",
                           remote, tmp], cwd=project_path)
                self._w("  ✔ Rama gh-pages clonada.", "ok")
            except RuntimeError:
                self._w("  ℹ Rama gh-pages no existe. Inicializando vacía...", "warn")
                self._run(["git", "init"],                            cwd=tmp)
                self._run(["git", "checkout", "-b", "gh-pages"],      cwd=tmp)
                self._run(["git", "remote", "add", "origin", remote], cwd=tmp)

            # Limpiar contenido anterior (conservar .git)
            for item in os.listdir(tmp):
                if item == ".git":
                    continue
                p = os.path.join(tmp, item)
                shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)

            # Copiar contenido de out/
            self._w("  📋 Copiando archivos del build...", "info")
            for item in os.listdir(out_dir):
                src = os.path.join(out_dir, item)
                dst = os.path.join(tmp, item)
                shutil.copytree(src, dst) if os.path.isdir(src) else shutil.copy2(src, dst)

            # .nojekyll → necesario para Next.js en GitHub Pages
            Path(os.path.join(tmp, ".nojekyll")).touch()
            self._w("  ✔ Archivos copiados. .nojekyll creado.", "ok")

            # Identidad git
            self._run(["git", "config", "user.email", "deploy@script.local"], cwd=tmp)
            self._run(["git", "config", "user.name",  "Deploy Script"],       cwd=tmp)

            # Commit y push
            self._run(["git", "add", "-A"], cwd=tmp)
            result = subprocess.run(
                ["git", "status", "--porcelain"], cwd=tmp,
                capture_output=True, text=True, shell=(os.name == "nt"))
            if not result.stdout.strip():
                self._w("  ℹ Sin cambios. El sitio ya está actualizado.", "warn")
                return
            self._run(["git", "commit", "-m", commit_msg], cwd=tmp)
            self._run(["git", "push", "origin", "gh-pages", "--force"], cwd=tmp)
            self._w("  ✔ Push a gh-pages completado.", "ok")
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
            self._w("  🗑 Directorio temporal eliminado.", "info")

    # ─── Activar GitHub Pages vía API ─────────────────────────
    def _enable_pages(self, full_repo, token):
        self._w("  🌐 Configurando GitHub Pages (rama gh-pages)...", "info")
        s, d = gh_api("POST", f"/repos/{full_repo}/pages", token, {
            "source": {"branch": "gh-pages", "path": "/"}
        })
        if s in (200, 201):
            self._w("  ✔ GitHub Pages activado correctamente.", "ok")
        elif s == 409:
            s2, d2 = gh_api("PUT", f"/repos/{full_repo}/pages", token, {
                "source": {"branch": "gh-pages", "path": "/"}
            })
            msg = "✔ Configuración de Pages actualizada." if s2 in (200, 204) \
                  else f"⚠ No se pudo actualizar Pages: {d2.get('message', s2)}"
            self._w(f"  {msg}", "ok" if s2 in (200, 204) else "warn")
        else:
            self._w(f"  ⚠ Respuesta al activar Pages: {d.get('message', s)}", "warn")
            self._w("  → Actívalo manualmente: Settings → Pages → Branch: gh-pages", "warn")


# ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    try:
        root = tk.Tk()          # ← Se crea el root separado
        app  = DeployApp(root)  # ← La app recibe el root como parámetro
        root.mainloop()         # ← El loop corre desde el root
    except Exception as e:
        print(f"Error al iniciar la aplicación: {e}")
        input("Presiona Enter para salir...")
        sys.exit(1)
