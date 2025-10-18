// --- Bloque de Seguridad: Proteger la ruta ---
// Se ejecuta de inmediato para verificar si el usuario ha iniciado sesión.
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        // Si no hay usuario, redirigir inmediatamente a la página de login.
        window.location.href = 'login.html';
    }
});

// --- Lógica Principal del Panel de Admin ---
// Se ejecuta solo después de que toda la página HTML se ha cargado.
document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los elementos del DOM
    const reservationsList = document.getElementById('reservations-list');
    const btnChangePassword = document.getElementById('btn-change-password');
    const btnLogout = document.getElementById('btn-logout');
    const tabs = document.querySelectorAll('.tabs button');

    let currentReservations = []; // Almacenamos todas las reservas aquí
    let activeTab = 'proximas';   // La pestaña activa por defecto

    // --- Lógica para mostrar enlaces de Admin ---
    // (Asegúrate de tener el div id="admin-only-links" en admin.html si usas roles)
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
                        `;
                    }
                }
            } catch (error) {
                console.error("Error checking user role:", error);
            }
        }
    };
    checkUserRole(); // Llamar a la función al cargar la página

    // --- Lógica de Pestañas ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeTab = tab.id.replace('tab-', '');
            renderReservations();
        });
    });

    // --- Lógica de Usuario (Logout y Cambiar Contraseña) ---
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

    // --- FUNCIÓN PARA ACTUALIZAR EL ESTADO DE LA RESERVA ---
    window.updateReservationStatus = (id, newStatus) => {
        const reservationRef = db.collection('reservations').doc(id);
        let updateData = { estado: newStatus };

        if (newStatus === 'Cancelada') {
            const reason = prompt("Por favor, ingresa el motivo de la cancelación (ej: 'Cancelado por el cliente')");
            if (reason) {
                updateData.motivoCancelacion = reason;
            } else {
                return; // Si el usuario no pone un motivo, no se hace el cambio
            }
        } else {
            // Si el nuevo estado NO es 'Cancelada', eliminamos el campo del motivo.
            updateData.motivoCancelacion = firebase.firestore.FieldValue.delete();
        }

        reservationRef.update(updateData)
            .catch((error) => console.error("Error al actualizar el estado: ", error));
    };

    // --- FUNCIÓN PARA RENDERIZAR LAS RESERVAS SEGÚN LA PESTAÑA ACTIVA ---
    const renderReservations = () => {
        reservationsList.innerHTML = '<p>Cargando reservas...</p>'; // Mostrar mensaje mientras carga

        const filteredReservations = currentReservations.filter(doc => {
            const status = doc.data().estado;
            if (activeTab === 'proximas') {
                return status !== 'Finalizada' && status !== 'Cancelada';
            }
            if (activeTab === 'finalizadas') {
                return status === 'Finalizada';
            }
            if (activeTab === 'canceladas') {
                return status === 'Cancelada';
            }
            return false; // Por si acaso
        });

        if (filteredReservations.length === 0) {
            reservationsList.innerHTML = `<p>No hay reservas en esta categoría.</p>`;
            return;
        }

        reservationsList.innerHTML = ''; // Limpiar antes de añadir las tarjetas
        filteredReservations.forEach(doc => {
            const reserva = doc.data();
            const id = doc.id;
            // Manejar posible fecha inválida
            let fechaFormateada = 'Fecha inválida';
            if (reserva.fecha && !isNaN(new Date(reserva.fecha))) {
                 fechaFormateada = new Date(reserva.fecha).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
            }


            const reservationCard = document.createElement('div');
            reservationCard.className = 'reserva-card';
            reservationCard.innerHTML = `
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

    // --- ESCUCHAR CAMBIOS EN FIRESTORE EN TIEMPO REAL ---
    db.collection('reservations').orderBy('timestamp', 'desc')
      .onSnapshot((querySnapshot) => {
          console.log("Reservas recibidas:", querySnapshot.docs.length); // Log para depurar
          currentReservations = querySnapshot.docs; // Guardar todos los datos
          renderReservations(); // Volver a renderizar con el filtro de la pestaña actual
      }, (error) => {
          console.error("Error al escuchar las reservas: ", error); // Log de error
          reservationsList.innerHTML = '<p>Error al cargar las reservas. Revisa la consola.</p>';
      });
});