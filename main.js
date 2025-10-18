document.addEventListener('DOMContentLoaded', async () => {

    // --- LÓGICA DEL CARRUSEL EN ABANICO ---
    const mainHeaderImage = 'Recursos/Img/portada.jpg';
    const carouselImages = [
        'Recursos/Img/gettyimages-1789034712-612x612.jpg',
        'Recursos/Img/images.jpg',
        'Recursos/Img/licensed-image (1).jpg',
        'Recursos/Img/portada.jpg',
        'Recursos/Img/licensed-image (2).jpg',
        'Recursos/Img/licensed-image.jpg'
    ];
    const mainImageContainer = document.querySelector('.carousel-main-image');
    const thumbnailsContainer = document.querySelector('.carousel-thumbnails');
    let currentIndex = 0;

    if (mainImageContainer && carouselImages.length > 0) {
        mainImageContainer.innerHTML = `<img src="${mainHeaderImage}" alt="Bienvenida a Jelambi Chef">`;
        const mainImage = mainImageContainer.querySelector('img');
        const renderThumbnails = () => {
            thumbnailsContainer.innerHTML = '';
            const visibleThumbnails = 3;
            for (let i = 0; i < visibleThumbnails; i++) {
                const imageIndex = (currentIndex + i) % carouselImages.length;
                if (i > 0 && imageIndex === currentIndex) break;
                const imageUrl = carouselImages[imageIndex];
                const thumb = document.createElement('img');
                thumb.src = imageUrl;
                thumb.className = `thumbnail pos-${i + 1}`;
                thumb.addEventListener('click', () => {
                    mainImage.style.opacity = '0';
                    setTimeout(() => {
                        mainImage.src = imageUrl;
                        mainImage.style.opacity = '1';
                    }, 400);
                    currentIndex = (imageIndex + 1) % carouselImages.length;
                    renderThumbnails();
                });
                thumbnailsContainer.appendChild(thumb);
            }
        };
        renderThumbnails();
    }
    // --- FIN DE LA LÓGICA DEL CARRUSEL ---


    // --- LÓGICA DEL SISTEMA DE RESERVAS ---

    // ----- 1. REFERENCIAS A ELEMENTOS DEL DOM -----
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
    
    const btnComensalesUp = document.getElementById('btn-comensales-up');
    const btnComensalesDown = document.getElementById('btn-comensales-down');
    const comensalesInput = document.getElementById('comensales');

    // Crear y añadir el aviso de selección
    const selectionWarning = document.createElement('p');
    selectionWarning.id = 'selection-warning';
    selectionWarning.textContent = 'Debe elegir una Experiencia';
    
    // ***** ¡CAMBIO REALIZADO AQUÍ! *****
    // Lo movemos para que esté después del contenedor de modalidad
    modalidadContainer.insertAdjacentElement('afterend', selectionWarning);

    // ----- 2. ESTADO DE LA APLICACIÓN -----
    let seleccion = {
        menu: null,
        modalidad: null,
        comensales: 2 // Valor inicial
    };
    let blockedDates = [];

    // ----- 3. INICIALIZACIÓN (Firestore, Flatpickr) -----
    
    // Cargar disponibilidad
    try {
        const snapshot = await db.collection('availability').get();
        blockedDates = snapshot.docs.map(doc => doc.id);
    } catch (error) {
        console.error("Error al cargar la disponibilidad:", error);
    }

    // Inicializar Flatpickr
    flatpickr("#fecha", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        locale: "es",
        minDate: "today",
        disable: blockedDates,
        time_24hr: true
    });

    // Cargar los menús desde Firestore
    async function cargarMenus() {
        try {
            const querySnapshot = await db.collection('menus').get();
            menusContainer.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const menu = doc.data();
                const card = document.createElement('div');
                card.className = 'card';
                card.dataset.id = doc.id;
                card.dataset.nombre = menu.nombre;
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
        let currentValue = parseInt(comensalesInput.value);
        comensalesInput.value = currentValue + 1;
        seleccion.comensales = comensalesInput.value;
    });

    btnComensalesDown.addEventListener('click', () => {
        let currentValue = parseInt(comensalesInput.value);
        if (currentValue > 1) {
            comensalesInput.value = currentValue - 1;
            seleccion.comensales = comensalesInput.value;
        }
    });

    // Función de validación
    function validateSelection() {
        const isMenuSelected = !!seleccion.menu;
        const isModalidadSelected = !!seleccion.modalidad;
        btnNextStep.disabled = !isMenuSelected || !isModalidadSelected;
        selectionWarning.style.display = (isMenuSelected && isModalidadSelected) ? 'none' : 'block';
        if (!isMenuSelected) {
            selectionWarning.textContent = 'Debe elegir una Experiencia';
        } else if (!isModalidadSelected) {
            selectionWarning.textContent = 'Debe elegir una Modalidad';
        }
    }

    // Manejar la selección de tarjetas
    function handleSelection(container, key) {
        container.addEventListener('click', (e) => {
            const clickedCard = e.target.closest('.card');
            if (!clickedCard) return;

            const isAlreadySelected = clickedCard.classList.contains('selected');
            [...container.children].forEach(child => child.classList.remove('selected'));
            
            if (isAlreadySelected) {
                seleccion[key] = null;
            } else {
                clickedCard.classList.add('selected');
                seleccion[key] = clickedCard.dataset.nombre || clickedCard.dataset.value;
            }
            validateSelection();
        });
    }

    handleSelection(menusContainer, 'menu');
    handleSelection(modalidadContainer, 'modalidad');

    // Lógica del formulario y envío
    btnNextStep.addEventListener('click', () => {
        seleccion.comensales = document.getElementById('comensales').value;
        if (btnNextStep.disabled) return;
        resumenTexto.textContent = `${seleccion.menu}, para ${seleccion.comensales} personas. Modalidad: ${seleccion.modalidad.replace('-', ' ')}.`;
        step1.classList.add('hidden');
        step2.classList.remove('hidden');
    });

    alergiaRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            alergiaDetalle.classList.toggle('hidden', e.target.value === 'no');
        });
    });

    bookingForm.addEventListener('keyup', () => {
        btnConfirm.disabled = !bookingForm.checkValidity();
    });

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        btnConfirm.disabled = true;
        btnConfirm.textContent = 'Procesando...';
        const reserva = { ...seleccion, alergia: document.querySelector('input[name="alergia"]:checked').value, alergiaDetalle: alergiaDetalle.value, fecha: document.getElementById('fecha').value, direccion: document.getElementById('direccion').value, email: document.getElementById('email').value, estado: 'pendiente', timestamp: firebase.firestore.FieldValue.serverTimestamp() };

        try {
            await db.collection('reservations').add(reserva);
            alert('¡Reserva confirmada! Gracias por elegirnos.');
            bookingForm.reset();
            comensalesInput.value = 2;
            seleccion.comensales = 2;
            step2.classList.add('hidden');
            step1.classList.remove('hidden');
            validateSelection();
        } catch (error) {
            console.error("Error al guardar la reserva: ", error);
            alert('Hubo un problema al confirmar tu reserva.');
        } finally {
            btnConfirm.disabled = false;
            btnConfirm.textContent = 'Confirmar Reserva';
        }
    });

    // ----- 5. LLAMADAS INICIALES -----
    await cargarMenus();
    validateSelection();
});