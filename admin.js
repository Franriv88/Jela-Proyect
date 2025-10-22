// --- Bloque de Seguridad: Proteger la ruta ---
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'login.html';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los elementos del DOM
    const reservationsList = document.getElementById('reservations-list');
    const sortSelector = document.getElementById('sort-order'); // REFERENCIA AL SELECTOR
    const btnChangePassword = document.getElementById('btn-change-password');
    const btnLogout = document.getElementById('btn-logout');
    const tabs = document.querySelectorAll('.tabs button');

    let currentReservations = [];
    let activeTab = 'proximas';
    // Inicializa currentSort con el valor del selector al cargar el DOM
    let currentSort = sortSelector ? sortSelector.value : 'timestamp_desc'; 


    // --- FUNCIÓN CENTRAL: Escuchar Cambios en Firestore ---
    const listenForReservations = () => {
        let query = db.collection('reservations');
        
        // 1. Determinar el ordenamiento según el estado actual de currentSort
        if (currentSort === 'timestamp_desc') {
            // Ordenar por hora de registro (timestamp) de más reciente (desc)
            query = query.orderBy('timestamp', 'desc');
        } else if (currentSort === 'date_asc') {
            // Ordenar por fecha de evento (fecha) de más cercana (asc)
            query = query.orderBy('fecha', 'asc');
        }
        
        // 2. Ejecutar la escucha en tiempo real
        query.onSnapshot((querySnapshot) => {
            console.log(`Reservas recibidas (Orden: ${currentSort}):`, querySnapshot.docs.length);
            currentReservations = querySnapshot.docs;
            renderReservations();
        }, (error) => {
            console.error("Error al escuchar las reservas:", error);
            reservationsList.innerHTML = '<p>Error al cargar las reservas. Revisa la consola.</p>';
        });
    };
    
    // --- Lógica para mostrar enlaces de Admin ---
    const checkUserRole = async () => {
        const user = firebase.auth().currentUser;
        if (user) {
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists && userDoc.data().role === 'admin') {
                    // Asumiendo que quieres que estos enlaces estén fuera de un div específico si no tienes uno
                    // Si tienes un div para enlaces admin, descomenta el código dentro del if(adminLinksContainer)
                    /*
                    const adminLinksContainer = document.getElementById('admin-only-links'); 
                    if (adminLinksContainer) {
                        adminLinksContainer.innerHTML = `
                            <a href="carousel-admin.html" class="nav-link">Gestionar Carrusel</a>
                            <a href="menu-admin.html" class="nav-link">Gestionar Menús</a>
                            <a href="availability.html" class="nav-link">Gestionar Disponibilidad</a>
                        `;
                    }
                    */
                }
            } catch (error) {
                console.error("Error checking user role:", error);
            }
        }
    };
    checkUserRole();

    // --- AÑADIR LISTENER AL SELECTOR DE ORDEN (CORRECCIÓN) ---
    // Este listener actualiza la variable y llama a listenForReservations para refrescar la consulta a Firestore
    if (sortSelector) {
        sortSelector.addEventListener('change', (e) => {
            currentSort = e.target.value;
            listenForReservations(); // Vuelve a ejecutar la escucha con el nuevo orden
        });
    }
    
    // --- Lógica de Pestañas ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeTab = tab.id.replace('tab-', '');
            renderReservations();
        });
    });

    // --- Lógica de Usuario ---
    btnLogout.addEventListener('click', () => {
        if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
            firebase.auth().signOut().catch((error) => console.error("Error al cerrar sesión:", error));
        }
    });

    btnChangePassword.addEventListener('click', () => {
        const user = firebase.auth().currentUser;
        if (!user) return;
        const newPassword = prompt("Ingresa tu nueva contraseña (mínimo 6 caracteres):");
        if (newPassword && newPassword.length >= 6) {
            user.updatePassword(newPassword)
                .then(() => alert("¡Contraseña actualizada con éxito!"))
                .catch((error) => alert("Hubo un error al actualizar tu contraseña."));
        } else if (newPassword) {
            alert("La contraseña debe tener al menos 6 caracteres.");
        }
    });

    // --- FUNCIÓN PARA ACTUALIZAR EL ESTADO ---
    window.updateReservationStatus = (id, newStatus) => {
        const reservationRef = db.collection('reservations').doc(id);
        let updateData = { estado: newStatus };

        if (newStatus === 'Cancelada') {
            const reason = prompt("Por favor, ingresa el motivo de la cancelación:");
            if (reason) {
                updateData.motivoCancelacion = reason;
            } else { return; }
        } else {
            updateData.motivoCancelacion = firebase.firestore.FieldValue.delete();
        }

        reservationRef.update(updateData)
            .catch((error) => console.error("Error al actualizar el estado: ", error));
    };

    // --- FUNCIÓN PARA RENDERIZAR LAS RESERVAS ---
    const renderReservations = () => {
        reservationsList.innerHTML = '<p>Cargando reservas...</p>';

        const filteredReservations = currentReservations.filter(doc => {
            const status = doc.data().estado;
            if (activeTab === 'proximas') return status !== 'Finalizada' && status !== 'Cancelada';
            if (activeTab === 'finalizadas') return status === 'Finalizada';
            if (activeTab === 'canceladas') return status === 'Cancelada';
            return false;
        });

        if (filteredReservations.length === 0) {
            reservationsList.innerHTML = `<p>No hay reservas en esta categoría.</p>`;
            return;
        }

        reservationsList.innerHTML = '';
        filteredReservations.forEach(doc => {
            const reserva = doc.data();
            const id = doc.id;
            
            let fechaEventoObj = null;
            let fechaFormateada = 'Fecha inválida';
            if (reserva.fecha) {
                fechaEventoObj = new Date(reserva.fecha.replace(' ', 'T'));
                if (!isNaN(fechaEventoObj)) {
                     fechaFormateada = fechaEventoObj.toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
                }
            }

            let horaRegistro = 'No disponible';
            if (reserva.timestamp && reserva.timestamp.toDate) {
                const registroDate = reserva.timestamp.toDate();
                horaRegistro = registroDate.toLocaleString('es-ES', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                }).replace(/\./g, '');
            }

            let diasRestantesTexto = '';
            if (fechaEventoObj && !isNaN(fechaEventoObj)) {
                const hoy = new Date();
                const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
                const inicioEvento = new Date(fechaEventoObj.getFullYear(), fechaEventoObj.getMonth(), fechaEventoObj.getDate());
                const diffTiempo = inicioEvento.getTime() - inicioHoy.getTime();
                const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));
                if (diffDias > 0) diasRestantesTexto = `Faltan: ${diffDias} día${diffDias > 1 ? 's' : ''}`;
                else if (diffDias === 0) diasRestantesTexto = '¡Es hoy!';
                else diasRestantesTexto = 'Fecha pasada';
            }


            const reservationCard = document.createElement('div');
            reservationCard.className = 'reserva-card';
            reservationCard.innerHTML = `
                <div class="card-header-info">
                    <span class="registration-time">Registro: ${horaRegistro}</span>
                    <span class="countdown-timer">${diasRestantesTexto}</span>
                </div>
                <p><strong>Email:</strong> ${reserva.email || 'No especificado'}</p>
                <p><strong>Fecha Evento:</strong> ${fechaFormateada}</p>
                <p><strong>Menú:</strong> ${reserva.menu || 'No especificado'}</p>
                <p><strong>Comensales:</strong> ${reserva.comensales || 'No especificado'}</p>
                <p><strong>Modalidad:</strong> ${reserva.modalidad || 'No especificado'}</p>
                <p><strong>Dirección:</strong> ${reserva.direccion || 'No especificado'}</p>
                ${reserva.alergia === 'si' ? `<p><strong>Alergias:</strong> ${reserva.alergiaDetalle || 'Especificadas'}</p>` : ''}
                <p><em>Estado: ${reserva.estado || 'pendiente'}</em></p>
                ${reserva.motivoCancelacion ? `<div class="cancel-reason"><strong>Motivo:</strong> ${reserva.motivoCancelacion}</div>` : ''}
                <div class="actions">
                    <button onclick="updateReservationStatus('${id}', 'Confirmada')">Confirmar</button>
                    <button onclick="updateReservationStatus('${id}', 'Pendiente')" class="btn-secondary">Pendiente</button>
                    <button onclick="updateReservationStatus('${id}', 'Finalizada')" class="btn-secondary">Finalizar</button>
                    <button onclick="updateReservationStatus('${id}', 'Cancelada')" class="btn-danger">Cancelar</button>
                </div>
            `;
            reservationsList.appendChild(reservationCard);
        });
    };

    // --- INICIA LA ESCUCHA CON EL ORDEN POR DEFECTO AL CARGAR LA PÁGINA ---
    listenForReservations(); 
});