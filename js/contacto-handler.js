document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contact-form');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;
            
            // Estado de carga
            submitBtn.disabled = true;
            submitBtn.innerText = 'Enviando...';
            
            // Recoger datos
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            try {
                // TODO: REEMPLAZAR con tu URL real tras hacer 'wrangler deploy'
                // Si estás probando en local con 'wrangler dev', usa: http://localhost:8787
                const workerUrl = 'https://nexgalia-contact-worker.carlosmc.workers.dev'; 
                
                const response = await fetch(workerUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || result.errors?.join(', ') || 'Error en la respuesta del servidor');
                }

                showNotification('¡Gracias! Hemos recibido tu mensaje. Te contactaremos pronto.', 'success');
                form.reset();
                
            } catch (error) {
                console.error('Error al enviar formulario:', error);
                showNotification(`Hubo un problema: ${error.message}`, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            }
        });
    }
});

// Sistema de Notificaciones
function showNotification(message, type = 'success') {
    // Asegurar que el contenedor existe
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    // Crear toast
    const toast = document.createElement('div');
    toast.className = `notification-toast ${type}`;
    
    // Icono según tipo
    const iconClass = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${iconClass} notification-icon"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Activar animación de entrada
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Eliminar automáticamente después de 5 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        // Esperar a que termine la transición de salida para eliminar del DOM
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 400); 
    }, 5000);
}
