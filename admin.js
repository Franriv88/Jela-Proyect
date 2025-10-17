// --- Bloque de Seguridad: Proteger la ruta ---
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'login.html';
    }
});

// --- Lógica Principal del Panel de Admin ---
document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos
    const reservationsList = document.getElementById('reservations-list');
    const btnChangePassword = document.getElementById('btn-change-password');
    const btnLogout = document.getElementById('btn-logout');
    const tabs = document.querySelectorAll('.tabs button');

    let currentReservations = [];
    let activeTab = 'proximas';

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

    // --- FUNCIÓN PARA ACTUALIZAR EL ESTADO (CORREGIDA) ---
    window.updateReservationStatus = (id, newStatus) => {
        const reservationRef = db.collection('reservations').doc(id);
        let updateData = { estado: newStatus };

        if (newStatus === 'Cancelada') {
            const reason = prompt("Por favor, ingresa el motivo de la cancelación (ej: 'Cancelado por el cliente')");
            if (reason) {
                updateData.motivoCancelacion = reason;
            } else {
                return;
            }
        } else {
            // *** ESTA ES LA LÍNEA CORREGIDA ***
            // Llamamos a FieldValue directamente desde el objeto global de firebase
            updateData.motivoCancelacion = firebase.firestore.FieldValue.delete();
        }
        
        console.log("Actualizando reserva con estos datos:", updateData);

        reservationRef.update(updateData)
            .catch((error) => console.error("Error al actualizar el estado: ", error));
    };

    // --- FUNCIÓN PARA RENDERIZAR LAS RESERVAS ---
    const renderReservations = () => {
        reservationsList.innerHTML = '';
        const filteredReservations = currentReservations.filter(doc => {
            const status = doc.data().estado;
            if (activeTab === 'proximas') return status !== 'Finalizada' && status !== 'Cancelada';
            if (activeTab === 'finalizadas') return status === 'Finalizada';
            if (activeTab === 'canceladas') return status === 'Cancelada';
        });

        if (filteredReservations.length === 0) {
            reservationsList.innerHTML = `<p>No hay reservas en esta categoría.</p>`;
            return;
        }

        filteredReservations.forEach(doc => {
            const reserva = doc.data();
            const id = doc.id;
            const fecha = new Date(reserva.fecha).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
            
            const reservationCard = document.createElement('div');
            reservationCard.className = 'reserva-card';
            reservationCard.innerHTML = `
                <p><strong>Email:</strong> ${reserva.email}</p>
                <p><strong>Fecha:</strong> ${fecha}</p>
                <p><strong>Menú:</strong> ${reserva.menu}</p>
                <p><strong>Dirección:</strong> ${reserva.direccion}</p>
                ${reserva.alergia === 'si' ? `<p><strong>Alergias:</strong> ${reserva.alergiaDetalle}</p>` : ''}
                <p><em>Estado: ${reserva.estado}</em></p>
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
    db.collection('reservations').orderBy('timestamp', 'desc').onSnapshot((querySnapshot) => {
        currentReservations = querySnapshot.docs;
        renderReservations();
    });
});