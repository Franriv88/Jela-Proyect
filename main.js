document.addEventListener('DOMContentLoaded', async () => {
    // Referencias a elementos del DOM
    const menusContainer = document.getElementById('menus-container');
    const modalidadContainer = document.getElementById('modalidad-container');
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const btnNextStep = document.getElementById('btn-next-step');
    const bookingForm = document.getElementById('booking-form');
    const resumenTexto = document.getElementById('resumen-texto');
    const alergiaRadios = document.querySelectorAll('input[name="alergia"]');
    const alergiaDetalle = document.getElementById('alergia-detalle');
    const btnConfirm = document.getElementById('btn-confirm');

    let seleccion = {
        menu: null,
        modalidad: null,
        comensales: 2
    };
    let blockedDates = [];

    // --- Cargar Fechas Bloqueadas desde Firestore ---
    try {
        const snapshot = await db.collection('availability').get();
        blockedDates = snapshot.docs.map(doc => doc.id);
        console.log("Días no disponibles cargados:", blockedDates);
    } catch (error) {
        console.error("Error al cargar la disponibilidad:", error);
    }

    // --- Inicializar el Selector de Fecha y Hora del Cliente ---
    flatpickr("#fecha", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        locale: "es",
        minDate: "today",
        disable: blockedDates, // Deshabilita las fechas bloqueadas por el chef
        time_24hr: true
    });

    // --- Cargar Menús desde Firestore ---
    async function cargarMenus() {
        try {
            const querySnapshot = await db.collection('menus').get();
            menusContainer.innerHTML = ''; // Limpiar contenedor
            querySnapshot.forEach((doc) => {
                const menu = doc.data();
                const card = document.createElement('div');
                card.classList.add('card');
                card.textContent = menu.nombre;
                card.dataset.id = doc.id;
                card.dataset.nombre = menu.nombre;
                menusContainer.appendChild(card);
            });
        } catch (error) {
            console.error("Error al cargar menús: ", error);
            menusContainer.innerHTML = '<p>No se pudieron cargar los menús. Intente más tarde.</p>';
        }
    }

    // --- Lógica de Selección ---
    function handleSelection(container, key) {
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('card')) {
                [...container.children].forEach(child => child.classList.remove('selected'));
                e.target.classList.add('selected');
                seleccion[key] = key === 'menu' ? e.target.dataset.nombre : e.target.dataset.value;
            }
        });
    }

    handleSelection(menusContainer, 'menu');
    handleSelection(modalidadContainer, 'modalidad');

    // --- Lógica para pasar a la Etapa 2 ---
    btnNextStep.addEventListener('click', () => {
        seleccion.comensales = document.getElementById('comensales').value;
        if (!seleccion.menu || !seleccion.modalidad) {
            alert('Por favor, selecciona un menú y una modalidad.');
            return;
        }

        resumenTexto.textContent = `${seleccion.menu}, para ${seleccion.comensales} personas. Modalidad: ${seleccion.modalidad.replace('-', ' ')}.`;
        step1.classList.add('hidden');
        step2.classList.remove('hidden');
    });

    // --- Lógica del Formulario ---
    alergiaRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            alergiaDetalle.classList.toggle('hidden', e.target.value === 'no');
        });
    });

    bookingForm.addEventListener('keyup', () => {
        btnConfirm.disabled = !bookingForm.checkValidity();
    });

    // --- Guardar Reserva en Firestore ---
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        btnConfirm.disabled = true;
        btnConfirm.textContent = 'Procesando...';

        const reserva = {
            ...seleccion,
            alergia: document.querySelector('input[name="alergia"]:checked').value,
            alergiaDetalle: alergiaDetalle.value,
            fecha: document.getElementById('fecha').value,
            direccion: document.getElementById('direccion').value,
            email: document.getElementById('email').value,
            estado: 'pendiente',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('reservations').add(reserva);
            alert('¡Reserva confirmada! Gracias por elegirnos.');
            
            bookingForm.reset();
            step2.classList.add('hidden');
            step1.classList.remove('hidden');
            [...menusContainer.children].forEach(child => child.classList.remove('selected'));
            [...modalidadContainer.children].forEach(child => child.classList.remove('selected'));

        } catch (error) {
            console.error("Error al guardar la reserva: ", error);
            alert('Hubo un problema al confirmar tu reserva. Por favor, intenta de nuevo.');
        } finally {
            btnConfirm.disabled = false;
            btnConfirm.textContent = 'Confirmar Reserva';
        }
    });

    // Iniciar la carga de menús
    cargarMenus();
});