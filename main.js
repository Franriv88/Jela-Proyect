document.addEventListener('DOMContentLoaded', async () => {

    // --- LÓGICA DEL CARRUSEL AVANZADO (ROTACIÓN TOTAL) ---

    // 1. Array de tus imágenes locales.
    const imagePaths = [
        'Recursos/Img/gettyimages-1789034712-612x612.jpg',
        'Recursos/Img/images.jpg',
        'Recursos/Img/licensed-image.jpg',
        'Recursos/Img/portada.jpg',
        'Recursos/Img/licensed-image.jpg',
        'Recursos/Img/licensed-image.jpg',
    ];
    
    // Referencias a los nuevos contenedores del carrusel
    const carousel = document.getElementById('dynamic-carousel');
    const list = document.getElementById('carousel-list'); 
    const timeRunning = document.getElementById('carousel-time-running'); 
    
    // Simulamos los botones de navegación para disparar la función showSlider
    // Usamos click() para iniciar la rotación, como en el código fuente del carrusel
    const nextBtn = { click: () => showSlider('next') }; 
    
    const timeRunningDuration = 5000; // 7 segundos para la animación
    const timeAutoNext = 5000;        // 7 segundos para el avance automático
    const timeTransition = 0;      // 1 segundo para la transición CSS
    
    let runTimeOut;
    let runNextAuto;

    // Función para crear los ITEMs del carrusel
    const createCarouselItems = () => {
        if (!list) return;

        list.innerHTML = ''; // Limpiar lista
        imagePaths.forEach((path, index) => {
            const item = document.createElement('div');
            item.className = 'item';
            item.style.backgroundImage = `url(${path})`; 
            
            // Contenido (adaptado al header de Jelambi Chef)
            const content = document.createElement('div');
            content.className = 'content';
            //content.innerHTML = `
            //    <div class="title">CHEF JELAMBI</div>
            //    <div class="name">Experiencia ${index + 1}</div>
            //`;
            item.appendChild(content);

            list.appendChild(item);
        });
    }

    // Lógica principal para mover el slider (adaptada del ejemplo avanzado)
    function showSlider(type) {
        if (!list || !carousel) return;

        let sliderItemsDom = list.querySelectorAll('.carousel .list .item');

        // 1. Manipulación del DOM para la rotación (mueve el primer elemento al final)
        if(type === 'next'){
            list.appendChild(sliderItemsDom[0]);
            carousel.classList.add('next'); // Clase que activa la animación en CSS
        } else{
            list.prepend(sliderItemsDom[sliderItemsDom.length - 1]);
            carousel.classList.add('prev');
        }

        // 2. Controla la animación CSS de la rotación
        clearTimeout(runTimeOut);
        runTimeOut = setTimeout( () => {
            carousel.classList.remove('next');
            carousel.classList.remove('prev');
        }, timeTransition); // Espera la duración de la transición CSS (1s)

        // 3. Reinicia el contador de auto-avance
        clearTimeout(runNextAuto);
        runNextAuto = setTimeout(() => {
            showSlider('next'); // Llama a la siguiente rotación
        }, timeAutoNext);

        resetTimeAnimation(); // Reset de la barra de tiempo
    }

    function resetTimeAnimation() {
        if (!timeRunning) return;
        timeRunning.style.animation = 'none';
        timeRunning.offsetHeight; /* trigger reflow */
        timeRunning.style.animation = null; 
        timeRunning.style.animation = `runningTime ${timeRunningDuration / 1000}s linear 1 forwards`;
    }
    
    // Inicialización del carrusel
    createCarouselItems();
    resetTimeAnimation();
    
    // Iniciar auto-avance
    runNextAuto = setTimeout(() => {
        showSlider('next');
    }, timeAutoNext); 
    
    // --- FIN CÓDIGO CARRUSEL ---


    // --- LÓGICA DEL SISTEMA DE RESERVAS ---

    // ----- 1. REFERENCIAS A ELEMENTOS DEL DOM -----
    const menusContainer = document.getElementById('menus-container');
    const modalidadContainer = document.getElementById('modalidad-container');
    const step1 = document.getElementById('step-1');
    const modalContainer = document.getElementById('modal-container');
    const btnNextStep = document.getElementById('btn-next-step');
    const bookingForm = document.getElementById('booking-form');
    const resumenTexto = document.getElementById('resumen-texto');
    const alergiaRadios = document.querySelectorAll('input[name="alergia"]');
    const alergiaDetalle = document.getElementById('alergia-detalle');
    const btnConfirm = document.getElementById('btn-confirm');
    const btnComensalesUp = document.getElementById('btn-comensales-up');
    const btnComensalesDown = document.getElementById('btn-comensales-down');
    const comensalesInput = document.getElementById('comensales');
    const btnBack = document.getElementById('btn-back');
    const selectionWarning = document.createElement('p');
    selectionWarning.id = 'selection-warning';
    selectionWarning.textContent = 'Debe elegir una Experiencia';
    modalidadContainer.insertAdjacentElement('afterend', selectionWarning);

    // ----- 2. ESTADO DE LA APLICACIÓN -----
    let seleccion = { menu: null, modalidad: null, comensales: 2 };
    let blockedDates = [];

    // ----- 3. INICIALIZACIÓN DE DATOS Y LIBRERÍAS -----
    try {
        if (typeof db !== 'undefined') {
            const snapshot = await db.collection('availability').get();
            blockedDates = snapshot.docs.map(doc => doc.id);
        } else { console.error("Firestore 'db' no inicializado."); }
    } catch (error) { console.error("Error al cargar la disponibilidad:", error); }

    flatpickr("#fecha", { enableTime: true, dateFormat: "Y-m-d H:i", locale: "es", minDate: "today", disable: blockedDates, time_24hr: true });

    async function cargarMenus() {
        try {
            if (typeof db !== 'undefined') {
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
            } else { console.error("Firestore 'db' no inicializado para cargar menús."); }
        } catch (error) { console.error("Error al cargar menús: ", error); menusContainer.innerHTML = '<p>Error al cargar menús.</p>'; }
    }

    // ----- 4. FUNCIONES Y MANEJADORES DE EVENTOS -----
    btnComensalesUp.addEventListener('click', () => {
        let val = parseInt(comensalesInput.value);
        if (val < 15) { comensalesInput.value = val + 1; seleccion.comensales = comensalesInput.value; }
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
        seleccion.comensales = document.getElementById('comensales').value;
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

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        btnConfirm.disabled = true;
        btnConfirm.textContent = 'Procesando...';
        const numComensales = parseInt(seleccion.comensales) || 1;
        const reserva = {
            menu: seleccion.menu, modalidad: seleccion.modalidad, comensales: numComensales,
            alergia: document.querySelector('input[name="alergia"]:checked').value, alergiaDetalle: alergiaDetalle.value,
            fecha: document.getElementById('fecha').value, direccion: document.getElementById('direccion').value,
            email: document.getElementById('email').value, estado: 'pendiente',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            if (typeof db !== 'undefined') {
                await db.collection('reservations').add(reserva);
                alert('¡Reserva confirmada! Gracias por elegirnos.');
                bookingForm.reset();
                comensalesInput.value = 2;
                seleccion = { menu: null, modalidad: null, comensales: 2 };
                [...menusContainer.children].forEach(c => c.classList.remove('selected'));
                [...modalidadContainer.children].forEach(c => c.classList.remove('selected'));
                modalContainer.classList.add('hidden');
                document.body.classList.remove('modal-active');
                validateSelection();
            } else {
                console.error("Firestore 'db' no inicializado. No se puede guardar.");
                alert("Error: No se pudo conectar a la base de datos.");
            }
        } catch (error) {
            console.error("Error al guardar la reserva: ", error);
            alert('Hubo un problema al confirmar tu reserva. Revisa la consola (F12).');
        } finally {
            btnConfirm.disabled = !bookingForm.checkValidity();
            btnConfirm.textContent = 'Confirmar Reserva';
        }
    });

    // ----- 5. LLAMADAS INICIALES -----
    await cargarMenus();
    validateSelection();
});