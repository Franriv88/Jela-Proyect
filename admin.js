// --- Bloque de Seguridad: Proteger la ruta ---
// Esto se ejecuta de inmediato para verificar si el usuario ha iniciado sesión.
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        // Si no hay usuario, redirigir inmediatamente a la página de login.
        window.location.href = 'login.html';
    }
});


// --- Lógica Principal del Panel de Admin ---
// Esto se ejecuta solo después de que toda la página HTML se ha cargado.
document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los elementos del DOM que ahora sí existen
    const reservationsList = document.getElementById('reservations-list');
    const btnChangePassword = document.getElementById('btn-change-password');
    const btnLogout = document.getElementById('btn-logout');

    // --- Lógica para Cerrar Sesión ---
    btnLogout.addEventListener('click', () => {
        if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
            firebase.auth().signOut().catch((error) => {
                console.error("Error al cerrar sesión:", error);
            });
        }
    });

    // --- Lógica para Cambiar Contraseña ---
    btnChangePassword.addEventListener('click', () => {
        const user = firebase.auth().currentUser;
        if (!user) return; // Medida de seguridad extra

        const newPassword = prompt("Ingresa tu nueva contraseña (mínimo 6 caracteres):");
        if (newPassword && newPassword.length >= 6) {
            user.updatePassword(newPassword)
                .then(() => {
                    alert("¡Contraseña actualizada con éxito!");
                })
                .catch((error) => {
                    console.error("Error al cambiar la contraseña:", error);
                    alert("Hubo un error al actualizar tu contraseña. Puede que necesites volver a iniciar sesión.");
                });
        } else if (newPassword) {
            alert("La contraseña debe tener al menos 6 caracteres.");
        }
    });

    // --- Cargar las Reservas en Tiempo Real ---
    db.collection('reservations').orderBy('timestamp', 'desc').onSnapshot((querySnapshot) => {
        if (querySnapshot.empty) {
            reservationsList.innerHTML = '<p>Aún no hay reservas.</p>';
            return;
        }

        reservationsList.innerHTML = ''; // Limpiar la lista
        querySnapshot.forEach((doc) => {
            const reserva = doc.data();
            const fecha = new Date(reserva.fecha).toLocaleString('es-ES', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            const reservationCard = document.createElement('div');
            reservationCard.className = 'reserva-card';
            reservationCard.innerHTML = `
                <p><strong>Email:</strong> ${reserva.email}</p>
                <p><strong>Fecha:</strong> ${fecha}</p>
                <p><strong>Menú:</strong> ${reserva.menu}</p>
                <p><strong>Comensales:</strong> ${reserva.comensales}</p>
                <p><strong>Modalidad:</strong> ${reserva.modalidad}</p>
                <p><strong>Dirección:</strong> ${reserva.direccion}</p>
                ${reserva.alergia === 'si' ? `<p><strong>Alergias:</strong> ${reserva.alergiaDetalle}</p>` : ''}
                <p><em>Estado: ${reserva.estado}</em></p>
            `;
            reservationsList.appendChild(reservationCard);
        });
    }, (error) => {
        console.error("Error al obtener las reservas: ", error);
        reservationsList.innerHTML = '<p>Error al cargar las reservas.</p>';
    });
});