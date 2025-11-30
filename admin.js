// --- Bloque de Seguridad: Proteger la ruta ---
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'login.html';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const reservationsList = document.getElementById('reservations-list');
    const sortSelector = document.getElementById('sort-order');
    const btnChangePassword = document.getElementById('btn-change-password');
    const btnLogout = document.getElementById('btn-logout');
    const tabs = document.querySelectorAll('.tabs button');

    let currentReservations = [];
    let activeTab = 'proximas';
    let currentSort = sortSelector ? sortSelector.value : 'timestamp_desc'; 

    // --- FUNCIÓN CENTRAL: Escuchar Cambios ---
    const listenForReservations = () => {
        let query = db.collection('reservations');
        
        if (currentSort === 'timestamp_desc') {
            query = query.orderBy('timestamp', 'desc');
        } else if (currentSort === 'date_asc') {
            query = query.orderBy('fecha', 'asc');
        }
        
        query.onSnapshot((querySnapshot) => {
            currentReservations = querySnapshot.docs;
            renderReservations();
        }, (error) => {
            console.error("Error:", error);
            reservationsList.innerHTML = '<p>Error al cargar las reservas.</p>';
        });
    };
    
    const checkUserRole = async () => {
        const user = firebase.auth().currentUser;
        if (user) {
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists && userDoc.data().role === 'admin') {
                    const adminLinksContainer = document.getElementById('admin-only-links');
                    if (adminLinksContainer) {
                        adminLinksContainer.innerHTML = `
                            <a href="carousel-admin.html" class="nav-link">Gestionar Carrusel</a>
                            <a href="menu-admin.html" class="nav-link">Gestionar Menús</a>
                            <a href="availability.html" class="nav-link">Gestionar Disponibilidad</a>
                        `;
                    }
                }
            } catch (error) { console.error(error); }
        }
    };
    checkUserRole();

    if (sortSelector) {
        sortSelector.addEventListener('change', (e) => {
            currentSort = e.target.value;
            listenForReservations(); 
        });
    }
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeTab = tab.id.replace('tab-', '');
            renderReservations();
        });
    });

    btnLogout.addEventListener('click', () => {
        if (confirm("¿Cerrar sesión?")) firebase.auth().signOut();
    });

    // --- Función para actualizar HORA pactada ---
    window.updateReservationTime = (id, timeValue) => {
        db.collection('reservations').doc(id).update({
            horaPactada: timeValue
        }).catch(err => console.error("Error guardando hora:", err));
    };

    // --- Función para actualizar ESTADO ---
    window.updateReservationStatus = (id, newStatus) => {
        const user = firebase.auth().currentUser;
        if (!user) return;

        const reservationRef = db.collection('reservations').doc(id);
        let updateData = { 
            estado: newStatus,
            lastUpdatedBy: {
                uid: user.uid,
                email: user.email,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }
        };

        if (newStatus === 'Cancelada') {
            const reason = prompt("Motivo de cancelación:");
            if (reason) updateData.motivoCancelacion = reason;
            else return;
        } else {
            updateData.motivoCancelacion = firebase.firestore.FieldValue.delete();
        }

        reservationRef.update(updateData);
    };

    // --- RENDERIZADO ---
    const renderReservations = () => {
        reservationsList.innerHTML = '<p>Cargando...</p>';

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
            
            // Formateo Fecha
            let fechaFormateada = 'Fecha inválida';
            let diasRestantesTexto = '';

            if (reserva.fecha) {
                const [anio, mes, dia] = reserva.fecha.split('-');
                const meses = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
                const mesLetras = meses[parseInt(mes) - 1] || "---";
                fechaFormateada = `${dia}/${mesLetras}/${anio}`;

                const fechaEventoObj = new Date(anio, parseInt(mes) - 1, dia);
                const hoy = new Date();
                const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
                const diffTiempo = fechaEventoObj.getTime() - inicioHoy.getTime();
                const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

                if (diffDias > 0) diasRestantesTexto = `Faltan: ${diffDias} día${diffDias > 1 ? 's' : ''}`;
                else if (diffDias === 0) diasRestantesTexto = '¡Es hoy!';
                else diasRestantesTexto = 'Fecha pasada';
            }

            // Formateo Hora Registro
            let horaRegistro = 'No disponible';
            if (reserva.timestamp && reserva.timestamp.toDate) {
                const registroDate = reserva.timestamp.toDate();
                horaRegistro = registroDate.toLocaleString('es-ES', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                }).replace(/\./g, '');
            }

            // Hora Pactada
            const horaValue = reserva.horaPactada || "";
            
            // Ultima actualización
            let lastUpdatedText = '';
            if (reserva.lastUpdatedBy && reserva.lastUpdatedBy.email) {
                const name = reserva.lastUpdatedBy.email.split('@')[0]; 
                lastUpdatedText = `Actualizado por: ${name}`;
            }

            const reservationCard = document.createElement('div');
            reservationCard.className = 'reserva-card';
            
            // AQUI ESTÁ EL CAMBIO: AGREGADA LA LÍNEA DEL TELÉFONO
            reservationCard.innerHTML = `
                <div class="card-header-info">
                    <span class="registration-time">Registro: ${horaRegistro}</span>
                    <span class="countdown-timer">${diasRestantesTexto}</span>
                </div>
                
                <p><strong>Email:</strong> ${reserva.email || 'No especificado'}</p>
                <p><strong>Fecha Solicitada:</strong> ${fechaFormateada}</p>
                
                <div class="admin-time-selector">
                    <label>🕒 Horario Acordado:</label>
                    <input type="time" value="${horaValue}" onchange="updateReservationTime('${id}', this.value)">
                </div>
                
                <p><strong>Menú:</strong> ${reserva.menu || 'No especificado'}</p>
                <p><strong>Comensales:</strong> ${reserva.comensales || 'No especificado'}</p>
                <p><strong>Modalidad:</strong> ${reserva.modalidad || 'No especificado'}</p>
                <p><strong>Dirección:</strong> ${reserva.direccion || 'No especificado'}</p>
                
                <p><strong>Teléfono:</strong> ${reserva.phone || 'No especificado'}</p>

                ${reserva.alergia === 'si' ? `<p style="color:var(--secondary-color);"><strong>⚠️ Alergia:</strong> ${reserva.alergiaDetalle}</p>` : ''}
                
                <p><em>Estado: ${reserva.estado}</em></p>
                ${reserva.motivoCancelacion ? `<div class="cancel-reason">Motivo: ${reserva.motivoCancelacion}</div>` : ''}
                ${lastUpdatedText ? `<p class="last-updated-info" style="font-size: 0.8em; color: #888;">${lastUpdatedText}</p>` : ''}
                
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

    listenForReservations(); 
});