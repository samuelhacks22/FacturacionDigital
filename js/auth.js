// Sistema de autenticación simple
class AuthSystem {
  constructor() {
    this.userKey = 'current_user';
    this.users = this.getUsers();
    this.currentUser = this.getCurrentUser();
    this.init();
  }

  init() {
    // Inicializar usuarios por defecto si no existen
    if (this.users.length === 0) {
      this.users = [
        { username: 'robertico', password: 'robertico1415', name: 'Administrador' },
        { username: 'usuario', password: 'usuario123', name: 'Usuario' }
      ];
      this.saveUsers();
    }
    
    this.updateAuthUI();
  }

  // Obtener usuarios del almacenamiento
  getUsers() {
    try {
      const users = localStorage.getItem('users_db');
      return users ? JSON.parse(users) : [];
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  // Guardar usuarios
  saveUsers() {
    try {
      localStorage.setItem('users_db', JSON.stringify(this.users));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }

  // Obtener usuario actual
  getCurrentUser() {
    try {
      const user = localStorage.getItem(this.userKey);
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Iniciar sesión
  login(username, password) {
    try {
      const user = this.users.find(u => u.username === username && u.password === password);
      
      if (user) {
        const userSession = {
          username: user.username,
          name: user.name,
          loginTime: new Date().toISOString()
        };
        
        localStorage.setItem(this.userKey, JSON.stringify(userSession));
        this.currentUser = userSession;
        this.updateAuthUI();
        
        return { success: true, user: userSession };
      } else {
        return { success: false, error: 'Credenciales inválidas' };
      }
    } catch (error) {
      console.error('Error during login:', error);
      return { success: false, error: 'Error interno del sistema' };
    }
  }

  // Cerrar sesión
  logout() {
    try {
      localStorage.removeItem(this.userKey);
      this.currentUser = null;
      this.updateAuthUI();
      return { success: true };
    } catch (error) {
      console.error('Error during logout:', error);
      return { success: false, error: 'Error cerrando sesión' };
    }
  }

  // Verificar si está autenticado
  isAuthenticated() {
    return this.currentUser !== null;
  }

  // Actualizar interfaz de autenticación
  updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (this.isAuthenticated()) {
      loginBtn.classList.add('d-none');
      logoutBtn.classList.remove('d-none');
      logoutBtn.innerHTML = `<i class="fas fa-sign-out-alt me-1"></i> ${this.currentUser.name}`;
    } else {
      loginBtn.classList.remove('d-none');
      logoutBtn.classList.add('d-none');
    }
  }

  // Configurar eventos de autenticación
  setupAuthEvents() {
    // Evento de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        const result = this.login(username, password);
        
        if (result.success) {
          // Cerrar modal
          const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
          if (modal) {
            modal.hide();
          }
          
          // Limpiar formulario
          loginForm.reset();
          
          // Mostrar mensaje de éxito
          this.showMessage('Sesión iniciada correctamente', 'success');
        } else {
          this.showMessage(result.error, 'danger');
        }
      });
    }

    // Evento de logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        const result = this.logout();
        
        if (result.success) {
          this.showMessage('Sesión cerrada correctamente', 'info');
        } else {
          this.showMessage(result.error, 'danger');
        }
      });
    }
  }

  // Mostrar mensajes
  showMessage(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.parentNode.removeChild(alertDiv);
      }
    }, 5000);
  }
}

// Instancia global del sistema de autenticación
const authSystem = new AuthSystem();
