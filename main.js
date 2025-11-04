document.addEventListener('DOMContentLoaded', async () => {

    // --- LÓGICA DEL CARRUSEL AVANZADO (ROTACIÓN TOTAL) ---

    const carouselImages = [
        'Recursos/Img/tostadas.jpg',
        'Recursos/Img/pasta.jpg',
        'Recursos/Img/postre.jpg',
        'Recursos/Img/salmon.jpg',
        'Recursos/Img/postre2.jpg',
        'Recursos/Img/vieira.jpg'
    ];
    
    // Referencias a los nuevos contenedores del carrusel
    const carousel = document.getElementById('dynamic-carousel');
    const list = document.getElementById('carousel-list'); 
    const timeRunning = document.getElementById('carousel-time-running'); 
    
    // Simulamos los botones de navegación para disparar la función showSlider
    const nextBtn = { click: () => showSlider('next') }; 
    
    const timeRunningDuration = 7000;
    const timeAutoNext = 7000;
    const timeTransition = 1000;
    
    let runTimeOut;
    let runNextAuto;

    // Función para crear los ITEMs del carrusel
    const createCarouselItems = () => {
        if (!list) return;

        list.innerHTML = '';
        carouselImages.forEach((path, index) => {
            const item = document.createElement('div');
            item.className = 'item';
            item.style.backgroundImage = `url(${path})`; 
            
            const content = document.createElement('div');
            content.className = 'content';
            item.appendChild(content);

            list.appendChild(item);
        });
    }

    // Lógica principal para mover el slider (adaptada del ejemplo avanzado)
    function showSlider(type) {
        if (!list || !carousel) return;

        let sliderItemsDom = list.querySelectorAll('.carousel .list .item');

        if(type === 'next'){
            list.appendChild(sliderItemsDom[0]);
            carousel.classList.add('next');
        } else{
            list.prepend(sliderItemsDom[sliderItemsDom.length - 1]);
            carousel.classList.add('prev');
        }

        clearTimeout(runTimeOut);
        runTimeOut = setTimeout( () => {
            carousel.classList.remove('next');
            carousel.classList.remove('prev');
        }, timeTransition);

        clearTimeout(runNextAuto);
        runNextAuto = setTimeout(() => {
            showSlider('next');
        }, timeAutoNext);

        resetTimeAnimation();
    }

    function resetTimeAnimation() {
        if (!timeRunning) return;
        timeRunning.style.animation = 'none';
        timeRunning.offsetHeight;
        timeRunning.style.animation = null; 
        timeRunning.style.animation = `runningTime ${timeRunningDuration / 1000}s linear 1 forwards`;
    }
    
    // Inicialización del carrusel
    createCarouselItems();
    resetTimeAnimation();
    
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
    
    // Referencias a los elementos de comensales
    const comensalesInput = document.getElementById('comensales');
    const btnComensalesUp = document.getElementById('btn-comensales-up');
    const btnComensalesDown = document.getElementById('btn-comensales-down');
    
    const btnBack = document.getElementById('btn-back');
    const selectionWarning = document.createElement('p');
    selectionWarning.id = 'selection-warning';
    selectionWarning.textContent = 'Debe elegir una Experiencia';
    modalidadContainer.insertAdjacentElement('afterend', selectionWarning);

    // ----- 2. ESTADO DE LA APLICACIÓN -----
    let seleccion = { menu: null, modalidad: null, comensales: 2 };
    let disabledTimesForFlatpickr = [];

    // --- FUNCIÓN DE RESETEO COMPLETO ---
    function resetAllState() {
        // 1. Resetear el estado de la aplicación
        seleccion.menu = null;
        seleccion.modalidad = null;
        comensalesInput.value = 2;
        seleccion.comensales = 2;

        // 2. Desactivar selecciones visuales
        [...menusContainer.children].forEach(c => c.classList.remove('selected'));
        [...modalidadContainer.children].forEach(c => c.classList.remove('selected'));
        
        // 3. Asegurar que la modal esté cerrada
        modalContainer.classList.add('hidden');
        document.body.classList.remove('modal-active');

        // 4. Revalidar el estado
        validateSelection();
        
        // 5. Resetear el formulario dentro de la modal
        bookingForm.reset(); 
    }

    // ----- 3. INICIALIZACIÓN DE DATOS Y LIBRERÍAS -----
    try {
        if (typeof db !== 'undefined') {
            // Carga de franjas horarias bloqueadas (colección blockedItems)
            const blockedItemsSnapshot = await db.collection('blockedItems').get();
            
            blockedItemsSnapshot.docs.forEach(doc => {
                const item = doc.data();
                const date = item.date;
                
                if (item.startTime && item.endTime) {
                    disabledTimesForFlatpickr.push({
                        from: `${date} ${item.startTime}`,
                        to: `${date} ${item.endTime}`
                    });
                } else {
                    disabledTimesForFlatpickr.push(date);
                }
            });
        } else { console.error("Firestore 'db' no inicializado."); }
    } catch (error) { console.error("Error al cargar la disponibilidad:", error); }

    flatpickr("#fecha", { enableTime: true, dateFormat: "Y-m-d H:i", locale: "es", minDate: "today", disable: disabledTimesForFlatpickr, time_24hr: true });

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
    
    // **EVENTOS DE COMENSALES (CORREGIDOS PARA USAR LAS REFERENCIAS CORRECTAS)**
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
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value, 
            estado: 'pendiente',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
    if (typeof db !== 'undefined') {
        await db.collection('reservations').add(reserva);
        
        alert('¡Reserva confirmada! Gracias por elegirnos.');

        // --- Lógica de WhatsApp Click-to-Chat (MANUAL) ---
        // Generamos el mensaje con los detalles del cliente
        const clientPhone = document.getElementById('phone').value.replace(/[^0-9]/g, ''); // Limpia el número
        const clientName = document.getElementById('email').value.split('@')[0]; // Usa el nombre del email como referencia
        
        // El número del chef debe ser fijo (con código de país)
        const chefNumber = '5491122514305'; // ⚠️ REEMPLAZA ESTE NÚMERO POR EL DEL CHEF

        const message = `¡Hola Chef! Nueva Reserva de ${clientName}.%0A%0A*Detalles:*%0A- Menú: ${seleccion.menu}%0A- Comensales: ${seleccion.comensales}%0A- Modalidad: ${seleccion.modalidad}%0A- Cliente Contacto: ${clientPhone}`;

        const whatsappURL = `https://api.whatsapp.com/send?phone=${chefNumber}&text=${message}`;
        
        // Abrir WhatsApp en una nueva ventana para que el chef envíe el mensaje
        window.open(whatsappURL, '_blank');
                resetAllState(); 
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