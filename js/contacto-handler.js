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

                alert('¡Gracias! Hemos recibido tu mensaje. Te contactaremos pronto.');
                form.reset();
                
            } catch (error) {
                console.error('Error al enviar formulario:', error);
                alert(`Hubo un problema: ${error.message}`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            }
        });
    }
});
