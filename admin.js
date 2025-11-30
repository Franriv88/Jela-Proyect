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

    // ********************************************************
    // *** FUNCIÓN PDF: PÁGINA COMPLETA (FULL A4) ***
    // ********************************************************
    window.downloadPDF = (cardId, clientName) => {
        const element = document.getElementById(cardId);
        if (!element) return;

        const originalInput = element.querySelector('.admin-time-selector input');
        const realTimeValue = originalInput && originalInput.value ? originalInput.value : '---';

        // 1. Crear contenedor temporal
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        // DIMENSIONES A4 (aprox a 96dpi) PARA OCUPAR TODO
        container.style.width = '600px'; 
        container.style.minHeight = '1100px'; 
        container.style.zIndex = '-9999';
        container.style.backgroundColor = '#ffffff';
        document.body.appendChild(container);

        // 2. Clonar la tarjeta
        const clone = element.cloneNode(true);
        
        // 3. ESTILOS DE PÁGINA COMPLETA
        clone.style.backgroundColor = '#ffffff';
        clone.style.color = '#000000';
        // Borde grueso alrededor de toda la hoja
        clone.style.border = '2px solid #000'; 
        clone.style.borderRadius = '0';
        // Padding interno grande para que el texto no toque el borde
        clone.style.padding = '50px'; 
        clone.style.width = '98%'; 
        clone.style.minHeight = '1100px'; // Forza la altura de la hoja
        clone.style.boxSizing = 'border-box';
        clone.style.boxShadow = 'none';
        clone.style.margin = '10px 0';
        
        // Centrar contenido verticalmente (opcional, queda elegante)
        clone.style.display = 'flex';
        clone.style.flexDirection = 'column';
        // clone.style.justifyContent = 'center'; // Descomenta si quieres centrado vertical

        const allElements = clone.querySelectorAll('*');
        allElements.forEach(el => {
            el.style.color = '#000000';
            el.style.textShadow = 'none';
            el.style.borderColor = '#000000';
        });

        // 4. LIMPIEZA
        const actionsDiv = clone.querySelector('.actions');
        if(actionsDiv) actionsDiv.remove();
        
        const btnPdf = clone.querySelector('.btn-pdf');
        if(btnPdf) btnPdf.remove();

        const headerInfo = clone.querySelector('.card-header-info');
        if(headerInfo) headerInfo.remove();

        const lastUpdateInfo = clone.querySelector('.last-updated-info');
        if(lastUpdateInfo) lastUpdateInfo.remove();

        const paragraphs = clone.querySelectorAll('p');
        paragraphs.forEach(p => {
            if (p.innerText.includes('Estado:')) p.remove();
            // Aumentar fuente para que se lea bien en hoja completa
            p.style.fontSize = '16px';
            p.style.marginBottom = '15px';
        });

        const timeSelectorClone = clone.querySelector('.admin-time-selector');
        if(timeSelectorClone) {
            timeSelectorClone.innerHTML = '';
            
            // Estilos del contenedor gris
            timeSelectorClone.style.border = 'none';
            timeSelectorClone.style.background = '#fff'; // Fondo gris
            timeSelectorClone.style.padding = '0';
            timeSelectorClone.style.margin = '15px 0';
            timeSelectorClone.style.textAlign = 'left';
            timeSelectorClone.style.borderRadius = '5px';

            const p = document.createElement('p');
            
            // AQUÍ ESTÁ LA MAGIA:
            // 1. <strong> con color DORADO (#BA9D3D) para el título
            // 2. <span> con color NEGRO (#000000) para la hora
            p.innerHTML = `<strong style="color: #000; font-size: 1.1em;">Hora Acordada:</strong> <span style="color: #000000; font-size: 1.1em;">${realTimeValue}</span>`;
            
            p.style.margin = '0'; // Sin márgenes extra
            
            timeSelectorClone.appendChild(p);
        }

        // 5. Encabezado
        const header = document.createElement('div');
        const logoSrc = './Recursos/icons/LogoSinEsquinas.png'; 
        
        header.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="${logoSrc}" alt="Logo" style="width: 150px; height: auto; display: block; margin: 0 auto;">
            </div>
            <p style="color: #000; text-align: center; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px; font-size: 16px; text-transform: uppercase;"></p>
            <h2 style="color: #000; text-align: center; margin-bottom: 40px; text-transform: uppercase; text-decoration: underline;">Comprobante de Reserva</h2>
        `;
        
        // Insertar encabezado al principio, pero dentro del padding
        clone.insertBefore(header, clone.firstChild);

        container.appendChild(clone);

        // 6. Generación (Márgenes en 0 para ocupar todo)
        const opt = {
            margin:       0, // MÁRGENES A CERO para que el borde toque la orilla
            filename:     `Reserva_${clientName}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, scrollX: 0, scrollY: 0 }, 
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(clone).save().then(() => {
            document.body.removeChild(container);
        });
    };
    // ********************************************************
    
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

    btnChangePassword.addEventListener('click', () => {
        const user = firebase.auth().currentUser;
        if (!user) return;
        const newPassword = prompt("Nueva contraseña:");
        if (newPassword && newPassword.length >= 6) {
            user.updatePassword(newPassword).then(() => alert("Hecho."));
        }
    });

    window.updateReservationTime = (id, timeValue) => {
        db.collection('reservations').doc(id).update({ horaPactada: timeValue })
          .catch(err => console.error(err));
    };

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
            const reason = prompt("Motivo:");
            if (reason) updateData.motivoCancelacion = reason; else return;
        } else {
            updateData.motivoCancelacion = firebase.firestore.FieldValue.delete();
        }
        reservationRef.update(updateData);
    };

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
            const cardId = `card-${id}`; 
            
            // Formateo Fecha
            let fechaFormateada = 'Fecha inválida';
            let diasRestantesTexto = '';

            if (reserva.fecha) {
                const [dia, mes, anio] = reserva.fecha.split('-');
                const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
                const mesLetras = meses[parseInt(mes) - 1] || "---";
                fechaFormateada = `${dia} ${mesLetras} ${anio}`;

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
            let horaRegistro = '---';
            if (reserva.timestamp && reserva.timestamp.toDate) {
                const registroDate = reserva.timestamp.toDate();
                horaRegistro = registroDate.toLocaleString('es-ES', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                }).replace(/\./g, '');
            }

            const horaValue = reserva.horaPactada || "";
            
            let lastUpdatedText = '';
            if (reserva.lastUpdatedBy && reserva.lastUpdatedBy.email) {
                const name = reserva.lastUpdatedBy.email.split('@')[0]; 
                lastUpdatedText = `Actualizado por: ${name}`;
            }

            const clientNameSafe = (reserva.email || 'cliente').split('@')[0].replace(/[^a-z0-9]/gi, '_');

            const reservationCard = document.createElement('div');
            reservationCard.className = 'reserva-card';
            reservationCard.id = cardId; 
            
            reservationCard.innerHTML = `
                <div class="card-header-info">
                    <span class="registration-time">Registro: ${horaRegistro}</span>
                    <span class="countdown-timer">${diasRestantesTexto}</span>
                </div>
                
                <button onclick="downloadPDF('${cardId}', '${clientNameSafe}')" class="btn-pdf" title="Descargar PDF" style="position: absolute; top: 10px; right: 10px; background:none; border:none; cursor:pointer; font-size: 1.5rem;">
                    📄
                </button>

                <p><strong>Email:</strong> ${reserva.email || 'No especificado'}</p>
                <p><strong>Fecha Solicitada:</strong> ${fechaFormateada}</p>
                
                <div class="admin-time-selector">
                    <label>🕒 Horario Acordado:</label>
                    <input type="time" value="${horaValue}" onchange="updateReservationTime('${id}', this.value)">
                </div>
                
                <p><strong>Menú:</strong> ${reserva.menu || '---'}</p>
                <p><strong>Comensales:</strong> ${reserva.comensales || '---'}</p>
                <p><strong>Modalidad:</strong> ${reserva.modalidad || '---'}</p>
                <p><strong>Dirección:</strong> ${reserva.direccion || '---'}</p>
                <p><strong>Teléfono:</strong> ${reserva.phone || '<span style="color:red;">No especificado</span>'}</p>

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