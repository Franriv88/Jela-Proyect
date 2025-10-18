document.addEventListener('DOMContentLoaded', async () => {

    // --- LÓGICA DEL CARRUSEL EN ABANICO ---
    const mainHeaderImage = 'Recursos/Img/portada.jpg'; // Imagen principal fija del header
    const carouselImages = [
        'Recursos/Img/gettyimages-1789034712-612x612.jpg',
        'Recursos/Img/images.jpg',
        'Recursos/Img/licensed-image (1).jpg',
        'Recursos/Img/portada.jpg',
        'Recursos/Img/licensed-image (2).jpg',
        'Recursos/Img/licensed-image.jpg'
        // Puedes agregar más imágenes aquí y el sistema las incluirá en el ciclo
    ];

    const mainImageContainer = document.querySelector('.carousel-main-image');
    const thumbnailsContainer = document.querySelector('.carousel-thumbnails');
    let currentIndex = 0; // Controla qué imagen está al frente del abanico

    if (mainImageContainer && carouselImages.length > 0) {
        // Cargar la imagen principal del header.
        mainImageContainer.innerHTML = `<img src="${mainHeaderImage}" alt="Bienvenida a Jelambi Chef">`;
        const mainImage = mainImageContainer.querySelector('img');

        // Función para renderizar y actualizar las miniaturas en abanico.
        const renderThumbnails = () => {
            thumbnailsContainer.innerHTML = ''; // Limpiar miniaturas existentes para redibujar

            const visibleThumbnails = 3;
            for (let i = 0; i < visibleThumbnails; i++) {
                // Usamos el operador % (módulo) para crear un bucle infinito y seguro
                const imageIndex = (currentIndex + i) % carouselImages.length;

                // Si solo hay 1 o 2 imágenes, evita repetir la misma en el abanico
                if (i > 0 && imageIndex === currentIndex && carouselImages.length <= visibleThumbnails) {
                   continue;
                }
                 if(carouselImages.length <= i) break; // No intentes mostrar más miniaturas de las que hay

                const imageUrl = carouselImages[imageIndex];

                const thumb = document.createElement('img');
                thumb.src = imageUrl;
                thumb.className = `thumbnail pos-${i + 1}`; // Asigna la clase de posición

                thumb.addEventListener('click', () => {
                    // La imagen clickeada se convierte en la principal del header
                    mainImage.style.opacity = '0';
                    setTimeout(() => {
                        mainImage.src = imageUrl;
                        mainImage.style.opacity = '1';
                    }, 400); // Coincide con transición CSS

                    // La siguiente imagen en la lista pasa a estar al frente del abanico
                    currentIndex = (imageIndex + 1) % carouselImages.length;

                    // Volver a dibujar el abanico con el nuevo orden
                    renderThumbnails();
                });

                thumbnailsContainer.appendChild(thumb);
            }
        };

        // Renderizar las miniaturas por primera vez al cargar la página.
        renderThumbnails();
    }
    // --- FIN DE LA LÓGICA DEL CARRUSEL ---


    // --- LÓGICA DEL SISTEMA DE RESERVAS ---

    // ----- 1. REFERENCIAS A ELEMENTOS DEL DOM -----
    const menusContainer = document.getElementById('menus-container');
    const modalidadContainer = document.getElementById('modalidad-container');
    const step1 = document.getElementById('step-1');
    const modalContainer = document.getElementById('modal-container'); // Referencia a la modal
    const btnNextStep = document.getElementById('btn-next-step');
    const bookingForm = document.getElementById('booking-form');
    const resumenTexto = document.getElementById('resumen-texto');
    const alergiaRadios = document.querySelectorAll('input[name="alergia"]');
    const alergiaDetalle = document.getElementById('alergia-detalle');
    const btnConfirm = document.getElementById('btn-confirm');
    const btnComensalesUp = document.getElementById('btn-comensales-up');
    const btnComensalesDown = document.getElementById('btn-comensales-down');
    const comensalesInput = document.getElementById('comensales');
    const btnBack = document.getElementById('btn-back'); // Botón Volver

    // Crear y añadir el aviso de selección
    const selectionWarning = document.createElement('p');
    selectionWarning.id = 'selection-warning';
    selectionWarning.textContent = 'Debe elegir una Experiencia';
    modalidadContainer.insertAdjacentElement('afterend', selectionWarning);

    // ----- 2. ESTADO DE LA APLICACIÓN -----
    let seleccion = {
        menu: null,
        modalidad: null,
        comensales: 2 // Valor inicial
    };
    let blockedDates = [];

    // ----- 3. INICIALIZACIÓN -----
    try {
        const snapshot = await db.collection('availability').get();
        blockedDates = snapshot.docs.map(doc => doc.id);
    } catch (error) {
        console.error("Error al cargar la disponibilidad:", error);
    }

    flatpickr("#fecha", {
        enableTime: true, dateFormat: "Y-m-d H:i", locale: "es",
        minDate: "today", disable: blockedDates, time_24hr: true
    });

    async function cargarMenus() {
        try {
            const querySnapshot = await db.collection('menus').get();
            menusContainer.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const menu = doc.data();
                const card = document.createElement('div');
                card.className = 'card';
                card.dataset.id = doc.id; card.dataset.nombre = menu.nombre;
                const formattedPrice = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(menu.precio || 0);
                card.innerHTML = `<h3>${menu.nombre}</h3><p class="card-description">${menu.descripcion || ''}</p><p class="card-ideal">${menu.idealPara || ''}</p><p class="card-price">A partir de ${formattedPrice}</p>`;
                menusContainer.appendChild(card);
            });
        } catch (error) {
            console.error("Error al cargar menús: ", error);
        }
    }

    // ----- 4. FUNCIONES Y MANEJADORES DE EVENTOS -----
    btnComensalesUp.addEventListener('click', () => {
        let val = parseInt(comensalesInput.value);
        comensalesInput.value = val + 1;
        seleccion.comensales = comensalesInput.value; // Guardamos como string, se parseará al guardar
    });
    btnComensalesDown.addEventListener('click', () => {
        let val = parseInt(comensalesInput.value);
        if (val > 1) { comensalesInput.value = val - 1; seleccion.comensales = comensalesInput.value; }
    });

    function validateSelection() {
        const menuOK = !!seleccion.menu;
        const modOK = !!seleccion.modalidad;
        btnNextStep.disabled = !menuOK || !modOK;
        selectionWarning.style.display = (menuOK && modOK) ? 'none' : 'block';
        if (!menuOK) selectionWarning.textContent = 'Debe elegir una Experiencia';
        else if (!modOK) selectionWarning.textContent = 'Debe elegir una Modalidad';
    }

    function handleSelection(container, key) {
        container.addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            if (!card) return;
            const alreadySel = card.classList.contains('selected');
            [...container.children].forEach(c => c.classList.remove('selected'));
            if (alreadySel) { seleccion[key] = null; }
            else { card.classList.add('selected'); seleccion[key] = card.dataset.nombre || card.dataset.value; }
            validateSelection();
        });
    }
    handleSelection(menusContainer, 'menu');
    handleSelection(modalidadContainer, 'modalidad');

    btnNextStep.addEventListener('click', () => {
        seleccion.comensales = document.getElementById('comensales').value; // Asegura valor actual
        if (btnNextStep.disabled) return;
        resumenTexto.textContent = `${seleccion.menu}, para ${seleccion.comensales} personas. Modalidad: ${seleccion.modalidad.replace('-', ' ')}.`;
        modalContainer.classList.remove('hidden');
        document.body.classList.add('modal-active');
    });

    btnBack.addEventListener('click', () => {
        modalContainer.classList.add('hidden');
        document.body.classList.remove('modal-active');
    });

    alergiaRadios.forEach(r => { r.addEventListener('change', (e) => { alergiaDetalle.classList.toggle('hidden', e.target.value === 'no'); }); });
    bookingForm.addEventListener('input', () => { btnConfirm.disabled = !bookingForm.checkValidity(); });

    // Listener para el botón "Confirmar Reserva" (Enviar a Firestore)
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        btnConfirm.disabled = true;
        btnConfirm.textContent = 'Procesando...';
        // Aseguramos que comensales sea un número
        const numComensales = parseInt(seleccion.comensales) || 1;
        const reserva = {
            menu: seleccion.menu,
            modalidad: seleccion.modalidad,
            comensales: numComensales, // Usamos el número parseado
            alergia: document.querySelector('input[name="alergia"]:checked').value,
            alergiaDetalle: alergiaDetalle.value,
            fecha: document.getElementById('fecha').value,
            direccion: document.getElementById('direccion').value,
            email: document.getElementById('email').value,
            estado: 'pendiente',
            timestamp: firebase.firestore.FieldValue.serverTimestamp() // Hora del servidor
        };

        try {
            // Guarda en Firestore
            await db.collection('reservations').add(reserva);
            alert('¡Reserva confirmada! Gracias por elegirnos.');

            // Resetear formulario y estado
            bookingForm.reset();
            comensalesInput.value = 2; // Resetea contador
            seleccion = { menu: null, modalidad: null, comensales: 2 }; // Reset completo
            [...menusContainer.children].forEach(c => c.classList.remove('selected'));
            [...modalidadContainer.children].forEach(c => c.classList.remove('selected'));
            modalContainer.classList.add('hidden');
            document.body.classList.remove('modal-active');
            validateSelection();

        } catch (error) {
            console.error("Error al guardar la reserva: ", error);
            alert('Hubo un problema al confirmar tu reserva.');
        } finally {
            // Restaura el botón de confirmar
            btnConfirm.disabled = !bookingForm.checkValidity(); // Re-evaluar disabled
            btnConfirm.textContent = 'Confirmar Reserva';
        }
    });

    // ----- 5. LLAMADAS INICIALES -----
    await cargarMenus(); // Carga los menús al inicio
    validateSelection(); // Asegura estado inicial correcto del botón y aviso
});