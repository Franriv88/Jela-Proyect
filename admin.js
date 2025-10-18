// --- Bloque de Seguridad: Proteger la ruta ---
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'login.html';
    }
});

// --- Lógica Principal del Panel de Admin ---
document.addEventListener('DOMContentLoaded', () => {
    const reservationsList = document.getElementById('reservations-list');
    const btnChangePassword = document.getElementById('btn-change-password');
    const btnLogout = document.getElementById('btn-logout');
    const tabs = document.querySelectorAll('.tabs button');

    let currentReservations = [];
    let activeTab = 'proximas';

    // --- Lógica para mostrar enlaces de Admin ---
    const checkUserRole = async () => {
        const user = firebase.auth().currentUser;
        if (user) {
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists && userDoc.data().role === 'admin') {
                    // Asegúrate de tener este div en admin.html si usas roles
                    const adminLinksContainer = document.getElementById('admin-only-links');
                    if (adminLinksContainer) {
                        adminLinksContainer.innerHTML = `
                            <a href="carousel-admin.html" class="nav-link">Gestionar Carrusel</a>
                            <a href="menu-admin.html" class="nav-link">Gestionar Menús</a>
                            <a href="availability.html" class="nav-link">Gestionar Disponibilidad</a>
                        `;
                    }
                }
            } catch (error) {
                console.error("Error checking user role:", error);
            }
        }
    };
    // Descomenta la siguiente línea si tienes el div id="admin-only-links" en admin.html
    // checkUserRole();

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
            } else {
                return;
            }
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
            let fechaFormateada = 'Fecha inválida';
            if (reserva.fecha && !isNaN(new Date(reserva.fecha))) {
                 fechaFormateada = new Date(reserva.fecha).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
            }

            let horaRegistro = 'No disponible';
            if (reserva.timestamp && reserva.timestamp.toDate) {
                horaRegistro = reserva.timestamp.toDate().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            }

            const reservationCard = document.createElement('div');
            reservationCard.className = 'reserva-card';
            reservationCard.innerHTML = `
                <span class="registration-time">Hora de registro: ${horaRegistro}</span>
                <p><strong>Email:</strong> ${reserva.email || 'No especificado'}</p>
                <p><strong>Fecha:</strong> ${fechaFormateada}</p>
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

    // --- ESCUCHAR CAMBIOS EN FIRESTORE ---
    db.collection('reservations').orderBy('timestamp', 'desc')
      .onSnapshot((querySnapshot) => {
          console.log("Reservas recibidas en admin.js:", querySnapshot.docs.length); // Log específico
          currentReservations = querySnapshot.docs;
          renderReservations();
      }, (error) => {
          console.error("Error al escuchar las reservas en admin.js: ", error); // Log específico
          reservationsList.innerHTML = '<p>Error al cargar las reservas. Revisa la consola.</p>';
      });
});